import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const maps=[
 {id:'grassland',name:'草原',desc:'説明',ecosystem:'環境'},
 {id:'arena',name:'闘技場'},{id:'magic_academy',name:'魔導学園'},
 {id:'water_secret',name:'秘境',rareOnly:true},
 {id:'starsea',name:'星海',bossOnly:true},
 {id:'golden_land',name:'黄金郷',goldenLand:true}
];
let events=[],ready=false,fail=false,step='';
const root={innerHTML:'',classList:{add(){}},querySelector:()=>null,contains:()=>true};
const context=vm.createContext({
 MAPS:maps,HUNT_DIFFICULTIES:{},document:{getElementById:()=>root},
 save:{worldMap:{navigation:{overviewScrollLeft:321},active:{},guides:{map_intro:false}},items:{golden_land_map:2}},
 worldMapActiveEvents:()=>events,
 worldMapEntryAvailable:(map,key)=>key?events.some(e=>e.key===key&&e.mapId===map.id):map.goldenLand?ready:!map.bossOnly&&!map.rareOnly,
 worldMapAvailableDifficulties:()=>['easy','normal','hard'].map(id=>({id,label:id,rewardText:id,danger:id+'-danger'})),
 worldMapCandidates:()=>[{id:'secret-id',name:'SECRET ENEMY',level:99}],
 mapPortraitImage:()=> 'portrait.webp',tutorialCurrentStepId:()=>step,
 goldenLandMapIsReady:()=>ready,saveGame:()=>!fail
});
const run=code=>vm.runInContext(code,context);
vm.runInContext(read('js/world-map.js'),context);
assert(context.renderWorldMap(root));
assert(!root.innerHTML.includes('data-wm-place="water_secret"'));
assert(!root.innerHTML.includes('data-wm-beyond'));
assert.deepEqual(Array.from(run('save.worldMap.discovery.pending')),[],'old unlocked locations are baselined silently');
events=[{key:'water_secret',mapId:'water_secret',title:'秘境の入口',remainingBattles:2}];
assert(context.renderWorldMap(root));
assert(root.innerHTML.includes('data-wm-place="water_secret"'));
assert(root.innerHTML.includes('data-wm-event="water_secret"'));
assert.deepEqual(Array.from(run('save.worldMap.discovery.pending')),['water_secret']);
fail=true;assert.equal(context.worldMapUpdateDiscovery('water_secret'),false);
assert.deepEqual(Array.from(run('save.worldMap.discovery.pending')),['water_secret'],'failed discovery save rolls back');
fail=false;assert(context.worldMapUpdateDiscovery('water_secret'));
assert.equal(run('save.worldMap.discovery.pending.length'),0);
context.renderWorldMap(root);assert.equal(run('save.worldMap.discovery.pending.length'),0,'completed glow does not repeat');
assert.equal(run('save.worldMap.navigation.overviewScrollLeft'),321,'the old navigation field is never repurposed');
context.showWorldMapLocation('grassland');
assert.equal(run('worldMapSelectedDifficulty'),'normal');
assert(!root.innerHTML.includes('SECRET ENEMY')&&!root.innerHTML.includes('secret-id')&&!root.innerHTML.includes('Lv.'));
step='rescue_world_map_depart';context.showWorldMapLocation('grassland');
assert.equal(run('worldMapSelectedDifficulty'),'easy','the deterministic rescue overrides Normal');step='';
events=[{key:'golden_land',mapId:'golden_land',title:'黄金郷の道'}];ready=true;
context.showWorldMapLocation('golden_land');
assert(root.innerHTML.includes('地図で入る')&&root.innerHTML.includes('data-wm-event="golden_land"'));
assert(root.innerHTML.includes('1枚消費'));assert.equal(run('save.items.golden_land_map'),2,'viewing a panel does not consume a map');
context.showWorldMapLocation('golden_land','golden_land');assert(!context.worldMapDetailHTML(maps.at(-1),'golden_land').includes('1枚消費'));
events=[];ready=false;context.renderWorldMap(root);
assert.equal(run('worldMapSelectedId'),null,'expired selected entrance closes its panel');
assert(!root.innerHTML.includes('data-wm-beyond'));
context.showWorldMapCity();assert(root.innerHTML.includes('data-wm-place="magic_academy"'));
console.log('Adopted world map: hidden entrances, events, Normal/rescue Easy, additive discovery/save rollback, no encounter spoilers, two Golden Land routes and expiration passed.');

// A synthetic click from the drag stays suppressed inside the map. A deliberate
// tap on the overlaid list is a different control and must still work immediately.
context.worldMapIgnoreClick=()=>true;
const listButton={hasAttribute:name=>name==='data-wm-list'};
root.onclick({target:{closest:selector=>selector==='button'?listButton:null}});
assert.equal(run('worldMapPanelMode'),'list','drag suppression never blocks the overlaid list');
