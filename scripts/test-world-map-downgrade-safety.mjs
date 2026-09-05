import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const BASE_MAIN_SHA='d31cfccd';
const repositoryRoot=new URL('../',import.meta.url);
const currentSource=fs.readFileSync(new URL('js/tutorial.js',repositoryRoot),'utf8');
const baseSource=execFileSync('git',['show',`${BASE_MAIN_SHA}:js/tutorial.js`],{
  cwd:repositoryRoot,encoding:'utf8'
});

const downgradeCheckpoints=Object.freeze({
  rescue_world_map_open:'elna_guest_join',
  rescue_world_map_grassland:'elna_guest_join',
  rescue_world_map_depart:'elna_guest_join',
  stella_world_map_open:'stella_intro',
  stella_world_map_academy:'stella_intro',
  stella_world_map_visit:'stella_intro',
  lumina_world_map_open:'lumina_intro',
  lumina_world_map_academy:'lumina_intro',
  lumina_world_map_visit:'lumina_intro'
});

function mainFlowSource(source,label){
  const start=source.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
  const end=source.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',start);
  assert.ok(start>=0&&end>start,`${label}: persistent prologue flow must exist`);
  return source.slice(start,end);
}

function field(line,name){
  return line.match(new RegExp(`(?:^|,)${name}:'([^']+)'`))?.[1]||null;
}

function parseSteps(source,label){
  const steps=[];
  for(const match of mainFlowSource(source,label).matchAll(/^\s*(\{id:'([^']+)'.*)$/gm)){
    const line=match[1];
    steps.push({
      id:match[2],
      persistAs:field(line,'persistAs'),
      transition:field(line,'transition'),
      input:field(line,'input'),
      waitForEvent:field(line,'waitForEvent'),
      continueAt:field(line,'continueAt')
    });
  }
  assert.ok(steps.length>0,`${label}: prologue steps must be parseable`);
  assert.equal(new Set(steps.map(step=>step.id)).size,steps.length,`${label}: prologue step IDs must be unique`);
  return steps;
}

function functionSource(source,name){
  const start=source.indexOf(`function ${name}(`);
  assert.ok(start>=0,`${name} must exist`);
  const bodyStart=source.indexOf('{',start);
  let depth=0;
  for(let index=bodyStart;index<source.length;index+=1){
    if(source[index]==='{')depth+=1;
    if(source[index]==='}'){
      depth-=1;
      if(depth===0)return source.slice(start,index+1);
    }
  }
  assert.fail(`${name} must have a complete function body`);
}

const currentSteps=parseSteps(currentSource,'current branch');
const baseSteps=parseSteps(baseSource,`base main ${BASE_MAIN_SHA}`);
const currentById=new Map(currentSteps.map(step=>[step.id,step]));
const baseById=new Map(baseSteps.map(step=>[step.id,step]));

const persistenceContext=vm.createContext({});
vm.runInContext(`${functionSource(currentSource,'persistedTutorialStepId')};globalThis.persist=step=>persistedTutorialStepId(step);`,persistenceContext);

const baseIndexContext=vm.createContext({});
vm.runInContext(`const TUTORIAL_REMOVED_STEP_REDIRECTS=Object.freeze({});${functionSource(baseSource,'tutorialStepIndex')};globalThis.indexOfStep=(steps,id)=>tutorialStepIndex(steps,id);`,baseIndexContext);

for(const [newStepId,stableStepId] of Object.entries(downgradeCheckpoints)){
  const currentStep=currentById.get(newStepId);
  assert.ok(currentStep,`${newStepId}: the dev-only ID must remain available for existing dev saves`);
  assert.equal(currentStep.persistAs,stableStepId,`${newStepId}: persistence must use the release-safe ID`);

  const stableStep=baseById.get(stableStepId);
  assert.ok(stableStep,`${stableStepId}: downgrade target must exist in base main ${BASE_MAIN_SHA}`);
  const persistedId=persistenceContext.persist(currentStep);
  assert.equal(persistedId,stableStepId,`${newStepId}: current persistence simulation must produce the stable ID`);
  assert.ok(baseIndexContext.indexOfStep(baseSteps,persistedId)>=0,
    `${newStepId}: base main tutorialStepIndex must resolve ${persistedId}`);
}

// Downgrading can replay a short dialogue/route from these checkpoints, but
// landing on or advancing each checkpoint once must not itself execute a grant
// or transition. Later reward steps retain their existing one-time guards.
const baseTutorialNext=functionSource(baseSource,'tutorialNext');
for(const stableStepId of new Set(Object.values(downgradeCheckpoints))){
  const stableStep=baseById.get(stableStepId);
  assert.equal(stableStep.transition,null,`${stableStepId}: safe target must not carry a transition`);
  assert.equal(stableStep.input,null,`${stableStepId}: safe target must not carry a rewarding input`);
  assert.equal(stableStep.waitForEvent,null,`${stableStepId}: safe target must not wait on a rewarding event`);
  assert.equal(stableStep.continueAt,null,`${stableStepId}: safe target must not jump through a checkpoint side effect`);

  const transitionCalls=[];
  const context=vm.createContext({
    tutorialUiState:{active:true,steps:baseSteps,index:baseSteps.findIndex(step=>step.id===stableStepId),replay:false,lastFocusedStep:null},
    tutorialElnaContractBusy:false,
    tutorialStepRequiresAction:()=>false,
    tutorialStepCanAdvance:()=>true,
    runTutorialTransition:transition=>{transitionCalls.push(transition);return true;},
    tutorialShouldUseReplayNextStep:()=>false,
    tutorialStepIndex:(steps,id)=>steps.findIndex(step=>step.id===id),
    persistTutorialStep(){},renderTutorialStep(){},checkpointTutorialChapter(){},checkpointTutorialFlow(){},
    clearTutorialUi(){},updateTutorialMenuSummary(){},finishTutorialFlow(){},currentTutorialState:()=>({})
  });
  vm.runInContext(`${baseTutorialNext};tutorialNext();`,context);
  assert.deepEqual(transitionCalls,[],`${stableStepId}: resuming the safe target must not repeat a transition or reward`);
}

assert.match(baseSource,/const alreadyGranted=tutorial\.stellaSkillCardGranted===true;[\s\S]*?if\(!alreadyGranted\)/,
  'base Stella card reward must retain its one-time grant guard');
assert.match(baseSource,/if\(tutorial\.replaying\|\|tutorial\.alchemyLessonCompleted===true\)/,
  'base Lumina lesson must bypass preparation after completion');
assert.match(baseSource,/if\(tutorial\.alchemyLessonPrepared!==true\)/,
  'base Lumina preparation must retain its one-time resource guard');

console.log('World-map downgrade safety passed: 9 dev steps persist to 3 IDs present in base main d31cfccd.');
console.log('Existing dev saves can still resume the 9 dev IDs; after downgrade, a short story/route may restart, but the safe targets do not directly repeat rewards or transitions.');
