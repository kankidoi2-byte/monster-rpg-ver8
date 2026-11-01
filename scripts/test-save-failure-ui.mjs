// Real Chromium, disposable synthetic saves, and no requests outside the tested app.
// Every operation uses its rendered button, not a replacement DOM or save function.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const origin=(process.env.GAME_TEST_URL||'http://127.0.0.1:4203').replace(/\/$/,'');
const output=process.env.SAVE_FAILURE_UI_OUT||'artifacts/save-failure-ui';
const titleId='rank_20_contract_master';
const cases=['reward-single','reward-all','title-equip','title-unequip','rank-up-close','lock','unlock','party-add','party-remove','golden-map'];
const report={cases:[],errors:[],limitations:['Chromium mobile emulation, not a physical Android/Galaxy/Chromebook.','Synthetic profiles only; no public player data or gameplay values are changed.']};
fs.mkdirSync(output,{recursive:true});
const server=process.env.GAME_TEST_URL?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4203'],{stdio:['ignore','pipe','inherit']});
let browser,activePage;

// Startup legitimately refreshes save timestamps/hash. All other fields, including
// contractor event IDs, pending notices, inventory, UIDs and profile data, must agree.
function durable(raw){
  const result=typeof raw==='string'?JSON.parse(raw):structuredClone(raw);
  delete result.saveMeta.lastSavedAt;
  delete result.saveMeta.integrityHash;
  return result;
}

async function startPage(page){
  await page.locator('#titleScreen').click();
  await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>clearTutorialUi());
}

async function openSurface(page,kind){
  return page.evaluate(({kind,titleId})=>{
    clearTutorialUi();
    clearTimeout(contractorRankUpTimer);
    const unit=save.instances.find(instance=>instance.id==='freigal');
    let screen,selector,surfaces;
    if(kind.startsWith('reward-')){
      screen='contractorRankRewards';
      selector=kind==='reward-single'?'#contractorRewardContent .contractor-reward-section button[onclick="claimContractorRewardUi(20)"]':'#contractorRewardContent button[onclick="claimAllContractorRewardsUi()"]';
      surfaces=['contractorRewardContent'];
    }else if(kind.startsWith('title-')){
      screen='contractorTitles';
      selector=`#contractorTitleContent button[onclick="setContractorTitle('${kind==='title-equip'?titleId:''}')"]`;
      surfaces=['contractorTitleContent'];
    }else if(kind==='rank-up-close'){
      screen='contractorRank';selector='#contractorRankUpOverlay button[onclick="closeContractorRankUp()"]';
      surfaces=['contractorRankContent'];
    }else if(kind==='lock'||kind==='unlock'){
      screen='party';selector=`#rosterSheetHost button[onclick="toggleInstanceLock('${unit.uid}')"]`;
      surfaces=['partyList','rosterSheetHost'];
    }else if(kind.startsWith('party-')){
      screen='partySet';selector=`#partySelectList button[data-party-uid="${unit.uid}"]`;
      surfaces=['currentPartyView','partySelectList'];
    }else{
      screen='itemDex';selector='#itemDexDetail button[onclick="useGoldenLandMap()"]';
      surfaces=['itemDexList','itemDexDetail'];
    }
    show(screen);
    if(kind==='golden-map')showItemDexDetail('golden_land_map');
    if(kind==='lock'||kind==='unlock')openRosterDetail(unit.uid);
    if(kind==='rank-up-close')presentNextContractorRankUp();
    clearTimeout(contractorRankUpTimer);
    return {screen,selector,surfaces,uid:unit.uid,titleId,catalogExp:CONTRACTOR_ACTION_EXP.dexRegistration,rewards:CONTRACTOR_RANK_REWARD_CATALOG.filter(reward=>kind==='reward-single'?reward.rank===20:reward.rank<=20)};
  },{kind,titleId});
}

