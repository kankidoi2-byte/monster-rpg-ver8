import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const saveSource=read('js/save.js');
const index=read('index.html');
const tutorialCss=read('css/tutorial.css');
const uiCss=read('css/ui-redesign.css');
const manifest=JSON.parse(read('images/tutorial/characters/manifest.json'));
const packageJson=JSON.parse(read('package.json'));

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
const main=tutorial.slice(flowStart,flowEnd);
assert.ok(flowStart>=0&&flowEnd>flowStart);
assert.ok(!main.includes('カナタ'),'Kanata must not appear anywhere in the prologue flow');
for(const [id,file] of [
  ['gnosis','gnosis-dialogue-transparent-final.png'],
  ['elna_beginner','elna_beginner.png'],
  ['stella_apprentice','stella_apprentice.png'],
  ['lumina_apprentice','lumina_apprentice.png']
]){
  const asset=manifest.characters.find(entry=>entry.id===id);
  assert.ok(asset?.validation?.rgba&&asset.validation.transparentPixels>0&&asset.validation.partialAlphaPixels>0,`${id} must retain real transparency`);
  const png=fs.readFileSync(new URL(`../images/tutorial/characters/${file}`,import.meta.url));
  assert.ok(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`${id} must be a decoded PNG`);
  assert.equal(png[25],6,`${id} must use RGBA color type`);
  assert.ok(main.includes(`images/tutorial/characters/${file}`),`${id} transparent portrait must be runtime-referenced`);
}
assert.equal(manifest.characters.find(entry=>entry.id==='gnosis')?.dexRegistered,false,'Gnosis must stay outside the dex');
const elnaAsset=manifest.characters.find(entry=>entry.id==='elna_beginner');
const elnaPng=fs.readFileSync(new URL('../images/tutorial/characters/elna_beginner.png',import.meta.url));
assert.equal(elnaAsset.width,384,'Elna must use the corrected 2:3 portrait width');
assert.equal(elnaAsset.height,576,'Elna must use the corrected 2:3 portrait height');
assert.equal(elnaAsset.validation.backgroundRemoved,true,'Elna must not contain the source scenery');
assert.equal(crypto.createHash('sha256').update(elnaPng).digest('hex'),elnaAsset.cutoutSha256,'the deployed Elna cutout must match the reviewed transparent asset');
assert.ok(tutorialCss.includes('[data-portrait="elna_beginner"] img')&&tutorialCss.includes('aspect-ratio:2/3'),'Elna must preserve her portrait ratio in the tutorial layer');

const dialogueStart=tutorial.indexOf('function tutorialLinkedStepIndex');
const dialogueEnd=tutorial.indexOf('function tutorialStepCanAdvance',dialogueStart);
assert.ok(dialogueStart>=0&&dialogueEnd>dialogueStart);
const dialogueContext=vm.createContext({
  tutorialElnaContractBusy:false,
  tutorialUiState:{active:true,index:0,replay:false,lastFocusedStep:null,steps:[
    {id:'intro',mode:'dialogue',nextStepId:null,replayNextStepId:null},
    {id:'story',mode:'dialogue',nextStepId:'name',replayNextStepId:null},
    {id:'name',mode:'external_action',nextStepId:null,replayNextStepId:null}
  ]},
  tutorialStepRequiresAction:step=>step?.mode!=='dialogue',
  tutorialStepIndex:(steps,id)=>steps.findIndex(step=>step.id===id),
  persistTutorialStep:()=>{dialogueContext.persisted=true;},
  renderTutorialStep:()=>{dialogueContext.rendered=true;}
});
vm.runInContext(tutorial.slice(dialogueStart,dialogueEnd),dialogueContext);
assert.equal(vm.runInContext('tutorialDialogueSkipTargetIndex()',dialogueContext),2,'dialogue skip must stop before the next operation');
assert.equal(vm.runInContext('skipTutorialDialogue()',dialogueContext),true);
assert.equal(dialogueContext.tutorialUiState.index,2);
assert.equal(dialogueContext.persisted,true);assert.equal(dialogueContext.rendered,true);
assert.equal(vm.runInContext('tutorialDialogueSkipTargetIndex()',dialogueContext),-1,'an operation wait must never be bypassed');

