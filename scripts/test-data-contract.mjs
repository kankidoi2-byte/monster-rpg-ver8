import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const dataSource = fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const coreSource = fs.readFileSync(new URL('../js/core.js', import.meta.url), 'utf8');
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
  isCharacterUnit,
  isContractableUnit,
  isAlchemyCatalystUnit,
  failureIds:ALCHEMY_ALL_FAILURE_CANDIDATES.map(entry=>entry.monsterId)
})`, context);

assert.equal(contract.monsters.length,48);
assert.equal(contract.cards.length,152);
assert.equal(new Set(contract.cards.map(card => card.id)).size,152);
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
assert.equal(contract.isCharacterUnit(elna),true);
assert.equal(contract.isContractableUnit(elna),false);
assert.equal(contract.isAlchemyCatalystUnit(elna),false);
assert.equal(contract.isAlchemyCatalystUnit(freigal),true);
assert(!contract.failureIds.includes('elna_advanced'),'characters must not enter alchemy failure results');

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
for (const file of ['data','core','save','alchemy']) {
  assert(htmlSource.includes(`js/${file}.js?v=phase2-data-contract-1`),`${file}.js cache key must be updated for Phase 2`);
}

console.log('Canonical data contract validation passed (48 entities, 152 fixed skills, eligibility separation, and legacy skill-ID migration).');
