/* Optional real-DOM regression (not a layout/browser test).
 * npm install --prefix /tmp/phase3b-dom jsdom
 * NODE_PATH=/tmp/phase3b-dom/node_modules node scripts/test-battle-stage-multi-dom.mjs
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
const dom=new JSDOM(html,{url:'http://phase3b.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
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

function multi(){setup();run(`ensureMultiBattleDom();multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by('slime'),'enemy_a'),createMultiEnemy(by('slime'),'enemy_b')],pendingMoveIndex:null};setMultiBattleLayout(true);setupMultiBattle()`);checkIds();}
multi();
const detail=by('enemy_aCard').querySelector('button');detail.focus();detail.click();assert.equal(d.activeElement,detail);
const a=by('enemy_aVis').querySelector('img'),b=by('enemy_bVis').querySelector('img');
assert.notEqual(a,b);
const hpA=run('multiBattle.enemies[0].hp'),hpB=run('multiBattle.enemies[1].hp'),hpP=run('pHp');
run('busy=true');
await run("performMultiAttack(multiBattle.enemies[0],multiBattle.enemies[1],['体当たり',24,'normal'])");
assert.equal(run('multiBattle.enemies[0].hp'),hpA);
assert(run('multiBattle.enemies[1].hp')<hpB);
assert.equal(run('pHp'),hpP);
assert.match(by('battleActionStatus').textContent,/敵A：スライム.*→ 敵B：スライム/);
assert.match(by('enemy_bCard').querySelector('.battle-hp-line span').textContent,new RegExp('^'+run('multiBattle.enemies[1].hp')+' /'));
assert(by('enemy_aVis').closest('.battle-stage-slot').classList.contains('is-stage-actor'));
assert(by('enemy_bVis').closest('.battle-stage-slot').classList.contains('is-stage-target'));
run('updateMultiBattleView()');assert.equal(by('enemy_aVis').querySelector('img'),a);assert.equal(by('enemy_bVis').querySelector('img'),b);
run('busy=false;renderBattleInputState();chooseMultiBattleTarget(0)');
assert.equal(d.querySelectorAll('.is-stage-actor').length,0);
assert.match(by('multiTargetSelect').textContent,/敵A：スライム.*HP/);
assert.match(by('multiTargetSelect').textContent,/敵B：スライム.*HP/);
assert(!by('enemy_aCard').querySelector('button').disabled);
run('multiBattle.enemies[0].hp=0;multiBattle.enemies[0].alive=false;update()');
assert(by('enemy_aCard').classList.contains('is-defeated'));assert(by('enemy_aCard').querySelector('button').disabled);
assert.equal(by('enemy_bVis').querySelector('img'),b);
run('cancelMultiBattleTarget();openBattleItemSelect();show("battle");update()');assert.equal(by('enemy_bVis').querySelector('img'),b);
run('changeActivePartyMember(1);update()');assert.match(by('pName').textContent,/アクアロン/);
run('busy=true;update();busy=false;renderBattleInputState()');assert(!by('enemy_bCard').querySelector('button').disabled);
run('runAway()');assert(!by('battleOutcome').classList.contains('hidden'));assert.equal(d.querySelectorAll('[data-stage-action]').length,0);
run('afterBattleNext()');setup();assert.equal(d.querySelectorAll('.multi-enemy-card').length,0);checkIds();
run("activeHuntRequest.battleMode='invasion_pending';activeHuntRequest.invasionTurn=2;activeHuntRequest.invasionEnemyId='slime';battleTurnCount=2;eHp-=3");
const invasionHP=run('eHp');assert.equal(run('triggerInvasionIfDue()'),true);assert.equal(run('multiBattle.enemies[0].hp'),invasionHP);checkIds();
const oldKey=by('enemy_aCard').dataset.displayKey;
multi();assert.notEqual(by('enemy_aCard').dataset.displayKey,oldKey);assert.equal(d.querySelectorAll('.multi-enemy-card').length,2);
const broken=by('enemy_bVis').querySelector('img');broken.dispatchEvent(new w.Event('error'));assert(broken.hidden);assert.match(by('enemy_bVis').textContent,/敵B/);
run('update()');assert.equal(by('enemy_bVis').querySelector('img'),broken);assert(broken.hidden);
run('multiBattle.enemies.forEach(e=>{e.hp=0;e.alive=false});winMultiBattle()');assert(!by('battleOutcome').classList.contains('hidden'));
run('afterBattleNext()');setup();assert.equal(d.querySelectorAll('.multi-enemy-card').length,0);assert.equal(errors.length,0,errors.join('\n'));
dom.window.close();
console.log('PASS Phase3B DOM: same-species identity, real enemy->enemy attack and impact HP isolation, stable images, targets, knockout, busy recovery, item return, switch, retreat/victory/next, invasion, generation and image fallback.');
