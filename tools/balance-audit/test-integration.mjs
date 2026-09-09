// Production functions in a disposable VM. This is NOT browser/device evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from './runtime.mjs';
const r=runtime(),run=r.run;
let levels=0;
for(const difficulty of ['easy','normal','hard','extreme']){
  run(`activeHuntRequest=createHuntRequest(MAPS[0],by('slime'),${JSON.stringify(difficulty)},[]);`);
  for(const id of run('M.map(m=>m.id)')){
    r.context.testId=id;
    assert.equal(run(`createMultiEnemy(by(testId),'enemy_b').level`),run(`huntLevelFor(by(testId),activeHuntRequest.difficultyId)`));
    assert.equal(run(`createMultiEnemy(by(testId),'enemy_b').hp`),run(`createMultiEnemy(by(testId),'enemy_b').maxHp`));levels++;
  }
}
// Restore just the production markup builders; keep animations and storage isolated.
const ui=fs.readFileSync(new URL('../../js/ui.js',import.meta.url),'utf8');
run(ui.slice(0,ui.indexOf('\nfunction vis(')));
const source=fs.readFileSync(new URL('../../js/multi-battle.js',import.meta.url),'utf8');
for(const name of ['setupMultiBattle','updateMultiBattleView','renderMultiContractPanel']){
  const start=source.indexOf(`function ${name}(`), end=source.indexOf('\nfunction ',start+1);
  run(source.slice(start,end<0?undefined:end));
}
r.elements.set('battleOutcomeActions',{appendChild(){}});
run(`playContractAnimation=async()=>{};updateItems=()=>{};
function setupTest(){save=initSave();save.instances=[];save.party=[];const ins=addInstance('freigal',30);save.party=[ins.uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='invasion_pending';activeHuntRequest.invasionEnemyId='seralphia';activeHuntRequest.invasionTurn=1;beginChosenBattle('grassland','slime','normal',activeHuntRequest);eHp=1;eStatus='poison';ePoisonTurns=2;battleTurnCount=1;}
setupTest();var originalMax=enemyMaxHp();triggerInvasionIfDue();`);
assert.equal(run('multiBattle.enemies[0].hp'),1);
assert.equal(run('multiBattle.enemies[0].maxHp'),run('originalMax'));
assert.match(r.elements.get('battleMapBanner').innerHTML,/敵A Lv\.5 \/ 敵B Lv\.46/);
run('multiBattle.enemies.forEach(e=>e.detailsOpen=true);updateMultiBattleView()');
assert.match(r.elements.get('multiEnemyGrid').innerHTML,/Lv\.46/);
run('startBattleTurn();finishMultiBattleTurn()');
assert.equal(run('multiBattle.enemies[0].defeatedByPlayer'),true);
run('multiBattle.enemies[1].hp=0;multiBattle.enemies[1].alive=false;multiBattle.enemies[1].defeatedByPlayer=false;winMultiBattle();');
assert.match(r.elements.get('multiContractPanel').innerHTML,/スライムと契約/);
assert.doesNotMatch(r.elements.get('multiContractPanel').innerHTML,/セラルフィアと契約/);
const afterWin=run('JSON.stringify(save)');run('winMultiBattle()');assert.equal(run('JSON.stringify(save)'),afterWin);
run("save.items.contract_scroll=2;pendingMultiBattleContractId='enemy_a'");r.context.Math.random=()=>0;
await run("useMultiBattleContractScroll('contract_scroll')");
const afterContract=run('JSON.stringify(save)');
run("pendingMultiBattleContractId='enemy_a'");await run("useMultiBattleContractScroll('contract_scroll')");
assert.equal(run('JSON.stringify(save)'),afterContract);
assert.equal(run('save.items.contract_scroll'),1);
assert.equal(run("save.instances.filter(i=>i.id==='slime').length"),1);
for(const action of ['runAwayFromMultiBattle()','losePartyBattle()']){
  run(`setupTest();triggerInvasionIfDue();${action};`);
  assert.equal(run('auditOutcome.kind'),action.startsWith('runAway')?'retreat':'defeat');
  run("endPartyRecovery();beginChosenBattle('grassland','slime','normal',{...createHuntRequest(MAPS[0],by('slime'),'normal',[]),battleMode:'single'});");
  assert.equal(run('busy'),false);assert.equal(run('multiBattle'),null);assert.ok(run('pHp>0'));
}
console.log(`PASS: ${levels} species/difficulty level+HP cases; production level markup; real invasion poison KO -> contract; reward/contract idempotency; defeat/retreat/retry. VM only, no visual/reload claim.`);
