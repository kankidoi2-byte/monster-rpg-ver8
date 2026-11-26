// Disposable browser contexts; native tab/session isolation and real operation buttons.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const origin='http://127.0.0.1:4217';
const output='artifacts/save-failure-ui/audit';
const report={cases:[],errors:[],limitations:['Chromium mobile emulation, not physical Galaxy/Chromebook.','Synthetic saves only; faults target rendering or profile metadata, never gameplay rules.']};
fs.mkdirSync(output,{recursive:true});
let browser,server,activePage;
async function start(page){
  await page.locator('#titleScreen').click();
  await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay')?.classList.add('hidden');});
}
async function newPage(context){
  const page=await context.newPage();activePage=page;
  page.on('dialog',dialog=>dialog.accept());
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(origin+'/?legacy=1',{waitUntil:'networkidle'});
  await start(page);return page;
}
async function seededContext(slot){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const setup=await newPage(context);
  await setup.evaluate(slot=>{
    save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
    Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);
    const leader=addInstance('aquaron',1);addInstance('freigal',1);save.party=[leader.uid];
    save.contractor.legacyMigrationVersion=1;migrateSkillSystem();
    // Keep the dispatch fault isolated from an unrelated first-map Rank-up overlay.
    registerMapDex('grassland');save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);
    for(const n of [1,2]){
      const copy=JSON.parse(JSON.stringify(save));copy.coins=12000+n;
      copy.saveMeta.integrityHash=saveHash(copy);
      const key=n===1?'mb_v95c':'mb_v95c_profile2';
      localStorage.setItem(key,JSON.stringify(copy));localStorage.setItem(key+'_lastKnownGood',JSON.stringify(copy));
    }
    const metadata=JSON.parse(localStorage.getItem('mb_profiles_v1'));metadata.selected=slot;
    localStorage.setItem('mb_profiles_v1',JSON.stringify(metadata));
  },slot);
  // Close the seed tab: the next tabs have genuinely empty sessionStorage.
  await setup.close();return context;
}
async function switchButton(page){
  await page.locator('[data-nav="more"]').click();
  const management=page.locator('#moreMenu .save-management');
  if(!await management.evaluate(element=>element.open))await management.locator(':scope > summary').click();
  return page.locator('.profile-panel button').filter({hasText:'に切替'});
}
async function snapshot(page){return page.evaluate(()=>({slot:MonsterProfiles.slot(),id:MonsterProfiles.current().id,coins:save.coins,key:MonsterProfiles.key(SAVE_KEY),memory:JSON.stringify(save),disk:localStorage.getItem(MonsterProfiles.key(SAVE_KEY))}));}

