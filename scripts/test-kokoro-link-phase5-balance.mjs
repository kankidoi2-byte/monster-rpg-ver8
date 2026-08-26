import assert from 'node:assert/strict';
import {analyzeKokoroLinkBalance,buildPairRows,loadBalanceRuntime,TARGET_LEVELS} from './kokoro-link-phase5-balance.mjs';

const runtime=loadBalanceRuntime();
const rows=buildPairRows(runtime);
const analysis=analyzeKokoroLinkBalance(runtime);

assert.equal(analysis.monsterCount,50);
assert.equal(rows.length,50*49*TARGET_LEVELS.length,'every distinct source/target pair must be checked at every target level');
assert(rows.every(row=>Object.values(row).every(value=>typeof value!=='number'||Number.isFinite(value))),'all measured values must be finite');
assert(rows.every(row=>Math.abs(row.effectRate-runtime.config.conversion.baseEffectRate*runtime.config.rarityMultipliers[row.rarity])<1e-9),'source level and target level must not change rarity rates');

assert.deepEqual(analysis.raritySummary.map(row=>row.sourceCount),[10,18,13,4,5]);
assert.deepEqual(analysis.raritySummary.map(row=>row.basePackage),[1.05,.78,.57,.39,.3]);
assert(analysis.raritySummary.every((row,index,all)=>index===0||row.basePackage<all[index-1].basePackage),'base packages must decrease with rarity');
assert.equal(analysis.raritySummary[0].persistentBoostSourceCount,5,'five actual ★1 sources have persistent numeric power boosts');
assert(analysis.raritySummary.slice(1).every(row=>row.persistentBoostSourceCount===0),'only ★1 power abilities may alter the persistent stat package');
assert(analysis.levelStability.every(row=>row.maxDrift<=.002),'target-level rounding must not materially change proportional link strength');

assert.deepEqual(analysis.uncoveredAbilities.map(row=>row.abilityId).sort(),['attack_down','fate_boost','move_power_boost','penetration','recoil_guard'].sort());
assert.equal(analysis.deferredSources.length,0,'every actual ★3 source must have an immediately usable ability');
assert.equal(analysis.deferredThreeStarSourceShare,0);
const waterGuard=analysis.abilityCoverage.find(row=>row.abilityId==='water_mirror_guard');
assert.equal(waterGuard.sourceCount,3);
assert.equal(waterGuard.deferred,false);

console.log('Kokoro Link Phase 5-1 balance validation passed (7,350 actual pairs, rarity packages, roster coverage, and no deferred actual ★3 source).');
