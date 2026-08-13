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
function show(id) {
 if(id==='contractConfirm')setTimeout(refreshContractScrollDisplay,0);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'party')    renderParty();
  if (id === 'dex')      renderDex();
  if (id === 'itemDex')  renderItemDex();
  if (id === 'partySet') renderPartySetup();
  if (id === 'shop')     renderShop();
  if (id === 'itemGacha') renderItemGacha();
  if (id === 'battleItemSelect') renderBattleItemSelect();
  if (id === 'skillEdit') renderSkillEdit();
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
