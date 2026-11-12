import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const renewalSource=fs.readFileSync(new URL('../js/battle-renewal.js',import.meta.url),'utf8').replace(/^renewalMount\(\);$/m,'');
const newIds=['max_potion','antidote','paralysis_heal','confusion_heal','awakening','full_heal','defense_potion','speed_potion','revive_drop','strong_incense','gold_dust'];
let cases=0;
function setup({realTurn=false}={}){
 const r=runtime();vm.runInContext(renewalSource,r.context);
 r.run(`save=initSave();save.instances=[];save.party=[];for(var id of ['freigal','aquaron','volteck']){var ins=addInstance(id,12);save.party.push(ins.uid);}prepareBattleParty();selectedMap=MAPS[0];enemy=by('grassbeat');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[],{allowOvertier:false});eHp=enemyMaxHp();busy=false;
 var autoRun=null;renewalCanAct=()=>!busy;renewalRender=()=>{};renewalDecorateSkills=()=>{};renewalClose=()=>{};renewalItemSheet=()=>{};updateItems=()=>{};captureBattleLog=()=>{};renderBattleInputState=()=>{};var itemTurns=0;`);
 if(!realTurn)r.run(`battleItemEnemyTurn=()=>{itemTurns++;busy=true;};renewalItemEnemyTurn=()=>battleItemEnemyTurn();`);
 return r;
}
function use(r,id,index=0,route='renewal'){
 r.context.item=id;r.context.index=index;
 r.run(route==='legacy'?`useBattleItem(item)`:`renewal.itemId=item;renewal.itemTarget=index;renewalUseItem()`);
}
const catalog=setup();
for(const id of newIds){
 catalog.context.id=id;
 assert.equal(catalog.run('initSave().items[id]'),0);
 catalog.run('delete save.items[id];ensureContractScrollItem()');assert.equal(catalog.run('save.items[id]'),0);
 catalog.run('save.items[id]=7;ensureContractScrollItem()');assert.equal(catalog.run('save.items[id]'),7);
 assert.equal(catalog.run('ITEM_GACHA_POOL.some(x=>x.id===id)'),false);
 assert.equal(catalog.run('ALCHEMY_MATERIAL_DROPS.some(x=>x.id===id)'),false);
 const deferred=['strong_incense','gold_dust'].includes(id);
 assert.equal(catalog.run('ITEM_BY_ID[id].shop!==false'),!deferred);
 assert.equal(catalog.run('ITEM_BY_ID[id].usableInBattle===true'),!deferred);
 catalog.run('save.coins=1000;save.items[id]=0;buyItem(id)');
 assert.equal(catalog.run('save.items[id]'),deferred?0:1);
 if(deferred)assert.equal(catalog.run('save.coins'),1000);
 cases++;
}
assert.equal(catalog.run('ITEM_BY_ID.gold_dust.price'),null);
const cures={antidote:['poison'],paralysis_heal:['paralysis'],confusion_heal:['confusion'],awakening:['sleep'],full_heal:['poison','paralysis','confusion','sleep']};
for(const route of ['renewal','legacy'])for(const [id,statuses] of Object.entries(cures)){
 const r=setup();r.run(`save.items.${id}=3;pStatus='poison';pPoisonTurns=3;pParalysisTurns=3;pConfusionTurns=3;pSleepTurns=3;`);
 use(r,id,0,route);use(r,id,0,route);
 assert.equal(r.run(`save.items.${id}`),2);assert.equal(r.run('itemTurns'),1);
 for(const k of ['poison','paralysis','confusion','sleep'])assert.equal(r.run(`tacticalCombatant(true).${k}`),statuses.includes(k)?0:3);
 assert.equal(r.run('pStatus'),statuses.includes('poison')?null:'poison');cases++;
 for(const index of [0,1]){
  const invalid=setup();invalid.run(`save.items.${id}=3`);use(invalid,id,index,route);
  assert.equal(invalid.run(`save.items.${id}`),3);assert.equal(invalid.run('itemTurns'),0);cases++;
 }
}
for(const route of ['renewal','legacy'])for(const half of [false,true]){
 for(const id of ['potion','upper_potion','max_potion']){
  const r=setup();r.context.half=half;r.run(`save.items.${id}=3;pHp=partyBattle[0].hp=1;activeHuntRequest.conditions=half?[{id:'healing_half'}]:[];var expected=Math.min(playerMaxHp(),1+battlePotionHealing('${id}',player,activeInstance,playerMaxHp()));`);
  if(id==='max_potion')assert.equal(r.run('expected'),r.run(half?'Math.min(playerMaxHp(),1+Math.floor(playerMaxHp()/2))':'playerMaxHp()'));
  use(r,id,0,route);use(r,id,0,route);assert.equal(r.run('pHp'),r.run('expected'));assert.equal(r.run('itemTurns'),1);assert.equal(r.run(`save.items.${id}`),2);cases++;
 }
 const r=setup();r.context.half=half;r.run(`save.items.revive_drop=3;activeHuntRequest.conditions=half?[{id:'healing_half'}]:[];partyBattle[1].hp=0;partyBattle[1].fainted=true;`);
 use(r,'revive_drop',1);use(r,'revive_drop',1);
 assert.equal(r.run('partyBattle[1].hp'),r.run(half?'Math.floor(instanceMaxHp(partyBattle[1].inst)/4)':'Math.floor(instanceMaxHp(partyBattle[1].inst)/2)'));
 assert.equal(r.run('partyBattle[1].fainted'),false);assert.equal(r.run('save.items.revive_drop'),2);assert.equal(r.run('itemTurns'),1);cases++;
}
for(const id of ['potion','upper_potion','max_potion','revive_drop']){
 const r=setup();r.run(`save.items.${id}=2`);use(r,id);assert.equal(r.run(`save.items.${id}`),2);assert.equal(r.run('itemTurns'),0);cases++;
}
for(const route of ['renewal','legacy'])for(const [id,key] of [['attack_potion','itemAttack'],['defense_potion','itemDefense'],['speed_potion','itemSpeed']]){
 const r=setup();r.run(`save.items.${id}=3`);use(r,id,0,route);r.run('busy=false');use(r,id,0,route);
 assert.equal(r.run(id==='attack_potion'?'pAtk':`player.${key}`),1.6);assert.equal(r.run('itemTurns'),2);
 r.run('changeActivePartyMember(1);changeActivePartyMember(0)');assert.equal(r.run(id==='attack_potion'?'pAtk':`player.${key}`),1);cases++;
 const reserve=setup();reserve.run(`save.items.${id}=1`);use(reserve,id,1);assert.equal(reserve.run(`partyBattle[1].${key}`),1.6);
 reserve.run('changeActivePartyMember(1)');assert.equal(reserve.run(id==='attack_potion'?'pAtk':`player.${key}`),1.6);cases++;
}
{
 const r=setup();r.run('var beforeDefense=battleStatDamageMultiplier(enemy,12,player,12),beforeSpeed=monSpd(player,activeInstance);save.items.defense_potion=1;save.items.speed_potion=1');
 use(r,'defense_potion');assert(Math.abs(r.run('battleStatDamageMultiplier(enemy,12,player,12)')-r.run('beforeDefense/1.6'))<1e-12);
 r.run('busy=false');use(r,'speed_potion');assert.equal(r.run('monSpd(player,activeInstance)'),r.run('Math.round(beforeSpeed*1.6)'));cases++;
}
for(const route of ['renewal','legacy'])for(const id of newIds.slice(0,9)){
 const r=setup();r.context.item=id;r.run(`save.items[item]=2;pHp=partyBattle[0].hp=10;pStatus='poison';pPoisonTurns=pParalysisTurns=pConfusionTurns=pSleepTurns=3;if(item==='revive_drop'){pHp=partyBattle[0].hp=0;partyBattle[0].fainted=true;}var before=JSON.stringify([partyBattle,pHp,pAtk,pStatus,pPoisonTurns,pParalysisTurns,pConfusionTurns,pSleepTurns]);commitSaveMutation=()=>false`);
 use(r,id,0,route);assert.equal(r.run('JSON.stringify([partyBattle,pHp,pAtk,pStatus,pPoisonTurns,pParalysisTurns,pConfusionTurns,pSleepTurns])'),r.run('before'));assert.equal(r.run('save.items[item]'),2);assert.equal(r.run('itemTurns'),0);cases++;
}
console.log(`PASS added battle items: ${cases} catalog, migration, target, cure, healing, buff and transaction cases`);
// Exercise the actual shared enemy-turn runner, not only the inventory callback.
for(const route of ['renewal','legacy'])for(const multi of [false,true]){
 const r=setup({realTurn:true});
 r.context.multi=multi;
 r.run(`mapStoryBattleToken=()=>null;mapStoryTokenValid=()=>true;save.items.defense_potion=2;var enemyActions=0;var originalAction=performAction;performAction=async(...args)=>{enemyActions++;return originalAction(...args)};var originalMulti=performMultiAttack;performMultiAttack=async(...args)=>{enemyActions++;return originalMulti(...args)};
 if(multi)multiBattle={active:true,finished:false,pendingMoveIndex:null,enemies:[createMultiEnemy(by('grassbeat'),'enemy_a'),createMultiEnemy(by('aquaron'),'enemy_b')],contractAttempts:{}};`);
 use(r,'defense_potion',0,route);use(r,'defense_potion',0,route);
 await r.flush();
 assert.equal(r.run('battleTurnCount'),1);assert.equal(r.run('save.items.defense_potion'),1);
 assert.equal(r.run('enemyActions'),multi?2:1);assert.equal(r.run('busy'),false);cases++;
}
console.log('PASS actual enemy response: both item routes, single and multi battles');
// A medicine must not reset, consume, or re-trigger the species trait counters.
{
 const r=setup();
 for(const file of ['traits-data','traits-battle'])r.run(fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'));
 r.run(`traitValue=(ins,type,fallback=0)=>type==='purify'?1:fallback;traitsForSpecies=()=>[{id:'purify',type:'purify',name:'浄化'}];resetTraitBattleState();save.items.antidote=1;`);
 assert.equal(r.run(`traitReceiveStatus('poison',()=>{pStatus='poison';pPoisonTurns=3;})`),false);
 assert.equal(r.run(`traitReceiveStatus('poison',()=>{pStatus='poison';pPoisonTurns=3;})`),true);
 use(r,'antidote');assert.equal(r.run('pPoisonTurns'),0);assert.equal(r.run('traitMember().purified'),1);
 assert.equal(r.run(`traitReceiveStatus('sleep',()=>{pSleepTurns=2;})`),true);assert.equal(r.run('pSleepTurns'),2);
}
console.log('PASS medicine preserves purification trait behavior');
