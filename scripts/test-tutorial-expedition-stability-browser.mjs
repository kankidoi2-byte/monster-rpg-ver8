// Focused regression fixture; the separate prologue-taps journey starts fresh
// and advances only through screen taps. This fixture reproduces sticky-header
// transitions at the expedition-active checkpoint without replaying every scene.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','4199'],{stdio:['ignore','pipe','inherit']});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const out='artifacts/save-failure-ui/expedition-stability';fs.mkdirSync(out,{recursive:true});
try{
 for(const [width,height,fontSize] of [[360,640,13],[360,640,14],[412,780,13]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4199/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.addStyleTag({content:`#tutorialBubble p{font-size:${fontSize}px}`});
  await page.evaluate(()=>{
   clearTutorialUi();save=initSave();ensureTutorialStarterContracts();commitTutorialElnaContract();
   const f=tutorialOwnedStarterInstance('freigal'),a=tutorialOwnedStarterInstance('aquaron'),e=tutorialElnaContractInstance(),g=addInstance('galdra',1);
   save.party=[g.uid,a.uid,e.uid];save.progress.tutorial.alchemyLessonCompleted=true;save.progress.tutorial.alchemyLessonPrepared=true;
   save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);setTutorialStep('expedition_dispatch');show('expedition');
   expeditionSelectedMapId='grassland';expeditionSelectedDistanceId='short';expeditionSelectedUids=[f.uid];renderExpedition();
   startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'expedition_dispatch',persist:true});startExpedition();
  });
  await page.waitForFunction(()=>tutorialCurrentStepId()==='expedition_active');await page.waitForTimeout(400);
  const samples=await page.evaluate(async()=>{
   const points=[];for(let i=0;i<30;i++){
    await new Promise(requestAnimationFrame);
    const target=tutorialUiState.target,r=target.getBoundingClientRect(),bubble=document.getElementById('tutorialBubble').getBoundingClientRect();
    points.push([r.top+r.height/2,bubble.top,scrollY]);
    if(!target.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)))throw Error('target center is obscured');
   }return points;
  });
  for(const axis of [0,1,2])assert(Math.max(...samples.map(p=>p[axis]))-Math.min(...samples.map(p=>p[axis]))<1,`stable target/guide/scroll at ${width}x${height}, font ${fontSize}`);
  const point=await page.locator('#tutorialNextButton').evaluate(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,hit:el.contains(document.elementFromPoint(x,y))}});
  assert(point.hit,'Next center must be tappable');await page.touchscreen.tap(point.x,point.y);
  await page.waitForFunction(()=>tutorialCurrentStepId()==='prologue_epilogue');assert.deepEqual(errors,[]);
  await page.screenshot({path:`${out}/${width}-${fontSize}.png`});
  console.log(`PASS expedition stable ${width}x${height} font ${fontSize}: 30 frames, target/Next centers, physical Next tap advances.`);
  await context.close();
 }
}finally{await browser.close();server.kill()}
