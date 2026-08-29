import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const flow=read('js/battle-flow.js');
const rules=read('js/battle-rules.js');
const view=read('js/battle-view.js');
const state=read('js/state.js');
const data=read('js/data.js');
const index=read('index.html');

assert.ok(data.includes("{id:'grassland'")&&data.includes("{id:'slime'"),'the existing grassland and slime IDs must remain the tutorial targets');
assert.ok(tutorial.includes("Object.freeze({mapId:'grassland',enemyId:'slime',difficultyId:'easy'})"),'the first hunt must use the existing Easy request rules');
assert.ok(tutorial.includes('registerHuntRequest(createHuntRequest(map,mon,difficulty.id,[]))'),'the tutorial request must go through the normal hunt request factory');
assert.ok(tutorial.includes("registerMapDex(map.id)"),'the dedicated request must preserve normal map discovery');
assert.ok(flow.includes("renderTutorialHuntChoice(list))return"),'hunt choices must offer the dedicated first request before random entries');
assert.ok(!tutorial.includes('enemyHp:')&&!tutorial.includes('rewardMultiplier:')&&!tutorial.includes('attackMultiplier:'),'the tutorial must not override enemy ability or reward calculations');
assert.match(state,/THREE_WAY_RATES = Object\.freeze\(\{easy:0,/,'Easy must continue to use the existing single-battle rule');

const orderedSteps=['first_hunt','tutorial_hunt_request','battle_enemy','battle_ally','battle_hp','battle_type','battle_turn','battle_skill','battle_choose_skill','battle_free','battle_retry','victory_exp','victory_coin','victory_material','victory_rank'];
let previous=-1;
orderedSteps.forEach(id=>{
  const current=tutorial.indexOf(`id:'${id}'`);
  assert.ok(current>previous,`missing or out-of-order Phase 4B step: ${id}`);
  previous=current;
});
['#singleEnemyBox','#singlePlayerBox','.battle-vitals','#battleCommandTitle','#battleSkillButton','#commands'].forEach(target=>assert.ok(tutorial.includes(`target:'${target}'`),`missing real battle target: ${target}`));
assert.ok(tutorial.includes("waitForEvent:'battle_outcome'"),'the guide must release controls after the first skill');
assert.ok(rules.includes("typeof handleTutorialFirstSkillUsed==='function'"),'the real first skill action must notify the guide');

assert.ok(tutorial.includes("persistAs:'first_hunt'"),'transient battle steps must reload at the safe hunt checkpoint');
assert.ok(tutorial.includes("persistAs:'first_contract'"),'reward steps must reload after the won battle instead of granting rewards twice');
assert.ok(tutorial.includes("setTutorialStep('first_contract')")&&tutorial.includes("if(typeof saveGame==='function')saveGame()"),'victory must save the Phase 4C checkpoint before showing reward guidance');
assert.ok(flow.includes("handleTutorialBattleOutcome('defeat')")&&flow.includes("handleTutorialBattleOutcome('retreat')"),'defeat and retreat must enter the retry path');
assert.ok(tutorial.includes("nextStepId:'tutorial_hunt_request'")&&tutorial.includes("persistAs:'first_hunt'"),'retry must return to the same safe request without losing progress');
assert.match(tutorial,/id:'tutorial_hunt_request'[^\n]+externalAdvance:true/,'the guide must not advance before the battle has actually started');
assert.ok(tutorial.includes("activeScreenId()==='battle'&&player?.id&&enemy?.id"),'the tutorial must verify both combatants before advancing');

assert.ok(flow.includes('const materialRewards=[]')&&flow.includes('contractorReward.amount'),'the existing victory calculation must expose actual materials and contractor EXP to the result');
['battleRewardExp','battleRewardCoins','battleRewardMaterials','battleRewardContractorExp'].forEach(id=>assert.ok(view.includes(`id="${id}"`),`missing victory reward target: ${id}`));
assert.ok(tutorial.includes('経験値がたまるとレベルが上がり')&&tutorial.includes('ショップや育成で使います')&&tutorial.includes('次の勝利でまた抽選')&&tutorial.includes('契約者EXPも増えます'),'all four current reward types must be explained');
assert.ok(!tutorial.includes('firstContractGuaranteeUsed=true')&&!tutorial.includes('starterContractScrollGranted=true'),'Phase 4B must not implement the Phase 4C contract guarantee early');

['singleEnemyBox','singlePlayerBox','battleCommandTitle','battleSkillButton','commands','battleOutcomeRewards'].forEach(id=>assert.ok(index.includes(`id="${id}"`),`missing DOM anchor: #${id}`));

const helperStart=tutorial.indexOf('function tutorialFirstHuntIsPending');
const helperEnd=tutorial.indexOf('function renderTutorialHuntChoice',helperStart);
const context=vm.createContext({tutorialUiState:{active:false,steps:[],index:0},state:{status:'in_progress',stepId:'first_hunt',replaying:false},currentTutorialState:()=>context.state});
vm.runInContext(tutorial.slice(helperStart,helperEnd),context);
assert.equal(vm.runInContext('shouldOfferTutorialHunt()',context),true,'an interrupted required tutorial must restore the first request');
context.state={status:'completed',stepId:null,replaying:false};
assert.equal(vm.runInContext('shouldOfferTutorialHunt()',context),false,'normal completed saves must keep random hunt choices');
context.tutorialUiState.active=true;context.tutorialUiState.steps=[{id:'battle_retry'}];context.tutorialUiState.index=0;
assert.equal(vm.runInContext('shouldOfferTutorialHunt()',context),true,'retry must render the dedicated request again');

const battleStartStart=tutorial.indexOf('function preparedTutorialHuntRequest');
const battleStartEnd=tutorial.indexOf('function handleTutorialFirstSkillUsed',battleStartStart);
assert.ok(battleStartStart>=0&&battleStartEnd>battleStartStart,'tutorial battle start helpers must exist');
const battleStartContext=vm.createContext({
  console,
  TUTORIAL_FIRST_HUNT:{mapId:'grassland',enemyId:'slime',difficultyId:'easy'},
  MAPS:[{id:'grassland'}],
  by:id=>id==='slime'?{id:'slime'}:null,
  preparedHuntRequest:()=>null,
  createHuntRequest:(map,mon,difficultyId)=>({mapId:map.id,enemyId:mon.id,difficultyId}),
  registerHuntRequest:request=>Object.assign(request,{requestId:'hunt_recovered'}),
  tutorialBattleSession:{active:false,firstSkillUsed:true},
  tutorialUiState:{active:true,steps:[{id:'tutorial_hunt_request'}],index:0},
  screen:'battleChoices',player:null,enemy:null,startCalls:[],nextCalls:0,choiceCalls:0,
  activeScreenId:()=>battleStartContext.screen,
  tutorialNext:()=>{battleStartContext.nextCalls++;},
  showBattleChoices:()=>{battleStartContext.choiceCalls++;battleStartContext.screen='battleChoices';},
  startChosenBattle:(mapId,enemyId,difficultyId,requestId)=>{
    battleStartContext.startCalls.push({mapId,enemyId,difficultyId,requestId});
    battleStartContext.player={id:'freigal'};battleStartContext.enemy={id:'slime'};battleStartContext.screen='battle';
  }
});
vm.runInContext(tutorial.slice(battleStartStart,battleStartEnd),battleStartContext);
assert.equal(vm.runInContext("startTutorialHunt('stale_request')",battleStartContext),true,'a stale rendered request must be regenerated and start normally');
assert.deepEqual(JSON.parse(JSON.stringify(battleStartContext.startCalls)),[{mapId:'grassland',enemyId:'slime',difficultyId:'easy',requestId:'hunt_recovered'}]);
assert.equal(battleStartContext.nextCalls,1,'the guide must advance once after both combatants are ready');
assert.equal(battleStartContext.choiceCalls,0,'a recovered request must not return to the choice screen');

battleStartContext.startChosenBattle=()=>{};battleStartContext.player=null;battleStartContext.enemy=null;battleStartContext.screen='battleChoices';battleStartContext.nextCalls=0;
assert.equal(vm.runInContext("startTutorialHunt('still_stale')",battleStartContext),false,'a failed battle initialization must stay recoverable');
assert.equal(battleStartContext.nextCalls,0,'a failed battle initialization must not advance to an empty battle screen');
assert.equal(battleStartContext.choiceCalls,1,'a failed battle initialization must return to a fresh request choice');

console.log('Tutorial Phase 4B validation passed (grassland Slime request, real battle guidance, first-skill release, retry/reload recovery, actual rewards, and Phase 4C checkpoint).');
