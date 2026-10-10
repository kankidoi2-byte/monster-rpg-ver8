import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime();
r.run(`
var hitRecords=[];
function combat110Setup(){
 save=initSave();activeInstance={id:'slime',uid:'test',level:10};player=structuredClone(by('slime'));enemy=structuredClone(by('slime'));player.types=enemy.types=['normal'];
 partyBattle=[{hp:500}];activePartyIdx=0;activeHuntRequest={enemyLevel:10};
 pHp=eHp=500;pAtk=eAtk=1;pGuard=eGuard=false;pAquaShield=eAquaShield=false;pFlareCharge=eFlareCharge=false;
 pStatus=eStatus=null;pPoisonTurns=ePoisonTurns=pParalysisTurns=eParalysisTurns=pConfusionTurns=eConfusionTurns=pSleepTurns=eSleepTurns=0;
 multiBattle={active:false,enemies:[]};playerMaxHp=enemyMaxHp=()=>1000;Math.random=()=>.5;
 playerAttackInstanceMultiplier=enemyDifficultyAttackMultiplier=()=>1;huntMapAttackMultiplier=()=>1;enemyKokoroLinkMisses=()=>false;
 kokoroLinkMovePowerMultiplierFor=()=>({multiplier:1});consumeKokoroLinkPenetration=()=>({rate:0});enemyKokoroLinkAttackMultiplier=()=>1;
 playerKokoroLinkChance=x=>({chance:x});applyPlayerKokoroLinkLifeSteal=()=>'';kokoroLinkEffectForInstance=()=>null;
 resolvePlayerIncomingDamage=x=>({hpDamage:x,absorbed:0});hitRecords=[];globalThis.battleHpResult=(...x)=>hitRecords.push(x);
}
function combat110Entry(id){return {id,kind:'enemy',mon:structuredClone(enemy),level:10,maxHp:1000,hp:500,attack:1,guard:false,aquaShield:false,flareCharge:false,poisonTurns:0,paralysisTurns:0,confusionTurns:0,sleepTurns:0,alive:true};}
async function combat110Run(config,power=100,mode='single',direction='player'){
 const move=typeof config==='string'?skillToMove(config):['test',power,'normal','tactical',null,1,'',null,'s110_test',config];
 const entries=[combat110Entry('a'),combat110Entry('b')];
 if(mode==='single')await doAttack(direction==='player'?player:enemy,direction==='player'?enemy:player,move,direction==='player');
 else{multiBattle={active:true,enemies:entries};await performMultiAttack(direction==='player'?{kind:'player'}:entries[0],direction==='enemy-player'?{kind:'player'}:entries[direction==='player'?0:1],move);}
 return {pHp,eHp,pAtk,eAtk,pGuard,eGuard,pFlareCharge,eFlareCharge,pPoisonTurns,ePoisonTurns,pParalysisTurns,eParalysisTurns,pConfusionTurns,eConfusionTurns,pSleepTurns,eSleepTurns,entries,hitRecords};
}
`);
const run=(s)=>r.run(s),plain=x=>JSON.parse(JSON.stringify(x));let checks=0;
async function scenario(config,power=100,setup='',mode='single',direction='player'){run('combat110Setup();'+setup);checks++;return plain(await run(`combat110Run(${JSON.stringify(config)},${power},'${mode}','${direction}')`));}
for(const config of [{},{drain:.5},{recoil:.15},{buff:.25},{debuff:.15},{heal:{flat:14,perLevel:1.2}},{guard:.7},{charge:1.3},{hits:2},{ignoreDefense:true}]){
 const single=await scenario(config);const multi=await scenario(config,100,'','multi');assert.equal(single.pHp,multi.pHp);assert.equal(single.eHp,multi.entries[0].hp);
 const enemy=await scenario(config,100,'','single','enemy-player');assert.equal(single.eHp,enemy.pHp);assert.equal(single.pHp,enemy.eHp);
 const em=await scenario(config,100,'','multi','enemy-player');assert.equal(enemy.pHp,em.pHp);assert.equal(enemy.eHp,em.entries[0].hp);
 const ee=await scenario(config,100,'','multi','enemy-enemy');assert.equal(single.eHp,ee.entries[1].hp);assert.equal(single.pHp,ee.entries[0].hp);
}
assert.equal((await scenario({guard:.45},0,'pGuard=.7')).pGuard,.7);
assert.equal((await scenario({charge:1.2},0,'pFlareCharge=1.3')).pFlareCharge,1.3);
assert.equal((await scenario({heal:{flat:14,perLevel:1.2}},0,'pFlareCharge=1.3')).pFlareCharge,1.3);
assert.equal((await scenario({heal:{flat:14,perLevel:1.2}},0)).pHp,526);
assert.equal((await scenario({heal:{flat:60,perLevel:5}},0,'pHp=999')).pHp,1000);
assert.equal((await scenario({drain:.5},100,'eHp=7')).pHp,503);
assert.equal((await scenario({recoil:.15},100,'pHp=20')).pHp,0);
assert.equal((await scenario({restoreAttack:true,buff:0},0,'pAtk=.65')).pAtk,1);
assert.equal((await scenario({restoreAttack:true},0,'pAtk=1.4')).pAtk,1.4);
assert.equal((await scenario({buff:.3},0,'pAtk=1.5')).pAtk,1.6);
assert.equal((await scenario({debuff:.15},0,'eAtk=.7')).eAtk,.65);
const only=await scenario({dispel:'attack'},0,'eAtk=1.4;eGuard=.7;eFlareCharge=1.3;eAquaShield=true');assert.equal(only.eAtk,1);assert.equal(only.eGuard,.7);assert.equal(only.eFlareCharge,1.3);
const full=await scenario({dispel:true},100,'eAtk=1.4;eGuard=.7;eFlareCharge=1.3;eAquaShield=true');assert.equal(full.eHp,469);assert.equal(full.eGuard,false);assert.equal(full.eFlareCharge,false);
const piercing=await scenario({ignoreDefense:true},100,'eGuard=.7;eAquaShield=true;pAtk=1.5');assert.equal(piercing.eHp,346);
const multiHit=await scenario({hits:2},100,'eGuard=.7;pFlareCharge=1.3');assert.equal(multiHit.hitRecords.length,2);assert.equal(multiHit.eHp,460);assert.equal(multiHit.eGuard,false);assert.equal(multiHit.pFlareCharge,false);
assert.equal((await scenario({heal:{flat:14,perLevel:1.2}},0,"activeHuntRequest.conditions=[{id:'healing_half'}]")).pHp,513);
const cleanse=await scenario({cleanse:['poison','paralysis','confusion']},0,"pStatus='poison';pPoisonTurns=pParalysisTurns=pConfusionTurns=pSleepTurns=3");assert.equal(cleanse.pPoisonTurns,0);assert.equal(cleanse.pParalysisTurns,0);assert.equal(cleanse.pConfusionTurns,0);assert.equal(cleanse.pSleepTurns,3);
const conditional=await scenario({bonus:{condition:'target_hurt',threshold:.5,multiplier:1.3}},88);assert.equal(conditional.eHp,380);
const absent=await scenario({bonus:{condition:'target_hurt',threshold:.5,multiplier:1.3}},88,'eHp=501');assert.equal(absent.eHp,409);
for(const id of plain(run('SKILL110_CATALOG.map(s=>s.id)'))){
 const a=await scenario(id,0,'Math.random=()=>.1');
 const b=await scenario(id,0,'Math.random=()=>.1','multi');
 const c=await scenario(id,0,'Math.random=()=>.1','single','enemy-player');
 const d=await scenario(id,0,'Math.random=()=>.1','multi','enemy-player');
 const e=await scenario(id,0,'Math.random=()=>.1','multi','enemy-enemy');
 assert.equal(a.pHp,b.pHp,id);assert.equal(a.eHp,b.entries[0].hp,id);
 assert.equal(a.pHp,c.eHp,id);assert.equal(a.eHp,c.pHp,id);
 assert.equal(c.pHp,d.pHp,id);assert.equal(c.eHp,d.entries[0].hp,id);
 assert.equal(a.pHp,e.entries[0].hp,id);assert.equal(a.eHp,e.entries[1].hp,id);
 assert.equal(a.pAtk,c.eAtk,id);assert.equal(a.eAtk,c.pAtk,id);
 assert.equal(a.pGuard,c.eGuard,id);assert.equal(a.eGuard,c.pGuard,id);
 assert.equal(a.pFlareCharge,c.eFlareCharge,id);assert.equal(a.eFlareCharge,c.pFlareCharge,id);
 for(const suffix of ['PoisonTurns','ParalysisTurns','ConfusionTurns'])assert.equal(a['e'+suffix],c['p'+suffix],id);
}
console.log(JSON.stringify({result:'PASS',checks,scope:'production shared single/multi resolver; five attack directions, guard/focus, heal/drain/recoil, dispel, multi-hit, defense bypass; UI stubbed'}));
let aiCases=0;
for(const id of plain(run('M.map(m=>m.id)')))for(const level of [1,10,50,100]){
 run(`combat110Setup();enemy=structuredClone(by('${id}'));activeHuntRequest.enemyLevel=${level};eHp=1;pAtk=1.4;pGuard=.7;`);
 const legal=plain(run(`skill110EnemyMoves(enemy,${level})`));
 assert(legal.some(m=>m[1]>0),id);assert(legal.length<=3,id);
 assert(legal.reduce((n,m)=>n+m[5],0)<=run(`skillCostLimitFor(enemy,{level:${level}})`),id);
 let supports=0,lastSupport=false;
 for(let i=0;i<30;i++){
  const mv=plain(run("nextEnemyMoveWithKokoroLinkForesight('single',enemy,()=>.1).move"));
  assert(mv[5]<25,id);assert(legal.some(m=>m[8]===mv[8]),id);
  if(mv[1]<=0){supports++;assert(!lastSupport,id+' no consecutive support');}lastSupport=mv[1]<=0;
 }
 assert(supports<=4,id+' support budget');aiCases++;
}
console.log(JSON.stringify({result:'PASS',aiCases,scope:'all real units at levels1/10/50/100: legal equipment, attack availability, no ultimate, finite/nonconsecutive support'}));
run('combat110Setup();eGuard=.7;eAquaShield=true;pFlareCharge=1.3');
await run("doAttack(player,enemy,['通常攻撃',24,'normal',null,null,0],true)");
assert.equal(run('eHp'),489);assert.equal(run('eGuard'),false);assert.equal(run('pFlareCharge'),false);
run("combat110Setup();var bypassLink={barrierRemaining:500,powerAbility:{id:'evasion',charges:1,chance:1}};kokoroLinkEffectForInstance=()=>bypassLink;");
await run("combat110Run({ignoreDefense:true},100,'single','enemy-player')");
assert.equal(run('pHp'),500);assert.equal(run('bypassLink.powerAbility.charges'),0);assert.equal(run('bypassLink.barrierRemaining'),500);
run("combat110Setup();var bypassLink={barrierRemaining:500,powerAbility:{id:'first_hit_guard',charges:1,reductionRate:.7}};kokoroLinkEffectForInstance=()=>bypassLink;");
await run("combat110Run({ignoreDefense:true},100,'single','enemy-player')");
assert.equal(run('pHp'),396);assert.equal(run('bypassLink.barrierRemaining'),500);
run("combat110Setup();enemyKokoroLinkMisses=()=>true;eFlareCharge=1.3;eHp=20;");
await run("combat110Run({recoil:.15},100,'single','enemy-player')");
assert.equal(run('pHp'),500);assert.equal(run('eHp'),0);assert.equal(run('eFlareCharge'),false);
console.log('PASS basic attack numeric defense/focus, bypass preserves evasion/barrier resources, missed recoil KO');
let defenseCases=0;
for(const guard of [0,.45,.7])for(const shield of [false,true])for(const linkGuard of [0,.35,.8])for(const mirror of [0,.6])for(const barrier of [0,20,500])for(const bypass of [false,true])for(const hits of [1,2]){
 run(`combat110Setup();pGuard=${guard};pAquaShield=${shield};var comboLink={barrierRemaining:${barrier},powerAbility:{id:'first_hit_guard',charges:1,reductionRate:${linkGuard}},tacticsAbility:{id:'water_mirror_guard',charges:1,reductionRate:${mirror}}};kokoroLinkEffectForInstance=()=>comboLink;`);
 const result=plain(await run(`combat110Run({ignoreDefense:${bypass},hits:${hits}},100,'single','enemy-player')`));
 const reduced=Math.max(1,Math.floor(104.5*(1-(bypass?0:Math.max(guard,shield?.5:0,linkGuard,mirror)))));
 const absorbed=bypass?0:Math.min(barrier,reduced);
 assert.equal(result.pHp,500-reduced+absorbed,JSON.stringify({guard,shield,linkGuard,mirror,barrier,bypass,hits}));
 assert.equal(run('comboLink.barrierRemaining'),barrier-absorbed);
 assert.equal(run('comboLink.powerAbility.charges'),bypass?1:0);
 assert.equal(run('comboLink.tacticsAbility.charges'),bypass?1:0);
 defenseCases++;
}
console.log(JSON.stringify({result:'PASS',defenseCases,scope:'strongest-only guard/shield/both-link defenses, HP barriers, bypass and multihit Cartesian combinations'}));
run("combat110Setup();busy=false;save.items.attack_potion=1;useBattleItem('attack_potion');");
assert.equal(run('pAtk'),1.6);assert.equal(run('save.items.attack_potion'),0);
await run('combat110Run({},100)');assert.equal(run('eHp'),336);
run('combat110Setup();pAtk=9;eAtk=.1');await run('combat110Run({},100)');
assert.equal(run('pAtk'),1.6);assert.equal(run('eAtk'),.65);assert.equal(run('eHp'),336);
console.log('PASS attack potion and malformed buff inputs obey 0.65..1.60 actor multiplier cap');
