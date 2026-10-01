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
  for(const id of ['volmoog','elna_beginner','grassbeat']){const ins=addInstance(id,10);save.party.push(ins.uid);}
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
multi();await flush();let rs=records();assert.equal(rs.length,3);assert.equal(new Set(rs.map(r=>r.video)).size,3);
assert.equal(new Set(rs.map(r=>r.key)).size,3);assert(rs.every(r=>r.state==='playing'));
const vs=rs.map(r=>r.video);vs.forEach((v,i)=>v.currentTime=i+1);
for(let i=0;i<10;i++)run('pHp--;multiBattle.enemies[0].hp--;updateMultiBattleView();renderBattleInputState()');
assert.deepEqual(records().map(r=>r.video),vs);assert.deepEqual(vs.map(v=>v.currentTime),[1,2,3]);
pass('three independent same-species records; HP/HUD updates retain all nodes and clocks');
const old=rs[1].video,stale=old.onerror;stale();assert(rs[1].failed);assert(!old.hasAttribute('src'));assert.equal(old.onerror,null);assert(!rs[0].failed&&!rs[2].failed);
rs[1].button.click();stale();await flush();
assert(rs[1].retried&&!rs[1].failed);assert.equal(records()[0].video,vs[0]);assert.equal(records()[2].video,vs[2]);
pass('one enemy failure and manual retry leave other lifetimes intact; stale event ignored');
run('multiBattle.enemies.reverse();updateMultiBattleView()');assert.equal(records()[0],rs[0]);
run('setBattleIdleLimit(1)');assert.equal(records().length,1);assert.equal(records()[0],rs[0]);
assert(rs.slice(1).every(r=>r.disposed&&r.video.paused&&!r.video.hasAttribute('src')));
run('setBattleIdleLimit(3)');assert.equal(records().length,3);assert.equal(records()[0],rs[0]);
assert.equal(run('setBattleIdleLimit(4)'),false);assert.equal(records().length,3);
pass('stable budget 3→1→3, invalid upper bound rejected; dropped resources released');
rs=records();run('openBattleItemSelect()');assert(rs.every(r=>r.video.paused));hidden(true);run("show('battle')");assert(rs.every(r=>r.video.paused));hidden(false);await flush();assert(rs.every(r=>!r.video.paused));
reduced(true);assert(rs.every(r=>r.video.paused));reduced(false);await flush();assert(rs.every(r=>r.state==='playing'));
pass('three independent videos obey overlapping screen/hidden/reduced reasons');
run('multiBattle.enemies[0].hp=0;updateMultiBattleView()');assert.equal(records().length,2);
run('changeActivePartyMember(1)');assert.equal(records().length,1);
pass('one enemy knockout and ally switch dispose only affected lifetimes');
for(let i=0;i<50;i++){multi();await flush();const old=records();run("show('home')");assert.equal(records().length,0);assert.equal(d.querySelectorAll('video').length,0);assert(old.every(r=>r.disposed&&r.timer===null&&r.button.onclick===null&&r.video.paused&&!r.video.hasAttribute('src')));}
pass('50 three-video battle/exit cycles release all owned resources');
// Real invasion entry: transfer HP/status and remove eVis lifetime.
setup();run("enemy=by('volmoog');setupBattle();update();setBattleIdleLimit(3);eHp=80;eStatus='poison';ePoisonTurns=2;eParalysisTurns=1;eGuard=true;eAtk=1.3;update()");
const single=records().find(r=>r.key.includes('single:'));assert(single);
run("activeHuntRequest.battleMode='invasion_pending';activeHuntRequest.invasionTurn=battleTurnCount;activeHuntRequest.invasionEnemyId='volmoog';triggerInvasionIfDue()");
assert(single.disposed);assert(!single.video.isConnected);assert.equal(records().length,3);assert.equal(d.querySelectorAll('video').length,3);
assert.equal(run('multiBattle.enemies[0].hp'),80);assert.equal(run('multiBattle.enemies[0].poisonTurns'),2);assert.equal(run('multiBattle.enemies[0].paralysisTurns'),1);assert.equal(run('multiBattle.enemies[0].attack'),1.3);assert(run('multiBattle.enemies[0].guard'));assert.equal(run('battleTurnCount'),0);
pass('actual invasion keeps HP/status/attack/guard, removes old video, and does not start an extra turn');
const entry=run('multiBattle.enemies[0]');run('multiBattle.enemies[0].hp=0;multiBattle.enemies[0].alive=false;multiBattle.enemies[0].defeatedByPlayer=true;updateMultiBattleView()');
assert.equal(records().length,2);assert.equal(run('multiBattle.enemies[0]'),entry);assert(entry.defeatedByPlayer&&!entry.rewardGranted);
pass('media knockout disposal preserves game object and contract/reward eligibility');
run("show('home')");checkIds();dom.window.close();assert.equal(errors.length,0,errors.join('\n'));
console.log(JSON.stringify({kind:'Media API mocked; not Android/decoder performance',checks,pass:checks.length},null,2));
