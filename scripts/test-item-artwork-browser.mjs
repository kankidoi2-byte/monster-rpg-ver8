import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const ids=['raptor_feather','fine_raptor_feather','venom_carapace','fine_venom_carapace','golden_land_map','g_ichor','god_core'];
const replacements={magic_crystal:[768,768],giga_data:[960,960],water_mirror:[720,720],attack_potion:[768,768],unstable_alchemy_matter:[768,768],fine_magic_crystal:[768,768],monster_bone:[512,768],potion:[768,768],upper_potion:[768,768],silver_contract_scroll:[768,768]};
const sizes=replacements; const art=id=>`images/items/${id}_art_v2.webp`;
const artIn=(page,selector,id)=>page.locator(`${selector} img[src="${art(id)}"]`);
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4389'],{stdio:['ignore','pipe','inherit']});
const out=process.env.ITEM_ARTWORK_EVIDENCE||'/tmp/item-artwork-qa';fs.mkdirSync(out,{recursive:true});
let browser;const errors=[];
try{
 await new Promise((r,j)=>{server.stdout.once('data',r);server.once('error',j)});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
 for(const width of [360,1280]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  // Registering new items can legitimately earn a rank. Dismiss its real dialog.
  await page.addLocatorHandler(page.locator('#contractorRankUpOverlay:not(.hidden)'),async()=>{await page.getByRole('button',{name:'冒険を続ける',exact:true}).click();});
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  await page.goto('http://127.0.0.1:4389/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(ids=>{clearTutorialUi();clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');save=initSave();save.contractor.pendingRankUps=[];save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.itemDex=save.itemDex.filter(id=>!ids.includes(id));for(const id of ids)save.items[id]=0;show('itemDex');},ids);
  for(const id of ids) assert.equal(await page.locator(`.item-dex-card[onclick="showItemDexDetail('${id}')"] img`).count(),0);
  await page.evaluate(ids=>{for(const id of ids)save.items[id]=2;saveGame();renderItemDex();},ids);
  for(const id of ids){
   const card=page.locator(`.item-dex-card[onclick="showItemDexDetail('${id}')"]`);await card.click();
   const img=page.locator('#itemDexDetail .item-dex-detail-image img');
   await img.evaluate(i=>i.decode());assert((await img.getAttribute('src')).endsWith(`${id}_art_v1.webp`));
   assert(await img.evaluate(i=>i.naturalWidth===768&&i.naturalHeight===768));
   if(id==='god_core'){
    assert.match(await page.locator('#itemDexDetail').innerText(),/光の平原に降臨した光の女神エリシアに勝利すると、まれに入手/);
    assert(await img.evaluate(i=>{
      const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;
      const ctx=c.getContext('2d');ctx.drawImage(i,0,0);
      return ctx.getImageData(0,0,1,1).data[3]===0&&ctx.getImageData(c.width/2,c.height/2,1,1).data[3]>200;
    }));
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`${out}/${id}-${width}.png`});
  }
  // Repeated navigation and reload preserve quantities and registration.
  await page.evaluate(()=>{show('home');show('itemDex');show('home');show('itemDex');});
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  assert.deepEqual(await page.evaluate(ids=>ids.map(id=>save.items[id]),ids),ids.map(()=>2));
  assert(await page.evaluate(ids=>ids.every(id=>save.itemDex.includes(id)),ids));
  await page.evaluate(()=>{clearTutorialUi();show('shop');});
  for(const id of ids.slice(0,4)){
   const imgs=page.locator(`#shop img[src="images/items/${id}_art_v1.webp"]`);assert(await imgs.count()>0);await imgs.first().evaluate(i=>i.decode());
  }
  assert.equal(await page.locator('#shop img[src="images/items/god_core_art_v1.webp"]').count(),0);
  await page.screenshot({path:`${out}/shop-${width}.png`});
  const newIds=Object.keys(sizes);
  async function checkImage(locator,id,checkAlpha=false){
   assert.equal(await locator.count(),1,id);await locator.waitFor({state:'visible'});
   const data=await locator.evaluate(async (img,alpha)=>{
    await img.decode();const size=[img.naturalWidth,img.naturalHeight];if(!alpha)return {size};
    const c=document.createElement('canvas');[c.width,c.height]=size;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const rgba=ctx.getImageData(0,0,c.width,c.height).data;
    let edgeMax=0,opaque=0;
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
     const a=rgba[(y*c.width+x)*4+3];if(a>=245)opaque++;
     if(y===0||x===0||y===c.height-1||x===c.width-1)edgeMax=Math.max(edgeMax,a);
    }
    ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
    const whiteEdge=[[0,0],[c.width-1,0],[0,c.height-1],[c.width-1,c.height-1]].map(([x,y])=>Math.min(...ctx.getImageData(x,y,1,1).data));
    return {size,edgeMax,opaque,whiteEdge};
   },checkAlpha);
   assert.deepEqual(data.size,sizes[id],id);
   if(checkAlpha){assert(data.edgeMax<=10,id+' clean transparent perimeter');assert(data.whiteEdge.every(c=>c>=245),id+' clean white composite');assert(data.opaque>data.size[0]*data.size[1]*.1,id+' non-erased subject');}
  }
  for(const id of newIds.filter(id=>!['giga_data','water_mirror'].includes(id)))await checkImage(artIn(page,'#shopList',id),id);
  await page.evaluate(ids=>{for(const id of ids){save.items[id]=2;if(!save.itemDex.includes(id))save.itemDex.push(id);}show('itemDex');renderItemDex();},newIds);
  for(const id of newIds){
   await page.locator(`.item-dex-card[onclick="showItemDexDetail('${id}')"]`).click();
   await checkImage(artIn(page,'#itemDexDetail',id),id,true);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.evaluate(()=>{openGachaTab('item');showGachaResult('item',{},['attack_potion','giga_data'].map(id=>({item:ITEM_DEX_BY_ID[id]})));});
  for(const id of ['attack_potion','giga_data'])await checkImage(artIn(page,'#gachaResultCards',id),id);
  await page.locator('#gachaResultCards [data-result-index="0"]').click();
  await checkImage(artIn(page,'#gachaResultDetail','attack_potion'),'attack_potion');
  await page.evaluate(()=>{dismissGachaResult(false);DEV_GIFTS.push({id:'item-artwork-fixture',title:'Fixture item artwork',letter:'',startAt:'2000-01-01',until:null,rewards:[{kind:'item',id:'silver_contract_scroll',count:1}]});showGiftBox();});
  const gift=page.locator('[data-gift-detail="developer:item-artwork-fixture"]');
  await checkImage(gift.locator(`img[src="${art('silver_contract_scroll')}"]`),'silver_contract_scroll');
  await gift.click();await checkImage(artIn(page,'#giftDialogBody','silver_contract_scroll'),'silver_contract_scroll');
  await page.locator('#giftDialogClose').click();
  await page.evaluate(()=>{
   clearTutorialUi();completeTutorial();Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
   save.worldMap.guides.map_intro=true;save.instances=[];save.party=[];
   for(const id of ['freigal','aquaron','volteck'])save.party.push(addInstance(id,30).uid);
   save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);
   endPartyRecovery();prepareBattleParty();selectedMap=MAPS[0];enemy=by('grassbeat');
   activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[],{allowOvertier:false});activeHuntRequest.battleMode='single';
   beginChosenBattle(selectedMap.id,enemy.id,'normal',activeHuntRequest);show('battle');
  });
  await page.locator('#battleItemButton').click();
  for(const id of ['attack_potion','potion','upper_potion'])await checkImage(artIn(page,`#renewalSheet [data-item="${id}"]`,id),id);
  console.log(`PASS ${width}px replacement item artwork: all ten decode and alpha; shop, dex, battle, gacha, gift.`);
  await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log('Item artwork browser: locked/unlocked dex, all seven details, shop, navigation, save/reload at 360 and 1280px passed.');
}finally{await browser?.close();server.kill();}
