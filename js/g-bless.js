/* G-BLESS presentation. Gameplay state and constants live in save.js. */
let gBlessReturnFocus=null,gBlessConfirmOwner=null,gBlessConfirmIdentity=null;
function syncGBlessHeader(){
  const header=document.querySelector('.app-topbar'),rank=header?.querySelector('.contractor-rank'),group=header?.querySelector('.app-resource-group');
  if(!header||!rank||!group)return;
  const stacked=header.offsetHeight>0&&!document.getElementById('gBlessChip').hidden&&group.getBoundingClientRect().top>=rank.getBoundingClientRect().bottom-.5;
  document.body.classList.toggle('gb-header-stacked',stacked);
  document.documentElement.style.setProperty('--g-bless-bar-height',header.offsetHeight+'px');
}
function renderGBless(){
  const chip=document.getElementById('gBlessChip');if(!chip)return;
  // Do not mutate a pending victory receipt while its save is being retried.
  const pending=typeof normalVictoryPending==='function'&&normalVictoryPending();
  const s=pending?(save.gBless||normalizeGBless(null)):ensureGBless(),total=gBlessTotal(s);
  chip.hidden=!gBlessUnlocked();chip.disabled=pending;
  chip.classList.toggle('on',s.on);chip.style.setProperty('--p',s.week);
  document.getElementById('gBlessChipText').textContent='G-BLESS '+gBlessTotalText(s);
  chip.setAttribute('aria-label','G-BLESS 加護 '+gBlessTotalText(s)+'、'+(s.on?'オン':'オフ'));
  syncGBlessHeader();
  if(!document.getElementById('gBlessDialog')?.open)return;
  const sw=document.getElementById('gBlessSwitch');sw.disabled=!total||pending;sw.classList.toggle('on',s.on);sw.setAttribute('aria-checked',String(s.on));
  document.getElementById('gBlessToggle').classList.toggle('on',s.on);
  document.getElementById('gBlessToggleTitle').textContent=s.on?'G-BLESSを使っています':'G-BLESSを使う';
  document.getElementById('gBlessToggleHint').textContent=!total?'加護がありません。週の回復を待つか、予備を増やそう':s.on?'勝つたびに1つ消費しています':'オンの間、勝つたびに1つ消費';
  for(const [id,n] of [['gBlessTotal',gBlessTotalText(s)],['gBlessWeek',s.week],['gBlessReserve',s.reserve]])document.getElementById(id).textContent=n.toLocaleString('ja-JP');
  const remaining=Math.max(0,Date.parse(s.weekKey+'T04:00:00+09:00')+7*86400000-Date.now()),hours=Math.ceil(remaining/3600000);
  document.getElementById('gBlessReset').textContent=`（あと${Math.floor(hours/24)}日${hours%24}時間）`;
  const scale=Math.max(G_BLESS_RULES.week,s.week+s.reserve);
  document.getElementById('gBlessWeekBar').style.width=s.week/scale*100+'%';document.getElementById('gBlessReserveBar').style.width=s.reserve/scale*100+'%';
  const count=save.items.g_ichor||0,button=document.getElementById('gBlessIchor');
  button.textContent=`G-ICHORを使う（所持 ${count.toLocaleString('ja-JP')}）`;button.disabled=pending||count<=0||s.week>=G_BLESS_RULES.week;
}
function openGBless(){
  if(!gBlessUnlocked()||(typeof normalVictoryPending==='function'&&normalVictoryPending()))return;
  gBlessReturnFocus=document.activeElement;
  document.getElementById('gBlessDialog').showModal();renderGBless();
}
function closeGBless(){document.getElementById('gBlessDialog').close();gBlessReturnFocus?.focus();}
function toggleGBless(){
  if(!gBlessUnlocked()||normalVictoryPending())return;
  if(!commitSaveMutation(()=>{const s=ensureGBless();if(gBlessTotal(s))s.on=!s.on;})){showUiNotice('保存できなかったため、切り替えませんでした。','error');}
  renderGBless();
}
function confirmGBlessIchor(){
  if(normalVictoryPending())return;
  const s=ensureGBless();if(!gBlessUnlocked()||!(save.items.g_ichor>0)||s.week>=G_BLESS_RULES.week)return;
  gBlessConfirmOwner=save;gBlessConfirmIdentity=saveTransactionIdentity();
  document.getElementById('gBlessIchorBefore').textContent=s.week;
  document.getElementById('gBlessIchorGauge').style.width=s.week+'%';
  document.getElementById('gBlessIchorDialog').showModal();
}
function useGBlessIchor(){
  const dialog=document.getElementById('gBlessIchorDialog');
  if(save!==gBlessConfirmOwner||saveTransactionIdentity()!==gBlessConfirmIdentity||normalVictoryPending()||!gBlessUnlocked()){dialog.close();return false;}
  let used=false;
  const ok=commitSaveMutation(()=>{
    const s=ensureGBless();if(!(save.items.g_ichor>0)||s.week>=G_BLESS_RULES.week)return;
    save.items.g_ichor--;s.week=G_BLESS_RULES.week;used=true;
  });
  if(!ok){if(saveTransactionIdentity()===gBlessConfirmIdentity)gBlessConfirmOwner=save;showUiNotice('保存できなかったため、アイテムは使われませんでした。','error');renderGBless();return false;}
  dialog.close();renderGBless();return used;
}
for(const id of ['gBlessDialog','gBlessIchorDialog']){
  const d=document.getElementById(id);
  d?.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderGBless();});
setInterval(()=>{if(!document.hidden)renderGBless();},60000);

if(typeof ResizeObserver!=='undefined')new ResizeObserver(syncGBlessHeader).observe(document.querySelector('.app-topbar'));
