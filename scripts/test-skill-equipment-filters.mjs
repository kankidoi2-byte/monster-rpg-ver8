import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const select=html.match(/<select id="skillTypeFilter"[^>]*>([\s\S]*?)<\/select>/)?.[1];
assert(select,'equipment type filter exists');
const types=[...select.matchAll(/<option value="([^"]+)">/g)].map(match=>match[1]);
assert.equal(types.length,new Set(types).size,'every equipment type option occurs once');
assert.deepEqual(new Set(types),new Set(['all','fire','water','ice','grass','thunder','wind','light','dark','star','dragon','normal']));
const r=runtime();
r.run(`save=initSave();save.instances=[];save.party=[];var filterIns=addInstance('freigal',1);save.party=[filterIns.uid];save.skillCards=Object.fromEntries(EQUIPPABLE_MOVE_CARDS.map(s=>[s.id,10]));editingSkillUid=filterIns.uid;`);
const before=r.run('JSON.stringify(save)');
for(const type of types){
 r.context.document.getElementById('skillTypeFilter').value=type;
 r.run('renderSkillEdit()');
 const ids=[...r.elements.get('skillCardList').innerHTML.matchAll(/data-skill-card-id="([^"]+)"/g)].map(match=>match[1]);
 const expected=JSON.parse(r.run(`JSON.stringify(EQUIPPABLE_MOVE_CARDS.filter(sk=>${JSON.stringify(type)}==='all'||skillTypes(sk).includes(${JSON.stringify(type)})).map(sk=>sk.id))`));
 assert.deepEqual(ids,expected,`${type}: show exactly matching cards, including composite types`);
 if(type==='star'||type==='ice')assert(ids.length>0,type+' filter retains matching cards');
}
assert.equal(r.run('JSON.stringify(save)'),before,'filter changes preserve save and inventory');
console.log('PASS equipment type filters: unique complete options, every type and save isolation');

const costs=html.match(/<select id="skillCostFilter"[^>]*>([\s\S]*?)<\/select>/)?.[1];
assert(costs.includes('<option value="25">25</option>'));
r.context.document.getElementById('skillTypeFilter').value='all';
for(const [value,count] of [['25',4],['low',60],['high',30],['super',16],['ultimate',4]]){
 r.context.document.getElementById('skillCostFilter').value=value;r.run('renderSkillEdit()');
 assert.equal((r.elements.get('skillCardList').innerHTML.match(/data-skill-card-id=/g)||[]).length,count);
}
assert.equal(r.run('JSON.stringify(save)'),before);
console.log('PASS equipment cost filters: cost25 and all four tiers, save isolation');

const skill='s110_041';
r.run(`var elna=addInstance('elna_beginner',1), other=addInstance('elna_middle',1);
  save.equippedSkills[elna.uid]=[];save.equippedSkills[other.uid]=[];
  save.skillCards['s110_041']=1;editingSkillUid=elna.uid;`);
r.context.document.getElementById('skillCostFilter').value='all';
const skillMarkup=()=>{
 r.run('renderSkillEdit()');
 return r.elements.get('skillCardList').innerHTML
  .split(`data-skill-card-id="${skill}"`)[1].split('data-skill-card-id=')[0];
};
assert.match(skillMarkup(),/>装備する<\/button>/);
assert.equal(r.run(`equipSkill('${skill}')`),true);
let card=skillMarkup();
assert.match(card,/所持:1 \/ 使用中:1/);
assert.match(card,/初級剣士エルナに装備中/);
assert.doesNotMatch(card,/装備できません/);
r.run('editingSkillUid=other.uid;');
card=skillMarkup();
assert.match(card,/所持:1 \/ 使用中:1/);
assert.doesNotMatch(card,/に装備中/);
assert.match(card,/disabled>装備できません<\/button>/);
r.run(`editingSkillUid=elna.uid;save.skillCards['${skill}']=2;`);
card=skillMarkup();
assert.match(card,/所持:2 \/ 使用中:1/);
assert.match(card,/初級剣士エルナに装備中/);
assert.match(card,/コストがあと2必要/);
assert.doesNotMatch(card,/>装備する<\/button>/);
r.run('elna.level=100;');
assert.match(skillMarkup(),/>装備する<\/button>/);
assert.equal(r.run(`equipSkill('${skill}')`),true);
assert.match(skillMarkup(),/所持:2 \/ 使用中:2/);
console.log('PASS equipment card: selected wearer, unavailable other companion, additional copy and actual usage');
