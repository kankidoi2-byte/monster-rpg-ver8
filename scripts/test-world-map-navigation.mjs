import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ids=['grassland','volcano','lake','seikai_irie','kaiyu_kaiiki','deep_sea_end','snow_mountain','forest','light_plain','starry_plain','highland_ruins','arena','magic_academy','ruined_village','starsea','water_secret','world_between','kaen_village','golden_land'];
const maps=ids.map(id=>({id,name:id,image:'test.webp',desc:'desc',region:'region',chapter:'序章',ecosystem:'eco',enemyIds:['m'],goldenLand:id==='golden_land'}));
const storage=new Map();
const difficulties={easy:{id:'easy',label:'Easy',rewardText:'.7',danger:'easy'},hard:{id:'hard',label:'Hard',rewardText:'1.8',danger:'hard'}};
const scroller={scrollLeft:0,onscroll:null};
const focusTarget={focus(){}};
let hasOverview=false;
const list={
  classList:{add(){}},onclick:null,
  _html:'',
  set innerHTML(value){this._html=value;hasOverview=value.includes('wm-map-scroll');},
  get innerHTML(){return this._html;},
  querySelector(selector){return selector==='.wm-map-scroll'&&hasOverview?scroller:focusTarget;},
  contains(){return true;}
};
const context=vm.createContext({
  console,Date,JSON,Math,Map,Object,String,Number,Array,Set,
  MAX_LEVEL:100,clampLevel:value=>Math.min(100,Math.max(1,Math.floor(Number(value)||1))),isMaxLevel:value=>Number(value)>=100,
  M:[],MAPS:maps,HUNT_DIFFICULTIES:difficulties,
  localStorage:{getItem:key=>storage.has(key)?storage.get(key):null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)},
  confirm:()=>true,alert(){},setTimeout:fn=>{fn();return 1;},clearTimeout(){},
  document:{getElementById:()=>list},saveCalls:0,
  worldMapActiveEvents:()=>[],worldMapEntryAvailable:()=>true,
  worldMapAvailableDifficulties:()=>Object.values(difficulties),
  worldMapCandidates:()=>[{id:'m',name:'Enemy',rarity:'★'}],huntLevelFor:()=>1,goldenLandMapIsReady:()=>false,
  registerMapDex:()=>true,getPartyInstances:()=>[{uid:'party'}],prepareBattleParty(){},
  createHuntRequest:()=>({}),rollHuntConditionIds:()=>[],registerHuntRequest:request=>({...request,requestId:'request'}),startChosenBattle(){}
});
const run=code=>vm.runInContext(code,context);
vm.runInContext(fs.readFileSync(new URL('../js/world-events.js',import.meta.url),'utf8'),context);
const saveSource=fs.readFileSync(new URL('../js/save.js',import.meta.url),'utf8');
vm.runInContext(saveSource.slice(0,saveSource.indexOf('/* Ver7.8:')),context);
run('saveGame=()=>{saveCalls++;return true}');
vm.runInContext(fs.readFileSync(new URL('../js/world-map.js',import.meta.url),'utf8'),context);

const legacy=run("parseAndPrepareSave(JSON.stringify({schemaVersion:4,worldMap:{futureField:{kept:true}}}),[])");
assert.equal(legacy.worldMap.navigation.mapId,null,'old saves receive a closed overview by default');
assert.equal(legacy.worldMap.navigation.difficultyId,null);
assert.equal(legacy.worldMap.navigation.overviewScrollLeft,0);
assert.equal(legacy.worldMap.futureField.kept,true,'unrelated future fields remain additive');
const damaged=run("normalizeWorldMapNavigationState({mapId:'missing',eventKey:'<bad>',difficultyId:'nightmare',overviewScrollLeft:-9,futureFlag:2})");
assert.equal(damaged.mapId,null);assert.equal(damaged.eventKey,null);assert.equal(damaged.difficultyId,null);
assert.equal(damaged.overviewScrollLeft,0);assert.equal(damaged.futureFlag,2);

run("save.worldMap.navigation={mapId:null,eventKey:null,difficultyId:null,overviewScrollLeft:245};worldMapNavigationHydrated=false");
assert(run('renderWorldMap(document.getElementById("battleChoiceList"))'));
assert.equal(scroller.scrollLeft,245,'overview horizontal position is restored');
scroller.scrollLeft=511;scroller.onscroll();
assert.equal(run('save.worldMap.navigation.overviewScrollLeft'),511,'settled scrolling is saved');

