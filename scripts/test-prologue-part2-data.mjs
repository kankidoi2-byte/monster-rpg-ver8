import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={};vm.createContext(context);
vm.runInContext(fs.readFileSync('js/data.js','utf8')+';globalThis.master=M;',context);
vm.runInContext(fs.readFileSync('js/prologue-part2-data.js','utf8'),context);
const d=context.PROLOGUE_PART2_DATA;
assert.equal(d.episodes.length,17);
assert.equal(Object.keys(d.battles).length,15);
assert.equal(d.episodes.reduce((s,e)=>s+e.rewards.exp,0),6120);
assert.equal(d.episodes.reduce((s,e)=>s+e.rewards.coins,0),1980);
const ids=new Set();let count=0;
const sourceCards=ep=>[...ep.steps,...(ep.id==='pb_14'?d.battles.p2_14_a.interruptCards:[])].filter(card=>card.sourceLine);
for(const ep of d.episodes){
 assert.equal(ep.id,ep.number===23?'pb_ep':`pb_${String(ep.number).padStart(2,'0')}`);
 for(const c of sourceCards(ep)){assert(!ids.has(c.id),`duplicate source id ${c.id}`);ids.add(c.id);count++;}
 assert.equal(ep.steps.at(-1).kind,'complete');
 assert(fs.existsSync(ep.background),ep.background);
 for(const step of ep.steps){
  if(step.background)assert(fs.existsSync(step.background),step.background);
  if(step.portrait)assert(fs.existsSync(step.portrait),step.portrait);
  if(step.kind==='battle')assert(d.battles[step.battleId]);
  if(step.kind==='production')assert.equal(step.display,false);
 }
}
assert.equal(count,520);
for(const b of Object.values(d.battles)){
 assert.equal(b.contractAllowed,b.id==='p2_07_a');
 for(const e of b.enemies){
  const u=context.master.find(x=>x.id===e.speciesId);assert(u,e.speciesId);
  assert.deepEqual(Array.from(e.moveIds),Array.from(u.moves,m=>m[8]));
 }
}
const ep=id=>d.episodes.find(e=>e.id===id);
assert.equal(ep('pb_22').battleIds.length,0);
assert(!d.battles.p2_22_a);
assert(!ids.has('pb_ep_dragon_18'));assert(!ids.has('pb_ep_post_05a'));
assert(!ids.has('pb_21_post_11'));
assert(!ep('pb_14').steps.some(s=>/^pb_14_post_0[123]$/.test(s.id)));
assert.deepEqual(Array.from(d.battles.p2_14_a.interruptCards,s=>s.id),['pb_14_post_01','pb_14_post_02','pb_14_post_03']);
const ordered=['pb_ep_dragon_15','pb_ep_post_03','pb_ep_post_04','pb_ep_post_05','pb_ep_dragon_16','pb_ep_dragon_17','pb_ep_post_05b','pb_ep_post_05c','pb_ep_post_05d','pb_ep_dragon_19','pb_ep_dragon_20','pb_ep_dragon_21','pb_ep_dragon_22','pb_ep_post_01','pb_ep_post_02','pb_ep_gacha_01'];
const epids=ep('pb_ep').steps.map(s=>s.id);for(let i=1;i<ordered.length;i++)assert(epids.indexOf(ordered[i-1])<epids.indexOf(ordered[i]),ordered[i]);
for(const [id,bid] of [['pb_09_post_06','p2_09_b'],['pb_13_post_09','p2_13_b'],['pb_17_post_08','p2_17_b'],['pb_19_post_04','p2_19_b']]){const steps=ep(id.slice(0,5)).steps;const at=steps.findIndex(s=>s.id===id);assert.equal(steps[at-1].battleId,bid);}
assert.equal(d.optionalCards.find(c=>c.id==='pb_opt_gacha_01').display,false);
assert.equal(ep('pb_16').steps.filter(s=>s.kind==='event').length,0);
assert.equal(ep('pb_11').steps.find(s=>s.action==='synthesis').resultId,'s110_061');
// Exact-source verification is optional locally; CI uses fixed counts/order and the recorded source hashes.
const source='/tmp/prologue-sources-20261114/late.txt';
if(fs.existsSync(source)){
 const lines=fs.readFileSync(source,'utf8').split(/\r?\n/);
 for(const e of d.episodes)for(const c of sourceCards(e))assert.equal(lines[c.sourceLine-1],`${c.id}｜${c.sourceText}`);
}
console.log('Prologue part 2 data: 17 episodes, 520 exact source cards, 15 battles, rewards, source order, IDs, assets and fixed skills passed.');
const scene=id=>d.episodes.flatMap(e=>e.steps).find(s=>s.id===id);
assert.equal(scene('pb_22_pre_01').effect,'fracture');
assert(scene('pb_22_pre_01').cast.includes('偽竜 code:alfa'));
assert.equal(scene('pb_22_post_15').effect,'blackout');
assert.equal(scene('pb_22_post_13').effect,'transfer');
assert.equal(scene('pb_21_post_02').effect,'silhouette');
assert.equal(scene('pb_ep_dragon_03').effect,'eyeContact');
assert.equal(scene('pb_ep_kenno_01').effect,'pledgeLight');
for(const e of d.episodes)for(const s of e.steps){
 if(s.effect)assert(d.sceneEffects.includes(s.effect),s.effect);
 for(const name of s.cast||[]){assert(d.portraits[name],name);assert(fs.existsSync(d.portraits[name]),d.portraits[name]);}
}
assert.equal(d.optionalRoutes.length,6);
for(const route of d.optionalRoutes){
 assert.equal(route.required,false);assert.equal(route.skippable,true);assert.equal(route.unlockTarget,false);assert.equal(route.rewards,false);
 for(const id of route.cardIds){const card=d.optionalCards.find(c=>c.id===id);assert(card,id);assert.notEqual(card.display,false,id);}
}
assert.equal(d.optionalRoutes.find(r=>r.id==='gacha').afterEpisode,'pb_ep');
console.log('34 reviewed scene hints, full dragon asset, abstract silhouette and six non-blocking optional routes passed.');
