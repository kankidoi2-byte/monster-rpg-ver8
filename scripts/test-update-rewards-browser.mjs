import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const probe=net.createServer();
await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
const port=probe.address().port;
await new Promise(resolve=>probe.close(resolve));
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','inherit']});
const origin='http://127.0.0.1:'+port+'/?legacy=1';
const source=fs.readFileSync('js/update-releases.js','utf8');
const release=(version,change='検査 '+version)=>({version,date:'2026-11-21',change});
const baseline=release('8.0.1'),patch=release('8.0.6','技エフェクトを修正'),
  minor={...release('8.1.0'),extraRewards:[{kind:'coins',amount:25},{kind:'item',id:'max_potion',count:2}]},
  major={...release('9.0'),date:'2026-11-22'};
let rows=[baseline],browser;
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',reject);});
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  const errors=[];
  const createPage=async width=>{
    const ctx=await browser.newContext({viewport:{width,height:915},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    page.on('dialog',dialog=>dialog.accept());
    await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>{
      await page.evaluate(()=>{clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');});
    });
    await page.route('**/*',r=>{
      const url=new URL(r.request().url());
      if(url.hostname!=='127.0.0.1'){
        if(url.pathname==='/api/gifts/pending')return r.fulfill({json:{gifts:[{id:'pg-update-test',profileId:r.request().postDataJSON()?.profileId,feedbackId:'local-feedback-test',type:'auto',title:'意見箱のお礼',letter:'ありがとう',rewards:[{kind:'coins',amount:17}],createdAt:'2026-11-21T00:00:00Z',claimedAt:null}]}});
        return r.abort();
      }
      if(url.pathname==='/js/update-releases.js')return r.fulfill({contentType:'text/javascript',body:source.replace(/const UPDATE_RELEASES = \[[\s\S]*?\n\];/,'const UPDATE_RELEASES = '+JSON.stringify(rows)+';')});
      return r.continue();
    });
    await page.clock.setFixedTime(new Date('2026-11-22T12:00:00+09:00'));
    return page;
  };
  const boot=async page=>{
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    await page.locator('#titleScreen').click();
    await page.locator('#titleScreen').waitFor({state:'detached'});
  };
  const open=page=>page.evaluate(()=>{clearTutorialUi();showGiftBox();});
  const pending=page=>page.evaluate(()=>save.updateRewards.pending);
  const ready=page=>page.evaluate(()=>{
    clearTutorialUi();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
    save.contractor.pendingRankUps=[];
    if(!saveGame())throw Error('fixture save');
  });
  const legacy=await createPage(412);
  await boot(legacy);await ready(legacy);
  await legacy.evaluate(()=>{
    save.coins=37;save.gBless.reserve=3;
    if(!saveGame())throw Error('fixture save');
    // Model an actual pre-feature save without the new field.
    delete save.updateRewards;save.saveMeta.integrityHash=saveHash(save);
    const raw=JSON.stringify(save);localStorage.setItem(MonsterProfiles.key(SAVE_KEY),raw);
  });
  await boot(legacy);
  assert.deepEqual(await legacy.evaluate(()=>[save.updateRewards.delivered,save.coins,save.gBless.reserve]),['8.0.1',37,3]);
  assert.deepEqual(await pending(legacy),[]);
  await open(legacy);
  assert.equal(await legacy.getByText('プレゼントBOX開設記念',{exact:true}).count(),1);

  // New players in a later release get only updates after their first launch.
  rows=[baseline,patch,minor];
  const fresh=await createPage(360);
  await boot(fresh);
  assert.deepEqual(await fresh.evaluate(()=>JSON.parse(localStorage.getItem(MonsterProfiles.key(SAVE_KEY))).updateRewards),{delivered:'8.1.0',pending:[]});
  await open(fresh);assert.equal(await fresh.getByText('プレゼントBOX開設記念',{exact:true}).count(),1);
  rows=[baseline,patch,minor,major];
  await boot(fresh);assert.deepEqual(await pending(fresh),['9.0']);
  assert.equal(await fresh.title(),'モンスターバトル');

  // Existing player returns after skipping three releases; no balance change before claim.
  await boot(legacy);assert.deepEqual(await pending(legacy),['8.0.6','8.1.0','9.0']);
  assert.deepEqual(await legacy.evaluate(()=>[save.coins,save.gBless.reserve]),[37,3]);
  await open(legacy);
  assert.equal(await legacy.locator('.gift-update-medium,.gift-update-large').count(),0);
  const updateRows=legacy.locator('[data-gift-detail^="update:"]');
  assert.deepEqual(await updateRows.locator('strong').allTextContents(),[
    'アップデート報酬（11/22）','アップデート報酬（11/21）','アップデート報酬（11/21）'
  ]);
  assert.equal(await updateRows.first().getAttribute('aria-label'),'アップデート報酬（11/22）の詳細');
  assert.doesNotMatch(await legacy.locator('#giftList').innerText(),/Ver\d/i);
  assert(await legacy.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await legacy.locator('[data-gift-detail="update:8.0.6"]').click();
  assert.equal(await legacy.locator('.gift-letter').innerText(),patch.change);
  assert.equal(await legacy.locator('#giftDialogTitle').innerText(),'アップデート報酬（11/21）');
  assert.match(await legacy.locator('.gift-detail-meta').innerText(),/期限なし/);
  await legacy.locator('#giftDialogClose').click();
  await legacy.evaluate(()=>showNotices());
  const noticeList=legacy.locator('#noticeList');
  assert.equal(await noticeList.getByText(patch.change,{exact:true}).count(),1);
  assert.equal(await noticeList.getByRole('heading',{name:'アップデート（11/21）',exact:true}).count(),3);
  assert.equal(await noticeList.getByRole('heading',{name:'アップデート（11/22）',exact:true}).count(),1);
  assert.doesNotMatch(await noticeList.innerText(),/Ver\d/i);
  await open(legacy);
  assert.equal(await legacy.evaluate(async()=>{
    const before=JSON.stringify(save),real=saveGame;
    saveGame=()=>false;
    try{return !await claimGifts(['update:9.0'])&&JSON.stringify(save)===before;}
    finally{saveGame=real;}
  }),true,'failed receipt rolls back both inbox and balances');
  await legacy.locator('[data-gift-filter="update"]').click();
  await legacy.locator('#giftClaimAll').click();
  await legacy.locator('#giftDialogClaim').click();
  await legacy.getByRole('heading',{name:'受け取りました',exact:true}).waitFor();
  assert.deepEqual(await legacy.evaluate(()=>[save.coins,save.gBless.reserve,save.items.max_potion,save.items.revive_drop,save.lifeQuestClaimedIds,save.giftClaimedIds]),
    [362,33,2,0,[],[]]);
  await boot(legacy);assert.deepEqual(await pending(legacy),[]);

  // Persist a receipt from an older title formatter and verify list, aria and detail are adapted only on render.
  const oldTitle='Ver9.0 アップデート報酬';
  const originalReceipt=await legacy.evaluate(title=>{
    const receipt=save.giftHistory.find(g=>g.key==='update:9.0');
    receipt.title=title;
    if(!saveGame())throw Error('legacy receipt fixture save');
    return receipt;
  },oldTitle);
  await boot(legacy);await open(legacy);
  await legacy.locator('#giftHistoryTab').click();
  const oldRow=legacy.locator('[data-gift-detail="update:9.0"]');
  assert.equal(await oldRow.locator('strong').innerText(),'アップデート報酬（11/22）');
  assert.equal(await oldRow.getAttribute('aria-label'),'アップデート報酬（11/22）の詳細');
  await oldRow.click();
  assert.equal(await legacy.locator('#giftDialogTitle').innerText(),'アップデート報酬（11/22）');
  assert.deepEqual(await legacy.evaluate(()=>save.giftHistory.find(g=>g.key==='update:9.0')),originalReceipt);
  assert.deepEqual(await pending(legacy),[]);

  const labs=Array.from({length:24},(_,i)=>({...release('9.0.'+(i+1)),date:'2026-11-22'}));
  rows=[...rows,...labs];
  await boot(legacy);
  assert.deepEqual(await pending(legacy),labs.slice(-20).map(r=>r.version));
  await open(legacy);
  assert.equal(await legacy.locator('[data-gift-detail^="update:"]').count(),20);
  assert.equal(await legacy.locator('[data-gift-detail^="update:"]').first().getAttribute('data-gift-detail'),'update:9.0.24');
  assert.equal(await legacy.getByText('プレゼントBOX開設記念',{exact:true}).count(),1);
  await legacy.getByText('意見箱のお礼',{exact:true}).waitFor();
  await legacy.locator('[data-gift-claim="update:9.0.24"]').click();
  await legacy.getByRole('heading',{name:'受け取りました',exact:true}).waitFor();
  await boot(legacy);
  assert.deepEqual(await pending(legacy),labs.slice(4,-1).map(r=>r.version),'old culled gifts never return');
  await legacy.clock.setFixedTime(new Date('2027-03-01T12:00:00+09:00'));await boot(legacy);
  assert.equal(await legacy.evaluate(()=>pendingGifts().filter(g=>g.source==='update').length),19);
  assert.deepEqual(errors,[]);
  console.log('PASS update rewards browser: legacy/new saves, skipped releases, immutable 20 cap, no expiry, atomic receipts, and unchanged developer/feedback gifts.');
}finally{
  await browser?.close();
  server.kill();
}
