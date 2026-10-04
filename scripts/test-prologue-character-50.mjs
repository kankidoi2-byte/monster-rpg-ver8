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
for(const old of baseline.units){
 const unit=current.find(u=>u.id===old.id);
 if(old.id==='proto_icegolem'){
  // The subsequent Golem fix adds two normal attacks but retains all original fields and cards.
  assert.equal(unit.moves.length,old.moves.length+2);
  const legacyMoves=old.moves.map(move=>unit.moves.find(candidate=>candidate[8]===move[8]));
  assert.equal(JSON.stringify({...unit,moves:legacyMoves}),JSON.stringify(old),'preserve Golem legacy cards and non-move data');
 }else assert.equal(JSON.stringify(unit),JSON.stringify(old),`preserve ${old.id}`);
}
const added=current.filter(u=>u.characterNo>=15);
assert.equal(added.length,36);
for(const u of added){
 assert(u.icon);
 if(u.artworkPending) assert(!u.imgKey,`${u.id}: pending artwork has no active image`);
 else{
  r.context.artworkKey=u.imgKey;
  const path=run('IMG[artworkKey]');
  assert(path && fs.existsSync(path),`${u.id}: released artwork exists`);
 }
}
// Every exclusive card is usable only by its own form and later forms of the same character.
const families=added.filter(u=>!u.evolutionOnly).map(base=>{
 const middle=current.find(u=>u.id===base.evolution);
 return [base,middle,current.find(u=>u.id===middle.evolution)];
});
for(const family of families)for(const [sourceStage,source] of family.entries()){
 for(const move of source.moves)for(const target of current){
  const targetStage=family.findIndex(u=>u.id===target.id);
  r.context.cardUnderTest=move[8];r.context.unitUnderTest=target.id;
  assert.equal(run('isSkillAllowedForMonster(cardUnderTest,by(unitUnderTest))'),
    targetStage>=sourceStage,`${move[8]} -> ${target.id}: forward inheritance only`);
 }
}

vm.runInContext(fs.readFileSync('js/ui.js','utf8').split('function replayUiMotion')[0],r.context);
for(const u of added){
 r.context.testId=u.id;
 assert(run('vis(by(testId)).includes(by(testId).name)'));
 if(u.id.startsWith('character_remnes_') || u.id.startsWith('character_bordo_') || u.id.startsWith('character_safira_') || u.id.startsWith('character_brigitte_') || u.id.startsWith('character_tobia_') || u.id.startsWith('character_roden_') || u.id.startsWith('character_selene_') || u.id.startsWith('character_lize_')){
  const html=run('vis(by(testId))');
  assert.equal(u.artworkPending,false);
  assert(html.startsWith('<img') && html.includes(run('IMG[by(testId).imgKey]')),'Released character renders artwork');
  assert(!html.includes('character-artwork-pending'));
 }
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
 const beforeEquipment=[...run('getEquippedSkillIds(chain)')];
 const oldInventory=JSON.parse(run('JSON.stringify(save.skillCards)'));
 for(let stage=0;stage<2;stage++){
  run('currentEvolution={uid:chain.uid,from:chain.id,choices:getEvoCandidates(chain)};confirmEvolution(currentEvolution.choices[0]);');
  assert.deepEqual([...run('getEquippedSkillIds(chain)')],beforeEquipment,'evolution retains earlier equipped moves');
  assert(run('defaultSkillIdsForMonster(by(chain.id),chain).every(id=>save.skillCards[id]>=1)'),'new form cards are granted alongside retained equipment');
 }
 for(const [id,count] of Object.entries(oldInventory)){
  r.context.oldCard=id;assert.equal(run('save.skillCards[oldCard]'),count,'old card ownership is retained');
 }
 const savedUid=run('chain.uid');
 run('save= parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();chain=getInstance(save.party[0]);');
 assert.equal(run('chain.uid'),savedUid);
 assert.deepEqual([...run('getEquippedSkillIds(chain)')],beforeEquipment,'inherited equipment survives reload');
 const reloaded=run('JSON.stringify(save.skillCards)');
 run('migrateSkillSystem()');
 assert.equal(run('JSON.stringify(save.skillCards)'),reloaded,'reload must not duplicate skill cards');
 // Exercise inherited attack through actual battle processing after both evolutions.
 run("prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');activeHuntRequest=createHuntRequest(selectedMap,enemy,'easy',[]);activeHuntRequest.battleMode='single';beginChosenBattle('grassland','slime','easy',activeHuntRequest);");
 const hpBefore=run('eHp');
 await run('doAttack(player,enemy,getEquippedMovesForInstance(activeInstance)[0],true)');
 assert(run('eHp')<hpBefore,'inherited attack deals damage in battle');

 assert.equal(run('by(chain.id).rarity'),'★★★★');
 assert.equal(run('chain.uid'),run('save.party[0]'));
}
console.log('PASS: original records preserved except additive Golem attack fix; all 36 names render, attack/support handlers, save/reload; 12 complete evolution chains; exclusive skill inheritance, ownership, reload and battle.');
