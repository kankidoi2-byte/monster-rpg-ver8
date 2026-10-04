import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const baselineRef='ecc9d97621fb405d341071b75938e03db43c76df';
const old=vm.createContext({});vm.runInContext(execFileSync('git',['show',`${baselineRef}:js/data.js`],{encoding:'utf8'})+';globalThis.oldUnits=M;',old);
const r=runtime(),run=r.run,plain=x=>JSON.parse(JSON.stringify(x));
const noamIds=[2,3,4].map(n=>`character_noam_${n}`),veraIds=[3,4,5].map(n=>`character_vera_${n}`);
for(const id of noamIds){
 const before=plain(old.oldUnits.find(u=>u.id===id)),after=plain(run(`by('${id}')`));
 assert.deepEqual(after,{...before,chapter:'第1章'},'only Noam chapter metadata changes');
}
run(fs.readFileSync('js/dex.js','utf8'));
const slots=plain(run('characterDexEntries()'));
assert.equal(slots.length,50);assert.deepEqual(slots.slice(-3).map(u=>u.id),veraIds);
assert.deepEqual(slots.slice(-3).map(u=>u.prologueCharacterNo),[48,49,50]);
for(const [i,id] of veraIds.entries())assert.equal(run(`characterDexNumber(by('${id}'))`),`C-0${48+i}`);
for(const id of noamIds)assert.equal(run(`characterDexNumber(by('${id}'))`),'第1章・図鑑番号未定');
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
assert.equal(run("skillGachaPool('character').filter(c=>c.sourceUnitId.startsWith('character_vera_')).length"),9);
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
  for(const target of plain(run('M'))){r.context.targetId=target.id;
   assert.equal(run('isSkillAllowedForMonster(cardId,by(targetId))'),veraIds.indexOf(target.id)>=sourceIndex,`${move[8]} only forward within Vera`);
  }
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
// Old Noam saves: use production repair, preserved custom state, all cards, UIDs, party, favorite and expedition.
run("save=initSave();save.instances=[];save.party=[];save.caught=[];save.skillCards={};save.equippedSkills={};save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);save.coins=4321;");
for(const [i,id] of noamIds.entries()){
 run(`var n=addInstance('${id}',30);n.uid='noam-old-${i}';save.equippedSkills[n.uid]=by(n.id).moves.map(m=>m[8]);n.locked=${i===0};`);
}
run("save.party=save.instances.map(i=>i.uid);save.homeFavoriteId='character_noam_3';save.expeditions.active=[{id:'old-exp',mapId:'grassland',distanceId:'short',memberUids:['noam-old-2'],progress:0}];save.customField={keep:true};save.instances.forEach(i=>by(i.id).moves.forEach(m=>{save.skillCards[m[8]]=11}));var before=JSON.stringify(save);save=parseAndPrepareSave(before,[]);migrateSkillSystem();");
assert.equal(run('save.instances.length'),3);assert.deepEqual(plain(run('save.party')),['noam-old-0','noam-old-1','noam-old-2']);
assert.equal(run('save.homeFavoriteId'),'character_noam_3');assert(run('save.customField.keep && save.coins===4321'));
assert.deepEqual(plain(run('save.expeditions.active[0].memberUids')),['noam-old-2']);
assert.equal(run('save.quarantine.unknownInstances.length'),0);
assert(run("save.instances.every(i=>by(i.id).moves.every(m=>save.skillCards[m[8]]===11&&isEquippedSkillUsableForMonster(m[8],by(i.id))))"));
const once=run('JSON.stringify(save)');run('migrateSkillSystem()');assert.equal(run('JSON.stringify(save)'),once);
assert(!run("save.instances.some(i=>i.id.startsWith('character_vera_'))"));
// A previously owned base Noam still evolves even after retirement from new acquisition.
run("var n=getInstance('noam-old-0');currentEvolution={uid:n.uid,from:n.id,choices:getEvoCandidates(n)};confirmEvolution(currentEvolution.choices[0]);");
assert.equal(run('n.id'),noamIds[1]);assert.equal(run('n.uid'),'noam-old-0');
// Current game has no implicit Vera/Noam enemy, drop, starter or alchemy-result additions.
assert(run("MAPS.every(m=>m.enemyIds.every(id=>!id.startsWith('character_vera_')&&!id.startsWith('character_noam_')))"));
assert(run("M.filter(u=>u.id.startsWith('character_vera_')).every(u=>!isAlchemyResultEligible(u,'success')&&!isAlchemyResultEligible(u,'failure'))"));
console.log('PASS: Vera C-048–050, weighted 2%/7% draws, nine skills, Lv10/25 chain, exclusive inheritance, old Noam identities/cards/UIDs/party/favorite/expedition, idempotent reload, no automatic grant.');
