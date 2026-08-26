import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const fullSource=fs.readFileSync(new URL('../js/save.js',import.meta.url),'utf8');
const source=fullSource.slice(0,fullSource.indexOf('/* Ver7.8:'));
const storage=new Map();
const localStorage={
  getItem:key=>storage.has(key)?storage.get(key):null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key)
};
const context=vm.createContext({
  console,localStorage,Date,JSON,Math,
  MAX_LEVEL:100,clampLevel:value=>Math.min(100,Math.max(1,Math.floor(Number(value)||1))),isMaxLevel:value=>Number(value)>=100,
  M:[{id:'elna_beginner'},{id:'freigal'},{id:'aquaron'}],
  MAPS:[{id:'grassland'}],
  confirm:()=>false,alert:()=>{}
});
vm.runInContext(source,context);

function prepare(value){
  context.fixtureRaw=typeof value==='string'?value:JSON.stringify(value);
  return vm.runInContext('parseAndPrepareSave(fixtureRaw,[])',context);
}

const fixtures=[
  {},
  {caught:['freigal'],levels:{freigal:4},exp:{freigal:12},items:{potion:1},coins:'25',mapDex:['grassland','missing','grassland']},
  {instances:[{uid:'same',id:'freigal',level:2,exp:3},{uid:'same',id:'aquaron',level:-2,exp:-9},{uid:'lost',id:'future_monster'}],party:['same','lost'],items:{}},
  {instances:[{uid:'u1',id:'freigal',level:1,exp:0}],expeditions:{completedCount:-3,active:[{id:'bad',mapId:'missing',distanceId:'short',memberUids:['u1']}]}},
  {schemaVersion:0,instances:[{id:'elna_beginner'}],items:{golden_land_map:1},goldenLandMapReady:true,history:{wins:2,logs:['ok']}}
];

fixtures.forEach((fixture,index)=>{
  const migrated=prepare(fixture);
  assert.equal(migrated.schemaVersion,2,`fixture ${index+1} must migrate to v2`);
  assert.ok(migrated.saveMeta.migrations.includes('v0_to_v1'));
  assert.ok(migrated.saveMeta.migrations.includes('v1_to_v2_map_dex'));
  assert.ok(Array.isArray(migrated.instances));
  assert.ok(migrated.progress?.tutorial&&migrated.progress?.missions);
});

const repaired=prepare(fixtures[2]);
assert.equal(repaired.instances.length,2,'unknown monster instances must be quarantined');
assert.equal(new Set(repaired.instances.map(entry=>entry.uid)).size,2,'duplicate UIDs must be repaired');
assert.equal(repaired.instances[1].level,1,'invalid level must be repaired');
assert.equal(repaired.instances[1].exp,0,'invalid EXP must be repaired');
assert.equal(repaired.quarantine.unknownInstances.length,1);
assert.deepEqual([...repaired.party],['same'],'party must only keep valid unique UIDs');
assert.deepEqual([...prepare(fixtures[1]).mapDex],['grassland'],'map dex must keep valid unique map IDs');
assert.deepEqual([...prepare({schemaVersion:1,saveMeta:{migrations:['v0_to_v1']}}).mapDex],['grassland'],'v1 saves must inherit maps that were historically available');
const capped=prepare({instances:[{uid:'over',id:'freigal',level:135,exp:9999}],levels:{freigal:140},exp:{freigal:9999}});
assert.equal(capped.instances[0].level,100,'legacy instances above the cap must be clamped to level 100');
assert.equal(capped.instances[0].exp,0,'max-level instances must not retain overflow EXP');
assert.equal(capped.levels.freigal,100,'legacy species levels above the cap must be clamped');

const expeditionRepair=prepare(fixtures[3]);
assert.equal(expeditionRepair.expeditions.completedCount,0);
assert.equal(expeditionRepair.expeditions.active.length,0);
assert.equal(expeditionRepair.quarantine.invalidExpeditions.length,1);

for(const corrupt of ['{broken',JSON.stringify([]),JSON.stringify({schemaVersion:99})]){
  context.corruptRaw=corrupt;
  assert.throws(()=>vm.runInContext('parseAndPrepareSave(corruptRaw,[])',context));
}

const hashed=prepare(fixtures[1]);
context.hashTarget=hashed;
const hash=vm.runInContext('saveHash(hashTarget)',context);
hashed.saveMeta.integrityHash=hash;
context.hashTarget=hashed;
assert.equal(vm.runInContext('saveHash(hashTarget)',context),hash,'integrity hash must ignore its own field');

const writeStorage=new Map();
let failPrimaryWrite=false;
const writeContext=vm.createContext({
  console,Date,JSON,Math,setTimeout,
  MAX_LEVEL:100,clampLevel:value=>Math.min(100,Math.max(1,Math.floor(Number(value)||1))),isMaxLevel:value=>Number(value)>=100,
  M:[{id:'elna_beginner'}],MAPS:[],ALCHEMY_MONSTER_CONFIGS:{},ITEM_DEX_BY_ID:{},ITEM_DEX_ITEMS:[],SHOP_ITEMS:[],
  localStorage:{
    getItem:key=>writeStorage.has(key)?writeStorage.get(key):null,
    setItem:(key,value)=>{if(failPrimaryWrite&&key==='mb_v95c')throw new Error('QuotaExceededError');writeStorage.set(key,String(value));},
    removeItem:key=>writeStorage.delete(key)
  },
  alert:()=>{},confirm:()=>false,showUiNotice:()=>{},document:{},location:{reload:()=>{}},navigator:{clipboard:{writeText:async()=>{}}},Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}}
});
vm.runInContext(fullSource,writeContext);
assert.equal(vm.runInContext('save.coins=10;saveGame()',writeContext),true);
assert.equal(vm.runInContext('save.coins=20;saveGame()',writeContext),true);
assert.equal(JSON.parse(writeStorage.get('mb_v95c_lastKnownGood')).coins,10,'backup must keep the previous successful save');
failPrimaryWrite=true;
assert.equal(vm.runInContext('save.coins=30;saveGame()',writeContext),false,'quota/storage failure must be reported without throwing');
assert.equal(JSON.parse(writeStorage.get('mb_v95c')).coins,20,'failed writes must not replace the current save');

console.log('Save migration validation passed (5 legacy fixtures, 3 corrupt fixtures, repair, quarantine, backup, integrity hash, and failed writes).');
