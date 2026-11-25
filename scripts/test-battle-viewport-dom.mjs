/* Optional real-DOM regression (not a layout/browser test).
 * npm install --prefix /tmp/rpg-dom-deps --no-save --package-lock=false jsdom@26.1.0 css-tree@3.1.0
 * NODE_PATH=/tmp/rpg-dom-deps/node_modules node scripts/test-battle-viewport-dom.mjs
 */
import assert from 'node:assert/strict';
import {installDialogDomSupport} from './test-dialog-dom-support.mjs';
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
installDialogDomSupport(w);
w.structuredClone=structuredClone;w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};
w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
const run=code=>vm.runInContext(code,context);
for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g))run(fs.readFileSync(new URL(m[1],root),'utf8'));
const by=id=>d.getElementById(id);
// Inspect the actual CSS cascade, including the legacy !important rules.
// jsdom does not render pixels; css-tree supplies selector syntax and the
// standard specificity calculation below verifies the winner explicitly.
const css=createRequire(import.meta.url)('css-tree');
const compare=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
const maxSpec=xs=>xs.reduce((a,b)=>compare(a,b)>0?a:b,[0,0,0]);
function specificity(n){
 if(n.type==='IdSelector')return [1,0,0];
 if(['ClassSelector','AttributeSelector'].includes(n.type))return [0,1,0];
 if(['TypeSelector','PseudoElementSelector'].includes(n.type))return n.name==='*'?[0,0,0]:[0,0,1];
 const kids=n.children?[...n.children].map(specificity):[];
 if(n.type==='SelectorList')return maxSpec(kids);
 if(n.type==='PseudoClassSelector'){
  if(n.name==='where')return [0,0,0];
  if(['is','not','has'].includes(n.name))return maxSpec(kids);
  return [0,1,0];
 }
 return kids.reduce((a,b)=>a.map((v,i)=>v+b[i]),[0,0,0]);
}
const sizingRules=[];
for(const link of d.querySelectorAll('link[rel="stylesheet"]')){
 const path=link.getAttribute('href').split('?')[0];
 if(!path.startsWith('css/'))continue;
 css.walk(css.parse(fs.readFileSync(new URL(path,root),'utf8')),{visit:'Rule',enter(rule){
  if(this.atrule?.name.endsWith('keyframes')||rule.prelude?.type!=='SelectorList')return;
  const declarations=[...rule.block.children].filter(n=>n.type==='Declaration'&&['width','height','position','min-height','display'].includes(n.property));
  for(const sel of rule.prelude.children)for(const decl of declarations)sizingRules.push({selector:css.generate(sel),spec:specificity(sel),important:!!decl.important,property:decl.property,value:css.generate(decl.value)});
 }});
}
function checkSizingCascade(){
 for(const media of d.querySelectorAll('#battle .battle-static-media.has-idle-size')){
  media.dataset.idleFit='bounds';
  const video=d.createElement('video');video.className='battle-idle-video';media.append(video);
  for(const open of [false,true]){
   by('commands').classList.toggle('hidden',!open);
   for(const target of [media.querySelector('img'),video])for(const prop of ['width','height']){
    let winner=null;
    for(const rule of sizingRules){
     if(rule.property!==prop||!target.matches(rule.selector))continue;
     if(!winner||Number(rule.important)>Number(winner.important)||(rule.important===winner.important&&compare(rule.spec,winner.spec)>=0))winner=rule;
    }
    assert.equal(winner?.value,`var(--idle-canvas-${prop})`,`${target.closest('[id]').id} ${prop}: ${winner?.selector}`);
   }
  }
  video.remove();delete media.dataset.idleFit;
 }
 by('commands').classList.add('hidden');
}

const fixed=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
function checkIds(){for(const id of fixed)assert.equal(d.querySelectorAll(`[id="${id}"]`).length,1,id);}
function setup(){run(`save=initSave();completeTutorial();save.instances=[];save.party=[];
  for(const id of ['freigal','aquaron','grassbeat']){const ins=addInstance(id,10);save.party.push(ins.uid);}
  prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');
  activeHuntRequest=createHuntRequest(selectedMap,enemy,'easy',[],{allowOvertier:false});activeHuntRequest.battleMode='single';
  beginChosenBattle('grassland','slime','easy',activeHuntRequest);show('battle');`);}
