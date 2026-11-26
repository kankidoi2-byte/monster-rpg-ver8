import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime(), run=s=>r.run(s);
vm.runInContext(fs.readFileSync('js/auto-battle.js','utf8'),r.context);
run(`save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
selectedMap=MAPS.find(m=>m.id==='grassland');activeHuntRequest={mapId:selectedMap.id,difficultyId:'d2'};
var candidates=autoProgress(selectedMap,'d2').targets;enemy=candidates[0];
multiBattle={enemies:[{mon:candidates[0],defeatedByPlayer:true},{mon:candidates[1],defeatedByPlayer:false}]};
autoRecordVictory(true)`);
assert.equal(run("save.autoBattle.defeated['grassland:d2'].join()"),run('enemy.id'));
run('for(const m of candidates){enemy=m;autoRecordVictory(false)}');
assert(run("autoProgress(selectedMap,'d2').open"));
assert(!run("autoProgress(selectedMap,'d1').open"));
run("selectedMap={...selectedMap,enemyIds:[...selectedMap.enemyIds,'luxseed']}");
assert(run("autoProgress(selectedMap,'d2').open"));
assert.equal(run("autoProgress(MAPS.find(m=>m.id==='light_plain'),'d4').targets.length"),3);
for(const setup of ["activeHuntRequest.worldMapEventKey='elysia'","activeHuntRequest.source='map_story'","selectedMap.goldenLand=true","save.progress.tutorial=tutorialSaveDefaults()"]){
 run("var priorMap={...selectedMap},priorRequest={...activeHuntRequest},priorTutorial=save.progress.tutorial;"+setup);
 assert(!run('autoEligible()'));run('selectedMap=priorMap;activeHuntRequest=priorRequest;save.progress.tutorial=priorTutorial');
}
assert.equal(run("autoChooseMove([['弱',12,'normal'],['強',60,'normal'],['回',0,'normal','heal']],enemy,.35)"),1);
assert.equal(run("autoChooseMove([['強',60,'normal'],['回',0,'normal','heal']],enemy,.349)"),1);
assert.equal(run("autoChooseMove([],enemy,.1)"),-1);
assert(run("normalizeAutoBattle({defeated:{'x:easy':[1,'slime','slime']},unlocked:2,settings:{times:-1,speed:9}}).defeated['x:d1'].length===1"));
console.log('PASS unlock attribution, permanent unlock, eligible fields and opponents, AI and malformed records.');
