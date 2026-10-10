// Isolated synthetic profiles only. External requests blocked; no real player save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const out='artifacts/save-transactions';fs.mkdirSync(out,{recursive:true});
const report={cases:[],limitations:['Chromium mobile emulation, not physical Android/Galaxy/Chromebook','No global atomicity guarantee across noncooperating legacy writers']};
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4198'],{stdio:['ignore','pipe','inherit']});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});browser=await chromium.launch({headless:true});
 for(const width of [320,360,390,430])for(const slot of [1,2]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
  await context.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:4198')?r.continue():r.abort());
  const page=await context.newPage();page.on('dialog',d=>d.accept());
  await page.addInitScript(slot=>sessionStorage.setItem('mb_profile_tab_v1',String(slot)),slot);
  await page.goto('http://127.0.0.1:4198/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.coins=20000;const unit=addInstance('aquaron',1);save.party=[unit.uid];migrateSkillSystem();ensureContractorState().pendingRankUps=[];saveGame();show('home');});
  for(const screen of ['home','partySet','battleChoices']){await page.evaluate(screen=>show(screen),screen);assert(await page.locator(`#${screen}`).isVisible());}
  const result=await page.evaluate(async()=>{
   prepareBattleParty();enemy=by('freigal');battleRewardGranted=true;singleBattleContractAttempted=false;save.items.contract_scroll=3;saveGame();show('battle');
   const before=JSON.stringify(save),key=MonsterProfiles.key(SAVE_KEY),otherKey=MonsterProfiles.slot()===1?'mb_v95c_profile2':'mb_v95c',other=localStorage.getItem(otherKey),disk=localStorage.getItem(key);
   const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Injected quota','QuotaExceededError');return set.call(this,k,v)};
   const animation=playContractAnimation;playContractAnimation=async()=>{};const random=Math.random;Math.random=()=>0;
   try{await useContractScrollConfirmed();}finally{Storage.prototype.setItem=set;Math.random=random;playContractAnimation=animation;}
   return {same:before===JSON.stringify(save),diskSame:disk===localStorage.getItem(key),otherSame:other===localStorage.getItem(otherKey),attempted:singleBattleContractAttempted,slot:MonsterProfiles.slot()};
  });assert(result.same&&result.diskSame&&result.otherSame&&!result.attempted);assert.equal(result.slot,slot);
  await page.screenshot({path:`${out}/${width}-slot${slot}-save-failure.png`});
  const committed=await page.evaluate(async()=>{const animation=playContractAnimation;playContractAnimation=async()=>{throw Error('Injected animation rejection')};const before=save.instances.length;try{await useContractScrollConfirmed();}finally{playContractAnimation=animation;}return {delta:save.instances.length-before,scrolls:save.items.contract_scroll,attempt:singleBattleContractAttempted,busy:postBattleContractBusy};});
  assert.equal(committed.delta,1);assert.equal(committed.scrolls,2);assert(committed.attempt&&!committed.busy);
  await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>save.items.contract_scroll),2);assert.equal(await page.evaluate(()=>save.instances.filter(x=>x.id==='freigal').length),1);
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(async()=>{clearTutorialUi();save.progress.tutorial=tutorialSaveDefaults();save.progress.tutorial.status='in_progress';save.progress.tutorial.stepId='contract_confirm';save.saveMeta.migrations=[];save.items.contract_scroll=0;setTutorialContractContext();saveGame();window.testStorageSet=Storage.prototype.setItem;const key=MonsterProfiles.key(SAVE_KEY);Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Injected quota');return window.testStorageSet.call(this,k,v);};await useContractScrollConfirmed();});
  assert(await page.locator('#contractConfirm').isVisible());
  const retry=page.locator('#contractConfirm button[onclick="useContractScrollConfirmed()"]');assert(await retry.isVisible());assert(await retry.isEnabled());
  await page.evaluate(()=>{Storage.prototype.setItem=window.testStorageSet;window.testAnimation=playContractAnimation;playContractAnimation=async()=>{};});
  await retry.click();await page.waitForFunction(()=>save.progress.tutorial.firstContractGuaranteeUsed);
  await page.evaluate(()=>{playContractAnimation=window.testAnimation;clearTutorialUi();save.progress.tutorial=tutorialSaveDefaults({legacy:true});ensureContractorState().pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay')?.classList.add('hidden');saveGame();});
  await page.evaluate(()=>{show('moreMenu');const old=initSave();old.coins=7;safeStorageSet(SAVE_BACKUP_KEY,JSON.stringify(old));const key=MonsterProfiles.key(SAVE_KEY),set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Injected quota','QuotaExceededError');return set.call(this,k,v)};try{restoreLastKnownGood();}finally{Storage.prototype.setItem=set;}document.querySelector('.save-management').open=true;});
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});await page.evaluate(()=>{clearTutorialUi();show('moreMenu');document.querySelector('.save-management').open=true;});
  assert.match(await page.locator('#replacementRecoveryStatus').textContent(),/未完了/);
  for(const [kind,coins] of [['before',20000],['after',7],['backupBefore',7]]){
   const button=page.locator(`button[onclick="exportReplacementRecovery('${kind}')"]`);await button.scrollIntoViewIfNeeded();
   assert(await button.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.height>=44;}));
   const pending=page.waitForEvent('download');await button.click();const download=await pending;
   const json=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(json.coins,coins);assert(Array.isArray(json.instances));
  }
  await page.screenshot({path:`${out}/${width}-slot${slot}-recovery-controls.png`});
  report.cases.push({width,slot,result:'PASS',checks:['title/home/party/hunt/battle surface','primary quota rollback','inactive profile unchanged','saved outcome retained through animation exception and reload']});await context.close();
 }
}finally{fs.writeFileSync(`${out}/manifest.json`,JSON.stringify(report,null,2));await browser?.close();server.kill();}
console.log('PASS browser save transaction scenarios');
