import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const {chromium}=createRequire(import.meta.url)('playwright');
const publicUrl=process.env.GAME_TEST_URL;
const server=publicUrl?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4199'],{stdio:['ignore','pipe','inherit']});
const out='artifacts/skill-card-layout/map-stories';fs.mkdirSync(out,{recursive:true});
let browser;
try{
 if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
 // Map encyclopedia registration can legitimately schedule a rank notice after entry.
 // Dismiss it through the visible player control, including timer races during clicks.
 await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>{await page.locator('#contractorRankUpOverlay button').first().click();});
 await page.route('https://monster-battle-records.kanki-doi-2.chatgpt.site/**',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await page.goto(publicUrl||'http://127.0.0.1:4199/?legacy=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof openMapStory==='function'&&typeof save!=='undefined');
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);save.instances=[];save.party=[];['galdra','freigal','aquaron'].forEach(id=>save.party.push(addInstance(id,1).uid));save.contractor.pendingRankUps=[];if(contractorRankUpTimer)clearTimeout(contractorRankUpTimer);contractorRankUpTimer=null;closeContractorRankUp();saveGame();show('home');});
 await page.locator('#homePartyEditButton').click();assert(await page.locator('#party').isVisible());await page.locator('#rosterActions [data-roster-party]').click();assert(await page.locator('#partySet').isVisible());await page.locator('#partySetupSaveButton').click();
 // Home story catalog uses the existing map-story gate and progress without save writes.
 await page.locator('#homeAdventureButton').click();
 await page.locator('#storyCategory-map').click();
 assert(await page.locator('#storyPanel-map').isVisible());
 assert((await page.locator('#storyMapList').innerText()).includes('0/11 完了'));
 for(const [width,height] of [[320,720],[430,900],[844,390]]){
  await page.setViewportSize({width,height});
  assert(await page.locator('#storyMode').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  for(const key of ['main','map','character','side']){
   const button=page.locator('#storyCategory-'+key);assert(await button.isVisible());assert((await button.boundingBox()).height>=44);
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{save.progress.tutorial.status='in_progress';renderStoryMode();selectStoryCategory('map');});
 const storyButton=(id,root='#storyMapList')=>page.locator(`${root} button[data-story-id="${id}"]`);
 assert(await storyButton('grassland_whose').isDisabled());
 assert(await storyButton('volcano_breath').isDisabled());
 assert((await page.locator('#storyMapList').innerText()).includes('序章を完了'));
 await page.evaluate(()=>{save.progress.tutorial.status='skipped';renderStoryMode();selectStoryCategory('map');});
 const savedBefore=await page.evaluate(()=>JSON.stringify(save));
 await storyButton('grassland_whose').click();assert.equal(await page.locator('.map-story-card').count(),11);
 await page.locator('#mapStory button[onclick="returnToStoryMapCatalog()"] ').click();
 assert(await page.locator('#storyPanel-map').isVisible());
 assert.equal(await page.evaluate(()=>JSON.stringify(save)),savedBefore);
 await page.evaluate(()=>{openBattleHub();showWorldMapLocation('grassland');});
 await storyButton('grassland_whose','#battleChoiceList').click();assert.equal(await page.locator('.map-story-card').count(),11);
 await page.locator('#mapStory button[onclick="startMapStoryEpisode(\'gl_01\')"]').click();
 const nextLine=()=>page.locator('#mapStory button[onclick="advanceMapStoryNode()"]');
 const previous=()=>page.locator('#mapStory button[onclick="previousMapStoryNode()"]');
 const skip=()=>page.locator('#mapStory button[onclick="skipMapStoryDialogue()"]');
 assert(await previous().isDisabled());
 await nextLine().click();await previous().click();assert(await previous().isDisabled());await nextLine().click();
 assert.equal(await page.locator('.map-story-speaker').getAttribute('alt'),'グノーシス');
 for(const [width,height,font] of [[320,568,100],[320,720,100],[390,844,100],[430,900,100],[844,390,100],[390,844,200]]){
  await page.setViewportSize({width,height});await page.locator('#mapStory').evaluate((el,font)=>el.style.fontSize=font+'%',font);
  await page.screenshot({path:`${out}/dialogue-${width}-${height}-${font}.png`,fullPage:true});
  const fits=await page.locator('#mapStory').evaluate(el=>el.scrollWidth<=el.clientWidth+1);assert(fits,`story fits ${width}px / ${font}%`);
  const scene=await page.locator('.map-story-scene').boundingBox(),panel=await page.locator('.map-story-dialogue').boundingBox(),portrait=await page.locator('.map-story-speaker').boundingBox();
  assert.equal(scene.x,0);assert.equal(scene.y,0);assert.equal(scene.width,width);assert.equal(scene.height,height);
  assert(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=width&&panel.y+panel.height<=height,'panel fits viewport');
  assert(width>=720?portrait.x+portrait.width<=panel.x:portrait.y+portrait.height<=panel.y,'portrait never overlaps dialogue');
  assert(await page.locator('.app-topbar').isHidden());assert(await page.locator('.app-bottom-nav').isHidden());
  for(const button of await page.locator('.map-story-scene button').all()){
   await button.scrollIntoViewIfNeeded();assert(await button.isVisible());assert((await button.boundingBox()).height>=44);
  }
  assert((await nextLine().evaluate(el=>getComputedStyle(el).backgroundImage)).includes('linear-gradient'),'primary retains tutorial colors');
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#mapStory').evaluate(el=>el.style.fontSize='100%');
 const beforeSkip=await page.evaluate(()=>({coins:save.coins,instances:JSON.stringify(save.instances)}));
 await skip().click();assert(await page.locator('#mapStory button[onclick="launchMapStoryBattle(\'gl_01\')"]').isVisible());
 assert.equal(await page.evaluate(()=>mapStoryState().resume.phase),'pre');assert.equal(await page.evaluate(()=>mapStoryProgress('gl_01').completed),false);
 assert.deepEqual(await page.evaluate(()=>({coins:save.coins,instances:JSON.stringify(save.instances)})),beforeSkip);
 await previous().click();assert(await nextLine().isVisible());
 const savedNode=await page.evaluate(()=>mapStoryState().resume.nodeId);
 await page.locator('.map-story-close').click();assert(await page.locator('.app-topbar').isVisible());assert(await page.locator('.app-bottom-nav').isVisible());
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof openMapStory==='function'&&typeof save!=='undefined');
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>openMapStory());await page.locator('#mapStory button[onclick="startMapStoryEpisode(\'gl_01\')"]').click();
 assert.equal(await page.evaluate(()=>mapStoryState().resume.nodeId),savedNode);
 for(let number=1;number<=11;number++){
  const id='gl_'+String(number).padStart(2,'0');if(number!==1)await page.locator(`#mapStory button[onclick="startMapStoryEpisode('${id}')"]`).click();
  while(await page.evaluate(()=>mapStoryState().resume.nodeId!==null))await page.locator('#mapStory button[onclick="advanceMapStoryNode()"] ').click();
  await page.locator(`#mapStory button[onclick="launchMapStoryBattle('${id}')"]`).click();assert(await page.locator('#battle').isVisible());
  if(number===1){await page.evaluate(()=>{eHp=1;});await page.evaluate(()=>turn(-1));}
  else{
   if(number===3||number===11)await page.screenshot({path:`${out}/battle-${number}.png`,fullPage:true});
   await page.evaluate(()=>{if(multiBattle?.active){multiBattle.enemies.forEach(e=>{e.hp=0;e.alive=false;});winMultiBattle();}else{eHp=0;win();}});
  }
  assert(await page.locator('#battleOutcome.is-victory').isVisible());assert.equal(await page.locator('#battleOutcomeActions button').count(),1);
  await page.locator('#battleOutcomeActions button').click();
  while(await page.evaluate(()=>mapStoryState().resume.nodeId!==null))await page.locator('#mapStory button[onclick="advanceMapStoryNode()"] ').click();
  await page.locator('#mapStory button[onclick="completeMapStoryEpisode()"] ').click();
  while(await page.locator('#evolution').isVisible())await page.evaluate(()=>cancelEvolution());
  if(await page.locator('#partySet').isVisible())await page.locator('#mapStoryPartyReturn').click();else if(number<11)await page.locator('#mapStory button[onclick="openMapStory()"] ').click();
 }
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof mapStoryState==='function'&&mapStoryState().episodes.gl_11?.completed===true);
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});await page.evaluate(()=>openMapStory());
 assert((await page.locator('#mapStory').innerText()).includes('11/11 完了'));await page.screenshot({path:`${out}/completed.png`,fullPage:true});
 await page.locator('#mapStory button[onclick="returnToStoryMapCatalog()"] ').click();
 assert(await page.locator('#storyPanel-map').isVisible());assert((await page.locator('#storyMapList').innerText()).includes('11/11 完了'));
 await storyButton('grassland_whose').click();
 const completedSave=await page.evaluate(()=>JSON.stringify(save));
 await page.locator('#mapStory button[onclick="readMapStoryEpisode(\'gl_01\')"]').click();
 await skip().click();assert.equal(await page.evaluate(()=>mapStoryUi.phase),'pre');
 await nextLine().click();assert.equal(await page.evaluate(()=>mapStoryUi.phase),'post');
 await skip().click();await previous().click();assert(await nextLine().isVisible());await skip().click();
 await page.locator('#mapStory button[onclick="completeMapStoryEpisode()"] ').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(save)),completedSave,'replay controls leave saved progress unchanged');
 await page.locator('#mapStory button[onclick="leaveMapStory()"] ').click();assert.equal(await page.evaluate(()=>worldMapSelectedId),'grassland');
 const savedGrassland=await page.evaluate(()=>JSON.stringify(mapStoryState('grassland_whose')));
 await page.evaluate(()=>showWorldMapLocation('volcano'));
 await storyButton('volcano_breath','#battleChoiceList').click();
 assert.equal(await page.locator('.map-story-card').count(),9);
 assert(await page.getByRole('button',{name:'第2話を始める',exact:true}).isDisabled());
 for(let number=1;number<=9;number++){
  const id='vc_'+String(number).padStart(2,'0');
  await page.getByRole('button',{name:`第${number}話を始める`,exact:true}).click();
  if(number===1){
   assert.equal(await page.locator('.map-story-bg').getAttribute('src'),'images/maps/volcano.webp');
   await nextLine().click();
   for(const [width,height,font] of [[320,568,100],[430,900,100],[844,390,100],[390,844,200]]){
    await page.setViewportSize({width,height});await page.locator('#mapStory').evaluate((el,font)=>el.style.fontSize=font+'%',font);
    const panel=await page.locator('.map-story-dialogue').boundingBox();
    assert(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=width&&panel.y+panel.height<=height);
    for(const button of await page.locator('.map-story-scene button').all()){
     await button.scrollIntoViewIfNeeded();assert(await button.isVisible());assert((await button.boundingBox()).height>=44);
    }
    await page.screenshot({path:`${out}/volcano-dialogue-${width}-${font}.png`,fullPage:true});
   }
   await page.setViewportSize({width:390,height:844});await page.locator('#mapStory').evaluate(el=>el.style.fontSize='100%');
  }
  await skip().click();
  if(number===1){
   await page.getByRole('button',{name:'編成を確認',exact:true}).click();
   assert.equal(await page.locator('#mapStoryPartyReturn').innerText(),'火山の物語へ戻る');
   await page.locator('#mapStoryPartyReturn').click();
   await page.getByRole('button',{name:'つづきから',exact:true}).click();
  }
  await page.getByRole('button',{name:'戦闘開始',exact:true}).click();
  assert((await page.locator('#battleMapBanner').innerText()).includes(`火山ストーリー／第${number}話`));
  assert.equal(await page.evaluate(()=>Boolean(multiBattle?.active)),number===3||number===7);
  if(number===9)await page.screenshot({path:`${out}/volcano-battle-9.png`,fullPage:true});
  if(number===1)await page.evaluate(()=>{eHp=1;return turn(-1);});
  else await page.evaluate(()=>{if(multiBattle?.active){multiBattle.enemies.forEach(e=>{e.hp=0;e.alive=false;});winMultiBattle();}else{eHp=0;win();}});
  assert.equal(await page.locator('#battleOutcomeActions button').count(),1);
  await page.locator('#battleOutcomeActions button').click();
  if(number===1){
   await nextLine().click();
   const resume=await page.evaluate(()=>JSON.stringify(mapStoryState().resume));
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
   await page.locator('#homeAdventureButton').click();await page.locator('#storyCategory-map').click();
   await storyButton('volcano_breath').click();
   await page.getByRole('button',{name:'戦闘後から再開',exact:true}).click();
   assert.equal(await page.evaluate(()=>JSON.stringify(mapStoryState().resume)),resume);
  }
  if(number===9){
   while(await page.evaluate(()=>mapStoryState().resume.nodeId!=='vc_09_post_05'))await nextLine().click();
   assert.match(await page.locator('.map-story-message').innerText(),/^それから数日後。/);
   assert.equal(await page.locator('.map-story-time-skip .map-story-bg').evaluate(el=>getComputedStyle(el).animationName),'none');
  }
  await skip().click();
  await page.locator('#mapStory button[onclick="completeMapStoryEpisode()"]').click();
  while(await page.locator('#evolution').isVisible())await page.evaluate(()=>cancelEvolution());
  if(await page.locator('#partySet').isVisible())await page.locator('#mapStoryPartyReturn').click();
  else if(number<9)await page.getByRole('button',{name:'話一覧へ',exact:true}).click();
 }
 assert.equal(await page.evaluate(()=>mapStoryCompletedCount(VOLCANO_STORY)),9);
 assert.equal(await page.evaluate(()=>JSON.stringify(mapStoryState('grassland_whose'))),savedGrassland);
 await page.getByRole('button',{name:'火山へ戻る',exact:true}).click();
 assert.equal(await page.evaluate(()=>worldMapSelectedId),'volcano');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/manifest.json`,JSON.stringify({result:'PASS',publicUrl:publicUrl||null,viewports:[320,430,844],fontScale:200,episodes:20,reload:true,errors},null,2));
 console.log('PASS map story browser: all 20 flows, mobile/landscape/200%, separate saves, post-battle reload, party return and map return.');
}finally{await browser?.close();server?.kill();}

