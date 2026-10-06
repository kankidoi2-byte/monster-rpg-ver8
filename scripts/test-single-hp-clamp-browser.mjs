import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4180'],{stdio:['ignore','pipe','inherit']});
const out='artifacts/skill-card-layout/single-hp-clamp';fs.mkdirSync(out,{recursive:true});
let browser;const results=[];
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.goto('http://127.0.0.1:4180/?legacy=1',{waitUntil:'networkidle'});
 assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 const loadFixtures=async()=>{for(const name of ['single-hp-clamp','simultaneous-ko'])await page.addScriptTag({path:`scripts/${name}-fixture.js`});};
 await loadFixtures();
 await page.evaluate(()=>{
   clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.instances=[];save.party=[];
   save.party.push(addInstance('freiwolf',10).uid);show('home');
 });
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>show('partySet'));assert(await page.locator('#partySet').isVisible());
 await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 const cases=await page.evaluate(()=>singleHpCases());
 for(const options of cases){
   const result=await page.evaluate(opts=>singleHpScenario(opts),options);results.push(result);
   assert(result.observations.every(o=>o.pHp>=0&&o.eHp>=0),JSON.stringify(options));
   assert(await page.locator('#battle').isVisible());
   if(options.name==='normal-overkill')await page.screenshot({path:`${out}/${options.isPlayer?'player':'enemy'}-overkill.png`,fullPage:true});
 }
 for(const cause of ['player-recoil','enemy-recoil','poison','victory','defeat','continue'])for(const reserve of [false,true])for(const enemiesRemain of [false,true]){
   if(await page.locator('#next').isVisible())await page.locator('#next').click();
   const result=await page.evaluate(opts=>simultaneousKoScenario(opts),{mode:'single',cause,reserve,enemiesRemain});results.push(result);
   if(result.outcome==='victory'){
     assert(await page.locator('#battle.is-finished').isVisible());
     if(cause==='player-recoil'&&reserve&&!enemiesRemain){
       const before=await page.evaluate(()=>{migrateSkillSystem();if(!saveGame())throw Error('save failed');const {saveMeta,...data}=save;return JSON.stringify(data);});
       await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
       // Startup legitimately updates save timestamps/hash; all gameplay fields must match.
       assert.equal(await page.evaluate(()=>{const {saveMeta,...data}=save;return JSON.stringify(data);}),before);
       await loadFixtures();
       await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
       await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
     }
   }
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({result:'PASS',count:results.length,errors,results},null,2)+'\n');
 console.log(`PASS ${results.length} real browser cases: 50 immediate HP probes + 24 outcomes/rewards/save scenarios; title/home/party/hunt/battle, actual reload, no page errors`);
}finally{if(browser)await browser.close();server.kill();}
