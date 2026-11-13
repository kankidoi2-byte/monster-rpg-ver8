// Opt-in comparison against the exact Drive prototype; pass SKILL_FX_PROTOTYPE.
// Set SKILL_FX_STATIC_ONLY=1 to run classification without a browser.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';

const prototype=process.env.SKILL_FX_PROTOTYPE;
const map=process.env.SKILL_FX_MAP;
const evidence=process.env.SKILL_FX_EVIDENCE||'artifacts/skill-effects';
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined;
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const reference=prototype?fs.readFileSync(prototype,'utf8'):null;
const engineFiles=['data','core','battle-skill-effect-map'];
const ctx=vm.createContext({console});
for(const name of engineFiles)vm.runInContext(read('js/'+name+'.js'),ctx);
const game=JSON.parse(vm.runInContext('JSON.stringify(SKILL110_CATALOG.map(s=>battleSkillEffectProfile(skillToMove(s.id))))',ctx));
assert.equal(game.length,110);
assert.equal(new Set(game.map(g=>g.skillId)).size,110);
assert.equal(game.filter(g=>g.special).length,9);
const fields=['skillId','name','cost','power','elements','effectKind','scale','extras','special'];
const select=o=>fields.map(key=>o[key]);
if(reference){
 const raw=JSON.parse(reference.match(/^const RAW=(.+);$/m)[1]);
 const blade=JSON.parse(reference.match(/^const BLADE=(.+);$/m)[1]);
 const tier=JSON.parse(reference.match(/^const TIER=(.+);$/m)[1].replaceAll("'",'"'));
 assert.deepEqual(raw.map(([n,name,cost,power,elements,form,scale,extras])=>
  [`s110_${String(n).padStart(3,'0')}`,name,cost,power,elements.split('+'),power===0?'support':blade.includes(n)?'blade':form==='generic'?'shot':form,tier[scale],extras?extras.split(','):[],cost>=20]),game.map(select));
}
if(map)assert.deepEqual(JSON.parse(fs.readFileSync(map,'utf8')).skills.map(select),game.map(select));
console.log(`PASS 110 unique profiles, 101 generic/9 dedicated${reference?' and exact prototype classification':''}${map?' and exact Drive map classification':''}`);
if(process.env.SKILL_FX_STATIC_ONLY!=='1'){
const {chromium}=await import('playwright');
const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4349'],{stdio:['ignore','pipe','inherit']});
let browser;
try{
 await new Promise((ok,fail)=>{server.stdout.once('data',ok);server.once('error',fail);server.once('exit',code=>fail(new Error('Development server exited: '+code)));});
 browser=await chromium.launch({executablePath});
 fs.mkdirSync(evidence,{recursive:true});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,reducedMotion:'no-preference',isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('Battle skill effect:'))errors.push(m.text());});
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:4349/?legacy=1');await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 await page.evaluate(()=>{
  clearTutorialUi();save=initSave();completeTutorial();Object.keys(save.progress.tutorial.guides).forEach(k=>save.progress.tutorial.guides[k]=true);
  save.contractor.pendingRankUps=[];clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
  save.instances=[];save.party=[];for(const id of ['freigal','aquaron','volteck']){const ins=addInstance(id,12);save.party.push(ins.uid);}
  endPartyRecovery();prepareBattleParty();selectedMap=MAPS[0];enemy=by('grassbeat');
  activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[],{allowOvertier:false});
  activeHuntRequest.battleMode='single';beginChosenBattle(selectedMap.id,enemy.id,'normal',activeHuntRequest);show('battle');
 });
 const samples=new Map([[19,240],[77,300],[103,570],[104,760],[106,1100],[110,950]]);
 let protoPage;
 if(reference){
  protoPage=await browser.newPage({viewport:{width:390,height:844}});
  await protoPage.route(/^https?:/,r=>r.abort());
  await protoPage.goto(pathToFileURL(path.resolve(prototype)).href);
 }
 for(const [i,p] of game.entries()){
  const n=i+1;
  const time=samples.get(n);
  const snapshots=time!==undefined;
  if(protoPage){
   await protoPage.evaluate(({n,snapshots})=>{
    const fx=window.__fx;fx.S.rate=snapshots?1:14;
    window.fxDone=fx.play(fx.MOVES.find(m=>m.n===n));
   },{n,snapshots});
   if(snapshots){await protoPage.waitForTimeout(time);await protoPage.screenshot({path:path.join(evidence,`prototype-${n}.png`)});}
   await protoPage.evaluate(()=>window.fxDone);
  }
  const capture=await page.evaluate(async ({skillId,snapshots})=>{
   const stage=document.querySelector('#battle .battle-arena'), source=document.getElementById('pVis'),target=document.getElementById('eVis');
   const profile=battleSkillEffectProfile(skillToMove(skillId));
   const fx=startBattleSkillEffect({stage,source,target:profile.effectKind==='support'?source:target,profile,rate:snapshots?1:14,cleanupRegistry:battleVisuals});
   window.fxDone=fx.contact.then(async hit=>({hit,tail:await fx.tail}));
   const canvas=stage.querySelector('canvas');
   return {ratio:canvas.width/stage.clientWidth,pointer:getComputedStyle(canvas).pointerEvents};
  },{skillId:p.skillId,snapshots});
  assert(capture.ratio<=2.01,p.skillId+' caps pixel ratio');
  assert.equal(capture.pointer,'none');
  if(snapshots){await page.waitForTimeout(time);await page.screenshot({path:path.join(evidence,`game-${n}.png`)});}
  assert.equal((await page.evaluate(()=>window.fxDone)).hit,true,p.skillId+' reaches contact');
  assert.equal(await page.locator('#battle .battle-arena canvas').count(),0,p.skillId+' cleans up');
 }
 const wrapper=()=>page.evaluate(()=>playBattleSkillMotion('pVis','eVis',skillToMove('s110_104'),{untilImpact:true}));
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await wrapper(),false,'reduced motion suppresses the wrapper');
 await page.emulateMedia({reducedMotion:'no-preference'});
 assert.equal(await page.evaluate(async ()=>{
  const prior=autoRun;autoRun={fast:true};
  try{return await playBattleSkillMotion('pVis','eVis',skillToMove('s110_104'),{untilImpact:true});}
  finally{autoRun=prior;}
 }),false,'fast-forward suppresses the wrapper');
 const lifecycle=await page.evaluate(async ()=>{
  const selector='#battle .battle-arena canvas';
  const motion=playBattleSkillMotion('pVis','eVis',skillToMove('s110_104'),{untilImpact:true});
  const started=Boolean(document.querySelector(selector));
  clearBattleVisuals();
  const result=await motion;
  await finishBattleSkillMotion(result);
  return {started,result,remaining:document.querySelectorAll(selector).length};
 });
 assert.deepEqual(lifecycle,{started:true,result:false,remaining:0},'interrupted motion resolves contact and removes canvas');
 // Verify a real combat call aligns the HP state with renderer contact.
 const attack=await page.evaluate(async ()=>{
  const move=skillToMove('s110_013'),old=eHp;
  const prior=autoRun;autoRun={phase:'fight',manual:false,settings:{speed:10}};
  try{
   const action=performSkill110Attack(move,true);
   const beforeContact=eHp;
   await action;
   return {old,beforeContact,after:eHp};
  }finally{autoRun=prior;}
 });
 assert.equal(attack.beforeContact,attack.old,'HP unchanged before motion contact');
 assert(attack.after<attack.old,'real damage follows contact');
 assert.deepEqual(errors,[]);
 console.log('PASS 110 game plays reached contact and cleaned up'+(protoPage?', compared after 110 prototype plays':'')+'; representative portrait viewport screenshots saved');
}finally{await browser?.close();server.kill();}
}
