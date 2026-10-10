import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime();
vm.runInContext(fs.readFileSync(new URL('../js/skill-dex.js',import.meta.url),'utf8'),r.context);
vm.runInContext(fs.readFileSync(new URL('../js/dex.js',import.meta.url),'utf8'),r.context);
const plain=s=>JSON.parse(r.run(`JSON.stringify(${s})`));
const before=plain('save');
const entries=plain('skillDexEntries()');
assert(entries.length>200);assert(entries.every(s=>!s.deprecated));
assert.equal(new Set(entries.map(s=>s.id)).size,entries.length);
for(const type of new Set(entries.flatMap(s=>s.types))){
 const rows=plain(`skillDexQueryEntries({type:${JSON.stringify(type)}})`);assert(rows.length);assert(rows.every(s=>s.types.includes(type)));
}
for(const cost of [1,2,3,4,5,6])assert(plain(`skillDexQueryEntries({cost:'${cost}'})`).every(s=>s.cost===cost));
assert(plain("skillDexQueryEntries({kind:'support'})").every(s=>s.power===0));
assert(plain("skillDexQueryEntries({kind:'attack'})").every(s=>s.power>0));
const leaf=plain("skillDexQueryEntries({query:' セラフィックリーフ ',effect:'recovery'})");assert.equal(leaf.length,1);assert.equal(leaf[0].power,68);assert.equal(leaf[0].cost,4);
assert.equal(plain("skillDexQueryEntries({query:'存在しない技名'})").length,0);
for(const sort of ['cost','power']){const rows=plain(`skillDexQueryEntries({sort:'${sort}'})`);assert(rows.every((s,i)=>!i||(sort==='cost'?rows[i-1].cost<=s.cost:rows[i-1].power>=s.power)));}
for(const sk of entries){
 const id=JSON.stringify(sk.id);
 assert.equal(r.run(`skillDexEligibleUnits(SKILL_BY_ID[${id}]).length`),r.run(`M.filter(m=>isSkillAllowedForMonster(${id},m)).length`));
 r.run(`showSkillDexDetail(${id},false)`);
 const html=r.elements.get('skillDexDetail').innerHTML;
 assert(html.includes(sk.name));assert(html.includes(`COST ${sk.cost}`));assert(html.includes(sk.power===0?'補助技':`威力 ${sk.power}`));
 const expected=r.run(`moveEffectText(skillToMove(${id}),{includeBase:false})`);if(expected)assert(html.includes(expected));
}
const learnerIds=plain("skillDexLearners(SKILL_BY_ID['skill_seralphia_03']).map(m=>m.id)");assert(learnerIds.includes('seralphia'));
const alias=r.run('MOVE_CARDS.find(s=>s.deprecated).id');r.run(`showSkillDexDetail(${JSON.stringify(alias)},false)`);assert.equal(r.run('skillDexSelectedId'),r.run(`canonicalSkillId(${JSON.stringify(alias)})`));
r.run('renderSkillDex()');assert(r.elements.get('skillDexList').innerHTML.includes('data-skill-dex-id'));
assert.deepEqual(plain('save'),before,'encyclopedia must not mutate player save');
console.log(`PASS skill dex: ${entries.length} canonical skills, all types, eligibility, descriptions and save isolation`);

const conditional=plain("skillDexQueryEntries({effect:'conditional_power'})");
const conditionalExpected=entries.filter(sk=>sk.tactical?.bonus?.condition).map(sk=>sk.id).sort();
assert.equal(conditionalExpected.length,16,'current conditional-power move coverage');
assert.deepEqual(conditional.map(sk=>sk.id).sort(),conditionalExpected,'every conditional bonus is discoverable');
assert(!conditional.some(sk=>!sk.tactical?.bonus),'exclude plain attacks, charge and unconditional buffs');
const fireConditional=plain("skillDexQueryEntries({effect:'conditional_power',type:'fire',sort:'power'})");
assert(fireConditional.length>0);assert(fireConditional.every(sk=>sk.types.includes('fire')));
assert(fireConditional.every((sk,i)=>!i||fireConditional[i-1].power>=sk.power));
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(index,/<select id="skillDexEffect"[^>]*>[\s\S]*?<option value="conditional_power">条件付き威力アップ<\/option>[\s\S]*?<\/select>/);
r.context.document.getElementById('skillDexEffect').value='conditional_power';
r.run('renderSkillDex()');
assert.equal(r.elements.get('skillDexCount').textContent,`16 / ${entries.length} 技`);
assert.equal((r.elements.get('skillDexList').innerHTML.match(/data-skill-dex-id=/g)||[]).length,16);
r.run('resetSkillDexFilters()');
assert.equal(r.elements.get('skillDexEffect').value,'');
assert.equal(r.elements.get('skillDexCount').textContent,`${entries.length} / ${entries.length} 技`);
assert.deepEqual(plain('save'),before,'conditional filtering and reset preserve save');
console.log('PASS conditional-power filter: all 16 moves, combined filters, rendering and reset');
