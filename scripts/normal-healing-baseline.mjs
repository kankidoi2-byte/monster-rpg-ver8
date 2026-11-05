// Historical fixtures use the current ordinary recovery rule to isolate other behavior.
export function applyNormalHealingSpec(file,text){
 if(file==='battle-rules')return text.replace(
  '    const baseHealing = 24 + (isPlayer ? (activeInstance?.level || 1) : 1)*3;\n    const healing = adjustedBattleHealing(baseHealing);',
  '    const healing = adjustedBattleHealing(Math.floor((isPlayer ? playerMaxHp() : enemyMaxHp()) * .22));');
 if(file==='multi-battle')return text.replace('adjustedBattleHealing(24+(actorIsPlayer?(activeInstance?.level||1):1)*3)',
  'adjustedBattleHealing(Math.floor((actorIsPlayer ? playerMaxHp() : actor.maxHp) * .22))');
 return text;
}
