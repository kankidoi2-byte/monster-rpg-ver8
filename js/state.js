let editingSkillUid = null;
let player, enemy, pHp, eHp;
let busy = false, pAtk = 1, eAtk = 1, pGuard = false, eGuard = false;
let pStatus = null, eStatus = null;
let pParalysisTurns = 0, eParalysisTurns = 0;
let pConfusionTurns = 0, eConfusionTurns = 0;
let pSleepTurns = 0, eSleepTurns = 0;
let pFlareCharge = false, eFlareCharge = false;
let pAquaShield = false, eAquaShield = false;
let activeInstance = null;
let partyBattle = [], activePartyIdx = 0, selectedMap = null;
const HUNT_DIFFICULTIES = Object.freeze({
  easy:Object.freeze({id:'easy', label:'Easy', levelOffset:-1, hpMultiplier:.85, attackMultiplier:.85, attackText:'0.85', rewardMultiplier:.7, rewardText:'0.7', weight:20, danger:'危険度：低。戦力を整えながら挑める依頼。'}),
  normal:Object.freeze({id:'normal', label:'Normal', levelOffset:0, hpMultiplier:1, attackMultiplier:1, attackText:'1.0', rewardMultiplier:1, rewardText:'1.0', weight:45, danger:'危険度：標準。現在のパーティーに見合う依頼。'}),
  hard:Object.freeze({id:'hard', label:'Hard', levelOffset:1, hpMultiplier:1.15, attackMultiplier:1.15, attackText:'1.15', rewardMultiplier:1.8, rewardText:'1.8', weight:25, danger:'危険度：高。強敵だが報酬も多い依頼。'}),
  extreme:Object.freeze({id:'extreme', label:'Extreme', levelOffset:2, hpMultiplier:1.30, attackMultiplier:1.30, attackText:'1.30', rewardMultiplier:3, rewardText:'3.0', weight:10, danger:'危険度：極大。最大級の危険と報酬を伴う依頼。'})
});
let activeHuntRequest = null;

function huntDifficulty(id='normal') {
  return HUNT_DIFFICULTIES[id] || HUNT_DIFFICULTIES.normal;
}
function battlePartyAverageLevel() {
  const members = partyBattle.length
    ? partyBattle.map(entry => entry.inst).filter(Boolean)
    : getPartyInstances();
  if (!members.length) return 1;
  return members.reduce((sum, ins) => sum + Math.max(1, Number(ins.level) || 1), 0) / members.length;
}
function createHuntRequest(map, mon, difficultyId='normal') {
  const difficulty = huntDifficulty(difficultyId);
  const partyAverageLevel = battlePartyAverageLevel();
  const enemyLevel = Math.max(1, Math.round(partyAverageLevel) + difficulty.levelOffset);
  const enemyHp = Math.max(1, Math.round(maxHp(mon, enemyLevel) * difficulty.hpMultiplier));
  return {
    difficultyId:difficulty.id,
    difficultyLabel:difficulty.label,
    danger:difficulty.danger,
    partyAverageLevel,
    enemyLevel,
    enemyHp,
    attackMultiplier:difficulty.attackMultiplier,
    attackText:difficulty.attackText,
    rewardMultiplier:difficulty.rewardMultiplier,
    rewardText:difficulty.rewardText,
    mapId:map?.id || null,
    enemyId:mon?.id || null
  };
}
function rollHuntDifficulty(map) {
  const specialOnly = !!(map?.bossOnly || map?.rareOnly);
  const pool = Object.values(HUNT_DIFFICULTIES).filter(difficulty =>
    !specialOnly || difficulty.id === 'hard' || difficulty.id === 'extreme'
  );
  const total = pool.reduce((sum, difficulty) => sum + difficulty.weight, 0);
  let roll = Math.random() * total;
  for (const difficulty of pool) {
    roll -= difficulty.weight;
    if (roll < 0) return difficulty;
  }
  return pool[pool.length - 1] || HUNT_DIFFICULTIES.normal;
}
function enemyDifficultyAttackMultiplier() {
  return Number(activeHuntRequest?.attackMultiplier) || 1;
}
let pendingEvolutions = [], currentEvolution = null;
let bossCautionPlaying = false;
let bossCautionTimer = null;


let pendingContractItemId = 'contract_scroll';
const TITLE_LAST_MAP_KEY='mb_title_last_map_v7';
let titleStarted=false;
