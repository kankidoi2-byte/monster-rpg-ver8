/* ===== セーブ管理 ===== */
const SAVE_KEY = 'mb_v95c';
const SAVE_BACKUP_KEY = `${SAVE_KEY}_lastKnownGood`;
const SAVE_CORRUPT_KEY = `${SAVE_KEY}_corrupt`;
const SAVE_SCHEMA_VERSION = 4;
const CONTRACTOR_SAVE_EXP_CAP = 63700;
let lastSaveError = null;
let saveRecoveryReport = [];
let protectedPrimaryRaw = null;
let primaryReadFailed = false;
let soulContractReplacementBlocked = false;
let soulContractReplacementExported = null;
const SOUL_REPLACEMENT_NOTICE='セーブの置き換え処理が途中で止まっています。セーブ管理で記録を書き出してから再開してください。';
const SOUL_REPLACEMENT_UNSUPPORTED='このブラウザではセーブの置き換えを安全に実行できません。最新のブラウザで開き直してください。';
const SOUL_RECOVERY_STORAGE_KEY=`${SAVE_KEY}_soulContractRecovery_v1`;
const SOUL_ARCHIVE_STORAGE_KEY=`${SOUL_RECOVERY_STORAGE_KEY}_archived`;
let rejectedPrimaryRaw = null;

const G_BLESS_RULES=Object.freeze({week:100,coins:2,exp:1.5,cost:1});
// Shift JST by four hours so every week starts at Monday 04:00 JST.
function gBlessWeekKey(now=Date.now()){
  const d=new Date(now+5*3600000);
  d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
  return d.toISOString().slice(0,10);
}
function normalizeGBless(value,now=Date.now()){
  const s=isSaveObject(value)?value:{},key=gBlessWeekKey(now);
  const week=Number.isSafeInteger(s.week)&&s.week>=0&&s.week<=G_BLESS_RULES.week?s.week:G_BLESS_RULES.week;
  const reserve=Number.isSafeInteger(s.reserve)&&s.reserve>=0?s.reserve:0;
  const result={v:1,on:s.on===true,weekKey:key,week:s.weekKey===key?week:G_BLESS_RULES.week,reserve};
  if(!result.week&&!result.reserve)result.on=false;
  return result;
}
function ensureGBless(){return save.gBless=normalizeGBless(save.gBless);}
function gBlessTotal(s=ensureGBless()){return Math.min(Number.MAX_SAFE_INTEGER,s.week+s.reserve);}
// Format the combined count exactly even when week + reserve exceeds the safe-number range.
function gBlessTotalText(s=ensureGBless()){return (BigInt(s.week)+BigInt(s.reserve)).toLocaleString('ja-JP');}
function gBlessUnlocked(){
  const t=save?.progress?.tutorial;
  return Boolean(t&&!t.replaying&&(t.completed||t.skipped||t.status==='completed'||t.status==='skipped'));
}
function beginGBlessVictory(){
  const s=ensureGBless();
  const eligible=activeHuntRequest&&activeHuntRequest.source!=='map_story'&&gBlessUnlocked()
    &&!(typeof tutorialBattleSession!=='undefined'&&tutorialBattleSession.active);
  const used=Boolean(eligible&&s.on&&gBlessTotal(s)>0);
  if(used){if(s.week>0)s.week-=G_BLESS_RULES.cost;else s.reserve-=G_BLESS_RULES.cost;if(!gBlessTotal(s))s.on=false;}
  return used?{baseExp:0,baseCoins:0,remaining:gBlessTotalText(s)}:null;
}
function gBlessHuntReward(base,turnBonus,kind,bless,rewardMultiplier){
  if(!bless)return huntRewardAmount(base,turnBonus,1,rewardMultiplier);
  bless[kind==='coins'?'baseCoins':'baseExp']+=huntRewardAmount(base,turnBonus,1,rewardMultiplier);
  return huntRewardAmount(base,turnBonus,G_BLESS_RULES[kind],rewardMultiplier);
}

const TUTORIAL_VERSION = 2;
const TUTORIAL_GUIDE_IDS = Object.freeze([
  'threeWay','invasion','kokoroLink','alchemy','expedition','evolutionFusion',
  'skillCards','goldenLand','dex','shopItems','contractorRank',
  'evolution','skillGacha','battleItems','contractorTitles'
]);
const TUTORIAL_ONCE_FLAG_IDS = Object.freeze([
  'starterContractsGranted','elnaContractGranted','stellaSkillCardGranted',
  'alchemySuppliesGranted','alchemyLessonPrepared','alchemyLessonCompleted',
  'expeditionDispatched','prologueCompleted'
]);
function tutorialGuideDefaults(){
  return Object.fromEntries(TUTORIAL_GUIDE_IDS.map(id=>[id,false]));
}
function tutorialSaveDefaults({legacy=false}={}){
  return {
    id:'prologue',version:TUTORIAL_VERSION,status:legacy?'completed':'not_started',stepId:null,chapterGate:false,
    completed:legacy,skipped:false,replaying:false,playerName:null,playerNamed:false,
    starterContractsGranted:legacy,elnaGuestActive:false,elnaContractGranted:legacy,
    stellaSkillCardGranted:legacy,alchemySuppliesGranted:legacy,alchemyLessonPrepared:legacy,
    alchemyLessonCompleted:legacy,expeditionDispatched:legacy,
    prologueCompleted:legacy,firstContractGuaranteeUsed:legacy,starterContractScrollGranted:legacy,
    guides:tutorialGuideDefaults()
  };
}
function normalizeTutorialSave(value,{legacy=false}={}){
  const defaults=tutorialSaveDefaults({legacy});
  const source=isSaveObject(value)?value:{};
  const sourceVersion=Math.max(1,nonNegativeInteger(source.version,1));
  const protectPublishedFlow=legacy||sourceVersion<TUTORIAL_VERSION;
  const validStatuses=new Set(['not_started','in_progress','completed','skipped']);
  const guides=isSaveObject(source.guides)?source.guides:{};
  const playerName=typeof source.playerName==='string'&&source.playerName.trim()?source.playerName.trim().slice(0,20):null;
  const normalized={
    ...defaults,id:typeof source.id==='string'&&source.id?source.id:defaults.id,
    version:Math.max(TUTORIAL_VERSION,sourceVersion),
    status:validStatuses.has(source.status)?source.status:defaults.status,
    stepId:typeof source.stepId==='string'&&source.stepId?source.stepId:null,chapterGate:source.chapterGate===true,
    completed:source.completed===true,skipped:source.skipped===true,replaying:false,
    playerName,playerNamed:source.playerNamed===true&&Boolean(playerName),
    starterContractsGranted:source.starterContractsGranted===true||protectPublishedFlow,
    elnaGuestActive:source.elnaGuestActive===true&&!protectPublishedFlow,
    elnaContractGranted:source.elnaContractGranted===true||protectPublishedFlow,
    stellaSkillCardGranted:source.stellaSkillCardGranted===true||protectPublishedFlow,
    alchemySuppliesGranted:source.alchemySuppliesGranted===true||protectPublishedFlow,
    alchemyLessonPrepared:source.alchemyLessonPrepared===true||protectPublishedFlow,
    alchemyLessonCompleted:source.alchemyLessonCompleted===true||protectPublishedFlow,
    expeditionDispatched:source.expeditionDispatched===true||protectPublishedFlow,
    prologueCompleted:source.prologueCompleted===true||protectPublishedFlow,
    firstContractGuaranteeUsed:source.firstContractGuaranteeUsed===true||protectPublishedFlow,
    starterContractScrollGranted:source.starterContractScrollGranted===true||protectPublishedFlow,
    guides:Object.fromEntries(TUTORIAL_GUIDE_IDS.map(id=>[id,guides[id]===true]))
  };
  if(protectPublishedFlow){
    const keepSkipped=source.status==='skipped'||source.skipped===true;
    normalized.status=keepSkipped?'skipped':'completed';normalized.stepId=null;
    normalized.completed=!keepSkipped;normalized.skipped=keepSkipped;normalized.replaying=false;normalized.chapterGate=false;
    normalized.elnaGuestActive=false;normalized.prologueCompleted=true;
  }else if(source.replaying===true){
    const keepSkipped=source.status==='skipped'||source.skipped===true;
    normalized.status=keepSkipped?'skipped':'completed';normalized.stepId=null;
    normalized.completed=!keepSkipped;normalized.skipped=keepSkipped;normalized.replaying=false;normalized.chapterGate=false;
    normalized.elnaGuestActive=false;
    if(!keepSkipped)normalized.prologueCompleted=true;
  }else{
    if(normalized.status==='completed'){normalized.completed=true;normalized.skipped=false;normalized.prologueCompleted=true;normalized.chapterGate=false;}
    if(normalized.status==='skipped'){normalized.completed=false;normalized.skipped=true;normalized.chapterGate=false;}
    if(normalized.status==='not_started'||normalized.status==='in_progress'){normalized.completed=false;normalized.skipped=false;}
    if((normalized.completed||normalized.skipped)&&!normalized.replaying)normalized.stepId=null;
  }
  return normalized;
}

// Keep migration independent of battle state: save repair also runs in recovery tools.
const WORLD_MAP_NAVIGATION_DIFFICULTY_IDS = Object.freeze(['d1','d2','d3','d4','d5','extreme']);
function normalizeSavedHuntDifficultyId(value){
  const aliases={easy:'d1',normal:'d2',hard:'d4'};
  const id=typeof value==='string'&&Object.hasOwn(aliases,value)?aliases[value]:value;
  return WORLD_MAP_NAVIGATION_DIFFICULTY_IDS.includes(id)?id:null;
}
function normalizeWorldMapNavigationState(value){
  const source=isSaveObject(value)?value:{};
  const knownMapIds=new Set((typeof MAPS!=='undefined'&&Array.isArray(MAPS)?MAPS:[]).map(map=>map.id));
  const mapId=typeof source.mapId==='string'&&knownMapIds.has(source.mapId)?source.mapId:null;
  const eventKey=mapId&&typeof source.eventKey==='string'&&/^[a-z0-9_:-]{1,80}$/.test(source.eventKey)?source.eventKey:null;
  const difficultyId=mapId?normalizeSavedHuntDifficultyId(source.difficultyId):null;
  return {...source,mapId,eventKey,difficultyId,
    overviewScrollLeft:Math.min(100000,nonNegativeInteger(source.overviewScrollLeft))};
}
function normalizeWorldMapDiscoveryState(value){
  const source=isSaveObject(value)?value:{};
  const ids=new Set((typeof MAPS!=='undefined'?MAPS:[]).map(map=>map.id));
  const clean=list=>Array.isArray(list)?[...new Set(list.filter(id=>ids.has(id)))]:[];
  return {...source,initialized:source.initialized===true,known:clean(source.known),pending:clean(source.pending)};
}
function normalizeWorldMapSaveState(value){
  const base=typeof normalizeWorldMapState==='function'
    ?normalizeWorldMapState(value):(isSaveObject(value)?{...value}:{});
  return {...base,navigation:normalizeWorldMapNavigationState(base.navigation),discovery:normalizeWorldMapDiscoveryState(base.discovery)};
}

