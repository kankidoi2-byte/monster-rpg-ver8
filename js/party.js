function renderParty() {
  const el = document.getElementById('partyList');
  if (!el) return;
  ensureContractScrollItem();
  const dataItems = getDataItems();
  el.innerHTML = `<div class="panel" style="text-align:left">
    <h2>💼 アイテム</h2>
    <p>💰 コイン：${save.coins||0}</p>
    <p>${itemCountText()}</p>
    <p>💾 キロデータ × ${save.items.kilo_data||0} / 💿 メガデータ × ${save.items.mega_data||0} / 🧠 ギガデータ × ${save.items.giga_data||0}</p>
    <p>${itemInlineVisual(ITEM_DEX_BY_ID.water_mirror,'item-material-image')} 水鏡 × ${save.items.water_mirror||0} / 🌑 滅亡のカケラ × ${save.items.doom_fragment||0}</p>
    <p class="small">錬成素材：${SHOP_ITEMS.filter(it=>it.alchemyMaterial).map(it=>`${it.icon} ${it.name} × ${save.items[it.id]||0}`).join(' / ')}</p>
    <p class="small">データ系アイテムは、下の手持ちモンスターカードから与えられます。</p>
  </div>`;
  if (!save.instances.length) { el.innerHTML += "<div class='panel'>まだ手持ちがいない。</div>"; return; }
  save.instances.forEach((ins, i) => {
    const m = by(ins.id); if (!m) return;
    el.innerHTML += `<div class="card">
      ${vis(m)}<h3>${m.name}</h3>
      <p><span class="instance-badge">個体${i+1}・${String(ins.uid).slice(-6)}</span> ${ins.locked?'🔒':'🔓'}</p>
      <p><span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</p>
      <p>Lv.${ins.level} EXP ${ins.exp}/${needExp(ins.level)}</p>
      ${instanceAlchemySummary(ins)}
      <div class="mini"><b>装備技</b><br>${getEquippedSkillIds(ins).map(id=>{const sk=SKILL_BY_ID[id]; return `<span class="${sk.type}">${sk.name}</span>`;}).join(' / ')}<br><span class="small">コスト ${equippedSkillCost(ins)}/${skillCostLimitFor(m,ins)}</span><br><button onclick="openSkillEdit('${ins.uid}')">🃏 技変更</button></div>
      <div class="mini">
        ${dataItems.map(it => `<button onclick="useExpItemOnInstance('${it.id}','${ins.uid}')" ${((save.items[it.id]||0)<=0)?'disabled':''}>${itemInlineVisual(it)}${it.name}</button>`).join('')}
      </div>
      <button onclick="toggleInstanceLock('${ins.uid}')" style="background:linear-gradient(135deg,#374151,#4b5563)">${ins.locked?'🔓 ロック解除':'🔒 ロックする'}</button>
      <p style="font-size:12px;color:#8892b0">${m.desc}</p></div>`;
  });
}
function instanceAlchemySummary(ins){
  if(!ins?.alchemy) return '';
  const mod = ins.alchemy.statModifiers || {};
  const pct = value => `${value >= 1 ? '+' : ''}${Math.round((Number(value||1)-1)*100)}%`;
  return `<div class="mini"><b>錬成個体：${ins.alchemy.archetypeLabel}</b><br><span class="small">HP ${pct(mod.hp)} / 攻撃 ${pct(mod.attack)} / 素早さ ${pct(mod.speed)}</span></div>`;
}
function toggleInstanceLock(uidValue){
  const ins = getInstance(uidValue);
  if(!ins) return;
  ins.locked = !ins.locked;
  saveGame();
  renderParty();
  if(typeof renderAlchemy === 'function' && document.getElementById('alchemy')?.classList.contains('active')) renderAlchemy();
}
function togglePartyMember(u) {
  if (!save.party) save.party = [];
  const idx = save.party.indexOf(u);
  if (idx >= 0) {
    save.party.splice(idx, 1);
  } else {
    if (typeof isInstanceOnExpedition === 'function' && isInstanceOnExpedition(u)) { alert('遠征中のモンスターはパーティーに編成できません。'); return; }
    if (save.party.length >= 3) { alert('パーティーは最大3体まで！'); return; }
    if (getInstance(u)) save.party.push(u);
  }
  saveGame(); renderPartySetup();
}
function renderPartySetup() {
  const cur  = document.getElementById('currentPartyView');
  const list = document.getElementById('partySelectList');
  if (!cur || !list) return;
  const party = getPartyInstances();
  cur.innerHTML = party.length
    ? party.map((ins,i) => { const m=by(ins.id); return `<div class="mini">${i+1}. ${m.name} <span class="small">Lv.${ins.level}</span></div>`; }).join('')
    : '<p class="small">まだ設定されていません。</p>';
  list.innerHTML = save.instances.map(ins => {
    const m = by(ins.id); if (!m) return '';
    const inParty = (save.party||[]).includes(ins.uid);
    const onExpedition = typeof isInstanceOnExpedition === 'function' && isInstanceOnExpedition(ins.uid);
    return `<div class="card">
      ${vis(m)}<h2>${m.name}</h2>
      <p><span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</p>
      <p>Lv.${ins.level} EXP ${ins.exp}/${needExp(ins.level)}</p>
      <button onclick="togglePartyMember('${ins.uid}')" ${onExpedition&&!inParty?'disabled':''}>${inParty?'パーティーから外す':onExpedition?'遠征中':'パーティーに入れる'}</button>
    </div>`;
  }).join('');
}
