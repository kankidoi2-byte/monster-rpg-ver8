import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({console});
vm.runInContext(fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8'), context);

assert.equal(context.rollThreeWayBattle('easy', () => 0), false, 'Easy must never roll a three-way battle');
assert.equal(context.rollThreeWayBattle('normal', () => 0.099), true, 'Normal rate must include rolls below 10%');
assert.equal(context.rollThreeWayBattle('normal', () => 0.10), false, 'Normal rate must exclude rolls at 10% or above');
assert.equal(context.rollThreeWayBattle('hard', () => 0.199), true, 'Hard rate must include rolls below 20%');
assert.equal(context.rollThreeWayBattle('hard', () => 0.20), false, 'Hard rate must exclude rolls at 20% or above');
assert.equal(context.rollThreeWayBattle('extreme', () => 0.299), true, 'Extreme rate must include rolls below 30%');
assert.equal(context.rollThreeWayBattle('extreme', () => 0.30), false, 'Extreme rate must exclude rolls at 30% or above');

const monsters = new Map([
  ['a', {id:'a', name:'A'}],
  ['b', {id:'b', name:'B'}],
  ['c', {id:'c', name:'C'}]
]);
context.by = id => monsters.get(id) || null;

const second = context.chooseSecondHuntEnemy({enemyIds:['a', 'b', 'c']}, 'a', () => 0);
assert.equal(second.id, 'b', 'A different same-map enemy must be preferred when available');
const only = context.chooseSecondHuntEnemy({enemyIds:['a']}, 'a', () => 0);
assert.equal(only.id, 'a', 'A same species fallback must remain possible on a one-enemy map');
assert.equal(context.chooseSecondHuntEnemy({enemyIds:['missing']}, 'a', () => 0), null, 'Missing enemy references must not create a battle');

console.log('Three-way battle validation passed (rates and same-map enemy selection).');