const skipStart=tutorial.indexOf('function tutorialSkipRewardInstance');
const skipEnd=tutorial.indexOf('function requestTutorialSkip',skipStart);
assert.ok(skipStart>=0&&skipEnd>skipStart);
const requiredFlags=['starterContractsGranted','elnaContractGranted','stellaSkillCardGranted','alchemySuppliesGranted','alchemyLessonPrepared','alchemyLessonCompleted','expeditionDispatched','prologueCompleted'];
function makeSkipContext({saveSucceeds=true,replaying=false,status='in_progress',instances=[],flags={}}={}){
  let serial=0;
  const tutorialState={status,stepId:'gnosis_name',completed:status==='completed',skipped:status==='skipped',replaying,elnaGuestActive:true,...Object.fromEntries(requiredFlags.map(flag=>[flag,false])),...flags};
  const context=vm.createContext({
    console:{error:()=>{}},
    TUTORIAL_STARTER_CONTRACT_IDS:['freigal','aquaron'],TUTORIAL_STELLA_SKILL_ID:'skill_elna_middle_01',
    TUTORIAL_LUMINA_ALCHEMY:{resultId:'galdra'},TUTORIAL_REQUIRED_SKIP_FLAGS:requiredFlags,
    SKILL_BY_ID:{skill_elna_middle_01:{id:'skill_elna_middle_01'}},
    tutorialBattleSession:{active:true,kind:'elna_rescue',enemyQueue:['slime']},
    save:{instances:structuredClone(instances),caught:instances.map(entry=>entry.id),party:[],skillCards:{},equippedSkills:{},progress:{chapterId:'prologue',storyFlags:{},tutorial:tutorialState}},
    currentTutorialState:()=>context.save.progress.tutorial,
    addInstance:(id,level,exp,extra)=>{const entry={uid:`u${++serial}`,id,level,exp,locked:false,...extra};context.save.instances.push(entry);if(!context.save.caught.includes(id))context.save.caught.push(id);return entry;},
    markTutorialOnce:flag=>{const state=context.save.progress.tutorial;if(state[flag])return false;state[flag]=true;return true;},
    setTutorialElnaGuestActive:value=>{context.save.progress.tutorial.elnaGuestActive=value===true;},
    skipTutorial:()=>{const state=context.save.progress.tutorial;if(state.replaying){state.replaying=false;state.stepId=null;return state;}state.status='skipped';state.completed=false;state.skipped=true;state.stepId=null;return state;},
    saveGame:()=>saveSucceeds,deactivateTutorialAlchemyLesson:()=>{context.lessonStopped=true;},
    updateParty:()=>{},renderParty:()=>{},renderDex:()=>{},updateItems:()=>{},updateAppResourceBar:()=>{},
    showUiNotice:message=>context.notices.push(message),notices:[]
  });
  vm.runInContext(tutorial.slice(skipStart,skipEnd),context);
  return context;
}

const fresh=makeSkipContext();
assert.equal(vm.runInContext('commitTutorialFullSkip()',fresh),true);
assert.deepEqual(Array.from(fresh.save.instances,entry=>entry.id).sort(),['aquaron','elna_beginner','freigal','galdra']);
assert.deepEqual(Array.from(fresh.save.party,uid=>fresh.save.instances.find(entry=>entry.uid===uid)?.id),['freigal','aquaron','elna_beginner']);
assert.equal(fresh.save.skillCards.skill_elna_middle_01,1);
for(const flag of requiredFlags)assert.equal(fresh.save.progress.tutorial[flag],true,`full skip must finalize ${flag}`);
assert.equal(fresh.save.progress.tutorial.status,'skipped');
assert.equal(fresh.save.progress.chapterId,'prologue');
assert.deepEqual({...fresh.save.progress.storyFlags},{prologueCompleted:true});
assert.equal(fresh.save.progress.tutorial.elnaGuestActive,false);
assert.equal(fresh.tutorialBattleSession.active,false);
assert.equal(vm.runInContext('commitTutorialFullSkip()',fresh),true);
assert.equal(fresh.save.instances.length,4,'repeating a full skip must not duplicate mandatory companions');
assert.equal(fresh.save.skillCards.skill_elna_middle_01,1,'repeating a full skip must not duplicate the Stella card');

const partial=makeSkipContext({instances:[{uid:'owned_freigal',id:'freigal',level:7,exp:3,locked:false}],flags:{starterContractsGranted:true}});
assert.equal(vm.runInContext('commitTutorialFullSkip()',partial),true);
assert.equal(partial.save.instances.filter(entry=>entry.id==='freigal').length,1,'partial progress must preserve an owned starter');
assert.ok(['aquaron','elna_beginner','galdra'].every(id=>partial.save.instances.some(entry=>entry.id===id)),'partial progress must fill every missing mandatory reward');

const repairedCard=makeSkipContext({flags:{stellaSkillCardGranted:true}});
assert.equal(vm.runInContext('commitTutorialFullSkip()',repairedCard),true);
assert.equal(repairedCard.save.skillCards.skill_elna_middle_01,1,'a migrated reward flag must repair a missing mandatory Stella card');

