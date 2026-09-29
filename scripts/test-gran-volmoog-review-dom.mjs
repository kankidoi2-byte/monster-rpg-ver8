// Actual game integration, media API mocked. Not a browser/layout/decode pass.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const {JSDOM,VirtualConsole}=createRequire(import.meta.url)('jsdom');
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const wrapper=new JSDOM(read('tools/motion-review/gran-volmoog-review.generated.html'));
const frame=wrapper.window.document.querySelector('iframe');
assert.equal(frame.getAttribute('sandbox'),'allow-scripts allow-same-origin');
const html=frame.getAttribute('srcdoc');wrapper.window.close();
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'http://review.test/tools/motion-review/gran-volmoog-review.generated.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document,run=s=>vm.runInContext(s,dom.getInternalVMContext());
const persistedLocal=w.localStorage,persistedSession=w.sessionStorage;
persistedLocal.setItem('mb_v95c','existing-save');persistedSession.setItem('existing','keep');
w.structuredClone=structuredClone;w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
w.alert=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLMediaElement.prototype.canPlayType=()=> 'probably';
Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get(){return this._paused!==false;}});
w.HTMLMediaElement.prototype.pause=function(){this._paused=true;};w.HTMLMediaElement.prototype.load=function(){};
w.HTMLMediaElement.prototype.play=function(){this._paused=false;this.dispatchEvent(new w.Event('playing'));return Promise.resolve();};
for(const script of d.querySelectorAll('script')){
 const src=script.getAttribute('src');run(src?read(src.split('?')[0]):script.textContent);
}
const tick=()=>new Promise(r=>setTimeout(r,0));await tick();
assert.equal(run('by("gran_volmoog").id'),'gran_volmoog');
assert.equal(run('battleIdleLimit'),1);
assert.equal(run('safeStorageSet("qa_only","test")'),true);
assert.equal(w.localStorage.getItem('qa_only'),'test');
const results=[];
for(const mode of ['ally','enemy','multi']){
 assert(run(`granReviewSetup('${mode}')`));await tick();
 const videos=[...d.querySelectorAll('video')];assert.equal(videos.length,mode==='multi'?3:1);
 for(const video of videos){assert(video.src.endsWith('/images/monsters/motion/gran_volmoog_v18_alpha.webm'));assert(!video.paused);video.currentTime=3;}
 assert.equal(d.querySelector('#pVis .battle-facing').style.transform,mode==='enemy'?'':'scaleX(-1)');
 run(mode==='multi'?'pHp--;multiBattle.enemies[0].hp--;updateMultiBattleView()':'pHp--;eHp--;update()');
 assert.deepEqual([...d.querySelectorAll('video')],videos);assert(videos.every(v=>v.currentTime===3));
 run('openBattleItemSelect()');assert(videos.every(v=>v.paused));
 run("show('battle');update()");await tick();assert(videos.every(v=>!v.paused));
 const oldPlaying=videos[0].onplaying;run("show('home')");oldPlaying();assert.equal(d.querySelectorAll('video').length,0);
 results.push({mode,nodeRetention:true,itemPauseResume:true,exitAndStaleCallback:true});
}
run("granReviewSetup('ally')");await tick();
let v=d.querySelector('video');v.dispatchEvent(new w.Event('error'));
assert.equal(d.querySelector('#pVis img').style.visibility,'visible');
run('update();update()');assert.equal(d.querySelector('video'),v);
run('battleIdleRecord.button.click()');await tick();assert.notEqual(d.querySelector('video'),v);
run('changeActivePartyMember(1)');assert.equal(d.querySelectorAll('video').length,0);
assert.equal(run("granReviewSetup('invalid')"),false);
assert.equal(run("granReviewSetup('ally','invalid')"),false);
const maps=Array.from(run('MAPS.map(m=>m.id)'));
for(const id of maps){assert(run(`granReviewSetup('ally',${JSON.stringify(id)})`));await tick();assert.equal(d.querySelectorAll('video').length,1);}
// Phase C: switching species disposes old media and uses each adopted source.
for(const id of ['shenhairon','tienhairon','slime_gold','false_dragon_beta','false_dragon_gamma','goblin','nightmare','astralepis','nemes','nemesia','nemesion','doom_nemesion','false_dragon_alfa','volteck','spaquinn','voltax','freigal','freiwolf','aquaron','highaquaron','grassbeat','thornbeat','granbeat','rikasheef','seralphia','sylphin','zephyray','tempestray']){
 const selector=d.querySelector('[aria-label="確認モンスター"]');
 selector.value=id;const previous=[...d.querySelectorAll('video')];selector.dispatchEvent(new w.Event('change'));await tick();
 assert(previous.every(v=>!v.isConnected));assert.equal(run('granReviewSpecies'),id);
 for(const mode of ['ally','enemy','multi']){
  run(`granReviewSetup('${mode}')`);await tick();
  const vs=[...d.querySelectorAll('video')];assert.equal(vs.length,mode==='multi'?3:1);
  assert(vs.every(v=>v.src.endsWith('/'+run(`BATTLE_IDLE_MEDIA['${id}'].src`))));
  const facing=mode==='enemy'?d.querySelector('#eVis .battle-facing'):d.querySelector('#pVis .battle-facing');
  const flip=run(`BATTLE_IDLE_MEDIA['${id}'].${mode==='enemy'?'enemyFlip':'allyFlip'}`);
  assert.equal(facing.style.transform,flip?'scaleX(-1)':'');
  run(mode==='multi'?'pHp--;updateMultiBattleView()':'pHp--;update()');assert.deepEqual([...d.querySelectorAll('video')],vs);
 }
}
// Non-square 720x640 source inside a 360x360, bottom-aligned media box.
run("granReviewSetup('ally','grassland','slime_gold')");await tick();
const squareMedia=d.querySelector('.battle-static-media.has-idle-media');
squareMedia.getBoundingClientRect=()=>({left:10,top:20,width:360,height:360,right:370,bottom:380});
const body=run('granReviewMeasure().units[0].body');
assert.equal(body.left,33.5);assert.equal(body.right,342);
assert.equal(body.top,92.5);assert.equal(body.bottom,339.5);
assert.equal(run("granReviewSetup('ally','grassland','invalid')"),false);
run("granReviewSetup('ally','grassland','gran_volmoog')");
// Exercise diagnostic orchestration with accelerated waits and a mocked Range response.
const realTimeout=w.setTimeout.bind(w);w.setTimeout=(fn,ms,...args)=>realTimeout(fn,ms===16000||ms===1500?0:ms,...args);
w.fetch=async(url,options)=>{assert.equal(options.headers.Range,'bytes=0-1023');assert(String(url).endsWith('gran_volmoog_v18_alpha.webm'));return {status:206,headers:new Map([['content-type','video/webm'],['content-range','bytes 0-1023/1758952']]),arrayBuffer:async()=>new ArrayBuffer(1024)};};
const measurement=await run('granReviewCollect()');
assert.equal(measurement.samples.length,3);assert.equal(measurement.delivery.status,206);assert.equal(measurement.delivery.bytes,1024);
assert.deepEqual(Array.from(measurement.samples,s=>s.videos.length),[1,1,3]);
assert([...d.querySelectorAll('#granReviewControls button')].every(b=>!b.disabled));
assert(d.getElementById('granReviewResult').textContent.includes('計測結果'));
assert(d.getElementById('granMetricsDetails'));
w.setTimeout=realTimeout;
run("show('home')");assert.equal(persistedLocal.getItem('mb_v95c'),'existing-save');assert.equal(persistedLocal.length,1);assert.equal(persistedSession.getItem('existing'),'keep');assert.equal(persistedSession.length,1);dom.window.close();assert.deepEqual(errors,[]);
assert(!read('index.html').includes('gran-volmoog'),'Candidate must not enter normal index');
assert(read('js/battle-idle-media.js').includes('gran_volmoog'),'Normal registry must include gran');
const bytes=fs.readFileSync(new URL('tools/motion-review/assets/gran_volmoog_v18_alpha.webm',root));
assert.equal(bytes.length,1758952);
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),'1546cc7f824110e77e71daf0fa02f6b1c5bc68886e48815da885105867cb5e00');
console.log(JSON.stringify({scope:'Gran Volmoog isolated actual-game DOM integration; media mocked; no browser layout or performance claim',results,maps:maps.length,errorFallback:true,retry:true,switchDisposal:true,sourceHash:true,normalRegistryUsed:true},null,2));
