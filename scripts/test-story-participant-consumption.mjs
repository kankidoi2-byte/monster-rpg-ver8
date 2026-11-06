import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
function setup(){
 const r=runtime({save:s=>s+'\nvar realStorySave=saveGame;'});
 for(const f of ['map-story-data','map-story'])vm.runInContext(fs.readFileSync(new URL(`../js/${f}.js`,import.meta.url),'utf8'),r.context);
 r.run(`typesHtml=()=>"";saveGame=realStorySave;showUiNotice=()=>{};renderBattleInputState=()=>{};save=initSave();save.progress.tutorial.status='completed';save.coins=10000;
 var catalyst=addInstance('freigal',1),keep=addInstance('aquaron',1);save.party=[catalyst.uid];startMapStoryEpisode('gl_01');skipMapStoryDialogue();launchMapStoryBattle('gl_01');
 save=loadSave();catalyst=getInstance(catalyst.uid);keep=getInstance(keep.uid);activeHuntRequest=null;enemy=null;partyBattle=[];save.party=[keep.uid];
 var recipe=ALCHEMY_RECIPES[0],materials=recipe.materialChoices.map(x=>x.normal);materials.forEach(id=>save.items[id]=10);
 var selection={recipeId:recipe.recipeId,mode:'normal',instanceUid:catalyst.uid,materialIds:materials,materialCounts:[1,1,1,1],coinOptionId:'low'};saveGame();`);
 return r;
}
{
 const r=setup(),run=r.run;
 assert(!run('alchemyEligibleInstances().some(i=>i.uid===catalyst.uid)'));
 const before=run('JSON.stringify(save)');
 run('var plan=alchemyPlan(selection);finalizeAlchemy(plan)');
 assert.equal(run('JSON.stringify(save)'),before,'A: direct finalizer rejects without consuming any resources');
 run('alchemyPlan=()=>plan;executeAlchemyConfirmed()');
 assert.equal(run('JSON.stringify(save)'),before,'A: direct execution also rejects');
 console.log('PASS A: suspended participant excluded and both execution entries preserve resources');
}
{
 const r=setup(),run=r.run;
 run('save.mapStories.grassland_whose.resume=null;var plan=alchemyPlan(selection);saveGame()');
 assert(run('alchemyEligibleInstances().some(i=>i.uid===catalyst.uid)'));
 assert.equal(run('validateAlchemyPlan(plan).length'),0);
 run('finalizeAlchemy(plan)');
 assert(!run('save.instances.some(i=>i.uid===catalyst.uid)'));
 console.log('PASS B: ordinary bench catalyst still consumed');
}
for(const condition of ['catalyst.locked=true','save.expeditions.active=[{memberUids:[catalyst.uid]}]','pendingEvolutions=[{uid:catalyst.uid}]','currentEvolution={uid:catalyst.uid}',"save.progress.tutorial={status:'in_progress'};catalyst.tutorialContract=true",'normalVictoryPending=()=>true','enemy=by("slime");var battleFeedback={finished:false};partyBattle=[{inst:catalyst}]']){
 const r=setup(),run=r.run;
 run('save.mapStories.grassland_whose.resume=null;'+condition);
 assert(run('Boolean(instanceConsumeBlockReason(catalyst))'),condition);
 assert(run('Boolean(rosterRecycleError(catalyst))'),condition);
 assert(!run('alchemyEligibleInstances().some(i=>i.uid===catalyst.uid)'),condition);
}
console.log('PASS C: shared lock/expedition/evolution/tutorial/battle/result protections');
{
 const r=setup(),run=r.run;
 run('save.instances=save.instances.filter(i=>i.uid!==catalyst.uid);saveGame();save=loadSave();document.getElementById("mapStoryPartyReturn").remove=()=>{};document.getElementById("partySet").prepend=()=>{};');
 const coins=run('save.coins');
 assert.equal(run('launchMapStoryBattle("gl_01")'),false);
 assert.equal(run('mapStoryState().resume.phase'),'pre');
 assert.equal(run('mapStoryState().resume.attemptId'),null);
 assert.equal(run('mapStoryState().resume.participantUids.length'),0);
 assert.equal(run('mapStoryState().resume.rewardCommitted||mapStoryState().resume.postPending'),false);
 assert.equal(run('loadSave().mapStories.grassland_whose.resume.phase'),'pre');
 run('editMapStoryParty();save.party=[keep.uid]');
 assert(run('launchMapStoryBattle("gl_01")'));
 run('eHp=0;win()');
 assert.equal(run('save.coins'),coins+run('GRASSLAND_STORY.episodes[0].firstReward.coins'));
 const awarded=run('JSON.stringify(save)');run('win();win()');assert.equal(run('JSON.stringify(save)'),awarded);
 console.log('PASS D: durable rescue, reselect/restart/victory and exactly one reward');
}
{
 const r=setup(),run=r.run;
 run('mapStoryState().resume.participantUids.push(keep.uid);save.instances=save.instances.filter(i=>i.uid!==catalyst.uid);saveGame();save=loadSave()');
 assert(run('launchMapStoryBattle("gl_01")'));
 assert.equal(run('activeHuntRequest.participantUids.length'),1);
 assert.equal(run('activeHuntRequest.participantUids[0]'),run('keep.uid'));
 console.log('PASS E: surviving participant resumes');
}
{
 const r=setup(),run=r.run;
 run('save.mapStories.grassland_whose.resume=null;var plan=alchemyPlan(selection);saveGame()');
 assert.equal(run('validateAlchemyPlan(plan).length'),0);
 run('save.mapStories.grassland_whose.resume={episodeId:"gl_01",phase:"battle",participantUids:[catalyst.uid]};saveGame()');
 const before=run('JSON.stringify(save)');run('finalizeAlchemy(plan)');
 assert.equal(run('JSON.stringify(save)'),before,'late protection checked again at finalization');
}
{
 const r=setup(),run=r.run;
 run('save.instances=save.instances.filter(i=>i.uid!==catalyst.uid);saveGame();var originalSet=localStorage.setItem;localStorage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error("quota");originalSet(key,value)}');
 assert.equal(run('launchMapStoryBattle("gl_01")'),false);
 assert.equal(run('mapStoryState().resume.phase'),'battle','failed rescue rolls back');
 run('localStorage.setItem=originalSet');assert(run('retryMapStorySave()'));
 assert.equal(run('mapStoryState().resume.phase'),'pre');
}
{
 const r=setup(),run=r.run;
 run('mapStoryState().episodes.gl_01={completed:false,firstVictory:true,firstRewardClaimed:true,victoryCount:1,lastAttemptId:mapStoryState().resume.attemptId};mapStoryState().resume.rewardCommitted=true;mapStoryState().resume.postPending=true;save.instances=save.instances.filter(i=>i.uid!==catalyst.uid);saveGame()');
 const coins=run('save.coins');run('launchMapStoryBattle("gl_01")');
 assert.equal(run('mapStoryState().resume.phase'),'post');assert.equal(run('save.coins'),coins);
}
console.log('PASS boundary: late protection, rescue quota rollback/retry, committed outcome never re-awarded');

{const r=setup(),run=r.run;run('mapStoryState().resume.rewardCommitted=true;save.instances=save.instances.filter(i=>i.uid!==catalyst.uid);saveGame()');const before=run('JSON.stringify(save)');assert.equal(run('launchMapStoryBattle("gl_01")'),false);assert.equal(run('JSON.stringify(save)'),before,'inconsistent committed flags without progress are not guessed or rewarded');}
