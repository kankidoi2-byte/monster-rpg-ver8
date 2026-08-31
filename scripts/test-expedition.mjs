import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const monsters = new Map([
  ['fireling', {id:'fireling', name:'ファイアリング', types:['fire'], hp:100, spd:80, moves:[['火花', 60]]}],
  ['aqua', {id:'aqua', name:'アクア', types:['water'], hp:120, spd:50, moves:[['水撃', 45]]}],
  ['super', {id:'super', name:'超ボス', types:['star'], hp:500, spd:90, moves:[], bossClass:'超ボス級'}]
]);
const save = {
  coins:0,
  items:{},
  party:[],
  instances:[
    {uid:'u1', id:'fireling', level:10, exp:0},
    {uid:'u2', id:'fireling', level:10, exp:0},
    {uid:'u3', id:'aqua', level:10, exp:0}
  ],
  expeditions:{completedCount:0, active:[]}
};
const context = vm.createContext({
  console,
  Math,
  Date,
  save,
  MAPS:[
    {id:'volcano', name:'火山', enemyIds:['fireling']},
    {id:'starsea', name:'星海', enemyIds:['super']}
  ],
  HUNT_MAP_BOOST_TYPES:{volcano:'fire', starsea:'star'},
  TYPE_ICONS:{fire:'🔥', star:'🌌'},
  TN:{fire:'火', star:'星'},
  ITEM_BY_ID:{},
  by:id=>monsters.get(id) || null,
  getInstance:uid=>save.instances.find(ins=>ins.uid===uid) || null,
  instanceStatModifier:()=>1,
  instanceMaxHp:ins=>monsters.get(ins.id).hp + ins.level * 10,
  monSpd:(mon)=>mon.spd,
  needExp:()=>100,
  checkEvolution:()=>{},
  saveGame:()=>{},
  registerItemDex:()=>{},
  document:{
    getElementById:id=>id==='expeditionNav'||id==='expedition'?{}:null,
    querySelectorAll:()=>[],
    querySelector:()=>null,
    createElement:()=>({})
  }
});
vm.runInContext(fs.readFileSync(new URL('../js/expedition.js', import.meta.url), 'utf8'), context);

assert.deepEqual(vm.runInContext('expeditionDestinations().map(map=>map.id)', context), ['volcano'], 'super-boss maps must be excluded');
assert.equal(vm.runInContext('expeditionUnlockedSlots()', context), 1);
save.expeditions.completedCount=5;
assert.equal(vm.runInContext('expeditionUnlockedSlots()', context), 2);
save.expeditions.completedCount=15;
assert.equal(vm.runInContext('expeditionUnlockedSlots()', context), 3);

const full = vm.runInContext("expeditionSuitability(['u1','u2','u3'], MAPS[0])", context);
const solo = vm.runInContext("expeditionSuitability(['u1'], MAPS[0])", context);
assert.ok(full.total > solo.total, 'dispatching fewer than three members must incur a penalty');

save.expeditions.active=[{id:'e1',mapId:'volcano',distanceId:'short',memberUids:['u1'],progress:0,requiredWins:1,status:'active',suitability:solo,reward:null}];
assert.equal(vm.runInContext("isInstanceOnExpedition('u1')", context), true);
assert.equal(vm.runInContext("isInstanceOnExpedition('u2')", context), false);
vm.runInContext('progressActiveExpeditions(()=>0.99)', context);
assert.equal(save.expeditions.active[0].status, 'complete');
assert.equal(save.expeditions.active[0].progress, 1);
const fixedReward=JSON.stringify(save.expeditions.active[0].reward);
vm.runInContext('progressActiveExpeditions(()=>0)', context);
assert.equal(JSON.stringify(save.expeditions.active[0].reward), fixedReward, 'completed rewards must not reroll');

save.expeditions.active=[{id:'legacy_short',mapId:'volcano',distanceId:'short',memberUids:['u1'],requiredWins:1,progress:0,status:'active'}];
assert.doesNotThrow(()=>vm.runInContext('progressActiveExpeditions(()=>0.99)', context),
  'a legacy expedition without suitability must not stop the post-battle victory flow');
assert.equal(save.expeditions.active[0].status, 'complete');
assert.equal(save.expeditions.active[0].suitability.grade, solo.grade, 'legacy suitability must be reconstructed from its members and map');
assert.ok(save.expeditions.active[0].reward, 'legacy expedition completion must still create its reward');

assert.equal(vm.runInContext('EXPEDITION_GOLDEN_MAP_RATES.short', context), .01, 'short map rate must be 1%');
assert.equal(vm.runInContext('EXPEDITION_GOLDEN_MAP_RATES.medium', context), .03, 'medium map rate must be 3%');
assert.equal(vm.runInContext('EXPEDITION_GOLDEN_MAP_RATES.long', context), .05, 'long map rate must be 5%');
const mapReward = vm.runInContext("expeditionRewardPlan(MAPS[0],EXPEDITION_DISTANCES.long,{grade:'D',greatRate:0},()=>0,1)", context);
assert.equal(mapReward.items.golden_land_map, 1, 'a successful long-distance map roll must add one map');
const recallReward = vm.runInContext("expeditionRewardPlan(MAPS[0],EXPEDITION_DISTANCES.long,{grade:'D',greatRate:0},()=>0,.5)", context);
assert.equal(recallReward.items.golden_land_map, undefined, 'recall rewards must not contain a Golden Land map');

console.log('Expedition validation passed (destinations, slots, suitability, locks, rewards, and map rates).');
