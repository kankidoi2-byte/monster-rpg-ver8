import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({console});
vm.runInContext(fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8'), context);

assert.equal(context.rollGoldenLand('easy', () => 0), false, 'Easy must not naturally reveal Golden Land');
assert.equal(context.rollGoldenLand('normal', () => .0299), true, 'Normal Golden Land rate must be 3%');
assert.equal(context.rollGoldenLand('normal', () => .03), false, 'Normal rate must exclude 3% or above');
assert.equal(context.rollGoldenLand('hard', () => .0499), true, 'Hard Golden Land rate must be 5%');
assert.equal(context.rollGoldenLand('hard', () => .05), false, 'Hard rate must exclude 5% or above');
assert.equal(context.rollGoldenLand('extreme', () => .0799), true, 'Extreme Golden Land rate must be 8%');
assert.equal(context.rollGoldenLand('extreme', () => .08), false, 'Extreme rate must exclude 8% or above');
assert.equal(context.goldenLandCoinBonus('normal'), 300, 'Normal bonus must be 300 coins');
assert.equal(context.goldenLandCoinBonus('hard'), 600, 'Hard bonus must be 600 coins');
assert.equal(context.goldenLandCoinBonus('extreme'), 1000, 'Extreme bonus must be 1,000 coins');
assert.equal(context.rollGoldenLandMapFromHunt('normal', () => 0), false, 'Normal must not drop a map');
assert.equal(context.rollGoldenLandMapFromHunt('hard', () => .0099), true, 'Hard map rate must be 1%');
assert.equal(context.rollGoldenLandMapFromHunt('hard', () => .01), false, 'Hard must exclude 1% or above');
assert.equal(context.rollGoldenLandMapFromHunt('extreme', () => .0299), true, 'Extreme map rate must be 3%');
assert.equal(context.rollGoldenLandMapFromHunt('extreme', () => .03), false, 'Extreme must exclude 3% or above');
context.save = {items:{golden_land_map:2},goldenLandMapReady:false};
assert.equal(context.reserveGoldenLandMap(), true, 'a held map must be reservable');
assert.equal(context.save.items.golden_land_map, 2, 'reserving must not consume the map');
assert.equal(context.reserveGoldenLandMap(), false, 'maps must not stack while one is reserved');
assert.equal(context.consumeReservedGoldenLandMap(), true, 'departure must consume the reserved map');
assert.equal(context.save.items.golden_land_map, 1, 'departure must consume exactly one map');
assert.equal(context.save.goldenLandMapReady, false, 'departure must clear the reservation');
assert.equal(context.consumeReservedGoldenLandMap(), false, 'the same departure must not consume twice');

console.log('Golden Land validation passed (appearance, bonuses, drops, reservation, and consumption).');