assert(run("showWorldMapLocation('grassland')"));
assert.equal(run('save.worldMap.navigation.mapId'),'grassland');
assert.equal(run('save.worldMap.navigation.difficultyId'),'easy','first available difficulty becomes the safe default');
const difficultyButton={dataset:{wmDifficulty:'hard'},hasAttribute:name=>name==='data-wm-difficulty'};
list.onclick({target:{closest:()=>difficultyButton}});
assert.equal(run('save.worldMap.navigation.difficultyId'),'hard','difficulty changes are saved');
assert.ok(list.innerHTML.includes('data-wm-difficulty="hard" aria-pressed="true"'));

run('worldMapSelectedId=null;worldMapSelectedEvent=null;worldMapSelectedDifficulty=null;worldMapNavigationHydrated=false');
assert(run('renderWorldMap(document.getElementById("battleChoiceList"))'));
assert.ok(list.innerHTML.includes('<h2>grassland</h2>'),'reload returns to the selected location detail');
assert.ok(list.innerHTML.includes('data-wm-difficulty="hard" aria-pressed="true"'),'reload restores the selected difficulty');

run("save.worldMap.active.crisis={mapId:'starsea',monsterId:'doom_nemesion'}");
vm.runInContext(fs.readFileSync(new URL('../js/world-map-flow.js',import.meta.url),'utf8'),context);
run("save.worldMap.navigation={...save.worldMap.navigation,mapId:'starsea',eventKey:'crisis',difficultyId:'hard'};worldMapSelectedEvent='crisis';saveGame=()=>false");
assert.equal(run('worldMapSkipCrisis()'),false,'failed persistence aborts crisis skip');
assert.equal(run('save.worldMap.navigation.eventKey'),'crisis');
assert.equal(run('worldMapSelectedEvent'),'crisis','failed persistence keeps the visible event route');
run('saveGame=()=>{saveCalls++;return true}');
run("save.worldMap.navigation={...save.worldMap.navigation,mapId:'starsea',eventKey:'crisis',difficultyId:'hard'};worldMapSelectedEvent='crisis';save.worldMap=clearResolvedWorldMapNavigation(save.worldMap,'crisis');clearWorldMapRuntimeEventSelection('crisis')");
assert.equal(run('save.worldMap.navigation.mapId'),'starsea','resolved events keep the useful location context');
assert.equal(run('save.worldMap.navigation.difficultyId'),'hard');
assert.equal(run('save.worldMap.navigation.eventKey'),null,'resolved event routes cannot resume as stale entrances');
assert.equal(run('worldMapSelectedEvent'),null);

assert.ok(run('saveCalls')>=3,'location, difficulty and scroll preferences are persisted');
const reloadStorage=new Map();
function bootSaveContext(){
  const c=vm.createContext({
    console,Date,JSON,Math,setTimeout,
    MAX_LEVEL:100,clampLevel:value=>Math.min(100,Math.max(1,Math.floor(Number(value)||1))),isMaxLevel:value=>Number(value)>=100,
    M:[],MAPS:maps,ALCHEMY_MONSTER_CONFIGS:{},ITEM_DEX_BY_ID:{},ITEM_DEX_ITEMS:[],SHOP_ITEMS:[],
    localStorage:{getItem:key=>reloadStorage.has(key)?reloadStorage.get(key):null,setItem:(key,value)=>reloadStorage.set(key,String(value)),removeItem:key=>reloadStorage.delete(key)},
    alert(){},confirm:()=>false,showUiNotice(){},document:{},location:{reload(){}},navigator:{clipboard:{writeText:async()=>{}}},
    Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
  });
  vm.runInContext(fs.readFileSync(new URL('../js/world-events.js',import.meta.url),'utf8'),c);
  vm.runInContext(saveSource,c);
  return c;
}
const firstBoot=bootSaveContext();
vm.runInContext("save.worldMap.navigation={mapId:'grassland',eventKey:null,difficultyId:'hard',overviewScrollLeft:733};saveGame()",firstBoot);
const stored=JSON.parse(reloadStorage.get('mb_v95c'));
assert.equal(stored.worldMap.navigation.overviewScrollLeft,733,'the primary save contains navigation preferences');
const reloaded=bootSaveContext();
assert.equal(vm.runInContext('save.worldMap.navigation.mapId',reloaded),'grassland');
assert.equal(vm.runInContext('save.worldMap.navigation.difficultyId',reloaded),'hard');
assert.equal(vm.runInContext('save.worldMap.navigation.overviewScrollLeft',reloaded),733,'a fresh boot restores persisted navigation');
console.log('World map navigation persistence passed: legacy defaults, repair, location/difficulty reload, horizontal scroll and stale-event cleanup.');
