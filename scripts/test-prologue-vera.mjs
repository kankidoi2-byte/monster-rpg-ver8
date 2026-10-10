import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const baselineRef='ecc9d97621fb405d341071b75938e03db43c76df';
const old=vm.createContext({});vm.runInContext(execFileSync('git',['show',`${baselineRef}:js/data.js`],{encoding:'utf8'})+';globalThis.oldUnits=M;',old);
const r=runtime(),run=r.run,plain=x=>JSON.parse(JSON.stringify(x));
const noamIds=[2,3,4].map(n=>`character_noam_${n}`),veraIds=[3,4,5].map(n=>`character_vera_${n}`);
for(const id of noamIds)assert.equal(run(`by('${id}')`),undefined,'Noam must not be registered');
assert.equal(run("M.filter(u=>u.chapter==='第1章').length"),0,'Chapter 1 has no registrations');
assert.equal(run('M.length'),100);
assert.equal(run('MOVE_CARDS.length'),426);
assert(!run("MOVE_CARDS.some(c=>c.id.startsWith('skill_character_noam_'))"));
assert(!run("Object.keys(CHARACTER_SKILL_LEGACY_MOVES).some(id=>id.startsWith('skill_character_noam_'))"));
run(fs.readFileSync('js/dex.js','utf8'));
const slots=plain(run('characterDexEntries()'));
assert.equal(slots.length,50);assert.deepEqual(slots.slice(-3).map(u=>u.id),veraIds);
assert.deepEqual(slots.slice(-3).map(u=>u.prologueCharacterNo),[48,49,50]);
for(const [i,id] of veraIds.entries())assert.equal(run(`characterDexNumber(by('${id}'))`),`C-0${48+i}`);
const rates=plain(run('characterGachaRates()'));
assert.equal(rates.length,15);assert.equal(rates.find(x=>x.unit.id===veraIds[0]).rate,.02);
assert.equal(rates.filter(x=>x.unit.id!==veraIds[0]).length,14);
assert(rates.filter(x=>x.unit.id!==veraIds[0]).every(x=>x.rate===.07));
assert(Math.abs(rates.reduce((s,x)=>s+x.rate,0)-1)<1e-12);
let cursor=0;
for(const row of rates){
 r.context.roll=cursor+row.rate/2;assert.equal(run('pickCharacterGachaUnit(()=>roll).id'),row.unit.id);
 r.context.roll=cursor+row.rate-1e-10;assert.equal(run('pickCharacterGachaUnit(()=>roll).id'),row.unit.id);cursor+=row.rate;
}
assert(!rates.some(x=>noamIds.includes(x.unit.id)||veraIds.slice(1).includes(x.unit.id)));
assert.equal(run('pickCharacterGachaUnit(()=>1).id'),veraIds[0]);
assert.equal(run('pickCharacterGachaUnit(()=>-1).id'),'elna_beginner');
assert(!run("skillGachaPool('character').some(c=>c.sourceUnitId.startsWith('character_noam_'))"));
assert.equal(run("skillGachaPool('character').length"),106);
assert(run("skillGachaPool('character').some(c=>c.id==='s110_106')"),'Vera signature becomes shared fire/dark skill');
assert.equal(run("MONSTER_MOVE_CARDS.filter(c=>c.sourceUnitId.startsWith('character_vera_')).length"),0);
for(const [sourceIndex,id] of veraIds.entries()){
 const unit=plain(run(`by('${id}')`));assert.deepEqual(unit.types,['fire','dark']);
 r.context.unitId=id;
 run('save=initSave();var created=addInstance(unitId,1);');
 assert.deepEqual(plain(run('getEquippedSkillIds(created)')),unit.moves.map(m=>m[8]));
 assert(run('equippedSkillCost(created)<=skillCostLimitFor(by(unitId),created)'));
 assert(run('created.locked && !isContractableUnit(by(unitId)) && isAlchemyCatalystUnit(by(unitId))'));
 for(const move of unit.moves){
  r.context.cardId=move[8];
  assert(run('SKILL_BY_ID[cardId].exclusiveMonsterId===null'));
  assert(run('isSkillAllowedForMonster(cardId,by(unitId))'));
 }

}
// Real weighted draw, costs, save, three-form chain, retained UID/equipment and boundary levels.
run("save=initSave();save.coins=1000;var draw=performCharacterGacha(1,()=>.99);var v=draw.entries[0].instance;save.party=[v.uid];");
assert.equal(run('v.id'),veraIds[0]);assert.equal(run('save.coins'),900);
const vUid=run('v.uid'),vGear=plain(run('getEquippedSkillIds(v)'));
for(const [level,from,to] of [[10,veraIds[0],veraIds[1]],[25,veraIds[1],veraIds[2]]]){
 run(`v.level=${level-1}`);assert.equal(run('getEvoCandidates(v).length'),0);
 run(`v.level=${level};currentEvolution={uid:v.uid,from:v.id,choices:getEvoCandidates(v)};confirmEvolution(currentEvolution.choices[0]);`);
 assert.equal(run('v.id'),to);assert.equal(run('v.uid'),vUid);assert.deepEqual(plain(run('getEquippedSkillIds(v)')),vGear);
}
assert.equal(run('getEvoCandidates(v).length'),0);
run('save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();');
assert.equal(run('getInstance(save.party[0]).id'),veraIds[2]);
// Build an actual historical Noam save without reintroducing playable records.
run("save=initSave();save.instances=[];save.party=[];save.caught=[];save.skillCards={};save.equippedSkills={};save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);save.coins=4321;");
for(const [i,id] of noamIds.entries()){
 const oldUnit=old.oldUnits.find(u=>u.id===id);
 r.context.savedNoam={id,uid:`noam-old-${i}`,level:30,exp:17,locked:i===0,customField:'preserve'};
 r.context.oldCards=oldUnit.moves.map(m=>m[8]);
 run("save.instances.push(savedNoam);save.caught.push(savedNoam.id);save.equippedSkills[savedNoam.uid]=oldCards;oldCards.forEach(id=>save.skillCards[id]=11);");
}
run("var survivor=addInstance('freigal',10);save.party=[...save.instances.map(i=>i.uid)];save.homeFavoriteId='character_noam_3';save.expeditions.active=[{id:'old-exp',mapId:'grassland',distanceId:'short',memberUids:['noam-old-2'],progress:0}];save.customField={keep:true};save.saveMeta.migrations=save.saveMeta.migrations.filter(id=>id!=='skill_system_110_v1');var oldNoam=JSON.stringify(save.instances.slice(0,3));save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();");
assert.equal(run('save.instances.length'),1);
assert.equal(run('save.instances[0].id'),'freigal');
assert.deepEqual(plain(run('save.party')),[run('survivor.uid')]);
assert.equal(run('save.homeFavoriteId'),null);
assert(run('save.customField.keep && save.coins===4321'));
assert.equal(run('save.expeditions.active.length'),0);
assert.equal(run('save.quarantine.invalidExpeditions.length'),1);
assert.equal(run('save.quarantine.unknownInstances.length'),3);
assert.equal(run('JSON.stringify(save.quarantine.unknownInstances)'),run('oldNoam'));
assert.deepEqual(plain(run('save.quarantine.unknownCaughtIds')),noamIds);
assert(run("Object.keys(save.skillCards).every(id=>!id.startsWith('skill_character_noam_'))"));
assert(run("Object.keys(SKILL110_MIGRATION_MAP).filter(id=>id.startsWith('skill_character_noam_')).length===9"));
assert(run("Object.values(save.skillCards).reduce((a,b)=>a+b,0)>=99"),'all nine retired Noam card counts survive migration');
assert(!run("Object.keys(save.equippedSkills).some(uid=>uid.startsWith('noam-old-'))"));
assert(!run("save.instances.some(i=>i.id.startsWith('character_vera_'))"),'no implicit replacement grant');
const once=run('JSON.stringify(save)');
run('save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();');
assert.equal(run('JSON.stringify(save)'),once,'retired save repair is idempotent');
// A save containing only Noam must remain readable, with all old units quarantined.
run("save.instances=save.quarantine.unknownInstances;save.party=save.instances.map(i=>i.uid);save.quarantine.unknownInstances=[];save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();");
assert.equal(run('save.instances.length'),0);
assert.equal(run('save.party.length'),0);
assert.equal(run('save.quarantine.unknownInstances.length'),3);
assert.deepEqual(plain(run("getEvoCandidates({id:'character_noam_2',level:100})")),[]);
// Current game has no implicit Vera/Noam enemy, drop, starter or alchemy-result additions.
assert(run("MAPS.every(m=>m.enemyIds.every(id=>!id.startsWith('character_vera_')&&!id.startsWith('character_noam_')))"));
assert(run("M.filter(u=>u.id.startsWith('character_vera_')).every(u=>!isAlchemyResultEligible(u,'success')&&!isAlchemyResultEligible(u,'failure'))"));
console.log('PASS: Vera C-048–050, weighted 2%/7% draws, 110 shared skills, Lv10/25 chain, legal inheritance, Noam deletion and old-save quarantine, safe party/favorite/expedition cleanup, idempotent reload, no automatic grant.');
