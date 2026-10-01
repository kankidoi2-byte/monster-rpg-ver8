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
w.alert=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
const run=code=>vm.runInContext(code,context);
for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g))run(fs.readFileSync(new URL(m[1],root),'utf8'));
const by=id=>d.getElementById(id);
let refuse=false,playCalls=0,defer=false,deferred=[];
Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get(){return this._paused!==false;}});
w.HTMLMediaElement.prototype.canPlayType=()=> 'probably';
w.HTMLMediaElement.prototype.pause=function(){this._paused=true;};
w.HTMLMediaElement.prototype.load=function(){};
w.HTMLMediaElement.prototype.play=function(){playCalls++;if(defer)return new Promise((resolve,reject)=>deferred.push({resolve,reject,video:this}));if(refuse)return Promise.reject(new Error('simulated refusal'));this._paused=false;this.dispatchEvent(new w.Event('playing'));return Promise.resolve();};
const fixed=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
function checkIds(){for(const id of fixed)assert.equal(d.querySelectorAll(`[id="${id}"]`).length,1,id);}
function setup(){run(`save=initSave();completeTutorial();currentTutorialState().guides={shopItems:true,kokoroLink:true};save.instances=[];save.party=[];
  for(const id of ['volmoog','aquaron','grassbeat']){const ins=addInstance(id,10);save.party.push(ins.uid);}
  prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');
  activeHuntRequest=createHuntRequest(selectedMap,enemy,'easy',[]);activeHuntRequest.battleMode='single';
  beginChosenBattle('grassland','slime','easy',activeHuntRequest);show('battle');`);}

const flush=()=>new Promise(r=>setTimeout(r,0));
let clock=0,nextTimer=0;const timers=new Map();
w.performance.now=()=>clock;
w.setTimeout=(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;};
w.clearTimeout=id=>timers.delete(id);
const rec=()=>run('battleIdleRecord');
const hidden=value=>{Object.defineProperty(d,'hidden',{configurable:true,value});d.dispatchEvent(new w.Event('visibilitychange'));};
const reduced=value=>{run(`battleIdleReduced.matches=${value};syncBattleIdleMedia()`);};
const checks=[];const pass=name=>checks.push(name);
const records=()=>Array.from(run('[...battleIdleRecords.values()]'));
function multi(){setup();run("ensureMultiBattleDom();multiBattle={active:true,enemies:[createMultiEnemy(by('volmoog'),'enemy_a'),createMultiEnemy(by('volmoog'),'enemy_b')],pendingMoveIndex:null};setMultiBattleLayout(true);setupMultiBattle();setBattleIdleLimit(3);");}

const observers=[];
w.IntersectionObserver=class {
 constructor(callback,options){this.callback=callback;this.options=options;this.targets=[];observers.push(this);}
 observe(target){this.targets.push(target);}
 disconnect(){this.disconnected=true;this.targets=[];}
 emit(target,ratio){this.callback([{target,isIntersecting:ratio>0,intersectionRatio:ratio}]);}
};
const emit=(r,ratio)=>r.viewportObserver.emit(r.media,ratio);
const fire=(r)=>{const id=r.viewportTimer;const item=timers.get(id);assert(item);timers.delete(id);item.fn();};
setup();let r=rec();assert(r.offscreen);assert(!r.video.hasAttribute('src'));
emit(r,0.2);await flush();assert.equal(r.state,'playing');const video=r.video;video.currentTime=2;
emit(r,0);const cancelled=timers.get(r.viewportTimer).fn;assert(!r.video.paused);
emit(r,0.2);cancelled();assert(!r.offscreen);assert(!r.video.paused);
emit(r,0);fire(r);assert(r.video.paused);assert(r.offscreen);assert.equal(r.img.style.visibility,'visible');
emit(r,0.08);assert(r.offscreen);assert(r.video.paused);
emit(r,0.2);await flush();assert(!r.video.paused);assert.equal(r.video,video);assert.equal(video.currentTime,2);
pass('initial offscreen avoids source; hysteresis cancels stale timeout; same video resumes');
hidden(true);emit(r,0.3);assert(r.video.paused);hidden(false);await flush();assert(!r.video.paused);
reduced(true);emit(r,0.3);assert(r.video.paused);reduced(false);await flush();assert(!r.video.paused);
pass('intersection cannot override hidden or reduced-motion reasons');
emit(r,0);const stale=timers.get(r.viewportTimer).fn,observer=r.viewportObserver;
run("show('home')");assert(observer.disconnected);stale();observer.emit(r.media,1);assert(r.disposed);assert.equal(records().length,0);
pass('exit disconnects observer and rejects queued timer/observer callbacks');
// Normal game path, no review registry injection.
run("save=initSave();completeTutorial();save.instances=[];save.party=[];for(const id of ['gran_volmoog','aquaron','grassbeat']){const ins=addInstance(id,10);save.party.push(ins.uid);}prepareBattleParty();selectedMap=MAPS[0];enemy=by('volmoog');activeHuntRequest=createHuntRequest(selectedMap,enemy,'easy',[]);activeHuntRequest.battleMode='single';beginChosenBattle('grassland','volmoog','easy',activeHuntRequest);show('battle');");
r=rec();assert.equal(run('battleIdleLimit'),1);assert(r.config.src.endsWith('/gran_volmoog_v18_alpha.webm'));
assert.equal(r.media.style.getPropertyValue('--idle-position'),'50% 100%');assert.equal(r.media.style.getPropertyValue('--idle-scale'),'0.75');
assert.equal(r.facing.style.transform,'scaleX(-1)');emit(r,1);await flush();assert(!r.video.paused);
run('setBattleIdleLimit(3)');let rs=records();assert.equal(rs.length,2);
rs.forEach(q=>emit(q,1));await flush();const enemy=rs.find(q=>q!==r);emit(r,0);fire(r);assert(r.video.paused&&!enemy.video.paused);
run('pHp--;eHp--;update()');assert.equal(rec(),r);assert.equal(records().length,2);
pass('ordinary gran registration, shared layout, mixed species independently stop and retain HP nodes');
run("show('home')");assert.equal(r.media.style.getPropertyValue('--idle-position'),'');
for(let i=0;i<50;i++){setup();emit(rec(),1);run("show('home')");}
assert(observers.every(o=>o.disconnected));assert.equal(records().length,0);
checkIds();dom.window.close();assert.equal(errors.length,0,errors.join('\n'));
console.log(JSON.stringify({kind:'DOM + mocked media/IntersectionObserver; not real viewport or decoder',checks,pass:checks.length,normalRegistered:run("Object.keys(BATTLE_IDLE_MEDIA).length"),defaultLimit:1},null,2));
