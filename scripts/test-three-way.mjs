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

assert.equal(context.rollHuntBattleMode('easy', () => 0), 'single', 'Easy must remain a single battle');
assert.equal(context.rollHuntBattleMode('normal', () => 0.099), 'three_way', 'Normal three-way rate must be 10%');
assert.equal(context.rollHuntBattleMode('normal', () => 0.10), 'invasion_pending', 'Normal invasion range must start at 10%');
assert.equal(context.rollHuntBattleMode('normal', () => 0.199), 'invasion_pending', 'Normal invasion rate must be 10%');
assert.equal(context.rollHuntBattleMode('normal', () => 0.20), 'single', 'Normal special battle ranges must not overlap');
assert.equal(context.rollHuntBattleMode('hard', () => 0.399), 'invasion_pending', 'Hard invasion rate must be 20%');
assert.equal(context.rollHuntBattleMode('extreme', () => 0.599), 'invasion_pending', 'Extreme invasion rate must be 30%');
assert.equal(context.rollHuntBattleMode('extreme', () => 0.60), 'single', 'Extreme special battle ranges must end at 60%');
assert.deepEqual([0, .34, .99].map(value => context.rollInvasionTurn(() => value)), [2, 3, 4], 'Invasion turn must be between turns 2 and 4');

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

console.log('Multi-faction battle validation passed (rates, invasion timing, and same-map selection).');
