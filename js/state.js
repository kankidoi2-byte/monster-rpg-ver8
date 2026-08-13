let editingSkillUid = null;
let player, enemy, pHp, eHp;
let busy = false, pAtk = 1, eAtk = 1, pGuard = false, eGuard = false;
let pStatus = null, eStatus = null;
let pPoisonTurns = 0, ePoisonTurns = 0;
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
const HUNT_MAP_BOOST_TYPES = Object.freeze({
  grassland:'grass', volcano:'fire', lake:'water', seikai_irie:'water',
  kaiyu_kaiiki:'water', deep_sea_end:'water', snow_mountain:'water', forest:'grass',
  light_plain:'light', starry_plain:'star', highland_ruins:'thunder', arena:'normal',
  magic_academy:'normal', ruined_village:'dark', starsea:'star', water_secret:'water',
  world_between:'light', kaen_village:'fire'
});
const HUNT_CONDITION_IDS = Object.freeze(['map_boost','healing_half','swift_clear']);
let activeHuntRequest = null;
let huntRequestChoices = Object.create(null);
let huntRequestSerial = 0;
let battleTurnCount = 0;
let battleTurnInProgress = false;
let battleRewardGranted = false;
let multiBattle = null;
let pendingMultiBattleContractId = null;

const THREE_WAY_RATES = Object.freeze({easy:0, normal:.10, hard:.20, extreme:.30});

function rollThreeWayBattle(difficultyId, randomFn=Math.random) {
  return randomFn() < (THREE_WAY_RATES[huntDifficulty(difficultyId).id] || 0);
}

function chooseSecondHuntEnemy(map, firstEnemyId, randomFn=Math.random) {
  const candidates = [...new Set(map?.enemyIds || [])]
    .map(id => by(id))
    .filter(Boolean);
  const different = candidates.filter(mon => mon.id !== firstEnemyId);
  const pool = different.length ? different : candidates;
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(randomFn() * pool.length))];
}

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
function createHuntCondition(map, conditionId) {
  if (conditionId === 'map_boost') {
    const type = HUNT_MAP_BOOST_TYPES[map?.id] || 'normal';
    return {
      id:conditionId,
      name:'マップ属性強化',
      type,
      effectText:`${TYPE_ICONS[type]||'⚪'}${TN[type]||type}属性の攻撃技威力1.2倍（敵味方）`
    };
  }
  if (conditionId === 'healing_half') {
    return {id:conditionId, name:'回復量半減', effectText:'回復量半減（敵味方）'};
  }
  if (conditionId === 'swift_clear') {
    return {id:conditionId, name:'迅速討伐', effectText:'8ターン以内撃破：経験値・コイン50％追加'};
  }
  return null;
}
function rollHuntConditionIds(difficultyId, randomFn=Math.random) {
  const difficulty = huntDifficulty(difficultyId);
  let count = 0;
  if (difficulty.id === 'normal') count = randomFn() < .30 ? 1 : 0;
  if (difficulty.id === 'hard') count = 1;
  if (difficulty.id === 'extreme') count = 2;
  const pool = [...HUNT_CONDITION_IDS];
  const selected = [];
  while (selected.length < count && pool.length) {
    const index = Math.floor(randomFn() * pool.length);
    selected.push(pool.splice(Math.min(index, pool.length - 1), 1)[0]);
  }
  return selected;
}
function createHuntRequest(map, mon, difficultyId='normal', conditionIds=[]) {
  const difficulty = huntDifficulty(difficultyId);
  const partyAverageLevel = battlePartyAverageLevel();
  const enemyLevel = Math.max(1, Math.round(partyAverageLevel) + difficulty.levelOffset);
  const enemyHp = Math.max(1, Math.round(maxHp(mon, enemyLevel) * difficulty.hpMultiplier));
  const conditions = [...new Set(conditionIds)].map(id => createHuntCondition(map, id)).filter(Boolean);
  const threeWay = rollThreeWayBattle(difficulty.id);
  const secondEnemy = threeWay ? chooseSecondHuntEnemy(map, mon?.id) : null;
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
    conditions,
    mapId:map?.id || null,
    enemyId:mon?.id || null,
    battleMode:secondEnemy ? 'three_way' : 'single',
    secondEnemyId:secondEnemy?.id || null
  };
}
function resetHuntRequestChoices() {
  huntRequestChoices = Object.create(null);
}
function registerHuntRequest(request) {
  const requestId = `hunt_${Date.now().toString(36)}_${(++huntRequestSerial).toString(36)}`;
  request.requestId = requestId;
  huntRequestChoices[requestId] = request;
  return request;
}
function preparedHuntRequest(requestId, mapId, enemyId, difficultyId) {
  const request = requestId ? huntRequestChoices[requestId] : null;
  if (!request) return null;
  if (request.mapId !== mapId || request.enemyId !== enemyId || request.difficultyId !== difficultyId) return null;
  return request;
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
function hasHuntCondition(conditionId) {
  return !!activeHuntRequest?.conditions?.some(condition => condition.id === conditionId);
}
function huntMapAttackMultiplier(moveTypeOrTypes) {
  if (!hasHuntCondition('map_boost')) return 1;
  const boostType = activeHuntRequest.conditions.find(condition => condition.id === 'map_boost')?.type;
  return normalizeMoveTypes(moveTypeOrTypes).includes(boostType) ? 1.2 : 1;
}
function adjustedBattleHealing(baseAmount) {
  const amount = Math.max(0, Math.floor(Number(baseAmount) || 0));
  if (!amount || !hasHuntCondition('healing_half')) return amount;
  return Math.max(1, Math.floor(amount * .5));
}
function resetBattleTurnCounter() {
  battleTurnCount = 0;
  battleTurnInProgress = false;
  if (typeof updateHuntTurnDisplay === 'function') updateHuntTurnDisplay();
}
function startBattleTurn() {
  battleTurnInProgress = true;
}
function completeBattleTurn() {
  if (!battleTurnInProgress) return battleTurnCount;
  battleTurnCount++;
  battleTurnInProgress = false;
  if (typeof updateHuntTurnDisplay === 'function') updateHuntTurnDisplay();
  return battleTurnCount;
}
function huntTurnRemaining() {
  return Math.max(0, 8 - battleTurnCount);
}
function huntTurnBonusSucceeded() {
  return hasHuntCondition('swift_clear') && battleTurnCount <= 8;
}
function huntRewardAmount(baseAmount, turnBonusSucceeded=false) {
  const rewardMultiplier = Number(activeHuntRequest?.rewardMultiplier) || 1;
  const turnMultiplier = turnBonusSucceeded ? 1.5 : 1;
  return Math.max(1, Math.round((Number(baseAmount) || 0) * rewardMultiplier * turnMultiplier));
}
let pendingEvolutions = [], currentEvolution = null;
let bossCautionPlaying = false;
let bossCautionTimer = null;


let pendingContractItemId = 'contract_scroll';
const TITLE_LAST_MAP_KEY='mb_title_last_map_v7';
let titleStarted=false;
