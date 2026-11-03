import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const port=4276;
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','inherit']});
let browser;
try{
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
  browser=await chromium.launch();
  for(const multi of [false,true])for(const outcome of ['retreat','defeat']){
    const context=await browser.newContext({viewport:{width:360,height:740},reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',d=>d.accept());
    await context.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
    await page.goto('http://127.0.0.1:'+port+'/?legacy=1');
    await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
    await page.evaluate(({multi,outcome})=>{
      clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
      save.progress.tutorial.guides.threeWay=true;
      const hero=addInstance('aquaron',5);save.party=[hero.uid];
      save.worldMap=normalizeWorldMapState({active:{elysia:{remainingBattles:2},water_secret:{remainingBattles:1}}});
      if(!saveGame())throw Error('fixture write');
      const map=MAPS.find(m=>m.id==='grassland'),request=createHuntRequest(map,by('slime'),'easy',[]);
      Object.assign(request,{worldMapExploration:true,battleMode:multi?'three_way':'single',secondEnemyId:multi?'freigal':null});
      beginChosenBattle(map.id,'slime','easy',request);
      worldMapSelectedEvent='water_secret';
      const key=MonsterProfiles.key(SAVE_KEY),put=Storage.prototype.setItem;
      window.diskBefore=localStorage.getItem(key);
      Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('quota','QuotaExceededError');return put.call(this,k,v);};
      window.restoreWrite=()=>{Storage.prototype.setItem=put;};
      if(outcome==='retreat')runAway();else losePartyBattle();
    },{multi,outcome});
    assert.match(await page.locator('#next').innerText(),/再試行/);
    await page.locator('#next').click();
    assert(await page.evaluate(()=>worldMapBattleSavePending()&&!activeHuntRequest.worldMapExpiryRecorded&&
      worldMapSelectedEvent==='water_secret'&&save.worldMap.active.water_secret.remainingBattles===1&&
      save.worldMap.active.elysia.remainingBattles===2&&localStorage.getItem(MonsterProfiles.key(SAVE_KEY))===window.diskBefore));
    await page.evaluate(()=>window.restoreWrite());
    await page.locator('#next').click();
    await page.locator('#battleChoices').waitFor({state:'visible'});
    await page.reload();
    assert(await page.evaluate(()=>save.worldMap.active.water_secret===null&&save.worldMap.active.elysia.remainingBattles===1));
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('PASS single/multi defeat/retreat: two failed writes, unchanged selection and disk, retry button, one decrement on reload.');
}finally{await browser?.close();server.kill();}