setup();
run('syncBattleViewportInfo()');checkSizingCascade();
assert(d.getElementById('battleCompactInfo').contains(by('pInfo')));
assert(d.getElementById('battleCompactInfo').contains(by('eInfo')));
const p=by('pVis').querySelector('img');run('update();syncBattleViewportInfo()');assert.equal(by('pVis').querySelector('img'),p);checkIds();
const info=by('battleCompactInfo');info.open=true;run('update();syncBattleViewportInfo()');assert(info.open);
const normal=run('battleViewportBudget(736,0,240,64)');assert.equal(normal.scroll,false);assert(normal.arena+240+8<=736);
const enlarged=run('battleViewportBudget(500,80,300,220)');assert.equal(enlarged.scroll,true);assert(enlarged.artwork>=64);
let count=0;
const configs=run('Object.values(BATTLE_IDLE_MEDIA)');
const standard=run("battleDisplayMedia('elna_advanced')");
const sizePlan=run('battleCompactSizePlan');
for(const width of [320,393,430,760])for(const height of [300,440,600])for(const ally of configs)for(const enemy of configs){
 const enemies=[enemy,configs[0]], plan=sizePlan(enemies,ally,width,height);
 assert(plan.allyUnit>0&&plan.enemyUnit>0);
 assert.equal(plan.unit,plan.enemyUnit);
 assert.equal(plan.allyUnit,sizePlan([standard],ally,width,height).allyUnit);
 assert.equal(plan.enemyUnit,sizePlan(enemies,standard,width,height).enemyUnit);
 assert.deepEqual(Array.from(plan.weights),[1,1]);
 const group=width*.84-8;
 for(const [c,space,unit,vertical] of [[ally,width*.8-16,plan.allyUnit,plan.allyHeight-16],...enemies.map(c=>[c,group/2-16,.85*plan.enemyUnit,plan.enemyHeight-16])]){
  const b=c.sourceBounds,bw=b.right-b.x,bh=b.bottom-b.y,scale=unit*c.layout.scale/Math.max(bw,bh);
  assert(bw*scale<=space+1e-7);assert(bh*scale<=vertical+1e-7);
 }
 count++;
}
// Exercise the actual budget application with explicit measured DOM rectangles.
const screen=by('battle'),arena=screen.querySelector('.battle-arena');
Object.defineProperty(arena,'clientWidth',{configurable:true,value:393});
screen.getBoundingClientRect=()=>({top:58,height:0});
const chromeSizes={battleMapBanner:48,battleActionStatus:44,battleCompactTools:48};
for(const el of screen.children){const h=el.classList.contains('battle-command-dock')?184:chromeSizes[el.id]||0;el.getClientRects=()=>h?[{}]:[];el.getBoundingClientRect=()=>({height:h,top:0});}
for(const id of ['singlePlayerBox','singleEnemyBox']){by(id).getClientRects=()=>[{}];by(id).getBoundingClientRect=()=>({height:64,top:0});}
Object.defineProperty(w,'innerHeight',{configurable:true,value:736});
run('updateBattleViewport()');assert(screen.classList.contains('is-viewport-battle'));assert.equal(screen.dataset.viewportOverflow,'false');assert.equal(Number(arena.dataset.compactHeight),346);assert(Number(arena.dataset.sizeUnit)>0);assert.equal(arena.dataset.enemyDepth,'.85');assert.equal(arena.dataset.sizeUnit,arena.dataset.enemyUnit);assert(Number(arena.dataset.allyUnit)>0);
// Opening a inline chooser keeps field height, unit and focus on-screen.
let panelScrolls=0;w.HTMLElement.prototype.scrollIntoView=function(){if(this.closest('.battle-inline-panel'))panelScrolls++;};
const restingHeight=arena.dataset.compactHeight,restingUnit=arena.dataset.sizeUnit;
run('toggleBattleSkillPanel()');
assert(by('commands').classList.contains('battle-inline-panel'));
assert(by('commands').querySelector('.br-effect'));
assert(by('commands').contains(d.activeElement));assert.equal(panelScrolls,0);
const winningRule=(node,property)=>sizingRules.filter(rule=>rule.property===property&&node.matches(rule.selector)).reduce((winner,rule)=>!winner||Number(rule.important)>Number(winner.important)||(rule.important===winner.important&&compare(rule.spec,winner.spec)>=0)?rule:winner,null);
assert.equal(winningRule(by('commands'),'position').value,'static');
assert.equal(winningRule(by('commands').querySelector('.skill-button'),'min-height').value,'98px');
assert.equal(winningRule(screen.querySelector('.battle-command-dock'),'min-height').value,'153px');
assert.equal(winningRule(by('singlePlayerBox').querySelector('.battle-vitals'),'display').value,'contents');
assert.equal(winningRule(by('singlePlayerBox'),'position').value,'absolute');
assert.equal(winningRule(by('singlePlayerBox').querySelector('.bar'),'height').value,'6px');
run('updateBattleViewport()');assert.equal(arena.dataset.compactHeight,restingHeight);assert.equal(arena.dataset.sizeUnit,restingUnit);
run('battleUiBack()');assert(by('commands').classList.contains('hidden'));assert.equal(d.activeElement,by('battleSkillButton'));
const art=by('pVis').querySelector('img');Object.defineProperty(w,'innerHeight',{configurable:true,value:420});run('updateBattleViewport()');assert.equal(screen.dataset.viewportOverflow,'true');assert.equal(Number(arena.dataset.compactHeight),228);assert.equal(by('pVis').querySelector('img'),art);
run(`ensureMultiBattleDom();multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by('slime'),'enemy_a'),createMultiEnemy(by('freigal'),'enemy_b')],pendingMoveIndex:null};setMultiBattleLayout(true);setupMultiBattle();syncBattleViewportInfo()`);
assert(by('battleCompactInfo').querySelector('[data-info-vis="eVis"]').hidden);checkIds();checkSizingCascade();
const detail=by('enemy_aCard').querySelector('.br-info');
assert(detail);detail.click();assert(by('renewalSheet').open);
assert.match(by('renewalSheetBody').textContent,/弱点/);
run('renewalClose();toggleBattleSkillPanel()');
assert(by('commands').classList.contains('battle-inline-panel'));assert.equal(panelScrolls,0);
assert.equal(by('commands').querySelector('[data-battle-panel-back]').textContent,'‹ 戻る');
by('enemy_bCard').querySelector('.battle-stage-slot').click();
assert.match(by('commands').querySelector('.br-skill-heading').textContent,/対象：フレイガル/);
assert(by('multiTargetSelect').classList.contains('hidden'));
run('battleUiBack();battleHistoryEntry("確認ログ");renewalHistory()');
assert.match(by('renewalSheetBody').textContent,/確認ログ/);
run('renewalClose();pStatus="poison";pPoisonTurns=2;pGuard=true;update()');
assert.match(by('pBattleStatus').textContent,/毒/);
assert.match(by('pBattleStatus').textContent,/次の被弾/);
const projected=run(`battleCompactSizePlan([BATTLE_IDLE_MEDIA.goblin,BATTLE_IDLE_MEDIA.slime],BATTLE_IDLE_MEDIA.elixion,393,488)`);
assert.equal(projected.allyHeight-16,(488-64-60)/(1.2+.85*.75)*1.2,'dragon uses the space budget for a standard opponent');
assert(projected.enemyUnit*.3*.85>45,'background slime remains legible');

run("show('home')");const before=by('pVis').querySelector('img');run('updateBattleViewport()');assert.equal(by('pVis').querySelector('img'),before);
for(const key of ['allyUnit','enemyUnit','sizeUnit'])assert.equal(arena.dataset[key],undefined);
assert.equal(errors.length,0,errors.join('\n'));dom.window.close();
console.log('PASS viewport budget, info retention/visibility, '+count+' independently sized full-loop ally/two-enemy cases; no browser pixel-layout assertion');
