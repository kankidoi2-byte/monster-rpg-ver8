import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const ids=['raptor_feather','fine_raptor_feather','venom_carapace','fine_venom_carapace','golden_land_map','g_ichor'];
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4389'],{stdio:['ignore','pipe','inherit']});
const out=process.env.ITEM_ARTWORK_EVIDENCE||'/tmp/item-artwork-qa';fs.mkdirSync(out,{recursive:true});
let browser;const errors=[];
try{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const width of [360,1280]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:4389/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(ids=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');save=initSave();save.contractor.pendingRankUps=[];save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.itemDex=save.itemDex.filter(id=>!ids.includes(id));for(const id of ids)save.items[id]=0;show('itemDex');},ids);
  for(const id of ids) assert.equal(await page.locator(`.item-dex-card[onclick="showItemDexDetail('${id}')"] img`).count(),0);
  await page.evaluate(ids=>{for(const id of ids)save.items[id]=2;saveGame();renderItemDex();},ids);
  for(const id of ids){
   const card=page.locator(`.item-dex-card[onclick="showItemDexDetail('${id}')"]`);await card.click();
   const img=page.locator('#itemDexDetail .item-dex-detail-image img');
   await img.evaluate(i=>i.decode());assert((await img.getAttribute('src')).endsWith(`${id}_art_v1.webp`));
   assert(await img.evaluate(i=>i.naturalWidth===768&&i.naturalHeight===768));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`${out}/${id}-${width}.png`});
  }
  // Repeated navigation and reload preserve quantities and registration.
  await page.evaluate(()=>{show('home');show('itemDex');show('home');show('itemDex');});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(ids=>ids.map(id=>save.items[id]),ids),ids.map(()=>2));
  assert(await page.evaluate(ids=>ids.every(id=>save.itemDex.includes(id)),ids));
  await page.evaluate(()=>{clearTutorialUi();show('shop');});
  for(const id of ids.slice(0,4)){
   const imgs=page.locator(`#shop img[src="images/items/${id}_art_v1.webp"]`);assert(await imgs.count()>0);await imgs.first().evaluate(i=>i.decode());
  }
  await page.screenshot({path:`${out}/shop-${width}.png`});await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log('Item artwork browser: locked/unlocked dex, all six details, shop, navigation, save/reload at 360 and 1280px passed.');
}finally{await browser?.close();server.kill();}
