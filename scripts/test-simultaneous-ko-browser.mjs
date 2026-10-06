// Fresh browser + isolated saves; actual index.html, battle UI and persistence.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4179'],{stdio:['ignore','pipe','inherit']});
const out='artifacts/skill-card-layout/simultaneous-ko';fs.mkdirSync(out,{recursive:true});
let browser;
const results=[];
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 const open=async()=>{
  await page.goto('http://127.0.0.1:4179/?legacy=1',{waitUntil:'networkidle'});
  assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.addScriptTag({path:'scripts/simultaneous-ko-fixture.js'});
 };
 await open();
 // Required entry screens and actual party -> hunt -> battle start.
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.instances=[];save.party=[];
  save.party.push(addInstance('freigal',10).uid);show('home');
 });
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>show('partySet'));assert(await page.locator('#partySet').isVisible());
 await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 for(const mode of ['single','multi','invasion'])for(const cause of ['player-recoil','enemy-recoil','poison','victory','defeat','continue'])for(const reserve of [false,true])for(const enemiesRemain of (['player-recoil','enemy-recoil','poison'].includes(cause)?[false,true]:[false])){
  // Follow the real result transition before starting another isolated fixture.
  if(await page.locator('#next').isVisible())await page.locator('#next').click();
  const result=await page.evaluate(opts=>simultaneousKoScenario(opts),{mode,cause,reserve,enemiesRemain});results.push(result);
  console.log(JSON.stringify(result));
  assert(await page.locator('#battle').isVisible(),JSON.stringify(result));
  if(result.outcome==='victory'){
    assert(await page.locator('#battle.is-finished').isVisible());
    if(mode!=='single'){
      const buttons=await page.locator('#multiContractPanel button').count();
      assert.equal(buttons,cause==='enemy-recoil'?0:1,'only player kills are contract candidates');
    }
    if(cause==='poison'&&reserve){
      await page.screenshot({path:`${out}/${mode}-poison-reserve.png`,fullPage:true});
      const before=await page.evaluate(()=>JSON.stringify({coins:save.coins,wins:save.history.wins,party:save.party,instances:save.instances,items:save.items,progress:save.progress}));
      await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
      assert.equal(await page.evaluate(()=>JSON.stringify({coins:save.coins,wins:save.history.wins,party:save.party,instances:save.instances,items:save.items,progress:save.progress})),before,'reload preserves victory save');
      await page.addScriptTag({path:'scripts/simultaneous-ko-fixture.js'});
      // Post-reload party is usable in a new hunt; battle transient state is reset.
      await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
      await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
    }
  }
 }
 for(const mode of ['multi','invasion'])for(const reserve of [false,true])for(const poison of [false,true]){
  if(await page.locator('#next').isVisible())await page.locator('#next').click();
  results.push(await page.evaluate(opts=>simultaneousKoEnemyAttribution(opts),{mode,reserve,poison}));
  assert.equal(await page.locator('#multiContractPanel button').count(),0,'enemy kills/poison never become contract candidates');
 }
 assert.equal(errors.length,0,errors.join('\n'));
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({result:'PASS',count:results.length,errors,results},null,2)+'\n');
 console.log(`PASS ${results.length} browser battle scenarios; title/home/party/hunt/battle, contract UI, 3 real reloads, post-reload battle, no page errors. Screenshots: ${out}`);
}finally{if(browser)await browser.close();server.kill();}
