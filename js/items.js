function itemsNotice(message,kind='warning'){
  if(typeof showUiNotice==='function')showUiNotice(message,kind);
}
function shopPurchaseLimit(item,coins=save.coins||0){
  if(!item||item.shop===false||!Number.isSafeInteger(item.price)||item.price<0)return 0;
  return item.price===0?99:Math.max(0,Math.min(99,Math.floor(coins/item.price)));
}
function showShop(){
  show('shop');
}
function renderShop() {
  ensureContractScrollItem();
  const section = document.getElementById('shop');
  if (!section) return;
  const coins=Number(save.coins||0);
  const storyShop=typeof ProloguePart2Events!=='undefined'?ProloguePart2Events.shopReturnMarkup():'';
  const step=typeof tutorialCurrentStepId==='function'?tutorialCurrentStepId():null;
  const directBuy=storyShop||['shop_buy','shop_use'].includes(step);
  section.innerHTML = `
    <div class="ui-page-heading"><span class="ui-eyebrow">ITEM SHOP</span><h1>アイテムショップ</h1></div>
    <p class="ui-coin-balance">所持コイン <strong id="coinView">${coins.toLocaleString('ja-JP')}</strong>枚</p>
    ${storyShop}
    <div id="shopList" class="grid">
      ${SHOP_ITEMS.filter(it => it.shop !== false).map(it => `
        <article class="shop-item-card">
          <h2>${itemInlineVisual(it)} ${it.name}</h2>
          <p>${it.desc}</p>
          <strong>💰 ${it.price}枚</strong>
          <p class="small">所持数：${save.items[it.id]||0}個</p>
          <button type="button" data-shop-buy="${it.id}" onclick="${directBuy?'buyItem':'openShopQuantity'}('${it.id}')">購入</button>
        </article>`).join('')}
      ${renderItemSellSection()}
      <details class="shop-history"><summary>📊 バトル履歴・通算${save.history.wins||0}勝</summary>
        <div>${(save.history.logs||[]).slice(-5).reverse().map(l=>`<div class="history-entry">${escapeGameHtml(l)}</div>`).join('') || '<p class="small">まだ履歴がありません。</p>'}</div>
      </details>
    </div>`;
  // The same saved balance drives both displays on entry and on a redraw
  // after a committed purchase or sale, without replaying header side effects.
  if(typeof updateAppCoinBalance==='function')updateAppCoinBalance(coins);
}
function buyItem(id,quantity=1){
  ensureContractScrollItem();
  const item=ITEM_BY_ID[id];
  if(!item||item.shop===false||!Number.isSafeInteger(item.price)||item.price<0||!Number.isSafeInteger(quantity)||quantity<1||quantity>99){
    itemsNotice('そのアイテムは購入できません。');return false;
  }
  if(quantity>shopPurchaseLimit(item)){itemsNotice('コインが足りません。');return false;}
  if(!commitSaveMutation(()=>{
    save.coins-=item.price*quantity;
    save.items[id]=(save.items[id]||0)+quantity;
    if(typeof ProloguePart2Events!=='undefined')ProloguePart2Events.recordShopPurchase();
  }))return false;
  showCommittedSaveResult(()=>{renderShop();updateItems();itemsNotice(`${item.name}を${quantity}個買った！`,'success');});
  return true;
}
function renderItemSellSection(){
  const count=Number(save.items?.gold_dust||0),item=ITEM_BY_ID.gold_dust;
  if(count<1||item?.sellPrice!==100)return '';
  return `<section class="shop-item-card"><h2>売る</h2><p>砂金：${count}個／1個100コイン</p><button onclick="sellGoldDust(false)">1個売る</button><button onclick="sellGoldDust(true)">全部売る</button></section>`;
}
let goldSalePending=false;
async function sellGoldDust(all=false){
  if(goldSalePending)return false;
  const owner=save,identity=itemsIdentity(),count=Number(save.items?.gold_dust||0),quantity=all?count:1;
  if(!Number.isSafeInteger(count)||count<1||ITEM_BY_ID.gold_dust?.sellPrice!==100)return false;
  const coins=quantity*100;
  if(!Number.isSafeInteger(coins)||!Number.isSafeInteger((save.coins||0)+coins))return false;
  goldSalePending=true;
  try{
    if(!await gameConfirm({title:'砂金を売る',body:`砂金を${quantity}個、${coins}コインで売りますか？`,okLabel:'売る',cancelLabel:'キャンセル'}))return false;
    if(save!==owner||itemsIdentity()!==identity||Number(save.items?.gold_dust||0)!==count||
       !Number.isSafeInteger((save.coins||0)+coins))return false;
    if(!commitSaveMutation(()=>{save.items.gold_dust-=quantity;save.coins=(save.coins||0)+coins;}))return false;
    showCommittedSaveResult(()=>{renderShop();updateItems();itemsNotice(`砂金を${quantity}個売った！`,'success');});
    return true;
  }finally{goldSalePending=false;}
}
function useStrongIncense(){
  ensureContractScrollItem();
  const remaining=save.strongIncenseRemainingDepartures||0;
  if(remaining>0){itemsNotice(`まだ香りが残っている（残り${remaining}回）`);return false;}
  if((save.items.strong_incense||0)<1){itemsNotice('強者の香を持っていません。');return false;}
  if(!commitSaveMutation(()=>{save.items.strong_incense--;save.strongIncenseRemainingDepartures=10;}))return false;
  showCommittedSaveResult(()=>{itemsNotice('強者の香を使った！ 世界地図からの出発10回に効果があります。','success');if(typeof renderItemDex==='function')renderItemDex();if(typeof showItemDexDetail==='function')showItemDexDetail('strong_incense');});
  return true;
}
function itemCount(id){
  ensureContractScrollItem();
  return save.items[id] || 0;
}
function rollAlchemyMaterialDrop(randomFn=Math.random,bonus=0){
  const total=ALCHEMY_MATERIAL_DROPS.reduce((sum,entry)=>sum+entry.rate,0);
  const multiplier=total>0?Math.min(1,total+Math.max(0,bonus))/total:1;
  let roll = randomFn()/multiplier;
  for(const entry of ALCHEMY_MATERIAL_DROPS){
    if(roll < entry.rate) return entry.id;
    roll -= entry.rate;
  }
  return null;
}
function grantAlchemyMaterialReward(randomFn=Math.random){
  const bonus=typeof partyTraitBonus==='function'?partyTraitBonus(['appraiser','scavenger']):0;
  const itemId = rollAlchemyMaterialDrop(randomFn,bonus);
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
  if(goldenLandMapIsReady()){itemsNotice('すでに黄金郷への地図を使用しています。黄金郷へ出発するまで追加では使えません。');return;}
  if((save.items.golden_land_map||0)<=0){itemsNotice('黄金郷への地図を持っていません。');return;}
  let reserved=false;
  if(!commitSaveMutation(()=>{reserved=reserveGoldenLandMap();}))return false;
  if(!reserved)return false;
  showCommittedSaveResult(()=>{
    itemsNotice('黄金郷への地図を使用した！ 次の討伐依頼に黄金郷が出現します。','success');
    if(typeof renderItemDex==='function')renderItemDex();
    if(typeof showItemDexDetail==='function')showItemDexDetail('golden_land_map');
  });
  return true;
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
function rollItemGacha(count=1){
  if(count!==1&&count!==10)return;
  ensureContractScrollItem();
  if((save.coins||0)<ITEM_GACHA_COST*count){itemsNotice('コインが足りない！');return;}
  const seen=new Set(save.itemDex||[]);
  const entries=Array.from({length:count},()=>{const id=pickGachaItem(),item=ITEM_BY_ID[id],isNew=!seen.has(id);seen.add(id);return {item,isNew};});
  if(!commitSaveMutation(()=>{save.coins-=ITEM_GACHA_COST*count;entries.forEach(({item})=>{save.items[item.id]=(save.items[item.id]||0)+1;});}))return;
  showCommittedSaveResult(()=>{
    updateItems();renderItemGacha();
    if(typeof refreshGachaBanner==='function')refreshGachaBanner();
    const owner=save;
    if(typeof playGachaCinema==='function')playGachaCinema('item',{count},entries,()=>{if(save===owner)showGachaResult('item',{count},entries);});
    else{const result=document.getElementById('gachaResult');if(result)result.innerHTML=entries.map(({item})=>`${itemInlineVisual(item)} ${item.name}を入手！`).join('<br>');}
  });
}
function expItemGain(ins,item){
  return typeof traitExperienceReward==='function'?traitExperienceReward(ins,item.expAmount):item.expAmount;
}
function expItemRemaining(ins,all){
  if(isMaxLevel(ins.level))return 0;
  let exp=needExp(ins.level)-(ins.exp||0);
  if(all)for(let level=ins.level+1;level<MAX_LEVEL;level++)exp+=needExp(level);
  return Math.max(1,exp);
}
function expItemLimits(item,ins,stock){
  const gain=expItemGain(ins,item);
  if(!Number.isFinite(gain)||gain<=0||isMaxLevel(ins.level))return {next:0,cap:0};
  // Current trait gains depend on the species/traits, not its level or EXP.
  // Ceiling after single-item rounding matches the first item to cross each boundary.
  const owned=Math.max(0,Math.floor(stock));
  const next=Math.ceil(expItemRemaining(ins,false)/gain);
  return {next:owned>=next?next:0,
    cap:Math.min(owned,Math.ceil(expItemRemaining(ins,true)/gain))};
}
function previewExpItems(item,ins,quantity){
  const projected={...ins,exp:ins.exp||0};
  for(let i=0;i<quantity&&!isMaxLevel(projected.level);i++){
    projected.exp+=expItemGain(projected,item);
    while(!isMaxLevel(projected.level)&&projected.exp>=needExp(projected.level)){
      projected.exp-=needExp(projected.level);
      projected.level++;
    }
    if(isMaxLevel(projected.level))projected.exp=0;
  }
  return {level:projected.level,exp:projected.exp};
}
function handleMaxLevelExpItem(ins,mon){
  ins.level=MAX_LEVEL;ins.exp=0;
  if(!getEvoCandidates(ins).length){itemsNotice(`${mon.name}はすでに Lv.MAX です`);return false;}
  checkEvolution(ins);
  showCommittedSaveResult(()=>processNextEvolution());
  return true;
}
// Existing callers may still use one data item directly without opening the sheet.
function useExpItemOnInstance(itemId,uidValue,quantity=1){
  ensureContractScrollItem();
  const item=ITEM_BY_ID[itemId];
  if(!item?.expItem){itemsNotice('そのアイテムは経験値アイテムではありません。');return false;}
  const ins=getInstance(uidValue),stock=itemCount(itemId);
  if(stock<1){itemsNotice(`${item.name}を持っていません。`);return false;}
  if(!ins){itemsNotice('対象の仲間が見つかりません。');return false;}
  const mon=by(ins.id);
  if(isMaxLevel(ins.level))return handleMaxLevelExpItem(ins,mon);
  const {cap}=expItemLimits(item,ins,stock);
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>cap){
    itemsNotice('使える個数を確認してください。');return false;
  }
  const before=ins.level,projected=previewExpItems(item,ins,quantity);
  if(!commitSaveMutation(()=>{
    save.items[itemId]-=quantity;
    ins.level=projected.level;ins.exp=projected.exp;
    checkEvolution(ins);
  },{requireReadable:true}))return false;
  showCommittedSaveResult(()=>{
    renderParty();
    const outcome=before!==projected.level?` Lv.${before} → Lv.${projected.level}`:'';
    itemsNotice(`${item.name}×${quantity} を使った！${outcome}`,'success');
    if(pendingEvolutions.length)processNextEvolution();
  });
  return true;
}

