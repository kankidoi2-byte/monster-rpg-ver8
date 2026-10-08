import fs from 'node:fs';
// Historical regression comparisons accept only the separately tested normal
// healing change; every other engine/data byte remains subject to their checks.
const source=fs.readFileSync(new URL('../js/battle-rules.js',import.meta.url),'utf8');
const helper=source.match(/\/\/ Ordinary healing[\s\S]*?(?=async function doAttack)/)[0];
export function applyNormalHealingSpec(file,text){
 if(file==='battle-rules')return text.replace('async function doAttack',helper+'async function doAttack').replace(
  '    const baseHealing = 24 + (isPlayer ? (activeInstance?.level || 1) : 1)*3;\n    const healing = adjustedBattleHealing(baseHealing);',
  '    const healing = normalBattleHealing(isPlayer ? activeInstance?.level : activeHuntRequest?.enemyLevel);');
 if(file==='multi-battle')return text.replace('adjustedBattleHealing(24+(actorIsPlayer?(activeInstance?.level||1):1)*3)',
  'normalBattleHealing(actorIsPlayer ? activeInstance?.level : actor.level)');
 return text;
}
