/* ===== セーブ管理 ===== */
function initSave() {
  return {
    caught:[], instances:[], levels:{}, exp:{},
    items:{potion:3, water_mirror:0, attack_potion:0, upper_potion:0, contract_scroll:0, silver_contract_scroll:0, gold_contract_scroll:0, rainbow_contract_scroll:0, kilo_data:0, mega_data:0, giga_data:0, doom_fragment:0, fire_orb:0},
    coins:0, party:[], history:{wins:0, logs:[]}, skillCards:{}, equippedSkills:{}, itemDex:[]
  };
}
let save = JSON.parse(localStorage.getItem('mb_v95c') || 'null') || initSave();
// マイグレーション
['potion','water_mirror','attack_potion','upper_potion','contract_scroll','silver_contract_scroll','gold_contract_scroll','rainbow_contract_scroll','kilo_data','mega_data','giga_data','doom_fragment','fire_orb'].forEach(k => {
  if (!save.items) save.items = {};
  if (save.items[k] === undefined) save.items[k] = k === 'potion' ? 3 : 0;
});
if (!save.party)   save.party   = [];
if (!save.history) save.history = {wins:0, logs:[]};
if (!save.instances) save.instances = [];
if (!save.skillCards) save.skillCards = {};
if (!save.equippedSkills) save.equippedSkills = {};
if (!Array.isArray(save.itemDex)) save.itemDex = [];

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
  localStorage.setItem('mb_v95c', JSON.stringify(save));
}

function uid()    { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function playerMaxHp() { return maxHp(player, activeInstance?.level || 1); }
function enemyMaxHp()  { return maxHp(enemy, 1); }
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
function addInstance(id, level=1, exp=0) {
  const ins = {uid:uid(), id, level, exp};
  save.instances.push(ins);
  if (!save.caught.includes(id)) save.caught.push(id);
  if (typeof ensureInstanceSkills === 'function') ensureInstanceSkills(ins);
  return ins;
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
    });
    return;
  }
  // 旧データからのマイグレーション
  if (save.caught?.length > 0) {
    save.caught.forEach(id => addInstance(id, save.levels?.[id]||1, save.exp?.[id]||0));
    return;
  }
  // 初回
  ['elna_beginner','freigal','aquaron','grassbeat','volteck'].forEach(id => addInstance(id, 1, 0));
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
    localStorage.removeItem('mb_v95c');
    location.reload();
  }
}
