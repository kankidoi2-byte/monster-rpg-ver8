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
setup();checkIds();
assert(by('battle').classList.contains('is-single-stage'));
assert.equal(by('pVis').parentElement.id,'pBattleSlot');
assert.equal(by('eVis').parentElement.id,'eBattleSlot');
assert(!by('singlePlayerBox').contains(by('pVis')));
assert.deepEqual([...d.querySelector('.battle-command-pad').children].map(n=>n.id),['kokoroLinkButton','battleSkillButton','battleItemButton','battleSwitchButton','battleEscapeButton']);
assert.equal(by('battle').lastElementChild.className,'battle-log-panel');
const p=by('pVis').querySelector('img'),e=by('eVis').querySelector('img'),f=by('pVis').querySelector('.battle-facing');
run('pHp-=3;eHp-=2;update();update()');
assert.equal(by('pVis').querySelector('img'),p);assert.equal(by('eVis').querySelector('img'),e);assert.equal(by('pVis').querySelector('.battle-facing'),f);
assert.equal(by('pHpBar').getAttribute('aria-valuenow'),String(run('pHp')));
run('toggleBattleSkillPanel()');assert(!by('commands').classList.contains('hidden'));
run('busy=true;renderBattleInputState();toggleBattleSkillPanel();openBattleSwitchPicker();runAway()');
assert(d.querySelector('.battle-command-dock').inert);assert(!by('commands').classList.contains('hidden'));assert(by('battle').classList.contains('active'));
run('busy=false;closeBattleSkillPanel();renderBattleInputState();openBattleSwitchPicker()');assert.match(by('multiTargetSelect').textContent,/交代する仲間/);
run('cancelBattleSwitchPicker();toggleKokoroLinkPanel()');assert(!by('kokoroLinkPanel').classList.contains('hidden'));
run('openBattleItemSelect()');assert(by('battleItemSelect').classList.contains('active'));
run("show('battle');update()");assert.equal(by('pVis').querySelector('img'),p);
run('changeActivePartyMember(1)');assert.notEqual(by('pVis').querySelector('img'),p);assert(by('pVis').querySelector('.battle-facing'));
run("busy=true;beginBattleAction(player,['回復'],true);showSingleBattleActionTarget('pVis')");assert.match(by('battleActionStatus').textContent,/→ アクアロン/);
run('busy=false;runAway()');assert(!by('battleOutcome').classList.contains('hidden'));assert(!by('next').classList.contains('hidden'));
run('afterBattleNext()');assert(!by('battle').classList.contains('active'));
setup();run('eHp=0;win()');assert(!by('battleOutcome').classList.contains('hidden'));run('afterBattleNext()');
setup();run('ensureMultiBattleDom();multiBattle={active:true,enemies:[createMultiEnemy(by("slime"),"enemy_a"),createMultiEnemy(by("freigal"),"enemy_b")],pendingMoveIndex:null};setMultiBattleLayout(true);setupMultiBattle()');
assert(!by('battle').classList.contains('is-single-stage'));assert.equal(by('pVis').parentElement.id,'singlePlayerBox');assert.equal(d.querySelectorAll('.battle-stage-slot').length,0);assert(by('enemy_aVis'));checkIds();
run('multiBattle=null;setMultiBattleLayout(false);setupBattle()');assert(by('battle').classList.contains('is-single-stage'));
run("player=by('elna_beginner');setupBattle()");assert(by('pVis').querySelector('img'));checkIds();
const img=by('pVis').querySelector('img');img.dispatchEvent(new w.Event('error'));assert(img.hidden);assert.match(by('pVis').textContent,/味方/);
setup();assert.equal(run('startTutorialRescueBattle()'),true);checkIds();assert(by('pBattleSlot'));
assert.equal(run('startTutorialStellaMockBattle()'),true);checkIds();assert(by('eVis').querySelector('img'));
assert.equal(errors.length,0,errors.join('\n'));
dom.window.close();
console.log('PASS Phase3A DOM: stable media/HP, fixed IDs, five command entrypoints, busy, item return, replacement, retreat/victory/next, legacy multi return, character static/error fallback. Layout and real browser NOT tested.');
