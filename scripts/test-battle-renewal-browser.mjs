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
 await page.goto('http://127.0.0.1:4327/?legacy=1');await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 async function start(mode='single'){
  await page.evaluate(mode=>{
   clearTutorialUi();save=initSave();completeTutorial();Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
   save.instances=[];save.party=[];for(const id of ['freigal','aquaron','volteck']){const ins=addInstance(id,12);save.party.push(ins.uid);}
   save.items.potion=5;save.items.contract_scroll=5;saveGame();endPartyRecovery();prepareBattleParty();selectedMap=MAPS[0];enemy=by(mode==='multi'?'icegolem':'grassbeat');
   activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[],{allowOvertier:false});activeHuntRequest.battleMode='single';beginChosenBattle(selectedMap.id,enemy.id,'normal',activeHuntRequest);
   if(mode==='multi'){activeHuntRequest.secondEnemyId='aquaron';activeHuntRequest.battleMode='three_way';beginThreeWayBattle();}
   show('battle');
  },mode);
  await page.locator('#battle.active #renewalHeader').first().waitFor();
 }
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
  assert((await page.locator('#commands .br-effect').first().innerText()).includes('◎'));
  await page.locator('#enemy_bCard .battle-stage-slot').click();
  assert((await page.locator('.br-skill-heading').innerText()).includes('アクアロン'));
  assert((await page.locator('#commands .br-effect').first().innerText()).includes('○'));
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
 await start();await page.evaluate(()=>{
   const ins=addInstance('tempestray',12);
   partyBattle[2]={...partyBattle[2],inst:ins,mon:{...by(ins.id)},hp:instanceMaxHp(ins),fainted:false};
   const result=activateCurrentKokoroLink(ins.uid,kokoroLinkTargetStats());
   if(!result.ok||result.link.tacticsAbility?.id!=='free_switch')throw Error('fixture did not prepare Wind tactics');
   window.qaWindOwner=activeInstance;
   beginKokoroLinkFreeSwitch();
 });
 assert(await layer.isVisible());
 await back.click();assert(await page.locator('#kokoroLinkPanel').isVisible());
 assert.equal(await page.evaluate(()=>kokoroLinkTacticsAbilityFor(window.qaWindOwner).charges),1);
 await page.evaluate(()=>beginKokoroLinkFreeSwitch());
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
 await start();await page.evaluate(()=>{eHp=0;win();});await page.locator('#battleOutcome:not(.hidden)').waitFor();
 assert((await page.locator('#renewalResultMeta').innerText()).includes('✓ 討伐'));
 assert.equal(await page.locator('#renewalResultExp .br-exp-row').count(),3);
 assert((await page.locator('#battleOutcomeActions').innerText()).includes('契約書'));
 const stock=await page.evaluate(()=>save.items.contract_scroll);
 await page.evaluate(async()=>{const real=playContractAnimation;playContractAnimation=async()=>{};try{await Promise.all([renewalContract('single','contract_scroll'),renewalContract('single','contract_scroll')]);}finally{playContractAnimation=real;}});
 assert.equal(await page.evaluate(()=>save.items.contract_scroll),stock-1);assert((await page.locator('#battleOutcomeActions').innerText()).includes('契約'));
 await page.reload();assert.equal(await page.evaluate(()=>save.items.contract_scroll),stock-1);
 assert.deepEqual(errors,[]);console.log('PASS battle renewal browser: v4 commands/target/skills, 3 phone sizes, details, reserve item, escape, delayed link, result/contract/reload');
}finally{await browser?.close();server.kill();}
