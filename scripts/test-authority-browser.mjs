import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const out='artifacts/save-failure-ui/authority';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','4376'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail)});
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const viewport of [{width:360,height:800},{width:390,height:844},{width:1366,height:768}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:4376/?legacy=1');
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{
   clearTutorialUi();save=initSave();show('home');show('growthHub');
  });
  assert.equal(await page.locator('#authoritySection').isVisible(),false,'pre-prologue hidden');
  // Seed a completed legacy save, then use normal UI and persistence.
  const fixture=await page.evaluate(()=>{
   completeTutorial();Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
   save.instances=[];save.party=[];
   const a=addInstance('freigal',12),b=addInstance('aquaron',10);save.party=[a.uid,b.uid];
   delete save.authority;saveGame();show('party');
   return {uid:a.uid,base:instanceMaxHp(a,false),hp:instanceMaxHp(a),coins:save.coins,items:JSON.stringify(save.items)};
  });
  await page.locator('#party [data-nav="growth"]').click();
  await page.locator('#authoritySection').scrollIntoViewIfNeeded();
  assert.equal(await page.locator('#authorityBoard [role="listitem"]').count(),8);
  assert.equal(await page.locator('#authorityBoard .is-locked').count(),7);
  assert.equal(await page.locator('#authorityBoard .is-open').count(),1);
  assert.match(await page.locator('#authorityEffect').innerText(),/仮の効果・仮の数値/);
  const geometry=await page.locator('#authorityBoard').evaluate(board=>{
   const box=board.getBoundingClientRect(),nodes=[...board.children].map(n=>n.getBoundingClientRect());
   return {fits:nodes.every(n=>n.left>=box.left-1&&n.right<=box.right+1&&n.top>=box.top-1&&n.bottom<=box.bottom+1),overlap:nodes.some((a,i)=>nodes.some((b,j)=>i!==j&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)),overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(geometry.fits&&!geometry.overlap&&!geometry.overflow,JSON.stringify(geometry));
  await page.screenshot({path:out+'/authority-'+viewport.width+'.png',fullPage:true});
  // Repeated navigation does not spend anything or grant a chapter.
  for(let i=0;i<3;i++)await page.evaluate(()=>{show('home');show('growthHub')});
  assert.deepEqual(await page.evaluate(()=>({coins:save.coins,items:JSON.stringify(save.items),cleared:save.authority.clearedChapters})),{coins:fixture.coins,items:fixture.items,cleared:[]});
  await page.evaluate(()=>saveGame());
  await page.reload();await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();show('growthHub')});
  assert(await page.locator('#authoritySection').isVisible());
  assert.equal(await page.evaluate(()=>save.authority.unlocked),true);
  assert.equal(await page.evaluate(()=>save.authority.clearedChapters.length),0);
  // Ordinary battle actual path, switching, item max HP and enemy HP unchanged.
  const battle=await page.evaluate(()=>{
   clearTutorialUi();show('party');startBattleFromParty();
   beginChosenBattle('grassland','slime','d1');
   return {hp:pHp,max:playerMaxHp(),base:instanceMaxHp(activeInstance,false),enemy:eHp,expected:enemyMaxHp(),screen:document.querySelector('.screen.active').id};
  });
  assert.equal(battle.hp,battle.max);assert.equal(battle.max,Math.round(battle.base*1.01));
  assert.equal(battle.enemy,battle.expected);assert.equal(battle.screen,'battle');
  // Story uses the same actual launch path; disable d2 and verify preparation is rebased.
  const story=await page.evaluate(()=>{
   activeHuntRequest=null;partyBattle=[];AUTHORITY_DATA.enabledByDifficulty.d2=false;
   prepareBattleParty();
   const request=createMapStoryRequest(currentMapStory().episodes[0],'authority-test',save.party);
   beginChosenBattle('grassland','slime','normal',request);
   const result={hp:pHp,base:instanceMaxHp(activeInstance,false),max:playerMaxHp()};
   AUTHORITY_DATA.enabledByDifficulty.d2=true;return result;
  });
  assert.equal(story.hp,story.base);assert.equal(story.max,story.base);
  // Profile/new-save gate must not retain previous unlocked presentation.
  await page.evaluate(()=>{activeHuntRequest=null;partyBattle=[];save=initSave();show('growthHub')});
  assert.equal(await page.locator('#authoritySection').isVisible(),false);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('authority browser: title/home/party/hunt/battle, gating, 8 nodes, layout, navigation, save/reload, story difficulty passed');
}finally{await browser?.close();server.kill();}
