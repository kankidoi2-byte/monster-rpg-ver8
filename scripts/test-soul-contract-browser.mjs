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
 await page.evaluate(()=>{clearTutorialUi();save=initSave();save.party=[addInstance('freigal',1).uid];migrateSkillSystem();save.coins=10000;save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);ensureContractorState().pendingRankUps=[];clearTimeout(contractorRankUpTimer);if(!saveGame())throw Error('fixture save failed');show('characterGacha');});
}
async function fixedDraw(page,ids){
 return page.evaluate(async ids=>{const original=pickCharacterGachaUnit;let i=0;pickCharacterGachaUnit=()=>{const id=ids[i++];return M.find(m=>m.id===id);};const before={coins:save.coins,count:save.instances.length};try{const result=await rollCharacterGacha(ids.length);if(!result?.ok)throw Error('Draw failed: '+JSON.stringify(result));}finally{pickCharacterGachaUnit=original;}return before;},ids);
}
async function screenshot(page,name){await page.screenshot({path:`${out}/${name}.png`});report.screenshots.push(`${name}.png`);write();}
async function waitStage(page,stage){await page.waitForFunction(stage=>document.querySelector('#soulContractPresentation')?.dataset.stage===stage,stage,{timeout:15000});}
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[360,800],[390,844],[430,932],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>{report.cases.push({dialog:d.message()});d.dismiss();});page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log('BROWSER',m.text());});await fixture(page);
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
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('dialog',d=>{report.cases.push({dialog:d.message()});d.dismiss();});page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log('BROWSER',m.text());});await fixture(page);
  await page.evaluate(()=>{window.soulEvents=[];window.soulObserver=new MutationObserver(records=>{const el=document.querySelector('#soulContractPresentation');if(el&&records.some(r=>r.type==='attributes'&&r.attributeName==='data-stage'&&r.target===el))window.soulEvents.push({stage:el.dataset.stage,index:Number(el.dataset.index),unit:el.dataset.unitId,gold:el.classList.contains('is-gold'),lit:el.querySelectorAll('.soul-progress .is-lit').length});});window.soulObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-stage']});});
  const before=await fixedDraw(page,ids);await waitStage(page,'souls');assert.equal(await page.locator('.soul-star').count(),ids.length);
  await screenshot(page,`${name}-soul-stars`);
  // Repeated calls during animation cannot spend or award again.
  await page.evaluate(()=>{rollCharacterGacha(1);rollCharacterGacha(10);});
  await page.locator('#soulContractPresentation').waitFor({state:'detached',timeout:90000});await page.waitForTimeout(500);
  const events=await page.evaluate(()=>{window.soulObserver.disconnect();return window.soulEvents;});
  const reveals=events.filter(e=>e.stage==='reveal');assert.deepEqual(reveals.map(e=>e.unit),ids);assert.deepEqual(reveals.map(e=>e.lit),ids.map((_,i)=>i),'progress advances once per completed prior contract');
  assert.deepEqual(events.filter(e=>e.stage==='gold').map(e=>e.index),ids.map((id,i)=>id==='character_vera_3'?i:-1).filter(i=>i>=0));
  assert.equal(await page.evaluate(()=>save.coins),before.coins-(ids.length===10?900:100));assert.equal(await page.evaluate(()=>save.instances.length),before.count+ids.length);
  assert.equal(await page.locator('#characterGachaResult article').count(),ids.length);
  if(await page.locator('#contractorRankUpOverlay').isVisible()){await page.locator('#contractorRankUpOverlay button').click();await page.waitForTimeout(200);}
  await screenshot(page,`${name}-results`);await page.waitForTimeout(1800);
  const video=page.video();await context.close();const original=await video.path();fs.renameSync(original,`${out}/${name}-runtime.webm`);report.videos.push(`${name}-runtime.webm`);report.cases.push({name:`actual-${name}-order-gold-repeat`,result:'PASS',events});write();
 }
 // Recovery + save failure are exercised against real storage, no acquired result may vanish.
 const context=await browser.newContext({viewport:{width:390,height:844}});await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());const page=await context.newPage();page.on('dialog',d=>{report.cases.push({dialog:d.message()});d.dismiss();});page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')console.log('BROWSER',m.text());});page.on('pageerror',e=>report.errors.push(e.message));await fixture(page);
 const before=await fixedDraw(page,['elna_beginner']);await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});await page.evaluate(()=>show('characterGacha'));
 assert.equal(await page.evaluate(()=>save.coins),before.coins-100);assert.equal(await page.evaluate(()=>save.instances.length),before.count+1);assert.equal(await page.locator('#characterGachaResult article').count(),1);report.cases.push({name:'reload-recovers-paid-result-on-gacha-entry',result:'PASS'});
 const failed=await page.evaluate(async()=>{const original=safeStorageSet;const before=JSON.stringify(save);safeStorageSet=(key,value)=>key===SAVE_KEY?false:original(key,value);try{await rollCharacterGacha(1);}finally{safeStorageSet=original;}return {same:JSON.stringify(save)===before,overlay:!!document.querySelector('#soulContractPresentation')};});assert(failed.same&&!failed.overlay,'failed save rolls back and starts no cinematic');report.cases.push({name:'storage-failure-rollback',result:'PASS'});
 // Canvas initialization failure must keep a usable skip path and release inert.
 const originalContext=await page.evaluate(()=>{window.originalCanvasGetContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(){throw Error('injected canvas fault');};return true;});
 await fixedDraw(page,['elna_beginner']);await page.locator('.soul-skip').click();assert.equal(await page.locator('#soulContractPresentation').count(),0);assert.equal(await page.locator('body>[inert]').count(),0);await page.evaluate(()=>HTMLCanvasElement.prototype.getContext=window.originalCanvasGetContext);report.cases.push({name:'canvas-initialization-fallback-cleanup',result:'PASS'});
 await page.emulateMedia({reducedMotion:'reduce'});await fixedDraw(page,['stella_apprentice']);await page.locator('#soulContractPresentation').waitFor({state:'detached',timeout:10000});report.cases.push({name:'reduced-motion-completes',result:'PASS'});
 await context.close();
 // Reproduce the stale ordinary writer's final write after a successful draw.
 // The exact check/write interleaving is independently covered by the Node suite.
 const mixed=await browser.newContext({viewport:{width:320,height:568}});await mixed.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 const m=await mixed.newPage();m.on('dialog',d=>d.dismiss());await fixture(m);
 const stale=await m.evaluate(()=>safeStorageGet(SAVE_KEY));const mixedBefore=await fixedDraw(m,['elna_beginner']);await m.locator('.soul-skip').click();
 const recoveryRaw=await m.evaluate(()=>localStorage.getItem(characterGachaRecoveryKey()));assert(recoveryRaw);
 const other=await mixed.newPage();await other.goto(`${origin}/?legacy=1`,{waitUntil:'networkidle'});
 await other.evaluate(raw=>localStorage.setItem(MonsterProfiles.key(SAVE_KEY),raw),stale);
 await m.waitForFunction(()=>inspectCharacterGachaRecovery().blocked);await m.evaluate(()=>renderCharacterGacha());
 assert(await m.getByText('契約のセーブ記録を確認してください',{exact:true}).isVisible());
 assert.equal(await m.evaluate(()=>localStorage.getItem(characterGachaRecoveryKey())),recoveryRaw);
 assert.equal((await m.evaluate(()=>rollCharacterGacha(1))).ok,false);assert.equal(await m.evaluate(()=>safeStorageGet(SAVE_KEY)),stale);
 await m.evaluate(()=>{window.recoveryDownloads=[];downloadTextFile=(name,text)=>window.recoveryDownloads.push({name,text});});
 await m.getByRole('button',{name:'契約時のセーブを書き出す',exact:true}).click();await m.getByRole('button',{name:'現在の保存済みセーブを書き出す（保存しない）',exact:true}).click();
 const exports=await m.evaluate(()=>window.recoveryDownloads.map(d=>JSON.parse(d.text)));
 assert.equal(exports[0].coins,mixedBefore.coins-100);assert.equal(exports[0].instances.length,mixedBefore.count+1);assert.equal(exports[0].soulContractAppliedId,JSON.parse(recoveryRaw).id);
 assert.deepEqual(exports[1],JSON.parse(stale));assert.equal(await m.evaluate(()=>safeStorageGet(SAVE_KEY)),stale);
 await screenshot(m,'320-conflict-recovery');await m.reload({waitUntil:'networkidle'});await m.locator('#titleScreen').click();await m.locator('#titleScreen').waitFor({state:'detached'});await m.evaluate(()=>show('characterGacha'));
 assert(await m.evaluate(()=>inspectCharacterGachaRecovery().blocked));assert.equal(await m.evaluate(()=>save.instances.length),mixedBefore.count);assert.equal((await m.evaluate(()=>rollCharacterGacha(1))).ok,false);
 report.cases.push({name:'mixed-ordinary-write-preserves-recovery-and-current-history-no-regrant',result:'PASS'});await mixed.close();
 // A fresh-device import explicitly establishes a local baseline without grants.
 const imported=await browser.newContext({viewport:{width:390,height:844}});await imported.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 const ip=await imported.newPage();ip.on('dialog',d=>d.accept());await fixture(ip);
 await ip.evaluate(snapshot=>{save=snapshot;if(!saveGame())throw Error('import fixture failed');renderCharacterGacha();},exports[0]);
 assert(await ip.evaluate(()=>inspectCharacterGachaRecovery().canEstablishBaseline));const importRaw=await ip.evaluate(()=>safeStorageGet(SAVE_KEY));
 await ip.getByRole('button',{name:'読み込んだセーブをこの端末の基準にする',exact:true}).click();await ip.waitForFunction(()=>!inspectCharacterGachaRecovery().blocked);
 assert.equal(await ip.evaluate(()=>safeStorageGet(SAVE_KEY)),importRaw,'baseline never saves/grants or changes economy');
 assert.equal(await ip.evaluate(()=>save.instances.length),exports[0].instances.length);
 report.cases.push({name:'fresh-device-import-explicit-baseline-no-regrant',result:'PASS'});await imported.close();
 // Deterministic real two-page competition under the production Web Lock.
 const race=await browser.newContext({viewport:{width:390,height:844}});await race.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await race.addInitScript(()=>{const NativeDate=Date;globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[1791630000000]));}static now(){return 1791630000000;}};});
 const a=await race.newPage();a.on('dialog',d=>d.dismiss());await fixture(a);await a.reload({waitUntil:'networkidle'});await a.locator('#titleScreen').click();await a.locator('#titleScreen').waitFor({state:'detached'});await a.evaluate(()=>show('characterGacha'));
 const b=await race.newPage();b.on('dialog',d=>d.dismiss());await b.goto(`${origin}/?legacy=1`,{waitUntil:'networkidle'});await b.locator('#titleScreen').click();await b.locator('#titleScreen').waitFor({state:'detached'});await b.evaluate(()=>show('characterGacha'));
 assert(await a.evaluate(()=>MonsterProfiles.beforeSave()),'A same baseline');assert(await b.evaluate(()=>MonsterProfiles.beforeSave()),'B same baseline');
 const raceBefore=await a.evaluate(()=>({coins:save.coins,count:save.instances.length,raw:safeStorageGet(SAVE_KEY)}));
 await a.evaluate(()=>{window.lockHeld=false;navigator.locks.request(`monster-rpg:character-gacha:${characterGachaStorageKey()}`,()=>new Promise(resolve=>{window.releaseDrawLock=resolve;window.lockHeld=true;}));});await a.waitForFunction(()=>window.lockHeld);
 for(const p of [a,b])await p.evaluate(()=>{window.competingDraw=rollCharacterGacha(1);});
 assert.equal(await a.evaluate(()=>safeStorageGet(SAVE_KEY)),raceBefore.raw,'queued draws do not write');assert.equal(await a.evaluate(()=>save.coins),raceBefore.coins);assert.equal((await a.evaluate(()=>rollCharacterGacha(1))).busy,true);
 await a.evaluate(()=>window.releaseDrawLock());const raceResults=await Promise.all([a,b].map(p=>p.evaluate(()=>window.competingDraw)));
 assert.equal(raceResults.filter(r=>r.ok).length,1,'only one same-baseline draw commits');
 const persisted=await a.evaluate(()=>JSON.parse(safeStorageGet(SAVE_KEY)));assert.equal(persisted.coins,raceBefore.coins-100);assert.equal(persisted.instances.length,raceBefore.count+1);assert.equal(persisted.soulContractReceipt.entries[0].instanceUid,raceResults.find(r=>r.ok).entries[0].instance.uid);
 report.cases.push({name:'real-two-tab-exclusive-draw-no-lost-success',result:'PASS'});await race.close();assert.deepEqual(report.errors,[]);report.status='PASS';write();console.log('PASS Soul Contract mobile, order, rare timing, skip, recovery, save failure, recordings');
}catch(error){report.status='FAIL';report.failure=error.stack;write();for(const [i,p] of (browser?.contexts().flatMap(c=>c.pages())||[]).entries())try{await p.screenshot({path:`${out}/failure-${i}.png`});}catch{}throw error;}finally{await browser?.close();server.kill();}
