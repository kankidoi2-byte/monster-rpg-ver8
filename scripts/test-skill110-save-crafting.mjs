import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime(),run=r.run,json=v=>JSON.parse(JSON.stringify(v));
vm.runInContext(fs.readFileSync(new URL('../js/skill-synthesis.js',import.meta.url),'utf8'),r.context);
const map=json(run('SKILL110_MIGRATION_MAP'));
const oldIds=Object.keys(map);
assert(oldIds.length>110,'all historical/legacy records present');
assert(Object.values(map).every(id=>/^s110_\d{3}$/.test(id)&&Number(id.slice(5))<=106));
// Every raw old ID is counted independently before aliases are normalized.
r.context.oldIds=oldIds;
run(`save=initSave();save.saveMeta.migrations=[];save.skillCards=Object.fromEntries(oldIds.map((id,i)=>[id,(i%4)+1]));save.equippedSkills={};
var oldSave=JSON.stringify(save);var oldTotal=Object.values(save.skillCards).reduce((a,b)=>a+b,0);
save=parseAndPrepareSave(oldSave,[]);`);
assert.equal(run('Object.values(save.skillCards).reduce((a,b)=>a+b,0)'),run('oldTotal'));
assert.equal(run('Object.keys(save.skill110UnmappedCards).length'),0);
const expected={};oldIds.forEach((id,i)=>expected[map[id]]=(expected[map[id]]||0)+(i%4)+1);
assert.deepEqual(json(run('save.skillCards')),expected);
assert.deepEqual(json(run('save.skill110MigrationBackup.skillCards')),JSON.parse(run('oldSave')).skillCards);
const stable=run('JSON.stringify(save)');
run('save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();migrateSkillSystem();');
assert.equal(run('JSON.stringify(save)'),stable,'reload/repeated init never converts or grants twice');
// Impossible imported equipment is unequipped, card counts remain; only missing basic attacks compensated.
run(`save=initSave();save.saveMeta.migrations=[];save.instances=[{uid:'a',id:'freigal',level:1},{uid:'b',id:'aquaron',level:1}];
save.skillCards={'s110_094':3,'s110_040':2,'s110_003':1};save.equippedSkills={a:['s110_094','s110_040'],b:['s110_003']};
save=parseAndPrepareSave(JSON.stringify(save),[]);`);
assert.equal(run('save.skillCards.s110_094'),3);assert.equal(run('save.skillCards.s110_040'),2);
assert.equal(run('save.skill110Migration.basicAttackCompensation'),2);
assert(run(`save.instances.every(ins=>getEquippedSkillIds(ins).some(id=>SKILL_BY_ID[id].power>0)&&equippedSkillCost(ins)<=skillCostLimitFor(by(ins.id),ins)&&getEquippedSkillIds(ins).every(id=>isSkillAllowedForMonster(id,by(ins.id))))`));
const repaired=run('JSON.stringify(save)');run('save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();');assert.equal(run('JSON.stringify(save)'),repaired);
// Unknown future IDs are quarantined with counts; synthetic ultimate IDs cannot become a legacy reward.
run(`save=initSave();save.saveMeta.migrations=[];save.skillCards={future_unknown:7,s110_107:3};save=parseAndPrepareSave(JSON.stringify(save),[]);`);
assert.equal(run('save.skill110UnmappedCards.future_unknown'),7);assert.equal(run('save.skill110UnmappedCards.s110_107'),3);assert.equal(run('save.skillCards.s110_107||0'),0);
// Separate account payloads and repeated import each carry their own marker and backup.
run(`var accountA=parseAndPrepareSave(oldSave,[]);var accountB=parseAndPrepareSave(oldSave,[]);accountA.skillCards.s110_001=(accountA.skillCards.s110_001||0)+9;
accountA=parseAndPrepareSave(JSON.stringify(accountA),[]);accountB=parseAndPrepareSave(JSON.stringify(accountB),[]);`);
assert.equal(run('(accountA.skillCards.s110_001||0)-(accountB.skillCards.s110_001||0)'),9);
// All newborn/evolved units grant legal initial cards only, never strongest cards.
run('save=initSave();M.forEach(mon=>{var ins=addInstance(mon.id,1);grantEvolutionSkillCardsForInstance(ins);});');
assert.equal(run("Object.keys(save.skillCards).some(id=>SKILL_BY_ID[id]?.cost===25&&save.skillCards[id]>0)"),false);
// Save double-click/reload/failure tests, with a persistence boundary that records the committed payload.
run(`var committed=null,persistOk=true,persistThrows=false;saveGame=()=>{save.saveMeta.lastSavedAt='attempt';if(persistThrows)throw Error('quota');if(!persistOk)return false;committed=JSON.stringify(save);return true;};`);
for(const recipe of json(run('SKILL110_SYNTHESIS_RECIPES'))){
 r.context.recipe=recipe;
 run('save=initSave();recipe.materials.forEach(id=>save.skillCards[id]=2);var preview=previewSkillSynthesis(recipe.id);var result=executeSkillSynthesis(recipe.id,{token:preview.token});');
 assert(run('result.ok'));assert.equal(run('save.skillCards[recipe.resultId]'),1);assert(run('recipe.materials.every(id=>save.skillCards[id]===1)'));
 assert.equal(run('executeSkillSynthesis(recipe.id,{token:preview.token}).ok'),false,'same token not reusable');
 run('save=parseAndPrepareSave(committed,[]);migrateSkillSystem();');assert.equal(run('save.skillCards[recipe.resultId]'),1);
 assert.equal(run('executeSkillSynthesis(recipe.id,{token:preview.token}).ok'),false,'reloaded token not reusable');
 assert.equal(run('skillSynthesisRecipe([...recipe.materials].reverse()).id'),recipe.id);
}
run(`save=initSave();var noMaterials=previewSkillSynthesis('synth110_107');`);assert.equal(run('noMaterials.ok'),false);
run(`save.skillCards={s110_091:1,s110_094:1};var preview=previewSkillSynthesis('synth110_107');save.skillCards.s110_091=2;`);
assert.equal(run("executeSkillSynthesis('synth110_107',{token:preview.token}).ok"),false,'stale preview rejected');
for(const throwing of [false,true]){
 r.context.throwing=throwing;
 run(`save=initSave();save.skillCards={s110_091:1,s110_094:1};persistOk=false;persistThrows=throwing;var preview=previewSkillSynthesis('synth110_107');var before=JSON.stringify(save);var result=executeSkillSynthesis('synth110_107',{token:preview.token});`);
 assert.equal(run('result.ok'),false);assert.equal(run('JSON.stringify(save)'),run('before'),'full rollback on failed save');
}
// Two copies equipped on two units: consume one, unequip exactly one, explicit confirmation required.
run(`persistOk=true;persistThrows=false;save=initSave();save.instances=[{uid:'a',id:'freigal',level:100},{uid:'b',id:'freigal',level:100}];
save.skillCards={s110_091:2,s110_094:1};save.equippedSkills={a:['s110_091'],b:['s110_091']};var preview=previewSkillSynthesis('synth110_107');var before=JSON.stringify(save);`);
assert.equal(run('preview.equipmentChanges.length'),1);
assert.equal(run("executeSkillSynthesis('synth110_107',{token:preview.token}).needsEquipmentConfirmation"),true);
assert.equal(run('JSON.stringify(save)'),run('before'));
assert(run("executeSkillSynthesis('synth110_107',{token:preview.token,confirmEquipment:true}).ok"));
assert.equal(run("countEquippedSkill('s110_091')"),1);assert.equal(run('save.skillCards.s110_091'),1);
console.log(`PASS skill110 save/crafting: ${oldIds.length} old IDs, sum-preserving migration, full backup, idempotence, illegal loadout repair, per-account/import isolation, no free ultimates, 4 recipes, reorder, confirmation, stale/repeated tokens, reload, save-failure rollback.`);
// Real persistence path: primary localStorage setItem is atomic; quota failure cannot consume materials.
const durable=runtime({save:source=>source+'\nglobalThis.actualSkill110SaveGame=saveGame;'});
vm.runInContext(fs.readFileSync(new URL('../js/skill-synthesis.js',import.meta.url),'utf8'),durable.context);
durable.run('saveGame=actualSkill110SaveGame;save=initSave();save.skillCards={s110_091:1,s110_094:1};saveGame();var committedBefore=localStorage.getItem(SAVE_KEY);var memoryBefore=JSON.stringify(save);var realSetItem=localStorage.setItem;');
durable.run("localStorage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error('quota');return realSetItem(key,value);};var p=previewSkillSynthesis('synth110_107');var failed=executeSkillSynthesis('synth110_107',{token:p.token});");
assert.equal(durable.run('failed.ok'),false);
assert.equal(durable.run('JSON.stringify(save)'),durable.run('memoryBefore'));
assert.equal(durable.run('localStorage.getItem(SAVE_KEY)'),durable.run('committedBefore'));
durable.run("localStorage.setItem=realSetItem;var p=previewSkillSynthesis('synth110_107');var succeeded=executeSkillSynthesis('synth110_107',{token:p.token});");
assert(durable.run('succeeded.ok'));
assert.equal(durable.run('JSON.parse(localStorage.getItem(SAVE_KEY)).skillCards.s110_107'),1);
durable.run('save=loadSave();migrateSkillSystem();');
assert.equal(durable.run('save.skillCards.s110_107'),1);
assert.equal(durable.run('save.skillCards.s110_091'),0);
console.log('PASS real localStorage synthesis: primary-write failure leaves memory/storage unchanged; retry commits material/result atomically; loadSave retains exactly one result.');
// Actual async import handler: cancelled/failed import must not replace the live account.
durable.context.location={reload(){durable.context.reloadCount=(durable.context.reloadCount||0)+1;}};
durable.run('save=initSave();save.coins=123;saveRecoveryReport=["existing report"];saveGame();var originalImportDisk=localStorage.getItem(SAVE_KEY);var originalImportMemory=JSON.stringify(save);var incoming=initSave();incoming.saveMeta.migrations=[];incoming.coins=999;incoming.skillCards={skill_voltax_03:4};var incomingRaw=JSON.stringify(incoming);');
durable.context.importFile={files:[{text:async()=>durable.run('incomingRaw')}],value:'legacy.json'};
durable.context.confirm=()=>false;
await durable.run('importSaveData(importFile)');
assert.equal(durable.run('JSON.stringify(save)'),durable.run('originalImportMemory'));
assert.equal(durable.run('localStorage.getItem(SAVE_KEY)'),durable.run('originalImportDisk'));
assert.equal(durable.context.reloadCount||0,0);
durable.context.confirm=()=>true;
durable.run("localStorage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error('import quota');return realSetItem(key,value);};");
await durable.run('importSaveData(importFile)');
assert.equal(durable.run('save.coins'),123,'failed import restores original live state');
assert.equal(durable.run('JSON.stringify(saveRecoveryReport)'),JSON.stringify(['existing report']));
assert.equal(durable.run('localStorage.getItem(SAVE_KEY)'),durable.run('originalImportDisk'));
assert.equal(durable.context.reloadCount||0,0);
durable.run('localStorage.setItem=realSetItem;downloadTextFile=()=>{};exportReplacementRecovery();acknowledgeReplacementRecovery();');
await durable.run('importSaveData(importFile)');
assert.equal(durable.run('save.coins'),999);
assert.equal(durable.context.reloadCount,1);
assert(durable.run("JSON.parse(localStorage.getItem(SAVE_KEY)).saveMeta.migrations.includes('skill_system_110_v1')"));
const importedCards=durable.run('JSON.stringify(save.skillCards)');
durable.run('save=loadSave();migrateSkillSystem();');
assert.equal(durable.run('JSON.stringify(save.skillCards)'),importedCards);
// Failed restoration also keeps current memory/report and does not reload.
durable.run('save=initSave();save.coins=123;saveRecoveryReport=["restore report"];saveGame();realSetItem(SAVE_BACKUP_KEY,incomingRaw);localStorage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error("restore quota");return realSetItem(key,value);};restoreLastKnownGood();');
assert.equal(durable.run('save.coins'),123);
assert.equal(durable.run('JSON.stringify(saveRecoveryReport)'),JSON.stringify(['restore report']));
assert.equal(durable.context.reloadCount,1);
assert.equal(durable.run('JSON.parse(localStorage.getItem(SAVE_REPLACEMENT_RECOVERY_KEY)).backupBefore'),durable.run('incomingRaw'),'failed restore retains exact recovery candidate in durable sidecar');
console.log('PASS actual import/restore handlers: cancellation, quota failure rollback of live state/report, successful110 migration commit, reload stability, failed restore never reloads.');
