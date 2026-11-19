// Run from the repository root. Game progress is driven only by Playwright input.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium,devices} from 'playwright';
import {evidence} from './evidence.mjs';

function readState() {
  const step=tutorialUiState.active ? tutorialUiState.steps[tutorialUiState.index] : null;
  const card=document.querySelector('#prologuePart2.active [data-card]')?.dataset.card;
  const late=card && prologuePart2Ui?.id;
  return {
    screen:activeScreenId(), tutorial:step?.id, page:tutorialDialogueState.page,
    episode:step && tutorialUiState.flowId===TUTORIAL_MAIN_FLOW_ID ? storyEpisodeIndexForStep(step.id)+1 : late ? (late==='pb_ep'?23:Number(late.slice(3))) : null,
    typing:!!(step && tutorialPresentation.writer && !tutorialPresentation.writer.isComplete()),
    input:step?.input, target:step?.target && tutorialStepRequiresAction(step),
    card, cardTyping:!!(card && prologuePart2Typewriter && !prologuePart2Typewriter.isComplete()), battle:activeHuntRequest?.battleId, busy:typeof busy!=='undefined' && busy,
    hp:activeScreenId()==='battle'?[pHp,eHp,multiBattle?.enemies?.map(e=>e.hp)]:null,
    cleared:save.progress.tutorial.status==='completed'?6:
      save.progress.tutorial.chapterGate ? storyEpisodeIndexForStep(save.progress.tutorial.stepId) : 0,
    wins:Object.values(save.prologuePart2?.episodes||{}).flatMap(e=>e.wonBattleIds||[]),
    finished:Object.keys(save.prologuePart2?.episodes||{}).filter(k=>save.prologuePart2.episodes[k].completed),
    final:!!save.prologuePart2?.completed
  };
}

