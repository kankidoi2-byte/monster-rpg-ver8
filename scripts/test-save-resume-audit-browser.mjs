// Verification-only: never run against a public URL or an existing browser profile.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const source='0de5be562f1f9531b699667df2e823d7bc3ea551';
const out='artifacts/save-resume-audit';fs.mkdirSync(out,{recursive:true});
const report={source,testCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),cases:[],limitations:['Chromium mobile emulation, not physical Android/Chromebook.','Synthetic progression checkpoints; not an end-to-end story walkthrough.','External APIs blocked, including personal gifts and acknowledgements.','Synchronous primary-write interior cannot be interrupted by an ordinary UI reload; quota injection is recorded separately.','Tab close/reopen retains the same disposable context; full browser/OS crash and power loss are untested.']};
assert.equal(execFileSync('git',['diff',source,'--','js','css','index.html','images'],{encoding:'utf8'}),'','Product tree must match pinned main');
const root=process.cwd();
const server=http.createServer((req,res)=>{
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'none'; worker-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'");res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.writeHead(405).end();return;}
 let p;try{p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));}catch{res.writeHead(400).end();return;}
 if(p===root)p+='/index.html';if(!p.startsWith(root+'/')){res.writeHead(403).end();return;}
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.webm':'video/webm','.png':'image/png'})[path.extname(p)]||'application/octet-stream');res.end(b);});
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,url=origin+'/?legacy=1';
const browser=await chromium.launch({headless:true,args:['--disable-background-networking']});report.browser=browser.version();
const routes=['story22','finale','map-final','battle','expedition','gift'];
const variants=['baseline','pre-reload','pre-reopen','post-reload','post-reopen','quota-reload-1','quota-reload-2','quota-reopen-1','quota-reopen-2'];
async function boot(p){await p.goto(url,{waitUntil:'load'});await p.locator('#titleScreen').click();await p.locator('#titleScreen').waitFor({state:'detached'});await quiet(p);}
async function quiet(p){await p.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay')?.classList.add('hidden');});}
async function seed(p,route){await p.evaluate(route=>{
 clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);save.instances=[];save.party=[];const a=addInstance('galdra',30);a.uid='audit-party';save.party=[a.uid];save.coins=500;save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay')?.classList.add('hidden');
 if(route==='story22'||route==='finale'){
  const id=route==='finale'?'pb_ep':'pb_22';for(const e of prologuePart2Episodes()){if(e.id===id)break;save.prologuePart2.episodes[e.id]={...prologuePart2DefaultEpisode(),completed:true,rewardClaimed:true};}
  save.prologuePart2.episodes[id]={...prologuePart2DefaultEpisode(),cursor:prologuePart2Episode(id).steps.at(-1).id,rewardTargetUids:[a.uid],wonBattleIds:prologuePart2Episode(id).steps.filter(s=>s.kind==='battle').map(s=>s.battleId)};
 }
 if(route==='map-final'){
  openMapStory('grassland_whose');const es=currentMapStory().episodes,end=es.at(-1),s=mapStoryState();for(const e of es)s.episodes[e.id]={completed:e!==end,firstVictory:true,firstRewardClaimed:true,victoryCount:1};s.resume={episodeId:end.id,phase:'post',nodeId:null,attemptId:null,rewardCommitted:true,postPending:true,participantUids:[a.uid]};
 }
 if(route==='expedition'){
  const b=addInstance('freigal',1);b.uid='audit-expedition';save.expeditions.active=[{id:'audit-exp',mapId:'grassland',distanceId:'short',memberUids:[b.uid],progress:1,requiredWins:1,status:'complete',suitability:{grade:'C',total:10,greatRate:0},reward:{coins:120,exp:10,items:{potion:2},great:false}}];
 }
 if(route==='gift'){save.giftClaimedIds=[];save.giftHistory=[];}
 save.contractor.pendingRankUps=[];if(!saveGame())throw Error('fixture save failed');show('home');
 },route);await openRoute(p,route);}