const failed=makeSkipContext({saveSucceeds:false});
const failedBefore=JSON.stringify(failed.save);
assert.equal(vm.runInContext('commitTutorialFullSkip()',failed),false);
assert.equal(JSON.stringify(failed.save),failedBefore,'failed skip persistence must roll back inventory, chapter, and status');
assert.equal(failed.notices.length,1);

assert.ok(saveSource.includes('sourceVersion<TUTORIAL_VERSION')&&saveSource.includes("normalized.status=keepSkipped?'skipped':'completed'"),'published v1 completed/skipped saves must stay protected');
assert.ok(saveSource.includes("source.replaying===true")&&saveSource.includes("tutorial_replay_retired_v1"),'retired replay saves must return to their resolved state through migration');
assert.ok(saveSource.includes("if((normalized.completed||normalized.skipped)&&!normalized.replaying)normalized.stepId=null"),'completed and skipped saves must not auto-resume');

const placementStart=tutorial.indexOf('function calculateTutorialPlacement');
const placementEnd=tutorial.indexOf('function setTutorialShadeRect',placementStart);
const placementContext=vm.createContext({});
vm.runInContext(tutorial.slice(placementStart,placementEnd),placementContext);
for(const viewport of [{width:360,height:640},{width:412,height:915},{width:1366,height:768}]){
  const bubble={width:Math.min(360,viewport.width-16),height:Math.min(260,viewport.height-20)};
  for(const target of [
    {top:70,bottom:150,left:20,right:viewport.width-20,width:viewport.width-40,height:80},
    {top:viewport.height-140,bottom:viewport.height-60,left:20,right:viewport.width-20,width:viewport.width-40,height:80},
    null
  ]){
    placementContext.target=target;placementContext.bubble=bubble;placementContext.viewport=viewport;
    const result=vm.runInContext('calculateTutorialPlacement(target,bubble,viewport)',placementContext);
    assert.ok(result.left>=0&&result.top>=0&&result.left+bubble.width<=viewport.width&&result.top+bubble.height<=viewport.height,`tutorial bubble must fit ${viewport.width}x${viewport.height}`);
    if(target&&result.side==='above')assert.ok(result.top+bubble.height<=target.top,'an above bubble must not cover its target');
    if(target&&result.side==='below')assert.ok(result.top>=target.bottom,'a below bubble must not cover its target');
  }
}
assert.match(tutorialCss,/\.tutorial-overlay\{[^}]*pointer-events:none/,'the overlay must not block operation targets');
assert.match(tutorialCss,/@media\(max-width:719px\)\{[^}]*bottom:43svh/,'portrait art must stay above the phone dialogue region');
assert.match(tutorialCss,/\.tutorial-overlay\.is-story-step \.tutorial-bubble\{max-height:calc\(100svh - 20px\)/,'phone story dialogue must expose its full natural content height');
assert.match(tutorialCss,/\.tutorial-overlay\.is-ui-guide-step \.tutorial-character-layer\{display:none\}/,'feature explanations must keep their highlighted UI unobstructed');
assert.match(tutorialCss,/@media\(max-width:480px\)[^\n]+grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,'phone controls must fit Back, dialogue skip, and full skip');
assert.ok(!index.includes('homeStoryPreview'),'the completed prologue must return to free play without a Chapter 1 route');
assert.ok(!tutorial.includes('chapter1Unlocked'),'full skip must not unlock an unimplemented Chapter 1');

assert.ok(index.includes('id="tutorialDialogueSkipButton"')&&index.includes('>会話スキップ</button>'));
assert.ok(index.includes('id="tutorialSkipButton"')&&index.includes('>全体スキップ</button>'));
assert.ok(index.indexOf('tutorialStoryBackdrop')<index.indexOf('tutorialCharacterLayer')&&index.indexOf('tutorialCharacterLayer')<index.indexOf('tutorialBubble'),'background, transparent portrait, and dialogue must remain separate layers');
assert.ok(index.includes('css/tutorial.css?v=prologue-stella-intro-1-prologue-lumina-alchemy-1-prologue-comprehensive-1'),'tutorial CSS cache key must be refreshed');
assert.ok(index.includes('tutorial-replay-scope-1-tutorial-replay-retired-1-tutorial-skill-button-layout-1-prologue-story-mode-1-prologue-episode-break-fix-1"></script>'),'tutorial JS cache key must be refreshed');
assert.equal(packageJson.scripts['check:prologue-comprehensive'],'node scripts/test-prologue-comprehensive.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-comprehensive'));

console.log('Prologue comprehensive validation passed (dialogue/full skip, atomic mandatory rewards, retired replay migration, new/v1/mid-save safety, 360/412/1366 layouts, transparent portraits, and no Kanata).');
