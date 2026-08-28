function showShop(){
  show('shop');
}
function renderShop() {
  ensureContractScrollItem();
  const section = document.getElementById('shop');
  if (!section) return;
  section.innerHTML = `
    <div class="ui-page-heading"><span class="ui-eyebrow">ITEM SHOP</span><h1>アイテムショップ</h1><p>冒険と育成に必要なアイテムを購入できます。</p></div>
    <p class="ui-coin-balance">所持コイン <strong id="coinView">${save.coins||0}</strong>枚</p>
    <div id="shopList" class="grid">
      ${SHOP_ITEMS.filter(it => it.shop !== false).map(it => `
        <article class="shop-item-card">
          <h2>${itemInlineVisual(it)} ${it.name}</h2>
          <p>${it.desc}</p>
          <strong>💰 ${it.price}枚</strong>
          <p class="small">所持数：${save.items[it.id]||0}個</p>
          <button onclick="buyItem('${it.id}')">購入</button>
        </article>`).join('')}
      <details class="shop-history"><summary>📊 バトル履歴・通算${save.history.wins||0}勝</summary>
        <div>${(save.history.logs||[]).slice(-5).reverse().map(l=>`<div class="history-entry">${l}</div>`).join('') || '<p class="small">まだ履歴がありません。</p>'}</div>
      </details>
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
function useGoldenLandMap(){
  ensureContractScrollItem();
  if(goldenLandMapIsReady()){alert('すでに黄金郷への地図を使用しています。黄金郷へ出発するまで追加では使えません。');return;}
  if((save.items.golden_land_map||0)<=0){alert('黄金郷への地図を持っていません。');return;}
  if(!reserveGoldenLandMap())return;
  saveGame();
  alert('黄金郷への地図を使用した！\n次の討伐依頼候補に黄金郷が確定で出現します。\n地図は黄金郷へ出発した時に消費されます。');
  if(typeof renderItemDex==='function')renderItemDex();
  if(typeof showItemDexDetail==='function')showItemDexDetail('golden_land_map');
}
function updateItemText() {
  const el = document.getElementById('itemText');
  if (el) el.textContent = itemCountText();
}
function updateItems(){
  ensureContractScrollItem();
  updateItemText();
  if(typeof renderBattleItemButton==='function')renderBattleItemButton();
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
  if(result){result.innerHTML = `🎰 ガチャを回した！<br>✨ ${itemInlineVisual(it)} ${it.name}を入手！`;if(typeof replayUiMotion==='function')replayUiMotion(result,'ui-reward-pop',850);}
  if(typeof showUiNotice==='function')showUiNotice(`${it.name}を入手！`);
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
  if(isMaxLevel(ins.level)){ins.level=MAX_LEVEL;ins.exp=0;alert(`${mon.name}はすでに Lv.MAX です！`);return;}
  save.items[itemId]--;
  ins.exp = (ins.exp||0) + it.expAmount;
  let msg = `${it.icon || '📦'} ${it.name}を${mon.name}に与えた！\nEXP +${it.expAmount}`;
  while(!isMaxLevel(ins.level) && ins.exp >= needExp(ins.level)){
    ins.exp -= needExp(ins.level);
    ins.level++;
    msg += `\n${mon.name}は Lv.${ins.level} に上がった！`;
  }
  if(isMaxLevel(ins.level))ins.exp=0;
  checkEvolution(ins);
  saveGame();
  renderParty();
  alert(msg);
  if(pendingEvolutions.length) processNextEvolution();
}
function openBattleItemSelect() {
  if(typeof closeBattleSkillPanel==='function')closeBattleSkillPanel();
  document.getElementById('kokoroLinkPanel')?.classList.add('hidden');
  updateItems();
  show('battleItemSelect');
}
function renderBattleItemSelect(){
  ensureContractScrollItem();
  const list=document.getElementById('battleItemList');
  if(!list)return;
  list.innerHTML = SHOP_ITEMS.filter(it=>it.usableInBattle&&!it.contract).map(it=>`
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
  if(ITEM_BY_ID[id]?.contract) { alert('契約書は敵を倒した後に使用できます。'); show('battle'); return; }
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
  if(multiBattle?.active && !multiBattle.finished){
    alert('複数陣営バトルでは、戦闘終了後に倒した相手と契約できます。');
    show('battle');
    return;
  }
  if(!multiBattle?.active && (!battleRewardGranted || singleBattleContractAttempted)){
    alert(singleBattleContractAttempted?'この相手への契約判定は完了しています。':'契約書は敵を倒した後に使用できます。');
    show('battle');
    return;
  }
  if(enemy && !isContractableUnit(enemy)){
    alert(`${enemy.name}は契約対象ではありません。`);
    show('battle');
    return;
  }
  ensureContractScrollItem();
  const tutorialOffer=typeof shouldGuaranteeTutorialContract==='function'&&shouldGuaranteeTutorialContract(enemy,'contract_scroll');
  // ① 契約書0枚チェック
  const hasAny = tutorialOffer||SHOP_ITEMS.filter(it => it.contract).some(it => (save.items[it.id]||0) > 0);
  if(!hasAny){
    alert('契約書を持っていません。ショップで購入してください。');
    show('battle');
    return;
  }
  pendingContractItemId = tutorialOffer?'contract_scroll':ITEM_BY_ID[itemId]?.contract ? itemId : chooseDefaultContractItem();
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
  const tutorialGuarantee=typeof shouldGuaranteeTutorialContract==='function'&&shouldGuaranteeTutorialContract(enemy,itemId);
  if(multiBattle?.active && multiBattle.finished && pendingMultiBattleContractId){
    useMultiBattleContractScroll(itemId);
    return;
  }
  if(!isContractableUnit(enemy)){
    alert('契約できる相手がいません。');
    show('battle');
    return;
  }
  if(!tutorialGuarantee&&(save.items[itemId]||0)<=0){
    alert(`${it.name}を持っていない！ショップで購入してください。`);
    refreshContractScrollDisplay();
    show('battle');
    return;
  }
  if(!tutorialGuarantee){
    save.items[itemId]--;
    saveGame();
    updateItems();
    refreshContractScrollDisplay();
  }
  tryContractWithScroll(itemId,{tutorialGuarantee});
}
async function tryContractWithScroll(itemId='contract_scroll',{tutorialGuarantee=false}={}){
  ensureContractScrollItem();
  const it = ITEM_BY_ID[itemId] || ITEM_BY_ID.contract_scroll;
  if(!isContractableUnit(enemy)){
    alert('契約できる相手がいません。');
    show('battle');
    return;
  }
  const guaranteed=tutorialGuarantee&&typeof shouldGuaranteeTutorialContract==='function'&&shouldGuaranteeTutorialContract(enemy,itemId);
  const baseRate = enemy.catchRate ?? 0.25;
  const rate = Math.min(0.95, baseRate * (it.catchMultiplier || 1));
  const roll = guaranteed?0:Math.random();
  const animationStage = guaranteed?3:contractAnimationStage(roll, rate);
  const ok = animationStage === 3;
  const logBox = document.getElementById('log');
  singleBattleContractAttempted = true;

  show('battle');
  busy = true;

  if(ok){
    pStatus = null; eStatus = null;
    pPoisonTurns = 0; ePoisonTurns = 0;
    pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
    pFlareCharge = false; eFlareCharge = false;
    pAquaShield = false; eAquaShield = false;
    const joinedInstance=guaranteed&&typeof commitTutorialFirstContract==='function'
      ? commitTutorialFirstContract(itemId,enemy)
      : addInstance(enemy.id);
    if(!joinedInstance){
      singleBattleContractAttempted=false;busy=false;
      if(typeof showUiNotice==='function')showUiNotice('契約状態を保存できませんでした。もう一度お試しください。','error');
      show('contractConfirm');
      return;
    }
    if(!guaranteed){
      if(typeof grantContractorContractSuccess==='function')grantContractorContractSuccess(enemy.id);
      saveGame();
    }else if(typeof handleTutorialContractCommitted==='function')handleTutorialContractCommitted();
    await playContractAnimation({monsterName:enemy.name, stage:animationStage});
    updateItems();
    renderParty();
    renderDex();
    if(logBox)logBox.innerHTML+=`${logBox.innerHTML?'<br>':''}🤝 ${it.name}を使い、${enemy.name}との契約に成功した！<br>${enemy.name}が手持ちに加わった！`;
    refreshContractScrollDisplay();
    busy = false;
    show('battle');
    renderSingleBattleContractPanel();
    if(guaranteed&&typeof handleTutorialContractAnimationComplete==='function')handleTutorialContractAnimationComplete();
    return;
  }

  saveGame();
  await playContractAnimation({monsterName:enemy.name, stage:animationStage});
  if(logBox)logBox.innerHTML+=`${logBox.innerHTML?'<br>':''}📜 ${it.name}を使ったが、${enemy.name}との契約には失敗した……`;
  updateItems();
  refreshContractScrollDisplay();
  busy = false;
  show('battle');
  renderSingleBattleContractPanel();
}
function tryCatch(){ askUseContractScroll(); }
function catchEnemy(){ askUseContractScroll(); }
function contractEnemy(){ askUseContractScroll(); }
function renderSingleBattleContractPanel(){
  const actions=document.getElementById('battleOutcomeActions');
  if(!actions||multiBattle?.active||!battleRewardGranted)return;
  if(!isContractableUnit(enemy)){
    actions.innerHTML='<div class="multi-contract-panel"><h3>🤝 契約</h3><p class="small">この相手とは契約できません。</p></div>';
    return;
  }
  if(singleBattleContractAttempted){
    actions.innerHTML='<div class="multi-contract-panel"><h3>🤝 契約</h3><p class="small">この相手への契約判定は完了しました。</p></div>';
    return;
  }
  const hasScroll=SHOP_ITEMS.some(item=>item.contract&&(save.items[item.id]||0)>0);
  actions.innerHTML=`<div class="multi-contract-panel"><h3>🤝 契約候補</h3>${hasScroll?`<button onclick="askUseContractScroll()">${enemy.name}と契約</button>`:'<p class="small">契約書を持っていません。</p>'}</div>`;
}
function refreshContractScrollDisplay(){
  ensureContractScrollItem();
  const it = ITEM_BY_ID[pendingContractItemId] || ITEM_BY_ID.contract_scroll;
  const contractItems = SHOP_ITEMS.filter(item => item.contract);
  const contractStockText = contractItems
    .map(item => `${itemInlineVisual(item)}${item.name}：${save.items[item.id] || 0}枚`)
    .join(' / ');

  const confirmText=document.getElementById('contractConfirmText');
  const tutorialOffer=typeof shouldGuaranteeTutorialContract==='function'&&shouldGuaranteeTutorialContract(enemy,it.id);
  if(confirmText)confirmText.textContent=tutorialOffer
    ? 'チュートリアル用の通常契約書を1枚支給し、この契約で1枚消費します。最初のスライムとの契約は必ず成功します。'
    : `${it.name}を使用しますか？ 所持数：${save.items[it.id]||0}　${contractStockText}`;

  updateItemText();

  const itemList=document.getElementById('battleItemList');
  const itemScreen=document.getElementById('battleItemSelect');
  if(itemList && itemScreen && itemScreen.classList.contains('active') && typeof renderBattleItemSelect==='function'){
    renderBattleItemSelect();
  }
}
