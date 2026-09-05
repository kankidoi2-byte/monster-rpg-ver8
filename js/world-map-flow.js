/* World-map/battle adapter. Existing map IDs and battle rewards stay canonical. */
const WORLD_EVENT_LABELS = Object.freeze({
  elysia:['女神の降臨','光の平原に女神が降臨しています。女神との試練は契約の対象外です。通常の探索も続けられます。'],
  crisis:['滅亡の星の接近','世界に異変が広がっています。挑戦するか、今回は見送るかを選べます。'],
  rift:['偽竜の痕跡','危機への介入が世界の狭間への道を残しました。'],
  water_secret:['流水の秘境への道','水辺に秘境への道が開いています。'],
  starsea:['星の海への道','星空の平原から、遥かなる星の海へ向かえます。'],
  golden_land:['黄金郷への道','幻の黄金郷への入口を発見しました。']
});
function worldMapActiveEvents(){
  const state=normalizeWorldMapState(save.worldMap);
  return Object.entries(state.active).filter(([key,event])=>WORLD_EVENT_LABELS[key]&&event).map(([key,event])=>({
    ...event,key,title:WORLD_EVENT_LABELS[key][0],description:WORLD_EVENT_LABELS[key][1],kind:key
  }));
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
  save.worldMap=resolveWorldEvent(save.worldMap,'crisis','skip');
  if(saveGame()===false){save.worldMap=previous;alert('記録を保存できませんでした。もう一度お試しください。');return false;}
  return true;
}
function recordWorldMapVictory(){
  const request=activeHuntRequest;
  if(!request?.worldMapExploration||request.worldMapResultRecorded)return;
  request.worldMapResultRecorded=true;
  if(request.worldMapEventKey){
    const event=normalizeWorldMapState(save.worldMap).active[request.worldMapEventKey];
    if(event&&(!event.monsterId||event.monsterId===request.worldMapEventMonsterId))
      save.worldMap=resolveWorldEvent(save.worldMap,request.worldMapEventKey,'defeat');
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
