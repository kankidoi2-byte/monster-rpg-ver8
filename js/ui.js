function typesHtml(ts) {
  return ts.map(t => `<span class="${t}">${TN[t]}</span>`).join(' / ');
}
function vis(m, imageAttributes = '') {
  if (m.imgKey && IMG[m.imgKey]) {
    const attributes = imageAttributes ? ` ${imageAttributes}` : '';
    return `<img${attributes} src="${IMG[m.imgKey]}" alt="${m.name}" style="width:120px;height:120px;object-fit:contain;border-radius:12px;display:block;margin:0 auto;">`;
  }
  return `<div class="emoji">${m.icon || '❓'}</div>`;
}
function replayUiMotion(element, className, duration=700) {
  if (!element) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  setTimeout(() => element.classList.remove(className), duration);
}
function showUiNotice(message, kind='success') {
  let notice = document.getElementById('uiNotice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'uiNotice';
    notice.className = 'ui-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    document.body.appendChild(notice);
  }
  notice.className = `ui-notice is-${kind}`;
  notice.textContent = message;
  replayUiMotion(notice, 'is-visible', 2200);
}
function show(id) {
 if(id==='contractConfirm')setTimeout(refreshContractScrollDisplay,0);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (!target) return;
  target.classList.add('active');
  replayUiMotion(target, 'ui-screen-enter', 320);
  updateAppNavigation(id);
  updateAppResourceBar();
  updateContractorRankHeader();
  if (id === 'home') renderHome();
  if (id === 'notices' && typeof renderNotices === 'function') renderNotices();
  if (id === 'party')    renderParty();
  if (id === 'dexHub')   renderDexHub();
  if (id === 'dex')      renderDex();
  if (id === 'characterDex') renderCharacterDex();
  if (id === 'mapDex')   renderMapDex();
  if (id === 'itemDex')  renderItemDex();
  if (id === 'contractorRank') renderContractorRank();
  if (id === 'partySet') renderPartySetup();
  if (id === 'shop')     renderShop();
  if (id === 'itemGacha') renderItemGacha();
  if (id === 'skillGacha') renderSkillGacha();
  if (id === 'battleItemSelect') renderBattleItemSelect();
  if (id === 'skillEdit') renderSkillEdit();
  scheduleContractorRankUpPresentation();
}
function openBattleHub(){
  const party = typeof getPartyInstances === 'function' ? getPartyInstances() : [];
  if(party.length && typeof startBattleFromParty === 'function'){
    startBattleFromParty();
    return;
  }
  show('partySet');
}
function updateAppResourceBar(){
  const coinView = document.getElementById('appCoinView');
  if(coinView) coinView.textContent = Number(save?.coins || 0).toLocaleString('ja-JP');
}
const CONTRACTOR_EXP_SOURCE_LABELS=Object.freeze({
  battle_easy:'Easy討伐勝利',battle_normal:'Normal討伐勝利',battle_hard:'Hard討伐勝利',battle_extreme:'Extreme討伐勝利',multi_battle_bonus:'三つ巴・乱入戦勝利',
  contract_success:'契約成功',first_species_contract:'初めての種族と契約',dex_registration:'モンスター図鑑登録',item_dex_registration:'アイテム図鑑登録',map_dex_registration:'マップ図鑑登録',dex_milestone:'図鑑登録数達成',
  evolution:'進化',special_evolution:'特殊進化・合成',alchemy_success:'錬成成功',expedition_short:'短距離遠征',expedition_medium:'中距離遠征',expedition_long:'長距離遠征',boss_first_win:'ボス初回撃破',
  legacy_activity:'これまでの冒険記録',legacy_dex_milestone:'これまでの図鑑達成'
});
let contractorRankUpTimer=null;
let contractorRankUpPreviousFocus=null;
function contractorExpSourceLabel(source){return CONTRACTOR_EXP_SOURCE_LABELS[source]||'冒険の記録';}
function updateContractorRankHeader(){
  if(typeof contractorRankProgress!=='function')return;
  const progress=contractorRankProgress(save?.contractor?.exp||0);
  const title=typeof equippedContractorTitle==='function'?equippedContractorTitle():null;
  const view=document.getElementById('contractorRankView');
  const summary=document.getElementById('contractorRankMenuSummary');
  if(view)view.textContent=`Rank ${progress.rank}`;
  if(summary)summary.textContent=`Rank ${progress.rank}・${title?.name||'称号未設定'}`;
}
function showContractorRank(){show('contractorRank');}
function contractorRecentExpTime(value){
  const date=new Date(value);
  if(!value||Number.isNaN(date.getTime()))return '';
  return new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
}
function renderContractorRank(){
  const content=document.getElementById('contractorRankContent');
  if(!content||typeof contractorRankProgress!=='function')return;
  const state=ensureContractorState();
  const progress=contractorRankProgress(state.exp);
  const equipped=equippedContractorTitle();
  const nextTitle=CONTRACTOR_TITLE_CATALOG.find(title=>title.category==='rank'&&title.rank>progress.rank)||null;
  const recent=[...state.recentExp].reverse().slice(0,8);
  const unlockedRankTitles=CONTRACTOR_TITLE_CATALOG.filter(title=>title.category==='rank'&&state.unlockedTitleIds.includes(title.id));
  const progressText=progress.isMax?'MAX':`${progress.currentExp.toLocaleString('ja-JP')} / ${progress.requiredExp.toLocaleString('ja-JP')} EXP`;
  const migration=state.legacyMigrationSummary?.eligible?`<p class="contractor-migration-note">以前の勝利・図鑑・遠征記録から <strong>${Number(state.legacyMigrationSummary.grantedExp||0).toLocaleString('ja-JP')} EXP</strong> を復元済みです。</p>`:'';
  content.innerHTML=`
    <section class="contractor-rank-hero">
      <span>CONTRACTOR STATUS</span><strong>Rank ${progress.rank}</strong><p>${equipped?.name||'称号未設定'}</p>
      <div class="contractor-rank-progress" role="progressbar" aria-label="次の契約者Rankまで" aria-valuemin="0" aria-valuemax="${progress.requiredExp||1}" aria-valuenow="${progress.isMax?1:progress.currentExp}"><i style="width:${Math.round(progress.ratio*100)}%"></i></div>
      <div class="contractor-rank-progress-copy"><span>${progressText}</span><span>${progress.isMax?'最高Rank到達':`あと ${progress.remainingExp.toLocaleString('ja-JP')} EXP`}</span></div>
      <small>累計 ${progress.totalExp.toLocaleString('ja-JP')} EXP</small>
    </section>
    ${migration}
    <section class="contractor-rank-card">
      <div class="contractor-rank-card-heading"><div><span class="ui-eyebrow">NEXT TITLE</span><h2>次の称号</h2></div><b>${unlockedRankTitles.length} / ${CONTRACTOR_TITLE_CATALOG.length}</b></div>
      ${nextTitle?`<div class="contractor-next-title"><span>Rank ${nextTitle.rank}</span><div><strong>${nextTitle.name}</strong><small>${nextTitle.description}</small></div></div>`:`<div class="contractor-next-title is-complete"><span>★</span><div><strong>すべてのRank称号を獲得</strong><small>星を結ぶ契約者として歩み続けましょう。</small></div></div>`}
    </section>
    <section class="contractor-rank-card">
      <div class="contractor-rank-card-heading"><div><span class="ui-eyebrow">RECENT EXP</span><h2>最近の契約者EXP</h2></div></div>
      <div class="contractor-exp-history">${recent.length?recent.map(entry=>`<div><span>＋${Number(entry.amount||0).toLocaleString('ja-JP')}</span><strong>${contractorExpSourceLabel(entry.source)}</strong><small>${contractorRecentExpTime(entry.awardedAt)}</small></div>`).join(''):'<p>まだ契約者EXPの獲得記録はありません。</p>'}</div>
    </section>
    <section class="contractor-rank-card contractor-exp-guide">
      <div class="contractor-rank-card-heading"><div><span class="ui-eyebrow">HOW TO GROW</span><h2>Rankを上げる方法</h2></div></div>
      <div><span>⚔️<strong>討伐・ボス撃破</strong></span><span>🤝<strong>契約・図鑑登録</strong></span><span>✦<strong>進化・錬成</strong></span><span>🧭<strong>遠征完了</strong></span></div>
      <p>Rankによる機能制限やモンスターの能力補正はありません。</p>
    </section>`;
}
function contractorRankUpCanPresent(){
  const active=document.querySelector('.screen.active')?.id;
  return !document.body.classList.contains('title-mode')&&!['battle','battleItemSelect','contractConfirm'].includes(active||'')&&document.getElementById('contractorRankUpOverlay')?.classList.contains('hidden');
}
function scheduleContractorRankUpPresentation(){
  clearTimeout(contractorRankUpTimer);
  const pending=save?.contractor?.pendingRankUps;
  if(!Array.isArray(pending)||!pending.length)return;
  contractorRankUpTimer=setTimeout(()=>{if(contractorRankUpCanPresent())presentNextContractorRankUp();},450);
}
function presentNextContractorRankUp(){
  const state=ensureContractorState();
  const entry=state.pendingRankUps[0];
  const overlay=document.getElementById('contractorRankUpOverlay');
  if(!entry||!overlay||!contractorRankUpCanPresent())return;
  contractorRankUpPreviousFocus=document.activeElement;
  document.getElementById('contractorRankUpValue').textContent=`Rank ${entry.fromRank} → Rank ${entry.toRank}`;
  const titles=(entry.unlockedTitleIds||[]).map(contractorTitleById).filter(Boolean);
  document.getElementById('contractorRankUpTitles').innerHTML=titles.length?titles.map(title=>`<p>称号「<strong>${title.name}</strong>」を獲得</p>`).join(''):'<p>新しいRankに到達しました。</p>';
  overlay.classList.remove('hidden');
  overlay.querySelector('button')?.focus();
}
function closeContractorRankUp(){
  const overlay=document.getElementById('contractorRankUpOverlay');
  if(!overlay||overlay.classList.contains('hidden'))return;
  ensureContractorState().pendingRankUps.shift();
  overlay.classList.add('hidden');
  if(typeof saveGame==='function')saveGame();
  updateContractorRankHeader();
  if(document.getElementById('contractorRank')?.classList.contains('active'))renderContractorRank();
  contractorRankUpPreviousFocus?.focus?.();
  contractorRankUpPreviousFocus=null;
  scheduleContractorRankUpPresentation();
}
function refreshContractorRankUi(){
  updateContractorRankHeader();
  if(document.getElementById('contractorRank')?.classList.contains('active'))renderContractorRank();
  scheduleContractorRankUpPresentation();
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('contractorRankUpOverlay')?.classList.contains('hidden'))closeContractorRankUp();});
function appNavigationSection(screenId){
  if(['party','partySet','skillEdit'].includes(screenId)) return 'monsters';
  if(['battleChoices','battleItemSelect','contractConfirm','battle'].includes(screenId)) return 'battle';
  if(['growthHub','fusion','alchemy','alchemyConfirm','alchemyResult','evolution'].includes(screenId)) return 'growth';
  if(['moreMenu','contractorRank','notices','expedition','shop','itemGacha','skillGacha','typeChart','dexHub','dex','characterDex','mapDex','itemDex'].includes(screenId)) return 'more';
  return 'home';
}
function updateAppNavigation(screenId){
  const nav = document.querySelector('.app-bottom-nav');
  if(!nav) return;
  const battleActive = ['battle','battleItemSelect','contractConfirm'].includes(screenId);
  nav.classList.toggle('is-battle-hidden', battleActive);
  const section = appNavigationSection(screenId);
  nav.querySelectorAll('[data-nav]').forEach(button => button.classList.toggle('is-current', button.dataset.nav === section));
}
function renderHome(){
  const partyPreview = document.getElementById('homePartyPreview');
  const growthPreview = document.getElementById('homeGrowthPreview');
  const expeditionPreview = document.getElementById('homeExpeditionPreview');
  if (typeof renderNoticePreview === 'function') renderNoticePreview();
  const party = typeof getPartyInstances === 'function' ? getPartyInstances() : [];
  if(partyPreview){
    partyPreview.innerHTML = party.length ? party.map((ins,index)=>{
      const mon=by(ins.id);
      if(!mon) return '';
      return `<button class="home-party-member ${index===0?'is-leader':''}" onclick="show('partySet')">${index===0?'<span>LEADER</span>':''}${vis(mon)}<strong>${mon.name}</strong><small>Lv.${ins.level||1}</small></button>`;
    }).join('') : `<button class="home-empty-party" onclick="show('partySet')"><strong>パーティーを編成する</strong><small>最初の仲間を選びましょう</small></button>`;
  }
  if(growthPreview){
    const lead=party[0];
    const mon=lead ? by(lead.id) : null;
    const atMax=lead ? isMaxLevel(lead.level) : false;
    const needed=lead&&!atMax ? needExp(lead.level||1) : 0;
    const current=Number(lead?.exp||0);
    const rate=needed ? Math.max(0,Math.min(100,current/needed*100)) : 0;
    growthPreview.innerHTML = mon ? `<div class="home-goal-icon">★</div><div><span class="ui-eyebrow">NEXT GROWTH</span><strong>${atMax?`${mon.name}は Lv.MAX`:`${mon.name}のレベルアップまで`}</strong><div class="home-progress"><span style="width:${atMax?100:rate}%"></span></div><small>${atMax?'最大レベル到達':`あと${Math.max(0,needed-current)} EXP`}</small></div><button onclick="show('party')">確認</button>` : `<div class="home-goal-icon">★</div><div><span class="ui-eyebrow">NEXT GROWTH</span><strong>仲間を選ぶと成長目標が表示されます</strong></div>`;
  }
  if(expeditionPreview){
    const active=Array.isArray(save?.expeditions?.active) ? save.expeditions.active : [];
    const completed=active.filter(entry=>entry?.status==='complete').length;
    expeditionPreview.innerHTML = completed ? `<div><span class="ui-eyebrow">EXPEDITION</span><strong>${completed}件の遠征報酬を受け取れます</strong></div><button onclick="showExpedition()">受け取る</button>` : `<div><span class="ui-eyebrow">EXPEDITION</span><strong>${active.length?'遠征が進行中です':'遠征枠が空いています'}</strong></div><button onclick="showExpedition()">${active.length?'確認':'派遣する'}</button>`;
  }
}
function showTypeChart() {
  show('typeChart');
  const el = document.getElementById('typeChartList');
  const basic5 = [['fire','grass','water'],['water','fire','thunder'],['thunder','water','wind'],['wind','thunder','grass'],['grass','wind','fire']];
  const special3 = [['light','dark','star'],['dark','star','light'],['star','light','dark']];
  const row = ([atk,adv,bad]) =>
    `<div class="tw-item"><span class="tw-type ${atk}">${TN[atk]}</span>
     <span class="tw-adv">→×1.5 </span><span class="tw-type ${adv}">${TN[adv]}</span>
     <span class="tw-bad"> →×0.7 </span><span class="tw-type ${bad}">${TN[bad]}</span></div>`;
  el.innerHTML =
    `<div class="chart-group"><h2>🔥💧⚡🌬️🌿 基本5属性</h2><div class="type-wheel">${basic5.map(row).join('')}</div></div>` +
    `<div class="chart-group"><h2>✨🌙🌌 特殊3属性</h2><div class="type-wheel">${special3.map(row).join('')}</div></div>` +
    `<div class="chart-group"><h2><span class="dragon">竜</span>属性</h2><p style="text-align:left">竜は独立属性。竜同士の攻撃で少し有利（×1.2）。</p></div>`;
}
