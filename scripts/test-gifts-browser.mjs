import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4251'],{stdio:['ignore','pipe','inherit']});let browser;
const origin='http://127.0.0.1:4251/?legacy=1';
const out=process.env.GIFT_EVIDENCE||'/tmp/present-box-qa';fs.mkdirSync(out,{recursive:true});
const errors=[];
try{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});
 browser=await chromium.launch({headless:true});
 for(const viewport of [{width:412,height:780},{width:360,height:640}]){
  const context=await browser.newContext({viewport,timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.clock.setFixedTime(new Date('2026-11-02T03:00:00+09:00'));
  await page.goto(origin,{waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  // Use the shipped record itself before isolating the generic receiver fixtures.
  const shipped=await page.evaluate(()=>{
   clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
   save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.contractor.pendingRankUps=[];
   localStorage.removeItem('lifequest.v1');localStorage.removeItem('lifequest_rewards_v1');
   if(!saveGame())throw Error('opening fixture');showGiftBox();
   return {entries:developerGiftEntries().map(g=>g.id),before:{coins:save.coins,items:{...save.items}}};
  });
  assert.deepEqual(shipped.entries,['20261102-present-box-open']);
  await page.locator('[data-gift-detail="developer:20261102-present-box-open"]').click();
  assert.equal(await page.locator('.gift-letter').innerText(),'プレゼントBOXを開きました。ちゃんと届いていますか？');
  assert.equal(await page.locator('#giftDialog .gift-reward-card').count(),5);
  await page.locator('#giftDialogClaim').click();await page.getByRole('heading',{name:'受け取りました',exact:true}).waitFor();await page.locator('#giftDialogClose').click();
  assert.equal(await page.evaluate(()=>save.coins),shipped.before.coins+5000);
  for(const [id,count] of Object.entries({rainbow_contract_scroll:3,giga_data:5,upper_potion:10,fine_magic_crystal:2}))assert.equal(await page.evaluate(id=>save.items[id],id),(shipped.before.items[id]||0)+count,id);
  assert.equal(await page.evaluate(()=>save.giftHistory.length),1);assert.equal(await page.evaluate(()=>claimGifts(['developer:20261102-present-box-open'])),false);
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>save.giftClaimedIds.includes('20261102-present-box-open')),true);assert.equal(await page.evaluate(()=>developerGiftEntries().length),0);
  await page.evaluate(()=>{
   DEV_GIFTS.splice(0,DEV_GIFTS.length);
   clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
   localStorage.removeItem('lifequest.v1');localStorage.setItem('lifequest_rewards_v1',JSON.stringify({v:1,entries:[{id:'a',label:'2026-11-01のEXP',createdAt:'2026-11-01T00:00:00Z',coins:60,items:{mega_data:2}},{id:'b',source:'level',label:'Lv.5',createdAt:'2026-11-02T00:00:00Z',coins:900,items:{rainbow_contract_scroll:1}}]}));
   DEV_GIFTS.push({id:'test-mixed',title:'開発者からの贈り物',letter:'いつもありがとう。\n受け取ってね。<script>bad</script>',startAt:'2026-01-01',until:null,rewards:[{kind:'monster',id:'false_dragon_alfa',level:30},{kind:'character',id:'character_vera_3',level:1},{kind:'skill',id:'s110_110',count:2},{kind:'item',id:'rainbow_contract_scroll',count:3},{kind:'coins',amount:5000}]});
   save.giftClaimedIds=['20261102-present-box-open'];save.coins=17;if(!saveGame())throw Error('fixture');show('home');
  });
  assert.equal(await page.locator('#giftUnreadCount').innerText(),'3');assert.equal(await page.locator('#homeQuickLinks button').count(),5);
  assert(await page.locator('#homeQuickLinks').evaluate(el=>{const r=el.getBoundingClientRect();return r.height===72&&r.left>=0&&r.right<=innerWidth&&[...el.querySelectorAll('button')].every(b=>{const x=b.getBoundingClientRect();return b.contains(document.elementFromPoint(x.x+x.width/2,x.y+x.height/2));})}));
  await page.screenshot({path:out+'/home-'+viewport.width+'.png'});
  await page.locator('#homeGiftButton').click();assert.equal(await page.locator('.gift-row').count(),3);
  await page.locator('[data-gift-filter="developer"]').click();assert.equal(await page.locator('.gift-row').count(),1);
  await page.locator('[data-gift-filter="lifequest"]').click();assert.equal(await page.locator('.gift-row').count(),2);
  await page.locator('[data-gift-filter="all"]').click();assert.equal(await page.locator('.gift-row').count(),3);
  await page.screenshot({path:out+'/box-'+viewport.width+'.png'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1),'only list scrolls');
  // Tutorial may inspect all contents, but neither UI nor direct calls may receive.
  await page.evaluate(()=>{save.progress.tutorial=tutorialSaveDefaults();renderGiftBox()});
  assert(await page.locator('#giftClaimAll').isDisabled());assert(await page.locator('#giftClaimHint').isVisible());
  await page.locator('[data-gift-detail="developer:test-mixed"]').click();assert(await page.locator('#giftDialog').isVisible());assert(await page.locator('#giftDialogClaim').isDisabled());
  assert.equal(await page.evaluate(()=>commitGiftClaim(['developer:test-mixed'],saveTransactionIdentity(),save).ok),false);await page.locator('#giftDialogClose').click();
  await page.evaluate(()=>{save.progress.tutorial=tutorialSaveDefaults({legacy:true});renderGiftBox()});
  // An exception after one instance is added must also undo every field.
  const exceptionBefore=await page.evaluate(()=>JSON.stringify(save));
  assert.equal(await page.evaluate(async()=>{
   const original=addInstance;addInstance=(...args)=>{if(args[0]==='character_vera_3')throw Error('injected acquisition failure');return original(...args)};
   try{return await claimGifts(['developer:test-mixed'])}finally{addInstance=original}
  }),false);assert.equal(await page.evaluate(()=>JSON.stringify(save)),exceptionBefore);
  assert.equal(await page.evaluate(()=>commitGiftClaim(['developer:test-mixed'],saveTransactionIdentity()+':other',save).ok),false);
  // Fail once: every field, dex, instance, receipt and history must roll back.
  const before=await page.evaluate(()=>JSON.stringify(save));
  await page.evaluate(()=>{window.giftRealSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===MonsterProfiles.key(SAVE_KEY))throw Error('quota');return window.giftRealSet.call(this,k,v)}});
  assert.equal(await page.evaluate(()=>claimGifts(['developer:test-mixed','lifequest:b'])),false);assert.equal(await page.evaluate(()=>JSON.stringify(save)),before);
  await page.evaluate(()=>Storage.prototype.setItem=window.giftRealSet);
  // One commit, two simultaneous clicks, exact paths and NEW.
  const result=await page.evaluate(async()=>{
   window.giftRealSave=saveGame;window.giftSaveCount=0;saveGame=(...args)=>{window.giftSaveCount++;return window.giftRealSave(...args)};
   const results=await Promise.all([claimGifts(['developer:test-mixed']),claimGifts(['developer:test-mixed'])]);
   saveGame=window.giftRealSave;
   return {results,count:window.giftSaveCount,coins:save.coins,unit:save.instances.map(i=>({id:i.id,level:i.level,locked:i.locked})),cards:save.skillCards.s110_110,caught:save.caught,item:save.items.rainbow_contract_scroll,itemDex:save.itemDex};
  });
  assert.deepEqual(result.results,[true,false]);assert.equal(result.count,1);assert.equal(result.coins,5017);assert.equal(result.cards,2);assert.equal(result.item,3);assert(result.itemDex.includes('rainbow_contract_scroll'));assert(result.caught.includes('false_dragon_alfa'));assert(result.unit.some(u=>u.id==='false_dragon_alfa'&&u.level===30));assert(result.unit.some(u=>u.id==='character_vera_3'&&u.level===1&&u.locked));
  assert.equal(await page.locator('#giftDialog .gift-new').count(),3);assert.equal(await page.locator('#giftDialog .tcg-card').count(),1);
  await page.screenshot({path:out+'/result-'+viewport.width+'.png'});await page.locator('#giftDialogClose').click();
  // Receive newest first: earlier pending entry must survive.
  await page.locator('[data-gift-claim="lifequest:b"]').click();await page.getByRole('heading',{name:'受け取りました',exact:true}).waitFor();await page.locator('#giftDialogClose').click();
  assert.equal(await page.locator('[data-gift-claim="lifequest:a"]').count(),1);
  await page.locator('#giftClaimAll').click();assert.match(await page.locator('#giftDialogTitle').innerText(),/確認/);assert.equal(await page.evaluate(()=>save.coins),5917);
  await page.locator('#giftDialogClaim').click();await page.getByRole('heading',{name:'受け取りました',exact:true}).waitFor();await page.locator('#giftDialogClose').click();assert.equal(await page.evaluate(()=>save.coins),5977);
  assert.equal(await page.locator('#giftUnreadCount').isHidden(),true);
  await page.locator('#giftHistoryTab').click();assert.equal(await page.locator('.gift-row').count(),3);await page.locator('[data-gift-detail="developer:test-mixed"]').click();assert.equal(await page.locator('#giftDialogClaim').isHidden(),true);assert.match(await page.locator('.gift-letter').innerText(),/<script>bad<\/script>/);await page.locator('#giftDialogClose').click();
  // Reload persists receipts and history.
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');showGiftBox()});
  assert.equal(await page.evaluate(()=>save.coins),5977);assert.equal(await page.evaluate(()=>pendingGifts().length),0);assert.equal(await page.evaluate(()=>giftHistoryEntries().length),3);
  // More than 500 individual receipts must survive repair/save/reload.
  assert(await page.evaluate(()=>{
   const entries=Array.from({length:610},(_,i)=>({id:'roll-'+i,coins:1,items:{},createdAt:new Date().toISOString()}));
   localStorage.setItem('lifequest_rewards_v1',JSON.stringify({v:1,entries}));save.lifeQuestClaimedIds=entries.filter((_,i)=>i%2).map(e=>e.id);save.giftReceiptVersion=1;repairSave(save);
   return save.lifeQuestClaimedIds.length===305&&pendingLifeQuestRewards().length===305;
  }));
  await page.evaluate(()=>{save.lifeQuestClaimedIds=Array.from({length:610},(_,i)=>'roll-'+i);repairSave(save)});assert.equal(await page.evaluate(()=>save.lifeQuestClaimedIds.length),610);assert.equal(await page.evaluate(()=>pendingLifeQuestRewards().length),0);
  // Real pre-BOX receipt window: claim through 609, then 610 is pending.
  assert(await page.evaluate(()=>{
   delete save.giftReceiptVersion;save.lifeQuestClaimedIds=Array.from({length:500},(_,i)=>'roll-'+(i+110));
   const box=JSON.parse(localStorage.getItem('lifequest_rewards_v1'));box.entries.push({id:'after',coins:7,items:{}});localStorage.setItem('lifequest_rewards_v1',JSON.stringify(box));repairSave(save);
   return save.giftReceiptVersion===0&&pendingLifeQuestRewards().map(e=>e.id).join()==='after';
  }));
  assert.equal(await page.evaluate(()=>claimGifts(['lifequest:after'])),true);await page.locator('#giftDialogClose').click();assert.equal(await page.evaluate(()=>save.lifeQuestClaimedIds.length),611);assert.equal(await page.evaluate(()=>pendingLifeQuestRewards().length),0);
  // History retention must never erase permanent receipts.
  assert(await page.evaluate(()=>{save.giftHistory[0].receivedAt='2000-01-01T00:00:00Z';repairSave(save);return !giftHistoryEntries().some(g=>g.id==='after')&&save.lifeQuestClaimedIds.includes('after')}));
  // pageshow/focus/storage re-read the independent Life Quest inbox.
  await page.evaluate(()=>{const b=LifeQuestRewards.readBox();b.entries.push({id:'focus',coins:1,items:{}});localStorage.setItem('lifequest_rewards_v1',JSON.stringify(b));window.dispatchEvent(new Event('focus'))});assert.equal(await page.locator('#giftUnreadCount').innerText(),'1');
  // Two actual tabs share a profile. Web Locks serialize claims; stale save loses.
  assert.equal(await page.evaluate(()=>saveGame()),true);
  const other=await context.newPage();other.on('dialog',d=>d.accept());other.on('pageerror',e=>errors.push(e.message));await other.goto(origin,{waitUntil:'networkidle'});await other.locator('#titleScreen').click();await other.locator('#titleScreen').waitFor({state:'detached'});await other.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden')});
  const settled=await Promise.all([page.evaluate(()=>claimGifts(['lifequest:focus'])),other.evaluate(()=>claimGifts(['lifequest:focus']))]);assert.equal(settled.filter(Boolean).length,1);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(MonsterProfiles.key(SAVE_KEY))).lifeQuestClaimedIds.filter(id=>id==='focus').length),1);
  await other.close();
  // Existing game smoke (fresh disposable profile state).
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');show('home');const i=addInstance('aquaron',5);save.party=[i.uid];show('partySet')});assert(await page.locator('#partySet').isVisible());await page.evaluate(()=>startBattleFromParty());assert(await page.locator('#battleChoices').isVisible());await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));assert(await page.locator('#battle').isVisible());assert.equal(await page.evaluate(()=>saveGame()),true);
  console.log('PASS gifts browser '+viewport.width+': five-column layout, tutorial guard, mixed grant/dex/NEW, atomic quota rollback, one save, double click, out-of-order + bulk, history/reload, 500+ migration, focus and real concurrent tabs, game smoke.');
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();server.kill();}
