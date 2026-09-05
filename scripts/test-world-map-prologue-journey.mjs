import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

// This is deliberately dependency-free. It executes the real save/tutorial
// state machines while replacing paint, animation, and combat resolution with
// deterministic adapters. The adapters are not a DOM implementation: they
// only expose the fields touched while the tutorial engine renders a step.
let activeScreen='home';
const timers=[];
const elements=new Map();
function classList(){
  const values=new Set();
  return {
    add:(...names)=>names.forEach(name=>values.add(name)),
    remove:(...names)=>names.forEach(name=>values.delete(name)),
    toggle:(name,force)=>force===undefined?(values.has(name)?(values.delete(name),false):(values.add(name),true)):(force?(values.add(name),true):(values.delete(name),false)),
    contains:name=>values.has(name)
  };
}
function element(id=''){
  if(elements.has(id))return elements.get(id);
  const node={
    id,hidden:false,disabled:false,value:'',textContent:'',innerHTML:'',className:'',scrollTop:0,
    style:{},dataset:{},classList:classList(),
    setAttribute(name,value){this[name]=value;},getAttribute(name){return this[name]??null;},
    toggleAttribute(name,force){this[name]=force!==false;},
    closest(){return element(`${id}:closest`);},contains(){return false;},focus(){},scrollIntoView(){},
    setCustomValidity(){},reportValidity(){},
    getBoundingClientRect(){return {top:100,bottom:140,left:20,right:180,width:160,height:40};}
  };
  elements.set(id,node);return node;
}
const document={
  body:element('body'),documentElement:{clientWidth:390,clientHeight:844},activeElement:null,
  getElementById:id=>element(id),
  querySelector:selector=>selector==='.screen.active'?{id:activeScreen}:element(`selector:${selector}`),
  addEventListener(){},createElement:tag=>element(`created:${tag}`)
};
document.body.appendChild=()=>{};

function flushTimers(limit=200){
  let count=0;
  while(timers.length){
    assert.ok(++count<=limit,'tutorial queued too many timer callbacks');
    timers.shift()();
  }
}

const monsters=[
  {id:'freigal',types:['fire'],moves:[['火炎',30,'fire']]},
  {id:'aquaron',types:['water'],moves:[['水撃',30,'water']]},
  {id:'elna_beginner',types:['normal'],moves:[['斬撃',20,'normal']]},
  {id:'slime',types:['normal'],rarity:'★',moves:[['体当たり',10,'normal']]},
  {id:'grassbeat',types:['grass'],rarity:'★',moves:[['葉撃',10,'grass']]},
  {id:'galdra',types:['normal'],rarity:'★',moves:[['核撃',10,'normal']]}
];
const maps=[
  {id:'grassland',name:'草原',enemyIds:['slime','grassbeat']},
  {id:'magic_academy',name:'魔導学園',enemyIds:[]}
];
const materialIds=['monster_bone','magic_crystal','unstable_alchemy_matter','raptor_feather'];
const items=Object.fromEntries(materialIds.map(id=>[id,{id,name:id,icon:'item',alchemyMaterial:true}]));
const storage=new Map();
const huntRequests=new Map();
let requestSerial=0;
let instanceSerial=0;
const notices=[];

