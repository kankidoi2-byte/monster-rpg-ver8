import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime(),json=v=>JSON.parse(JSON.stringify(v));
const targets=json(r.run('EVOLUTION_NATIVE_CARD_TARGETS'));
for(const [form,oldIds] of Object.entries(targets)){
 r.context.form=form;r.context.oldIds=oldIds;
 for(const amount of [0,1,2,11,99]){
  r.context.amount=amount;
  r.run(`save=initSave();save.saveMeta.migrations=[];
   save.instances=[{uid:'owner',id:form,level:100,exp:0,locked:true}];save.equippedSkills={owner:[]};
   save.skillCards=Object.fromEntries(oldIds.map(id=>[id,amount]));
   save=parseAndPrepareSave(JSON.stringify(save),[]);var before=JSON.stringify(save.skillCards);
   migrateSkillSystem();migrateEvolutionNativeSkillCards();migrateSkillSystem();`);
  assert.equal(r.run('JSON.stringify(save.skillCards)'),r.run('before'),'retired evolution backfill cannot grant after110');
  assert.equal(r.run('Object.values(save.skillCards).reduce((a,b)=>a+b,0)'),oldIds.length*amount+r.run('save.skill110Migration.basicAttackCompensation'),'old99 inventory retained under approved110 migration');
  assert(r.run("Object.keys(save.skillCards).every(id=>SKILL_BY_ID[id]?.cost<=20)"));
  const stable=r.run('JSON.stringify(save.skillCards)');r.run('save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();');assert.equal(r.run('JSON.stringify(save.skillCards)'),stable);
 }
}
r.run('save=initSave();migrateSkillSystem();migrateEvolutionNativeSkillCards();');
assert.deepEqual(json(r.run('save.skillCards')),{});assert.equal(r.run('!!save.skill110MigrationBackup'),false);
console.log(`PASS retired evolution backfill: ${Object.keys(targets).length} historical forms, zero/partial/surplus/99 counts preserved, no post110 minting, reload stable, fresh save untouched.`);
