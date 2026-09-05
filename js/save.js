/* ===== セーブ管理 ===== */
const SAVE_KEY = 'mb_v95c';
const SAVE_BACKUP_KEY = `${SAVE_KEY}_lastKnownGood`;
const SAVE_CORRUPT_KEY = `${SAVE_KEY}_corrupt`;
const SAVE_SCHEMA_VERSION = 4;
const CONTRACTOR_SAVE_EXP_CAP = 63700;
let lastSaveError = null;
let saveRecoveryReport = [];

const TUTORIAL_VERSION = 2;
const TUTORIAL_GUIDE_IDS = Object.freeze([
  'threeWay','invasion','kokoroLink','alchemy','expedition','evolutionFusion',
  'skillCards','goldenLand','dex','shopItems','contractorRank'
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

const WORLD_MAP_NAVIGATION_DIFFICULTY_IDS = Object.freeze(['easy','normal','hard','extreme']);
function normalizeWorldMapNavigationState(value){
  const source=isSaveObject(value)?value:{};
  const knownMapIds=new Set((typeof MAPS!=='undefined'&&Array.isArray(MAPS)?MAPS:[]).map(map=>map.id));
  const mapId=typeof source.mapId==='string'&&knownMapIds.has(source.mapId)?source.mapId:null;
  const eventKey=mapId&&typeof source.eventKey==='string'&&/^[a-z0-9_:-]{1,80}$/.test(source.eventKey)?source.eventKey:null;
  const difficultyId=mapId&&WORLD_MAP_NAVIGATION_DIFFICULTY_IDS.includes(source.difficultyId)?source.difficultyId:null;
  return {...source,mapId,eventKey,difficultyId,
    overviewScrollLeft:Math.min(100000,nonNegativeInteger(source.overviewScrollLeft))};
}
function normalizeWorldMapSaveState(value){
  const base=typeof normalizeWorldMapState==='function'
    ?normalizeWorldMapState(value):(isSaveObject(value)?{...value}:{});
  return {...base,navigation:normalizeWorldMapNavigationState(base.navigation)};
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

function initSave() {
  return {
    schemaVersion:SAVE_SCHEMA_VERSION,
    saveMeta:{migrations:['character_first_lock_v1'], lastSavedAt:null, integrityHash:null},
    caught:[], instances:[], levels:{}, exp:{},
    items:{potion:3, water_mirror:0, attack_potion:0, upper_potion:0, contract_scroll:0, silver_contract_scroll:0, gold_contract_scroll:0, rainbow_contract_scroll:0, kilo_data:0, mega_data:0, giga_data:0, doom_fragment:0, fire_orb:0, monster_bone:0, fine_monster_bone:0, magic_crystal:0, fine_magic_crystal:0, metal_ore:0, fine_metal_ore:0, unstable_alchemy_matter:0, fine_unstable_alchemy_matter:0, raptor_feather:0, fine_raptor_feather:0, venom_carapace:0, fine_venom_carapace:0, golden_land_map:0},
    coins:0, alchemyResonance:0, party:[], history:{wins:0, logs:[]}, skillCards:{}, equippedSkills:{}, itemDex:[], mapDex:[],
    expeditions:{completedCount:0, active:[]}, goldenLandMapReady:false,
    contractor:contractorSaveDefaults(),
    worldMap:normalizeWorldMapSaveState(null),
    progress:{chapterId:'prologue', storyFlags:{}, tutorial:tutorialSaveDefaults(), missions:{version:1, states:{}}},
    quarantine:{unknownInstances:[], unknownCaughtIds:[], invalidExpeditions:[]}
  };
}
function normalizeAlchemyResonance(value){return typeof value==='number'&&Number.isFinite(value)&&value>=0?Math.floor(value):0;}
function isSaveObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function safeStorageGet(key){try{return localStorage.getItem(key);}catch(error){lastSaveError=error;return null;}}
function safeStorageSet(key,value){try{localStorage.setItem(key,value);lastSaveError=null;return true;}catch(error){lastSaveError=error;return false;}}
function safeStorageRemove(key){try{localStorage.removeItem(key);return true;}catch(error){lastSaveError=error;return false;}}
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
function repairSave(payload,report=[]){
  const defaults=initSave();payload.schemaVersion=SAVE_SCHEMA_VERSION;
  if(!isSaveObject(payload.saveMeta))payload.saveMeta={...defaults.saveMeta,migrations:[]};
  if(!Array.isArray(payload.saveMeta.migrations))payload.saveMeta.migrations=[];
  if(!isSaveObject(payload.quarantine))payload.quarantine=defaults.quarantine;
  ['unknownInstances','unknownCaughtIds','invalidExpeditions'].forEach(key=>{if(!Array.isArray(payload.quarantine[key]))payload.quarantine[key]=[];});
  const knownMonsterIds=new Set((typeof M!=='undefined'&&Array.isArray(M)?M:[]).map(mon=>mon.id));const canValidateMonsters=knownMonsterIds.size>0;
  const rawInstances=Array.isArray(payload.instances)?payload.instances:[];const seenUids=new Set();payload.instances=[];
  rawInstances.forEach((entry,index)=>{
    if(!isSaveObject(entry)||typeof entry.id!=='string'){report.push(`不正な個体データ${index+1}件目を隔離`);payload.quarantine.unknownInstances.push(entry);return;}
    if(canValidateMonsters&&!knownMonsterIds.has(entry.id)){report.push(`未知のモンスターID ${entry.id} を隔離`);payload.quarantine.unknownInstances.push(entry);return;}
    let instanceUid=typeof entry.uid==='string'&&entry.uid?entry.uid:'';
    if(!instanceUid||seenUids.has(instanceUid)){instanceUid=`repair_${Date.now().toString(36)}_${index.toString(36)}`;report.push('欠損・重複した個体UIDを再発行');}
    seenUids.add(instanceUid);entry.uid=instanceUid;entry.level=clampLevel(nonNegativeInteger(entry.level,1));entry.exp=isMaxLevel(entry.level)?0:nonNegativeInteger(entry.exp);entry.locked=entry.locked===true;
    if(Array.isArray(entry.alchemy?.exclusiveSkillIds))entry.alchemy.exclusiveSkillIds=entry.alchemy.exclusiveSkillIds.map(repairSkillId).filter(x=>typeof x==='string');
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
  payload.history=isSaveObject(payload.history)?payload.history:defaults.history;payload.history.wins=nonNegativeInteger(payload.history.wins);payload.history.logs=Array.isArray(payload.history.logs)?payload.history.logs.filter(x=>typeof x==='string').slice(-30):[];
  payload.skillCards=isSaveObject(payload.skillCards)?payload.skillCards:{};payload.equippedSkills=isSaveObject(payload.equippedSkills)?payload.equippedSkills:{};
  let migratedSkillIds=false;const normalizedSkillCards={};Object.entries(payload.skillCards).forEach(([id,count])=>{const normalizedId=repairSkillId(id);if(normalizedId!==id)migratedSkillIds=true;normalizedSkillCards[normalizedId]=Math.max(nonNegativeInteger(normalizedSkillCards[normalizedId]),nonNegativeInteger(count));});payload.skillCards=normalizedSkillCards;
  Object.keys(payload.equippedSkills).forEach(key=>{if(!seenUids.has(key))delete payload.equippedSkills[key];else payload.equippedSkills[key]=Array.isArray(payload.equippedSkills[key])?payload.equippedSkills[key].filter(x=>typeof x==='string').map(id=>{const normalizedId=repairSkillId(id);if(normalizedId!==id)migratedSkillIds=true;return normalizedId;}):[];});
  if(migratedSkillIds&&!payload.saveMeta.migrations.includes('fixed_skill_ids_v1')){payload.saveMeta.migrations.push('fixed_skill_ids_v1');report.push('旧技IDを固定skillIdへ移行');}
  payload.itemDex=Array.isArray(payload.itemDex)?[...new Set(payload.itemDex.filter(x=>typeof x==='string'))]:[];payload.goldenLandMapReady=payload.goldenLandMapReady===true&&payload.items.golden_land_map>0;
  const knownMapIds=new Set((typeof MAPS!=='undefined'&&Array.isArray(MAPS)?MAPS:[]).map(map=>map.id));const validDistances=new Set(['short','medium','long']);
  payload.mapDex=Array.isArray(payload.mapDex)?[...new Set(payload.mapDex.filter(id=>typeof id==='string'&&(!knownMapIds.size||knownMapIds.has(id))))]:[];
  payload.expeditions=isSaveObject(payload.expeditions)?payload.expeditions:defaults.expeditions;payload.expeditions.completedCount=nonNegativeInteger(payload.expeditions.completedCount);
  const rawExpeditions=Array.isArray(payload.expeditions.active)?payload.expeditions.active:[];
  payload.expeditions.active=rawExpeditions.filter(entry=>{const members=Array.isArray(entry?.memberUids)?[...new Set(entry.memberUids)].filter(value=>seenUids.has(value)):[];const valid=isSaveObject(entry)&&typeof entry.id==='string'&&(!knownMapIds.size||knownMapIds.has(entry.mapId))&&validDistances.has(entry.distanceId)&&members.length>=1&&members.length<=3;if(!valid){payload.quarantine.invalidExpeditions.push(entry);report.push('参照切れの遠征データを隔離');return false;}entry.memberUids=members;entry.requiredWins={short:1,medium:3,long:5}[entry.distanceId];entry.progress=Math.min(entry.requiredWins,nonNegativeInteger(entry.progress));entry.status=entry.status==='complete'?'complete':'active';return true;});
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
function loadSave(){
  const raw=safeStorageGet(SAVE_KEY);if(!raw)return initSave();
  try{const parsed=JSON.parse(raw);if(parsed?.saveMeta?.integrityHash&&parsed.saveMeta.integrityHash!==saveHash(parsed))saveRecoveryReport.push('整合性ハッシュの不一致を検出');const prepared=repairSave(migrateSave(parsed,saveRecoveryReport),saveRecoveryReport);if(!safeStorageGet(SAVE_BACKUP_KEY))safeStorageSet(SAVE_BACKUP_KEY,raw);return prepared;}
  catch(error){safeStorageSet(SAVE_CORRUPT_KEY,raw);const backup=safeStorageGet(SAVE_BACKUP_KEY);if(backup&&typeof confirm==='function'&&confirm('セーブデータが破損しています。直前のバックアップから復旧しますか？')){try{saveRecoveryReport.push('破損データをバックアップから復旧');return parseAndPrepareSave(backup,saveRecoveryReport);}catch(_backupError){}}saveRecoveryReport.push(`破損データを隔離して初期化: ${error.message}`);if(typeof alert==='function')alert('破損したセーブを隔離し、新規データで起動します。メニューの「セーブ管理」から破損内容をコピーできます。');return initSave();}
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

function saveGame() {
  ensureContractScrollItem();
  syncItemDexFromInventory();
  save.alchemyResonance = normalizeAlchemyResonance(save.alchemyResonance);
  if (typeof normalizeExpeditionSave === 'function') normalizeExpeditionSave();
  repairSave(save, saveRecoveryReport);
  save.saveMeta.lastSavedAt = new Date().toISOString();
  save.saveMeta.integrityHash = saveHash(save);
  const raw=JSON.stringify(save);
  const previous=safeStorageGet(SAVE_KEY);
  if(previous)safeStorageSet(SAVE_BACKUP_KEY,previous);
  if(!safeStorageSet(SAVE_KEY,raw)){
    const message='セーブの保存に失敗しました。端末の空き容量やブラウザ設定を確認し、セーブ管理からデータを書き出してください。';
    if(typeof showUiNotice==='function')showUiNotice(message,'error');else if(typeof alert==='function')alert(message);
    return false;
  }
  if(!previous)safeStorageSet(SAVE_BACKUP_KEY,raw);
  return true;
}

function downloadTextFile(filename,text){
  const blob=new Blob([text],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportSaveData(){saveGame();const date=new Date().toISOString().slice(0,10);downloadTextFile(`monster-battle-save-${date}.json`,JSON.stringify(save,null,2));}
function openSaveImport(){document.getElementById('saveImportInput')?.click();}
async function importSaveData(input){
  const file=input?.files?.[0];if(!file)return;
  try{
    const raw=await file.text();const report=[];const imported=parseAndPrepareSave(raw,report);
    if(!confirm(`セーブデータを読み込みますか？\n個体 ${imported.instances.length}体／コイン ${imported.coins}\n現在のデータはバックアップされます。`))return;
    const current=safeStorageGet(SAVE_KEY);if(current)safeStorageSet(SAVE_BACKUP_KEY,current);
    save=imported;saveRecoveryReport=report.concat('ファイルからセーブデータを読込み');
    if(!saveGame())throw lastSaveError||new Error('保存できませんでした。');
    location.reload();
  }catch(error){alert(`セーブデータを読み込めませんでした。\n${error.message}`);}finally{input.value='';}
}
async function copySaveText(kind='current'){
  const raw=kind==='corrupt'?safeStorageGet(SAVE_CORRUPT_KEY):(safeStorageGet(SAVE_KEY)||JSON.stringify(save));
  if(!raw){alert('コピーできるデータがありません。');return;}
  try{await navigator.clipboard.writeText(raw);alert('セーブデータをクリップボードへコピーしました。');}catch(_error){prompt('下の内容を長押ししてコピーしてください。',raw);}
}
function restoreLastKnownGood(){
  const backup=safeStorageGet(SAVE_BACKUP_KEY);if(!backup){alert('復旧できるバックアップがありません。');return;}
  try{const report=[];const restored=parseAndPrepareSave(backup,report);if(!confirm('直前の正常なバックアップへ戻しますか？'))return;save=restored;saveRecoveryReport=report.concat('lastKnownGoodから手動復旧');saveGame();location.reload();}
  catch(error){alert(`バックアップを復旧できませんでした。\n${error.message}`);}
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
function addInstance(id, level=1, exp=0, extraFields=null) {
  const firstRegistration=!save.caught.includes(id);
  const normalizedLevel=clampLevel(level);
  const ins = {uid:uid(), id, level:normalizedLevel, exp:isMaxLevel(normalizedLevel)?0:Math.max(0,Math.floor(Number(exp)||0)), locked:false};
  if(extraFields && typeof extraFields === 'object') Object.assign(ins, extraFields);
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
function normalizeInstanceSaveFields(ins){
  if(!ins || typeof ins !== 'object') return;
  if(typeof ins.locked !== 'boolean') ins.locked = false;
  const config = ALCHEMY_MONSTER_CONFIGS[ins.id];
  if(!config) return;
  if(!ins.alchemy || typeof ins.alchemy !== 'object' || Array.isArray(ins.alchemy)) ins.alchemy = {};
  const fallback = config.archetypes?.[0];
  const archetype = config.archetypes?.find(type => type.id === ins.alchemy.archetypeId) || fallback;
  if(archetype){
    if(!ins.alchemy.archetypeId) ins.alchemy.archetypeId = archetype.id;
    if(!ins.alchemy.archetypeLabel) ins.alchemy.archetypeLabel = archetype.label;
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
  if (confirm('セーブデータを削除しますか？\n序章の最初から再スタートします。')) {
    const current=safeStorageGet(SAVE_KEY);if(current)safeStorageSet(SAVE_BACKUP_KEY,current);
    safeStorageRemove(SAVE_KEY);
    location.reload();
  }
}
