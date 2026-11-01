import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4249'],{stdio:['ignore','pipe','inherit']});let browser;
const out='/tmp/life-quest-qa';fs.mkdirSync(out,{recursive:true});
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 browser=await chromium.launch({headless:true});
 for(const viewport of [{width:360,height:640},{width:412,height:915}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  const page=await context.newPage(),errors=[],messages=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{messages.push(d.message());d.accept()});
  await page.clock.install({time:new Date('2026-11-01T23:50:00+09:00')});
  await page.goto('http://127.0.0.1:4249/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{
   clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
   save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.contractor.pendingRankUps=[];addInstance('aquaron',5);save.party=[save.instances[0].uid];save.coins=17;
   if(!saveGame())throw Error('fixture save');show('home');
  });
  const before=await page.evaluate(()=>localStorage.getItem(MonsterProfiles.key(SAVE_KEY)));
  await page.evaluate(()=>show('moreMenu'));await page.locator('#englishStudyMenuButton').click();await page.waitForURL('**/life-quest/');
  assert.equal(await page.locator('.tile').count(),8);assert.equal(await page.locator('#lvnum').textContent(),'1');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true,'phone has no page scroll');
  const click=async(id,n)=>{for(let i=0;i<n;i++)await page.locator('.tile[data-inc="'+id+'"]').click({force:true});};
  await click('q1',1);assert.match(await page.locator('.tile[data-inc="q1"] .amt').innerText(),/5\/20/);
  await page.locator('.minus[data-inc="q1"]').click();assert.match(await page.locator('.tile[data-inc="q1"] .amt').innerText(),/0\/20/);
  await click('q1',20); // 5 achievements displayed, only 3 count for rewards.
  await page.waitForTimeout(600);assert(await page.locator('.lvup').count()>0);assert(await page.locator('.toast').count()>0);
  assert.match(await page.locator('.reward-next').innerText(),/720枚/);
  await page.locator('.overlay').evaluateAll(els=>els.forEach(e=>e.remove()));
  assert.equal(await page.locator('.tile[data-inc="q1"] .isdone').count(),0);
  assert.equal(await page.locator('.tile[data-inc="q1"]').getAttribute('class').then(s=>s.includes('isdone')),true);
  await page.locator('.toast,.float').evaluateAll(els=>els.forEach(e=>e.remove()));
  await page.screenshot({path:out+'/home-'+viewport.width+'.png'});
  assert.equal(await page.evaluate(()=>localStorage.getItem('mb_v95c')),before,'Life Quest leaves Monster save byte-identical');
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('lifequest.v1')));assert.equal(Object.keys(state.hist).length,1,'no sample days');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('lifequest_rewards_v1')).entries.some(e=>e.source==='daily')),false);
  await page.locator('[data-tab="skill"]').click();assert.equal(await page.locator('.tree').count(),2);
  await page.locator('[data-tab="log"]').click();assert(await page.locator('#bk-out').isVisible());
  await page.locator('[data-tab="quest"]').click();await page.locator('#f-nm').fill('テスト読書');await page.locator('#f-unit').selectOption('ページ');await page.locator('#addq button').click();assert.equal(await page.locator('.qrow').count(),9);
  // Return straight to Monster Battle after midnight, without revisiting Life Quest.
  await page.clock.setFixedTime(new Date('2026-11-02T00:05:00+09:00'));
  await page.goto('http://127.0.0.1:4249/?legacy=1',{waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');show('home')});
  assert(await page.locator('#lifeQuestRewardBox').isVisible());
  assert(await page.evaluate(()=>{const b=document.getElementById('lifeQuestRewardBox').getBoundingClientRect(),n=document.getElementById('homeNamePlate').getBoundingClientRect(),a=document.getElementById('homeActions').getBoundingClientRect();return b.bottom<=n.top&&b.bottom<=a.top&&b.left>=0&&b.right<=innerWidth;}),'inbox clears the home name and action buttons');
  await page.screenshot({path:out+'/inbox-'+viewport.width+'.png'});
  const amounts=await page.evaluate(()=>{const e=JSON.parse(localStorage.getItem('lifequest_rewards_v1')).entries;return {daily:e.find(e=>e.id==='daily-2026-11-01').coins,coins:save.coins,rainbow:save.items.rainbow_contract_scroll,expected:e.reduce((n,e)=>n+e.coins,0)}});
  assert.equal(amounts.daily,720);
  const snapshot=await page.evaluate(()=>JSON.stringify(save));
  await page.evaluate(()=>{window.realLQSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===MonsterProfiles.key(SAVE_KEY))throw Error('quota');return window.realLQSet.call(this,k,v)}});
  await page.locator('#lifeQuestRewardBox button').click();assert.equal(await page.evaluate(()=>JSON.stringify(save)),snapshot);
  await page.evaluate(()=>Storage.prototype.setItem=window.realLQSet);
  await page.locator('#lifeQuestRewardBox button').click();assert.equal(await page.evaluate(()=>save.coins),amounts.coins+amounts.expected);assert.equal(await page.evaluate(()=>save.items.rainbow_contract_scroll),amounts.rainbow+1);
  assert.equal(await page.locator('#lifeQuestRewardBox').isVisible(),false);
  const claimed=await page.evaluate(()=>JSON.stringify(save));await page.evaluate(()=>show('home'));assert.equal(await page.evaluate(()=>JSON.stringify(save)),claimed);
  await page.screenshot({path:out+'/claimed-'+viewport.width+'.png'});
  // Current schema save with the additive field missing must load safely.
  await page.evaluate(()=>{const old=JSON.parse(JSON.stringify(save));delete old.lifeQuestClaimedIds;old.saveMeta.integrityHash=saveHash(old);localStorage.setItem(MonsterProfiles.key(SAVE_KEY),JSON.stringify(old));});
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>Array.isArray(save.lifeQuestClaimedIds)&&save.lifeQuestClaimedIds.length===0),true);
  assert.equal(await page.evaluate(()=>save.coins),amounts.coins+amounts.expected);
  // Existing gameplay smoke: home / party / hunt / battle / save / reload.
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);show('partySet')});assert(await page.locator('#partySet').isVisible());
  await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
  await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
  assert.equal(await page.evaluate(()=>saveGame()),true);
  assert.deepEqual(errors,[]);assert.equal(fs.existsSync('english/index.html'),true);
  console.log('PASS Life Quest browser '+viewport.width+': entry, no-scroll HUD, tap/minus/progression/FX, tabs/add, sample-free, isolated save, midnight direct-home claim, rollback/retry/no duplicate, old-save migration and gameplay smoke.');
  await context.close();
 }
}finally{await browser?.close();server.kill();}
