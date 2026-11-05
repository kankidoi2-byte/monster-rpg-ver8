import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Load save repair without state.js, as recovery tools do.
const source=fs.readFileSync(new URL('../js/save.js',import.meta.url),'utf8').split('/* Ver7.8:')[0];
const storage=new Map();
const context=vm.createContext({
  console,Date,JSON,Math,MAX_LEVEL:100,
  clampLevel:value=>Math.min(100,Math.max(1,Math.floor(Number(value)||1))),
  isMaxLevel:value=>Number(value)>=100,
  M:[{id:'elna_beginner'},{id:'freigal'},{id:'aquaron'}],
  MAPS:[{id:'grassland'},{id:'forest'}],
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  confirm:()=>false,alert:()=>{}
});
vm.runInContext(source,context);
function call(expression,value){context.input=value;return JSON.parse(JSON.stringify(vm.runInContext(expression,context)));}
const aliases={easy:'d1',normal:'d2',hard:'d4',d1:'d1',d2:'d2',d3:'d3',d4:'d4',d5:'d5',extreme:'extreme'};
for(const [oldId,newId] of Object.entries(aliases)){
  const result=call('normalizeWorldMapNavigationState(input)',{mapId:'grassland',difficultyId:oldId,overviewScrollLeft:245,extra:'retained'});
  assert.equal(result.difficultyId,newId);
  assert.equal(result.overviewScrollLeft,245);
  assert.equal(result.extra,'retained');
}
assert.equal(call('normalizeWorldMapNavigationState(input)',{mapId:'missing',difficultyId:'easy'}).difficultyId,null);
assert.equal(call('normalizeWorldMapNavigationState(input)',{mapId:'grassland',difficultyId:'invalid'}).difficultyId,null);
const auto={
  defeated:{'grassland:easy':['freigal','freigal'],'grassland:d1':['aquaron'],'forest:normal':['aquaron'],'forest:hard':['freigal'],'forest:d4':['aquaron'],'forest:extreme':['freigal'],'bad:key:hard':['freigal'],'forest:invalid':['freigal']},
  unlocked:['grassland:easy','grassland:d1','forest:normal','forest:hard','forest:extreme','forest:d5','invalid'],
  settings:{times:20,contract:'pause',stopOnBlessEmpty:false,stopOnNewDex:true,speed:1}
};
const migrated=call('normalizeAutoBattle(input)',auto);
assert.deepEqual(migrated.defeated,{'grassland:d1':['freigal','aquaron'],'forest:d2':['aquaron'],'forest:d4':['freigal','aquaron'],'forest:extreme':['freigal']});
assert.deepEqual(migrated.unlocked,['grassland:d1','forest:d2','forest:d4','forest:extreme','forest:d5']);
assert.deepEqual(migrated.settings,auto.settings);
assert.deepEqual(call('normalizeAutoBattle(input)',migrated),migrated,'normalization must be idempotent');
assert.ok(!Object.hasOwn(auto.defeated,'forest:d2'),'normalization must not mutate input');
for(const legacy of ['easy','normal','hard']){
  const fixture={schemaVersion:4,coins:321,instances:[{uid:'original_uid',id:'freigal',level:12,exp:7}],party:['original_uid'],items:{potion:9},worldMap:{navigation:{mapId:'grassland',difficultyId:legacy}},autoBattle:auto};
  const prepared=call('parseAndPrepareSave(JSON.stringify(input),[])',fixture);
  assert.equal(prepared.worldMap.navigation.difficultyId,aliases[legacy]);
  assert.deepEqual(prepared.autoBattle,migrated);
  assert.equal(prepared.coins,321);
  assert.equal(prepared.instances[0].uid,'original_uid');
  assert.equal(prepared.instances[0].level,12);
  assert.equal(prepared.items.potion,9);
  const reloaded=call('parseAndPrepareSave(JSON.stringify(input),[])',prepared);
  assert.deepEqual(reloaded.autoBattle,migrated,'saved and reloaded unlocks must survive');
  assert.equal(reloaded.worldMap.navigation.difficultyId,aliases[legacy]);
}
assert.equal(vm.runInContext('SAVE_KEY',context),'mb_v95c');
assert.equal(vm.runInContext('SAVE_SCHEMA_VERSION',context),4);
console.log('Difficulty save migration: selection, progress union, unlock preservation, settings, full-save reload, unchanged keys passed.');
