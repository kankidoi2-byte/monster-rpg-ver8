import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const publicUrl=process.env.GAME_TEST_URL;
const server=publicUrl?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4181'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 // A brand-new context: no player storage or signed-in browser is ever touched.
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept(d.type()==='prompt'?'1':undefined));
 const url=publicUrl||'http://127.0.0.1:4181/?legacy=1';
 // Public telemetry/media can keep connections active after the game is ready.
 // Wait for document and explicit app readiness, rather than network silence.
 if(publicUrl)page.setDefaultNavigationTimeout(60000);
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof EVOLUTION_NATIVE_CARDS_MIGRATION!=='undefined'&&typeof save!=='undefined'&&!!document.getElementById('titleScreen'));
 const fixture=await page.evaluate(()=>{
  const old=initSave();old.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);
  old.progress.tutorial=tutorialSaveDefaults({legacy:true});old.instances=[];old.party=[];old.equippedSkills={};
  old.skillCards=Object.fromEntries(MOVE_CARDS.map(sk=>[sk.id,0]));old.coins=54321;old.items.fire_orb=7;
  ['voltax','voltax','shenhairon','orca_stream'].forEach((id,i)=>{
   const ins={uid:'isolated-'+i,id,level:3,exp:17,locked:true,customGrowth:{keep:i}};
   old.instances.push(ins);old.equippedSkills[ins.uid]=defaultSkillIdsForMonster(by(id),ins);
  });old.party=old.instances.slice(0,3).map(ins=>ins.uid);
  return repairSave(old,[]);
 });
 await context.addInitScript(f=>{
  if(!sessionStorage.getItem('migration-test-seeded')){
   localStorage.setItem('mb_v95c',JSON.stringify(f));
   const second=JSON.parse(JSON.stringify(f));second.instances=second.instances.slice(0,1);second.party=[second.instances[0].uid];second.equippedSkills={[second.instances[0].uid]:second.equippedSkills[second.instances[0].uid]};
   // Also exercise legacy inventory's old early-return branch in slot 2.
   second.saveMeta.migrations=second.saveMeta.migrations.filter(id=>id!=='equipped_skill_cards_v1');
   localStorage.setItem('mb_v95c_profile2',JSON.stringify(second));
   sessionStorage.setItem('mb_profile_tab_v1','1');sessionStorage.setItem('migration-test-seeded','1');
  }
 },fixture);
 const snapshot=()=>page.evaluate(()=>({instances:save.instances,party:save.party,equippedSkills:save.equippedSkills,coins:save.coins,items:save.items,progress:save.progress,cards:save.skillCards,migrations:save.saveMeta.migrations}));
 await page.reload({waitUntil:'domcontentloaded'});
 assert(await page.locator('#titleScreen').isVisible());
 const first=await snapshot();assert.equal(first.cards.skill_voltax_03,2);assert.equal(first.cards.skill_voltax_04,2);assert.equal(first.cards.skill_orca_abyss_02,2);
 for(const field of ['instances','party','equippedSkills','coins','items','progress'])assert.deepEqual(first[field],fixture[field],field);
 assert.equal(first.migrations.filter(id=>id==='evolution_native_cards_v1').length,1);
 assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('mb_v95c')).saveMeta.migrations.includes('evolution_native_cards_v1')),'marker and cards persisted by init');
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>{show('partySet');renderParty();renderDex();});assert(await page.locator('#partySet').isVisible());
 await page.reload({waitUntil:'domcontentloaded'});assert.deepEqual(await snapshot(),first,'reload must not mint cards');
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(()=>MonsterProfiles.switchTo(2))]);
 const second=await snapshot();assert.equal(second.cards.skill_voltax_03,1);assert.equal(second.cards.skill_voltax_04,1);assert(second.migrations.includes('equipped_skill_cards_v1'));assert(second.migrations.includes('evolution_native_cards_v1'));
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(()=>MonsterProfiles.switchTo(1))]);
 assert.deepEqual(await snapshot(),first,'account round trip preserves completed compensation');
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 assert.deepEqual(errors,[]);
 console.log(`PASS evolution compensation browser: ${publicUrl?'published':'local'} isolated save, title/home/party/hunt/battle, initial persistence, old inventory, shared cards, preservation, reload and real profile round trip (390x844).`);
}finally{if(browser)await browser.close();if(server)server.kill();}
