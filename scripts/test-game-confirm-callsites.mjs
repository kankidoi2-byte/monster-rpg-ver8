import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';

function fixture(){
  const r=runtime();
  const questions=[];
  r.context.showUiNotice=()=>{};
  r.context.gameConfirm=options=>new Promise(resolve=>questions.push({options,resolve}));
  return {...r,questions,snapshot:()=>r.run('JSON.stringify(save)')};
}
async function checkDeferred(r,action,{stale,success,danger=false}){
  const before=r.snapshot();
  const cancelled=r.run(action);
  await r.run(action);
  assert.equal(r.questions.length,1,'overlapping submit opens only one question');
  assert.equal(r.questions[0].options.danger===true,danger);
  assert.equal(r.snapshot(),before,'no execution while asking');
  r.questions.shift().resolve(false);
  await cancelled;
  assert.equal(r.snapshot(),before,'cancel does not mutate save');
  const pending=r.run(action);
  const restore=r.run(stale);
  const afterExternalChange=r.snapshot();
  r.questions.shift().resolve(true);
  await pending;
  assert.equal(r.snapshot(),afterExternalChange,'stale confirmation does not mutate updated save');
  r.run(restore);
  const accepted=r.run(action);
  await r.run(action);
  assert.equal(r.questions.length,1);
  const confirmation=r.questions.shift();
  confirmation.resolve(true);confirmation.resolve(true);
  await accepted;
  assert(r.run(success),'the accepted action executes once');
}
{
  const r=fixture();
  r.run(`save=initSave();save.coins=2000;var member=addInstance('freigal',1);
    save.party=[];var entry={id:'audit-recall',mapId:'grassland',distanceId:'medium',memberUids:[member.uid],
    progress:1,requiredWins:3,status:'active',suitability:{grade:'D',total:0,greatRate:0,reasons:[]}};
    save.expeditions.active=[entry];renderExpedition=renderPartySetup=()=>{};Math.random=()=>.99;`);
  await checkDeferred(r,"recallExpedition('audit-recall')",{
    stale:"entry.progress=2;'entry.progress=1'",success:'save.coins===2008&&save.expeditions.active.length===0&&save.expeditions.completedCount===0'
  });
}
{
  const r=fixture();
  r.run(`save=initSave();var recipe=FUSIONS[0],ins=addInstance(recipe.from,3);
    save.items[recipe.item]=recipe.count*2;renderFusion=()=>{};`);
  await checkDeferred(r,'tryFusion(0)',{
    stale:"ins.exp=15;'ins.exp=0'",success:'ins.id===recipe.to&&save.items[recipe.item]===recipe.count'
  });
}
{
  const r=fixture();
  r.run(`save=initSave();save.worldMap.active.crisis={mapId:'starsea',monsterId:'doom_nemesion',remainingBattles:20};
    var writes=0;saveGame=()=>{writes++;return true};`);
  await checkDeferred(r,'worldMapSkipCrisis()',{
    stale:"save.worldMap.active.crisis.remainingBattles=19;'save.worldMap.active.crisis.remainingBattles=20'",
    success:'!save.worldMap.active.crisis&&writes===1'
  });
}
{
  const r=fixture();
  for(const file of ['skill-synthesis','skill-synthesis-ui'])
    vm.runInContext(fs.readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'),r.context);
  r.run(`save=initSave();save.skillCards={s110_001:4,s110_002:2};save.equippedSkills={};renderSkillSynthesis();
    changeSkillSynthesisMaterial('s110_001',1);changeSkillSynthesisMaterial('s110_001',1);
    changeSkillSynthesisMaterial('s110_002',1);var draws=0;Math.random=()=>{draws++;return .99};`);
  await checkDeferred(r,'confirmSkillSynthesis()',{
    stale:"save.skillCards.s110_001=1;'save.skillCards.s110_001=4'",
    success:'draws===2&&save.skillCards.s110_001===2&&save.skillCards.s110_002===1'
  });
}
{
  const r=fixture();
  r.context.document.addEventListener=()=>{};
  r.context.window={addEventListener(){}};
  vm.runInContext(fs.readFileSync(new URL('../js/tutorial.js',import.meta.url),'utf8'),r.context);
  r.run(`save=initSave();tutorialUiState.active=true;tutorialUiState.persist=true;tutorialUiState.index=0;
    var calls=0;commitTutorialFullSkip=()=>{calls++;save.coins++;return true};
    clearTutorialUi=()=>{tutorialUiState.active=false};updateTutorialMenuSummary=()=>{};`);
  await checkDeferred(r,'requestTutorialSkip()',{
    stale:"tutorialUiState.index=1;'tutorialUiState.index=0'",success:'calls===1&&!tutorialUiState.active'
  });
}
{
  const r=fixture();
  r.run(`save=initSave();var catalyst=addInstance('elna_beginner',3);
    var originalAlchemyPlan=alchemyPlan, originalAlchemyValidate=validateAlchemyPlan;
    var canProceed=true, rate=48, finalizeCount=0;
    alchemyPlan=()=>({selection:{instanceUid:catalyst.uid},instance:catalyst,coinCost:100,rate,tutorialLesson:false});
    validateAlchemyPlan=()=>canProceed?[]:['stale'];
    finalizeAlchemy=()=>{finalizeCount++;save.coins++};`);
  await checkDeferred(r,'executeAlchemyConfirmed()',{
    stale:"rate=49;'rate=48'",success:'finalizeCount===0&&alchemyBusy',danger:true
  });
  await r.flush();
  assert.equal(r.run('finalizeCount'),1);
}
console.log('PASS confirmation callsites: recall/fusion/crisis/skill synthesis/tutorial/last character, overlapping invocation, cancel, stale input, and single accepted execution.');
