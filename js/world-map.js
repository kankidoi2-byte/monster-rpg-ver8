// Geographic navigation is presentation-only: persistent entrances/events use the worldMap state API.
const WORLD_MAP_PLACES = Object.freeze([
  {id:'snow_mountain',x:49,y:7,icon:'❄',route:'北の山脈。雪解け水は湖へ流れる。'},
  {id:'highland_ruins',x:21,y:15,icon:'⌘',route:'北西の高地。中央平原から山道でつながる。'},
  {id:'starry_plain',x:72,y:13,icon:'✦',route:'北東の高原。星海へ通じる気配を観測する。'},
  {id:'forest',x:17,y:35,icon:'♣',route:'草原の西。南へ進むと光の平原と廃村に道が分かれる。'},
  {id:'grassland',x:44,y:26,icon:'✿',route:'世界の中央。王都・西の森・東の湖への分岐点。'},
  {id:'lake',x:72,y:31,icon:'≈',route:'雪山の水を受け、南東の流出口から海へ注ぐ湖。'},
  {id:'water_secret',x:67,y:43,icon:'◇',route:'湖の南東、海へ下る流れから分かれた上流支谷。入口が現れた時に探索できる。'},
  {id:'seikai_irie',x:82.5,y:50,icon:'≈',route:'湖の南東流出口から続く川の河口。水辺の遺構が外海への目印。'},
  {id:'ruined_village',x:14,y:55,icon:'⌂',route:'森の南西。月影の洞窟がある周辺地方へ続く。'},
  {id:'light_plain',x:31.5,y:48,icon:'☀',route:'森の南東。陽だまりの森の縁に広がる光の平原。'},
  {id:'kaen_village',x:52,y:69,icon:'❀',route:'火山の南側。溶岩流から離れた山あいに里がある。'},
  {id:'volcano',x:52,y:57,icon:'▲',route:'南部火山帯。華炎の里から北へ山道を登る。'},
  {id:'kaiyu_kaiiki',x:90,y:62,icon:'≈',route:'入り江の沖に循環する海流が広がる外海。東にはまだ見ぬ航路がある。'},
  {id:'deep_sea_end',x:88,y:83,icon:'▽',route:'回遊海域の南東。連続する海面の下へ、水に満ちた海溝が深く沈む。'}
]);
let worldMapSelectedId = null;
let worldMapSelectedEvent = null;
let worldMapSelectedDifficulty = null;
let worldMapDeparting = false;
let worldMapNavigationHydrated = false;
let worldMapPanelMode = null;
let worldMapCityOpen = false;

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
  if(changed&&saveNow&&typeof saveGame==='function')/* save-result-allow: world-map-navigation */saveGame();
  return changed;
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