function contractorSaveDefaults(){
  return {
    systemVersion:1,
    exp:0,
    claimedRankRewards:[],
    expEventIds:[],
    unlockedTitleIds:[],
    equippedTitleId:null,
    recentExp:[],
    pendingRankUps:[],
    legacyMigrationVersion:0,
    legacyMigrationSummary:null
  };
}

function normalizeMapStories(value){
  const maps=isSaveObject(value)?{...value}:{};
  maps.grassland_whose=normalizeMapStory(maps.grassland_whose,'gl',11);
  maps.volcano_breath=normalizeMapStory(maps.volcano_breath,'vc',9);
  return maps;
}
function normalizeMapStory(value,prefix,total){
  const source=isSaveObject(value)?value:{};
  const episodes=isSaveObject(source.episodes)?{...source.episodes}:{};
  const ids=Array.from({length:total},(_,i)=>`${prefix}_${String(i+1).padStart(2,'0')}`);
  for(const id of ids){
    if(!isSaveObject(episodes[id]))continue;
    const p=episodes[id];episodes[id]={...p,completed:p.completed===true,firstVictory:p.firstVictory===true,firstRewardClaimed:p.firstRewardClaimed===true,victoryCount:nonNegativeInteger(p.victoryCount)};
  }
  const r=source.resume;
  const resume=isSaveObject(r)&&ids.includes(r.episodeId)&&['pre','battle','post'].includes(r.phase)?{...r,
    nodeId:typeof r.nodeId==='string'?r.nodeId:null,attemptId:typeof r.attemptId==='string'?r.attemptId:null,
    rewardCommitted:r.rewardCommitted===true,postPending:r.postPending===true,
    participantUids:Array.isArray(r.participantUids)?[...new Set(r.participantUids.filter(x=>typeof x==='string'))]:[]}:null;
  return {...source,version:1,episodes,resume};
}
function normalizeAutoBattle(raw){
  const normalizeKey=key=>{
    if(typeof key!=='string'||!/^[a-z0-9_]+:[a-z0-9_]+$/.test(key))return null;
    const [mapId,rawDifficulty]=key.split(':');
    const difficulty=normalizeSavedHuntDifficultyId(rawDifficulty);
    return difficulty?`${mapId}:${difficulty}`:null;
  };
  const unique=(list,test)=>Array.isArray(list)?[...new Set(list.filter(test))]:[];
  const defeated={};
  for(const [key,list] of Object.entries(isSaveObject(raw?.defeated)?raw.defeated:{})){
    const normalizedKey=normalizeKey(key);
    if(normalizedKey)defeated[normalizedKey]=[...new Set([
      ...(defeated[normalizedKey]||[]),
      ...unique(list,id=>typeof id==='string'&&/^[a-z0-9_]+$/.test(id))
    ])];
  }
  const run=normalizeAutoBattleRun(raw?.run);
  return {v:1,defeated,unlocked:[...new Set((Array.isArray(raw?.unlocked)?raw.unlocked:[]).map(normalizeKey).filter(Boolean))],
    settings:normalizeAutoBattleSettings(raw?.settings),...(run?{run}:{})};
}
function normalizeAutoBattleSettings(s){
  return {
    times:[1,5,10,20].includes(s?.times)?s.times:5,contract:s?.contract==='pause'?'pause':'skip',
    stopOnBlessEmpty:s?.stopOnBlessEmpty!==false,stopOnNewDex:s?.stopOnNewDex===true,speed:s?.speed===1?1:2
  };
}
function normalizeAutoBattleRun(r){
  if(!isSaveObject(r)||r.v!==1||!['fight','next','offer','decision','summary'].includes(r.phase))return null;
  const map=MAPS.find(m=>m.id===r.map),d=normalizeSavedHuntDifficultyId(r.d);
  if(!map||!d||map.goldenLand||map.bossOnly||map.rareOnly||![1,5,10,20].includes(r.times))return null;
  if(!Number.isSafeInteger(r.at)||r.at<0||!Number.isInteger(r.seed)||r.seed<0||r.seed>0xffffffff)return null;
  const list=(value,limit)=>Array.isArray(value)?value.slice(0,limit):[];
  const entries=(value,limit)=>isSaveObject(value)?Object.entries(value).slice(0,limit):[];
  const count=value=>Number.isSafeInteger(value)&&value>=0?value:0;
  const battles=list(r.battles,r.times).filter(v=>['win','defeat','retreat'].includes(v));
  if((r.phase==='fight'||r.phase==='next')&&(battles.length>=r.times||battles.some(v=>v!=='win')))return null;
  const contracts=list(r.contracts,r.times*2).filter(c=>isSaveObject(c)&&typeof c.monId==='string'&&by(c.monId)
    &&(c.entry===null||['enemy_a','enemy_b'].includes(c.entry))&&['見送り','成功','失敗'].includes(c.result))
    .map(({monId,entry,result})=>({monId,entry,result}));
  const offerCount=Math.min(2,count(r.offerCount),contracts.length);
  if(r.phase==='offer'&&!offerCount)return null;
  return {v:1,map:map.id,d,times:r.times,settings:normalizeAutoBattleSettings(r.settings),phase:r.phase,at:r.at,seed:r.seed,
    battles,coins:count(r.coins),bless:Math.min(count(r.bless),r.times),contracts,offerCount,
    exp:Object.fromEntries(entries(r.exp,20).filter(([uid,row])=>uid&&isSaveObject(row)&&by(row.monId))
      .map(([uid,row])=>[uid,{monId:row.monId,total:count(row.total)}])),
    items:Object.fromEntries(entries(r.items,100).filter(([id])=>/^[a-z0-9_]+$/.test(id)&&!['constructor','prototype','__proto__'].includes(id))
      .map(([id,n])=>[id,count(n)])),
    levels:list(r.levels,60).filter(v=>typeof v==='string').map(v=>v.slice(0,120)),
    stop:r.stop===true,reason:typeof r.reason==='string'?r.reason.slice(0,160):''
  };
}
function initSave() {
  return {
    autoBattle:normalizeAutoBattle(null),
    gBless:normalizeGBless(null),
    schemaVersion:SAVE_SCHEMA_VERSION,
    saveMeta:{migrations:['character_first_lock_v1',...(skill110MigrationAvailable() ? ['skill_system_110_v1','equipped_skill_cards_v1','evolution_native_cards_v1'] : [])], lastSavedAt:null, integrityHash:null},
    caught:[], instances:[], levels:{}, exp:{}, homeFavoriteId:null,
    items:{potion:3, water_mirror:0, attack_potion:0, upper_potion:0, contract_scroll:0, silver_contract_scroll:0, gold_contract_scroll:0, rainbow_contract_scroll:0, kilo_data:0, mega_data:0, giga_data:0, doom_fragment:0, fire_orb:0, monster_bone:0, fine_monster_bone:0, magic_crystal:0, fine_magic_crystal:0, metal_ore:0, fine_metal_ore:0, unstable_alchemy_matter:0, fine_unstable_alchemy_matter:0, raptor_feather:0, fine_raptor_feather:0, venom_carapace:0, fine_venom_carapace:0, golden_land_map:0, g_ichor:0},
    lifeQuestClaimedIds:[], giftReceiptVersion:1, giftClaimedIds:[], giftHistory:[], coins:0, alchemyResonance:0, party:[], history:{wins:0, logs:[]}, skillCards:{}, equippedSkills:{}, itemDex:[], mapDex:[],
    expeditions:{completedCount:0, active:[]}, goldenLandMapReady:false,
    contractor:contractorSaveDefaults(),
    worldMap:normalizeWorldMapSaveState(null),
    mapStories:normalizeMapStories(null),
    progress:{chapterId:'prologue', storyFlags:{}, tutorial:tutorialSaveDefaults(), missions:{version:1, states:{}}},
    quarantine:{unknownInstances:[], unknownCaughtIds:[], invalidExpeditions:[]}
  };
}
function normalizeAlchemyResonance(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.floor(value):0;}
function isSaveObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function safeStorageGet(key){try{return localStorage.getItem(typeof MonsterProfiles!=='undefined'?MonsterProfiles.key(key):key);}catch(error){lastSaveError=error;return null;}}
function safeStorageSet(key,value){if((primaryReadFailed||soulContractReplacementBlocked)&&(key===SAVE_KEY||key===SAVE_BACKUP_KEY))return false;try{if(typeof MonsterProfiles!=='undefined'&&MonsterProfiles.available?.()===false)return false;if(key===SAVE_KEY&&typeof MonsterProfiles!=='undefined'&&!MonsterProfiles.beforeSave())return false;localStorage.setItem(typeof MonsterProfiles!=='undefined'?MonsterProfiles.key(key):key,value);lastSaveError=null;if(key===SAVE_KEY&&typeof MonsterProfiles!=='undefined')MonsterProfiles.afterSave(value);return true;}catch(error){lastSaveError=error;return false;}}
function safeStorageRemove(key){if((primaryReadFailed||soulContractReplacementBlocked)&&(key===SAVE_KEY||key===SAVE_BACKUP_KEY))return false;try{if(key===SAVE_KEY&&typeof MonsterProfiles!=='undefined'&&!MonsterProfiles.beforeSave())return false;localStorage.removeItem(typeof MonsterProfiles!=='undefined'?MonsterProfiles.key(key):key);return true;}catch(error){lastSaveError=error;return false;}}
function saveHash(payload){
  const copy=JSON.parse(JSON.stringify(payload));
  if(copy.saveMeta)copy.saveMeta.integrityHash=null;
  const text=JSON.stringify(copy);let hash=2166136261;
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return `fnv1a-${(hash>>>0).toString(16).padStart(8,'0')}`;
}
function migrate_v0_to_v1(payload,report){
  payload.schemaVersion=1;
  if(!isSaveObject(payload.saveMeta))payload.saveMeta={};
  if(!Array.isArray(payload.saveMeta.migrations))payload.saveMeta.migrations=[];
  if(!payload.saveMeta.migrations.includes('v0_to_v1'))payload.saveMeta.migrations.push('v0_to_v1');
  report.push('旧形式をschemaVersion 1へ移行');return payload;
}
function migrate_v1_to_v2(payload,report){
  payload.schemaVersion=2;
  if(!isSaveObject(payload.saveMeta))payload.saveMeta={};
  if(!Array.isArray(payload.saveMeta.migrations))payload.saveMeta.migrations=[];
  if(!Array.isArray(payload.mapDex))payload.mapDex=(typeof MAPS!=='undefined'&&Array.isArray(MAPS))?MAPS.map(map=>map.id):[];
  if(!payload.saveMeta.migrations.includes('v1_to_v2_map_dex'))payload.saveMeta.migrations.push('v1_to_v2_map_dex');
  report.push('既存プレイで利用可能だったマップを図鑑へ登録');return payload;
}
function migrate_v2_to_v3(payload,report){
  payload.schemaVersion=3;
  if(!isSaveObject(payload.saveMeta))payload.saveMeta={};
  if(!Array.isArray(payload.saveMeta.migrations))payload.saveMeta.migrations=[];
  if(!isSaveObject(payload.contractor))payload.contractor=contractorSaveDefaults();
  if(!payload.saveMeta.migrations.includes('v2_to_v3_contractor_rank'))payload.saveMeta.migrations.push('v2_to_v3_contractor_rank');
  report.push('契約者Rank・称号データの保存領域を追加');return payload;
}
function migrate_v3_to_v4(payload,report){
  payload.schemaVersion=4;
  if(!isSaveObject(payload.saveMeta))payload.saveMeta={};
  if(!Array.isArray(payload.saveMeta.migrations))payload.saveMeta.migrations=[];
  if(!isSaveObject(payload.progress))payload.progress={};
  // v3以前にはプレイ可能なチュートリアルが存在しなかったため、既存プレイヤーへ強制表示しない。
  payload.progress.tutorial=tutorialSaveDefaults({legacy:true});
  if(!payload.saveMeta.migrations.includes('v3_to_v4_tutorial_state'))payload.saveMeta.migrations.push('v3_to_v4_tutorial_state');
  report.push('既存プレイヤーを完了扱いにしてチュートリアル保存領域を追加');return payload;
}
function migrateSave(payload,report=[]){
  if(!isSaveObject(payload))throw new Error('セーブデータのルートがオブジェクトではありません。');
  let version=Number.isInteger(payload.schemaVersion)?payload.schemaVersion:0;
  if(version>SAVE_SCHEMA_VERSION)throw new Error(`未対応の新しいセーブ形式です（v${version}）。`);
  while(version<SAVE_SCHEMA_VERSION){if(version===0)payload=migrate_v0_to_v1(payload,report);else if(version===1)payload=migrate_v1_to_v2(payload,report);else if(version===2)payload=migrate_v2_to_v3(payload,report);else if(version===3)payload=migrate_v3_to_v4(payload,report);else throw new Error(`v${version}からの移行処理がありません。`);version=payload.schemaVersion;}
  return payload;
}
function nonNegativeInteger(value,fallback=0){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.floor(n):fallback;}
function repairSkillId(value){return typeof value==='string'&&typeof normalizeSkillId==='function'?normalizeSkillId(value):value;}
function isCharacterSaveId(id){
  const unit=typeof M!=='undefined'?M.find(entry=>entry.id===id):null;
  return unit?.entityKind==='character'||(!unit?.entityKind&&unit?.unitType==='character');
}
const SKILL110_SAVE_MIGRATION = 'skill_system_110_v1';
function skill110MigrationAvailable(){
  return typeof SKILL110_MIGRATION_MAP !== 'undefined' && typeof SKILL110_CATALOG !== 'undefined';
}
function isSkill110Save(payload){return payload?.saveMeta?.migrations?.includes(SKILL110_SAVE_MIGRATION) === true;}
function skill110SaveTarget(id){
  if (!skill110MigrationAvailable() || typeof id !== 'string') return null;
  if (SKILL110_CATALOG.some(sk => sk.id === id)) return SKILL_BY_ID[id]?.cost === 25 ? null : id;
  const normalized = repairSkillId(id);
  const target = Object.hasOwn(SKILL110_MIGRATION_MAP,id) ? SKILL110_MIGRATION_MAP[id] :
    (Object.hasOwn(SKILL110_MIGRATION_MAP,normalized) ? SKILL110_MIGRATION_MAP[normalized] : null);
  // Imported legacy records must never create synthesis-only cards.
  return typeof target === 'string' && SKILL110_CATALOG.some(sk => sk.id === target && sk.cost <= 20) ? target : null;
}
function captureSkill110Backup(payload){
  if (!skill110MigrationAvailable() || isSkill110Save(payload) || payload.skill110MigrationBackup) return;
  payload.skill110MigrationBackup = JSON.parse(JSON.stringify(payload));
}
function migrateSkill110Save(payload, report=[]){
  if (!skill110MigrationAvailable() || isSkill110Save(payload)) return false;
  captureSkill110Backup(payload);
  const cards = Object.create(null), unmapped = Object.create(null);
  Object.entries(payload.skillCards || {}).forEach(([id,count]) => {
    const target = skill110SaveTarget(id), amount = nonNegativeInteger(count);
    if (target) cards[target] = (cards[target] || 0) + amount;
    else if (amount) unmapped[id] = amount;
  });
  payload.skillCards = cards;
  payload.skill110UnmappedCards = unmapped; // Never discard a future/unknown imported ID.
  payload.equippedSkills = isSaveObject(payload.equippedSkills) ? payload.equippedSkills : {};
  const reserved = {};
  let compensated = 0, adjusted = 0;
  (payload.instances || []).forEach(ins => {
    const mon = typeof by === 'function' ? by(ins.id) : M.find(entry => entry.id === ins.id);
    if (!mon) return;
    const previous = Array.isArray(payload.equippedSkills[ins.uid]) ? payload.equippedSkills[ins.uid] : [];
    const limit = skillCostLimitFor(mon, ins), kept = [];
    let used = 0;
    previous.map(skill110SaveTarget).filter(Boolean).forEach(id => {
      const sk = SKILL_BY_ID[id];
      if (kept.length < 3 && sk && isSkillAllowedForMonster(id,mon) && used + sk.cost <= limit &&
          (reserved[id] || 0) < (cards[id] || 0)) {
        kept.push(id); used += sk.cost; reserved[id] = (reserved[id] || 0) + 1;
      }
    });
    if (!kept.some(id => SKILL_BY_ID[id].power > 0)) {
      // The universal COST 1 attack guarantees an actionable loadout without granting high-cost cards.
      const basic = 's110_001', cost = SKILL_BY_ID[basic].cost;
      while (kept.length >= 3 || used + cost > limit) {
        const removed = kept.pop(); if (!removed) break;
        used -= SKILL_BY_ID[removed].cost; reserved[removed]--;
      }
      if ((cards[basic] || 0) <= (reserved[basic] || 0)) {
        cards[basic] = (cards[basic] || 0) + 1; compensated++;
      }
      kept.push(basic); reserved[basic] = (reserved[basic] || 0) + 1;
    }
    if (JSON.stringify(previous) !== JSON.stringify(kept)) adjusted++;
    payload.equippedSkills[ins.uid] = kept;
    if (Array.isArray(ins.alchemy?.exclusiveSkillIds)) {
      ins.alchemy.exclusiveSkillIds = [...new Set(ins.alchemy.exclusiveSkillIds.map(skill110SaveTarget).filter(Boolean))];
    }
  });
  // Present saves derive skill discovery from owned cards; preserve optional historical discovery fields too.
  ['skillDex','discoveredSkills','knownSkills'].forEach(key => {
    if (Array.isArray(payload[key])) payload[key] = [...new Set(payload[key].map(id => skill110SaveTarget(id) || id))];
    else if (isSaveObject(payload[key])) {
      const mapped = Object.create(null);
      Object.entries(payload[key]).forEach(([id,value]) => {
        const target = skill110SaveTarget(id) || id;
        mapped[target] = typeof value === 'number' ? Math.max(Number(mapped[target]) || 0,value) : (mapped[target] || value);
      });
      payload[key] = mapped;
    }
  });
  payload.saveMeta.migrations.push(SKILL110_SAVE_MIGRATION);
  // Supersede previous card backfills; running them after this migration would mint/reset inventory.
  ['equipped_skill_cards_v1','evolution_native_cards_v1'].forEach(id => {
    if (!payload.saveMeta.migrations.includes(id)) payload.saveMeta.migrations.push(id);
  });
  payload.skill110Migration = {version:1,adjustedInstances:adjusted,basicAttackCompensation:compensated,
    unresolvedIds:Object.keys(unmapped),noticePending:true};
  report.push(`技体系を110種類へ更新。装備調整 ${adjusted}体、基本攻撃補填 ${compensated}枚。`);
  return true;
}
// Run on every load, including imports carrying current migration markers.
// Only identifier-bearing fields are visited: UIDs, prose and archival backups
// must remain byte-for-byte unchanged. Party/expedition links already use UIDs.
function migrateRenamedMonsterIds(payload,report=[]){
  const monsterId=id=>typeof MONSTER_ID_ALIASES!=='undefined'&&Object.hasOwn(MONSTER_ID_ALIASES,id)?MONSTER_ID_ALIASES[id]:id;
  const renamedSkills=new Set(typeof RENAMED_SKILL_ID_ALIASES!=='undefined'?Object.values(RENAMED_SKILL_ID_ALIASES):[]);
  const skillId=id=>{
    if(typeof RENAMED_SKILL_ID_ALIASES!=='undefined'&&Object.hasOwn(RENAMED_SKILL_ID_ALIASES,id))return RENAMED_SKILL_ID_ALIASES[id];
    // Pre-110 saves have explicit historical catalog mappings for sk_ aliases.
    // Let that migration consume each raw entry before normalizing its alias.
    if(!isSkill110Save(payload)&&skill110MigrationAvailable()&&Object.hasOwn(SKILL110_MIGRATION_MAP,id))return id;
    const normalized=repairSkillId(id);
    return renamedSkills.has(normalized)?normalized:id;
  };
  let changed=false;
  const mapped=(id,convert)=>{const next=convert(id);if(next!==id)changed=true;return next;};
  const list=(values,convert)=>Array.isArray(values)?values.map(id=>mapped(id,convert)):values;
  const record=(values,convert,merge)=>{
    if(!isSaveObject(values))return values;
    const result={};
    Object.entries(values).forEach(([id,value])=>{
      const next=mapped(id,convert);
      result[next]=Object.hasOwn(result,next)?merge(result[next],value):value;
    });
    return result;
  };
  const sum=(a,b)=>nonNegativeInteger(a)+nonNegativeInteger(b);
  const discovery=(a,b)=>typeof a==='number'&&typeof b==='number'?Math.max(a,b):(a||b);
  (Array.isArray(payload.instances)?payload.instances:[]).forEach(ins=>{
    if(!isSaveObject(ins))return;
    ins.id=mapped(ins.id,monsterId);
    if(Array.isArray(ins.alchemy?.exclusiveSkillIds))ins.alchemy.exclusiveSkillIds=list(ins.alchemy.exclusiveSkillIds,skillId);
  });
  payload.caught=list(payload.caught,monsterId);
  if(typeof payload.homeFavoriteId==='string')payload.homeFavoriteId=mapped(payload.homeFavoriteId,monsterId);
  for(const key of ['levels','exp'])payload[key]=record(payload[key],monsterId,discovery);
  if(isSaveObject(payload.autoBattle?.defeated)){
    for(const key of Object.keys(payload.autoBattle.defeated))payload.autoBattle.defeated[key]=list(payload.autoBattle.defeated[key],monsterId);
  }
  for(const key of ['skillCards','skill110UnmappedCards']){
    if(isSaveObject(payload[key]))payload[key]=record(payload[key],skillId,sum);
  }
  if(isSaveObject(payload.equippedSkills)){
    for(const uid of Object.keys(payload.equippedSkills))payload.equippedSkills[uid]=list(payload.equippedSkills[uid],skillId);
  }
  for(const key of ['skillDex','discoveredSkills','knownSkills']){
    if(Array.isArray(payload[key]))payload[key]=[...new Set(list(payload[key],skillId))];
    else if(isSaveObject(payload[key]))payload[key]=record(payload[key],skillId,discovery);
  }
  if(changed)report.push('アシュレイア・モルグラムの旧識別名を更新');
}
// Shared by load repair and runtime expedition normalization. Never invent rewards.
function validateExpeditionEntry(entry){
  if(!isSaveObject(entry)||!['active','complete'].includes(entry.status))return null;
  const requiredWins={short:1,medium:3,long:5}[entry.distanceId];
  if(!Number.isInteger(requiredWins)||!Number.isInteger(entry.progress)||entry.progress<0)return null;
  const repaired={...entry,requiredWins,progress:Math.min(requiredWins,entry.progress)};
  if(entry.status==='active'){repaired.reward=null;return repaired;}
  const reward=entry.reward;
  if(!isSaveObject(reward)||!Number.isInteger(reward.coins)||reward.coins<0||!Number.isInteger(reward.exp)||reward.exp<0||typeof reward.great!=='boolean')return null;
  // Keep SEC-02's non-increasing item repair, including malformed containers.
  const items=Object.fromEntries(Object.entries(isSaveObject(reward.items)?reward.items:{}).filter(([id])=>typeof ITEM_BY_ID!=='undefined'&&Object.hasOwn(ITEM_BY_ID,id)).map(([id,count])=>[id,nonNegativeInteger(count)]));
  repaired.reward={...reward,items};
  return repaired;
}
function quarantineExpeditionEntry(payload,entry,report=[]){
  if(!isSaveObject(payload.quarantine))payload.quarantine={};
  if(!Array.isArray(payload.quarantine.invalidExpeditions))payload.quarantine.invalidExpeditions=[];
  payload.quarantine.invalidExpeditions.push(entry);
  report.push('破損した遠征記録を隔離し、仲間を戻しました');
}
function repairSave(payload,report=[]){
  captureSkill110Backup(payload);
  migrateRenamedMonsterIds(payload,report);
  payload.autoBattle=normalizeAutoBattle(payload.autoBattle);
  payload.gBless=normalizeGBless(payload.gBless);
  const defaults=initSave();payload.schemaVersion=SAVE_SCHEMA_VERSION;
  if(!isSaveObject(payload.saveMeta))payload.saveMeta={...defaults.saveMeta,migrations:[]};
  if(!Array.isArray(payload.saveMeta.migrations))payload.saveMeta.migrations=[];
  // Old receipts represent an already-claimed prefix. Defer expansion until a
  // receiving transaction can persist the inbox-based migration atomically.
  payload.giftReceiptVersion=payload.giftReceiptVersion===1?1:0;
  payload.lifeQuestClaimedIds=Array.isArray(payload.lifeQuestClaimedIds)?[...new Set(payload.lifeQuestClaimedIds.filter(id=>typeof id==='string'))]:[];
  if(payload.giftReceiptVersion!==1)payload.lifeQuestClaimedIds=payload.lifeQuestClaimedIds.slice(-500);
  payload.giftClaimedIds=Array.isArray(payload.giftClaimedIds)?[...new Set(payload.giftClaimedIds.filter(id=>typeof id==='string'&&id))]:[];
  payload.giftHistory=Array.isArray(payload.giftHistory)?payload.giftHistory.filter(g=>isSaveObject(g)&&typeof g.key==='string'&&Array.isArray(g.rewards)&&Number.isFinite(Date.parse(g.receivedAt))&&Date.now()-Date.parse(g.receivedAt)<=90*86400000).sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt)).slice(0,200):[];
  if(!isSaveObject(payload.quarantine))payload.quarantine=defaults.quarantine;
  ['unknownInstances','unknownCaughtIds','invalidExpeditions'].forEach(key=>{if(!Array.isArray(payload.quarantine[key]))payload.quarantine[key]=[];});
  const knownMonsterIds=new Set((typeof M!=='undefined'&&Array.isArray(M)?M:[]).map(mon=>mon.id));const canValidateMonsters=knownMonsterIds.size>0;
  if(typeof payload.homeFavoriteId!=='string'||(canValidateMonsters&&!knownMonsterIds.has(payload.homeFavoriteId)))payload.homeFavoriteId=null;
  const rawInstances=Array.isArray(payload.instances)?payload.instances:[];const seenUids=new Set();payload.instances=[];
  rawInstances.forEach((entry,index)=>{
    if(!isSaveObject(entry)||typeof entry.id!=='string'){report.push(`不正な個体データ${index+1}件目を隔離`);payload.quarantine.unknownInstances.push(entry);return;}
    if(canValidateMonsters&&!knownMonsterIds.has(entry.id)){report.push(`未知のモンスターID ${entry.id} を隔離`);payload.quarantine.unknownInstances.push(entry);return;}
    let instanceUid=typeof entry.uid==='string'&&entry.uid?entry.uid:'';
    if(!instanceUid||seenUids.has(instanceUid)){instanceUid=`repair_${Date.now().toString(36)}_${index.toString(36)}`;report.push('欠損・重複した個体UIDを再発行');}
    seenUids.add(instanceUid);entry.uid=instanceUid;entry.level=clampLevel(nonNegativeInteger(entry.level,1));entry.exp=isMaxLevel(entry.level)?0:nonNegativeInteger(entry.exp);entry.locked=entry.locked===true;
    if(Array.isArray(entry.alchemy?.exclusiveSkillIds))entry.alchemy.exclusiveSkillIds=entry.alchemy.exclusiveSkillIds.map(repairSkillId).filter(x=>typeof x==='string');
    if(typeof by==='function' && by(entry.id)?.entityKind==='monster')entry.evolutionOffset=monsterEvolutionOffset(entry);
    payload.instances.push(entry);
  });
  if(!payload.saveMeta.migrations.includes('character_first_lock_v1')){
    const seenCharacters=new Set();
    payload.instances.forEach(ins=>{
      if(!isCharacterSaveId(ins.id) || seenCharacters.has(ins.id))return;
      seenCharacters.add(ins.id);ins.locked=true;
    });
    payload.saveMeta.migrations.push('character_first_lock_v1');
    report.push('既存キャラクターの各形態の先頭個体を保護');
  }
  const rawCaught=Array.isArray(payload.caught)?payload.caught:[];
  payload.caught=[...new Set(rawCaught.filter(id=>{const valid=typeof id==='string'&&(!canValidateMonsters||knownMonsterIds.has(id));if(!valid&&typeof id==='string')payload.quarantine.unknownCaughtIds.push(id);return valid;}).concat(payload.instances.map(entry=>entry.id)))];
  payload.levels=isSaveObject(payload.levels)?payload.levels:{};payload.exp=isSaveObject(payload.exp)?payload.exp:{};
  Object.keys(payload.levels).forEach(id=>{payload.levels[id]=clampLevel(nonNegativeInteger(payload.levels[id],1));});
  payload.instances.forEach(entry=>{payload.levels[entry.id]=clampLevel(Math.max(nonNegativeInteger(payload.levels[entry.id],1),entry.level));payload.exp[entry.id]=isMaxLevel(payload.levels[entry.id])?0:Math.max(nonNegativeInteger(payload.exp[entry.id]),entry.exp);});
  payload.party=[...new Set(Array.isArray(payload.party)?payload.party:[])].filter(value=>seenUids.has(value)).slice(0,3);
  payload.items=isSaveObject(payload.items)?payload.items:{};Object.entries(defaults.items).forEach(([key,value])=>{payload.items[key]=nonNegativeInteger(payload.items[key],value);});Object.keys(payload.items).forEach(key=>{payload.items[key]=nonNegativeInteger(payload.items[key]);});
  payload.coins=nonNegativeInteger(payload.coins);payload.alchemyResonance=normalizeAlchemyResonance(payload.alchemyResonance);
  payload.worldMap=normalizeWorldMapSaveState(payload.worldMap);
  payload.mapStories=normalizeMapStories(payload.mapStories);
  payload.history=isSaveObject(payload.history)?payload.history:defaults.history;payload.history.wins=nonNegativeInteger(payload.history.wins);payload.history.logs=Array.isArray(payload.history.logs)?payload.history.logs.filter(x=>typeof x==='string').slice(-30):[];
  payload.skillCards=isSaveObject(payload.skillCards)?payload.skillCards:{};payload.equippedSkills=isSaveObject(payload.equippedSkills)?payload.equippedSkills:{};
  migrateSkill110Save(payload,report);
  let migratedSkillIds=false;const normalizedSkillCards={};Object.entries(payload.skillCards).forEach(([id,count])=>{const normalizedId=repairSkillId(id);if(normalizedId!==id)migratedSkillIds=true;normalizedSkillCards[normalizedId]=Math.max(nonNegativeInteger(normalizedSkillCards[normalizedId]),nonNegativeInteger(count));});payload.skillCards=normalizedSkillCards;
  Object.keys(payload.equippedSkills).forEach(key=>{if(!seenUids.has(key))delete payload.equippedSkills[key];else payload.equippedSkills[key]=Array.isArray(payload.equippedSkills[key])?payload.equippedSkills[key].filter(x=>typeof x==='string').map(id=>{const normalizedId=repairSkillId(id);if(normalizedId!==id)migratedSkillIds=true;return normalizedId;}):[];});
  if(migratedSkillIds&&!payload.saveMeta.migrations.includes('fixed_skill_ids_v1')){payload.saveMeta.migrations.push('fixed_skill_ids_v1');report.push('旧技IDを固定skillIdへ移行');}
  payload.itemDex=Array.isArray(payload.itemDex)?[...new Set(payload.itemDex.filter(x=>typeof x==='string'))]:[];payload.goldenLandMapReady=payload.goldenLandMapReady===true&&payload.items.golden_land_map>0;
  const knownMapIds=new Set((typeof MAPS!=='undefined'&&Array.isArray(MAPS)?MAPS:[]).map(map=>map.id));const validDistances=new Set(['short','medium','long']);
  payload.mapDex=Array.isArray(payload.mapDex)?[...new Set(payload.mapDex.filter(id=>typeof id==='string'&&(!knownMapIds.size||knownMapIds.has(id))))]:[];
  payload.expeditions=isSaveObject(payload.expeditions)?payload.expeditions:defaults.expeditions;payload.expeditions.completedCount=nonNegativeInteger(payload.expeditions.completedCount);
  const rawExpeditions=Array.isArray(payload.expeditions.active)?payload.expeditions.active:[];
  payload.expeditions.active=rawExpeditions.flatMap(entry=>{
    const members=Array.isArray(entry?.memberUids)?[...new Set(entry.memberUids)].filter(value=>seenUids.has(value)):[];
    const valid=isSaveObject(entry)&&typeof entry.id==='string'&&/^[A-Za-z0-9_:-]+$/.test(entry.id)&&(!knownMapIds.size||knownMapIds.has(entry.mapId))&&validDistances.has(entry.distanceId)&&members.length>=1&&members.length<=3;
    const repaired=valid?validateExpeditionEntry(entry):null;
    if(!repaired){quarantineExpeditionEntry(payload,entry,report);return [];}
    repaired.memberUids=members;
    return [repaired];
  });
  payload.contractor=isSaveObject(payload.contractor)?payload.contractor:contractorSaveDefaults();
  payload.contractor.systemVersion=Math.max(1,nonNegativeInteger(payload.contractor.systemVersion,1));
  payload.contractor.exp=Math.min(CONTRACTOR_SAVE_EXP_CAP,nonNegativeInteger(payload.contractor.exp));
  payload.contractor.claimedRankRewards=[...new Set((Array.isArray(payload.contractor.claimedRankRewards)?payload.contractor.claimedRankRewards:[]).map(value=>nonNegativeInteger(value)).filter(value=>value>=2&&value<=50))];
  payload.contractor.expEventIds=[...new Set((Array.isArray(payload.contractor.expEventIds)?payload.contractor.expEventIds:[]).filter(value=>typeof value==='string'&&value))];
  payload.contractor.unlockedTitleIds=[...new Set((Array.isArray(payload.contractor.unlockedTitleIds)?payload.contractor.unlockedTitleIds:[]).filter(value=>typeof value==='string'&&value))];
  payload.contractor.equippedTitleId=typeof payload.contractor.equippedTitleId==='string'&&payload.contractor.unlockedTitleIds.includes(payload.contractor.equippedTitleId)?payload.contractor.equippedTitleId:null;
  const rawRecentExp=Array.isArray(payload.contractor.recentExp)?payload.contractor.recentExp:[];
  payload.contractor.recentExp=rawRecentExp.filter(entry=>isSaveObject(entry)&&nonNegativeInteger(entry.amount)>0).slice(-20).map(entry=>({amount:nonNegativeInteger(entry.amount),source:typeof entry.source==='string'&&entry.source?entry.source:'other',eventId:typeof entry.eventId==='string'&&entry.eventId?entry.eventId:null,awardedAt:typeof entry.awardedAt==='string'?entry.awardedAt:''}));
  const rawPendingRankUps=Array.isArray(payload.contractor.pendingRankUps)?payload.contractor.pendingRankUps:[];
  payload.contractor.pendingRankUps=rawPendingRankUps.filter(entry=>isSaveObject(entry)&&nonNegativeInteger(entry.fromRank,1)>=1&&nonNegativeInteger(entry.toRank)>nonNegativeInteger(entry.fromRank,1)&&nonNegativeInteger(entry.toRank)<=50).slice(-10).map(entry=>({fromRank:nonNegativeInteger(entry.fromRank,1),toRank:nonNegativeInteger(entry.toRank),unlockedTitleIds:[...new Set((Array.isArray(entry.unlockedTitleIds)?entry.unlockedTitleIds:[]).filter(value=>typeof value==='string'&&value))],createdAt:typeof entry.createdAt==='string'?entry.createdAt:''}));
  payload.contractor.legacyMigrationVersion=nonNegativeInteger(payload.contractor.legacyMigrationVersion);
  payload.contractor.legacyMigrationSummary=isSaveObject(payload.contractor.legacyMigrationSummary)?payload.contractor.legacyMigrationSummary:null;
  payload.progress=isSaveObject(payload.progress)?payload.progress:defaults.progress;
  if(typeof payload.progress.chapterId!=='string')payload.progress.chapterId='prologue';
  payload.progress.storyFlags=isSaveObject(payload.progress.storyFlags)?payload.progress.storyFlags:{};
  const rawTutorial=payload.progress.tutorial;
  const rawTutorialVersion=isSaveObject(rawTutorial)?Math.max(1,nonNegativeInteger(rawTutorial.version,1)):TUTORIAL_VERSION;
  payload.progress.tutorial=normalizeTutorialSave(rawTutorial);
  if(isSaveObject(rawTutorial)&&rawTutorial.replaying===true){
    if(!payload.saveMeta.migrations.includes('tutorial_replay_retired_v1'))payload.saveMeta.migrations.push('tutorial_replay_retired_v1');
    report.push('廃止されたチュートリアル再閲覧を終了し、元の完了状態へ復帰');
  }
  if(isSaveObject(rawTutorial)&&rawTutorialVersion<TUTORIAL_VERSION){
    if(!payload.saveMeta.migrations.includes('tutorial_v1_to_v2_legacy_protection'))payload.saveMeta.migrations.push('tutorial_v1_to_v2_legacy_protection');
    report.push('公開版チュートリアルの状態を保護して序章v2保存形式へ移行');
  }
  const ownedTutorialIds=new Set(payload.instances.map(entry=>entry.id));
  if(ownedTutorialIds.has('freigal')&&ownedTutorialIds.has('aquaron'))payload.progress.tutorial.starterContractsGranted=true;
  if(ownedTutorialIds.has('elna_beginner'))payload.progress.tutorial.elnaContractGranted=true;
  payload.progress.missions=isSaveObject(payload.progress.missions)?payload.progress.missions:defaults.progress.missions;
  return payload;
}
function parseAndPrepareSave(raw,report=[]){const parsed=JSON.parse(raw);if(parsed?.saveMeta?.integrityHash&&parsed.saveMeta.integrityHash!==saveHash(parsed))report.push('整合性ハッシュの不一致を検出');return repairSave(migrateSave(parsed,report),report);}
function readSoulReplacementStorage(key){
  try{return {ok:true,raw:localStorage.getItem(typeof MonsterProfiles!=='undefined'?MonsterProfiles.key(key):key)};}
  catch(_error){return {ok:false,raw:null};}
}
function parseSoulReplacementArchive(raw){
  if(raw===null)return {version:1,records:[]};
  const archive=JSON.parse(raw);
  if(archive?.version!==1||!Array.isArray(archive.records))throw new Error('退避記録を確認できません。');
  return archive;
}
function persistSoulReplacementArchive(archive){
  archive.records=archive.records.slice(-3);
  const key=typeof MonsterProfiles!=='undefined'?MonsterProfiles.key(SOUL_ARCHIVE_STORAGE_KEY):SOUL_ARCHIVE_STORAGE_KEY;
  for(;;){
    const raw=JSON.stringify(archive);
    try{localStorage.setItem(key,raw);}catch(_error){}
    const stored=readSoulReplacementStorage(SOUL_ARCHIVE_STORAGE_KEY);
    if(stored.ok&&stored.raw===raw)return true;
    if(!archive.records.length)return false;
    archive.records.shift();
  }
}
function readSoulReplacementBundle(){
  const primary=readSoulReplacementStorage(SAVE_KEY),recovery=readSoulReplacementStorage(SOUL_RECOVERY_STORAGE_KEY),archive=readSoulReplacementStorage(SOUL_ARCHIVE_STORAGE_KEY);
  return {ok:primary.ok&&recovery.ok&&archive.ok,primary:primary.raw,recovery:recovery.raw,archive:archive.raw};
}
function notifySoulReplacementBlocked(){
  soulContractReplacementBlocked=true;
  if(!saveRecoveryReport.includes(SOUL_REPLACEMENT_NOTICE))saveRecoveryReport.push(SOUL_REPLACEMENT_NOTICE);
  saveTransactionNotice(SOUL_REPLACEMENT_NOTICE);refreshReplacementRecoveryStatus();
}
function withSoulReplacementLock(action,unsupportedNotice=true){
  if(typeof navigator==='undefined')return action();
  if(!navigator.locks||typeof navigator.locks.request!=='function'){
    if(unsupportedNotice)saveTransactionNotice(SOUL_REPLACEMENT_UNSUPPORTED);
    return false;
  }
  const identity=saveTransactionIdentity(),key=typeof MonsterProfiles!=='undefined'?MonsterProfiles.key(SAVE_KEY):SAVE_KEY;
  return navigator.locks.request(`monster-rpg:character-gacha:${key}`,{mode:'exclusive'},()=>{
    if(identity!==saveTransactionIdentity())return false;
    return action();
  }).catch(()=>{if(unsupportedNotice)notifySoulReplacementBlocked();return false;});
}
function resolveSoulReplacementPending(){
  const state=readSoulReplacementBundle();if(!state.ok)return false;
  let archive;try{archive=parseSoulReplacementArchive(state.archive);}catch(_error){return false;}
  const pending=archive.pending;
  if(pending){
    const match=side=>Object.prototype.hasOwnProperty.call(pending,`${side}Primary`)&&
      Object.prototype.hasOwnProperty.call(pending,`${side}Recovery`)&&
      state.primary===pending[`${side}Primary`]&&state.recovery===pending[`${side}Recovery`];
    if(!match('before')&&!match('after'))return false;
    delete archive.pending;
    if(!persistSoulReplacementArchive(archive))return false;
  }
  soulContractReplacementBlocked=false;refreshReplacementRecoveryStatus();return true;
}
function resumeSoulContractReplacement(){
  if(!soulContractReplacementBlocked||primaryReadFailed||protectedPrimaryRaw!==null)return false;
  return withSoulReplacementLock(()=>{
    const state=readSoulReplacementBundle();
    if(!state.ok||JSON.stringify(state)!==soulContractReplacementExported){
      soulContractReplacementExported=null;refreshReplacementRecoveryStatus();
      saveTransactionNotice('先に記録一式を書き出してください。記録が変わった場合は、もう一度書き出してください。');return false;
    }
    let current=null,valid=state.primary===null;
    try{if(state.primary!==null){current=JSON.parse(state.primary);parseAndPrepareSave(state.primary,[]);valid=isSaveObject(current)&&!(current.schemaVersion>SAVE_SCHEMA_VERSION);}}catch(_error){}
    if(!valid){
      saveTransactionNotice('現在の主セーブを確認できません。記録を保管してセーブの復旧を行ってください。');return false;
    }
    if(!confirm('書き出した記録を保管しましたか？ 現在の主セーブを基準として再開します。'))return false;
    // Recheck after the dialog: another tab may have changed the storage.
    if(JSON.stringify(readSoulReplacementBundle())!==soulContractReplacementExported)return false;
    let archive;try{archive=parseSoulReplacementArchive(state.archive);}catch(_error){archive={version:1,records:[]};}
    const next=current?.soulContractAppliedId?JSON.stringify({version:1,id:current.soulContractAppliedId,
      status:'baseline',before:current,after:current,previous:null}):null;
    archive.pending={beforePrimary:state.primary,afterPrimary:state.primary,beforeRecovery:state.recovery,afterRecovery:next};
    if(!persistSoulReplacementArchive(archive))return false;
    if(!writeCharacterGachaRecovery(next)){writeCharacterGachaRecovery(state.recovery);return false;}
    delete archive.pending;
    if(!persistSoulReplacementArchive(archive))return false;
    soulContractReplacementBlocked=false;soulContractReplacementExported=null;
    refreshReplacementRecoveryStatus();location.reload();return true;
  });
}
function loadSave(){
  protectedPrimaryRaw=null;
  rejectedPrimaryRaw=null;
  primaryReadFailed=false;
  soulContractReplacementBlocked=false;
  soulContractReplacementExported=null;
  const archiveState=readSoulReplacementStorage(SOUL_ARCHIVE_STORAGE_KEY);
  let archive=null,archiveInvalid=!archiveState.ok;
  try{archive=parseSoulReplacementArchive(archiveState.raw);}catch(_error){archiveInvalid=true;}
  lastSaveError=null;
  const raw=safeStorageGet(SAVE_KEY);
  if(lastSaveError){
    primaryReadFailed=true;
    const message='セーブを読み取れなかったため保存を停止しました。再読み込みしてください。セーブ管理から元データを書き出せます。';
    saveRecoveryReport.push(message);
    if(typeof alert==='function')alert(message);
    return initSave();
  }
  if(archiveInvalid||archive?.pending){
    soulContractReplacementBlocked=true;
    if(!archiveInvalid){
      const resolved=withSoulReplacementLock(resolveSoulReplacementPending,false);
      if(resolved?.then)resolved.then(ok=>{if(!ok)notifySoulReplacementBlocked();});
      else if(!resolved)notifySoulReplacementBlocked();
    }else notifySoulReplacementBlocked();
  }
  if(raw===null)return initSave();
  try{
    const parsed=JSON.parse(raw);
    if(Number.isInteger(parsed?.schemaVersion)&&parsed.schemaVersion>SAVE_SCHEMA_VERSION){
      protectedPrimaryRaw=raw;
      const message='このセーブは新しいバージョン用です。この枠の保存を停止しました。セーブ管理から元データを書き出せます。';
      saveRecoveryReport.push(message);
      if(typeof alert==='function')alert(message);
      return initSave();
    }
    const prepared=parseAndPrepareSave(raw,saveRecoveryReport);
    if(!safeStorageGet(SAVE_BACKUP_KEY))safeStorageSet(SAVE_BACKUP_KEY,raw);
    return prepared;
  }catch(error){
    rejectedPrimaryRaw=raw;
    if(!safeStorageSet(SAVE_CORRUPT_KEY,raw))protectedPrimaryRaw=raw;
    const backup=safeStorageGet(SAVE_BACKUP_KEY);
    if(backup&&typeof confirm==='function'&&confirm('セーブデータが破損しています。直前のバックアップから復旧しますか？')){
      try{
        const restored=parseAndPrepareSave(backup,saveRecoveryReport);
        saveRecoveryReport.push('破損データをバックアップから復旧');
        return restored;
      }catch(backupError){saveRecoveryReport.push(backupError.message);}
    }
    saveRecoveryReport.push(error.message);
    if(typeof alert==='function')alert(protectedPrimaryRaw!==null?'破損データを退避できません。元データを保護するため保存を停止しました。':'破損したセーブを隔離して新規データで起動します。');
    return initSave();
  }
}
let save = loadSave();
globalThis.GameDiagnostics?.registerSaveProvider?.(() => save);

