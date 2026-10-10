// Real gameplay smoke with a fresh, isolated browser context and test-only save.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4176'],{stdio:['ignore','pipe','inherit']});
let browser;
const results=[];
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.dismiss());
 await page.goto('http://127.0.0.1:4176/?legacy=1',{waitUntil:'networkidle'});
 assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.progress.tutorial.guides.skillCards=true;save.instances=[];save.party=[];
  const ins=addInstance('false_dragon_gamma',1);save.party=[ins.uid];
  save.skillCards=Object.fromEntries(EQUIPPABLE_MOVE_CARDS.filter(sk=>sk.cost<25).map(sk=>[sk.id,7]));save.equippedSkills[ins.uid]=['s110_020'];show('home');
 });
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>show('partySet'));
 assert(await page.locator('#partySet').isVisible());await page.evaluate(()=>openSkillEdit(save.instances[0].uid));
 assert((await page.locator('[data-skill-card-id="s110_003"]').textContent()).includes('COST 2'));
 const loadout=await page.evaluate(()=>{
  const guard=equipSkill('s110_003'),heal=equipSkill('s110_004');
  return {guard,heal,total:equippedSkillCost(save.instances[0]),limit:skillCostLimitFor(by('false_dragon_gamma'),save.instances[0])};
 });
 assert.deepEqual(loadout,{guard:true,heal:true,total:8,limit:8});
 assert.deepEqual(await page.evaluate(()=>save.equippedSkills[save.instances[0].uid]),['s110_020','s110_003','s110_004']);
 const saved=await page.evaluate(()=>{
  if(!saveGame())throw Error('save failed');
  return JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills});
 });
 await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})),saved);
 await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 assert((await page.locator('#commands').textContent()).includes('森の一撃'));
 assert.equal(errors.length,0,errors.join('\n'));
 results.push({scenario:'Morglum Lv1 COST8: title, home, party, equipment, save/reload, hunt, battle',result:'PASS',loadout});
 await page.close();
 console.log(JSON.stringify(results,null,2));
}finally{if(browser)await browser.close();server.kill();}
