import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootUrl = new URL('../', import.meta.url);

const engineSource = fs.readFileSync(new URL('js/kokoro-link.js', rootUrl), 'utf8');
const engineContext = vm.createContext({ console, Date, JSON, Math });
vm.runInContext(engineSource, engineContext, {filename:'js/kokoro-link.js'});
const engineConfig = vm.runInContext('KOKORO_LINK_CONFIG', engineContext);

export const LEVEL_CHECKPOINTS = Object.freeze([1, 5, 10]);
export const PROPOSED_RARITY_MULTIPLIERS = Object.freeze({...engineConfig.rarityMultipliers});

export const LEVEL_STRATEGIES = Object.freeze({
  rarityOnly:Object.freeze({
    id:'rarity_only',
    label:'レアリティ補正のみ',
    factor:() => 1
  }),
  inverseLevel:Object.freeze({
    id:'inverse_level',
    label:'低レベル優遇',
    factor:level => Math.max(0.65, 1.20 - (Math.max(1, level) - 1) * 0.035)
  }),
  growthFriendly:Object.freeze({
    id:'growth_friendly',
    label:'育成微増',
    factor:level => 1 + Math.min(20, Math.max(1, level) - 1) * 0.015
  })
});

export function loadMonsterData() {
  const source = fs.readFileSync(new URL('js/data.js', rootUrl), 'utf8');
  const context = vm.createContext({ console, Date, JSON, Math });
  vm.runInContext(source, context, {filename:'js/data.js'});
  return vm.runInContext('M', context).filter(unit => unit.entityKind === 'monster');
}

export function rarityCount(monster) {
  return Math.max(1, String(monster?.rarity || '★').length);
}

export function maxHpAtLevel(monster, level=1) {
  return Math.max(1, Number(monster?.hp || 1) + (Math.max(1, level) - 1) * 12);
}

export function nativeOffense(monster) {
  const powers = (monster?.moves || [])
    .map(move => Number(move?.[1]) || 0)
    .filter(power => power > 0);
  return powers.length ? powers.reduce((sum, power) => sum + power, 0) / powers.length : 0;
}

export function sourceMetrics(monster, level=1) {
  return {
    hp:maxHpAtLevel(monster, level),
    speed:Math.max(1, Number(monster?.spd ?? 50)),
    offense:nativeOffense(monster)
  };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function rounded(value) {
  return Number(value.toFixed(2));
}

export function summarizeByRarity(monsters, level=1, strategy=LEVEL_STRATEGIES.rarityOnly) {
  return [1, 2, 3, 4, 5].map(rarity => {
    const group = monsters.filter(monster => rarityCount(monster) === rarity);
    const metrics = group.map(monster => sourceMetrics(monster, level));
    const multiplier = PROPOSED_RARITY_MULTIPLIERS[rarity];
    const levelFactor = strategy.factor(level);
    const hp = mean(metrics.map(metric => metric.hp));
    const speed = mean(metrics.map(metric => metric.speed));
    const offense = mean(metrics.map(metric => metric.offense));
    return {
      rarity,
      count:group.length,
      level,
      multiplier,
      levelFactor:rounded(levelFactor),
      hp:rounded(hp),
      speed:rounded(speed),
      offense:rounded(offense),
      hpIndex:rounded(hp * multiplier * levelFactor),
      speedIndex:rounded(speed * multiplier * levelFactor),
      offenseIndex:rounded(offense * multiplier * levelFactor)
    };
  });
}

export function parityMultipliers(monsters, level=1) {
  const summary = summarizeByRarity(monsters, level);
  const star5 = summary.find(row => row.rarity === 5);
  return summary.map(row => ({
    rarity:row.rarity,
    level,
    hpParity:rounded(star5.hp / Math.max(1, row.hp)),
    speedParity:rounded(star5.speed / Math.max(1, row.speed)),
    offenseParity:rounded(star5.offense / Math.max(1, row.offense))
  }));
}

export function levelStrategyComparison(monsters, rarity=1) {
  return Object.values(LEVEL_STRATEGIES).flatMap(strategy =>
    LEVEL_CHECKPOINTS.map(level => {
      const row = summarizeByRarity(monsters, level, strategy).find(entry => entry.rarity === rarity);
      return {
        strategy:strategy.id,
        level,
        levelFactor:row.levelFactor,
        hpIndex:row.hpIndex,
        speedIndex:row.speedIndex,
        offenseIndex:row.offenseIndex
      };
    })
  );
}

export function analyzeRoster(monsters=loadMonsterData()) {
  return {
    monsterCount:monsters.length,
    checkpoints:Object.fromEntries(LEVEL_CHECKPOINTS.map(level => [level, summarizeByRarity(monsters, level)])),
    parity:Object.fromEntries(LEVEL_CHECKPOINTS.map(level => [level, parityMultipliers(monsters, level)])),
    star1LevelComparison:levelStrategyComparison(monsters, 1)
  };
}

function printReport(analysis) {
  console.log(`ココロリンク Phase 0分析: モンスター${analysis.monsterCount}体`);
  LEVEL_CHECKPOINTS.forEach(level => {
    console.log(`\nLv.${level} レアリティ別基礎値と提案倍率適用後指数`);
    console.table(analysis.checkpoints[level]);
    console.log(`Lv.${level} ★5相当へ揃えるために必要な倍率`);
    console.table(analysis.parity[level]);
  });
  console.log('\n★1のレベル補正方式比較');
  console.table(analysis.star1LevelComparison);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const analysis = analyzeRoster();
  if (process.argv.includes('--json')) console.log(JSON.stringify(analysis, null, 2));
  else printReport(analysis);
}
