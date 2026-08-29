import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const flow=read('js/battle-flow.js');
const data=read('js/data.js');
const css=read('css/tutorial.css');
const index=read('index.html');

assert.ok(data.includes("{id:'freigal'")&&data.includes("{id:'aquaron'")&&data.includes("{id:'slime'")&&data.includes("{id:'elna_beginner'"),'stable starter, enemy, and Elna source IDs must remain available');
assert.ok(tutorial.includes("TUTORIAL_STARTER_CONTRACT_IDS=Object.freeze(['freigal','aquaron'])"),'the two approved contract bodies must be fixed by stable IDs');
assert.ok(tutorial.includes("TUTORIAL_RESCUE_ENEMY_IDS=Object.freeze(['slime','slime'])"),'the rescue must guarantee two sequential Slime enemies');
assert.ok(tutorial.includes("uid:'tutorial_guest_elna'")&&tutorial.includes("sourceId:'elna_beginner'")&&tutorial.includes("guest:true"),'Elna herself must use a dedicated temporary GUEST descriptor');
assert.ok(!tutorial.includes("addInstance('elna_beginner'"),'Elna herself must never be persisted as the encounter GUEST');

const encounterSteps=[
  'gnosis_descent','elna_encounter','gnosis_rescue_alert','gnosis_starter_contracts',
  'starter_contracts_received','elna_guest_join','elna_rescue_start'
];
let previous=-1;
for(const id of encounterSteps){
  const current=tutorial.indexOf(`id:'${id}'`);
  assert.ok(current>previous,`missing or out-of-order Elna encounter step: ${id}`);
  previous=current;
}
const encounter=tutorial.slice(tutorial.indexOf("id:'elna_encounter'"),tutorial.indexOf("id:'home_party'"));
assert.ok(encounter.includes('スライムに囲まれてる')||encounter.includes('スライムに囲まれた'),'the story must visibly establish that Slimes surround Elna');
assert.ok(encounter.includes('助けに入ろう！')&&encounter.includes('フレイガルとアクアロンの契約体を貸すぞ！'),'Gnosis must call for the rescue and lend the two contract bodies');
assert.ok(encounter.includes('本人エルナが共闘')&&encounter.includes('私も一緒に戦う'),'the encounter must distinguish Elna herself joining as a guest');
assert.ok(encounter.includes("transition:'start_elna_rescue'")&&encounter.includes("nextStepId:'battle_enemy'"),'the rescue confirmation must start real combat before battle guidance');
assert.ok(!encounter.includes('カナタ'),'Kanata must not appear in the prologue encounter');
assert.ok((encounter.match(/images\/tutorial\/characters\/elna_beginner\.png/g)||[]).length>=2,'Elna dialogue must use the existing transparent portrait');
assert.match(css,/data-scene="grassland"/,'the encounter background must be a separate grassland layer');
assert.ok(index.includes('js/tutorial.js?v=prologue-elna-encounter-1')&&index.includes('prologue-elna-rescue-1'),'changed encounter and battle scripts must have fresh cache keys');

assert.ok(tutorial.includes('function ensureTutorialStarterContracts')&&tutorial.includes("addInstance(id,1,0,{tutorialContract:true})"),'the encounter must grant real contract-body instances');
assert.ok(tutorial.includes('save.party=starters.map(instance=>instance.uid)'),'the two received bodies must become the real saved party');
assert.ok(tutorial.includes("setTutorialElnaGuestActive==='function'")&&tutorial.includes('setTutorialElnaGuestActive(true)'),'required progress must remember that Elna herself is temporarily active');
assert.ok(tutorial.includes("if(typeof saveGame==='function'&&!saveGame())throw"),'starter grant and guest activation must roll back when persistence fails');

