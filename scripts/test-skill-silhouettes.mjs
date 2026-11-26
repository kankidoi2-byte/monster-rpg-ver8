import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime();
vm.runInContext(fs.readFileSync('js/skill-card-art.js','utf8'),r.context);
const audit=JSON.parse(fs.readFileSync('docs/skill-silhouettes-20261101.json','utf8'));
const cards=r.run('SKILL110_CATALOG'), assets=r.run('SKILL_ART_ASSETS');
assert.equal(Object.keys(assets).length,22);
assert.equal(r.run('Object.keys(SKILL_ART_BY_ID).length'),110);
assert.equal(new Set(audit.assignments.map(a=>a.skillId)).size,110);
const before=r.run('JSON.stringify({save,catalog:SKILL110_CATALOG})');
for(const card of cards){
 const expected=audit.assignments.find(a=>a.skillId===card.id);
 const arg=JSON.stringify(card);
 assert(expected,card.id);
 assert.equal(r.run(`skillArtCategory(${arg})`),expected.category,card.id);
 for(const compact of [false,true]){
  const html=r.run(`tcgSkillCardMarkup(${arg},{compact:${compact}})`);
  assert(html.includes(`data-art-category="${expected.category}"`),card.id);
  assert(html.includes(assets[expected.category]),card.id);
  assert.equal((html.match(/class="tcg-silhouette"/g)||[]).length,1);
  assert(!html.includes('tcg-kanji'));
 }
}
let bytes=0;
for(const [category,path] of Object.entries(assets)){
 assert(fs.existsSync(path),category);
 const data=fs.readFileSync(path);
 assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 assert(data.length<=50*1024,category+' must stay below 50 KiB');bytes+=data.length;
}
assert(bytes<=600*1024,'shared assets total budget');
assert.equal(r.run('JSON.stringify({save,catalog:SKILL110_CATALOG})'),before,'render never mutates saves or catalog');
assert.equal(r.run("skillArtCategory({id:'future-test',form:'claw'})"),'爪','future form fallback');
assert(r.run("skillArtMarkup({id:'future-test',form:'generic',type:'fire',types:['fire']})").includes('tcg-kanji'),'unknown future card keeps fallback');
console.log(`PASS 110 exact assignments, 22 shared WebP assets (${bytes} bytes), compact/full render, future fallback and save immutability`);