async function seed(page,kind,slot){
  await page.evaluate(({kind,slot,titleId})=>{
    clearTutorialUi();clearTimeout(contractorRankUpTimer);
    document.getElementById('contractorRankUpOverlay').classList.add('hidden');
    save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
    Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);
    save.coins=12000+slot;
    const leader=addInstance('aquaron',1),target=addInstance('freigal',1);
    save.party=kind==='party-remove'?[leader.uid,target.uid]:[leader.uid];
    target.locked=kind==='unlock';
    save.items.golden_land_map=3;
    // Leave a reward item unregistered: its first acquisition grants catalog EXP
    // and requests a nested Rank redraw. Both must roll back on save failure.
    save.itemDex=ITEM_DEX_ITEMS.map(item=>item.id).filter(id=>id!=='rainbow_contract_scroll');
    save.contractor={...contractorSaveDefaults(),exp:contractorCumulativeExpForRank(20),legacyMigrationVersion:1};
    syncContractorRankTitles();
    if(kind==='title-unequip')save.contractor.equippedTitleId=titleId;
    if(kind==='reward-single')save.contractor.claimedRankRewards=Array.from({length:18},(_,index)=>index+2);
    if(kind==='rank-up-close')save.contractor.pendingRankUps=[{fromRank:19,toRank:20,unlockedTitleIds:[titleId],createdAt:'2026-01-01T00:00:00.000Z'}];
    migrateSkillSystem();
    if(!saveGame())throw Error('Could not persist the synthetic fixture');
    const otherKey=slot===1?'mb_v95c_profile2':'mb_v95c';
    const other=JSON.stringify({...save,coins:76543,syntheticFixture:'inactive profile must remain byte-identical'});
    localStorage.setItem(otherKey,other);localStorage.setItem(`${otherKey}_lastKnownGood`,other);
  },{kind,slot,titleId});
  // Exercise the actual loader/migrations before taking a stable baseline.
  await page.reload({waitUntil:'networkidle'});await startPage(page);
  return openSurface(page,kind);
}

async function installProbe(page){
  await page.evaluate(()=>{
    window.saveFailureUi={fail:false,attempts:0,writes:0,notices:[]};
    const originalSet=Storage.prototype.setItem,originalNotice=showUiNotice;
    Storage.prototype.setItem=function(key,value){
      if(this===localStorage&&key===MonsterProfiles.key(SAVE_KEY)){
        saveFailureUi.attempts++;
        if(saveFailureUi.fail)throw new DOMException('Injected primary-save quota failure','QuotaExceededError');
        const result=originalSet.call(this,key,value);saveFailureUi.writes++;return result;
      }
      return originalSet.call(this,key,value);
    };
    showUiNotice=function(message,kind='success'){
      saveFailureUi.notices.push({message,kind});return originalNotice(message,kind);
    };
  });
}

async function snapshot(page,surface){
  return page.evaluate(({surfaces})=>{
    const key=MonsterProfiles.key(SAVE_KEY),otherSlot=MonsterProfiles.slot()===1?2:1;
    const other={};
    for(let index=0;index<localStorage.length;index++){
      const name=localStorage.key(index);
      if(otherSlot===2?name.startsWith('mb_v95c_profile2'):name.startsWith('mb_v95c')&&!name.startsWith('mb_v95c_profile2'))other[name]=localStorage.getItem(name);
    }
    const html={};
    for(const id of [...surfaces,'appCoinView','contractorRankView','contractorRankMenuSummary','contractorTitleMenuSummary'])html[id]=document.getElementById(id)?.innerHTML??null;
    const overlay=document.getElementById('contractorRankUpOverlay');
    return {
      memory:JSON.stringify(save),disk:localStorage.getItem(key),other,slot:MonsterProfiles.slot(),
      ui:{screen:document.querySelector('.screen.active')?.id,html,rankUpVisible:!overlay.classList.contains('hidden'),rankUpText:!overlay.classList.contains('hidden')?overlay.textContent:null},
      probe:window.saveFailureUi?{attempts:saveFailureUi.attempts,writes:saveFailureUi.writes,notices:[...saveFailureUi.notices]}:null,
      notice:{text:document.getElementById('uiNotice')?.textContent||'',classes:document.getElementById('uiNotice')?.className||''}
    };
  },surface);
}

