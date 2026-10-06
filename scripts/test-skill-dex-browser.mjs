import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4184'],{stdio:['ignore','pipe','inherit']});let browser;
const out='artifacts/skill-card-layout/skill-dex';fs.mkdirSync(out,{recursive:true});
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[390,844],[430,932],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.goto('http://127.0.0.1:4184/?legacy=1',{waitUntil:'networkidle'});
  assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();save=initSave();initStarters();migrateSkillSystem();save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);show('home');saveGame();});
  assert(await page.locator('#home').isVisible());
  await page.evaluate(()=>show('dexHub'));
  const before=await page.evaluate(()=>JSON.stringify(save));
  await page.locator('#dexHubGrid button').filter({hasText:'技図鑑'}).click();
  assert(await page.locator('#skillDex').isVisible());assert.equal(await page.locator('[data-skill-dex-id]').count(),await page.evaluate(()=>skillDexEntries().length));
  await page.locator('#skillDexSearch').fill('セラフィックリーフ');assert.equal(await page.locator('[data-skill-dex-id]').count(),1);
  await page.locator('[data-skill-dex-id]').click();assert.match(await page.locator('#skillDexDetail').textContent(),/20%/);
  await page.locator('#skillDexDetail .skill-dex-unit').first().click();assert(await page.locator('#dex').isVisible());
  await page.locator('#dexDetail .skill-dex-open').filter({hasText:'技図鑑'}).last().click();assert(await page.locator('#skillDex').isVisible());
  await page.evaluate(()=>resetSkillDexFilters());
  for(const type of await page.evaluate(()=>[...new Set(skillDexEntries().flatMap(skillTypes))])){
   await page.locator('#skillDexType').selectOption(type);assert(await page.locator('[data-skill-dex-id]').count()>0);
   assert(await page.evaluate(()=>[...document.querySelectorAll('[data-skill-dex-id]')].every(el=>skillTypes(SKILL_BY_ID[el.dataset.skillDexId]).includes(document.getElementById('skillDexType').value))));
  }
  await page.evaluate(()=>resetSkillDexFilters());await page.locator('#skillDexKind').selectOption('support');assert(!(await page.locator('#skillDexList').textContent()).includes('威力 0'));
  await page.locator('#skillDexSearch').fill('存在しない技名');assert.match(await page.locator('#skillDexList').textContent(),/条件に合う技はありません/);
  await page.evaluate(()=>resetSkillDexFilters());await page.locator('#skillDexSort').selectOption('power');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
  const cards=await page.locator('#skillDexList .skill-card').evaluateAll(els=>els.map(el=>{const title=el.querySelector('.skill-card-title'),cost=el.querySelector('.skill-cost-badge');return {lines:el.querySelectorAll('.skill-type-line').length,overlap:title.getBoundingClientRect().right>cost.getBoundingClientRect().left+1,overflow:title.scrollWidth>title.clientWidth+1};}));assert(cards.every(c=>c.lines===1&&!c.overlap&&!c.overflow));
  assert.equal(await page.evaluate(()=>JSON.stringify(save)),before,'browse is read-only');
  await page.evaluate(()=>{show('characterDex');showCharacterDexDetail('elna_beginner');});await page.locator('#characterDexDetail .skill-dex-open').first().click();assert(await page.locator('#skillDex').isVisible());
  await page.screenshot({path:`${out}/${width}.png`,fullPage:true});
  await page.evaluate(()=>{show('partySet');});assert(await page.locator('#partySet').isVisible());
  await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
  await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
  const saved=await page.evaluate(()=>{saveGame();return JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills});});await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})),saved);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS skill dex browser: 320/390/430/landscape, filters, links, layout, read-only save/reload');
}finally{await browser?.close();server.kill();}