function currentTutorialState(){
  if(!isSaveObject(save.progress))save.progress=initSave().progress;
  save.progress.tutorial=normalizeTutorialSave(save.progress.tutorial);
  return save.progress.tutorial;
}
function tutorialShouldAutoStart(){
  const tutorial=currentTutorialState();
  return tutorial.status==='not_started'&&!tutorial.replaying;
}
function setTutorialStep(stepId){
  const tutorial=currentTutorialState();
  tutorial.stepId=typeof stepId==='string'&&stepId?stepId:null;
  if(!tutorial.replaying){
    tutorial.status='in_progress';
    tutorial.completed=false;
    tutorial.skipped=false;
  }
  return tutorial;
}
function completeTutorial(){
  const tutorial=currentTutorialState();
  if(tutorial.replaying){
    tutorial.replaying=false;
    tutorial.stepId=null;
    return tutorial;
  }
  tutorial.status='completed';
  tutorial.chapterGate=false;
  tutorial.stepId=null;
  tutorial.completed=true;
  tutorial.skipped=false;
  return tutorial;
}
function skipTutorial(){
  const tutorial=currentTutorialState();
  if(tutorial.replaying){
    tutorial.replaying=false;
    tutorial.stepId=null;
    return tutorial;
  }
  tutorial.status='skipped';
  tutorial.chapterGate=false;
  tutorial.stepId=null;
  tutorial.completed=false;
  tutorial.skipped=true;
  return tutorial;
}
function markTutorialGuideSeen(guideId){
  const tutorial=currentTutorialState();
  if(!TUTORIAL_GUIDE_IDS.includes(guideId))return false;
  tutorial.guides[guideId]=true;
  return true;
}
function markTutorialFirstContractGuaranteeUsed(){
  const tutorial=currentTutorialState();
  if(tutorial.firstContractGuaranteeUsed)return false;
  tutorial.firstContractGuaranteeUsed=true;
  return true;
}
function markTutorialStarterContractScrollGranted(){
  const tutorial=currentTutorialState();
  if(tutorial.starterContractScrollGranted)return false;
  tutorial.starterContractScrollGranted=true;
  return true;
}
function markTutorialOnce(flagId){
  if(!TUTORIAL_ONCE_FLAG_IDS.includes(flagId))return false;
  const tutorial=currentTutorialState();
  if(tutorial[flagId]===true)return false;
  tutorial[flagId]=true;
  return true;
}
function markTutorialStarterContractsGranted(){return markTutorialOnce('starterContractsGranted');}
function markTutorialElnaContractGranted(){return markTutorialOnce('elnaContractGranted');}
function markTutorialStellaSkillCardGranted(){return markTutorialOnce('stellaSkillCardGranted');}
function markTutorialAlchemySuppliesGranted(){return markTutorialOnce('alchemySuppliesGranted');}
function markTutorialAlchemyLessonPrepared(){return markTutorialOnce('alchemyLessonPrepared');}
function markTutorialAlchemyLessonCompleted(){return markTutorialOnce('alchemyLessonCompleted');}
function markTutorialExpeditionDispatched(){return markTutorialOnce('expeditionDispatched');}
function markTutorialPrologueCompleted(){return markTutorialOnce('prologueCompleted');}
function setTutorialElnaGuestActive(active){const tutorial=currentTutorialState();tutorial.elnaGuestActive=active===true;return tutorial.elnaGuestActive;}
function setTutorialPlayerName(value){
  const playerName=typeof value==='string'?value.trim().slice(0,20):'';
  if(!playerName)return false;
  const tutorial=currentTutorialState();tutorial.playerName=playerName;tutorial.playerNamed=true;return true;
}

