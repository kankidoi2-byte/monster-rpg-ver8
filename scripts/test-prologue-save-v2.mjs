import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/save.js',import.meta.url),'utf8');
const storage=new Map();
const context=vm.createContext({
  console,Date,JSON,Math,setTimeout,
  MAX_LEVEL:100,clampLevel:value=>Math.min(100,Math.max(1,Math.floor(Number(value)||1))),isMaxLevel:value=>Number(value)>=100,
  M:[{id:'elna_beginner'},{id:'freigal'},{id:'aquaron'},{id:'grassbeat'},{id:'volteck'}],MAPS:[{id:'grassland'}],
  INITIAL_PARTY_IDS:['elna_beginner','freigal','aquaron'],
  ALCHEMY_MONSTER_CONFIGS:{},ITEM_DEX_BY_ID:{},ITEM_DEX_ITEMS:[],SHOP_ITEMS:[],
  localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  alert:()=>{},confirm:()=>false,showUiNotice:()=>{},document:{},location:{reload:()=>{}},
  navigator:{clipboard:{writeText:async()=>{}}},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}}
});
vm.runInContext(source,context);
const evaluate=expression=>vm.runInContext(expression,context);
const plain=value=>JSON.parse(JSON.stringify(value));
function prepare(value){context.fixtureRaw=JSON.stringify(value);return plain(evaluate('parseAndPrepareSave(fixtureRaw,[])'));}

evaluate('save=initSave();initStarters()');
assert.equal(evaluate('save.progress.tutorial.version'),2);
assert.equal(evaluate('save.instances.length'),0,'new prologue saves must defer the old five-unit starter grant');

const publishedMidway=prepare({
  schemaVersion:4,saveMeta:{migrations:[]},
  instances:[
    {uid:'old_elna',id:'elna_beginner',level:1,exp:0},{uid:'old_fire',id:'freigal',level:1,exp:0},
    {uid:'old_water',id:'aquaron',level:1,exp:0},{uid:'old_grass',id:'grassbeat',level:1,exp:0},
    {uid:'old_thunder',id:'volteck',level:1,exp:0}
  ],
  progress:{tutorial:{id:'prologue',version:1,status:'in_progress',stepId:'battle_skill'}}
});
assert.equal(publishedMidway.progress.tutorial.version,2);
assert.equal(publishedMidway.progress.tutorial.status,'completed','published v1 progress must not be forced into the rewritten prologue');
assert.equal(publishedMidway.progress.tutorial.stepId,null,'incompatible v1 STEP IDs must be cleared');
assert.equal(publishedMidway.progress.tutorial.starterContractsGranted,true);
assert.equal(publishedMidway.progress.tutorial.elnaContractGranted,true);
assert.ok(publishedMidway.saveMeta.migrations.includes('tutorial_v1_to_v2_legacy_protection'));
assert.equal(publishedMidway.instances.length,5,'migration must preserve every owned instance');

const publishedSkipped=prepare({schemaVersion:4,saveMeta:{migrations:[]},progress:{tutorial:{id:'prologue',version:1,status:'skipped',skipped:true}}});
assert.equal(publishedSkipped.progress.tutorial.status,'skipped','published skip choice must be preserved');
assert.equal(publishedSkipped.progress.tutorial.prologueCompleted,true,'published players must retain free-play access');

const v2Midway=prepare({
  schemaVersion:4,saveMeta:{migrations:[]},
  progress:{tutorial:{id:'prologue',version:2,status:'in_progress',stepId:'gnosis_descent',playerName:'  アオ  ',playerNamed:true,elnaGuestActive:true}}
});
assert.equal(v2Midway.progress.tutorial.stepId,'gnosis_descent','v2 interrupted progress must resume exactly');
assert.equal(v2Midway.progress.tutorial.playerName,'アオ');
assert.equal(v2Midway.progress.tutorial.playerNamed,true);
assert.equal(v2Midway.progress.tutorial.elnaGuestActive,true);

context.v2Save=v2Midway;
evaluate('save=JSON.parse(JSON.stringify(v2Save))');
assert.equal(evaluate("markTutorialStarterContractsGranted()"),true);
assert.equal(evaluate("markTutorialStarterContractsGranted()"),false);
assert.equal(evaluate("markTutorialElnaContractGranted()"),true);
assert.equal(evaluate("markTutorialElnaContractGranted()"),false);
assert.equal(evaluate("markTutorialOnce('notAllowed')"),false);
assert.equal(evaluate("setTutorialPlayerName('   ')"),false);
assert.equal(evaluate("setTutorialPlayerName('  ミナト  ')"),true);
assert.equal(evaluate('save.progress.tutorial.playerName'),'ミナト');
assert.equal(evaluate('setTutorialElnaGuestActive(false)'),false);
context.persisted=plain(evaluate('save'));
evaluate('save=parseAndPrepareSave(JSON.stringify(persisted),[])');
assert.equal(evaluate("markTutorialStarterContractsGranted()"),false,'reload must not reopen starter rewards');
assert.equal(evaluate("markTutorialElnaContractGranted()"),false,'reload must not reopen the Elna contract');

const ownershipRepair=prepare({
  schemaVersion:4,saveMeta:{migrations:[]},
  instances:[{uid:'fire',id:'freigal',level:1,exp:0},{uid:'water',id:'aquaron',level:1,exp:0},{uid:'elna',id:'elna_beginner',level:1,exp:0}],
  progress:{tutorial:{id:'prologue',version:2,status:'in_progress',starterContractsGranted:false,elnaContractGranted:false}}
});
assert.equal(ownershipRepair.progress.tutorial.starterContractsGranted,true,'ownership must repair a missing starter-contract claim');
assert.equal(ownershipRepair.progress.tutorial.elnaContractGranted,true,'ownership must repair a missing Elna claim');

console.log('Prologue v2 save checks passed (deferred starters, v1 protection, exact resume, ownership repair, and idempotent grants).');
