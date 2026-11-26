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
// Tier draws: exhaust every result, test boundaries, no RNG before valid confirmation.
run(`var committed=null,persistOk=true,persistThrows=false;saveGame=()=>{save.saveMeta.lastSavedAt='attempt';if(persistThrows)throw Error('quota');if(!persistOk)return false;committed=JSON.stringify(save);return true;};`);
const tiers=json(run('SKILL_SYNTHESIS_TIERS'));
assert.deepEqual(tiers.map(t=>[t.tier,t.required,t.outcomes.map(o=>o.chance)]),[['low',3,[.7,.3]],['high',3,[.75,.25]],['super',3,[.9,.1]],['ultimate',2,[1]]]);
assert.deepEqual(tiers.map(t=>run(`skillSynthesisPool('${t.tier}').length`)),[60,30,16,4]);
for(const recipe of tiers){
 r.context.recipe=recipe;
 const material=run(`skillSynthesisPool(recipe.tier)[0].id`);
 let lower=0;
 for(const outcome of recipe.outcomes){
  const pool=json(run(`skillSynthesisPool('${outcome.tier}')`));
  for(let i=0;i<pool.length;i++){
   r.context.selection={[material]:recipe.required};r.context.draws=[lower+outcome.chance/2,(i+.5)/pool.length];
   run('save=initSave();save.skillCards={};Object.entries(selection).forEach(([id,n])=>save.skillCards[id]=n);var preview=previewSkillSynthesis(recipe.id,selection);var result=executeSkillSynthesis(recipe.id,{selection,token:preview.token,rng:()=>draws.shift()});');
   assert(run('result.ok'));assert.equal(run('result.resultId'),pool[i].id);assert.equal(run('draws.length'),0);
   assert.equal(run('Object.values(save.skillCards).reduce((n,v)=>n+v,0)'),1);
   assert.equal(run('save.coins'),run('initSave().coins'));
   assert.equal(run('executeSkillSynthesis(recipe.id,{selection,token:preview.token}).ok'),false,'token cannot commit twice');
   run('save=parseAndPrepareSave(committed,[]);migrateSkillSystem();');
   assert.equal(run('Object.values(save.skillCards).reduce((n,v)=>n+v,0)'),1,'reload does not repeat draw/consume');
  }
  lower+=outcome.chance;
 }
 // Exact rank boundary enters next tier. Zero and the highest valid value are reachable.
 for(const roll of [0,recipe.outcomes[0].chance-1e-10,...(recipe.outcomes.length>1?[recipe.outcomes[0].chance]:[]),1-1e-10]){
  r.context.selection={[material]:recipe.required};r.context.draws=[roll,1-1e-10];
  run('save=initSave();save.skillCards={...selection};var p=previewSkillSynthesis(recipe.id,selection);var result=executeSkillSynthesis(recipe.id,{selection,token:p.token,rng:()=>draws.shift()});');
  const expectedTier=roll<recipe.outcomes[0].chance?recipe.outcomes[0].tier:recipe.outcomes.at(-1).tier;
  assert.equal(run('skillSynthesisTierOf(SKILL_BY_ID[result.resultId])'),expectedTier);
 }
}
run("save=initSave();save.skillCards={s110_001:5,s110_002:2,s110_061:3};var selection={s110_001:2,s110_002:1};var p=previewSkillSynthesis('synth_tier_low_v1',selection);");
assert.equal(run("previewSkillSynthesis('synth_tier_low_v1',{s110_002:1,s110_001:2}).token"),run('p.token'),'order-independent selection');
for(const bad of [{},{s110_001:2},{s110_001:4},{s110_001:2,s110_061:1},{s110_001:2.5,s110_002:.5},{s110_001:-1,s110_002:4},{future:3},{skill_slime_01:3},{s110_002:3},{s110_001:Infinity}]){
 r.context.bad=bad;
 const before=run('JSON.stringify(save)');
 assert.equal(run("executeSkillSynthesis('synth_tier_low_v1',{selection:bad,token:p.token,rng:()=>{throw Error('must not roll');}}).ok"),false);
 assert.equal(run('JSON.stringify(save)'),before);
}
assert.equal(run("executeSkillSynthesis('synth110_107',{selection,token:p.token}).ok"),false,'retired fixed recipes cannot be invoked');
assert.equal(run("executeSkillSynthesis('synth_tier_low_v1',{selection:{s110_001:1,s110_002:2},token:p.token}).ok"),false,'selection token mismatch');
run('save.skillCards.s110_001+=1;');assert.equal(run("executeSkillSynthesis('synth_tier_low_v1',{selection,token:p.token}).ok"),false,'inventory staleness');
run("var p=previewSkillSynthesis('synth_tier_low_v1',selection);save=JSON.parse(JSON.stringify(save));");
assert.equal(run("executeSkillSynthesis('synth_tier_low_v1',{selection,token:p.token}).ok"),false,'identical profile/reloaded save cannot reuse preview');
// Duplicate selections remove exactly the oversubscribed equipment slots, with confirmation.
run(`save=initSave();save.instances=[{uid:'a',id:'freigal',level:100},{uid:'b',id:'freigal',level:100}];save.skillCards={s110_001:4};save.equippedSkills={a:['s110_001'],b:['s110_001']};var selection={s110_001:3};var p=previewSkillSynthesis('synth_tier_low_v1',selection);var before=JSON.stringify(save);`);
assert.equal(run('p.equipmentChanges.length'),1);
assert.equal(run("executeSkillSynthesis('synth_tier_low_v1',{selection,token:p.token,rng:()=>{throw Error('must not roll');}}).needsEquipmentConfirmation"),true);
assert.equal(run('JSON.stringify(save)'),run('before'));
assert(run("executeSkillSynthesis('synth_tier_low_v1',{selection,token:p.token,confirmEquipment:true,rng:()=>.99}).ok"));assert.equal(run("countEquippedSkill('s110_001')"),1);
// Save failure restores the entire save. Retrying the same preview retains its exact draw.
for(const throwing of [false,true]){
 r.context.throwing=throwing;
 run(`save=initSave();save.skillCards={s110_091:3};var selection={s110_091:3};persistOk=false;persistThrows=throwing;var p=previewSkillSynthesis('synth_tier_super_v1',selection);var before=JSON.stringify(save);var failed=executeSkillSynthesis('synth_tier_super_v1',{selection,token:p.token,rng:()=>.99});`);
 assert.equal(run('failed.ok'),false);assert.equal(run('JSON.stringify(save)'),run('before'));
 run('persistOk=true;persistThrows=false;');
 assert(run("executeSkillSynthesis('synth_tier_super_v1',{selection,token:p.token,rng:()=>{throw Error('must retain previous draw');}}).ok"));
 assert.equal(run('save.skillCards.s110_110'),1);
}
// Invalid RNG cannot consume, and a busy transaction cannot draw or commit.
for(const badRoll of [-.1,1,NaN,Infinity]){
 r.context.badRoll=badRoll;run("save=initSave();save.skillCards={s110_001:3};var selection={s110_001:3};var p=previewSkillSynthesis('synth_tier_low_v1',selection);var before=JSON.stringify(save);");
 assert.equal(run("executeSkillSynthesis('synth_tier_low_v1',{selection,token:p.token,rng:()=>badRoll}).ok"),false);assert.equal(run('JSON.stringify(save)'),run('before'));
}
run('skillSynthesisBusy=true;');assert.equal(run("executeSkillSynthesis('synth_tier_low_v1',{selection,token:p.token}).ok"),false);run('skillSynthesisBusy=false;');
// Historical records and already synthesized cards survive without a new migration.
run("save=initSave();save.skillCards={s110_107:4};save.skillSynthesis={version:1,sequence:9,lastRecipeId:'synth110_107',customHistory:'keep'};save=parseAndPrepareSave(JSON.stringify(save),[]);");
assert.equal(run('save.skillCards.s110_107'),4);assert.equal(run('save.skillSynthesis.lastRecipeId'),'synth110_107');
run("var selection={s110_107:2};var p=previewSkillSynthesis('synth_tier_ultimate_v1',selection);var result=executeSkillSynthesis('synth_tier_ultimate_v1',{selection,token:p.token,rng:()=>0});");
assert(run('result.ok'));assert.equal(run('save.skillSynthesis.customHistory'),'keep');assert.equal(run('save.skillSynthesis.sequence'),10);assert.equal(run('save.skillCards.s110_107'),3,'same card may return');
console.log(`PASS ${oldIds.length} old IDs and tier synthesis: all pools/results, exact rank boundaries, repeated/mixed/invalid selections, confirmation, stale/profile/double tokens, RNG validation, failure rollback and stable retry draw.`);
// Real persistence path: primary-write failure cannot consume, and loadSave retains exact result.
const durable=runtime({save:source=>source+'\nglobalThis.actualSkill110SaveGame=saveGame;'});
vm.runInContext(fs.readFileSync(new URL('../js/skill-synthesis.js',import.meta.url),'utf8'),durable.context);
durable.run('saveGame=actualSkill110SaveGame;save=initSave();save.skillCards={s110_091:3};saveGame();var selection={s110_091:3};var committedBefore=localStorage.getItem(SAVE_KEY);var memoryBefore=JSON.stringify(save);var realSetItem=localStorage.setItem;');
durable.run("localStorage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error('quota');return realSetItem(key,value);};var p=previewSkillSynthesis('synth_tier_super_v1',selection);var failed=executeSkillSynthesis('synth_tier_super_v1',{selection,token:p.token,rng:()=>.99});");
assert.equal(durable.run('failed.ok'),false);assert.equal(durable.run('JSON.stringify(save)'),durable.run('memoryBefore'));assert.equal(durable.run('localStorage.getItem(SAVE_KEY)'),durable.run('committedBefore'));
durable.run("localStorage.setItem=realSetItem;var p=previewSkillSynthesis('synth_tier_super_v1',selection);var succeeded=executeSkillSynthesis('synth_tier_super_v1',{selection,token:p.token,rng:()=>{throw Error('no redraw');}});");
assert(durable.run('succeeded.ok'));assert.equal(durable.run('JSON.parse(localStorage.getItem(SAVE_KEY)).skillCards.s110_110'),1);
durable.run('save=loadSave();migrateSkillSystem();');assert.equal(durable.run('save.skillCards.s110_110'),1);assert.equal(durable.run('save.skillCards.s110_091'),0);
console.log('PASS real localStorage synthesis: atomic material/result, unchanged disk/memory on quota failure, retry without reroll, loadSave exact result.');
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
