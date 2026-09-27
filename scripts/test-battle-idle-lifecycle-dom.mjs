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
defer=true;setup();let r=rec(),v=r.video,oldTimer=timers.get(r.timer).fn;
clock=1200;run('openBattleItemSelect()');assert.equal(r.state,'paused');assert.equal(r.remaining,3800);assert.equal(r.timer,null);
hidden(true);reduced(true);clock+=60000;run("show('battle');update()");hidden(false);assert(v.paused&&r.state==='paused');assert.equal(r.timer,null);assert(!r.failed);
reduced(false);assert.equal(r.state,'loading');assert.equal(timers.get(r.timer).ms,3800);oldTimer();assert(!r.failed);
pass('foreground budget excludes 60 seconds offscreen; overlapping reasons; obsolete timer ignored');
const stale=deferred[0];stale.reject(Error('old interrupted play'));await flush();assert(!r.failed&&r.pending);
const stalePlaying=v.onplaying,staleError=v.onerror;
timers.get(r.timer).fn();assert(r.failed&&r.state==='static');assert.equal(r.img.style.visibility,'visible');
run('toggleBattleSkillPanel();battleUiBack()');assert(!run('busy'));
const before=playCalls;for(let i=0;i<20;i++)r.button.click();assert.equal(playCalls,before+1);assert.equal(d.querySelectorAll('video').length,1);assert(!v.isConnected&&v.paused&&!v.hasAttribute('src'));assert.equal(v.onplaying,null);assert.equal(v.onerror,null);
stalePlaying();staleError();assert(!r.failed);assert.notEqual(r.video,v);assert(r.retried);
pass('timeout keeps commands usable; 20 retry clicks create one attempt; stale media events ignored');
const retryVideo=r.video,retryError=retryVideo.onerror;run('changeActivePartyMember(1)');assert.equal(rec(),null);retryError();deferred.at(-1).resolve();await flush();assert(!d.querySelector('video'));assert.equal(r.state,'disposed');assert.equal(r.timer,null);assert.equal(r.button.onclick,null);
pass('switch during retry disposes source, handlers, timer and ignores delayed Promise');
defer=false;setup();await flush();r=rec();v=r.video;v.currentTime=3.2;
run('pHp-=3;pPoisonTurns=2;update();toggleBattleSkillPanel();battleUiBack()');assert.equal(rec().video,v);assert.equal(v.currentTime,3.2);
run('openBattleItemSelect()');hidden(true);run("show('battle')");assert(v.paused);hidden(false);await flush();assert(!v.paused);assert.equal(v.currentTime,3.2);assert.equal(rec().video,v);
pass('HP/status/panel and temporary screen keep video and position');
w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:true}));assert.equal(rec(),null);assert(!v.isConnected);run('update()');assert(!d.querySelector('video'));
w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));await flush();assert(rec()&&rec().video!==v);assert.equal(d.querySelectorAll('video').length,1);
pass('simulated persisted pagehide disposes; pageshow reconciles current state once (not real BFCache)');
run('eHp=0;win()');w.dispatchEvent(new w.PageTransitionEvent('pageshow'));assert(!d.querySelector('video'));
for(let i=0;i<5;i++){setup();await flush();const q=rec(),el=q.video;run('toggleBattleSkillPanel();battleUiBack();openBattleItemSelect()');run("show('battle');show('home')");assert(!d.querySelector('video'));assert(q.disposed&&q.timer===null&&q.button.onclick===null);assert(el.paused&&!el.hasAttribute('src')&&el.onplaying===null&&el.onerror===null);}
pass('five battle-operation-exit-next cycles release owned resources');
refuse=true;setup();await flush();assert(rec().failed);const n=playCalls;run('update();update()');assert.equal(playCalls,n);refuse=false;rec().button.click();await flush();assert.equal(rec().state,'playing');
pass('play refusal static fallback, no auto retry, one successful manual retry');
setup();await flush();r=rec();r.video.onerror();assert(r.failed);run('toggleBattleSkillPanel();battleUiBack()');assert(!run('busy'));
pass('simulated media error keeps battle commands usable');
run("show('home')");reduced(true);setup();assert(!rec().video.hasAttribute('src'));reduced(false);await flush();assert.equal(rec().state,'playing');
pass('initial reduced setting avoids fetching; change restores playback');

setup();await flush();run("ensureMultiBattleDom();multiBattle={active:true,enemies:[createMultiEnemy(by('volmoog'),'enemy_a'),createMultiEnemy(by('volmoog'),'enemy_b')],pendingMoveIndex:null};setMultiBattleLayout(true);setupMultiBattle();");
r=rec();v=r.video;for(let i=0;i<8;i++)run('updateMultiBattleView();renderBattleInputState()');assert.equal(rec(),r);assert.equal(rec().video,v);assert.equal(d.querySelectorAll('video').length,1);
run('changeActivePartyMember(1)');await flush();r=rec();v=r.video;assert(r.key.includes('enemy_a'));run('multiBattle.enemies.reverse();updateMultiBattleView()');assert.equal(rec().video,v);assert.equal(d.querySelectorAll('video').length,1);
pass('same-species candidates keep selected instance even after candidate order changes');
defer=true;setup();r=rec();v=r.video;const loadError=v.onerror;run("show('home')");loadError();deferred.at(-1).reject(Error('late load abort'));await flush();assert.equal(rec(),null);assert(r.disposed&&r.timer===null);defer=false;
pass('leave during loading ignores delayed error and play rejection');
run("show('home')");checkIds();dom.window.close();assert.equal(errors.length,0,errors.join('\n'));
console.log(JSON.stringify({kind:'Media API and lifecycle events mocked; not real playback/BFCache',checks,pass:checks.length},null,2));
