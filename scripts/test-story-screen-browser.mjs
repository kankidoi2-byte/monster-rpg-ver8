import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const out='artifacts/story-presentation';fs.mkdirSync(out,{recursive:true});
const publicUrl=process.env.GAME_TEST_URL;
const server=publicUrl?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4377'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 if(server)await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail);server.once('exit',code=>fail(new Error('dev server exited '+code)));});
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const viewport of [{width:360,height:800},{width:390,height:844}]){
  const page=await browser.newPage({viewport,isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),errors=[];
  let acceptSkip=false,skipConfirmations=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{if(acceptSkip&&d.type()==='confirm'){assert.match(d.message(),/必須チュートリアルを全体スキップ/);skipConfirmations++;await d.accept();}else await d.dismiss();});
  await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>page.locator('#contractorRankUpOverlay button').first().click());
  await page.route('https://monster-battle-records.kanki-doi-2.chatgpt.site/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
  await page.goto(publicUrl||'http://127.0.0.1:4377/?legacy=1');
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();save=initSave();save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);closeContractorRankUp();show('home');});
  const start=async(id,persist=false)=>{await page.evaluate(({id,persist})=>startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:id,persist}),{id,persist});};
  const finish=()=>page.evaluate(()=>tutorialPresentationFinishTyping());
  const current=()=>page.evaluate(()=>tutorialUiState.steps[tutorialUiState.index]?.id);
  const shot=async name=>{if(!name.startsWith('grassland-transition'))await page.waitForTimeout(650);await page.screenshot({path:`${out}/${name}-${viewport.width}.png`,fullPage:true});};
  await start('intro_gnosis');await finish();await shot('black-start');
  assert((await page.locator('#tutorialBubble').evaluate(e=>getComputedStyle(e).backgroundImage)).includes('linear-gradient'),'navy panel not white theme');
  assert(await page.locator('#tutorialOverlay').evaluate(e=>e.classList.contains('is-story-step')));
  await start('gnosis_contract_power');
  await page.locator('#tutorialText').click();assert.equal(await current(),'gnosis_contract_power','first tap completes text only');
  assert(await page.evaluate(()=>tutorialPresentation.writer.isComplete()));
  await page.locator('#tutorialText').click();assert.equal(await current(),'gnosis_descent');await finish();await shot('episode-one-ending');
  // Form must wait for the text, then accept input via the real submit control.
  await start('gnosis_name');assert(await page.locator('#tutorialNameForm').isHidden());
  await finish();assert(await page.locator('#tutorialNameForm').isVisible());
  await page.locator('#tutorialPlayerNameInput').fill('表示テスト');await shot('name-input');
  await page.locator('#tutorialNameForm button').click();assert.notEqual(await current(),'gnosis_name');
  await start('elna_encounter');await shot('grassland-transition-start');await page.waitForTimeout(650);await shot('grassland-transition-mid');
  await page.waitForTimeout(3000);await finish();
  const firstText=await page.locator('#tutorialText').innerText();
  await page.locator('#tutorialText').click();await page.waitForTimeout(300);await finish();
  const secondText=await page.locator('#tutorialText').innerText();
  await page.locator('#tutorialText').click();await page.waitForTimeout(300);await finish();await shot('episode-two-cast');
  assert.equal(await page.locator('#tutorialCast img').count(),2);
  await page.evaluate(()=>tutorialPresentationLog());
  const rows=await page.locator('#tutorialLogLines p').allTextContents();assert(rows[0].endsWith(firstText));assert(rows[1].endsWith(secondText));await shot('ordered-log');
  await page.locator('#tutorialLog > button').click();
  // Enter a guide with auto already enabled: rendering a guide must turn it off.
  await page.evaluate(()=>{tutorialPresentation.auto=true;tutorialUiState.index=tutorialStepIndex(tutorialUiState.steps,'rescue_world_map_open');renderTutorialStep();});
  assert.equal(await page.evaluate(()=>tutorialPresentation.auto),false);await finish();await shot('ui-target');
  assert(await page.locator('#tutorialOverlay').evaluate(e=>e.classList.contains('is-ui-guide-step')));
  const longest=await page.evaluate(()=>tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID).filter(s=>!s.target&&!s.input&&!s.choices).flatMap(s=>(s.dialogue||[s]).map((v,index)=>({id:s.id,index,length:tutorialResolvedText({...s,...v}).length}))).sort((a,b)=>b.length-a.length)[0]);
  await start(longest.id);await page.evaluate(index=>{tutorialDialogueState.page=index;renderTutorialStep();},longest.index);await finish();await shot('longest-dialogue');
  assert(await page.locator('#tutorialBubble').evaluate(e=>{const b=e.getBoundingClientRect();return b.left>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1;}),'dialogue panel within portrait width');
  await start('gnosis_name');await page.evaluate(()=>{tutorialPresentation.auto=true;renderTutorialStep();});assert.equal(await page.evaluate(()=>tutorialPresentation.auto),false);
  await start('gnosis_contract_power',true);await finish();
  const saved=await page.evaluate(()=>{saveGame();return currentTutorialState().stepId;});
  await page.reload();await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>currentTutorialState().stepId),saved,'reload retains tutorial checkpoint');
  await page.evaluate(()=>{save.progress.tutorial.expeditionDispatched=true;});
  await start('prologue_epilogue',true);await finish();await shot('epilogue');
  await page.locator('#tutorialText').click();
  assert.equal(await page.evaluate(()=>currentTutorialState().status),'completed','final epilogue completes prologue');
  assert.equal(await page.evaluate(()=>tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID).some(s=>s.id==='prologue_complete')),false);
  await start('lumina_encounter');await finish();await shot('approved-workshop');
  assert((await page.locator('#tutorialStoryBackdrop').evaluate(e=>getComputedStyle(e).backgroundImage)).includes('lumina_secret_workshop_story_v1.webp'),'approved workshop background applied');
  // Acceptance 4: independent fresh fixtures, actual visible controls (no direct skip/Back calls).
  const resetControls=async()=>page.evaluate(()=>{clearTutorialUi();save=initSave();save.instances=[];save.party=[];save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);closeContractorRankUp();show('home');});
  await resetControls();await start('intro_gnosis',true);await finish();
  await page.locator('#tutorialText').click();assert.notEqual(await current(),'intro_gnosis');await finish();await page.waitForTimeout(300);
  await page.locator('.tutorial-tools button').filter({hasText:'ログ'}).click();
  assert(await page.locator('#tutorialLog #tutorialBackButton').isVisible());
  await page.locator('#tutorialBackButton').click();assert.equal(await current(),'intro_gnosis','log Back returns to preceding story step');

  await resetControls();await start('intro_gnosis',true);await finish();await page.waitForTimeout(300);
  await page.locator('.tutorial-tools button').filter({hasText:'スキップ'}).click();
  await page.locator('#tutorialDialogueSkipButton').click();
  assert.equal(await current(),'gnosis_name','conversation skip stops at required name input');
  assert.equal(await page.evaluate(()=>currentTutorialState().status),'in_progress');

  await resetControls();await start('stella_intro',true);await finish();
  assert.equal(await page.evaluate(()=>tutorialDialogueState.page),0);
  assert(await page.locator('#tutorialDialogueChoices').isHidden());
  await page.locator('#tutorialText').click();
  assert.equal(await page.evaluate(()=>tutorialDialogueState.page),1,'text tap reaches choice-bearing final page');
  assert.equal(await current(),'stella_intro');await finish();await page.waitForTimeout(300);
  assert(await page.locator('#tutorialDialogueChoices').isVisible());
  await page.locator('#tutorialText').click();assert.equal(await current(),'stella_intro','text tap cannot bypass mandatory choice');
  await page.locator('#tutorialDialogueChoices button').filter({hasText:'うん、いいよ'}).click();
  assert.equal(await current(),'stella_road_response','real choice button advances');

  await resetControls();await start('gnosis_contract_power',true);await finish();
  const pausedStep=await page.evaluate(()=>currentTutorialState().stepId);
  await page.locator('.tutorial-pause').click();
  assert(await page.locator('#tutorialOverlay').isHidden());
  assert.deepEqual(await page.evaluate(()=>({active:tutorialUiState.active,status:currentTutorialState().status,step:currentTutorialState().stepId})),{active:false,status:'in_progress',step:pausedStep},'close pauses without completing or losing checkpoint');

  await resetControls();await start('intro_gnosis',true);await finish();
  await page.locator('.tutorial-tools button').filter({hasText:'スキップ'}).click();
  acceptSkip=true;await page.locator('#tutorialSkipButton').click();acceptSkip=false;
  assert.equal(skipConfirmations,1,'full skip requires accepted confirmation');
  assert(await page.locator('#tutorialOverlay').isHidden());
  const skipResult=await page.evaluate(()=>({ids:save.instances.map(x=>x.id).sort(),party:save.party.map(uid=>save.instances.find(x=>x.uid===uid)?.id),reserve:save.instances.some(x=>x.id==='freigal'&&!save.party.includes(x.uid)),card:save.skillCards.s110_041,flags:TUTORIAL_REQUIRED_SKIP_FLAGS.map(flag=>currentTutorialState()[flag]),status:currentTutorialState().status,chapter:save.progress.chapterId,completed:save.progress.storyFlags.prologueCompleted,guest:currentTutorialState().elnaGuestActive,battle:tutorialBattleSession.active,expeditions:save.expeditions.active.length}));
  // Same mandatory-reward expectations as test-prologue-comprehensive.mjs, exercised through UI.
  assert.deepEqual(skipResult,{ids:['aquaron','elna_beginner','freigal','galdra'],party:['galdra','aquaron','elna_beginner'],reserve:true,card:1,flags:skipResult.flags.map(()=>true),status:'skipped',chapter:'prologue',completed:true,guest:false,battle:false,expeditions:0});
  // Isolated map fixture, then enter its actual scene renderer.
  await page.evaluate(()=>{clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);save.instances=[];save.party=[];['galdra','freigal','aquaron'].forEach(id=>save.party.push(addInstance(id,1).uid));save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);closeContractorRankUp();openMapStory();startMapStoryEpisode('gl_01');mapStoryTypewriter?.finish();});
  await shot('map-story');assert(await page.locator('.map-story-scene').isVisible());
  assert.deepEqual(errors,[]);await page.close();
 }
 // Short motion proposal clip. This records the actual renderer, not a mock-up.
 const motionContext=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true,reducedMotion:'no-preference',recordVideo:{dir:out+'/video',size:{width:360,height:800}}});
 const motionPage=await motionContext.newPage();
 await motionPage.route('https://monster-battle-records.kanki-doi-2.chatgpt.site/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await motionPage.goto(publicUrl||'http://127.0.0.1:4377/?legacy=1');
 await motionPage.locator('#titleScreen').click();await motionPage.locator('#titleScreen').waitFor({state:'detached'});
 await motionPage.evaluate(()=>{clearTutorialUi();save=initSave();save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);closeContractorRankUp();show('home');startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'gnosis_descent',persist:false});tutorialPresentationFinishTyping();});
 await motionPage.waitForTimeout(700);
 await motionPage.evaluate(()=>startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'elna_encounter',persist:false}));
 await motionPage.waitForTimeout(4500);
 const proposalVideo=motionPage.video();await motionContext.close();await proposalVideo.saveAs(out+'/black-to-grassland-proposal-360.webm');
 console.log('story presentation: portrait captures, typing, form, log, auto safety, checkpoint, epilogue, Back/conversation skip/pause/full skip and mandatory rewards passed');
}finally{await browser?.close();server?.kill();}
