import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({console,MAX_LEVEL:100});
vm.runInContext(fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8'), context);

for(const [id,rate,coins,mapRate] of [['d1',0,0,0],['d2',.02,200,0],['d3',.03,300,0],['d4',.04,450,.01],['d5',.05,600,.015],['extreme',.08,1000,.03]]){
  assert.equal(context.rollGoldenLand(id,()=>Math.max(0,rate-.0001)),rate>0,`${id} Golden Land lower boundary`);
  assert.equal(context.rollGoldenLand(id,()=>rate),false,`${id} Golden Land upper boundary`);
  assert.equal(context.goldenLandCoinBonus(id),coins,`${id} coin bonus`);
  assert.equal(context.rollGoldenLandMapFromHunt(id,()=>Math.max(0,mapRate-.0001)),mapRate>0,`${id} map lower boundary`);
  assert.equal(context.rollGoldenLandMapFromHunt(id,()=>mapRate),false,`${id} map upper boundary`);
}
context.save = {items:{golden_land_map:0},goldenLandMapReady:false};
context.registerItemDex = id => { context.registeredItemId = id; };
assert.equal(context.grantGoldenLandMapFromHuntWin('d4', () => .0099), true, 'a winning difficulty IV hunt must grant the map on a successful roll');
assert.equal(context.save.items.golden_land_map, 1, 'the shared hunt reward path must add exactly one map');
assert.equal(context.registeredItemId, 'golden_land_map', 'the granted map must be registered in the item encyclopedia');
assert.equal(context.grantGoldenLandMapFromHuntWin('d4', () => .01), false, 'a failed hunt roll must not grant another map');
assert.equal(context.save.items.golden_land_map, 1, 'a failed hunt roll must leave inventory unchanged');
context.save = {items:{golden_land_map:2},goldenLandMapReady:false};
assert.equal(context.reserveGoldenLandMap(), true, 'a held map must be reservable');
assert.equal(context.save.items.golden_land_map, 2, 'reserving must not consume the map');
assert.equal(context.reserveGoldenLandMap(), false, 'maps must not stack while one is reserved');
assert.equal(context.consumeReservedGoldenLandMap(), true, 'departure must consume the reserved map');
assert.equal(context.save.items.golden_land_map, 1, 'departure must consume exactly one map');
assert.equal(context.save.goldenLandMapReady, false, 'departure must clear the reservation');
assert.equal(context.consumeReservedGoldenLandMap(), false, 'the same departure must not consume twice');

const singleBattleSource = fs.readFileSync(new URL('../js/battle-flow.js', import.meta.url), 'utf8');
const multiBattleSource = fs.readFileSync(new URL('../js/multi-battle.js', import.meta.url), 'utf8');
const initSource = fs.readFileSync(new URL('../js/init.js', import.meta.url), 'utf8');
const dataSource = fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(singleBattleSource, /grantGoldenLandMapFromHuntWin\(activeHuntRequest\?\.difficultyId\)/, 'single battles must use the shared map reward path');
assert.match(multiBattleSource, /grantGoldenLandMapFromHuntWin\(activeHuntRequest\?\.difficultyId\)/, 'three-way and invasion battles must use the shared map reward path');
assert.doesNotMatch(initSource, /grantGoldenLandVerificationMapFromUrl/, 'the failed URL verification route must be removed');
assert.match(dataSource, /id:'golden_land_map'.*price:0.*shop:false/, 'the map must not remain in the release shop');
assert.match(indexSource, /js\/state\.js\?v=tutorial-phase1-1/, 'the public page must invalidate cached validation scripts');

console.log('Golden Land validation passed (appearance, bonuses, release rewards, reservation, and consumption).');
