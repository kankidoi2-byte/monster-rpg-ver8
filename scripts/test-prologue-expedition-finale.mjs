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
assert.ok(finale.includes('帰還を待たなくて大丈夫！'),'the prologue must continue without waiting for expedition return');
assert.ok(finale.trimEnd().endsWith(']);'),'the new prologue completion STEP must end the main flow');

for(const token of [
  'data-tutorial-expedition-map="${map.id}"','data-tutorial-expedition-distance="${distance.id}"',
  'data-tutorial-expedition-member="true"','id="expeditionSuitability"','id="expeditionStartButton"',
  'data-tutorial-expedition-active="true"'
])assert.ok(expedition.includes(token),`missing stable expedition UI contract: ${token}`);
assert.ok(expedition.includes("entry.status!=='active'"),'dispatch must remain active until a later battle win');
assert.ok(expedition.includes("distanceId:distance.id")&&expedition.includes("requiredWins:distance.wins"),'the tutorial must use the normal distance contract');

const helperStart=tutorial.indexOf('function tutorialExpeditionCandidateInstance()');
const helperEnd=tutorial.indexOf('function tutorialStellaSkillCard()',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart);
function makeTutorialContext({saveSucceeds=true,replaying=false,dispatched=false,completed=false}={}){
  const state={status:'in_progress',stepId:'expedition_dispatch',replaying,expeditionDispatched:dispatched,prologueCompleted:completed};
  const context=vm.createContext({
    console:{error:()=>{}},TUTORIAL_LUMINA_ALCHEMY:{resultId:'alchemion'},TUTORIAL_MAIN_FLOW_ID:'prologue',
    save:{progress:{chapterId:'prologue',storyFlags:{},tutorial:state},instances:[{uid:'alc',id:'alchemion'}],party:[],expeditions:{active:[]}},
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
const entry={mapId:'grassland',distanceId:'short',memberUids:['alc']};
assert.equal(vm.runInContext('commitTutorialExpeditionDispatch',dispatch)(entry),true);
assert.equal(entry.tutorialPrologue,true);
assert.equal(dispatch.save.progress.tutorial.expeditionDispatched,true);
assert.equal(dispatch.save.progress.tutorial.stepId,'expedition_active');
dispatch.save.progress.tutorial.stepId='expedition_dispatch';
assert.equal(vm.runInContext('handleTutorialExpeditionStarted',dispatch)(entry),true);
assert.equal(dispatch.advanced,true);

const wrong=makeTutorialContext();
assert.equal(vm.runInContext('commitTutorialExpeditionDispatch',wrong)({mapId:'grassland',distanceId:'long',memberUids:['alc']}),false,'only a short tutorial expedition may commit');
assert.equal(wrong.save.progress.tutorial.expeditionDispatched,false);

dispatch.save.progress.tutorial.stepId='prologue_complete';
assert.equal(vm.runInContext('commitTutorialPrologueCompletion()',dispatch),true);
assert.equal(dispatch.save.progress.chapterId,'chapter1');
assert.equal(dispatch.save.progress.storyFlags.prologueCompleted,true);
assert.equal(dispatch.save.progress.storyFlags.chapter1Unlocked,true);
assert.equal(dispatch.save.progress.tutorial.prologueCompleted,true);
assert.equal(dispatch.save.progress.tutorial.status,'completed');

const failed=makeTutorialContext({saveSucceeds:false,dispatched:true});
failed.save.progress.tutorial.stepId='prologue_complete';
const before=JSON.stringify(failed.save);
assert.equal(vm.runInContext('commitTutorialPrologueCompletion()',failed),false);
assert.equal(JSON.stringify(failed.save),before,'a failed final save must restore chapter, flags, and tutorial status');

const replay=makeTutorialContext({replaying:true,dispatched:true,completed:true});
replay.save.progress.chapterId='chapter1';replay.save.progress.storyFlags={prologueCompleted:true,chapter1Unlocked:true};
assert.equal(vm.runInContext('commitTutorialPrologueCompletion()',replay),true);
assert.equal(replay.save.progress.tutorial.replaying,false);
assert.equal(replay.save.progress.chapterId,'chapter1','replay must retain the unlocked chapter');

assert.ok(index.includes('id="homeStoryPreview"'),'home must reserve a story route');
assert.ok(ui.includes('id="homeChapterOneButton"')&&ui.includes('function openChapterOneEntry()'),'Chapter 1 needs a visible and working home route');
assert.ok(ui.includes("save?.progress?.chapterId==='chapter1'")&&ui.includes('openBattleHub();return true;'),'the route must only unlock after the prologue and lead to free adventure');
assert.ok(saveSource.includes("function markTutorialExpeditionDispatched(){return markTutorialOnce('expeditionDispatched');}")&&saveSource.includes("function markTutorialPrologueCompleted(){return markTutorialOnce('prologueCompleted');}"));

for(const file of ['tutorial.js','expedition.js','ui.js'])assert.match(index,new RegExp(`${file.replace('.','\\.')}\\?v=[^"']*prologue-expedition-finale-1`),`${file} cache key must refresh`);
assert.equal(packageJson.scripts['check:prologue-expedition-finale'],'node scripts/test-prologue-expedition-finale.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-expedition-finale'));

console.log('Prologue expedition/finale validation passed (short dispatch, suitability, real save lock, no-wait continuation, replay/idempotency, atomic completion, free play, and Chapter 1 route).');
