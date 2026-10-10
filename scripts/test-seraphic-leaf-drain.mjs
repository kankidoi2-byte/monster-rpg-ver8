import {legacyUnitProjection} from './skill110-legacy-projection.mjs';
import assert from 'node:assert/strict';
import {runtime,seeded} from '../tools/balance-audit/runtime.mjs';
const id='skill_seralphia_03',oldMove=['セラフィックリーフ',68,'grass',null,null,null,null,null,id];
const newMove=['セラフィックリーフ',68,'grass','tactical',null,4,'実際に減らした相手のHPの20%を吸収する。',null,id,{drain:.2}];
const before=runtime({data:s=>s.replace(JSON.stringify(newMove),JSON.stringify(oldMove))}),after=runtime();
const plain=v=>JSON.parse(JSON.stringify(v));
assert.deepEqual(plain(after.run(`skillToMove('${id}')`)),newMove);
assert.equal(before.run(`SKILL_BY_ID['${id}'].effect`),null);
assert.equal(after.run(`SKILL_BY_ID['${id}'].cost`),4);
assert.deepEqual(plain(after.run('M')).map(legacyUnitProjection).map(m=>({...m,moves:m.moves.map(mv=>mv[8]===id?oldMove:mv)})),plain(before.run('M')).map(legacyUnitProjection));
assert.deepEqual(plain(after.run('MOVE_CARDS')).filter(c=>c.id!==id),plain(before.run('MOVE_CARDS')).filter(c=>c.id!==id));
for(const field of ['id','cost','power','types','requirements','exclusiveMonsterId','sourceUnitId','form'])assert.deepEqual(plain(after.run(`SKILL_BY_ID['${id}'].${field}`)),plain(before.run(`SKILL_BY_ID['${id}'].${field}`)));
assert.deepEqual(plain(after.run('MOVE_CARDS.map(c=>[c.id,canonicalSkillId(c.id),M.filter(m=>isSkillAllowedForMonster(c.id,m)).map(m=>m.id)])')),plain(before.run('MOVE_CARDS.map(c=>[c.id,canonicalSkillId(c.id),M.filter(m=>isSkillAllowedForMonster(c.id,m)).map(m=>m.id)])')));
for(const kind of ['monster','character'])assert.deepEqual(plain(after.run(`skillGachaRates('${kind}').map(r=>({cost:r.cost,weight:r.weight,rate:r.rate,cards:r.cards.map(c=>c.id)}))`)),plain(before.run(`skillGachaRates('${kind}').map(r=>({cost:r.cost,weight:r.weight,rate:r.rate,cards:r.cards.map(c=>c.id)}))`)));
assert.equal(after.run('M.length'),100);
let loadouts=0;
for(const m of plain(after.run('M')))for(let level=1;level<=100;level++){
 const expr=`defaultSkillIdsForMonster(by('${m.id}'),{level:${level}})`;
 assert.deepEqual(plain(after.run(expr)),plain(before.run(expr)),`${m.id} Lv${level}`);loadouts++;
}
const alias=after.run('legacySkillIdFromMove(["セラフィックリーフ",68,"grass"])');
assert.equal(after.run(`normalizeSkillId('${alias}')`),id);
for(const input of [id,alias]){
 after.context.fixture={saveMeta:{migrations:['equipped_skill_cards_v1']},instances:[{uid:'sera-save',id:'seralphia',level:100,exp:0},{uid:'starter-save',id:'freigal',level:4,exp:9}],party:['starter-save','sera-save'],skillCards:{[input]:7,skill_freigal_01:2},equippedSkills:{'sera-save':[input],'starter-save':['skill_freigal_01']}};
 after.run('save=parseAndPrepareSave(JSON.stringify(fixture),[]);migrateSkillSystem()');
 const fields='({instances:save.instances.map(({uid,id,level,exp})=>({uid,id,level,exp})),party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})';
 const first=plain(after.run(fields));
 assert.deepEqual(first.instances,after.context.fixture.instances);assert.deepEqual(first.party,after.context.fixture.party);
 const mapped=after.run(`canonicalSkillId('${input}')`),starter=after.run("canonicalSkillId('skill_freigal_01')");
 assert.equal(first.skillCards[mapped],7);assert.equal(first.skillCards[starter],2);assert(first.equippedSkills['sera-save'].every(id=>after.run(`isSkillAllowedForMonster('${id}',by('seralphia'))`)));assert(first.equippedSkills['starter-save'].includes(starter));
 after.run('save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();migrateSkillSystem()');assert.deepEqual(plain(after.run(fields)),first);
}
function setup(r,{actor='player',hp=75,actorHp=10,half=false,link=false,guard=false,defender='slime',seed=42}={}){
 r.context.Math.random=seeded(seed);
 r.run(`save=initSave();save.instances=[];save.party=[];var ins=addInstance('${actor==='player'?'seralphia':defender}',1);save.party=[ins.uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by('${actor==='player'?defender:'seralphia'}');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.conditions=${half?'[{id:"healing_half"}]':'[]'};
 pHp=${actor==='player'?actorHp:hp};eHp=${actor==='player'?hp:actorHp};pAtk=eAtk=1;pGuard=eGuard=${guard};pAquaShield=eAquaShield=pFlareCharge=eFlareCharge=false;
 var entryA={id:'enemy_a',kind:'enemy',mon:enemy,hp:eHp,maxHp:enemyMaxHp(),attack:1,alive:true,guard:eGuard,aquaShield:false,flareCharge:false};
 var entryB={id:'enemy_b',kind:'enemy',mon:by('${defender}'),hp:${hp},maxHp:1000,attack:1,alive:true,guard:${guard},aquaShield:false,flareCharge:false};multiBattle={enemies:[entryA,entryB],log:[]};
 var healEvents=[];battleHpResult=(source,before,after,options)=>{if(options.label==='吸収')healEvents.push({source,healed:after-before});};`);
 if(link)r.run(`kokoroLinkBattleState.linksByTargetUid.set(activeInstance.uid,{targetUid:activeInstance.uid,effects:{attackMultiplier:1},powerAbility:{id:'life_steal',charges:1,damageRate:.2,maxHpRateCap:.1}})`);
}
async function attack(r,mode,actor,move=id){
 if(mode==='single')await r.run(`doAttack(${actor==='player'?'player,enemy':'enemy,player'},skillToMove('${move}'),${actor==='player'})`);
 else await r.run(`performMultiAttack(${actor==='player'?"{kind:'player'}":'entryA'},${actor==='enemy-other'?'entryB':actor==='player'?'entryA':"{kind:'player'}"},skillToMove('${move}'))`);
}
const actorExpr=(mode,actor)=>actor==='player'?'pHp':mode==='single'?'eHp':'entryA.hp';
const targetExpr=(mode,actor)=>actor==='player'?(mode==='single'?'eHp':'entryA.hp'):actor==='enemy-other'?'entryB.hp':'pHp';
let cases=0;
for(const mode of ['single','multi'])for(const actor of ['player','enemy','enemy-other']){
 if(mode==='single'&&actor==='enemy-other')continue;
 for(const hp of [0,7,75])for(const half of [false,true]){
  setup(after,{actor,hp,half});
  // Guarantee overkill without changing the production move or its damage code.
  after.run('pAtk=eAtk=10;entryA.attack=10');
  await attack(after,mode,actor);
  assert.equal(after.run(actorExpr(mode,actor))-10,half?(hp===75?7:hp===7?1:0):Math.floor(hp*.2));
  assert.equal(after.run('healEvents.length'),hp>0?1:0,'exactly one skill drain');cases++;
 }
 setup(after,{actor,hp:75});after.run(actor==='player'?'pHp=playerMaxHp()-1':mode==='single'?'eHp=enemyMaxHp()-1':'entryA.hp=entryA.maxHp-1');
 const max=after.run(actor==='player'?'playerMaxHp()':mode==='single'?'enemyMaxHp()':'entryA.maxHp');await attack(after,mode,actor);assert.equal(after.run(actorExpr(mode,actor)),max);cases++;
 if(actor==='enemy'){
  setup(after,{actor,hp:75});after.run('eAtk=10;entryA.attack=10');await attack(after,mode,actor);const drained=after.run(actorExpr(mode,actor));
  await attack(after,mode,actor,'skill_seralphia_02');assert(after.run(actorExpr(mode,actor))>drained,'enemy blessing heals after leaf drain');cases++;
 }
}
for(const mode of ['single','multi']){
 setup(after,{hp:75,link:true});after.run('pAtk=10');await attack(after,mode,'player');assert.equal(after.run('pHp'),40);assert.equal(after.run('healEvents.length'),2,'one link drain plus one skill drain');assert.equal(after.run('kokoroLinkPowerAbilityFor(activeInstance).charges'),0);
 const blocked=runtime();setup(blocked,{actor:'enemy',hp:75});blocked.context.resolvePlayerIncomingDamage=()=>({hpDamage:0,absorbed:100,barrierRemaining:0});await attack(blocked,mode,'enemy');assert.equal(blocked.run(actorExpr(mode,'enemy')),10);assert.equal(blocked.run('healEvents.length'),0);
}
let comparisons=0;
for(const mode of ['single','multi'])for(const actor of ['player','enemy','enemy-other'])for(const defender of ['slime','aquaron','grassbeat','nemesion','doom_nemesion'])for(const guard of [false,true])for(const seed of [1,42,1234]){
 if(mode==='single'&&actor==='enemy-other')continue;
 const a=runtime(),b=runtime({data:s=>s.replace(JSON.stringify(newMove),JSON.stringify(oldMove))});
 for(const r of [a,b]){setup(r,{actor,hp:1000,actorHp:100,defender,guard,seed});await attack(r,mode,actor);}
 assert.equal(a.run(targetExpr(mode,actor)),b.run(targetExpr(mode,actor)),'same seed, same damage');comparisons++;
}
console.log(JSON.stringify({result:'PASS',initialLoadouts:loadouts,combatCases:cases,damageComparisons:comparisons,saveFixtures:2,gachaUnchanged:true,linkAndBarrier:true,note:'Production attack and save code in Node VM; DOM, rendering and animations stubbed.'}));