function expectedResult(before,kind,surface){
  const expected=durable(before.memory);
  if(kind.startsWith('reward-')){
    for(const reward of surface.rewards){
      expected.coins+=reward.coins;
      for(const [id,count] of Object.entries(reward.items))expected.items[id]=(expected.items[id]||0)+count;
      expected.contractor.claimedRankRewards.push(reward.rank);
      if(reward.titleId&&!expected.contractor.unlockedTitleIds.includes(reward.titleId))expected.contractor.unlockedTitleIds.push(reward.titleId);
      for(const id of Object.keys(reward.items)){
        if(expected.itemDex.includes(id))continue;
        expected.itemDex.push(id);
        const eventId=`dex:item:${id}`;
        expected.contractor.expEventIds.push(eventId);
        expected.contractor.exp+=surface.catalogExp;
        // The exact generated timestamp is checked against the click interval
        // below; every other property is predicted independently of the action.
        expected.contractor.recentExp.push({amount:surface.catalogExp,source:'item_dex_registration',eventId,awardedAt:null});
        expected.contractor.recentExp=expected.contractor.recentExp.slice(-20);
      }
    }
    expected.contractor.claimedRankRewards=[...new Set(expected.contractor.claimedRankRewards)].sort((a,b)=>a-b);
  }else if(kind.startsWith('title-'))expected.contractor.equippedTitleId=kind==='title-equip'?titleId:null;
  else if(kind==='rank-up-close')expected.contractor.pendingRankUps.shift();
  else if(kind==='lock'||kind==='unlock')expected.instances.find(unit=>unit.uid===surface.uid).locked=kind==='lock';
  else if(kind==='party-add')expected.party.push(surface.uid);
  else if(kind==='party-remove')expected.party=expected.party.filter(uid=>uid!==surface.uid);
  else expected.goldenLandMapReady=true;
  return expected;
}

async function assertSuccessfulUi(page,kind,surface,expected){
  assert.equal(await page.locator('#appCoinView').textContent(),expected.coins.toLocaleString('ja-JP'));
  if(kind.startsWith('reward-')){
    assert.equal(await page.locator('#contractorRewardContent button[onclick="claimAllContractorRewardsUi()"]').isDisabled(),true);
    const claimed=page.locator('#contractorRewardContent .contractor-reward-all .contractor-reward-card.is-claimed');
    assert.equal(await claimed.count(),19);
  }else if(kind.startsWith('title-')){
    const current=await page.locator('#contractorTitleContent .contractor-title-current strong').textContent();
    assert.equal(current,kind==='title-equip'?'契約の達人':'称号未設定');
    assert.equal(await page.locator('#contractorTitleContent [aria-pressed="true"]').count(),kind==='title-equip'?1:0);
  }else if(kind==='rank-up-close')assert(await page.locator('#contractorRankUpOverlay').isHidden());
  else if(kind==='lock'||kind==='unlock')assert.match(await page.locator(surface.selector).textContent(),kind==='lock'?/ロック解除/:/ロックする/);
  else if(kind.startsWith('party-')){
    assert.equal(await page.locator('#currentPartyView .party-current-member').count(),expected.party.length);
    assert.equal(await page.locator(surface.selector).textContent(),kind==='party-add'?'パーティーから外す':'パーティーに入れる');
  }else{
    assert(await page.locator(surface.selector).isDisabled());
    assert.match(await page.locator(surface.selector).textContent(),/予約済み/);
    assert.match(await page.locator('#itemDexDetail').textContent(),/所持数：3/);
  }
}

