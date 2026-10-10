// Isolated CI browser only. Never connect to a player's browser or saved profile.
// Before images use runtime from ae5e064; isolation checks also disable only the new CSS.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const out='artifacts/nonbattle-theme';fs.mkdirSync(out,{recursive:true});
const manifest={status:'running',baseline:'git ae5e064 runtime, identical isolated fixtures; theme-disabled comparisons additionally test exclusions',zoomMethod:'CSS zoom 2 plus half-width reflow viewport (not native browser zoom)',cases:[],preservation:[],detailTargets:[],failures:[]};
const origin='http://127.0.0.1:4177';
let browser,server;
const baselines=new WeakMap();
const baselineRef='ae5e064';
const baselineFiles=new Set(execFileSync('git',['ls-tree','-r','--name-only',baselineRef],{encoding:'utf8'}).trim().split('\n'));
const baselineCache=new Map();
async function both(page,fn,arg){const baseline=baselines.get(page);if(baseline)await baseline.evaluate(fn,arg);return page.evaluate(fn,arg);}
async function viewport(page,size){await baselines.get(page)?.setViewportSize(size);await page.setViewportSize(size);}

const write=()=>fs.writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2));
function verify(condition,message){if(!condition){manifest.failures.push(message);write();}}
async function theme(page,enabled){
 await page.locator('link[href*="css/nonbattle-theme.css"]').evaluate((link,enabled)=>{link.disabled=!enabled;},enabled);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function fixture(page,variant='normal'){
 await both(page,variant=>{
  clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
  save.progress.tutorial.status='completed';
  Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);
  save.instances=[];save.party=[];
  if(variant!=='empty'){
   for(let index=0;index<(variant==='many'?40:4);index++)addInstance(['freigal','aquaron','grassbeat','volteck'][index%4],100);
   save.party=save.instances.slice(0,3).map(ins=>ins.uid);
  }
  save.caught=variant==='empty'?[]:M.map(mon=>mon.id);save.mapDex=MAPS.map(map=>map.id);save.itemDex=ITEM_DEX_ITEMS.map(item=>item.id);
  save.items=Object.fromEntries(ITEM_DEX_ITEMS.map(item=>[item.id,variant==='empty'?0:99]));
  save.skillCards=Object.fromEntries(EQUIPPABLE_MOVE_CARDS.map(card=>[card.id,variant==='empty'?0:9]));
  if(variant==='long'){
   by('freigal').name='天空を巡る白金の守護者・とても長い名前のモンスター';
   MONSTER_MOVE_CARDS[0].name='天空を巡る白金の守護者・超長名称の複合属性専用技';
  }
  ensureContractorState().pendingRankUps=[];clearTimeout(contractorRankUpTimer);
  document.querySelector('#contractorRankUpOverlay')?.classList.add('hidden');
  show('home');
 },variant);
}
async function route(page,id){
 await both(page,id=>{
  clearTutorialUi();
  if(id==='expedition')return showExpedition();
  if(id==='alchemy')return showAlchemy();
  if(id==='fusion')return showFusion();
  if(id==='typeChart')return showTypeChart();
  if(id==='tutorialRequestReport'){show(id);renderTutorialSupplyReward();return;}
  if(id==='tutorialStellaCard'){show(id);renderTutorialStellaSkillCard();return;}
  if(id==='diagnosticsScreen')return showDiagnosticsScreen();
  if(id==='evolution'){pendingEvolutions=[];checkEvolution(save.instances[0]);processNextEvolution();return;}
  if(id==='battleChoices')return startBattleFromParty();
  if(id==='skillEdit'&&save.instances.length)return openSkillEdit(save.instances[0].uid);
  show(id);
 },id);
 await page.waitForTimeout(350);
 assert(await page.locator(`#${id}`).isVisible(),`${id} route is visible`);
}
async function capture(page,name,{validate=true}={}){
 // Route changes intentionally preserve gameplay scroll. Normalize the two QA
 // documents so paired evidence is not affected by the previous case's position.
 await both(page,()=>{
  window.scrollTo({top:0,left:0,behavior:'instant'});
  const screen=document.querySelector('.screen.active');if(screen)screen.scrollTop=0;
 });
 const entry={name,viewport:page.viewportSize()};
 for(const [enabled,label] of [[false,'before'],[true,'after']]){
  const target=enabled?page:baselines.get(page);
  if(enabled)await theme(page,true);entry[label]=`${name}-${label}.png`;
  await target.screenshot({path:`${out}/${entry[label]}`,fullPage:true,animations:'disabled'});
 }
 entry.layout=await page.evaluate(()=>{
  const screen=document.querySelector('.screen.active');
  const overflow=[...screen.querySelectorAll('button,select,input,summary,h1,h2,h3,.skill-card-title')].filter(el=>{
   if(el.closest('.wm-map-scroll'))return false; // Tested as a clipped, reachable pan surface below.
   const r=el.getBoundingClientRect();return r.width&&r.height&&(r.left < -1||r.right>innerWidth+1);
  }).map(el=>({tag:el.tagName,id:el.id,text:el.textContent.slice(0,80)}));
  return {screen:screen.id,family:screen.dataset.themeFamily,bodyFamily:document.body.dataset.nonbattleTheme,
   horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,overflow};
 });
 entry.mapScrollers=[];
 for(const scroller of await page.locator('.screen.active .wm-map-scroll:visible').all()){
  const geometry=await scroller.evaluate(el=>{
   const r=el.getBoundingClientRect();return {left:r.left,right:r.right,viewport:innerWidth,overflowX:getComputedStyle(el).overflowX,clientWidth:el.clientWidth,scrollWidth:el.scrollWidth};
  });
  verify(geometry.left>=-1&&geometry.right<=geometry.viewport+1,`${name}: map scrolling container fits viewport`);
  verify(['auto','scroll'].includes(geometry.overflowX),`${name}: map provides horizontal scrolling`);
  if(geometry.scrollWidth>geometry.clientWidth+1){
   verify(await scroller.evaluate(el=>{const old=el.scrollLeft;el.scrollLeft=el.scrollWidth;const moved=el.scrollLeft>0;el.scrollLeft=old;return moved;}),`${name}: map horizontal scrolling works`);
  }
  const nodes=[];
  for(const node of await scroller.locator('button:visible').all()){
   await node.evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
   const measurement=await node.evaluate(async el=>{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const r=el.getBoundingClientRect(),clip=el.closest('.wm-map-scroll').getBoundingClientRect();
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return {text:el.textContent.slice(0,80),insideClip:r.left>=clip.left-1&&r.right<=clip.right+1,
     insideViewport:r.left>=-1&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight,uncovered:hit===el||el.contains(hit)};
   });
   nodes.push(measurement);
   verify(measurement.insideClip&&measurement.insideViewport&&measurement.uncovered,`${name}: map node is reachable ${JSON.stringify(measurement)}`);
  }
  entry.mapScrollers.push({geometry,nodes});
 }
 const control=page.locator('.screen.active button:visible:not([disabled])').first();
 if(await control.count()){
  // 'IfNeeded' accepts a control hidden under a sticky header as in-view.
  // Center it as a user scroll would, then sample after layout settles.
  await control.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  entry.firstControl=await control.evaluate(async el=>{
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
   return {text:el.textContent.slice(0,80),width:r.width,height:r.height,rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom},scrollY,hit:hit?{id:hit.id,tag:hit.tagName,className:hit.className}:null,uncovered:hit===el||el.contains(hit)};
  });
 }
 manifest.cases.push(entry);write();
 if(validate){
  if(entry.firstControl)verify(entry.firstControl.uncovered,`${name}: first enabled control is covered`);
  verify(!entry.layout.horizontalOverflow,`${name}: document horizontal overflow`);
  verify(entry.layout.overflow.length===0,`${name}: controls/headings overflow ${JSON.stringify(entry.layout.overflow)}`);
  verify(entry.layout.family&&entry.layout.family===entry.layout.bodyFamily,`${name}: active family matches body`);
 }
}
async function styles(page,selector,{rootOnly=false}={}){
 return page.locator(selector).evaluateAll((nodes,rootOnly)=>nodes.flatMap(root=>rootOnly?[root]:[root,...root.querySelectorAll('*')]).map(el=>{
  const s=getComputedStyle(el);const keys=['color','backgroundColor','backgroundImage','borderColor','borderRadius','boxShadow','fontFamily','fontSize','fontWeight','lineHeight','display','position','padding','margin','width','height','filter','opacity'];
  return {tag:el.tagName,id:el.id,css:Object.fromEntries(keys.map(key=>[key,s[key]]))};
 }),rootOnly);
}
async function preservation(page,selector,label,{rootOnly=false}={}){
 const name=`${page.viewportSize().width}x${page.viewportSize().height}-${label.replaceAll(' ','-')}`;
 await theme(page,false);const before=await styles(page,selector,{rootOnly});
 await page.screenshot({path:`${out}/${name}-disabled.png`,fullPage:true,animations:'disabled'});
 await theme(page,true);const after=await styles(page,selector,{rootOnly});
 await page.screenshot({path:`${out}/${name}-enabled.png`,fullPage:true,animations:'disabled'});
 const isolated=JSON.stringify(after)===JSON.stringify(before);
 verify(before.length>0,`${label} preservation has actual nodes`);
 verify(isolated,`${name}: computed styles changed when theme enabled`);
 manifest.preservation.push({label,selector,rootOnly,nodes:before.length,result:isolated?'PASS':'FAIL',...(!isolated?{stylesBefore:before,stylesAfter:after}:{}),before:`${name}-disabled.png`,after:`${name}-enabled.png`});write();
}
try{
 server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4177'],{stdio:['ignore','pipe','inherit']});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('preview server startup timeout')),15000);server.stdout.once('data',()=>{clearTimeout(timer);resolve();});server.once('error',reject);server.once('exit',code=>reject(Error(`preview server exited ${code}`)));});
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  // All external requests are blocked before navigation, including analytics and profiles.
  await context.route('**/*',request=>new URL(request.request().url()).origin===origin?request.continue():request.fulfill({status:204,body:''}));
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.dismiss());
  await page.goto(`${origin}/?legacy=1`,{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  const baselineContext=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
  await baselineContext.route('**/*',async request=>{
   const url=new URL(request.request().url());
   if(url.origin!==origin)return request.fulfill({status:204,body:''});
   const path=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
   if(/\.(?:html|js|css)$/.test(path)&&baselineFiles.has(path)){
    if(!baselineCache.has(path))baselineCache.set(path,execFileSync('git',['show',`${baselineRef}:${path}`],{maxBuffer:20*1024*1024}));
    return request.fulfill({status:200,contentType:path.endsWith('.css')?'text/css':path.endsWith('.js')?'application/javascript':'text/html',body:baselineCache.get(path)});
   }
   return request.continue();
  });
  const baseline=await baselineContext.newPage();baseline.on('pageerror',error=>errors.push(`baseline: ${error.message}`));baseline.on('dialog',dialog=>dialog.dismiss());
  await baseline.goto(`${origin}/?legacy=1`,{waitUntil:'networkidle'});
  await baseline.locator('#titleScreen').click();await baseline.locator('#titleScreen').waitFor({state:'detached'});
  baselines.set(page,baseline);
  await fixture(page);
  // Every registered nonbattle route is captured; route-specific renderers are used where needed.
  const ids=await page.evaluate(()=>Object.keys(NONBATTLE_SCREEN_THEMES));
  for(const id of ids){await route(page,id);await capture(page,`${width}x${height}-${id}`);}
  for(const [id,detail] of [['dex','dexDetail'],['characterDex','characterDexDetail'],['mapDex','mapDexDetail'],['itemDex','itemDexDetail'],['skillDex','skillDexDetail']]){
   await route(page,id);
   await both(page,id=>{
    if(id==='dex')showDexDetail('freigal');
    if(id==='characterDex')showCharacterDexDetail('elna_beginner');
    if(id==='mapDex')showMapDexDetail('grassland');
    if(id==='itemDex')showItemDexDetail(ITEM_DEX_ITEMS[0].id);
    if(id==='skillDex')showSkillDexDetail(EQUIPPABLE_MOVE_CARDS[0].id);
   },id);
   assert((await page.locator(`#${detail}`).textContent()).trim(),`${detail} rendered`);
   // Check the renderer's own scroll destination before capture resets scroll.
   await page.waitForTimeout(350);
   const target=await page.locator(`#${detail}`).evaluate(el=>{
    const r=el.getBoundingClientRect(),heading=el.querySelector('h1,h2,h3,.skill-card-title');
    const header=document.querySelector('.app-topbar')?.getBoundingClientRect();
    return {top:r.top,headingTop:heading?.getBoundingClientRect().top,headerBottom:header?.bottom||0,viewportHeight:innerHeight};
   });
   manifest.detailTargets.push({width,height,detail,...target});write();
   verify(target.top>=target.headerBottom-1&&target.top<target.viewportHeight,`${detail}: scroll anchor visible below sticky header ${JSON.stringify(target)}`);
   if(target.headingTop!==undefined)verify(target.headingTop>=target.headerBottom-1,`${detail}: heading is not hidden by sticky header`);
   await capture(page,`${width}x${height}-${detail}`);
  }
  assert.equal(await page.evaluate(()=>{show('home');return document.querySelector('#homeAdventureKicker').textContent;}),'序章クリア');
  assert.equal(await page.locator('#homeLocationLabel').textContent(),'世界の狭間','completed prologue home location');
  for(const variant of ['empty','many','long']){
   await fixture(page,variant);
   for(const id of ['home','party','partySet','skillDex',...(variant==='empty'?[]:['skillEdit'])]){
    await route(page,id);await capture(page,`${width}x${height}-${variant}-${id}`);
   }
  }
  await fixture(page);
  // CSS zoom exercises enlarged controls; separate half-width viewport exercises reflow.
  await both(page,()=>document.documentElement.style.zoom='2');
  for(const id of ['home','partySet','skillDex','shop']){await route(page,id);await capture(page,`${width}x${height}-zoom200-${id}`);}
  await both(page,()=>document.documentElement.style.zoom='');
  await viewport(page,{width:Math.max(160,Math.floor(width/2)),height:Math.floor(height/2)});
  await route(page,'home');await capture(page,`${width}x${height}-zoom-reflow-home`);
  await viewport(page,{width,height});
  await both(page,()=>{startBattleFromParty();startChosenBattle('grassland','slime','easy');});
  assert(await page.locator('#battle').isVisible());
  assert.equal(await page.locator('body').getAttribute('data-nonbattle-theme'),null,'battle disables body theme');
  await preservation(page,'#battle','battle');
  // Exclude hidden nonbattle descendants of body, but include global chrome
  // subtrees to detect inherited or overly broad palette/layout regressions.
  await preservation(page,'body','battle body',{rootOnly:true});
  await preservation(page,'.app-topbar','battle topbar');
  await preservation(page,'.app-bottom-nav','battle bottom navigation');
  await page.screenshot({path:`${out}/${width}x${height}-battle-preserved.png`,fullPage:true});
  await route(page,'battleItemSelect');await preservation(page,'#battleItemSelect','battle item picker');
  await route(page,'contractConfirm');await preservation(page,'#contractConfirm','contract confirmation');
  // Compare cinematic subtree in a fixed stage to avoid timer-dependent false differences.
  await page.evaluate(()=>{show('home');document.querySelector('#contractAnimation').classList.remove('hidden');document.querySelector('#contractPaper').className='contract-paper';});
  await preservation(page,'#contractAnimation','contract cinematic');
  await page.screenshot({path:`${out}/${width}x${height}-contract-preserved.png`,fullPage:true});
  await page.evaluate(()=>document.querySelector('#contractAnimation').classList.add('hidden'));
  await route(page,'skillGacha');
  await page.evaluate(()=>{const overlay=document.querySelector('#skillGachaPresentation');overlay.hidden=false;overlay.setAttribute('aria-hidden','false');});
  await preservation(page,'#skillGachaPresentation','skill gacha cinematic');
  await page.screenshot({path:`${out}/${width}x${height}-skill-gacha-preserved.png`,fullPage:true});
  assert.equal(errors.length,0,errors.join('\n'));
  await baselineContext.close();await context.close();
 }
 assert.equal(manifest.failures.length,0,`Layout/isolation failures (${manifest.failures.length}):\n${manifest.failures.join('\n')}`);
 manifest.status='PASS';write();console.log(`PASS ${manifest.cases.length} nonbattle screenshot pairs; ${manifest.preservation.length} isolation comparisons`);
}catch(error){
 manifest.status='FAIL';manifest.error=error.stack||String(error);
 for(const [index,page] of (browser?.contexts().flatMap(context=>context.pages())||[]).entries()){
  try{await page.screenshot({path:`${out}/failure-${index}.png`,fullPage:true,timeout:10000});}catch{}
 }
 write();throw error;
}finally{await browser?.close();server?.kill();}
