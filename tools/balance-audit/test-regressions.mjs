import assert from 'node:assert/strict';
import {runtime} from './runtime.mjs';
const r=runtime(),run=r.run;
// Same difficulty, different species: each participant must use its defined level.
run(`activeHuntRequest=createHuntRequest(MAPS[0],by('slime'),'normal',[]);`);
assert.equal(run(`createMultiEnemy(by('seralphia'),'enemy_b').level`),run(`huntLevelFor(by('seralphia'),'normal')`),'second enemy must use its species level');
assert.equal(run(`createMultiEnemy(by('seralphia'),'enemy_b').maxHp`),run(`Math.round(maxHp(by('seralphia'),huntLevelFor(by('seralphia'),'normal')))`));
// Preserve the already-fought enemy, including an explicit request-level override.
run(`activeHuntRequest.enemyLevel=17;activeHuntRequest.enemyHp=777;enemy=by('slime');eHp=333;eStatus='poison';ePoisonTurns=2;`);
assert.equal(run(`createExistingMultiEnemy().level`),17);
assert.equal(run(`createExistingMultiEnemy().maxHp`),777);
assert.equal(run(`createExistingMultiEnemy().hp`),333);
assert.equal(run(`createExistingMultiEnemy().poisonSourceIsPlayer`),true,'single-battle player poison must retain credit through invasion');
run(`eStatus=null;ePoisonTurns=0`);
assert.equal(run(`createExistingMultiEnemy().poisonSourceIsPlayer`),false);
// No reward duplication even if completion is invoked twice.
run(`save=initSave();save.coins=0;save.items={};var entry=createMultiEnemy(by('slime'),'enemy_a');var first=grantMultiEnemyReward(entry,false);var before=JSON.stringify(save);var second=grantMultiEnemyReward(entry,false);`);
assert.equal(run(`JSON.stringify(save)`),run('before'));
assert.equal(run('second.coins'),0);
console.log('PASS: species levels, existing HP/level override, poison credit, reward idempotency');
run(`save=initSave();save.instances=[];save.party=[];var ins=addInstance('freigal',30);save.party=[ins.uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');eHp=1;eStatus='poison';ePoisonTurns=2;activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);multiBattle={active:true,finished:false,enemies:[createExistingMultiEnemy(),createMultiEnemy(by('seralphia'),'enemy_b')],contractAttempts:{}};startBattleTurn();finishMultiBattleTurn();`);
assert.equal(run('multiBattle.enemies[0].alive'),false);
assert.equal(run('multiBattle.enemies[0].defeatedByPlayer'),true,'poison KO after invasion must retain contract eligibility');
// Compare actual single / multi attack processing on the same inputs, including modifiers.
for(const mv of ["['hit',40,'normal']","['drain',40,'grass','drain']","['guard',0,'normal','guard']"]){
 run(`enemy=by('slime');pHp=100;eHp=500;pAtk=eAtk=1;pGuard=eGuard=false;pAquaShield=eAquaShield=false;activeHuntRequest.enemyHp=500;var move=${mv};`);
 r.context.Math.random=()=>.5;
 await run('doAttack(player,enemy,move,true)');
 const single=run('({hp:pHp,enemy:eHp,guard:pGuard})');
 run(`pHp=100;pGuard=false;var target=createMultiEnemy(enemy,'enemy_a');target.hp=500;target.maxHp=500;`);
 await run(`performMultiAttack({kind:'player'},target,move)`);
 assert.deepEqual(JSON.parse(JSON.stringify(run('({hp:pHp,enemy:target.hp,guard:pGuard})'))),JSON.parse(JSON.stringify(single)));
}
console.log('PASS: poison KO attribution, single/multi damage/drain/guard parity');
