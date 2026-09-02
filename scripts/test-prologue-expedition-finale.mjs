import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const expedition=read('js/expedition.js');
const ui=read('js/ui.js');
const saveSource=read('js/save.js');
const index=read('index.html');
const packageJson=JSON.parse(read('package.json'));

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
const main=tutorial.slice(flowStart,flowEnd);
const required=['expedition_intro','expedition_home_open','expedition_destination','expedition_distance','expedition_member','expedition_suitability','expedition_dispatch','expedition_active','expedition_replay','prologue_epilogue','prologue_complete'];
let previous=-1;
for(const id of required){const current=main.indexOf(`id:'${id}'`);assert.ok(current>previous,`expedition/finale STEP missing or out of order: ${id}`);previous=current;}
const finale=main.slice(main.indexOf("id:'expedition_intro'"));
assert.ok(!finale.includes('カナタ'),'Kanata must not appear in the prologue finale');
assert.match(finale,/id:'expedition_intro'[^\n]+nextStepId:'expedition_home_open'[^\n]+replayNextStepId:'expedition_replay'/);
assert.match(finale,/id:'expedition_destination'[^\n]+grassland[^\n]+externalAdvance:true/);
assert.match(finale,/id:'expedition_distance'[^\n]+short[^\n]+externalAdvance:true/);
assert.match(finale,/id:'expedition_member'[^\n]+externalAdvance:true/);
assert.match(finale,/id:'expedition_dispatch'[^\n]+externalAdvance:true/);
assert.match(finale,/id:'expedition_active'[^\n]+persistAs:'prologue_epilogue'/);
assert.match(tutorial,/\['expedition_distance','expedition_member'\]\.includes\(tutorialCurrentStepId\(\)\)[^\n]+tutorialExpeditionCandidateInstance/,'the member target must already be marked by the distance-step render');
assert.ok(finale.includes('帰還を待たなくて大丈夫！'),'the prologue must continue without waiting for expedition return');
assert.match(finale,/id:'prologue_complete'(?![^\n]+target:)[^\n]+speaker:'グノーシス'[^\n]+portrait:'images\/tutorial\/characters\/gnosis-dialogue-transparent-final\.png'[^\n]+scene:'world_descent'/,'the final story scene must show Gnosis without being converted into a UI-guide step');
assert.ok(finale.trimEnd().endsWith(']);'),'the new prologue completion STEP must end the main flow');

for(const token of [
  'data-tutorial-expedition-map="${map.id}"','data-tutorial-expedition-distance="${distance.id}"',
  'data-tutorial-expedition-member="true"','id="expeditionSuitability"','id="expeditionStartButton"',
  'data-tutorial-expedition-active="true"'
])assert.ok(expedition.includes(token),`missing stable expedition UI contract: ${token}`);
assert.ok(expedition.includes("entry.status!=='active'"),'dispatch must remain active until a later battle win');
assert.ok(expedition.includes("distanceId:distance.id")&&expedition.includes("requiredWins:distance.wins"),'the tutorial must use the normal distance contract');

const helperStart=tutorial.indexOf('const TUTORIAL_EXPEDITION_OPERATION_STEPS');
const helperEnd=tutorial.indexOf('function tutorialStellaSkillCard()',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart);
function makeTutorialContext({saveSucceeds=true,replaying=false,dispatched=false,completed=false,active=[],completedCount=0}={}){
  const state={status:'in_progress',stepId:'expedition_dispatch',replaying,expeditionDispatched:dispatched,prologueCompleted:completed};
  const context=vm.createContext({
    console:{error:()=>{}},TUTORIAL_LUMINA_ALCHEMY:{resultId:'galdra'},TUTORIAL_MAIN_FLOW_ID:'prologue',
    save:{progress:{chapterId:'prologue',storyFlags:{},tutorial:state},instances:[{uid:'galdra',id:'galdra'}],party:[],expeditions:{active:structuredClone(active),completedCount}},
    currentTutorialState:()=>context.save.progress.tutorial,tutorialCurrentStepId:()=>context.save.progress.tutorial.stepId,
    expeditionAvailableInstances:()=>context.save.instances,
    markTutorialExpeditionDispatched:()=>{const t=context.save.progress.tutorial;if(t.expeditionDispatched)return false;t.expeditionDispatched=true;return true;},
    markTutorialPrologueCompleted:()=>{const t=context.save.progress.tutorial;if(t.prologueCompleted)return false;t.prologueCompleted=true;return true;},
    setTutorialStep:id=>{context.save.progress.tutorial.stepId=id;},
    completeTutorial:()=>{const t=context.save.progress.tutorial;if(t.replaying){t.replaying=false;t.stepId=null;return t;}t.status='completed';t.completed=true;t.skipped=false;t.stepId=null;return t;},
    saveGame:()=>saveSucceeds,showUiNotice:message=>context.notices.push(message),notices:[],
    tutorialNext:()=>{context.advanced=true;},queueTutorialActionAdvance:()=>true,startTutorialFlow:()=>true
  });
  vm.runInContext(tutorial.slice(helperStart,helperEnd),context);
  return context;
}

