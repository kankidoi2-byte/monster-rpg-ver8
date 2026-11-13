import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4268'],{stdio:['ignore','pipe','inherit']});
const evidence=process.env.G_BLESS_EVIDENCE||'artifacts/save-failure-ui/g-bless';fs.mkdirSync(evidence,{recursive:true});
let browser;const errors=[];
try{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});browser=await chromium.launch({headless:true});
 for(const width of [320,360,412,430]){
  const ctx=await browser.newContext({viewport:{width,height:800},timezoneId:'Asia/Tokyo',reducedMotion:'reduce'}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.clock.setFixedTime(new Date('2026-11-03T12:00:00+09:00'));
  await page.goto('http://127.0.0.1:4268/?legacy=1',{waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');save=initSave();save.contractor.pendingRankUps=[];show('home');updateAppResourceBar()});
  assert(await page.locator('#gBlessChip').isHidden());
  await page.evaluate(()=>{save.progress.tutorial=tutorialSaveDefaults({legacy:true});saveGame();updateAppResourceBar()});
  assert.equal(await page.locator('#gBlessChipText').innerText(),'G-BLESS 100');
  await page.locator('#gBlessChip').click();assert(await page.locator('#gBlessDialog').isVisible());assert(await page.locator('#gBlessIchor').isDisabled());
  await page.locator('#gBlessSwitch').click();assert.equal(await page.locator('#gBlessSwitch').getAttribute('aria-checked'),'true');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(MonsterProfiles.key(SAVE_KEY))).gBless.on),true);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert(await page.locator('#gBlessDialog').evaluate(d=>[...d.querySelectorAll('b,p,small,button')].every(e=>e.scrollWidth<=e.clientWidth+1)),'sheet text fits');
  await page.screenshot({path:`${evidence}/sheet-${width}.png`});
  await page.locator('#gBlessDialog .gb-close').click();
  // Resource chip, rank and coins must not overlap, even with a large balance.
  await page.evaluate(()=>{save.coins=999999999999;updateAppResourceBar()});
  assert(await page.locator('.app-topbar').evaluate(e=>{const ids=['.contractor-rank','#gBlessChip','.app-resource'],rs=ids.map(x=>e.querySelector(x).getBoundingClientRect());return rs.every(r=>r.left>=0&&r.right<=innerWidth)&&rs.every((r,i)=>!i||r.left>=rs[i-1].right)}));
  await page.screenshot({path:`${evidence}/home-${width}.png`});
  // G-ICHOR and reserve delivered through the real gift pipeline. No campaign added to shipped data.
  await page.evaluate(()=>{DEV_GIFTS.splice(0,DEV_GIFTS.length,{id:'qa-gb',title:'QA',letter:'QA',startAt:'2026-01-01',until:null,rewards:[{kind:'bless',amount:7},{kind:'item',id:'g_ichor',count:2}]});save.gBless.week=78;showGiftBox()});
  await page.locator('[data-gift-claim="developer:qa-gb"]').click();await page.getByRole('heading',{name:'受け取りました',exact:true}).waitFor();
  assert.match(await page.locator('#giftDialogBody').innerText(),/G-BLESS 予備の加護\s*\+7/);
  assert.equal(await page.evaluate(()=>save.gBless.reserve),7);assert(await page.evaluate(()=>save.itemDex.includes('g_ichor')));await page.locator('#giftDialogClose').click();
  await page.locator('#giftHistoryTab').click();await page.locator('[data-gift-detail="developer:qa-gb"]').click();assert.match(await page.locator('#giftDialogBody').innerText(),/予備の加護/);await page.locator('#giftDialogClose').click();
  await page.evaluate(()=>show('home'));await page.locator('#gBlessChip').click();await page.locator('#gBlessIchor').click();assert.equal(await page.locator('#gBlessIchorBefore').innerText(),'78');
  await page.screenshot({path:`${evidence}/ichor-${width}.png`});
  // Both item and gauge roll back on a primary storage failure.
  const before=await page.evaluate(()=>JSON.stringify(save));
  await page.evaluate(()=>{window.gbSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===MonsterProfiles.key(SAVE_KEY))throw Error('quota');return gbSet.call(this,k,v)}});
  assert.equal(await page.evaluate(()=>useGBlessIchor()),false);assert.equal(await page.evaluate(()=>JSON.stringify(save)),before);
  await page.evaluate(()=>Storage.prototype.setItem=gbSet);await page.locator('#gBlessIchorDialog .gb-close').click();
  assert.equal(await page.evaluate(()=>save.gBless.week),100);assert.equal(await page.evaluate(()=>save.items.g_ichor),1);assert.equal(await page.evaluate(()=>save.gBless.reserve),7);assert(await page.locator('#gBlessIchor').isDisabled());
  await page.locator('#gBlessDialog .gb-close').click();
  // Create daily completion via standalone Life Quest, advance to next day, then receive once.
  await page.evaluate(()=>{localStorage.removeItem('lifequest_rewards_v1');localStorage.setItem('lifequest.v1',JSON.stringify({quests:[{id:'qa',cat:'str',exp:20,per:1}],hist:{'2026-11-02':{qa:1}},rewardDays:{'2026-11-02':[{id:'qa',cat:'str',exp:20,per:1,amount:1}]}}));showGiftBox()});
  assert.equal(await page.evaluate(()=>LifeQuestRewards.readBox().entries.find(e=>e.id==='complete-2026-11-02').bless),10);
  await page.locator('[data-gift-claim="lifequest:complete-2026-11-02"]').click();await page.getByRole('heading',{name:'受け取りました',exact:true}).waitFor();assert.equal(await page.evaluate(()=>save.gBless.reserve),17);await page.locator('#giftDialogClose').click();
  assert.equal(await page.evaluate(()=>claimGifts(['lifequest:complete-2026-11-02'])),false);
  await page.evaluate(()=>{const b=LifeQuestRewards.readBox();delete b.entries.find(e=>e.id==='complete-2026-11-02').bless;localStorage.setItem('lifequest_rewards_v1',JSON.stringify(b));LifeQuestRewards.sync()});
  assert.equal(await page.evaluate(()=>LifeQuestRewards.readBox().entries.find(e=>e.id==='complete-2026-11-02').bless),undefined,'past entries unchanged');
  // Smoke the actual party -> hunt -> battle path, then settle and inspect the real result UI.
  await page.evaluate(()=>{show('home');const i=addInstance('aquaron',5);save.party=[i.uid];show('partySet')});assert(await page.locator('#partySet').isVisible());
  await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
  await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
  await page.evaluate(()=>{save.gBless={...normalizeGBless(null),on:true,week:2,reserve:17};enemy.expBonus=41;enemy.coinBonus=13;eHp=0;win()});
  assert.equal(await page.evaluate(()=>save.gBless.week),1);assert.match(await page.locator('#battleRewardExp').innerText(),/×1.5/);assert.match(await page.locator('#battleRewardCoins').innerText(),/×2/);assert.equal(await page.locator('.gb-result-tag').innerText(),'✦ G-BLESS');
  await page.waitForFunction(()=>!document.getElementById('battleOutcome').classList.contains('is-revealing'));assert(await page.locator('#battleOutcomeRewards').evaluate(e=>[...e.children].every(c=>c.scrollWidth<=c.clientWidth+1)),'victory rows fit');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${evidence}/victory-${width}.png`});
  await page.evaluate(()=>{battleRewardGranted=false;normalVictoryReceipt=null;endPartyRecovery();show('home')});
  // Actual weekly reset on both sides of Monday 04:00 JST.
  await page.clock.setFixedTime(new Date('2026-11-09T03:59:59+09:00'));await page.evaluate(()=>{save.gBless={v:1,on:true,weekKey:'2026-11-02',week:0,reserve:17};renderGBless()});assert.equal(await page.evaluate(()=>save.gBless.week),0);
  await page.clock.setFixedTime(new Date('2026-11-09T04:00:00+09:00'));await page.evaluate(()=>renderGBless());assert.equal(await page.evaluate(()=>save.gBless.week),100);assert.equal(await page.evaluate(()=>save.gBless.reserve),17);
  await page.evaluate(()=>saveGame());await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>save.gBless.reserve),17);
  // All header controls remain reachable on floating headers and at 200% zoom/reflow.
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);save.contractor.pendingRankUps=[];document.getElementById('contractorRankUpOverlay').classList.add('hidden')});
  const settleHeader=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const headerReachable=async()=>{
   // Preserve the original predicate. Diagnostics run only after the sampled failure,
   // and do not retry or replace its result with a later (possibly passing) frame.
   const sample=await page.locator('.app-topbar button:visible').evaluateAll(es=>{
    const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
    const describe=e=>{if(!e)return null;const s=getComputedStyle(e);return {tag:e.tagName,id:e.id,className:e.className,rect:rect(e),display:s.display,visibility:s.visibility,position:s.position,zIndex:s.zIndex,pointerEvents:s.pointerEvents,transform:s.transform,zoom:s.zoom};};
    const buttons=es.map(e=>{const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return {button:describe(e),text:e.textContent,hit:describe(hit),stack:document.elementsFromPoint(x,y).slice(0,10).map(describe),reachable:r.left>=0&&r.right<=innerWidth&&e.contains(hit)};});
    return {reachable:buttons.every(b=>b.reachable),buttons,screen:document.querySelector('.screen.active')?.id,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,scrollX,scrollY,visual:visualViewport?{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale,offsetTop:visualViewport.offsetTop,offsetLeft:visualViewport.offsetLeft}:null},root:describe(document.documentElement),body:describe(document.body),header:describe(document.querySelector('.app-topbar')),tutorial:describe(document.getElementById('tutorialOverlay')),dialogs:[...document.querySelectorAll('dialog[open]')].map(describe),animations:document.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,target:describe(a.effect?.target)}))};
   });
   if(!sample.reachable){
    const stem=`${evidence}/header-failure-${width}-${sample.screen}`;
    fs.writeFileSync(stem+'.json',JSON.stringify(sample,null,2));
    await page.screenshot({path:stem+'.png',fullPage:true});
    console.error('G-BLESS header reachability failure:',JSON.stringify(sample));
   }
   return sample.reachable;
  };
  for(const id of ['gachaHub','battleChoices']){
   await page.evaluate(id=>show(id),id);await page.locator('#gBlessChip').click();assert(await page.locator('#gBlessDialog').isVisible());await page.locator('#gBlessDialog .gb-close').click();assert(await headerReachable(),id+' header');
  }
  await page.evaluate(()=>document.documentElement.style.zoom='2');
  for(const id of ['partySet','skillDex','shop']){await page.evaluate(id=>show(id),id);await settleHeader();await page.waitForFunction(()=>document.body.classList.contains('gb-header-stacked'));assert(await headerReachable(),id+' 200%');}
  await page.evaluate(()=>document.documentElement.style.zoom='');await page.setViewportSize({width:160,height:640});await page.evaluate(()=>show('party'));await settleHeader();await page.waitForFunction(()=>document.body.classList.contains('gb-header-stacked'));assert(await headerReachable(),'roster narrow reflow');
  await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS G-BLESS browser: chip/tutorial, persistent toggle, 320/360/412/430px sheet/header and floating/200%-zoom/reflow reachability, real gift/history, G-ICHOR rollback/use, next-day Life Quest +10/old entries/once, JST Monday boundary and reload.');
}finally{await browser?.close();server.kill();}
