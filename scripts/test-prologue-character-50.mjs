import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime();
const run=r.run;
const current=run('M');
const baseline={};vm.createContext(baseline);
vm.runInContext(execFileSync('git',['show','53a9b57511022b5d04ea4f13b79f4d8514ba6b0c:js/data.js'],{encoding:'utf8'})+';globalThis.units=M;',baseline);
assert.equal(current.length,100);
for(const old of baseline.units)assert.equal(JSON.stringify(current.find(u=>u.id===old.id)),JSON.stringify(old),`preserve ${old.id}`);
const added=current.filter(u=>u.characterNo>=15);
assert.equal(added.length,36);
assert(added.every(u=>u.artworkPending && !u.imgKey && u.icon));
vm.runInContext(fs.readFileSync('js/ui.js','utf8').split('function replayUiMotion')[0],r.context);
for(const u of added){
 r.context.testId=u.id;
 assert(run('vis(by(testId)).includes(by(testId).name)'));
 run(`save=initSave();save.instances=[];save.party=[];var testIns=addInstance(testId,1);save.party=[testIns.uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);beginChosenBattle('grassland','slime','normal',activeHuntRequest);`);
 assert.equal(run('player.id'),u.id);
 assert(run('save.equippedSkills[testIns.uid].length>0'));
 for(const move of u.moves){
  r.context.testMove=move;
  run('pHp=Math.floor(playerMaxHp()/2);eHp=enemyMaxHp();');
  await run('doAttack(player,enemy,testMove,true)');
  assert(run('Number.isFinite(pHp)&&Number.isFinite(eHp)'));
 }
 assert(run('parseAndPrepareSave(JSON.stringify(save),[]).instances.some(ins=>ins.id===testId)'));
 if(u.evolution){
  assert.equal(run('getEvoCandidates(testIns).length'),0);
  run(`testIns.level=${u.evolutionLevel};`);
  assert.equal(run('getEvoCandidates(testIns)[0]'),u.evolution);
  run(`currentEvolution={uid:testIns.uid,from:testId,choices:getEvoCandidates(testIns)};confirmEvolution('${u.evolution}');`);
  assert.equal(run('testIns.id'),u.evolution);
  assert.equal(run('testIns.uid'),run('save.party[0]'));
  assert(run('parseAndPrepareSave(JSON.stringify(save),[]).instances.some(ins=>ins.id===testIns.id)'));
 }
}
// Complete both transitions for each family, preserving one instance and party UID.
for(const u of added.filter(u=>!u.evolutionOnly)){
 r.context.testId=u.id;
 run('save=initSave();save.instances=[];save.party=[];var chain=addInstance(testId,3);save.party=[chain.uid];');
 for(let stage=0;stage<2;stage++)run('currentEvolution={uid:chain.uid,from:chain.id,choices:getEvoCandidates(chain)};confirmEvolution(currentEvolution.choices[0]);');
 assert.equal(run('by(chain.id).rarity'),'★★★★');
 assert.equal(run('chain.uid'),run('save.party[0]'));
}
console.log('PASS: original 64 records unchanged; all 36 names render, attack/support handlers, save/reload; 12 complete evolution chains.');