/* Ver7.8: ここからはすべてグローバル関数 */
function registerItemDex(itemId){
  if(!ITEM_DEX_BY_ID[itemId]) return;
  if(!Array.isArray(save.itemDex)) save.itemDex = [];
  if(!save.itemDex.includes(itemId)) {
    save.itemDex.push(itemId);
    if(typeof grantContractorCatalogRegistration==='function')grantContractorCatalogRegistration('item',itemId);
  }
}
function syncItemDexFromInventory(){
  if(!save.items) save.items = {};
  ITEM_DEX_ITEMS.forEach(it => {
    if(Number(save.items[it.id] || 0) > 0) registerItemDex(it.id);
  });
}
syncItemDexFromInventory();

function registerMapDex(mapId){
  if(!(typeof MAPS!=='undefined' && MAPS.some(map=>map.id===mapId))) return false;
  if(!Array.isArray(save.mapDex)) save.mapDex = [];
  if(save.mapDex.includes(mapId)) return false;
  save.mapDex.push(mapId);
  if(typeof grantContractorCatalogRegistration==='function')grantContractorCatalogRegistration('map',mapId);
  return true;
}

// Transaction snapshots are memory-only. Never overwrite another tab/profile on rollback.
function saveTransactionIdentity(){
  return typeof MonsterProfiles!=='undefined' ? `${MonsterProfiles.key(SAVE_KEY)}:${MonsterProfiles.current()?.id||''}` : SAVE_KEY;
}
function captureSaveTransaction(){
  return {raw:JSON.stringify(save),identity:saveTransactionIdentity(),report:JSON.stringify(saveRecoveryReport),
    activeUid:typeof activeInstance!=='undefined'?activeInstance?.uid:null,
    evolutions:typeof pendingEvolutions!=='undefined'?JSON.stringify(pendingEvolutions):null};
}
function rollbackSaveTransaction(snapshot){
  if(snapshot.identity!==saveTransactionIdentity())return false;
  save=JSON.parse(snapshot.raw);
  saveRecoveryReport=JSON.parse(snapshot.report);
  if(typeof activeInstance!=='undefined'&&snapshot.activeUid)activeInstance=save.instances.find(x=>x.uid===snapshot.activeUid)||(activeInstance?.guest?activeInstance:null);
  if(typeof partyBattle!=='undefined')partyBattle.forEach(entry=>{if(entry.inst&&!entry.guest){const restored=save.instances.find(x=>x.uid===entry.inst.uid);if(restored)entry.inst=restored;}});
  if(typeof pendingEvolutions!=='undefined'&&snapshot.evolutions)pendingEvolutions=JSON.parse(snapshot.evolutions);
  for(const refresh of [typeof refreshContractorRankUi==='function'?refreshContractorRankUi:null,typeof updateItems==='function'?updateItems:null]){
    try{refresh?.();}catch(error){console.error('Rollback display refresh failed:',error);}
  }
  return true;
}
function saveTransactionNotice(message){
  try{if(typeof showUiNotice==='function')showUiNotice(message,'error');else alert(message);}
  catch(error){console.error('Save notice failed:',error);}
}
function showCommittedSaveResult(render){
  try{render();}catch(error){saveTransactionNotice('結果は保存済みです。画面を開き直して所持品をご確認ください。');console.error('Committed result display failed:',error);}
}
function commitSaveMutation(mutate,{requireReadable=false}={}){
  const snapshot=captureSaveTransaction();
  try{mutate();if(!saveGame({requireReadable}))throw new Error('save_failed');return true;}
  catch(error){rollbackSaveTransaction(snapshot);saveTransactionNotice('保存できませんでした。今回の消費や取得は確定していません。');console.error('Save transaction failed:',error);return false;}
}
const SAVE_REPLACEMENT_RECOVERY_KEY='mb_v95c_replacement_recovery_v1';
let replacementRecoveryExportedRaw=null;
function readReplacementRecovery(){
  lastSaveError=null;const raw=safeStorageGet(SAVE_REPLACEMENT_RECOVERY_KEY);
  if(lastSaveError)throw new Error('復旧記録を読み取れません。');
  if(!raw)return {raw:null,record:null};
  let record;try{record=JSON.parse(raw);}catch(_error){throw new Error('復旧記録が破損しています。書き出して保管してください。');}
  if(record.version!==1||record.identity!==saveTransactionIdentity()||typeof record.before!=='string'||typeof record.after!=='string'||!(record.backupBefore===null||typeof record.backupBefore==='string')||!['pending','completed','acknowledged'].includes(record.status))throw new Error('復旧記録を確認できません。書き出して保管してください。');
  return {raw,record};
}
function stageReplacementRecovery(before,after){
  const existing=readReplacementRecovery();
  if(existing.record?.status==='pending')throw new Error('未完了の復旧記録があります。セーブ管理から書き出して確認してください。');
  lastSaveError=null;const backupBefore=safeStorageGet(SAVE_BACKUP_KEY);if(lastSaveError)throw new Error('現在のバックアップを読み取れません。');
  const raw=JSON.stringify({version:1,identity:saveTransactionIdentity(),status:'pending',createdAt:new Date().toISOString(),before:before||'',backupBefore,after});
  if(!safeStorageSet(SAVE_REPLACEMENT_RECOVERY_KEY,raw)||safeStorageGet(SAVE_REPLACEMENT_RECOVERY_KEY)!==raw)throw new Error('復旧用データを保管できないため、置換を中止しました。');
  refreshReplacementRecoveryStatus();return raw;
}
function completeReplacementRecovery(raw){
  if(safeStorageGet(SAVE_REPLACEMENT_RECOVERY_KEY)!==raw)return;
  const record=JSON.parse(raw);record.status='completed';
  if(!safeStorageSet(SAVE_REPLACEMENT_RECOVERY_KEY,JSON.stringify(record)))saveTransactionNotice('データの置換は完了しました。復旧記録は未完了表示のまま保管されています。');
  refreshReplacementRecoveryStatus();
}
function replacementRecoveryStatusText(){
  if(soulContractReplacementBlocked)return SOUL_REPLACEMENT_NOTICE;
  try{const {record}=readReplacementRecovery();return !record?'読込・復旧用の保管記録はありません。':record.status==='pending'?'途中で止まった読込があります。セーブ管理で書き出してください。':'読込・復旧記録があります。書き出すとセーブ読込で使えます。';}
  catch(_error){return '読込・復旧記録を確認できません。記録全体を書き出してください。';}
}
function refreshReplacementRecoveryStatus(){
  try{const el=document.getElementById('replacementRecoveryStatus');if(el)el.textContent=replacementRecoveryStatusText();const button=document.getElementById('resumeSoulContractReplacement');if(button){button.hidden=!soulContractReplacementBlocked;button.disabled=!soulContractReplacementExported;}}catch(error){console.error(error);}
}
function exportReplacementRecovery(kind='all'){
  try{
    const raw=safeStorageGet(SAVE_REPLACEMENT_RECOVERY_KEY);
    if(kind==='all'){
      const state=readSoulReplacementBundle();
      if(!state.ok)throw new Error('記録を読み取れません。再読み込みしてから書き出してください。');
      if(state.archive!==null||soulContractReplacementBlocked){
        let archive=null,record=null;
        try{archive=JSON.parse(state.archive);}catch(_error){}
        try{record=raw?JSON.parse(raw):null;}catch(_error){}
        downloadTextFile('monster-battle-replacement-recovery.json',JSON.stringify({...(record||{}),
          soulContractArchive:archive,soulContractArchiveRaw:state.archive,
          currentPrimaryRaw:state.primary,currentRecoveryRaw:state.recovery,replacementRecoveryRaw:raw}));
        soulContractReplacementExported=JSON.stringify(state);
        replacementRecoveryExportedRaw=raw;refreshReplacementRecoveryStatus();return true;
      }
      if(raw){downloadTextFile('monster-battle-replacement-recovery.json',raw);replacementRecoveryExportedRaw=raw;return true;}
    }
    if(!raw){saveTransactionNotice('保管された読込・復旧記録はありません。');return false;}
    if(!['before','after','backupBefore'].includes(kind))return false;
    const {record}=readReplacementRecovery(),candidate=record[kind];
    if(!candidate){saveTransactionNotice('この候補のセーブデータはありません。');return false;}
    downloadTextFile(`monster-battle-recovery-${kind}.json`,candidate);return true;
  }catch(error){saveTransactionNotice(error.message);return false;}
}
function acknowledgeReplacementRecovery(){
  try{
    const {raw,record}=readReplacementRecovery();if(!record)return;
    if(replacementRecoveryExportedRaw!==raw){saveTransactionNotice('先に「読込・復旧データを書き出す」で記録を保管してください。');return;}
    if(!confirm('書き出したファイルを保管しましたか？ 現在のセーブは変更せず、次の読込・復旧を許可します。次回の読込・復旧時にこの記録は置き換わります。'))return;
    if(safeStorageGet(SAVE_REPLACEMENT_RECOVERY_KEY)!==raw)throw new Error('記録が更新されました。もう一度確認してください。');
    record.status='acknowledged';if(!safeStorageSet(SAVE_REPLACEMENT_RECOVERY_KEY,JSON.stringify(record)))throw new Error('確認状態を保存できませんでした。');
    refreshReplacementRecoveryStatus();
  }catch(error){saveTransactionNotice(error.message);}
}
function saveGame({requireBackup=false,requireReadable=false}={}) {
  if(primaryReadFailed||soulContractReplacementBlocked||protectedPrimaryRaw!==null)return false;
  if(typeof MonsterProfiles!=='undefined'&&!MonsterProfiles.beforeSave())return false;
  ensureContractScrollItem();
  syncItemDexFromInventory();
  save.alchemyResonance = normalizeAlchemyResonance(save.alchemyResonance);
  if (typeof normalizeExpeditionSave === 'function') normalizeExpeditionSave();
  repairSave(save, saveRecoveryReport);
  save.saveMeta.lastSavedAt = new Date().toISOString();
  save.saveMeta.integrityHash = saveHash(save);
  const raw=JSON.stringify(save);
  lastSaveError=null;
  const previous=safeStorageGet(SAVE_KEY);
  if(lastSaveError){saveTransactionNotice('現在のセーブを読み取れないため中止しました。');return false;}
  let replacementRecord=null;
  if(requireBackup){try{replacementRecord=stageReplacementRecovery(previous,raw);}catch(error){saveTransactionNotice(error.message);return false;}}
  if(previous&&previous!==rejectedPrimaryRaw){const backedUp=safeStorageSet(SAVE_BACKUP_KEY,previous);if(requireBackup&&!backedUp){saveTransactionNotice('バックアップを保存できないため、データの置換を中止しました。');return false;}}
  if(!safeStorageSet(SAVE_KEY,raw)){
    const message='セーブの保存に失敗しました。端末の空き容量やブラウザ設定を確認し、セーブ管理からデータを書き出してください。';
    saveTransactionNotice(message);
    return false;
  }
  rejectedPrimaryRaw=null;
  if(replacementRecord)completeReplacementRecovery(replacementRecord);
  if(!previous)safeStorageSet(SAVE_BACKUP_KEY,raw);
  if(typeof MonsterProfiles!=='undefined')MonsterProfiles.afterSave(raw);
  return true;
}

