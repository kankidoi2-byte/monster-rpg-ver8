import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';

// Intentional loopback-only fixtures: no production account, saves or network APIs.
const preview=spawn(process.execPath,['scripts/dev-server.mjs','--port','0'],{stdio:['ignore','pipe','inherit']});
let browser;
try {
  const [ready]=await Promise.race([once(preview.stdout,'data'),once(preview,'exit').then(([code])=>{throw Error(`preview exited before startup (${code})`);})]);
  const address=String(ready).match(/127\.0\.0\.1:\d+/)?.[0];
  assert(address,'preview starts');
  const origin='http://'+address;
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});

  async function isolated(viewport, run){
    const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'no-preference'});
    try {
      await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/?legacy=1');
      await page.locator('#titleScreen').tap();
      await page.locator('#titleScreen').waitFor({state:'detached'});
      await run(page);
      assert.deepEqual(errors,[],'no uncaught browser error');
    } finally {
      await context.close();
    }
  }

  for(const {viewport,target,source,tall} of [
    {viewport:{width:360,height:800},target:'aquaron',source:'stella_sorcerer',tall:true},
    {viewport:{width:412,height:915},target:'elna_beginner',source:'stella_sorcerer',tall:false},
    {viewport:{width:412,height:915},target:'elna_beginner',source:'aquaron',tall:false}
  ]){
    await isolated(viewport,async page=>{
      const fixture=await page.evaluate(({target,source,tall})=>{
        clearTutorialUi();save=initSave();
        save.progress.tutorial=tutorialSaveDefaults({legacy:true});
        Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);
        save.contractor.exp=CONTRACTOR_MAX_EXP;save.contractor.pendingRankUps=[];
        save.instances=[];save.party=[];
        for(const id of [target,source])save.party.push(addInstance(id,12).uid);
        scheduleContractorRankUpPresentation();
        if(!saveGame())throw Error('could not save test fixture');
        // Keep the real rendering route while exercising it with the game's
        // tall Stella art, in this disposable page only.
        if(tall)IMG[source]='images/monsters/stella_sorcerer_fullbody_20261121.webp';
        endPartyRecovery();prepareBattleParty();
        const map=MAPS.find(m=>m.id==='grassland'),foe=by('grassbeat');
        const request=createHuntRequest(map,foe,'normal',[],{allowOvertier:false});
        request.battleMode='single';activeHuntRequest=request;
        beginChosenBattle(map.id,foe.id,'normal',request);
        return {target:save.party[0],source:save.party[1],targetName:by(target).name,sourceName:by(source).name};
      },{target,source,tall});
      await page.locator('#battle.active #renewalParty .br-member').first().waitFor();
      const before=await page.evaluate(()=>({turns:battleTurnCount,profile:JSON.stringify(save),uid:activeInstance.uid}));
      assert.equal(before.uid,fixture.target);
      const linkButton=page.locator('#kokoroLinkButton');
      assert(await linkButton.isEnabled(),'a character on either end must not disable the normal link button');
      await linkButton.tap();
      const donor=page.locator(`#kokoroLinkPanel .kokoro-link-source[data-uid="${fixture.source}"]`);
      assert(await donor.isEnabled(),'the owned reserve is listed and selectable');
      assert((await donor.innerText()).includes(fixture.sourceName));
      await donor.tap();
      await page.locator('#renewalSheet').getByRole('button',{name:'リンクする',exact:true}).tap();
      const animation=page.locator('#renewalLinkFx'),image=animation.locator('img');
      await animation.waitFor();
      assert.equal(await page.evaluate(()=>!!kokoroLinkEffectForInstance(activeInstance)),false,'the effect waits for the normal animation');
      assert((await animation.innerText()).includes(fixture.targetName));
      assert.equal(await image.getAttribute('alt'),fixture.sourceName);
      const bounds=await image.evaluate(async img=>{
        await img.decode();
        const b=img.getBoundingClientRect(), f=img.closest('#renewalLinkFx').getBoundingClientRect(), a=img.closest('.battle-arena').getBoundingClientRect();
        const inside=(x,y)=>x.left>=y.left-1&&x.top>=y.top-1&&x.right<=y.right+1&&x.bottom<=y.bottom+1;
        return {fits:inside(b,f)&&inside(b,a)&&b.left>=-1&&b.right<=innerWidth+1,
          width:img.naturalWidth,height:img.naturalHeight,fit:getComputedStyle(img).objectFit};
      });
      assert(bounds.fits&&bounds.width>0,'the decoded reserve art fits its animation stage and the phone width');
      assert.equal(bounds.fit,'contain');
      if(tall)assert(bounds.height>bounds.width,'exercise a real tall standing portrait');
      await page.waitForFunction(()=>!!kokoroLinkEffectForInstance(activeInstance));
      assert.deepEqual(await page.evaluate(()=>{
        const link=kokoroLinkEffectForInstance(activeInstance);
        return [link.sourceName,link.targetName,battleTurnCount,JSON.stringify(save),kokoroLinkBattleState.usedSourceUids.size];
      }),[fixture.sourceName,fixture.targetName,before.turns,before.profile,1]);
      await animation.waitFor({state:'detached'});
      assert.match(await linkButton.innerText(),/発動中/);
      await linkButton.tap(); // The button remains usable to inspect the active link.
      assert(await donor.isDisabled(),'the used reserve cannot be selected again');
      assert.match(await page.locator('#kokoroLinkPanel .kokoro-link-empty').innerText(),/リンクは発動済み/);
      console.log(`PASS ${viewport.width}×${viewport.height}: ${source} → ${target}, real activation, contained art, no turn or save mutation`);
    });
  }

  await isolated({width:412,height:915},async page=>{
    const before=await page.evaluate(()=>{
      clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
      save.contractor.exp=CONTRACTOR_MAX_EXP;save.contractor.pendingRankUps=[];
      save.instances=[];save.party=[addInstance('elna_beginner',12).uid];
      for(const episode of prologuePart2Episodes()){
        if(episode.id==='pb_14')break;
        save.prologuePart2.episodes[episode.id]={...prologuePart2DefaultEpisode(),completed:true,rewardClaimed:true};
      }
      save.prologuePart2.episodes.pb_14={...prologuePart2DefaultEpisode(),cursor:'pb_14_link_practice'};
      scheduleContractorRankUpPresentation();
      if(!saveGame()||!openProloguePart2('pb_14'))throw Error('chapter 14 practice fixture failed');
      return JSON.stringify([save.instances,save.party,save.coins,save.items]);
    });
    const practice=page.getByRole('region',{name:'ココロリンクの練習'});
    await practice.waitFor();
    assert.match(await practice.innerText(),/生存している控えの仲間から力を借ります/);
    assert.match(await practice.innerText(),/ガルドラ（貸与）/);
    assert.match(await practice.innerText(),/アクアロン（貸与）/);
    await practice.getByRole('button',{name:'アクアロンを選ぶ',exact:true}).tap();
    await practice.getByRole('button',{name:'リンクする',exact:true}).tap();
    assert.match(await practice.getByRole('status').innerText(),/ココロリンク発動/);
    await practice.getByRole('button',{name:'もう一度練習する',exact:true}).tap();
    assert(await practice.getByRole('button',{name:'アクアロンを選ぶ',exact:true}).isEnabled());
    await practice.getByRole('button',{name:'アクアロンを選ぶ',exact:true}).tap();
    await practice.getByRole('button',{name:'リンクする',exact:true}).tap();
    await practice.getByRole('button',{name:'練習を終える',exact:true}).tap();
    await practice.waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>save.prologuePart2.trainingSeen.pb14),true);
    assert.equal(await page.evaluate(()=>JSON.stringify([save.instances,save.party,save.coins,save.items])),before,"practice cannot alter the player's owned party or inventory");
    console.log('PASS chapter 14: original loans, activate/reset/finish; owned party and inventory unchanged');
  });
} finally {
  await browser?.close();
  preview.kill();
}
