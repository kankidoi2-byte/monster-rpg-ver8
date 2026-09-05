import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// A small DOM-free contract test, not a substitute for browser/mobile visual QA.
const source=fs.readFileSync(new URL('../js/world-map.js',import.meta.url),'utf8');
const ids=['grassland','volcano','lake','seikai_irie','kaiyu_kaiiki','deep_sea_end','snow_mountain','forest','light_plain','starry_plain','highland_ruins','arena','magic_academy','ruined_village','starsea','water_secret','world_between','kaen_village','golden_land'];
let started=null,prepared=0,registered=null,available=true,eventList=[],party=[{uid:'p'}],discovered=[],saveCount=0,guideOffers=0,tutorialIntercept=false,tutorialDepartures=[],guideAcks=[];
const difficulties={easy:{id:'easy',label:'Easy',rewardText:'.7',danger:'easy'},hard:{id:'hard',label:'Hard',rewardText:'1.8',danger:'hard'}};
const maps=ids.map(id=>({id,name:id,image:'test.webp',desc:'<safe>',region:'r',chapter:'序章',ecosystem:'eco',enemyIds:['m','excluded'],goldenLand:id==='golden_land'}));
const list={classList:{add(){}},innerHTML:'',querySelector(selector){return selector==='[data-tutorial-golden-land]'&&this.innerHTML.includes('data-tutorial-golden-land')?{}:null;},contains(){return true;}};
const context={
  MAPS:maps,HUNT_DIFFICULTIES:difficulties,Math,Map,Object,String,alert(){},setTimeout:fn=>{fn();return 1;},document:{getElementById(){return list;}},
  worldMapActiveEvents:()=>eventList,worldMapEntryAvailable:()=>available,
  worldMapAvailableDifficulties:()=>Object.values(difficulties),worldMapCandidates:()=>[{id:'m',name:'Enemy',rarity:'★'}],
  huntLevelFor:()=>1,goldenLandMapIsReady:()=>true,getPartyInstances:()=>party,
  prepareBattleParty:()=>prepared++,registerMapDex:id=>{if(discovered.includes(id))return false;discovered.push(id);return true;},saveGame:()=>saveCount++,
  createHuntRequest:(map,mon,difficultyId)=>{
    assert.equal(map.enemyIds.join(','),'m','secondary encounters receive filtered pool');
    return {mapId:map.id,enemyId:mon.id,difficultyId,battleMode:'three_way',secondEnemyId:'other',invasionEnemyId:'other'};
  },
  rollHuntConditionIds:()=>[],registerHuntRequest:request=>{request.requestId='r';registered=request;return request;},
  startChosenBattle:(...args)=>{started=args;},offerGoldenLandTutorialGuide:()=>guideOffers++,
  handleTutorialWorldMapDeparture:(...args)=>{tutorialDepartures.push(args);return tutorialIntercept;},
  worldMapAcknowledgeEventGuide:key=>{guideAcks.push(key);return true;}
};
vm.createContext(context);vm.runInContext(source,context);
assert(context.renderWorldMap(list));
for(const id of ids)assert(list.innerHTML.includes(`data-wm-place="${id}"`),id);
assert.ok(list.innerHTML.includes('images/maps/world_map_prologue_v1.webp'),'the illustrated prologue terrain must replace the temporary SVG');
assert.equal(guideOffers,1,'an available Golden Land entry offers its guide after the target is rendered');
assert.equal(discovered.length,0,'overview alone does not discover all maps');
context.showWorldMapLocation('light_plain');
assert(list.innerHTML.includes('&lt;safe&gt;'),'descriptions are escaped');
assert(list.innerHTML.includes('data-wm-difficulty="easy"'));
assert(discovered.includes('light_plain'),'open location detail registers map');
assert.equal(saveCount,1);
assert(context.startWorldMapExploration('light_plain','easy'));
assert.equal(prepared,1);assert.equal(registered.worldMapExploration,true);assert.equal(registered.battleMode,'three_way');
assert.equal(started.join(','),'light_plain,m,easy,r');
assert(!context.startWorldMapExploration('light_plain','easy'),'double departure blocked');
context.renderWorldMap(list);eventList=[{key:'crisis',mapId:'starsea',title:'危機',kind:'crisis',guideUnread:true,guideTitle:'初回危機',guideDescription:'危機の説明'}];
context.showWorldMapLocation('starsea','crisis');assert(list.innerHTML.includes('data-wm-skip'));
assert.ok(list.innerHTML.includes('NEW GUIDE')&&list.innerHTML.includes('危機の説明'));
assert.deepEqual(guideAcks,['crisis'],'opening an event detail acknowledges its first guide without consuming the event');
context.showWorldMapOverview();
assert.ok(list.innerHTML.includes('effect-crisis'),'an active world crisis has a visible terrain effect');
assert(context.startWorldMapExploration('starsea','hard','crisis'));
assert.equal(registered.battleMode,'single');assert.equal(registered.secondEnemyId,null);
assert.equal(registered.invasionEnemyId,null);assert.equal(registered.worldMapEventKey,'crisis');assert.equal(registered.worldMapEventMonsterId,'m');
context.renderWorldMap(list);available=false;
assert(!context.startWorldMapExploration('starsea','hard','crisis'),'stale entry revalidated');
context.showWorldMapLocation('world_between');
assert(list.innerHTML.includes('入口はまだ開いていません'));assert(!list.innerHTML.includes('data-wm-depart'));
assert(!discovered.includes('world_between'),'closed location does not register map');
context.showWorldMapLocation('starsea');
assert(list.innerHTML.includes('開いている入口を選んでください'),'active event stays reachable from closed ordinary entrance');
available=true;context.showWorldMapLocation('golden_land');
assert(context.startWorldMapExploration('golden_land','hard'));assert(registered.goldenLandMapEntry);
context.renderWorldMap(list);assert(context.startWorldMapExploration('golden_land','hard','golden_land'));assert(!registered.goldenLandMapEntry);
context.renderWorldMap(list);party=[];
assert(!context.startWorldMapExploration('grassland','easy'),'empty party rejected');
party=[{uid:'p'}];assert(!context.startWorldMapExploration('grassland','extreme'),'unsupported difficulty rejected');
assert(!context.startWorldMapExploration('missing','easy'),'unknown map rejected');
tutorialIntercept=true;
assert(context.startWorldMapExploration('grassland','easy'),'tutorial departure is consumed before ordinary random exploration');
assert.deepEqual(tutorialDepartures.at(-1),['grassland','easy',null]);
console.log('World map UI contracts passed: 19 locations, navigation, candidates, event/ordinary entry, map discovery, departure guards. Browser/mobile visuals are not covered.');
