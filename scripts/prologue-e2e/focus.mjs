import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium,devices} from 'playwright';

const assets=['forest.webp','grassland.webp','bg_city_gate.webp','starry_plain.webp','starsea.webp',
 'bg_ruined_chapel.webp','ruined_village.webp','highland_ruins.webp','bg_courtyard_cloister.webp',
 'bg_stone_hall.webp','grassland_battle_v1.webp'];
const battles=[['pb_07','p2_07_a','grassland.webp'],['pb_09','p2_09_a','bg_city_gate.webp'],['pb_13','p2_13_a','forest.webp']];
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
try{
 for(const mount of ['', '/monster-rpg-ver8']){
  const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','0',...(mount?['--mount',mount]:[])],{stdio:['ignore','pipe','inherit']});
  try{
   const [banner]=await once(server.stdout,'data');
   const base='http://127.0.0.1:'+String(banner).match(/:(\d+)/)[1]+mount+'/';
   const context=await browser.newContext({...devices['Pixel 7'],viewport:{width:412,height:915}});
   await context.route('https://monster-battle-records.kanki-doi-2.chatgpt.site/**',r=>r.fulfill({json:{gifts:[]},headers:{'access-control-allow-origin':'*'}}));
   const page=await context.newPage(),old=[];
   page.on('response',r=>{if(r.status()===404&&new URL(r.url()).pathname.includes('/css/images/maps/'))old.push(r.url());});
   await page.goto(base+'?legacy=1');
   await page.locator('#titleScreen').tap();
   await page.locator('#titleScreen').waitFor({state:'detached'});
   await page.evaluate(()=>{
    clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
    save.party=[addInstance('freigal',12).uid];save.contractor.pendingRankUps=[];
   });
   for(const file of assets){
    const response=await page.request.get(base+'images/maps/'+file);
    assert.equal(response.status(),200,file);
    assert.match(response.headers()['content-type'],/^image\/webp/);
   }
   for(const [episodeId,battleId,file] of battles){
    const data=await page.evaluate(({episodeId,battleId})=>{
     closeProloguePart2Battle();
     const episode=prologuePart2Episode(episodeId),step=episode.steps.find(s=>s.battleId===battleId);
     const battle={...prologuePart2Data().battles[battleId],background:step.background||episode.background,location:episode.location};
     startProloguePart2Battle(episodeId,battle,{onOutcome(){}});
     const area=document.querySelector('#battle .battle-arena'),visual=getComputedStyle(area).backgroundImage;
     for(let i=0;i<4;i++) update(); // The banner is replaced for a story fight.
     return {visual,after:getComputedStyle(area).backgroundImage};
    },{episodeId,battleId});
    const expected=`url("${base}images/maps/${file}")`;
    assert.deepEqual(data,{visual:expected,after:expected});
    await page.evaluate(async file=>{const image=new Image();image.src=file;await image.decode();},base+'images/maps/'+file);
   }
   assert.deepEqual(old,[]);
   console.log('PASS background '+(mount||'/')+': 11 image URLs HTTP 200; grassland, city gate, forest are decoded and remain on the real battle arena after redraws; 0 old CSS-path 404');
   await context.close();
  }finally{server.kill();}
 }
}finally{await browser.close();}
