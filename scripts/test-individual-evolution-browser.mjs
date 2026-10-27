// Synthetic, disposable profiles only; no player saves or external services.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const out='artifacts/individual-evolution';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4221'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 browser=await chromium.launch({headless:true});
 for(const viewport of [{width:390,height:844},{width:1366,height:900}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:4221/?legacy=1',{waitUntil:'networkidle'});
  assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  const uid=await page.evaluate(()=>{
   clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
   Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   const fast=addInstance('aquaron',13,needExp(13)-1,{evolutionOffset:-2}),slow=addInstance('aquaron',13,0,{evolutionOffset:2});
   save.party=[fast.uid];save.contractor.pendingRankUps=[];save.items.giga_data=2;
   if(!saveGame())throw Error('seed save failed');show('party');return fast.uid;
  });
  const fast=page.locator(`[data-instance-uid="${uid}"]`);
  await fast.locator('summary').click();
  await page.locator('.monster-roster-card').nth(1).locator('summary').click();
  assert.match(await fast.locator('.instance-evolution-summary').innerText(),/ハイアクアロン：Lv.14/);
  assert.match(await page.locator('.instance-evolution-summary').nth(1).innerText(),/ハイアクアロン：Lv.18/);
  await page.screenshot({path:`${out}/roster-${viewport.width}.png`});
  // Advance through a real item action, then use the rendered evolution choice.
  await fast.locator('button').filter({hasText:'ギガデータ'}).click();
  await page.locator('#evolution').waitFor({state:'visible'});
  await page.locator('#evoChoices button').filter({hasText:'ハイアクアロンに進化する'}).click();
  const evolved=await page.evaluate(uid=>getInstance(uid),uid);
  assert.equal(evolved.id,'highaquaron');assert.equal(evolved.evolutionOffset,-2);
  await page.evaluate(()=>{clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay')?.classList.add('hidden');show('party')});
  const details=page.locator(`[data-instance-uid="${uid}"] details`);
  if(!await details.evaluate(e=>e.open))await details.locator('summary').click();
  assert.match(await details.locator('.instance-evolution-summary').innerText(),/シェンハイロン：Lv.34/);
  assert.match(await details.locator('.instance-evolution-summary').innerText(),/ティエンハイロン：Lv.34/);
  await page.screenshot({path:`${out}/evolved-${viewport.width}.png`});
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  const restored=await page.evaluate(uid=>getInstance(uid),uid);
  assert.deepEqual(restored,evolved,'saved individual and offset survive reload');
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay')?.classList.add('hidden');show('home')});
  await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
  await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS individual evolution browser: mobile/desktop roster, item trigger, real evolution choice, branch thresholds, save/reload, home/hunt/battle smoke.');
}finally{await browser?.close();server.kill()}
