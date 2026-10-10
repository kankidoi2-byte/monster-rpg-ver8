import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const publicUrl=process.env.GAME_TEST_URL;
const server=publicUrl?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4181'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept(d.type()==='prompt'?'1':undefined));
 const url=publicUrl||'http://127.0.0.1:4181/?legacy=1';
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof SKILL110_MIGRATION_MAP!=='undefined'&&typeof save!=='undefined');
 const fixture=await page.evaluate(()=>{
  const old=initSave();old.saveMeta.migrations=[];
  old.progress.tutorial=tutorialSaveDefaults({legacy:true});old.instances=[];old.party=[];old.equippedSkills={};
  old.skillCards={skill_voltax_03:2,skill_voltax_04:3,skill_orca_abyss_02:5};old.coins=54321;old.items.fire_orb=7;
  ['voltax','voltax','shenhairon','orca_stream'].forEach((id,i)=>{
   const ins={uid:'isolated-'+i,id,level:3,exp:17,locked:true,customGrowth:{keep:i}};
   old.instances.push(ins);old.equippedSkills[ins.uid]=[i<2?'skill_voltax_03':'skill_orca_abyss_02'];
  });old.party=old.instances.slice(0,3).map(ins=>ins.uid);old.caught=old.instances.map(ins=>ins.id);
  return old;
 });
 await context.addInitScript(f=>{
  if(!sessionStorage.getItem('migration-test-seeded')){
   localStorage.setItem('mb_v95c',JSON.stringify(f));
   const second=JSON.parse(JSON.stringify(f));second.instances=second.instances.slice(0,1);second.party=[second.instances[0].uid];second.equippedSkills={[second.instances[0].uid]:second.equippedSkills[second.instances[0].uid]};second.skillCards.skill_voltax_03=9;
   localStorage.setItem('mb_v95c_profile2',JSON.stringify(second));
   sessionStorage.setItem('mb_profile_tab_v1','1');sessionStorage.setItem('migration-test-seeded','1');
  }
 },fixture);
 const snapshot=()=>page.evaluate(()=>({instances:save.instances,party:save.party,equippedSkills:save.equippedSkills,coins:save.coins,items:save.items,progress:save.progress,cards:save.skillCards,migrations:save.saveMeta.migrations}));
 await page.reload({waitUntil:'domcontentloaded'});
 const first=await snapshot();
 assert.equal(first.coins,fixture.coins);assert.deepEqual(first.instances,fixture.instances);
 assert(first.migrations.includes('skill_system_110_v1'));
 assert(await page.evaluate(()=>Object.values(save.skillCards).reduce((a,b)=>a+b,0)===10+save.skill110Migration.basicAttackCompensation));
 assert(await page.evaluate(()=>save.instances.every(ins=>getEquippedSkillIds(ins).some(id=>SKILL_BY_ID[id].power>0)&&equippedSkillCost(ins)<=skillCostLimitFor(by(ins.id),ins))));
 assert(await page.evaluate(()=>JSON.parse(localStorage.getItem('mb_v95c')).saveMeta.migrations.includes('skill_system_110_v1')));
 assert(await page.evaluate(()=>save.skill110MigrationBackup.skillCards.skill_orca_abyss_02===5));
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>{show('partySet');renderParty();renderDex();});assert(await page.locator('#partySet').isVisible());
 await page.reload({waitUntil:'domcontentloaded'});assert.deepEqual(await snapshot(),first,'reload must not mint cards');
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(()=>MonsterProfiles.switchTo(2))]);
 const second=await snapshot();assert(second.migrations.includes('skill_system_110_v1'));
 assert(await page.evaluate(()=>Object.values(save.skillCards).reduce((a,b)=>a+b,0)===17+save.skill110Migration.basicAttackCompensation));
 await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(()=>MonsterProfiles.switchTo(1))]);
 assert.deepEqual(await snapshot(),first,'account round trip preserves110 migration');
 // Exercise the real file import entry point with an old save, followed by repeat import of the migrated export.
 const legacyImport={...fixture,coins:12347};
 assert.notEqual((await snapshot()).coins,legacyImport.coins,'legacy sentinel must differ from current account');
 await Promise.all([
  page.waitForNavigation({waitUntil:'domcontentloaded'}),
  page.locator('#saveImportInput').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacyImport))})
 ]);
 await page.waitForFunction(()=>typeof save!=='undefined'&&save.coins===12347&&save.saveMeta.migrations.includes('skill_system_110_v1'));
 const imported=await snapshot();assert.equal(imported.coins,legacyImport.coins);assert.deepEqual(imported.cards,first.cards);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('mb_v95c')).coins),legacyImport.coins,'legacy import sentinel persisted');
 const exported=JSON.parse(await page.evaluate(()=>JSON.stringify(save)));exported.coins=23458;
 assert.notEqual(imported.coins,exported.coins,'current sentinel must differ from imported legacy account');
 await Promise.all([
  page.waitForNavigation({waitUntil:'domcontentloaded'}),
  page.locator('#saveImportInput').setInputFiles({name:'current.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))})
 ]);
 await page.waitForFunction(()=>typeof save!=='undefined'&&save.coins===23458&&save.saveMeta.migrations.includes('skill_system_110_v1'));
 const reimported=await snapshot();assert.equal(reimported.coins,exported.coins);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('mb_v95c')).coins),exported.coins,'current import sentinel persisted');
 assert.deepEqual(reimported.cards,first.cards,'reimport cannot duplicate compensation');
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 assert.deepEqual(errors,[]);
 console.log(`PASS 110 migration browser: ${publicUrl?'published':'local'} isolated legacy save, sum retention, backup, legal equipment, title/home/party/hunt/battle, reload, actual profile round trip, real legacy/current file imports (390x844).`);
}finally{if(browser)await browser.close();if(server)server.kill();}
