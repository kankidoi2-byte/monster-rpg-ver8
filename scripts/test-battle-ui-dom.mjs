/* Optional real-DOM regression (not a layout/browser test).
 * npm install --prefix /tmp/rpg-dom-deps --no-save --package-lock=false jsdom@26.1.0 css-tree@3.1.0
 * NODE_PATH=/tmp/rpg-dom-deps/node_modules node scripts/test-battle-ui-dom.mjs
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
const dom=new JSDOM(html,{url:'http://phase3c.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document,context=dom.getInternalVMContext();
installDialogDomSupport(w);
w.structuredClone=structuredClone;w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
w.scrollTo=()=>{};w.alert=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
const run=code=>vm.runInContext(code,context);
for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g))run(fs.readFileSync(new URL(m[1],root),'utf8'));
const by=id=>d.getElementById(id);
const fixed=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
function checkIds(){for(const id of fixed)assert.equal(d.querySelectorAll(`[id="${id}"]`).length,1,id);}
function setup(){run(`save=initSave();completeTutorial();save.instances=[];save.party=[];
  for(const id of ['freigal','aquaron','grassbeat']){const ins=addInstance(id,10);save.party.push(ins.uid);}
  prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');
  activeHuntRequest=createHuntRequest(selectedMap,enemy,'easy',[],{allowOvertier:false});activeHuntRequest.battleMode='single';
  beginChosenBattle('grassland','slime','easy',activeHuntRequest);show('battle');`);}

function multi(){setup();run(`ensureMultiBattleDom();multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by('slime'),'enemy_a'),createMultiEnemy(by('slime'),'enemy_b')],pendingMoveIndex:null};setMultiBattleLayout(true);setupMultiBattle()`);checkIds();}

const snapshot=()=>run('JSON.stringify({pHp,eHp,battleTurnCount,items:save.items,party:partyBattle.map(e=>[e.inst.uid,e.hp]),links:kokoroLinkBattleSnapshot()})');
// Opening/cancelling uses no RNG and changes no combat/save state.
setup();run('window.qaRolls=0;window.qaRandom=Math.random;Math.random=()=>{window.qaRolls++;return .5}');
const before=snapshot(),p=by('pVis').querySelector('img');
for(const expression of ['toggleBattleSkillPanel();battleUiBack()','openBattleSwitchPicker();battleUiBack()','toggleKokoroLinkPanel();battleUiBack()','openBattleItemSelect();renewalClose()']){
 run(expression);assert.equal(snapshot(),before,expression);assert.equal(run('window.qaRolls'),0);assert.equal(by('pVis').querySelector('img'),p);
}
run('Math.random=window.qaRandom;toggleBattleSkillPanel()');
assert(by('commands').querySelector('.br-effect'));
assert(d.querySelector('.battle-command-pad').hidden);
run('battleUiBack()');assert.equal(d.activeElement.id,'battleSkillButton');
const wait=async()=>{
 for(let i=0;i<100&&run('busy');i++)await new Promise(r=>setTimeout(r,50));
 assert(!run('busy'),'action unlock');
};
// Refuse a full-HP target, then commit a single item use and one enemy turn.
run('openBattleItemSelect();renewalPickItem("potion")');
assert(by('renewalSheet').querySelector('[data-item-target="0"]').disabled);
const n=run('save.items.potion');
run('renewalUseItem()');assert.equal(run('save.items.potion'),n);
run(`renewalClose();pHp-=70;partyBattle[activePartyIdx].hp=pHp;
 enemy={...enemy,moves:[['身構える',0,'normal','guard']]};
 update();openBattleItemSelect();renewalPickItem('potion');renewalPickItemTarget(0)`);
const hurt=run('pHp'),turn=run('battleTurnCount'),enemyHp=run('eHp');
run('renewalUseItem();renewalUseItem()');await wait();
assert.equal(run('save.items.potion'),n-1);assert.equal(run('pHp'),hurt+Math.floor(50*run('playerMaxHp()')/(120+9*12)));
assert.equal(run('eHp'),enemyHp);assert.equal(run('battleTurnCount'),turn+1);
assert.equal(run('loadSave().items.potion'),n-1);assert.equal(by('pVis').querySelector('img'),p);
run('save.items.potion=0;openBattleItemSelect()');
assert(by('renewalSheet').querySelector('[data-item="potion"]').disabled);run('renewalClose()');
// The new badges retain every condition without replacing the media node.
run("pStatus='poison';pPoisonTurns=2;pParalysisTurns=2;pSleepTurns=1;pConfusionTurns=3;pGuard=true;update()");
assert.equal(by('pBattleStatus').querySelectorAll('.br-status').length,5);
assert.match(by('pBattleStatus').textContent,/毒/);
assert.equal(by('pVis').querySelector('img'),p);
// Link confirmation latches one source and applies after its animation.
setup();const linkTurn=run('battleTurnCount');
run('toggleKokoroLinkPanel();window.qaSource=currentKokoroLinkSources()[0].uid;renewalLinkPreview(window.qaSource);renewalLinkConfirm();renewalLinkConfirm()');
assert(!run('!!kokoroLinkEffectForInstance(activeInstance)'));
for(let i=0;i<60&&!run('!!kokoroLinkEffectForInstance(activeInstance)');i++)await new Promise(r=>setTimeout(r,50));
assert(run('!!kokoroLinkEffectForInstance(activeInstance)'));
assert.equal(run('battleTurnCount'),linkTurn);
assert.equal(run('currentKokoroLinkSources({includeUsed:true}).filter(s=>s.used).length'),1);
// Empty and long/many render inputs are synthetic, not new legal loadouts.
setup();run("window.qaMoves=getEquippedMovesForInstance;getEquippedMovesForInstance=()=>[];renderSkillButtons()");assert.match(by('commands').textContent,/装備中の技がありません/);
run("getEquippedMovesForInstance=()=>Array.from({length:12},()=>['長い技名'.repeat(12),24,'normal',null,null,1,'説明'.repeat(150)]);renderSkillButtons()");assert.equal(by('commands').querySelectorAll('.skill-button').length,12);run('getEquippedMovesForInstance=window.qaMoves');
// Both same-species cards keep separate state, target and media identities.
multi();
run("Object.assign(multiBattle.enemies[0],{poisonTurns:2,status:'poison',paralysisTurns:2,sleepTurns:1,guard:true});update()");
const enemyMedia=by('enemy_aVis').querySelector('img');
assert.equal(by('enemy_aStatus').querySelectorAll('.br-status').length,4);
assert.equal(by('enemy_aVis').querySelector('img'),enemyMedia);
const mBefore=snapshot();run('toggleBattleSkillPanel()');
by('enemy_bCard').querySelector('.battle-stage-slot').click();
assert.equal(run('renewalTarget().id'),'enemy_b');
assert(by('multiTargetSelect').classList.contains('hidden'));
run('battleUiBack()');assert.equal(snapshot(),mBefore);
run("multiBattle.enemies[1].alive=false;multiBattle.enemies[1].hp=0;update()");
assert.equal(run('renewalTarget().id'),'enemy_a');
assert.equal(run("battleUiMoveTarget(['防御',0,'normal','guard'])"),'自分');
// Selecting the skill strikes the selected enemy and cannot submit twice.
multi();run('toggleBattleSkillPanel()');
by('enemy_bCard').querySelector('.multi-enemy-copy').click();
run('turn(0);turn(0)');await wait();
assert.equal(run('battleTurnCount'),1);
assert(run('battleFeedback.history.some(h=>h.kind==="hp"&&h.text.includes("敵B：スライム"))'));
// Manual swap consumes one action; repeated submission while busy is ignored.
setup();run('openBattleSwitchPicker();selectBattleSwitchTarget(1);selectBattleSwitchTarget(2)');await wait();assert.equal(run('activePartyIdx'),1);assert.equal(run('battleTurnCount'),1);assert(!d.querySelector('.battle-command-pad').hidden);
// Finished and next battle clear old panels/locks.
run('toggleBattleSkillPanel();runAway();renderBattleInputState()');assert(by('commands').classList.contains('hidden'));run('toggleBattleSkillPanel();openBattleItemSelect()');assert(by('commands').classList.contains('hidden'));assert(by('battle').classList.contains('active'));
setup();assert(!run('busy'));assert(!d.querySelector('.battle-command-pad').hidden);checkIds();assert.equal(errors.length,0,errors.join('\n'));
dom.window.close();console.log('PASS Phase3C: panel cancellation/RNG/state, item refusal/success/stale double click/save reload, status badges/media, link once, same-species target/cancel/fallback, actual multi turn once, manual switch once, finished/next lifecycle.');
