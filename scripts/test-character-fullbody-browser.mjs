// Disposable browser profile only; real rendering, alpha and display lifecycle.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const output=process.env.FULLBODY_EVIDENCE||process.env.ELNA_EVIDENCE||'/tmp/character-fullbody-evidence';
fs.mkdirSync(output,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4302'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail);});
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 const page=await browser.newPage({viewport:{width:360,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:4302/?legacy=1',{waitUntil:'networkidle'});
 await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 const elnaIds=['elna_beginner','elna_middle','elna_advanced','elna_water','elna_kaen'];
 const stellaIds=['stella_apprentice','stella_wizard','stella_sorcerer'];
 const luminaIds=['lumina_apprentice','lumina_wizard','lumina_sorcerer'];
 const elysiaIds=['elysia','elysia_prayer','hikari'];
 const brigitteIds=['character_brigitte_2','character_brigitte_3','character_brigitte_4'];
 const tobiaIds=['character_tobia_2','character_tobia_3','character_tobia_4'];
 const rodenIds=['character_roden_2','character_roden_3','character_roden_4'];
 const seleneIds=['character_selene_2','character_selene_3','character_selene_4'];
 const safiraIds=['character_safira_2','character_safira_3','character_safira_4'];
 const bordoIds=['character_bordo_2','character_bordo_3','character_bordo_4'];
 const safiraCanvases=[[1254,1254],[1254,1254],[1024,1536]];
 const ids=[...elnaIds,...stellaIds,...luminaIds,...elysiaIds,...brigitteIds,...tobiaIds,...rodenIds,...seleneIds,...safiraIds,...bordoIds];
 const expectedPoster=id=>`${id}_fullbody_${elnaIds.includes(id)?'20261104':(seleneIds.includes(id)||safiraIds.includes(id)||bordoIds.includes(id))?'20261123':(elysiaIds.includes(id)||brigitteIds.includes(id)||tobiaIds.includes(id)||rodenIds.includes(id))?'20261122':'20261121'}.webp`;
 await page.evaluate(ids=>{
  clearTutorialUi();save=initSave();completeTutorial();
  Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
  save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);
  document.getElementById('contractorRankUpOverlay').classList.add('hidden');
  save.instances=[];save.party=[];
  for(const id of ids){const ins=addInstance(id,20);if(save.party.length<3)save.party.push(ins.uid);}
 },ids);
 for(const width of [360,412]){
  await page.setViewportSize({width,height:800});
  for(const id of ids){
   await page.evaluate(id=>{save.homeFavoriteId=id;show('home');},id);
   const img=page.locator('#home .home-water-monster img');
   await img.evaluate(el=>el.decode());
   await page.waitForFunction(()=>waterHomeRecord.art.style.width!=='');
   assert.equal(await page.locator('#home .home-portrait-frame').count(),0);
   assert.equal(await page.locator('#home video').count(),0);
   assert((await img.getAttribute('src')).endsWith(expectedPoster(id)));
   const result=await page.evaluate(()=>{
    const r=waterHomeRecord,b=r.config.sourceBounds,a=r.art.getBoundingClientRect(),k=a.width/b.width;
    const quick=document.getElementById('homeBanner').getBoundingClientRect();
    const plate=document.getElementById('homeNamePlate').getBoundingClientRect();
    const canvas=document.createElement('canvas'),img=r.art.querySelector('img');
    canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    const alpha=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let opaque=0,transparent=0;for(let i=3;i<alpha.length;i+=4){if(alpha[i]>240)opaque++;if(alpha[i]===0)transparent++;}
    return {contained:a.left+b.x*k>=-1&&a.right-(b.width-b.right)*k<=innerWidth+1&&
      a.top+b.y*k>=quick.bottom-1&&a.top+b.bottom*k<=plate.top+7,
      width:canvas.width,height:canvas.height,opaque,transparent,corner:alpha[3]};
   });
   assert(result.contained,`${id} home containment at ${width}`);
   assert(result.opaque>10000&&result.transparent>10000&&result.corner<=1,`${id} actual alpha`);
   if(seleneIds.includes(id)||bordoIds.includes(id))assert.deepEqual([result.width,result.height],[1024,1536],`${id} retains the supplied canvas`);
   if(safiraIds.includes(id))assert.deepEqual([result.width,result.height],safiraCanvases[safiraIds.indexOf(id)],`${id} retains the supplied canvas`);
   if(width===412)await page.screenshot({path:`${output}/${id}-home.png`});
  }
 }
 // Normal battle, both sides, every form. No video settings/decoder for cutouts.
 for(const id of ids){
  await page.evaluate(id=>{
   save.party=[save.instances.find(i=>i.id===id).uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by(id);
   activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[],{allowOvertier:false});activeHuntRequest.battleMode='single';
   beginChosenBattle(selectedMap.id,id,'normal',activeHuntRequest);show('battle');
  },id);
  await page.locator('#pVis img').evaluate(el=>el.decode());
  await page.locator('#eVis img').evaluate(el=>el.decode());
  assert.equal(await page.locator('#battle .has-idle-size').count(),2);
  assert.equal(await page.locator('#battle video,#battle .battle-idle-details').count(),0);
  for(const selector of ['#pVis img','#eVis img'])assert((await page.locator(selector).getAttribute('src')).endsWith(expectedPoster(id)));
  assert(await page.locator('#pVis .battle-static-media').evaluate(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'));
  const trio=[stellaIds,luminaIds,elysiaIds,brigitteIds,tobiaIds,rodenIds,seleneIds,safiraIds,bordoIds].find(forms=>forms[2]===id);
  if(!trio)continue;
  await page.screenshot({path:`${output}/${id}-single-battle.png`});
  await page.evaluate(([first,second])=>{
   ensureMultiBattleDom();multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by(first),'enemy_a'),createMultiEnemy(by(second),'enemy_b')],pendingMoveIndex:null};
   setMultiBattleLayout(true);setupMultiBattle();
  },trio);
  for(const [side,form] of [['pVis',id],['enemy_aVis',trio[0]],['enemy_bVis',trio[1]]]){
   await page.locator(`#${side} img`).evaluate(el=>el.decode());
   assert((await page.locator(`#${side} img`).getAttribute('src')).endsWith(expectedPoster(form)));
   assert.equal(await page.locator(`#${side} .has-idle-size`).count(),1);
  }
  assert.equal(await page.locator('#battle video,#battle .battle-idle-details').count(),0);
  await page.screenshot({path:`${output}/${id}-three-way-battle.png`});
  await page.evaluate(()=>{show('party');});
 }
 assert.equal(await page.evaluate(()=>battleIdleSizeDisplays.size),0);
 for(const id of ['lumina_sorcerer',...elysiaIds,...brigitteIds,...tobiaIds,...rodenIds,...seleneIds,...safiraIds,...bordoIds]){
  assert.equal(await page.evaluate(id=>{save.homeFavoriteId=id;return saveGame();},id),true);
  await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();
  await page.locator('#titleScreen').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>save.homeFavoriteId),id);
  const img=page.locator('#home .home-water-monster img');
  await img.evaluate(el=>el.decode());
  assert((await img.getAttribute('src')).endsWith(expectedPoster(id)));
 }
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#home video').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS Elna, Stella, Lumina, Elysia, Brigitte, Tobia, Roden, Selene, Safira and Bordo cutouts: 32 forms, 2 mobile widths, real alpha, normal/three-way battle, no decoders, exit cleanup, save/reload, reduced motion.');
}finally{await browser?.close();server.kill();}
