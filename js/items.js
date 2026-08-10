function showShop(){
  show('shop');
}
function renderShop() {
  ensureContractScrollItem();
  const section = document.getElementById('shop');
  if (!section) return;
  section.innerHTML = `
    <h1>🛒 アイテムショップ</h1>
    <p>所持コイン：<span id="coinView">${save.coins||0}</span>枚</p>
    <div id="shopList" class="grid">
      ${SHOP_ITEMS.filter(it => it.shop !== false).map(it => `
        <div class="card">
          <h2>${itemInlineVisual(it)} ${it.name}</h2>
          <p style="font-size:13px;color:#8892b0">${it.desc}</p>
          <p style="color:#ffd740">💰 コイン${it.price}枚</p>
          <p class="small">所持数：${save.items[it.id]||0}個</p>
          <button onclick="buyItem('${it.id}')">購入</button>
        </div>`).join('')}
      <div class="card"><h2>📊 バトル履歴</h2>
        <p style="color:#ffd740">通算勝利数：${save.history.wins||0}勝</p>
        <div>${(save.history.logs||[]).slice(-5).reverse().map(l=>`<div class="history-entry">${l}</div>`).join('') || '<p class="small">まだ履歴がありません。</p>'}</div>
      </div>
    </div>`;
}
function buyItem(id){
  ensureContractScrollItem();
  const it = ITEM_BY_ID[id];
  if(!it){ alert('そのアイテムは購入できません。'); return; }
  if((save.coins||0)<it.price){
    alert('コインが足りない！');
    return;
  }
  save.coins-=it.price;
  save.items[id]=(save.items[id]||0)+1;
  saveGame();
  renderShop();
  updateItems();
}
function itemCount(id){
  ensureContractScrollItem();
  return save.items[id] || 0;
}
function rollAlchemyMaterialDrop(randomFn=Math.random){
  let roll = randomFn();
  for(const entry of ALCHEMY_MATERIAL_DROPS){
    if(roll < entry.rate) return entry.id;
    roll -= entry.rate;
  }
  return null;
}
function grantAlchemyMaterialReward(randomFn=Math.random){
  const itemId = rollAlchemyMaterialDrop(randomFn);
  if(!itemId) return null;
  const item = ITEM_BY_ID[itemId];
  if(!item?.alchemyMaterial) return null;
  ensureContractScrollItem();
  save.items[itemId] = (save.items[itemId]||0) + 1;
  registerItemDex(itemId);
  return item;
}
function itemCountText(){
  ensureContractScrollItem();
  return `💊 回復薬 ${itemCount('potion')}個 / 💉 上回復薬 ${itemCount('upper_potion')}個 / ⚡ 力の薬 ${itemCount('attack_potion')}個 / 📜 契約書 ${itemCount('contract_scroll')}枚 / 📃 銀の契約書 ${itemCount('silver_contract_scroll')}枚 / 📒 金の契約書 ${itemCount('gold_contract_scroll')}枚 / 🌈 虹の契約書 ${itemCount('rainbow_contract_scroll')}枚`;
}
function updateItemText() {
  const el = document.getElementById('itemText');
  if (el) el.textContent = itemCountText();
}
function updateItems(){
  ensureContractScrollItem();
  updateItemText();
  const itemScreen = document.getElementById('battleItemSelect');
  if(itemScreen && itemScreen.classList.contains('active')) renderBattleItemSelect();
  const partyScreen = document.getElementById('party');
  if(partyScreen && partyScreen.classList.contains('active')) renderParty();
  const shopScreen = document.getElementById('shop');
  if(shopScreen && shopScreen.classList.contains('active')) renderShop();
  const gachaScreen = document.getElementById('itemGacha');
  if(gachaScreen && gachaScreen.classList.contains('active')) renderItemGacha();
}
function getDataItems(){
  return SHOP_ITEMS.filter(it => it.expItem);
}
function showItemGacha(){
  show('itemGacha');
}
function renderItemGacha(){
  ensureContractScrollItem();
  const coin = document.getElementById('gachaCoinView');
  if(coin) coin.textContent = save.coins || 0;
  const result = document.getElementById('gachaResult');
  if(result && !result.innerHTML) result.innerHTML = '🎰 ボタンを押すとアイテムガチャを回せます。';
  const rateList = document.getElementById('gachaRateList');
  if(rateList){
    const total = ITEM_GACHA_POOL.reduce((sum,x)=>sum+x.weight,0);
    rateList.innerHTML = ITEM_GACHA_POOL.map(entry => {
      const it = ITEM_BY_ID[entry.id];
      const rate = entry.weight / total * 100;
      return `<div class="card"><h2>${itemInlineVisual(it)} ${it.name}</h2><p class="small">排出率：約${rate.toFixed(1)}%</p><p class="small">所持数：${save.items[it.id]||0}個</p></div>`;
    }).join('');
  }
}
function pickGachaItem(){
  const total = ITEM_GACHA_POOL.reduce((sum,x)=>sum+x.weight,0);
  let r = Math.random() * total;
  for(const entry of ITEM_GACHA_POOL){
    r -= entry.weight;
    if(r <= 0) return entry.id;
  }
  return ITEM_GACHA_POOL[ITEM_GACHA_POOL.length-1].id;
}
function rollItemGacha(){
  ensureContractScrollItem();
  if((save.coins||0) < ITEM_GACHA_COST){
    alert('コインが足りない！');
    return;
  }
  save.coins -= ITEM_GACHA_COST;
  const itemId = pickGachaItem();
  const it = ITEM_BY_ID[itemId];
  save.items[itemId] = (save.items[itemId]||0) + 1;
  saveGame();
  const result = document.getElementById('gachaResult');
  if(result) result.innerHTML = `🎰 ガチャを回した！<br>✨ ${itemInlineVisual(it)} ${it.name}を入手！`;
  updateItems();
  renderItemGacha();
}
function useExpItemOnInstance(itemId, uidValue){
  ensureContractScrollItem();
  const it = ITEM_BY_ID[itemId];
  if(!it || !it.expItem){ alert('そのアイテムは経験値アイテムではありません。'); return; }
  if((save.items[itemId]||0) <= 0){ alert(`${it.name}を持っていない！`); return; }
  const ins = getInstance(uidValue);
  if(!ins){ alert('対象のモンスターが見つかりません。'); return; }
  const mon = by(ins.id);
  save.items[itemId]--;
  ins.exp = (ins.exp||0) + it.expAmount;
  let msg = `${it.icon || '📦'} ${it.name}を${mon.name}に与えた！\nEXP +${it.expAmount}`;
  while(ins.exp >= needExp(ins.level)){
    ins.exp -= needExp(ins.level);
    ins.level++;
    msg += `\n${mon.name}は Lv.${ins.level} に上がった！`;
  }
  checkEvolution(ins);
  saveGame();
  renderParty();
  alert(msg);
  if(pendingEvolutions.length) processNextEvolution();
}
function openBattleItemSelect() { updateItems(); show('battleItemSelect'); }
function renderBattleItemSelect(){
  ensureContractScrollItem();
  const list=document.getElementById('battleItemList');
  if(!list)return;
  list.innerHTML = SHOP_ITEMS.filter(it=>it.usableInBattle).map(it=>`
    <div class="item-card">
      <h2>${itemInlineVisual(it)} ${it.name} ×${save.items[it.id]||0}</h2>
      <p>${it.battleDesc || it.desc}</p>
      <button onclick="${it.contract ? `askUseContractScroll('${it.id}')` : `useBattleItemFromMenu('${it.id}')`}">使う</button>
    </div>`).join('');
}
function useBattleItemFromMenu(id){
  useBattleItem(id);
}
function useBattleItem(id) {
  ensureContractScrollItem();
  if(ITEM_BY_ID[id]?.contract) { askUseContractScroll(id); return; }
  const it = ITEM_BY_ID[id];
  if(!it){ alert('そのアイテムは使えません。'); return; }
  if (!player || !enemy) { alert('バトル中だけ使えます。'); return; }
  if ((save.items[id]||0) <= 0) { alert(`${it.name}を持っていない！`); return; }

  let msg = '';
  if (id === 'potion') {
    const healing = adjustedBattleHealing(50);
    const h = Math.min(healing, playerMaxHp()-pHp);
    if (h <= 0) { alert('HPは満タンです。'); return; }
    save.items[id]--;
    pHp = Math.min(playerMaxHp(), pHp+healing);
    if (partyBattle[activePartyIdx]) partyBattle[activePartyIdx].hp = pHp;
    msg = `💊 回復薬を使った！ HPが${h}回復した！`;
  } else if (id === 'upper_potion') {
    const healing = adjustedBattleHealing(120);
    const h = Math.min(healing, playerMaxHp()-pHp);
    if (h <= 0) { alert('HPは満タンです。'); return; }
    save.items[id]--;
    pHp = Math.min(playerMaxHp(), pHp+healing);
    if (partyBattle[activePartyIdx]) partyBattle[activePartyIdx].hp = pHp;
    msg = `💉 上回復薬を使った！ HPが${h}回復した！`;
  } else if (id === 'attack_potion') {
    save.items[id]--;
    pAtk = 2;
    msg = `⚡ 力の薬を使った！ ${player.name}の攻撃力が2倍になった！`;
  }
  saveGame(); updateItems(); update();
  show('battle');
  const log = document.getElementById('log');
  if(log) log.innerHTML = msg;
}
function chooseDefaultContractItem(){
  ensureContractScrollItem();
  if((save.items.rainbow_contract_scroll||0)>0) return 'rainbow_contract_scroll';
  if((save.items.gold_contract_scroll||0)>0) return 'gold_contract_scroll';
  if((save.items.silver_contract_scroll||0)>0) return 'silver_contract_scroll';
  if((save.items.contract_scroll||0)>0) return 'contract_scroll';
  return 'contract_scroll';
}
function askUseContractScroll(itemId){
  ensureContractScrollItem();
  // ① 契約書0枚チェック
  const hasAny = SHOP_ITEMS.filter(it => it.contract).some(it => (save.items[it.id]||0) > 0);
  if(!hasAny){
    alert('契約書を持っていません。ショップで購入してください。');
    show('battle');
    return;
  }
  pendingContractItemId = ITEM_BY_ID[itemId]?.contract ? itemId : chooseDefaultContractItem();
  const it = ITEM_BY_ID[pendingContractItemId] || ITEM_BY_ID.contract_scroll;
  const title = document.querySelector('#contractConfirm h1');
  if(title) title.innerHTML = `${itemInlineVisual(it)} ${it.name}`;
  refreshContractScrollDisplay();
  show('contractConfirm');
  setTimeout(refreshContractScrollDisplay,0);
}
function useContractScrollConfirmed(){
  ensureContractScrollItem();
  const itemId = ITEM_BY_ID[pendingContractItemId]?.contract ? pendingContractItemId : chooseDefaultContractItem();
  const it = ITEM_BY_ID[itemId] || ITEM_BY_ID.contract_scroll;
  if(!enemy){
    alert('契約できる相手がいません。');
    show('battle');
    return;
  }
  if((save.items[itemId]||0)<=0){
    alert(`${it.name}を持っていない！ショップで購入してください。`);
    refreshContractScrollDisplay();
    show('battle');
    return;
  }
  save.items[itemId]--;
  saveGame();
  updateItems();
  refreshContractScrollDisplay();
  tryContractWithScroll(itemId);
}
function tryContractWithScroll(itemId='contract_scroll'){
  ensureContractScrollItem();
  const it = ITEM_BY_ID[itemId] || ITEM_BY_ID.contract_scroll;
  if(!enemy){
    alert('契約できる相手がいません。');
    show('battle');
    return;
  }
  const baseRate = enemy.catchRate ?? 0.25;
  const rate = Math.min(0.95, baseRate * (it.catchMultiplier || 1));
  const ok = Math.random() < rate;
  const logBox = document.getElementById('log');

  if(ok){
    pStatus = null; eStatus = null;
    pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
    pFlareCharge = false; eFlareCharge = false;
    pAquaShield = false; eAquaShield = false;
    addInstance(enemy.id);
    saveGame();
    updateItems();
    renderParty();
    renderDex();
    if(logBox)logBox.innerHTML=`${it.name}を使用した！<br>${enemy.name}との契約に成功した！<br>${enemy.name}が手持ちに加わった！<br>次のバトルへ進みます。`;
    alert(`${enemy.name}と契約した！`);
    refreshContractScrollDisplay();
    goNextBattleAfterContract();
    return;
  }

  saveGame();
  if(logBox)logBox.innerHTML=`${it.name}を使用した！<br>しかし、${enemy.name}との契約には失敗した……`;
  alert('契約できなかった……');
  updateItems();
  refreshContractScrollDisplay();
  show('battle');
}
function tryCatch(){ askUseContractScroll(); }
function catchEnemy(){ askUseContractScroll(); }
function contractEnemy(){ askUseContractScroll(); }
function goNextBattleAfterContract(){
  updateItems();
  renderParty();
  renderDex();
  // ③ パーティーを維持したまま次の敵選択へ
  if(typeof prepareBattleParty==='function') prepareBattleParty();
  if(typeof showBattleChoices==='function'){
    showBattleChoices();
  }else{
    show('battleChoices');
  }
}
function refreshContractScrollDisplay(){
  ensureContractScrollItem();
  const it = ITEM_BY_ID[pendingContractItemId] || ITEM_BY_ID.contract_scroll;
  const contractItems = SHOP_ITEMS.filter(item => item.contract);
  const contractStockText = contractItems
    .map(item => `${itemInlineVisual(item)}${item.name}：${save.items[item.id] || 0}枚`)
    .join(' / ');

  const confirmText=document.getElementById('contractConfirmText');
  if(confirmText)confirmText.textContent=`${it.name}を使用しますか？ 所持数：${save.items[it.id]||0}　${contractStockText}`;

  updateItemText();

  const itemList=document.getElementById('battleItemList');
  const itemScreen=document.getElementById('battleItemSelect');
  if(itemList && itemScreen && itemScreen.classList.contains('active') && typeof renderBattleItemSelect==='function'){
    renderBattleItemSelect();
  }
}
