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
  easy:Object.freeze({id:'easy', label:'Easy', fixedLevel:1, rarities:Object.freeze([1]), hpMultiplier:.85, attackMultiplier:.85, attackText:'0.85', rewardMultiplier:.7, rewardText:'0.7', weight:20, danger:'危険度：低。Lv.1の★1だけが現れる入門依頼。'}),
  normal:Object.freeze({id:'normal', label:'Normal', rarities:Object.freeze([1,2,3]), hpMultiplier:1, attackMultiplier:1, attackText:'1.0', rewardMultiplier:1, rewardText:'1.0', weight:45, danger:'危険度：標準。★1～★3が種族ごとの固定Lvで現れる依頼。'}),
  hard:Object.freeze({id:'hard', label:'Hard', rarities:Object.freeze([2,3,4]), hpMultiplier:1.15, attackMultiplier:1.15, attackText:'1.15', rewardMultiplier:1.8, rewardText:'1.8', weight:25, danger:'危険度：高。★2～★4が種族ごとの固定Lvで現れる依頼。'}),
  extreme:Object.freeze({id:'extreme', label:'Extreme', fixedLevel:MAX_LEVEL, rarities:Object.freeze([5]), hpMultiplier:1.30, attackMultiplier:1.30, attackText:'1.30', rewardMultiplier:3, rewardText:'3.0', weight:10, danger:'危険度：極大。Lv.100の★5だけが現れる最高難度依頼。'})
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
const INVASION_RATES = Object.freeze({easy:0, normal:.10, hard:.20, extreme:.30});
const GOLDEN_LAND_RATES = Object.freeze({easy:0, normal:.03, hard:.05, extreme:.08});
const GOLDEN_LAND_COIN_BONUSES = Object.freeze({easy:0, normal:300, hard:600, extreme:1000});
const GOLDEN_LAND_MAP_HUNT_RATES = Object.freeze({easy:0, normal:0, hard:.01, extreme:.03});

function rollGoldenLand(difficultyId, randomFn=Math.random) {
  return randomFn() < (GOLDEN_LAND_RATES[huntDifficulty(difficultyId).id] || 0);
}
function goldenLandCoinBonus(difficultyId) {
  return GOLDEN_LAND_COIN_BONUSES[huntDifficulty(difficultyId).id] || 0;
}
function rollGoldenLandMapFromHunt(difficultyId, randomFn=Math.random) {
  return randomFn() < (GOLDEN_LAND_MAP_HUNT_RATES[huntDifficulty(difficultyId).id] || 0);
}
function grantGoldenLandMapFromHuntWin(difficultyId, randomFn=Math.random) {
  if (!rollGoldenLandMapFromHunt(difficultyId, randomFn)) return false;
  if (!save.items || typeof save.items !== 'object') save.items = {};
  save.items.golden_land_map = (save.items.golden_land_map || 0) + 1;
  if (typeof registerItemDex === 'function') registerItemDex('golden_land_map');
  return true;
}
function goldenLandMapIsReady() {
  return save.goldenLandMapReady === true && Number(save.items?.golden_land_map || 0) > 0;
}
function reserveGoldenLandMap() {
  if (goldenLandMapIsReady()) return false;
  if (Number(save.items?.golden_land_map || 0) <= 0) return false;
  save.goldenLandMapReady = true;
  return true;
}
function consumeReservedGoldenLandMap() {
  if (!goldenLandMapIsReady()) return false;
  save.items.golden_land_map--;
  save.goldenLandMapReady = false;
  return true;
}

function rollThreeWayBattle(difficultyId, randomFn=Math.random) {
  return randomFn() < (THREE_WAY_RATES[huntDifficulty(difficultyId).id] || 0);
}

function rollHuntBattleMode(difficultyId, randomFn=Math.random) {
  const id = huntDifficulty(difficultyId).id;
  const roll = randomFn();
  const threeWayRate = THREE_WAY_RATES[id] || 0;
  const invasionRate = INVASION_RATES[id] || 0;
  if (roll < threeWayRate) return 'three_way';
  if (roll < threeWayRate + invasionRate) return 'invasion_pending';
  return 'single';
}

