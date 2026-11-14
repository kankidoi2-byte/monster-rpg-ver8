import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const out='artifacts/prologue-part2';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','4387'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail)});
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 const boot=async()=>{await page.goto('http://127.0.0.1:4387/?legacy=1');await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});};
 await boot();
 async function seed(id,cursor=null){
  await page.evaluate(({id,cursor})=>{
   clearTutorialUi();closeProloguePart2Battle();prologuePart2StopText();prologuePart2Ui=null;prologuePart2Retry=null;
   save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
   Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   save.instances=[];save.party=[];const a=addInstance('freigal',12);save.party=[a.uid];
   save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
   save.coins=500;for(const ep of prologuePart2Episodes()){if(ep.id===id)break;save.prologuePart2.episodes[ep.id]={...prologuePart2DefaultEpisode(),completed:true,rewardClaimed:true};}
   save.prologuePart2.episodes[id]={...prologuePart2DefaultEpisode(),cursor};saveGame();openProloguePart2(id);
  },{id,cursor});
 }
 async function next(){await page.evaluate(()=>prologuePart2Typewriter?.finish());await page.locator('#prologuePart2Content [aria-label="次へ"]').click();}
 const card=()=>page.locator('#prologuePart2Content [data-card]').getAttribute('data-card');
 // Complete the real first-half finish transaction and enter episode 7 directly.
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();save.progress.tutorial.expeditionDispatched=true;
  tutorialUiState.active=true;tutorialUiState.persist=true;tutorialUiState.flowId=TUTORIAL_MAIN_FLOW_ID;
  finishTutorialFlow();
 });
 assert.equal(await card(),'pb_07_pre_01');
 assert.equal(await page.evaluate(()=>save.prologuePart2.completed),false);
 assert(!(await page.locator('body').innerText()).includes('序章完了！'));
 await seed('pb_07');
 assert.equal(await card(),'pb_07_pre_01');
 assert.equal(await page.evaluate(()=>authorityUnlocked()),false);
 await next();const resume=await card();
 await boot();await page.evaluate(()=>{clearTutorialUi();openStoryMode()});
 await page.locator('button[onclick="openProloguePart2()"] ').click();assert.equal(await card(),resume);
 // Dedicated battle controller integration: a won first encounter survives second defeat/reload.
 const firstBattleCursor=await page.evaluate(()=>prologuePart2Episode('pb_07').steps.find(s=>s.battleId==='p2_07_a').id);
 await seed('pb_07',firstBattleCursor);
 const normalBefore=await page.evaluate(()=>({coins:save.coins,history:JSON.stringify(save.history),autoBattle:JSON.stringify(save.autoBattle),mapStories:JSON.stringify(save.mapStories),expeditions:JSON.stringify(save.expeditions),instances:JSON.stringify(save.instances),scroll:save.items.contract_scroll}));
 await page.getByRole('button',{name:'戦闘開始',exact:true}).click();
 assert.equal(await page.evaluate(()=>activeHuntRequest.battleId),'p2_07_a');
 // Deterministic outcome fixture uses the real win -> durable controller callback.
 await page.evaluate(()=>{eHp=0;win();});
 assert.deepEqual(await page.evaluate(()=>save.prologuePart2.episodes.pb_07.wonBattleIds),['p2_07_a']);
 assert.equal(await page.evaluate(()=>save.items.contract_scroll),normalBefore.scroll+1);
 for(let i=0;i<12;i++){
  if(await page.getByRole('button',{name:'契約を確認',exact:true}).isVisible())break;
  await next();
 }
 await page.getByRole('button',{name:'契約を確認',exact:true}).click();
 await page.getByRole('button',{name:'契約を見送る',exact:true}).click();
 assert.equal(await page.evaluate(()=>save.prologuePart2.episodes.pb_07.contractOutcome),'skip');
 for(let i=0;i<12;i++){
  if(await page.getByRole('button',{name:'戦闘開始',exact:true}).isVisible())break;
  await next();
 }
 const secondCursor=await card();
 await page.getByRole('button',{name:'戦闘開始',exact:true}).click();
 assert.equal(await page.evaluate(()=>activeHuntRequest.battleId),'p2_07_b');
 await page.evaluate(()=>{pHp=0;partyBattle.forEach(p=>{p.hp=0;p.fainted=true;});losePartyBattle();});
 await page.getByRole('button',{name:'再挑戦',exact:true}).click();
 assert.equal(await card(),secondCursor);
 await boot();await page.evaluate(()=>{clearTutorialUi();openProloguePart2('pb_07')});
 assert.equal(await card(),secondCursor);
 assert.deepEqual(await page.evaluate(()=>save.prologuePart2.episodes.pb_07.wonBattleIds),['p2_07_a']);
 assert.equal(await page.evaluate(()=>save.prologuePart2.episodes.pb_07.contractOutcome),'skip');
 await page.getByRole('button',{name:'戦闘開始',exact:true}).click();
 assert.equal(await page.evaluate(()=>activeHuntRequest.battleId),'p2_07_b');
 await page.evaluate(()=>{eHp=0;win();});
 assert.deepEqual(await page.evaluate(()=>save.prologuePart2.episodes.pb_07.wonBattleIds),['p2_07_a','p2_07_b']);
 assert.deepEqual(await page.evaluate(()=>({coins:save.coins,history:JSON.stringify(save.history),autoBattle:JSON.stringify(save.autoBattle),mapStories:JSON.stringify(save.mapStories),expeditions:JSON.stringify(save.expeditions),instances:JSON.stringify(save.instances),scroll:save.items.contract_scroll})),{...normalBefore,scroll:normalBefore.scroll+1});
 // Optional link practice is skippable without changing private party/assets or recorded wins.
 const practiceCursor=await page.evaluate(()=>prologuePart2Episode('pb_14').steps.find(s=>s.action==='linkPractice').id);
 await seed('pb_14',practiceCursor);
 await page.evaluate(()=>{save.prologuePart2.episodes.pb_14.wonBattleIds=['p2_14_a'];saveGame();});
 const practiceBefore=await page.evaluate(()=>JSON.stringify({instances:save.instances,items:save.items,coins:save.coins,skills:save.skillCards,party:save.party}));
 await page.getByRole('button',{name:'後で見る',exact:true}).click();
 assert.notEqual(await card(),practiceCursor);
 assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,items:save.items,coins:save.coins,skills:save.skillCards,party:save.party})),practiceBefore);
 assert.deepEqual(await page.evaluate(()=>save.prologuePart2.episodes.pb_14.wonBattleIds),['p2_14_a']);
 assert.equal(await page.evaluate(()=>save.prologuePart2.trainingSeen.pb14===true),false);
 // The epilogue route goes out and back via the existing map UI, without a battle/unlock grant.
 const routeCursor=await page.evaluate(()=>prologuePart2Episode('pb_ep').steps.find(s=>s.action==='returnRoute').id);
 await seed('pb_ep',routeCursor);
 const routeBefore=await page.evaluate(()=>JSON.stringify({coins:save.coins,items:save.items,mapDex:save.mapDex,history:save.history}));
 await page.getByRole('button',{name:'バトルから世界地図へ',exact:true}).click();
 assert(await page.locator('#prologuePart2WorldReturn').isVisible());
 assert.equal(await page.evaluate(()=>activeHuntRequest),null);
 await page.locator('#prologuePart2WorldReturn').click();
 assert.notEqual(await card(),routeCursor);
 assert.equal(await page.evaluate(()=>JSON.stringify({coins:save.coins,items:save.items,mapDex:save.mapDex,history:save.history})),routeBefore);
 // Both shop branches use the actual shop purchase/return UI.
 for(const bought of [false,true]){
  await seed('pb_08',await page.evaluate(()=>prologuePart2Episode('pb_08').steps.find(s=>s.action==='shop').id));
  await page.getByRole('button',{name:'ショップを開く',exact:true}).click();
  if(bought)await page.locator('button[onclick="buyItem(\'potion\')"]').click();
  await page.locator('[data-prologue-shop-return]').click();
  for(let i=0;i<5&&(await card())!=='pb_08_post_01';i++)await next();
  assert.equal(await card(),'pb_08_post_01');await page.evaluate(()=>prologuePart2Typewriter?.finish());
  assert.equal(await page.locator('#prologuePart2Text').innerText(),bought?'毎度あり！次もご贔屓に～！':'あら、今日は見るだけ？ 次はちゃんと買ってってね～！');
 }
 // All of episode 22 advances via displayed cards without entering any battle.
 await seed('pb_22');const seen22=[];
 for(let i=0;i<90;i++){
  const state=await page.evaluate(()=>({id:prologuePart2Step().id,kind:prologuePart2Step().kind,battle:!!activeHuntRequest}));
  assert.equal(state.battle,false);assert.notEqual(state.kind,'battle');seen22.push(state.id);
  if(state.kind==='complete')break;
  if(state.kind==='event')await page.locator('#prologuePart2Content .map-story-actions button').first().click();else await next();
 }
 assert(seen22.includes('pb_22_post_13'));assert.equal(seen22.at(-1),'pb_22_complete');
 await page.screenshot({path:out+'/episode22-mobile.png'});
 // Verify reordered epilogue with real navigation; no removed duplicate decision cards.
 await seed('pb_ep','pb_ep_dragon_15');const observed=[];
 for(let i=0;i<35;i++){const id=await card();observed.push(id);if(id==='pb_ep_gacha_01')break;await next();}
 const ordered=['pb_ep_dragon_15','pb_ep_post_03','pb_ep_post_04','pb_ep_post_05','pb_ep_dragon_16','pb_ep_dragon_17','pb_ep_post_05b','pb_ep_post_05c','pb_ep_post_05d','pb_ep_dragon_19','pb_ep_dragon_20','pb_ep_dragon_21','pb_ep_dragon_22','pb_ep_battle','pb_ep_post_01','pb_ep_post_02','pb_ep_gacha_01'];
 assert.deepEqual(observed,ordered);
 // Inject a primary write failure only; completion/coins/unlock must roll back together.
 await seed('pb_ep','pb_ep_complete');
 const before=await page.evaluate(()=>({coins:save.coins,items:JSON.stringify(save.items),instances:JSON.stringify(save.instances),tutorial:JSON.stringify(save.progress.tutorial)}));
 await page.evaluate(()=>{window.p2StorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.endsWith(SAVE_KEY))throw Error('test quota');return window.p2StorageSet.call(this,key,value);};});
 await page.getByRole('button',{name:'序章を終える',exact:true}).click();
 assert(await page.getByRole('button',{name:'保存を再試行',exact:true}).isVisible());
 assert.deepEqual(await page.evaluate(()=>({coins:save.coins,completed:save.prologuePart2.completed,hub:save.prologuePart2.hubArrived,authority:authorityUnlocked()})),{coins:before.coins,completed:false,hub:false,authority:false});
 await page.evaluate(()=>{Storage.prototype.setItem=window.p2StorageSet;});
 await page.getByRole('button',{name:'保存を再試行',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>({coins:save.coins,completed:save.prologuePart2.completed,hub:save.prologuePart2.hubArrived,authority:authorityUnlocked(),claimed:save.prologuePart2.episodes.pb_ep.rewardClaimed})),{coins:before.coins+100,completed:true,hub:true,authority:true,claimed:true});
 await boot();await page.evaluate(()=>{clearTutorialUi();show('growthHub')});
 assert(await page.locator('#authoritySection').isVisible());await page.locator('#authorityBoard button').click();assert.equal(await page.locator('#authorityEffect').innerText(),'0の権能');
 const after=await page.evaluate(()=>({coins:save.coins,items:JSON.stringify(save.items),instances:JSON.stringify(save.instances),tutorial:JSON.stringify(save.progress.tutorial)}));
 assert.deepEqual(after,{...before,coins:before.coins+100});
 await page.evaluate(()=>{openProloguePart2('pb_ep',{replay:true});prologuePart2Ui.index=prologuePart2Episode('pb_ep').steps.length-1;renderProloguePart2()});
 await page.getByRole('button',{name:'読み返しを終える',exact:true}).click();assert.equal(await page.evaluate(()=>save.coins),before.coins+100);
 assert.deepEqual(errors,[]);console.log('PASS prologue part2 browser: legacy resume, dedicated battle/contract/defeat retry, practice skip, return route, shop branches, episode22 no battle, epilogue exact order, atomic failure/retry/reload, authority, no duplicate reward or unrelated save changes');
}finally{await browser?.close();server.kill();}
