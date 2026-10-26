// Disposable browser contexts only. Exercise the actual controls from an
// unchanged starter party, including rollback, reload and the next guide.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','4219'],{stdio:['ignore','pipe','inherit']});let browser;
 fs.mkdirSync('artifacts/save-failure-ui',{recursive:true});
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
  for(const viewport of [{width:320,height:640},{width:360,height:800},{width:1366,height:900}])for(const slot of [1,2]){
   const context=await browser.newContext({viewport,reducedMotion:'reduce'});
   await context.addInitScript(slot=>sessionStorage.setItem('mb_profile_tab_v1',String(slot)),slot);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>{await page.locator('#contractorRankUpOverlay button').click()});
   await page.goto('http://127.0.0.1:4219/?legacy=1',{waitUntil:'networkidle'});await page.locator('#titleScreen').click();
   const ids=await page.evaluate(slot=>{
    clearTutorialUi();save=initSave();ensureTutorialStarterContracts();commitTutorialElnaContract();
    const f=tutorialOwnedStarterInstance('freigal'),a=tutorialOwnedStarterInstance('aquaron'),e=tutorialElnaContractInstance();
    if(slot===2){f.id='freiwolf';a.id='tienhairon';e.id='elna_kaen'}
    const g=addInstance('galdra',1);save.party=[f.uid,a.uid,e.uid];
    save.progress.tutorial.alchemyLessonCompleted=true;save.progress.tutorial.alchemyLessonPrepared=true;
    // Rank-up notices are unrelated to this guide and can otherwise appear
    // while failure injection deliberately prevents dismissing them.
    save.contractor.pendingRankUps=[];
    setTutorialStep('expedition_party_save');if(!saveGame())throw Error('seed failed');
    startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'expedition_party_save',persist:true});
    return {f:f.uid,a:a.uid,e:e.uid,g:g.uid};
   },slot);
   const assertTarget=async uid=>{
    await page.waitForFunction(uid=>tutorialUiState.target?.dataset.partyUid===uid,uid);
    await page.waitForFunction(()=>{
     const target=tutorialUiState.target,bubble=document.getElementById('tutorialBubble');if(!target||!bubble)return false;
     const t=target.getBoundingClientRect(),b=bubble.getBoundingClientRect();
     const top=document.querySelector('.app-topbar').getBoundingClientRect().bottom;
     const bottom=document.querySelector('.app-bottom-nav').getBoundingClientRect().top;
     const overlap=t.left<b.right&&t.right>b.left&&t.top<b.bottom&&t.bottom>b.top;
     return !overlap&&t.top>=top&&t.bottom<=bottom&&b.top>=top&&b.bottom<=bottom&&target.contains(document.elementFromPoint(t.left+t.width/2,t.top+t.height/2));
    }).catch(async error=>{
     console.error('Guide geometry',await page.evaluate(()=>({step:tutorialCurrentStepId(),target:tutorialUiState.target?.outerHTML,rect:tutorialUiState.target?.getBoundingClientRect().toJSON(),bubble:document.getElementById('tutorialBubble')?.getBoundingClientRect().toJSON()})));
     await page.screenshot({path:`artifacts/save-failure-ui/party-guide-failure-${viewport.width}-${slot}.png`});throw error;
    });
    assert.equal(await page.evaluate(()=>tutorialCurrentStepId()),'expedition_party_save');
    assert.equal(await page.locator('#tutorialOverlay').getAttribute('aria-hidden'),'false');
    await page.screenshot({path:`artifacts/save-failure-ui/party-guide-${viewport.width}-${slot}-${uid||'save'}.png`});
   };
   const failSave=()=>page.evaluate(()=>{globalThis.testOriginalSaveGame=saveGame;saveGame=()=>false});
   const restoreSave=()=>page.evaluate(()=>{saveGame=globalThis.testOriginalSaveGame});
   const targetButton=()=>page.locator('#partySelectList .tutorial-target-active');
   await assertTarget(ids.f);
   // A failed remove must keep both the selected party and its instruction.
   await failSave();await targetButton().click();await assertTarget(ids.f);
   assert.deepEqual(await page.evaluate(()=>save.party),[ids.f,ids.a,ids.e]);await restoreSave();
   await targetButton().click();await assertTarget(ids.g);
   // Resume from the real saved intermediate party, without closing the guide.
   await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();
   await page.evaluate(()=>startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'expedition_party_save',persist:true}));
   await assertTarget(ids.g);
   await failSave();await targetButton().click();await assertTarget(ids.g);
   assert.deepEqual(await page.evaluate(()=>save.party),[ids.a,ids.e]);await restoreSave();
   await targetButton().click();
   await page.waitForFunction(()=>tutorialUiState.target?.id==='partySetupSaveButton');
   await assertTarget(undefined);
   await failSave();await page.locator('#partySetupSaveButton').click();
   assert.equal(await page.evaluate(()=>tutorialCurrentStepId()),'expedition_party_save');await restoreSave();
   await page.locator('#partySetupSaveButton').click();
   await page.waitForFunction(()=>tutorialCurrentStepId()==='expedition_home_open');
   assert.deepEqual(await page.evaluate(()=>save.party),[ids.a,ids.e,ids.g]);
   await page.locator('#homeExpeditionPreview button').click();
   await page.locator('[data-tutorial-expedition-map="grassland"]').click();
   await page.locator('[data-tutorial-expedition-distance="short"]').click();
   await page.locator('[data-tutorial-expedition-member]').click();
   await page.locator('#tutorialNextButton').click();await page.locator('#expeditionStartButton').click();
   assert.equal(await page.evaluate(()=>save.expeditions.active[0].memberUids[0]),ids.f);
   await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();
   assert.equal(await page.evaluate(()=>save.expeditions.active.length),1);
   assert.deepEqual(await page.evaluate(()=>save.party),[ids.a,ids.e,ids.g]);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${viewport.width}x${viewport.height} profile ${slot}: visible guide, remove/add/save failure retries, intermediate reload, expedition and saved result`);
   await context.close();
  }
 }finally{await browser?.close();server.kill()}
})().catch(error=>{console.error(error);process.exitCode=1});
