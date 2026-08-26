import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const dataSource = fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const coreSource = fs.readFileSync(new URL('../js/core.js', import.meta.url), 'utf8');
const skillsSource = fs.readFileSync(new URL('../js/skills.js', import.meta.url), 'utf8');
const fullSaveSource = fs.readFileSync(new URL('../js/save.js', import.meta.url), 'utf8');
const htmlSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const saveSource = fullSaveSource.slice(0, fullSaveSource.indexOf('/* Ver7.8:'));
const storage = new Map();
const context = vm.createContext({
  console, Date, JSON, Math,
  localStorage:{
    getItem:key => storage.has(key) ? storage.get(key) : null,
    setItem:(key,value) => storage.set(key,String(value)),
    removeItem:key => storage.delete(key)
  },
  confirm:()=>false,
  alert:()=>{}
});

vm.runInContext(dataSource, context, {filename:'js/data.js'});
vm.runInContext(coreSource, context, {filename:'js/core.js'});

const contract = vm.runInContext(`({
  monsters:M,
  cards:MOVE_CARDS,
  firstMove:M[0].moves[0],
  firstFixedId:M[0].moves[0][8],
  firstLegacyId:legacySkillIdFromMove(M[0].moves[0]),
  normalizeSkillId,
  skillIdFromMove,
  skillCostLimitFor,
  defaultSkillIdsForMonster,
  isCharacterUnit,
  isContractableUnit,
  isAlchemyCatalystUnit,
  monsterDexNumbers:M.filter(monster=>monster.entityKind==='monster').map(monster=>monster.dexNo??monster.no),
  characterCount:M.filter(monster=>monster.entityKind==='character').length,
  recipeIds:ALCHEMY_RECIPES.map(recipe=>recipe.recipeId),
  failureIds:ALCHEMY_ALL_FAILURE_CANDIDATES.map(entry=>entry.monsterId),
  initialPartyIds:INITIAL_PARTY_IDS
})`, context);

assert.equal(contract.monsters.length,61);
assert.deepEqual([...contract.initialPartyIds],['elna_beginner','freigal','aquaron','grassbeat','volteck']);
assert.equal(contract.characterCount,11);
assert.equal(contract.monsterDexNumbers.length,50);
assert.deepEqual([...contract.monsterDexNumbers].sort((a,b)=>a-b),Array.from({length:50},(_,index)=>index+1));
assert.equal(contract.cards.length,191);
assert.equal(new Set(contract.cards.map(card => card.id)).size,191);
assert(contract.monsters.every(monster => monster.moves.every(move => typeof move[8] === 'string')));
assert(contract.monsters.every(monster => ['monster','character'].includes(monster.entityKind)));
assert.equal(contract.normalizeSkillId(contract.firstLegacyId),contract.firstFixedId,'legacy skill ID must resolve to its fixed ID');
assert.notEqual(contract.firstLegacyId,contract.firstFixedId,'fixed IDs must not reuse the mutable legacy format');

const originalName = contract.firstMove[0];
contract.firstMove[0] = `${originalName}・調整版`;
assert.equal(contract.skillIdFromMove(contract.firstMove),contract.firstFixedId,'display-name changes must not change a fixed skill ID');
contract.firstMove[0] = originalName;

