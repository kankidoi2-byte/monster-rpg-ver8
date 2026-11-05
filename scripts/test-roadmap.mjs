import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('js/roadmap-data.js','utf8');
const data=vm.runInNewContext(source+';ROADMAP');
const frozen=x=>{if(x&&typeof x==='object'){assert(Object.isFrozen(x));Object.values(x).forEach(frozen);}};
frozen(data);
assert.equal(new Set(data.items.map(i=>i.id)).size,data.items.length);
for(const item of [...data.items,...data.done]){
 assert(data.lanes.some(l=>l.id===item.lane),item.title);
 if(item.id){assert(data.stages.some(s=>s.id===item.stage));assert([undefined,'main','side'].includes(item.kind));assert(Array.isArray(item.points));}
}
for(const path of source.matchAll(/['"](images\/[^'"]+)['"]/g))assert(fs.existsSync(path[1]),path[1]);
assert.deepEqual(Array.from(data.items.filter(i=>i.wip),i=>i.id).sort(),['lore','portrait']);
assert.equal(data.done.find(i=>i.id==='stat4').note,'見直し');
assert(!data.items.some(i=>i.id==='stat4'));
assert.equal(data.items.find(i=>i.id==='lore').synopsis.text,'目を覚ますと、そこは見知らぬ世界だった。小さな姿のグノーシスに呼ばれた契約者は、スライムに囲まれた剣士エルナを助け、王都でステラやルミナと出会い、不思議な竜ガルドラと旅を始める。グノーシスの願いは、失われた元の姿を取り戻すこと。手掛かりを探す一行の前で、王都にモンスターが押し寄せ、各地に謎の裂け目が開き始める――。');
assert(!/localStorage|sessionStorage|saveGame|\bsave\b/.test(fs.readFileSync('js/roadmap.js','utf8').replace(/^\/\*.*?\*\//s,'')));
console.log('Roadmap data: immutable, valid references/assets and exact synopsis; renderer has no save writes.');
