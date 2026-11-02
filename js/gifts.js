/* Present BOX. All acquisitions and receipts commit in one save transaction. */
let giftTab='pending',giftFilter='all',giftClaimBusy=false,giftDialogReturnFocus=null;
const giftEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function giftDateStart(s){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return NaN;
  const n=Date.parse(s+'T00:00:00+09:00');
  return Number.isFinite(n)&&new Date(n+9*3600000).toISOString().slice(0,10)===s?n:NaN;
}
function giftDeadline(g){return g.until===null?Infinity:giftDateStart(g.until)+86400000;}
function giftRewardValid(r){
  if(!r||typeof r!=='object')return false;
  const positive=n=>Number.isSafeInteger(n)&&n>0;
  if(r.kind==='coins')return positive(r.amount);
  if(r.kind==='item')return typeof r.id==='string'&&Object.hasOwn(ITEM_DEX_BY_ID,r.id)&&positive(r.count);
  if(r.kind==='skill')return typeof r.id==='string'&&Object.hasOwn(SKILL_BY_ID,r.id)&&!SKILL_BY_ID[r.id].deprecated&&positive(r.count);
  if(['monster','character'].includes(r.kind)){
    const unit=typeof r.id==='string'?by(r.id):null;
    return Boolean(unit)&&isCharacterUnit(unit)===(r.kind==='character')&&positive(r.level)&&r.level<=MAX_LEVEL;
  }
  return false;
}
function giftDeveloperErrors(g){
  const errors=[];
  if(!g||typeof g!=='object')return ['プレゼントがオブジェクトではありません'];
  if(typeof g.id!=='string'||!g.id.trim())errors.push('id');
  if(typeof g.title!=='string'||!g.title.trim())errors.push('title');
  if(typeof g.letter!=='string')errors.push('letter');
  if(!Number.isFinite(giftDateStart(g.startAt)))errors.push('startAt');
  if(g.until!==null&&(!Number.isFinite(giftDateStart(g.until))||giftDateStart(g.until)<giftDateStart(g.startAt)))errors.push('until');
  if(!Array.isArray(g.rewards)||!g.rewards.length||g.rewards.some(r=>!giftRewardValid(r)))errors.push('rewards');
  return errors;
}
function validateDeveloperGifts(gifts){
  if(!Array.isArray(gifts))return ['DEV_GIFTS must be an array'];
  const seen=new Set(),errors=[];
  gifts.forEach((g,i)=>{for(const error of giftDeveloperErrors(g))errors.push(`${i}: ${error}`);
    if(seen.has(g?.id))errors.push(`${i}: duplicate id ${g.id}`);seen.add(g?.id);
  });return errors;
}
function developerGiftEntries(now=Date.now()){
  if(!Array.isArray(DEV_GIFTS))return [];
  const counts=new Map();DEV_GIFTS.forEach(g=>counts.set(g?.id,(counts.get(g?.id)||0)+1));
  const claimed=new Set(save.giftClaimedIds||[]);
  return DEV_GIFTS.filter(g=>!giftDeveloperErrors(g).length&&counts.get(g.id)===1&&!claimed.has(g.id)&&now>=giftDateStart(g.startAt)&&now<giftDeadline(g))
    .map(g=>({...g,key:'developer:'+g.id,source:'developer',createdAt:new Date(giftDateStart(g.startAt)).toISOString()}));
}
function lifeQuestGiftEntries(){
  return pendingLifeQuestRewards().map(e=>{
    const total=lifeQuestRewardTotal([e]),rewards=[];
    if(total.coins)rewards.push({kind:'coins',amount:total.coins});
    for(const [id,count] of Object.entries(total.items))rewards.push({kind:'item',id,count});
    let title=String(e.label||'Life Questの報酬');
    title=title.replace(/^\d{4}-(\d{2})-(\d{2})のEXP$/,(_,m,d)=>`${Number(m)}/${Number(d)} のEXP`);
    if(/^Lv\.\d+$/.test(title))title='Life Quest '+title+' 到達';
    else if(/^連続\d+日$/.test(title))title+='達成';
    else if(e.source==='skill')title='スキル習得「'+title+'」';
    return {id:e.id,key:'lifequest:'+e.id,source:'lifequest',title,letter:'Life Questでの活動報酬です。',createdAt:e.createdAt,until:null,rewards};
  }).filter(g=>g.rewards.length&&g.rewards.every(giftRewardValid));
}
function pendingGifts(now=Date.now()){
  return [...developerGiftEntries(now),...lifeQuestGiftEntries()].sort((a,b)=>{
    const deadline=giftDeadline(a)-giftDeadline(b);
    return (Number.isNaN(deadline)?0:deadline)||(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0);
  });
}
function giftHistoryEntries(now=Date.now()){
  return (save.giftHistory||[]).filter(g=>g&&typeof g.key==='string'&&Array.isArray(g.rewards)&&g.rewards.every(giftRewardValid)&&Number.isFinite(Date.parse(g.receivedAt))&&now-Date.parse(g.receivedAt)<=90*86400000)
    .sort((a,b)=>Date.parse(b.receivedAt)-Date.parse(a.receivedAt)).slice(0,200);
}
function giftReceivingUnlocked(){
  const t=save?.progress?.tutorial;
  return Boolean(t&&(t.completed||t.skipped||t.status==='completed'||t.status==='skipped'));
}
function giftKnownSkillIds(){
  const ids=new Set(Object.keys(save.skillCards||{}).filter(id=>save.skillCards[id]>0));
  for(const key of ['skillDex','discoveredSkills','knownSkills']){
    const value=save[key];for(const id of Array.isArray(value)?value:Object.keys(value||{}).filter(id=>value[id]))ids.add(id);
  }return ids;
}
function giftCombineRewards(gifts){
  const rows=[],index=new Map();
  for(const g of gifts)for(const reward of g.rewards){
    const r={...reward};
    if(['monster','character'].includes(r.kind)){rows.push(r);continue;}
    const key=r.kind+':'+(r.id||'');
    if(index.has(key)){
      const row=index.get(key),field=r.kind==='coins'?'amount':'count';row[field]+=r[field];
      if(!Number.isSafeInteger(row[field]))throw Error('報酬の数が上限を超えています。');
    }else{index.set(key,r);rows.push(r);}
  }
  const order={monster:0,character:0,skill:1,item:2,coins:3};return rows.sort((a,b)=>order[a.kind]-order[b.kind]);
}
function giftAddSafe(current,amount){
  const n=(current||0)+amount;if(!Number.isSafeInteger(n)||n<0)throw Error('所持数が上限を超えています。');return n;
}
function commitGiftClaim(keys,identity,owner){
  if(identity!==saveTransactionIdentity()||save!==owner)return {ok:false,error:'プレイヤーが変わりました。開き直してください。'};
  if(!giftReceivingUnlocked())return {ok:false,error:'序章チュートリアル完了後に受け取れます。'};
  if(typeof MonsterProfiles!=='undefined'&&!MonsterProfiles.beforeSave())return {ok:false,error:'別の画面で更新されています。再読み込みしてください。'};
  let snapshot=null;
  try{
    const ids=[...new Set(keys)],pending=pendingGifts(),selected=ids.map(id=>pending.find(g=>g.key===id));
    if(!ids.length||selected.some(g=>!g))return {ok:false,error:'プレゼントの状態が変わりました。一覧を確認してください。'};
    const rewards=giftCombineRewards(selected),known=new Set(save.caught||[]),knownSkills=giftKnownSkillIds();
    snapshot=captureSaveTransaction();
    migrateLifeQuestGiftReceipts(LifeQuestRewards.sync().entries);
    for(const r of rewards){
      if(r.kind==='coins')save.coins=giftAddSafe(save.coins,r.amount);
      else if(r.kind==='item'){
        save.items[r.id]=giftAddSafe(save.items[r.id],r.count);registerItemDex(r.id);
      }else if(r.kind==='skill'){
        r.isNew=!knownSkills.has(r.id);knownSkills.add(r.id);grantSkillCards(r.id,r.count);
      }else{
        r.isNew=!known.has(r.id);known.add(r.id);const instance=addInstance(r.id,r.level);
        if(!instance)throw Error('仲間を追加できませんでした。');r.uid=instance.uid;
      }
    }
    const receivedAt=new Date().toISOString();
    for(const g of selected){
      const field=g.source==='developer'?'giftClaimedIds':'lifeQuestClaimedIds';
      save[field]=[...new Set([...(save[field]||[]),g.id])];
    }
    save.giftHistory=[...selected.map(g=>({...g,receivedAt})),...giftHistoryEntries()].slice(0,200);
    if(!saveGame())throw Error('保存できなかったため、報酬を受け取れませんでした。');
    return {ok:true,rewards};
  }catch(error){
    if(snapshot)rollbackSaveTransaction(snapshot);
    return {ok:false,error:error.message||'受け取りできませんでした。'};
  }
}
async function claimGifts(keys){
  if(giftClaimBusy)return false;
  if(!Array.isArray(keys)||!keys.length)return false;
  if(!navigator.locks?.request){showUiNotice('受け取りには対応ブラウザで開いてください。','error');return false;}
  giftClaimBusy=true;
  const identity=saveTransactionIdentity(),owner=save;
  let result;
  try{
    refreshGiftUi();setGiftDialogBusy(true);
    result=await navigator.locks.request('monster-gifts:'+identity,()=>commitGiftClaim(keys,identity,owner));
  }catch(error){result={ok:false,error:'受け取りできませんでした。もう一度お試しください。'};}
  finally{giftClaimBusy=false;setGiftDialogBusy(false);}
  if(result.ok){
    showCommittedSaveResult(()=>{refreshGiftUi();updateAppResourceBar();showGiftResult(result.rewards);});
  }else{showUiNotice(result.error,'error');refreshGiftUi();}
  return result.ok;
}
function giftDateLabel(s){
  const n=Date.parse(s);return Number.isFinite(n)?new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric'}).format(n):'—';
}
function giftSender(g){return g.source==='developer'?'開発者（土井さん）':'Life Quest';}
function giftIcon(g){return g.source==='developer'?'✉':'✦';}
function giftRewardName(r){return r.kind==='coins'?'コイン':r.kind==='item'?ITEM_DEX_BY_ID[r.id]?.name:r.kind==='skill'?SKILL_BY_ID[r.id]?.name:by(r.id)?.name;}
function giftRewardArt(r){
  if(r.kind==='coins')return '<span class="gift-coin" aria-hidden="true">●</span>';
  if(r.kind==='skill')return `<span class="gift-skill-thumb" aria-hidden="true">✧</span>`;
  if(r.kind==='item'){
    const src=typeof ITEM_IMG!=='undefined'?ITEM_IMG[r.id]:null;
    return src?`<img src="${giftEscape(src)}" alt="">`:'<span aria-hidden="true">◇</span>';
  }
  const unit=by(r.id),src=unit?.imgKey&&IMG[unit.imgKey];
  return src?`<img src="${giftEscape(src)}" alt="">`:`<span aria-hidden="true">${giftEscape(unit?.icon||'◇')}</span>`;
}
function giftRewardQuantity(r){return ['monster','character'].includes(r.kind)?'Lv.'+r.level:'×'+(r.kind==='coins'?r.amount:r.count).toLocaleString('ja-JP');}
function giftRewardCards(rewards){
  return rewards.map(r=>`<article class="gift-reward-card ${r.kind==='skill'?'gift-skill-card':''}">${r.isNew?'<b class="gift-new">NEW</b>':''}${r.kind==='skill'?tcgSkillCardMarkup(SKILL_BY_ID[r.id]):'<div class="gift-card-art">'+giftRewardArt(r)+'</div>'}<strong>${giftEscape(giftRewardName(r))}</strong><span>${['monster','character'].includes(r.kind)?by(r.id).rarity+' ・ ':''}${giftRewardQuantity(r)}</span></article>`).join('');
}
function giftRow(g,history=false){
  const soon=g.until!==null&&giftDeadline(g)-Date.now()<=14*86400000;
  return `<article class="gift-row"><button type="button" class="gift-row-details" data-gift-detail="${giftEscape(g.key)}" aria-label="${giftEscape(g.title)}の詳細"><span class="gift-sender-icon ${g.source}">${giftIcon(g)}</span><span class="gift-row-copy"><small>${giftEscape(giftSender(g))} ・ ${giftDateLabel(g.createdAt)}</small><small class="${soon?'gift-soon':''}">${history?'受領 '+giftDateLabel(g.receivedAt):g.until?'期限 '+giftEscape(g.until):'期限なし'}</small><strong>${giftEscape(g.title)}</strong><span class="gift-thumbs">${g.rewards.slice(0,5).map(r=>`<span title="${giftEscape(giftRewardName(r))}">${giftRewardArt(r)}<small>${giftRewardQuantity(r)}</small></span>`).join('')}${g.rewards.length>5?'<small>+'+(g.rewards.length-5)+'</small>':''}</span></span></button>${history?'':`<button type="button" class="gift-claim" data-gift-claim="${giftEscape(g.key)}" ${giftClaimBusy||!giftReceivingUnlocked()?'disabled':''}>受け取る</button>`}</article>`;
}
function refreshGiftUi(){
  const badge=document.getElementById('giftUnreadCount');if(!badge)return;
  try{
    const entries=pendingGifts();badge.hidden=!entries.length;badge.textContent=entries.length>99?'99+':String(entries.length);
    badge.parentElement.parentElement.setAttribute('aria-label','プレゼントBOX 未受け取り'+entries.length+'件');
    if(document.getElementById('giftBox')?.classList.contains('active'))renderGiftBox(entries);
  }catch(error){badge.hidden=true;if(document.getElementById('giftBox')?.classList.contains('active'))document.getElementById('giftList').textContent='プレゼントを読み込めません。開き直してください。';}
}
function renderGiftBox(entries){
  try{
    entries=entries||pendingGifts();const history=giftTab==='history',all=history?giftHistoryEntries():entries;
    const filtered=all.filter(g=>giftFilter==='all'||g.source===giftFilter);
    document.getElementById('giftPendingTab').innerHTML='受け取れる <b'+(entries.length?'':' hidden')+'>'+entries.length+'</b>';
    for(const [id,active] of [['giftPendingTab',!history],['giftHistoryTab',history]])document.getElementById(id).setAttribute('aria-selected',String(active));
    document.getElementById('giftFilters').innerHTML=[['all','すべて'],['developer','開発者'],['lifequest','Life Quest']].map(([id,label])=>`<button type="button" data-gift-filter="${id}" aria-pressed="${id===giftFilter}">${label} <span>${all.filter(g=>id==='all'||g.source===id).length}</span></button>`).join('');
    document.getElementById('giftList').innerHTML=filtered.length?filtered.map(g=>giftRow(g,history)).join(''):'<p class="gift-empty">'+(history?'受け取り履歴はありません。':'受け取れるプレゼントはありません。')+'</p>';
    document.getElementById('giftClaimHint').hidden=giftReceivingUnlocked();
    document.getElementById('giftCount').textContent=filtered.length+'件';
    const button=document.getElementById('giftClaimAll');button.hidden=history;button.disabled=giftClaimBusy||!giftReceivingUnlocked()||!filtered.length;
  }catch(error){document.getElementById('giftList').textContent='プレゼントを読み込めません。開き直してください。';document.getElementById('giftClaimAll').disabled=true;}
}
function showGiftBox(){giftTab='pending';giftFilter='all';show('giftBox');}
function closeGiftDialog(){
  if(giftClaimBusy)return;
  const dialog=document.getElementById('giftDialog');if(!dialog?.open)return;
  dialog.close();if(giftDialogReturnFocus?.isConnected)giftDialogReturnFocus.focus();
}
function setGiftDialogBusy(busy){
  const d=document.getElementById('giftDialog');if(d?.open)d.querySelectorAll('button').forEach(b=>b.disabled=busy);
}
function openGiftDialog(title,body,keys=[]){
  const dialog=document.getElementById('giftDialog');
  if(!dialog.open)giftDialogReturnFocus=document.activeElement;
  document.getElementById('giftDialogTitle').textContent=title;
  document.getElementById('giftDialogBody').innerHTML=body;
  const button=document.getElementById('giftDialogClaim');button.hidden=!keys.length;button.disabled=giftClaimBusy||!giftReceivingUnlocked();
  button.onclick=()=>claimGifts(keys);
  document.getElementById('giftDialogClose').textContent='閉じる';
  if(!dialog.open)dialog.showModal();
}
function openGiftDetail(key){
  const history=giftTab==='history';let g;
  try{g=(history?giftHistoryEntries():pendingGifts()).find(g=>g.key===key);}catch(error){showUiNotice('読み込めません。','error');return;}
  if(!g){refreshGiftUi();return;}
  openGiftDialog(g.title,`<p class="gift-letter">${giftEscape(g.letter)}</p><p class="gift-detail-meta">${giftEscape(giftSender(g))} ・ ${giftDateLabel(g.createdAt)}<br>${g.until?'期限 '+giftEscape(g.until):'期限なし'}${history?'<br>受領 '+giftDateLabel(g.receivedAt):''}</p><div class="gift-rewards">${giftRewardCards(g.rewards)}</div>`,history?[]:[g.key]);
}
function confirmAllGifts(){
  if(giftClaimBusy||!giftReceivingUnlocked())return;
  try{
    const gifts=pendingGifts().filter(g=>giftFilter==='all'||g.source===giftFilter);if(!gifts.length)return;
    const rewards=giftCombineRewards(gifts);
    openGiftDialog('一括受け取りの確認',`<p>${gifts.length}件のプレゼントを受け取ります。</p><div class="gift-rewards">${giftRewardCards(rewards)}</div>`,gifts.map(g=>g.key));
  }catch(error){showUiNotice('報酬を読み込めません。','error');}
}
function showGiftResult(rewards){openGiftDialog('受け取りました',`<div class="gift-rewards">${giftRewardCards(rewards)}</div>`);}
document.addEventListener('click',e=>{
  const detail=e.target.closest('[data-gift-detail]'),claim=e.target.closest('[data-gift-claim]'),filter=e.target.closest('[data-gift-filter]');
  if(detail)openGiftDetail(detail.dataset.giftDetail);
  if(claim)claimGifts([claim.dataset.giftClaim]);
  if(filter){giftFilter=filter.dataset.giftFilter;renderGiftBox();}
});
document.getElementById('giftDialog')?.addEventListener('cancel',e=>{if(giftClaimBusy)e.preventDefault();});
// Refresh expired entries while visible, including after a sleeping mobile tab resumes.
setInterval(()=>{if(['home','giftBox'].includes(document.querySelector('.screen.active')?.id))refreshGiftUi();},60000);
