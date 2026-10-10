import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const select=html.match(/<select id="skillTypeFilter"[^>]*>([\s\S]*?)<\/select>/)?.[1];
assert(select,'equipment type filter exists');
const types=[...select.matchAll(/<option value="([^"]+)">/g)].map(match=>match[1]);
assert.equal(types.length,new Set(types).size,'every equipment type option occurs once');
assert.deepEqual(new Set(types),new Set(['all','fire','water','grass','thunder','wind','light','dark','star','dragon','normal']));
const r=runtime();
r.run(`save=initSave();save.instances=[];save.party=[];var filterIns=addInstance('freigal',1);save.party=[filterIns.uid];save.skillCards=Object.fromEntries(MOVE_CARDS.map(s=>[s.id,10]));editingSkillUid=filterIns.uid;`);
const before=r.run('JSON.stringify(save)');
for(const type of types){
 r.context.document.getElementById('skillTypeFilter').value=type;
 r.run('renderSkillEdit()');
 const ids=[...r.elements.get('skillCardList').innerHTML.matchAll(/data-skill-card-id="([^"]+)"/g)].map(match=>match[1]);
 const expected=JSON.parse(r.run(`JSON.stringify(MONSTER_MOVE_CARDS.filter(sk=>${JSON.stringify(type)}==='all'||skillTypes(sk).includes(${JSON.stringify(type)})).map(sk=>sk.id))`));
 assert.deepEqual(ids,expected,`${type}: show exactly matching cards, including composite types`);
 if(type==='star')assert(ids.length>0,'star filter retains matching cards');
}
assert.equal(r.run('JSON.stringify(save)'),before,'filter changes preserve save and inventory');
console.log('PASS equipment type filters: unique complete options, every type and save isolation');
