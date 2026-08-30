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
function dexRegisteredCount(units){
  return units.filter(unit=>typeof caughtHas==='function'&&caughtHas(unit.id)).length;
}
function renderDexHub(){
  syncItemDexFromInventory();
  const grid=document.getElementById('dexHubGrid');if(!grid)return;
  const monsters=M.filter(unit=>!isCharacterUnit(unit));
  const characters=M.filter(isCharacterUnit);
  const itemCount=ITEM_DEX_ITEMS.filter(item=>save.itemDex.includes(item.id)).length;
  const mapCount=MAPS.filter(map=>save.mapDex?.includes(map.id)).length;
  const cards=[
    {id:'dexHubMonsterButton',screen:'dex',icon:'🐉',title:'モンスター図鑑',desc:'生態と出現・入手方法',count:dexRegisteredCount(monsters),total:monsters.length},
    {id:'dexHubCharacterButton',screen:'characterDex',icon:'👤',title:'キャラクター図鑑',desc:'仲間と成長形態',count:dexRegisteredCount(characters),total:characters.length},
    {screen:'mapDex',icon:'🗺️',title:'マップ図鑑',desc:'土地・生息種・特殊イベント',count:mapCount,total:MAPS.length},
    {screen:'itemDex',icon:'🎒',title:'アイテム図鑑',desc:'入手した道具と素材',count:itemCount,total:ITEM_DEX_ITEMS.length}
  ];
  grid.innerHTML=cards.map(card=>`<button${card.id?` id="${card.id}"`:''} onclick="show('${card.screen}')"><span>${card.icon}</span><strong>${card.title}</strong><small>${card.desc}</small><b class="dex-hub-count">${card.count} / ${card.total}</b></button>`).join('');
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
  if (INITIAL_PARTY_IDS.includes(m.id)) entries.push({
    kind:'initial',icon:'🎒',title:'初期メンバー',note:'ゲーム開始時から仲間'
  });
  MAPS.filter(map=>(map.enemyIds||[]).includes(m.id)).forEach(map=>{
    const unlocked=mapDexUnlocked(map.id);
    entries.push({kind:'map',mapId:map.id,image:unlocked?map.image:null,icon:'🔒',title:unlocked?map.name:'未発見のマップ',note:unlocked?monsterMapEncounterNote(map):'討伐依頼で発見すると詳細が登録されます'});
  });
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
  return `<h3>出現・入手方法</h3><div class="dex-obtain-grid">${entries.length ? entries.map(entry=>`<${entry.mapId?'button':'div'} class="dex-obtain-card dex-obtain-${entry.kind}"${entry.mapId?` onclick="openMapFromMonsterDex('${entry.mapId}')"`:''}>
    ${entry.image?`<img src="${entry.image}" alt="${entry.title}">`:`<span class="dex-obtain-icon">${entry.icon}</span>`}
    <div><strong>${entry.title}</strong><small>${entry.note}${entry.mapId?'・マップ詳細を見る ›':''}</small></div>
  </${entry.mapId?'button':'div'}>`).join('') : '<p class="dex-obtain-empty">現在確認できる出現・入手方法はありません。</p>'}</div>`;
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
function mapDexUnlocked(mapId){return typeof save!=='undefined'&&Array.isArray(save.mapDex)&&save.mapDex.includes(mapId);}
function mapDexDifficulties(map){return (map.bossOnly||map.rareOnly)?['Hard','Extreme']:['Easy','Normal','Hard','Extreme'];}
function mapDexEvents(map){
  if(map.goldenLand)return ['地図で出現確定','難易度別コインボーナス'];
  const events=['三つ巴バトル','戦闘中の乱入'];
  if(map.bossOnly)events.unshift(`ボスマップ（出現率 ${Math.round((map.appearRate||0)*100)}％）`);
  else if(map.rareOnly)events.unshift(`希少マップ（出現率 ${Math.round((map.appearRate||0)*100)}％）`);
  return events;
}
function mapEnemyFrequencyLabel(map,id){
  const total=(map.enemyIds||[]).length;
  const count=(map.enemyIds||[]).filter(enemyId=>enemyId===id).length;
  const rate=total?count/total:0;
  return rate>=.35?'よく出現':rate>=.15?'出現':'まれに出現';
}
function showMapDexDetail(mapId){
  const map=MAPS.find(entry=>entry.id===mapId),detail=document.getElementById('mapDexDetail');
  if(!map||!detail)return;
  if(!mapDexUnlocked(mapId)){
    detail.innerHTML='<div class="dex-detail ui-dex-detail map-dex-locked-detail"><span>🔒</span><h2>未発見のマップ</h2><p>討伐依頼でこの土地を発見すると、詳しい情報が登録されます。</p></div>';
    return;
  }
  const enemies=[...new Set(map.enemyIds||[])].map(by).filter(Boolean);
  detail.innerHTML=`<article class="dex-detail ui-dex-detail map-dex-detail">
    <img class="map-dex-hero" src="${map.image}" alt="${map.name}"><div class="map-dex-detail-body"><span class="map-dex-region">${map.chapter||'章未設定'}・${map.region||'地域未設定'}</span><h2>${map.name}</h2><p>${map.desc||'この土地の記録はまだ整理されていません。'}</p>
    <h3>挑戦できる難易度</h3><div class="map-dex-tags">${mapDexDifficulties(map).map(label=>`<span>${label}</span>`).join('')}</div>
    <h3>特殊イベント</h3><div class="map-dex-tags">${mapDexEvents(map).map(label=>`<span>${label}</span>`).join('')}</div>
    <h3>出現モンスター</h3><div class="map-dex-enemies">${enemies.map(unit=>`<button onclick="openUnitFromMapDex('${unit.id}')">${vis(unit,'loading="lazy" decoding="async"')}<strong>${unit.name}</strong><small>${mapEnemyFrequencyLabel(map,unit.id)}・${isCharacterUnit(unit)?'キャラクター':'モンスター'} ›</small></button>`).join('')}</div></div>
  </article>`;
  detail.scrollIntoView({behavior:'smooth',block:'start'});
}
function openMapFromMonsterDex(mapId){show('mapDex');showMapDexDetail(mapId);}
function openUnitFromMapDex(id){
  const unit=by(id);if(!unit)return;
  if(isCharacterUnit(unit)){show('characterDex');showCharacterDexDetail(id);}
  else{show('dex');showDexDetail(id);}
}
function renderMapDex(){
  const screen=document.getElementById('mapDex');if(!screen?.classList.contains('active'))return;
  document.getElementById('mapDexDetail').innerHTML='';
  document.getElementById('mapDexList').innerHTML=MAPS.map(map=>{
    const unlocked=mapDexUnlocked(map.id);
    return `<button class="map-dex-card ${unlocked?'':'locked'}" onclick="showMapDexDetail('${map.id}')"><div class="map-dex-visual">${unlocked?`<img src="${map.image}" alt="${map.name}" loading="lazy" decoding="async">`:'<span>🔒</span>'}</div><div><small>${unlocked?`${map.chapter||'章未設定'}・${map.region||'地域未設定'}`:'未発見'}</small><strong>${unlocked?map.name:'？？？'}</strong><span>${unlocked?`${new Set(map.enemyIds||[]).size}種を確認`:'討伐依頼で発見できます'}</span></div></button>`;
  }).join('');
}
function renderDex() {
  const screen = document.getElementById('dex');
  if(!screen?.classList.contains('active')) return;
  document.getElementById('dexDetail').innerHTML = '';
  document.getElementById('dexList').innerHTML =
    M.filter(m=>!isCharacterUnit(m)).sort((a,b)=>monsterDexNumber(a)-monsterDexNumber(b)).map(m => `
      <button class="monster-dex-card"${['freigal','aquaron'].includes(m.id)?` data-tutorial-monster="${m.id}"`:''} onclick="showDexDetail('${m.id}')">
        <span class="monster-dex-no">No.${monsterDexNumber(m)}</span>${vis(m, 'loading="lazy" decoding="async"')}<strong>${m.name}</strong>
        <span><span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</span><small>詳細を見る ›</small></button>`).join('');
}
function renderCharacterDex() {
  const screen = document.getElementById('characterDex');
  if(!screen?.classList.contains('active')) return;
  document.getElementById('characterDexDetail').innerHTML = '';
  document.getElementById('characterDexList').innerHTML =
    M.filter(isCharacterUnit).sort((a,b)=>(a.characterNo||999)-(b.characterNo||999)).map(m => `
      <button class="monster-dex-card character-dex-card"${m.id==='elna_beginner'?` data-tutorial-character="${m.id}"`:''} onclick="showCharacterDexDetail('${m.id}')">
        <span class="monster-dex-no character-dex-no">${characterDexNumber(m)}</span>${vis(m, 'loading="lazy" decoding="async"')}<strong>${m.name}</strong>
        <span><span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</span><small>詳細を見る ›</small></button>`).join('');
}
