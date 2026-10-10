// Run in the isolated CI browser; never use or modify a player's stored save.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4175'],{stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true});
const out='artifacts/skill-card-layout';fs.mkdirSync(out,{recursive:true});
const results=[];
try{
 for(const [width,height] of [[320,568],[360,640],[390,844],[412,915],[430,932],[844,390]]){
  const page=await browser.newPage({viewport:{width:width+32,height:height+250},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Fixture loads the real entry's scripts/CSS and replaces only init with isolated memory setup.
  await page.goto('http://127.0.0.1:4175/scripts/skill-loadout-browser.html');
  const frame=page.frames().find(f=>f!==page.mainFrame());
  await frame.waitForFunction(()=>typeof window.runSkillQA==='function');
  // Test actual viewport, independently of the wrapper's default iframe size.
  await page.locator('#game').evaluate((el,size)=>{el.width=size.width;el.height=size.height;},{width,height});
  await page.locator('[data-case="suite"]').click();
  await page.waitForFunction(()=>document.querySelector('#report').textContent.includes('チュートリアル装備から属性案内')||document.querySelector('#report').textContent.includes('FAIL'));
  const suite=await page.locator('#report').textContent();assert(!suite.includes('FAIL'),suite);
  await frame.evaluate(()=>{
   clearTutorialUi();save.tutorial=tutorialSaveDefaults({legacy:true});
   const ins=save.instances[0];editingSkillUid=ins.uid;show('skillEdit');renderSkillEdit();
  });
  assert.equal(await frame.evaluate(()=>innerWidth),width,'fixture uses the exact requested viewport');
  assert.equal(await frame.evaluate(()=>innerHeight),height,'fixture uses the exact requested height');
  const inspect=async selector=>frame.locator(selector).evaluateAll(elements=>elements.map(el=>{
   const head=el.querySelector('.skill-card-head'),title=el.querySelector('.skill-card-title'),cost=el.querySelector('.skill-cost-badge');
   const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
   const lines=el.querySelectorAll('.skill-type-line'),effect=el.querySelector('.skill-effect-text');
   return {text:el.textContent,lines:lines.length,head:rect(head),title:rect(title),cost:rect(cost),titleOverflow:title.scrollWidth>title.clientWidth+1,effect:effect?.textContent||'',effectOverflow:effect?effect.scrollWidth>effect.clientWidth+1:false};
  }));
  function check(rows,label){assert(rows.length,label+' cards exist');for(const row of rows){assert.equal(row.lines,1,label);assert(!row.text.includes('威力0')&&!row.text.includes('属性 /'),label);assert(!row.titleOverflow&&!row.effectOverflow,label+' text overflow');assert(row.title.right<=row.cost.left+1,label+' COST overlap');assert(row.head.right<=width+1&&row.head.left>=-1,label+' viewport overflow');}}
  check(await inspect('#skillEditCurrent .skill-card, #skillCardList .skill-card'),'equipment');
  // Long name, compound elements, support, exclusive and conditional/recoil cards on both dex paths.
  for(const [screen,detail,unit] of [['dex','dexDetail','alchemion'],['dex','dexDetail','kimeragna'],['characterDex','characterDexDetail','character_vera_5'],['characterDex','characterDexDetail','character_nico_4']]){
   await frame.evaluate(({screen,detail,unit})=>{
    const mon=by(unit);if(!mon)throw Error('missing QA unit '+unit);
    show(screen);renderUnitDexDetail(mon.id,detail,()=>'',renderUnitSkillList);
   },{screen,detail,unit});
   check(await inspect('#'+detail+' .skill-card'),unit+' dex');
  }
  await frame.evaluate(()=>{
   show('skillEdit');const ins=save.instances[0];editingSkillUid=ins.uid;
   const sk=MONSTER_MOVE_CARDS[0];sk.name='天空を巡る白金の守護者・超長名称の複合属性専用技';renderSkillEdit();
  });
  check(await inspect('#skillEditCurrent .skill-card, #skillCardList .skill-card'),'long name');
  await frame.evaluate(()=>{document.getElementById('skillCostFilter').value='25';renderSkillEdit();});
  assert.equal(await frame.locator('#skillCardList [data-skill-card-id]').count(),4);
  check(await inspect('#skillCardList .skill-card'),'COST25');
  await frame.evaluate(()=>{document.getElementById('skillCostFilter').value='all';renderSkillEdit();});
  const buttons=await frame.evaluate(async()=>{
   const result=[];
   for(const el of [...document.querySelectorAll('#skillEditCurrent button, #skillCardList button:not([disabled])')].slice(0,4)){
    el.scrollIntoView({block:'center'});await new Promise(r=>requestAnimationFrame(r));
    const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
    result.push({text:el.textContent,visible:b.top>=0&&b.bottom<=innerHeight,uncovered:hit===el||el.contains(hit)});
   }return result;
  });
  assert(buttons.length&&buttons.every(b=>b.visible&&b.uncovered),'operation buttons visible and uncovered');
  await page.screenshot({path:`${out}/${width}x${height}.png`,fullPage:true});
  assert.equal(errors.length,0,errors.join('\n'));
  results.push({width,height,result:'PASS',existingInteractionChecks:suite.split('\n').length,buttons});
  await page.close();
 }
 // Exercise the approved COST adjustment through the real entry and save path.
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.dismiss());
 await page.goto('http://127.0.0.1:4175/?legacy=1',{waitUntil:'networkidle'});
 assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.instances=[];save.party=[];
  const ins=addInstance('freigal',100);save.party=[ins.uid];
  save.skillCards=Object.fromEntries(EQUIPPABLE_MOVE_CARDS.map(sk=>[sk.id,7]));save.equippedSkills[ins.uid]=[];show('home');
 });
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>show('partySet'));
 assert(await page.locator('#partySet').isVisible());await page.evaluate(()=>openSkillEdit(save.instances[0].uid));
 await page.locator('#skillCostFilter').selectOption('25');
 assert.equal(await page.locator('#skillCardList [data-skill-card-id]').count(),4);
 assert((await page.locator('[data-skill-card-id="s110_107"]').textContent()).includes('COST 25'));
 assert(await page.evaluate(()=>[...document.querySelectorAll('[data-skill-card-id]')].every(el=>!SKILL_BY_ID[el.dataset.skillCardId].deprecated)));
 const loadout=await page.evaluate(()=>{
  const over=equipSkill('s110_107'),basic=equipSkill('s110_001');
  return {over,basic,total:equippedSkillCost(save.instances[0]),limit:skillCostLimitFor(by('freigal'),save.instances[0])};
 });
 assert.equal(loadout.over,true);assert.equal(loadout.basic,true);assert.equal(loadout.total,26);assert(loadout.limit>=26);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'COST25 equipment overflow');
 const saved=await page.evaluate(()=>{
  if(!saveGame())throw Error('save failed');
  return JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills});
 });
 await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})),saved);
 await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 assert((await page.locator('#commands').textContent()).includes('オーバーブレイク'));
 assert.equal(errors.length,0,errors.join('\n'));
 results.push({scenario:'Freigal Lv100 COST25: title, home, party, equipment, save/reload, hunt, battle',result:'PASS',loadout});
 await page.close();
 fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}catch(error){
 // Capture before closing contexts, including failures in the first 320px case.
 const failures=[];
 const pages=browser.contexts().flatMap(context=>context.pages()).filter(page=>!page.isClosed());
 for(const [index,page] of pages.entries()){
  const file=`failure-${index+1}.png`;
  const diagnostic={url:page.url(),viewport:page.viewportSize(),screenshot:file};
  try{await page.screenshot({path:`${out}/${file}`,fullPage:true,timeout:10000});}
  catch(captureError){diagnostic.screenshotError=captureError.message;}
  try{diagnostic.fixtureReport=await page.locator('#report').textContent({timeout:1000});}catch{}
  failures.push(diagnostic);
 }
 fs.writeFileSync(`${out}/failure.json`,JSON.stringify({error:error.stack||String(error),completed:results,pages:failures},null,2));
 throw error;
}finally{await browser.close();server.kill();}
