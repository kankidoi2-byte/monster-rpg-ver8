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
  if (id === 'home') renderHome();
  if (id === 'notices' && typeof renderNotices === 'function') renderNotices();
  if (id === 'party')    renderParty();
  if (id === 'dex')      renderDex();
  if (id === 'characterDex') renderCharacterDex();
  if (id === 'itemDex')  renderItemDex();
  if (id === 'partySet') renderPartySetup();
  if (id === 'shop')     renderShop();
  if (id === 'itemGacha') renderItemGacha();
  if (id === 'skillGacha') renderSkillGacha();
  if (id === 'battleItemSelect') renderBattleItemSelect();
  if (id === 'skillEdit') renderSkillEdit();
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
function appNavigationSection(screenId){
  if(['party','partySet','skillEdit','dex','characterDex','itemDex'].includes(screenId)) return 'monsters';
  if(['battleChoices','battleItemSelect','contractConfirm','battle'].includes(screenId)) return 'battle';
  if(['growthHub','fusion','alchemy','alchemyConfirm','alchemyResult','evolution'].includes(screenId)) return 'growth';
  if(['moreMenu','notices','expedition','shop','itemGacha','skillGacha','typeChart'].includes(screenId)) return 'more';
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
    const needed=lead ? needExp(lead.level||1) : 0;
    const current=Number(lead?.exp||0);
    const rate=needed ? Math.max(0,Math.min(100,current/needed*100)) : 0;
    growthPreview.innerHTML = mon ? `<div class="home-goal-icon">★</div><div><span class="ui-eyebrow">NEXT GROWTH</span><strong>${mon.name}のレベルアップまで</strong><div class="home-progress"><span style="width:${rate}%"></span></div><small>あと${Math.max(0,needed-current)} EXP</small></div><button onclick="show('party')">確認</button>` : `<div class="home-goal-icon">★</div><div><span class="ui-eyebrow">NEXT GROWTH</span><strong>仲間を選ぶと成長目標が表示されます</strong></div>`;
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
