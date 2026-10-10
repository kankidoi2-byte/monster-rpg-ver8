import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4188'],{stdio:['ignore','pipe','inherit']});let browser;
const out='artifacts/skill-card-layout/status-descriptions';fs.mkdirSync(out,{recursive:true});
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[390,844],[430,932],[844,390]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  // Fixture collection changes can legitimately queue rank-up notices between screens.
  // Dismiss through the player's real action rather than hiding the overlay or forcing clicks.
  await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async overlay=>{
   await overlay.getByRole('button',{name:'冒険を続ける'}).click();
  });
  const clickSummary=async summary=>{
   await summary.evaluate(async element=>{
    element.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   });
   await summary.click();
  };
  await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4188/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();save=initSave();migrateSkillSystem();save.instances=[];save.party=[];save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);save.party=[addInstance('freigal',1).uid];show('home');});
  assert(await page.locator('#home').isVisible());
  const rows=await page.evaluate(()=>SKILL110_CATALOG.filter(s=>s.tactical?.status).map(s=>({id:s.id,source:M.find(m=>isSkillAllowedForMonster(s.id,m)).id,text:s.customDesc,detail:s.detailedDesc,chance:s.tactical.status.chance})));assert.equal(rows.length,6);
  const check=async(selector,text)=>{const el=page.locator(selector).filter({hasText:text}).first();assert(await el.isVisible(),selector);const box=await el.evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,clip:['hidden','clip'].includes(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight+1,text:el.textContent}));assert(!box.overflow&&!box.clip,selector+' readable');assert(box.text.includes(text));};
  await page.evaluate(()=>show('skillDex'));await clickSummary(page.locator('#skillDexStatusHelp summary'));
  for(const text of ['しばらくの間、少しずつHPが減る。','体がしびれて、動けないことがある。','行動に失敗したり、自分を攻撃してしまうことがある。','しばらく眠ってしまい、行動できない。'])await check('#skillDexStatusHelp dd',text);
  for(const row of rows){
   await page.evaluate(id=>{show('skillDex');showSkillDexDetail(id,false);},row.id);await check('#skillDexDetail article > p',row.text);
   await clickSummary(page.locator('#skillDexDetail summary').filter({hasText:'数値・詳しい効果'}));
   await check('#skillDexDetail .skill-dex-numbers',row.detail);
   assert(row.detail.includes(`${Math.round(row.chance*100)}%`),'numeric status probability is present');
   await page.evaluate(source=>{clearTutorialUi();save.instances=[];save.party=[];const ins=addInstance(source,100);save.party=[ins.uid];save.skillCards=Object.fromEntries(EQUIPPABLE_MOVE_CARDS.map(s=>[s.id,10]));openSkillEdit(ins.uid);},row.source);await check('#skillCardList .skill-effect-text',row.text);
   const equipmentDetail=page.locator(`#skillCardList [data-skill-card-id="${row.id}"] .skill-numeric-detail`);
   assert.equal(await equipmentDetail.evaluate(el=>el.open),false,'equipment detail starts collapsed');
   await clickSummary(equipmentDetail.locator('summary'));
   await check(`#skillCardList [data-skill-card-id="${row.id}"] .skill-numeric-text`,row.detail);
   // Equip through the production save field; render with the real battle setup and UI.
   await page.evaluate(id=>{save.equippedSkills[save.party[0]]=[id];show('partySet');startBattleFromParty();startChosenBattle('grassland','slime','easy');renderSkillButtons();closeBattleSkillPanel();toggleBattleSkillPanel();},row.id);
   if(!await page.locator('#battleCompactInfo').evaluate(el=>el.open))await clickSummary(page.locator('#battleCompactInfo > summary'));
   if(!await page.locator('.battle-skill-help').evaluate(el=>el.open))await clickSummary(page.locator('.battle-skill-help > summary'));
   await check('.battle-skill-help .battle-choice-detail',row.text);
   await check('.battle-skill-help .battle-choice-numbers',row.detail);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'viewport overflow');
  }
  await page.screenshot({path:`${out}/${width}.png`,fullPage:true});
  const saved=await page.evaluate(()=>{saveGame();return JSON.stringify({party:save.party,instances:save.instances,equippedSkills:save.equippedSkills,skillCards:save.skillCards});});await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>JSON.stringify({party:save.party,instances:save.instances,equippedSkills:save.equippedSkills,skillCards:save.skillCards})),saved);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS status browser: 6 adopted status skills × dex/equipment/battle × 320/390/430/landscape; unclipped wrapping, title/home/party/hunt/battle/save/reload, no page errors');
}catch(error){
 const pages=browser?browser.contexts().flatMap(context=>context.pages()).filter(page=>!page.isClosed()):[];
 const diagnostics=[];
 for(const [index,page] of pages.entries()){
  const entry={url:page.url(),viewport:page.viewportSize(),screenshot:`failure-${index+1}.png`};
  try{await page.screenshot({path:`${out}/${entry.screenshot}`,fullPage:true,timeout:10000});}catch(captureError){entry.screenshotError=captureError.message;}
  diagnostics.push(entry);
 }
 fs.writeFileSync(`${out}/failure.json`,JSON.stringify({error:error.stack||String(error),pages:diagnostics},null,2));
 throw error;
}finally{await browser?.close();server.kill();}