function rollInvasionTurn(randomFn=Math.random) {
  return 2 + Math.min(2, Math.floor(randomFn() * 3));
}

function huntMonsterRarity(mon) {
  return Math.max(1, Math.min(5, String(mon?.rarity || '★').length));
}
function isHuntMonsterEligible(mon, difficultyId) {
  return !!mon && huntDifficulty(difficultyId).rarities.includes(huntMonsterRarity(mon));
}
function huntLevelFor(mon, difficultyId) {
  const difficulty = huntDifficulty(difficultyId);
  if (Number.isFinite(difficulty.fixedLevel)) return clampLevel(difficulty.fixedLevel);
  const configured = Number(mon?.huntLevels?.[difficulty.id]);
  if (Number.isFinite(configured)) return clampLevel(configured);
  const rarity = huntMonsterRarity(mon);
  const fallback = difficulty.id === 'normal' ? {1:10,2:22,3:40}[rarity] : {2:50,3:70,4:85}[rarity];
  return clampLevel(fallback || 1);
}
function huntCandidatesFor(map, difficultyId) {
  return (map?.enemyIds || []).map(id => by(id)).filter(mon => isHuntMonsterEligible(mon, difficultyId));
}
function availableHuntDifficulties(map) {
  const specialOnly = !!(map?.bossOnly || map?.rareOnly || map?.goldenLand);
  return Object.values(HUNT_DIFFICULTIES).filter(difficulty =>
    (!specialOnly || difficulty.id === 'hard' || difficulty.id === 'extreme') && huntCandidatesFor(map, difficulty.id).length
  );
}
function chooseSecondHuntEnemy(map, firstEnemyId, difficultyId='normal', randomFn=Math.random) {
  const candidates = [...new Map(huntCandidatesFor(map, difficultyId).map(mon => [mon.id, mon])).values()];
  const different = candidates.filter(mon => mon.id !== firstEnemyId);
  const pool = different.length ? different : candidates;
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(randomFn() * pool.length))];
}

function resolveLivingMultiTargetId(entries, requestedId) {
  const living = (entries || []).filter(entry => entry?.alive && entry.hp > 0);
  return living.find(entry => entry.id === requestedId)?.id || living[0]?.id || null;
}

function multiEnemyCardAction(entry, pendingMoveIndex) {
  if (!entry) return 'none';
  if (pendingMoveIndex !== null && pendingMoveIndex !== undefined) {
    return entry.alive && entry.hp > 0 ? 'target' : 'none';
  }
  return 'details';
}

function huntDifficulty(id='normal') {
  return HUNT_DIFFICULTIES[id] || HUNT_DIFFICULTIES.normal;
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
  const enemyLevel = huntLevelFor(mon, difficulty.id);
  const enemyHp = Math.max(1, Math.round(maxHp(mon, enemyLevel) * difficulty.hpMultiplier));
  const conditions = [...new Set(conditionIds)].map(id => createHuntCondition(map, id)).filter(Boolean);
  const rolledMode = map?.goldenLand ? 'single' : rollHuntBattleMode(difficulty.id);
  const secondEnemy = rolledMode !== 'single' ? chooseSecondHuntEnemy(map, mon?.id, difficulty.id) : null;
  const battleMode = secondEnemy ? rolledMode : 'single';
  return {
    difficultyId:difficulty.id,
    difficultyLabel:difficulty.label,
    danger:difficulty.danger,
    enemyLevel,
    enemyHp,
    attackMultiplier:difficulty.attackMultiplier,
    attackText:difficulty.attackText,
    rewardMultiplier:difficulty.rewardMultiplier,
    rewardText:difficulty.rewardText,
    conditions,
    mapId:map?.id || null,
    enemyId:mon?.id || null,
    battleMode,
    secondEnemyId:battleMode === 'three_way' ? secondEnemy?.id || null : null,
    invasionEnemyId:battleMode === 'invasion_pending' ? secondEnemy?.id || null : null,
    invasionTurn:battleMode === 'invasion_pending' ? rollInvasionTurn() : null,
    goldenLandMapEntry:false
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
  const pool = availableHuntDifficulties(map);
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
