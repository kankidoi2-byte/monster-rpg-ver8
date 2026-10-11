// Isolated Playwright QA: no production save is read or written.
// Run from repository root after npm install --no-save playwright and browser installation.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const out=process.env.MOTION_QA_OUT||'artifacts/three-motion-compression';
const port=Number(process.env.MOTION_QA_PORT||4187);
const expected={kimeragna:'kimeragna_v7_crf28_alpha.webm',slime:'slime_adopted_crf28_alpha.webm',elixion:'elixion_arm_fixed_crf28_alpha.webm'};
const originals=['kimeragna_v7_alpha.webm','slime_adopted_alpha.webm','elixion_arm_fixed_alpha.webm'];
const report={result:'RUNNING',cases:[],requests:[],errors:[],limitations:['Desktop Chromium with mobile viewports, not physical Galaxy/Android performance validation.','Synthetic pagehide/pageshow exercises lifecycle handlers; not an OS background/foreground test.','Encoded fps/frame count is covered by asset metadata checks; browser playback is checked for advancement and a loop.','Session decoder limit 3 is a stress test only; production default 1 must remain unchanged.']};
fs.mkdirSync(out,{recursive:true});
const write=()=>fs.writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2)+'\n');
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','inherit']});
let browser;
async function openPage({width=390,height=844,reducedMotion='no-preference',fail=false}={}){
 const context=await browser.newContext({viewport:{width,height},reducedMotion});
 const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.dismiss());
 page.on('request',r=>{if(/\.webm(?:\?|$)/.test(r.url()))report.requests.push(new URL(r.url()).pathname);});
 if(fail)await page.route('**/*crf28_alpha.webm',r=>r.abort('failed'));
 await page.goto(`http://127.0.0.1:${port}/?legacy=1`,{waitUntil:'networkidle'});
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>battleIdleLimit),1,'unchanged production decoder default');
 return {page,context};
}
async function start(page,id,multi=false,limit=1){
 await page.evaluate(({id,multi,limit})=>{
  clearTutorialUi();show('home');save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.instances=[];save.party=[];
  for(const mon of [id,...['kimeragna','slime','elixion'].filter(x=>x!==id)])save.party.push(addInstance(mon,30).uid);
  prepareBattleParty();setBattleIdleLimit(limit);
  const enemyId=id==='slime'?'elixion':'slime';
  const request=createHuntRequest(MAPS[0],by(enemyId),'normal',[]);
  request.battleMode=multi?'three_way':'single';request.secondEnemyId='elixion';
  beginChosenBattle('grassland',enemyId,'normal',request);
 },{id,multi,limit});
 await page.locator('#battle').waitFor({state:'visible'});
}
async function ready(page,count=1){
 await page.waitForFunction(n=>battleIdleRecords.size===n&&[...battleIdleRecords.values()].every(r=>r.state==='playing'&&r.video.readyState>=2&&!r.video.paused),count,{timeout:25000});
}
async function inspect(page){
 return page.evaluate(()=>[...battleIdleRecords.values()].map(r=>{
  const v=r.video,c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;
  let transparent=0,opaque=0;for(let i=3;i<data.length;i+=4){if(data[i]<8)transparent++;if(data[i]>240)opaque++;}
  const corners=[3,(c.width-1)*4+3,((c.height-1)*c.width)*4+3,data.length-1].map(i=>data[i]);
  return {src:new URL(v.currentSrc).pathname,duration:v.duration,width:v.videoWidth,height:v.videoHeight,time:v.currentTime,transparent,opaque,corners,loop:v.loop,muted:v.muted,inline:v.playsInline,posterVisible:getComputedStyle(r.img).visibility,quality:v.getVideoPlaybackQuality?.().toJSON?.()||null};
 }));
}
function verifySamples(samples){for(const s of samples){
 assert(Object.values(expected).some(name=>s.src.endsWith('/'+name)),s.src);assert(Math.abs(s.duration-8)<0.08,JSON.stringify(s));
 assert(s.width>0&&s.height>0&&s.transparent>100&&s.opaque>100,'decoded alpha and opaque interior');
 assert(s.corners.every(a=>a<8),'transparent canvas corners');assert(s.loop&&s.muted&&s.inline);assert.equal(s.posterVisible,'hidden');
}}
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`server exited ${code}`)));});
 browser=await chromium.launch({headless:true});
 for(const viewport of [{width:320,height:720},{width:360,height:780},{width:390,height:844},{width:430,height:932},{width:844,height:390}]){
  const {page,context}=await openPage(viewport);
  const registry=await page.evaluate(()=>Object.fromEntries(['kimeragna','slime','elixion'].map(id=>[id,BATTLE_IDLE_MEDIA[id].src.split('/').pop()])));assert.deepEqual(registry,expected);
  for(const id of Object.keys(expected)){
   await start(page,id);await ready(page);const samples=await inspect(page);verifySamples(samples);
   assert(samples[0].src.endsWith(expected[id]));
   await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}-${id}-single.png`});
   report.cases.push({name:`${viewport.width}x${viewport.height}-${id}-single`,samples});
  }
  await start(page,'kimeragna',true,1);await ready(page);
  assert.equal(await page.locator('#battle .battle-idle-video').count(),1,'normal multiple-combatant decoder budget');
  await page.evaluate(()=>setBattleIdleLimit(3));await ready(page,3);const samples=await inspect(page);verifySamples(samples);
  assert.equal(new Set(samples.map(s=>s.src)).size,3,'three distinct approved assets');
  await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}-multi-three-decoder-stress.png`});
  report.cases.push({name:`${viewport.width}x${viewport.height}-multi-default-and-stress`,samples});
  if(viewport.width===390){
   const loop=await page.evaluate(async()=>{
    const videos=[...battleIdleRecords.values()].map(r=>r.video),previous=videos.map(v=>v.currentTime),wraps=videos.map(()=>0),advances=videos.map(()=>0);
    const start=performance.now();while(performance.now()-start<9000){await new Promise(r=>setTimeout(r,100));videos.forEach((v,i)=>{if(v.currentTime<previous[i]-.5)wraps[i]++;if(v.currentTime>previous[i])advances[i]++;previous[i]=v.currentTime;});}return {wraps,advances};
   });assert(loop.wraps.every(n=>n>=1));assert(loop.advances.every(n=>n>10));report.cases.push({name:'actual-three-videos-loop-and-advance',...loop});
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.waitForFunction(()=>[...battleIdleRecords.values()].every(r=>r.video.paused&&r.reasons.includes('reduced')&&getComputedStyle(r.img).visibility==='visible'));
   await page.emulateMedia({reducedMotion:'no-preference'});await ready(page,3);
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide')));
   assert.equal(await page.locator('#battle .battle-idle-video').count(),0);
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow')));await ready(page,3);
   await page.evaluate(()=>setBattleIdleLimit(1));await ready(page);
   for(const index of [1,2,0,2,1,0]){
    assert(await page.evaluate(i=>changeActivePartyMember(i),index));await ready(page);
    assert.equal(await page.locator('#battle .battle-idle-video').count(),1);
   }
   await page.evaluate(()=>show('home'));assert.equal(await page.locator('.battle-idle-video').count(),0);
   report.cases.push({name:'reduced-motion-lifecycle-six-party-switches-home-disposal',result:'PASS'});
  }
  await context.close();write();
 }
 {
  const {page,context}=await openPage({reducedMotion:'reduce'});const before=report.requests.length;
  await start(page,'kimeragna',true,3);await page.waitForTimeout(500);
  assert.equal(report.requests.length,before,'cold reduced motion does not fetch video');
  assert(await page.evaluate(()=>[...battleIdleRecords.values()].every(r=>r.video.paused&&!r.video.getAttribute('src')&&getComputedStyle(r.img).visibility==='visible')));
  report.cases.push({name:'cold-reduced-motion-static-without-video-request',result:'PASS'});await context.close();
 }
 for(const id of Object.keys(expected)){
  const {page,context}=await openPage({fail:true});await start(page,id);
  await page.waitForFunction(()=>battleIdleRecords.size===1&&[...battleIdleRecords.values()].every(r=>r.failed&&r.state==='static'&&!r.video.getAttribute('src')&&getComputedStyle(r.img).visibility==='visible'));
  await page.screenshot({path:`${out}/${id}-network-failure-static.png`});
  await page.unroute('**/*crf28_alpha.webm');
  await page.evaluate(()=>{const r=[...battleIdleRecords.values()][0];r.details.open=true;r.button.click();});await ready(page);
  report.cases.push({name:`${id}-network-failure-poster-manual-retry`,result:'PASS'});await context.close();
 }
 assert(report.requests.length>0);assert(!report.requests.some(p=>originals.some(name=>p.endsWith('/'+name))),'no original videos requested');
 assert.deepEqual(report.errors,[]);report.result='PASS';write();console.log(`PASS ${report.cases.length} motion browser cases; evidence ${out}`);
}catch(error){report.result='FAIL';report.failure=error.stack;write();throw error;}
finally{if(browser)await browser.close();server.kill();}