async function journey(page, log) {
  const visible=s=>page.locator(s).first().isVisible();
  async function tap(selector) {
    log.action(selector);
    await page.locator(selector).first().tap();
  }
  async function touchExposedCenter(selector) {
    const point=await page.locator(selector).first().evaluate(el=>{
      const r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
      return el.contains(document.elementFromPoint(x,y)) ? {x,y} : null;
    });
    log.action(selector);
    if(point) await page.touchscreen.tap(point.x,point.y);
  }
  // A late Rank notice can appear between locating a button and the tap.
  await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>{
    await page.locator('#contractorRankUpOverlay button').first().tap();
  });
  async function trainAfterDefeat() {
    await tap('.prologue-part2-finish button:text-is("話一覧へ")');
    await tap('#storyMode .ui-back-link');
    await tap('#homeGiftButton');
    const gift='[data-gift-detail="developer:20261102-present-box-open"]';
    if(await visible(gift)){
      await tap(gift);await tap('#giftDialogClaim');
      await page.getByRole('heading',{name:'受け取りました',exact:true}).waitFor();
      await tap('#giftDialogClose');
    }
    await tap('#giftBox .gift-heading button');
    await tap('#homePartyEditButton');
    const elna=page.locator('#partyList [data-monster-id="elna_beginner"]').first();
    if(await elna.isVisible()){
      const uid=await elna.getAttribute('data-instance-uid');
      for(let i=0;i<5;i++){
        if(!(await visible('.roster-sheet'))){
          if(!(await visible('#party.active'))) await tap('#homePartyEditButton');
          await tap('#partyList [data-instance-uid="'+uid+'"]');
        }
        if(!(await visible('.roster-data-items[open]'))) await tap('.roster-data-items summary');
        const item='[data-roster-action="giga_data"]:enabled';
        if(!(await visible(item))) break;
        await tap(item);
        if(await visible('#evolution.active')) await tap('#evoChoices button');
      }
      if(await visible('.roster-sheet-close')) await tap('.roster-sheet-close');
    }
    await tap('[data-nav="home"]');
  }
  const wins=new Set(), startedBattles=new Set(), drawn=new Set(), retries=new Map();
  let trained=false, draws=0, active=0, last='', changed=Date.now();
  const startTime=Date.now();
  await page.locator('#titleScreen').waitFor();
  await log.shot('title');
  await tap('#titleScreen');
  await page.locator('#titleScreen').waitFor({state:'detached'});
  for(;;){
    await page.waitForTimeout(90);
    const s=await page.evaluate(readState);
    const signature=JSON.stringify(s);
    if(signature!==last){last=signature;changed=Date.now();}
    if(Date.now()-changed>20000 || Date.now()-startTime>30*60*1000) throw Error('進行待ち時間超過 '+signature);
    const ep=log.episodes.get(active);
    const doneEarly=active<=6 && s.cleared>=active;
    const id=active===23?'pb_ep':'pb_'+String(active).padStart(2,'0');
    if(ep && !ep.end && (doneEarly || s.finished.includes(id))){
      ep.end=await log.shot('ep'+active+'-end','第'+active+'区間 終了確認');
    }
    if(s.episode && s.episode!==active){
      assert.equal(s.episode,active+1,'話の連続性');
      assert(!ep || ep.end,'前話の完了未確認：'+active);
      active=s.episode;
      const start=await log.shot('ep'+active+'-start',active===23?'終幕 開始':'第'+active+'話 開始');
      log.episodes.set(active,{start});
      console.log('開始',active,s.tutorial||s.card);
    }
    if(s.tutorial && !(await visible('#tutorialBubble'))) throw Error('ガイド非表示 '+s.tutorial);
    if(!s.typing && s.tutorial) await log.shot(s.tutorial+'-'+s.page);
    if(s.card && !s.cardTyping && !(await visible('.soul-skip'))) await log.shot(s.card);
    if(s.battle && !startedBattles.has(s.battle)){
      startedBattles.add(s.battle);
      await log.shot(s.battle+'-battle');
    }
    for(const win of s.wins){
      if(!wins.has(win)){wins.add(win);await log.shot(win+'-win');}
    }
    if(['elna_rescue_complete','stella_mock_victory'].includes(s.tutorial)) wins.add(s.tutorial);
    if(s.final){
      assert(await visible('.prologue-part2-finish h2'));
      assert.match(await page.locator('.prologue-part2-finish h2').innerText(),/終幕 完了/);
      assert.equal(log.episodes.size,23);
      assert([...log.episodes.values()].every(e=>e.end));
      const expected=await page.evaluate(()=>prologuePart2Episodes().flatMap(e=>e.steps.filter(c=>c.kind==='battle').map(c=>c.battleId)));
      for(const id of expected){assert(startedBattles.has(id),id+' 未戦闘');assert(wins.has(id),id+' 勝利未確認');}
      for(const id of ['elna_rescue_complete','stella_mock_victory']) assert(wins.has(id),id);
      assert.equal(draws,1);
      assert.equal(drawn.size,1);
      const receipt=await page.evaluate(()=>{
        const r=ProloguePart2Events.characterReceipt();
        return {count:r?.count,cost:r?.cost,owned:save.instances.filter(i=>i.uid===r?.instanceUid && i.id===r.unitId).length};
      });
      assert.deepEqual(receipt,{count:1,cost:0,owned:1});
      log.totals('全23区間の開始・終了、前半2勝、後半'+expected.length+'勝を確認。終幕で無料ガチャを1回操作し、結果表示と獲得個体1体を照合。敗北後の育成ルート：'+(trained?'使用':'未使用')+'。');
      return;
    }
    if(await visible('#contractorRankUpOverlay:not(.hidden) button')){
      await touchExposedCenter('#contractorRankUpOverlay button');
      continue;
    }
    if(await visible('.soul-skip')){await log.shot('gacha-presentation');await tap('.soul-skip');continue;}
    if(s.tutorial){
      if(s.typing){await tap('#tutorialText');continue;}
      if(s.input==='player_name'){
        await page.locator('#tutorialPlayerNameInput').fill('通し検査');
        await tap('#tutorialNameForm button');
      }else if(await visible('#tutorialDialogueChoices:not([hidden]) button')) await tap('#tutorialDialogueChoices button');
      else if(s.target) await tap('.tutorial-target-active');
      else if(await visible('#tutorialNextButton:not([hidden]):enabled')) await tap('#tutorialNextButton');
      else if(!s.input) await tap('#tutorialText');
      continue;
    }
    if(await visible('#prologuePart2Raid:not([hidden]) button')){await log.shot('raid-interruption');await tap('#prologuePart2Raid button');continue;}
    if(await visible('#prologuePart2WorldReturn')){await log.shot('epilogue-world-map');await tap('#prologuePart2WorldReturn');continue;}
    if(await visible('[data-prologue-shop-return]')){await log.shot('shop-visit');await tap('[data-prologue-shop-return]');continue;}
    if(s.screen==='battle'){
      const skip='button:visible:text-is("契約を見送る")';
      if(await visible(skip)){await log.shot('slime-contract');await tap(skip);continue;}
      if(s.busy) continue;
      const target='#multiTargetSelect button:visible:enabled';
      if(await visible(target)){await tap(target);continue;}
      const moves=page.locator('#commands .skill-button:visible:enabled');
      if(await moves.count()){
        const index=await moves.evaluateAll(buttons=>buttons.map((b,i)=>({i,power:Number(b.ariaLabel?.match(/威力(\d+)/)?.[1]||0)})).sort((a,b)=>b.power-a.power)[0].i);
        log.action('攻撃技を選択'); await moves.nth(index).tap();
      }else if(await visible('#battleSkillButton:enabled')) await tap('#battleSkillButton');
      continue;
    }
    if(s.screen==='storyMode'){await tap('#storyContinueCard button');continue;}
    if(s.screen==='home'){await tap('#homeAdventureButton');continue;}
    if(!s.card){
      const retry='.prologue-part2-finish button:text-is("再挑戦")';
      if(await visible(retry)){
        const key=Array.from(startedBattles).at(-1), count=(retries.get(key)||0)+1;
        retries.set(key,count);await log.shot(key+'-retry-'+count);
        if(!trained){trained=true;await trainAfterDefeat();continue;}
        assert(count<=3,'再挑戦3回後も敗北 '+key);await tap(retry);
      }
      continue;
    }
    const actions='#prologuePart2Content .map-story-actions';
    if(await visible('[data-prologue-character-result]')) drawn.add((await page.locator('[data-prologue-character-result] strong').innerText()).trim());
    if(await visible(actions+' .story-scene-cue')){
      // The cue bounces continuously. Touch a verified on-screen point.
      await touchExposedCenter(actions+' .story-scene-cue');
      continue;
    }
    const free=actions+' button:text-is("無料で1回引く")';
    if(await visible(free)){assert.equal(draws++,0);await tap(free);continue;}
    const options=['[data-prologue-loan][aria-pressed="false"]','[data-prologue-synthesize]:enabled',
      actions+' button:text-is("物語を続ける")',actions+' button:text-is("後で見る")',actions+' button:visible:enabled'];
    for(const selector of options){
      if(await visible(selector)){await tap(selector);break;}
    }
  }
}

const dir=process.env.PROLOGUE_E2E_DIR || await fs.mkdtemp(path.join(os.tmpdir(),'prologue-e2e-'));
console.log('証跡',dir);
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','0'],{stdio:['ignore','pipe','inherit']});
let browser,log;
try{
  const [banner]=await once(server.stdout,'data');
  const port=String(banner).match(/:(\d+)/)[1];
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
  const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:412,height:915},screen:{width:412,height:915},locale:'ja-JP'});
  // Keep automated play out of the live operator dashboard.
  await context.route('https://monster-battle-records.kanki-doi-2.chatgpt.site/api/events',route=>route.fulfill({status:204,headers:{'access-control-allow-origin':'*'}}));
  const page=await context.newPage();
  page.setDefaultTimeout(5000);
  log=await evidence(page,dir);
  await page.goto('http://127.0.0.1:'+port+'/?legacy=1');
  await journey(page,log);
}catch(err){
  await log?.fail(err);
  console.error(err);
  process.exitCode=1;
}finally{
  try{await log?.report(browser.version());}finally{await browser?.close();server.kill();}
}
