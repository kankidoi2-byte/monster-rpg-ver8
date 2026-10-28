import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime({save:source=>source+"\nglobalThis.individualRealSaveGame=saveGame;"}),run=r.run,json=value=>JSON.parse(JSON.stringify(value));
const expected={freigal:14,aquaron:16,highaquaron:36,grassbeat:10,thornbeat:26,rikasheef:24,volteck:13,spaquinn:30,sylphin:12,zephyray:28,luxseed:18,luxiard:38,nocle:17,noclaid:37,orcana:22,orca_stream:42,volmoog:26,nemes:25,nemesia:48,kimeragna:45};
const routes=json(run(`M.filter(m=>m.entityKind==='monster').flatMap(m=>(m.evolutions||(m.evolution?[{to:m.evolution,level:m.evolutionLevel}]:[])).map(e=>({from:m.id,...e})))`));
assert.equal(run(`M.filter(m=>m.entityKind==='monster').length`),50);
assert.equal(routes.length,21);
for(const route of routes){
 assert.equal(route.level,expected[route.from]);r.context.route=route;
 for(const offset of [-2,-1,0,1,2]){
  r.context.offset=offset;
  run(`save=initSave();var ins=addInstance(route.from,route.level+offset-1,0,{evolutionOffset:offset});save.party=[ins.uid];pendingEvolutions=[];currentEvolution=null;`);
  assert(!run('getEvoCandidates(ins).includes(route.to)'));
  run('checkEvolution(ins)');assert.equal(run('pendingEvolutions.length'),0);
  run('ins.level++;checkEvolution(ins)');assert(run('getEvoCandidates(ins).includes(route.to)'));
  const before=json(run('ins'));
  run('currentEvolution=pendingEvolutions.shift();confirmEvolution(route.to)');
  assert.deepEqual(json(run('ins')),{...before,id:route.to},'only form changes; UID/EXP/offset/lock stay intact');
  run('save=parseAndPrepareSave(JSON.stringify(save),[]);ins=save.instances[0];normalizeInstanceSaveFields(ins)');
  assert.equal(run('ins.evolutionOffset'),offset);
  const next=json(run('instanceEvolutionRoutes(ins)'));
  for(const e of next)assert.equal(e.level,expected[route.to]+offset,'next stage inherits offset');
 }
}
// Stable, additive backfill: no form reset, no RNG on load/import, unrelated fields preserved.
run(`save=initSave();var oldA={uid:'old-a',id:'freigal',level:9,exp:7,locked:true,custom:{value:4}};
var oldB={uid:'old-b',id:'freigal',level:9,exp:7,locked:false};save.instances=[oldA,oldB];save.party=[oldA.uid];
var oldRandom=Math.random;Math.random=()=>{throw Error('reload must not roll')};
var prepared=parseAndPrepareSave(JSON.stringify(save),[]);var again=parseAndPrepareSave(JSON.stringify(save),[]);`);
assert.deepEqual(json(run('prepared.instances')),json(run('again.instances')));
assert.deepEqual(json(run('prepared.instances[0]')),{...json(run('oldA')),evolutionOffset:run('monsterEvolutionOffset(oldA)')});
run(`var fallback=monsterEvolutionOffset(oldA);oldA.id='freiwolf';`);assert.equal(run('monsterEvolutionOffset(oldA)'),run('fallback'));
run('Math.random=oldRandom');
// Cover all five outcomes and neutral repair of malformed values without rerolling.
for(const [roll,offset] of [[0,-2],[.2,-1],[.4,0],[.6,1],[.999999,2]]){
 r.context.roll=roll;assert.equal(run("Math.random=()=>roll;addInstance('freigal').evolutionOffset"),offset);
}
run(`Math.random=oldRandom;var generated=Array.from({length:100},()=>addInstance('freigal'));`);
assert(run('new Set(generated.map(i=>i.evolutionOffset)).size>1'));
for(const bad of [null,'2',4,-3,1.5]){
 r.context.bad=bad;run("var broken={id:'aquaron',uid:'stable-broken',evolutionOffset:bad};normalizeInstanceSaveFields(broken)");
 assert(run('Number.isInteger(broken.evolutionOffset)&&Math.abs(broken.evolutionOffset)<=2'));
 const stable=run('broken.evolutionOffset');run('normalizeInstanceSaveFields(broken)');assert.equal(run('broken.evolutionOffset'),stable);
}
// Character and material evolution are intentionally unaffected.
run("var character=addInstance('elna_beginner',1,0);var nextCharacter=instanceEvolutionRoutes(character)");
assert.equal(run('Object.hasOwn(character,"evolutionOffset")'),false);
assert.deepEqual(json(run('nextCharacter')),[{to:'elna_middle',level:2}]);
run(`save=initSave();var special=addInstance('nemesion',1,0,{evolutionOffset:2});save.items.doom_fragment=1;save.party=[special.uid];renderFusion=()=>{};renderPartySetup=()=>{};tryFusion(FUSIONS.findIndex(f=>f.from==='nemesion'));`);
assert.equal(run('special.id'),'doom_nemesion');assert.equal(run('special.evolutionOffset'),2);assert.equal(run('save.items.doom_fragment'),0);
// The engine retains thresholds, but roster/dex presentation must not disclose them.
r.context.typesHtml=()=>'';
vm.runInContext(fs.readFileSync(new URL('../js/party.js',import.meta.url),'utf8'),r.context);
run(`var branch=addInstance('highaquaron',34,0,{evolutionOffset:-2});renderParty()`);
const roster=r.elements.get('partyList').innerHTML;
assert.doesNotMatch(roster,/instance-evolution-summary|進化レベル|条件達成/);
assert.match(roster,/Lv\.34/,'current level remains visible');
vm.runInContext(fs.readFileSync(new URL('../js/dex.js',import.meta.url),'utf8'),r.context);
const hints=json(run(`M.flatMap(mon=>monsterObtainEntries(mon).filter(e=>e.kind==='evolution'))`));
assert(hints.length>0);
assert(hints.every(e=>['育成によって進化','育成によって分岐進化'].includes(e.note)));
assert(hints.every(e=>!/(?:Lv|レベル|基準|個体差)/.test(e.note)));
assert.deepEqual(json(run('instanceEvolutionRoutes(branch).map(e=>e.level)')),[34,34]);
// Restore real persistence, prove actual saved payload and export/import preserve timing.
run('saveGame=individualRealSaveGame');
assert(run('saveGame()'));
run('var persisted=localStorage.getItem(SAVE_KEY);var restored=parseAndPrepareSave(persisted,[])');
assert.deepEqual(json(run('restored.instances')),json(run('save.instances')));
console.log(`PASS individual evolution: ${routes.length} routes × 5 offsets; threshold boundaries, branching, stage inheritance, stable legacy import, acquisition outcomes, invalid repair, UI, characters and material evolution.`);
