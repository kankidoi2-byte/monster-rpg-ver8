/* Optional real-DOM regression (not a layout/browser test).
 * npm install --prefix /tmp/phase3b-dom jsdom
 * NODE_PATH=/tmp/phase3b-dom/node_modules node scripts/test-battle-journey-dom.mjs
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

// Full game DOM, normal navigation handlers, isolated test save only.
const checks=[];
const act=node=>{assert(node,'UI action exists');assert(!node.disabled,'UI action enabled');const code=node.getAttribute('onclick');if(code)run(code);else node.click();};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const settled=async(outcomeAllowed=false)=>{for(let i=0;i<200&&run('busy')&&!(outcomeAllowed&&run('battleFeedback.finished'));i++)await pause(50);assert(!run('busy')||(outcomeAllowed&&run('battleFeedback.finished')),'battle action unlocks or reaches outcome');};
run(`save=initSave();completeTutorial();const tutorial=currentTutorialState();tutorial.guides={kokoroLink:true,invasion:true,threeWay:true,shopItems:true,evolutionFusion:true};save.instances=[];save.party=[];for(const id of ['elixion','aquaron','freigal']){const ins=addInstance(id,10);save.party.push(ins.uid);}save.items.contract_scroll=3;saveGame();Math.random=()=>.5;`);
by('titleScreen').click();await pause(700);assert.equal(run('activeScreenId()'),'home');checks.push('title to home');
act(by('homePartyEditButton'));assert.equal(run('activeScreenId()'),'partySet');
act(by('partySetupSaveButton'));assert.equal(run('loadSave().party.length'),3);checks.push('party save/reload');
function resolveEvolution(){for(let i=0;i<10&&run('activeScreenId()')==='evolution';i++)run('cancelEvolution()');}
function depart(){
 resolveEvolution();
 if(run('activeScreenId()')!=='battleChoices'){run("show('partySet')");act(d.querySelector('#partyCurrentCard button[onclick="startBattleFromParty()"]'));}
 assert.equal(run('activeScreenId()'),'battleChoices');
 if(!d.querySelector('[data-wm-place="grassland"]'))run('showWorldMapOverview()');
 act(d.querySelector('[data-wm-place="grassland"]'));
 act(d.querySelector('[data-wm-difficulty="easy"]'));act(d.querySelector('[data-wm-depart]'));
 assert.equal(run('activeScreenId()'),'battle');assert(run('activeHuntRequest.worldMapExploration'));assert(!run('busy'));assert(!by('battle').classList.contains('is-finished'));checks.push('world map/easy departure');
}
depart();
act(by('battleSkillButton'));assert(!by('commands').classList.contains('hidden'));act(by('commands').querySelector('[data-battle-panel-back]'));checks.push('skills/back');
act(by('battleItemButton'));assert.equal(run('activeScreenId()'),'battleItemSelect');act(by('battleItemBack'));assert.equal(run('activeScreenId()'),'battle');checks.push('item/back');
act(by('battleEscapeButton'));assert(by('battleOutcome').classList.contains('is-retreat'));act(by('next'));assert.equal(run('activeScreenId()'),'battleChoices');checks.push('retreat/next');
depart();run('eHp=1');act(by('battleSkillButton'));act(by('commands').querySelector('.skill-button'));await settled(true);assert(by('battleOutcome').classList.contains('is-victory'));assert(run('battleRewardGranted'));assert(!by('next').classList.contains('hidden'));checks.push('actual attack/victory/rewards');
const coins=run('save.coins');run('win()');assert.equal(run('save.coins'),coins,'reward once');
const contractButton=by('battleOutcomeActions').querySelector('button');assert(contractButton,'victory contract offer');act(contractButton);assert.equal(run('activeScreenId()'),'contractConfirm');
const count=run('save.instances.length'),scrolls=run('save.items.contract_scroll');run('Math.random=()=>0');act(d.querySelector('#contractConfirm button[onclick="useContractScrollConfirmed()"]'));await settled();assert.equal(run('save.instances.length'),count+1);assert.equal(run('save.items.contract_scroll'),scrolls-1);assert(run('singleBattleContractAttempted'));assert.equal(run('activeScreenId()'),'battle');assert(run('pendingEvolutions.length>0'),'evolution remains queued during contract');assert.equal(run('loadSave().instances.length'),count+1);checks.push('contract success/remains on outcome/save');
act(by('next'));resolveEvolution();run('Math.random=()=>.5');depart();run('eHp=1');act(by('battleSkillButton'));act(by('commands').querySelector('.skill-button'));await settled(true);
act(by('battleOutcomeActions').querySelector('button'));const count2=run('save.instances.length'),scrolls2=run('save.items.contract_scroll');run('Math.random=()=>.99');act(d.querySelector('#contractConfirm button[onclick="useContractScrollConfirmed()"]'));await settled();assert.equal(run('save.instances.length'),count2);assert.equal(run('save.items.contract_scroll'),scrolls2-1);assert(run('singleBattleContractAttempted'));assert.equal(run('activeScreenId()'),'battle');checks.push('contract failure/attempt once/outcome retained');
act(by('next'));run('Math.random=()=>.5');depart();run('pHp=1;partyBattle[activePartyIdx].hp=1;partyBattle.forEach((p,i)=>{if(i!==activePartyIdx){p.hp=0;p.fainted=true;}});eHp=100000;Math.random=()=>0;update()');act(by('battleSkillButton'));act(by('commands').querySelector('.skill-button'));await settled(true);assert(by('battleOutcome').classList.contains('is-defeat'));act(by('next'));depart();assert(!run('busy'));assert.equal(run('battleTurnCount'),0);assert(!d.querySelector('.battle-command-pad').hidden);checks.push('enemy attack/defeat/restart/cleared locks');
assert.equal(errors.length,0,errors.join('\n'));dom.window.close();console.log('PASS normal journey: '+checks.join('; '));
