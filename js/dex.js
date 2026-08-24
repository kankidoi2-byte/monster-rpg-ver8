function renderItemDex(){
  syncItemDexFromInventory();
  const list = document.getElementById('itemDexList');
  const detail = document.getElementById('itemDexDetail');
  if(!list || !detail) return;

  if(!detail.innerHTML){
    detail.innerHTML = '<div class="panel"><p class="small">アイテムを選ぶと詳細が表示されます。</p></div>';
  }

  list.innerHTML = ITEM_DEX_ITEMS.map(it => {
    const unlocked = save.itemDex.includes(it.id);
    const count = Number(save.items?.[it.id] || 0);
    return `<div class="item-dex-card ${unlocked ? '' : 'locked'}" onclick="showItemDexDetail('${it.id}')">
      <div class="item-dex-image">${itemDexVisual(it, !unlocked)}</div>
      <span class="item-category">${unlocked ? itemDexCategory(it) : '未入手'}</span>
      <h2 style="margin:8px 0 4px">${unlocked ? it.name : '？？？'}</h2>
      <div class="small">${unlocked ? `所持数：${count}` : 'まだ入手していません'}</div>
    </div>`;
  }).join('');
}
function showItemDexDetail(itemId){
  const it = ITEM_DEX_BY_ID[itemId];
  const detail = document.getElementById('itemDexDetail');
  if(!it || !detail) return;
  const unlocked = Array.isArray(save.itemDex) && save.itemDex.includes(itemId);

  if(!unlocked){
    detail.innerHTML = `<div class="item-dex-detail">
      <div class="item-dex-detail-image">${itemDexVisual(it, true)}</div>
      <h2 style="text-align:center">？？？</h2>
      <p class="small" style="text-align:center">このアイテムはまだ入手していません。</p>
    </div>`;
    return;
  }

  detail.innerHTML = `<div class="item-dex-detail">
    <div class="item-dex-detail-image">${itemDexVisual(it)}</div>
    <div style="text-align:center"><span class="item-category">${itemDexCategory(it)}</span></div>
    <h2 style="text-align:center">${itemInlineVisual(it)} ${it.name}</h2>
    <p><b>所持数：</b>${Number(save.items?.[itemId] || 0)}</p>
    <p><b>説明：</b>${it.desc || '説明はありません。'}</p>
    <p><b>入手方法：</b>${itemDexObtain(it)}</p>
    ${it.battleDesc ? `<p><b>戦闘効果：</b>${it.battleDesc}</p>` : ''}
    ${it.expItem ? `<p><b>経験値：</b>EXP +${it.expAmount}</p>` : ''}
    ${it.price > 0 ? `<p><b>価格：</b>コイン${it.price}枚</p>` : ''}
    ${it.usableFromDex ? `<button onclick="useGoldenLandMap()" ${goldenLandMapIsReady()?'disabled':''}>${goldenLandMapIsReady()?'地図使用中（黄金郷を予約済み）':'この地図を使う'}</button>` : ''}
  </div>`;
}
function renderUnitSkillList(m) {
  return `<h3>技一覧</h3>
    ${m.moves.map(mv=>{const fallbackTypes=moveTypes(mv); const sk=SKILL_BY_ID[skillIdFromMove(mv)]||{name:mv[0],type:fallbackTypes[0],types:fallbackTypes,power:mv[1],cost:'-'}; return `<div class="move-box ${skillCardClass(skillTypes(sk))}">${skillCardHeader(sk)}<div class="skill-type-line ${skillTypes(sk)[0]}">${skillTypeLabel(skillTypes(sk))} / 威力${sk.power}</div><div style="font-size:12px;color:#aab3cc">${moveEffectText(mv)}</div></div>`;}).join('')}`;
}
function monsterMapEncounterNote(map) {
  if (map.goldenLand) return '希少マップ・地図を使うと出現確定';
  const rate = Number.isFinite(map.appearRate) ? `（マップ出現率 ${Math.round(map.appearRate * 100)}％）` : '';
  if (map.bossOnly) return `ボス限定マップ${rate}`;
  if (map.rareOnly) return `希少マップ${rate}`;
  return '通常の討伐依頼で出現';
}
function monsterObtainEntries(m) {
  const entries = [];
  MAPS.filter(map=>(map.enemyIds||[]).includes(m.id)).forEach(map=>entries.push({
    kind:'map', image:map.image, title:map.name, note:monsterMapEncounterNote(map)
  }));
  M.forEach(from=>{
    if (from.evolution === m.id) entries.push({kind:'evolution',icon:'✨',title:`${from.name}から進化`,note:`Lv.${from.evolutionLevel}で進化`});
    (from.evolutions||[]).filter(e=>e.to===m.id).forEach(e=>entries.push({kind:'evolution',icon:'✨',title:`${from.name}から進化`,note:`Lv.${e.level}で分岐進化`}));
  });
  FUSIONS.filter(recipe=>recipe.to===m.id).forEach(recipe=>entries.push({
    kind:'fusion',icon:'🔮',title:`${by(recipe.from)?.name||recipe.from}から特殊進化`,note:`${recipe.itemName} × ${recipe.count}を使用`
  }));
  const alchemySuccess = ALCHEMY_RECIPES.some(recipe=>(recipe.successCandidates||[]).some(candidate=>candidate.monsterId===m.id));
  const alchemyFailure = ALCHEMY_RECIPES.some(recipe=>(recipe.failureCandidates||[]).some(candidate=>candidate.monsterId===m.id));
  if (alchemySuccess) entries.push({kind:'alchemy',icon:'⚗️',title:'錬核錬成',note:'錬成成功時に入手'});
  if (alchemyFailure) entries.push({kind:'alchemy',icon:'🧪',title:'錬核錬成',note:'錬成失敗時に生成されることがある'});
  return entries;
}
function renderMonsterObtainSection(m) {
  const entries = monsterObtainEntries(m);
  return `<h3>出現・入手方法</h3><div class="dex-obtain-grid">${entries.length ? entries.map(entry=>`<div class="dex-obtain-card dex-obtain-${entry.kind}">
    ${entry.image?`<img src="${entry.image}" alt="${entry.title}">`:`<span class="dex-obtain-icon">${entry.icon}</span>`}
    <div><strong>${entry.title}</strong><small>${entry.note}</small></div>
  </div>`).join('') : '<p class="dex-obtain-empty">現在確認できる出現・入手方法はありません。</p>'}</div>`;
}
function renderUnitDexDetail(id, targetId, numberLabel, detailSection=renderUnitSkillList) {
  const m = by(id); if (!m) return;
  const detail = document.getElementById(targetId); if (!detail) return;
  detail.innerHTML = `<div class="dex-detail ui-dex-detail">
    ${vis(m)}<h2>${m.name}</h2>
    <p>${numberLabel(m)} / <span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</p>
    <p style="color:#8892b0">${m.desc}</p>${detailSection(m)}
  </div>`;
  detail.scrollIntoView({behavior:'smooth',block:'start'});
}
function characterDexNumber(m) {
  return `C-${String(m.characterNo).padStart(3,'0')}`;
}
function monsterDexNumber(m) {
  return m.dexNo ?? m.no;
}
function showDexDetail(id) {
  renderUnitDexDetail(id, 'dexDetail', m => `No.${monsterDexNumber(m)}`, renderMonsterObtainSection);
}
function showCharacterDexDetail(id) {
  renderUnitDexDetail(id, 'characterDexDetail', characterDexNumber);
}
function renderDex() {
  const screen = document.getElementById('dex');
  if(!screen?.classList.contains('active')) return;
  document.getElementById('dexDetail').innerHTML = '';
  document.getElementById('dexList').innerHTML =
    M.filter(m=>!isCharacterUnit(m)).sort((a,b)=>monsterDexNumber(a)-monsterDexNumber(b)).map(m => `
      <button class="monster-dex-card" onclick="showDexDetail('${m.id}')">
        <span class="monster-dex-no">No.${monsterDexNumber(m)}</span>${vis(m, 'loading="lazy" decoding="async"')}<strong>${m.name}</strong>
        <span><span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</span><small>詳細を見る ›</small></button>`).join('');
}
function renderCharacterDex() {
  const screen = document.getElementById('characterDex');
  if(!screen?.classList.contains('active')) return;
  document.getElementById('characterDexDetail').innerHTML = '';
  document.getElementById('characterDexList').innerHTML =
    M.filter(isCharacterUnit).sort((a,b)=>(a.characterNo||999)-(b.characterNo||999)).map(m => `
      <button class="monster-dex-card character-dex-card" onclick="showCharacterDexDetail('${m.id}')">
        <span class="monster-dex-no character-dex-no">${characterDexNumber(m)}</span>${vis(m, 'loading="lazy" decoding="async"')}<strong>${m.name}</strong>
        <span><span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</span><small>詳細を見る ›</small></button>`).join('');
}
