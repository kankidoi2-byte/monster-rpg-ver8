// Geographic navigation is presentation-only: persistent entrances/events use the worldMap state API.
const WORLD_MAP_PLACES = Object.freeze([
  {id:'snow_mountain',x:49,y:12,icon:'❄',route:'北の山脈。雪解け水は湖へ流れる。'},
  {id:'highland_ruins',x:23,y:24,icon:'⌘',route:'北西の高地。中央平原から山道でつながる。'},
  {id:'starry_plain',x:70,y:24,icon:'✦',route:'北東の高原。星海へ通じる気配を観測する。'},
  {id:'forest',x:19,y:43,icon:'♣',route:'草原の西。南へ進むと光の平原と廃村に道が分かれる。'},
  {id:'grassland',x:44,y:39,icon:'✿',route:'世界の中央。王都・西の森・東の湖への分岐点。'},
  {id:'lake',x:65,y:43,icon:'≈',route:'雪山の水を受け、東の海へ注ぐ湖。'},
  {id:'water_secret',x:78,y:54,icon:'◇',route:'湖から海へ向かう支流の奥。入口が現れた時に探索できる。'},
  {id:'seikai_irie',x:89,y:38,icon:'≈',route:'湖から続く川の河口。外海への玄関口。'},
  {id:'ruined_village',x:17,y:67,icon:'⌂',route:'森の南西。月影の洞窟がある周辺地方へ続く。'},
  {id:'light_plain',x:34,y:65,icon:'☀',route:'森の南東。陽だまりの森の縁に広がる光の平原。'},
  {id:'kaen_village',x:51,y:72,icon:'❀',route:'火山の北側。溶岩流から離れた斜面に里がある。'},
  {id:'volcano',x:49,y:91,icon:'▲',route:'南部火山帯。華炎の里から山道を登る。'},
  {id:'kaiyu_kaiiki',x:88,y:72,icon:'≈',route:'入江の沖に広がる外海。東にはまだ見ぬ航路がある。'},
  {id:'deep_sea_end',x:83,y:91,icon:'▽',route:'外海のさらに下、光が届かない深海域。'}
]);
let worldMapSelectedId = null;
let worldMapSelectedEvent = null;
let worldMapSelectedDifficulty = null;
let worldMapDeparting = false;

function worldMapEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function worldMapEventsForUI() {
  return typeof worldMapActiveEvents === 'function' ? worldMapActiveEvents() : [];
}
function worldMapCanEnter(map, eventKey=null) {
  return typeof worldMapEntryAvailable === 'function'
    ? worldMapEntryAvailable(map,eventKey)
    : !!map && !map.bossOnly && !map.rareOnly && !map.goldenLand;
}
function worldMapDifficultiesForUI(map,eventKey=null) {
  const values = typeof worldMapAvailableDifficulties === 'function'
    ? worldMapAvailableDifficulties(map,eventKey) : availableHuntDifficulties(map);
  return values.map(value => typeof value === 'string' ? HUNT_DIFFICULTIES[value] : value).filter(Boolean);
}
function worldMapCandidatesForUI(map,difficultyId,eventKey=null) {
  return typeof worldMapCandidates === 'function'
    ? worldMapCandidates(map,difficultyId,eventKey) : huntCandidatesFor(map,difficultyId);
}
function worldMapPlaceButton(map,{className='',eventKey=null,subtitle=''}={}) {
  const available = worldMapCanEnter(map,eventKey);
  const hasEvent = !eventKey && worldMapEventsForUI().some(event=>event.mapId===map.id);
  return `<button type="button" class="wm-place ${className}${available||hasEvent?'':' is-sealed'}" data-wm-place="${worldMapEscape(map.id)}"${eventKey?` data-wm-event="${worldMapEscape(eventKey)}"`:''}><span>${worldMapEscape(map.name)}</span><small>${worldMapEscape(subtitle || (available?'探索先を見る':hasEvent?'特別な入口あり':'入口未出現・詳細を見る'))}</small></button>`;
}
function worldMapTerrainHTML() {
  return `<svg class="wm-terrain" viewBox="0 0 640 700" aria-hidden="true" focusable="false">
    <defs><linearGradient id="wm-sea" x2="0" y2="1"><stop stop-color="#93d8df"/><stop offset="1" stop-color="#247eae"/></linearGradient><linearGradient id="wm-land" x2="0" y2="1"><stop stop-color="#e2ecbb"/><stop offset="1" stop-color="#a3b985"/></linearGradient></defs>
    <rect width="640" height="700" fill="url(#wm-sea)"/>
    <path d="M0 0H443L448 62 483 111 464 174 505 210 502 272 534 307 489 344 518 406 489 477 427 514 434 577 399 617 383 700H0Z" fill="url(#wm-land)" stroke="#ece8bd" stroke-width="8"/>
    <path d="M274 49L310 9 348 67 329 101 374 144 292 165 241 133Z" fill="#889da1"/><path d="M287 38L310 9 331 41 315 34 302 45Z" fill="#fff9e7"/>
    <path d="M309 114Q325 168 363 200T397 297Q434 337 494 270" fill="none" stroke="#78c6df" stroke-width="12"/>
    <ellipse cx="407" cy="305" rx="36" ry="25" fill="#78c6df"/>
    <path d="M438 316Q457 355 482 381" fill="none" stroke="#78c6df" stroke-width="7"/>
    <path d="M66 232L120 222 163 262 161 341 111 373 56 326Z" fill="#6a9b69"/>
    <path d="M54 294l18-37 17 37m10 32 22-46 21 46m-1-53 16-34 17 34" fill="#3d805d" stroke="#477e55" stroke-width="4"/>
    <path d="M244 670L301 558 367 670Z" fill="#997c71"/><path d="M280 601L301 558 326 607 305 595 297 616Z" fill="#db8b57"/>
    <path d="M127 167L155 126 181 167 167 216 124 209Z" fill="#b4b0a0"/>
    <path d="M281 271L306 390 202 456 116 462M281 271L122 300M281 271L151 171M281 271L414 299M281 271L447 166M306 390L326 503 310 637" fill="none" stroke="#b19d70" stroke-width="5" stroke-dasharray="8 8"/>
    <path d="M567 274Q594 391 566 501T532 624" fill="none" stroke="#d4eeeb" stroke-width="3" stroke-dasharray="6 9"/>
    <text x="24" y="40" fill="#365b59" font-size="14">北 N ↑</text><text x="22" y="683" fill="#365b59" font-size="12">序章の地域図 · 地形は仮素材</text>
  </svg>`;
}
function worldMapOverviewHTML() {
  const events = worldMapEventsForUI();
  const byMap = id => MAPS.find(map => map.id === id);
  const geography = WORLD_MAP_PLACES.map(place => {
    const map = byMap(place.id);
    if (!map) return '';
    const event = events.find(entry => entry.mapId === map.id);
    return `<div class="wm-pin${event?' has-event':''}" style="--wm-x:${place.x}%;--wm-y:${place.y}%"><span aria-hidden="true">${place.icon}</span>${worldMapPlaceButton(map,{subtitle:event?'異変あり':(worldMapCanEnter(map)?'':'入口未出現')})}</div>`;
  }).join('');
  const cityMaps = ['arena','magic_academy'].map(byMap).filter(Boolean);
  const specialMaps = ['starsea','world_between','golden_land'].map(byMap).filter(Boolean);
  return `<header class="wm-heading"><div><small>PROLOGUE · WORLD MAP</small><h2>世界へ出かけよう</h2><p>場所を選び、難易度を決めて探索。モンスターは出発時に決まります。</p></div></header>
    ${events.length?`<section class="wm-events" aria-label="世界の異変"><h3>世界の異変・開かれた入口</h3>${events.map(event=>{const map=byMap(event.mapId);return map?worldMapPlaceButton(map,{className:'wm-event',eventKey:event.key,subtitle:event.title || '特別な気配'}):'';}).join('')}</section>`:'<p class="wm-calm" role="status">今は穏やかな世界です。探索で勝利すると、新たな入口や異変が見つかることがあります。</p>'}
    <p class="wm-map-hint">地図は横にスクロールできます。下の「場所一覧」からも同じ場所を選べます。</p>
    <div class="wm-map-scroll" tabindex="0" role="region" aria-label="序章の世界地図・横スクロール可能"><div class="wm-map">${worldMapTerrainHTML()}${geography}<div class="wm-city-pin"><span aria-hidden="true">♜</span><strong>王都</strong><small>闘技場・魔導学園</small></div></div></div>
    <section class="wm-city"><h3>王都の施設</h3><p>草原の南にある冒険の拠点。施設ごとに相手と難易度を選べます。</p><div class="wm-place-grid">${cityMaps.map(map=>worldMapPlaceButton(map)).join('')}</div></section>
    <section class="wm-list"><h3>場所一覧</h3><div class="wm-place-grid">${WORLD_MAP_PLACES.map(place=>byMap(place.id)).filter(Boolean).map(map=>worldMapPlaceButton(map)).join('')}</div></section>
    <section class="wm-beyond"><h3>世界の外側・幻の領域</h3><p>入口が開くと探索できます。未出現でも、場所の説明は確認できます。</p><div class="wm-place-grid">${specialMaps.map(map=>worldMapPlaceButton(map)).join('')}</div></section>`;
}
function worldMapDetailHTML(map,eventKey=null) {
  const events = worldMapEventsForUI();
  const event = eventKey ? events.find(entry => entry.key === eventKey && entry.mapId === map.id) : null;
  const available = worldMapCanEnter(map,eventKey);
  const difficulties = available ? worldMapDifficultiesForUI(map,eventKey) : [];
  const difficulty = difficulties.find(value=>value.id===worldMapSelectedDifficulty) || difficulties[0];
  worldMapSelectedDifficulty = difficulty?.id || null;
  const candidates = difficulty ? [...new Map(worldMapCandidatesForUI(map,difficulty.id,eventKey).map(mon=>[mon.id,mon])).values()] : [];
  const related = events.filter(entry=>entry.mapId===map.id && entry.key!==eventKey);
  const route = WORLD_MAP_PLACES.find(place=>place.id===map.id)?.route || ({arena:'王都の中にある訓練・挑戦の施設。',magic_academy:'王都の中にある魔法を学ぶ施設。',starsea:'星空の平原から観測できる、地上の外に広がる領域。',world_between:'高地の遺跡付近に残る裂け目の先。地理と時間の外にある領域。',golden_land:'決まった住所を持たない幻の土地。発見した入口、または使用準備済みの地図から入れる。'}[map.id] || map.region);
  const sealedText = map.id==='world_between'?'世界の危機が解決したあと、偽竜の痕跡から道が開きます。危機は討伐でも見送りでも構いません。':map.id==='golden_land'?'探索で入口を見つけるか、道具から「黄金郷への地図」を使用してください。':map.id==='starsea'?'探索を続けると星海への入口や、星の危機が見つかります。':'探索を続けると、特別な入口が見つかることがあります。';
  return `<button type="button" class="wm-back" data-wm-back>‹ 世界地図へ戻る</button><article class="wm-detail"><div class="wm-detail-art"><img src="${worldMapEscape(map.image)}" alt="${worldMapEscape(map.name)}"><div><small>${worldMapEscape(map.chapter)} / ${worldMapEscape(map.region)}</small><h2>${worldMapEscape(map.name)}</h2></div></div><div class="wm-detail-body"><p>${worldMapEscape(map.desc)}</p><p class="wm-route">${worldMapEscape(route)}</p>
    ${event?`<aside class="wm-event-notice" role="status"><strong>${worldMapEscape(event.title || '特別な遭遇')}</strong><p>${worldMapEscape(event.description || '準備ができたら挑戦できます。地図を閉じても入口は保持されます。')}</p>${event.kind==='crisis'||event.key==='crisis'?'<button type="button" class="wm-skip" data-wm-skip>今回は対処を任せる</button>':''}</aside>`:''}
    ${related.length?`<div class="wm-related"><h3>この場所の特別な気配</h3>${related.map(entry=>worldMapPlaceButton(map,{eventKey:entry.key,subtitle:entry.title})).join('')}</div>`:''}
    ${!available?`<p class="wm-sealed-message" role="status">${related.length?'通常の入口はありません。上の「特別な気配」から、開いている入口を選んでください。':`入口はまだ開いていません。${worldMapEscape(sealedText)}`}</p>`:`<fieldset class="wm-difficulty"><legend>探索の難易度</legend>${difficulties.map(value=>`<button type="button" class="${value.id===difficulty?.id?'is-selected':''}" data-wm-difficulty="${value.id}" aria-pressed="${value.id===difficulty?.id}">${worldMapEscape(value.label)}</button>`).join('')}</fieldset>
      ${difficulty?`<p class="wm-danger">${worldMapEscape(difficulty.danger)}<br>報酬倍率 ×${worldMapEscape(difficulty.rewardText)} · 戦闘条件は出発時に決定</p>`:''}
      <h3>出現するモンスター</h3><ul class="wm-enemies">${candidates.map(mon=>`<li><span>${worldMapEscape(mon.name)}</span><small>${worldMapEscape(mon.rarity)} · Lv.${huntLevelFor(mon,difficulty.id)}</small></li>`).join('')}</ul>
      ${map.goldenLand&&!eventKey&&goldenLandMapIsReady()?'<p class="wm-entry-note">地図による入場：出発時に「黄金郷への地図」を1枚消費します。自然に見つけた入口は別に保持されます。</p>':''}
      <button type="button" class="wm-depart" data-wm-depart${candidates.length?'':' disabled'}>${event?'この気配を確かめる':'この場所を探索する'} ›</button>`}
    <details class="wm-ecology"><summary>この場所の生態系</summary><p>${worldMapEscape(map.ecosystem)}</p></details></div></article>`;
}
function renderWorldMap(list) {
  if (!list) return false;
  worldMapDeparting = false;
  list.classList.add('world-map-root');
  const map = MAPS.find(value=>value.id===worldMapSelectedId);
  list.innerHTML = map ? worldMapDetailHTML(map,worldMapSelectedEvent) : worldMapOverviewHTML();
  list.onclick = event => {
    const button = event.target.closest('button');
    if (!button || !list.contains(button)) return;
    if (button.hasAttribute('data-wm-back')) {
      worldMapSelectedId=null;worldMapSelectedEvent=null;worldMapSelectedDifficulty=null;
      renderWorldMap(list);list.querySelector('button')?.focus();
    } else if (button.hasAttribute('data-wm-place')) {
      showWorldMapLocation(button.dataset.wmPlace,button.dataset.wmEvent || null);
    } else if (button.hasAttribute('data-wm-difficulty')) {
      worldMapSelectedDifficulty=button.dataset.wmDifficulty;renderWorldMap(list);
      list.querySelector(`[data-wm-difficulty="${worldMapSelectedDifficulty}"]`)?.focus();
    } else if (button.hasAttribute('data-wm-depart')) {
      startWorldMapExploration(worldMapSelectedId,worldMapSelectedDifficulty,worldMapSelectedEvent);
    } else if (button.hasAttribute('data-wm-skip')) {
      if (typeof worldMapSkipCrisis==='function' && worldMapSkipCrisis()) {
        worldMapSelectedEvent=null;renderWorldMap(list);
      }
    }
  };
  return true;
}
function showWorldMapLocation(mapId,eventKey=null) {
  const map=MAPS.find(value=>value.id===mapId);
  if (!map) return false;
  if (worldMapCanEnter(map,eventKey) && typeof registerMapDex==='function' && registerMapDex(mapId)) saveGame();
  worldMapSelectedId=mapId;worldMapSelectedEvent=eventKey;worldMapSelectedDifficulty=null;
  const list=document.getElementById('battleChoiceList');
  renderWorldMap(list);
  list?.querySelector('[data-wm-back]')?.focus();
  return true;
}
function startWorldMapExploration(mapId,difficultyId,eventKey=null) {
  if (worldMapDeparting || (typeof bossCautionPlaying!=='undefined'&&bossCautionPlaying)) return false;
  const map=MAPS.find(value=>value.id===mapId);
  if (!map || !worldMapCanEnter(map,eventKey)) { alert('この入口は現在利用できません。世界地図で確認してください。');return false; }
  if (!worldMapDifficultiesForUI(map,eventKey).some(value=>value.id===difficultyId)) return false;
  const candidates=worldMapCandidatesForUI(map,difficultyId,eventKey);
  if (!candidates.length) return false;
  if (!getPartyInstances().length) { alert('パーティーにモンスターを入れてください。');return false; }
  const mon=candidates[Math.floor(Math.random()*candidates.length)];
  if (typeof registerMapDex==='function' && registerMapDex(mapId)) saveGame();
  prepareBattleParty();
  const request=createHuntRequest({...map,enemyIds:candidates.map(value=>value.id)},mon,difficultyId,rollHuntConditionIds(difficultyId));
  request.worldMapExploration=true;
  request.worldMapEventKey=eventKey;
  request.worldMapEventMonsterId=mon.id;
  request.goldenLandMapEntry=!!(map.goldenLand&&!eventKey&&goldenLandMapIsReady());
  if (eventKey) { request.battleMode='single';request.secondEnemyId=null;request.invasionEnemyId=null;request.invasionTurn=null; }
  registerHuntRequest(request);
  worldMapDeparting=true;
  startChosenBattle(map.id,mon.id,difficultyId,request.requestId);
  return true;
}