async function openRoute(p,route){await quiet(p);await p.evaluate(route=>{
 if(route==='story22'||route==='finale')openProloguePart2(route==='finale'?'pb_ep':'pb_22');
 if(route==='map-final'){openMapStory('grassland_whose');startMapStoryEpisode(currentMapStory().episodes.at(-1).id);}
 if(route==='expedition')showExpedition();if(route==='gift')showGiftBox();
 if(route==='battle'){
  prepareBattleParty();const request=createHuntRequest(MAPS.find(m=>m.id==='grassland'),by('slime'),'normal',[],{allowOvertier:false});request.battleMode='single';request.invasionEnemyId=null;request.secondEnemyId=null;beginChosenBattle('grassland','slime','normal',request);
 }
 },route);if(route==='gift')await p.locator('[data-gift-detail="developer:20261102-present-box-open"]').click();}
async function state(p,route){return p.evaluate(route=>{
 const key=MonsterProfiles.key(SAVE_KEY),raw=localStorage.getItem(key),disk=JSON.parse(raw);function pick(s){return {coins:s.coins,items:s.items,instances:s.instances.map(i=>({uid:i.uid,id:i.id,level:i.level,exp:i.exp})),wins:s.history.wins,expeditions:s.expeditions,giftClaimedIds:s.giftClaimedIds,giftHistory:(s.giftHistory||[]).map(g=>g.id),story:route==='story22'||route==='finale'?s.prologuePart2:null,map:route==='map-final'?s.mapStories:null,authority:route==='finale'?s.authority:null};}
 return {memory:pick(save),disk:pick(disk),screen:document.querySelector('.screen.active')?.id,text:document.querySelector('.screen.active')?.innerText,notice:document.getElementById('uiNotice')?.innerText,dialog:document.querySelector('dialog[open]')?.innerText,writes:window.auditWrites||[]};
 },route);}
async function arm(p,fail=false){await p.evaluate(fail=>{window.auditWrites=[];window.auditSet=Storage.prototype.setItem;window.auditFail=fail;const key=MonsterProfiles.key(SAVE_KEY);Storage.prototype.setItem=function(k,v){if(k===key&&window.auditFail)throw Error('AUDIT injected primary quota');const result=window.auditSet.call(this,k,v);if(k===key)window.auditWrites.push({at:performance.now(),coins:JSON.parse(v).coins});return result;};},fail);}
async function action(p,route){
 if(route==='story22')await p.getByRole('button',{name:'第22話を終える',exact:true}).click();
 if(route==='finale')await p.getByRole('button',{name:'序章を終える',exact:true}).click();
 if(route==='map-final')await p.locator('#mapStoryContent').getByRole('button',{name:/物語を終える/}).click();
 if(route==='expedition')await p.getByRole('button',{name:'報酬を受け取る',exact:true}).click();
 if(route==='gift')await p.locator('#giftDialogClaim').click();
 if(route==='battle'){for(let i=0;i<20;i++){if(await p.evaluate(()=>battleRewardGranted||normalVictoryPending()))break;await p.locator('#commands .skill-button').first().click();await p.waitForFunction(()=>!busy||battleRewardGranted||normalVictoryPending(),null,{timeout:20000});} }
 if(route==='gift')await p.waitForFunction(()=>!giftClaimBusy);}
