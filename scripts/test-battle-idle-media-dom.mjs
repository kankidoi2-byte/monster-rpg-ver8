/* Phase4A lifecycle regression. Media API mocked; not a playback test.
 * npm install --prefix /tmp/phase4a-dom jsdom
 * NODE_PATH=/tmp/phase4a-dom/node_modules node scripts/test-battle-idle-media-dom.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const {JSDOM,VirtualConsole}=createRequire(import.meta.url)('jsdom');
const root=new URL('../',import.meta.url);
const html=fs.readFileSync(new URL('index.html',root),'utf8');
const errors=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'http://phase3a.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document,context=dom.getInternalVMContext();
w.structuredClone=structuredClone;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
const layoutObservers=[];
w.ResizeObserver=class {constructor(callback){this.callback=callback;this.disconnected=false;layoutObservers.push(this);}observe(media){this.media=media;}disconnect(){this.disconnected=true;}};
w.alert=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
const run=code=>vm.runInContext(code,context);
for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g))run(fs.readFileSync(new URL(m[1],root),'utf8'));
const by=id=>d.getElementById(id);
let refuse=false,playCalls=0;
Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get(){return this._paused!==false;}});
w.HTMLMediaElement.prototype.canPlayType=()=> 'probably';
w.HTMLMediaElement.prototype.pause=function(){this._paused=true;};
w.HTMLMediaElement.prototype.load=function(){};
w.HTMLMediaElement.prototype.play=function(){playCalls++;if(refuse)return Promise.reject(new Error('simulated refusal'));this._paused=false;this.dispatchEvent(new w.Event('playing'));return Promise.resolve();};
const fixed=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
function checkIds(){for(const id of fixed)assert.equal(d.querySelectorAll(`[id="${id}"]`).length,1,id);}
function setup(){run(`save=initSave();completeTutorial();currentTutorialState().guides={shopItems:true,kokoroLink:true};save.instances=[];save.party=[];
  for(const id of ['volmoog','aquaron','grassbeat']){const ins=addInstance(id,10);save.party.push(ins.uid);}
  prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');
  activeHuntRequest=createHuntRequest(selectedMap,enemy,'easy',[]);activeHuntRequest.battleMode='single';
  beginChosenBattle('grassland','slime','easy',activeHuntRequest);show('battle');`);}
// Bounds containment is numeric/DOM evidence, not real browser layout or feet.
const layoutCases=run(`Object.entries(BATTLE_IDLE_MEDIA).map(([id,c])=>({id,bounds:c.sourceBounds,layout:c.layout,rarity:by(id).rarity.length}))`);
let layoutChecks=0;
for(const c of layoutCases){
 assert(c.bounds,c.id+' missing measured full-loop bounds');
 assert.equal(c.layout.scale,({freigal:.4,aquaron:.45,grassbeat:.35,rikasheef:.4,volteck:.35,goblin:.4,sylphin:.45,nocle:.45,luxseed:.45})[c.id]??[0,.3,.5,.75,1,1.2][c.rarity],c.id+' rarity size with star1 body correction');
 for(const [width,height] of [[96,96],[160,160],[320,100],[100,320],[320,430],[430,320],[160,215],[215,160]]){
  const fit=run(`battleIdleBoundsFit(${JSON.stringify(c.bounds)},${width},${height},${JSON.stringify(c.layout||{})})`);
  assert(fit,c.id);const b=c.bounds,eps=1e-7;
  assert(fit.left+b.x*fit.scale>=-eps,c.id+' left');
  assert(fit.top+b.y*fit.scale>=-eps,c.id+' top');
  assert(fit.left+b.right*fit.scale<=width+eps,c.id+' right');
  assert(fit.top+b.bottom*fit.scale<=height+eps,c.id+' bottom');
  assert(Math.abs(fit.width/b.width-fit.height/b.height)<eps,c.id+' aspect');
  const full=run(`battleIdleBoundsFit(${JSON.stringify(c.bounds)},${width},${height},{x:0.5,y:1,scale:1})`);
  assert(Math.abs(fit.scale/full.scale-c.layout.scale)<eps,c.id+' linear size ratio');
  assert(Math.abs(fit.top+b.bottom*fit.scale-height)<eps,c.id+' bottom alignment');layoutChecks++;
 }
}
// Same common stage unit for allies, enemies and decoder-free posters.
let sharedCases=0;
const configs=run('Object.values(BATTLE_IDLE_MEDIA)');
for(const stageWidth of [320,430,760])for(const a of configs)for(const b of configs){
 const plan=run(`battleIdleStageSizePlan(${JSON.stringify([a,b])},${stageWidth})`);
 const sum=plan.weights.reduce((x,y)=>x+y,0);
 for(const [index,config] of [a,b].entries()){
  const slot=(stageWidth-64)*plan.weights[index]/sum;
  const enemy=run(`battleIdleBoundsFit(${JSON.stringify(config.sourceBounds)},${slot},${plan.rowHeight},${JSON.stringify(config.layout)},${plan.unit})`);
  const ally=run(`battleIdleBoundsFit(${JSON.stringify(config.sourceBounds)},${stageWidth-32},${plan.rowHeight},${JSON.stringify(config.layout)},${plan.unit})`);
  assert(Math.abs(enemy.scale-ally.scale)<1e-7,'shared ally/enemy scale');
  const bound=config.sourceBounds;
  assert(enemy.left+bound.x*enemy.scale>=-1e-7);
  assert(enemy.left+bound.right*enemy.scale<=slot+1e-7);
 }
 sharedCases++;
}
console.log('PASS shared size policy: '+sharedCases+' species-pair/viewport cases; equal ally/enemy geometry and contained enemy tracks');
assert.equal(layoutCases.length,50);
assert.equal(run('battleIdleBoundsFit(null,100,100)'),null);
assert.equal(run('battleIdleBoundsFit({width:960,height:960,x:0,y:0,right:961,bottom:960},100,100)'),null);
setup();await new Promise(r=>setTimeout(r,0));
assert.equal(run('battleIdleRecords.size'),1);
assert.equal(run('battleIdleSizeDisplays.size'),2);
assert(d.querySelector('#eVis .has-idle-size'));
assert.equal(d.querySelector('#eVis img').getAttribute('src'),run('BATTLE_IDLE_MEDIA.slime.poster'));
assert(!d.querySelector('#eVis video'),'static size must not allocate a decoder');
const fitRecord=run('battleIdleRecord');let mediaWidth=160,mediaHeight=120;
Object.defineProperty(fitRecord.media,'clientWidth',{get:()=>mediaWidth});
Object.defineProperty(fitRecord.media,'clientHeight',{get:()=>mediaHeight});
fitRecord.layoutObserver.callback();assert.equal(fitRecord.media.dataset.idleFit,'bounds');
const beforeWidth=fitRecord.media.style.getPropertyValue('--idle-canvas-width');
mediaWidth=80;mediaHeight=60;fitRecord.layoutObserver.callback();
assert.equal(parseFloat(fitRecord.media.style.getPropertyValue('--idle-canvas-width')),parseFloat(beforeWidth)/2);
mediaWidth=0;fitRecord.layoutObserver.callback();assert(!fitRecord.media.dataset.idleFit);
mediaWidth=160;mediaHeight=120;fitRecord.layoutObserver.callback();

let video=by('pVis').querySelector('video');assert(video&&!video.paused);video.currentTime=3;
run('pHp-=3;update();toggleBattleSkillPanel();battleUiBack()');assert.equal(by('pVis').querySelector('video'),video);assert.equal(video.currentTime,3);
run('openBattleItemSelect()');assert(video.paused);run("show('battle');update()");await new Promise(r=>setTimeout(r,0));assert.equal(by('pVis').querySelector('video'),video);assert(!video.paused);
const retiredLayout=fitRecord.layoutObserver;const oldPlaying=video.onplaying;run('changeActivePartyMember(1)');assert(video.paused&&!video.isConnected);oldPlaying();assert.notEqual(by('pVis').querySelector('video'),video);assert(retiredLayout.disconnected);retiredLayout.callback();assert(!fitRecord.media.dataset.idleFit);
for(let i=0;i<5;i++){setup();run("show('home')");assert.equal(d.querySelectorAll('video').length,0);}
refuse=true;setup();await new Promise(r=>setTimeout(r,0));assert(run('battleIdleRecord.failed'));assert.equal(by('pVis').querySelector('img').style.visibility,'visible');
const calls=playCalls;run('update();update();update()');assert.equal(playCalls,calls);run('toggleBattleSkillPanel()');assert(!by('commands').classList.contains('hidden'));
refuse=false;run('battleIdleRecord.button.click()');await new Promise(r=>setTimeout(r,0));assert(!by('pVis').querySelector('video').paused);
run('eHp=0;win()');assert(!d.querySelector('video'));setup();assert.equal(d.querySelectorAll('video').length,1);
run("show('home')");dom.window.close();assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS Phase4A DOM: node/time retention; temporary pause/resume; switch disposal and stale callback; five exits; simulated rejection/no retry loop/user retry; victory/next. Media API mocked, real decode is browser evidence.');

console.log('PASS Phase D bounds: '+layoutChecks+' numeric containment/aspect cases for 50 species; resize, zero-size fallback, observer disposal/stale callback. No physical foot or real browser/Galaxy layout acceptance.');
