import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime({save:s=>s+'\nglobalThis.realIncenseSave=saveGame;'});
for(const f of ['auto-battle','world-map'])vm.runInContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'),r.context);
r.context.console={...console,error(){}};
const run=r.run;
run(`save=initSave();saveGame=realIncenseSave;save.progress.tutorial.status='completed';
var hero=addInstance('aquaron',1);save.party=[hero.uid];
var latestRequest=null,tutorialIntercept=false;
startChosenBattle=(map,mon,difficulty,id)=>{latestRequest=preparedHuntRequest(id,map,mon,difficulty)};
var handleTutorialWorldMapDeparture=()=>tutorialIntercept;
var tutorialBattleSession={active:false};
var step=(map='grassland',d='d1',event=null)=>{worldMapDeparting=false;latestRequest=null;return startWorldMapExploration(map,d,event)};
var disk=()=>JSON.parse(localStorage.getItem(SAVE_KEY));`);
assert.equal(run('save.strongIncenseRemainingDepartures'),0);
assert.equal(run('repairSave({...save,strongIncenseRemainingDepartures:undefined}).strongIncenseRemainingDepartures'),0);
assert.equal(run('repairSave({...save,strongIncenseRemainingDepartures:100}).strongIncenseRemainingDepartures'),10);
assert.equal(run('repairSave({...save,strongIncenseRemainingDepartures:-5}).strongIncenseRemainingDepartures'),0);
run("var map=MAPS.find(m=>m.id==='grassland'),mon=by('slime');var encounter=(rank,roll,boosted)=>createHuntRequest(map,mon,'d1',[],{randomFn:()=>roll,contractorRank:rank,strongIncenseBoosted:boosted}).overtier;");
for(const [rank,roll] of [[1,.299],[50,.399]]){
 assert.equal(run(`encounter(${rank},${roll},false)`),null);
 assert.equal(run(`encounter(${rank},${roll},true)`),'stronger');
}
assert.equal(run('encounter(1,.301,true)'),null);
assert.equal(run('encounter(50,.401,true)'),null);
run("save.items.strong_incense=2;Math.random=()=>.25;");
assert(run('useStrongIncense()'));
assert(!run('useStrongIncense()'));
assert.equal(run('disk().items.strong_incense'),1);
assert.equal(run('disk().strongIncenseRemainingDepartures'),10);
// World-map exceptions do not use or debit the effect.
assert(run("save.items.golden_land_map=1;save.goldenLandMapReady=true;step('golden_land','d4')"));
assert.equal(run('latestRequest.strongIncenseBoosted'),undefined);
assert(run("map.enemyIds.push(M.find(m=>m.rarity==='★★★★★'&&!m.alchemyExclusive&&!['hikari','doom_nemesion','false_dragon_alfa'].includes(m.id)).id);step('grassland','extreme')"));
assert.equal(run('latestRequest.strongIncenseBoosted'),undefined);
assert(run("tutorialIntercept=true;step()"));
assert.equal(run('latestRequest'),null);
assert(run("tutorialIntercept=false;tutorialBattleSession.active=true;step()"));
assert.equal(run('latestRequest.strongIncenseBoosted'),undefined);
run('tutorialBattleSession.active=false');
assert.equal(run('disk().strongIncenseRemainingDepartures'),10);
// Ten manual departures each persist before battle start. No victory is needed.
for(let i=9;i>=0;i--){
 assert(run('step()'));
 assert.equal(run('latestRequest.overtier'),'stronger');
 assert.equal(run('disk().strongIncenseRemainingDepartures'),i);
 run('save=loadSave()');
}
assert(run('step()'));
assert.equal(run('latestRequest.overtier'),null);
assert.equal(run('disk().strongIncenseRemainingDepartures'),0);
// A failed save does not enter battle or decrement.
run("save.strongIncenseRemainingDepartures=1;saveGame();var realWrite=localStorage.setItem;localStorage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error('quota');realWrite(key,value)};");
assert(!run('step()'));
assert.equal(run('latestRequest'),null);
assert.equal(run('save.strongIncenseRemainingDepartures'),1);
assert.equal(run('disk().strongIncenseRemainingDepartures'),1);
run('localStorage.setItem=realWrite');
// A persistent auto fight writes the debit and seed in a single save, including the last dose.
run("var boostedSeed=Array.from({length:100},(_,i)=>i).find(i=>{const rand=autoSeedRandom(i);rand();rand();const x=rand();return x>.10&&x<.30;});autoRun=autoNewRun('grassland','d1',5,true);autoRun.seed=boostedSeed;var writes=0;localStorage.setItem=(key,value)=>{if(key===SAVE_KEY)writes++;realWrite(key,value)};");
assert(run('step()'));
assert.equal(run('writes'),1);
assert.equal(run('disk().strongIncenseRemainingDepartures'),0);
assert.equal(run('disk().autoBattle.run.strongIncenseBoosted'),true);
assert.equal(run('disk().autoBattle.run.phase'),'fight');
assert.equal(run('latestRequest.overtier'),'stronger');
run("var firstRequest=latestRequest;save=loadSave();autoRun=null;worldMapDeparting=false;gBlessUnlocked=()=>true;");
assert(run('autoResumeSavedRun()'));
assert.equal(run('writes'),1);
assert.equal(run('save.strongIncenseRemainingDepartures'),0);
assert.equal(run('latestRequest.strongIncenseBoosted'),true);
for(const key of ['enemyId','enemyLevel','overtier','battleMode','secondEnemyId','invasionEnemyId'])assert.equal(run(`latestRequest.${key}`),run(`firstRequest.${key}`),key);
run("save.strongIncenseRemainingDepartures=2;autoRun.phase='depart';autoRun.seed=124;");
assert(run('step()'));
assert.equal(run('disk().strongIncenseRemainingDepartures'),1);
assert.equal(run('disk().autoBattle.run.seed'),124);
run("autoRun.phase='depart';autoRun.seed=125;localStorage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error('quota');realWrite(key,value)};");
assert(!run('step()'));
assert.equal(run('latestRequest'),null);
assert.equal(run('save.strongIncenseRemainingDepartures'),1);
assert.equal(run('disk().autoBattle.run.seed'),124);
console.log('Strong incense: additive old saves; rank +20pp; use/stack guard; 10 persisted departures; Golden Land, Extreme and tutorial excluded; failed save rollback; atomic auto checkpoint and reload replay.');
