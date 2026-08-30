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
  if (id === 'contractorRankRewards') renderContractorRankRewards();
  if (id === 'contractorTitles') renderContractorTitles();
  if (id === 'partySet') renderPartySetup();
  if (id === 'shop')     renderShop();
  if (id === 'itemGacha') renderItemGacha();
  if (id === 'skillGacha') renderSkillGacha();
  if (id === 'battleItemSelect') renderBattleItemSelect();
  if (id === 'skillEdit') renderSkillEdit();
  if (id === 'moreMenu' && typeof updateTutorialMenuSummary === 'function') updateTutorialMenuSummary();
  if (typeof handleTutorialScreenChange === 'function') handleTutorialScreenChange(id);
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
  const titleSummary=document.getElementById('contractorTitleMenuSummary');
  const unlockedTitleCount=Array.isArray(save?.contractor?.unlockedTitleIds)?CONTRACTOR_TITLE_CATALOG.filter(entry=>save.contractor.unlockedTitleIds.includes(entry.id)).length:0;
  if(view)view.textContent=`Rank ${progress.rank}`;
  if(summary)summary.textContent=`Rank ${progress.rank}・${title?.name||'称号未設定'}`;
  if(titleSummary)titleSummary.textContent=title?`装備中：${title.name}`:`${unlockedTitleCount}個獲得・称号未設定`;
}
function showContractorRank(){show('contractorRank');}
function showContractorRankRewards(){show('contractorRankRewards');}
function showContractorTitles(){show('contractorTitles');}
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
  const pendingRewardRanks=unclaimedContractorRankRewardRanks();
  const nextReward=progress.rank<CONTRACTOR_MAX_RANK?contractorRankReward(progress.rank+1):null;
  const progressText=progress.isMax?'MAX':`${progress.currentExp.toLocaleString('ja-JP')} / ${progress.requiredExp.toLocaleString('ja-JP')} EXP`;
  const migration=state.legacyMigrationSummary?.eligible?`<p class="contractor-migration-note">以前の勝利・図鑑・遠征記録から <strong>${Number(state.legacyMigrationSummary.grantedExp||0).toLocaleString('ja-JP')} EXP</strong> を復元済みです。</p>`:'';
  content.innerHTML=`
    <section class="contractor-rank-hero">
      <span>CONTRACTOR STATUS</span><strong>Rank ${progress.rank}</strong><p>${equipped?.name||'称号未設定'}</p><button type="button" class="contractor-title-link" onclick="showContractorTitles()">称号を変更 ›</button>
      <div class="contractor-rank-progress" role="progressbar" aria-label="次の契約者Rankまで" aria-valuemin="0" aria-valuemax="${progress.requiredExp||1}" aria-valuenow="${progress.isMax?1:progress.currentExp}"><i style="width:${Math.round(progress.ratio*100)}%"></i></div>
      <div class="contractor-rank-progress-copy"><span>${progressText}</span><span>${progress.isMax?'最高Rank到達':`あと ${progress.remainingExp.toLocaleString('ja-JP')} EXP`}</span></div>
      <small>累計 ${progress.totalExp.toLocaleString('ja-JP')} EXP</small>
    </section>
    ${migration}
    <section class="contractor-rank-card contractor-reward-preview">
      <div class="contractor-rank-card-heading"><div><span class="ui-eyebrow">RANK REWARDS</span><h2>Rank報酬</h2></div><b>${pendingRewardRanks.length?`未受取 ${pendingRewardRanks.length}件`:'未受取なし'}</b></div>
      ${pendingRewardRanks.length?`<p>${pendingRewardRanks.length===1?`Rank ${pendingRewardRanks[0]}の報酬`:`Rank ${pendingRewardRanks[0]}など${pendingRewardRanks.length}件`}を受け取れます。</p><button type="button" onclick="claimAllContractorRewardsUi()">未受取をまとめて受け取る</button>`:nextReward?`<p>次はRank ${nextReward.rank}で新しい報酬を受け取れます。</p>`:'<p>Rank 50までの報酬をすべて受け取りました。</p>'}
      <button type="button" class="secondary-button" onclick="showContractorRankRewards()">報酬一覧を見る ›</button>
    </section>
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
function contractorRewardItemMeta(itemId){return (typeof ITEM_BY_ID!=='undefined'&&ITEM_BY_ID[itemId])||{id:itemId,name:itemId,icon:'🎁'};}
function contractorRewardParts(reward){
  if(!reward)return [];
  const parts=[];
  if(reward.coins>0)parts.push(`🪙 コイン ${reward.coins.toLocaleString('ja-JP')}枚`);
  Object.entries(reward.items).forEach(([itemId,count])=>{const item=contractorRewardItemMeta(itemId);parts.push(`${item.icon||'🎁'} ${item.name} ×${count}`);});
  const title=reward.titleId?contractorTitleById(reward.titleId):null;
  if(title)parts.push(`🎖️ 称号「${title.name}」（到達時獲得）`);
  return parts;
}
function contractorRewardCard(reward,{compact=false}={}){
  const state=ensureContractorState();
  const currentRank=contractorRankFromExp(state.exp);
  const claimed=state.claimedRankRewards.includes(reward.rank);
  const available=currentRank>=reward.rank&&!claimed;
  const status=claimed?'受取済み':available?'受取可能':`Rank ${reward.rank}で解放`;
  const action=available?`<button type="button" onclick="claimContractorRewardUi(${reward.rank})">受け取る</button>`:`<button type="button" disabled>${status}</button>`;
  return `<article class="contractor-reward-card${claimed?' is-claimed':''}${available?' is-available':''}${currentRank<reward.rank?' is-locked':''}${compact?' is-compact':''}">
    <div class="contractor-reward-rank"><small>RANK</small><strong>${reward.rank}</strong></div>
    <div class="contractor-reward-copy"><span>${status}</span><div>${contractorRewardParts(reward).map(part=>`<p>${part}</p>`).join('')}</div></div>${action}
  </article>`;
}
function renderContractorRankRewards(){
  const content=document.getElementById('contractorRewardContent');
  if(!content||typeof contractorRankReward!=='function')return;
  const progress=contractorRankProgress(save?.contractor?.exp||0);
  const pendingRanks=unclaimedContractorRankRewardRanks();
  const pendingRewards=pendingRanks.map(contractorRankReward).filter(Boolean);
  const nextRewards=CONTRACTOR_RANK_REWARD_CATALOG.filter(reward=>reward.rank>progress.rank).slice(0,5);
  content.innerHTML=`<section class="contractor-reward-summary">
      <div><span class="ui-eyebrow">CURRENT RANK</span><strong>Rank ${progress.rank}</strong><small>${pendingRanks.length?`未受取 ${pendingRanks.length}件`:'受け取れる報酬はありません'}</small></div>
      <button type="button" onclick="claimAllContractorRewardsUi()" ${pendingRanks.length?'':'disabled'}>すべて受け取る</button>
    </section>
    <section class="contractor-reward-section"><div class="contractor-rank-card-heading"><div><span class="ui-eyebrow">AVAILABLE</span><h2>受取可能な報酬</h2></div></div>
      <div class="contractor-reward-list">${pendingRewards.length?pendingRewards.map(reward=>contractorRewardCard(reward)).join(''):'<p class="contractor-reward-empty">現在受け取れる報酬はありません。</p>'}</div>
    </section>
    ${nextRewards.length?`<section class="contractor-reward-section"><div class="contractor-rank-card-heading"><div><span class="ui-eyebrow">UP NEXT</span><h2>次の報酬</h2></div></div><div class="contractor-reward-list">${nextRewards.map(reward=>contractorRewardCard(reward,{compact:true})).join('')}</div></section>`:''}
    <details class="contractor-reward-all"><summary>Rank 2〜50の全報酬を見る</summary><div class="contractor-reward-list">${CONTRACTOR_RANK_REWARD_CATALOG.map(reward=>contractorRewardCard(reward,{compact:true})).join('')}</div></details>`;
}
function contractorClaimNotice(result){
  const count=Array.isArray(result.claimedRanks)?result.claimedRanks.length:result.claimed?1:0;
  const parts=[];
  if(result.coins>0)parts.push(`コイン${result.coins.toLocaleString('ja-JP')}枚`);
  const itemCount=Object.values(result.items||{}).reduce((sum,value)=>sum+Number(value||0),0);
  if(itemCount)parts.push(`アイテム${itemCount}個`);
  return `Rank報酬${count>1?`${count}件`:''}を受け取りました${parts.length?`（${parts.join('・')}）`:''}。`;
}
function finishContractorRewardClaim(result){
  if(!result?.claimed)return false;
  if(typeof saveGame==='function')saveGame();
  if(typeof updateItems==='function')updateItems();
  updateAppResourceBar();
  updateContractorRankHeader();
  if(document.getElementById('contractorRankRewards')?.classList.contains('active'))renderContractorRankRewards();
  if(document.getElementById('contractorRank')?.classList.contains('active'))renderContractorRank();
  if(typeof showUiNotice==='function')showUiNotice(contractorClaimNotice(result));
  return true;
}
function claimContractorRewardUi(rank){return finishContractorRewardClaim(claimContractorRankReward(rank));}
function claimAllContractorRewardsUi(){return finishContractorRewardClaim(claimAllContractorRankRewards());}
function renderContractorTitles(){
  const content=document.getElementById('contractorTitleContent');
  if(!content||typeof contractorTitleById!=='function')return;
  const state=ensureContractorState();
  const equipped=equippedContractorTitle();
  const unlocked=new Set(state.unlockedTitleIds);
  const unlockedCount=CONTRACTOR_TITLE_CATALOG.filter(title=>unlocked.has(title.id)).length;
  const cards=CONTRACTOR_TITLE_CATALOG.map(title=>{
    const isUnlocked=unlocked.has(title.id);
    const isEquipped=state.equippedTitleId===title.id;
    const action=isUnlocked
      ?`<button type="button" aria-pressed="${isEquipped}" onclick="setContractorTitle('${isEquipped?'':title.id}')">${isEquipped?'称号を外す':'この称号を装備'}</button>`
      :`<button type="button" disabled>Rank ${title.rank}で獲得</button>`;
    return `<article class="contractor-title-card${isUnlocked?' is-unlocked':' is-locked'}${isEquipped?' is-equipped':''}">
      <div class="contractor-title-medal" aria-hidden="true">${isUnlocked?'✦':'?'}</div>
      <div class="contractor-title-copy"><span>RANK ${title.rank}${isEquipped?'・装備中':''}</span><h2>${title.name}</h2><p>${title.description}</p><small>${isUnlocked?'獲得済み':`契約者Rank ${title.rank}で獲得`}</small></div>${action}
    </article>`;
  }).join('');
  content.innerHTML=`<section class="contractor-title-current">
      <span class="ui-eyebrow">EQUIPPED TITLE</span><div><i aria-hidden="true">🎖️</i><p><small>現在の称号</small><strong>${equipped?.name||'称号未設定'}</strong></p></div>
      <small>獲得済み ${unlockedCount} / ${CONTRACTOR_TITLE_CATALOG.length}</small>
    </section>
    <section class="contractor-title-list" aria-label="称号一覧">${cards}</section>
    <p class="contractor-title-note">称号は冒険の達成記録です。装備しても戦闘能力や利用できる機能は変わりません。</p>`;
}
function setContractorTitle(titleId){
  const previous=equippedContractorTitle();
  if(!equipContractorTitle(titleId||null)){
    if(typeof showUiNotice==='function')showUiNotice('未獲得の称号は装備できません。','warning');
    return false;
  }
  if(typeof saveGame==='function')saveGame();
  const current=equippedContractorTitle();
  updateContractorRankHeader();
  renderContractorTitles();
  if(document.getElementById('contractorRank')?.classList.contains('active'))renderContractorRank();
  if(typeof showUiNotice==='function')showUiNotice(current?`称号「${current.name}」を装備しました。`:previous?'称号を外しました。':'称号未設定です。');
  return true;
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
  document.getElementById('contractorRankUpTitles').innerHTML=`${titles.length?titles.map(title=>`<p>称号「<strong>${title.name}</strong>」を獲得</p>`).join(''):'<p>新しいRankに到達しました。</p>'}<p>Rank ${entry.toRank}までの報酬を受け取れます。</p>`;
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
  if(document.getElementById('contractorTitles')?.classList.contains('active'))renderContractorTitles();
  if(document.getElementById('contractorRankRewards')?.classList.contains('active'))renderContractorRankRewards();
  contractorRankUpPreviousFocus?.focus?.();
  contractorRankUpPreviousFocus=null;
  scheduleContractorRankUpPresentation();
}
function refreshContractorRankUi(){
  updateContractorRankHeader();
  if(document.getElementById('contractorRank')?.classList.contains('active'))renderContractorRank();
  if(document.getElementById('contractorTitles')?.classList.contains('active'))renderContractorTitles();
  if(document.getElementById('contractorRankRewards')?.classList.contains('active'))renderContractorRankRewards();
  scheduleContractorRankUpPresentation();
}
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('contractorRankUpOverlay')?.classList.contains('hidden'))closeContractorRankUp();});
function appNavigationSection(screenId){
  if(['party','partySet','skillEdit'].includes(screenId)) return 'monsters';
  if(['battleChoices','battleItemSelect','contractConfirm','battle'].includes(screenId)) return 'battle';
  if(['growthHub','fusion','alchemy','alchemyConfirm','alchemyResult','evolution'].includes(screenId)) return 'growth';
  if(['moreMenu','contractorRank','contractorRankRewards','contractorTitles','notices','expedition','shop','itemGacha','skillGacha','typeChart','dexHub','dex','characterDex','mapDex','itemDex'].includes(screenId)) return 'more';
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
  const storyPreview = document.getElementById('homeStoryPreview');
  const partyPreview = document.getElementById('homePartyPreview');
  const growthPreview = document.getElementById('homeGrowthPreview');
  const expeditionPreview = document.getElementById('homeExpeditionPreview');
  if (typeof renderNoticePreview === 'function') renderNoticePreview();
  if(storyPreview){
    const chapterOne=save?.progress?.chapterId==='chapter1'||save?.progress?.storyFlags?.chapter1Unlocked===true;
    storyPreview.innerHTML=chapterOne?`<button id="homeChapterOneButton" onclick="openChapterOneEntry()"><span><small>STORY</small><strong>第1章への道</strong><em>序章クリア・次の冒険へ進む</em></span><b>物語へ ›</b></button>`:'';
    storyPreview.hidden=!chapterOne;
  }
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
function openChapterOneEntry(){
  if(save?.progress?.chapterId!=='chapter1'&&save?.progress?.storyFlags?.chapter1Unlocked!==true)return false;
  if(typeof showUiNotice==='function')showUiNotice('第1章への道が開きました。次の討伐依頼から冒険を続けましょう。');
  openBattleHub();return true;
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
    `<div id="typeBasicChart" class="chart-group"><h2>🔥💧⚡🌬️🌿 基本5属性</h2><div class="type-wheel">${basic5.map(row).join('')}</div></div>` +
    `<div id="typeSpecialChart" class="chart-group"><h2>✨🌙🌌 特殊3属性</h2><div class="type-wheel">${special3.map(row).join('')}</div></div>` +
    `<div id="typeDragonChart" class="chart-group"><h2><span class="dragon">竜</span>属性</h2><p style="text-align:left">竜は独立属性。竜同士の攻撃で少し有利（×1.2）。</p></div>`;
}
