// Disposable profiles only. Mobile Chromium emulation is not physical Galaxy QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const out=process.env.ROSTER_QA_OUT||'/tmp/monster-roster-qa';fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4232'],{stdio:['ignore','pipe','inherit']});let browser;
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const viewport of [{width:360,height:800},{width:412,height:915},{width:1366,height:900}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  const slot=viewport.width===412?2:1;await context.addInitScript(slot=>sessionStorage.setItem('mb_profile_tab_v1',String(slot)),slot);
  const page=await context.newPage(),errors=[],dialogs=[];
  await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>{await page.locator('#contractorRankUpOverlay button').click()});
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push(d.message());d.accept()});
  await page.goto('http://127.0.0.1:4232/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  const ids=await page.evaluate(()=>{
   clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
   for(const k in save.progress.tutorial.guides)save.progress.tutorial.guides[k]=true;
   const leader=addInstance('aquaron',5),first=addInstance('freigal',1),second=addInstance('freigal',1),strong=addInstance('freigal',10),locked=addInstance('slime',1),away=addInstance('grassbeat',1),character=addInstance('elna_beginner',1);
   const rare=addInstance('character_vera_5',100);rare.locked=true;
   locked.locked=true;character.locked=false;save.party=[leader.uid];save.homeFavoriteId='freigal';save.items.kilo_data=2;save.coins=100;save.expeditions.active=[{id:'fixture',mapId:'grassland',distanceId:'short',memberUids:[away.uid],progress:0,requiredWins:1,status:'active',suitability:expeditionSuitability([away.uid],MAPS[0])}];
   for(let i=0;i<80;i++)addInstance(i%2?'nocle':'luxseed',1);
   save.contractor.pendingRankUps=[];if(!saveGame())throw Error('fixture save');show('party');return {leader:leader.uid,first:first.uid,second:second.uid,strong:strong.uid,locked:locked.uid,away:away.uid,character:character.uid};
  });
  const geometry=await page.locator('#partyList').evaluate(el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,height:el.clientHeight,scroll:el.scrollHeight,bodyOverflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(geometry.columns,5);assert(geometry.scroll>geometry.height);assert(!geometry.bodyOverflow);
  await page.locator(`[data-instance-uid="${ids.first}"]`).click();
  assert(await page.locator('.roster-sheet').isVisible());assert.match(await page.locator('.roster-sheet').innerText(),/所持 3体/);
  await page.getByRole('button',{name:'🔒 ロックする',exact:true}).click();assert(await page.getByRole('button',{name:'🔓 ロック解除',exact:true}).isVisible());
  await page.getByRole('button',{name:'🔓 ロック解除',exact:true}).click();
  await page.locator('.roster-data-items summary').click();await page.locator('.roster-data-items button').filter({hasText:'キロデータ'}).click();
  assert.match(await page.locator('.roster-sheet').innerText(),/EXP 20\/60/);assert.match(await page.locator('.roster-data-items').innerText(),/キロデータ × 1/);
  await page.getByRole('button',{name:'詳細を閉じる'}).click();
  const countBefore=await page.evaluate(()=>save.instances.length);
  await page.getByRole('button',{name:'まとめて変換',exact:true}).click();assert.equal(await page.locator('.app-bottom-nav').isVisible(),false);
  for(const uid of [ids.leader,ids.locked,ids.away])assert.equal(await page.locator(`[data-instance-uid="${uid}"]`).getAttribute('aria-disabled'),'true');
  await page.locator(`[data-instance-uid="${ids.strong}"]`).click();
  await page.getByRole('button',{name:'重複',exact:true}).click();await page.getByRole('button',{name:'重複分を選ぶ（1体残す）',exact:true}).click();
  assert.equal(await page.locator(`[data-instance-uid="${ids.strong}"]`).getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator(`[data-instance-uid="${ids.first}"]`).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'変換',exact:true}).click();assert(await page.locator('.roster-sheet').isVisible());
  const chosen=await page.evaluate(()=>rosterUi.confirmation.uids.length);assert(chosen>20);assert.match(await page.locator('.roster-sheet').innerText(),/ほか\d+体/);
  await page.screenshot({path:`${out}/confirmation-${viewport.width}.png`});
  await page.getByRole('button',{name:'戻る',exact:true}).click();assert.equal(await page.locator('.roster-sheet').count(),0);
  await page.getByRole('button',{name:'変換',exact:true}).click();await page.getByRole('button',{name:'変換する',exact:true}).click();
  assert.equal(await page.evaluate(()=>save.instances.length),countBefore-chosen);assert.equal(await page.locator('.roster-sheet').count(),0);assert(await page.locator('.app-bottom-nav').isVisible());
  assert(await page.evaluate(uid=>Boolean(getInstance(uid)),ids.strong));
  await page.locator('[aria-label="並び替え"]').selectOption('level');
  const committed=await page.evaluate(()=>({count:save.instances.length,coins:save.coins,kilo:save.items.kilo_data}));
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);show('party')});
  assert.deepEqual(await page.evaluate(()=>({count:save.instances.length,coins:save.coins,kilo:save.items.kilo_data})),committed);
  assert.equal(await page.locator('[aria-label="並び替え"]').inputValue(),'level');assert.equal(await page.getByRole('button',{name:'重複',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'すべて',exact:true}).click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#partyList img')].every(img=>img.complete&&img.naturalWidth>0));
  await page.locator('#partyList img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  const labelFits=await page.locator('[data-monster-id="character_vera_5"] .roster-level').evaluate(el=>el.scrollWidth<=el.clientWidth);
  assert(labelFits,'Lv100 and five stars fit the smallest icon');
  await page.screenshot({path:`${out}/roster-${viewport.width}.png`});
  // Actual browser quota failure: preview -> click -> all save data restored.
  const failure=await page.evaluate(()=>{
   const target=addInstance('freiwolf',20);target.locked=false;saveGame();show('party');openRosterDetail(target.uid);return target.uid;
  });
  await page.locator('[data-roster-action="convert"]').click();assert.match(await page.locator('.roster-sheet').innerText(),/最後の1体/);assert.match(await page.locator('.roster-sheet').innerText(),/Lv20以上/);
  const before=await page.evaluate(()=>JSON.stringify(save));
  await page.evaluate(()=>{window.realRosterStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===MonsterProfiles.key(SAVE_KEY))throw new DOMException('quota','QuotaExceededError');return window.realRosterStorageSet.call(this,k,v);}});
  await page.getByRole('button',{name:'変換する',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(save)),before);
  await page.evaluate(()=>{Storage.prototype.setItem=window.realRosterStorageSet});
  await page.locator('[data-roster-action="convert"]').click();await page.getByRole('button',{name:'変換する',exact:true}).click();assert.equal(await page.evaluate(uid=>getInstance(uid),failure),null);
  // A newer save from another tab must never be overwritten by conversion.
  const conflict=await page.evaluate(()=>{
   clearTimeout(contractorRankUpTimer);const target=addInstance('freiwolf',20);target.locked=false;saveGame();show('party');openRosterDetail(target.uid);openRosterConfirmation([target.uid]);
   const before=JSON.stringify(save),otherKey=MonsterProfiles.slot()===1?'mb_v95c_profile2':'mb_v95c',other=localStorage.getItem(otherKey);
   const newer=JSON.parse(before);newer.coins+=37;newer.saveMeta.integrityHash=saveHash(newer);const disk=JSON.stringify(newer);localStorage.setItem(MonsterProfiles.key(SAVE_KEY),disk);
   return {before,disk,otherKey,other};
  });
  await page.getByRole('button',{name:'変換する',exact:true}).click();
  assert.equal(await page.evaluate(()=>JSON.stringify(save)),conflict.before);
  assert.equal(await page.evaluate(()=>localStorage.getItem(MonsterProfiles.key(SAVE_KEY))),conflict.disk);
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),conflict.otherKey),conflict.other);
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden')});
  // Home / party / exploration / battle entry smoke.
  await page.evaluate(()=>{show('home')});assert(await page.locator('#home').isVisible());
  await page.evaluate(()=>show('partySet'));assert(await page.locator('#partySelectList [data-party-uid]').count()>0);
  await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());
  await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());
  assert.deepEqual(errors,[]);assert.equal(dialogs.filter(t=>/元には戻|変換しますか/.test(t)).length,0);
  console.log(`PASS roster browser ${viewport.width}: 5 columns, overflow, detail/data/lock, protected selection, duplicate keeper, single confirmation/cancel, mixed save/reload, prefs, quota rollback/retry, stale-tab/inactive-profile safety, home/party/hunt/battle smoke.`);
  await context.close();
 }
 // Accessibility reflow in a very short landscape/split viewport.
 const tinyContext=await browser.newContext({viewport:{width:422,height:195},reducedMotion:'reduce'}),tiny=await tinyContext.newPage();
 tiny.on('dialog',d=>d.accept());await tiny.goto('http://127.0.0.1:4232/?legacy=1',{waitUntil:'networkidle'});await tiny.locator('#titleScreen').click();await tiny.locator('#titleScreen').waitFor({state:'detached'});
 await tiny.evaluate(()=>{clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});for(let i=0;i<10;i++)addInstance('freigal');save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');show('party')});
 for(const control of await tiny.locator('.roster-chips button,#rosterActions button').all()){
  await control.evaluate(el=>el.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
  assert(await control.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return hit===el||el.contains(hit)}),'short viewport controls remain reachable');
 }
 await tinyContext.close();console.log('PASS short roster reflow: 422x195, every filter and footer action reachable.');
}finally{await browser?.close();server.kill()}
