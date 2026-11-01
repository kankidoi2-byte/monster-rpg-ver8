// Real runtime and disposable browser profiles: never reads player saves.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
(async()=>{
 const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','4218'],{stdio:['ignore','pipe','inherit']});let browser;
 try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
  for(const slot of [1,2]){
   const context=await browser.newContext({viewport:{width:slot===1?360:1366,height:slot===1?800:900},reducedMotion:'reduce'});
   await context.addInitScript(slot=>sessionStorage.setItem('mb_profile_tab_v1',String(slot)),slot);
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>{
    await page.locator('#contractorRankUpOverlay button').click();
   });
   await page.goto('http://127.0.0.1:4218/?legacy=1',{waitUntil:'networkidle'});
   await page.locator('#titleScreen').click();
   const results=await page.evaluate(()=>{
    clearTutorialUi();const results=[];
    for(const f of ['freigal','freiwolf'])for(const a of ['aquaron','highaquaron','shenhairon','tienhairon'])for(const e of ['elna_beginner','elna_middle','elna_advanced','elna_water','elna_kaen']){
     save=initSave();const units=[f,a,e,'galdra'].map(id=>addInstance(id,3,0,{tutorialContract:true}));
     save.party=units.slice(0,3).map(x=>x.uid);
     if(!tutorialInitialPartyReady())throw Error('initial party '+[f,a,e]);
     if(tutorialStellaSkillTargetInstance()?.uid!==units[2].uid)throw Error('Elna missing');
     tutorialBattleSession.active=true;tutorialBattleSession.kind='stella_mock';
     if(tutorialBattlePartyInstances().length!==3)throw Error('mock party');
     tutorialBattleSession.active=false;
     save.party=[units[3].uid,units[1].uid,units[2].uid];
     if(!tutorialExpeditionPartyReady()||tutorialExpeditionCandidateInstance()?.uid!==units[0].uid)throw Error('expedition party');
     const companions=()=>JSON.stringify(save.instances.map(({uid,id,level,exp})=>({uid,id,level,exp})));
     const before=companions();
     if(!commitTutorialFullSkip()||companions()!==before)throw Error('skip changed companions');
     if(!commitTutorialFullSkip()||companions()!==before)throw Error('repeat skip');
     results.push([f,a,e]);
    }
    return results.length;
   });assert.equal(results,40);
   // Seed the actual reported blocked checkpoint with all three companions evolved.
   const uids=await page.evaluate(()=>{
    clearTutorialUi();save=initSave();ensureTutorialStarterContracts();commitTutorialElnaContract();
    const f=tutorialOwnedStarterInstance('freigal'),a=tutorialOwnedStarterInstance('aquaron'),e=tutorialElnaContractInstance();
    f.id='freiwolf';a.id='tienhairon';e.id='elna_water';
    const g=addInstance('galdra',1);save.party=[g.uid,a.uid,e.uid];
    save.progress.tutorial.alchemyLessonCompleted=true;save.progress.tutorial.alchemyLessonPrepared=true;
    setTutorialStep('expedition_party_save');if(!saveGame())throw Error('seed save');
    return {f:f.uid,a:a.uid,e:e.uid,g:g.uid};
   });
   await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();
   await page.evaluate(()=>startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'expedition_party_save',persist:true}));
   await page.locator('#partySetupSaveButton').click();
   await page.waitForFunction(()=>tutorialCurrentStepId()==='expedition_home_open');
   await page.locator('#homeExpeditionPreview button').click();
   await page.locator('[data-tutorial-expedition-map="grassland"]').click();
   await page.locator('[data-tutorial-expedition-distance="short"]').click();
   await page.locator('[data-tutorial-expedition-member]').click();
   await page.locator('#tutorialNextButton').click();
   await page.locator('#expeditionStartButton').click();
   assert.equal(await page.evaluate(()=>save.expeditions.active.length),1);
   assert.equal(await page.evaluate(()=>save.expeditions.active[0].memberUids[0]),uids.f);
   await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();
   assert.equal(await page.evaluate(()=>save.expeditions.active.length),1);
   assert.deepEqual(await page.evaluate(()=>save.instances.map(x=>x.id)),['freiwolf','tienhairon','elna_water','galdra']);
   // Both spotlight and real click follow the same evolved Elna instance.
   await page.evaluate(()=>{clearTutorialUi();startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'growth_elna_details',persist:true})});
   await page.locator('#partyList [data-tutorial-elna-instance]').click();
   await page.waitForFunction(()=>tutorialCurrentStepId()==='growth_skill_open');
   const skillButton=page.locator('[data-tutorial-elna-instance] [data-tutorial-skill-edit]');
   await page.mouse.move(0,0);
   const beforeHover=await skillButton.boundingBox();await skillButton.hover();
   const afterHover=await skillButton.boundingBox();
   assert.ok(Math.abs(afterHover.x-beforeHover.x)<8,'skill button must not jump away on hover');
   await skillButton.click();
   await page.waitForFunction(()=>tutorialCurrentStepId()==='growth_return').catch(async error=>{console.error('Growth transition diagnostics',await page.evaluate(()=>({step:tutorialCurrentStepId(),screen:activeScreenId(),editingSkillUid,pending:tutorialUiState.advancePendingStepId,saved:currentTutorialState().stepId})),errors);throw error;});
   assert.equal(await page.evaluate(()=>editingSkillUid),uids.e);
   assert.deepEqual(errors,[]);
   console.log(`PASS profile ${slot}: 40 evolution combinations, skip idempotence, saved checkpoint/reload, real expedition buttons, evolved Elna guide clicks`);
   await context.close();
  }
 }finally{await browser?.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
