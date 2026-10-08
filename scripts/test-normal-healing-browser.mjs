import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';

const publicUrl=process.env.GAME_TEST_URL;
const server=publicUrl?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4190'],{stdio:['ignore','pipe','inherit']});
const out='artifacts/skill-card-layout/normal-healing';
fs.mkdirSync(out,{recursive:true});
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'}),errors=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 // Public media/telemetry can keep connections active after the app is ready.
 if(publicUrl)page.setDefaultNavigationTimeout(60000);
 await page.goto(publicUrl||'http://127.0.0.1:4190/?legacy=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof normalBattleHealing==='function'&&typeof save!=='undefined'&&!!document.getElementById('titleScreen'));
 assert(await page.locator('#titleScreen').isVisible());
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
  Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);
  save.instances=[];save.party=[addInstance('freigal',10).uid];show('home');
 });
 assert(await page.locator('#home').isVisible());
 await page.evaluate(()=>show('partySet'));assert(await page.locator('#partySet').isVisible());
 await page.evaluate(()=>startBattleFromParty());await page.locator('#battleChoices').waitFor({state:'visible'});
 await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
 for(const mode of ['single','multi','invasion'])for(const side of mode==='single'?['player','enemyA']:['player','enemyA','enemyB']){
  for(const [level,amount] of [[1,27],[10,54],[50,174],[100,324]])for(const shortage of [800,5,0]){
   const result=await page.evaluate(async({mode,side,level,shortage})=>{
    clearTutorialUi();save.instances[0].level=side==='player'?level:99;prepareBattleParty();
    const request=createHuntRequest(MAPS[0],by('slime'),'normal',[]);
    request.battleMode=mode==='multi'?'three_way':'single';request.secondEnemyId='goblin';request.conditions=[];
    beginChosenBattle('grassland','slime','normal',request);
    if(mode==='invasion'){
     activeHuntRequest.battleMode='invasion_pending';activeHuntRequest.invasionEnemyId='goblin';activeHuntRequest.invasionTurn=0;
     if(!triggerInvasionIfDue())throw Error('invasion failed');
    }
    const multi=mode!=='single',isPlayer=side==='player',index=side==='enemyB'?1:0;
    activeHuntRequest.enemyLevel=!multi&&!isPlayer?level:99;
    activeHuntRequest.enemyHp=maxHp(enemy,activeHuntRequest.enemyLevel);
    const entries=multi?multiBattle.enemies:[];
    entries.forEach((entry,i)=>{entry.level=!isPlayer&&i===index?level:99;entry.maxHp=maxHp(entry.mon,entry.level);entry.hp=entry.maxHp;});
    const maximum=isPlayer?playerMaxHp():multi?entries[index].maxHp:enemyMaxHp();
    const missing=Math.min(shortage,maximum-1),before=maximum-missing;
    pHp=playerMaxHp();eHp=enemyMaxHp();
    if(isPlayer)pHp=before;else if(multi)entries[index].hp=before;else eHp=before;
    if(multi)updateMultiBattleView();else update();refreshBattleFeedback();
    const feedback=[],original=battleHpResult;
    battleHpResult=(...args)=>{feedback.push({id:args[0],before:args[1],after:args[2],label:args[3].label});return original(...args);};
    const move=skillToMove('skill_luxseed_03');
    if(move[3]!=='heal')throw Error('real healing skill missing');
    try{
     if(multi)await performMultiAttack(isPlayer?{kind:'player'}:entries[index],isPlayer?entries[1]:{kind:'player'},move);
     else await doAttack(isPlayer?player:enemy,isPlayer?enemy:player,move,isPlayer);
     const after=isPlayer?pHp:multi?entries[index].hp:eHp;
     return {before,after,maximum,missing,feedback,log:document.getElementById('log').textContent};
    }finally{battleHpResult=original;}
   },{mode,side,level,shortage});
   const expected=Math.min(result.missing,amount);
   assert.equal(result.after-result.before,expected,`${mode}/${side}/${level}/${shortage}`);
   assert(result.after<=result.maximum);assert.match(result.log,new RegExp(`HPを${expected}回復した`));
   assert.equal(result.feedback.length,1);assert.equal(result.feedback[0].after-result.feedback[0].before,expected);
   if(level===10&&shortage===5&&side==='player')await page.screenshot({path:`${out}/${mode}.png`,fullPage:true});
   results.push({mode,side,level,shortage,...result});
  }
 }
 const before=await page.evaluate(()=>{initStarters();migrateLegacyContractorProgress();syncContractorRankTitles();migrateSkillSystem();if(!saveGame())throw Error('save failed');const {saveMeta,...data}=save;return JSON.stringify(data);});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof normalBattleHealing==='function'&&typeof save!=='undefined'&&!!document.getElementById('titleScreen'));
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 const after=await page.evaluate(()=>{const {saveMeta,...data}=save;return JSON.stringify(data);});
 assert.deepEqual(JSON.parse(after),JSON.parse(before));assert.deepEqual(errors,[]);
 fs.writeFileSync(`${out}/results.json`,JSON.stringify({result:'PASS',cases:results.length,errors,results},null,2));
 console.log(`PASS ${results.length} actual browser healing actions; single/three-way/invasion, levels, caps, actual feedback/logs, title/home/party/hunt/battle and save/reload`);
}catch(error){if(browser){const page=browser.contexts()[0]?.pages()[0];if(page)await page.screenshot({path:`${out}/failure.png`,fullPage:true});}throw error;}
finally{if(browser)await browser.close();server?.kill();}
