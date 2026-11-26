import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

function setup({invasion=false,reserve=true}={}){
  const r=runtime();r.context.Math.random=()=>0.9;
  r.context.options={invasion,reserve};
  r.run(`save=initSave();save.instances=[];save.party=[];
    var first=addInstance('voltax',80);first.uid='first';save.party.push(first.uid);
    if(options.reserve){var reserve=addInstance('aquaron',80);reserve.uid='reserve';save.party.push(reserve.uid);}
    prepareBattleParty();selectedMap=MAPS[0];enemy=by('voltax');
    activeHuntRequest=createHuntRequest(selectedMap,enemy,'d2',[],{allowOvertier:false,enemyLevel:100});
    activeHuntRequest.attackMultiplier=1.3;
    multiBattle={active:true,finished:false,invasion:options.invasion,enemies:[createMultiEnemy(enemy,'enemy_a'),createMultiEnemy(by('slime'),'enemy_b')],contractAttempts:{}};
    multiBattle.enemies[0].level=100;multiBattle.enemies[0].attackMultiplier=1.3;
    pHp=1000;pAtk=1;busy=true;startBattleTurn();
    var playerAction={kind:'player',targetId:'enemy_a',move:['通常攻撃',24,'normal']};
    var enemyAction={kind:'enemy',actorId:'enemy_a',move:['通常攻撃',24,'normal']};
  `);
  return r;
}
let cases=0;
for(const invasion of [false,true]){
  // Real single and multi confusion paths, with identical RNG and no end-turn healing.
  const r=setup({invasion});
  r.run('pConfusionTurns=1;tryConfusionAction(true);var singleDamage=1000-pHp;pHp=1000;pConfusionTurns=1;finishMultiBattleTurn=()=>{busy=false;};');
  await r.run('runMultiActions([playerAction],0)');await r.flush();
  assert.equal(r.run('singleDamage'),58);
  assert.equal(r.run('1000-pHp'),58);
  assert.equal(r.run('partyBattle[0].hp'),942);
  cases++;
  const e=setup({invasion});
  e.run('eHp=1000;eAtk=1;eConfusionTurns=1;tryConfusionAction(false);var singleDamage=1000-eHp;multiBattle.enemies[0].hp=1000;multiBattle.enemies[0].confusionTurns=1;');
  await e.run("performMultiAttack(multiBattle.enemies[0],{kind:'player'},['通常攻撃',24,'normal'])");
  assert.equal(e.run('singleDamage'),92);
  assert.equal(e.run('1000-multiBattle.enemies[0].hp'),92);
  cases++;
  // The next enemy must see the reserve, never the fainted front member.
  const switched=setup({invasion});
  switched.run(`pHp=1;pConfusionTurns=1;var observed=[];
    performMultiAttack=async(actor)=>{observed.push({uid:activeInstance.uid,hp:pHp,actor:actor.id});};`);
  await switched.run('runMultiActions([playerAction,enemyAction],0)');await switched.flush();
  assert.equal(switched.run('observed[0].uid'),'reserve');
  assert(switched.run('observed[0].hp>0'));
  assert.equal(switched.run('partyBattle[0].fainted'),true);
  assert.equal(switched.run('battleTurnCount'),1);
  cases++;
  const defeated=setup({invasion,reserve:false});
  defeated.run('pHp=1;pConfusionTurns=1;var attacks=0;performMultiAttack=async()=>{attacks++;};');
  await defeated.run('runMultiActions([playerAction,enemyAction],0)');await defeated.flush();
  assert.equal(defeated.run('auditOutcome.kind'),'defeat');
  assert.equal(defeated.run('attacks'),0);
  cases++;
  // Every unable-to-act path reaches the shared delay and next action once.
  for(const status of ['sleep','paralysis','confusion']){
    const stopped=setup({invasion});
    stopped.context.Math.random=()=>status==='confusion'?0.6:0;
    stopped.run(`pSleepTurns=${status==='sleep'?1:0};pParalysisTurns=${status==='paralysis'?1:0};pConfusionTurns=${status==='confusion'?1:0};
      var attacks=0,delays=[];performMultiAttack=async()=>{attacks++;};battleMotionDelay=async(ms)=>{delays.push(ms);};`);
    await stopped.run('runMultiActions([playerAction,enemyAction],0)');await stopped.flush();
    assert.equal(stopped.run('attacks'),1);
    assert.equal(stopped.run('delays.length'),2);
    assert.equal(stopped.run('battleTurnCount'),1);
    cases++;
  }
  const canceled=setup({invasion});
  canceled.run('pSleepTurns=1;var valid=true,attacks=0;mapStoryTokenValid=()=>valid;performMultiAttack=async()=>{attacks++;};battleMotionDelay=async()=>{valid=false;};');
  await canceled.run('runMultiActions([playerAction,enemyAction],0)');
  assert.equal(canceled.run('attacks'),0,'story token invalidation cancels the next actor');
  cases++;
}
console.log(`PASS B02–B04: ${cases} cases; player self-hit 12 → 58 (single 58), enemy ×1.3 self-hit 70 → 92 (single 92); three-way and invasion, switching, defeat, status delays and token cancellation.`);
