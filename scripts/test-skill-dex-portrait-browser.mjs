/* Presentation-only regression. Run in the approved CI browser, not a real player profile. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';

const out='artifacts/skill-card-layout/skill-dex-portrait';
fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4197'],{stdio:['ignore','pipe','inherit']});
let browser;
const report={scope:'All 110 production skills; isolated synthetic save; no player data',zoomCaveat:'Root font enlargement and CSS zoom are automated simulations, not native browser zoom or Galaxy hardware testing.',viewports:[]};
const compact=s=>s.replace(/\s+/g,'').trim();
const settle=page=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});

async function measure(page){
 return page.evaluate(()=>{
  const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const rgb=raw=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.fillStyle=raw;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
  const lum=c=>c.map(x=>{const s=x/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=lum(rgb(a)),y=lum(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const selectors=['.skill-card-title','.skill-cost-badge','.skill-type-line','.skill-dex-performance','.skill-dex-description','.skill-dex-cta'];
  return {overflow:document.documentElement.scrollWidth>innerWidth+1,cards:[...document.querySelectorAll('#skillDexList .skill-dex-card')].map(el=>{
   const style=getComputedStyle(el),a=style.getPropertyValue('--dex-fill-a').trim(),b=style.getPropertyValue('--dex-fill-b').trim()||a;
   const parts=selectors.map(selector=>{const node=el.querySelector(selector);if(!node)return {selector,missing:true};const cs=getComputedStyle(node);return {selector,text:node.textContent,rect:rect(node),dimensions:{scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight},flexShrink:cs.flexShrink,overflow:node.scrollWidth>node.clientWidth+2||node.scrollHeight>node.clientHeight+2,ellipsis:cs.textOverflow==='ellipsis'||!['none','0',''].includes(cs.webkitLineClamp),hidden:cs.display==='none'||cs.visibility==='hidden',contrast:selector==='.skill-cost-badge'?contrast(cs.color,cs.backgroundColor):(a?Math.min(contrast(cs.color,a),contrast(cs.color,b)):null)};});
   const sk=SKILL_BY_ID[el.dataset.skillDexId];
   // CSSOM may serialize double-position stops either compactly or as four stops.
   const stops=[...style.backgroundImage.matchAll(/(rgba?\([^)]*\))\s+([\d.]+)%(?:\s+([\d.]+)%)?/g)].flatMap(match=>[match[2],match[3]].filter(x=>x!==undefined).map(at=>({color:rgb(match[1]),at:Number(at)})));
   const edge=style.getPropertyValue('--dex-edge').trim();
   return {id:sk.id,name:sk.name,types:skillTypes(sk),cost:sk.cost,power:sk.power,description:sk.customDesc||sk.description||'',dimensions:{scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight},tier:skillDexTier(sk.cost),typeLabel:skillTypeLabel(skillTypes(sk)),rect:rect(el),parts,background:style.backgroundImage,fillA:a,fillB:b,fillARGB:rgb(a),fillBRGB:rgb(b),gradientStops:stops,edgeRGB:rgb(edge),borderRGB:rgb(style.borderTopColor),border:style.borderColor,text:el.textContent,overflow:el.scrollWidth>el.clientWidth+2||el.scrollHeight>el.clientHeight+2};
  })};
 });
}
function verifyLayout(metrics,label,{phone=false,expectedCount=110}={}){
 assert.equal(metrics.overflow,false,`${label}: document horizontal overflow`);
 assert.equal(metrics.cards.length,expectedCount,`${label}: all skills present`);
 const rows=[];
 for(const card of metrics.cards){
  const key=`${label}/${card.id} ${card.name}`;
  assert(!card.overflow,`${key}: card clipping`);
  assert(card.fillA,`${key}: full background palette missing`);
  assert.match(card.background,/^linear-gradient\(135deg,/,`${key}: actual full-card diagonal background`);
  assert.deepEqual(card.gradientStops,[{color:card.fillARGB,at:0},{color:card.fillARGB,at:50},{color:card.fillBRGB,at:50},{color:card.fillBRGB,at:100}],`${key}: computed background must use exact palette fills and hard 50% split`);
  assert.deepEqual(card.borderRGB,card.edgeRGB,`${key}: actual attribute-colored border`);
  if(card.types.length===1)assert.deepEqual(card.fillARGB,card.fillBRGB,`${key}: single attribute uses uniform full fill`);
  if(card.types.length>1){assert.notEqual(card.fillA,card.fillB,`${key}: dual attribute colors`);assert.match(card.background,/linear-gradient/,`${key}: full diagonal background`);}
  let previous;
  for(const part of card.parts){
   assert(!part.missing,`${key}: ${part.selector} missing`);
   assert(!part.overflow&&!part.ellipsis&&!part.hidden,`${key}: ${part.selector} information clipped or hidden`);
   assert(part.rect.x>=card.rect.x-1&&part.rect.right<=card.rect.right+1&&part.rect.y>=card.rect.y-1&&part.rect.bottom<=card.rect.bottom+1,`${key}: ${part.selector} outside card`);
   if(previous)assert(part.rect.y>=previous.rect.bottom-1,`${key}: wrong vertical order ${part.selector}`);
   previous=part;
   assert(part.contrast>=4.5,`${key}: ${part.selector} contrast ${part.contrast}`);
  }
  const [title,cost,type,performance,description,cta]=card.parts;
  assert.equal(compact(title.text),compact(card.name),`${key}: complete name`);
  assert(compact(cost.text).includes(`COST${card.cost}`),`${key}: cost`);
  assert.equal(compact(type.text),compact(card.typeLabel),`${key}: attribute only, all attributes`);
  assert(compact(performance.text).includes(card.power===0?'補助技':`威力${card.power}`),`${key}: performance preserved`);
  assert(compact(description.text).includes(compact(card.description)),`${key}: full description preserved`);
  assert(card.text.includes(card.tier),`${key}: tier preserved`);
  assert.match(cta.text,/詳細を見る/);
  let row=rows.find(r=>Math.abs(r[0].rect.y-card.rect.y)<2);if(!row){row=[];rows.push(row);}row.push(card);
 }
 for(const row of rows){
  if(phone&&row.length!==1)assert.equal(row.length,2,`${label}: phone two columns`);
  assert(Math.max(...row.map(c=>c.rect.height))-Math.min(...row.map(c=>c.rect.height))<2,`${label}: same row equal height`);
  assert(Math.max(...row.map(c=>c.parts.at(-1).rect.bottom))-Math.min(...row.map(c=>c.parts.at(-1).rect.bottom))<2,`${label}: CTA bottom alignment`);
 }
 if(phone)assert.equal(rows[0].length,2,`${label}: first row exactly two columns`);
 return {count:metrics.cards.length,columns:rows[0]?.length,minWidth:Math.min(...metrics.cards.map(c=>c.rect.width)),maxHeight:Math.max(...metrics.cards.map(c=>c.rect.height)),minimumTextContrast:Math.min(...metrics.cards.flatMap(c=>c.parts.map(p=>p.contrast))),dualAttributeCards:metrics.cards.filter(c=>c.types.length>1).length};
}
async function checkedMetrics(page,label,file,options={}){
 const metrics=await measure(page);
 // Persist diagnostics before assertions, including on the first failing card.
 fs.writeFileSync(`${out}/${file}-all-cards.json`,JSON.stringify(metrics,null,2));
 try{return {metrics,result:verifyLayout(metrics,label,options)};}
 catch(error){
  fs.writeFileSync(`${out}/${file}-failure.txt`,String(error.stack||error));
  const id=String(error.message).match(/s110_\d+/)?.[0];
  try{
   if(id)await page.locator(`[data-skill-dex-id="${id}"]`).scrollIntoViewIfNeeded();
   await page.screenshot({path:`${out}/${file}-failure.png`,animations:'disabled'});
   if(id)await page.locator(`[data-skill-dex-id="${id}"]`).screenshot({path:`${out}/${file}-${id}-failure.png`,animations:'disabled'});
  }catch(captureError){fs.writeFileSync(`${out}/${file}-capture-error.txt`,String(captureError));}
  throw error;
 }
}
async function screenshotExamples(page,label){
 // Reorder only rendered nodes for the evidence viewport. No skill data or save is changed.
 await page.evaluate(()=>{
  const list=document.getElementById('skillDexList');
  const names=['フレイムクロー','雷光弾','アペクスストーム','ゼファーカッター'];
  const elements=[...list.children];
  for(const name of names.reverse()){const el=elements.find(el=>SKILL_BY_ID[el.dataset.skillDexId]?.name===name);if(el)list.prepend(el);}
  list.scrollIntoView({block:'start',behavior:'instant'});
  window.scrollBy(0,-100);
 });
 await settle(page);await page.screenshot({path:`${out}/${label}-representative.png`,animations:'disabled'});
 await page.locator('#skillDexKind').selectOption('support');
 await page.evaluate(()=>{const list=document.getElementById('skillDexList');const nodes=[...list.children].sort((a,b)=>b.textContent.length-a.textContent.length);nodes.forEach(n=>list.append(n));list.scrollIntoView({block:'start',behavior:'instant'});window.scrollBy(0,-100);});
 await settle(page);await page.screenshot({path:`${out}/${label}-support-long.png`,animations:'disabled'});
 await page.evaluate(()=>resetSkillDexFilters());
}
try{
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
 browser=await chromium.launch({headless:true});
 for(const [width,height] of [[320,568],[360,800],[390,844],[430,932],[844,390],[1280,900]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.goto('http://127.0.0.1:4197/?legacy=1',{waitUntil:'networkidle'});
  await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
  await page.evaluate(()=>{clearTutorialUi();save=initSave();save.party=[addInstance('freigal',1).uid];migrateSkillSystem();save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);show('home');saveGame();show('skillDex');});
  await page.addStyleTag({content:'html, body, * { scroll-behavior: auto !important; }'});
  await settle(page);
  const before=await page.evaluate(()=>({save:JSON.stringify(save),storage:JSON.stringify({...localStorage}),data:JSON.stringify(EQUIPPABLE_MOVE_CARDS)}));
  const measured=await checkedMetrics(page,`${width}px`,`${width}`,{phone:width<=430});
  const metrics=measured.metrics,entry={width,height,normal:measured.result};
  assert.equal(new Set(metrics.cards.map(c=>c.id)).size,110);
  assert.equal(new Set(metrics.cards.flatMap(c=>c.types)).size,10,'all ten attributes represented');
  if(width>=844){assert(entry.normal.columns>=3,'larger screens adapt column count');assert(entry.normal.minWidth>=140,'readable adaptive desktop card width');}
  await screenshotExamples(page,`${width}x${height}`);
  // All filter options and all ordering modes use the unchanged runtime query result.
  for(const id of ['skillDexType','skillDexCost','skillDexKind','skillDexEffect','skillDexTier','skillDexSort']){
   const values=await page.locator(`#${id} option`).evaluateAll(els=>els.map(el=>el.value));
   for(const value of values){
    await page.evaluate(()=>resetSkillDexFilters());await page.locator(`#${id}`).selectOption(value);
    const actual=await page.locator('[data-skill-dex-id]').evaluateAll(els=>els.map(el=>el.dataset.skillDexId));
    const expected=await page.evaluate(()=>{const get=id=>document.getElementById(id).value;return skillDexQueryEntries({query:get('skillDexSearch'),type:get('skillDexType'),cost:get('skillDexCost'),kind:get('skillDexKind'),effect:get('skillDexEffect'),tier:get('skillDexTier'),sort:get('skillDexSort')}).map(sk=>sk.id);});
    assert.deepEqual(actual,expected,`${width}: ${id}=${value}`);
   }
  }
  await page.evaluate(()=>resetSkillDexFilters());
  await page.locator('#skillDexSearch').fill('オーバーリバース');
  const target=page.locator('[data-skill-dex-id]');assert.equal(await target.count(),1);
  await target.focus();assert(await target.evaluate(el=>el===document.activeElement));
  const focusStyle=await target.evaluate(el=>{const s=getComputedStyle(el);return {outline:s.outlineStyle,shadow:s.boxShadow};});
  assert(focusStyle.outline!=='none'||focusStyle.shadow!=='none','visible keyboard focus');
  await page.keyboard.press('Enter');assert.match(await page.locator('#skillDexDetail').textContent(),/オーバーリバース/);
  await page.locator('#skillDexSearch').fill('存在しない技名');assert.equal(await target.count(),0);assert.match(await page.locator('#skillDexList').textContent(),/条件に合う技はありません/);
  await page.locator('#skillDexSearch').fill('アペクスストーム');await target.locator('.skill-dex-cta').click();assert.match(await page.locator('#skillDexDetail').textContent(),/アペクスストーム/);
  await page.evaluate(()=>{skillDexSelectedId=null;document.getElementById('skillDexDetail').innerHTML='';resetSkillDexFilters();});
  // Every card, including the last, can reach a point not blocked by the fixed chrome.
  for(const card of await page.locator('[data-skill-dex-id]').all()){
   await card.locator('.skill-dex-cta').scrollIntoViewIfNeeded();
   assert(await card.locator('.skill-dex-cta').evaluate(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;const hit=document.elementFromPoint(x,y);return !!hit&&(el.contains(hit)||el.closest('button').contains(hit));}),'CTA not occluded by fixed chrome');
  }
  if(width<=430){
   await page.evaluate(()=>document.documentElement.style.fontSize='200%');await settle(page);
   entry.rootFont200=(await checkedMetrics(page,`${width}px root font 200%`,`${width}-root-font-200`)).result;
   await page.locator('[data-skill-dex-id]').first().scrollIntoViewIfNeeded();
   await page.screenshot({path:`${out}/${width}-root-font-200.png`,animations:'disabled'});
   await page.evaluate(()=>{document.documentElement.style.fontSize='';document.body.style.zoom='2';});await settle(page);
   entry.cssZoom200=(await checkedMetrics(page,`${width}px CSS zoom 200%`,`${width}-css-zoom-200`)).result;
   await page.locator('[data-skill-dex-id]').first().scrollIntoViewIfNeeded();
   await page.screenshot({path:`${out}/${width}-css-zoom-200.png`,animations:'disabled'});
   await page.evaluate(()=>document.body.style.zoom='');
  }
  assert.deepEqual(await page.evaluate(()=>({save:JSON.stringify(save),storage:JSON.stringify({...localStorage}),data:JSON.stringify(EQUIPPABLE_MOVE_CARDS)})),before,'dex browsing never changes save/storage/skill data');
  assert.deepEqual(errors,[],`${width}: browser errors`);report.viewports.push(entry);
  fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));await page.close();
 }
 console.log('PASS portrait skill dex: all 110 skills × 6 viewports; phone 2 columns; full text, contrast, row/CTA alignment; all filters; keyboard/detail; fixed chrome; read-only save; simulated text/zoom enlargement.');
}finally{await browser?.close();server.kill();}
