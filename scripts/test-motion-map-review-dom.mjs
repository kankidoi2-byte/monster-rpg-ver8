// Actual game scripts + review adapter, mocked Media API. No layout/decode claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const {JSDOM,VirtualConsole}=createRequire(import.meta.url)('jsdom');
const root=new URL('../',import.meta.url),html=fs.readFileSync(new URL('index.html',root),'utf8');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{url:'http://motion.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document,context=dom.getInternalVMContext(),run=s=>vm.runInContext(s,context);
w.structuredClone=structuredClone;w.matchMedia=()=>({matches:false,addEventListener(){}});
w.alert=()=>{};w.confirm=()=>true;w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLMediaElement.prototype.canPlayType=()=> 'probably';
Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get(){return this._paused!==false;}});
w.HTMLMediaElement.prototype.pause=function(){this._paused=true;};
w.HTMLMediaElement.prototype.load=function(){};
w.HTMLMediaElement.prototype.play=function(){this._paused=false;this.dispatchEvent(new w.Event('playing'));return Promise.resolve();};
for(const m of html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g))run(fs.readFileSync(new URL(m[1],root),'utf8'));
run(`function qaReport(){} function qaSetup(){save=initSave();completeTutorial();save.instances=[];save.party=[];
 for(const id of ['volmoog','aquaron']){const ins=addInstance(id,10);save.party.push(ins.uid);}
 prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='single';beginChosenBattle('grassland','slime','normal',activeHuntRequest);show('battle');}`);
run(fs.readFileSync(new URL('tools/motion-review/qa-map-motion.js',root),'utf8'));
const maps=JSON.parse(fs.readFileSync(new URL('docs/motion-prepublication/map-audit.json',root))).maps;
const results=[];
for(let offset=0;offset<maps.length;offset+=3){
 const batch=[];
 for(const map of maps.slice(offset,offset+3)){
  assert(run(`qaMapMotion(${JSON.stringify(map.id)},3)`));
  await new Promise(r=>setTimeout(r,0));
  assert.equal(run('selectedMap.id'),map.id);
  assert(d.querySelector('.battle-arena').style.backgroundImage.includes(map.src));
  assert.equal(d.querySelectorAll('video').length,3);
  const videos=[...d.querySelectorAll('video')];
  run('pHp--;multiBattle.enemies[0].hp--;updateMultiBattleView()');
  assert.deepEqual([...d.querySelectorAll('video')],videos);
  run("show('home')");assert.equal(d.querySelectorAll('video').length,0);
  batch.push(map.id);
 }
 results.push({batch:results.length+1,maps:batch,pass:true});
}
assert.equal(run("qaMapMotion('not-a-map',3)"),false);
assert.equal(run("qaMapMotion('grassland',2)"),false);
assert(!html.includes('qa-map-motion'),'Review adapter must not enter production index');
assert.equal(run('Object.keys(BATTLE_IDLE_MEDIA).length'),50,'All Phase C evaluation registrations retained');
run(fs.readFileSync(new URL('tools/motion-review/gran-volmoog-scenario.js',root),'utf8'));
for(const map of maps){
 assert(run(`granReviewSetup('mixed',${JSON.stringify(map.id)},'elixion')`));
 await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(Array.from(run('[...battleIdleRecords.values()].map(r=>Object.entries(BATTLE_IDLE_MEDIA).find(([,c])=>c===r.config)[0])')),['elixion','orca_abyss','slime']);
 run("show('home')");assert.equal(d.querySelectorAll('video').length,0);
}
run("granReviewSetup('enemy','forest','slime')");
assert.equal(run('granReviewMode'),'enemy');
const cycle=new Set();
for(let i=0;i<50;i++){cycle.add(run('granReviewSpecies'));assert(run('granReviewStep(1)'));assert.equal(run('granReviewMode'),'enemy');assert.equal(run('granMap.value'),'forest');}
assert.equal(cycle.size,50,'next traverses each registered species once');
assert.equal(run('granReviewSpecies'),'slime','cycle wraps without omission');
const before=run('granReviewSpecies');run('granReviewStep(-1);granReviewStep(1)');assert.equal(run('granReviewSpecies'),before);
const videoCount=d.querySelectorAll('video').length;
run('granReviewToggleSizeGallery()');assert.equal(d.querySelectorAll('[data-size-species]').length,50);assert.equal(d.querySelectorAll('video').length,videoCount,'gallery allocates no decoders');
d.querySelector('[data-size-species="elixion"]').click();assert.equal(run('granReviewSpecies'),'elixion');assert(d.getElementById('granReviewSizeGallery').hidden);
assert(d.getElementById('granReviewProgress').textContent.includes('120%'));
run("granMap.value='grassland';granMap.onchange()");assert.equal(run('selectedMap.id'),'grassland');assert.equal(run('granReviewMode'),'enemy');
// Diagnostic projection must reuse enemy depth and preserve pair-level rectangles.
run("granReviewSetup('mixed','grassland','elixion')");
const arena=d.querySelector('.battle-arena');arena.dataset.sizeUnit='100';arena.dataset.enemyDepth='.85';
const media=[...d.querySelectorAll('.battle-static-media.has-idle-size')];
for(const el of media){
 Object.defineProperty(el,'clientWidth',{configurable:true,value:200});
 Object.defineProperty(el,'clientHeight',{configurable:true,value:200});
 el.getBoundingClientRect=()=>({left:0,right:200,top:0,bottom:200,width:200,height:200});
}
const measured=run('granReviewMeasure()');
for(const u of measured.units){
 const config=run(`BATTLE_IDLE_MEDIA[${JSON.stringify(u.side==='pVis'?'elixion':u.side==='enemy_aVis'?'orca_abyss':'slime')}]`);
 const expected=100*(u.side==='pVis'?1:.85)*config.layout.scale;
 assert(Math.abs(Math.max(u.body.right-u.body.left,u.body.bottom-u.body.top)-expected)<.001,'projection must match runtime perspective');
 assert(Array.isArray(u.hudComparisons),'diagnostics retain per-HUD evidence');
}
run("show('home')");assert.equal(d.querySelectorAll('video').length,0);
dom.window.close();assert.equal(errors.length,0,errors.join('\n'));
console.log(JSON.stringify({scope:'19 background bindings in batches of at most3; DOM/media mocks only; horizon/body/HUD visual acceptance pending',results,passed:maps.length,mixedSpeciesMaps:maps.length,sizeReview:{speciesCycle:cycle.size,galleryCards:50,modeAndBackgroundPreserved:true,galleryAddsDecoders:false}},null,2));
