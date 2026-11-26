// The 110-skill catalog supersedes source-kind exclusivity and old consolidation.
// Dedicated catalog tests retain coverage of stable aliases, anatomy, types,
// legal starter budgets, and every historical skill ID.
import './skill110-catalog.test.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console});
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
vm.runInContext(read('js/data.js')+read('js/core.js'),ctx);
const x=vm.runInContext('({M,MOVE_CARDS,MONSTER_MOVE_CARDS,CHARACTER_MOVE_CARDS,SKILL_BY_ID,defaultSkillIdsForMonster,isSkillAllowedForMonster})',ctx);
assert.equal(x.M.length,100);assert.equal(x.MOVE_CARDS.filter(s=>s.deprecated).length,316,'all formerly registered fixed IDs remain readable');
assert.equal(x.MONSTER_MOVE_CARDS.length,106);assert.equal(x.CHARACTER_MOVE_CARDS.length,106);
assert.deepEqual([...x.MONSTER_MOVE_CARDS.map(s=>s.id)],[...x.CHARACTER_MOVE_CARDS.map(s=>s.id)],'both entity kinds share the same catalog');
for(const unit of x.M){
 assert(unit.tags.includes(`entity:${unit.entityKind}`));assert(unit.types.every(t=>unit.tags.includes(`element:${t}`)));assert(unit.legacyMoves.length);
 assert(unit.moves.every(mv=>mv[8].startsWith('s110_')));
}
for(const id of ['skill_proto_icegolem_01','skill_proto_icegolem_03'])assert(x.SKILL_BY_ID[id].types.includes('water'),'legacy record attributes remain untouched');
assert.equal(x.isSkillAllowedForMonster('skill_freigal_01',x.M.find(m=>m.id==='freigal')),false,'legacy records cannot be newly equipped');
assert.equal((read('js/progression.js').match(/grantEvolutionSkillCardsForInstance\(ins\)/g)||[]).length,2,'normal and fusion evolution retain card-grant hooks');
console.log('Shared taxonomy: 316 legacy records retained, 106 shared acquisition skills, entity tags and evolution hooks passed.');
