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
function monsterMapEncounterNote(map, monster=null) {
  if (map.id==='light_plain' && monster?.id==='hikari') return '光の平原のNormal・Hard探索勝利後、まれに降臨（Hard限定・戦闘後の契約不可）';
  if (map.id==='starsea' && monster?.id==='doom_nemesion') return '通常探索のNormal・Hard勝利後、まれに世界の危機として出現（Extreme限定）';
  if (map.id==='world_between') return '世界の危機を討伐、または対処を任せると残る偽竜の痕跡から遭遇（Extreme限定）';
  if (map.goldenLand) return '通常探索勝利で入口を発見、または地図を使用して入場（出発時に1枚消費）';
  if (map.id==='starsea') return '通常探索のNormal・Hard勝利後、星の海への入口を発見すると遭遇（Hard限定）';
  if (map.id==='water_secret') return '通常探索のNormal・Hard勝利後、秘境への入口を発見すると遭遇（Hard限定）';
  if (map.bossOnly || map.rareOnly) return '特殊な入口から探索すると出現';
  return '世界地図からこの場所を選んで探索すると出現';
}
function monsterObtainEntries(m) {
  const entries = [];
  if(typeof characterGachaPool==='function' && characterGachaPool().some(unit=>unit.id===m.id)) entries.push({kind:'gacha',icon:'✨',title:'キャラクターガチャ',note:'その他メニューから召喚・Lv.1で加入'});
  if (INITIAL_PARTY_IDS.includes(m.id)) entries.push({
    kind:'initial',icon:'🎒',title:'初期メンバー',note:'ゲーム開始時から仲間'
  });
  MAPS.filter(map=>(map.enemyIds||[]).includes(m.id)).forEach(map=>{
    const unlocked=mapDexUnlocked(map.id);
    entries.push({kind:'map',mapId:map.id,image:unlocked?map.image:null,icon:'🔒',title:unlocked?map.name:'未発見のマップ',note:unlocked?monsterMapEncounterNote(map,m):'探索先や特殊な入口を発見すると詳細が登録されます'});
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
  renderUnitDexDetail(id, 'characterDexDetail', characterDexNumber, m=>renderUnitSkillList(m)+renderMonsterObtainSection(m));
}
function mapDexUnlocked(mapId){return typeof save!=='undefined'&&Array.isArray(save.mapDex)&&save.mapDex.includes(mapId);}
// The encyclopedia describes every possible encounter, including inactive events.
// Do not use worldMapAvailableDifficulties here: it depends on the current save.
function mapDexDifficulties(map){return availableHuntDifficulties(map).map(difficulty=>difficulty.label);}
function mapDexEvents(map){
  if(map.goldenLand)return ['探索勝利で入口発見・地図でも入場可能','地図は出発時に1枚消費','Hardコインボーナス'];
  if(map.id==='starsea')return ['探索勝利で星の海への入口発見（Hard）','滅亡の星 ネメシオンの危機（Extreme）','入口・危機は画面を閉じても保持'];
  if(map.id==='world_between')return ['危機を討伐しても対処を任せても偽竜の痕跡が残る','偽竜との遭遇（Extreme）','痕跡は画面を閉じても保持'];
  if(map.id==='water_secret')return ['探索勝利で秘境への入口発見（Hard）','入口は画面を閉じても保持'];
  const events=['三つ巴バトル','戦闘中の乱入'];
  if(map.id==='light_plain')events.unshift('Normal・Hard探索勝利後、光の女神エリシアがまれに降臨（Hard・契約不可）');
  else if(map.bossOnly||map.rareOnly)events.unshift('特殊な入口から探索');
  return events;
}
function mapEnemyFrequencyLabel(map,id){
  if(map.id==='light_plain'&&id==='hikari')return 'まれに降臨・Hard限定';
  if(map.id==='starsea'&&id==='doom_nemesion')return '世界の危機・Extreme限定';
  if(map.id==='world_between')return '危機後の痕跡・Extreme限定';
  if(map.bossOnly||map.rareOnly||map.goldenLand)return '特殊な入口から遭遇';
  const ordinaryIds=(map.enemyIds||[]).filter(enemyId=>!(map.id==='light_plain'&&enemyId==='hikari'));
  const total=ordinaryIds.length;
  const count=ordinaryIds.filter(enemyId=>enemyId===id).length;
  const rate=total?count/total:0;
  return rate>=.35?'よく出現':rate>=.15?'出現':'まれに出現';
}
function mapDexEcosystemProfile(map){
  const speciesCounts=new Map(),typeCounts=new Map();
  (map.enemyIds||[]).forEach(id=>{
    const unit=by(id);if(!unit)return;
    speciesCounts.set(id,(speciesCounts.get(id)||0)+1);
    [...new Set(unit.types||[])].forEach(type=>typeCounts.set(type,(typeCounts.get(type)||0)+1));
  });
  const species=[...speciesCounts.entries()].map(([id,count])=>({unit:by(id),count})).filter(entry=>entry.unit)
    .sort((a,b)=>b.count-a.count||((a.unit.dexNo??a.unit.no??999)-(b.unit.dexNo??b.unit.no??999))||a.unit.name.localeCompare(b.unit.name,'ja'));
  const totalTypeCount=[...typeCounts.values()].reduce((sum,count)=>sum+count,0);
  const typeTrends=[...typeCounts.entries()].map(([type,count])=>({type,count,rate:totalTypeCount?Math.round(count/totalTypeCount*100):0}))
    .sort((a,b)=>b.count-a.count||a.type.localeCompare(b.type));
  return {species,typeTrends};
}
function mapDexEcosystemFallback(map,profile){
  const common=profile.species.slice(0,3).map(entry=>entry.unit.name).join('、');
  const types=profile.typeTrends.slice(0,2).map(entry=>TN[entry.type]||entry.type).join('・');
  if(common&&types)return `${common}を中心に、${types}属性の生物が多く確認されている。`;
  if(common)return `${common}を中心とした生物相が確認されている。`;
  return 'この土地の生態記録はまだ整理されていない。';
}
function mapDexEcosystemMembers(entry){
  const units=(entry.ids||[]).map(by).filter(Boolean);
  const unitButtons=units.map(unit=>`<button type="button" onclick="openUnitFromMapDex('${unit.id}')" aria-label="${unit.name}の図鑑を開く">${vis(unit,'loading="lazy" decoding="async"')}<span>${unit.name}</span></button>`).join('');
  const labels=(entry.labels||[]).map(label=>`<span class="map-dex-pyramid-resource">${label}</span>`).join('');
  return `${unitButtons}${labels}`;
}
function mapDexEcosystemDiagram(map){
  const diagram=map.ecosystemDiagram;
  if(!diagram||!Array.isArray(diagram.layers)||!diagram.layers.length)return '';
  const layers=diagram.layers.map((layer,index)=>`<div class="map-dex-pyramid-layer" style="--ecosystem-tier:${index}" aria-label="${layer.role}"><strong>${layer.role}</strong><div>${mapDexEcosystemMembers(layer)}</div><small>${layer.detail||''}</small></div>`).join('<div class="map-dex-pyramid-arrow" aria-hidden="true">↑</div>');
  const cycles=(diagram.cycles||[]).map(entry=>`<div class="map-dex-ecosystem-cycle"><strong>${entry.role}</strong><div>${mapDexEcosystemMembers(entry)}</div><small>${entry.detail||''}</small></div>`).join('');
  return `<section class="map-dex-pyramid" aria-labelledby="mapDexPyramidHeading"><div class="map-dex-pyramid-heading"><h4 id="mapDexPyramidHeading">${diagram.heading||'生態系ピラミッド'}</h4><span>図説</span></div><p>${diagram.note||''}</p><div class="map-dex-pyramid-layers">${layers}</div>${cycles?`<div class="map-dex-ecosystem-cycles">${cycles}</div>`:''}</section>`;
}
function showMapDexDetail(mapId){
  const map=MAPS.find(entry=>entry.id===mapId),detail=document.getElementById('mapDexDetail');
  if(!map||!detail)return;
  if(!mapDexUnlocked(mapId)){
    detail.innerHTML='<div class="dex-detail ui-dex-detail map-dex-locked-detail"><span>🔒</span><h2>未発見のマップ</h2><p>討伐依頼でこの土地を発見すると、詳しい情報が登録されます。</p></div>';
    return;
  }
  const enemies=[...new Set(map.enemyIds||[])].map(by).filter(Boolean),ecosystem=mapDexEcosystemProfile(map);
  detail.innerHTML=`<article class="dex-detail ui-dex-detail map-dex-detail">
    <img class="map-dex-hero" src="${map.image}" alt="${map.name}"><div class="map-dex-detail-body"><span class="map-dex-region">${map.chapter||'章未設定'}・${map.region||'地域未設定'}</span><h2>${map.name}</h2><p>${map.desc||'この土地の記録はまだ整理されていません。'}</p>
    <section class="map-dex-ecosystem" aria-labelledby="mapDexEcosystemHeading"><h3 id="mapDexEcosystemHeading">生態系</h3><p>${map.ecosystem||mapDexEcosystemFallback(map,ecosystem)}</p>
    ${mapDexEcosystemDiagram(map)}
    <h4>属性傾向</h4><div class="map-dex-ecosystem-types">${ecosystem.typeTrends.slice(0,4).map(entry=>`<span>${skillTypeIcon(entry.type)} ${TN[entry.type]||entry.type}<small>${entry.rate}%</small></span>`).join('')}</div>
    <h4>主な生息種</h4><div class="map-dex-ecosystem-species">${ecosystem.species.slice(0,5).map(entry=>`<span>${entry.unit.name}<small>${mapEnemyFrequencyLabel(map,entry.unit.id)}</small></span>`).join('')}</div></section>
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
