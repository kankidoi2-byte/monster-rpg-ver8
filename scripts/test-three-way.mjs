import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({console,MAX_LEVEL:100});
vm.runInContext(fs.readFileSync(new URL('../js/state.js', import.meta.url), 'utf8'), context);
const multiBattleSource = fs.readFileSync(new URL('../js/multi-battle.js', import.meta.url), 'utf8');
const battleFlowSource = fs.readFileSync(new URL('../js/battle-flow.js', import.meta.url), 'utf8');
const battleCss = fs.readFileSync(new URL('../css/ui-redesign.css', import.meta.url), 'utf8');

const rates={d1:0,d2:.05,d3:.10,d4:.15,d5:.20,extreme:.30};
for(const [id,rate] of Object.entries(rates)){
  assert.equal(context.rollThreeWayBattle(id,()=>0),rate>0,`${id} zero draw`);
  if(rate)assert.equal(context.rollThreeWayBattle(id,()=>rate-.001),true,`${id} below upper bound`);
  assert.equal(context.rollThreeWayBattle(id,()=>rate),false,`${id} excludes upper bound`);
  assert.equal(context.rollHuntBattleMode(id,()=>0),rate?'three_way':'single');
  if(rate){
    assert.equal(context.rollHuntBattleMode(id,()=>rate),'invasion_pending');
    assert.equal(context.rollHuntBattleMode(id,()=>2*rate-.001),'invasion_pending');
  }
  assert.equal(context.rollHuntBattleMode(id,()=>2*rate),'single');
}
for(const [old,id] of [['easy','d1'],['normal','d2'],['hard','d4']]){
  for(const draw of [0,.049,.05,.149,.15,.299,.30,.99])
    assert.equal(context.rollHuntBattleMode(old,()=>draw),context.rollHuntBattleMode(id,()=>draw),`${old} alias preserves new tier rates`);
}
assert.deepEqual([0, .34, .99].map(value => context.rollInvasionTurn(() => value)), [2, 3, 4], 'Invasion turn must be between turns 2 and 4');

const monsters = new Map([
  ['a', {id:'a', name:'A'}],
  ['b', {id:'b', name:'B'}],
  ['c', {id:'c', name:'C'}]
]);
context.by = id => monsters.get(id) || null;

const second = context.chooseSecondHuntEnemy({enemyIds:['a', 'b', 'c']}, 'a', 'normal', () => 0);
assert.equal(second.id, 'b', 'A different same-map enemy must be preferred when available');
const only = context.chooseSecondHuntEnemy({enemyIds:['a']}, 'a', 'normal', () => 0);
assert.equal(only.id, 'a', 'A same species fallback must remain possible on a one-enemy map');
assert.equal(context.chooseSecondHuntEnemy({enemyIds:['missing']}, 'a', 'normal', () => 0), null, 'Missing enemy references must not create a battle');

const targetEntries = [
  {id:'enemy_a', alive:true, hp:30},
  {id:'enemy_b', alive:true, hp:40}
];
assert.equal(context.resolveLivingMultiTargetId(targetEntries, 'enemy_b'), 'enemy_b', 'A living requested target must remain selected');
assert.equal(context.resolveLivingMultiTargetId([{...targetEntries[0], alive:false, hp:0}, targetEntries[1]], 'enemy_a'), 'enemy_b', 'A defeated target must fall back to the first living enemy');
assert.equal(context.resolveLivingMultiTargetId(targetEntries.map(entry => ({...entry, alive:false, hp:0})), 'enemy_a'), null, 'No target may be returned after every enemy is defeated');

assert.equal(context.multiEnemyCardAction(targetEntries[0], null), 'details', 'A normal enemy-card tap must open details');
assert.equal(context.multiEnemyCardAction(targetEntries[0], 0), 'target', 'A card tap after skill selection must choose the target');
assert.equal(context.multiEnemyCardAction({...targetEntries[0], alive:false, hp:0}, 0), 'none', 'A defeated enemy must not be targetable');

assert.match(battleCss, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/, 'Enemy cards must remain side by side');
assert.match(multiBattleSource, /function handleMultiEnemyCard\(/, 'Enemy cards must retain the detail/target tap handler');
assert.match(multiBattleSource, /resolveLivingMultiTargetId\(multiBattle\.enemies,action\.targetId\)/, 'Player actions must resolve a living target at execution time');
assert.match(multiBattleSource, /function triggerInvasionIfDue\([\s\S]*?setMultiBattleLayout\(true\)/, 'An invasion must switch into the shared multi-battle layout');
assert.match(multiBattleSource, /targets=\[\{kind:'player'[\s\S]*?kind:'enemy'/, 'Enemies must be able to attack the player or the other enemy');
assert.match(battleFlowSource, /function endPartyRecovery\([\s\S]*?setMultiBattleLayout\(false\)/, 'Leaving battle must restore the normal single-enemy layout');
assert.match(battleFlowSource, /function win\([\s\S]*?showBattleOutcome\([\s\S]*?renderSingleBattleContractPanel\(\)/, 'A single-battle victory must expose the shared post-battle contract flow');

console.log('Multi-faction battle validation passed (rates, invasion, side-by-side UI, card actions, and living-target fallback).');
