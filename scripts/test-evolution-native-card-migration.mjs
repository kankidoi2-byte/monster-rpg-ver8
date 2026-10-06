import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime(), json=v=>JSON.parse(JSON.stringify(v));
const targets=json(r.run('EVOLUTION_NATIVE_CARD_TARGETS'));
const routes=json(r.run(`M.flatMap(m=>[...(m.evolutions||[]).map(e=>({to:e.to,level:e.level})),...(m.evolution?[{to:m.evolution,level:m.evolutionLevel}]:[])]).concat(FUSIONS.map(f=>({to:f.to,level:1})))`));
// Independently audit every legal level, including Lv1 special evolution and
// greedy COST selection changes at later levels; no historical count constants.
const audited={};
for(const route of routes){
 r.context.route=route;
 for(let level=route.level;level<=r.run('MAX_LEVEL');level++){
  r.context.level=level;
  const omitted=json(r.run(`by(route.to).moves.map(skillIdFromMove).map(canonicalSkillId).filter(id=>SKILL_BY_ID[id]&&!defaultSkillIdsForMonster(by(route.to),{level}).includes(id))`));
  if(omitted.length)(audited[route.to]??=new Set());
  omitted.forEach(id=>audited[route.to].add(id));
 }
}
assert.deepEqual(targets,Object.fromEntries(Object.entries(audited).map(([id,ids])=>[id,[...ids]])));
function fixture(ids,oldInventory=false){
 r.context.ids=ids;r.context.oldInventory=oldInventory;
 r.run(`save=initSave();save.instances=[];save.party=[];save.equippedSkills={};
 if(!oldInventory)save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);
 ids.forEach((id,i)=>{const ins=addInstance(id,100);ins.exp=0;ins.locked=true;ins.customGrowth={keep:i};});
 save.party=save.instances.slice(0,3).map(ins=>ins.uid);
 save.coins=54321;save.items.fire_orb=7;save.items.potion=13;
 save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.history={wins:16,logs:['keep']};
 save.skillCards=Object.fromEntries(MOVE_CARDS.map(sk=>[sk.id,0]));
 save=parseAndPrepareSave(JSON.stringify(save),[]);`);
}
const preserved=()=>json(r.run('({instances:save.instances,party:save.party,equippedSkills:save.equippedSkills,items:save.items,coins:save.coins,progress:save.progress,history:save.history,levels:save.levels,exp:save.exp})'));
const cards=()=>json(r.run('save.skillCards'));
for(const [form,ids] of Object.entries(targets)){
 for(const owned of [0,1,2,11]){
  fixture([form,form]);r.context.targetIds=ids;r.context.owned=owned;
  r.run('targetIds.forEach(id=>save.skillCards[id]=owned)');
  const before=preserved();r.run('migrateSkillSystem()');
  for(const id of ids)assert.equal(cards()[id],Math.max(owned,2),`${form}/${id}/${owned}`);
  assert.deepEqual(preserved(),before);
  const stable=cards();r.run('migrateSkillSystem();renderDex();save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem()');
  assert.deepEqual(cards(),stable);assert.deepEqual(preserved(),before);
  assert.equal(r.run('save.saveMeta.migrations.filter(id=>id===EVOLUTION_NATIVE_CARDS_MIGRATION).length'),1);
 }
}
// Different forms sharing a merged card sum their requirements, not max them.
const users={};Object.entries(targets).forEach(([form,ids])=>ids.forEach(id=>(users[id]??=[]).push(form)));
for(const [id,forms] of Object.entries(users).filter(([,forms])=>forms.length>1)){
 fixture(forms);r.run('migrateSkillSystem()');assert.equal(cards()[id],forms.length);
}
// Actual legacy name ID normalized by repairSave before inventory migration.
fixture(['voltax','voltax']);
r.run(`var move=by('voltax').moves.find(m=>m[8]==='skill_voltax_03');
 save.skillCards[legacySkillIdFromMove(move)]=1;delete save.skillCards.skill_voltax_03;
 save=parseAndPrepareSave(JSON.stringify(save),[]);`);
assert.equal(cards().skill_voltax_03,1);r.run('migrateSkillSystem()');
assert.equal(cards().skill_voltax_03,2);assert.equal(cards().skill_voltax_04,2);
// Pre-inventory saves formerly hit early return. Preserve old migration semantics
// (discard obsolete all-99 inventory), then top up in the SAME initialization.
fixture(['voltax'],true);r.run('Object.keys(save.skillCards).forEach(id=>save.skillCards[id]=99);migrateSkillSystem()');
assert.equal(cards().skill_voltax_03,1);assert.equal(cards().skill_voltax_04,1);
const stable=cards();r.run('save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem()');assert.deepEqual(cards(),stable);
// Current level/loadout are NOT a filter. Canonical/legacy aliases in a single
// native definition may collapse to one card and must not be counted twice.
fixture(['voltax']);r.run(`save.instances[0].level=3;save.equippedSkills[save.instances[0].uid]=defaultSkillIdsForMonster(by('voltax'),save.instances[0]);
 var m=by('voltax'),original=m.moves;var raw=m.moves.find(mv=>mv[8]==='skill_voltax_03');
 m.moves=[...original,raw,[...raw.slice(0,8),legacySkillIdFromMove(raw)]];migrateSkillSystem();m.moves=original;`);
assert.equal(cards().skill_voltax_03,1);assert.equal(cards().skill_voltax_04,1);
// No current owner: caught history alone cannot cause grants. New saves are
// marked complete before any later evolution; PR257 per-evolution grants remain.
for(const ids of [[],['volteck']]){
 fixture(ids);r.run("save.caught.push('voltax');migrateSkillSystem()");
 assert.equal(cards().skill_voltax_03,0);assert.equal(cards().skill_voltax_04,0);
 assert(r.run('save.saveMeta.migrations.includes(EVOLUTION_NATIVE_CARDS_MIGRATION)'));
}
r.run('save=initSave();initStarters();migrateSkillSystem()');
assert.equal(cards().skill_voltax_03,0);
console.log(`PASS evolution native migration: ${routes.length} routes, ${Object.keys(targets).length} forms, ${Object.values(targets).flat().length} form/card pairs, ${Object.keys(users).length} unique cards; 0/partial/sufficient/surplus, duplicate owners, shared canonical IDs, legacy IDs/inventory, reload, preserved state, no owner/new save.`);
