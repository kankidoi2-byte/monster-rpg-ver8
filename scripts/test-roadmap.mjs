import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('js/roadmap-data.js','utf8');
const data=vm.runInNewContext(source+';ROADMAP');
const frozen=x=>{if(x&&typeof x==='object'){assert(Object.isFrozen(x));Object.values(x).forEach(frozen);}};
frozen(data);
assert.equal(Object.keys(data).filter(key=>key==='goal').length,1);
assert.deepEqual(Object.keys(data.goal).sort(),['detail','id','label','summary','title']);
assert.deepEqual(JSON.parse(JSON.stringify(data.goal)),{
 id:'app',title:'アプリ版の配信',label:'ゴール',summary:'この冒険を、スマートフォンのアプリで。',
 detail:{
  body:'ストーリーも、絵と音も、システムも、すべてはここへ向かっています。モンスターバトルを、スマートフォンのアプリとして届けることが、この開発のゴールです。',
  points:['ストアからインストールして遊べるように','機種を変えても、データを引き継げるように','ここまでの予定が、ひとつのアプリにまとまって届く']
 }
});
assert(![...data.items,...data.done].some(item=>item.id==='app'));
assert(!data.goal.wip&&!data.goal.mystery);
assert.equal(new Set(data.items.map(i=>i.id)).size,data.items.length);
for(const item of [...data.items,...data.done]){
 assert(data.lanes.some(l=>l.id===item.lane),item.title);
 if(item.id){assert(data.stages.some(s=>s.id===item.stage));assert([undefined,'main','side'].includes(item.kind));assert(Array.isArray(item.points));}
}
for(const path of source.matchAll(/['"](images\/[^'"]+)['"]/g))assert(fs.existsSync(path[1]),path[1]);
assert.deepEqual(Array.from(data.items.filter(i=>i.wip),i=>i.id).sort(),['charstory','eventcg','evo','extreme','linkfx','material','portrait','prologue']);
assert.equal(data.done.find(i=>i.id==='status').note,'追加');
assert.equal(data.done.find(i=>i.id==='traits').note,'追加');
assert(!data.items.some(i=>i.id==='traits'));
assert(!data.items.some(i=>i.id==='status'));
assert.equal(data.done.find(i=>i.id==='stat4').note,'見直し');
assert(!data.items.some(i=>i.id==='stat4'));
assert.equal(data.items.find(i=>i.id==='prologue').synopsis.text,'目を覚ますと、そこは見知らぬ世界だった。小さな姿のグノーシスに呼ばれた契約者は、剣士エルナや王都の仲間たち、不思議な竜ガルドラと出会い、各地に開いた裂け目の異変に立ち向かう。異変の果てで託された、ひとつの願い。契約者とグノーシス、ガルドラは、まだ見ぬ世界へと踏み出す――冒険は、ここから始まる！');
assert(!/localStorage|sessionStorage|saveGame|\bsave\b/.test(fs.readFileSync('js/roadmap.js','utf8').replace(/^\/\*.*?\*\//s,'')));
assert(!data.items.some(i=>i.id==='lore'));
assert.equal(JSON.stringify(data.items.filter(i=>i.lane==='story').map(i=>[i.id,i.stage])),JSON.stringify([['prologue','now'],['charstory','now'],['ch1','next'],['ch2','later']]));
console.log('Roadmap data: immutable, valid references/assets and exact synopsis; renderer has no save writes.');
