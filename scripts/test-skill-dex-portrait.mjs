import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime();vm.runInContext(fs.readFileSync('js/skill-dex.js','utf8'),r.context);
const before=r.run('JSON.stringify({save,skills:EQUIPPABLE_MOVE_CARDS})');
const entries=JSON.parse(r.run('JSON.stringify(skillDexEntries())'));
assert.equal(entries.length,110);
for(const sk of entries){
 const html=r.run(`skillDexCardMarkup(SKILL_BY_ID[${JSON.stringify(sk.id)}])`);
 assert(html.includes(sk.name));assert(html.includes(`COST ${sk.cost}`));
 assert(html.includes(sk.customDesc||sk.description||''));
 assert(html.includes(sk.power===0?'補助技':`威力 <strong>${sk.power}</strong>`));
 assert(!html.includes('skill-card-head'),'name and cost are separate rows');
 const order=['skill-card-title','skill-cost-badge','skill-type-line','skill-dex-performance','skill-dex-description','skill-dex-cta'].map(c=>html.indexOf(`class="${c}"`));
 assert(order.every((n,i)=>n>=0&&(!i||n>order[i-1])));
 assert.equal((html.match(/<button/g)||[]).length,1);assert(!html.includes('<details'),'single native button has no nested interactive control');
 for(const type of sk.types)assert(html.includes(r.run(`TN[${JSON.stringify(type)}]`)));
}
assert.equal(r.run('JSON.stringify({save,skills:EQUIPPABLE_MOVE_CARDS})'),before);
const css=fs.readFileSync('css/skill-dex.css','utf8');assert(css.includes('#skillDexList .skill-dex-card'));
assert(!/line-clamp|text-overflow:\s*ellipsis/.test(css));
console.log('PASS portrait cards: all 110 records retained, semantic order, all attributes and full copy, no data/save mutation');