// Each dialog begins with a new ephemeral selection, bound to the active save.
let itemQuantitySession=null;
function itemsIdentity(){return typeof saveTransactionIdentity==='function'?saveTransactionIdentity():null;}
function itemQuantityState(){
  const session=itemQuantitySession;
  if(!session||session.owner!==save||session.identity!==itemsIdentity())return null;
  const item=ITEM_BY_ID[session.id];
  if(session.kind==='shop')return item&&{...session,item,cap:shopPurchaseLimit(item)};
  const ins=getInstance(session.uid);
  return item?.expItem&&ins?{...session,item,ins,mon:by(ins.id),...expItemLimits(item,ins,itemCount(item.id))}:null;
}
function itemQuantityQuote({kind,item,cap,ins}){
  const owned=itemCount(item.id);
  return kind==='shop'?JSON.stringify([item.id,item.price,owned,save.coins||0,cap]):
    JSON.stringify([item.id,ins.id,ins.level,ins.exp||0,expItemGain(ins,item),owned,cap]);
}
function itemQuantityDialog(){
  const existing=document.getElementById('itemQuantityDialog');
  if(existing)return existing;
  const dialog=document.createElement('dialog');
  dialog.id='itemQuantityDialog';
  dialog.className='item-quantity-dialog';
  dialog.setAttribute('aria-labelledby','itemQuantityTitle');
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeItemQuantity();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeItemQuantity();});
  document.body.append(dialog);
  return dialog;
}
function closeItemQuantity(){
  itemQuantitySession=null;
  const dialog=document.getElementById('itemQuantityDialog');
  if(dialog?.open)dialog.close();
}
function renderItemQuantity(focusSelector=null){
  const state=itemQuantityState(),dialog=itemQuantityDialog();
  if(!state){closeItemQuantity();return false;}
  const {item,kind,cap,ins,mon,next}=state;
  const count=Math.max(1,Math.min(cap,state.count));
  itemQuantitySession.count=count;
  itemQuantitySession.quote=itemQuantityQuote(state);
  const shop=kind==='shop',title=shop?'購入する':'データを使う';
  const projected=shop?null:previewExpItems(item,ins,cap?count:0);
  const total=shop?item.price*count:0;
  const btn=(action,label,disabled=false,attributes='')=>
    `<button type="button" data-item-quantity-action="${action}" ${disabled?'disabled ':''}${attributes}>${label}</button>`;
  const escape=escapeGameHtml;
  dialog.innerHTML=`<section class="item-quantity-sheet">
    <header class="item-quantity-footer"><h2 id="itemQuantityTitle">${title}</h2>${btn('close','閉じる',false,'aria-label="閉じる"')}</header>
    <div class="item-quantity-target">
      ${shop?itemInlineVisual(item):vis(mon)}
      <div><strong>${escape(shop?item.name:mon.name)}</strong>
      ${shop?`<p>1個 ${item.price}コイン / 所持数：${itemCount(item.id)}個</p>`:
        `<p>Lv.${ins.level} / EXP ${ins.exp||0}/${needExp(ins.level)}</p><progress aria-label="現在の経験値" value="${ins.exp||0}" max="${needExp(ins.level)}"></progress>`}</div>
    </div>
    ${shop?'':`<div class="item-quantity-tabs" role="group" aria-label="使うデータ">${getDataItems().map(option=>`<button type="button" data-item-quantity-tab="${escape(option.id)}" aria-pressed="${option.id===item.id}" ${itemCount(option.id)<1?'disabled':''}>${escape(option.name)} <small>×${itemCount(option.id)}</small></button>`).join('')}</div>`}
    <div class="item-quantity-stepper">${btn('decrease','−',count<=1,'aria-label="個数を減らす"')}<output data-item-quantity-value aria-label="個数">${cap?count:0}</output>${btn('increase','＋',count>=cap,'aria-label="個数を増やす"')}</div>
    <div class="item-quantity-shortcuts">${shop?btn('max','最大',!cap):btn('next','次のLvまで',!next)+btn('cap','上限まで',!cap)}</div>
    <div class="item-quantity-preview" aria-live="polite">${shop?
      `<p>合計 <strong>${cap?total:0}コイン</strong></p><p>購入後のコイン：${(save.coins||0)-(cap?total:0)}枚</p>`:
      `<p>Lv.${ins.level} → Lv.${projected.level}</p><p>${isMaxLevel(projected.level)?'EXP MAX':`EXP ${projected.exp}/${needExp(projected.level)}`}</p>`}</div>
    <div class="item-quantity-footer">${btn('submit',shop?'購入する':'使う',!cap)}</div>
  </section>`;
  dialog.onclick=event=>{
    const button=event.target.closest?.('button');
    if(!button||button.disabled||!dialog.contains(button))return;
    const action=button.dataset.itemQuantityAction,tab=button.dataset.itemQuantityTab;
    if(tab){if(itemCount(tab)>0&&ITEM_BY_ID[tab]?.expItem){itemQuantitySession.id=tab;itemQuantitySession.count=1;renderItemQuantity(`[data-item-quantity-tab="${tab}"]`);}return;}
    if(action==='close'){closeItemQuantity();return;}
    const live=itemQuantityState();
    if(!live){closeItemQuantity();return;}
    if(action==='submit'){
      if(itemQuantitySession.quote!==itemQuantityQuote(live)){
        renderItemQuantity('[data-item-quantity-action="submit"]');
        return;
      }
      const qty=itemQuantitySession.count;
      closeItemQuantity(); // Reveal transaction failures outside the native modal.
      if(live.kind==='shop')buyItem(live.id,qty);
      else useExpItemOnInstance(live.id,live.uid,qty);
      return;
    }
    const amount=itemQuantitySession.count;
    itemQuantitySession.count=action==='increase'?amount+1:action==='decrease'?amount-1:action==='next'?live.next:live.cap;
    renderItemQuantity(`[data-item-quantity-action="${action}"]`);
  };
  if(focusSelector)dialog.querySelector(focusSelector)?.focus();
  return true;
}
function openItemQuantity(session){
  const dialog=itemQuantityDialog();
  if(dialog.open||document.querySelector('dialog:modal'))return false;
  itemQuantitySession={...session,count:1,owner:save,identity:itemsIdentity()};
  if(!renderItemQuantity())return false;
  dialog.showModal();
  return true;
}
function openExpItemQuantity(itemId,uidValue){
  const item=ITEM_BY_ID[itemId],ins=getInstance(uidValue);
  if(!item?.expItem||!ins||itemCount(itemId)<1)return false;
  if(isMaxLevel(ins.level))return handleMaxLevelExpItem(ins,by(ins.id));
  return openItemQuantity({kind:'exp',id:itemId,uid:uidValue});
}
function openShopQuantity(id){
  const item=ITEM_BY_ID[id];
  if(shopPurchaseLimit(item)<1){itemsNotice('コインが足りません。');return false;}
  return openItemQuantity({kind:'shop',id});
}
function openBattleItemSelect() {
  if(busy||(typeof battleUiCanAct==='function'&&!battleUiCanAct()))return;
  if(typeof renewalItems==='function'){renewalItems();return;}
  if(typeof battleUiRemember==='function')battleUiRemember('battleItemButton');
  if(typeof closeBattleSkillPanel==='function')closeBattleSkillPanel();
  document.getElementById('kokoroLinkPanel')?.classList.add('hidden');
  updateItems();
  battleItemMenuConsumed=false;
  show('battleItemSelect');
}
function renderBattleItemSelect(){
  ensureContractScrollItem();
  const list=document.getElementById('battleItemList');
  if(!list)return;
  const loan=typeof prologuePart2LoanItemMarkup==='function'?prologuePart2LoanItemMarkup():'';
  list.innerHTML = loan+`<p>対象：${typeof battleUiEscape==='function'?battleUiEscape(player?.name||'前衛'):player?.name||'前衛'} / HP ${pHp} / ${playerMaxHp()}。</p>` + SHOP_ITEMS.filter(it=>it.usableInBattle&&!it.contract).map(it=>`
    <div class="item-card">
      <h2>${itemInlineVisual(it)} ${it.name} ×${save.items[it.id]||0}</h2>
      <p>${it.battleDesc || it.desc}</p>
      <p>${battleItemUnavailableReason(it.id)||'使用可能・前衛に使用'}</p>
      <button ${battleItemUnavailableReason(it.id)?'disabled':''} onclick="${it.contract ? `askUseContractScroll('${it.id}')` : `useBattleItemFromMenu('${it.id}')`}">使う</button>
    </div>`).join('');
}
const BATTLE_ITEM_CURES = Object.freeze({antidote:['poison'],paralysis_heal:['paralysis'],confusion_heal:['confusion'],awakening:['sleep'],full_heal:['poison','paralysis','confusion','sleep','freeze']});
function battleItemTargetReason(id,index){
  if(!ITEM_BY_ID[id]?.usableInBattle)return '使用できません';
  if((save.items[id]||0)<=0)return '残数なし';
  const entry=partyBattle[index];if(!entry)return '対象なし';
  const hp=index===activePartyIdx?pHp:entry.hp,fallen=entry.fainted||hp<=0;
  if(id==='revive_drop')return fallen?'':'戦闘不能ではありません';
  if(fallen)return '戦闘不能';
  if(['potion','upper_potion','max_potion'].includes(id)&&hp>=instanceMaxHp(entry.inst))return 'HPは満タンです';
  const cures=BATTLE_ITEM_CURES[id];
  // Switching already clears the outgoing member's ailments in the existing rules.
  if(cures){
    if(index!==activePartyIdx)return '治す状態異常がありません';
    const actor=tacticalCombatant(true);
    if(!cures.some(k=>actor[k]>0||(k==='poison'&&actor.status==='poison')))return '治す状態異常がありません';
  }
  return '';
}
function applyBattleItemEffect(id,index){
  const entry=partyBattle[index],active=index===activePartyIdx;
  const cures=BATTLE_ITEM_CURES[id];
  if(cures){const actor=tacticalCombatant(true);for(const k of cures){actor[k]=0;if(k==='poison'&&actor.status==='poison')actor.status=null;}return;}
  if(id==='attack_potion'){if(active)pAtk=1.6;else entry.itemAttack=1.6;return;}
  if(id==='defense_potion'||id==='speed_potion'){
    const key=id==='defense_potion'?'itemDefense':'itemSpeed';
    if(active)entry.mon[key]=1.6;else entry[key]=1.6;
    return;
  }
  const maxHp=instanceMaxHp(entry.inst);
  if(id==='revive_drop'){entry.hp=Math.max(1,adjustedBattleHealing(Math.floor(maxHp/2)));entry.fainted=false;if(active)pHp=entry.hp;return;}
  const amount=battlePotionHealing(id,entry.mon,entry.inst,maxHp);
  entry.hp=Math.min(maxHp,(active?pHp:entry.hp)+amount);if(active)pHp=entry.hp;
}
function battleItemUnavailableReason(id){return battleItemTargetReason(id,activePartyIdx);}
function useBattleItemFromMenu(id){
  if(battleItemMenuConsumed||!document.getElementById('battleItemSelect')?.classList.contains('active')||battleItemUnavailableReason(id))return;
  useBattleItem(id);
}
let battleItemSaveBusy = false, battleItemMenuConsumed = false;
function battlePotionHealing(id, mon, ins, maxHp) {
  if(id==='max_potion')return adjustedBattleHealing(maxHp);
  const legacyAmount = id === 'potion' ? 50 : 120;
  return adjustedBattleHealing(healingAtNewMaxHp(legacyAmount, mon, ins?.level, maxHp, instanceStatModifier(ins, 'hp')));
}
function useBattleItem(id) {
  if(busy || battleItemSaveBusy)return;
  ensureContractScrollItem();
  if(ITEM_BY_ID[id]?.contract) { if(typeof gameAudioPlay==='function')gameAudioPlay('error');itemsNotice('契約書は敵を倒した後に使用できます。'); show('battle'); return; }
  const it = ITEM_BY_ID[id];
  if(!it || !it.usableInBattle){ if(typeof gameAudioPlay==='function')gameAudioPlay('error');itemsNotice('そのアイテムは使えません。'); return; }
  if (!player || !enemy) { if(typeof gameAudioPlay==='function')gameAudioPlay('error');itemsNotice('バトル中だけ使えます。'); return; }
  if ((save.items[id]||0) <= 0) { if(typeof gameAudioPlay==='function')gameAudioPlay('error');itemsNotice(`${it.name}を持っていない！`); return; }

  const reason=battleItemUnavailableReason(id);if(reason){if(typeof gameAudioPlay==='function')gameAudioPlay('error');itemsNotice(reason);return;}
  const msg=`${it.name}を${player.name}に使った！`;
  battleItemSaveBusy = true;
  try {
    // Battle state is transient: apply it only after the inventory write commits.
    if(!commitSaveMutation(()=>{save.items[id]--;},{requireReadable:true}))return;
    battleItemMenuConsumed=true;
    applyBattleItemEffect(id,activePartyIdx);
    busy=true;
    showCommittedSaveResult(()=>{
      // Close the input before fallible refreshes, preventing a stale menu retry.
      show('battle');
      updateItems(); update();
      const log=document.getElementById('log');
      if(log)log.innerHTML=msg;
      if(typeof captureBattleLog==='function')captureBattleLog();
    });
    battleItemEnemyTurn();
  } finally { battleItemSaveBusy=false; }
}
function battleItemEnemyTurn(){
  busy=true;startBattleTurn();renderBattleInputState();
  if(multiBattle?.active){const actions=aliveMultiEnemies().map(actor=>{const delayed=consumeKokoroLinkEnemyActionDelay(actor.id),next=nextEnemyMoveWithKokoroLinkForesight(actor.id,actor.mon);return {kind:'enemy',actorId:actor.id,speed:delayed?-Infinity:multiEnemyKokoroLinkSpeed(actor),move:next.move};}).sort((a,b)=>b.speed-a.speed||Math.random()-.5);runMultiActions(actions,0);return;}
  const token=mapStoryBattleToken(),actor=enemy,next=nextEnemyMoveWithKokoroLinkForesight(singleEnemyKokoroLinkKey(),enemy);consumeKokoroLinkEnemyActionDelay(singleEnemyKokoroLinkKey());
  (async()=>{await battleMotionDelay(300);if(!mapStoryTokenValid(token))return;await performAction(actor,player,next.move,false);if(!mapStoryTokenValid(token))return;if(eHp<=0){win();return;}if(pHp<=0&&!switchPartyMember())return;finishTurnWithPoison();})();
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
  if(typeof isProloguePart2Battle==='function'&&isProloguePart2Battle()&&!prologuePart2ContractAllowed())return false;
  if(typeof normalVictoryPending==='function'&&normalVictoryPending())return false;
  if(typeof isMapStoryBattle==='function'&&isMapStoryBattle())return false;
  if(multiBattle?.active && !multiBattle.finished){
    itemsNotice('複数陣営バトルでは、戦闘終了後に倒した相手と契約できます。');
    show('battle');
    return;
  }
  if(!multiBattle?.active && (!battleRewardGranted || singleBattleContractAttempted)){
    itemsNotice(singleBattleContractAttempted?'この相手への契約判定は完了しています。':'契約書は敵を倒した後に使用できます。');
    show('battle');
    return;
  }
  if(enemy && !isContractableUnit(enemy)){
    itemsNotice(`${enemy.name}は契約対象ではありません。`);
    show('battle');
    return;
  }
  ensureContractScrollItem();
  const tutorialOffer=typeof shouldGuaranteeTutorialContract==='function'&&shouldGuaranteeTutorialContract(enemy,'contract_scroll');
  // ① 契約書0枚チェック
  const hasAny = tutorialOffer||SHOP_ITEMS.filter(it => it.contract).some(it => (save.items[it.id]||0) > 0);
  if(!hasAny){
    itemsNotice('契約書を持っていません。ショップで購入してください。');
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
let postBattleContractBusy=false;
let postBattleContractRetry=null;
function postBattleContractStage(target,itemId,scope,guaranteed=false,party){
  const identity=saveTransactionIdentity();
  if(postBattleContractRetry?.target===target&&postBattleContractRetry.itemId===itemId&&postBattleContractRetry.scope===scope&&postBattleContractRetry.identity===identity)return postBattleContractRetry.stage;
  const it=ITEM_BY_ID[itemId]||ITEM_BY_ID.contract_scroll;
  const baseRate=Math.min(.95,(target.catchRate??.25)*(it.catchMultiplier||1));
  const rate=party&&typeof partyTraitBonus==='function'
    ? Math.min(1,baseRate+partyTraitBonus(['bond'],party))
    : typeof traitContractRate==='function'?traitContractRate(baseRate):baseRate;
  const stage=guaranteed?3:contractAnimationStage(Math.random(),rate);
  postBattleContractRetry={target,itemId,scope,identity,stage};return stage;
}
function useContractScrollConfirmed(){
  if(typeof normalVictoryPending==='function'&&normalVictoryPending())return false;
  if(postBattleContractBusy)return;
  ensureContractScrollItem();
  const itemId=ITEM_BY_ID[pendingContractItemId]?.contract?pendingContractItemId:chooseDefaultContractItem();
  if(multiBattle?.active&&multiBattle.finished&&pendingMultiBattleContractId)return useMultiBattleContractScroll(itemId);
  const tutorialGuarantee=typeof shouldGuaranteeTutorialContract==='function'&&shouldGuaranteeTutorialContract(enemy,itemId);
  return tryContractWithScroll(itemId,{tutorialGuarantee});
}
async function tryContractWithScroll(itemId='contract_scroll',{tutorialGuarantee=false}={}){
  if(typeof isProloguePart2Battle==='function'&&isProloguePart2Battle())return tryProloguePart2Contract(itemId);
  if(typeof normalVictoryPending==='function'&&normalVictoryPending())return false;
  if(typeof isMapStoryBattle==='function'&&isMapStoryBattle())return false;
  if(postBattleContractBusy||singleBattleContractAttempted||!battleRewardGranted||!isContractableUnit(enemy))return false;
  ensureContractScrollItem();
  const it=ITEM_BY_ID[itemId]||ITEM_BY_ID.contract_scroll;
  const guaranteed=tutorialGuarantee&&typeof shouldGuaranteeTutorialContract==='function'&&shouldGuaranteeTutorialContract(enemy,itemId);
  if(!guaranteed&&(save.items[itemId]||0)<=0){saveTransactionNotice(`${it.name}を持っていません。`);return false;}
  const target=enemy,snapshot=captureSaveTransaction();
  const animationStage=postBattleContractStage(target,itemId,null,guaranteed),ok=animationStage===3;
  postBattleContractBusy=true;
  let committed=false;
  try{
    if(guaranteed){
      if(typeof commitTutorialFirstContract!=='function'||!commitTutorialFirstContract(itemId,target))throw new Error('tutorial_contract_save');
    }else{
      save.items[itemId]--;
      if(ok){addInstance(target.id);if(typeof grantContractorContractSuccess==='function')grantContractorContractSuccess(target.id);}
      if(typeof autoPrepareContractCheckpoint==='function')autoPrepareContractCheckpoint(target,null,ok);
      if(!saveGame())throw new Error('contract_save');
    }
    committed=true;
    singleBattleContractAttempted = true;
    postBattleContractRetry=null;
    busy=true;
    if(ok){
      pStatus=null;eStatus=null;pPoisonTurns=0;ePoisonTurns=0;pParalysisTurns=0;eParalysisTurns=0;
      pConfusionTurns=0;eConfusionTurns=0;pSleepTurns=0;eSleepTurns=0;pFreezeTurns=0;eFreezeTurns=0;pFlareCharge=false;eFlareCharge=false;pAquaShield=false;eAquaShield=false;
    }
    if(guaranteed&&typeof handleTutorialContractCommitted==='function')handleTutorialContractCommitted();
    show('battle');
    await playContractAnimation({monsterName:target.name,stage:animationStage});
    if(snapshot.identity!==saveTransactionIdentity())return true;
    const logBox=document.getElementById('log');
    if(logBox)logBox.innerHTML+=`${logBox.innerHTML?'<br>':''}${ok?`🤝 ${it.name}を使い、${target.name}との契約に成功した！<br>${target.name}が手持ちに加わった！`:`📜 ${it.name}を使ったが、${target.name}との契約には失敗した……`}`;
    updateItems();renderParty();renderDex();refreshContractScrollDisplay();show('battle');renderSingleBattleContractPanel();
    if(guaranteed&&typeof handleTutorialContractAnimationComplete==='function')handleTutorialContractAnimationComplete();
    return true;
  }catch(error){
    if(!committed){rollbackSaveTransaction(snapshot);singleBattleContractAttempted=false;}
    saveTransactionNotice(committed?'契約結果は保存済みです。手持ちと契約書の枚数をご確認ください。':'契約結果を保存できませんでした。契約書は消費していません。再読み込みする前に保存状態をご確認ください。');
    console.error('post-battle contract failed:',error);
    try{if(guaranteed&&!committed){show('contractConfirm');refreshContractScrollDisplay();}else{show('battle');renderSingleBattleContractPanel();}}catch(displayError){console.error(displayError);}
    return committed;
  }finally{postBattleContractBusy=false;busy=false;}
}
function tryCatch(){ askUseContractScroll(); }
function catchEnemy(){ askUseContractScroll(); }
function contractEnemy(){ askUseContractScroll(); }
function renderSingleBattleContractPanel(){
  if(typeof isProloguePart2Battle==='function'&&isProloguePart2Battle()&&!prologuePart2ContractAllowed())return;
  if(typeof renewalContracts==='function'&&renewalContracts())return;
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
  if(typeof isProloguePart2Battle==='function'&&isProloguePart2Battle())actions.innerHTML+='<button type="button" onclick="skipProloguePart2Contract()">契約を見送る</button>';
}
function refreshContractScrollDisplay(){
  ensureContractScrollItem();
  const it = ITEM_BY_ID[pendingContractItemId] || ITEM_BY_ID.contract_scroll;
  const confirmText=document.getElementById('contractConfirmText');
  const tutorialOffer=typeof shouldGuaranteeTutorialContract==='function'&&shouldGuaranteeTutorialContract(enemy,it.id);
  const selectedScrollText=`${it.name}を1枚使用しますか？（所持：${save.items[it.id]||0}枚）`;
  if(confirmText)confirmText.textContent=selectedScrollText+(tutorialOffer
    ? ' チュートリアル用に1枚支給し、この契約で使います。最初のスライムとの契約は必ず成功します。'
    : '');

  updateItemText();

  const itemList=document.getElementById('battleItemList');
  const itemScreen=document.getElementById('battleItemSelect');
  if(itemList && itemScreen && itemScreen.classList.contains('active') && typeof renderBattleItemSelect==='function'){
    renderBattleItemSelect();
  }
}
