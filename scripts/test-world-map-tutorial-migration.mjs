import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const saveSource=read('js/save.js');
const tutorialSource=read('js/tutorial.js');
const worldEventsSource=read('js/world-events.js');
const worldMapFlowSource=read('js/world-map-flow.js');

assert.match(saveSource,/const TUTORIAL_VERSION = 2;/,
  'world-map migration must not bump the published tutorial version');

const mainStart=tutorialSource.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const mainEnd=tutorialSource.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',mainStart);
assert.ok(mainStart>=0&&mainEnd>mainStart,'the persistent prologue flow must exist');
const mainFlow=tutorialSource.slice(mainStart,mainEnd);
const mainStepIds=[...mainFlow.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);
const mainStepIdSet=new Set(mainStepIds);
assert.equal(mainStepIdSet.size,mainStepIds.length,'persistent prologue step IDs must remain unique');

const storage=new Map();
const saveContext=vm.createContext({
  console,Date,JSON,Math,setTimeout,
  MAX_LEVEL:100,
  clampLevel:value=>Math.min(100,Math.max(1,Math.floor(Number(value)||1))),
  isMaxLevel:value=>Number(value)>=100,
  M:[
    {id:'elna_beginner'},{id:'freigal'},{id:'aquaron'},{id:'grassbeat'},
    {id:'volteck'},{id:'slime'},{id:'galdra'}
  ],
  MAPS:[{id:'grassland'},{id:'magic_academy'},{id:'kaen_village'}],
  ALCHEMY_MONSTER_CONFIGS:{},ITEM_DEX_BY_ID:{},ITEM_DEX_ITEMS:[],SHOP_ITEMS:[],
  localStorage:{
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem:(key,value)=>storage.set(key,String(value)),
    removeItem:key=>storage.delete(key)
  },
  alert(){},confirm:()=>false,showUiNotice(){},document:{},location:{reload(){}},
  navigator:{clipboard:{writeText:async()=>{}}},Blob:class{},
  URL:{createObjectURL:()=>'',revokeObjectURL(){}}
});
vm.runInContext(worldEventsSource,saveContext);
vm.runInContext(saveSource,saveContext);
const run=code=>vm.runInContext(code,saveContext);
const plain=value=>JSON.parse(JSON.stringify(value));

const ownedRoster=Object.freeze([
  {uid:'owned_fire',id:'freigal',level:4,exp:2,locked:true},
  {uid:'owned_water',id:'aquaron',level:4,exp:2,locked:false},
  {uid:'owned_elna',id:'elna_beginner',level:3,exp:1,locked:true},
  {uid:'owned_galdra',id:'galdra',level:1,exp:0,locked:false}
]);
function fixtureFor(tutorial){
  const fixture=plain(run('initSave()'));
  fixture.instances=plain(ownedRoster);
  fixture.caught=['freigal','aquaron','elna_beginner','galdra'];
  fixture.party=['owned_fire','owned_water','owned_elna'];
  fixture.coins=777;
  fixture.items.contract_scroll=5;
  fixture.items.monster_bone=3;
  fixture.skillCards={skill_elna_middle_01:1};
  fixture.progress.tutorial={id:'prologue',...tutorial};
  return fixture;
}
function prepare(fixture){
  saveContext.fixtureRaw=JSON.stringify(fixture);
  return plain(run('parseAndPrepareSave(fixtureRaw,[])'));
}
function assertNoAutomaticGrant(before,after,label){
  assert.deepEqual(after.instances,before.instances,`${label}: normalization must not add or duplicate roster entries`);
  assert.equal(new Set(after.instances.map(instance=>instance.uid)).size,after.instances.length,
    `${label}: normalized roster UIDs must stay unique`);
  assert.deepEqual(after.party,before.party,`${label}: party membership must not change`);
  assert.equal(after.coins,before.coins,`${label}: normalization must not grant coins`);
  assert.equal(after.items.contract_scroll,before.items.contract_scroll,`${label}: normalization must not grant contract scrolls`);
  assert.equal(after.items.monster_bone,before.items.monster_bone,`${label}: normalization must not grant materials`);
  assert.deepEqual(after.skillCards,before.skillCards,`${label}: normalization must not grant skill cards`);
  const second=prepare(after);
  assert.deepEqual(second,after,`${label}: a second migration pass must be idempotent`);
}

