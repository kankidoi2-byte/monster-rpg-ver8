/* World-map/battle adapter. Existing map IDs and battle rewards stay canonical. */
const WORLD_EVENT_LABELS = Object.freeze({
  elysia:['女神の降臨','光の平原に女神が降臨しています。女神との試練は契約の対象外です。通常の探索も続けられます。'],
  crisis:['滅亡の星の接近','世界に異変が広がっています。挑戦するか、今回は見送るかを選べます。'],
  rift:['偽竜の痕跡','危機への介入が世界の狭間への道を残しました。'],
  water_secret:['流水の秘境への道','水辺に秘境への道が開いています。'],
  starsea:['星の海への道','星空の平原から、遥かなる星の海へ向かえます。'],
  golden_land:['黄金郷への道','幻の黄金郷への入口を発見しました。']
});
const WORLD_EVENT_FIRST_GUIDES = Object.freeze({
  elysia:['はじめての降臨','光の平原に、★4「光の女神エリシア」がまれに降臨します。女神との試練は契約できず、通常の探索はそのまま続けられます。'],
  crisis:['はじめての世界危機','★5「滅亡の星ネメシオン」が世界へ影響を及ぼしています。自分で挑むか、今回は偽竜へ対処を任せるかを選べます。どちらを選んでも、偽竜の痕跡は残ります。'],
  rift:['はじめての偽竜の痕跡','世界の危機へ介入した偽竜たちの痕跡です。世界の狭間で3体へ順に挑めます。入口に制限時間はありません。'],
  special_entrance:['はじめての特殊入口','探索で見つけた特殊な入口は、画面を閉じたり別の場所へ移動したりしても保持されます。準備ができた時に挑戦できます。']
});
function clearResolvedWorldMapNavigation(state,eventKey){
  const next=typeof normalizeWorldMapSaveState==='function'
    ?normalizeWorldMapSaveState(state):normalizeWorldMapState(state);
  if(next.navigation?.eventKey===eventKey)
    next.navigation={...next.navigation,eventKey:null};
  return next;
}
function clearWorldMapRuntimeEventSelection(eventKey){
  if(typeof worldMapSelectedEvent!=='undefined'&&worldMapSelectedEvent===eventKey)
    worldMapSelectedEvent=null;
}
function worldMapActiveEvents(){
  const state=normalizeWorldMapState(save.worldMap);
  return Object.entries(state.active).filter(([key,event])=>WORLD_EVENT_LABELS[key]&&event).map(([key,event])=>{
    const guideKey=typeof worldEventGuideKey==='function'?worldEventGuideKey(key):null;
    const guide=WORLD_EVENT_FIRST_GUIDES[guideKey];
    return {...event,key,title:WORLD_EVENT_LABELS[key][0],description:WORLD_EVENT_LABELS[key][1],kind:key,
      guideUnread:typeof worldEventGuideIsUnread==='function'&&worldEventGuideIsUnread(state,key),
      guideTitle:guide?.[0]||'',guideDescription:guide?.[1]||''};
  });
}
function worldMapAcknowledgeEventGuide(eventKey){
  if(typeof worldEventGuideIsUnread!=='function'||!worldEventGuideIsUnread(save.worldMap,eventKey))return false;
  const previous=save.worldMap;
  save.worldMap=markWorldEventGuideSeen(save.worldMap,eventKey);
  if(saveGame()===false){save.worldMap=previous;return false;}
  return true;
}
function worldMapOverviewIntroIsUnread(){
  const tutorial=save.progress?.tutorial;
  const state=normalizeWorldMapState(save.worldMap);
  return Boolean(['completed','skipped'].includes(tutorial?.status)&&state.guides.map_intro!==true);
}
function worldMapDismissOverviewIntro(){
  if(!worldMapOverviewIntroIsUnread())return false;
  const previous=save.worldMap;
  const next=normalizeWorldMapState(save.worldMap);
  next.guides.map_intro=true;
  save.worldMap=next;
  if(saveGame()===false){save.worldMap=previous;return false;}
  return true;
}
function worldMapEntryAvailable(map,eventKey=null){
  if(!map)return false;
  if(eventKey){
    const event=normalizeWorldMapState(save.worldMap).active[eventKey];
    return Boolean(event&&event.mapId===map.id);
  }
  if(map.goldenLand)return goldenLandMapIsReady();
  return !map.bossOnly&&!map.rareOnly;
}
function worldMapCandidates(map,difficultyId,eventKey=null){
  if(!worldMapEntryAvailable(map,eventKey))return [];
  const event=eventKey?normalizeWorldMapState(save.worldMap).active[eventKey]:null;
  if(event?.monsterId){
    const mon=by(event.monsterId);
    return isHuntMonsterEligible(mon,difficultyId)?[mon]:[];
  }
  const eventOnly=new Set(['hikari','doom_nemesion','false_dragon_alfa','false_dragon_beta','false_dragon_gamma']);
  return huntCandidatesFor(map,difficultyId).filter(mon=>!eventOnly.has(mon.id)&&!mon.alchemyExclusive);
}
function worldMapAvailableDifficulties(map,eventKey=null){
  return Object.values(HUNT_DIFFICULTIES).filter(d=>
    (!(map?.bossOnly||map?.rareOnly||map?.goldenLand)||['hard','extreme'].includes(d.id))&&
    worldMapCandidates(map,d.id,eventKey).length
  );
}
function worldMapSkipCrisis(){
  if(!normalizeWorldMapState(save.worldMap).active.crisis)return false;
  if(!confirm('今回は危機への挑戦を見送りますか？ 偽竜が対処し、世界の狭間へ向かう痕跡が残ります。'))return false;
  const previous=save.worldMap;
  save.worldMap=clearResolvedWorldMapNavigation(resolveWorldEvent(save.worldMap,'crisis','skip'),'crisis');
  if(saveGame()===false){save.worldMap=previous;alert('記録を保存できませんでした。もう一度お試しください。');return false;}
  clearWorldMapRuntimeEventSelection('crisis');
  return true;
}
function recordWorldMapVictory(){
  const request=activeHuntRequest;
  if(!request?.worldMapExploration||request.worldMapResultRecorded)return;
  request.worldMapResultRecorded=true;
  if(request.worldMapEventKey){
    const event=normalizeWorldMapState(save.worldMap).active[request.worldMapEventKey];
    if(event&&(!event.monsterId||event.monsterId===request.worldMapEventMonsterId)){
      save.worldMap=clearResolvedWorldMapNavigation(
        resolveWorldEvent(save.worldMap,request.worldMapEventKey,'defeat'),request.worldMapEventKey
      );
      clearWorldMapRuntimeEventSelection(request.worldMapEventKey);
    }
    return;
  }
  // Tutorial sessions never roll random gates; neither do special/item entries.
  const tutorial=save.progress?.tutorial;
  if(tutorial&&!['completed','skipped'].includes(tutorial.status))return;
  if(selectedMap?.bossOnly||selectedMap?.rareOnly||selectedMap?.goldenLand)return;
  save.worldMap=rollWorldEventsAfterVictory(save.worldMap,{
    receiptId:`world-victory:${save.history.wins}`,difficultyId:request.difficultyId,mapId:request.mapId
  });
}