async function assertForegroundErrorNotice(page,label,reducedMotion=false){
  // A visible class alone is insufficient: the entrance animation starts at
  // opacity zero, and a retained modal can paint over an otherwise visible toast.
  await page.waitForFunction(()=>{
    const notice=document.getElementById('uiNotice');
    if(!notice?.classList.contains('is-error'))return false;
    const style=getComputedStyle(notice);
    return Number(style.opacity)>=.99&&style.visibility==='visible'&&style.display!=='none';
  },null,{timeout:1800});
  const visual=await page.evaluate(()=>{
    const notice=document.getElementById('uiNotice'),box=notice.getBoundingClientRect();
    const inViewport=box.width>0&&box.height>0&&box.left>=0&&box.top>=0&&box.right<=innerWidth&&box.bottom<=innerHeight;
    const originalStyle=notice.getAttribute('style');
    let top;
    try{
      // Toasts intentionally do not intercept player input. Enable hit testing
      // only for this synchronous probe, then restore the exact inline style.
      notice.style.pointerEvents='auto';
      top=document.elementFromPoint(box.left+box.width/2,box.top+box.height/2);
    }finally{
      if(originalStyle===null)notice.removeAttribute('style');
      else notice.setAttribute('style',originalStyle);
    }
    const style=getComputedStyle(notice);
    return {inViewport,foreground:top===notice||notice.contains(top),occludingElement:top?.id||top?.className||null,opacity:Number(style.opacity),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,animation:style.animationName};
  });
  assert(visual.inViewport&&visual.foreground&&visual.opacity>=.99,`${label}: error notice must be readable in the foreground: ${JSON.stringify(visual)}`);
  assert.equal(visual.reducedMotion,reducedMotion,`${label}: expected motion preference is active`);
  if(reducedMotion)assert.equal(visual.animation,'none',`${label}: reduced-motion error notice stays static`);
}

async function assertNoDuplicateGrant(page,kind,before,surface,dialogs){
  if(!['reward-single','reward-all','golden-map','rank-up-close'].includes(kind))return;
  const from=dialogs.length;
  await page.evaluate(kind=>{
    // A stale callback must also be harmless after the visible button has gone
    // away/disabled. Ordinary toggle buttons deliberately remain reversible.
    if(kind==='reward-single')claimContractorRewardUi(20);
    if(kind==='reward-all')claimAllContractorRewardsUi();
    if(kind==='golden-map')useGoldenLandMap();
    if(kind==='rank-up-close')closeContractorRankUp();
  },kind);
  const after=await snapshot(page,surface);
  assert.deepEqual(durable(after.memory),durable(before.memory),`${kind}: stale callback must not grant or consume twice`);
  assert.deepEqual(durable(after.disk),durable(before.disk),`${kind}: no duplicate persisted change`);
  assert.equal(after.disk,before.disk,`${kind}: stale callback must not write again`);
  assert.equal(after.probe.writes,before.probe.writes,`${kind}: stale callback must not save again`);
  assert.deepEqual(after.other,before.other);
  assert.equal(after.probe.notices.filter(notice=>notice.kind==='success').length,before.probe.notices.filter(notice=>notice.kind==='success').length,`${kind}: no repeated success notice`);
  assert(!dialogs.slice(from).some(dialog=>/地図を使用した/.test(dialog.message)),`${kind}: no repeated success alert`);
}

