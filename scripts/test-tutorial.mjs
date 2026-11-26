import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const fullSource=fs.readFileSync(new URL('../js/save.js',import.meta.url),'utf8');
const source=fullSource.slice(0,fullSource.indexOf('/* Ver7.8:'));
const storage=new Map();
const context=vm.createContext({
  console,Date,JSON,Math,
  MAX_LEVEL:100,
  clampLevel:value=>Math.min(100,Math.max(1,Math.floor(Number(value)||1))),
  isMaxLevel:value=>Number(value)>=100,
  M:[{id:'elna_beginner'},{id:'freigal'},{id:'aquaron'},{id:'grassbeat'},{id:'volteck'},{id:'slime'}],
  MAPS:[{id:'grassland'}],
  localStorage:{
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem:(key,value)=>storage.set(key,String(value)),
    removeItem:key=>storage.delete(key)
  },
  confirm:()=>false,
  alert:()=>{}
});
vm.runInContext(source,context);

function evaluate(expression){return vm.runInContext(expression,context);}
function plain(value){return JSON.parse(JSON.stringify(value));}
function prepare(value){
  context.fixtureRaw=JSON.stringify(value);
  return evaluate('parseAndPrepareSave(fixtureRaw,[])');
}
function resetNewSave(){evaluate('save=initSave()');}

const fresh=plain(evaluate('initSave()'));
assert.equal(fresh.schemaVersion,4);
assert.deepEqual(fresh.progress.tutorial,{
  id:'prologue',version:2,status:'not_started',stepId:null,chapterGate:false,
  completed:false,skipped:false,replaying:false,
  playerName:null,playerNamed:false,
  starterContractsGranted:false,elnaGuestActive:false,elnaContractGranted:false,
  stellaSkillCardGranted:false,alchemySuppliesGranted:false,alchemyLessonPrepared:false,alchemyLessonCompleted:false,
  expeditionDispatched:false,prologueCompleted:false,
  firstContractGuaranteeUsed:false,starterContractScrollGranted:false,
  guides:{
    threeWay:false,invasion:false,kokoroLink:false,alchemy:false,expedition:false,
    evolutionFusion:false,skillCards:false,goldenLand:false,dex:false,
    shopItems:false,contractorRank:false,evolution:false,skillGacha:false,battleItems:false,contractorTitles:false
  }
});

const legacy=plain(prepare({schemaVersion:3,saveMeta:{migrations:[]},progress:{tutorial:{id:'prologue',version:1,status:'not_started',stepId:null}}}));
assert.equal(legacy.schemaVersion,4);
assert.ok(legacy.saveMeta.migrations.includes('v3_to_v4_tutorial_state'));
assert.equal(legacy.progress.tutorial.status,'completed','existing players must not be forced into the required tutorial');
assert.equal(legacy.progress.tutorial.completed,true);
assert.equal(legacy.progress.tutorial.firstContractGuaranteeUsed,true,'legacy saves must not receive the guaranteed contract');
assert.equal(legacy.progress.tutorial.starterContractScrollGranted,true,'legacy saves must not receive the tutorial scroll');
assert.equal(legacy.progress.tutorial.starterContractsGranted,true,'legacy saves must not receive starter contracts twice');
assert.equal(legacy.progress.tutorial.elnaContractGranted,true,'legacy saves must not receive the Elna contract twice');

const repaired=plain(prepare({
  schemaVersion:4,
  progress:{tutorial:{
    version:2,status:'in_progress',stepId:'battle_skill',guides:{threeWay:true,unknown:true},
    firstContractGuaranteeUsed:false,starterContractScrollGranted:true
  }}
}));
assert.equal(repaired.progress.tutorial.status,'in_progress');
assert.equal(repaired.progress.tutorial.stepId,'battle_skill','an interrupted tutorial must resume from its saved step');
assert.equal(repaired.progress.tutorial.guides.threeWay,true);
assert.equal(repaired.progress.tutorial.guides.alchemy,false);
assert.equal(repaired.progress.tutorial.guides.unknown,undefined,'unknown guide keys must not enter the save contract');

