/* Optional real-DOM regression (not a layout/browser test).
 * npm install --prefix /tmp/phase3a-dom jsdom
 * NODE_PATH=/tmp/phase3a-dom/node_modules node scripts/test-battle-stage-dom.mjs
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
w.structuredClone=structuredClone;w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};
w.alert=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
const run=code=>vm.runInContext(code,context);
for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g))run(fs.readFileSync(new URL(m[1],root),'utf8'));
const by=id=>d.getElementById(id);
const fixed=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
function checkIds(){for(const id of fixed)assert.equal(d.querySelectorAll(`[id="${id}"]`).length,1,id);}
function setup(){run(`save=initSave();completeTutorial();save.instances=[];save.party=[];
  for(const id of ['freigal','aquaron','grassbeat']){const ins=addInstance(id,10);save.party.push(ins.uid);}
  prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');
  activeHuntRequest=createHuntRequest(selectedMap,enemy,'easy',[]);activeHuntRequest.battleMode='single';
  beginChosenBattle('grassland','slime','easy',activeHuntRequest);show('battle');`);}
setup();
run('syncBattleViewportInfo()');
assert(d.getElementById('battleCompactInfo').contains(by('pInfo')));
assert(d.getElementById('battleCompactInfo').contains(by('eInfo')));
const p=by('pVis').querySelector('img');run('update();syncBattleViewportInfo()');assert.equal(by('pVis').querySelector('img'),p);checkIds();
const info=by('battleCompactInfo');info.open=true;run('update();syncBattleViewportInfo()');assert(info.open);
const normal=run('battleViewportBudget(736,58,260,150)');assert.equal(normal.scroll,false);assert(normal.arena+58+260+8<=736);
const enlarged=run('battleViewportBudget(500,80,300,220)');assert.equal(enlarged.scroll,true);assert(enlarged.artwork>=64);
let count=0;
const configs=run('Object.values(BATTLE_IDLE_MEDIA)');
for(const width of [320,393,430,760])for(const height of [64,120,220])for(const ally of configs)for(const enemy of configs){
 const enemies=[enemy,configs[0]], plan=run(`battleCompactSizePlan(${JSON.stringify(enemies)},${JSON.stringify(ally)},${width},${height})`);
 assert(plan.unit>0);const total=plan.weights.reduce((a,b)=>a+b,0),group=width*.6-24;
 for(const [c,space] of [[ally,width*.4-24],...enemies.map((c,i)=>[c,group*plan.weights[i]/total-16])]){
  const b=c.sourceBounds,bw=b.right-b.x,bh=b.bottom-b.y,unit=plan.unit*c.layout.scale;
  assert(bw/Math.max(bw,bh)*unit<=space+1e-7);assert(bh/Math.max(bw,bh)*unit<=height-16+1e-7);
 }
 count++;
}
// Exercise the actual budget application with explicit measured DOM rectangles.
const screen=by('battle'),arena=screen.querySelector('.battle-arena');
Object.defineProperty(arena,'clientWidth',{configurable:true,value:393});
screen.getBoundingClientRect=()=>({top:58,height:0});
const chromeSizes={battleMapBanner:48,battleActionStatus:44,battleCompactTools:48};
for(const el of screen.children){const h=el.classList.contains('battle-command-dock')?160:chromeSizes[el.id]||0;el.getClientRects=()=>h?[{}]:[];el.getBoundingClientRect=()=>({height:h,top:0});}
for(const id of ['singlePlayerBox','singleEnemyBox']){by(id).getClientRects=()=>[{}];by(id).getBoundingClientRect=()=>({height:64,top:0});}
Object.defineProperty(w,'innerHeight',{configurable:true,value:736});
run('updateBattleViewport()');assert(screen.classList.contains('is-viewport-battle'));assert.equal(screen.dataset.viewportOverflow,'false');assert.equal(Number(arena.dataset.compactHeight),218);assert(Number(arena.dataset.sizeUnit)>0);
const art=by('pVis').querySelector('img');Object.defineProperty(w,'innerHeight',{configurable:true,value:420});run('updateBattleViewport()');assert.equal(screen.dataset.viewportOverflow,'true');assert.equal(Number(arena.dataset.compactHeight),64);assert.equal(by('pVis').querySelector('img'),art);
run(`ensureMultiBattleDom();multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by('slime'),'enemy_a'),createMultiEnemy(by('freigal'),'enemy_b')],pendingMoveIndex:null};setMultiBattleLayout(true);setupMultiBattle();syncBattleViewportInfo()`);
assert(by('battleCompactInfo').querySelector('[data-info-vis="eVis"]').hidden);checkIds();
run("show('home')");const before=by('pVis').querySelector('img');run('updateBattleViewport()');assert.equal(by('pVis').querySelector('img'),before);
assert.equal(errors.length,0,errors.join('\n'));dom.window.close();
console.log('PASS viewport budget, info retention/visibility, '+count+' compact ally/two-enemy containment cases; no browser pixel-layout assertion');
