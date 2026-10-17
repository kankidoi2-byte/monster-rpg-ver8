// Isolated synthetic profiles only. All requests outside the local app are blocked.
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4199',out='artifacts/hunt-victory-save';
fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4199'],{stdio:['ignore','pipe','inherit']});
const report={cases:[],errors:[],limitations:['Chromium emulation; not physical Galaxy/Chromebook','Only the single-battle smoke uses an actual attack; other cases enter the real settlement with defeated enemies.']};
let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 browser=await chromium.launch({headless:true});
 for(const slot of [1,2])for(const [width,height,font] of [[320,568,100],[360,740,100],[390,844,100],[430,900,100],[844,390,100],[390,844,200]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true});
  await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await context.addInitScript(slot=>sessionStorage.setItem('mb_profile_tab_v1',String(slot)),slot);
  const page=await context.newPage();page.on('dialog',d=>d.accept());page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${origin}/?legacy=1`,{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(font=>{document.documentElement.style.fontSize=font+'%';clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);save.party=[addInstance('aquaron',1).uid];save.items.contract_scroll=5;saveGame();show('home');},font);
  for(const screen of ['home','partySet','battleChoices']){await page.evaluate(id=>show(id),screen);assert(await page.locator(`#${screen}`).isVisible());}
  const failure=await page.evaluate(async()=>{
   normalVictoryReceipt=null;prepareBattleParty();Math.random=()=>.5;const request=createHuntRequest(MAPS.find(m=>m.id==='grassland'),by('slime'),'normal',[]);request.battleMode='single';request.invasionEnemyId=null;request.secondEnemyId=null;beginChosenBattle('grassland','slime','normal',request);eHp=1;
   window.victoryBefore=JSON.stringify(save);window.victoryKey=MonsterProfiles.key(SAVE_KEY);window.victoryDisk=localStorage.getItem(victoryKey);
   window.otherKey=MonsterProfiles.slot()===1?'mb_v95c_profile2':'mb_v95c';window.otherDisk=localStorage.getItem(otherKey);
   window.storageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===victoryKey)throw Error('Injected quota');return storageSet.call(this,k,v)};
   await turn(-1);
   return {same:JSON.stringify(save)===victoryBefore,disk:localStorage.getItem(victoryKey)===victoryDisk,pending:normalVictoryPending(),reward:battleRewardGranted,hp:eHp,busy,mode:activeHuntRequest.battleMode,log:document.getElementById('log').textContent};
  });assert(failure.same&&failure.disk&&failure.pending&&!failure.reward,JSON.stringify({slot,width,font,...failure}));
  const retry=page.locator('#battleOutcomeActions button[onclick="retryNormalVictorySave()"]');assert(await retry.isVisible());assert(await retry.isEnabled());
  assert(await page.locator('#next').isHidden());
  const blocked=await page.evaluate(()=>{const request=activeHuntRequest;afterBattleNext();beginChosenBattle('volcano','freigal');askUseContractScroll('contract_scroll');processNextEvolution();return {same:activeHuntRequest===request,switched:MonsterProfiles.switchTo(MonsterProfiles.slot()===1?2:1),screen:document.querySelector('.screen.active')?.id};});
  assert(blocked.same&&!blocked.switched);assert.equal(blocked.screen,'battle');
  const bounds=await retry.boundingBox();assert(bounds&&bounds.width>0&&bounds.x>=0&&bounds.x+bounds.width<=width+1);
  await page.screenshot({path:`${out}/slot${slot}-${width}-${font}-pending.png`});
  await page.evaluate(()=>{Storage.prototype.setItem=storageSet;window.victoryWrites=0;Storage.prototype.setItem=function(k,v){if(k===victoryKey)victoryWrites++;return storageSet.call(this,k,v)};Math.random=()=>{throw Error('Reward rerolled')};});
  await retry.click();await page.waitForFunction(()=>battleRewardGranted);
  assert.equal(await page.evaluate(()=>victoryWrites),1);
  assert(await page.locator('#battleOutcome').isVisible());
  const settled=await page.evaluate(()=>{const raw=localStorage.getItem(victoryKey);retryNormalVictorySave();win();return {one:victoryWrites===1,other:localStorage.getItem(otherKey)===otherDisk,history:JSON.parse(raw).history.wins,exp:save.instances[0].exp,coins:save.coins};});assert(settled.one&&settled.other);assert.equal(settled.history,1);
  // Use the real contract screen and save boundary after the victory commit.
  await page.evaluate(()=>{Math.random=()=>0;Storage.prototype.setItem=storageSet;playContractAnimation=async()=>{};});
  await page.locator('#battleOutcomeActions button').first().click();assert(await page.locator('#contractConfirm').isVisible());
  await page.evaluate(()=>useContractScrollConfirmed());
  assert.equal(await page.evaluate(()=>save.instances.filter(x=>x.id==='slime').length),1);
  await page.evaluate(()=>afterBattleNext());assert(await page.locator('#battleChoices').isVisible());
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>save.history.wins),1);assert.equal(await page.evaluate(()=>save.instances.filter(x=>x.id==='slime').length),1);
  report.cases.push({slot,width,height,font,actualAttack:true,primaryWrites:1,retry:true,contract:true,reload:true});await context.close();
 }
 // Browser coverage of multiple enemies, bosses, gates, golden land and rescue.
 for(const slot of [1,2])for(const kind of ['three','invasion','boss','event','golden','rescue']){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await context.addInitScript(slot=>sessionStorage.setItem('mb_profile_tab_v1',String(slot)),slot);
  const page=await context.newPage();page.on('dialog',d=>d.accept());page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`${origin}/?legacy=1`,{waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  const result=await page.evaluate(async kind=>{
   clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);save.party=[addInstance('aquaron',1).uid];const member=addInstance('freigal',1);save.expeditions.active=[{id:'browser-exp',mapId:'grassland',distanceId:'short',memberUids:[member.uid],progress:0,requiredWins:1,status:'active',suitability:{greatRate:0},reward:null}];saveGame();prepareBattleParty();const request=createHuntRequest(MAPS.find(m=>m.id==='grassland'),by('slime'),'normal',[]);request.battleMode='single';request.invasionEnemyId=null;request.secondEnemyId=null;beginChosenBattle('grassland','slime','normal',request);
   activeHuntRequest.worldMapExploration=true;
   if(kind==='golden')selectedMap={...selectedMap,goldenLand:true};
   if(kind==='boss')enemy={...enemy,bossClass:'ボス'};
   if(kind==='event'){enemy={...by('doom_nemesion')};save.worldMap=normalizeWorldMapState(save.worldMap);save.worldMap.active.crisis={monsterId:enemy.id,remainingBattles:3};activeHuntRequest.worldMapEventKey='crisis';activeHuntRequest.worldMapEventMonsterId=enemy.id;}
   if(kind==='rescue'){save.progress.tutorial.status='in_progress';Object.assign(tutorialBattleSession,{active:true,kind:'elna_rescue',enemyQueue:[],waveIndex:2});}
   const multi=['three','invasion'].includes(kind);
   if(multi)multiBattle={active:true,finished:false,invasion:kind==='invasion',enemies:[{id:'a',mon:enemy,hp:0,alive:false,defeatedByPlayer:true,rewardGranted:false},{id:'b',mon:by('freigal'),hp:0,alive:false,defeatedByPlayer:false,rewardGranted:false}],contractAttempts:{}};
   eHp=0;saveGame();const before=JSON.stringify(save),key=MonsterProfiles.key(SAVE_KEY),disk=localStorage.getItem(key),set=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Injected quota');return set.call(this,k,v)};
   if(multi)winMultiBattle();else win();
   const rolledBack=before===JSON.stringify(save)&&disk===localStorage.getItem(key)&&!battleRewardGranted;
   let writes=0;Storage.prototype.setItem=function(k,v){if(k===key)writes++;return set.call(this,k,v)};
   const random=Math.random;Math.random=()=>{throw Error('Reward rerolled')};retryNormalVictorySave();Math.random=random;
   await new Promise(resolve=>setTimeout(resolve,100));
   Storage.prototype.setItem=set;
   return {rolledBack,committed:battleRewardGranted,writes,wins:save.history.wins,expedition:save.expeditions.active[0].status,step:save.progress.tutorial.stepId,kind};
  },kind);
  assert(result.rolledBack&&result.committed);assert.equal(result.writes,1);assert.equal(result.wins,1);assert.equal(result.expedition,'complete');if(kind==='rescue')assert.equal(result.step,'elna_rescue_complete');
  report.cases.push({slot,...result});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.result='PASS';console.log(`PASS hunt victory browser: ${report.cases.length} flows, two profiles, mobile/landscape/200%, actual attack, failed save/retry, contract, reload, special victories.`);
}finally{
 fs.writeFileSync(`${out}/manifest.json`,JSON.stringify(report,null,2)+'\n');await browser?.close();server.kill();
}