const helperStart=tutorial.indexOf('function tutorialOwnedStarterInstance');
const helperEnd=tutorial.indexOf('function tutorialFirstHuntIsPending',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart,'Elna encounter helpers must be present');
const context=vm.createContext({
  console,JSON,
  TUTORIAL_STARTER_CONTRACT_IDS:['freigal','aquaron'],
  TUTORIAL_ELNA_GUEST:{uid:'tutorial_guest_elna',id:'elna_beginner',sourceId:'elna_beginner',level:1,exp:0,locked:true,guest:true},
  TUTORIAL_RESCUE_ENEMY_IDS:['slime','slime'],
  TUTORIAL_FIRST_HUNT:{mapId:'grassland',enemyId:'slime',difficultyId:'easy'},
  tutorialBattleSession:{active:true,kind:'elna_rescue',firstSkillUsed:false,enemyQueue:[]},
  tutorialTransitionBusy:false,
  save:{instances:[],party:[],progress:{tutorial:{replaying:false,starterContractsGranted:false,elnaGuestActive:false}}},
  serial:0,saveSucceeds:true,updates:0,notices:[],
  currentTutorialState:()=>context.save.progress.tutorial,
  addInstance:(id,level,exp,extra)=>{const instance={uid:`u${++context.serial}`,id,level,exp,...extra};context.save.instances.push(instance);return instance;},
  markTutorialStarterContractsGranted:()=>{const state=context.save.progress.tutorial;if(state.starterContractsGranted)return false;state.starterContractsGranted=true;return true;},
  setTutorialElnaGuestActive:active=>(context.save.progress.tutorial.elnaGuestActive=active===true),
  saveGame:()=>context.saveSucceeds,
  updateParty:()=>context.updates++,
  showUiNotice:message=>context.notices.push(message),
  MAPS:[{id:'grassland'}],by:id=>({id}),createHuntRequest:()=>({}),registerHuntRequest:x=>x,
  startChosenBattle:()=>{},activeScreenId:()=>'',partyBattle:[],player:null,enemy:null
});
vm.runInContext(tutorial.slice(helperStart,helperEnd),context);
assert.equal(vm.runInContext('ensureTutorialStarterContracts()',context),true,'the first encounter must grant its two bodies atomically');
assert.deepEqual(context.save.instances.map(instance=>instance.id),['freigal','aquaron']);
assert.equal(context.save.party.length,2);
assert.equal(context.save.progress.tutorial.starterContractsGranted,true);
assert.equal(context.save.progress.tutorial.elnaGuestActive,true);
assert.equal(vm.runInContext('ensureTutorialStarterContracts()',context),true,'resuming the same grant step must remain successful');
assert.equal(context.save.instances.length,2,'resuming must not duplicate either contract body');
const battleParty=vm.runInContext('tutorialBattlePartyInstances([])',context);
assert.equal(battleParty.length,3,'the rescue party must be two saved bodies plus one temporary guest');
assert.equal(battleParty[2].guest,true);
assert.equal(context.save.instances.some(instance=>instance.id==='elna_beginner'),false,'the temporary Elna guest must stay outside saved instances');

context.save={instances:[],party:[],progress:{tutorial:{replaying:false,starterContractsGranted:false,elnaGuestActive:false}}};
context.serial=0;context.saveSucceeds=false;
assert.equal(vm.runInContext('ensureTutorialStarterContracts()',context),false,'a failed save must reject the grant');
assert.equal(context.save.instances.length,0,'failed persistence must roll back granted bodies');
assert.equal(context.save.progress.tutorial.starterContractsGranted,false);
assert.equal(context.save.progress.tutorial.elnaGuestActive,false);

assert.ok(tutorial.includes("request.battleMode='single'")&&tutorial.includes("request.enemyIds=[...TUTORIAL_RESCUE_ENEMY_IDS]"),'the rescue request must guarantee its enemy roster without random three-way or invasion rolls');
assert.ok(tutorial.includes("partyBattle.length===3")&&tutorial.includes("enemy?.id==='slime'")&&tutorial.includes("entry.inst?.guest===true"),'combat must not advance until enemy, two bodies, and Elna GUEST all exist');
assert.ok(flow.includes("tutorialBattlePartyInstances(savedParty)"),'the real battle party builder must accept the temporary GUEST layer');
assert.ok(flow.indexOf("continueTutorialRescueWave")<flow.indexOf("if (battleRewardGranted) return;",flow.indexOf('function win()')),'the next guaranteed Slime must spawn before victory rewards are finalized');
assert.ok(tutorial.includes('function continueTutorialRescueWave')&&tutorial.includes("tutorialBattleSession.enemyQueue.shift()")&&tutorial.includes('setupBattle()'),'the second Slime must be generated as an actual sequential battle wave');
assert.ok(tutorial.includes("rescue?'elna_rescue_complete':'victory_exp'")&&tutorial.includes("rescue?'elna_rescue_retry':'battle_retry'"),'rescue outcomes must stay on the prologue path rather than the old Slime-contract path');
assert.ok(tutorial.includes("persistAs:'elna_contract_intro'")&&tutorial.includes("waitForEvent:'elna_contract_intro'"),'victory must stop at the safe Phase 8 contract checkpoint');
assert.ok(flow.includes("handleTutorialBattleOutcome('defeat')")&&flow.includes("handleTutorialBattleOutcome('retreat')"),'defeat and retreat must remain recoverable');

console.log('Tutorial Phase 4B validation passed (Elna encounter, idempotent Freigal/Aquaron grant, temporary GUEST, two guaranteed Slime waves, real battle start, and safe outcome checkpoints).');