const context=vm.createContext({
  console,structuredClone,JSON,Math,Date,Set,Map,Object,Array,Number,String,Boolean,Promise,
  M:monsters,MAPS:maps,ALCHEMY_MONSTER_CONFIGS:{},
  SHOP_ITEMS:[{id:'contract_scroll'},...Object.values(items)],ITEM_DEX_ITEMS:Object.values(items),ITEM_DEX_BY_ID:items,ITEM_BY_ID:items,
  MAX_LEVEL:100,clampLevel:value=>Math.max(1,Math.min(100,Math.floor(Number(value)||1))),isMaxLevel:value=>Number(value)>=100,
  normalizeWorldMapState:()=>({guides:{map_intro:false},navigation:{}}),normalizeSkillId:id=>id,
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  alert(){},confirm:()=>true,prompt:()=>'',navigator:{clipboard:{writeText:async()=>{}}},location:{reload(){}},Blob:class {},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
  document,window:{innerWidth:390,innerHeight:844,addEventListener(){}},
  setTimeout:callback=>(()=>{timers.push(callback);return timers.length;})(),clearTimeout(){},requestAnimationFrame(){},
  show:screen=>{activeScreen=screen;},showUiNotice:message=>notices.push(message),
  updateParty(){},renderParty(){},renderDex(){},updateItems(){},updateAppResourceBar(){},updateTutorialMenuSummary(){},
  showWorldMapOverview:()=>true,showWorldMapLocation:()=>true,
  by:id=>monsters.find(monster=>monster.id===id)||null,
  createHuntRequest:(map,monster,difficultyId)=>({requestId:`request_${++requestSerial}`,mapId:map.id,enemyId:monster.id,difficultyId}),
  registerHuntRequest:request=>(huntRequests.set(request.requestId,request),request),
  enemyMaxHp:()=>10,setupBattle(){},showBattleOutcome(){},endPartyRecovery(){},
  playContractAnimation:async()=>{},
  SKILL_BY_ID:{skill_elna_middle_01:{id:'skill_elna_middle_01',name:'連続斬り',cost:2,power:34,types:['normal']}},
  isSkillAllowedForMonster:()=>true,equippedSkillCost:instance=>(context.saveView?.equippedSkills?.[instance.uid]||[]).length,
  skillCostLimitFor:()=>5,availableSkillCount:id=>Math.max(0,Number(context.saveView?.skillCards?.[id]||0)),
  skillTypes:skill=>skill.types,skillCardClass:()=>'',skillCardHeader:()=>'',skillTypeLabel:()=>'',skillToMove:()=>['連続斬り',34,'normal'],moveEffectText:()=>'',
  moveTypes:move=>Array.isArray(move?.[2])?move[2]:[move?.[2]],typeEff:(types,targetTypes)=>types.includes('fire')&&targetTypes.includes('grass')?2:1,
  openSkillEdit:uid=>{context.editingSkillUid=uid;activeScreen='skillEdit';},resetSkillFilters(){},renderSkillEdit(){},
  activateTutorialAlchemyLesson:config=>(context.activeAlchemyLesson=config,true),deactivateTutorialAlchemyLesson:()=>{context.activeAlchemyLesson=null;},showAlchemy:()=>{activeScreen='alchemy';},
  expeditionAvailableInstances:()=>context.saveView.instances.filter(instance=>!context.saveView.party.includes(instance.uid)),
  GameDiagnostics:{registerSaveProvider(){},registerTutorialProvider(){}}
});

vm.runInContext(read('js/save.js'),context,{filename:'js/save.js'});
vm.runInContext('globalThis.saveView=save',context);
// Keep generated UIDs reproducible even though the production helper combines
// the clock and Math.random.
vm.runInContext(`uid=()=>\`journey_\${++globalThis.instanceSerial}\`;`,Object.assign(context,{instanceSerial}),{filename:'journey-uid-adapter.js'});
vm.runInContext(`
  var player=null,enemy=null,activeInstance=null,partyBattle=[],busy=false,eHp=0,eAtk=1,eGuard=false,eStatus=null;
  var ePoisonTurns=0,eParalysisTurns=0,eConfusionTurns=0,eSleepTurns=0,eFlareCharge=false,eAquaShield=false;
  var pStatus=null,pPoisonTurns=0,battleRewardGranted=false,editingSkillUid=null;
  var activeHuntRequest=null;
  enemyMaxHp=()=>10;
`,context,{filename:'journey-runtime-state.js'});
context.startChosenBattle=(mapId,enemyId,difficultyId,requestId)=>{
  const request=huntRequests.get(requestId);
  assert.ok(request,`prepared hunt request must exist: ${requestId}`);
  activeScreen='battle';
  context.enemy=context.by(enemyId);
  context.partyBattle=vm.runInContext('tutorialBattlePartyInstances(getPartyInstances())',context).map(inst=>({inst}));
  context.activeInstance=context.partyBattle[0]?.inst||null;
  context.player=context.activeInstance?context.by(context.activeInstance.id):null;
};
vm.runInContext(read('js/tutorial.js'),context,{filename:'js/tutorial.js'});

const run=code=>vm.runInContext(code,context);
const plain=value=>JSON.parse(JSON.stringify(value));
const step=()=>run('tutorialCurrentStepId()');
const state=()=>plain(run('currentTutorialState()'));
const advanceQueued=()=>{assert.equal(run('queueTutorialActionAdvance()'),true,`${step()}: action must queue`);flushTimers();};
const reopenChapter=()=>{assert.equal(state().chapterGate,true,'closed tutorial must be waiting at a chapter gate');assert.equal(run('openTutorialFromMenu()'),true);flushTimers();};

assert.equal(storage.has('mb_v95c'),false,'journey must begin without an existing save');
assert.equal(run('resumeTutorialIfNeeded()'),true,'a new save must start the prologue');
flushTimers();
assert.equal(state().status,'in_progress');

