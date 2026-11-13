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
// The single tuning table for field difficulty, encounters and rewards.
const HUNT_DIFFICULTIES = Object.freeze(Object.fromEntries([
  ['d1','Ⅰ',[1,6],[1,2],.7,20,0,0,0,0,0,0,5],
  ['d2','Ⅱ',[6,18],[1,2,3],1,30,.05,.05,.02,200,0,.3,8],
  ['d3','Ⅲ',[18,32],[2,3],1.4,25,.10,.10,.03,300,0,1,12],
  ['d4','Ⅳ',[32,46],[2,3,4],1.8,15,.15,.15,.04,450,.01,1,16],
  ['d5','Ⅴ',[46,60],[3,4],2.4,10,.20,.20,.05,600,.015,1,22],
  ['extreme','Extreme',[MAX_LEVEL,MAX_LEVEL],[5],3,10,.30,.30,.08,1000,.03,2,35]
].map(([id,shortLabel,levelRange,rarities,rewardMultiplier,weight,threeWayRate,invasionRate,goldenLandRate,goldenLandCoins,goldenLandMapRate,conditionCount,contractorExp])=>{
  const extreme=id==='extreme';
  return [id,Object.freeze({id,label:extreme?shortLabel:`難易度${shortLabel}`,shortLabel,
    levelRange:Object.freeze(levelRange),rarities:Object.freeze(rarities),
    ...(extreme?{fixedLevel:MAX_LEVEL}:{}),hpMultiplier:extreme?1.3:1,attackMultiplier:extreme?1.3:1,
    attackText:extreme?'1.30':'1.0',rewardMultiplier,rewardText:rewardMultiplier.toFixed(1),weight,
    threeWayRate,invasionRate,goldenLandRate,goldenLandCoins,goldenLandMapRate,conditionCount,contractorExp,
    danger:extreme?'危険度：極大。Lv.100の★5だけが現れる最高難度依頼。':`Lv.${levelRange[0]}〜${levelRange[1]}・★${rarities.join('・★')}の相手が現れる依頼。`
  })];
})));
const HUNT_LEGACY_DIFFICULTY_IDS = Object.freeze({easy:'d1',normal:'d2',hard:'d4'});
const HUNT_OVERTIER = Object.freeze({
  rankMin:1,rankMax:50,chanceMin:.10,chanceMax:.20,rewardMultiplier:1.5,
  nushi:Object.freeze({levelRange:Object.freeze([61,70]),rarities:Object.freeze([3,4]),hpMultiplier:3,attackMultiplier:1.8,rewardMultiplier:3})
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
let singleBattleContractAttempted = false;
let multiBattle = null;
let pendingMultiBattleContractId = null;

function huntDifficultyValues(property){
  return Object.freeze(Object.fromEntries(Object.values(HUNT_DIFFICULTIES).map(d=>[d.id,d[property]])));
}
const THREE_WAY_RATES = huntDifficultyValues('threeWayRate');
const INVASION_RATES = huntDifficultyValues('invasionRate');
const GOLDEN_LAND_RATES = huntDifficultyValues('goldenLandRate');
const GOLDEN_LAND_COIN_BONUSES = huntDifficultyValues('goldenLandCoins');
const GOLDEN_LAND_MAP_HUNT_RATES = huntDifficultyValues('goldenLandMapRate');

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
function huntLevelFor(mon, difficultyId, randomFn=Math.random) {
  const difficulty = huntDifficulty(difficultyId);
  return huntRandomLevel(difficulty.levelRange,randomFn);
}
function huntRandomLevel(range,randomFn=Math.random){
  const [low,high]=range;
  return clampLevel(low+Math.min(high-low,Math.max(0,Math.floor(randomFn()*(high-low+1)))));
}
function huntOvertierChance(rank){
  const value=Math.max(HUNT_OVERTIER.rankMin,Math.min(HUNT_OVERTIER.rankMax,Number(rank)||1));
  return HUNT_OVERTIER.chanceMin+(HUNT_OVERTIER.chanceMax-HUNT_OVERTIER.chanceMin)*(value-HUNT_OVERTIER.rankMin)/(HUNT_OVERTIER.rankMax-HUNT_OVERTIER.rankMin);
}
function huntOvertierCandidatePool(map,difficultyId,candidatesFor=huntCandidatesFor){
  if(difficultyId==='extreme')return [];
  const next=difficultyId==='d5'?HUNT_OVERTIER.nushi:HUNT_DIFFICULTIES[`d${Number(difficultyId.slice(1))+1}`];
  return next?candidatesFor(map,difficultyId==='d5'?'d5':next.id).filter(candidate=>next.rarities.includes(huntMonsterRarity(candidate))):[];
}
function huntCandidatesFor(map, difficultyId) {
  return (map?.enemyIds || []).map(id => by(id)).filter(mon => isHuntMonsterEligible(mon, difficultyId));
}
function availableHuntDifficulties(map) {
  const specialOnly = !!(map?.bossOnly || map?.rareOnly || map?.goldenLand);
  return Object.values(HUNT_DIFFICULTIES).filter(difficulty =>
    (!specialOnly || ['d4','d5','extreme'].includes(difficulty.id)) && huntCandidatesFor(map, difficulty.id).length
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

function huntDifficulty(id='d2') {
  return HUNT_DIFFICULTIES[HUNT_LEGACY_DIFFICULTY_IDS[id] || id] || HUNT_DIFFICULTIES.d2;
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
  const configured=difficulty.conditionCount;
  const count=configured<1?(randomFn()<configured?1:0):configured;
  const pool = [...HUNT_CONDITION_IDS];
  const selected = [];
  while (selected.length < count && pool.length) {
    const index = Math.floor(randomFn() * pool.length);
    selected.push(pool.splice(Math.min(index, pool.length - 1), 1)[0]);
  }
  return selected;
}
function createHuntRequest(map, mon, difficultyId='d2', conditionIds=[], options={}) {
  const difficulty = huntDifficulty(difficultyId);
  const randomFn=options.randomFn||Math.random;
  const candidatesFor=options.candidatesFor||huntCandidatesFor;
  let encounter=difficulty, overtier=null;
  const rank=options.contractorRank??(typeof contractorRankFromExp==='function'&&typeof save!=='undefined'?contractorRankFromExp(save.contractor?.exp):1);
  // Scripted/fixed-level battles and secondary enemies explicitly opt out.
  const overtierChance=Math.min(1,huntOvertierChance(rank)+(options.strongIncenseBoosted===true ? .20 : 0));
  if(options.allowOvertier!==false&&!Number.isFinite(options.enemyLevel)&&difficulty.id!=='extreme'&&randomFn()<overtierChance){
    const next=difficulty.id==='d5'?HUNT_OVERTIER.nushi:HUNT_DIFFICULTIES[`d${Number(difficulty.id.slice(1))+1}`];
    const pool=huntOvertierCandidatePool(map,difficulty.id,candidatesFor);
    if(pool.length){
      mon=pool[Math.min(pool.length-1,Math.max(0,Math.floor(randomFn()*pool.length)))];
      encounter=next;overtier=difficulty.id==='d5'?'nushi':'stronger';
    }
  }
  const enemyLevel=Number.isFinite(options.enemyLevel)?clampLevel(options.enemyLevel):huntRandomLevel(encounter.levelRange,randomFn);
  const hpMultiplier=options.hpMultiplier??encounter.hpMultiplier;
  const attackMultiplier=options.attackMultiplier??encounter.attackMultiplier;
  const enemyHp = Math.max(1, Math.round(maxHp(mon, enemyLevel) * hpMultiplier));
  const rewardMultiplier=Number((difficulty.rewardMultiplier*(overtier==='nushi'?HUNT_OVERTIER.nushi.rewardMultiplier:overtier?HUNT_OVERTIER.rewardMultiplier:1)).toFixed(4));
  const conditions = [...new Set(conditionIds)].map(id => createHuntCondition(map, id)).filter(Boolean);
  const rolledMode = map?.goldenLand ? 'single' : rollHuntBattleMode(difficulty.id,randomFn);
  const secondaryCandidates=rolledMode!=='single'?candidatesFor(map,difficulty.id):[];
  const different=secondaryCandidates.filter(candidate=>candidate.id!==mon?.id);
  const secondaryPool=different.length?different:secondaryCandidates;
  const secondEnemy=secondaryPool.length?secondaryPool[Math.min(secondaryPool.length-1,Math.floor(randomFn()*secondaryPool.length))]:null;
  const battleMode = secondEnemy ? rolledMode : 'single';
  return {
    difficultyId:difficulty.id,
    difficultyLabel:difficulty.label,
    danger:difficulty.danger,
    overtier,
    encounterDifficultyId:overtier==='nushi'?'nushi':encounter.id,
    encounterLabel:overtier==='nushi'?'ヌシ':overtier?'格上':null,
    enemyLevel,
    enemyHp,
    attackMultiplier,
    attackText:attackMultiplier===difficulty.attackMultiplier?difficulty.attackText:String(attackMultiplier),
    rewardMultiplier,
    rewardText:overtier?String(rewardMultiplier):difficulty.rewardText,
    conditions,
    mapId:map?.id || null,
    enemyId:mon?.id || null,
    battleMode,
    secondEnemyId:battleMode === 'three_way' ? secondEnemy?.id || null : null,
    invasionEnemyId:battleMode === 'invasion_pending' ? secondEnemy?.id || null : null,
    invasionTurn:battleMode === 'invasion_pending' ? rollInvasionTurn(randomFn) : null,
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
  return pool[pool.length - 1] || HUNT_DIFFICULTIES.d2;
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
function huntRewardAmount(baseAmount, turnBonusSucceeded=false, extraMultiplier=1, rewardMultiplier=Number(activeHuntRequest?.rewardMultiplier)||1) {
  const turnMultiplier = turnBonusSucceeded ? 1.5 : 1;
  return Math.max(1, Math.round((Number(baseAmount) || 0) * rewardMultiplier * turnMultiplier * extraMultiplier));
}
let pendingEvolutions = [], currentEvolution = null;
let bossCautionPlaying = false;
let bossCautionTimer = null;


let pendingContractItemId = 'contract_scroll';
const TITLE_LAST_MAP_KEY='mb_title_last_map_v7';
let titleStarted=false;
