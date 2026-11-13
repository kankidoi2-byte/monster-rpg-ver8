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
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
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
  const longest=await page.evaluate(()=>tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID).filter(s=>!s.target&&!s.input&&!s.choices).sort((a,b)=>tutorialResolvedText(b).length-tutorialResolvedText(a).length)[0].id);
  await start(longest);await finish();await shot('longest-dialogue');
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
  // Isolated map fixture, then enter its actual scene renderer.
  await page.evaluate(()=>{clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);save.instances=[];save.party=[];['galdra','freigal','aquaron'].forEach(id=>save.party.push(addInstance(id,1).uid));save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);closeContractorRankUp();openMapStory();startMapStoryEpisode('gl_01');mapStoryTypewriter?.finish();});
  await shot('map-story');assert(await page.locator('.map-story-scene').isVisible());
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('story presentation: portrait captures, typing, form, log, auto safety, checkpoint and epilogue passed');
}finally{await browser?.close();server?.kill();}
