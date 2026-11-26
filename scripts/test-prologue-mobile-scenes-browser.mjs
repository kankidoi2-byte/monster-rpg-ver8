import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {chromium, devices} from 'playwright';

const out='artifacts/prologue-mobile-scenes';
const mission='序章前半（第6話まで）を終える';
const retreat='モルグラムのHPを0にすると、攻撃を退けて安全な距離まで退避できます。';

// Isolate checkpoints from each other. The full journey covers reaching them from a new save.
async function openCard(page,id,cursor){
  const opened=await page.evaluate(({id,cursor})=>{
    clearTutorialUi();
    closeProloguePart2Battle();
    prologuePart2StopText();
    prologuePart2Ui=null;
    save=initSave();
    save.progress.tutorial=tutorialSaveDefaults({legacy:true});
    save.instances=[];
    const ally=addInstance('stella_wizard',20);
    save.party=[ally.uid];
    for(const ep of prologuePart2Episodes()){
      if(ep.id===id)break;
      save.prologuePart2.episodes[ep.id]={...prologuePart2DefaultEpisode(),completed:true,rewardClaimed:true};
    }
    save.prologuePart2.episodes[id]={...prologuePart2DefaultEpisode(),cursor};
    saveGame();
    return openProloguePart2(id);
  },{id,cursor});
  assert(opened);
  await page.evaluate(()=>prologuePart2Typewriter?.finish());
}

async function verify(page,width){
  const shot=name=>page.screenshot({path:out+'/'+width+'-'+name+'.png'});
  const responseErrors=[];
  page.on('response',r=>{
    if(r.status()===404 && /\/images\/maps\//.test(new URL(r.url()).pathname))responseErrors.push(r.url());
  });
  const rank=page.locator('body:not(:has(dialog:modal)) #contractorRankUpOverlay:not(.hidden)');
  await page.addLocatorHandler(rank,()=>rank.getByRole('button',{name:'冒険を続ける',exact:true}).tap());
  const title=page.locator('#titleScreen');
  await title.tap();
  await title.waitFor({state:'detached'});
  await page.evaluate(()=>{
    clearTutorialUi();
    save.progress.tutorial=tutorialSaveDefaults({legacy:true});
    save.progress.storyFlags.prologueCompleted=true;
    save.coins=25;
    saveGame();
    show('home');
  });
  const missions=page.locator('#homeMissionButton');
  const row=page.locator('#homeMissionsList .home-mission-row').filter({has:page.getByRole('heading',{name:mission,exact:true})});
  await missions.tap();
  assert.match(await row.innerText(),/コイン 500枚/);
  await shot('mission');
  await row.getByRole('button',{name:'受け取る'}).tap();
  await page.reload();
  await title.tap();
  await missions.tap();
  assert.match(await row.innerText(),/受け取り済み/);
  assert.equal(await page.evaluate(()=>save.coins),525);
  await page.locator('#homeMissionsClose').tap();

  await openCard(page,'pb_13','pb_13_pre_07');
  assert.equal(await page.locator('#prologuePart2Text').innerText(),retreat);
  await shot('retreat');
  await page.locator('#prologuePart2Content [aria-label="次へ"]').evaluate(el=>{
    // The user can tap a continuously moving advance cue without waiting for it to settle.
    for(const a of el.getAnimations())a.pause();
  });
  await page.locator('#prologuePart2Content [aria-label="次へ"]').tap();
  await page.getByRole('button',{name:'戦闘開始',exact:true}).tap();
  await page.locator('#battle.active').waitFor();
  const background=await page.evaluate(async()=>{
    const arena=document.querySelector('#battle .battle-arena');
    const expected=new URL(battleMapImage(selectedMap),document.baseURI).href;
    const before=getComputedStyle(arena).backgroundImage;
    prologuePart2BattleBanner();
    syncSingleBattleStage();
    await new Promise(requestAnimationFrame);
    const image=new Image();
    image.src=expected;
    await image.decode();
    return {expected,before,after:getComputedStyle(arena).backgroundImage,
      monster:enemy.id,bannerHasImage:!!document.querySelector('#battleMapBanner .map-img')};
  });
  assert.equal(background.monster,'morglum');
  assert.equal(background.bannerHasImage,false);
  assert.equal(background.before,'url("'+background.expected+'")');
  assert.equal(background.after,background.before);
  await shot('battle');

  for(const id of ['pb_ep_gacha_01','pb_ep_gacha_03']){
    await openCard(page,'pb_ep',id);
    const cue=page.locator('#prologuePart2Content .story-scene-cue');
    const point=await cue.evaluate(async el=>{
      const anim=el.getAnimations().find(a=>a.effect.getKeyframes().some(f=>f.transform));
      if(!anim)throw Error('会話送りのアニメーションがありません');
      anim.pause();
      await anim.ready;
      anim.currentTime=anim.effect.getTiming().duration/2;
      const box=el.getBoundingClientRect();
      const scene=el.closest('.map-story-scene').getBoundingClientRect();
      const x=box.left+box.width/2,y=box.bottom-2;
      return {x,y,bottom:box.bottom,inside:box.top>=scene.top&&box.bottom<=Math.min(innerHeight,scene.bottom),
        hit:el.contains(document.elementFromPoint(x,y))};
    });
    assert(point.inside&&point.hit,JSON.stringify(point));
    await shot(id);
    await page.touchscreen.tap(point.x,point.y);
    await page.waitForFunction(old=>document.querySelector('#prologuePart2Content [data-card]')?.dataset.card!==old,id);
    console.log(width,id,'bottom',point.bottom,'tap advanced');
  }
  assert.deepEqual(responseErrors,[]);
  console.log(width,mission,'25 → 525 / 受け取り済み',retreat,'background',background.expected,'404',responseErrors.length);
}

await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','0'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
  const [banner]=await once(server.stdout,'data');
  const url='http://127.0.0.1:'+String(banner).match(/:(\d+)/)[1]+'/?legacy=1';
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  for(const width of [360,412]){
    const size={width,height:915};
    const context=await browser.newContext({...devices['Pixel 7'],viewport:size,screen:size,locale:'ja-JP',reducedMotion:'no-preference'});
    await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():r.fulfill({json:{gifts:[]}}));
    const page=await context.newPage();
    page.setDefaultTimeout(7000);
    await page.goto(url);
    await verify(page,width);
    await context.close();
  }
}finally{
  await browser?.close();
  server.kill();
}
