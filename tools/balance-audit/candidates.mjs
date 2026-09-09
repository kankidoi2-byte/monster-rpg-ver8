// These source patches exist ONLY in isolated audit VMs. They never write game code.
function replace(source,from,to){if(!source.includes(from))throw Error('Candidate source anchor changed: '+from);return source.replace(from,to);}
export const multiFix=source=>{
 source=replace(source,"const level = activeHuntRequest?.enemyLevel || 1;","const level = huntLevelFor(mon, activeHuntRequest?.difficultyId || 'normal');");
 source=replace(source,"entry.hp = Math.max(0, eHp);","entry.level = activeHuntRequest?.enemyLevel || entry.level;\n  entry.maxHp = enemyMaxHp();\n  entry.hp = Math.max(0, eHp);");
 return replace(source,"entry.poisonTurns = ePoisonTurns;","entry.poisonTurns = ePoisonTurns;\n  entry.poisonSourceIsPlayer = eStatus === 'poison' && ePoisonTurns > 0;");
};
export const poisonHalf=source=>replace(source,'maxHpDamageRate:.10','maxHpDamageRate:.05');
export const distanceParity=source=>replace(replace(source,"wins:3,rewardMultiplier:2","wins:3,rewardMultiplier:3"),"wins:5,rewardMultiplier:3","wins:5,rewardMultiplier:5");
export const expSlopeHalf=source=>replace(source,'return clampLevel(lv) * 60','return clampLevel(lv) * 30');
