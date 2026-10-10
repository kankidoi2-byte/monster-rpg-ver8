import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const ctx=vm.createContext({console});
vm.runInContext(read('js/data.js')+read('js/core.js'),ctx);
const x=vm.runInContext('({M,MOVE_CARDS,EQUIPPABLE_MOVE_CARDS,SKILL110_CATALOG,SKILL110_IDS,SKILL110_MIGRATION_MAP,SKILL110_MIGRATION_REASONS,SKILL_BY_ID,canonicalSkillId,skill110TierFromCost,defaultSkillIdsForMonster,isSkillAllowedForMonster,skillCostLimitFor,skillCostFromMove,skillToMove})',ctx);
const C=x.EQUIPPABLE_MOVE_CARDS;
const recorded=JSON.parse(read('docs/skill110/catalog.json'));
for(const expected of recorded){
 const actual=C.find(skill=>skill.id===expected.id);assert(actual);
 for(const key of ['name','cost','power','types','tactical','requirements','universal','acquisition','tier'])
  assert.deepEqual(JSON.parse(JSON.stringify(actual[key])),expected[key],`${expected.id} recorded ${key}`);
}

assert.equal(C.length,110);
assert.deepEqual([5,10,20,25].map((max,i)=>C.filter(s=>s.cost<=max&&s.cost>([0,5,10,20][i])).length),[60,30,16,4]);
assert.equal(new Set(C.map(s=>s.name)).size,110);assert.equal(new Set(C.map(s=>s.id)).size,110);
assert(C.every(s=>s.cost<=20||s.cost===25));
assert.equal(C.filter(s=>s.acquisition==='normal').length,106);
assert(C.filter(s=>s.cost===25).every(s=>s.acquisition==='synthesis'&&s.universal));
for(const row of JSON.parse(read('docs/skill-system-110/historical-skills.json')).entries){
 const target=x.SKILL110_MIGRATION_MAP[row.id];assert(target,`historical ID ${row.id}`);assert(x.SKILL_BY_ID[target].cost<25);assert(x.SKILL110_MIGRATION_REASONS[row.id]);
}
for(const legacy of x.MOVE_CARDS.filter(s=>s.deprecated))assert(x.SKILL_BY_ID[legacy.canonicalId]&&!x.SKILL_BY_ID[legacy.canonicalId].deprecated);
for(const m of x.M){
 assert.equal(m.moves.some(mv=>mv[1]>0),true,`${m.id} initial attack`);
 for(const level of [1,2,3,10,25,50,100]){
  const ids=x.defaultSkillIdsForMonster(m,{level});assert(ids.length>=1&&ids.length<=3);assert(ids.some(id=>x.SKILL_BY_ID[id].power>0));assert(ids.every(id=>x.isSkillAllowedForMonster(id,m)));assert(ids.every(id=>x.SKILL_BY_ID[id].cost<25));assert(ids.reduce((n,id)=>n+x.SKILL_BY_ID[id].cost,0)<=x.skillCostLimitFor(m,{level}));
 }
}
const named=n=>C.find(s=>s.name===n);
const unit=id=>x.M.find(m=>m.id===id);
assert.equal(x.isSkillAllowedForMonster(named('火炎牙').id,unit('freiwolf')),true);
assert.equal(x.isSkillAllowedForMonster(named('火炎牙').id,unit('elna_kaen')),false);
assert.equal(x.isSkillAllowedForMonster(named('斬りつけ').id,unit('character_regus_2')),true);
assert.equal(x.isSkillAllowedForMonster(named('斬りつけ').id,unit('slime')),false);
assert.equal(x.isSkillAllowedForMonster(named('ルクスホーン').id,unit('luxiard')),true);
for(const name of ['エリクシオン・ノヴァ','ノクスエクリプス','終焉の一斉射撃'])assert.equal(x.isSkillAllowedForMonster(named(name).id,unit('slime')),false,`${name} not universal`);
assert.equal(x.isSkillAllowedForMonster(named('エリクシオン・ノヴァ').id,unit('aquaron')),true);
assert.equal(x.isSkillAllowedForMonster(named('終焉の一斉射撃').id,unit('elna_kaen')),true);
for(const s of C.filter(s=>s.universal))assert(x.M.every(m=>x.isSkillAllowedForMonster(s.id,m)));
for(const s of C){assert(x.M.some(m=>x.isSkillAllowedForMonster(s.id,m)),`${s.name} must have an eligible current unit`);assert.equal(x.skillCostFromMove(x.skillToMove(s.id)),s.cost);assert.equal(x.canonicalSkillId(s.id),s.id);assert.equal(x.skill110TierFromCost(s.cost),s.tier);}
assert.equal(named('連続斬り').tactical.hits,2);assert.equal(named('白銀連斬').tactical.hits,undefined);
assert.equal(named('オーバーブレイク').tactical.ignoreDefense,true);
assert.equal(named('オーバードライブ').tactical.guard,.6);assert.equal(named('オーバードライブ').tactical.charge,1.3);
assert.equal(named('錬核崩砕').power,165);assert.equal(named('錬核崩砕').tactical.recoil,.15);
assert.equal(named('エリクシオン・ノヴァ').power,135);assert.equal(named('エリクシオン・ノヴァ').tactical.recoil,undefined);
console.log('110 catalog: counts, 768 mappings, 100 units × 7 levels, anatomy, compound elements, costs, and fixed effect metadata passed.');
