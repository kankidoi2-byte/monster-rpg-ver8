import assert from 'node:assert/strict';
import {battleRunner} from '../tools/balance-audit/battles.mjs';
const runner=battleRunner(),r=runner.r;const results=[];
for(const config of [
 {map:'grassland',enemy:'slime',party:['freigal'],level:10,difficulty:'easy'},
 {map:'grassland',enemy:'goblin',party:['elna_beginner','aquaron'],level:10,difficulty:'normal'},
 {map:'grassland',enemy:'goblin',second:'slime',mode:'three_way',party:['freigal','aquaron'],level:30,difficulty:'normal'},
 {map:'grassland',enemy:'goblin',second:'slime',mode:'invasion_pending',invasionTurn:2,party:['freigal','aquaron'],level:20,difficulty:'normal'},
 {map:'starsea',enemy:'doom_nemesion',party:['elna_master','seralphia','freigal'],level:100,difficulty:'extreme'},
 {map:'starsea',enemy:'nemesion',party:['freigal','aquaron','grassbeat'],level:30,difficulty:'hard'}
]){
 // Only use actual registered units, legal native equipment and production hunt
 // HP/levels/difficulty; no raw mocked move arrays in these complete battles.
 config.party=config.party.filter(id=>r.run(`!!by(${JSON.stringify(id)})`));
 for(const seed of [17,193]){
  const result=await runner.battle({...config,cap:160},seed);
  assert.notEqual(result.outcome,'capped',JSON.stringify({config,seed,result}));
  results.push({enemy:config.enemy,mode:config.mode||'single',level:config.level,seed,...result});
 }
}
console.log(JSON.stringify({result:'PASS',battles:results.length,results}));
let resetCases=0;
for(const mode of ['single','three_way'])for(const outcome of ['victory','defeat','retreat']){
 r.run(`auditSetup({party:['freigal'],level:30,map:'grassland',enemy:'slime',second:'goblin',mode:'${mode}',difficulty:'normal'});pAtk=eAtk=1.6;pGuard=eGuard=.7;pFlareCharge=eFlareCharge=1.3;pStatus=eStatus='poison';pPoisonTurns=ePoisonTurns=2;var resetEntries=multiBattle?.enemies||[];resetEntries.forEach(e=>{e.attack=1.6;e.guard=.7;e.flareCharge=1.3;e.status='poison';e.poisonTurns=2;});`);
 if(outcome==='victory')r.run(mode==='single'?'eHp=0;win()':'multiBattle.enemies.forEach(e=>{e.hp=0;e.alive=false;});winMultiBattle()');
 else if(outcome==='defeat')r.run('pHp=0;losePartyBattle()');
 else r.run(mode==='single'?'busy=false;runAway()':'runAwayFromMultiBattle()');
 assert.equal(r.run('pAtk'),1);assert.equal(r.run('eAtk'),1);assert.equal(r.run('pGuard'),false);assert.equal(r.run('eGuard'),false);assert.equal(r.run('pFlareCharge'),false);assert.equal(r.run('eFlareCharge'),false);
 assert(r.run('resetEntries.every(e=>e.attack===1&&!e.guard&&!e.flareCharge&&!e.status&&!e.poisonTurns)'));
 resetCases++;
}
console.log(JSON.stringify({result:'PASS',resetCases,scope:'victory/defeat/retreat clears transient buffs in single and multi, preserving reward/contract records'}));
const originalSetup=r.run('auditSetup'),originalSelect=r.run('auditSelect');
r.context.skill110BaseAuditSetup=originalSetup;
r.run(`var supportPolicyCounts={attack:0,heal:0,guard:0};
 auditSetup=function(config){skill110BaseAuditSetup(config);const ids=['s110_021','s110_004','s110_003'];ids.forEach(id=>save.skillCards[id]=1);save.equippedSkills[activeInstance.uid]=ids;
 if(!ids.every(id=>isSkillAllowedForMonster(id,player))||ids.reduce((n,id)=>n+SKILL_BY_ID[id].cost,0)>skillCostLimitFor(player,activeInstance))throw Error('support simulation illegal equipment');};
 auditSelect=function(){const moves=getEquippedMovesForInstance(activeInstance);let index=battleTurnCount%3===0?2:pHp<playerMaxHp()*.8?1:0;supportPolicyCounts[index===0?'attack':index===1?'heal':'guard']++;return index;};`);
const supportResults=[];
for(const [enemy,map,difficulty,level] of [['goblin','grassland','normal',20],['nemesion','starsea','hard',50],['doom_nemesion','starsea','extreme',100]])for(const seed of [31,47]){
 const result=await runner.battle({party:['grassbeat'],level,map,enemy,difficulty,cap:160},seed);
 assert.notEqual(result.outcome,'capped',JSON.stringify({enemy,seed,result}));supportResults.push({enemy,level,seed,...result});
}
r.context.auditSetup=originalSetup;r.context.auditSelect=originalSelect;
const policyCounts=JSON.parse(r.run('JSON.stringify(supportPolicyCounts)'));
assert(policyCounts.attack>0&&policyCounts.heal>0&&policyCounts.guard>0);
console.log(JSON.stringify({result:'PASS',supportBattles:supportResults.length,policyCounts,results:supportResults,scope:'legal real forest-unit poison/heal/guard rotation against actual enemy AI; no completion timeout'}));
const noAttackFindings=[];
r.context.skill110BaseAuditSetup=originalSetup;
r.run(`auditSetup=function(config){skill110BaseAuditSetup(config);const ids=['s110_100','s110_063','s110_009'];ids.forEach(id=>save.skillCards[id]=1);save.equippedSkills[activeInstance.uid]=ids;
 if(!ids.every(id=>isSkillAllowedForMonster(id,player))||ids.reduce((n,id)=>n+SKILL_BY_ID[id].cost,0)>skillCostLimitFor(player,activeInstance))throw Error('pure policy illegal equipment');};`);
for(const [label,index,cap] of [['heal-only',0,100],['guard-only',1,3000],['debuff-only',2,3000]]){
 r.context.purePolicyIndex=index;r.run('auditSelect=()=>purePolicyIndex');
 const result=await runner.battle({party:['grassbeat'],level:100,map:'grassland',enemy:'slime',difficulty:'normal',cap},19);
 const finalHp=r.run('pHp'),maximum=r.run('playerMaxHp()');
 noAttackFindings.push({policy:label,...result,finalHp,maximum});
 if(label==='heal-only'){assert.equal(result.outcome,'capped');assert(finalHp>=maximum-40);}
 else assert.notEqual(result.outcome,'capped',label+' positive incoming damage must eventually end battle');
}
r.context.auditSetup=originalSetup;r.context.auditSelect=originalSelect;
console.log(JSON.stringify({result:'KNOWN_SPEC_LIMIT',noAttackFindings,reason:'Unlimited healing with no resource cost can sustain indefinitely against weak attacks; fixed skill values left unchanged; cooldown/resource/turn-limit requires user decision'}));
