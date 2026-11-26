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

const expectedRarities={d1:[1,2],d2:[1,2,3],d3:[2,3],d4:[2,3,4],d5:[3,4],extreme:[5]};
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
    if(map.bossOnly||map.rareOnly||map.goldenLand)assert.ok(['d4','d5','extreme'].includes(difficulty),`${map.name} must only offer high tiers`);
    for(const mon of candidates){
      context.testMonster=mon;
      const request=vm.runInContext(`createHuntRequest(testMap,testMonster,'${difficulty}',[],{allowOvertier:false,randomFn:()=>.5})`,context);
      const [low,high]=vm.runInContext(`huntDifficulty('${difficulty}').levelRange`,context);
      assert.ok(request.enemyLevel>=low&&request.enemyLevel<=high,`${map.name} ${difficulty} must use its uniform tier range`);
    }
  }
}

const oneStar={id:'one',name:'One',rarity:'★',hp:50,huntLevels:{normal:13}};
const fiveStar={id:'five',name:'Five',rarity:'★★★★★',hp:50};
context.oneStar=oneStar;context.fiveStar=fiveStar;
assert.equal(vm.runInContext("huntLevelFor(oneStar,'d1',()=>0)",context),1,'Tier I starts at level 1');
assert.equal(vm.runInContext("huntLevelFor(oneStar,'d1',()=>.999999)",context),6,'Tier I ends at level 6');
assert.equal(vm.runInContext("huntLevelFor(oneStar,'d2',()=>0)",context),6,'Tier II ignores obsolete per-species fixed levels');
assert.equal(vm.runInContext("huntLevelFor(oneStar,'d2',()=>.999999)",context),18,'Tier II reaches level 18');
assert.equal(vm.runInContext("huntLevelFor(fiveStar,'extreme')",context),100,'Extreme enemies must be level 100');

context.by=id=>({one:oneStar,two:{id:'two',name:'Two',rarity:'★★',hp:60,huntLevels:{normal:22,hard:50}},five:fiveStar}[id]||null);
const secondNormal=vm.runInContext("chooseSecondHuntEnemy({enemyIds:['one','two','five']},'one','normal',()=>.99)",context);
assert.notEqual(secondNormal.id,'five','three-way and invasion enemies must obey the same rarity gate');

console.log('Hunt difficulty validation passed (Lv.100 cap, tier rarity gates and levels, special maps, and multi-enemy filtering).');