async function recovered(p,route,already){await quiet(p);if(!already){await openRoute(p,route);return;}
 if(route==='story22'||route==='finale'){
  await p.evaluate(route=>{const id=route==='finale'?'pb_ep':'pb_22';openProloguePart2(id,{replay:true});prologuePart2Ui.index=prologuePart2Episode(id).steps.length-1;renderProloguePart2();},route);
  await p.getByRole('button',{name:'読み返しを終える',exact:true}).click();
 }else if(route==='map-final'){await p.evaluate(()=>openMapStory('grassland_whose'));}
 else if(route==='expedition'){await p.evaluate(()=>showExpedition());assert.equal(await p.getByRole('button',{name:'報酬を受け取る',exact:true}).count(),0);}
 else if(route==='gift'){await p.evaluate(()=>showGiftBox());assert.equal(await p.locator('[data-gift-detail="developer:20261102-present-box-open"]').count(),0);await p.locator('#giftHistoryTab').click();await p.locator('[data-gift-detail="developer:20261102-present-box-open"]').click();assert.equal(await p.locator('#giftDialogClaim').isVisible(),false);}
 else await p.evaluate(()=>show('home'));
}
const baselines={};
try{
 for(const route of routes)for(const variant of variants){
  const row={route,variant,kind:variant.startsWith('quota')?'injected primary storage failure':'UI action from synthetic checkpoint',snapshots:[],errors:[],blocked:[],responses404:[]};report.cases.push(row);
  const ctx=await browser.newContext({viewport:{width:412,height:915},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin===origin&&r.request().method()==='GET')return r.continue();row.blocked.push(r.request().url());return r.abort();});
  await ctx.addInitScript(()=>{let n=49281;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);});
  const attach=p=>{p.setDefaultTimeout(7000);p.on('dialog',d=>d.dismiss());p.on('pageerror',e=>row.errors.push(e.message));p.on('response',r=>{if(r.status()===404)row.responses404.push(r.url());});};
  let p=await ctx.newPage();attach(p);await p.clock.setFixedTime(new Date('2026-11-19T12:00:00Z'));
  const snap=async label=>{const s=await state(p,route);row.snapshots.push({label,...s});await p.screenshot({path:`${out}/${route}-${variant}-${label}.png`});return s;};
  const interrupt=async()=>{if(variant.includes('reopen')){await p.close();p=await ctx.newPage();attach(p);await p.clock.setFixedTime(new Date('2026-11-19T12:00:00Z'));await boot(p);}else{await p.reload({waitUntil:'load'});await p.locator('#titleScreen').click();await p.locator('#titleScreen').waitFor({state:'detached'});await quiet(p);}};
  try{
   await boot(p);await seed(p,route);await arm(p,variant.startsWith('quota'));const before=await snap('before');assert.deepEqual(before.memory,before.disk);
   if(variant.startsWith('pre')){await interrupt();const resumed=await snap('pre-resumed');assert.deepEqual(resumed.disk,before.disk);await recovered(p,route,false);await arm(p);}
   if(variant.startsWith('quota')){
    await action(p,route);const failed=await snap('failed');assert.deepEqual(failed.disk,before.disk,'failed primary leaves disk unchanged');assert.deepEqual(failed.memory,before.memory,'failed primary rolls memory back');
    await interrupt();const resumed=await snap('failure-resumed');assert.deepEqual(resumed.disk,before.disk);await recovered(p,route,false);await arm(p);
   }
   await action(p,route);const after=await snap('after');assert.deepEqual(after.memory,after.disk,'displayed result must already be persisted');assert(after.writes.length>=1,'primary save must happen');
   if(route==='battle')assert.equal(after.disk.wins,before.disk.wins+1);
   if(route==='expedition'){assert.equal(after.disk.coins,before.disk.coins+120);assert.equal(after.disk.items.potion,before.disk.items.potion+2);assert.equal(after.disk.expeditions.completedCount,before.disk.expeditions.completedCount+1);}
   if(route==='gift'){assert.equal(after.disk.coins,before.disk.coins+5000);assert.equal(after.disk.giftClaimedIds.filter(id=>id==='20261102-present-box-open').length,1);}
   if(route==='finale'){assert.equal(after.disk.coins,before.disk.coins+100);assert(after.disk.story.completed);}
   if(variant==='baseline')baselines[route]={before:before.disk,after:after.disk};else{assert.deepEqual(before.disk,baselines[route].before,'identical baseline fixture');assert.deepEqual(after.disk,baselines[route].after,'same outcome as uninterrupted UI');}
   if(variant.startsWith('post')||variant==='baseline'||variant.startsWith('quota')){
    await interrupt();const resumed=await snap('post-resumed');assert.deepEqual(resumed.disk,after.disk,'real reload/reopen preserves committed result');await recovered(p,route,true);const revisit=await snap('revisit');assert.deepEqual(revisit.disk,after.disk,'revisit/replay must not award twice');
   }
   row.result='PASS';
  }catch(e){row.result='FAIL';row.error=e.stack;try{await snap('error');}catch{} }
  finally{await ctx.close();fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({route,variant,result:row.result,error:row.error?.split('\n').slice(0,4)}));}
 }
}finally{await browser.close();server.close();fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));}
const failed=report.cases.filter(c=>c.result!=='PASS');console.log(`SAVE RESUME AUDIT ${report.cases.length-failed.length}/${report.cases.length}`);if(failed.length)process.exitCode=1;
