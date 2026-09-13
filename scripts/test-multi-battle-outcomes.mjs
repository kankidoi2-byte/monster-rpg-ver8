import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runtime,seeded} from '../tools/balance-audit/runtime.mjs';
const baseline=runtime({'multi-battle':()=>execFileSync('git',['show','ae3911ef02f0c0724ec0f2b13baa4d456414060c:js/multi-battle.js'],{encoding:'utf8'})});
const current=runtime();
const setup=`save=initSave();save.instances=[];save.party=[];const ins=addInstance('freigal',10);save.party=[ins.uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='three_way';activeHuntRequest.secondEnemyId='goblin';beginChosenBattle('grassland','slime','normal',activeHuntRequest);pHp=70;multiBattle.enemies.forEach(e=>{e.hp=60;e.guard=true;e.aquaShield=true;});`;
let cases=0;
for(const direction of ['player-enemy','enemy-player','enemy-enemy'])for(const effect of [null,'repeat_attack','drain','recoil','alchemy_recoil','poison','paralysis','confusion','guard','heal','buff','debuff','sleep','aqua_shield']){
 const draws=[0,0];let states=[];
 for(const [i,r] of [baseline,current].entries()){
  r.run(`(()=>{${setup}})()`);const rng=seeded(192);r.context.Math.random=()=>{draws[i]++;return rng()};
  const actor=direction==='player-enemy'?"{kind:'player'}":"multiBattle.enemies[0]",target=direction==='enemy-player'?"{kind:'player'}":'multiBattle.enemies[1]';
  const move=['検証',['guard','heal','buff','debuff','sleep','aqua_shield'].includes(effect)?0:24,'normal',effect,1];
  await r.run(`performMultiAttack(${actor},${target},${JSON.stringify(move)})`);
  states.push(r.run('JSON.stringify([pHp,pAtk,pGuard,pStatus,pPoisonTurns,pParalysisTurns,pConfusionTurns,pSleepTurns,pAquaShield,multiBattle.enemies,save.coins,battleTurnCount])'));
 }
 assert.equal(states[0],states[1],`${direction}/${effect}`);assert.equal(draws[0],draws[1]);cases++;
}
console.log(`PASS ${cases} multi-faction outcomes and RNG counts match latest main`);