try{
  server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4217'],{stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Audit server did not start')),10000);
    const finish=(error)=>{clearTimeout(timer);error?reject(error):resolve();};
    server.stdout.once('data',()=>finish());server.once('error',finish);server.once('exit',code=>finish(Error('Audit server exited: '+code)));
  });
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  for(const slot of [1,2]){
    report.activeCase=`profile-${slot}`;
    const context=await seededContext(slot);
    const first=await newPage(context);const before=await snapshot(first);
    assert.equal(before.slot,slot);
    const second=await newPage(context);const button=await switchButton(second);
    await Promise.all([second.waitForNavigation({waitUntil:'networkidle'}),button.click()]);await start(second);
    assert.equal((await snapshot(second)).slot,slot===1?2:1);
    await first.reload({waitUntil:'networkidle'});await start(first);
    const reloaded=await snapshot(first);
    assert.equal(reloaded.slot,slot,'reloading another tab must retain its own profile');
    assert.equal(reloaded.id,before.id);assert.equal(reloaded.coins,before.coins);
    // A metadata write failure must not silently select the other account on reload.
    const failedSwitch=await switchButton(first);
    await first.evaluate(()=>{
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){if(this===localStorage&&key==='mb_profiles_v1')throw new DOMException('Injected metadata quota','QuotaExceededError');return original.call(this,key,value);};
    });
    await failedSwitch.click();
    assert.equal((await snapshot(first)).slot,slot);
    await first.reload({waitUntil:'networkidle'});await start(first);
    assert.equal((await snapshot(first)).slot,slot);
    assert.equal((await snapshot(first)).coins,before.coins);
    await (await switchButton(first)).scrollIntoViewIfNeeded();
    await first.screenshot({path:`${output}/profile-${slot}-retained.png`});
    report.cases.push({operation:'profile-tab-reload-and-failed-switch',slot,result:'PASS',nativeSessionStorage:true});
    await context.close();

    report.activeCase=`expedition-${slot}`;
    const expeditionContext=await seededContext(slot);const page=await newPage(expeditionContext);
    // Smoke-check the existing home/party navigation before opening the affected feature.
    await page.evaluate(()=>show('home'));assert(await page.locator('#home').isVisible());
    await page.locator('#homePartyEditButton').click();assert(await page.locator('#party').isVisible());await page.locator('#rosterActions [data-roster-party]').click();assert(await page.locator('#partySet').isVisible());
    await page.locator('[data-nav="more"]').click();await page.locator('#expeditionNav').click();
    assert(await page.locator('#expedition').isVisible());
    await page.locator('[data-tutorial-expedition-map="grassland"]').click();
    await page.locator('[data-tutorial-expedition-distance="short"]').click();
    await page.locator('.expedition-member').first().click();
    const original=await snapshot(page);
    const other=await page.evaluate(()=>localStorage.getItem(MonsterProfiles.slot()===1?'mb_v95c_profile2':'mb_v95c'));
    await page.evaluate(()=>{
      window.auditOriginalRenderer=renderExpedition;window.auditRendererCalls=0;
      renderExpedition=function(){if(++window.auditRendererCalls===1)throw Error('Injected post-commit renderer failure');return window.auditOriginalRenderer();};
    });
    await page.locator('#expeditionStartButton').click();
    const committed=await snapshot(page);
    assert.equal(committed.memory,committed.disk,'a renderer error must not roll back an already persisted dispatch');
    const saved=JSON.parse(committed.disk);assert.equal(saved.expeditions.active.length,1);
    assert.equal(saved.coins,JSON.parse(original.disk).coins);
    assert.match(await page.locator('#uiNotice').textContent(),/保存済み/);
    await page.screenshot({path:`${output}/expedition-${slot}-render-failure.png`});
    // The stale button is still present because rendering threw. Clicking it cannot dispatch twice.
    await page.locator('#expeditionStartButton').click();
    assert.equal((await snapshot(page)).disk,committed.disk);
    assert.equal(await page.evaluate(()=>save.expeditions.active.length),1);
    await page.reload({waitUntil:'networkidle'});await start(page);
    await page.locator('[data-nav="more"]').click();await page.locator('#expeditionNav').click();
    assert.equal(await page.locator('.expedition-slot:not(.is-empty)').count(),1);
    const persisted=await page.evaluate(()=>save.expeditions.active[0]);
    assert.deepEqual(persisted,saved.expeditions.active[0]);
    assert.equal(await page.evaluate(()=>localStorage.getItem(MonsterProfiles.slot()===1?'mb_v95c_profile2':'mb_v95c')),other);
    await page.screenshot({path:`${output}/expedition-${slot}-reload.png`});
    report.cases.push({operation:'expedition-post-commit-render-failure',slot,result:'PASS',actualDispatchButton:true,noDuplicate:true,reload:true,otherProfileUnchanged:true,smoke:['title','home','party','expedition']});
    await expeditionContext.close();
  }
  assert.deepEqual(report.errors,[],'No uncaught browser errors');
  delete report.activeCase;report.result='PASS';
  console.log(`PASS audit profile/expedition browser: ${report.cases.length} cases`);
}catch(error){
  report.result='FAIL';report.failure=error.stack;
  if(activePage&&!activePage.isClosed())await activePage.screenshot({path:`${output}/unexpected-failure.png`}).catch(()=>{});
  throw error;
}finally{
  fs.writeFileSync(`${output}/manifest.json`,JSON.stringify(report,null,2)+'\n');
  await browser?.close();server?.kill();
}
