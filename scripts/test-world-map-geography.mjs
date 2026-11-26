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


const cameraContext=vm.createContext({Math,Number,Date});
vm.runInContext(fs.readFileSync(new URL('../js/world-map-viewport.js',import.meta.url),'utf8'),cameraContext);
const cameraRun=code=>vm.runInContext(code,cameraContext);
assert.match(css,/\.wm-viewport\{[^}]*overflow:hidden;touch-action:none/,'one pointer viewport replaces double scrolling');
assert.match(css,/width:30px;height:30px/,'pin disks retain a constant 30px diameter');
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,'place list keeps two columns, including small phones');
assert.ok(source.includes('x:49,y:38'),'capital retains its geographic anchor');
assert.ok(html.includes('css/world-map.css?v=world-map-4-adopted'));
assert.ok(html.includes('js/world-map-viewport.js?v=world-map-4-adopted'));
assert.ok(html.includes('js/world-map.js?v=world-map-4-adopted'));
for(const [width,height] of [[320,562],[360,522],[412,572],[390,766],[844,312]]){
  for(const scale of [1,1.5,2.4,9,-1]){
    const c=cameraRun(`worldMapClampCamera({scale:${scale},x:9999,y:-9999},${width},${height})`);
    assert(c.scale>=1&&c.scale<=2.4);
    assert.equal(c.size,Math.max(width,height)*c.scale);
    assert(c.x<=0&&c.y<=0&&c.x+c.size>=width&&c.y+c.size>=height,'drag limits cover every edge');
    for(const place of [...places,{id:'royal_capital',x:49,y:38}]){
      const centered=cameraContext.worldMapCameraForPoint(c,place,width,height,Math.min(height*.6,350));
      assert(centered.x<=0&&centered.y<=0&&centered.x+centered.size>=width&&centered.y+centered.size>=height);
      const px=centered.x+centered.size*place.x/100,py=centered.y+centered.size*place.y/100;
      assert(px>=0&&px<=width,`${place.id} remains horizontally reachable`);
      assert(py>=0&&py<height,`${place.id} remains vertically reachable`);
    }
  }
}
const before={scale:1.5,x:-200,y:-200};
const after=cameraContext.worldMapZoomAt(before,2,{x:180,y:250},412,572);
assert(Math.abs((180-before.x)/(572*1.5)-(180-after.x)/after.size)<1e-9,'pinch/wheel anchors the point under the pointer');
console.log('World map geography passed: canonical positions and event anchors, constant-size pins, bounds and reachable locations across five viewport sizes.');
// Replace the old 640px-card collision check with actual disk/name geometry.
// Invisible offscreen pins are reached by dragging or the two-column list.
for(const size of [480,522,572,766,1152]){
 const labels=[...places,{id:'royal_capital',x:49,y:38}].flatMap(p=>{
  const x=p.x*size/100,y=p.y*size/100,city=p.id==='royal_capital';
  return [{id:p.id,part:'disk',x,y,w:city?40:30,h:city?40:30},
   {id:p.id,part:'name',x,y:y+(city?30:26),w:108,h:16}];
 });
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
  const a=labels[i],b=labels[j];if(a.id===b.id)continue;
  assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2),`${size}px visual collision: ${a.id}/${a.part} and ${b.id}/${b.part}`);
 }
}
