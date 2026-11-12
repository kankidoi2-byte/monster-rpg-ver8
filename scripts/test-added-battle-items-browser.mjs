// Disposable local browser saves only; external requests are blocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const output='artifacts/save-failure-ui/added-items';fs.mkdirSync(output,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4379'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail)});
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:640},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:4379/?legacy=1');await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 async function fixture(){
  if(await page.locator('#titleScreen').count()){await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});}
  await page.evaluate(()=>{
   clearTutorialUi();save=initSave();completeTutorial();Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   save.worldMap.guides.map_intro=true;save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
   save.instances=[];save.party=[];for(const id of ['freigal','aquaron','volteck']){const ins=addInstance(id,30);save.party.push(ins.uid);}
   for(const it of SHOP_ITEMS)if(it.usableInBattle)save.items[it.id]=5;
   save.coins=2000;saveGame();endPartyRecovery();show('home');
  });
 }
 async function start(mode='single'){
  await fixture();await page.evaluate(mode=>{
   prepareBattleParty();selectedMap=MAPS[0];enemy=by('grassbeat');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[],{allowOvertier:false});activeHuntRequest.battleMode='single';
   beginChosenBattle(selectedMap.id,enemy.id,'normal',activeHuntRequest);
   if(mode==='multi'){activeHuntRequest.secondEnemyId='aquaron';activeHuntRequest.battleMode='three_way';beginThreeWayBattle();}
   // Deterministic enemy damage keeps cure assertions independent of a random re-poison.
   if(mode==='multi'){for(const entry of multiBattle.enemies)entry.mon.moves=[['通常攻撃',24,'normal']];}
   else{enemy=structuredClone(enemy);enemy.moves=[['通常攻撃',24,'normal']];}
   show('battle');
  },mode);await page.locator('#renewalParty .br-member').first().waitFor();
 }
 async function pick(id,index){await page.locator('#battleItemButton').click();await page.locator(`[data-item="${id}"]`).click();if(index!==undefined)await page.locator(`[data-item-target="${index}"]`).click();}
 async function use(id,index){await pick(id,index);await page.locator('#renewalSheet .br-go').click();await page.waitForFunction(()=>!busy||battleFeedback.finished);}
 await fixture();assert(await page.locator('#home').isVisible());
 await page.evaluate(()=>show('partySet'));assert((await page.locator('#partySelectList').innerText()).length>0);
 await page.locator('#partySetupSaveButton').click();
 await page.evaluate(()=>{startBattleFromParty();showWorldMapLocation('grassland');});assert(await page.locator('#battleChoices').isVisible());assert((await page.locator('#battleChoiceList').innerText()).length>0);
 await page.evaluate(()=>showShop());
 for(const id of ['max_potion','antidote','paralysis_heal','confusion_heal','awakening','full_heal','defense_potion','speed_potion','revive_drop']){
  await page.locator(`#shop button[onclick="buyItem('${id}')"]`).click();assert.equal(await page.evaluate(id=>save.items[id],id),6);
 }
 assert.equal(await page.locator(`#shop button[onclick="buyItem('strong_incense')"],#shop button[onclick="buyItem('gold_dust')"]`).count(),0);
 await page.screenshot({path:`${output}/shop.png`});
 await page.reload();assert.equal(await page.evaluate(()=>save.items.revive_drop),6);
 for(const mode of ['single','multi']){
  await start(mode);await page.evaluate(()=>{pStatus='poison';pPoisonTurns=3;update();});
  await pick('antidote',0);await page.screenshot({path:`${output}/${mode}-cure.png`});
  await page.locator('#renewalSheet header button').click();assert.equal(await page.evaluate(()=>battleTurnCount),0);assert.equal(await page.evaluate(()=>save.items.antidote),5);
  await use('antidote',0);assert.equal(await page.evaluate(()=>pStatus),null);assert.equal(await page.evaluate(()=>save.items.antidote),4);assert.equal(await page.evaluate(()=>battleTurnCount),1);
  await page.evaluate(()=>renewalUseItem());assert.equal(await page.evaluate(()=>save.items.antidote),4,'stale repeated use does not consume');
  await pick('antidote');assert(await page.locator('[data-item-target="0"]').isDisabled());await page.locator('#renewalSheet header button').click();
 }
 await start();await use('defense_potion',1);assert.equal(await page.evaluate(()=>partyBattle[1].itemDefense),1.6);assert.equal(await page.evaluate(()=>battleTurnCount),1);
 await start();await page.evaluate(()=>{partyBattle[1].hp=0;partyBattle[1].fainted=true;activeHuntRequest.conditions=[{id:'healing_half'}];update();});
 await pick('revive_drop');assert(await page.locator('[data-item-target="0"]').isDisabled());assert(await page.locator('[data-item-target="1"]').isEnabled());
 await page.locator('[data-item-target="1"]').click();await page.screenshot({path:`${output}/revive.png`});await page.locator('#renewalSheet .br-go').click();await page.waitForFunction(()=>!busy||battleFeedback.finished);
 assert.equal(await page.evaluate(()=>partyBattle[1].hp),await page.evaluate(()=>adjustedBattleHealing(Math.floor(instanceMaxHp(partyBattle[1].inst)/2))));assert.equal(await page.evaluate(()=>partyBattle[1].fainted),false);
 await start();await pick('max_potion');assert(await page.locator('[data-item-target="1"]').isDisabled());await page.locator('#renewalSheet header button').click();
 await page.evaluate(()=>{partyBattle[1].hp=1;activeHuntRequest.conditions=[{id:'healing_half'}];});await use('max_potion',1);
 assert.equal(await page.evaluate(()=>partyBattle[1].hp),await page.evaluate(()=>Math.min(instanceMaxHp(partyBattle[1].inst),1+adjustedBattleHealing(instanceMaxHp(partyBattle[1].inst)))));
 assert.equal(await page.evaluate(()=>battleTurnCount),1);await page.reload();assert.equal(await page.evaluate(()=>save.items.max_potion),4);
 assert.deepEqual(errors,[]);console.log('PASS added battle items browser: mobile shop/party/save/reload, cure/invalid/cancel/repeat, single and three-way turn, reserve defense/revive/max potion, healing half');
}finally{await browser?.close();server.kill();}
