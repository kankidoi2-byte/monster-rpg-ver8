/* Life Quest owns its append-only inbox; Monster Battle owns receipts.
 * v0 saves claimed the entire prefix, keeping only the last 500 IDs.
 * v1 receipts are individual and never expire with the display history.
 */
function lifeQuestClaimedSet(entries){
  const claimed=new Set(save.lifeQuestClaimedIds||[]);
  if(save.giftReceiptVersion!==1){
    const last=entries.reduce((n,e,i)=>claimed.has(e?.id)?i:n,-1);
    entries.slice(0,last+1).forEach(e=>{if(typeof e?.id==='string')claimed.add(e.id)});
  }
  return claimed;
}
function migrateLifeQuestGiftReceipts(entries){
  if(save.giftReceiptVersion===1)return;
  save.lifeQuestClaimedIds=[...lifeQuestClaimedSet(entries)];
  save.giftReceiptVersion=1;
}
function pendingLifeQuestRewards(){
  const box=LifeQuestRewards.sync(),claimed=lifeQuestClaimedSet(box.entries),seen=new Set();
  return box.entries.filter(e=>{
    if(!e||typeof e.id!=='string'||!e.id||seen.has(e.id)||claimed.has(e.id))return false;
    seen.add(e.id);return true;
  });
}
function lifeQuestRewardTotal(entries){
  const total={coins:0,items:{}};
  const count=n=>Number.isSafeInteger(n)&&n>0?n:0;
  for(const entry of entries){
    total.coins+=count(entry.coins);
    for(const [id,n] of Object.entries(entry.items||{})){
      if(Object.hasOwn(ITEM_DEX_BY_ID,id)&&count(n))total.items[id]=(total.items[id]||0)+count(n);
    }
  }
  return total;
}
function refreshLifeQuestGiftUi(){
  if(typeof refreshGiftUi==='function')refreshGiftUi();
}
window.addEventListener('pageshow',refreshLifeQuestGiftUi);
window.addEventListener('focus',refreshLifeQuestGiftUi);
window.addEventListener('storage',e=>{
  if(['lifequest.v1','lifequest_rewards_v1'].includes(e.key)||e.key===null)refreshLifeQuestGiftUi();
});