const previousGuides={
  threeWay:true,invasion:false,kokoroLink:true,alchemy:false,expedition:true,
  evolutionFusion:true,skillCards:true,goldenLand:false,dex:false,shopItems:true,contractorRank:true
};
for(const stepId of ['elna_guest_join','home_requests','growth_elna_details','lumina_intro','lumina_academy_arrival']){
  const oldSave=plain(evaluate('initSave()'));
  oldSave.coins=426;
  oldSave.items.monster_bone=3;
  Object.assign(oldSave.progress.tutorial,{status:'in_progress',stepId,guides:previousGuides});
  const upgraded=plain(prepare(oldSave));
  assert.equal(upgraded.coins,oldSave.coins);
  assert.deepEqual(upgraded.items,oldSave.items);
  assert.deepEqual(upgraded.progress.tutorial,{
    ...oldSave.progress.tutorial,
    guides:{...previousGuides,evolution:false,skillGacha:false,battleItems:false,contractorTitles:false}
  },`old save at ${stepId} must only gain the four unseen guide flags`);
}

resetNewSave();
assert.equal(evaluate('tutorialShouldAutoStart()'),true);
evaluate("setTutorialStep('party_select')");
assert.equal(evaluate('save.progress.tutorial.status'),'in_progress');
assert.equal(evaluate('save.progress.tutorial.stepId'),'party_select');
const resumed=plain(prepare(plain(evaluate('save'))));
assert.equal(resumed.progress.tutorial.stepId,'party_select');

evaluate('completeTutorial()');
assert.equal(evaluate('save.progress.tutorial.completed'),true);
assert.equal(evaluate('tutorialShouldAutoStart()'),false);
assert.equal(evaluate('typeof beginTutorialReplay'),'undefined','retired replay entry point must not remain callable');

const retiredCompleted=plain(prepare({schemaVersion:4,saveMeta:{migrations:[]},progress:{tutorial:{version:2,status:'completed',completed:true,replaying:true,stepId:'intro'}}}));
assert.equal(retiredCompleted.progress.tutorial.status,'completed');
assert.equal(retiredCompleted.progress.tutorial.completed,true);
assert.equal(retiredCompleted.progress.tutorial.replaying,false);
assert.equal(retiredCompleted.progress.tutorial.stepId,null,'an old replay must return to the completed state');
assert.ok(retiredCompleted.saveMeta.migrations.includes('tutorial_replay_retired_v1'));

resetNewSave();
evaluate("setTutorialStep('home')");
evaluate('skipTutorial()');
assert.equal(evaluate('save.progress.tutorial.status'),'skipped');
assert.equal(evaluate('save.progress.tutorial.skipped'),true);
assert.equal(evaluate('tutorialShouldAutoStart()'),false);
const retiredSkipped=plain(prepare({schemaVersion:4,saveMeta:{migrations:[]},progress:{tutorial:{version:2,status:'skipped',skipped:true,replaying:true,stepId:'growth_elna_details'}}}));
assert.equal(retiredSkipped.progress.tutorial.status,'skipped','an old replay must preserve the original skipped state');
assert.equal(retiredSkipped.progress.tutorial.skipped,true);
assert.equal(retiredSkipped.progress.tutorial.replaying,false);
assert.equal(retiredSkipped.progress.tutorial.stepId,null);

resetNewSave();
assert.equal(evaluate("markTutorialGuideSeen('threeWay')"),true);
assert.equal(evaluate("markTutorialGuideSeen('notARealGuide')"),false);
assert.equal(evaluate('save.progress.tutorial.guides.threeWay'),true);
assert.equal(evaluate('markTutorialFirstContractGuaranteeUsed()'),true);
assert.equal(evaluate('markTutorialFirstContractGuaranteeUsed()'),false,'the first-contract guarantee must be idempotent across retries');
assert.equal(evaluate('markTutorialStarterContractScrollGranted()'),true);
assert.equal(evaluate('markTutorialStarterContractScrollGranted()'),false,'the starter contract scroll must not be granted twice');
context.reloadedTutorialSave=plain(evaluate('save'));
evaluate('save=parseAndPrepareSave(JSON.stringify(reloadedTutorialSave),[])');
assert.equal(evaluate('markTutorialFirstContractGuaranteeUsed()'),false,'reload must not restore the first-contract guarantee');
assert.equal(evaluate('markTutorialStarterContractScrollGranted()'),false,'reload must not restore the starter contract scroll grant');
assert.equal(evaluate('markTutorialStarterContractsGranted()'),true);
assert.equal(evaluate('markTutorialStarterContractsGranted()'),false,'starter contracts must only be claimed once');
assert.equal(evaluate('markTutorialElnaContractGranted()'),true);
assert.equal(evaluate('markTutorialElnaContractGranted()'),false,'the Elna contract must only be claimed once');
assert.equal(evaluate("markTutorialOnce('unknownReward')"),false,'unknown reward flags must not enter the save contract');

console.log('Tutorial save validation passed (v2 new save, v1 protection, resume, complete, skip, retired replay migration, guides, and idempotent grant flags).');