const visited=[];
let guard=0;
while(state().status==='in_progress'){
  assert.ok(++guard<180,'prologue journey did not converge');
  if(!run('tutorialUiState.active')){reopenChapter();continue;}
  const id=step();
  visited.push(id);
  switch(id){
    case 'gnosis_name':
      element('tutorialPlayerNameInput').value='Journey Tester';
      assert.equal(run('confirmTutorialPlayerName()'),false);
      break;
    case 'rescue_world_map_grassland':
      assert.equal(run("handleTutorialWorldMapLocationSelection('grassland')"),false,'correct map must be allowed');
      advanceQueued();
      break;
    case 'rescue_world_map_depart':
      assert.equal(run("handleTutorialWorldMapDeparture('grassland','easy')"),true);
      break;
    case 'battle_actor_open': assert.equal(run("handleTutorialBattleAction('actor_picker_opened')"),true);flushTimers();break;
    case 'battle_actor_select': assert.equal(run("handleTutorialBattleAction('actor_selected')"),true);flushTimers();break;
    case 'battle_attack_open': assert.equal(run("handleTutorialBattleAction('skill_panel_opened')"),true);flushTimers();break;
    case 'battle_normal_attack': assert.equal(run("handleTutorialBattleAction('normal_attack')"),true);flushTimers();break;
    case 'battle_skill': assert.equal(run("handleTutorialBattleAction('skill_panel_opened')"),true);flushTimers();break;
    case 'battle_choose_skill': assert.equal(run("handleTutorialBattleAction('skill',{move:['技',20,'normal']})"),true);flushTimers();break;
    case 'battle_free':
      run('tutorialNext()');
      assert.equal(run('continueTutorialRescueWave()'),true,'rescue must include its deterministic second wave');
      assert.equal(run('tutorialBattleSession.enemyQueue.length'),0);
      assert.equal(run("handleTutorialBattleOutcome('victory')"),true);flushTimers();
      break;
    case 'elna_contract_execute':
      await run('confirmTutorialElnaContract()');flushTimers();
      break;
    case 'party_save': assert.equal(run('handleTutorialPartySaved()'),true);break;
    case 'request_accept': assert.equal(run('openTutorialSupplyRequest()'),true);break;
    case 'request_reward_claim': assert.equal(run('claimTutorialAlchemySupplyReward()'),true);break;
    case 'stella_world_map_academy':
    case 'lumina_world_map_academy':
      assert.equal(run("handleTutorialWorldMapLocationSelection('magic_academy')"),false,'correct facility must be allowed');
      advanceQueued();
      break;
    case 'stella_world_map_visit':
    case 'lumina_world_map_visit': assert.equal(run("handleTutorialWorldMapFacilityVisit('magic_academy')"),true);break;
    case 'stella_skill_open': {
      const uid=run('tutorialStellaSkillTargetInstance().uid');
      context.saveView.equippedSkills[uid]=['old_1','old_2','old_3'];
      assert.equal(run('openTutorialStellaSkillEdit()'),true);
      break;
    }
    case 'stella_skill_unequip': {
      const uid=run('tutorialStellaSkillTargetInstance().uid');
      context.saveView.equippedSkills[uid].pop();
      assert.equal(run(`handleTutorialStellaSkillUnequipped('${uid}')`),true);
      break;
    }
    case 'stella_skill_equip': {
      const uid=run('tutorialStellaSkillTargetInstance().uid');
      context.saveView.equippedSkills[uid].push('skill_elna_middle_01');
      context.saveView.skillCards.skill_elna_middle_01--;
      assert.equal(run(`handleTutorialStellaSkillEquipped('skill_elna_middle_01','${uid}')`),true);
      break;
    }
    case 'stella_mock_skill_open': assert.equal(run("handleTutorialBattleAction('skill_panel_opened')"),true);flushTimers();break;
    case 'stella_mock_advantage':
      assert.equal(run("handleTutorialBattleAction('skill',{move:['炎撃',30,'fire'],actor:activeInstance,target:enemy})"),true);flushTimers();break;
    case 'stella_mock_free':
      run('tutorialNext()');
      assert.equal(run("handleTutorialBattleOutcome('victory')"),true);flushTimers();
      break;
    case 'lumina_start': assert.equal(run('handleTutorialAlchemyConfirmationOpened()'),true);flushTimers();break;
    case 'lumina_execute': assert.equal(run('handleTutorialAlchemyExecutionStarted()'),true);flushTimers();break;
    case 'lumina_wait':
      run('tutorialNext()');
      for(const materialId of materialIds)context.saveView.items[materialId]--;
      context.saveView.coins-=250;
      run("addInstance('galdra',1,0,{tutorialAlchemyLesson:true})");
      assert.equal(run('commitTutorialLuminaAlchemySuccess()'),true);
      assert.equal(run('handleTutorialLuminaAlchemyCompleted()'),true);flushTimers();
      break;
    case 'expedition_destination': assert.equal(run("handleTutorialExpeditionDestinationSelected('grassland')"),true);break;
    case 'expedition_distance': assert.equal(run("handleTutorialExpeditionDistanceSelected('short')"),true);break;
    case 'expedition_member': {
      const uid=run('tutorialExpeditionCandidateInstance().uid');
      assert.equal(run(`handleTutorialExpeditionMemberSelected('${uid}',true)`),true);
      break;
    }
    case 'expedition_dispatch': {
      const uid=run('tutorialExpeditionCandidateInstance().uid');
      context.dispatchEntry={id:'journey_expedition',mapId:'grassland',distanceId:'short',memberUids:[uid],requiredWins:1,progress:0,status:'active'};
      assert.equal(run('commitTutorialExpeditionDispatch(dispatchEntry)'),true);
      context.saveView.expeditions.active.push(context.dispatchEntry);
      assert.equal(run('handleTutorialExpeditionStarted(dispatchEntry)'),true);
      break;
    }
    default: {
      const mode=run('tutorialDiagnosticsSnapshot().waitingMode');
      if(mode==='target_action')advanceQueued();
      else if(mode==='dialogue')run('tutorialNext()');
      else assert.fail(`journey has no operation for ${id} (${mode})`);
    }
  }
  flushTimers();
}

