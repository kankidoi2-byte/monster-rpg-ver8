import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4298'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail)});
 browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:360,height:800},reducedMotion:'reduce'});
 // Real victories can surface a delayed rank notice before the next map click.
 await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>{
   await page.locator('#contractorRankUpOverlay button').click();
 });
 const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const boot=async()=>{await page.goto('http://127.0.0.1:4298/?legacy=1',{waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});};
 async function assertMobileLayout(selector){
   for(const width of [360,412,430]){
     await page.setViewportSize({width,height:800});
     const ok=await page.locator(selector).evaluate(root=>{
       const buttons=[...root.querySelectorAll('button')].filter(el=>el.getClientRects().length).map(el=>el.getBoundingClientRect());
       return document.documentElement.scrollWidth<=innerWidth&&root.scrollWidth<=root.clientWidth+1&&
         buttons.every((a,i)=>a.left>=-1&&a.right<=innerWidth+1&&buttons.slice(i+1).every(b=>
           a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1));
     });
     assert(ok,selector+' layout at '+width+'px');
   }
 }
 await boot();
 await page.evaluate(()=>{
   clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
   Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   const hero=addInstance('voltax',90);save.party=[hero.uid];save.coins=321;save.items.contract_scroll=6;
   save.worldMap.guides.map_intro=true;save.contractor.pendingRankUps=[];saveGame();
   // Model the on-disk format of an older version (including its actual integrity hash).
   delete save.autoBattle;saveGame();
 });
 await boot();
 assert.deepEqual(await page.evaluate(()=>[save.coins,save.items.contract_scroll,save.party.length,save.autoBattle.unlocked.length]),[321,6,1,0]);
 await page.evaluate(()=>{show('home');show('partySet');startBattleFromParty();showWorldMapLocation('grassland');});
 const sw=page.getByRole('switch',{name:/オートで周回/});
 assert(await sw.isDisabled());assert(await page.locator('.ab-shadow').count()>0);
 await assertMobileLayout('.ab-sheet');
 // Settle real single encounters in Grassland Normal through the normal victory receipt.
 const result=await page.evaluate(()=>{
   const map=MAPS.find(m=>m.id==='grassland');
   const targets=autoProgress(map,'d2').targets;
   for(const [i,mon] of targets.entries()){
     const request=createHuntRequest(map,mon,'d2',[],{allowOvertier:false});request.battleMode='single';
     beginChosenBattle(map.id,mon.id,'d2',request);eHp=0;
     if(i===0){
       const before=JSON.stringify(save),orig=Storage.prototype.setItem;
       Storage.prototype.setItem=function(k,v){if(k===MonsterProfiles.key(SAVE_KEY))throw Error('test quota');return orig.call(this,k,v)};
       try{win();if(JSON.stringify(save)!==before||!normalVictoryPending())throw Error('failed victory leaked');}finally{Storage.prototype.setItem=orig;}
       retryNormalVictorySave();
       const gold=save.coins;win();if(save.coins!==gold)throw Error('duplicate');
     }else win();
     afterBattleNext();
   }
   return [targets.length,autoProgress(map,'d2').count,save.autoBattle.unlocked.includes('grassland:d2')];
 });
 assert(result[0]>0&&result[0]===result[1]&&result[2]);
 await page.evaluate(()=>{showBattleChoices();showWorldMapLocation('grassland');worldMapSelectedDifficulty='d2';renderWorldMap(document.getElementById('battleChoiceList'));});
 assert(await sw.isEnabled());assert.match(await page.locator('[data-wm-difficulty="d2"]').innerText(),/討伐 \d+\/\d+ ✓/);
 await sw.click();await assertMobileLayout('.ab-sheet');
 await page.getByRole('button',{name:'10回',exact:true}).click();
 assert.equal(await page.evaluate(()=>save.autoBattle.settings.times),10);
 await page.getByRole('button',{name:'5回',exact:true}).click();
 // A high-level test party makes the five real fights reproducible. Preserve random damage/rewards.
 await page.evaluate(()=>{
   const map=MAPS.find(m=>m.id==='grassland');save.autoBattle.unlocked.push('grassland:d1');
   pendingEvolutions=[];currentEvolution=null;worldMapSelectedDifficulty='d1';autoRefreshSheet();
   save.gBless.on=true;save.gBless.week=5;save.gBless.reserve=0;saveGame();
   window.abBefore=structuredClone(save);
 });
 await sw.click();await page.locator('[data-wm-depart]').click();
 await page.waitForSelector('#renewalLoop:not([hidden])');
 assert(await page.locator('.battle-command-pad').evaluate(pad=>pad.inert));
 await page.evaluate(()=>{autoControl('manual');autoControl('speed');});
 assert(await page.evaluate(()=>autoRun.manual&&autoRun.settings.speed===1));
 assert.equal(await page.locator('#renewalHeader [aria-pressed]').getAttribute('aria-pressed'),'false');
 await assertMobileLayout('#renewalHeader');
 await assertMobileLayout('#renewalLoop');
 await page.locator('#battleSkillButton').click();await page.locator('#commands .skill-button').first().click();
 if(await page.locator('#multiTargetSelect:not(.hidden) button').count())await page.locator('#multiTargetSelect button[onclick*="startMulti"]').first().click();
 await page.evaluate(()=>{if(autoRun?.phase==='fight'){autoControl('speed');autoControl('manual');}});
 // Manual takeover lasts until resumed; a first-turn KO also advances cleanly.
 await page.waitForFunction(()=>autoRun?.phase==='summary',null,{timeout:120000});
 await assertMobileLayout('#autoSummary');
 const totals=await page.evaluate(()=>({wins:autoRun.battles.length,coins:autoRun.coins,delta:save.coins-abBefore.coins,bless:autoRun.bless,remaining:save.gBless.week,reason:autoRun.reason,
   items:Object.entries(autoRun.items).every(([id,n])=>save.items[id]-(abBefore.items[id]||0)===n),
   exp:getPartyInstances().every(ins=>{const old=abBefore.instances.find(x=>x.uid===ins.uid);let delta=ins.exp-old.exp;for(let lv=old.level;lv<ins.level;lv++)delta+=needExp(lv);return autoRun.exp[ins.uid].total===delta}),
   kept:save.items.contract_scroll===abBefore.items.contract_scroll&&save.items.potion===abBefore.items.potion}));
 assert.equal(totals.wins,5);assert.equal(totals.coins,totals.delta);assert(totals.exp&&totals.items&&totals.kept);
 assert.equal(totals.bless,5);assert.equal(totals.remaining,0);assert.match(totals.reason,/G-BLESS/);
 const coins=await page.evaluate(()=>save.coins);await boot();
 assert.deepEqual(await page.evaluate(()=>[save.coins,autoRun]),[coins,null]);
 // Exercise the real continuation UI and contract transactions with controlled encounters.
 async function encounter(options={}){
   await page.evaluate(opts=>{
     clearTutorialUi();showBattleChoices();worldMapDeparting=false;
     save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
     const map=MAPS.find(m=>m.id==='grassland'),mon=by('slime');
     const request=createHuntRequest(map,mon,'d1',[],{allowOvertier:false});request.battleMode='single';
     request.worldMapExploration=true;prepareBattleParty();
     autoRun=autoNewRun(map.id,'d1',5);Object.assign(autoRun.settings,opts);
     if(opts.stopOnNewDex){save.caught=save.caught.filter(id=>id!==mon.id);save.instances=save.instances.filter(i=>i.id!==mon.id);}
     autoBindDeparture(map,request,null);beginChosenBattle(map.id,mon.id,'d1',request);
   },options);
 }
 await encounter({contract:'pause'});
 await page.evaluate(()=>{eHp=0;win()});
 await page.locator('#contractConfirm.active .ab-offer').waitFor();
 await assertMobileLayout('#autoContractChoices');
 assert(!/%/.test(await page.locator('#autoContractChoices').innerText()));
 assert.match(await page.locator('#autoContractChoices').innerText(),/契約書.*×6/);
 await page.getByRole('button',{name:'今回は契約しない'}).click();
 assert(await page.getByRole('button',{name:/周回を続ける/}).isVisible());
 assert.equal(await page.evaluate(()=>save.items.contract_scroll),6);
 await page.getByRole('button',{name:'ここで周回を終える'}).click();
 assert.match(await page.locator('#autoSummary').innerText(),/契約のあと終了/);
 await page.getByRole('button',{name:'世界地図へ',exact:true}).click();
 await encounter({contract:'pause'});
 await page.evaluate(()=>{eHp=0;win()});
 await page.locator('#contractConfirm.active .ab-offer').waitFor();
 await page.evaluate(async()=>{
   const anim=playContractAnimation;playContractAnimation=async()=>{};
   try{await Promise.all([autoContract(0,'contract_scroll'),autoContract(0,'contract_scroll')]);}finally{playContractAnimation=anim;}
 });
 assert.equal(await page.evaluate(()=>save.items.contract_scroll),5);
 assert.match(await page.locator('#battleOutcomeActions').innerText(),/成功|失敗/);
 await page.getByRole('button',{name:/周回を続ける/}).click();
 assert(await page.evaluate(()=>autoRun.phase==='fight'&&autoRun.battles.length===1));
 await page.evaluate(()=>{losePartyBattle()});
 assert.match(await page.locator('#autoSummary').innerText(),/1勝　1敗[\s\S]*負けた/);
 await page.getByRole('button',{name:'世界地図へ',exact:true}).click();
 await encounter({stopOnNewDex:true});
 await page.getByRole('button',{name:'手動で戦闘を続ける'}).click();
 assert(await page.evaluate(()=>!autoRun&&!battleFeedback.finished&&document.querySelector('#battle.active')!==null));
 assert(await page.locator('#battleSkillButton').isVisible());
 // Closing the app during a run keeps exactly the already-committed first victory.
 await page.evaluate(()=>{endPartyRecovery();hideBattleOutcome();});
 await encounter({contract:'skip'});
 const partial=await page.evaluate(()=>{eHp=0;win();return [save.history.wins,save.coins,save.items.contract_scroll];});
 await boot();
 assert.deepEqual(await page.evaluate(()=>[save.history.wins,save.coins,save.items.contract_scroll]),partial);
 assert.equal(await page.evaluate(()=>autoRun),null);
 await encounter();
 await page.evaluate(()=>{autoControl('end');autoControl('end');if(autoRun.stop)throw Error('stop not cancelled');autoControl('end');eHp=0;win();});
 await page.waitForSelector('#autoSummary[open]');
 assert.match(await page.locator('#autoSummary').innerText(),/この戦闘で終了/);
 await page.getByRole('button',{name:/もう一度/}).click();
 assert(await page.evaluate(()=>autoRun?.phase==='fight'&&autoRun.battles.length===0));
 await page.evaluate(()=>{activeHuntRequest.worldMapEventKey='elysia';syncBattleUi()});
 assert.match(await page.locator('#autoSummary').innerText(),/オート対象外/);
 await page.getByRole('button',{name:'手動で戦闘を続ける'}).click();
 assert.equal(await page.locator('#renewalHeader [aria-pressed]').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS real victory rollback/retry, old save, 360/412/430px map, locked roster, complete Normal unlock, manual/auto, five real battles, rewards, G-BLESS and reload.');
}finally{await browser?.close();server.kill();}
