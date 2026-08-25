/* ===== セーブ管理 ===== */
const SAVE_KEY = 'mb_v95c';
const SAVE_BACKUP_KEY = `${SAVE_KEY}_lastKnownGood`;
const SAVE_CORRUPT_KEY = `${SAVE_KEY}_corrupt`;
const SAVE_SCHEMA_VERSION = 1;
let lastSaveError = null;
let saveRecoveryReport = [];

function initSave() {
  return {
    schemaVersion:SAVE_SCHEMA_VERSION,
    saveMeta:{migrations:[], lastSavedAt:null, integrityHash:null},
    caught:[], instances:[], levels:{}, exp:{},
    items:{potion:3, water_mirror:0, attack_potion:0, upper_potion:0, contract_scroll:0, silver_contract_scroll:0, gold_contract_scroll:0, rainbow_contract_scroll:0, kilo_data:0, mega_data:0, giga_data:0, doom_fragment:0, fire_orb:0, monster_bone:0, fine_monster_bone:0, magic_crystal:0, fine_magic_crystal:0, metal_ore:0, fine_metal_ore:0, unstable_alchemy_matter:0, fine_unstable_alchemy_matter:0, raptor_feather:0, fine_raptor_feather:0, venom_carapace:0, fine_venom_carapace:0, golden_land_map:0},
    coins:0, alchemyResonance:0, party:[], history:{wins:0, logs:[]}, skillCards:{}, equippedSkills:{}, itemDex:[],
    expeditions:{completedCount:0, active:[]}, goldenLandMapReady:false,
    progress:{chapterId:'prologue', storyFlags:{}, tutorial:{id:'prologue', version:1, status:'not_started', stepId:null}, missions:{version:1, states:{}}},
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
function migrateSave(payload,report=[]){
  if(!isSaveObject(payload))throw new Error('セーブデータのルートがオブジェクトではありません。');
  let version=Number.isInteger(payload.schemaVersion)?payload.schemaVersion:0;
  if(version>SAVE_SCHEMA_VERSION)throw new Error(`未対応の新しいセーブ形式です（v${version}）。`);
  while(version<SAVE_SCHEMA_VERSION){if(version===0)payload=migrate_v0_to_v1(payload,report);else throw new Error(`v${version}からの移行処理がありません。`);version=payload.schemaVersion;}
  return payload;
}
function nonNegativeInteger(value,fallback=0){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.floor(n):fallback;}
function repairSkillId(value){return typeof value==='string'&&typeof normalizeSkillId==='function'?normalizeSkillId(value):value;}
function repairSave(payload,report=[]){
  const defaults=initSave();payload.schemaVersion=SAVE_SCHEMA_VERSION;
  if(!isSaveObject(payload.saveMeta))payload.saveMeta=defaults.saveMeta;
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
    seenUids.add(instanceUid);entry.uid=instanceUid;entry.level=Math.max(1,nonNegativeInteger(entry.level,1));entry.exp=nonNegativeInteger(entry.exp);entry.locked=entry.locked===true;
    if(Array.isArray(entry.alchemy?.exclusiveSkillIds))entry.alchemy.exclusiveSkillIds=entry.alchemy.exclusiveSkillIds.map(repairSkillId).filter(x=>typeof x==='string');
    payload.instances.push(entry);
  });
  const rawCaught=Array.isArray(payload.caught)?payload.caught:[];
  payload.caught=[...new Set(rawCaught.filter(id=>{const valid=typeof id==='string'&&(!canValidateMonsters||knownMonsterIds.has(id));if(!valid&&typeof id==='string')payload.quarantine.unknownCaughtIds.push(id);return valid;}).concat(payload.instances.map(entry=>entry.id)))];
  payload.levels=isSaveObject(payload.levels)?payload.levels:{};payload.exp=isSaveObject(payload.exp)?payload.exp:{};
  payload.instances.forEach(entry=>{payload.levels[entry.id]=Math.max(nonNegativeInteger(payload.levels[entry.id],1),entry.level);payload.exp[entry.id]=Math.max(nonNegativeInteger(payload.exp[entry.id]),entry.exp);});
  payload.party=[...new Set(Array.isArray(payload.party)?payload.party:[])].filter(value=>seenUids.has(value)).slice(0,3);
  payload.items=isSaveObject(payload.items)?payload.items:{};Object.entries(defaults.items).forEach(([key,value])=>{payload.items[key]=nonNegativeInteger(payload.items[key],value);});Object.keys(payload.items).forEach(key=>{payload.items[key]=nonNegativeInteger(payload.items[key]);});
  payload.coins=nonNegativeInteger(payload.coins);payload.alchemyResonance=normalizeAlchemyResonance(payload.alchemyResonance);
  payload.history=isSaveObject(payload.history)?payload.history:defaults.history;payload.history.wins=nonNegativeInteger(payload.history.wins);payload.history.logs=Array.isArray(payload.history.logs)?payload.history.logs.filter(x=>typeof x==='string').slice(-30):[];
  payload.skillCards=isSaveObject(payload.skillCards)?payload.skillCards:{};payload.equippedSkills=isSaveObject(payload.equippedSkills)?payload.equippedSkills:{};
  let migratedSkillIds=false;const normalizedSkillCards={};Object.entries(payload.skillCards).forEach(([id,count])=>{const normalizedId=repairSkillId(id);if(normalizedId!==id)migratedSkillIds=true;normalizedSkillCards[normalizedId]=Math.max(nonNegativeInteger(normalizedSkillCards[normalizedId]),nonNegativeInteger(count));});payload.skillCards=normalizedSkillCards;
  Object.keys(payload.equippedSkills).forEach(key=>{if(!seenUids.has(key))delete payload.equippedSkills[key];else payload.equippedSkills[key]=Array.isArray(payload.equippedSkills[key])?payload.equippedSkills[key].filter(x=>typeof x==='string').map(id=>{const normalizedId=repairSkillId(id);if(normalizedId!==id)migratedSkillIds=true;return normalizedId;}):[];});
  if(migratedSkillIds&&!payload.saveMeta.migrations.includes('fixed_skill_ids_v1')){payload.saveMeta.migrations.push('fixed_skill_ids_v1');report.push('旧技IDを固定skillIdへ移行');}
  payload.itemDex=Array.isArray(payload.itemDex)?[...new Set(payload.itemDex.filter(x=>typeof x==='string'))]:[];payload.goldenLandMapReady=payload.goldenLandMapReady===true&&payload.items.golden_land_map>0;
  const knownMapIds=new Set((typeof MAPS!=='undefined'&&Array.isArray(MAPS)?MAPS:[]).map(map=>map.id));const validDistances=new Set(['short','medium','long']);
  payload.expeditions=isSaveObject(payload.expeditions)?payload.expeditions:defaults.expeditions;payload.expeditions.completedCount=nonNegativeInteger(payload.expeditions.completedCount);
  const rawExpeditions=Array.isArray(payload.expeditions.active)?payload.expeditions.active:[];
  payload.expeditions.active=rawExpeditions.filter(entry=>{const members=Array.isArray(entry?.memberUids)?[...new Set(entry.memberUids)].filter(value=>seenUids.has(value)):[];const valid=isSaveObject(entry)&&typeof entry.id==='string'&&(!knownMapIds.size||knownMapIds.has(entry.mapId))&&validDistances.has(entry.distanceId)&&members.length>=1&&members.length<=3;if(!valid){payload.quarantine.invalidExpeditions.push(entry);report.push('参照切れの遠征データを隔離');return false;}entry.memberUids=members;entry.requiredWins={short:1,medium:3,long:5}[entry.distanceId];entry.progress=Math.min(entry.requiredWins,nonNegativeInteger(entry.progress));entry.status=entry.status==='complete'?'complete':'active';return true;});
  payload.progress=isSaveObject(payload.progress)?payload.progress:defaults.progress;if(typeof payload.progress.chapterId!=='string')payload.progress.chapterId='prologue';payload.progress.storyFlags=isSaveObject(payload.progress.storyFlags)?payload.progress.storyFlags:{};payload.progress.tutorial=isSaveObject(payload.progress.tutorial)?payload.progress.tutorial:defaults.progress.tutorial;payload.progress.missions=isSaveObject(payload.progress.missions)?payload.progress.missions:defaults.progress.missions;
  return payload;
}
function parseAndPrepareSave(raw,report=[]){const parsed=JSON.parse(raw);if(parsed?.saveMeta?.integrityHash&&parsed.saveMeta.integrityHash!==saveHash(parsed))report.push('整合性ハッシュの不一致を検出');return repairSave(migrateSave(parsed,report),report);}
function loadSave(){
  const raw=safeStorageGet(SAVE_KEY);if(!raw)return initSave();
  try{const parsed=JSON.parse(raw);if(parsed?.saveMeta?.integrityHash&&parsed.saveMeta.integrityHash!==saveHash(parsed))saveRecoveryReport.push('整合性ハッシュの不一致を検出');const prepared=repairSave(migrateSave(parsed,saveRecoveryReport),saveRecoveryReport);if(!safeStorageGet(SAVE_BACKUP_KEY))safeStorageSet(SAVE_BACKUP_KEY,raw);return prepared;}
  catch(error){safeStorageSet(SAVE_CORRUPT_KEY,raw);const backup=safeStorageGet(SAVE_BACKUP_KEY);if(backup&&typeof confirm==='function'&&confirm('セーブデータが破損しています。直前のバックアップから復旧しますか？')){try{saveRecoveryReport.push('破損データをバックアップから復旧');return parseAndPrepareSave(backup,saveRecoveryReport);}catch(_backupError){}}saveRecoveryReport.push(`破損データを隔離して初期化: ${error.message}`);if(typeof alert==='function')alert('破損したセーブを隔離し、新規データで起動します。メニューの「セーブ管理」から破損内容をコピーできます。');return initSave();}
}
let save = loadSave();

/* Ver7.8: ここからはすべてグローバル関数 */
function registerItemDex(itemId){
  if(!ITEM_DEX_BY_ID[itemId]) return;
  if(!Array.isArray(save.itemDex)) save.itemDex = [];
  if(!save.itemDex.includes(itemId)) save.itemDex.push(itemId);
}
function syncItemDexFromInventory(){
  if(!save.items) save.items = {};
  ITEM_DEX_ITEMS.forEach(it => {
    if(Number(save.items[it.id] || 0) > 0) registerItemDex(it.id);
  });
}
syncItemDexFromInventory();

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
  const ins = {uid:uid(), id, level, exp, locked:false};
  if(extraFields && typeof extraFields === 'object') Object.assign(ins, extraFields);
  normalizeInstanceSaveFields(ins);
  save.instances.push(ins);
  if (!save.caught.includes(id)) save.caught.push(id);
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
  // 初回
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
  if (confirm('セーブデータを削除しますか？\nスターターモンスターから再スタートします。')) {
    const current=safeStorageGet(SAVE_KEY);if(current)safeStorageSet(SAVE_BACKUP_KEY,current);
    safeStorageRemove(SAVE_KEY);
    location.reload();
  }
}
