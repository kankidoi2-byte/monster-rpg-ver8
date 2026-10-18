// Disposable synthetic profiles. Block all requests outside the tested app.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin=(process.env.GAME_TEST_URL||'http://127.0.0.1:4201').replace(/\/$/,''),out='artifacts/evolution-battle-item-save';
fs.mkdirSync(out,{recursive:true});
const server=process.env.GAME_TEST_URL?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4201'],{stdio:['ignore','pipe','inherit']});
const report={cases:[],errors:[],limitations:['Chromium emulation, not physical Galaxy/Chromebook; font size is CSS 200%, not Android OS font scaling.']};let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 browser=await chromium.launch({headless:true});
 for(const slot of [1,2])for(const [width,height,font] of [[320,568,100],[360,740,100],[390,844,100],[430,900,100],[844,390,100],[390,844,200]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
  await context.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await context.addInitScript(slot=>sessionStorage.setItem('mb_profile_tab_v1',String(slot)),slot);
  const page=await context.newPage();page.on('dialog',d=>d.accept());page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(origin+'/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(font=>{document.documentElement.style.fontSize=font+'%';clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);save.party=[addInstance('aquaron',50).uid];save.items.potion=3;saveGame();show('home');},font);
  for(const screen of ['home','partySet','battleChoices']){await page.evaluate(id=>show(id),screen);assert(await page.locator('#'+screen).isVisible());}
  await page.evaluate(()=>{
   checkEvolution(getPartyInstances()[0]);processNextEvolution();window.testKey=MonsterProfiles.key(SAVE_KEY);window.otherKey=MonsterProfiles.slot()===1?'mb_v95c_profile2':'mb_v95c';window.otherRaw=localStorage.getItem(otherKey);window.before=JSON.stringify(save);window.disk=localStorage.getItem(testKey);window.originalSet=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(k===testKey)throw new DOMException('Injected quota','QuotaExceededError');return originalSet.call(this,k,v)};
  });
  const evo=page.locator('#evoChoices button').first();await evo.click();
  assert(await page.evaluate(()=>JSON.stringify(save)===before&&localStorage.getItem(testKey)===disk&&currentEvolution!==null));
  assert(await evo.isVisible());assert(await evo.isEnabled());
  await evo.scrollIntoViewIfNeeded();let box=await evo.boundingBox();assert(box&&box.x>=0&&box.x+box.width<=width+1);
  await page.screenshot({path:`${out}/${slot}-${width}-${font}-evolution-error.png`});
  await page.evaluate(()=>{Storage.prototype.setItem=originalSet});await evo.click();
  assert.equal(await page.evaluate(()=>getPartyInstances()[0].id),'highaquaron');
  await page.evaluate(()=>{
   const request=createHuntRequest(MAPS.find(m=>m.id==='grassland'),by('slime'),'normal',[]);request.battleMode='single';request.invasionEnemyId=null;request.secondEnemyId=null;beginChosenBattle('grassland','slime','normal',request);pHp=10;partyBattle[activePartyIdx].hp=10;openBattleItemSelect();window.before=JSON.stringify(save);window.disk=localStorage.getItem(testKey);Storage.prototype.setItem=function(k,v){if(k===testKey)throw Error('Injected write');return originalSet.call(this,k,v)};
  });
  const potion=page.locator('button[onclick="useBattleItemFromMenu(\'potion\')"]');await potion.click();
  assert(await page.evaluate(()=>JSON.stringify(save)===before&&localStorage.getItem(testKey)===disk&&pHp===10));
  assert(await potion.isVisible());assert(await potion.isEnabled());await potion.scrollIntoViewIfNeeded();box=await potion.boundingBox();assert(box&&box.x>=0&&box.x+box.width<=width+1);
  await page.screenshot({path:`${out}/${slot}-${width}-${font}-item-error.png`});
  await page.evaluate(()=>{Storage.prototype.setItem=originalSet});await potion.click();
  assert(await page.evaluate(()=>save.items.potion===2&&pHp===60&&partyBattle[activePartyIdx].hp===60&&localStorage.getItem(otherKey)===otherRaw));
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>save.items.potion),2);assert.equal(await page.evaluate(()=>getPartyInstances()[0].id),'highaquaron');
  report.cases.push({slot,width,height,font,evolution:true,item:true,retry:true,reload:true});await context.close();
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(`PASS ${report.cases.length} browser flows`);
}finally{await browser?.close();server?.kill();}
