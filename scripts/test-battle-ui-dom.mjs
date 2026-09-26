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
const dom=new JSDOM(html,{url:'http://phase3c.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
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

const snapshot=()=>run('JSON.stringify({pHp,eHp,battleTurnCount,items:save.items,party:partyBattle.map(e=>[e.inst.uid,e.hp]),links:kokoroLinkBattleSnapshot()})');
// Opening/cancelling uses no RNG and changes no combat/save state.
setup();run('window.qaRolls=0;window.qaRandom=Math.random;Math.random=()=>{window.qaRolls++;return .5}');
const before=snapshot(),p=by('pVis').querySelector('img');
for(const expression of ['toggleBattleSkillPanel();battleUiBack()','openBattleSwitchPicker();battleUiBack()','toggleKokoroLinkPanel();battleUiBack()','openBattleItemSelect();show("battle")']){
 run(expression);assert.equal(snapshot(),before,expression);assert.equal(run('window.qaRolls'),0);assert.equal(by('pVis').querySelector('img'),p);
}
run('Math.random=window.qaRandom;toggleBattleSkillPanel()');assert.match(by('commands').textContent,/COST.*装備/);assert.match(by('commands').textContent,/対象：/);
assert(d.querySelector('.battle-command-pad').hidden);run('battleUiBack()');assert.equal(d.activeElement.id,'battleSkillButton');
// Item denial, success, stale double submission and exact persistence.
run('openBattleItemSelect()');assert.match(by('battleItemList').textContent,/HPは満タン/);let n=run('save.items.potion');run('useBattleItemFromMenu("potion")');assert.equal(run('save.items.potion'),n);
run('show("battle");pHp-=70;partyBattle[activePartyIdx].hp=pHp;update();openBattleItemSelect()');
const hurt=run('pHp'),turn=run('battleTurnCount'),enemyHp=run('eHp');run('useBattleItemFromMenu("potion");useBattleItemFromMenu("potion")');
assert.equal(run('save.items.potion'),n-1);assert.equal(run('pHp'),hurt+50);assert.equal(run('eHp'),enemyHp);assert.equal(run('battleTurnCount'),turn);assert.equal(d.activeElement.id,'battleItemButton');
assert.equal(run('loadSave().items.potion'),n-1);assert.equal(by('pVis').querySelector('img'),p);
run('save.items.potion=0;openBattleItemSelect()');assert.match(by('battleItemList').textContent,/残数がありません/);run('show("battle")');
// Summarize all conditions, retain media and disclosure state.
run("pStatus='poison';pPoisonTurns=2;pParalysisTurns=2;pSleepTurns=1;pConfusionTurns=3;pGuard=true;update()");
assert.equal(by('pBattleStatus').querySelectorAll(':scope > span').length,2);assert.match(by('pBattleStatus').textContent,/他3件/);const states=by('pBattleStatus').querySelector('details');states.open=true;run('update()');assert(by('pBattleStatus').querySelector('details').open);assert.equal(by('pVis').querySelector('img'),p);
// Link uses a source only once, does not consume a turn.
setup();const linkTurn=run('battleTurnCount');run('toggleKokoroLinkPanel();window.qaSource=currentKokoroLinkSources()[0].uid;activateKokoroLinkFromBattle(window.qaSource);activateKokoroLinkFromBattle(window.qaSource)');
assert.equal(run('battleTurnCount'),linkTurn);assert(run('!!kokoroLinkEffectForInstance(activeInstance)'));assert.equal(run('currentKokoroLinkSources({includeUsed:true}).filter(s=>s.used).length'),1);
// Empty and long/many render inputs are synthetic, not new legal loadouts.
setup();run("window.qaMoves=getEquippedMovesForInstance;getEquippedMovesForInstance=()=>[];renderSkillButtons()");assert.match(by('commands').textContent,/装備中の技がありません/);
run("getEquippedMovesForInstance=()=>Array.from({length:12},()=>['長い技名'.repeat(12),24,'normal',null,null,1,'説明'.repeat(150)]);renderSkillButtons()");assert.equal(by('commands').querySelectorAll('.skill-button').length,12);run('getEquippedMovesForInstance=window.qaMoves');
// Same species target, self target description, cancellation, invalidated target.
multi();run("Object.assign(multiBattle.enemies[0],{poisonTurns:2,status:'poison',paralysisTurns:2,sleepTurns:1,guard:true});update()");const enemyMedia=by('enemy_aVis').querySelector('img');by('enemy_aStatus').querySelector('details').open=true;run('update()');assert(by('enemy_aStatus').querySelector('details').open);assert.equal(by('enemy_aVis').querySelector('img'),enemyMedia);
multi();const mBefore=snapshot();run('toggleBattleSkillPanel();turn(0)');assert.match(by('multiTargetSelect').textContent,/選択中：/);assert.match(by('multiTargetSelect').textContent,/敵A：スライム/);assert.match(by('multiTargetSelect').textContent,/敵B：スライム/);run('battleUiBack()');assert(!by('commands').classList.contains('hidden'));assert.equal(snapshot(),mBefore);
run("chooseMultiBattleTarget(0);multiBattle.enemies[1].alive=false;multiBattle.enemies[1].hp=0;startMultiBattleTurn('enemy_b')");assert.equal(run('busy'),false);assert.equal(run('battleTurnCount'),0);assert(!by('multiTargetSelect').textContent.includes('敵B：スライム'));
run('battleUiBack();battleUiBack();');assert.equal(d.activeElement.id,'battleSkillButton');
assert.equal(run("battleUiMoveTarget(['防御',0,'normal','guard'])"),'自分');
// Actual multi attack and one turn despite rapid duplicate execution.
multi();run('chooseMultiBattleTarget(0);startMultiBattleTurn("enemy_b");startMultiBattleTurn("enemy_b")');
const wait=async()=>{for(let i=0;i<100&&run('busy');i++)await new Promise(r=>setTimeout(r,50));assert(!run('busy'),'action unlock');};await wait();assert.equal(run('battleTurnCount'),1);assert(run('battleFeedback.history.some(h=>h.kind==="hp"&&h.text.includes("敵B：スライム"))'));
// Manual swap consumes one action; repeated submission while busy is ignored.
setup();run('openBattleSwitchPicker();selectBattleSwitchTarget(1);selectBattleSwitchTarget(2)');await wait();assert.equal(run('activePartyIdx'),1);assert.equal(run('battleTurnCount'),1);assert(!d.querySelector('.battle-command-pad').hidden);
// Finished and next battle clear old panels/locks.
run('toggleBattleSkillPanel();runAway();renderBattleInputState()');assert(by('commands').classList.contains('hidden'));run('toggleBattleSkillPanel();openBattleItemSelect()');assert(by('commands').classList.contains('hidden'));assert(by('battle').classList.contains('active'));
setup();assert(!run('busy'));assert(!d.querySelector('.battle-command-pad').hidden);checkIds();assert.equal(errors.length,0,errors.join('\n'));
dom.window.close();console.log('PASS Phase3C: panel cancellation/RNG/state, item refusal/success/stale double click/save reload, status disclosure/media, link once, same-species target/cancel/invalidation, actual multi turn once, manual switch once, finished/next lifecycle.');
