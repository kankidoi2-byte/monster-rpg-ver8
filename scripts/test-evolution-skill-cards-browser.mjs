import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4179'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept(dialog.type()==='prompt'?'1':undefined));
 await page.goto('http://127.0.0.1:4179/?legacy=1',{waitUntil:'networkidle'});
 assert(await page.locator('#titleScreen').isVisible());await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);
  save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.instances=[];save.party=[];save.equippedSkills={};
  const ins=addInstance('spaquinn',3);save.party=[ins.uid];
  save.skillCards=Object.fromEntries(MOVE_CARDS.map(sk=>[sk.id,7]));show('home');
 });
 assert(await page.locator('#home').isVisible());await page.evaluate(()=>show('partySet'));assert(await page.locator('#partySet').isVisible());
 const before=await page.evaluate(()=>({...save.skillCards}));
 await page.evaluate(()=>{checkEvolution(save.instances[0]);processNextEvolution();});
 assert(await page.locator('#evolution').isVisible());
 // The first-visit evolution guide is a real dismissible overlay. Complete it
 // through its normal button before clicking the underlying evolution action.
 if(await page.locator('#tutorialOverlay').isVisible()){
  await page.locator('#tutorialNextButton').click();
  await page.locator('#tutorialOverlay').waitFor({state:'hidden'});
 }
 await page.locator('#evoChoices button').filter({hasText:'ボルタックスに進化する'}).click();
 const result=await page.evaluate(()=>({id:save.instances[0].id,cards:{...save.skillCards},ids:evolutionSkillCardIdsForMonster(by('voltax')),equipped:getEquippedSkillIds(save.instances[0])}));
 assert.equal(result.id,'voltax');assert(result.ids.length>=1);assert(result.ids.every(id=>/^s110_/.test(id)&&Number(id.slice(5))<=106));
 for(const id of result.ids)assert.equal(result.cards[id],before[id]+1);assert(result.equipped.length<=3);
 await page.evaluate(()=>{
  const a=addInstance('elna_advanced',3),b=addInstance('elna_advanced',3);save.items.fire_orb=2;showFusion();
 });
 const first=await page.evaluate(()=>({...save.skillCards}));
 await page.evaluate(()=>tryFusion(FUSIONS.findIndex(f=>f.to==='elna_kaen')));
 await page.evaluate(()=>tryFusion(FUSIONS.findIndex(f=>f.to==='elna_kaen')));
 const special=await page.evaluate(()=>({ids:evolutionSkillCardIdsForMonster(by('elna_kaen')),cards:{...save.skillCards},count:save.instances.filter(i=>i.id==='elna_kaen').length,materials:save.items.fire_orb}));
 assert.equal(special.count,2);assert.equal(special.materials,0);
 for(const id of special.ids)assert.equal(special.cards[id],first[id]+2);
 const saved=await page.evaluate(()=>{
  renderFusion();renderParty();renderDex();if(!saveGame())throw Error('save failed');
  return JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills});
 });
 await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})),saved);
 await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS evolution browser: title/home/party, normal 110-system evolution, two special evolutions, render/save/reload, hunt/battle (390x844).');
}finally{if(browser)await browser.close();server.kill();}
