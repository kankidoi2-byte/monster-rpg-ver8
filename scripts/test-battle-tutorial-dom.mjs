/* Optional real-DOM regression (not a layout/browser test).
 * npm install --prefix /tmp/phase3b-dom jsdom
 * NODE_PATH=/tmp/phase3b-dom/node_modules node scripts/test-battle-tutorial-dom.mjs
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
w.structuredClone=structuredClone;w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
w.alert=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
const run=code=>vm.runInContext(code,context);
for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g))run(fs.readFileSync(new URL(m[1],root),'utf8'));
const by=id=>d.getElementById(id);

// Real DOM and combat handlers at the initial rescue checkpoint.
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const step=()=>run('tutorialCurrentStepId()');
const click=node=>{assert(node,'target exists');assert(!node.disabled,'target enabled');const code=node.getAttribute('onclick');if(code)run(code);else node.click();};
const expect=id=>{assert.equal(step(),id);assert(run('tutorialUiState.target')?.isConnected,`${id}: connected spotlight`);assert(!run('tutorialUiState.target')?.closest('[hidden],.hidden'),`${id}: visible spotlight`);};
run("save=initSave();Math.random=()=>0;ensureTutorialStarterContracts();startTutorialRescueBattle();startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'battle_enemy',persist:true})");
expect('battle_enemy');assert.equal(run('tutorialUiState.target.id'),'singleEnemyBox');assert.match(by('tutorialText').textContent,/名前の横/);
click(by('tutorialNextButton'));await pause(60);expect('battle_actor_open');
click(by('battleSwitchButton'));await pause(60);expect('battle_actor_select');
click(d.querySelector('[data-tutorial-actor-select]'));for(let i=0;i<200&&run('busy');i++)await pause(50);await pause(60);expect('battle_target');assert.equal(run('tutorialUiState.target.id'),'eVis');assert(by('eVis').querySelector('img,video'));
by('eVis').click();await pause(60);expect('battle_attack_open');
click(by('battleSkillButton'));await pause(60);expect('battle_normal_attack');assert(!by('commands').classList.contains('hidden'));
click(d.querySelector('[data-tutorial-normal-attack]'));for(let i=0;i<200&&(run('busy')||step()==='battle_normal_attack');i++)await pause(50);expect('battle_skill');assert.equal(run('battleTurnCount'),2);
click(by('battleSkillButton'));await pause(60);expect('battle_choose_skill');assert(!by('commands').classList.contains('hidden'));assert.match(by('tutorialText').textContent,/効果・対象・装備コスト/);
click(d.querySelector('[data-tutorial-skill]'));for(let i=0;i<200&&(run('busy')||step()==='battle_choose_skill');i++)await pause(50);expect('battle_free');assert(run('tutorialUiState.target.classList.contains("battle-command-pad")'));assert(run('tutorialBattleSession.firstSkillUsed'));assert(!run('busy'));
// Unchanged step IDs/checkpoint permit an interrupted save to resume safely.
assert.equal(run('loadSave().progress.tutorial.stepId'),'elna_rescue_start');
run('clearTutorialUi();completeTutorial();multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by("goblin"),"enemy_a"),createMultiEnemy(by("slime"),"enemy_b")],pendingMoveIndex:null};ensureMultiBattleDom();setMultiBattleLayout(true);setupMultiBattle();startTutorialFlow(TUTORIAL_THREE_WAY_FLOW_ID,{stepId:"three_way_target",returnScreen:"battle"})');
expect('three_way_target');assert.match(by('tutorialText').textContent,/敵の画像かHP欄/);assert.match(by('tutorialText').textContent,/技に戻る/);
run('clearTutorialUi();startTutorialFlow(TUTORIAL_EVOLUTION_FLOW_ID,{stepId:"evolution_intro"})');await pause(60);assert.match(by('tutorialText').textContent,/「次へ」で結果画面を閉じる/);
assert.equal(errors.length,0,errors.join('\n'));dom.window.close();console.log('PASS battle tutorial: current HUD/image/pad highlights; real switch/normal attack/equipped skill; operation waits; stable resume checkpoint; multi-target and evolution instructions. DOM only, no pixel-layout assertion.');
