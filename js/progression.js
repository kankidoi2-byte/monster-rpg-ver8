function showFusion() { show('fusion'); renderFusion(); }
function renderFusion() {
  const itemText = document.getElementById('fusionItemText');
  if (itemText) {
    const fusionItems = [...new Map(FUSIONS.map(r => [r.item, r])).values()];
    itemText.innerHTML = '所持アイテム：' + fusionItems.map(r => `${r.item === 'fire_orb' ? `${itemInlineVisual(ITEM_DEX_BY_ID.fire_orb)} ` : ''}${r.itemName} × ${save.items[r.item]||0}`).join(' / ');
  }
  document.getElementById('fusionList').innerHTML = FUSIONS.map((r,idx) => {
    const from = by(r.from), to = by(r.to);
    const hasM = save.instances.some(ins => ins.id === r.from && !(typeof isInstanceOnExpedition==='function'&&isInstanceOnExpedition(ins.uid)));
    const hasI = (save.items[r.item]||0) >= r.count, done = caughtHas(r.to);
    const can = hasM && hasI && (r.repeatable || !done);
    return `<div class="card fusion-card ${can?'':'locked'}" onclick="${can?`tryFusion(${idx})`:''}">
      ${vis(to)}<h3>${from.name} + ${r.item === 'fire_orb' ? `${itemInlineVisual(ITEM_DEX_BY_ID.fire_orb)} ` : ''}${r.itemName}</h3>
      <p>進化先：<b>${to.name}</b></p>
      <div class="fusion-recipe">
        <p>${hasM?'✅':'❌'} ${from.name}${!hasM&&caughtHas(r.from)?'（遠征中）':''}</p>
        <p>${hasI?'✅':'❌'} ${r.item === 'fire_orb' ? `${itemInlineVisual(ITEM_DEX_BY_ID.fire_orb)} ` : ''}${r.itemName} × ${r.count}</p>
        <p style="color:${can?'#4ade80':'#f87171'}">${(!r.repeatable && done)?'✨合成済み':can?'タップで合成':'条件不足'}</p>
      </div></div>`;
  }).join('');
}
function tryFusion(idx) {
  const r = FUSIONS[idx], from = by(r.from), to = by(r.to);
  const log = document.getElementById('fusionLog');
  const candidates = save.instances.filter(x => x.id === r.from && !(typeof isInstanceOnExpedition==='function'&&isInstanceOnExpedition(x.uid)));

  if (!candidates.length) { log.innerHTML = `${from.name}を所持していない、または対象個体が遠征中です！`; return; }
  if ((save.items[r.item]||0) < r.count) { log.innerHTML = `${r.itemName}が足りない！`; return; }
  if (!r.repeatable && caughtHas(r.to)) { log.innerHTML = `${to.name}はすでに合成済み！`; return; }

  let ins = candidates[0];
  if (candidates.length > 1) {
    const options = candidates.map((x,i) => `${i+1}: Lv.${x.level} EXP ${x.exp}`).join('\n');
    const selected = prompt(`進化させる${from.name}を選んでください。\n${options}`, '1');
    if (selected === null) return;
    const choice = Number(selected) - 1;
    if (!Number.isInteger(choice) || !candidates[choice]) {
      log.innerHTML = '進化させる個体の選択が正しくありません。';
      return;
    }
    ins = candidates[choice];
  }

  if (!confirm(`${from.name}と${r.itemName} × ${r.count}を合成して${to.name}に進化させますか？`)) return;

  save.items[r.item] -= r.count;
  ins.id = r.to;
  if (typeof ensureInstanceSkills === 'function') ensureInstanceSkills(ins);
  if (!save.caught.includes(r.to)) save.caught.push(r.to);

  saveGame();
  renderFusion();
  renderParty();
  renderDex();
  if (typeof renderPartySetup === 'function') renderPartySetup();
  log.innerHTML = `✨ 合成成功！${from.name}は${to.name}に進化した！`;
}
function grantPartyExp(baseExp) {
  const targets = getPartyInstances();
  const msgs = [];
  targets.forEach(ins => {
    ins.exp = (ins.exp||0) + baseExp;
    msgs.push(`✨ ${by(ins.id).name} EXP +${baseExp}`);
    while (ins.exp >= needExp(ins.level)) {
      ins.exp -= needExp(ins.level);
      ins.level++;
      msgs.push(`⬆️ ${by(ins.id).name} は Lv.${ins.level} に上がった！`);
      // LVUPアニメ
      const pv = document.getElementById('pVis');
      if (pv) { pv.classList.remove('levelup-anim'); void pv.offsetWidth; pv.classList.add('levelup-anim'); }
    }
    checkEvolution(ins);
  });
  saveGame();
  return msgs.join('<br>');
}
function getEvoCandidates(ins) {
  const m = by(ins.id); if (!m) return [];
  const lv = ins.level;
  if (m.evolutions) return m.evolutions.filter(e => lv >= e.level).map(e => e.to).filter(id=>by(id));
  if (m.evolution && lv >= m.evolutionLevel) return [m.evolution].filter(id=>by(id));
  return [];
}
function checkEvolution(ins) {
  const choices = getEvoCandidates(ins);
  if (!choices.length) return;
  if (!pendingEvolutions.some(p => p.uid === ins.uid)) {
    pendingEvolutions.push({uid:ins.uid, from:ins.id, choices});
  }
}
function processNextEvolution() {
  if (!pendingEvolutions.length) return;
  currentEvolution = pendingEvolutions.shift();
  const ins = getInstance(currentEvolution.uid);
  if (!ins) { processNextEvolution(); return; }
  const from = by(currentEvolution.from);
  document.getElementById('evoVisual').innerHTML =
    `<div class="card">${vis(from)}<h2>${from.name}</h2><p>Lv.${ins.level}</p></div>` +
    currentEvolution.choices.map(toId => { const to=by(toId); return `<div class="card">${vis(to)}<h2>${to.name}</h2><p>${typesHtml(to.types)}</p></div>`; }).join('');
  document.getElementById('evoQuestion').textContent = `${from.name}を進化させますか？`;
  document.getElementById('evoChoices').innerHTML =
    currentEvolution.choices.map(toId => `<button onclick="confirmEvolution('${toId}')">${by(toId).name}に進化する</button>`).join('') +
    `<button onclick="cancelEvolution()" style="background:linear-gradient(135deg,#374151,#4b5563)">進化しない</button>`;
  show('evolution');
}
function confirmEvolution(toId) {
  if (!currentEvolution) return;
  const ins = getInstance(currentEvolution.uid);
  if (!ins) { currentEvolution=null; processNextEvolution(); return; }
  const from = by(ins.id), to = by(toId);
  ins.id = toId;
  if (typeof ensureInstanceSkills === 'function') ensureInstanceSkills(ins);
  if (!save.caught.includes(toId)) save.caught.push(toId);
  saveGame(); renderParty(); renderDex();
  currentEvolution = null;
  alert(`✨ ${from.name}は${to.name}に進化した！`);
  pendingEvolutions.length ? processNextEvolution() : show('partySet');
}
function cancelEvolution() {
  currentEvolution = null;
  pendingEvolutions.length ? processNextEvolution() : show('partySet');
}
