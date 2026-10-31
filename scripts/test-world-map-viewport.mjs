import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let clock=1000,observed=null,disconnected=0,removed=0;
const timers=new Set();
const style=()=>({setProperty(name,value){this[name]=value;}});
const viewport={
 style:style(),getBoundingClientRect:()=>({left:0,top:0,width:412,height:572}),
 addEventListener(name,fn){this[name]=fn;},removeEventListener(){removed++;},setPointerCapture(){}
};
const terrain={style:style()};
const pin={dataset:{wmPoint:'grassland'},style:style(),classList:{add(){},remove(){}}};
let sheet=null;
const list={classList:{add(){},remove(){}},querySelector:selector=>({'.wm-viewport':viewport,'.wm-map':terrain,'.wm-sheet':sheet}[selector]||null),querySelectorAll:()=>[pin]};
const c=vm.createContext({
 Date:class extends Date{static now(){return clock;}},
 setTimeout:fn=>{timers.add(fn);return fn;},clearTimeout:fn=>timers.delete(fn),
 ResizeObserver:class{constructor(fn){observed=fn;}observe(){}disconnect(){disconnected++;}},
 worldMapSelectedId:null,worldMapCityOpen:false,
 worldMapPoint:id=>id==='grassland'?{x:44,y:26}:id==='deep_sea_end'?{x:88,y:83}:null
});
vm.runInContext(fs.readFileSync(new URL('../js/world-map-viewport.js',import.meta.url),'utf8'),c);
const run=code=>vm.runInContext(code,c),camera=()=>JSON.parse(run('JSON.stringify(worldMapCamera)'));
const event=(id,x,y)=>({pointerId:id,clientX:x,clientY:y,pointerType:'touch',button:0,preventDefault(){this.prevented=true;}});
c.setupWorldMapViewport(list);
const initial=camera();assert.equal(initial.scale,1);assert.equal(initial.size,572);
viewport.onpointerdown(event(1,200,200));viewport.onpointermove(event(1,203,203));
assert.equal(c.worldMapIgnoreClick(),false,'small hand tremor still permits a tap');
viewport.onpointermove(event(1,100,200));assert(c.worldMapIgnoreClick(),'a drag suppresses the eventual synthetic click');
assert(camera().x<initial.x);assert.equal(camera().y,0,'cannot drag beyond a vertical edge at zoom 1');
viewport.onpointerup(event(1,100,200));clock+=400;assert.equal(c.worldMapIgnoreClick(),false);
viewport.onpointerdown(event(1,100,200));viewport.onpointerdown(event(2,200,200));
viewport.onpointermove(event(2,340,200));assert.equal(camera().scale,2.4,'pinch clamps at maximum zoom');
assert(c.worldMapIgnoreClick());
viewport.onpointercancel(event(2,340,200));viewport.onpointermove(event(1,120,220));
assert.equal(camera().scale,2.4,'remaining finger pans at the current zoom');viewport.onpointerup(event(1,120,220));
viewport.wheel({...event(1,206,286),deltaY:10000});assert.equal(camera().scale,1,'wheel clamps at minimum');
assert.equal(pin.style.width,undefined,'pins receive positions, not camera scale or dimensions');
assert.equal(pin.style.transform,undefined);
viewport.getBoundingClientRect=()=>({left:0,top:0,width:360,height:522});observed();
assert.equal(camera().size,522);assert(camera().x<=0&&camera().x+camera().size>=360);
c.cleanupWorldMapViewport({reset:true});assert.equal(run('worldMapCamera'),null);assert.equal(timers.size,0);assert.equal(disconnected,1);assert.equal(removed,1);
assert.equal(viewport.onpointermove,null,'detached maps retain no pointer listeners');
// A far-south pin must remain above the sheet, within the maximum zoom limit.
sheet={style:style(),getBoundingClientRect(){return {height:Math.min(350,Number.parseFloat(this.style.maxHeight)||350)};}};
c.worldMapSelectedId='deep_sea_end';c.setupWorldMapViewport(list);
const south=camera(),pinY=south.y+south.size*.83;
assert(south.scale<=2.4&&south.scale>=1);
assert(pinY<522-sheet.getBoundingClientRect().height,'southern pin is not hidden behind its panel');
assert(south.x<=0&&south.y<=0&&south.x+south.size>=360&&south.y+south.size>=522);
c.cleanupWorldMapViewport({reset:true});
console.log('World map viewport: actual drag/pinch/wheel handlers, movement guards, constant pins, resize, southern pin visibility and listener/timer cleanup passed.');
