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
  </div>`;
}
function showDexDetail(id) {
  const m = by(id); if (!m) return;
  document.getElementById('dexDetail').innerHTML = `<div class="dex-detail">
    ${vis(m)}<h2>${m.name}</h2>
    <p>No.${m.no} / <span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</p>
    <p style="color:#8892b0">${m.desc}</p><h3>技一覧</h3>
    ${m.moves.map(mv=>{const fallbackTypes=moveTypes(mv); const sk=SKILL_BY_ID[skillIdFromMove(mv)]||{name:mv[0],type:fallbackTypes[0],types:fallbackTypes,power:mv[1],cost:'-'}; return `<div class="move-box ${skillCardClass(skillTypes(sk))}">${skillCardHeader(sk)}<div class="skill-type-line ${skillTypes(sk)[0]}">${skillTypeLabel(skillTypes(sk))} / 威力${sk.power}</div><div style="font-size:12px;color:#aab3cc">${moveEffectText(mv)}</div></div>`;}).join('')}
  </div>`;
  document.getElementById('dexDetail').scrollIntoView({behavior:'smooth',block:'start'});
}
function renderDex() {
  const screen = document.getElementById('dex');
  if(!screen?.classList.contains('active')) return;
  document.getElementById('dexDetail').innerHTML = '';
  document.getElementById('dexList').innerHTML =
    [...M].sort((a,b)=>(a.no||999)-(b.no||999)).map(m => `
      <div class="card" onclick="showDexDetail('${m.id}')" style="cursor:pointer">
        ${vis(m, 'loading="lazy" decoding="async"')}<h3>No.${m.no} ${m.name}</h3>
        <p><span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</p>
        <p style="font-size:12px;color:#8892b0">${m.desc}</p>
        <p class="small">タップで技を確認</p></div>`).join('');
}
