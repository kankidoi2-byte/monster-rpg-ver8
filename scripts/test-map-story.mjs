import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime({save:src=>src+'\nvar mapStoryRealSave=saveGame;'}),run=r.run;
for(const file of ['map-story-data','map-story'])vm.runInContext(fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),r.context);
run(`saveGame=mapStoryRealSave;renderBattleInputState=()=>{};showUiNotice=()=>{};save=initSave();save.progress.tutorial.status='completed';for(const id of ['galdra','freigal','aquaron']){const ins=addInstance(id,1);save.party.push(ins.uid);}saveGame();`);
const json=code=>JSON.parse(run(`JSON.stringify(${code})`));
const episodes=json('GRASSLAND_STORY.episodes');
assert.equal(episodes.length,11);assert.equal(episodes.filter(e=>e.battleMode==='three_way').length,2);
assert.equal(episodes.reduce((sum,e)=>sum+e.firstReward.exp,0),4070);
assert.equal(episodes.reduce((sum,e)=>sum+e.firstReward.coins,0),1265);
assert.equal(episodes.flatMap(e=>[...e.preNodes,...e.postNodes]).filter(n=>n.speaker==='contractor').length,15);
for(const e of episodes){
 for(const nodes of [e.preNodes,e.postNodes])nodes.forEach((n,i)=>assert.equal(Number(n.id.slice(-2)),i+1));
 for(const spec of e.enemies){r.context.spec=spec;assert(run('spec.moveIds.every(id=>SKILL_BY_ID[id])'));assert.equal(run('maxHp(by(spec.speciesId),spec.level)'),spec.hp);assert.equal(run('by(spec.speciesId).spd'),spec.speed);}
}
run("save.progress.tutorial.status='in_progress'");assert.equal(run('startMapStoryEpisode("gl_01")'),false);
run("save.progress.tutorial.status='skipped'");assert.equal(run('mapStoryAvailable()'),true);
assert.equal(run('startMapStoryEpisode("gl_02")'),false);
const initial=json('save');
const initialInstanceIds=initial.instances.map(i=>i.uid);
// Conversation controls persist only the existing cursor, never bypass battles.
run('startMapStoryEpisode("gl_01")');
const firstNode=run('mapStoryState().resume.nodeId');
run('previousMapStoryNode()');assert.equal(run('mapStoryState().resume.nodeId'),firstNode);
run('advanceMapStoryNode();previousMapStoryNode()');assert.equal(run('mapStoryState().resume.nodeId'),firstNode);
run('skipMapStoryDialogue()');assert.equal(run('mapStoryState().resume.nodeId'),null);
assert.equal(run('mapStoryState().resume.phase'),'pre');assert.equal(run('mapStoryProgress("gl_01").completed'),false);
assert.deepEqual(json('save.instances'),initial.instances);assert.equal(run('save.coins'),initial.coins);
run('previousMapStoryNode()');assert.equal(run('mapStoryState().resume.nodeId'),episodes[0].preNodes.at(-1).id);
run('closeMapStoryDialogue();save=loadSave();startMapStoryEpisode("gl_01")');
assert.equal(run('mapStoryState().resume.nodeId'),episodes[0].preNodes.at(-1).id);
const beforeNormal=json('createHuntRequest(MAPS.find(m=>m.id==="grassland"),by("slime"),"easy",[])');
function pre(id){assert.equal(run(`startMapStoryEpisode('${id}')`),true);for(let i=0;i<40&&run('mapStoryState().resume.nodeId!==null');i++)run('advanceMapStoryNode()');}
function victory(){run('if(multiBattle?.active){multiBattle.enemies.forEach(e=>{e.hp=0;e.alive=false;});winMultiBattle();}else{eHp=0;win();}');}
function finish(){run('resumeMapStoryAfterBattle()');for(let i=0;i<40&&run('mapStoryState().resume.nodeId!==null');i++)run('advanceMapStoryNode()');run('completeMapStoryEpisode()');}
for(const e of episodes){
 pre(e.id);const coins=run('save.coins');assert(run(`launchMapStoryBattle('${e.id}')`));
 assert.equal(run(`launchMapStoryBattle('${e.id}')`),false,'double start rejected');
 assert.equal(run('activeHuntRequest.source'),'map_story');assert.equal(run('activeHuntRequest.invasionEnemyId'),null);
 assert.equal(run('activeHuntRequest.conditions.length'),0);
 if(e.enemies.length===2)assert.deepEqual(json('multiBattle.enemies.map(e=>({level:e.level,hp:e.hp,moves:e.mon.moves.map(m=>m[8])}))'),e.enemies.map(s=>({level:s.level,hp:s.hp,moves:s.moveIds})));
 else assert.deepEqual(json('enemy.moves.map(m=>m[8])'),e.enemies[0].moveIds);
 assert.equal(run('askUseContractScroll("contract_scroll")'),false);
 victory();assert.equal(run('save.coins'),coins+e.firstReward.coins);
 assert.equal(run(`mapStoryProgress('${e.id}').completed`),false,'victory alone cannot unlock next');
 const awarded=json('save');run('win();winMultiBattle()');assert.deepEqual(json('save'),awarded,'duplicate outcome cannot grant rewards');
 // Serialize/reload from real save, then continue post-dialogue without another battle.
 run('save=loadSave();activeHuntRequest=null;mapStoryUi=null');
 assert.equal(run(`startMapStoryEpisode('${e.id}')`),true);assert.equal(run('mapStoryUi.phase'),'post');
 const first=run('mapStoryState().resume.nodeId');run('advanceMapStoryNode()');const cursor=run('mapStoryState().resume.nodeId');assert.notEqual(cursor,first);
 run('closeMapStoryDialogue();save=loadSave()');run(`startMapStoryEpisode('${e.id}')`);assert.equal(run('mapStoryState().resume.nodeId'),cursor);
 if(e.number===1){
  const beforeSkip=json('save');run('skipMapStoryDialogue()');
  assert.equal(run('mapStoryState().resume.phase'),'post');assert.equal(run('mapStoryProgress("gl_01").completed'),false);
  assert.equal(run('save.coins'),beforeSkip.coins);assert.deepEqual(json('save.instances'),beforeSkip.instances);
  run('previousMapStoryNode()');assert.equal(run('mapStoryState().resume.nodeId'),e.postNodes.at(-1).id);
 }
 finish();assert.equal(run(`mapStoryProgress('${e.id}').completed`),true);
}
assert.equal(run('save.coins'),initial.coins+1265);
assert(json('save.instances').every(i=>i.level===12&&i.exp===110));
assert.deepEqual(json('save.instances.map(i=>i.uid)'),initialInstanceIds);
for(const field of ['history','items','worldMap','expeditions','contractor'])assert.deepEqual(json(`save.${field}`),initial[field],`${field} untouched by story rewards`);
const completed=json('save');run('readMapStoryEpisode("gl_01")');for(let i=0;i<25;i++)run('advanceMapStoryNode()');run('completeMapStoryEpisode()');assert.deepEqual(json('save'),completed,'re-reading never writes');
run('readMapStoryEpisode("gl_01");advanceMapStoryNode();previousMapStoryNode()');assert.equal(run('mapStoryUi.cursor'),0);
run('skipMapStoryDialogue()');assert.equal(run('mapStoryUi.phase'),'pre');assert.equal(run('mapStoryUi.cursor'),episodes[0].preNodes.length);
run('advanceMapStoryNode();skipMapStoryDialogue();previousMapStoryNode()');assert.equal(run('mapStoryUi.cursor'),episodes[0].postNodes.length-1);
run('skipMapStoryDialogue();completeMapStoryEpisode()');assert.deepEqual(json('save'),completed,'replay back/skip never writes progress or rewards');
run('startMapStoryEpisode("gl_01",true)');assert.equal(run('mapStoryState().resume.nodeId'),null);run('launchMapStoryBattle("gl_01")');victory();assert.equal(run('save.coins'),completed.coins+10);assert.equal(run('mapStoryProgress("gl_01").victoryCount'),2);finish();
// Save failure rolls back EXP/coins/flags together; retry commits exactly once.
run('startMapStoryEpisode("gl_01",true);launchMapStoryBattle("gl_01")');
const beforeFailure=json('save');const originalSet=r.context.localStorage.setItem;
r.context.localStorage.setItem=(key,value)=>{if(key==='mb_v95c')throw Error('quota');originalSet(key,value);};
const errorLog=r.context.console;r.context.console={...console,error(){}};
victory();assert.deepEqual(json('save'),beforeFailure);assert(run('mapStorySaveRetry!==null'));
assert.equal(run('mapStoryProgress("gl_01").victoryCount'),2);
r.context.localStorage.setItem=originalSet;run('retryMapStorySave();retryMapStorySave()');assert.equal(run('save.coins'),beforeFailure.coins+10);assert.equal(run('mapStoryProgress("gl_01").victoryCount'),3);finish();r.context.console=errorLog;
// Interrupted battle restarts at turn zero, preserving its party snapshot.
run('startMapStoryEpisode("gl_03",true);launchMapStoryBattle("gl_03");var oldStoryRequest=activeHuntRequest;saveGame();save=loadSave();activeHuntRequest=null;mapStoryUi=null;partyBattle=[];battleTurnCount=9;');
assert(run('startMapStoryEpisode("gl_03")'));assert.equal(run('battleTurnCount'),0);assert(json('multiBattle.enemies').every(e=>e.hp===e.maxHp));
assert.equal(run('mapStoryTokenValid(oldStoryRequest)'),false);
const beforeStale=json('save');run('mapStoryOutcome("victory",oldStoryRequest)');assert.deepEqual(json('save'),beforeStale);
run('runAwayFromMultiBattle()');assert.equal(run('mapStoryState().resume.phase'),'pre');assert.equal(run('mapStoryProgress("gl_03").completed'),true,'repeat retreat preserves prior completion');assert.equal(run('mapStoryProgress("gl_03").victoryCount'),1);
run('resumeMapStoryAfterBattle();launchMapStoryBattle("gl_03");losePartyBattle()');assert.equal(run('mapStoryState().resume.phase'),'pre');assert.equal(run('mapStoryProgress("gl_03").victoryCount'),1);
// Additive old-save defaults preserve other maps and unrecognized version fields.
run('var old=structuredClone(save);delete old.mapStories;repairSave(old)');assert.deepEqual(json('old.mapStories.grassland_whose'),{version:1,episodes:{},resume:null});
run('old.mapStories.other_map={version:9,custom:"keep"};old.mapStories.grassland_whose.futureField="keep";repairSave(old)');assert.deepEqual(json('old.mapStories.other_map'),{version:9,custom:'keep'});assert.equal(run('old.mapStories.grassland_whose.futureField'),'keep');
assert.equal(beforeNormal.source,undefined);assert.equal(beforeNormal.difficultyId,'easy');
console.log('PASS grassland map story: 11 episodes, exact IDs/HP/moves, 15 contractor lines, gates, full rewards, replay, retreat/defeat, real save/reload, atomic failure/retry and stale attempts.');