try{
  if(server)await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Timed out starting the local test server')),15000);
    server.once('error',error=>{clearTimeout(timeout);reject(error);});
    server.once('exit',code=>{clearTimeout(timeout);reject(Error(`Local test server exited: ${code}`));});
    server.stdout.once('data',()=>{clearTimeout(timeout);resolve();});
  });
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  for(const slot of [1,2]){
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await context.route('**/*',route=>route.request().url().startsWith(`${origin}/`)?route.continue():route.abort());
    await context.addInitScript(slot=>sessionStorage.setItem('mb_profile_tab_v1',String(slot)),slot);
    const page=await context.newPage(),dialogs=[];
    activePage=page;
    page.on('dialog',dialog=>{dialogs.push({type:dialog.type(),message:dialog.message()});void dialog.accept();});
    page.on('pageerror',error=>report.errors.push({slot,message:error.message}));
    await page.goto(`${origin}/?legacy=1`,{waitUntil:'networkidle'});await startPage(page);
    for(const kind of cases){
      report.activeCase={slot,operation:kind};
      let surface=await seed(page,kind,slot);
      await installProbe(page);
      let before=await snapshot(page,surface);
      assert.equal(before.slot,slot);
      assert.equal(before.memory,before.disk,`${slot}/${kind}: initial memory and saved bytes`);
      const expected=expectedResult(before,kind,surface);
      for(let attempt=1;attempt<=3;attempt++){
        // Reuse the second interruption to check OS reduced-motion behavior;
        // restore normal motion before the interruption/reload on attempt 3.
        await page.emulateMedia({reducedMotion:attempt===2?'reduce':'no-preference'});
        if(attempt===3){
          // Interrupt the failed flow by reloading, then fail once more and retry
          // the identical operation. No unsaved reward/reservation may reappear.
          await page.reload({waitUntil:'networkidle'});await startPage(page);
          surface=await openSurface(page,kind);await installProbe(page);
          const resumed=await snapshot(page,surface);
          assert.deepEqual(durable(resumed.memory),durable(before.memory),`${slot}/${kind}: interrupted failure reload memory`);
          assert.deepEqual(durable(resumed.disk),durable(before.disk),`${slot}/${kind}: interrupted failure reload storage`);
          assert.deepEqual(resumed.other,before.other);
          assert.deepEqual(resumed.ui,before.ui,`${slot}/${kind}: interrupted failure reload UI`);
          before=resumed;
        }
        const dialogStart=dialogs.length;
        await page.evaluate(()=>{saveFailureUi.fail=true;saveFailureUi.notices=[];});
        const button=page.locator(surface.selector);
        assert(await button.isVisible(),`${slot}/${kind}: retry button visible`);
        assert(await button.isEnabled(),`${slot}/${kind}: retry button enabled`);
        const prior=await snapshot(page,surface);
        await button.click();
        const failed=await snapshot(page,surface);
        assert.equal(failed.probe.attempts,prior.probe.attempts+1,`${slot}/${kind}: failure really reached primary storage`);
        assert.equal(failed.probe.writes,0,`${slot}/${kind}: no primary write succeeded`);
        assert.equal(failed.memory,before.memory,`${slot}/${kind}: failure ${attempt} restores exact full memory`);
        assert.equal(failed.disk,before.disk,`${slot}/${kind}: failure ${attempt} preserves exact stored bytes`);
        assert.deepEqual(failed.other,before.other,`${slot}/${kind}: inactive profile unchanged`);
        assert.deepEqual(failed.ui,before.ui,`${slot}/${kind}: failure ${attempt} restores rendered UI`);
        assert(failed.probe.notices.some(notice=>notice.kind==='error'&&/保存/.test(notice.message)),`${slot}/${kind}: error notice emitted`);
        assert(!failed.probe.notices.some(notice=>notice.kind==='success'),`${slot}/${kind}: no false success notice`);
        assert.equal(dialogs.length,dialogStart,`${slot}/${kind}: no success alert on failure`);
        assert.match(failed.notice.classes,/is-error/);assert.match(failed.notice.classes,/is-visible/);
        assert(await button.isVisible());assert(await button.isEnabled());
        await assertForegroundErrorNotice(page,`${slot}/${kind}/failure-${attempt}`,attempt===2);
        if(attempt>=2)await page.screenshot({path:`${output}/profile${slot}-${kind}${attempt===2?'-reduced-motion':''}-failed.png`});
      }
      await page.evaluate(()=>{saveFailureUi.fail=false;saveFailureUi.notices=[];});
      const dialogStart=dialogs.length;
      const retryStarted=Date.now();
      await page.locator(surface.selector).click();
      const committed=await snapshot(page,surface);
      const retryFinished=Date.now();
      if(kind.startsWith('reward-')){
        const entries=JSON.parse(committed.memory).contractor.recentExp;
        for(const entry of expected.contractor.recentExp.filter(entry=>entry.awardedAt===null)){
          const actual=entries.find(actual=>actual.eventId===entry.eventId);
          assert(actual,`${slot}/${kind}: new item catalog EXP recorded`);
          const timestamp=Date.parse(actual.awardedAt);
          assert(timestamp>=retryStarted&&timestamp<=retryFinished,`${slot}/${kind}: catalog EXP timestamp belongs to the successful retry`);
          entry.awardedAt=actual.awardedAt;
        }
      }
      assert.equal(committed.probe.writes,1,`${slot}/${kind}: exactly one successful primary write`);
      assert.equal(committed.memory,committed.disk,`${slot}/${kind}: committed memory equals stored bytes`);
      assert.deepEqual(durable(committed.memory),expected,`${slot}/${kind}: exact one-operation result, including all unrelated fields`);
      assert.deepEqual(committed.other,before.other);
      assert(!committed.probe.notices.some(notice=>notice.kind==='error'),`${slot}/${kind}: retry has no error`);
      const successNotices=committed.probe.notices.filter(notice=>notice.kind==='success');
      assert.equal(successNotices.length,/^(reward|title)-/.test(kind)?1:0,`${slot}/${kind}: success notice count`);
      if(kind==='golden-map')assert.equal(dialogs.slice(dialogStart).filter(dialog=>/地図を使用した/.test(dialog.message)).length,1);
      else assert.equal(dialogs.length,dialogStart);
      await assertSuccessfulUi(page,kind,surface,expected);
      await assertNoDuplicateGrant(page,kind,committed,surface,dialogs);
      const settled=await snapshot(page,surface);
      await page.reload({waitUntil:'networkidle'});await startPage(page);surface=await openSurface(page,kind);
      const reloaded=await snapshot(page,surface);
      assert.equal(reloaded.slot,slot);
      assert.equal(reloaded.memory,reloaded.disk,`${slot}/${kind}: reload memory equals persisted bytes`);
      assert.deepEqual(durable(reloaded.memory),expected,`${slot}/${kind}: success survives reload exactly once`);
      assert.deepEqual(reloaded.other,before.other);
      assert.deepEqual(reloaded.ui,settled.ui,`${slot}/${kind}: committed UI survives reload`);
      await assertSuccessfulUi(page,kind,surface,expected);
      report.cases.push({slot,operation:kind,result:'PASS',failedAttempts:3,interruptedFailureReload:true,sameButtonRetry:true,successfulPrimaryWrites:1,exactRollback:true,inactiveProfileUnchanged:true,uiCoherent:true,noFalseSuccess:true,noticeForeground:true,reducedMotionFailure:true,reload:true});
      console.log(`PASS profile ${slot}: ${kind} (3 failures, interruption/reload, one successful retry, final reload)`);
    }
    await context.close();
  }
  assert.deepEqual(report.errors,[],'No uncaught browser exceptions');
  delete report.activeCase;
  report.result='PASS';
  console.log(`PASS save-failure UI: ${report.cases.length} operation/profile cases, ${report.cases.length*3} injected quota failures.`);
}catch(error){
  report.result='FAIL';report.failure=error.stack;
  if(activePage&&!activePage.isClosed())await activePage.screenshot({path:`${output}/unexpected-failure.png`}).catch(()=>{});
  throw error;
}finally{
  fs.writeFileSync(`${output}/manifest.json`,`${JSON.stringify(report,null,2)}\n`);
  await browser?.close();server?.kill();
}
