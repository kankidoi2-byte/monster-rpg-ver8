import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id,{innerHTML:'',textContent:'',classList:{add(){},remove(){}}});
  return elements.get(id);
};
const context = vm.createContext({
  console,
  structuredClone,
  setTimeout:callback => callback(),
  document:{getElementById:element},
  vis:monster => monster.name,
  renderSkillButtons(){},
  renderKokoroLinkPanel(){},
  renderBattleSwitchButton(){},
  update(){},
  startBattleTurn(){ context.started=(context.started||0)+1; },
  finishTurnWithPoison(){ context.finished=(context.finished||0)+1; context.busy=false; },
  completeBattleTurn(){},
  triggerInvasionIfDue(){ return false; },
  performAction(){ context.enemyActions=(context.enemyActions||0)+1; },
  nextEnemyMoveWithKokoroLinkForesight(){ return {move:['通常攻撃',24,'normal']}; },
  singleEnemyKokoroLinkKey(){ return 'single'; },
  consumeKokoroLinkEnemyActionDelay(){ return false; },
  aliveMultiEnemies(){ return []; },
  multiEnemyKokoroLinkSpeed(){ return 1; },
  runMultiActions(){},
  losePartyBattle(){ context.lost=true; }
});

vm.runInContext(`
let partyBattle=[],activePartyIdx=0,activeInstance=null,player=null,pHp=0;
let pAtk=1,pGuard=false,pStatus=null,pPoisonTurns=0,pParalysisTurns=0,pConfusionTurns=0,pSleepTurns=0,pFlareCharge=false,pAquaShield=false;
let busy=false,multiBattle=null,enemy={name:'Enemy'},eHp=100;
`,context);
vm.runInContext(fs.readFileSync(new URL('../js/battle-flow.js',import.meta.url),'utf8'),context);

vm.runInContext(`
partyBattle=[
  {uid:'a',inst:{uid:'a'},mon:{name:'Alpha'},hp:72,fainted:false},
  {uid:'b',inst:{uid:'b'},mon:{name:'Beta'},hp:48,fainted:false},
  {uid:'c',inst:{uid:'c'},mon:{name:'Gamma'},hp:0,fainted:true}
];
activePartyIdx=0;activeInstance=partyBattle[0].inst;player=partyBattle[0].mon;pHp=65;
`,context);

assert.deepEqual(
  Array.from(vm.runInContext('livingPartySwitchCandidates().map(candidate=>candidate.index)',context)),
  [1],
  'Only living reserve members may be selected'
);

assert.equal(vm.runInContext("changeActivePartyMember(1,{message:'switch'})",context),true);
assert.equal(vm.runInContext('activePartyIdx',context),1,'Selected reserve must become active');
assert.equal(vm.runInContext('partyBattle[0].hp',context),65,'Outgoing HP must be preserved');
assert.equal(vm.runInContext('pHp',context),48,'Incoming member must restore its own battle HP');

vm.runInContext(`activePartyIdx=0;activeInstance=partyBattle[0].inst;player=partyBattle[0].mon;pHp=61;partyBattle[0].hp=61;partyBattle[0].fainted=false;partyBattle[1].hp=48;busy=false;started=0;finished=0;enemyActions=0;`,context);
assert.equal(vm.runInContext('performManualPartySwitch(1)',context),true,'Manual switching must start when a living reserve is selected');
await Promise.resolve();
assert.equal(context.started,1,'Manual switching must consume one battle turn');
assert.equal(context.enemyActions,1,'The enemy must act after a normal switch');
assert.equal(context.finished,1,'The switch turn must reach normal end-of-turn handling');
assert.equal(vm.runInContext('activePartyIdx',context),1);

vm.runInContext(`activePartyIdx=0;activeInstance=partyBattle[0].inst;player=partyBattle[0].mon;pHp=0;partyBattle[0].hp=0;partyBattle[0].fainted=false;partyBattle[1].hp=37;partyBattle[1].fainted=false;`,context);
assert.equal(vm.runInContext('switchPartyMember()',context),true,'A fainted active member must switch automatically');
assert.equal(vm.runInContext('partyBattle[0].fainted',context),true,'The defeated member must be marked fainted');
assert.equal(vm.runInContext('activePartyIdx',context),1,'Automatic switching must choose a living reserve');
assert.equal(vm.runInContext('pHp',context),37,'Automatic switching must preserve the reserve HP');

console.log('Battle switch validation passed (candidate filtering, HP preservation, turn consumption, and enemy response).');
