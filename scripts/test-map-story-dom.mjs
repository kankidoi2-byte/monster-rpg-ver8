/* Optional full-game DOM smoke test: NODE_PATH=<jsdom modules> node scripts/test-map-story-dom.mjs */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const {JSDOM,VirtualConsole}=createRequire(import.meta.url)('jsdom');
const root=new URL('../',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'http://grassland-story.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document,context=dom.getInternalVMContext();
w.structuredClone=structuredClone;w.HTMLMediaElement.prototype.pause=function(){};w.HTMLMediaElement.prototype.load=function(){};
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.alert=()=>{};w.confirm=()=>true;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
const run=code=>vm.runInContext(code,context);
for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g))run(fs.readFileSync(new URL(m[1],root),'utf8'));
const click=selector=>{const n=d.querySelector(selector);assert(n,selector);assert(!n.disabled);const code=n.getAttribute('onclick');if(code)run(code);else n.click();};
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
run(`save=initSave();completeTutorial();save.instances=[];save.party=[];for(const id of ['galdra','freigal','aquaron']){const ins=addInstance(id,1);save.party.push(ins.uid);}saveGame();playBattleSkillMotion=async()=>false;finishBattleSkillMotion=async()=>false;battleMotionDelay=async()=>{};`);
d.getElementById('titleScreen').click();await new Promise(resolve=>setTimeout(resolve,700));assert.equal(run('activeScreenId()'),'home');
click('#homePartyEditButton');assert.equal(run('activeScreenId()'),'party');click('.monster-party-button');assert.equal(run('activeScreenId()'),'partySet');click('#partySetupSaveButton');assert.equal(run('loadSave().party.length'),3);
run('openBattleHub();showWorldMapLocation("grassland")');assert.equal(run('activeScreenId()'),'battleChoices');
click('#battleChoiceList button[onclick="openMapStory()"]');assert.equal(run('activeScreenId()'),'mapStory');assert.equal(d.querySelectorAll('.map-story-card').length,11);
for(let number=1;number<=11;number++){
 const id='gl_'+String(number).padStart(2,'0');click(`#mapStory button[onclick="startMapStoryEpisode('${id}')"]`);
 while(run('mapStoryState().resume.nodeId!==null'))click('#mapStory button[onclick="advanceMapStoryNode()"]');
 click('#mapStory button[onclick="editMapStoryParty()"]');assert.equal(run('activeScreenId()'),'partySet');click('#mapStoryPartyReturn');click(`#mapStory button[onclick="startMapStoryEpisode('${id}')"]`);
 click(`#mapStory button[onclick="launchMapStoryBattle('${id}')"]`);assert.equal(run('activeScreenId()'),'battle');assert(d.getElementById('battleMapBanner').textContent.includes('草原ストーリー'));
 if(number===1){run('eHp=1;Math.random=()=>.5');await run('turn(-1)');await tick();}
 else run('if(multiBattle?.active){multiBattle.enemies.forEach(e=>{e.hp=0;e.alive=false;});winMultiBattle();}else{eHp=0;win();}');
 assert(d.getElementById('battleOutcome').classList.contains('is-victory'));
 assert.equal(d.querySelectorAll('#battleOutcomeActions button').length,1,'only story continuation; no contract');
 click('#battleOutcomeActions button');assert.equal(run('activeScreenId()'),'mapStory');
 while(run('mapStoryState().resume.nodeId!==null'))click('#mapStory button[onclick="advanceMapStoryNode()"]');
 click('#mapStory button[onclick="completeMapStoryEpisode()"]');
 if(run('activeScreenId()')==='evolution'){for(let i=0;i<10&&run('activeScreenId()')==='evolution';i++)run('cancelEvolution()');click('#mapStoryPartyReturn');}
 else if(number<11)click('#mapStory button[onclick="openMapStory()"]');
 assert(run(`mapStoryProgress('${id}').completed`));
}
run('openMapStory()');assert(d.getElementById('mapStoryContent').textContent.includes('11/11 完了'));click('#mapStory button[onclick="leaveMapStory()"]');assert.equal(run('worldMapSelectedId'),'grassland');assert.equal(run('activeScreenId()'),'battleChoices');
assert.equal(run('loadSave().mapStories.grassland_whose.episodes.gl_11.completed'),true);
assert.equal(errors.length,0,errors.join('\n'));dom.window.close();
console.log('PASS full-game DOM smoke: title/home, party save, grassland entrance, 11 pre/battle/post flows, actual attack, dedicated result, evolution return, save/reload, grassland return. Layout and physical Android verification remain separate.');
