import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,structuredClone});
for(const file of ['js/data.js','js/core.js','js/state.js']){
  vm.runInContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),context);
}
vm.runInContext('globalThis.monsters=M;globalThis.maps=MAPS;',context);

assert.equal(vm.runInContext('MAX_LEVEL',context),100,'the player level cap must be 100');
assert.equal(vm.runInContext('clampLevel(135)',context),100,'levels above 100 must be clamped');

const expectedRarities={easy:[1],normal:[1,2,3],hard:[2,3,4],extreme:[5]};
for(const [difficulty,rarities] of Object.entries(expectedRarities)){
  for(const mon of context.monsters){
    context.testMonster=mon;
    assert.equal(vm.runInContext(`isHuntMonsterEligible(testMonster,'${difficulty}')`,context),rarities.includes(mon.rarity.length),`${difficulty} eligibility must match ${mon.name}'s rarity`);
  }
}

for(const map of context.maps){
  context.testMap=map;
  const available=vm.runInContext('availableHuntDifficulties(testMap).map(entry=>entry.id)',context);
  assert.ok(available.length,`${map.name} must have at least one valid difficulty`);
  for(const difficulty of available){
    const candidates=vm.runInContext(`huntCandidatesFor(testMap,'${difficulty}')`,context);
    assert.ok(candidates.length,`${map.name} ${difficulty} must have an eligible enemy`);
    assert.ok(candidates.every(mon=>expectedRarities[difficulty].includes(mon.rarity.length)),`${map.name} ${difficulty} must not leak another rarity`);
    if(difficulty==='normal'||difficulty==='hard')assert.ok(candidates.every(mon=>Number.isFinite(mon.huntLevels?.[difficulty])),`${map.name} ${difficulty} enemies must have explicit fixed levels`);
  }
}

const oneStar={id:'one',name:'One',rarity:'★',hp:50,huntLevels:{normal:13}};
const fiveStar={id:'five',name:'Five',rarity:'★★★★★',hp:50};
context.oneStar=oneStar;context.fiveStar=fiveStar;
assert.equal(vm.runInContext("huntLevelFor(oneStar,'easy')",context),1,'Easy enemies must be level 1');
assert.equal(vm.runInContext("huntLevelFor(oneStar,'normal')",context),13,'Normal must use the monster fixed level');
assert.equal(vm.runInContext("huntLevelFor(fiveStar,'extreme')",context),100,'Extreme enemies must be level 100');

context.by=id=>({one:oneStar,two:{id:'two',name:'Two',rarity:'★★',hp:60,huntLevels:{normal:22,hard:50}},five:fiveStar}[id]||null);
const secondNormal=vm.runInContext("chooseSecondHuntEnemy({enemyIds:['one','two','five']},'one','normal',()=>.99)",context);
assert.notEqual(secondNormal.id,'five','three-way and invasion enemies must obey the same rarity gate');

console.log('Fixed hunt difficulty validation passed (Lv.100 cap, rarity gates, per-monster levels, and multi-enemy filtering).');
