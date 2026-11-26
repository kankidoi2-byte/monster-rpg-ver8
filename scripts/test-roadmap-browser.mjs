import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4262'],{stdio:['ignore','pipe','inherit']});
const out=process.env.ROADMAP_EVIDENCE||'artifacts/skill-card-layout/roadmap';fs.mkdirSync(out,{recursive:true});
let browser;const errors=[];
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 for(const width of [360,412,430]){
  const context=await browser.newContext({viewport:{width,height:800},hasTouch:true,reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:4262/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  // Persist a progressed, populated save, reload it, then observe every storage write while browsing.
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.contractor.pendingRankUps=[];save.coins=12345;save.items.upper_potion=7;saveGame();});
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  const before=await page.evaluate(()=>{clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');show('moreMenu');clearTimeout(contractorRankUpTimer);save.contractor.pendingRankUps=[];document.getElementById('contractorRankUpOverlay').classList.add('hidden');saveGame();window.roadmapWrites=[];const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(!k.startsWith('mb_analytics_'))roadmapWrites.push(k);return set.call(this,k,v);};return {save:JSON.stringify(save),storage:JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.startsWith('mb_analytics_')).sort(([a],[b])=>a.localeCompare(b))))};});
  assert.equal(await page.locator('#feedbackMenuButton + #roadmapMenuButton').count(),1);
  await page.locator('#roadmapMenuButton').click();assert(await page.locator('#roadmap.active').isVisible());
  assert.equal(await page.locator('#roadmap .lh').count(),3);assert.equal(await page.locator('#roadmap .band').count(),3);assert.equal(await page.locator('#roadmap .cell').count(),9);
  assert(await page.locator('#roadmap .rail').evaluateAll(rails=>rails.every(r=>{const b=r.parentElement.getBoundingClientRect(),x=r.getBoundingClientRect();const last=[...r.parentElement.querySelectorAll('.cell')].slice(-3).find(c=>c.style.gridColumn===r.style.gridColumn).getBoundingClientRect();return Math.abs(x.top-b.top)<2&&Math.abs(x.bottom-last.bottom)<2;})));
  const goal=page.locator('#roadmap button[data-roadmap-goal="app"]');
  assert.equal(await goal.count(),1);
  assert.equal(await goal.locator('.roadmap-goal-label').innerText(),'ゴール');
  assert.equal(await goal.locator('strong').innerText(),'アプリ版の配信');
  assert.equal(await goal.locator('.roadmap-goal-summary').innerText(),'この冒険を、スマートフォンのアプリで。');
  assert.equal(await goal.locator('img,svg,.wipb,.mystery').count(),0);
  await goal.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  assert(await goal.evaluate(el=>{
   const board=el.parentElement, lanes=[...board.querySelectorAll('.cell')].slice(-3);
   const connectors=[...board.querySelectorAll('.roadmap-goal-connector')];
   const rect=el.getBoundingClientRect(), rows=lanes.map(c=>c.getBoundingClientRect());
   const recent=document.querySelector('#roadmapDoneHeading').getBoundingClientRect();
   const nav=document.querySelector('.app-bottom-nav').getBoundingClientRect();
   const text=[...el.children].map(c=>c.getBoundingClientRect());
   return Math.abs(rect.left-rows[0].left)<=2&&Math.abs(rect.right-rows[2].right)<=2&&
    connectors.length===3&&connectors.every((connector,i)=>{
     const line=connector.getBoundingClientRect(),lane=rows[i], style=getComputedStyle(connector,'::before');
     return Math.abs(line.top-lane.bottom)<=2&&Math.abs(line.bottom-rect.top)<=2&&
      Math.abs((line.left+line.right-lane.left-lane.right)/2)<=2&&line.height>0&&
      parseFloat(style.width)>0&&parseFloat(style.height)>0;
    })&&rect.bottom<=recent.top&&rect.bottom<=nav.top&&rect.left>=0&&rect.right<=innerWidth&&
    text.every((b,i)=>b.top>=rect.top&&b.bottom<=rect.bottom&&b.left>=rect.left&&b.right<=rect.right&&
      el.children[i].scrollWidth<=el.children[i].clientWidth+1&&(!i||text[i-1].bottom<=b.top));
  }),`${width}px: three visible lane connectors, board-wide goal, no overlap or navigation clipping`);
  if(width===360)await page.screenshot({path:`${out}/app-goal-360.png`});
  await goal.tap();
  const sheet=page.locator('#sheet.open');
  assert(await sheet.isVisible());
  assert.equal(await sheet.locator('#roadmapSheetTitle').innerText(),'アプリ版の配信');
  assert.equal(await sheet.locator('.lead').innerText(),'ストーリーも、絵と音も、システムも、すべてはここへ向かっています。モンスターバトルを、スマートフォンのアプリとして届けることが、この開発のゴールです。');
  assert.deepEqual(await sheet.locator('li').allTextContents(),['ストアからインストールして遊べるように','機種を変えても、データを引き継げるように','ここまでの予定が、ひとつのアプリにまとまって届く']);
  assert.equal(await sheet.locator('img,svg,.chip').count(),0);
  if(width===360)await page.screenshot({path:`${out}/app-goal-detail-360.png`});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#sheet').getAttribute('aria-hidden'),'true');
  await goal.tap();await page.locator('#close').tap();assert.equal(await page.locator('#sheet').getAttribute('aria-hidden'),'true');
  const expectedWip=await page.evaluate(()=>ROADMAP.items.filter(item=>item.wip).map(item=>item.id).sort());
  const displayedWip=await page.locator('#roadmap .wipb').evaluateAll(badges=>badges.map(b=>b.closest('.card').dataset.id).sort());
  assert.deepEqual(displayedWip,expectedWip);
  assert(await page.locator('#roadmap .node.wip').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n,'::before').animationName==='none'&&getComputedStyle(n,'::before').backgroundColor!=='rgb(255, 255, 255)')));
  assert.equal(await page.locator('#roadmap .main').count(),3);assert.equal(await page.locator('#roadmap .side').count(),1);
  assert(await page.locator('#roadmap .side .card').evaluateAll(cards=>cards.every(c=>getComputedStyle(c).borderStyle==='dashed'&&c.getBoundingClientRect().height<150)));
  await page.locator('[data-lane="story"]').click();assert.equal(await page.locator('#roadmap .cell.dim').count(),6);assert.equal(await page.locator('[data-lane="story"]').getAttribute('aria-pressed'),'true');await page.locator('[data-lane="story"]').click();assert.equal(await page.locator('#roadmap .cell.dim').count(),0);
  const ids=await page.locator('#roadmap [data-id]').evaluateAll(cards=>cards.map(c=>c.dataset.id));
  for(const [index,id] of ids.entries()){
   await page.locator(`[data-id="${id}"]`).click();assert(await page.locator('#sheet.open').isVisible());
   assert.equal(await page.locator('#roadmapSheetTitle').innerText(),await page.evaluate(id=>ROADMAP.items.find(i=>i.id===id).title,id));
   if(id==='prologue'){assert.equal(await page.locator('#sheet .syn p').innerText(),await page.evaluate(()=>ROADMAP.items.find(i=>i.id==='prologue').synopsis.text));await page.screenshot({path:`${out}/synopsis-${width}.png`});}
   if(index%2)await page.locator('#mask').click({position:{x:10,y:10}});else await page.locator('#close').click();
   assert.equal(await page.locator('#sheet').getAttribute('aria-hidden'),'true');
  }
  await page.locator('[data-id="prologue"]').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#sheet').getAttribute('aria-hidden'),'true');
  assert.equal(await page.locator('#doneList>div').count(),4);await page.locator('#more').click();assert.equal(await page.locator('#doneList>div').count(),await page.evaluate(()=>ROADMAP.done.length));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no page horizontal scroll');
  assert(await page.locator('#roadmap').evaluate(root=>[...root.querySelectorAll('.card h4,.card p,.lh,.band,.done-list')].every(el=>el.scrollWidth<=el.clientWidth+1)),'no text horizontal overflow');
  await page.screenshot({path:`${out}/roadmap-${width}.png`,fullPage:true});
  await page.evaluate(()=>window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
  assert(await page.locator('#roadmapNote').evaluate(n=>n.getBoundingClientRect().bottom<=document.querySelector('.app-bottom-nav').getBoundingClientRect().top),'notes above navigation');
  await page.locator('#roadmapBack').click();assert(await page.locator('#moreMenu.active').isVisible());
  const after=await page.evaluate(()=>({save:JSON.stringify(save),storage:JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>!k.startsWith('mb_analytics_')).sort(([a],[b])=>a.localeCompare(b))))}));assert.deepEqual(after,before);assert.deepEqual(await page.evaluate(()=>roadmapWrites),[]);
  await context.close();
 }
 // Change only the data file response: stage and completed-list updates need no renderer edit.
 const page=await browser.newPage();
 await page.route('**/js/roadmap-data.js?*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('js/roadmap-data.js','utf8').replace(/  goal:\{[\s\S]*?(?=  items:\[)/,'').replace("id:'material',lane:'sys',stage:'now'","id:'material',lane:'sys',stage:'later'").replace('  done:[',"  done:[{title:'追加テスト',lane:'sys',note:'追加'},")}));
 await page.goto('http://127.0.0.1:4262/?legacy=1',{waitUntil:'networkidle'});
 assert.equal(await page.locator('[data-id="material"]').evaluate(c=>c.closest('.cell').style.gridRow),'6');
 assert.equal(await page.locator('#doneList>div').first().locator('span').nth(1).innerText(),'追加テスト');
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{clearTutorialUi();show('moreMenu');});await page.locator('#roadmapMenuButton').click();
 assert(await page.locator('#roadmap.active').isVisible());
 assert.equal(await page.locator('#roadmap [data-roadmap-goal],#roadmap .roadmap-goal-connector').count(),0);
 assert(await page.locator('#roadmapDoneHeading').isVisible());
 assert(await page.locator('#roadmap .rail').evaluateAll(rails=>rails.every(r=>{const b=r.parentElement.getBoundingClientRect(),x=r.getBoundingClientRect();return Math.abs(x.top-b.top)<2&&Math.abs(x.bottom-(b.bottom-20))<2;})));
 assert.deepEqual(errors,[]);console.log('PASS roadmap acceptance 1–9: navigation, grid/rails, WIP, main/side, focus, all sheets/synopsis, data-only updates, 360/412/430px, loaded save and zero game-save writes.');
}finally{await browser?.close();server.kill();}
