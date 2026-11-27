// Real browser acceptance coverage. Disposable save; no production/player data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const output=process.env.BATTLE_RENEWAL_EVIDENCE||'artifacts/save-failure-ui/battle-renewal';fs.mkdirSync(output,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4327'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail)});
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:640},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:4327/?legacy=1');await page.locator('#titleScreen').dblclick();await page.locator('#titleScreen').waitFor({state:'detached'});
 async function start(mode='single',unitIds=['freigal','aquaron','volteck'],enemyId=null){
  await page.evaluate(({mode,unitIds,enemyId})=>{
   clearTutorialUi();save=initSave();completeTutorial();Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
   save.instances=[];save.party=[];for(const id of unitIds){const ins=addInstance(id,12);save.party.push(ins.uid);}
   save.items.potion=5;save.items.contract_scroll=5;saveGame();endPartyRecovery();prepareBattleParty();selectedMap=MAPS[0];enemy=by(enemyId||(mode==='multi'?'icegolem':'grassbeat'));
   activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[],{allowOvertier:false});activeHuntRequest.battleMode='single';beginChosenBattle(selectedMap.id,enemy.id,'normal',activeHuntRequest);
   if(mode==='multi'){activeHuntRequest.secondEnemyId='aquaron';activeHuntRequest.battleMode='three_way';beginThreeWayBattle();}
   show('battle');
  },{mode,unitIds,enemyId});
  await page.locator('#battle.active #renewalHeader').first().waitFor();
 }
 // Field request acceptance. Disable only the hidden Link thumbnail renderer for this
 // isolated test, because it otherwise reads legitimate card art for off-field reserves.
 // The original renderer is restored before all following UI acceptance cases.
 const fieldRequests=[];
 const recordFieldRequest=req=>{if(req.resourceType()==='image')fieldRequests.push(new URL(req.url()).pathname.slice(1));};
 const checkedUnits=['stella_sorcerer','stella_wizard','elixion','grassbeat','icegolem','aquaron'];
 const media=await page.evaluate(ids=>Object.fromEntries([...ids,'character_vera_4'].map(id=>{
  const mon=by(id),poster=(BATTLE_STATIC_MEDIA[id]||BATTLE_IDLE_MEDIA[id])?.poster;
  return [id,{poster,card:IMG[mon.imgKey]}];
 })),checkedUnits);
 assert(checkedUnits.every(id=>media[id].poster&&media[id].poster!==media[id].card));
 assert.equal(media.character_vera_4.poster,undefined);assert(media.character_vera_4.card);
 const checkFieldImage=async (slot,src)=>{
  const art=page.locator(slot+' .battle-static-media img');
  assert.equal(await art.getAttribute('src'),src);
  assert(await art.evaluate(async img=>{await img.decode();return img.naturalWidth>0;}),slot);
 };
 const noCardRequests=()=>{
  const originals=new Set(checkedUnits.map(id=>media[id].card));
  assert.deepEqual(fieldRequests.filter(url=>originals.has(url)),[],'standee/motion units must not request a card on the field');
 };
 await page.evaluate(()=>{window.qaFieldLinkPanel=renderKokoroLinkPanel;renderKokoroLinkPanel=()=>{};});
 page.on('request',recordFieldRequest);
 try{
  await start('single',['stella_sorcerer','elixion','character_vera_4']);
  await checkFieldImage('#pVis',media.stella_sorcerer.poster);await checkFieldImage('#eVis',media.grassbeat.poster);
  assert(fieldRequests.includes(media.stella_sorcerer.poster));assert(fieldRequests.includes(media.grassbeat.poster));noCardRequests();
  await page.evaluate(()=>{if(!changeActivePartyMember(1))throw Error('manual swap fixture failed');});
  await checkFieldImage('#pVis',media.elixion.poster);noCardRequests();
  async function pageTransition(type){
   await page.evaluate(type=>window.dispatchEvent(new PageTransitionEvent(type,{persisted:true})),type);
  }
  async function visibility(hidden){
   await page.evaluate(hidden=>{
    if(hidden)Object.defineProperty(document,'hidden',{configurable:true,value:true});else delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
   },hidden);
  }
  async function checkBoth(){
   await checkFieldImage('#pVis',media.elixion.poster);await checkFieldImage('#eVis',media.grassbeat.poster);noCardRequests();
  }
  await pageTransition('pagehide');assert.equal(await page.locator('#battle video.battle-idle-video').count(),0);await checkBoth();
  await pageTransition('pageshow');assert.equal(await page.locator('#battle video.battle-idle-video').count(),2);await checkBoth();
  await visibility(true);await checkBoth();await visibility(false);await checkBoth();
  await visibility(true);await pageTransition('pagehide');await checkBoth();
  await visibility(false);assert.equal(await page.locator('#battle video.battle-idle-video').count(),2);
  assert.equal(await page.evaluate(()=>battleIdlePageHidden),false);await checkBoth();
  await page.evaluate(()=>{pHp=0;if(!switchPartyMember())throw Error('KO swap fixture failed');});
  // Rejoin the currently living first reserve, then remove that reserve to
  // assert the explicit no-standee fallback via the same KO switch path.
  await checkFieldImage('#pVis',media.stella_sorcerer.poster);noCardRequests();
  await page.evaluate(()=>{pHp=0;if(!switchPartyMember())throw Error('fallback swap fixture failed');});
  await checkFieldImage('#pVis',media.character_vera_4.card);noCardRequests();
  await start('multi',['stella_sorcerer','elixion','character_vera_4']);
  await checkFieldImage('#pVis',media.stella_sorcerer.poster);
  await checkFieldImage('#enemy_aVis',media.icegolem.poster);await checkFieldImage('#enemy_bVis',media.aquaron.poster);noCardRequests();
  // Use an unused poster: reusing a decoded img can bypass interception in the same document.
  const failPoster=media.stella_wizard.poster;
  assert(!fieldRequests.includes(failPoster),'failed-image fixture must not be warm');
  const failUrl=url=>url.hostname==='127.0.0.1'&&url.pathname==='/'+failPoster;
  let aborts=0;
  const failStandee=route=>{aborts++;return route.abort();};
  await page.route(failUrl,failStandee);
  try{
   const [failed]=await Promise.all([
    page.waitForEvent('requestfailed',{predicate:req=>req.resourceType()==='image'&&failUrl(new URL(req.url())),timeout:10000}),
    start('single',['stella_wizard','elixion','character_vera_4'])
   ]);
   assert.match(failed.failure().errorText,/ERR_FAILED/);
   assert(aborts>0,'the named fallback needs a real failed image request');
   const fallback=page.locator('#pVis .battle-static-fallback');
   await fallback.waitFor({state:'visible'});
   assert.equal(await fallback.innerText(),await page.evaluate(()=>`味方：${by('stella_wizard').name}`));
   assert(await page.locator('#pVis .battle-static-media img').evaluate(img=>img.hidden&&img.naturalWidth===0));
   noCardRequests();
  }finally{await page.unroute(failUrl,failStandee);}
 }finally{
  page.off('request',recordFieldRequest);
  await page.evaluate(()=>{renderKokoroLinkPanel=window.qaFieldLinkPanel;delete window.qaFieldLinkPanel;});
 }
 console.log('PASS field artwork requests: initial/switch/KO, both lifecycle returns, 3-way, Vera card fallback and named failed-request fallback.');
 // Compare opponents at the same field and HP-panel heights, even when text wraps.
 const sizeFixture=await page.addStyleTag({content:`
  #battle .battle-arena {height:465px!important}
  #battle #singleEnemyBox {height:69px!important;box-sizing:border-box}
 `});
 async function artHeight(slot){
  return page.locator(slot+' .battle-static-media img').evaluate(async img=>{
   await img.decode();
   const arena=img.closest('.battle-arena'),hud=document.getElementById('singleEnemyBox');
   const fieldHeight=arena.clientHeight,hudHeight=hud.getBoundingClientRect().height;
   if(fieldHeight!==465||hudHeight!==69)throw Error('Unexpected field/HUD dimensions: '+fieldHeight+'/'+hudHeight);
   arena.dataset.compactHeight=String(fieldHeight);
   arena.dataset.enemyHud=String(hudHeight);
   syncBattleIdleSizes(battleIdleCandidates());
   return img.getBoundingClientRect().height;
  });
 }
 for(const viewport of [{width:360,height:640},{width:411,height:780},{width:412,height:915}]){
  await page.setViewportSize(viewport);
  const party=['elna_advanced','elixion'];
  await start('single',party,'elna_advanced');
  const allyHeight=await artHeight('#pVis'),enemyHeight=await artHeight('#eVis');
  assert(allyHeight>0&&enemyHeight>0);
  assert(await page.evaluate(()=>changeActivePartyMember(1)));
  assert.equal(await artHeight('#eVis'),enemyHeight,'Elna keeps her height when the ally switches to Elixion');
  await start('single',party,'elixion');
  assert.equal(await artHeight('#pVis'),allyHeight,'Elna keeps her height when facing Elixion');
 }
 await sizeFixture.evaluate(style=>style.remove());
 console.log('PASS rendered size independence at three mobile widths, 465px field and 69px enemy HUD.');
 // MOB-01: exercise the rendered sheet using locator clicks (not hidden DOM clicks).
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{
  HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('playing'));return Promise.resolve();};
 });
 await start();
 await page.evaluate(()=>{for(const r of battleIdleRecords.values())r.video.onerror?.();});
 await page.getByRole('button',{name:'戦闘の履歴',exact:true}).click();
 const retry=page.getByRole('button',{name:'待機動画を再生し直す',exact:true});
 await retry.waitFor({state:'visible'});assert(await retry.isEnabled());
 await retry.click();assert.equal(await page.evaluate(()=>[...battleIdleRecords.values()].filter(r=>r.retried).length)>0,true);
 await page.getByRole('button',{name:'戦闘の履歴',exact:true}).click();assert.equal(await retry.count(),0);
 await page.locator('#renewalSheet header button').click();
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[360,640],[412,780],[430,700]]){
  await page.setViewportSize({width,height});await start('multi');
  assert.equal(await page.locator('#renewalParty').count(),0);
  const info=page.locator('#enemy_bCard .br-info');
  const hit=await info.boundingBox();assert(hit.width>=44&&hit.height>=44,JSON.stringify(hit));
  const selected=await page.evaluate(()=>renewal.targetId);
  await info.click();assert.equal(await page.evaluate(()=>renewal.targetId),selected);
  assert(await page.locator('#renewalSheet').evaluate(e=>e.open));await page.locator('#renewalSheet header button').click();
  await page.locator('#battleSwitchButton').click();
  assert.equal(await page.locator('#battleSwitchSheet .br-switch-card').count(),3);
  const party=await page.locator('.br-switch-card').evaluateAll(els=>els.map(el=>({
   children:[...el.querySelectorAll('b,small')].map(e=>({font:parseFloat(getComputedStyle(e).fontSize),width:e.clientWidth,scroll:e.scrollWidth})),
   width:el.clientWidth,scroll:el.scrollWidth
  })));
  for(const member of party){assert(member.scroll<=member.width);for(const text of member.children){assert(text.font>=10);assert(text.scroll<=text.width);}}

  await page.locator('#battleSwitchSheet').getByRole('button',{name:'戻る',exact:true}).click();
  const labels=await page.locator('.battle-command-pad button').allTextContents();assert(labels.every(t=>!/[💞✨🎒🔄🏃]/u.test(t)),labels.join(','));
  assert.equal(await page.locator('.br-selected .br-target-label').count(),0,'ring has no text');
  await page.locator('#battleSkillButton').click();
  assert.equal(await page.locator('#commands [data-battle-panel-back]').innerText(),'‹ 戻る');
  assert((await page.locator('#commands .br-effect').first().innerText()).includes('効果抜群'));
  await page.locator('#enemy_bCard .battle-stage-slot').click();
  assert((await page.locator('.br-skill-heading').innerText()).includes('アクアロン'));
  assert((await page.locator('#commands .br-effect').first().innerText()).includes('ふつう'));
  const geometry=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,view:innerHeight,commands:document.getElementById('commands').getBoundingClientRect().toJSON()}));
  assert(geometry.width<=width,JSON.stringify(geometry));assert(geometry.commands.bottom<=height+2,JSON.stringify(geometry));
  await page.screenshot({path:`${output}/skills-${width}.png`});
  await page.locator('#commands .skill-button').first().click();await page.waitForFunction(()=>!busy||battleFeedback.finished);
  assert(await page.locator('#commands').evaluate(el=>el.classList.contains('hidden')));
  assert.equal(await page.evaluate(()=>battleTurnCount),1,'one selection -> exactly one turn');
 }
 // Adopted trial: three vertical cards, no fixed party row, no activation on dismissal.
 await page.setViewportSize({width:390,height:844});
 await start();
 await page.evaluate(()=>{
   const ins=addInstance('character_vera_4',22);
   partyBattle[2]={...partyBattle[2],inst:ins,mon:{...by(ins.id)},hp:0,fainted:true};
   update();
 });
 const layer=page.locator('#battleSwitchLayer'),sheet=page.locator('#battleSwitchSheet'),cards=sheet.locator('[data-switch-index]');
 const openSwitch=()=>page.locator('#battleSwitchButton').click();
 const current=()=>page.evaluate(()=>({turn:battleTurnCount,active:activePartyIdx,history:battleFeedback.history.length}));
 const beforeSwitch=await current();
 const size=await page.evaluate(()=>{
  updateBattleViewport();
  const arena=document.querySelector('#battle .battle-arena'),full=arena.getBoundingClientRect().height;
  const former=document.createElement('div');former.style.height='66px';
  document.getElementById('renewalMessages').after(former);updateBattleViewport();
  const previous=arena.getBoundingClientRect().height;former.remove();updateBattleViewport();
  return {full,previous};
 });
 assert(size.full>=size.previous+65,JSON.stringify(size));
 await page.screenshot({path:`${output}/switch-field-390x844.png`});
 await openSwitch();
 assert(await layer.isVisible());assert.equal(await cards.count(),3);
 assert.equal(await sheet.locator('h1,h2,h3,p').count(),0,'no redundant heading or explanatory copy');
 assert(await cards.nth(0).isDisabled());assert.match(await cards.nth(0).innerText(),/出撃中/);
 assert(await cards.nth(2).isDisabled());assert(await cards.nth(1).isEnabled());
 assert(await cards.nth(2).evaluate(card=>{
  const img=card.querySelector('img'),unit=partyBattle[2].mon;
  return unit.id!==unit.imgKey&&img?.getAttribute('src')===IMG[unit.imgKey];
 }), 'Vera uses its differing imgKey');
 await cards.nth(2).locator('img').evaluate(img=>img.decode());
 assert(await cards.nth(1).locator('.br-switch-hpbar i').count());
 const box=await sheet.boundingBox();assert(box&&box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844,JSON.stringify(box));
 await page.screenshot({path:`${output}/switch-panel-390x844.png`});
 const back=sheet.getByRole('button',{name:'戻る',exact:true});
 await back.click();
 assert(!await layer.isVisible());assert.deepEqual(await current(),beforeSwitch);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'battleSwitchButton');
 await openSwitch();await layer.locator('.br-switch-scrim').click({position:{x:8,y:8}});
 assert(!await layer.isVisible());assert.deepEqual(await current(),beforeSwitch);
 await page.evaluate(()=>{busy=true;renderBattleInputState();openBattleSwitchPicker();});
 assert(await page.locator('#battleSwitchButton').isDisabled());assert(!await layer.isVisible());
 await page.evaluate(()=>{busy=false;renderBattleInputState();});
 await openSwitch();await page.keyboard.press('Escape');
 assert(!await layer.isVisible());assert.deepEqual(await current(),beforeSwitch);
 await openSwitch();
 await page.evaluate(()=>{selectBattleSwitchTarget(0);selectBattleSwitchTarget(2);});
 assert.deepEqual(await current(),beforeSwitch);
 await cards.nth(1).click();
 await page.waitForFunction(()=>!busy&&battleTurnCount===1);
 assert(!await layer.isVisible());assert.equal((await current()).active,1);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'battleSwitchButton');

 // Wind tactics uses the same cards: cancelling preserves the prepared charge.
 // Use the real party initializer so both the entry UID and the instance UID
 // belong to Tempestray. A transplanted instance leaves the old entry UID.
 await start('single',['freigal','aquaron','tempestray']);
 await page.evaluate(()=>{
   const source=partyBattle[2].inst;
   const result=activateCurrentKokoroLink(source.uid,kokoroLinkTargetStats());
   if(!result.ok||result.link.tacticsAbility?.id!=='free_switch')throw Error(`fixture did not prepare Wind tactics: ${result.reason||result.link.tacticsAbility?.id}`);
   window.qaWindOwner=activeInstance;
   beginKokoroLinkFreeSwitch();
 });
 assert(await layer.isVisible());
 await back.click();assert(await page.locator('#kokoroLinkPanel').isVisible());
 assert.equal(await page.evaluate(()=>kokoroLinkTacticsAbilityFor(window.qaWindOwner).charges),1);
 await page.locator('#kokoroLinkPanel').getByRole('button',{name:'無消費交代を使う',exact:true}).click();
 await cards.nth(1).click();
 assert(!await layer.isVisible());assert.equal((await current()).active,1);assert.equal((await current()).turn,0);
 assert.equal(await page.evaluate(()=>kokoroLinkTacticsAbilityFor(window.qaWindOwner).charges),0);
 await start();await page.locator('#singleEnemyBox .br-info').click();
 assert((await page.locator('#renewalSheetBody').innerText()).includes('弱点'));assert(!/\d+[%％]/.test(await page.locator('#renewalSheetBody').innerText()));
 await page.locator('#renewalSheet header button').click();
 await page.evaluate(()=>{pHp=partyBattle[0].hp=10;partyBattle[1].hp=20;update();});
 const before=await page.evaluate(()=>save.items.potion);
 await page.locator('#battleItemButton').click();await page.locator('[data-item="potion"]').click();await page.locator('[data-item-target="1"]').click();await page.locator('#renewalSheet .br-go').click();
 await page.waitForFunction(()=>!busy||battleFeedback.finished);
 assert.equal(await page.evaluate(()=>save.items.potion),before-1);assert.equal(await page.evaluate(()=>partyBattle[1].hp),58);assert.equal(await page.evaluate(()=>battleTurnCount),1);
 await page.locator('#battleEscapeButton').click();assert((await page.locator('#renewalSheetBody').innerText()).includes('報酬はもらえません'));
 await page.getByRole('button',{name:'戦いを続ける',exact:true}).click();assert.equal(await page.locator('#renewalSheet').evaluate(e=>e.open),false);
 await start();const turn=await page.evaluate(()=>battleTurnCount);
 await page.locator('#kokoroLinkButton').click();await page.locator('#kokoroLinkPanel .kokoro-link-source:not(:disabled)').first().click();await page.locator('#renewalSheet .br-go').click();
 await page.locator('#renewalLinkFx').waitFor();assert.equal(await page.evaluate(()=>!!kokoroLinkEffectForInstance(activeInstance)),false,'effect waits until animation finishes');
 await page.waitForFunction(()=>!!kokoroLinkEffectForInstance(activeInstance));assert.equal(await page.evaluate(()=>battleTurnCount),turn);
 assert((await page.locator('#pBattleStatus').innerText()).includes('リンク中'));
 await page.screenshot({path:`${output}/linked.png`});
 // The same mismatched source must decode in all four ally/Link views.
 await start('single',['freigal','character_vera_4','aquaron'],'hikari');
 const artwork=await page.evaluate(()=>{
  const vera=partyBattle[1],opponent=enemy;
  return {uid:vera.inst.uid,veraId:vera.mon.id,veraKey:vera.mon.imgKey,veraSrc:IMG[vera.mon.imgKey],
    enemyId:opponent.id,enemyKey:opponent.imgKey,enemySrc:IMG[opponent.imgKey]};
 });
 assert.equal(artwork.veraId,'character_vera_4');assert.notEqual(artwork.veraId,artwork.veraKey);assert(artwork.veraSrc);
 assert.equal(artwork.enemyId,'hikari');assert.notEqual(artwork.enemyId,artwork.enemyKey);assert(artwork.enemySrc);
 async function assertArtwork(locator,src,label){
  await locator.waitFor({state:'visible'});
  assert.equal(await locator.getAttribute('src'),src,label);
  assert(await locator.evaluate(async img=>{await img.decode();return img.naturalWidth>0;}),label);
 }
 const enemyInfo=page.locator('#singleEnemyBox .br-info');
 const renewalSheet=page.locator('#renewalSheet');
 const sheetPortrait=renewalSheet.locator('.br-enemy-head img');
 const closePanel=()=>renewalSheet.locator('header button').click();
 await enemyInfo.click();
 await assertArtwork(sheetPortrait,artwork.enemySrc,'1: Light Goddess Elysia enemy detail');
 await closePanel();
 await page.evaluate(()=>{enemy.imgKey='test-missing-unit-art';});
 await enemyInfo.click();assert.equal(await sheetPortrait.count(),0,'unregistered artwork creates no img element');
 await closePanel();await page.evaluate(key=>{enemy.imgKey=key;},artwork.enemyKey);
 await page.locator('#battleItemButton').click();await renewalSheet.locator('[data-item="potion"]').click();
 await assertArtwork(renewalSheet.locator('[data-item-target="1"] img'),artwork.veraSrc,'2: Vera item target');
 await closePanel();
 await page.locator('#kokoroLinkButton').click();
 const source=page.locator(`#kokoroLinkPanel .kokoro-link-source[data-uid="${artwork.uid}"]`);
 await assertArtwork(source.locator('img'),artwork.veraSrc,'3: Vera link reserve list');
 await source.click();await assertArtwork(sheetPortrait,artwork.veraSrc,'4: Vera link preview');
 await Promise.all([
  assertArtwork(page.locator('#renewalLinkFx img'),artwork.veraSrc,'5: Vera link activation animation'),
  renewalSheet.locator('.br-go').click()
 ]);
 await page.waitForFunction(()=>!!kokoroLinkEffectForInstance(activeInstance));
 console.log('PASS mismatched imgKey loads in five battle views and missing keys omit the broken image.');
 await start();await page.evaluate(()=>{eHp=0;win();});await page.locator('#battleOutcome:not(.hidden)').waitFor();
 assert((await page.locator('#renewalResultMeta').innerText()).includes('討伐済み'));
 assert.equal(await page.locator('#renewalResultExp .br-exp-row').count(),3);
 assert((await page.locator('#battleOutcomeActions').innerText()).includes('契約書'));
 const stock=await page.evaluate(()=>save.items.contract_scroll);
 await page.evaluate(async()=>{const real=playContractAnimation;playContractAnimation=async()=>{};try{await Promise.all([renewalContract('single','contract_scroll'),renewalContract('single','contract_scroll')]);}finally{playContractAnimation=real;}});
 assert.equal(await page.evaluate(()=>save.items.contract_scroll),stock-1);assert((await page.locator('#battleOutcomeActions').innerText()).includes('契約'));
 await page.reload();assert.equal(await page.evaluate(()=>save.items.contract_scroll),stock-1);
 assert.deepEqual(errors,[]);console.log('PASS battle renewal browser: v4 commands/target/skills, 3 phone sizes, details, reserve item, escape, delayed link, result/contract/reload');
}finally{await browser?.close();server.kill();}
