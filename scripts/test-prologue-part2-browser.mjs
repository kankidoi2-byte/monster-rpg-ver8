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
 // The first six episodes use the same reader without tutorial or save side effects.
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();save.progress.tutorial.status='in_progress';save.progress.tutorial.stepId='stella_intro';
  save.progress.tutorial.chapterGate=true;save.contractor.pendingRankUps=[];openStoryMode();
 });
 assert.equal(await page.locator('[data-prologue-replay]').count(),3);
 assert.equal(await page.evaluate(()=>openPrologueReplay('stella')),false);
 assert.equal(await page.evaluate(()=>openPrologueReplay('expedition')),false);
 await page.evaluate(()=>{
  skipTutorial();save.progress.tutorial.playerName='テスト契約者';
  openStoryMode();
  // A replay must not refresh old G-BLESS data or normalize progress into the live save.
  save.gBless.weekKey='2026-01-01';save.gBless.week=7;
  window.replayStorageSet=Storage.prototype.setItem;window.replayStorageWrites=0;
  Storage.prototype.setItem=function(...args){if(!String(args[0]).startsWith('mb_analytics_queue_'))window.replayStorageWrites++;return window.replayStorageSet.apply(this,args);};
  window.replaySave=JSON.stringify(save);window.replayTutorial=save.progress.tutorial;
 });
 assert.equal(await page.locator('[data-prologue-replay]').count(),6);
 // Mixed pages retain only the original narrative substring, not the action text.
 const condensed=await page.evaluate(()=>PROLOGUE_STORY_EPISODES.flatMap(e=>storyPrologueReplayEpisode(e.id).steps)
  .filter(s=>Object.hasOwn(PROLOGUE_REPLAY_GUIDANCE_START,s.sourceId)).map(s=>[s.sourceId,s.text]));
 assert.deepEqual(condensed,[
  ['elna_contract_body','これがエルナの契約体だ！'],
  ['home_requests','エルナを助けたことを報告しに行こう！'],
  ['request_accept','救援が依頼として認められたぞ！'],
  ['lumina_world_map_visit','魔法使いは学園の地下へ行ったぞ。'],
  ['expedition_party_plan','ちぇ～。君がそういうなら仕方ないか。\nでもこれで、君が使える契約の力は4つになったぞ！ だけど1度のバトルで使える力は3つまで…。あ、そうだ！ ガルドラはボク達と一緒に行こう。今回はフレイガルに遠征を頼むんだ！']
 ]);
 assert.deepEqual(await page.evaluate(()=>storyPrologueReplayEpisode('preparations').steps.slice(0,-1).map(s=>s.sourceId)),['home_requests','request_accept','request_reward_received']);
 assert.equal(await page.evaluate(()=>PROLOGUE_STORY_EPISODES.some(e=>storyPrologueReplayEpisode(e.id).steps.some(s=>['stella_card_receive','stella_mock_battle','expedition_active','expedition_dispatch','expedition_replay'].includes(s.sourceId)))),false);
 const replayIds=await page.locator('[data-prologue-replay]').evaluateAll(buttons=>buttons.map(button=>button.dataset.prologueReplay));
 for(const id of replayIds){
  const replayCard=page.locator(`[data-prologue-replay="${id}"]`);
  await replayCard.click();
  const expected=await page.evaluate(id=>storyPrologueReplayEpisode(id).steps.filter(s=>s.kind!=='complete').map(s=>[s.id,prologuePart2PlayerText(s.text)]),id);
  assert(expected.length>0);
  for(const [stepId,text] of expected){
   assert.equal(await card(),stepId);
   assert.equal(await page.evaluate(()=>{prologuePart2Typewriter?.finish();return document.querySelector('#prologuePart2Text').textContent;}),text);
   assert.equal(await page.evaluate(()=>tutorialUiState.active||Boolean(activeHuntRequest)),false);
   assert.equal(await page.locator('#prologuePart2Content button').filter({hasText:/戦闘開始|編成を確認|契約を確認/}).count(),0);
   await next();
  }
  await page.getByRole('button',{name:'読み返しを終える',exact:true}).click();
  assert(await page.locator('#storyMode.active').isVisible());
  assert.equal(await replayCard.evaluate(button=>document.activeElement===button),true);
 }
 await page.locator('[data-prologue-replay="awakening"]').click();
 await page.getByRole('button',{name:'会話を閉じて話一覧へ戻る'}).click();
 assert.deepEqual(await page.evaluate(()=>({writes:window.replayStorageWrites,same:window.replaySave===JSON.stringify(save),sameTutorial:window.replayTutorial===save.progress.tutorial})),{writes:0,same:true,sameTutorial:true});
 await page.evaluate(()=>{Storage.prototype.setItem=window.replayStorageSet;});
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
 const ordinaryState=()=>page.evaluate(()=>({coins:save.coins,history:JSON.stringify(save.history),autoBattle:JSON.stringify(save.autoBattle),mapStories:JSON.stringify(save.mapStories),expeditions:JSON.stringify(save.expeditions),instances:JSON.stringify(save.instances),scroll:save.items.contract_scroll}));
 const confirmScene=page.getByRole('button',{name:'契約を確認',exact:true});
 const choice=page.locator('#prologueContractChoice');
 const recap=choice.locator('[data-prologue-contract-recap]');
 async function winSlimeWithSwitch(){
  await seed('pb_07',firstBattleCursor);
  await page.evaluate(()=>{
   const elna=addInstance('elna_beginner',30);save.party.push(elna.uid);saveGame();
   combatRandom=()=>0.9; // Favors offensive moves so the replacement takes damage.
   if(!window.__observeStorySlime){
    const settle=prologuePart2BattleOutcome;
    prologuePart2BattleOutcome=kind=>{
     if(kind==='victory'&&activeHuntRequest?.battleId==='p2_07_a'&&eHp<=0){
      window.__actualStorySlime={name:player.name,hp:pHp,maxHp:playerMaxHp(),turns:battleTurnCount+Number(battleTurnInProgress)};
     }
     return settle(kind);
    };
    window.__observeStorySlime=true;
   }
   window.__actualStorySlime=null;
  });
  const before=await ordinaryState();
  await page.getByRole('button',{name:'戦闘開始',exact:true}).click();
  assert.equal(await page.evaluate(()=>activeHuntRequest.battleId),'p2_07_a');
  assert.match(await page.locator('#renewalHeader').innerText(),/王都外・街道/);
  const originalLead=await page.evaluate(()=>player.name);
  for(const reserve of [1,0,1]){
   await page.locator(`#renewalParty [data-reserve-index="${reserve}"]`).click();
   await page.waitForFunction(index=>!busy&&activePartyIdx===index,reserve);
  }
  for(let i=0;i<6&&await page.locator('#battle').isVisible();i++){
   await page.locator('#battleSkillButton').click();
   await page.locator('#commands .skill-button').first().click();
   await page.waitForFunction(()=>!busy||activeScreenId()!=='battle');
  }
  await confirmScene.waitFor({state:'visible'});
  const actual=await page.evaluate(()=>window.__actualStorySlime);
  assert(actual&&actual.turns>=2&&actual.name!==originalLead&&actual.hp<actual.maxHp,JSON.stringify({actual,originalLead}));
  assert.deepEqual(await page.evaluate(()=>save.prologuePart2.episodes.pb_07.wonBattleIds),['p2_07_a']);
  assert.deepEqual(await ordinaryState(),{...before,scroll:before.scroll+1});
  return {before,actual};
 }
 const {before:normalBefore,actual}=await winSlimeWithSwitch();
 await confirmScene.click();
 assert(await choice.isVisible());
 assert(await choice.getByRole('heading',{name:'契約候補：スライム'}).isVisible());
 assert(await choice.getByText(`契約書：${normalBefore.scroll+1}枚`,{exact:false}).isVisible());
 assert.match(await recap.innerText(),new RegExp(`^王都外・街道 · ${actual.turns}ターン\\s+決着時：${actual.name} · HP ${actual.hp} / ${actual.maxHp}$`));
 for(const oldBattleDisplay of ['#renewalHeader','.battle-arena','#renewalParty','#battleOutcome'])assert.equal(await page.locator(oldBattleDisplay).isVisible(),false);
 await page.screenshot({path:`${out}/chapter7-contract-fresh.png`});
 // A reload retains the earned contract option but has no trustworthy transient turn/HP values.
 await boot();await page.evaluate(()=>{clearTutorialUi();openProloguePart2('pb_07')});
 await confirmScene.click();
 assert.equal(await recap.innerText(),'王都外・街道');
 assert(!/草原|0ターン|決着時|HP/.test(await choice.innerText()));
 await page.screenshot({path:`${out}/chapter7-contract-reloaded.png`});
 await choice.getByRole('button',{name:'契約を見送る',exact:true}).click();
 assert.equal(await page.evaluate(()=>save.prologuePart2.episodes.pb_07.contractOutcome),'skip');
 assert.deepEqual(await ordinaryState(),{...normalBefore,scroll:normalBefore.scroll+1});
 console.log(`PASS Chapter 7 contract recap: 王都外・街道 · ${actual.turns}ターン · ${actual.name} HP ${actual.hp}/${actual.maxHp}; reload omits unknown stats; decline does not spend or award twice`);
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
 const {before:contractBefore}=await winSlimeWithSwitch();
 await confirmScene.click();
 await choice.getByRole('button',{name:'スライムと契約',exact:true}).click();
 await page.locator('#contractConfirm').getByRole('button',{name:'いいえ',exact:true}).click();
 assert(await choice.isVisible(),'cancelling the scroll screen restores the contract choice');
 assert.equal(await page.evaluate(()=>save.items.contract_scroll),contractBefore.scroll+1,'cancelling a selection does not consume a scroll');
 await choice.getByRole('button',{name:'スライムと契約',exact:true}).click();
 await page.evaluate(()=>{window.__nativeContractRandom=Math.random;Math.random=()=>0;}); // Deterministic successful contract using the production path.
 await page.locator('#contractConfirmAcceptButton').click();
 await page.locator('#prologuePart2').waitFor({state:'visible'});
 assert.equal(await card(),'pb_07_contract_ok');
 assert.equal(await page.evaluate(()=>{Math.random=window.__nativeContractRandom;return save.prologuePart2.episodes.pb_07.contractOutcome;}),'ok');
 const contractAfter=await ordinaryState();
 assert.equal(contractAfter.scroll,contractBefore.scroll,'only the one awarded scroll was spent');
 const {instances:recruited,...ordinaryAfterContract}=contractAfter;
 const {instances:beforeRecruitment,...ordinaryBeforeContract}=contractBefore;
 assert.deepEqual(ordinaryAfterContract,ordinaryBeforeContract);
 assert.equal(JSON.parse(recruited).length,JSON.parse(beforeRecruitment).length+1);
 assert.equal(JSON.parse(recruited).filter(i=>i.id==='slime').length,1);
 assert.equal(await page.evaluate(()=>tryProloguePart2Contract('contract_scroll')),false,'cannot reuse a decided contract');
 await boot();await page.evaluate(()=>{clearTutorialUi();openProloguePart2('pb_07')});
 assert.equal(await card(),'pb_07_contract_ok');
 assert.equal(await page.evaluate(()=>save.items.contract_scroll),contractBefore.scroll);
 assert.equal(await page.evaluate(()=>save.instances.filter(i=>i.id==='slime').length),1);
 console.log('PASS Chapter 7 contract: cancel returns to choice; accept spends one scroll, recruits one slime, continues story and cannot repeat on reload');
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
 // Enter the exercise using the displayed copy, then complete the finale both directly
 // and after leaving for Home. A normal visit to the map never carries the special return.
 const routeCursor='pb_ep_return_route',routeStart='pb_ep_post_10';
 const returnLabel='世界の狭間へ戻って物語を続ける';
 const routeButton=page.getByRole('button',{name:returnLabel,exact:true});
 const openRoute=()=>page.getByRole('button',{name:'バトルから世界地図へ',exact:true}).click();
 const home=()=>page.locator('[data-nav="home"]').click();
 const list=()=>page.locator('#homeAdventureButton').click();
 const resumeFinale=()=>page.locator('#storyContinueCard').getByRole('button',{name:/再開する/}).click();
 const mapAssets=()=>page.evaluate(()=>JSON.stringify({coins:save.coins,items:save.items,mapDex:save.mapDex,history:save.history}));
 for(const viaHome of [false,true]){
  await seed('pb_ep',routeStart);
  await page.evaluate(()=>prologuePart2Typewriter?.finish());
  assert((await page.locator('#prologuePart2Text').innerText()).includes('「'+returnLabel+'」'));
  await next();
  assert.equal(await card(),routeCursor);
  const routeBefore=await mapAssets();
  await openRoute();
  await routeButton.waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>activeHuntRequest),null);
  if(viaHome){
   await home();
   await page.locator('#home .home-battle-button').click();
   await page.locator('#battleChoices.active').waitFor({state:'visible'});
   assert.equal(await routeButton.count(),0,'ordinary map has no special return even after leaving the exercise');
   await home();
   await list();
   assert.match(await page.locator('#storyChapterProgress').innerText(),/22\/23 完了/);
   await resumeFinale();
   assert.equal(await card(),routeCursor);
   await openRoute();
   await routeButton.waitFor({state:'visible'});
  }
  await routeButton.click();
  assert.equal(await card(),'pb_ep_post_11');
  assert.equal(await mapAssets(),routeBefore);
  for(let step=0;step<12&&(await card())!=='pb_ep_complete';step++)await next();
  assert.equal(await card(),'pb_ep_complete');
  await page.getByRole('button',{name:'序章を終える',exact:true}).click();
  assert.equal(await page.locator('#prologuePart2Content .prologue-part2-finish h2').innerText(),'終幕 完了');
  await page.getByRole('button',{name:'話一覧へ',exact:true}).click();
  assert.equal(await page.locator('#storyChapterProgress').innerText(),'23/23 完了');
  console.log(`PASS finale map return: ${viaHome?'Home then resume; ordinary map isolated':'direct'} -> 終幕 完了 (23/23)`);
 }
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
 // Ordinary completion saves once, returns directly to the list, and calls out the next card.
 const rewards22=await page.evaluate(()=>prologuePart2Episode('pb_22').rewards);
 const coins22=await page.evaluate(()=>save.coins);
 await page.getByRole('button',{name:'第22話を終える',exact:true}).click();
 assert(await page.locator('#storyMode.active').isVisible());
 assert.equal(await page.locator('#prologuePart2Content .prologue-part2-finish').count(),0);
 let highlight=page.locator('#storyEpisodeList .story-episode-next-highlight');
 assert.match(await highlight.innerText(),/終幕/);
 assert.equal(await highlight.locator('.story-episode-status').innerText(),'NEXT');
 assert.equal(await page.evaluate(()=>save.coins),coins22+rewards22.coins);
 assert.equal(await page.evaluate(()=>save.prologuePart2.episodes.pb_22.completed),true);
 const completionNotice=page.locator('#uiNotice.is-story-complete.is-visible');
 assert.match(await completionNotice.innerText(),/第22話 完了/);
 if(rewards22.coins)assert((await completionNotice.innerText()).includes('コイン+'+rewards22.coins.toLocaleString('ja-JP')));
 if(rewards22.exp)assert((await completionNotice.innerText()).includes('EXP+'+rewards22.exp.toLocaleString('ja-JP')));
 assert.equal(await completionNotice.evaluate(node=>getComputedStyle(node).opacity),'1','reduced motion does not hide completion toast');
 await completionNotice.waitFor({state:'detached'});
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
 assert.equal(await page.locator('#prologuePart2Content .prologue-part2-finish h2').innerText(),'終幕 完了');
 assert(await page.locator('#prologuePart2Content').getByRole('button',{name:'拠点へ',exact:true}).isVisible());
 await boot();await page.evaluate(()=>{clearTutorialUi();show('growthHub')});
 assert(await page.locator('#authoritySection').isVisible());await page.locator('#authorityBoard button').click();assert.equal(await page.locator('#authorityEffect').innerText(),'0の権能');
 const after=await page.evaluate(()=>({coins:save.coins,items:JSON.stringify(save.items),instances:JSON.stringify(save.instances),tutorial:JSON.stringify(save.progress.tutorial)}));
 assert.deepEqual(after,{...before,coins:before.coins+100});
 await page.evaluate(()=>{openProloguePart2('pb_ep',{replay:true});prologuePart2Ui.index=prologuePart2Episode('pb_ep').steps.length-1;renderProloguePart2()});
 await page.getByRole('button',{name:'読み返しを終える',exact:true}).click();assert.equal(await page.evaluate(()=>save.coins),before.coins+100);
 // In episode 7, each official scroll label and its specific stock must be
 // plain text. Use fresh isolated inventories with every lower tier still owned.
 const kinds=[
  ['contract_scroll','契約書'],['silver_contract_scroll','銀の契約書'],
  ['gold_contract_scroll','金の契約書'],['rainbow_contract_scroll','虹の契約書']
 ];
 await page.evaluate(()=>showShop());
 for(const [id,name] of kinds){
  const image=page.locator(`#shopList img[src$="/${id}_art_v1.webp"]`);
  assert(await image.isVisible());
  assert.equal(await image.getAttribute('alt'),name);
  await image.evaluate(el=>el.decode());
 }
 const contractCursor=await page.evaluate(()=>prologuePart2Episode('pb_07').steps.find(step=>step.action==='contract').id);
 const inventoryState=()=>page.evaluate(ids=>({
  scrolls:Object.fromEntries(ids.map(id=>[id,save.items[id]||0])),
  coins:save.coins,history:JSON.stringify(save.history),
  wins:[...save.prologuePart2.episodes.pb_07.wonBattleIds],
  rewardClaimed:save.prologuePart2.episodes.pb_07.rewardClaimed,
  slimeCount:save.instances.filter(x=>x.id==='slime').length
 }),kinds.map(([id])=>id));
 for(const [tier,[id,name]] of kinds.entries()){
  await seed('pb_07',contractCursor);
  await page.evaluate(({tier,ids})=>{
   const ep=save.prologuePart2.episodes.pb_07;
   ep.wonBattleIds=['p2_07_a'];save.prologuePart2.grants.pb07Scroll=true;
   for(const [i,id] of ids.entries())save.items[id]=i<=tier?i+2:0;
   if(!saveGame())throw Error('Unable to save isolated scroll fixture');
  },{tier,ids:kinds.map(([id])=>id)});
  const before=await inventoryState();
  await page.getByRole('button',{name:'契約を確認',exact:true}).click();
  const offer=page.getByRole('button',{name:'スライムと契約',exact:true});
  const text=page.locator('#contractConfirmText');
  const assertPrompt=async()=>{
   assert.equal(await text.innerText(),`${name}を1枚使用しますか？（所持：${before.scrolls[id]}枚）`);
   assert.equal(await text.locator('*').count(),0);
   assert.equal(await page.evaluate(()=>pendingContractItemId),id);
  };
  await offer.click();
  await assertPrompt();
  await page.screenshot({path:`${out}/chapter7-confirm-${id}.png`});
  await page.locator('#contractConfirm').getByRole('button',{name:'いいえ',exact:true}).click();
  await offer.waitFor({state:'visible'});
  assert.deepEqual(await inventoryState(),before,'cancel leaves all scrolls and rewards alone');
  await offer.click();
  await assertPrompt();
  await page.evaluate(()=>{window.__nativeScrollTestRandom=Math.random;Math.random=()=>0;});
  await page.locator('#contractConfirmAcceptButton').click();
  await page.locator('#prologuePart2 [data-card="pb_07_contract_ok"]').waitFor();
  await page.evaluate(()=>{Math.random=window.__nativeScrollTestRandom;delete window.__nativeScrollTestRandom;});
  const expected={...before,scrolls:{...before.scrolls,[id]:before.scrolls[id]-1},slimeCount:before.slimeCount+1};
  assert.deepEqual(await inventoryState(),expected,'only one selected scroll is consumed and existing battle rewards do not change');
  await boot();await page.evaluate(()=>{clearTutorialUi();openProloguePart2('pb_07')});
  assert.equal(await card(),'pb_07_contract_ok');
  assert.deepEqual(await inventoryState(),expected,'exact selected debit and reward are persisted');
  console.log(`PASS Chapter 7 scroll confirmation: ${name} • ${before.scrolls[id]} -> ${expected.scrolls[id]} • cancel free, other scrolls and battle rewards unchanged`);
 }
 assert.deepEqual(errors,[]);console.log('PASS prologue part2 browser: legacy resume, dedicated battle/contract/defeat retry, practice skip, return route, shop branches, episode22 no battle, epilogue exact order, atomic failure/retry/reload, authority, no duplicate reward or unrelated save changes');
}finally{await browser?.close();server.kill();}
