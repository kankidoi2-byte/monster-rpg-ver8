import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4181'],{stdio:['ignore','pipe','inherit']});let browser;
const out='artifacts/skill-card-layout/powered-modifiers';fs.mkdirSync(out,{recursive:true});
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 await page.goto('http://127.0.0.1:4181/?legacy=1',{waitUntil:'networkidle'});assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.addScriptTag({path:'scripts/powered-modifier-fixture.js'});
 await page.evaluate(()=>{clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.instances=[];save.party=[addInstance('shenhairon',10).uid];save.skillCards=Object.fromEntries(MOVE_CARDS.map(s=>[s.id,3]));show('home');});
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>show('partySet'));assert(await page.locator('#partySet').isVisible());
 await page.evaluate(()=>openSkillEdit(save.instances[0].uid));
 for(const id of ['skill_shenhairon_02','skill_nightmare_02','skill_noxvelg_02']){const text=await page.locator(`[data-skill-card-id="${id}"]`).first().textContent();assert.match(text,/威力/);assert.match(text,/攻撃後/);}
 await page.screenshot({path:`${out}/equipment.png`,fullPage:true});
 await page.evaluate(()=>renderDex());
 for(const id of ['skill_shenhairon_02','skill_nightmare_02','skill_noxvelg_02'])assert(await page.locator(`[data-skill-card-id="${id}"]`).count()>0);
 await page.evaluate(()=>{show('partySet');startBattleFromParty();});assert(await page.locator('#battleChoices').isVisible());await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 const cases=await page.evaluate(()=>poweredModifierCases().filter(x=>Object.keys(x).length===3));const results=[];
 for(const opts of cases){
  const result=await page.evaluate(async options=>{
   const original=playBattleSkillMotion,motions=[];playBattleSkillMotion=async(...args)=>{motions.push({source:args[0],target:args[1],role:skillBattleMotionForMove(args[2]).role});return original(...args);};
   try{return {...await poweredModifierScenario(options),motions};}finally{playBattleSkillMotion=original;}
  },opts);results.push({opts,...result});
  assert.match(result.log,/ダメージ/);assert.match(result.log,/攻撃力が/);assert.equal((result.log.match(/攻撃力が/g)||[]).length,1);
  assert.equal(result.motions.length,1);assert.equal(result.motions[0].role,'damage');assert.notEqual(result.motions[0].source,result.motions[0].target);
  if(opts.mode!=='single')assert(result.action.includes(' → ')&&!result.action.includes('undefined'));
  if(opts.skillId==='skill_shenhairon_02'&&opts.direction==='player')await page.screenshot({path:`${out}/${opts.mode}.png`,fullPage:true});
 }
 const before=await page.evaluate(()=>{initStarters();migrateLegacyContractorProgress();syncContractorRankTitles();migrateSkillSystem();if(!saveGame())throw Error('save');const {saveMeta,...data}=save;return JSON.stringify(data);});
 await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 const after=await page.evaluate(()=>{const {saveMeta,...data}=save;return JSON.stringify(data);});assert.deepEqual(JSON.parse(after),JSON.parse(before));assert.deepEqual(errors,[]);
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({result:'PASS',cases:results.length,errors,results},null,2));console.log(`PASS ${results.length} actual browser attacks, motion targets, logs, equipment/dex, title/home/party/hunt/battle and save/reload`);
}finally{if(browser)await browser.close();server.kill();}
