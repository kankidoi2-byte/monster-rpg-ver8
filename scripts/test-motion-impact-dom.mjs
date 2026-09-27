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

const checks=[],pass=name=>checks.push(name);
setup();run("enemy=by('volmoog');setupBattle();setBattleIdleLimit(3);Math.random=()=>.5");await flush();
const records=()=>Array.from(run('[...battleIdleRecords.values()]'));
const original=records().map(r=>r.video);assert.equal(original.length,2);
run("window.hpEvents=[];window.hpOriginal=battleHpResult;battleHpResult=function(vis,before,after,options){window.hpOriginal(vis,before,after,options);const u=battleCombatants().find(u=>u.vis===vis);const bar=document.getElementById(vis==='pVis'?'pHpBar':'eHpBar');window.hpEvents.push({vis,before,after,aria:bar.getAttribute('aria-valuenow'),label:options?.label});};");
for(const [label,move] of [['normal',['通常',10,'normal']],['repeat',['追撃',5,'thunder','repeat_attack',1]],['heal',['回復',30,'water','heal']],['recoil',['反動',10,'normal','recoil']]]){
 run('pHp=Math.floor(playerMaxHp()/2);eHp=enemyMaxHp();update();window.hpEvents=[];Math.random=()=>.5');
 await run(`doAttack(player,enemy,${JSON.stringify(move)},true)`);
 const events=Array.from(run('window.hpEvents'));
 assert(events.length>0,label);assert(events.every(e=>Number(e.aria)===Math.max(0,e.after)),label+' impact HP numeric synchronization');
 if(label==='repeat')assert.equal(events.filter(e=>e.vis==='eVis').length,2);
 if(label==='heal')assert(events.some(e=>e.vis==='pVis'&&e.after>e.before));
 if(label==='recoil')assert(events.some(e=>e.vis==='pVis'&&e.after<e.before));
 assert(records().every((r,i)=>r.video===original[i]),label+' media retention');
 pass(label+' real handler updates HP at each result and preserves media nodes');
}
const old=records();run('eHp=0;win()');assert(!d.querySelector('video'));assert(old.every(r=>r.disposed));setup();assert.equal(records().length,1);assert(!run('busy'));
pass('knockout/result disposes; next battle starts unlocked');
run("show('home')");dom.window.close();assert.equal(errors.length,0,errors.join('\n'));
console.log(JSON.stringify({kind:'Real DOM and game handlers; media mocked; not visual timing/Android',checks,pass:checks.length},null,2));
