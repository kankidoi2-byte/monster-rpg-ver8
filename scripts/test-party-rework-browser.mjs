import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';

// Every context starts at loopback with its own deliberately seeded test save.
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','0'],{stdio:['ignore','pipe','inherit']});
let browser;
try {
  const [ready]=await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([code])=>{throw Error(`preview exited before startup (${code})`);})]);
  const port=Number(String(ready).match(/127\.0\.0\.1:(\d+)/)?.[1]);
  assert(port,'isolated preview started');
  const url=`http://127.0.0.1:${port}/?legacy=1`;
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  for(const viewport of [{width:360,height:800},{width:412,height:915}]){
    const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
    const page=await context.newPage(), errors=[];
    page.setDefaultTimeout(10000);
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(url).origin?route.continue():route.abort());
    const boot=async()=>{
      await page.goto(url);
      await page.locator('#titleScreen').tap();
      await page.locator('#titleScreen').tap();
      await page.locator('#titleScreen').waitFor({state:'detached'});
    };
    await boot();
    const ids=await page.evaluate(()=>{
      clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
      Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);
      // Use a valid max-rank sandbox save: registering candidates and maps
      // still runs production code, but cannot queue an unrelated rank modal.
      save.contractor.exp=CONTRACTOR_MAX_EXP;save.contractor.pendingRankUps=[];
      save.instances=[];save.party=[];
      const a=addInstance('freigal',15), b=addInstance('aquaron',10), e=addInstance('elna_beginner',21);
      for(let i=0;i<103;i++)addInstance(i%2?'grassbeat':'volteck',1+i%6);
      save.party=[a.uid,b.uid];
      if(save.contractor.pendingRankUps.length)throw Error('test fixture unexpectedly queued a rank-up');
      scheduleContractorRankUpPresentation(); // Clear any timer from the pre-fixture title bootstrap.
      if(!saveGame())throw Error('independent fixture could not be saved');
      show('partySet');
      return {a:a.uid,b:b.uid,e:e.uid};
    });
    const slot=i=>page.locator(`[data-party-slot="${i}"]`);
    const saveButton=page.locator('#partySetupSaveButton');
    const party=()=>page.evaluate(()=>save.party.slice());
    const mapEdit=page.locator('[data-wm-party-edit]');
    const mapReturn=page.locator('#partyWorldMapReturn');
    const filter=kind=>page.locator(`[data-party-filter="${kind}"]`);
    const candidate=uid=>page.locator(`[data-party-uid="${uid}"]`);
    const renderedCandidates=()=>page.locator('#partySelectList [data-party-uid]').count();
    assert.equal(await page.locator('[data-party-slot]').count(),3);
    assert.equal(await page.locator('[data-party-preset]').count(),3);
    await slot(0).tap();await slot(2).tap();
    await saveButton.tap();
    await page.locator('#home.active').waitFor();
    assert.deepEqual(await party(),[ids.b,ids.a], 'moving the lead to the empty third slot packs the result left');
    await boot();
    await page.waitForFunction(()=>Array.isArray(save.party)&&save.party.length===2);
    assert.deepEqual(await party(),[ids.b,ids.a],'the ordered compact party survives reloading the same test save');

    // Enter through the real game hub, select a map and start a real encounter.
    await page.locator('#home .home-battle-button').tap();
    await page.locator('#battleChoices.active').waitFor();
    await page.locator('[data-wm-list]').tap();
    await page.locator('.wm-sheet [data-wm-place="grassland"]').tap();
    await page.locator('[data-wm-depart]').tap();
    await page.locator('#battle.active').waitFor();
    assert.equal(await page.evaluate(()=>activeInstance?.uid),ids.b,'the first active combatant is the new leader');
    console.log(`PASS ${viewport.width}×${viewport.height}: move 0→2 left-packs, reload keeps order, actual battle leads with B`);

    await page.evaluate(()=>{
      show('home');closeProloguePart2Battle();clearTutorialUi();
      save.worldMap.active.crisis={mapId:'starsea',monsterId:'doom_nemesion'};
      openBattleHub();
      if(!showWorldMapLocation('starsea','crisis'))throw Error('starsea crisis fixture unavailable');
    });
    // The crisis forces a ★5 opponent, so only the Extreme option exists.
    const difficultyButtons=page.locator('#battleChoices.active [data-wm-difficulty]');
    assert.deepEqual(await difficultyButtons.evaluateAll(buttons=>buttons.map(button=>button.dataset.wmDifficulty)),['extreme']);
    await difficultyButtons.tap();
    const assertMap=async()=>{
      await page.locator('#battleChoices.active [data-wm-difficulty="extreme"][aria-pressed="true"]').waitFor();
      assert.deepEqual(await page.evaluate(()=>[worldMapSelectedId,worldMapSelectedEvent,worldMapSelectedDifficulty]),['starsea','crisis','extreme']);
      assert.deepEqual(await page.evaluate(()=>{
        const {mapId,eventKey,difficultyId}=save.worldMap.navigation;
        return [mapId,eventKey,difficultyId];
      }),['starsea','crisis','extreme'],'return keeps persisted map navigation');
      assert.equal(await page.evaluate(()=>Boolean(save.worldMap.active.crisis)),true);
    };
    await assertMap();
    await mapEdit.tap();
    await page.locator('#partySet.active').waitFor();
    await mapReturn.tap();await assertMap();
    await mapEdit.tap();await saveButton.tap();await assertMap();
    assert.deepEqual(await party(),[ids.b,ids.a]);
    console.log(`PASS ${viewport.width}×${viewport.height}: map cancel and save return to starsea/crisis/extreme without consuming the event`);

    await page.evaluate(()=>show('partySet'));
    const count=await renderedCandidates();
    assert.equal(count,106,'all candidates render for the 106-instance save');
    assert(await candidate(ids.e).count(),'the unassigned Elna can be found in the candidate list');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'large roster does not create horizontal overflow');
    assert(await page.locator('#partySort').isVisible(),'large roster sort remains reachable');
    await filter('duplicates').tap();
    assert.equal(await renderedCandidates(),103);
    assert.equal(await candidate(ids.e).count(),0);
    await filter('character').tap();
    assert.equal(await renderedCandidates(),1);
    assert.equal(await candidate(ids.e).count(),1);
    await filter('all').tap();
    await page.locator('#partySort').selectOption('level');
    assert.equal(await page.locator('#partySelectList [data-party-uid]').first().getAttribute('data-party-uid'),ids.e);
    await page.locator('#partyType').selectOption(await page.evaluate(()=>by('aquaron').types[0]));
    assert(await candidate(ids.b).count());
    assert((await renderedCandidates())<count);
    await page.locator('#partyType').selectOption('');
    assert.equal(await renderedCandidates(),count,'clearing the attribute restores all candidates');
    assert.equal(await filter('all').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#partySort').inputValue(),'level');
    await boot();
    await page.evaluate(()=>show('partySet'));
    assert.equal(await page.locator('#partyType').inputValue(),'');
    assert.equal(await renderedCandidates(),count,'cleared attribute preference survives reload');
    assert.equal(await page.locator('#partySort').inputValue(),'level');

    const register=page.getByRole('button',{name:'今の編成を登録',exact:true});
    const preset=page.locator('[data-party-preset="0"]');
    const dialog=page.locator('#partyPresetDialog');
    const stored=()=>page.evaluate(()=>save.partyPresets[0].uids.slice());
    await register.tap();
    assert.deepEqual(await stored(),[ids.b,ids.a]);
    await candidate(ids.e).tap();
    assert.deepEqual(await party(),[ids.b,ids.a,ids.e]);
    await register.tap();await dialog.waitFor();
    await dialog.getByRole('button',{name:'キャンセル',exact:true}).tap();
    assert.deepEqual(await stored(),[ids.b,ids.a],'canceling overwrite preserves the snapshot');
    await preset.tap();
    assert.deepEqual(await party(),[ids.b,ids.a],'preset applies its stored order');
    await page.getByRole('button',{name:'選んだ編成の名前を変更'}).tap();
    await dialog.locator('[name="partyPresetName"]').fill('最初の編成');
    await dialog.getByRole('button',{name:'変更',exact:true}).tap();
    assert.match(await preset.innerText(),/最初の編成/);
    await candidate(ids.e).tap();
    await register.tap();
    await dialog.getByRole('button',{name:'上書きする',exact:true}).tap();
    assert.deepEqual(await stored(),[ids.b,ids.a,ids.e]);
    console.log(`PASS ${viewport.width}×${viewport.height}: 106 candidates without horizontal overflow; filters/sort and preset register/cancel/apply/rename/overwrite work`);

    const guided=await page.evaluate(()=>{
      clearTutorialUi();
      // The prior preset checks leave this screen active. Start from Home so
      // tutorial entry opens and renders the editor for the newly seeded save.
      show('home');
      save=initSave();
      save.contractor.exp=CONTRACTOR_MAX_EXP;save.contractor.pendingRankUps=[];
      ensureTutorialStarterContracts();commitTutorialElnaContract();
      const f=tutorialOwnedStarterInstance('freigal'),a=tutorialOwnedStarterInstance('aquaron'),e=tutorialElnaContractInstance();
      const g=addInstance('galdra',1);save.party=[f.uid,a.uid,e.uid];
      save.progress.tutorial.alchemyLessonCompleted=true;save.progress.tutorial.alchemyLessonPrepared=true;
      setTutorialStep('expedition_party_save');
      if(save.contractor.pendingRankUps.length)throw Error('test fixture unexpectedly queued a rank-up');
      scheduleContractorRankUpPresentation(); // Clear any timer from the pre-fixture title bootstrap.
      if(!saveGame())throw Error('guide fixture could not be saved');
      if(!startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'expedition_party_save',persist:true}))throw Error('guide fixture failed to enter the party step');
      return {f:f.uid,a:a.uid,e:e.uid,g:g.uid};
    });
    await page.locator('#partySet.active').waitFor();
    await page.waitForFunction(uid=>tutorialCurrentStepId()==='expedition_party_save'&&tutorialUiState.target?.dataset.partyUid===uid,guided.f);
    assert.deepEqual(await page.evaluate(()=>[save.progress.tutorial.status,save.progress.tutorial.completed,save.progress.tutorial.skipped]),['in_progress',false,false]);
    assert.equal(await page.locator('#partyPresets').isVisible(),false);
    await candidate(guided.f).tap();
    await page.waitForFunction(uid=>tutorialUiState.target?.dataset.partyUid===uid,guided.g);
    await candidate(guided.g).tap();
    await page.waitForFunction(()=>tutorialUiState.target?.id==='partySetupSaveButton');
    assert.deepEqual(await party(),[guided.a,guided.e,guided.g]);
    await saveButton.tap();
    await page.waitForFunction(()=>tutorialCurrentStepId()==='expedition_home_open');
    await page.locator('#home.active').waitFor();
    assert.deepEqual(await party(),[guided.a,guided.e,guided.g]);
    console.log(`PASS ${viewport.width}×${viewport.height}: tutorial hides presets; remove, add, confirm advances to expedition guide`);
    assert.deepEqual(errors,[]);
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