function resumeCallFor(state){
  const resumeStart=tutorialSource.indexOf('function resumeTutorialIfNeeded');
  const resumeEnd=tutorialSource.indexOf('function resumeTutorialMainFlowAfterEvent',resumeStart);
  assert.ok(resumeStart>=0&&resumeEnd>resumeStart,'tutorial resume function must remain available');
  const context=vm.createContext({
    document:{body:{classList:{contains:()=>false}}},
    TUTORIAL_MAIN_FLOW_ID:'prologue',state:plain(state),starts:[],shown:[],
    currentTutorialState:()=>context.state,
    tutorialShouldAutoStart:()=>context.state.status==='not_started'&&!context.state.replaying,
    startTutorialFlow:(flow,options)=>{context.starts.push({flow,options});return true;},
    show:screen=>context.shown.push(screen)
  });
  vm.runInContext(tutorialSource.slice(resumeStart,resumeEnd),context);
  const result=vm.runInContext('resumeTutorialIfNeeded()',context);
  return {result,starts:context.starts,shown:context.shown};
}
function assertInProgressFixture(stepId,label){
  assert.ok(mainStepIdSet.has(stepId),`${label}: resume target must exist in the main flow: ${stepId}`);
  const before=fixtureFor({version:2,status:'in_progress',stepId,completed:false,skipped:false});
  const after=prepare(before);
  assert.equal(after.progress.tutorial.version,2,`${label}: tutorial version must stay v2`);
  assert.equal(after.progress.tutorial.status,'in_progress',`${label}: active progress must remain active`);
  assert.equal(after.progress.tutorial.stepId,stepId,`${label}: checkpoint must normalize exactly`);
  const resume=resumeCallFor(after.progress.tutorial);
  assert.equal(resume.result,true,`${label}: interrupted progress must be resumable`);
  assert.equal(resume.starts.length,1,`${label}: resume must start exactly one persistent flow`);
  assert.equal(resume.starts[0].flow,'prologue');
  assert.equal(resume.starts[0].options.persist,true);
  assert.equal(resume.starts[0].options.stepId,stepId,`${label}: resume must target the normalized checkpoint`);
  assertNoAutomaticGrant(before,after,label);
}

// A new save starts the persistent flow at its first real target without any grant.
const freshBefore=fixtureFor({version:2,status:'not_started',stepId:null,completed:false,skipped:false});
const fresh=prepare(freshBefore);
assert.equal(fresh.progress.tutorial.status,'not_started');
const freshResume=resumeCallFor(fresh.progress.tutorial);
assert.equal(freshResume.result,true,'a new save must start the persistent prologue');
assert.equal(freshResume.starts.length,1);
assert.equal(freshResume.starts[0].options.persist,true);
assert.ok(mainStepIdSet.has(mainStepIds[0]),'the new-save start target must exist');
assertNoAutomaticGrant(freshBefore,fresh,'new save');

// Cover every newly inserted world-map checkpoint that is present in the flow.
const worldMapGuideSteps=mainStepIds.filter(id=>id.startsWith('rescue_world_map_'));
assert.deepEqual(worldMapGuideSteps,
  ['rescue_world_map_open','rescue_world_map_grassland','rescue_world_map_depart'],
  'the first exploration must retain its three resumable world-map checkpoints');
worldMapGuideSteps.forEach(stepId=>assertInProgressFixture(stepId,`world-map guide ${stepId}`));

// The published v2 rescue checkpoint remains the durable target for every battle sub-step.
assertInProgressFixture('elna_rescue_start','v2 rescue battle checkpoint');
for(const stepId of ['battle_enemy','battle_actor_open','battle_actor_select','battle_target','battle_attack_open','battle_normal_attack','battle_skill','battle_choose_skill','battle_free']){
  assert.match(mainFlow,new RegExp(`id:'${stepId}'[^\\n]+persistAs:'elna_rescue_start'`),
    `${stepId} must still persist at the safe rescue checkpoint`);
}

// Later published checkpoints must not be rewound to the new map tutorial.
for(const stepId of ['stella_intro','stella_mock_battle','lumina_intro','lumina_alchemy','expedition_intro','prologue_epilogue'])
  assertInProgressFixture(stepId,`later prologue checkpoint ${stepId}`);
for(const prefix of ['stella_world_map_','lumina_world_map_']){
  const facilityGuideSteps=mainStepIds.filter(id=>id.startsWith(prefix));
  assert.deepEqual(facilityGuideSteps,[`${prefix}open`,`${prefix}academy`,`${prefix}visit`],
    `${prefix} must retain all three resumable facility checkpoints`);
  facilityGuideSteps.forEach(stepId=>assertInProgressFixture(stepId,`facility world-map checkpoint ${stepId}`));
}

