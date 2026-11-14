import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime();
for(const file of ['prologue-part2-data','prologue-part2-battle'])vm.runInContext(fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),r.context,{filename:file});
r.run(`prologuePart2BattleBanner=()=>{};renderBattleInputState=()=>{};save=initSave();save.instances=[];save.party=[];const ins=addInstance('freigal',10);save.party=[ins.uid];var reports=[],endings=[],pendingFinish=null;var callbacks={onOutcome:(kind,request,finish)=>{reports.push([kind,request.battleId]);pendingFinish=finish;},onFinished:(kind)=>endings.push(kind)};`);
const ids=r.run('Object.keys(PROLOGUE_PART2_DATA.battles)');
assert.equal(ids.length,15);
for(const id of ids){
  r.run(`closeProloguePart2Battle();startProloguePart2Battle('pb_${id.slice(3,5)}',PROLOGUE_PART2_DATA.battles['${id}'],callbacks)`);
  assert.equal(r.run('activeHuntRequest.battleId'),id);
  assert.equal(r.run('enemy.moves.every(m=>m[8]&&SKILL_BY_ID[m[8]])'),true);
  assert.equal(r.run('enemyMaxHp()'),r.run(`Math.max(1,Math.round(maxHp(by(PROLOGUE_PART2_DATA.battles['${id}'].enemies[0].speciesId),PROLOGUE_PART2_DATA.battles['${id}'].enemies[0].level)*PROLOGUE_PART2_DATA.battles['${id}'].enemies[0].hpMultiplier))`));
  assert.equal(r.run('activeHuntRequest.contractAllowed'),id==='p2_07_a');
}
r.run(`closeProloguePart2Battle();startProloguePart2Battle('pb_07',PROLOGUE_PART2_DATA.battles.p2_07_a,callbacks);var token=activeHuntRequest;var before=JSON.stringify(save);eHp=0;win();win();`);
assert.equal(r.run('reports.length'),1,'duplicate win must not reenter save callback');
assert.equal(r.run('JSON.stringify(save)===before'),true,'battle does not grant normal rewards');
assert.equal(r.run('battleRewardGranted'),false,'result waits for durable commit');
r.run('pendingFinish();pendingFinish();');assert.equal(r.run('endings.length'),1);
assert.equal(r.run('prologuePart2ContractAllowed()'),true);
assert.equal(r.run('prologuePart2BattleTokenValid(token)'),false,'pending battle actions stop after outcome commit');
r.run('closeProloguePart2Battle()');assert.equal(r.run('prologuePart2BattleTokenValid(token)'),false);
// Early primary KO must spawn the fixed enemy rather than grant victory.
r.run(`startProloguePart2Battle('pb_14',PROLOGUE_PART2_DATA.battles.p2_14_a,{...callbacks,onInvasion:resume=>resume()});startBattleTurn();eHp=0;win();`);
assert.equal(r.run('multiBattle.enemies[0].hp'),0);assert.equal(r.run('multiBattle.enemies[0].alive'),false);
assert.equal(r.run('multiBattle.enemies[1].mon.id'),'noclaid');assert.equal(r.run('multiBattle.enemies[1].level'),10);
assert.equal(r.run('reports.length'),1,'invasion cannot prematurely win');
r.run('multiBattle.enemies.forEach(e=>{e.hp=0;e.alive=false});winMultiBattle();pendingFinish();');
assert.equal(r.run('reports.length'),2);assert.equal(r.run('JSON.stringify(save)===before'),true);
assert.equal(r.run('prologuePart2ContractAllowed()'),false);
r.run(`closeProloguePart2Battle();startProloguePart2Battle('pb_12',PROLOGUE_PART2_DATA.battles.p2_12_a,callbacks);runAwayFromMultiBattle();pendingFinish();`);
assert.equal(r.run('reports.at(-1)[0]'),'retreat');assert.equal(r.run('JSON.stringify(save)===before'),true);
// Same normal rate/receipt and one atomic controller mutation for slime.
r.run(`closeProloguePart2Battle();resumeProloguePart2Contract('pb_07',PROLOGUE_PART2_DATA.battles.p2_07_a,{...callbacks,onContract:(result,request,mutate,finish)=>{mutate();reports.push([result,request.battleId]);finish();},onContractFinished:result=>endings.push(result)});save.items.contract_scroll=1;postBattleContractStage=()=>3;playContractAnimation=async()=>{};`);
await r.run("tryProloguePart2Contract('contract_scroll')");
assert.equal(r.run('save.items.contract_scroll'),0);assert.equal(r.run('save.instances.filter(i=>i.id===\'slime\').length'),1);
await r.run("tryProloguePart2Contract('contract_scroll')");assert.equal(r.run('save.instances.filter(i=>i.id===\'slime\').length'),1);
assert.equal(r.run('prologuePart2ContractAllowed()'),false);
console.log('PASS prologue part2 battle: 15 pinned encounters, HP/moves, isolated rewards, durable outcome gating, early-KO invasion, retreat, contract gating and single award');
