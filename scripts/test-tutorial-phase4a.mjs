import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const data=read('js/data.js');
const party=read('js/party.js');
const tutorial=read('js/tutorial.js');
const init=read('js/init.js');
const index=read('index.html');

const starters=['elna_beginner','freigal','aquaron','grassbeat','volteck'];
assert.ok(data.includes(`const INITIAL_PARTY_IDS=Object.freeze(['${starters.join("','")}'])`),'the five stable starter IDs must remain unchanged');
starters.forEach(id=>assert.ok(tutorial.includes(id)||tutorial.includes({
  elna_beginner:'初級剣士エルナ',freigal:'フレイガル',aquaron:'アクアロン',grassbeat:'グラスビート',volteck:'ボルテック'
}[id]),`starter must be represented in the onboarding: ${id}`));
assert.ok(party.includes('data-monster-id="${m.id}"'),'party choices must expose a stable tutorial target without changing monster IDs');

const orderedSteps=['intro_gnosis','party_open','party_choose','party_more','party_leader','home_return','home_adventure','home_party','home_coin','home_menu'];
let previous=-1;
orderedSteps.forEach(id=>{
  const current=tutorial.indexOf(`id:'${id}'`);
  assert.ok(current>previous,`missing or out-of-order Phase 4A step: ${id}`);
  previous=current;
});
assert.ok(!tutorial.includes("id:'first_hunt'"),'Phase 4A must not implement the Phase 4B hunt flow early');
assert.ok(tutorial.includes("continueAt:'first_hunt'"),'Phase 4A must checkpoint safely at the Phase 4B entry');

assert.ok(tutorial.includes("title:'グノーシス'")&&tutorial.includes('ようこそ、契約者。'),'Gnosis must address the player as 契約者 without adding a long story');
assert.ok(tutorial.includes('好きな1〜3体を選んで'),'the player must be allowed to choose one to three starters');
assert.ok(tutorial.includes('最初の仲間がリーダーです'),'the first party member must be explained as leader');
assert.ok(tutorial.includes('あとからいつでも変更できます'),'later party changes must be explained');
assert.ok(tutorial.includes("target:'#homeAdventureButton'")&&tutorial.includes("target:'#homePartyEditButton'")&&tutorial.includes("target:'.app-resource'")&&tutorial.includes("target:'.app-bottom-nav'"),'home guidance must stay limited to adventure, party, coins, and the bottom menu');

assert.ok(index.includes('id="homePartyEditButton"')&&index.includes('id="partyCurrentCard"'),'home and party tutorial anchors must be stable DOM IDs');
assert.ok(tutorial.includes('requiredPartyMin:1')&&tutorial.includes('requiredPartyMax:3'),'progress must reject an empty or oversized party');
assert.ok(tutorial.includes('function tutorialStepCanAdvance')&&tutorial.includes("typeof getPartyInstances==='function'"),'party selection must be validated against the real party state');
assert.ok(tutorial.includes('function checkpointTutorialFlow')&&tutorial.includes('setTutorialStep(step.continueAt)'),'the unfinished required tutorial must checkpoint instead of completing');
assert.ok(tutorial.includes('if(tutorialShouldAutoStart())return startTutorialFlow'),'new saves must auto-start the registered required tutorial');
assert.ok(init.includes('setTimeout(resumeTutorialIfNeeded,0)'),'title exit and reload must use the shared new/resume entry point');

const guardStart=tutorial.indexOf('function tutorialStepCanAdvance');
const guardEnd=tutorial.indexOf('function checkpointTutorialFlow',guardStart);
const guardContext=vm.createContext({partyCount:0,notices:[],getPartyInstances:()=>Array.from({length:guardContext.partyCount}),showUiNotice:message=>guardContext.notices.push(message)});
vm.runInContext(tutorial.slice(guardStart,guardEnd),guardContext);
guardContext.step={requiredPartyMin:1,requiredPartyMax:3};
assert.equal(vm.runInContext('tutorialStepCanAdvance(step)',guardContext),false,'an empty party must block progress');
guardContext.partyCount=1;
assert.equal(vm.runInContext('tutorialStepCanAdvance(step)',guardContext),true,'one selected starter must allow progress');
guardContext.partyCount=3;
assert.equal(vm.runInContext('tutorialStepCanAdvance(step)',guardContext),true,'three selected starters must allow progress');
guardContext.partyCount=4;
assert.equal(vm.runInContext('tutorialStepCanAdvance(step)',guardContext),false,'more than three members must block progress');

const resumeStart=tutorial.indexOf('function resumeTutorialIfNeeded');
const resumeEnd=tutorial.indexOf('function handleTutorialScreenChange',resumeStart);
const entryContext=vm.createContext({
  document:{body:{classList:{contains:()=>false}}},
  TUTORIAL_MAIN_FLOW_ID:'prologue',state:{status:'not_started',stepId:null,replaying:false},starts:[],
  currentTutorialState:()=>entryContext.state,
  tutorialShouldAutoStart:()=>entryContext.state.status==='not_started',
  startTutorialFlow:(flow,options)=>{entryContext.starts.push({flow,options});return true;}
});
vm.runInContext(tutorial.slice(resumeStart,resumeEnd),entryContext);
assert.equal(vm.runInContext('resumeTutorialIfNeeded()',entryContext),true);
assert.equal(entryContext.starts[0].options.persist,true,'a new save must enter the persistent required flow');
entryContext.state={status:'completed',stepId:null,replaying:false};entryContext.starts=[];
assert.equal(vm.runInContext('resumeTutorialIfNeeded()',entryContext),false,'an existing completed save must not be forced into onboarding');
entryContext.state={status:'in_progress',stepId:'party_more',replaying:false};entryContext.starts=[];
assert.equal(vm.runInContext('resumeTutorialIfNeeded()',entryContext),true);
assert.equal(entryContext.starts[0].options.stepId,'party_more','an interrupted onboarding must resume its saved step');

console.log('Tutorial Phase 4A validation passed (new-save entry, Gnosis copy, five starter choices, 1–3 party guard, leader rule, home guidance, and Phase 4B checkpoint).');