const dispatch=makeTutorialContext();
dispatch.save.progress.tutorial.stepId='expedition_distance';
assert.equal(vm.runInContext("shouldMarkTutorialExpeditionMember('galdra')",dispatch),true,'the distance-step render must mark the upcoming member target');
assert.equal(vm.runInContext("shouldMarkTutorialExpeditionMember('other')",dispatch),false);
dispatch.save.progress.tutorial.stepId='expedition_member';
assert.equal(vm.runInContext("shouldMarkTutorialExpeditionMember('galdra')",dispatch),true,'the member step must keep the same target marked');
dispatch.save.progress.tutorial.stepId='expedition_dispatch';
const entry={mapId:'grassland',distanceId:'short',memberUids:['galdra']};
assert.equal(vm.runInContext('commitTutorialExpeditionDispatch',dispatch)(entry),true);
assert.equal(entry.tutorialPrologue,true);
assert.equal(dispatch.save.progress.tutorial.expeditionDispatched,true);
assert.equal(dispatch.save.progress.tutorial.stepId,'expedition_active');
dispatch.save.progress.tutorial.stepId='expedition_dispatch';
assert.equal(vm.runInContext('handleTutorialExpeditionStarted',dispatch)(entry),true);
assert.equal(dispatch.advanced,true);

const wrong=makeTutorialContext();
assert.equal(vm.runInContext('commitTutorialExpeditionDispatch',wrong)({mapId:'grassland',distanceId:'long',memberUids:['galdra']}),false,'only a short tutorial expedition may commit');
assert.equal(wrong.save.progress.tutorial.expeditionDispatched,false);

const busyLegacy=makeTutorialContext({active:[{id:'legacy',mapId:'grassland',distanceId:'short',memberUids:['galdra'],status:'active'}]});
busyLegacy.save.progress.tutorial.stepId='expedition_destination';
const busyBefore=JSON.stringify(busyLegacy.save.expeditions);
assert.equal(vm.runInContext("resolveTutorialExpeditionResumeStep('prologue','expedition_destination',false)",busyLegacy),'expedition_replay',
  'a full legacy slot must resume at the already-guided explanation');
assert.equal(busyLegacy.save.progress.tutorial.expeditionDispatched,true,'existing activity must satisfy the one-time expedition requirement');
assert.equal(JSON.stringify(busyLegacy.save.expeditions),busyBefore,'routing must preserve the existing expedition exactly');

const completedLegacy=makeTutorialContext({completedCount:2});
completedLegacy.save.progress.tutorial.stepId='expedition_home_open';
assert.equal(vm.runInContext("resolveTutorialExpeditionResumeStep('prologue','expedition_home_open',false)",completedLegacy),'expedition_replay',
  'completed expedition history must not force another dispatch');
assert.equal(completedLegacy.save.progress.tutorial.expeditionDispatched,true);

const freshRoute=makeTutorialContext();
freshRoute.save.progress.tutorial.stepId='expedition_destination';
assert.equal(vm.runInContext("resolveTutorialExpeditionResumeStep('prologue','expedition_destination',false)",freshRoute),'expedition_destination',
  'a fresh save with an open slot must retain the hands-on dispatch route');
assert.equal(freshRoute.save.progress.tutorial.expeditionDispatched,false);

const justDispatched=makeTutorialContext({dispatched:true,active:[{id:'tutorial',mapId:'grassland',distanceId:'short',memberUids:['galdra'],status:'active',tutorialPrologue:true}]});
justDispatched.save.progress.tutorial.stepId='expedition_active';
assert.equal(vm.runInContext("resolveTutorialExpeditionResumeStep('prologue','expedition_active',false)",justDispatched),'expedition_active',
  'a newly dispatched tutorial expedition must still show its active-expedition explanation after reload');

dispatch.save.progress.tutorial.stepId='prologue_complete';
assert.equal(vm.runInContext('commitTutorialPrologueCompletion()',dispatch),true);
assert.equal(dispatch.save.progress.chapterId,'prologue');
assert.equal(dispatch.save.progress.storyFlags.prologueCompleted,true);
assert.equal(dispatch.save.progress.storyFlags.chapter1Unlocked,undefined);
assert.equal(dispatch.save.progress.tutorial.prologueCompleted,true);
assert.equal(dispatch.save.progress.tutorial.status,'completed');

const failed=makeTutorialContext({saveSucceeds:false,dispatched:true});
failed.save.progress.tutorial.stepId='prologue_complete';
const before=JSON.stringify(failed.save);
assert.equal(vm.runInContext('commitTutorialPrologueCompletion()',failed),false);
assert.equal(JSON.stringify(failed.save),before,'a failed final save must restore chapter, flags, and tutorial status');

const replay=makeTutorialContext({replaying:true,dispatched:true,completed:true});
replay.save.progress.storyFlags={prologueCompleted:true};
assert.equal(vm.runInContext('commitTutorialPrologueCompletion()',replay),true);
assert.equal(replay.save.progress.tutorial.replaying,false);
assert.equal(replay.save.progress.chapterId,'prologue','replay must not add a later chapter');

assert.ok(!index.includes('id="homeStoryPreview"'),'home must not advertise an unimplemented Chapter 1');
assert.ok(!ui.includes('homeChapterOneButton')&&!ui.includes('openChapterOneEntry'),'Chapter 1 entry must stay out of the prologue scope');
assert.ok(!tutorial.includes('chapter1Unlocked')&&!tutorial.includes("chapterId='chapter1'"),'prologue completion must not create Chapter 1 state');
assert.ok(saveSource.includes("function markTutorialExpeditionDispatched(){return markTutorialOnce('expeditionDispatched');}")&&saveSource.includes("function markTutorialPrologueCompleted(){return markTutorialOnce('prologueCompleted');}"));

for(const file of ['tutorial.js','expedition.js','ui.js'])assert.match(index,new RegExp(`${file.replace('.','\\.')}\\?v=[^"']*prologue-expedition-finale-1`),`${file} cache key must refresh`);
assert.equal(packageJson.scripts['check:prologue-expedition-finale'],'node scripts/test-prologue-expedition-finale.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-expedition-finale'));

console.log('Prologue expedition/finale validation passed (fresh dispatch, occupied/completed legacy routing, suitability, save lock, no-wait continuation, replay/idempotency, atomic completion, and free play without Chapter 1).');