const finalSave=plain(context.saveView);
assert.ok(storage.has('mb_v95c'),'completed journey must be written under the compatible save key');
context.persistedJourneyRaw=storage.get('mb_v95c');
const reloadedSave=plain(run('parseAndPrepareSave(persistedJourneyRaw,[])'));
assert.equal(finalSave.progress.tutorial.status,'completed');
assert.equal(finalSave.progress.tutorial.completed,true);
assert.equal(finalSave.progress.tutorial.stepId,null);
assert.equal(finalSave.progress.storyFlags.prologueCompleted,true);
assert.equal(finalSave.progress.chapterId,'prologue');
assert.equal(finalSave.progress.tutorial.playerName,'Journey Tester');
assert.equal(finalSave.progress.tutorial.elnaGuestActive,false);
assert.equal(reloadedSave.progress.tutorial.status,'completed','persisted journey must survive save parsing');
assert.equal(reloadedSave.progress.storyFlags.prologueCompleted,true);
assert.deepEqual(reloadedSave.party,finalSave.party,'persisted party must survive save parsing');
for(const flag of ['starterContractsGranted','elnaContractGranted','stellaSkillCardGranted','alchemySuppliesGranted','alchemyLessonPrepared','alchemyLessonCompleted','expeditionDispatched','prologueCompleted']){
  assert.equal(finalSave.progress.tutorial[flag],true,`journey must finalize ${flag}`);
}
for(const id of ['freigal','aquaron','elna_beginner','galdra'])assert.equal(finalSave.instances.filter(instance=>instance.id===id).length,1,`${id} must be granted exactly once`);
assert.deepEqual(finalSave.party.map(uid=>finalSave.instances.find(instance=>instance.uid===uid)?.id),['freigal','aquaron','elna_beginner']);
assert.equal(finalSave.expeditions.active.length,1,'the prologue must dispatch one short expedition without waiting for its return');
assert.equal(finalSave.expeditions.active[0].tutorialPrologue,true);
assert.equal(run('resumeTutorialIfNeeded()'),false,'completed prologue must not reopen');
assert.equal(run("handleTutorialWorldMapDeparture('grassland','easy')"),false,'free exploration must no longer be intercepted by tutorial routing');
assert.equal(activeScreen,'home','completion must return to free-play home');
assert.equal(notices.length,0,`successful journey must not emit warnings: ${notices.join(' / ')}`);

const requiredJourneySteps=[
  'intro_gnosis','gnosis_name','rescue_world_map_open','rescue_world_map_grassland','rescue_world_map_depart',
  'battle_enemy','battle_free','elna_contract_execute','home_party','request_reward_claim',
  'stella_world_map_open','stella_world_map_visit','stella_mock_battle','stella_mock_free',
  'lumina_world_map_open','lumina_world_map_visit','lumina_alchemy','lumina_wait',
  'expedition_intro','expedition_dispatch','prologue_complete'
];
for(const id of requiredJourneySteps)assert.ok(visited.includes(id),`canonical new-save journey must visit ${id}`);

console.log(`World-map prologue journey passed: ${visited.length} live steps, two rescue waves, both facility routes, rewards, alchemy, expedition, completion, and tutorial-free exploration.`);
