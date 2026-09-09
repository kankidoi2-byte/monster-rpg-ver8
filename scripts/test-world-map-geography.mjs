import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/world-map.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../css/world-map.css',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const context=vm.createContext({Math,Map,Object,String});
vm.runInContext(source,context);
const run=code=>vm.runInContext(code,context);
const places=run('WORLD_MAP_PLACES.map(({id,x,y,route})=>({id,x,y,route}))');
const byId=Object.fromEntries(places.map(place=>[place.id,place]));

assert.equal(places.length,14,'the overview keeps its 14 geographic locations');
assert.equal(new Set(places.map(place=>place.id)).size,14,'geographic IDs remain unique');
for(const place of places){
  assert.ok(Number.isFinite(place.x)&&place.x>=0&&place.x<=100,`${place.id} x coordinate`);
  assert.ok(Number.isFinite(place.y)&&place.y>=0&&place.y<=100,`${place.id} y coordinate`);
}

assert.ok(byId.kaen_village.y>byId.volcano.y,'Kaen Village stays south of the volcano');
assert.match(byId.kaen_village.route,/火山の南側/);
assert.doesNotMatch(byId.kaen_village.route,/火山の北側/);
assert.ok(byId.seikai_irie.y>byId.lake.y,'the cove stays downstream of the lake');
assert.ok(byId.water_secret.y>byId.lake.y&&byId.water_secret.y<byId.seikai_irie.y,'the water secret stays between the lake and river mouth');
assert.match(byId.seikai_irie.route,/河口/);
assert.match(byId.water_secret.route,/上流支谷/);
assert.ok(byId.deep_sea_end.y>byId.kaiyu_kaiiki.y,'the deep-sea trench stays southeast of the migratory sea');
assert.match(byId.deep_sea_end.route,/水に満ちた海溝/);
for(const specialId of ['starsea','world_between','golden_land'])
  assert.ok(!byId[specialId],`${specialId} must not become fixed terrain`);

const terrain=run('worldMapTerrainHTML()');
assert.match(terrain,/images\/maps\/world_map_prologue_v2\.webp/);
const asset=new URL('../images/maps/world_map_prologue_v2.webp',import.meta.url);
assert.ok(fs.existsSync(asset),'the aligned terrain asset exists');
assert.ok(fs.statSync(asset).size<=700*1024,'the aligned terrain stays within the 700 KiB map budget');

const effects=run("worldMapTerrainEffectsHTML([{key:'elysia'},{key:'crisis'},{key:'rift'},{key:'water_secret'},{key:'starsea'},{key:'golden_land'}])");
for(const expected of [
  'effect-elysia\" style=\"--wm-x:31.5%;--wm-y:48%',
  'effect-crisis\" style=\"--wm-x:72%;--wm-y:13%',
  'effect-rift\" style=\"--wm-x:21%;--wm-y:15%',
  'effect-water_secret\" style=\"--wm-x:70%;--wm-y:42%',
  'effect-starsea\" style=\"--wm-x:72%;--wm-y:13%',
  'effect-golden_land\" style=\"--wm-x:57%;--wm-y:79%'
]) assert.ok(effects.includes(expected),`missing aligned effect anchor: ${expected}`);

assert.match(css,/\.wm-map-scroll\{[^}]*overflow:auto/,'the map remains horizontally scrollable');
assert.match(css,/\.wm-map\{[^}]*min-width:640px/,'mobile view keeps a legible fixed map canvas');
assert.match(css,/\.wm-pin\{[^}]*width:96px/,'mobile labels use the reduced collision width');
assert.match(css,/@media\(max-width:600px\)\{\.wm-place-grid\{grid-template-columns:repeat\(2/);
assert.match(css,/@media\(max-width:360px\)\{\.wm-place-grid\{grid-template-columns:1fr/);
assert.match(css,/\.wm-city-pin\{[^}]*left:49%;top:38%/,'Royal Capital label remains centered on the city artwork');
assert.ok(html.includes('css/world-map.css?v=world-map-3-consistency'));
assert.ok(html.includes('js/world-map.js?v=world-map-3-consistency'));

const mapWidth=640;
const boxes=[
  ...places.map(place=>({id:place.id,x:place.x*mapWidth/100,y:place.y*mapWidth/100,w:96,h:74})),
  {id:'royal_capital',x:49*mapWidth/100,y:38*mapWidth/100,w:126,h:68}
];
for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];
  const overlaps=Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2;
  assert.equal(overlaps,false,`640px map labels overlap: ${a.id} / ${b.id}`);
}
for(const viewportWidth of [320,360,390,430]){
  assert.ok(mapWidth>viewportWidth,`${viewportWidth}px uses the horizontal map scroller`);
  assert.equal(mapWidth-viewportWidth,[320,280,250,210][[320,360,390,430].indexOf(viewportWidth)]);
  for(const box of boxes)
    assert.ok(box.x-box.w/2>=0&&box.x+box.w/2<=mapWidth,`${box.id} remains inside the map at ${viewportWidth}px`);
}

console.log('World map geography passed: aligned terrain, 14 non-overlapping mobile pins, south-side Kaen Village, lake-to-mouth waterway, submerged trench and six event anchors.');
