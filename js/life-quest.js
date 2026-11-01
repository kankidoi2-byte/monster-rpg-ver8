/* Monster Battle owns claiming; Life Quest only owns its independent inbox. */
function pendingLifeQuestRewards(){
  const box=LifeQuestRewards.sync();
  const claimed=new Set(save.lifeQuestClaimedIds||[]),seen=new Set();
  // Entries are append-only. The newest retained receipt also covers the
  // already-claimed prefix after the 500-ID receipt window rolls forward.
  const lastClaimed=box.entries.reduce((last,e,i)=>claimed.has(e?.id)?i:last,-1);
  return box.entries.filter((e,index)=>{
    if(index<=lastClaimed)return false;
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
function renderLifeQuestRewards(){
  const el=document.getElementById('lifeQuestRewardBox');if(!el)return;
  try{
    const entries=pendingLifeQuestRewards();el.hidden=!entries.length;
    el.innerHTML=entries.length?'<span>Life Quest ・ '+entries.length+'件</span><button type="button" onclick="claimLifeQuestRewards()">受け取る</button>':'';
  }catch(error){el.hidden=false;el.textContent='Life Questの報酬を読み込めません。';}
}
function claimLifeQuestRewards(){
  let entries;
  try{entries=pendingLifeQuestRewards()}catch(error){showUiNotice('報酬を読み込めません。','error');return false;}
  if(!entries.length){renderLifeQuestRewards();return false;}
  const total=lifeQuestRewardTotal(entries);
  const before=captureSaveTransaction();
  save.coins+=total.coins;
  for(const [id,n] of Object.entries(total.items))save.items[id]=(save.items[id]||0)+n;
  save.lifeQuestClaimedIds=[...(save.lifeQuestClaimedIds||[]),...entries.map(e=>e.id)].slice(-500);
  if(!saveGame()){
    rollbackSaveTransaction(before);
    showUiNotice('保存できなかったため、報酬を受け取れませんでした。','error');return false;
  }
  showCommittedSaveResult(()=>{renderLifeQuestRewards();
  showUiNotice(['コイン '+total.coins+'枚',...Object.entries(total.items).map(([id,n])=>ITEM_DEX_BY_ID[id].name+' ×'+n)].join(' / '));
  if(typeof updateItems==='function')updateItems();});
  return true;
}
window.addEventListener('pageshow',()=>{if(document.getElementById('home')?.classList.contains('active'))renderLifeQuestRewards()});
window.addEventListener('storage',e=>{if(['lifequest.v1','lifequest_rewards_v1'].includes(e.key)&&document.getElementById('home')?.classList.contains('active'))renderLifeQuestRewards()});

window.addEventListener('focus',()=>{if(document.getElementById('home')?.classList.contains('active'))renderLifeQuestRewards()});
