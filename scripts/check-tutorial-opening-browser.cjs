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
      const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
      const page=await context.newPage();const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      const at=async id=>{await page.waitForFunction(id=>tutorialCurrentStepId()===id,id);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
      const next=async()=>{await page.waitForTimeout(300);await page.locator('#tutorialNextButton').click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
      await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
      await page.locator('#titleScreen').click();
      await at('intro_gnosis');
      for(let i=0;i<4;i++)await next();
      await at('gnosis_name');
      await page.evaluate(()=>tutorialNext());
      await at('gnosis_name');
      await page.locator('#tutorialPlayerNameInput').fill('検証者');
      await page.locator('#tutorialPlayerNameInput').press('Enter');
      await at('gnosis_contract_power');
      assert.ok((await page.locator('#tutorialText').textContent()).includes('検証者'));
      await next();await at('gnosis_descent');await next();
      await page.evaluate(()=>continuePrologueStory());
      await at('elna_encounter');
      assert.equal(await page.locator('#tutorialTitle').textContent(),'グノーシス');
      await next();
      assert.ok((await page.locator('#tutorialText').textContent()).includes('何か音'));
      await next();
      assert.equal(await page.locator('#tutorialTitle').textContent(),'エルナ');
      assert.equal(await page.locator('#tutorialStoryBackdrop').getAttribute('data-scene'),'grassland');
      await page.reload({waitUntil:'networkidle'});
      if(await page.locator('#titleScreen').isVisible())await page.locator('#titleScreen').click();
      await at('elna_encounter');
      assert.equal(await page.locator('#tutorialTitle').textContent(),'グノーシス','interruption restarts encounter pages');
      await next();await next();await next();
      await at('gnosis_rescue_alert');await next();await next();
      await at('starter_contracts_received');await next();
      await at('elna_guest_join');await next();
      assert.ok((await page.locator('#tutorialText').textContent()).includes('君とボク、それにあの子の3人'));
      await next();await at('rescue_world_map_open');
      await page.locator('[data-nav="battle"]').click();await at('rescue_world_map_grassland');
      await page.locator('[data-wm-place="grassland"].tutorial-target-active').click();await at('rescue_world_map_depart');
      await page.locator('[data-wm-depart].tutorial-target-active').click();await at('battle_enemy');
      assert.deepEqual(await page.evaluate(()=>partyBattle.map(v=>v.inst.id).sort()),['aquaron','elna_beginner','freigal']);
      assert.equal(await page.evaluate(()=>save.instances.some(v=>v.guest)),false);
      await next();await at('battle_actor_open');
      await page.locator('#battleSwitchButton').click();await at('battle_actor_select');
      await page.locator('[data-tutorial-actor-select]').first().click();await at('battle_target');
      await page.locator('#singleEnemyBox').click();await at('battle_attack_open');
      await page.waitForFunction(()=>!busy);
      await page.locator('#battleSkillButton').click();await at('battle_normal_attack');
      await page.locator('[data-tutorial-normal-attack]').click();await at('battle_skill');
      await page.waitForFunction(()=>!busy);
      await page.locator('#battleSkillButton').click();await at('battle_choose_skill');
      await page.locator('[data-tutorial-skill]').first().click();await at('battle_free');
      await page.waitForFunction(()=>!busy);
      await next();
      // Deterministically exhaust the party through the production defeat handler.
      await page.evaluate(()=>{partyBattle.forEach(v=>{v.hp=0;v.fainted=true;});losePartyBattle();});
      await at('elna_rescue_retry');
      await page.locator('#next').click();await at('elna_rescue_start');
      await next();await at('battle_enemy');
      assert.equal(await page.evaluate(()=>partyBattle.filter(v=>v.inst.guest).length),1);
      // Reload in battle must restart from the existing durable battle checkpoint.
      await page.reload({waitUntil:'networkidle'});
      if(await page.locator('#titleScreen').isVisible())await page.locator('#titleScreen').click();
      await at('elna_rescue_start');await next();await at('battle_enemy');
      // Resolve both waves using the production win path, with deterministic HP.
      await page.evaluate(()=>{eHp=0;win();});
      assert.equal(await page.evaluate(()=>tutorialBattleSession.enemyQueue.length),0);
      assert.equal(await page.evaluate(()=>tutorialBattleSession.active),true);
      await page.evaluate(()=>{eHp=0;win();});
      await at('elna_rescue_complete');
      assert.equal(await page.evaluate(()=>currentTutorialState().stepId),'elna_rescue_complete');
      const coins=await page.evaluate(()=>save.coins);
      await page.evaluate(()=>win());
      assert.equal(await page.evaluate(()=>save.coins),coins,'duplicate victory must not grant rewards');
      await next();
      assert.ok((await page.locator('#tutorialText').textContent()).includes('私の名前はエルナ'));
      const box=await page.locator('#tutorialBubble').boundingBox();
      assert.ok(box.x>=-1&&box.x+box.width<=width+1&&box.y>=-1&&box.y+box.height<=height+1,JSON.stringify(box));
      await page.reload({waitUntil:'networkidle'});
      if(await page.locator('#titleScreen').isVisible())await page.locator('#titleScreen').click();
      await at('elna_rescue_complete');
      await next();await next();await at('elna_contract_intro');
      assert.equal(await page.evaluate(()=>save.instances.filter(v=>['freigal','aquaron'].includes(v.id)).length),2);
      assert.equal(await page.evaluate(()=>save.instances.some(v=>v.guest)),false);
      await page.evaluate(()=>{pauseTutorial();show('home');});
      await page.locator('#homePartyEditButton').click();
      await page.waitForFunction(()=>activeScreenId()==='partySet');
      await page.evaluate(()=>show('home'));
      assert.equal(errors.length,0,errors.join('\n'));
      console.log('PASS opening/rescue '+width+'x'+height+': name, encounter reload, real map/actions, defeat/retry, battle reload, waves, victory/reload, no duplicates');
      await context.close();
    }
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
