import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4266'],{stdio:['ignore','pipe','inherit']});
let browser;const out=process.env.FEEDBACK_EVIDENCE||'/tmp/feedback-thanks-qa';fs.mkdirSync(out,{recursive:true});
try{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});browser=await chromium.launch({headless:true});
 for(const viewport of [{width:412,height:780},{width:360,height:640}]){
  const context=await browser.newContext({viewport,timezoneId:'Asia/Tokyo',reducedMotion:'reduce'}),page=await context.newPage(),errors=[],ack=[];
  let gifts=[],failAck=true;
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/*',async r=>{
   const u=new URL(r.request().url());if(u.hostname==='127.0.0.1')return r.continue();
   if(u.pathname==='/api/feedback'){const b=r.request().postDataJSON();const gift={id:'pg-browser',profileId:b.profileId,feedbackId:b.id,type:'auto',title:'意見箱のお礼',letter:'ありがとう。<script>window.bad=1</script>',rewards:[{kind:'coins',amount:500}],createdAt:new Date().toISOString(),claimedAt:null};gifts=[gift];return r.fulfill({json:{accepted:1,gift}});}
   if(u.pathname==='/api/gifts/pending')return r.fulfill({json:{gifts}});
   if(u.pathname==='/api/gifts/claimed'){if(failAck)return r.abort();ack.push(r.request().postDataJSON());gifts=[];return r.fulfill({json:{ok:true}});}
   return r.abort();
  });
  await page.goto('http://127.0.0.1:4266/?legacy=1',{waitUntil:'networkidle'});await page.locator('#titleScreen').dblclick();await page.locator('#titleScreen').waitFor({state:'detached'});
  // The unrelated rank-up dialog must not compete with the gift history test,
  // including after the intentional title reload and save migration.
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.contractor.exp=CONTRACTOR_MAX_EXP;save.contractor.pendingRankUps=[];save.giftClaimedIds=DEV_GIFTS.map(g=>g.id);save.coins=7;saveGame();show('feedbackBox');});
  await page.locator('.kind[data-k="idea"]').click();await page.locator('#fb-body').fill('操作がわかりやすくなりました。');assert(await page.locator('#fb-thanks-min').isHidden());
  await page.screenshot({path:out+'/feedback-'+viewport.width+'.png'});
  await page.locator('#fb-send').click();await page.getByRole('heading',{name:'届きました。お礼をプレゼントBOXに届けました。',exact:true}).waitFor();
  await page.getByRole('button',{name:'プレゼントBOXへ',exact:true}).click();await page.locator('[data-gift-detail="developer:pg-browser"]').waitFor();
  await page.screenshot({path:out+'/box-'+viewport.width+'.png'});
  // Tutorial gating applies to personal gifts too.
  await page.evaluate(()=>{save.progress.tutorial=tutorialSaveDefaults();renderGiftBox();});assert(await page.locator('[data-gift-claim="developer:pg-browser"]').isDisabled());
  await page.evaluate(()=>{save.progress.tutorial=tutorialSaveDefaults({legacy:true});renderGiftBox();});
  await page.locator('[data-gift-detail="developer:pg-browser"]').click();assert.match(await page.locator('.gift-letter').innerText(),/<script>/);assert.equal(await page.evaluate(()=>window.bad),undefined);await page.locator('#giftDialogClose').click();
  const before=await page.evaluate(()=>JSON.stringify(save));
  assert.equal(await page.evaluate(async()=>{const real=saveGame;saveGame=()=>false;try{return await claimGifts(['developer:pg-browser']);}finally{saveGame=real;}}),false);assert.equal(await page.evaluate(()=>JSON.stringify(save)),before);
  assert.equal(await page.evaluate(()=>claimGifts(['developer:pg-browser'])),true);await page.locator('#giftDialogClose').click();assert.equal(await page.evaluate(()=>save.coins),507);assert.equal(await page.evaluate(()=>claimGifts(['developer:pg-browser'])),false);
  // Lost ACK + reload cannot re-award; server record is retried after local receipt has persisted.
  failAck=false;await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').dblclick();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>PersonalGifts.sync());assert.equal(await page.evaluate(()=>save.coins),507);assert.equal(await page.evaluate(()=>PersonalGifts.entries().length),0);assert(ack.some(x=>x.ids.includes('pg-browser')));
  await page.evaluate(()=>{clearTutorialUi();showGiftBox();});await page.locator('#giftHistoryTab').click();assert(await page.locator('[data-gift-detail="developer:pg-browser"]').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await checkPendingDisplay(page);assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS personal gift browser: 412/360 portrait feedback->BOX, text safety, tutorial gate, atomic save rollback, reload, lost ACK retry, no duplicate coins, pending 401/offline/empty, reentry and online recovery with Life Quest.');
}finally{await browser?.close();server.kill();}

async function checkPendingDisplay(page){
 const pendingPath='**/api/gifts/pending';
 const personalKey='developer:pg-retry';
 const otherKey='lifequest:retry-control';
 const home=()=>page.locator('#giftBox .gift-heading button').click();
 const box=()=>page.locator('#homeGiftButton').click();
 const online=()=>page.evaluate(()=>window.dispatchEvent(new Event('online')));
 async function check(action,outcome,screen,keys){
  await page.route(pendingPath,route=>{
   assert.equal(route.request().method(),'POST');
   if(outcome==='offline')return route.abort('failed');
   if(outcome===401)return route.fulfill({status:401,json:{error:'unauthorized'}});
   const gift={id:'pg-retry',profileId:route.request().postDataJSON().profileId,feedbackId:'retry',type:'auto',title:'個別テスト',letter:'お礼',rewards:[{kind:'coins',amount:1}],createdAt:'2026-11-27T00:00:00Z',claimedAt:null};
   return route.fulfill({json:{gifts:outcome===1?[gift]:[]}});
  },{times:1});
  const event=outcome==='offline'?'requestfailed':'response';
  const [network]=await Promise.all([page.waitForEvent(event,{predicate:e=>e.url().endsWith('/api/gifts/pending')}),action()]);
  if(event==='response')assert.equal(network.status(),outcome===401?401:200);
  const warning=outcome===401?'認証':outcome==='offline'?'最新情報を取得できませんでした':'';
  await page.waitForFunction(({screen,keys,warning})=>{
   if(document.querySelector('.screen.active')?.id!==screen)return false;
   const badge=document.getElementById('giftUnreadCount'),label=document.getElementById('homeGiftButton').getAttribute('aria-label');
   if(badge.hidden!==(keys.length===0)||badge.textContent!==String(keys.length))return false;
   if(warning?!label.includes(warning):label.includes('確認済み'))return false;
   if(screen==='home')return true;
   const hint=document.getElementById('personalGiftWarning');
   const rows=Array.from(document.querySelectorAll('#giftList [data-gift-detail]'),el=>el.dataset.giftDetail);
   return hint.hidden===!warning&&(!warning||hint.textContent.includes(warning))&&
    rows.length===keys.length&&keys.every(key=>rows.includes(key))&&
    Boolean(document.querySelector('#giftList .gift-empty'))===(!warning&&!keys.length);
  },{screen,keys,warning});
 }
 await check(home,401,'home',[]);
 await check(box,401,'giftBox',[]);
 await check(online,0,'giftBox',[]);
 await check(home,1,'home',[personalKey]);
 await page.evaluate(()=>{
  localStorage.setItem('lifequest_rewards_v1',JSON.stringify({v:1,entries:[{id:'retry-control',label:'テスト報酬',createdAt:'2026-11-27T00:00:00Z',coins:5,items:{}}]}));
 });
 await check(box,'offline','giftBox',[personalKey,otherKey]);
 await check(online,0,'giftBox',[otherKey]);
 await check(home,1,'home',[personalKey,otherKey]);
 await check(box,401,'giftBox',[personalKey,otherKey]);
 await check(home,'offline','home',[personalKey,otherKey]);
 await check(box,0,'giftBox',[otherKey]);
 await check(home,0,'home',[otherKey]);
}
