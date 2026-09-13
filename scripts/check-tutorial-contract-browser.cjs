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
      // Prepare a real rescue checkpoint; combat resolution is deterministic.
      await page.evaluate(()=>{
        setTutorialPlayerName('契約テスト');
        ensureTutorialStarterContracts();
        startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'elna_rescue_start',persist:true});
      });
      await next();await at('battle_enemy');
      await page.evaluate(()=>{eHp=0;win();eHp=0;win();});
      await at('elna_rescue_complete');await next();await next();await at('elna_contract_intro');
      await next();await at('elna_contract_consent');
      assert.equal(await page.locator('#tutorialTitle').textContent(),'エルナ');
      assert.equal(await page.locator('#tutorialText').textContent(),'契約？');
      await next();assert.equal(await page.locator('#tutorialTitle').textContent(),'グノーシス');
      assert.equal(await page.evaluate(()=>save.instances.some(v=>v.id==='elna_beginner')),false,'explanation cannot grant a body');
      await reload();await at('elna_contract_consent');
      assert.equal(await page.locator('#tutorialText').textContent(),'契約？');
      await next();await next();await at('elna_contract_execute');
      assert.equal(await page.locator('#tutorialTitle').textContent(),'エルナ');
      assert.ok((await page.locator('#tutorialText').textContent()).includes('その契約っていうの、してあげる！'));
      assert.equal(await page.evaluate(()=>currentTutorialState().elnaContractGranted),false);
      await page.waitForTimeout(300);
      await page.locator('#tutorialNextButton').click();
      await page.waitForFunction(()=>currentTutorialState().elnaContractGranted);
      assert.equal(await page.evaluate(()=>confirmTutorialElnaContract()),false,'duplicate contract input is blocked during animation');
      assert.equal(await page.evaluate(()=>currentTutorialState().stepId),'elna_contract_departure');
      if(width===360)await reload(); // Reload after durable grant, before animation ends.
      await at('elna_contract_departure');
      assert.equal(await page.evaluate(()=>save.instances.filter(v=>v.id==='elna_beginner').length),1);
      assert.equal(await page.evaluate(()=>currentTutorialState().elnaGuestActive),false);
      assert.deepEqual(await page.evaluate(()=>getPartyInstances().map(v=>v.id)),['freigal','aquaron','elna_beginner']);
      for(const speaker of ['グノーシス','エルナ','グノーシス','グノーシス']){
        await next();assert.equal(await page.locator('#tutorialTitle').textContent(),speaker);
      }
      await next();await at('elna_contract_body');await next();
      await page.evaluate(()=>continuePrologueStory());await at('home_party');
      const operations=[
        ['home_party','party_save'],['party_save','home_dex_open'],
        ['home_dex_open','menu_dex_open'],['menu_dex_open','dex_character_open'],
        ['dex_character_open','dex_elna_open'],['dex_elna_open','dex_character_back'],
        ['dex_character_back','dex_monster_open'],['dex_monster_open','dex_freigal'],
        ['dex_freigal','home_growth_open','next'],['home_growth_open','growth_tab_open'],
        ['growth_tab_open','home_growth_overview'],['home_growth_overview','growth_elna_details'],
        ['growth_elna_details','growth_skill_open'],['growth_skill_open','growth_return'],
        ['growth_return','growth_evolution'],['growth_evolution','home_requests','next'],
        ['home_requests','request_accept'],['request_accept','request_reward_claim']
      ];
      for(const [before,after,mode] of operations){
        await at(before);
        if(mode==='next')await next();else {
          try{await page.locator('.tutorial-target-active').click({timeout:10000});}
          catch(error){console.error({step:before,target:await page.locator('.tutorial-target-active').boundingBox(),bubble:await page.locator('#tutorialBubble').boundingBox()});throw error;}
        }
        await at(after);
      }
      const before=await page.evaluate(()=>({coins:save.coins,items:{...save.items}}));
      await page.locator('#tutorialRequestClaimButton').click();await at('request_reward_received');
      for(const id of ['monster_bone','magic_crystal','unstable_alchemy_matter','raptor_feather']){
        assert.equal(await page.evaluate(id=>save.items[id],id),(before.items[id]||0)+1);
      }
      assert.equal(await page.evaluate(()=>save.coins),before.coins+250);
      await page.evaluate(()=>commitTutorialAlchemySupplyReward());
      assert.equal(await page.evaluate(()=>save.coins),before.coins+250,'repeat claim must not add coins');
      await reload();
      assert.equal(await page.evaluate(()=>currentTutorialState().alchemySuppliesGranted),true);
      assert.equal(await page.evaluate(()=>save.instances.filter(v=>v.id==='elna_beginner').length),1);
      assert.equal(await page.evaluate(()=>save.coins),before.coins+250);
      assert.deepEqual(await page.evaluate(()=>getPartyInstances().map(v=>v.id)),['freigal','aquaron','elna_beginner']);
      assert.equal(errors.length,0,errors.join('\n'));
      console.log('PASS contract/reward '+width+'x'+height+': consent ordering/reload, real animation or interrupted animation, single body, party/dex/growth/report actions, reward/reload, no duplicates');
      await context.close();
    }
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
