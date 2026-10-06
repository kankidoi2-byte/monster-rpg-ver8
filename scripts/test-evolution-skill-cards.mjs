import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const json=v=>JSON.parse(JSON.stringify(v));
const r=runtime();
const routes=json(r.run(`M.flatMap(m=>[...(m.evolutions||[]).map(e=>({from:m.id,to:e.to,level:e.level})),...(m.evolution?[{from:m.id,to:m.evolution,level:m.evolutionLevel}]:[])]).concat(FUSIONS.map((f,index)=>({...f,index,level:3,special:true})))`));
const old=runtime({skills:()=>fs.readFileSync(new URL('../js/skills.js',import.meta.url),'utf8').replace('const ids = evolutionSkillCardIdsForMonster(mon);','const ids = defaultSkillIdsForMonster(mon, ins);')});
const fields='({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills,items:save.items})';
const report=[];
function setup(route,second=false){
 r.context.route=route;
 r.run(`save=initSave();save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);save.instances=[];save.party=[];save.equippedSkills={};
 var ins=addInstance(route.from,route.level);ins.exp=17;ins.locked=true;ins.customGrowth={value:9};save.party=[ins.uid];
 if(${second}){var other=addInstance(route.from,route.level);save.party.push(other.uid);}
 save.skillCards=Object.fromEntries(MOVE_CARDS.map(sk=>[sk.id,7]));
 if(route.special)save.items[route.item]=route.count*2;
 currentEvolution={uid:ins.uid,from:ins.id,choices:[route.to]};pendingEvolutions=[];
 renderFusion=()=>{};renderPartySetup=()=>{};`);
 r.context.confirm=()=>true;r.context.prompt=()=>'1';
}
function evolve(route){r.run(route.special?'tryFusion(route.index)':'confirmEvolution(route.to)');}
for(const route of routes){
 setup(route,true);
 const expected=json(r.run(`[...new Set(by(route.to).moves.map(move=>canonicalSkillId(skillIdFromMove(move))))]`));
 assert(expected.every(id=>r.run(`!!SKILL_BY_ID[${JSON.stringify(id)}]`)));
 assert.deepEqual(json(r.run('evolutionSkillCardIdsForMonster(by(route.to))')),expected);
 const before=json(r.run(fields));
 old.context.route=route;
 const previous=json(old.run('defaultSkillIdsForMonster(by(route.to),{level:route.level})'));
 evolve(route);
 const after=json(r.run(fields));
 const delta=Object.keys(after.skillCards).filter(id=>after.skillCards[id]!==before.skillCards[id]);
 assert.deepEqual(delta.sort(),[...expected].sort(),`${route.from}->${route.to}`);
 for(const id of expected)assert.equal(after.skillCards[id],before.skillCards[id]+1);
 assert.deepEqual(after.instances[0],{...before.instances[0],id:route.to},'UID, level, EXP and training kept');
 assert.deepEqual(after.instances[1],before.instances[1]);assert.deepEqual(after.party,before.party);
 // Compare actual inherited equipment against unchanged prior selection logic.
 old.context.fixture=json(before);old.context.target=route.to;
 const equipment=json(old.run('save=fixture;save.instances[0].id=target;ensureInstanceSkills(save.instances[0]);save.equippedSkills'));
 assert.deepEqual(after.equippedSkills,equipment);
 assert(r.run('getEquippedSkillIds(ins).length<=3 && equippedSkillCost(ins)<=skillCostLimitFor(by(ins.id),ins)'));
 if(route.special)assert.equal(after.items[route.item],before.items[route.item]-route.count);
 else assert.deepEqual(after.items,before.items);
 if(!route.special||route.repeatable){
   r.run('currentEvolution={uid:other.uid,from:other.id,choices:[route.to]}');evolve(route);
   for(const id of expected)assert.equal(r.run(`save.skillCards['${id}']`),before.skillCards[id]+2,'each individual grants cards');
 }
 const stable=json(r.run(fields));
 r.run('confirmEvolution(route.to);renderParty();renderDex();save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem()');
 const reloaded=json(r.run(fields));
 assert.deepEqual(reloaded.skillCards,stable.skillCards,'no render/reload grants');
 assert.deepEqual(reloaded.equippedSkills,stable.equippedSkills);assert.deepEqual(reloaded.party,stable.party);
 assert.deepEqual(reloaded.instances.map(({uid,id,level,exp,locked})=>({uid,id,level,exp,locked})),stable.instances.map(({uid,id,level,exp,locked})=>({uid,id,level,exp,locked})));
 report.push({...route,name:r.run('by(route.to).name'),before:previous.map(id=>r.run(`SKILL_BY_ID['${id}'].name`)),after:expected.map(id=>r.run(`SKILL_BY_ID['${id}'].name`))});
 // Cancel, invalid/stale choices, insufficient materials, completed nonrepeatable fusion.
 setup(route);const untouched=json(r.run(fields));
 if(route.special){
   r.context.confirm=()=>false;evolve(route);assert.deepEqual(json(r.run(fields)),untouched);
   r.context.confirm=()=>true;r.run('save.items[route.item]=0');const noItems=json(r.run(fields));evolve(route);assert.deepEqual(json(r.run(fields)),noItems);
   setup(route);r.run('save.instances=[]');const missing=json(r.run(fields));evolve(route);assert.deepEqual(json(r.run(fields)),missing);
   if(!route.repeatable){setup(route);r.run('save.caught.push(route.to)');const done=json(r.run(fields));evolve(route);assert.deepEqual(json(r.run(fields)),done);}
   setup(route,true);r.context.prompt=()=>null;const cancelled=json(r.run(fields));evolve(route);assert.deepEqual(json(r.run(fields)),cancelled);
 }else{
   r.run("confirmEvolution('missing');confirmEvolution(ins.id)");assert.deepEqual(json(r.run(fields)),untouched);
   r.run('cancelEvolution();confirmEvolution(route.to)');assert.deepEqual(json(r.run(fields)),untouched);
   setup(route);r.run('currentEvolution.from="missing"');const stale=json(r.run(fields));evolve(route);assert.deepEqual(json(r.run(fields)),stale);
   setup(route);r.run('ins.level=1');const tooLow=json(r.run(fields));evolve(route);assert.deepEqual(json(r.run(fields)),tooLow);
 }
}
// Synthetic >3 moves, repeated canonical move, merged raw ID, legacy alias and invalid ID.
const raw=json(r.run(`by('highaquaron').moves.find(m=>canonicalSkillId(skillIdFromMove(m))!==skillIdFromMove(m))`));
assert(raw,'real merged-ID fixture');r.context.raw=raw;
r.run(`var synthetic={moves:[raw,raw,...by('voltax').moves,[...raw.slice(0,8),legacySkillIdFromMove(raw)],[...raw.slice(0,8),'invalid-id']]};save=initSave();save.skillCards={};var fake={uid:'fixture',id:'highaquaron'};var realBy=by;by=id=>id==='highaquaron'?synthetic:realBy(id);`);
const syntheticIds=json(r.run('grantEvolutionSkillCardsForInstance(fake)'));
assert(syntheticIds.length>3);assert.equal(new Set(syntheticIds).size,syntheticIds.length);
assert(r.run('Object.values(save.skillCards).every(n=>n===1)'));
assert(!syntheticIds.includes('invalid-id'));assert(syntheticIds.every(id=>r.run(`SKILL_BY_ID['${id}']&&!SKILL_BY_ID['${id}'].deprecated`)));
assert.equal(r.run('grantEvolutionSkillCardsForInstance(null).length'),0);
const lacking=report.filter(e=>e.before.length<e.after.length);
console.log(`PASS evolution cards: ${routes.length} routes (${routes.filter(e=>e.special).length} special), ${lacking.length} formerly incomplete; per-individual, cancellation/failure/reload, equipment/save preservation, aliases/merged IDs and >3 slots.`);
if(process.argv.includes('--report'))console.log(JSON.stringify(report,null,2));
