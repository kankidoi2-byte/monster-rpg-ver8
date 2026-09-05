// Geographic navigation is presentation-only: persistent entrances/events use the worldMap state API.
const WORLD_MAP_PLACES = Object.freeze([
  {id:'snow_mountain',x:49,y:7,icon:'❄',route:'北の山脈。雪解け水は湖へ流れる。'},
  {id:'highland_ruins',x:21,y:15,icon:'⌘',route:'北西の高地。中央平原から山道でつながる。'},
  {id:'starry_plain',x:72,y:13,icon:'✦',route:'北東の高原。星海へ通じる気配を観測する。'},
  {id:'forest',x:17,y:35,icon:'♣',route:'草原の西。南へ進むと光の平原と廃村に道が分かれる。'},
  {id:'grassland',x:44,y:26,icon:'✿',route:'世界の中央。王都・西の森・東の湖への分岐点。'},
  {id:'lake',x:70,y:34,icon:'≈',route:'雪山の水を受け、東の海へ注ぐ湖。'},
  {id:'water_secret',x:79,y:45,icon:'◇',route:'湖から海へ向かう支流の奥。入口が現れた時に探索できる。'},
  {id:'seikai_irie',x:89,y:28,icon:'≈',route:'湖から続く川の河口。外海への玄関口。'},
  {id:'ruined_village',x:14,y:55,icon:'⌂',route:'森の南西。月影の洞窟がある周辺地方へ続く。'},
  {id:'light_plain',x:31,y:49,icon:'☀',route:'森の南東。陽だまりの森の縁に広がる光の平原。'},
  {id:'kaen_village',x:52,y:70,icon:'❀',route:'火山の北側。溶岩流から離れた斜面に里がある。'},
  {id:'volcano',x:50,y:58,icon:'▲',route:'南部火山帯。華炎の里から山道を登る。'},
  {id:'kaiyu_kaiiki',x:86,y:65,icon:'≈',route:'入江の沖に広がる外海。東にはまだ見ぬ航路がある。'},
  {id:'deep_sea_end',x:86,y:82,icon:'▽',route:'外海のさらに下、光が届かない深海域。'}
]);
let worldMapSelectedId = null;
let worldMapSelectedEvent = null;
let worldMapSelectedDifficulty = null;
let worldMapDeparting = false;
let worldMapNavigationHydrated = false;
let worldMapScrollSaveTimer = null;

function worldMapEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function worldMapNavigationForUI() {
  const raw=typeof save!=='undefined'&&save?.worldMap?.navigation;
  if(typeof normalizeWorldMapNavigationState==='function')return normalizeWorldMapNavigationState(raw);
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const mapId=typeof source.mapId==='string'&&MAPS.some(map=>map.id===source.mapId)?source.mapId:null;
  return {
    ...source,
    mapId,
    eventKey:mapId&&typeof source.eventKey==='string'?source.eventKey:null,
    difficultyId:mapId&&['easy','normal','hard','extreme'].includes(source.difficultyId)?source.difficultyId:null,
    overviewScrollLeft:Number.isFinite(Number(source.overviewScrollLeft))&&Number(source.overviewScrollLeft)>=0?Math.min(100000,Math.floor(Number(source.overviewScrollLeft))):0
  };
}
function hydrateWorldMapNavigation() {
  if(worldMapNavigationHydrated)return;
  const navigation=worldMapNavigationForUI();
  worldMapSelectedId=navigation.mapId;
  worldMapSelectedEvent=navigation.eventKey;
  worldMapSelectedDifficulty=navigation.difficultyId;
  if(worldMapSelectedEvent&&!worldMapEventsForUI().some(event=>event.key===worldMapSelectedEvent&&event.mapId===worldMapSelectedId))
    worldMapSelectedEvent=null;
  worldMapNavigationHydrated=true;
}
function persistWorldMapNavigation({overviewScrollLeft=null,saveNow=true}={}) {
  if(typeof save==='undefined'||!save)return false;
  const hadNavigation=!!(save.worldMap?.navigation&&typeof save.worldMap.navigation==='object'&&!Array.isArray(save.worldMap.navigation));
  const base=typeof normalizeWorldMapSaveState==='function'
    ?normalizeWorldMapSaveState(save.worldMap)
    :(save.worldMap&&typeof save.worldMap==='object'&&!Array.isArray(save.worldMap)?{...save.worldMap}:{});
  const current=worldMapNavigationForUI();
  const desired={...current,mapId:worldMapSelectedId,eventKey:worldMapSelectedEvent,difficultyId:worldMapSelectedDifficulty};
  if(overviewScrollLeft!==null)desired.overviewScrollLeft=overviewScrollLeft;
  const normalized=typeof normalizeWorldMapNavigationState==='function'
    ?normalizeWorldMapNavigationState(desired):desired;
  const changed=!hadNavigation||current.mapId!==normalized.mapId||current.eventKey!==normalized.eventKey||
    current.difficultyId!==normalized.difficultyId||current.overviewScrollLeft!==normalized.overviewScrollLeft;
  save.worldMap={...base,navigation:normalized};
  if(changed&&saveNow&&typeof saveGame==='function')saveGame();
  return changed;
}
function captureWorldMapScroll(list,{saveNow=false}={}) {
  const scroller=list?.querySelector?.('.wm-map-scroll');
  if(!scroller)return false;
  return persistWorldMapNavigation({overviewScrollLeft:scroller.scrollLeft,saveNow});
}
function restoreWorldMapScroll(list) {
  const scroller=list?.querySelector?.('.wm-map-scroll');
  if(!scroller)return;
  scroller.scrollLeft=worldMapNavigationForUI().overviewScrollLeft;
  scroller.onscroll=()=>{
    if(worldMapScrollSaveTimer!==null&&typeof clearTimeout==='function')clearTimeout(worldMapScrollSaveTimer);
    if(typeof setTimeout==='function')worldMapScrollSaveTimer=setTimeout(()=>{
      worldMapScrollSaveTimer=null;
      persistWorldMapNavigation({overviewScrollLeft:scroller.scrollLeft});
    },300);
    else persistWorldMapNavigation({overviewScrollLeft:scroller.scrollLeft});
  };
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
  const goldenGuideTarget=map.goldenLand&&(eventKey==='golden_land'||(!eventKey&&available));
  return `<button type="button" class="wm-place ${className}${available||hasEvent?'':' is-sealed'}" data-wm-place="${worldMapEscape(map.id)}"${eventKey?` data-wm-event="${worldMapEscape(eventKey)}"`:''}${goldenGuideTarget?' data-tutorial-golden-land':''}><span>${worldMapEscape(map.name)}</span><small>${worldMapEscape(subtitle || (available?'探索先を見る':hasEvent?'特別な入口あり':'入口未出現・詳細を見る'))}</small></button>`;
}
function worldMapTerrainHTML() {
  return '<img class="wm-terrain" src="images/maps/world_map_prologue_v1.webp" alt="" aria-hidden="true">';
}
function worldMapTerrainEffectsHTML(events){
  const anchors={elysia:{x:31,y:49},crisis:{x:72,y:13},rift:{x:21,y:15},water_secret:{x:79,y:45},starsea:{x:72,y:13},golden_land:{x:57,y:79}};
  return events.map(event=>{
    const point=anchors[event.key];
    return point?`<span class="wm-world-effect effect-${worldMapEscape(event.key)}" style="--wm-x:${point.x}%;--wm-y:${point.y}%" aria-hidden="true"></span>`:'';
  }).join('');
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
    ${typeof worldMapOverviewIntroIsUnread==='function'&&worldMapOverviewIntroIsUnread()?'<aside class="wm-intro-guide" role="status"><small>WORLD MAP GUIDE</small><strong>バトルの行き先を自由に選べるようになりました</strong><p>場所を選び、出現候補と難易度を確認してから出発します。世界の異変や特殊な入口も、この地図に残ります。</p><button type="button" data-wm-intro-dismiss>地図を見る</button></aside>':''}
    ${events.length?`<section class="wm-events" aria-label="世界の異変"><h3>世界の異変・開かれた入口</h3>${events.map(event=>{const map=byMap(event.mapId);return map?worldMapPlaceButton(map,{className:`wm-event${event.guideUnread?' is-unread':''}`,eventKey:event.key,subtitle:event.guideUnread?`初めての異変 · ${event.title}`:(event.title || '特別な気配')}):'';}).join('')}</section>`:'<p class="wm-calm" role="status">今は穏やかな世界です。探索で勝利すると、新たな入口や異変が見つかることがあります。</p>'}
    <p class="wm-map-hint">地図は横にスクロールできます。下の「場所一覧」からも同じ場所を選べます。</p>
    <div class="wm-map-scroll" tabindex="0" role="region" aria-label="序章の世界地図・横スクロール可能"><div class="wm-map">${worldMapTerrainHTML()}${worldMapTerrainEffectsHTML(events)}${geography}<div class="wm-city-pin"><span aria-hidden="true">♜</span><strong>王都</strong><small>闘技場・魔導学園</small></div></div></div>
    <section class="wm-city"><h3>王都の施設</h3><p>草原の南にある冒険の拠点。施設ごとに相手と難易度を選べます。</p><div class="wm-place-grid">${cityMaps.map(map=>worldMapPlaceButton(map)).join('')}</div></section>
    <section class="wm-list"><h3>場所一覧</h3><div class="wm-place-grid">${WORLD_MAP_PLACES.map(place=>byMap(place.id)).filter(Boolean).map(map=>worldMapPlaceButton(map)).join('')}</div></section>
    <section class="wm-beyond"><h3>世界の外側・幻の領域</h3><p>入口が開くと探索できます。未出現でも、場所の説明は確認できます。</p><div class="wm-place-grid">${specialMaps.map(map=>worldMapPlaceButton(map)).join('')}</div></section>`;
}
function worldMapDetailHTML(map,eventKey=null) {
  const events = worldMapEventsForUI();
  const event = eventKey ? events.find(entry => entry.key === eventKey && entry.mapId === map.id) : null;
  const facilityVisit = typeof tutorialWorldMapFacilityVisitFor==='function'
    ? tutorialWorldMapFacilityVisitFor(map.id) : null;
  const available = worldMapCanEnter(map,eventKey);
  const difficulties = available ? worldMapDifficultiesForUI(map,eventKey) : [];
  const difficulty = difficulties.find(value=>value.id===worldMapSelectedDifficulty) || difficulties[0];
  worldMapSelectedDifficulty = difficulty?.id || null;
  const candidates = difficulty ? [...new Map(worldMapCandidatesForUI(map,difficulty.id,eventKey).map(mon=>[mon.id,mon])).values()] : [];
  const related = events.filter(entry=>entry.mapId===map.id && entry.key!==eventKey);
  const route = WORLD_MAP_PLACES.find(place=>place.id===map.id)?.route || ({arena:'王都の中にある訓練・挑戦の施設。',magic_academy:'王都の中にある魔法を学ぶ施設。',starsea:'星空の平原から観測できる、地上の外に広がる領域。',world_between:'高地の遺跡付近に残る裂け目の先。地理と時間の外にある領域。',golden_land:'決まった住所を持たない幻の土地。発見した入口、または使用準備済みの地図から入れる。'}[map.id] || map.region);
  const sealedText = map.id==='world_between'?'世界の危機が解決したあと、偽竜の痕跡から道が開きます。危機は討伐でも見送りでも構いません。':map.id==='golden_land'?'探索で入口を見つけるか、道具から「黄金郷への地図」を使用してください。':map.id==='starsea'?'探索を続けると星海への入口や、星の危機が見つかります。':'探索を続けると、特別な入口が見つかることがあります。';
  return `<button type="button" class="wm-back" data-wm-back>‹ 世界地図へ戻る</button><article class="wm-detail"><div class="wm-detail-art"><img src="${worldMapEscape(map.image)}" alt="${worldMapEscape(map.name)}"><div><small>${worldMapEscape(map.chapter)} / ${worldMapEscape(map.region)}</small><h2>${worldMapEscape(map.name)}</h2></div></div><div class="wm-detail-body"><p>${worldMapEscape(map.desc)}</p><p class="wm-route">${worldMapEscape(route)}</p>
    ${event?`<aside class="wm-event-notice${event.guideUnread?' is-first-guide':''}" role="status">${event.guideUnread?`<small>NEW GUIDE</small><strong>${worldMapEscape(event.guideTitle || 'はじめての世界異変')}</strong><p>${worldMapEscape(event.guideDescription || event.description)}</p><hr>`:''}<strong>${worldMapEscape(event.title || '特別な遭遇')}</strong><p>${worldMapEscape(event.description || '準備ができたら挑戦できます。地図を閉じても入口は保持されます。')}</p>${event.kind==='crisis'||event.key==='crisis'?'<button type="button" class="wm-skip" data-wm-skip>今回は対処を任せる</button>':''}</aside>`:''}
    ${facilityVisit?`<aside class="wm-event-notice wm-facility-visit"><strong>${worldMapEscape(facilityVisit.label)}</strong><p>${worldMapEscape(facilityVisit.description)}</p><button type="button" class="wm-depart" data-wm-facility-visit="${worldMapEscape(map.id)}">${worldMapEscape(facilityVisit.label)} ›</button></aside>`:''}
    ${related.length?`<div class="wm-related"><h3>この場所の特別な気配</h3>${related.map(entry=>worldMapPlaceButton(map,{eventKey:entry.key,subtitle:entry.title})).join('')}</div>`:''}
    ${facilityVisit?'':!available?`<p class="wm-sealed-message" role="status">${related.length?'通常の入口はありません。上の「特別な気配」から、開いている入口を選んでください。':`入口はまだ開いていません。${worldMapEscape(sealedText)}`}</p>`:`<fieldset class="wm-difficulty"><legend>探索の難易度</legend>${difficulties.map(value=>`<button type="button" class="${value.id===difficulty?.id?'is-selected':''}" data-wm-difficulty="${value.id}" aria-pressed="${value.id===difficulty?.id}">${worldMapEscape(value.label)}</button>`).join('')}</fieldset>
      ${difficulty?`<p class="wm-danger">${worldMapEscape(difficulty.danger)}<br>報酬倍率 ×${worldMapEscape(difficulty.rewardText)} · 戦闘条件は出発時に決定</p>`:''}
      <h3>出現するモンスター</h3><ul class="wm-enemies">${candidates.map(mon=>`<li><span>${worldMapEscape(mon.name)}</span><small>${worldMapEscape(mon.rarity)} · Lv.${huntLevelFor(mon,difficulty.id)}</small></li>`).join('')}</ul>
      ${map.goldenLand&&!eventKey&&goldenLandMapIsReady()?'<p class="wm-entry-note">地図による入場：出発時に「黄金郷への地図」を1枚消費します。自然に見つけた入口は別に保持されます。</p>':''}
      <button type="button" class="wm-depart" data-wm-depart${candidates.length?'':' disabled'}>${event?'この気配を確かめる':'この場所を探索する'} ›</button>`}
    <details class="wm-ecology"><summary>この場所の生態系</summary><p>${worldMapEscape(map.ecosystem)}</p></details></div></article>`;
}
function renderWorldMap(list,{saveNavigation=true}={}) {
  if (!list) return false;
  hydrateWorldMapNavigation();
  worldMapDeparting = false;
  list.classList.add('world-map-root');
  const map = MAPS.find(value=>value.id===worldMapSelectedId);
  list.innerHTML = map ? worldMapDetailHTML(map,worldMapSelectedEvent) : worldMapOverviewHTML();
  if(!map)restoreWorldMapScroll(list);
  persistWorldMapNavigation({saveNow:saveNavigation});
  if(map&&worldMapSelectedEvent&&typeof worldMapAcknowledgeEventGuide==='function')worldMapAcknowledgeEventGuide(worldMapSelectedEvent);
  list.onclick = event => {
    const button = event.target.closest('button');
    if (!button || !list.contains(button)) return;
    if (button.hasAttribute('data-wm-back')) {
      worldMapSelectedId=null;worldMapSelectedEvent=null;worldMapSelectedDifficulty=null;
      renderWorldMap(list);list.querySelector('button')?.focus();
    } else if (button.hasAttribute('data-wm-place')) {
      captureWorldMapScroll(list);
      showWorldMapLocation(button.dataset.wmPlace,button.dataset.wmEvent || null);
    } else if (button.hasAttribute('data-wm-difficulty')) {
      worldMapSelectedDifficulty=button.dataset.wmDifficulty;renderWorldMap(list);
      list.querySelector(`[data-wm-difficulty="${worldMapSelectedDifficulty}"]`)?.focus();
    } else if (button.hasAttribute('data-wm-facility-visit')) {
      if(typeof handleTutorialWorldMapFacilityVisit==='function')
        handleTutorialWorldMapFacilityVisit(button.dataset.wmFacilityVisit);
    } else if (button.hasAttribute('data-wm-depart')) {
      persistWorldMapNavigation();
      startWorldMapExploration(worldMapSelectedId,worldMapSelectedDifficulty,worldMapSelectedEvent);
    } else if (button.hasAttribute('data-wm-skip')) {
      if (typeof worldMapSkipCrisis==='function' && worldMapSkipCrisis()) {
        worldMapSelectedEvent=null;renderWorldMap(list);
      }
    } else if (button.hasAttribute('data-wm-intro-dismiss')) {
      if(typeof worldMapDismissOverviewIntro==='function'&&worldMapDismissOverviewIntro())renderWorldMap(list);
    }
  };
  if(list.querySelector?.('[data-tutorial-golden-land]')&&typeof offerGoldenLandTutorialGuide==='function')setTimeout(offerGoldenLandTutorialGuide,0);
  return true;
}
function showWorldMapOverview(){
  worldMapNavigationHydrated=true;
  worldMapSelectedId=null;worldMapSelectedEvent=null;worldMapSelectedDifficulty=null;
  return renderWorldMap(document.getElementById('battleChoiceList'));
}
function showWorldMapLocation(mapId,eventKey=null) {
  if(typeof handleTutorialWorldMapLocationSelection==='function'&&handleTutorialWorldMapLocationSelection(mapId,eventKey))return false;
  const map=MAPS.find(value=>value.id===mapId);
  if (!map) return false;
  hydrateWorldMapNavigation();
  const keepDifficulty=worldMapSelectedId===mapId&&worldMapSelectedEvent===eventKey?worldMapSelectedDifficulty:null;
  if (worldMapCanEnter(map,eventKey) && typeof registerMapDex==='function') registerMapDex(mapId);
  worldMapSelectedId=mapId;worldMapSelectedEvent=eventKey;worldMapSelectedDifficulty=keepDifficulty;
  const list=document.getElementById('battleChoiceList');
  renderWorldMap(list,{saveNavigation:false});
  if(typeof saveGame==='function')saveGame();
  list?.querySelector('[data-wm-back]')?.focus();
  return true;
}
function startWorldMapExploration(mapId,difficultyId,eventKey=null) {
  if (worldMapDeparting || (typeof bossCautionPlaying!=='undefined'&&bossCautionPlaying)) return false;
  if(typeof handleTutorialWorldMapDeparture==='function'&&handleTutorialWorldMapDeparture(mapId,difficultyId,eventKey))return true;
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
