// Isolated test save; exercises the actual equipment UI and save/reload path.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4178'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.dismiss());
 await page.goto('http://127.0.0.1:4178/?legacy=1',{waitUntil:'networkidle'});
 assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);
  save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.progress.tutorial.guides.skillCards=true;
  save.instances=[];save.party=[];
  const ins=addInstance('aquaron',30);save.party=[ins.uid];
  save.skillCards=Object.fromEntries(MOVE_CARDS.map(sk=>[sk.id,7]));
  save.equippedSkills[ins.uid]=['skill_aquaron_01'];show('home');
 });
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>show('partySet'));
 assert(await page.locator('#partySet').isVisible());await page.evaluate(()=>openSkillEdit(save.instances[0].uid));
 assert.equal(await page.evaluate(()=>currentTutorialState().guides.skillCards),true);
 await page.locator('#tutorialOverlay').waitFor({state:'hidden'});
 for(const id of ['skill_icegolem_03','skill_proto_icegolem_03']){
  const card=page.locator(`[data-skill-card-id="${id}"]`);
  assert(!((await card.textContent()).includes('タグ条件に合いません')));
  const button=card.locator('button');assert(await button.isEnabled());
  await button.evaluate(el=>el.scrollIntoView({block:'center'}));await button.click();
 }
 const rush=page.locator('[data-skill-card-id="skill_granbeat_03"]');
 assert((await rush.textContent()).includes('タグ条件に合いません'));
 assert(await rush.locator('button').isDisabled());
 assert.deepEqual(await page.evaluate(()=>save.equippedSkills[save.instances[0].uid]),
  ['skill_aquaron_01','skill_icegolem_03','skill_proto_icegolem_03']);
 const saved=await page.evaluate(()=>{
  if(!saveGame())throw Error('save failed');
  return JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills});
 });
 await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})),saved);
 await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 const commands=await page.locator('#commands').textContent();
 assert(commands.includes('凍結クラッシュ')&&commands.includes('大氷河クラッシュ'));
 assert.deepEqual(await page.evaluate(()=>getEquippedMovesForInstance(activeInstance).slice(1).map(move=>skillBattleMotionForMove(move).form)),['strike','strike']);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS crash/rush browser: title, home, party, equipment buttons/reasons, save/reload, hunt, battle and strike forms (390x844).');
}finally{if(browser)await browser.close();server.kill();}
