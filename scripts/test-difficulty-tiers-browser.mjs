import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const out='artifacts/save-failure-ui/difficulty-tiers';fs.mkdirSync(out,{recursive:true});
const port=4346,url=`http://127.0.0.1:${port}/?legacy=1`;
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','inherit']});let browser;
const results=[];
try{
 await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail)});
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const viewport of [{width:390,height:844},{width:360,height:640},{width:844,height:390}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  const boot=async()=>{await page.goto(url,{waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});};
  await boot();
  await page.evaluate(()=>{
   clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
   Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   save.worldMap.guides.map_intro=true;save.instances=[];save.party=[];
   for(const id of ['voltax','granbeat','shenhairon'])save.party.push(addInstance(id,100).uid);
   save.coins=321;save.items.contract_scroll=6;save.gBless.on=false;
   save.contractor.exp=contractorCumulativeExpForRank(50);save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');saveGame();
   show('home');show('partySet');startBattleFromParty();showWorldMapLocation('grassland');
  });
  const ids=await page.locator('[data-wm-difficulty]').evaluateAll(els=>els.map(el=>el.dataset.wmDifficulty));
  assert.deepEqual(ids,['d1','d2','d3','d4','d5']);
  for(const [id,label] of [['d1','Ⅰ'],['d2','Ⅱ'],['d3','Ⅲ'],['d4','Ⅳ'],['d5','Ⅴ']]){
   const button=page.locator(`[data-wm-difficulty="${id}"]`);assert(await button.isEnabled());
   await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');assert.match(await button.innerText(),new RegExp('難易度'+label));
  }
  const geometry=await page.locator('.wm-difficulty').evaluate(root=>{
   const rects=[...root.querySelectorAll('button')].map(el=>el.getBoundingClientRect());
   return {pageWidth:document.documentElement.scrollWidth<=innerWidth+1,inside:rects.every(r=>r.left>=-1&&r.right<=innerWidth+1),separate:rects.every((a,i)=>rects.slice(i+1).every(b=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1))};
  });assert(geometry.pageWidth&&geometry.inside&&geometry.separate,JSON.stringify({viewport,geometry}));
  const preview=await page.locator('.wm-detail').innerText();assert(!/格上|ヌシ/.test(preview));
  await page.screenshot({path:`${out}/tiers-${viewport.width}.png`});
  // Control only the encounter RNG. Real map departure, generated candidate pools,
  // battle rendering and retreat remain in use. Draws: elevation, species, level, mode.
  await page.evaluate(()=>{
   window.dtOriginalCreate=createHuntRequest;window.dtRequests=[];
   createHuntRequest=function(map,mon,d,conditions,options={}){
    let i=0;const draws=[0,.5,.5,.99];
    const request=dtOriginalCreate(map,mon,d,conditions,{...options,contractorRank:50,randomFn:()=>draws[i++]??.99});
    dtRequests.push(request);return request;
   };
  });
  for(const [tier,label,min,max] of [['d1','格上',6,18],['d5','ヌシ',61,70]]){
   await page.evaluate(()=>{autoClearTimer();autoRun=null;endPartyRecovery();hideBattleOutcome();showBattleChoices();showWorldMapLocation('grassland');});
   await page.locator(`[data-wm-difficulty="${tier}"]`).click();
   assert(!/格上|ヌシ/.test(await page.locator('.wm-detail').innerText()));
   await page.locator('[data-wm-depart]').click();
   await page.waitForFunction(label=>document.querySelector('#battle.active')&&document.getElementById('eName').textContent.includes(label),label,{timeout:15000});
   const actual=await page.evaluate(()=>({level:activeHuntRequest.enemyLevel,kind:activeHuntRequest.overtier,enemyId:enemy.id,requestedId:activeHuntRequest.enemyId,log:document.getElementById('log').innerText}));
   assert((await page.locator('#eName').innerText()).startsWith('【'+label+'】'));assert(actual.level>=min&&actual.level<=max);assert.equal(actual.enemyId,actual.requestedId);assert.match(actual.log,new RegExp(label));
   await page.screenshot({path:`${out}/${tier}-${viewport.width}.png`});
   await page.evaluate(()=>runAway());await page.waitForFunction(()=>document.getElementById('battleOutcome').classList.contains('is-retreat'));
   assert.match(await page.locator('#battleOutcome').innerText(),/撤退/);
  }
  // Three-way fixture: primary alone is the nushi, including reward/attack state.
  const multi=await page.evaluate(()=>{
   endPartyRecovery();hideBattleOutcome();const map=MAPS.find(m=>m.id==='grassland'),mon=worldMapCandidates(map,'d5')[0];
   const request=createHuntRequest(map,mon,'d5',[]);request.battleMode='three_way';request.secondEnemyId=worldMapCandidates(map,'d5').find(m=>m.id!==request.enemyId)?.id||mon.id;
   prepareBattleParty();beginChosenBattle(map.id,request.enemyId,'d5',request);
   return multiBattle.enemies.map(e=>({level:e.level,attack:e.attackMultiplier,reward:e.rewardMultiplier}));
  });
  assert(multi[0].level>=61&&multi[0].level<=70);assert.equal(multi[0].attack,1.8);assert.equal(multi[0].reward,7.2);
  assert(multi[1].level>=46&&multi[1].level<=60);assert.equal(multi[1].attack,1);assert.equal(multi[1].reward,2.4);
  assert.match(await page.locator('#enemy_aCard h2').innerText(),/ヌシ/);assert(!/格上|ヌシ/.test(await page.locator('#enemy_bCard h2').innerText()));
  await page.screenshot({path:`${out}/multi-${viewport.width}.png`});await page.evaluate(()=>runAway());
  // Rank threshold and migration are viewport-independent; run once in the real app.
  if(viewport.width===390){
   const thresholds=await page.evaluate(()=>{
    const map=MAPS.find(m=>m.id==='grassland'),mon=by('slime');
    return [1,50].map(rank=>dtOriginalCreate(map,mon,'d1',[],{contractorRank:rank,randomFn:()=>.15}).overtier);
   });assert.deepEqual(thresholds,[null,'stronger']);
   const autoStart=await page.evaluate(()=>{
    endPartyRecovery();hideBattleOutcome();worldMapDeparting=false;const map=MAPS.find(m=>m.id==='grassland');
    save.autoBattle.unlocked.push('grassland:d1');save.contractor.exp=contractorCumulativeExpForRank(50);save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
    save.autoBattle.settings={...save.autoBattle.settings,contract:'skip',stopOnNewDex:false,stopOnBlessEmpty:false};saveGame();
    const request=createHuntRequest(map,by('slime'),'d1',[]);request.worldMapExploration=true;prepareBattleParty();
    autoRun=autoNewRun(map.id,'d1',5);autoBindDeparture(map,request,null);beginChosenBattle(map.id,request.enemyId,'d1',request);
    autoClearTimer();eHp=0;win();return {kind:request.overtier,phase:autoRun.phase,wins:autoRun.battles.length};
   });assert.equal(autoStart.kind,'stronger');assert.equal(autoStart.phase,'between');assert.equal(autoStart.wins,1);
   await page.waitForFunction(()=>autoRun?.phase==='fight'&&autoRun.battles.length===1,null,{timeout:15000});
   const continued=await page.evaluate(()=>{const v={phase:autoRun.phase,manual:autoRun.manual,kind:activeHuntRequest.overtier,reason:autoRun.reason};autoClearTimer();autoRun.manual=true;return v;});
   assert.deepEqual(continued,{phase:'fight',manual:false,kind:'stronger',reason:''});await page.screenshot({path:`${out}/auto-continued.png`});
   for(const [old,id] of [['easy','d1'],['normal','d2'],['hard','d4']]){
    await page.evaluate(old=>{
     autoClearTimer();autoRun=null;endPartyRecovery();hideBattleOutcome();
     save.worldMap.navigation={...save.worldMap.navigation,mapId:'grassland',eventKey:null,difficultyId:old};
     save.autoBattle.defeated={'grassland:easy':['slime'],'grassland:normal':['goblin'],'grassland:hard':['granbeat']};
     save.autoBattle.unlocked=['grassland:easy','grassland:normal','grassland:hard'];saveGame();
    },old);await boot();
    const migrated=await page.evaluate(()=>({selected:save.worldMap.navigation.difficultyId,unlocked:save.autoBattle.unlocked,keys:Object.keys(save.autoBattle.defeated),coins:save.coins,scrolls:save.items.contract_scroll}));
    assert.equal(migrated.selected,id);assert.deepEqual(migrated.unlocked,['grassland:d1','grassland:d2','grassland:d4']);assert.deepEqual(migrated.keys,['grassland:d1','grassland:d2','grassland:d4']);assert.equal(migrated.scrolls,6);
   }
  }
  assert.deepEqual(errors,[]);results.push({viewport,geometry,screenshots:['tiers','d1','d5','multi'].map(name=>`${name}-${viewport.width}.png`)});await page.close();
 }
 fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));
 console.log('PASS difficulty browser: 390/360/landscape five tiers, predeparture privacy, rank threshold, stronger/nushi, retreat, first-only multi bonus, auto continuation and old-save reload migration.');
}finally{await browser?.close();server.kill();}