function downloadTextFile(filename,text){
  const blob=new Blob([text],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportSaveData(){
  if(primaryReadFailed||soulContractReplacementBlocked||protectedPrimaryRaw!==null||typeof MonsterProfiles!=='undefined'&&MonsterProfiles.available?.()===false){
    const raw=protectedPrimaryRaw??safeStorageGet(SAVE_KEY);
    if(raw!==null)downloadTextFile('monster-battle-original-save.json',raw);
    else if(primaryReadFailed)saveTransactionNotice('元データを読み取れません。再読み込みしてから、セーブ管理で書き出してください。');
    return;
  }
  /* save-result-allow: export-current-save */saveGame();const date=new Date().toISOString().slice(0,10);downloadTextFile(`monster-battle-save-${date}.json`,JSON.stringify(save,null,2));}
function openSaveImport(){document.getElementById('saveImportInput')?.click();}
function replaceSaveExplicitly(replacement,report){
  if(primaryReadFailed||soulContractReplacementBlocked||protectedPrimaryRaw!==null)return false;
  const commit=()=>{
    const snapshot=captureSaveTransaction();
    save=replacement;saveRecoveryReport=report;
    let saved=false;
    try{saved=saveGame({requireBackup:true});}
    catch(error){lastSaveError=error;}
    // Storage can have committed before a profile/UI notification throws.
    if(!saved){
      lastSaveError=null;
      saved=safeStorageGet(SAVE_KEY)===JSON.stringify(save)&&!lastSaveError;
    }
    if(!saved)rollbackSaveTransaction(snapshot);
    return saved;
  };
  return typeof reconcileCharacterGachaRecoveryAfterReplacement==='function'
    ?reconcileCharacterGachaRecoveryAfterReplacement(replacement,commit):commit();
}
async function importSaveData(input){
  const file=input?.files?.[0];if(!file)return;
  const identity=saveTransactionIdentity();
  let persisted=false;
  try{
    const raw=await file.text();const report=[];const imported=parseAndPrepareSave(raw,report);
    if(identity!==saveTransactionIdentity())throw new Error('読み込み中にアカウントが変わったため中止しました。');
    if(!confirm(`セーブデータを読み込みますか？\n個体 ${imported.instances.length}体／コイン ${imported.coins}\n現在のデータはバックアップされます。`))return;
    if(identity!==saveTransactionIdentity())throw new Error('アカウントが変わったため中止しました。');
    if(!await replaceSaveExplicitly(imported,report.concat('ファイルからセーブデータを読込み')))return;
    persisted=true;location.reload();
  }catch(error){saveTransactionNotice(persisted?'読込結果は保存済みです。画面を再読み込みしてください。':`セーブデータを読み込めませんでした。\n${error.message}`);}finally{input.value='';}
}
async function copySaveText(kind='current'){
  const raw=kind==='corrupt'?safeStorageGet(SAVE_CORRUPT_KEY):(safeStorageGet(SAVE_KEY)||JSON.stringify(save));
  if(!raw){alert('コピーできるデータがありません。');return;}
  try{await navigator.clipboard.writeText(raw);alert('セーブデータをクリップボードへコピーしました。');}catch(_error){prompt('下の内容を長押ししてコピーしてください。',raw);}
}
function restoreLastKnownGood(){
  const identity=saveTransactionIdentity(),backup=safeStorageGet(SAVE_BACKUP_KEY);if(!backup){alert('復旧できるバックアップがありません。');return;}
  try{
    const report=[];const restored=parseAndPrepareSave(backup,report);
    if(!confirm('直前の正常なバックアップへ戻しますか？'))return;
    if(identity!==saveTransactionIdentity())throw new Error('アカウントが変わったため中止しました。');
    const finish=saved=>{if(saved){try{location.reload();}catch(_error){saveTransactionNotice('復旧結果は保存済みです。画面を再読み込みしてください。');}}return saved;};
    const result=replaceSaveExplicitly(restored,report.concat('lastKnownGoodから手動復旧'));
    return result?.then?result.then(finish):finish(result);
  }catch(error){saveTransactionNotice(`バックアップを復旧できませんでした。\n${error.message}`);return false;}
}
function showSaveRecoveryReport(){alert(saveRecoveryReport.length?saveRecoveryReport.join('\n'):'修復・移行の記録はありません。');}

function uid()    { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function playerMaxHp() { return activeInstance ? instanceMaxHp(activeInstance) : maxHp(player, 1); }
function enemyMaxHp()  {
  if (Number.isFinite(activeHuntRequest?.enemyHp)) return activeHuntRequest.enemyHp;
  return maxHp(enemy, 1);
}
function insLevel(id) {
  if (activeInstance?.id === id) return activeInstance.level || 1;
  const ins = save.instances.find(x => x.id === id);
  return ins?.level || save.levels?.[id] || 1;
}
function insExp(id) {
  if (activeInstance?.id === id) return activeInstance.exp || 0;
  const ins = save.instances.find(x => x.id === id);
  return ins?.exp || save.exp?.[id] || 0;
}
function caughtHas(id) { return save.instances.some(x => x.id === id) || save.caught.includes(id); }
// One permanent timing offset per monster, shared by every normal evolution stage.
// Old saves use UID only (never form ID), so reload/import cannot reroll the result.
function monsterEvolutionOffset(ins){
  if(by(ins?.id)?.entityKind !== 'monster')return 0;
  if(Number.isInteger(ins.evolutionOffset) && ins.evolutionOffset>=-2 && ins.evolutionOffset<=2)return ins.evolutionOffset;
  let hash=2166136261;
  for(const ch of String(ins.uid||''))hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;
  return hash%5-2;
}
function instanceEvolutionRoutes(ins){
  const mon=by(ins?.id);if(!mon)return [];
  const routes=mon.evolutions || (mon.evolution?[{to:mon.evolution,level:mon.evolutionLevel}]:[]);
  return routes.filter(route=>by(route.to)).map(route=>({
    to:route.to,level:clampLevel(route.level+monsterEvolutionOffset(ins))
  }));
}
function addInstance(id, level=1, exp=0, extraFields=null) {
  const firstRegistration=!save.caught.includes(id);
  const normalizedLevel=clampLevel(level);
  const ins = {uid:uid(), id, level:normalizedLevel, exp:isMaxLevel(normalizedLevel)?0:Math.max(0,Math.floor(Number(exp)||0)), locked:false};
  if(extraFields && typeof extraFields === 'object') Object.assign(ins, extraFields);
  if(by(id)?.entityKind==='monster' && !Number.isInteger(ins.evolutionOffset))ins.evolutionOffset=Math.floor(Math.random()*5)-2;
  if(firstRegistration && isCharacterSaveId(id))ins.locked=true;
  normalizeInstanceSaveFields(ins);
  save.instances.push(ins);
  if (firstRegistration) {
    save.caught.push(id);
    if(typeof grantContractorDexRegistration==='function')grantContractorDexRegistration(id);
  }
  if (typeof ensureInstanceSkills === 'function') {
    ensureInstanceSkills(ins);
    if (typeof grantEquippedSkillCardsForInstance === 'function') grantEquippedSkillCardsForInstance(ins);
  }
  return ins;
}
// Resolve display metadata from trusted definitions, including evolved alchemy forms.
function alchemyArchetypeFor(ins){
  const pending=[ins?.id],visited=new Set();
  while(pending.length){
    const id=pending.shift();
    if(!id || visited.has(id))continue;
    visited.add(id);
    const config=ALCHEMY_MONSTER_CONFIGS[id];
    if(config)return config.archetypes?.find(type=>type.id===ins?.alchemy?.archetypeId) || null;
    M.forEach(mon=>{
      if(mon.evolution===id || (mon.evolutions||[]).some(route=>route.to===id))pending.push(mon.id);
    });
  }
  return null;
}
function normalizeInstanceSaveFields(ins){
  if(!ins || typeof ins !== 'object') return;
  if(typeof ins.locked !== 'boolean') ins.locked = false;
  if(by(ins.id)?.entityKind==='monster')ins.evolutionOffset=monsterEvolutionOffset(ins);
  const config = ALCHEMY_MONSTER_CONFIGS[ins.id];
  if(!config){
    if(ins.alchemy && typeof ins.alchemy==='object' && !Array.isArray(ins.alchemy)){
      ins.alchemy.archetypeLabel=alchemyArchetypeFor(ins)?.label || '不明な錬成タイプ';
    }
    return;
  }
  if(!ins.alchemy || typeof ins.alchemy !== 'object' || Array.isArray(ins.alchemy)) ins.alchemy = {};
  const fallback = config.archetypes?.[0];
  const archetype = config.archetypes?.find(type => type.id === ins.alchemy.archetypeId) || fallback;
  if(archetype){
    if(!ins.alchemy.archetypeId) ins.alchemy.archetypeId = archetype.id;
    ins.alchemy.archetypeLabel = alchemyArchetypeFor(ins)?.label || '不明な錬成タイプ';
    if(!ins.alchemy.statModifiers || typeof ins.alchemy.statModifiers !== 'object' || Array.isArray(ins.alchemy.statModifiers)){
      ins.alchemy.statModifiers = {...archetype.modifiers};
    }else{
      Object.entries(archetype.modifiers).forEach(([stat, value]) => {
        if(ins.alchemy.statModifiers[stat] === undefined) ins.alchemy.statModifiers[stat] = value;
      });
    }
  }
  if(!Array.isArray(ins.alchemy.exclusiveSkillIds) || !ins.alchemy.exclusiveSkillIds.length){
    const mon = by(ins.id);
    ins.alchemy.exclusiveSkillIds = (config.exclusiveMoveIndexes || [])
      .map(index => mon?.moves?.[index])
      .filter(Boolean)
      .map(skillIdFromMove);
  }
}
function getInstance(u) { return save.instances.find(x => x.uid === u) || null; }
function getPartyInstances() {
  return (save.party || []).map(u => getInstance(u)).filter(Boolean);
}
function tutorialDefersInitialParty(){
  const tutorial=currentTutorialState();
  return tutorial.version>=TUTORIAL_VERSION&&!tutorial.starterContractsGranted;
}
function initStarters() {
  if (save.instances.length > 0) {
    // uid・level・expの補完
    save.instances.forEach(ins => {
      if (!ins.uid)   ins.uid   = uid();
      if (!ins.level) ins.level = 1;
      if (ins.exp === undefined) ins.exp = 0;
      normalizeInstanceSaveFields(ins);
    });
    return;
  }
  // 旧データからのマイグレーション
  if (save.caught?.length > 0) {
    save.caught.forEach(id => addInstance(id, save.levels?.[id]||1, save.exp?.[id]||0));
    return;
  }
  // 序章v2では、フレイガル／アクアロンを物語内で受け取るまで初期配布を延期する。
  if(tutorialDefersInitialParty())return;
  // 公開版以前のセーブだけは、従来の初期編成を補完する。
  INITIAL_PARTY_IDS.forEach(id => addInstance(id, 1, 0));
}
function ensureContractScrollItem(){
  if(!save.items)save.items={};
  SHOP_ITEMS.forEach(it=>{
    if(save.items[it.id]==null) save.items[it.id] = 0;
  });
  if(save.items.water_mirror==null) save.items.water_mirror=0;
  if(save.items.doom_fragment==null) save.items.doom_fragment=0;
}
function resetSave() {
  if(primaryReadFailed||soulContractReplacementBlocked||protectedPrimaryRaw!==null||typeof MonsterProfiles!=='undefined'&&MonsterProfiles.available?.()===false)return;
  if (confirm('セーブデータを削除しますか？\n序章の最初から再スタートします。')) {
    const finish=saved=>{if(saved)location.reload();return saved;};
    const result=replaceSaveExplicitly(initSave(),[]);
    return result?.then?result.then(finish):finish(result);
  }
}
