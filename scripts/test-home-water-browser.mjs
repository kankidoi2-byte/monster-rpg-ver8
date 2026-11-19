// Real Chromium layout and navigation checks, using a disposable synthetic save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const origin=process.env.GAME_TEST_URL||'http://127.0.0.1:4173/?legacy=1';
const output=process.env.HOME_WATER_EVIDENCE||'/tmp/home-water-evidence';fs.mkdirSync(output,{recursive:true});
const server=process.env.GAME_TEST_URL?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4173'],{stdio:['ignore','pipe','inherit']});
if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const errors=[],report={layouts:[],checks:[],errors};
try{
 const page=await browser.newPage({viewport:{width:412,height:650},isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.route('**/*',route=>new URL(route.request().url()).origin===new URL(origin).origin?route.continue():route.abort());
 await page.goto(origin,{waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{clearTutorialUi();save=initSave();completeTutorial();Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');save.instances=[];save.party=[];for(const id of ['freigal','aquaron','elna_beginner']){const ins=addInstance(id,1);save.party.push(ins.uid);}for(const id of Object.keys(BATTLE_IDLE_MEDIA))if(!save.instances.some(i=>i.id===id))save.instances.push({uid:'home-test-'+id,id,level:1,exp:0,locked:false,evolutionOffset:0});save.homeFavoriteId='freigal';save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');saveGame();show('home');});
 for(const [width,height] of [[360,640],[390,844],[412,780],[430,932],[844,390]]){
  await page.setViewportSize({width,height});
  await page.waitForTimeout(350);
  const results=await page.evaluate(async()=>{
   const rows=[];
   for(const [id,config] of Object.entries(BATTLE_IDLE_MEDIA)){
    save.homeFavoriteId=id;save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');renderHome();await new Promise(requestAnimationFrame);layoutWaterHome();
    const h=document.getElementById('home'),quick=document.getElementById('homeBanner'),plate=document.getElementById('homeNamePlate'),r=waterHomeRecord,b=config.sourceBounds;
    const upper=quick.getBoundingClientRect().bottom,plateTop=plate.getBoundingClientRect().top;
    const canvas=r.art.getBoundingClientRect(),k=canvas.width/b.width;
    const top=canvas.top+b.y*k,bottom=canvas.top+b.bottom*k;
    const ui=[...document.querySelectorAll('#homeSideLinks button, #homeNoticePreview button'),document.getElementById('homeAdventureButton'),document.querySelector('.home-battle-button'),plate];
    const blocked=[];const clickable=ui.every(el=>{const rect=el.getBoundingClientRect(),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);const ok=hit===el||el.contains(hit);if(!ok)blocked.push({target:el.id||el.className,rect:rect.toJSON(),hit:hit?.outerHTML.slice(0,500)});return ok;});
    rows.push({id,blocked,scale:config.layout.scale,upper,plateTop,top,bottom,clickable,longEdge:Math.max(b.right-b.x,b.bottom-b.y)*k,overflow:document.documentElement.scrollWidth>visualViewport.width+1||innerHeight>visualViewport.height+1});
   }return rows;
  });
  for(const row of results){if(!row.clickable){console.log(JSON.stringify(row));await page.screenshot({path:output+'/blocked.png'});}assert(row.clickable,row.id+' controls clickable');assert(!row.overflow,row.id+' horizontal overflow');assert(row.top>=row.upper+4-.1,row.id+' banner overlap');assert(row.bottom<=row.plateTop+6+.1,row.id+' plate overlap');}
  report.layouts.push({width,height,species:results.length,smallContained:results.filter(r=>r.scale<=.75).length,allControlsClickable:true});
 }
 await page.setViewportSize({width:412,height:650});
 for(const id of ['freigal','false_dragon_alfa','elixion','kimeragna_apex','slime','slime_gold','elna_beginner']){
  await page.evaluate(id=>{save.homeFavoriteId=id;renderHome();},id);await page.waitForTimeout(220);
  await page.screenshot({path:`${output}/${id}.png`});
 }

 // Coin extremes must not overflow, overlap, or make the topbar controls untappable.
 for(const viewport of [{width:360,height:640},{width:390,height:844},{width:412,height:780},{width:430,height:932}]){
  await page.setViewportSize(viewport);
  for(const coins of [9999999,999999999,Number.MAX_SAFE_INTEGER]){
   await page.evaluate(coins=>{save.coins=coins;updateAppResourceBar();},coins);
   const geometry=await page.evaluate(()=>{
    const els=[document.querySelector('.contractor-rank'),document.getElementById('gBlessChip'),document.querySelector('.app-resource'),document.querySelector('#homeNoticePreview button')];
    const boxes=els.filter(e=>!e.hidden).map(e=>e.getBoundingClientRect().toJSON());
    return {boxes,ok:boxes.every((b,i)=>b.left>=0&&b.right<=innerWidth+1&&(!i||b.left>=boxes[i-1].right-1)),overflow:document.documentElement.scrollWidth>innerWidth};
   });assert(geometry.ok&&!geometry.overflow,JSON.stringify({viewport,coins,geometry}));
   assert.match(await page.locator('#appCoinView').innerText(),/[万億兆京]$/);
  }
  const layout=await page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
   return {notice:rect('#homeNoticePreview .home-quick-icon'),mission:rect('#homeMissionButton .home-quick-icon'),gift:rect('#homeGiftButton .home-quick-icon'),story:rect('#homeAdventureButton'),battle:rect('.home-battle-button')};
  });
  for(const key of ['mission','gift']){assert(Math.abs(layout[key].right-layout.notice.right)<=1,'notice/side icons align');assert(Math.abs(layout[key].width-44)<=1,'44px icon');}
  assert(layout.mission.bottom<=layout.gift.top,'mission above gift');assert(Math.abs(layout.story.width-layout.battle.width)<=1,'equal action widths');assert(Math.abs(layout.story.height-layout.battle.height)<=1,'equal action heights');
  await page.screenshot({path:`${output}/organized-${viewport.width}x${viewport.height}.png`});
 }
 report.checks.push('four portrait viewports, 7/9/16 digit coin topbar containment');
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await page.locator('#homeBannerDots button').count(),5);
 await page.locator('#homeBannerDots button').nth(2).click();
 assert.equal(await page.evaluate(()=>homeBannerIndex),2);await page.waitForTimeout(4300);assert.equal(await page.evaluate(()=>homeBannerIndex),2);
 await page.locator('#homeBannerTrack button[aria-hidden="false"]').click();assert(await page.locator('#notices').isVisible());
 await page.evaluate(()=>show('home'));await page.locator('#homeBannerDots button').first().click();
 await page.locator('#homeBannerTrack button[aria-hidden="false"]').click();assert(await page.locator('#homeMissionsSheet').isVisible());
 assert.equal(await page.locator('#homeMissionsList .home-mission-row').count(),2);
 await page.evaluate(()=>{save.coins=10;save.progress.storyFlags.prologueCompleted=true;recordHomeMissionAlchemyExecution();renderHomeMissions();});
 assert.equal(await page.locator('#homeMissionCount').textContent(),'2');
 await page.locator('#homeMissionsList .home-mission-claim').first().click();
 assert.equal(await page.locator('#appCoinView').textContent(),'510');
 await page.locator('#homeMissionsList .home-mission-claim').first().click();
 assert.equal(await page.locator('#appCoinView').textContent(),'1,010');
 assert.equal(await page.locator('#homeMissionsList .home-mission-row[data-state="claimed"]').count(),2);
 assert(await page.locator('#homeMissionCount').isHidden());
 await page.locator('#homeMissionsClose').click();
 report.checks.push('mission sheet: two 500 coin claims, immediate resource refresh and badges');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#homeBannerDots button').first().click();
 await page.waitForTimeout(2400);await page.locator('#homeBannerDots button').nth(3).click();await page.waitForTimeout(2000);assert.equal(await page.evaluate(()=>homeBannerIndex),3,'dot resets timer');
 await page.waitForFunction(()=>homeBannerIndex===4,null,{timeout:3000});
 assert.equal(await page.locator('#homeBannerDots button[aria-current=true]').evaluate(dot=>[...dot.parentElement.children].indexOf(dot)),4);
 report.checks.push('banner 4s timer/reset, horizontal track, dot and destination actions, reduced-motion manual navigation');
 assert.equal(await page.locator('.home-battle-button').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(23, 28, 40)');
 report.checks.push('all animated species × 5 viewport sizes; controls above oversized monsters; character frame');
 await page.evaluate(()=>{save.homeFavoriteId='freigal';renderHome();});
 await page.waitForFunction(()=>waterHomeRecord?.art?.classList.contains('is-playing'),{timeout:10000});
 report.checks.push('transparent video plays');
 await page.locator('.home-water-monster').click();assert(await page.locator('#homeFavoriteSelect').isVisible());
 await page.evaluate(()=>show('home'));await page.locator('#homeNamePlate').click();assert(await page.locator('#homeFavoriteSelect').isVisible());
 await page.locator('.home-favorite-option').filter({has:page.locator('strong',{hasText:'スライムゴールド'})}).click();
 assert(await page.locator('#homeNamePlate').innerText().then(t=>t.includes('スライムゴールド')));
 await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>save.homeFavoriteId),'slime_gold');report.checks.push('favorite selection/save/reload');
 for(const [selector,screen] of [['#homeNoticePreview button','notices'],['#homeGiftButton','giftBox'],['.contractor-rank','contractorRank']]){
  await page.evaluate(()=>show('home'));await page.locator(selector).click();assert(await page.locator('#'+screen).isVisible());assert.equal(await page.evaluate(()=>waterHomeRecord),null);
 }
 await page.evaluate(()=>show('home'));assert.equal(await page.locator('[data-notice-unread]').first().isHidden(),true);report.checks.push('rank/notices/read indicator/gift shortcuts; media disposed on exit');
 await page.locator('[data-nav="more"]').click();await page.locator('#homeDexButton').click();assert(await page.locator('#dexHub').isVisible());await page.evaluate(()=>show('home'));
 await page.locator('#homePartyEditButton').click();assert(await page.locator('#party').isVisible());await page.locator('#rosterActions [data-roster-party]').click();assert(await page.locator('#partySet').isVisible());await page.locator('#partySetupSaveButton').click();report.checks.push('monster navigation -> party edit -> save');
 await page.evaluate(()=>show('home'));await page.locator('.home-battle-button').click();assert(await page.locator('#battleChoices').isVisible());

 await page.locator('#battleExpeditionButton').click();assert(await page.locator('#expedition').isVisible());
 await page.evaluate(()=>{expeditionSelectedMapId='grassland';expeditionSelectedDistanceId='short';expeditionSelectedUids=[expeditionAvailableInstances()[0].uid];if(!startExpedition())throw Error('expedition fixture failed');for(let i=0;i<30&&save.expeditions.active[0].status!=='complete';i++)progressActiveExpeditions(()=>.5);show('home');});
 assert(await page.locator('#homeExpeditionReturn').isVisible());assert(await page.locator('#navExpeditionReturn').isVisible());
 await page.locator('.home-battle-button').click();await page.locator('#battleExpeditionButton').click();
 await page.evaluate(()=>show('home'));assert(await page.locator('#homeExpeditionReturn').isHidden());assert(await page.locator('#navExpeditionReturn').isHidden());
 assert.equal(await page.evaluate(()=>save.expeditions.active[0].status),'complete');report.checks.push('actual expedition completion shows both badges; viewing clears badges without claiming');
 await page.locator('.home-battle-button').click();
 await page.locator('[data-wm-place="grassland"]').first().click();await page.locator('[data-wm-difficulty="d1"]').first().click();await page.locator('[data-wm-depart]').first().click();assert(await page.locator('#battle').isVisible());report.checks.push('home battle -> world map -> easy battle start');
 await page.evaluate(()=>{show('home');save.homeFavoriteId='freigal';renderHome();});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 assert.equal(await page.locator('#home video').count(),0);assert(await page.locator('.home-water-monster img').isVisible());report.checks.push('reduced-motion transparent poster');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!!waterHomeRecord?.video);
 await page.evaluate(async()=>{const original=HTMLMediaElement.prototype.canPlayType;HTMLMediaElement.prototype.canPlayType=()=>'';renderHome();HTMLMediaElement.prototype.canPlayType=original;await new Promise(requestAnimationFrame);});
 assert.equal(await page.locator('#home video').count(),0);assert(await page.locator('.home-water-monster img').isVisible());report.checks.push('unsupported codec poster');
 await page.evaluate(async()=>{renderHome();await new Promise(requestAnimationFrame);waterHomeRecord.video.onerror();});
 assert(await page.locator('.home-water-monster img').isVisible());assert.equal(await page.locator('#home video[src]').count(),0);report.checks.push('load/playback error poster');
 const cinematic=await page.evaluate(()=>{
  const overlay=document.getElementById('contractAnimation'),link=document.querySelector('link[href*="css/nonbattle-theme.css"]');
  overlay.classList.remove('hidden');
  const colors=()=>[overlay,overlay.firstElementChild].map(el=>{const s=getComputedStyle(el);return [s.color,s.borderColor];});
  link.disabled=true;const before=colors();link.disabled=false;const after=colors();overlay.classList.add('hidden');return {before,after};
 });
 assert.deepEqual(cinematic.after,cinematic.before);report.checks.push('home ink does not leak into contract cinematic');
 // Isolate real input and the virtual autoplay clock from the media/layout tests.
 const gesture=await browser.newPage({viewport:{width:412,height:780},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 gesture.on('pageerror',e=>errors.push(e.message));
 await gesture.route('**/*',route=>new URL(route.request().url()).origin===new URL(origin).origin?route.continue():route.abort());
 await gesture.goto(origin,{waitUntil:'networkidle'});
 await gesture.locator('#titleScreen').tap();
 await gesture.locator('#titleScreen').waitFor({state:'detached'});
 await gesture.evaluate(()=>{
  clearTutorialUi();save=initSave();completeTutorial();
  save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);
  document.getElementById('contractorRankUpOverlay').classList.add('hidden');
  show('home');
 });
 const viewport=gesture.locator('.home-banner-viewport');
 const track=gesture.locator('#homeBannerTrack');
 const dots=gesture.locator('#homeBannerDots button');
 const trackX=()=>track.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
 const index=()=>gesture.evaluate(()=>homeBannerIndex);
 const current=()=>track.locator('.home-banner-slide[aria-hidden=false]');
 const chosen=async i=>{
  assert.equal(await index(),i);
  assert.equal(await dots.nth(i).getAttribute('aria-current'),'true');
  assert.equal(await current().count(),1,'one in-view, keyboard-accessible banner');
  const v=await viewport.boundingBox(),s=await current().boundingBox();
  assert(Math.abs(v.x+v.width/2-s.x-s.width/2)<=2,'the selected banner is centered');
 };
 const staysHome=async()=>{
  assert(await gesture.locator('#home').isVisible(),'swipe cannot follow a banner link');
  assert(await gesture.locator('#homeMissionsSheet').isHidden(),'swipe cannot open missions');
 };
 const dot=async i=>{await dots.nth(i).tap();await chosen(i);};
 const cdp=await gesture.context().newCDPSession(gesture);
 const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y,id:1}]});
 const drag=async (dx,{follow=false,slow=true,cancel=false}={})=>{
  const b=await viewport.boundingBox(),x=Math.round(b.x+b.width/2),y=Math.round(b.y+b.height/2);
  const start=await trackX();
  await touch('touchStart',x,y);
  const samples=slow?4:2;
  for(let i=1;i<=samples;i++){
   if(slow)await gesture.waitForTimeout(105);
   const next=Math.round(x+dx*i/samples);
   await touch('touchMove',next,y);
  }
  if(follow)await gesture.waitForFunction(({start,dx})=>{
   const track=document.getElementById('homeBannerTrack');
   return Math.abs(new DOMMatrixReadOnly(getComputedStyle(track).transform).m41-start-dx)<=2;
  },{start,dx},{timeout:1500});
  await touch(cancel?'touchCancel':'touchEnd');
  await staysHome();
 };
 for(const [w,h] of [[360,640],[412,780],[430,932],[800,420]]){
  await gesture.setViewportSize({width:w,height:h});
  await dot(2);
  const width=await viewport.evaluate(el=>el.clientWidth);
  if(w===800)assert(width<w/2&&width>w*.4,'landscape banner should use its rendered half-width');
  const shy=Math.floor(width*.2)-4,over=Math.ceil(width*.2)+4;
  for(const direction of [-1,1]){
   await drag(direction*shy,{follow:true});await chosen(2);
   await drag(direction*over,{follow:true});await chosen(2-direction);
   await dot(2);
  }
 }
 await gesture.setViewportSize({width:412,height:780});
 assert.equal(await track.evaluate(el=>getComputedStyle(el).transitionDuration),'0s','reduced-motion has no carousel animation');
 const width=await viewport.evaluate(el=>el.clientWidth);
 await dot(0);
 await drag(Math.ceil(width*.24));await chosen(4);
 await drag(-Math.ceil(width*.24));await chosen(0);
 await drag(-Math.ceil(width*.24),{cancel:true});await chosen(0);
 await drag(-Math.floor(width*.12),{slow:false});await chosen(1);
 await dot(0);
 // Preserve the immediate regression above. Compare same-session touch
 // with physical contact time, an ordinary pause, and non-touch controls.
 const selectedCalls=()=>gesture.evaluate(()=>window.__bannerDotSelectionCalls);
 await gesture.evaluate(()=>{
  window.__bannerDotSelectionCalls=0;
  const select=selectHomeBanner;
  selectHomeBanner=(...args)=>{window.__bannerDotSelectionCalls++;return select(...args);};
 });
 const physicalDot=async (i,hold=52)=>{
  const r=await dots.nth(i).boundingBox(),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);
  const calls=await selectedCalls();
  await touch('touchStart',x,y);
  await gesture.waitForTimeout(hold);
  await touch('touchEnd');
  await chosen(i);
  await gesture.waitForTimeout(320);
  assert.equal(await selectedCalls(),calls+1,'a single touch activates the dot exactly once');
  await staysHome();
 };
 for(const [i,pause] of [0,0,350].entries()){
  await drag(-Math.floor(width*.12),{slow:false});await chosen(1);
  if(pause)await gesture.waitForTimeout(pause);
  if(i===0){
   // Same input driver and short contact as the original fragile sequence.
   const calls=await selectedCalls();await dot(0);
   await gesture.waitForTimeout(320);
   assert.equal(await selectedCalls(),calls+1,'a short touch activates the dot exactly once');
  }else await physicalDot(0);
 }
 const clickCalls=await selectedCalls();
 await dots.nth(1).click();await chosen(1);
 assert.equal(await selectedCalls(),clickCalls+1,'mouse activation is still handled once');
 await dots.nth(0).press('Enter');await chosen(0);
 assert.equal(await selectedCalls(),clickCalls+2,'keyboard activation is still handled once');
 await staysHome();
 // Touches which start on a dot but move, cancel, or add another pointer
 // must not gain an activation through the pointerup path.
 const position=await dots.nth(1).boundingBox();
 const x=Math.round(position.x+position.width/2),y=Math.round(position.y+position.height/2);
 const rejectCalls=await selectedCalls();
 const edgeY=Math.ceil(position.y)+1,outerY=edgeY-5;
 const edgeHits=await dots.nth(1).evaluate((dot,{x,edgeY,outerY})=>[
  dot.contains(document.elementFromPoint(x,edgeY)),dot.contains(document.elementFromPoint(x,outerY))
 ],{x,edgeY,outerY});
 assert.deepEqual(edgeHits,[true,false],'the small gesture starts on the dot and ends outside it');
 let edgeRelease;
 await gesture.evaluate(()=>document.addEventListener('pointerup',event=>{
  window.__homeDotEdgeRelease={x:event.clientX,y:event.clientY,type:event.pointerType};
 },{capture:true,once:true}));
 await touch('touchStart',x,edgeY);
 await gesture.waitForTimeout(50);
 await touch('touchMove',x,outerY);
 await touch('touchEnd');
 edgeRelease=await gesture.evaluate(()=>window.__homeDotEdgeRelease);
 assert.deepEqual(edgeRelease,{x,y:outerY,type:'touch'},'the real release is outside the captured dot');
 await gesture.waitForTimeout(330);
 assert.equal(await selectedCalls(),rejectCalls,'a touch released just outside a dot does not select through native click');
 assert.equal(await index(),0);
 await touch('touchStart',x,y);await touch('touchMove',x,y+42);await touch('touchEnd');
 await touch('touchStart',x,y);await touch('touchCancel');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1},{x:x+38,y,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-18,y,id:1},{x:x+56,y,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await gesture.waitForTimeout(330);
 assert.equal(await selectedCalls(),rejectCalls,'moved, cancelled and multiple touches on dots do not select');
 assert.equal(await index(),0);
 await staysHome();
 // If the browser recognized the pinch, normalize its zoom for later layout assertions.
 await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
 report.checks.push('banner dots: immediate and delayed touch, physical contact time, mouse and keyboard activate once; edge-release, drag, cancellation and multi-touch do not activate');
 // The normal Home screen does not scroll. Put the real banner inside a scrollable
 // ancestor to demonstrate Chromium's native vertical scrolling is not cancelled.
 const scrollArea=await gesture.evaluate(()=>{
  const v=document.querySelector('.home-banner-viewport'),shell=document.createElement('div');
  shell.id='bannerTestScroll';shell.style.cssText='height:64px;overflow-y:auto';
  v.before(shell);shell.append(v);
  const filler=document.createElement('div');filler.style.height='160px';shell.append(filler);
  const r=v.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.bottom-7)};
 });
 await touch('touchStart',scrollArea.x,scrollArea.y);
 for(const dy of [14,25,36,49]){
  await touch('touchMove',scrollArea.x,scrollArea.y-dy);await gesture.waitForTimeout(30);
 }
 await touch('touchEnd');
 await gesture.waitForFunction(()=>document.getElementById('bannerTestScroll').scrollTop>0);
 await staysHome();assert.equal(await index(),0,'vertical scroll does not select a different banner');
 await gesture.evaluate(()=>{
  const shell=document.getElementById('bannerTestScroll');shell.before(shell.firstChild);shell.remove();
 });
 await current().tap();assert(await gesture.locator('#homeMissionsSheet').isVisible(),'same genuine touch still opens a banner on tap');
 await gesture.locator('#homeMissionsClose').tap();
 report.checks.push('banner: rendered-width 20% boundary in both directions on 360/412/430 and landscape; follows real drag; touch flick, wraps, cancels, scrolls and taps');
 // Under ordinary motion, each boundary goes to the adjacent visual copy
 // and then returns to the centered real slide (rather than crossing four).
 await gesture.emulateMedia({reducedMotion:'no-preference'});
 await drag(Math.ceil(width*.26));
 assert.deepEqual(await gesture.evaluate(()=>[homeBannerIndex,homeBannerWrap?.slot]),[4,-1]);
 await gesture.waitForFunction(()=>!homeBannerWrap);await chosen(4);
 await drag(-Math.ceil(width*.26));
 assert.deepEqual(await gesture.evaluate(()=>[homeBannerIndex,homeBannerWrap?.slot]),[0,5]);
 await gesture.waitForFunction(()=>!homeBannerWrap);await chosen(0);
 report.checks.push('banner: animated wrap uses the adjacent card in both directions');
 await gesture.emulateMedia({reducedMotion:'reduce'});
 const clockTime=new Date();
 await gesture.clock.install({time:clockTime});
 await gesture.clock.pauseAt(new Date(clockTime.getTime()+1000));
 await gesture.emulateMedia({reducedMotion:'no-preference'});
 await dots.nth(1).tap();
 await gesture.clock.runFor(3500);assert.equal(await index(),1);
 const b=await viewport.boundingBox();
 await touch('touchStart',Math.round(b.x+b.width/2),Math.round(b.y+b.height/2));
 await gesture.clock.runFor(6000);assert.equal(await index(),1,'autoplay pauses even while a finger is held still');
 await touch('touchMove',Math.round(b.x+b.width*.24),Math.round(b.y+b.height/2));
 await gesture.clock.runFor(500);await touch('touchEnd');await staysHome();
 assert.equal(await index(),2);
 await gesture.clock.runFor(3990);assert.equal(await index(),2,'a committed swipe resets the full 4-second countdown');
 await gesture.clock.runFor(20);assert.equal(await index(),3);
 await gesture.emulateMedia({reducedMotion:'reduce'});
 await gesture.clock.runFor(8500);assert.equal(await index(),3,'autoplay stays off with reduced motion');
 await gesture.close();
 report.checks.push('banner: timer pauses while held, resets for 4s on swipe; reduced-motion disables timer and transition');
 assert.deepEqual(errors,[]);console.log(JSON.stringify(report,null,2));
}finally{fs.writeFileSync(output+'/report.json',JSON.stringify(report,null,2));await browser.close();server?.kill();}
