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
setup();await new Promise(r=>setTimeout(r,0));
let video=by('pVis').querySelector('video');assert(video&&!video.paused);video.currentTime=3;
run('pHp-=3;update();toggleBattleSkillPanel();battleUiBack()');assert.equal(by('pVis').querySelector('video'),video);assert.equal(video.currentTime,3);
run('openBattleItemSelect()');assert(video.paused);run("show('battle');update()");await new Promise(r=>setTimeout(r,0));assert.equal(by('pVis').querySelector('video'),video);assert(!video.paused);
const oldPlaying=video.onplaying;run('changeActivePartyMember(1)');assert(video.paused&&!video.isConnected);oldPlaying();assert(!d.querySelector('video'));
for(let i=0;i<5;i++){setup();run("show('home')");assert.equal(d.querySelectorAll('video').length,0);}
refuse=true;setup();await new Promise(r=>setTimeout(r,0));assert(run('battleIdleRecord.failed'));assert.equal(by('pVis').querySelector('img').style.visibility,'visible');
const calls=playCalls;run('update();update();update()');assert.equal(playCalls,calls);run('toggleBattleSkillPanel()');assert(!by('commands').classList.contains('hidden'));
refuse=false;run('battleIdleRecord.button.click()');await new Promise(r=>setTimeout(r,0));assert(!by('pVis').querySelector('video').paused);
run('eHp=0;win()');assert(!d.querySelector('video'));setup();assert.equal(d.querySelectorAll('video').length,1);
run("show('home')");dom.window.close();assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS Phase4A DOM: node/time retention; temporary pause/resume; switch disposal and stale callback; five exits; simulated rejection/no retry loop/user retry; victory/next. Media API mocked, real decode is browser evidence.');
