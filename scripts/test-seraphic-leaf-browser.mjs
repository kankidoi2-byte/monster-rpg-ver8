// Real gameplay smoke with a fresh, isolated browser context and test-only save.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4177'],{stdio:['ignore','pipe','inherit']});
let browser;
const results=[];
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.dismiss());
 await page.goto('http://127.0.0.1:4177/?legacy=1',{waitUntil:'networkidle'});
 assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.instances=[];save.party=[];
  const ins=addInstance('seralphia',7);save.party=[ins.uid];
  save.skillCards=Object.fromEntries(MOVE_CARDS.map(sk=>[sk.id,7]));save.equippedSkills[ins.uid]=['skill_seralphia_03'];show('home');
 });
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>show('partySet'));
 assert(await page.locator('#partySet').isVisible());await page.evaluate(()=>openSkillEdit(save.instances[0].uid));
 assert((await page.locator('[data-skill-card-id="skill_icegolem_02"]').textContent()).includes('COST 2'));
 const loadout=await page.evaluate(()=>{
  const guard=equipSkill('skill_icegolem_02'),heal=equipSkill('skill_rikasheef_02');
  return {guard,heal,total:equippedSkillCost(save.instances[0]),limit:skillCostLimitFor(by('seralphia'),save.instances[0])};
 });
 assert.deepEqual(loadout,{guard:true,heal:true,total:8,limit:8});
 assert.deepEqual(await page.evaluate(()=>save.equippedSkills[save.instances[0].uid]),['skill_seralphia_03','skill_icegolem_02','skill_rikasheef_02']);
 const saved=await page.evaluate(()=>{
  if(!saveGame())throw Error('save failed');
  return JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills});
 });
 await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})),saved);
 await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 assert((await page.locator('#commands').textContent()).includes('セラフィックリーフ'));
 const combat=await page.evaluate(async()=>{
   // Keep the actual browser attack, healing and save implementations.
   pHp=10;eHp=75;pAtk=10;pGuard=eGuard=pAquaShield=eAquaShield=false;
   await doAttack(player,enemy,skillToMove('skill_seralphia_03'),true);
   const playerHeal=pHp-10;
   enemy=by('seralphia');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);
   eHp=10;pHp=75;eAtk=10;
   await doAttack(enemy,player,skillToMove('skill_seralphia_03'),false);
   const enemyHeal=eHp-10;
   await doAttack(enemy,player,skillToMove('skill_seralphia_02'),false);
   return {playerHeal,enemyHeal,enemyBlessing:eHp>25};
 });
 assert.deepEqual(combat,{playerHeal:15,enemyHeal:15,enemyBlessing:true});
 // Read a stored old-ID fixture, then use the actual saveGame/localStorage path.
 const legacySaved=await page.evaluate(()=>{
   const alias=legacySkillIdFromMove(['セラフィックリーフ',68,'grass']);
   const raw=JSON.parse(JSON.stringify(save));
   raw.skillCards[alias]=raw.skillCards.skill_seralphia_03;delete raw.skillCards.skill_seralphia_03;
   raw.equippedSkills[raw.instances[0].uid][0]=alias;
   save=parseAndPrepareSave(JSON.stringify(raw),[]);migrateSkillSystem();
   if(!saveGame())throw Error('legacy save failed');
   return JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills});
 });
 await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})),legacySaved);
 assert.equal(errors.length,0,errors.join('\n'));
 results.push({scenario:'Seralphia Lv7 COST8: title, home, party, equipment, save/reload, hunt, battle',result:'PASS',loadout});
 await page.close();
 console.log(JSON.stringify(results,null,2));
}finally{if(browser)await browser.close();server.kill();}
