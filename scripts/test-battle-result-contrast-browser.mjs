// Real browser acceptance coverage. Disposable save; no production/player data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const output=process.env.BATTLE_RENEWAL_EVIDENCE||'artifacts/save-failure-ui/battle-result-contrast';fs.mkdirSync(output,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4338'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail)});
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:640},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:4338/?legacy=1');await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 async function start(mode='single'){
  await page.evaluate(mode=>{
   clearTutorialUi();save=initSave();completeTutorial();Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
   save.instances=[];save.party=[];for(const id of ['freigal','aquaron','volteck']){const ins=addInstance(id,12);save.party.push(ins.uid);}
   save.items.potion=5;save.items.contract_scroll=5;saveGame();endPartyRecovery();prepareBattleParty();selectedMap=MAPS[0];enemy=by('grassbeat');
   activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='single';beginChosenBattle(selectedMap.id,enemy.id,'normal',activeHuntRequest);
   if(mode==='multi'){activeHuntRequest.secondEnemyId='aquaron';activeHuntRequest.battleMode='three_way';beginThreeWayBattle();}
   show('battle');
  },mode);
  await page.locator('#renewalParty .br-member').first().waitFor();
 }

 const records=[];
 async function verify(name,root='#battleOutcome'){
  await page.locator(root).waitFor({state:'visible'});
  const result=await page.locator(root).evaluate(el=>({text:el.innerText,background:getComputedStyle(el).background,color:getComputedStyle(el).color,items:[...el.querySelectorAll('h2,h3,p,small,strong,.battle-outcome-empty,.br-exp-row,.br-exp-row b,.br-exp-row>span')].filter(x=>x.getClientRects().length).map(x=>({tag:x.tagName,text:x.textContent,color:getComputedStyle(x).color,background:getComputedStyle(x).backgroundColor}))}));
  assert(result.text.length>0);
  if(root==='#battleOutcome'){
   assert.equal(result.color,'rgb(238, 243, 250)');
   for(const x of result.items)assert(!['rgb(15, 23, 42)','rgb(30, 41, 59)','rgb(51, 65, 85)'].includes(x.color),JSON.stringify(x));
  }
  records.push({name,...result});await page.screenshot({path:`${output}/${name}.png`,fullPage:true});
 }
 await start();await page.evaluate(()=>{eHp=0;win();});await page.locator('.br-contract').waitFor();
 await verify('victory-with-scroll');
 assert.equal(await page.locator('#battleOutcomeTitle').evaluate(x=>getComputedStyle(x).color),'rgb(255, 255, 255)');
 await page.evaluate(()=>{for(const it of SHOP_ITEMS.filter(x=>x.contract))save.items[it.id]=0;renewalContracts();});
 assert((await page.locator('.br-contract').innerText()).includes('契約書を持っていません。'));await verify('victory-without-scroll');
 for(const success of [true,false]){
  await start();await page.evaluate(()=>{eHp=0;win();});await page.locator('.br-contract').waitFor();
  await page.evaluate(async success=>{const old=playContractAnimation,rnd=Math.random;playContractAnimation=async()=>{};Math.random=()=>success?0:.999999;try{await renewalContract('single','contract_scroll');}finally{playContractAnimation=old;Math.random=rnd;}},success);
  assert((await page.locator('.br-contract-result').innerText()).includes(success?'契約成功':'契約失敗'));await verify(success?'contract-success':'contract-failure');
 }
 await start();await page.evaluate(()=>losePartyBattle());await verify('defeat');
 assert.equal(await page.locator('.battle-outcome-empty').evaluate(x=>getComputedStyle(x).color),'rgb(159, 176, 200)');
 assert.equal(await page.locator('#battleOutcomeTitle').evaluate(x=>getComputedStyle(x).color),'rgb(255, 155, 150)');
 await start();await page.evaluate(()=>{busy=false;runAway();});await verify('retreat');
 assert.equal(await page.locator('.battle-outcome-empty').evaluate(x=>getComputedStyle(x).color),'rgb(159, 176, 200)');
 assert.equal(await page.locator('#battleOutcomeTitle').evaluate(x=>getComputedStyle(x).color),'rgb(255, 217, 168)');
 await start('multi');await page.evaluate(()=>{for(const x of multiBattle.enemies){x.hp=0;x.defeatedByPlayer=true;}winMultiBattle();});await page.locator('#battleOutcome:not(.hidden)').waitFor();await verify('three-way-victory');
 await start();await page.evaluate(()=>{eHp=0;win();});await page.locator('#battleOutcome:not(.hidden)').waitFor();
 await page.evaluate(()=>renewalAutoBetween({exp:123},false));await verify('auto-between');
 await page.evaluate(()=>{autoRun=autoNewRun(selectedMap.id,'normal',5);autoRun.battles=['win','win'];autoRun.coins=200;autoRun.exp={one:{name:'フレイガル',total:123}};autoRun.contracts=[{mon:enemy,result:'成功'}];autoRun.reason='指定回数を終了';autoSummary(false);});await verify('auto-summary','#autoSummary');
 assert.deepEqual(errors,[]);fs.writeFileSync(`${output}/results.json`,JSON.stringify(records,null,2));console.log('PASS: 9 result/contract scenarios rendered in Chromium at 360x640; computed styles and screenshots saved. Runtime outcomes invoked with disposable fixtures; contract random and animation controlled.');
}finally{await browser?.close();server.kill();}