const elna = contract.monsters.find(monster => monster.id === 'elna_advanced');
const freigal = contract.monsters.find(monster => monster.id === 'freigal');
const kimeragnaApex = contract.monsters.find(monster => monster.id === 'kimeragna_apex');
assert.equal(contract.isCharacterUnit(elna),true);
assert.equal(contract.isContractableUnit(elna),false);
assert.equal(contract.isAlchemyCatalystUnit(elna),false);
assert.equal(contract.isAlchemyCatalystUnit(freigal),true);
assert.equal(kimeragnaApex.evolutionOnly,true);
assert.equal(kimeragnaApex.rarity,'★★★★','Kimeragna Apex must be a four-star monster');
assert.equal(contract.skillCostLimitFor(kimeragnaApex,{level:1}),8,'four-star Kimeragna Apex must use the four-star skill-cost limit');
assert.deepEqual([...contract.defaultSkillIdsForMonster(kimeragnaApex,{level:1})],['skill_kimeragna_apex_01'],'level-1 default skills must fit the four-star cost limit');
assert.equal(kimeragnaApex.eligibility.alchemySuccess,false,'Kimeragna Apex must only be reached by evolution');
assert(!contract.failureIds.includes('elna_advanced'),'characters must not enter alchemy failure results');
assert(!contract.failureIds.includes('stella_wizard'),'Stella characters must not enter alchemy failure results');
assert(!contract.failureIds.includes('lumina_wizard'),'Lumina characters must not enter alchemy failure results');
assert(contract.recipeIds.includes('elixion_standard'),'Elixion alchemy recipe must be registered');

storage.set('mb_v95c',JSON.stringify({
  schemaVersion:1,
  saveMeta:{migrations:[]},
  instances:[{uid:'u1',id:'freigal',level:1,exp:0}],
  caught:['freigal'],
  items:{},
  skillCards:{[contract.firstLegacyId]:3},
  equippedSkills:{u1:[contract.firstLegacyId]}
}));
vm.runInContext(saveSource, context, {filename:'js/save.js'});
const migrated = vm.runInContext('save', context);
assert.equal(migrated.skillCards[contract.firstFixedId],3);
assert.deepEqual([...migrated.equippedSkills.u1],[contract.firstFixedId]);
assert(migrated.saveMeta.migrations.includes('fixed_skill_ids_v1'));
vm.runInContext(`
  save.instances.push({uid:'apex-u1',id:'kimeragna_apex',level:1,exp:0});
  save.equippedSkills['apex-u1']=['skill_kimeragna_apex_01','skill_kimeragna_apex_02'];
`, context);
vm.runInContext(skillsSource, context, {filename:'js/skills.js'});
vm.runInContext("ensureInstanceSkills(save.instances.find(instance => instance.uid === 'apex-u1'))", context);
assert.deepEqual(
  [...migrated.equippedSkills['apex-u1']],
  ['skill_kimeragna_apex_01'],
  'existing Kimeragna Apex skill loadouts must be safely trimmed to the four-star cost limit'
);
assert(htmlSource.includes('js/data.js?v=skill-taxonomy-1'),'data.js cache key must be updated for unit tags');
assert(htmlSource.includes('js/core.js?v=kokoro-link-phase3-1'),'core.js cache key must include the Kokoro Link combat modifiers');
assert(htmlSource.includes('js/skills.js?v=evolution-skill-cards-1'),'skills.js cache key must be updated for evolution skill-card grants');
assert(htmlSource.includes('js/save.js?v=skill-inventory-1'),'save.js cache key must be updated for skill cards granted with new instances');
assert(htmlSource.includes('js/progression.js?v=evolution-skill-cards-1'),'progression.js cache key must be updated for evolution skill-card grants');
assert(htmlSource.includes('js/skill-gacha.js?v=skill-gacha-1'),'skill-gacha.js must be loaded with its release cache key');
assert(htmlSource.includes('js/ui.js?v=skill-gacha-1'),'ui.js cache key must be updated for the skill-gacha screen');
assert(htmlSource.includes('css/ui-redesign.css?v=kokoro-link-phase3-1'),'UI stylesheet cache key must include the Kokoro Link battle panel');
assert(htmlSource.includes('js/alchemy.js?v=phase3-prologue-1'),'alchemy.js cache key must remain aligned with Phase 3');
assert(htmlSource.includes('js/dex.js?v=monster-obtain-2'),'dex.js cache key must be updated for the monster acquisition display');

console.log('Canonical data contract validation passed (61 entities, 50-number monster dex, 11-character dex, 191 fixed skills, eligibility separation, and legacy skill-ID migration).');
