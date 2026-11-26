import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const url=process.env.GAME_TEST_URL||'http://127.0.0.1:4785/?legacy=1';
const server=process.env.GAME_TEST_URL?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4785'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
  if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  const page=await browser.newPage({viewport:{width:360,height:640},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(url,{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();
  await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{
    clearTutorialUi();
    save=initSave();
    save.progress.tutorial=tutorialSaveDefaults({legacy:true});
    save.contractor.pendingRankUps=[];
    clearTimeout(contractorRankUpTimer);
    document.getElementById('contractorRankUpOverlay').classList.add('hidden');
    save.instances=[];save.party=[];
    save.party.push(addInstance('slime',1).uid);
    saveGame();
    openMapStory('grassland_whose');
  });
  const root=page.locator('#mapStoryContent');
  const notice=page.locator('#uiNotice.is-story-complete');
  const coinsBefore=await page.evaluate(()=>save.coins);
  const reward=await page.evaluate(()=>GRASSLAND_STORY.episodes[0].firstReward);
  await root.getByRole('button',{name:'第1話を始める'}).click();
  await root.getByRole('button',{name:'会話スキップ'}).click();
  await root.getByRole('button',{name:'戦闘開始'}).click();
  await page.evaluate(()=>{eHp=0;win();});
  await page.getByRole('button',{name:'物語の続きを見る'}).click();
  assert.equal(await page.evaluate(()=>mapStoryState().resume.phase),'post');
  assert.equal(await page.evaluate(()=>save.coins),coinsBefore+reward.coins);
  // Victory has already saved its reward. Reload before finishing the dialogue.
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();
  await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();openMapStory('grassland_whose');});
  await root.getByRole('button',{name:'戦闘後から再開'}).click();
  await root.getByRole('button',{name:'会話スキップ'}).click();
  await root.getByRole('button',{name:'第1話を終える'}).click();
  assert(await root.locator('.map-story-list').isVisible());
  assert.equal(await root.getByRole('heading',{name:'第1話 完了'}).count(),0);
  const next=root.locator('[data-next-episode].story-episode-next-highlight');
  assert.equal(await next.count(),1);
  assert.match(await next.getByRole('button',{name:'第2話を始める'}).innerText(),/第2話を始める/);
  assert.match(await next.innerText(),/NEXT/);
  assert(await notice.isVisible());
  const noticeCopy=await notice.innerText();
  assert.match(noticeCopy,/第1話 完了/);
  assert.match(noticeCopy,/基本報酬/);
  assert(noticeCopy.includes('コイン+'+reward.coins.toLocaleString('ja-JP')));
  assert(noticeCopy.includes('EXP+'+reward.exp.toLocaleString('ja-JP')));
  assert(await notice.evaluate(n=>Number(getComputedStyle(n).opacity)>.9),'notice is visible with reduced motion');
  assert.equal(await page.evaluate(()=>save.coins),coinsBefore+reward.coins);
  await page.waitForFunction(()=>!document.getElementById('uiNotice')?.classList.contains('is-visible'),null,{timeout:5000});

  // Re-reading uses the same list without an announcement or any save mutation.
  const saved=await page.evaluate(()=>[JSON.stringify(save),safeStorageGet(SAVE_KEY)]);
  await root.getByRole('button',{name:'読み返す',exact:true}).click();
  await root.getByRole('button',{name:'会話スキップ'}).click();
  await root.getByRole('button',{name:'戦闘後へ'}).click();
  await root.getByRole('button',{name:'会話スキップ'}).click();
  await root.getByRole('button',{name:'読み返しを終える'}).click();
  assert(await root.locator('.map-story-list').isVisible());
  assert.equal(await page.locator('#uiNotice.is-story-complete.is-visible').count(),0);
  assert.deepEqual(await page.evaluate(()=>[JSON.stringify(save),safeStorageGet(SAVE_KEY)]),saved);

  // Resume a completed battle of the final episode; keep the all-complete page.
  await page.evaluate(()=>{
    const {episodes}=currentMapStory(),end=episodes.at(-1),state=mapStoryState();
    for(const e of episodes)state.episodes[e.id]={completed:e!==end,firstVictory:true,firstRewardClaimed:true,victoryCount:1};
    state.resume={episodeId:end.id,phase:'post',nodeId:null,attemptId:null,rewardCommitted:true,postPending:true,participantUids:[]};
    saveGame();startMapStoryEpisode(end.id);
  });
  await root.getByRole('button',{name:/物語を終える/}).click();
  assert(await root.getByRole('heading',{name:/全11話 完了/}).isVisible());
  assert.equal(await root.locator('.map-story-list').count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS map story browser: normal completion, NEXT, reduced-motion timed reward notice, readonly replay and unchanged finale.');
}finally{
  await browser?.close();
  server?.kill();
}
