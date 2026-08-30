import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const tutorial=read('js/tutorial.js');
const flow=read('js/battle-flow.js');
const rules=read('js/battle-rules.js');
const packageJson=JSON.parse(read('package.json'));

const queueStart=tutorial.indexOf('function queueTutorialActionAdvance');
const queueEnd=tutorial.indexOf('function tutorialNext',queueStart);
assert.ok(queueStart>=0&&queueEnd>queueStart,'idempotent tutorial action queue is missing');
const queued=[];
const queueContext=vm.createContext({
  tutorialUiState:{active:true,steps:[{id:'battle_target'}],index:0,advancePendingStepId:null},
  advanced:0,
  setTimeout(callback){queued.push(callback);}
});
queueContext.tutorialCurrentStepId=()=>queueContext.tutorialUiState.steps[queueContext.tutorialUiState.index]?.id||null;
queueContext.tutorialNext=()=>{queueContext.advanced+=1;};
vm.runInContext(tutorial.slice(queueStart,queueEnd),queueContext);
assert.equal(vm.runInContext("queueTutorialActionAdvance('battle_target')",queueContext),true);
assert.equal(vm.runInContext("queueTutorialActionAdvance('battle_target')",queueContext),false,'a double tap must schedule one STEP completion');
assert.equal(queued.length,1);
queued[0]();
assert.equal(queueContext.advanced,1,'the accepted target action must advance exactly once');
assert.equal(queueContext.tutorialUiState.advancePendingStepId,null);

const waveStart=tutorial.indexOf('function failTutorialRescueBattle');
const waveEnd=tutorial.indexOf('function runTutorialTransition',waveStart);
assert.ok(waveStart>=0&&waveEnd>waveStart,'rescue-wave recovery functions are missing');
const makeWaveContext=({missing=false,brokenSetup=false}={})=>{
  const outcomes=[];
  const notices=[];
  const context=vm.createContext({
    console:{error(){notices.push('error');}},
    tutorialBattleSession:{active:true,kind:'elna_rescue',enemyQueue:['slime']},
    by:id=>missing?null:{id,name:'スライム'},
    structuredClone:value=>({...value}),
    enemy:null,eHp:0,eAtk:0,eGuard:false,eStatus:null,
    ePoisonTurns:0,eParalysisTurns:0,eConfusionTurns:0,eSleepTurns:0,eFlareCharge:false,eAquaShield:false,
    battleRewardGranted:true,busy:false,
    enemyMaxHp(){return 30;},
    setupBattle(){if(brokenSetup)throw new Error('setup_failed');},
    document:{getElementById(){return {innerHTML:''};}},
    showBattleOutcome(value){outcomes.push(value);}
  });
  context.isTutorialRescueBattleActive=()=>context.tutorialBattleSession.active&&context.tutorialBattleSession.kind==='elna_rescue';
  context.handleTutorialBattleOutcome=kind=>{outcomes.push({tutorial:kind});context.tutorialBattleSession.active=false;return true;};
  vm.runInContext(tutorial.slice(waveStart,waveEnd),context);
  return {context,outcomes,notices};
};
const success=makeWaveContext();
assert.equal(vm.runInContext('continueTutorialRescueWave()',success.context),true);
assert.equal(success.context.enemy.id,'slime');
assert.equal(success.context.eHp,30);
assert.equal(success.context.busy,false);
assert.equal(success.context.battleRewardGranted,false);
assert.equal(success.context.tutorialBattleSession.enemyQueue.length,0,'queue consumption must happen after the next Slime is ready');
assert.equal(success.outcomes.length,0);

for(const options of [{missing:true},{brokenSetup:true}]){
  const failure=makeWaveContext(options);
  assert.equal(vm.runInContext('continueTutorialRescueWave()',failure.context),true,'a broken wave must consume the stale victory path');
  assert.equal(failure.context.busy,true);
  assert.equal(failure.context.tutorialBattleSession.enemyQueue.length,0);
  assert.ok(failure.outcomes.some(entry=>entry.tutorial==='error'),'missing or broken Slime must route to recoverable retry');
  assert.ok(failure.outcomes.some(entry=>entry.kind==='retreat'),'the player must receive a retry action instead of a stuck battle');
}

const winStart=flow.indexOf('function win()');
const winSource=flow.slice(winStart);
assert.ok(winStart>=0);
assert.ok(winSource.indexOf('if (eHp > 0) return;')<winSource.indexOf('continueTutorialRescueWave'),'a stale duplicate win must not clear a freshly spawned wave');
assert.ok(winSource.indexOf('continueTutorialRescueWave')<winSource.indexOf('if (battleRewardGranted) return;'),'wave continuation must precede final reward settlement');
assert.ok(winSource.includes("const tutorialOutcomeHandled=typeof handleTutorialBattleOutcome==='function'&&handleTutorialBattleOutcome('victory'"),'tutorial victory must be resolved before offering a contract');
assert.ok(winSource.includes('if(!tutorialOutcomeHandled)renderSingleBattleContractPanel()'),'the rescue Slime must not show the legacy post-battle contract offer');

assert.ok(rules.includes('if (busy) return;')&&rules.indexOf('if (busy) return;',rules.indexOf('async function turn'))<rules.indexOf("handleTutorialBattleAction(tutorialAction,",rules.indexOf('async function turn')),'double-tapped attacks must be rejected before STEP advancement');
assert.ok(flow.includes('if (busy || !livingPartySwitchCandidates()'),'double-tapped switches must be rejected');
assert.ok(flow.includes('function runAway() {\n  if (busy) return;'),'double-tapped retreat must be rejected');
assert.match(tutorial,/id:'battle_free'[^\n]+waitForEvent:'battle_outcome'/,'free battle must wait for a real outcome');
assert.match(tutorial,/id:'elna_rescue_retry'[^\n]+nextStepId:'elna_rescue_start'[^\n]+persistAs:'elna_rescue_start'/,'defeat, retreat, and generation failure must retry from the durable rescue checkpoint');
for(const id of ['battle_enemy','battle_actor_open','battle_actor_select','battle_target','battle_attack_open','battle_normal_attack','battle_skill','battle_choose_skill','battle_free']){
  assert.match(tutorial,new RegExp(`id:'${id}'[^\\n]+persistAs:'elna_rescue_start'`),`interrupted battle step must restart safely: ${id}`);
}

assert.ok(index.includes('js/tutorial.js?v=prologue-rescue-stability-1'));
assert.ok(index.includes('prologue-rescue-stability-1'));
assert.equal(packageJson.scripts['check:prologue-rescue-stability'],'node scripts/test-prologue-rescue-stability.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-rescue-stability'));

console.log('Prologue rescue stability validation passed (free battle, two waves, stale win, missing enemy, defeat/retreat retry, interruption checkpoint, and double taps).');
