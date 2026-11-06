import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime,seeded} from '../tools/balance-audit/runtime.mjs';
const r=runtime(),run=s=>r.run(s);
vm.runInContext(fs.readFileSync('js/auto-battle.js','utf8'),r.context);
r.context.Math.random=seeded(110100);
run(`save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
save.instances=[];save.party=[];
var hero=addInstance('grassbeat',100);save.party=[hero.uid];
save.equippedSkills[hero.uid]=['s110_100'];prepareBattleParty();
selectedMap=MAPS.find(m=>m.id==='grassland');
var request=createHuntRequest(selectedMap,by('slime'),'d1',[],{enemyLevel:5,allowOvertier:false});
request.enemyLevel=5;request.battleMode='single';request.conditions=[];
beginChosenBattle('grassland','slime','d1',request);
var tutorialUiState={active:false};battleUiCanAct=()=>!busy;
autoRun=autoNewRun('grassland','d1',1);autoBindDeparture(selectedMap,activeHuntRequest,null);
autoRun.settings.stopOnNewDex=false;
var realTurn=turn,pendingTurn=null;turn=i=>(pendingTurn=realTurn(i));
autoVictoryCommitted=()=>{};
var summaryLive=null;autoSummary=live=>{summaryLive=live;autoRun.phase='summary';};
`);
assert.equal(run('getEquippedMovesForInstance(hero).length'),1);
assert.equal(run('autoChooseMove(getEquippedMovesForInstance(hero),enemy,1)'),-1);
let turns=0;
while(!run('auditOutcome')&&turns<100){
  run('autoAct()');
  await run('pendingTurn');
  await r.flush();
  turns++;
}
assert.equal(run('auditOutcome?.kind'),'victory');
assert(turns<100);
console.log(`PASS B01-A: Lv100 grassbeat / heal-only defeated Lv5 slime in ${turns} turns.`);
assert.equal(run(`autoChooseMove([['弱',12,'normal'],['強',60,'normal'],['回',0,'normal','heal']],enemy,.35)`),1);
assert.equal(run(`autoChooseMove([['強',60,'normal'],['回',0,'normal','heal']],enemy,.349)`),1);
assert.equal(run(`autoChooseMove([['弱',12,'normal'],['補助',0,'normal'],['負',-5,'normal']],enemy,1)`),-1);
assert.equal(run(`autoChooseMove([],enemy,1)`),-1);
console.log('PASS B01-B: normal attack competes, positive highest score chosen, healing below 35%.');
// Repeat UI observations cannot count as turns. Count only completed auto turns.
run(`autoRun=autoNewRun('grassland','d1',5);autoBindDeparture(selectedMap,activeHuntRequest,null);
battleTurnCount=0;eHp=100;autoObserveProgress(autoRun,true);`);
for(let i=0;i<50;i++)run('autoObserveProgress(autoRun,true)');
assert.equal(run('autoRun.progress.idle'),0);
for(let i=0;i<29;i++)run('battleTurnCount++;autoObserveProgress(autoRun,true)');
assert.equal(run('autoRun.reason'),'');
run('battleTurnCount++;autoObserveProgress(autoRun,true)');
assert.equal(run('autoRun.reason'),'戦闘が進まないためオートを停止しました');
// The actual action boundary stops without issuing another turn and leaves manual continuation.
run(`autoRun.settings.stopOnNewDex=false;busy=false;var extraActions=0;turn=()=>extraActions++;autoAct();`);
assert.equal(run('extraActions'),0);assert.equal(run('summaryLive'),true);
// Damage followed by healing must reset the streak, even if final HP is unchanged.
run(`autoRun=autoNewRun('grassland','d1',1);autoBindDeparture(selectedMap,activeHuntRequest,null);
battleTurnCount=0;eHp=100;autoObserveProgress(autoRun,true);`);
for(let i=0;i<29;i++)run('battleTurnCount++;autoObserveProgress(autoRun,true)');
run('eHp=90;autoObserveProgress(autoRun);eHp=100;autoObserveProgress(autoRun);battleTurnCount++;autoObserveProgress(autoRun,true)');
assert.equal(run('autoRun.progress.idle'),0);assert.equal(run('autoRun.reason'),'');
// Same-species enemies sharing a monster definition remain separate combatants.
// One healing cannot mask another taking damage.
run(`multiBattle={active:true,enemies:[{mon:by('slime'),hp:50},{mon:by('slime'),hp:50}]};
autoRun.progress=null;autoObserveProgress(autoRun,true);
multiBattle.enemies[0].hp=40;multiBattle.enemies[1].hp=60;
battleTurnCount++;autoObserveProgress(autoRun,true);`);
assert.equal(run('autoRun.progress.idle'),0);
run('autoRun.phase="depart";autoBindDeparture(selectedMap,activeHuntRequest,null)');
assert.equal(run('autoRun.progress'),null);
console.log('PASS 30-turn stop, no duplicate counting, live stop, damage/heal, multi-foe and next-battle reset.');