const WORLD_MAP_BEYOND_IDS = Object.freeze(['starsea','world_between','golden_land']);
function worldMapVisible(map) {
  return !!map && (worldMapCanEnter(map) || worldMapEventsForUI().some(event=>event.mapId===map.id&&worldMapCanEnter(map,event.key)));
}
function worldMapDefaultEvent(map) {
  return worldMapCanEnter(map)?null:worldMapEventsForUI().find(event=>event.mapId===map.id&&worldMapCanEnter(map,event.key))?.key||null;
}
function worldMapPoint(id) {
  return WORLD_MAP_PLACES.find(place=>place.id===id)||(['arena','magic_academy','royal_capital'].includes(id)?{x:49,y:38}:null);
}
function worldMapPendingIds() {
  return typeof save!=='undefined'&&Array.isArray(save?.worldMap?.discovery?.pending)?save.worldMap.discovery.pending:[];
}
function worldMapUpdateDiscovery(seenId=null) {
  if(typeof save==='undefined'||!save)return false;
  const previous=save.worldMap;
  const old=previous?.discovery||{};
  const visible=MAPS.filter(worldMapVisible).map(map=>map.id);
  const known=Array.isArray(old.known)?old.known:[];
  const pending=Array.isArray(old.pending)?old.pending:[];
  const next={...old,initialized:true,known:[...new Set([...known,...visible])],
    pending:(old.initialized?[...new Set([...pending,...visible.filter(id=>!known.includes(id))])]:[]).filter(id=>id!==seenId)};
  if(JSON.stringify(old)===JSON.stringify(next))return false;
  save.worldMap={...previous,discovery:next};
  if(typeof saveGame==='function'&&saveGame()===false){save.worldMap=previous;return false;}
  return true;
}
function worldMapPlaceButton(map,{className='',eventKey=null,subtitle=''}={}) {
  if(!worldMapVisible(map)||(eventKey&&!worldMapCanEnter(map,eventKey)))return '';
  const selectedEvent=eventKey||worldMapDefaultEvent(map);
  const event=worldMapEventsForUI().find(entry=>entry.mapId===map.id);
  const pending=worldMapPendingIds().includes(map.id);
  return `<button type="button" class="wm-place ${className}" data-wm-place="${worldMapEscape(map.id)}"${selectedEvent?` data-wm-event="${worldMapEscape(selectedEvent)}"`:''}${map.goldenLand?' data-tutorial-golden-land':''}><span>${worldMapEscape(map.name)}</span>${event?`<span class="wm-event-badge" aria-label="${worldMapEscape(event.title)}">${event.key==='crisis'?'!':'✧'}</span>`:''}${pending?'<i class="wm-new-dot" aria-label="新しい場所"></i>':''}${subtitle?`<small>${worldMapEscape(subtitle)}</small>`:''}</button>`;
}
function worldMapTerrainHTML() {
  return '<img class="wm-terrain" src="images/maps/world_map_prologue_v2.webp" alt="" aria-hidden="true" draggable="false">';
}
function worldMapTerrainEffectsHTML(events){
  const anchors={elysia:{x:31.5,y:48},crisis:{x:72,y:13},rift:{x:21,y:15},water_secret:{x:70,y:42},starsea:{x:72,y:13},golden_land:{x:57,y:79}};
  return events.map(event=>{
    const point=anchors[event.key];
    return point?`<span class="wm-world-effect effect-${worldMapEscape(event.key)}" style="--wm-x:${point.x}%;--wm-y:${point.y}%" aria-hidden="true"></span>`:'';
  }).join('');
}
function worldMapOverviewHTML() {
  const events=worldMapEventsForUI();
  const geography=WORLD_MAP_PLACES.map(place=>{
    const map=MAPS.find(map=>map.id===place.id);
    if(!worldMapVisible(map))return '';
    const event=events.find(entry=>entry.mapId===map.id);
    return `<div class="wm-pin${event?' has-event':''}${worldMapSelectedId===map.id?' is-selected':''}${event?.key==='crisis'?' is-crisis':''}" data-wm-point="${place.id}" style="--wm-x:${place.x}%;--wm-y:${place.y}%">${worldMapPlaceButton(map,{className:'wm-pin-button'})}<span class="wm-pin-icon" aria-hidden="true">${place.icon}</span></div>`;
  }).join('');
  const beyond=MAPS.filter(map=>WORLD_MAP_BEYOND_IDS.includes(map.id)&&worldMapVisible(map));
  const beyondPending=beyond.some(map=>worldMapPendingIds().includes(map.id));
  const hasCrisis=beyond.some(map=>events.some(event=>event.mapId===map.id&&event.key==='crisis'));
  const city=MAPS.some(map=>['arena','magic_academy'].includes(map.id)&&worldMapVisible(map));
  return `<div class="wm-viewport" tabindex="0" role="region" aria-label="序章の世界地図"><div class="wm-map">${worldMapTerrainHTML()}${worldMapTerrainEffectsHTML(events)}</div><div class="wm-pins">${geography}${city?'<div class="wm-pin wm-city-pin" data-wm-point="royal_capital" style="--wm-x:49%;--wm-y:38%"><button type="button" data-wm-city aria-label="王都"><span class="wm-pin-icon" aria-hidden="true">♜</span><span class="wm-pin-name">王都</span></button></div>':''}</div></div>
    <button type="button" class="wm-list-toggle" data-wm-list aria-label="行き先の一覧">一覧${worldMapPendingIds().some(id=>MAPS.some(map=>map.id===id&&worldMapVisible(map)))?'<i class="wm-new-dot" aria-label="新しい場所"></i>':''}</button>
    ${beyond.length?`<button type="button" class="wm-beyond-toggle${hasCrisis?' is-crisis':''}" data-wm-beyond${beyond.some(map=>map.goldenLand)?' data-tutorial-golden-land':''}>${hasCrisis?'!':'✧'} 世界の外側${beyondPending?'<i class="wm-new-dot" aria-label="新しい場所"></i>':''}</button>`:''}`;
}
function worldMapListHTML(beyondOnly=false) {
  const maps=MAPS.filter(map=>worldMapVisible(map)&&!['arena','magic_academy'].includes(map.id)&&(!beyondOnly||WORLD_MAP_BEYOND_IDS.includes(map.id)));
  return `<h2>${beyondOnly?'世界の外側':'行き先'}</h2><div class="wm-place-grid">${!beyondOnly&&MAPS.some(map=>['arena','magic_academy'].includes(map.id)&&worldMapVisible(map))?'<button type="button" class="wm-place" data-wm-city>王都</button>':''}${maps.map(map=>worldMapPlaceButton(map)).join('')}</div>`;
}
function worldMapFacilityTabsHTML(mapId=null) {
  return `<div class="wm-facilities" role="group" aria-label="王都の施設">${['arena','magic_academy'].map(id=>{
    const map=MAPS.find(map=>map.id===id);
    return worldMapVisible(map)?`<button type="button" data-wm-place="${id}" aria-pressed="${id===mapId}">${worldMapEscape(map.name)}</button>`:'';
  }).join('')}</div>`;
}
function worldMapDetailHTML(map,eventKey=null) {
  if(!worldMapVisible(map))return '';
  const events=worldMapEventsForUI().filter(entry=>entry.mapId===map.id&&worldMapCanEnter(map,entry.key));
  const event=eventKey?events.find(entry=>entry.key===eventKey):null;
  const facilityVisit=typeof tutorialWorldMapFacilityVisitFor==='function'?tutorialWorldMapFacilityVisitFor(map.id):null;
  const available=worldMapCanEnter(map,eventKey);
  const difficulties=available?worldMapDifficultiesForUI(map,eventKey):[];
  const rescue=typeof tutorialCurrentStepId==='function'&&['rescue_world_map_grassland','rescue_world_map_depart'].includes(tutorialCurrentStepId())&&map.id==='grassland';
  const difficulty=difficulties.find(value=>value.id===(rescue?'easy':worldMapSelectedDifficulty))||difficulties.find(value=>value.id==='normal')||difficulties[0];
  worldMapSelectedDifficulty=difficulty?.id||null;
  const hasCandidates=difficulty&&worldMapCandidatesForUI(map,difficulty.id,eventKey).length>0;
  const entries=[...(worldMapCanEnter(map)?[{key:null,title:map.goldenLand?'地図で入る':'通常探索'}]:[]),...events];
  return `<article class="wm-detail"><div class="wm-detail-art"><img src="${worldMapEscape(mapPortraitImage(map))}" alt=""><h2>${worldMapEscape(map.name)}</h2></div><div class="wm-detail-body">
    ${['arena','magic_academy'].includes(map.id)?worldMapFacilityTabsHTML(map.id):''}<p>${worldMapEscape(map.desc)}</p>
    ${entries.length>1?`<div class="wm-entries" role="group" aria-label="入口">${entries.map(entry=>`<button type="button" data-wm-place="${map.id}"${entry.key?` data-wm-event="${entry.key}"`:''} aria-pressed="${entry.key===eventKey}">${worldMapEscape(entry.title)}</button>`).join('')}</div>`:''}
    ${event?`<aside class="wm-event-notice${event.guideUnread?' is-first-guide':''}" role="status">${event.guideUnread?`<small>NEW GUIDE</small><strong>${worldMapEscape(event.guideTitle||event.title)}</strong><p>${worldMapEscape(event.guideDescription||'')}</p>`:''}<strong>${worldMapEscape(event.title)}</strong><p>${worldMapEscape(event.description||'')}</p>${event.key==='crisis'?'<button type="button" class="wm-skip" data-wm-skip>今回は対処を任せる</button>':''}</aside>`:''}
    ${facilityVisit?`<div class="wm-facility-visit"><p>${worldMapEscape(facilityVisit.description)}</p><button type="button" class="wm-depart" data-wm-facility-visit="${map.id}">${worldMapEscape(facilityVisit.label)}</button></div>`:available?`<fieldset class="wm-difficulty"><legend class="wm-sr-only">探索の難易度</legend>${difficulties.map(value=>`<button type="button" data-wm-difficulty="${value.id}" aria-pressed="${value.id===difficulty?.id}">${worldMapEscape(value.label)}<small>報酬×${worldMapEscape(value.rewardText)}</small></button>`).join('')}</fieldset>${difficulty?`<p class="wm-danger">${worldMapEscape(difficulty.danger)}</p>`:''}${map.goldenLand&&!eventKey&&goldenLandMapIsReady()?'<p class="wm-entry-note">出発時に「黄金郷への地図」を1枚消費します。</p>':''}<button type="button" class="wm-depart" data-wm-depart${hasCandidates?'':' disabled'}>出発</button>`:''}
    <div class="wm-story-entry">${typeof mapStoryEntryHtml==='function'?mapStoryEntryHtml(map):''}</div><details class="wm-ecology"><summary>生態系</summary><p>${worldMapEscape(map.ecosystem)}</p></details></div></article>`;
}
function worldMapPanelHTML() {
  const map=MAPS.find(map=>map.id===worldMapSelectedId&&worldMapVisible(map));
  const content=worldMapPanelMode?worldMapListHTML(worldMapPanelMode==='beyond'):map?worldMapDetailHTML(map,worldMapSelectedEvent):worldMapCityOpen?`<h2>王都</h2>${worldMapFacilityTabsHTML()}`:'';
  return content?`<section class="wm-sheet" aria-label="${worldMapPanelMode?'行き先一覧':map?worldMapEscape(map.name):'王都'}"><div class="wm-sheet-handle" aria-hidden="true"></div><button type="button" class="wm-close" data-wm-back aria-label="パネルを閉じる">×</button><div class="wm-sheet-scroll">${content}</div></section>`:'';
}
function renderWorldMap(list,{saveNavigation=true}={}) {
  if(!list)return false;
  if(typeof cleanupWorldMapViewport==='function')cleanupWorldMapViewport();
  hydrateWorldMapNavigation();
  const map=MAPS.find(map=>map.id===worldMapSelectedId);
  if(map&&!worldMapCanEnter(map,worldMapSelectedEvent)){
    if(worldMapVisible(map))worldMapSelectedEvent=worldMapDefaultEvent(map);
    else {worldMapSelectedId=null;worldMapSelectedEvent=null;worldMapSelectedDifficulty=null;}
  }
  worldMapDeparting=false;
  worldMapUpdateDiscovery();
  list.classList.add('world-map-root');
  list.innerHTML=worldMapOverviewHTML()+worldMapPanelHTML();
  persistWorldMapNavigation({saveNow:saveNavigation});
  if(typeof setupWorldMapViewport==='function')setupWorldMapViewport(list);
  if(typeof worldMapDismissOverviewIntro==='function'&&list.innerHTML)worldMapDismissOverviewIntro();
  if(worldMapSelectedId&&worldMapSelectedEvent&&typeof worldMapAcknowledgeEventGuide==='function')worldMapAcknowledgeEventGuide(worldMapSelectedEvent);
  list.onclick=event=>{
    if(typeof worldMapIgnoreClick==='function'&&worldMapIgnoreClick()&&event.target.closest('.wm-viewport'))return;
    const button=event.target.closest('button');
    if(!button||!list.contains(button)){
      if(event.target.closest('.wm-viewport'))showWorldMapOverview();
      return;
    }
    if(button.hasAttribute('data-wm-back')){showWorldMapOverview();list.querySelector('[data-wm-list]')?.focus();}
    else if(button.hasAttribute('data-wm-city'))showWorldMapCity();
    else if(button.hasAttribute('data-wm-list')||button.hasAttribute('data-wm-beyond')){
      worldMapPanelMode=button.hasAttribute('data-wm-beyond')?'beyond':'list';worldMapSelectedId=null;worldMapSelectedEvent=null;worldMapCityOpen=false;
      renderWorldMap(list);list.querySelector('.wm-sheet button')?.focus();
    }else if(button.hasAttribute('data-wm-place'))showWorldMapLocation(button.dataset.wmPlace,button.dataset.wmEvent||null);
    else if(button.hasAttribute('data-wm-difficulty')){
      worldMapSelectedDifficulty=button.dataset.wmDifficulty;renderWorldMap(list);
      list.querySelector(`[data-wm-difficulty="${worldMapSelectedDifficulty}"]`)?.focus();
    }else if(button.hasAttribute('data-wm-facility-visit')){
      if(typeof handleTutorialWorldMapFacilityVisit==='function')handleTutorialWorldMapFacilityVisit(button.dataset.wmFacilityVisit);
    }else if(button.hasAttribute('data-wm-depart')){
      persistWorldMapNavigation();startWorldMapExploration(worldMapSelectedId,worldMapSelectedDifficulty,worldMapSelectedEvent);
    }else if(button.hasAttribute('data-wm-skip')){
      if(typeof worldMapSkipCrisis==='function'&&worldMapSkipCrisis()){worldMapSelectedEvent=null;renderWorldMap(list);}
    }
  };
  if(list.querySelector?.('[data-tutorial-golden-land]')&&typeof offerGoldenLandTutorialGuide==='function')setTimeout(offerGoldenLandTutorialGuide,0);
  return true;
}
function showWorldMapOverview(){
  worldMapNavigationHydrated=true;
  worldMapSelectedId=null;worldMapSelectedEvent=null;worldMapSelectedDifficulty=null;worldMapPanelMode=null;worldMapCityOpen=false;
  return renderWorldMap(document.getElementById('battleChoiceList'));
}
function showWorldMapCity(){
  if(typeof tutorialCurrentStepId==='function'&&tutorialCurrentStepId()==='rescue_world_map_grassland')return false;
  worldMapSelectedId=null;worldMapSelectedEvent=null;worldMapSelectedDifficulty=null;worldMapPanelMode=null;worldMapCityOpen=true;
  return renderWorldMap(document.getElementById('battleChoiceList'));
}
function showWorldMapLocation(mapId,eventKey=null) {
  if(typeof handleTutorialWorldMapLocationSelection==='function'&&handleTutorialWorldMapLocationSelection(mapId,eventKey))return false;
  const map=MAPS.find(value=>value.id===mapId);
  if(!worldMapVisible(map)||(eventKey&&!worldMapCanEnter(map,eventKey)))return false;
  if(!eventKey&&!worldMapCanEnter(map))eventKey=worldMapDefaultEvent(map);
  hydrateWorldMapNavigation();
  const keepDifficulty=worldMapSelectedId===mapId&&worldMapSelectedEvent===eventKey?worldMapSelectedDifficulty:null;
  if(worldMapCanEnter(map,eventKey)&&typeof registerMapDex==='function')registerMapDex(mapId);
  worldMapSelectedId=mapId;worldMapSelectedEvent=eventKey;worldMapSelectedDifficulty=keepDifficulty;worldMapPanelMode=null;worldMapCityOpen=false;
  const list=document.getElementById('battleChoiceList');
  renderWorldMap(list,{saveNavigation:false});
  if(typeof saveGame==='function')/* save-result-allow: world-map-location */saveGame();
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
  if (typeof registerMapDex==='function' && registerMapDex(mapId)) /* save-result-allow: world-map-departure-dex */saveGame();
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