for(const stepId of ['stella_intro','lumina_intro']){
  const chapterBefore=fixtureFor({version:2,status:'in_progress',stepId,chapterGate:true,completed:false,skipped:false});
  const chapterAfter=prepare(chapterBefore);
  const chapterResume=resumeCallFor(chapterAfter.progress.tutorial);
  assert.equal(chapterAfter.progress.tutorial.chapterGate,true,`${stepId}: chapter break must survive reload`);
  assert.equal(chapterResume.result,true,`${stepId}: chapter break must remain resumable`);
  assert.deepEqual(chapterResume.starts,[],`${stepId}: chapter break must not start the next episode automatically`);
  assert.deepEqual(chapterResume.shown,['storyMode'],`${stepId}: reload must remain at the episode selector`);
  assertNoAutomaticGrant(chapterBefore,chapterAfter,`${stepId} chapter gate`);
}

// A v1 checkpoint is protected as legacy completion; it is not replayed under v2.
const legacyBefore=fixtureFor({version:1,status:'in_progress',stepId:'elna_rescue_start',completed:false,skipped:false});
const legacy=prepare(legacyBefore);
assert.equal(legacy.progress.tutorial.version,2);
assert.equal(legacy.progress.tutorial.status,'completed');
assert.equal(legacy.progress.tutorial.stepId,null,'legacy checkpoint must not enter an incompatible resumed flow');
assert.equal(resumeCallFor(legacy.progress.tutorial).result,false,'protected legacy progress must not restart');
assertNoAutomaticGrant(legacyBefore,legacy,'v1 legacy rescue checkpoint');

function mapIntroContractFor(prepared,label){
  const context=vm.createContext({
    console,save:plain(prepared),saveCalls:0,
    saveGame:()=>{context.saveCalls+=1;return true;},
    confirm:()=>false,alert(){},by:()=>null,isHuntMonsterEligible:()=>false,
    huntCandidatesFor:()=>[],HUNT_DIFFICULTIES:{},goldenLandMapIsReady:()=>false
  });
  vm.runInContext(worldEventsSource,context);
  vm.runInContext(worldMapFlowSource,context);
  assert.equal(vm.runInContext('worldMapOverviewIntroIsUnread()',context),true,
    `${label}: the optional one-time world-map introduction must remain available`);
  const snapshot=plain(context.save);
  assert.equal(vm.runInContext('worldMapDismissOverviewIntro()',context),true,`${label}: map introduction must be dismissible`);
  assert.equal(vm.runInContext('worldMapOverviewIntroIsUnread()',context),false,`${label}: dismissed introduction must not repeat`);
  assert.equal(vm.runInContext('worldMapDismissOverviewIntro()',context),false,`${label}: receipt must be one-time`);
  assert.equal(context.saveCalls,1,`${label}: one-time receipt must save exactly once`);
  assert.deepEqual(context.save.instances,snapshot.instances,`${label}: map introduction must not alter the roster`);
  assert.deepEqual(context.save.items,snapshot.items,`${label}: map introduction must not grant items`);
  assert.equal(context.save.coins,snapshot.coins,`${label}: map introduction must not grant coins`);
}

for(const status of ['completed','skipped']){
  const before=fixtureFor({
    version:2,status,stepId:status==='completed'?'lumina_intro':'rescue_world_map_depart',
    completed:status==='completed',skipped:status==='skipped',prologueCompleted:true
  });
  const after=prepare(before);
  assert.equal(after.progress.tutorial.status,status,`${status}: terminal status must be preserved`);
  assert.equal(after.progress.tutorial.stepId,null,`${status}: terminal saves must not retain a restart target`);
  assert.equal(resumeCallFor(after.progress.tutorial).result,false,`${status}: terminal save must not restart the prologue`);
  assert.equal(after.worldMap.guides.map_intro,false,`${status}: optional map introduction must start unread`);
  assertNoAutomaticGrant(before,after,`${status} save`);
  mapIntroContractFor(after,`${status} save`);
}

mapIntroContractFor(legacy,'v1 legacy rescue checkpoint');

console.log('World-map tutorial migration fixtures passed: new/map/rescue/later checkpoints, v1 protection, terminal saves, idempotent assets, and one-time map intro.');
