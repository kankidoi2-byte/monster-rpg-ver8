import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const out='artifacts/soul-contract';fs.mkdirSync(out,{recursive:true});
const report={cases:[],screenshots:[],videos:[],errors:[],performance:[],limitations:['Chromium mobile emulation, not a physical Android/Galaxy device','Existing runtime has no audio or volume system; this cinematic remains silent']};
const write=()=>fs.writeFileSync(`${out}/manifest.json`,JSON.stringify(report,null,2));
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4192'],{stdio:['ignore','pipe','inherit']});let browser;
const origin='http://127.0.0.1:4192';
async function fixture(page){
 await page.goto(`${origin}/?legacy=1`,{waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{clearTutorialUi();save=initSave();save.party=[addInstance('freigal',1).uid];migrateSkillSystem();save.coins=10000;save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);ensureContractorState().pendingRankUps=[];clearTimeout(contractorRankUpTimer);saveGame();show('characterGacha');});
}
async function fixedDraw(page,ids){
 return page.evaluate(ids=>{const original=pickCharacterGachaUnit;let i=0;pickCharacterGachaUnit=()=>M.find(m=>m.id===ids[i++]);const before={coins:save.coins,count:save.instances.length};try{rollCharacterGacha(ids.length);}finally{pickCharacterGachaUnit=original;}return before;},ids);
}
async function screenshot(page,name){await page.screenshot({path:`${out}/${name}.png`});report.screenshots.push(`${name}.png`);write();}
async function waitStage(page,stage){await page.waitForFunction(stage=>document.querySelector('#soulContractPresentation')?.dataset.stage===stage,stage,{timeout:15000});}
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[360,800],[390,844],[430,932],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.dismiss());await fixture(page);
  const before=await fixedDraw(page,['character_vera_3']);await waitStage(page,'souls');
  assert.equal(await page.locator('.soul-orbit .soul-star').count(),1);
  await waitStage(page,'gold');await screenshot(page,`${width}-gold-contract`);
  assert.equal(await page.locator('#soulContractPresentation').getAttribute('data-rarity'),'3');
  assert.equal(await page.locator('.soul-document svg text').count(),0,'contract contains original paths rather than readable language');
  await waitStage(page,'reveal');await page.waitForTimeout(450);
  assert.equal(await page.locator('.soul-name').textContent(),await page.evaluate(()=>M.find(x=>x.id==='character_vera_3').name));
  assert(await page.locator('.soul-portrait img').evaluate(img=>img.complete&&img.naturalWidth>0),'latest game artwork loaded');
  const bounds=await page.locator('.soul-skip,.soul-caption,.soul-progress,.soul-portrait img').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {name:el.className,x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};}));
  assert(bounds.every(r=>r.x>=0&&r.y>=0&&r.right<=width+1&&r.bottom<=height+1),'cinematic controls/art fit viewport');
  assert(await page.locator('.soul-skip').evaluate(el=>el.getBoundingClientRect().height>=44),'skip target accessible');
  report.performance.push({width,height,frames:await page.evaluate(()=>soulContractPresentation?.frames),canvasPixels:await page.locator('.soul-sky').evaluate(c=>c.width*c.height),note:'bounded 100 stars; capped DPR1.5 and 30fps draw cadence'});
  await screenshot(page,`${width}-reveal`);
  await page.locator('.soul-skip').click();assert.equal(await page.locator('#soulContractPresentation').count(),0);
  assert.equal(await page.evaluate(()=>save.coins),before.coins-100);assert.equal(await page.evaluate(()=>save.instances.length),before.count+1);
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'');assert.equal(await page.locator('body>[inert]').count(),0);
  report.cases.push({name:`single-gold-${width}x${height}`,result:'PASS'});
  // Navigation cancellation leaves committed result intact and unblocks keyboard.
  await fixedDraw(page,['elna_beginner']);await page.evaluate(()=>show('home'));assert.equal(await page.locator('#soulContractPresentation').count(),0);assert(await page.locator('#home').isVisible());
  await context.close();write();
 }
 // Record actual uninterrupted single and ten results; only test harness picks deterministic results.
 for(const [name,ids] of [['single',['elna_beginner']],['ten',['elna_beginner','stella_apprentice','character_vera_3','lumina_apprentice','elna_beginner','stella_apprentice','lumina_apprentice','character_vera_3','elna_beginner','stella_apprentice']]]){
  const context=await browser.newContext({viewport:{width:390,height:844},recordVideo:{dir:out,size:{width:390,height:844}}});await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>d.dismiss());await fixture(page);
  await page.evaluate(()=>{window.soulEvents=[];window.soulObserver=new MutationObserver(()=>{const el=document.querySelector('#soulContractPresentation');if(el)window.soulEvents.push({stage:el.dataset.stage,index:Number(el.dataset.index),unit:el.dataset.unitId,gold:el.classList.contains('is-gold'),lit:el.querySelectorAll('.soul-progress .is-lit').length});});window.soulObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-stage']});});
  const before=await fixedDraw(page,ids);await waitStage(page,'souls');assert.equal(await page.locator('.soul-star').count(),ids.length);
  await screenshot(page,`${name}-soul-stars`);
  // Repeated calls during animation cannot spend or award again.
  await page.evaluate(()=>{rollCharacterGacha(1);rollCharacterGacha(10);});
  await page.locator('#soulContractPresentation').waitFor({state:'detached',timeout:90000});await page.waitForTimeout(500);
  const events=await page.evaluate(()=>{window.soulObserver.disconnect();return window.soulEvents;});
  const reveals=events.filter(e=>e.stage==='reveal');assert.deepEqual(reveals.map(e=>e.unit),ids);
  assert.deepEqual(events.filter(e=>e.stage==='gold').map(e=>e.index),ids.map((id,i)=>id==='character_vera_3'?i:-1).filter(i=>i>=0));
  assert.equal(await page.evaluate(()=>save.coins),before.coins-(ids.length===10?900:100));assert.equal(await page.evaluate(()=>save.instances.length),before.count+ids.length);
  assert.equal(await page.locator('#characterGachaResult article').count(),ids.length);
  await screenshot(page,`${name}-results`);await page.waitForTimeout(1000);
  const video=page.video();await context.close();const original=await video.path();fs.renameSync(original,`${out}/${name}-runtime.webm`);report.videos.push(`${name}-runtime.webm`);report.cases.push({name:`actual-${name}-order-gold-repeat`,result:'PASS',events});write();
 }
 // Recovery + save failure are exercised against real storage, no acquired result may vanish.
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());const page=await context.newPage();page.on('dialog',d=>d.dismiss());page.on('pageerror',e=>report.errors.push(e.message));await fixture(page);
 const before=await fixedDraw(page,['elna_beginner']);await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});await page.evaluate(()=>show('characterGacha'));
 assert.equal(await page.evaluate(()=>save.coins),before.coins-100);assert.equal(await page.evaluate(()=>save.instances.length),before.count+1);assert.equal(await page.locator('#characterGachaResult article').count(),1);report.cases.push({name:'reload-recovers-paid-result-on-gacha-entry',result:'PASS'});
 const failed=await page.evaluate(()=>{const original=safeStorageSet;const before=JSON.stringify(save);safeStorageSet=(key,value)=>key===SAVE_KEY?false:original(key,value);try{rollCharacterGacha(1);}finally{safeStorageSet=original;}return {same:JSON.stringify(save)===before,overlay:!!document.querySelector('#soulContractPresentation')};});assert(failed.same&&!failed.overlay,'failed save rolls back and starts no cinematic');report.cases.push({name:'storage-failure-rollback',result:'PASS'});
 await page.emulateMedia({reducedMotion:'reduce'});await fixedDraw(page,['stella_apprentice']);await page.locator('#soulContractPresentation').waitFor({state:'detached',timeout:10000});report.cases.push({name:'reduced-motion-completes',result:'PASS'});
 await context.close();assert.deepEqual(report.errors,[]);report.status='PASS';write();console.log('PASS Soul Contract mobile, order, rare timing, skip, recovery, save failure, recordings');
}catch(error){report.status='FAIL';report.failure=error.stack;write();for(const [i,p] of (browser?.contexts().flatMap(c=>c.pages())||[]).entries())try{await p.screenshot({path:`${out}/failure-${i}.png`});}catch{}throw error;}finally{await browser?.close();server.kill();}
