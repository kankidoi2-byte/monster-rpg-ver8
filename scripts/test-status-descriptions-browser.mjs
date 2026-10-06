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
  await page.goto(process.env.GAME_TEST_URL||'http://127.0.0.1:4188/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();save=initSave();migrateSkillSystem();save.instances=[];save.party=[];save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);save.party=[addInstance('freigal',1).uid];show('home');});
  assert(await page.locator('#home').isVisible());
  const rows=await page.evaluate(()=>MOVE_CARDS.filter(s=>['poison','paralysis','confusion','sleep'].includes(s.effect)).map(s=>({id:s.id,source:s.sourceUnitId,text:moveEffectText(skillToMove(s.id),{includeBase:false})})));assert.equal(rows.length,11);
  const check=async(selector,text)=>{const el=page.locator(selector).filter({hasText:text}).first();assert(await el.isVisible(),selector);const box=await el.evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,clip:['hidden','clip'].includes(getComputedStyle(el).overflowY)&&el.scrollHeight>el.clientHeight+1,text:el.textContent}));assert(!box.overflow&&!box.clip,selector+' readable');assert(box.text.includes(text));};
  for(const row of rows){
   await page.evaluate(id=>{show('skillDex');showSkillDexDetail(id,false);},row.id);await check('#skillDexDetail .skill-effect-text',row.text);
   await page.evaluate(source=>{show('dex');renderUnitDexDetail(source,'dexDetail',()=>'',renderUnitSkillList);},row.source);await check('#dexDetail .skill-effect-text',row.text);
   await page.evaluate(source=>{clearTutorialUi();save.instances=[];save.party=[];const ins=addInstance(source,1);save.party=[ins.uid];save.skillCards=Object.fromEntries(MOVE_CARDS.map(s=>[s.id,10]));openSkillEdit(ins.uid);},row.source);await check('#skillCardList .skill-effect-text',row.text);
   // Equip through the production save field; render with the real battle setup and UI.
   await page.evaluate(id=>{save.equippedSkills[save.party[0]]=[id];show('partySet');startBattleFromParty();startChosenBattle('grassland','slime','easy');renderSkillButtons();closeBattleSkillPanel();toggleBattleSkillPanel();},row.id);
   await page.evaluate(()=>{document.getElementById('battleCompactInfo').open=true;document.querySelector('.battle-skill-help').open=true;});
   await check('.battle-skill-help .battle-choice-detail',row.text);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'viewport overflow');
  }
  await page.screenshot({path:`${out}/${width}.png`,fullPage:true});
  const saved=await page.evaluate(()=>{saveGame();return JSON.stringify({party:save.party,instances:save.instances,equippedSkills:save.equippedSkills,skillCards:save.skillCards});});await page.reload({waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>JSON.stringify({party:save.party,instances:save.instances,equippedSkills:save.equippedSkills,skillCards:save.skillCards})),saved);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS status browser: 11 skills × 4 screens × 320/390/430/landscape; unclipped wrapping, title/home/party/hunt/battle/save/reload, no page errors');
}finally{await browser?.close();server.kill();}
