import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function read(relativePath) {
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

const context = vm.createContext({console, alert:()=>{}, confirm:()=>false});
vm.runInContext(read('js/data.js'), context, {filename:'js/data.js'});
vm.runInContext(read('js/core.js'), context, {filename:'js/core.js'});

const taxonomy = vm.runInContext(`({
  units:M,
  cards:MOVE_CARDS,
  equippable:EQUIPPABLE_MOVE_CARDS,
  monsterPool:MONSTER_MOVE_CARDS,
  characterPool:CHARACTER_MOVE_CARDS,
  by,
  canonicalSkillId,
  defaultSkillIdsForMonster,
  isSkillAllowedForMonster,
  isEquippedSkillUsableForMonster,
  skillCostLimitFor
})`, context);

assert.equal(taxonomy.units.length,64);
assert(taxonomy.units.every(unit => Array.isArray(unit.tags) && unit.tags.includes(`entity:${unit.entityKind}`)));
assert(taxonomy.units.every(unit => unit.types.every(type => unit.tags.includes(`element:${type}`))));

assert.equal(taxonomy.cards.length,200,'fixed skill IDs must remain available for save compatibility');
assert(taxonomy.cards.every(card => card.sourceUnitId && card.sourceEntityKind));
assert(taxonomy.cards.every(card => Array.isArray(card.tags) && card.tags.length >= 3));
assert(taxonomy.cards.every(card => Array.isArray(card.requirements?.entityKinds)));
assert(taxonomy.cards.every(card => Array.isArray(card.requirements?.requiredAll)));
assert(taxonomy.equippable.length < taxonomy.cards.length,'duplicate skills must be removed from new equipment choices');
assert.equal(taxonomy.monsterPool.length + taxonomy.characterPool.length,taxonomy.equippable.length);
assert(taxonomy.monsterPool.every(card => card.sourceEntityKind === 'monster'));
assert(taxonomy.characterPool.every(card => card.sourceEntityKind === 'character'));

const deprecated = taxonomy.cards.filter(card => card.deprecated);
assert(deprecated.length > 0,'the consolidation pass must identify duplicate skills');
for (const card of deprecated) {
  const canonical = taxonomy.cards.find(candidate => candidate.id === card.canonicalId);
  assert(canonical,`deprecated skill ${card.id} must resolve to a fixed skill ID`);
  assert.equal(canonical.deprecated,false,`canonical skill ${canonical.id} must remain equippable`);
  assert.equal(taxonomy.canonicalSkillId(card.id),canonical.id);
}

const elna = taxonomy.by('elna_advanced');
const stella = taxonomy.by('stella_apprentice');
const lumina = taxonomy.by('lumina_apprentice');
const freiwolf = taxonomy.by('freiwolf');
const slime = taxonomy.by('slime');
const falseDragon = taxonomy.by('false_dragon_gamma');

assert.equal(taxonomy.isSkillAllowedForMonster('skill_elna_middle_03',elna),true,'a swordsman can use a compatible sword skill');
assert.equal(taxonomy.isSkillAllowedForMonster('skill_stella_apprentice_01',lumina),true,'a mage can use a compatible mage skill');
assert.equal(taxonomy.isSkillAllowedForMonster('skill_elna_advanced_03',falseDragon),false,'monsters cannot equip character sword skills');
assert.equal(taxonomy.isSkillAllowedForMonster('skill_stella_apprentice_01',falseDragon),false,'monsters cannot equip character magic skills');
assert.equal(taxonomy.isSkillAllowedForMonster('skill_slime_01',stella),false,'characters cannot equip monster skills');
assert.equal(taxonomy.isSkillAllowedForMonster('skill_freigal_01',freiwolf),true,'a monster with fangs can use a compatible fang skill');
assert.equal(taxonomy.isSkillAllowedForMonster('skill_freigal_01',slime),false,'a monster without fangs cannot use a fang skill');

const deprecatedSkill = deprecated[0];
assert.equal(taxonomy.isSkillAllowedForMonster(deprecatedSkill.id,taxonomy.by(deprecatedSkill.sourceUnitId)),false,'deprecated skills cannot be newly equipped');
assert.equal(taxonomy.isEquippedSkillUsableForMonster(deprecatedSkill.id,taxonomy.by(deprecatedSkill.sourceUnitId)),true,'a compatible deprecated skill already in a save remains usable');

for (const unit of taxonomy.units) {
  const instance = {id:unit.id,level:1};
  const defaults = taxonomy.defaultSkillIdsForMonster(unit,instance);
  assert(defaults.length > 0 && defaults.length <= 3,`${unit.id} must have one to three default skills`);
  assert(defaults.every(id => taxonomy.canonicalSkillId(id) === id),`${unit.id} defaults must use canonical skill IDs`);
  assert(defaults.every(id => taxonomy.isSkillAllowedForMonster(id,unit)),`${unit.id} defaults must satisfy tag requirements`);
  const cost = defaults.reduce((sum,id) => sum + taxonomy.cards.find(card => card.id === id).cost,0);
  assert(cost <= taxonomy.skillCostLimitFor(unit,instance),`${unit.id} defaults must fit the skill cost limit`);
}

context.save = {
  saveMeta:{migrations:[]},
  instances:[
    {uid:'legacy-ok',id:deprecatedSkill.sourceUnitId,level:99},
    {uid:'legacy-copy',id:deprecatedSkill.sourceUnitId,level:99},
    {uid:'cross-kind',id:'slime',level:99}
  ],
  skillCards:Object.fromEntries(taxonomy.cards.map(card => [card.id,99])),
  equippedSkills:{
    'legacy-ok':[deprecatedSkill.id],
    'legacy-copy':[deprecatedSkill.id],
    'cross-kind':['skill_elna_middle_03']
  }
};
vm.runInContext(read('js/skills.js'), context, {filename:'js/skills.js'});
vm.runInContext('migrateSkillSystem()', context);
assert.deepEqual([...context.save.equippedSkills['legacy-ok']],[deprecatedSkill.id]);
assert(!context.save.equippedSkills['cross-kind'].includes('skill_elna_middle_03'),'invalid cross-kind skills must be removed from old loadouts');
assert.equal(context.save.skillCards[deprecatedSkill.id],2,'each equipped slot must be backed by one owned card');
assert.equal(context.save.skillCards.skill_elna_middle_03,0,'unequipped cards must migrate from 99 to zero');
assert(context.save.saveMeta.migrations.includes('equipped_skill_cards_v1'));

context.save.skillCards[deprecatedSkill.id]=5;
vm.runInContext('migrateSkillSystem()', context);
assert.equal(context.save.skillCards[deprecatedSkill.id],5,'subsequent loads must preserve cards obtained after migration');

context.save.instances.push({uid:'new-unit',id:deprecatedSkill.sourceUnitId,level:99});
vm.runInContext("grantEquippedSkillCardsForInstance(save.instances.find(instance => instance.uid === 'new-unit'))", context);
const newUnitIds=context.save.equippedSkills['new-unit'];
assert(newUnitIds.length > 0);
for (const id of newUnitIds) assert(context.save.skillCards[id] >= 1,'new instances must own every default equipped card');

const evolving={uid:'evolving-unit',id:'freigal',level:20};
context.save.instances.push(evolving);
vm.runInContext("ensureInstanceSkills(save.instances.find(instance => instance.uid === 'evolving-unit'))", context);
const equippedBeforeEvolution=[...context.save.equippedSkills[evolving.uid]];
evolving.id='freiwolf';
const expectedEvolutionCards=taxonomy.defaultSkillIdsForMonster(freiwolf,evolving);
const countsBeforeEvolution=Object.fromEntries(expectedEvolutionCards.map(id => [id,context.save.skillCards[id] || 0]));
const grantedEvolutionCards=vm.runInContext("grantDefaultSkillCardsForInstance(save.instances.find(instance => instance.uid === 'evolving-unit'))", context);
assert.deepEqual([...grantedEvolutionCards],[...expectedEvolutionCards],'evolution must grant the evolved form default skill cards');
assert.deepEqual([...context.save.equippedSkills[evolving.uid]],equippedBeforeEvolution,'granting evolution cards must not change the equipped loadout');
for (const id of expectedEvolutionCards) assert.equal(context.save.skillCards[id],countsBeforeEvolution[id]+1,`evolution must grant one ${id} card`);

const progressionSource=read('js/progression.js');
assert.equal((progressionSource.match(/grantDefaultSkillCardsForInstance\(ins\)/g) || []).length,2,'normal and fusion evolutions must both grant default skill cards');

console.log(`Skill taxonomy validation passed (64 tagged units, 200 compatible fixed IDs, ${taxonomy.equippable.length} consolidated equipment choices, finite card inventory, evolution grants).`);
