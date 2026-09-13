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
        setTutorialPlayerName('追跡テスト');ensureTutorialStarterContracts();commitTutorialElnaContract();
        commitTutorialAlchemySupplyReward();
        startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'lumina_intro',persist:true});
      });
      const inventory=await page.evaluate(()=>JSON.stringify({coins:save.coins,items:save.items,instances:save.instances,skills:save.skillCards}));
      for(let i=0;i<4;i++){assert.equal(await page.locator('#tutorialStoryBackdrop').getAttribute('data-scene'),'capital');await next();}
      await at('lumina_world_map_open');await page.locator('.tutorial-target-active').click();
      await at('lumina_world_map_academy');await page.locator('.tutorial-target-active').click();
      await at('lumina_academy_arrival');
      assert.equal(await page.locator('#tutorialStoryBackdrop').getAttribute('data-scene'),'academy');
      await reload();await at('lumina_academy_arrival');
      await next();await at('lumina_world_map_visit');await page.locator('.tutorial-target-active').click();
      await at('lumina_encounter');
      for(let i=0;i<4;i++)await next();
      assert.equal(await page.locator('#tutorialTitle').textContent(),'ステラ・ルミナ');
      assert.equal(await page.locator('#tutorialCharacterPortrait').isVisible(),false);
      await reload();await at('lumina_encounter');
      assert.equal(await page.locator('#tutorialTitle').textContent(),'ステラ');
      const speakers=await page.evaluate(()=>tutorialUiState.steps[tutorialUiState.index].dialogue.map(p=>p.speaker));
      for(let i=0;i<speakers.length;i++){
        assert.equal(await page.locator('#tutorialTitle').textContent(),speakers[i]);
        assert.equal(await page.locator('#tutorialStoryBackdrop').getAttribute('data-scene'),'workshop');
        assert.equal(await page.evaluate(()=>currentTutorialState().alchemyLessonPrepared),false,'no early alchemy setup');
        if(i<speakers.length-1)await next();
      }
      assert.equal(await page.evaluate(()=>JSON.stringify({coins:save.coins,items:save.items,instances:save.instances,skills:save.skillCards})),inventory,'conversation cannot consume or grant assets');
      await page.screenshot({path:'/tmp/tutorial-workshop-'+width+'.png'});
      await next();await at('lumina_alchemy');
      assert.equal(await page.evaluate(()=>currentTutorialState().alchemyLessonPrepared),false);
      await next();await at('lumina_materials');
      assert.equal(await page.evaluate(()=>currentTutorialState().alchemyLessonPrepared),true);
      assert.equal(await page.evaluate(()=>JSON.stringify({coins:save.coins,items:save.items,instances:save.instances,skills:save.skillCards})),inventory);
      const beforeAlchemy=await page.evaluate(()=>({
        coins:save.coins,items:{...save.items},uids:save.instances.map(v=>v.uid),
        contractIds:save.instances.filter(v=>['freigal','aquaron','elna_beginner'].includes(v.id)).map(v=>v.id).sort()
      }));
      assert.equal(await page.locator('#tutorialTitle').textContent(),'グノーシス');
      await next();await at('lumina_start');await page.locator('.tutorial-target-active').click();
      await at('lumina_confirm');
      assert.equal(await page.locator('#tutorialTitle').textContent(),'グノーシス');
      assert.ok((await page.locator('#alchemyConfirmContent').textContent()).includes('仲間の消費なし'));
      await next();await at('lumina_execute');await page.locator('.tutorial-target-active').click();
      await at('lumina_wait');
      assert.equal(await page.locator('#tutorialTitle').textContent(),'ルミナ');
      assert.ok((await page.locator('#tutorialText').textContent()).includes('お願い、うまくいって'));
      await at('lumina_alchemy_result');
      assert.equal(await page.evaluate(()=>currentTutorialState().alchemyLessonCompleted),true);
      await page.emulateMedia({reducedMotion:'no-preference'});
      assert.equal(await page.evaluate(()=>save.instances.filter(v=>v.id==='galdra').length),1);
      assert.equal(await page.evaluate(()=>save.coins),beforeAlchemy.coins-250);
      for(const id of ['monster_bone','magic_crystal','unstable_alchemy_matter','raptor_feather']){
        assert.equal(await page.evaluate(id=>save.items[id],id),beforeAlchemy.items[id]-1);
      }
      assert.deepEqual(await page.evaluate(()=>save.instances.filter(v=>['freigal','aquaron','elna_beginner'].includes(v.id)).map(v=>v.id).sort()),beforeAlchemy.contractIds);
      assert.equal(await page.evaluate(uids=>uids.every(uid=>save.instances.some(v=>v.uid===uid)),beforeAlchemy.uids),true);
      await next();
      assert.ok((await page.locator('#tutorialCharacterPortrait').getAttribute('src')).includes('galdra_story_v1.webp'));
      assert.equal(await page.locator('#tutorialStoryEffectLayer').isVisible(),false);
      await next();await next();await next();
      assert.equal(await page.locator('#tutorialStoryEffectLayer').getAttribute('data-motion'),'fly');
      assert.ok((await page.locator('#tutorialStoryEffect').getAttribute('src')).includes('galdra_story_v1.webp'));
      assert.notEqual(await page.locator('#tutorialStoryEffect').evaluate(node=>getComputedStyle(node).animationName),'none');
      await page.waitForFunction(()=>document.getElementById('tutorialStoryEffect')?.naturalWidth>0);
      await page.waitForTimeout(1100);
      const flyRect=await page.locator('#tutorialStoryEffect').boundingBox();
      assert.ok(flyRect&&flyRect.x+flyRect.width>0&&flyRect.x<width&&flyRect.y+flyRect.height>0&&flyRect.y<height,'flying Galdra remains visible in the viewport');
      await page.screenshot({path:'/tmp/tutorial-galdra-fly-'+width+'.png'});
      await reload();await at('lumina_alchemy_result');
      assert.equal(await page.locator('#tutorialTitle').textContent(),'ルミナ','result reload restarts the successful conversation');
      assert.equal(await page.evaluate(()=>save.instances.filter(v=>v.id==='galdra').length),1);
      assert.equal(await page.evaluate(()=>commitTutorialLuminaAlchemySuccess()),false,'completion cannot be committed twice');
      for(let i=0;i<7;i++)await next();
      await at('lumina_farewell');
      for(const speaker of ['ルミナ','ステラ','ルミナ']){
        assert.equal(await page.locator('#tutorialTitle').textContent(),speaker);
        if(speaker!=='ルミナ'||(await page.locator('#tutorialText').textContent()).startsWith('錬成'))await next();
        else await next();
      }
      assert.equal(await page.evaluate(()=>currentTutorialState().stepId),'expedition_intro');
      await page.evaluate(()=>startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'expedition_intro',persist:true}));
      await at('expedition_intro');await next();await next();
      assert.equal(await page.locator('#tutorialStoryEffectLayer').getAttribute('data-motion'),'bite');
      assert.notEqual(await page.locator('#tutorialStoryEffect').evaluate(node=>getComputedStyle(node).animationName),'none');
      await page.waitForFunction(()=>document.getElementById('tutorialStoryEffect')?.naturalWidth>0);
      await page.waitForTimeout(1100);
      const biteRect=await page.locator('#tutorialStoryEffect').boundingBox();
      assert.ok(biteRect&&biteRect.x+biteRect.width>0&&biteRect.x<width&&biteRect.y+biteRect.height>0&&biteRect.y<height,'biting Galdra remains visible in the viewport');
      await page.screenshot({path:'/tmp/tutorial-galdra-bite-'+width+'.png'});
      assert.equal(await page.evaluate(()=>save.instances.filter(v=>v.id==='galdra').length),1);

      const answerButtons=page.locator('#tutorialDialogueChoices button');
      assert.deepEqual(await answerButtons.allTextContents(),['うん','もちろん']);
      await answerButtons.first().click();
      await at('expedition_party_plan');
      assert.ok((await page.locator('#tutorialText').textContent()).includes('今回はフレイガルに遠征を頼む'));
      await next();await at('expedition_party_open');await page.locator('.tutorial-target-active').click();
      await at('expedition_party_save');
      await page.locator('#partySelectList [data-monster-id="freigal"]').scrollIntoViewIfNeeded();
      await page.locator('#partySelectList [data-monster-id="freigal"]').click();
      await page.locator('#partySelectList [data-monster-id="galdra"]').scrollIntoViewIfNeeded();
      await page.locator('#partySelectList [data-monster-id="galdra"]').click();
      assert.deepEqual(await page.evaluate(()=>getPartyInstances().map(instance=>instance.id)),['aquaron','elna_beginner','galdra']);
      await page.locator('#partySetupSaveButton').scrollIntoViewIfNeeded();
      await page.locator('#partySetupSaveButton').click();
      await at('expedition_home_open');
      assert.equal(await page.evaluate(()=>tutorialExpeditionPartyReady()),true);
      await reload();await at('expedition_home_open');
      assert.deepEqual((await page.evaluate(()=>getPartyInstances().map(instance=>instance.id))).sort(),['aquaron','elna_beginner','galdra']);
      await page.locator('.tutorial-target-active').click();
      await at('expedition_destination');await page.locator('.tutorial-target-active').click();
      await at('expedition_distance');await page.locator('.tutorial-target-active').click();
      await at('expedition_member');
      assert.ok((await page.locator('.tutorial-target-active').textContent()).includes('フレイガル'));
      await page.locator('.tutorial-target-active').click();
      await at('expedition_suitability');await next();
      await at('expedition_dispatch');await page.locator('.tutorial-target-active').click();
      await at('expedition_active');
      const dispatched=await page.evaluate(()=>save.expeditions.active.find(entry=>entry.tutorialPrologue));
      assert.equal(dispatched.mapId,'grassland');assert.equal(dispatched.distanceId,'short');
      assert.deepEqual(await page.evaluate(entry=>entry.memberUids.map(uid=>getInstance(uid)?.id),dispatched),['freigal']);
      assert.deepEqual((await page.evaluate(()=>getPartyInstances().map(instance=>instance.id))).sort(),['aquaron','elna_beginner','galdra']);
      assert.equal(dispatched.status,'active');assert.equal(dispatched.progress,0);
      await reload();await at('expedition_active');
      assert.equal(await page.evaluate(()=>save.expeditions.active.some(entry=>entry.tutorialPrologue&&entry.status==='active')),true);
      await next();await at('prologue_epilogue');
      assert.equal(await page.locator('#tutorialTitle').textContent(),'グノーシス');
      await next();await at('prologue_complete');
      assert.ok((await page.locator('#tutorialText').textContent()).includes('次はどこに行く'));
      await next();
      await page.waitForFunction(()=>currentTutorialState().status==='completed');
      assert.equal(await page.evaluate(()=>save.progress.storyFlags.prologueCompleted),true);
      assert.equal(await page.evaluate(()=>save.expeditions.active.some(entry=>entry.tutorialPrologue&&entry.status==='active'&&entry.progress===0)),true,'completion must not wait for expedition return');
      assert.equal(errors.length,0,errors.join('\n'));
      console.log('PASS first alchemy and expedition '+width+'x'+height+': exact Galdra party, Freigal short expedition, saved reload, no-wait prologue completion');
      await context.close();
    }
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
