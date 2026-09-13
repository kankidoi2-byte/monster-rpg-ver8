const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const server=require('node:child_process').spawn(process.execPath,['scripts/dev-server.mjs'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','inherit']});
  let browser;
  try{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Preview startup timed out')),10000);
      server.stdout.once('data',()=>{clearTimeout(timer);resolve();});
      server.once('error',error=>{clearTimeout(timer);reject(error);});
      server.once('exit',code=>{clearTimeout(timer);reject(new Error(`Preview exited: ${code}`));});
    });
    browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});

    for(const [width,height] of [[360,640],[844,390]]){
      if(process.env.TUTORIAL_VIEWPORT_WIDTH&&width!==Number(process.env.TUTORIAL_VIEWPORT_WIDTH))continue;
      const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
      const page=await context.newPage();const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>{
        await page.locator('#contractorRankUpOverlay button').click();
      });
      const paint=async()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const at=async id=>{await page.waitForFunction(id=>tutorialCurrentStepId()===id,id);await paint();};
      const next=async()=>{await page.waitForTimeout(300);await page.locator('#tutorialNextButton').click();await paint();};
      const reload=async()=>{await page.reload({waitUntil:'networkidle'});if(await page.locator('#titleScreen').isVisible())await page.locator('#titleScreen').click();};
      await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
      await page.locator('#titleScreen').click();
      await at('intro_gnosis');
      await page.evaluate(()=>{
        setTutorialPlayerName('道中テスト');ensureTutorialStarterContracts();commitTutorialElnaContract();
        startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'stella_intro',persist:true});
      });
      await at('stella_intro');await next();
      assert.equal(await page.locator('#tutorialDialogueChoices button').count(),2);
      await page.evaluate(()=>tutorialNext());await at('stella_intro');
      await page.waitForTimeout(300);
      await page.getByRole('button',{name:width===360?'うん、いいよ':'しょうがないな',exact:true}).click();
      await at('stella_road_response');
      assert.equal(await page.evaluate(()=>currentTutorialState().stepId),'stella_road_response');
      await page.waitForTimeout(300);await page.locator('#tutorialBackButton').click();await at('stella_intro');
      await next();await page.waitForTimeout(300);
      await page.getByRole('button',{name:width===360?'うん、いいよ':'しょうがないな',exact:true}).click();
      await at('stella_road_response');await next();await next();
      assert.equal(await page.locator('.tutorial-story-backdrop').getAttribute('data-scene'),'capital');
      await reload();await at('stella_road_response');
      assert.equal(await page.locator('.tutorial-story-backdrop').getAttribute('data-scene'),'grassland');
      for(let i=1;i<10;i++){
        await next();
        if([4,5,6,8].includes(i))assert.equal(await page.locator('#tutorialTitle').textContent(),'？？？');
        if(i>=2)assert.equal(await page.locator('.tutorial-story-backdrop').getAttribute('data-scene'),'capital');
      }
      assert.equal(await page.evaluate(()=>currentTutorialState().stellaSkillCardGranted),false);
      await next();await at('stella_encounter');await next();await at('stella_card_receive');await next();
      await at('stella_skill_open');
      const inventory=await page.evaluate(()=>save.skillCards.skill_elna_middle_01);
      await reload();await at('stella_skill_open');
      assert.equal(await page.evaluate(()=>save.skillCards.skill_elna_middle_01),inventory);
      await page.locator('.tutorial-target-active').click();
      await page.waitForFunction(()=>['stella_skill_unequip','stella_skill_equip'].includes(tutorialCurrentStepId()));
      if(await page.evaluate(()=>tutorialCurrentStepId()==='stella_skill_unequip'))await page.locator('.tutorial-target-active').click();
      await at('stella_skill_equip');await page.locator('.tutorial-target-active').click();
      await at('stella_attribute_intro');
      assert.equal(await page.evaluate(()=>tutorialStellaSkillIsEquipped()),true);
      assert.equal(await page.locator('#tutorialTitle').textContent(),'グノーシス');
      await reload();await at('stella_attribute_intro');
      assert.equal(await page.evaluate(()=>tutorialStellaSkillIsEquipped()),true);
      await next();await at('stella_more_open');await page.locator('.tutorial-target-active').click();
      await at('stella_type_chart_open');await page.locator('.tutorial-target-active').click();
      await at('stella_type_basic');assert.equal(await page.locator('#tutorialTitle').textContent(),'グノーシス');
      assert.equal(errors.length,0,errors.join('\n'));
      console.log('PASS capital '+width+'x'+height+': choice, scenes/speakers, reloads, card grant, real equipment and attribute chart');
      await context.close();
    }
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
