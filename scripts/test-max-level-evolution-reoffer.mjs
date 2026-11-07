import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';

function fixture(id='aquaron',level=100){
  const r=runtime({progression:s=>s+'\nvar realProcessEvolution=processNextEvolution;'});
  r.context.testId=id;r.context.testLevel=level;
  r.run(`save=initSave();save.progress.tutorial.status='completed';
    var ins=addInstance(testId,testLevel,0,{evolutionOffset:0});save.party=[ins.uid];
    save.items.kilo_data=3;pendingEvolutions=[];currentEvolution=null;
    var alerts=[],screens=[],writes=0;alert=m=>alerts.push(m);show=s=>screens.push(s);
    saveGame=()=>{writes++;return true;};
    renderExpedition=renderParty=renderPartySetup=()=>{};typesHtml=()=>"";renderBattleInputState=()=>{};
    processNextEvolution=realProcessEvolution;
    var beforeItems=JSON.stringify(save.items);`);
  return r;
}
function queued(r){assert(r.run("pendingEvolutions.some(p=>p.uid===ins.uid&&p.choices.includes('highaquaron'))"));}
function maxUnchanged(r){assert.equal(r.run('ins.level'),100);assert.equal(r.run('ins.exp'),0);}
function expedition(r,recall=false){
  r.run(`save.party=[];var entry={id:'exp_save03',mapId:'grassland',distanceId:'short',memberUids:[ins.uid],
    progress:1,requiredWins:1,status:'${recall?'active':'complete'}',
    suitability:{grade:'D',total:0,greatRate:0,reasons:[]},
    reward:${recall?'null':"{coins:25,exp:20,items:{monster_bone:2},great:false}"}};
    save.expeditions.active=[entry];Math.random=()=>0.5;
    var expectedReward=${recall?"expeditionRewardPlan(MAPS.find(m=>m.id==='grassland'),EXPEDITION_DISTANCES.short,entry.suitability,Math.random,.5)":"entry.reward"};
    var coinsBefore=save.coins,itemsBefore={...save.items},completedBefore=save.expeditions.completedCount;
    ${recall?'recallExpedition':'claimExpedition'}(entry.id);`);
  assert.equal(r.run('save.coins-coinsBefore'),r.run('expectedReward.coins'));
  assert(r.run('Object.entries(expectedReward.items).every(([id,n])=>save.items[id]===(itemsBefore[id]||0)+n)'));
  assert.equal(r.run('save.expeditions.active.length'),0);
  assert.equal(r.run('save.expeditions.completedCount-completedBefore'),recall?0:1);
}
// A: normalization, no EXP gain, and queue deduplication.
{
  const r=fixture();r.run('ins.exp=99;grantPartyExp(200);grantPartyExp(200)');queued(r);maxUnchanged(r);
  assert.equal(r.run('pendingEvolutions.length'),1);
  console.log('PASS A: MAX party EXP queues evolution without EXP gain');
}
// B/C: no consumption or save for MAX items; real confirmation and existing blockers.
{
  const r=fixture();r.run("useExpItemOnInstance('kilo_data',ins.uid)");
  assert.equal(r.run('currentEvolution.uid'),r.run('ins.uid'));
  assert(r.run("currentEvolution.choices.includes('highaquaron')"));
  assert(r.run("screens.includes('evolution')"));
  assert.equal(r.run('JSON.stringify(save.items)'),r.run('beforeItems'));maxUnchanged(r);
  assert.equal(r.run('writes'),0);
  for(const guard of ["normalVictoryReceipt={committed:false}","battleFeedback={finished:true}"]){
    const blocked=fixture();blocked.run(guard+";useExpItemOnInstance('kilo_data',ins.uid)");
    queued(blocked);assert.equal(blocked.run('currentEvolution'),null);
    assert.equal(blocked.run("screens.includes('evolution')"),false);
  }
  console.log('PASS B: MAX item reoffers without consumption; pending save/result guards retained');
}
{
  const r=fixture('slime');r.run("useExpItemOnInstance('kilo_data',ins.uid)");
  assert.match(r.run('alerts.at(-1)'),/はすでに Lv.MAX です！$/);
  assert.equal(r.run('pendingEvolutions.length'),0);assert.equal(r.run('currentEvolution'),null);
  assert.equal(r.run('JSON.stringify(save.items)'),r.run('beforeItems'));
  console.log('PASS C: ineligible MAX item behavior unchanged');
}
// D: actual claim and recall, normal rewards and post-commit delayed presentation.
for(const recall of [false,true]){
  const r=fixture();expedition(r,recall);queued(r);maxUnchanged(r);
  assert.equal(r.run('currentEvolution'),null);await r.flush();
  assert.equal(r.run('currentEvolution.uid'),r.run('ins.uid'));
  const coins=r.run('save.coins');r.run(`${recall?'recallExpedition':'claimExpedition'}('exp_save03')`);
  assert.equal(r.run('save.coins'),coins);
  console.log(`PASS D: ${recall?'recall':'claim'} rewards once and reoffers after commit`);
}
// E: decline does not requeue itself; next normal victory and reloaded save both reoffer.
{
  const r=fixture();
  r.run('grantPartyExp(20);processNextEvolution();cancelEvolution();processNextEvolution()');
  assert.equal(r.run('currentEvolution'),null);assert.equal(r.run('pendingEvolutions.length'),0);
  r.run(`prepareBattleParty();enemy={...by('slime'),expBonus:20,coinBonus:10};enemyLevel=1;
    selectedMap=MAPS.find(m=>m.id==='grassland');eHp=0;battleRewardGranted=false;win();`);
  queued(r);maxUnchanged(r);
  r.run(`save=parseAndPrepareSave(JSON.stringify(save),[]);ins=save.instances.find(i=>i.uid===ins.uid);
    pendingEvolutions=[];currentEvolution=null;normalVictoryReceipt=null;battleFeedback={finished:false};grantPartyExp(20);`);
  queued(r);maxUnchanged(r);
  console.log('PASS E: cancel stays dismissed; next victory/reload reoffers');
}
// F: below-MAX progression via all four routes keeps normal EXP/items/rewards.
for(const path of ['party','item','claim','recall','story']){
  const r=fixture('aquaron',15);r.run('ins.exp=needExp(ins.level)-1');
  if(path==='party')r.run('grantPartyExp(20)');
  if(path==='item'){
    r.run("useExpItemOnInstance('kilo_data',ins.uid)");
    assert.equal(r.run('save.items.kilo_data'),2);assert.equal(r.run('currentEvolution.uid'),r.run('ins.uid'));
  }
  if(path==='claim'||path==='recall')expedition(r,path==='recall');
  if(path==='story'){
    for(const file of ['map-story-data','map-story'])vm.runInContext(fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),r.context);
    r.run("startMapStoryEpisode('gl_01');skipMapStoryDialogue();launchMapStoryBattle('gl_01');eHp=0;win()");
  }
  if(path!=='item')queued(r);
  assert(r.run('ins.level>=16&&ins.level<100'));
  assert(r.run('ins.exp>=0'));
  console.log(`PASS F: below-MAX ${path} evolution retained`);
}
