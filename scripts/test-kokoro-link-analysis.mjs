import assert from 'node:assert/strict';
import {
  LEVEL_STRATEGIES,
  PROPOSED_RARITY_MULTIPLIERS,
  analyzeRoster,
  loadMonsterData,
  rarityCount,
  summarizeByRarity
} from './kokoro-link-analysis.mjs';

const monsters = loadMonsterData();
const analysis = analyzeRoster(monsters);

assert.equal(monsters.length, 50, 'Phase 0 analysis must cover all prologue monsters');
assert.deepEqual(
  [...new Set(monsters.map(rarityCount))].sort((a,b) => a-b),
  [1,2,3,4,5],
  'all five monster rarities must be represented'
);
assert.deepEqual(
  Object.keys(PROPOSED_RARITY_MULTIPLIERS).map(Number),
  [1,2,3,4,5],
  'every rarity needs a proposed multiplier'
);
assert(
  Object.values(PROPOSED_RARITY_MULTIPLIERS).every((value,index,values) => index === 0 || value < values[index-1]),
  'proposed multipliers must strictly decrease as rarity rises'
);
assert.equal(PROPOSED_RARITY_MULTIPLIERS[5], 1, 'five-star link multiplier must remain the low 1.0 baseline');

const level1 = summarizeByRarity(monsters, 1);
const star1 = level1.find(row => row.rarity === 1);
const star5 = level1.find(row => row.rarity === 5);
assert(star1.hp < star5.hp && star1.offense < star5.offense, 'raw five-star averages must exceed one-star averages');
assert(star1.hpIndex >= star5.hpIndex * 0.9, 'the proposed one-star multiplier must substantially close the HP gap');
assert(star1.offenseIndex > star5.offenseIndex, 'the proposed one-star multiplier must give low rarity a link-side offense advantage');

const inverseLv1 = summarizeByRarity(monsters, 1, LEVEL_STRATEGIES.inverseLevel).find(row => row.rarity === 1);
const inverseLv10 = summarizeByRarity(monsters, 10, LEVEL_STRATEGIES.inverseLevel).find(row => row.rarity === 1);
assert(inverseLv10.speedIndex < inverseLv1.speedIndex, 'inverse level correction must expose the do-not-level speed incentive');
assert(inverseLv10.offenseIndex < inverseLv1.offenseIndex, 'inverse level correction must expose the do-not-level offense incentive');

assert.equal(analysis.checkpoints[1].length, 5);
assert.equal(analysis.parity[10].length, 5);
console.log('Kokoro Link Phase 0 analysis validation passed (50 monsters, five rarities, proposed multipliers, parity metrics, and inverse-level risk).');
