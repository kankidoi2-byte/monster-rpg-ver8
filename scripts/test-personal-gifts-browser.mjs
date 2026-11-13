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
  await page.goto('http://127.0.0.1:4266/?legacy=1',{waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.contractor.pendingRankUps=[];save.giftClaimedIds=DEV_GIFTS.map(g=>g.id);save.coins=7;saveGame();show('feedbackBox');});
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
  failAck=false;await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>PersonalGifts.sync());assert.equal(await page.evaluate(()=>save.coins),507);assert.equal(await page.evaluate(()=>PersonalGifts.entries().length),0);assert(ack.some(x=>x.ids.includes('pg-browser')));
  await page.evaluate(()=>{clearTutorialUi();showGiftBox();});await page.locator('#giftHistoryTab').click();assert(await page.locator('[data-gift-detail="developer:pg-browser"]').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS personal gift browser: 412/360 portrait feedback->BOX, text safety, tutorial gate, atomic save rollback, reload, lost ACK retry, no duplicate coins.');
}finally{await browser?.close();server.kill();}
