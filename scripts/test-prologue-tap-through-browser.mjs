// Real fresh-save journey: progress only via coordinate taps and name entry.
// No fixture injection, state advancement, locator clicks or scripted scrolling.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const out=process.env.PROLOGUE_EVIDENCE_DIR||'artifacts/save-failure-ui/prologue-taps';
fs.mkdirSync(out,{recursive:true});
const port=process.env.PROLOGUE_TEST_PORT||'4196';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port',port],{stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const reports=[];
try{
 for(const [width,height] of [[412,780],[360,640]]){
  if(process.env.PROLOGUE_TEST_WIDTH&&width!==+process.env.PROLOGUE_TEST_WIDTH)continue;
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(5000);
  const report={width,height,steps:[],targets:[],taps:[],rankDismissals:[],pageErrors:[],dialogs:[],sheetChecks:[],reloads:[],pauses:[],retreats:[],retrySkips:[],chapterChecks:[],stabilityChecks:[]};reports.push(report);
  page.on('pageerror',e=>report.pageErrors.push(e.message));
  page.on('dialog',async d=>{report.dialogs.push(d.message());await d.dismiss()});
  const recordRank=async()=>{
   const state=await page.evaluate(()=>({active:tutorialUiState.active,step:tutorialCurrentStepId(),screen:activeScreenId(),chapterGate:currentTutorialState().chapterGate}));
   assert.equal(state.active,false,'rank-up must never cover active tutorial guidance');
   assert.notEqual(state.screen,'alchemyResult','rank-up must wait for alchemy result guidance');
   report.rankDismissals.push(state);
   await page.screenshot({path:`${out}/${width}-rank-boundary-${report.rankDismissals.length}.png`});
  };
  const tap=async selector=>{
   // Pending rank-ups are shown at a chapter break, after Pause, or on completion.
   if(selector!=='#contractorRankUpOverlay button'&&await page.locator('#contractorRankUpOverlay:not(.hidden)').isVisible()){
    await recordRank();
    await tap('#contractorRankUpOverlay button');
   }
   const point=await page.locator(selector).first().evaluate(el=>{
    const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);
    return {x,y,hit:hit?.outerHTML?.slice(0,180),ok:r.width>0&&r.height>0&&(hit===el||el.contains(hit))};
   });
   assert(point.ok,`Cannot tap ${selector}: ${JSON.stringify(point)}`);
   report.taps.push({selector,x:point.x,y:point.y});
   await page.touchscreen.tap(point.x,point.y);await page.waitForTimeout(180);
  };
  const isVisible=selector=>page.locator(selector).first().isVisible();
  await page.goto(`http://127.0.0.1:${port}/?legacy=1`,{waitUntil:'networkidle'});
  await tap('#titleScreen');await page.locator('#titleScreen').waitFor({state:'detached'});await page.waitForTimeout(150);
  let last='',repeats=0,complete=false,expectedRetryFree=null;
  const reloaded=new Set(),paused=new Set(),retreated=new Set();
  for(let n=0;n<650;n++){
   await page.waitForTimeout(120);
   if(await isVisible('#contractorRankUpOverlay:not(.hidden)')){
    await recordRank();await tap('#contractorRankUpOverlay button');continue;
   }
   const state=await page.evaluate(()=>{
    const step=tutorialUiState.steps[tutorialUiState.index];
    return {active:tutorialUiState.active,id:tutorialCurrentStepId(),page:tutorialDialogueState.page,target:step?.target,action:tutorialStepRequiresAction(step),input:step?.input,busy:typeof busy!=='undefined'&&busy,screen:activeScreenId(),status:currentTutorialState().status};
   });
   const key=JSON.stringify(state);
   if(key===last)repeats++;else {last=key;repeats=0;console.log(width,state.id||state.screen,state.page)}
   assert(repeats<35,`Stalled ${key}`);
   if(state.id&&!report.steps.includes(state.id))report.steps.push(state.id);
   if(expectedRetryFree){
    const first=expectedRetryFree==='battle_free'?'battle_enemy':'stella_mock_enemy';
    assert.notEqual(state.id,first,'learned retry must skip the repeated battle explanation');
    if(state.id===expectedRetryFree){report.retrySkips.push(state.id);expectedRetryFree=null;}
   }
   if(state.target){
    // Allow async rendering/animations to settle without moving the viewport ourselves.
    await page.waitForFunction(()=>{
     const el=tutorialUiState.target;if(!el)return false;
     const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
     return r.width>0&&r.height>0&&(hit===el||el.contains(hit));
    },null,{timeout:4500}).catch(async error=>{
     console.error('TARGET FAILURE',await page.evaluate(()=>({step:tutorialCurrentStepId(),target:tutorialUiState.target?.outerHTML?.slice(0,400),rect:tutorialUiState.target?.getBoundingClientRect().toJSON(),bubble:document.getElementById('tutorialBubble').getBoundingClientRect().toJSON(),hit:(()=>{const r=tutorialUiState.target?.getBoundingClientRect();return r&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.outerHTML?.slice(0,500)})()})));throw error;
    });
    report.targets.push(await page.evaluate(()=>{const el=tutorialUiState.target,r=el.getBoundingClientRect();return {step:tutorialCurrentStepId(),rect:r.toJSON(),hit:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.tagName}}));
   }
   if(state.id==='expedition_active'){
    const samples=await page.evaluate(async()=>{
     const points=[];
     for(let i=0;i<24;i++){
      await new Promise(requestAnimationFrame);
      const target=tutorialUiState.target.getBoundingClientRect(),bubble=document.getElementById('tutorialBubble').getBoundingClientRect();
      points.push([target.top+target.height/2,bubble.top]);
     }
     return points.slice(-12);
    });
    for(const axis of [0,1])assert(Math.max(...samples.map(p=>p[axis]))-Math.min(...samples.map(p=>p[axis]))<1,'target and guide must settle before tapping, without alternating scroll positions');
    report.stabilityChecks.push({step:state.id,samples});
   }
   if(state.id==='growth_skill_open'&&!report.sheetChecks.length){
    assert(await page.locator('.roster-sheet-close').isDisabled());
    // Both controls are exercised at actual screen coordinates. The disabled
    // close button can be inside the sheet's scroll area, so use visible points.
    for(const selector of ['.roster-sheet-close','.roster-sheet-backdrop']){
     const point=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:el.classList.contains('roster-sheet-backdrop')?4:r.top+r.height/2}});
     await page.touchscreen.tap(point.x,point.y);await page.waitForTimeout(150);
     assert(await isVisible('.roster-sheet'));
     assert.equal(await page.evaluate(()=>tutorialCurrentStepId()),'growth_skill_open');
     report.sheetChecks.push(selector);
    }
    await page.screenshot({path:`${out}/${width}-growth-skill.png`});
   }
   if(['menu_dex_open','expedition_destination','stella_skill_open','stella_attribute_intro','lumina_execute','expedition_dispatch'].includes(state.id))await page.screenshot({path:`${out}/${width}-${state.id}.png`});
   if(process.env.PROLOGUE_TEST_RELOAD==='1'&&['battle_choose_skill','battle_free','growth_skill_open','stella_skill_equip','stella_mock_free','lumina_execute','lumina_wait','expedition_member','expedition_active'].includes(state.id)&&!reloaded.has(state.id)){
    reloaded.add(state.id);report.reloads.push({from:state.id,saved:await page.evaluate(()=>currentTutorialState().stepId)});
    await page.reload({waitUntil:'networkidle'});await tap('#titleScreen');await page.locator('#titleScreen').waitFor({state:'detached'});await page.waitForTimeout(150);
    const saved=report.reloads.at(-1).saved;
    await page.waitForFunction(id=>tutorialCurrentStepId()===id,saved);continue;
   }
   if(process.env.PROLOGUE_TEST_PAUSE==='1'&&['menu_dex_open','growth_skill_open','stella_skill_equip','lumina_execute','expedition_member','expedition_dispatch','expedition_active'].includes(state.id)&&!paused.has(state.id)){
    paused.add(state.id);report.pauses.push(state.id);await tap('.tutorial-pause');
    assert.equal(await page.evaluate(()=>tutorialUiState.active),false);
    if(state.id==='growth_skill_open'){
     assert.equal(await page.locator('.roster-sheet-close').isDisabled(),false,'pausing releases the sheet close control');
     await page.touchscreen.tap(width/2,4);assert.equal(await page.locator('.roster-sheet').count(),0);
    }
    await tap('[data-nav="home"]');await tap('#homeAdventureButton');
    assert(await page.locator('#storyPrologueChapter').evaluate(el=>el.open),'unfinished prologue must expose Continue without expanding details');
    await tap('#storyContinueCard button');continue;
   }
   if(process.env.PROLOGUE_TEST_RETREAT==='1'&&['battle_free','stella_mock_free'].includes(state.id)&&!retreated.has(state.id)){
    retreated.add(state.id);report.retreats.push(state.id);expectedRetryFree=state.id;await tap('#tutorialNextButton');
    await page.waitForFunction(()=>!busy);await tap('#battleEscapeButton');continue;
   }
   if(state.id==='prologue_complete')complete=true;
   if(state.active){
    if(state.input==='player_name'){
     await tap('#tutorialPlayerNameInput');await page.keyboard.insertText('通し検査');await tap('#tutorialNameForm button');
    }else if(await isVisible('#tutorialDialogueChoices:not([hidden]) button'))await tap('#tutorialDialogueChoices button');
    else if(state.action&&state.target){
     // A dynamic party guide selects remove/add/save on this same saved STEP.
     await tap('.tutorial-target-active');
    }else if(await isVisible('#tutorialNextButton:not([hidden]):not(:disabled)'))await tap('#tutorialNextButton');
    else await page.waitForTimeout(250);
   }else if(complete&&state.status==='completed')break;
   else if(state.screen==='storyMode'){
    report.chapterChecks.push(await page.evaluate(()=>currentTutorialState().stepId));
    await page.waitForTimeout(550);
    if(report.chapterChecks.length===1)await page.screenshot({path:`${out}/${width}-story-open.png`});
    assert(await page.locator('#storyPrologueChapter').evaluate(el=>el.open),'unfinished prologue must expose Continue without expanding details');
    await tap('#storyContinueCard button');
   }else if(state.screen==='battle'){
    if(state.busy){await page.waitForTimeout(300);continue;}
    if(await isVisible('[data-tutorial-normal-attack]'))await tap('[data-tutorial-normal-attack]');
    else if(await isVisible('#battleSkillButton:not(:disabled)'))await tap('#battleSkillButton');
    else await page.waitForTimeout(300);
   }else if(state.screen==='alchemyResult')await page.waitForTimeout(300);
   else if(state.screen==='home'&&state.status!=='completed')await tap('#homeAdventureButton');
   else throw Error(`Unhandled UI ${key}`);
  }
  assert(complete,'must reach final episode');
  await page.waitForTimeout(550);
  while(await isVisible('#contractorRankUpOverlay:not(.hidden)')){await recordRank();await tap('#contractorRankUpOverlay button');await page.waitForTimeout(550);}
  assert.equal(await page.evaluate(()=>save.contractor.pendingRankUps.length),0,'all queued rank notices remain available through chapter/pause/completion');
  if(process.env.PROLOGUE_TEST_RETREAT==='1')assert.deepEqual(report.retrySkips.sort(),['battle_free','stella_mock_free']);
  assert.equal(await page.evaluate(()=>currentTutorialState().status),'completed');
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.dialogs,[]);
  await page.screenshot({path:`${out}/${width}-complete.png`});
  console.log(`PASS ${width}x${height}: ${report.steps.length} steps, ${report.targets.length} target-center checks, ${report.taps.length} coordinate taps`);
  await context.close();
 }
}catch(error){
 const page=browser.contexts().at(-1)?.pages().at(-1);if(page){await page.screenshot({path:`${out}/failure.png`});fs.writeFileSync(`${out}/failure.html`,await page.content())}
 throw error;
}finally{fs.writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));await browser.close();server.kill()}
