import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const source=fs.readFileSync(new URL('../js/battle-renewal.js',import.meta.url),'utf8').replace(/^renewalMount\(\);$/m,'');
function setup(){
 const r=runtime();vm.runInContext(source,r.context,{filename:'battle-renewal.js'});
 r.run(`save=initSave();save.instances=[];save.party=[];for(var id of ['freigal','aquaron','volteck']){var ins=addInstance(id,12);save.party.push(ins.uid);}prepareBattleParty();selectedMap=MAPS[0];enemy=by('grassbeat');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[],{allowOvertier:false});busy=false;
 var autoRun=null;renewalCanAct=()=>!busy;renewalRender=()=>{};renewalDecorateSkills=()=>{};renewalClose=()=>{};renewalItemSheet=()=>{};updateItems=()=>{};captureBattleLog=()=>{};var itemTurns=0;renewalItemEnemyTurn=()=>{itemTurns++;busy=true;};
 `);return r;
}
let cases=0;
const r=setup();
const before=r.run('JSON.stringify(save)');
for(const target of ['grassbeat','aquaron','volteck','elysia','nemes']){
 r.context.id=target;r.run('enemy=by(id)');
 for(const mon of r.run('M.map(m=>m.id)')){
  r.context.monId=mon;
  assert(r.run(`by(monId).moves.every(move=>renewalEffect(move).kind===(Number(move[1])?(typeEff(moveTypes(move),enemy.types)>1?'good':typeEff(moveTypes(move),enemy.types)<1?'weak':'normal'):'support'))`));cases++;
 }
}
assert.equal(r.run('JSON.stringify(save)'),before,'presentation never changes save');
r.run(`enemy=by('grassbeat');multiBattle={active:true,finished:false,pendingMoveIndex:null,enemies:[createMultiEnemy(by('grassbeat'),'enemy_a'),createMultiEnemy(by('aquaron'),'enemy_b')],contractAttempts:{}}`);
assert.equal(r.run('renewalTarget().id'),'enemy_a');
r.run("renewalSelectTarget('enemy_b')");assert.equal(r.run('renewalTarget().id'),'enemy_b');
r.run("multiBattle.enemies[1].hp=0;multiBattle.enemies[1].alive=false");assert.equal(r.run('renewalTarget().id'),'enemy_a');
r.run("renewalSelectTarget('enemy_b')");assert.equal(r.run('renewalTarget().id'),'enemy_a');cases+=4;
// Atomic inventory + reserve targeting + repeated click + unavailable target.
for(const index of [0,1,2])for(const item of ['potion','upper_potion','attack_potion']){
 const a=setup();a.context.targetIndex=index;a.context.item=item;
 a.run(`save.items[item]=3;pHp=partyBattle[0].hp=10;partyBattle[1].hp=10;partyBattle[2].hp=10;renewal.itemId=item;renewal.itemTarget=targetIndex;renewalUseItem();renewalUseItem();`);
 assert.equal(a.run('save.items[item]'),2);assert.equal(a.run('itemTurns'),1);
 if(item==='attack_potion')assert.equal(a.run('targetIndex===activePartyIdx?pAtk:partyBattle[targetIndex].itemAttack'),1.6);
 else assert(a.run('(targetIndex===activePartyIdx?pHp:partyBattle[targetIndex].hp)>10'));
 cases++;
}
const failed=setup();failed.run(`save.items.potion=3;pHp=partyBattle[0].hp=10;renewal.itemId='potion';renewal.itemTarget=0;commitSaveMutation=()=>false;renewalUseItem();`);
assert.equal(failed.run('pHp'),10);assert.equal(failed.run('save.items.potion'),3);assert.equal(failed.run('itemTurns'),0);cases++;
const dead=setup();dead.run(`save.items.potion=3;partyBattle[1].hp=0;renewal.itemId='potion';renewal.itemTarget=1;renewalUseItem();`);assert.equal(dead.run('save.items.potion'),3);assert.equal(dead.run('itemTurns'),0);cases++;
for(const invasion of [false,true]){
 const a=setup();a.context.Math.random=()=>0;
 a.context.invasion=invasion;
 a.run(`multiBattle={active:true,finished:false,invasion,pendingMoveIndex:null,enemies:[createMultiEnemy(by('grassbeat'),'enemy_a'),createMultiEnemy(by('aquaron'),'enemy_b')],contractAttempts:{}};renewal.targetId='enemy_b';var observed=[],realAttack=performMultiAttack;performMultiAttack=async(actor,target,move)=>{if(actor.kind==='player')observed.push(target?.id||target);return await realAttack(actor,target,move);};chooseMultiBattleTarget(0);chooseMultiBattleTarget(0);`);
 await a.flush();assert.deepEqual(Array.from(a.run('observed')),['enemy_b']);assert.equal(a.run('battleTurnCount'),1);assert.equal(a.run('multiBattle.pendingMoveIndex'),null);cases++;
}
console.log(`PASS battle renewal v4: ${cases} real-data matchup, target-fallback and transactional item cases`);
