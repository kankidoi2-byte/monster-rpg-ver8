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
        setTutorialPlayerName('対決テスト');ensureTutorialStarterContracts();commitTutorialElnaContract();
        startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'stella_mock_battle',persist:true});
      });
      await next();await at('stella_mock_enemy');
      assert.equal(await page.evaluate(()=>enemy.id),'stella_apprentice');
      assert.equal(await page.evaluate(()=>activeHuntRequest.enemyLevel),1);
      assert.equal(await page.evaluate(()=>activeHuntRequest.battleMode),'single');
      assert.equal(await page.evaluate(()=>partyBattle.some(v=>v.inst.guest)),false);
      const inventory=await page.evaluate(()=>JSON.stringify({coins:save.coins,items:save.items,instances:save.instances,skills:save.skillCards}));
      await reload();await at('stella_mock_battle');await next();await at('stella_mock_enemy');
      await next();await at('stella_mock_skill_open');
      await page.locator('#battleSkillButton').click();await at('stella_mock_advantage');
      await page.locator('[data-tutorial-normal-attack]').click();await at('stella_mock_free');
      await page.waitForFunction(()=>!busy);await next();
      await page.evaluate(()=>{partyBattle.forEach(v=>{v.hp=0;v.fainted=true;});losePartyBattle();});
      await at('stella_mock_retry');await page.locator('#next').click();await at('stella_mock_battle');
      await next();await at('stella_mock_enemy');await next();await at('stella_mock_skill_open');
      await page.locator('#battleSkillButton').click();await at('stella_mock_advantage');
      await page.locator('[data-tutorial-normal-attack]').click();await at('stella_mock_free');
      await page.waitForFunction(()=>!busy);await next();
      // Play to victory using only the always-available neutral normal attack.
      let turns=1;
      while(await page.evaluate(()=>tutorialBattleSession.active)){
        assert.ok(turns++<30,'level-one normal attacks must converge');
        await page.waitForFunction(()=>!busy||!tutorialBattleSession.active);
        if(!await page.evaluate(()=>tutorialBattleSession.active))break;
        await page.locator('#battleSkillButton').click();
        await page.locator('[data-tutorial-normal-attack]').click();
        await page.waitForFunction(()=>!busy||!tutorialBattleSession.active);
      }
      await at('stella_mock_victory');
      assert.equal(await page.evaluate(()=>currentTutorialState().stepId),'stella_mock_victory');
      assert.equal(await page.evaluate(()=>JSON.stringify({coins:save.coins,items:save.items,instances:save.instances,skills:save.skillCards})),inventory,'no battle rewards, contracts or persistent party damage');
      assert.equal(await page.evaluate(()=>handleTutorialBattleOutcome('victory')),false);
      await reload();await at('stella_mock_victory');
      await next();assert.equal(await page.evaluate(()=>currentTutorialState().stepId),'lumina_intro');
      await page.evaluate(()=>continuePrologueStory());await at('lumina_intro');
      assert.equal(errors.length,0,errors.join('\n'));
      console.log('PASS Stella '+width+'x'+height+': level-one person battle, interruption, normal attack, defeat/retry, natural victory in '+turns+' turns, no rewards, victory reload, next episode');
      await context.close();
    }
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
