import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const sources=Object.fromEntries(['data','core','battle-rules','multi-battle'].map(name=>[name,fs.readFileSync(new URL('js/'+name+'.js',root),'utf8')]));
function make(){
 const elements=new Map();
 const context=vm.createContext({console,Math:Object.assign(Object.create(Math),{random:()=>0}),document:{getElementById(id){if(!elements.has(id))elements.set(id,{innerHTML:'',classList:{add(){},remove(){}},offsetWidth:0});return elements.get(id);}},setTimeout(){},update(){},updateMultiBattleView(){},battleHpResult(){},playerMaxHp:()=>1000,enemyMaxHp:()=>1000,enemyDifficultyAttackMultiplier:()=>1,huntMapAttackMultiplier:()=>1,adjustedBattleHealing:x=>x,kokoroLinkEnemyAccuracyFor:()=>1});
 for(const name of ['data','core','battle-rules','multi-battle']){
  let source=sources[name];
  vm.runInContext(source,context,{filename:'js/'+name+'.js'});
 }
 return {context,run:code=>vm.runInContext(code,context)};
}
async function scenario({mode='single',actor='player',targetHp=3,guarded=false,zeroDamage=false}){
 const r=make(),isPlayer=actor==='player';
 r.context.playerAttackInstanceMultiplier=()=>1;
 r.context.consumeKokoroLinkRecoilGuard=()=>guarded;
 r.run(`var player=by('${isPlayer?'alchemion':'slime'}'),enemy=by('${isPlayer?'slime':'alchemion'}');
 var activeInstance={id:player.id,level:1};var activePartyIdx=0;
 var pHp=${isPlayer?1000:targetHp},eHp=${isPlayer?targetHp:1000},pAtk=1,eAtk=1,pGuard=false,eGuard=false,pAquaShield=false,eAquaShield=false,pFlareCharge=false,eFlareCharge=false;
 var partyBattle=[{hp:pHp}];
 var entryA={id:'enemy_a',kind:'enemy',mon:enemy,hp:eHp,maxHp:1000,attack:1,alive:true,guard:false,aquaShield:false,flareCharge:false};
 var entryB={id:'enemy_b',kind:'enemy',mon:by('slime'),hp:${targetHp},maxHp:1000,attack:1,alive:true,guard:false,aquaShield:false,flareCharge:false};
 var multiBattle={enemies:[entryA,entryB]};var testMove=skillToMove('skill_alchemion_01');`);
 if(zeroDamage)r.context.resolvePlayerIncomingDamage=()=>({hpDamage:0,absorbed:140,barrierRemaining:0});
 const before=r.run(actor==='player'?'pHp':mode==='single'?'eHp':'entryA.hp');
 if(mode==='single')await r.run(`doAttack(${isPlayer?'player,enemy':'enemy,player'},testMove,${isPlayer})`);
 else await r.run(`performMultiAttack(${isPlayer?"{kind:'player'}":'entryA'},${actor==='enemy-other'?'entryB':isPlayer?'entryA':"{kind:'player'}"},testMove)`);
 const after=r.run(actor==='player'?'pHp':mode==='single'?'eHp':'entryA.hp');
 return {mode,actor,targetHp,guarded,zeroDamage,recoil:before-after};
}
for(const actor of ['player','enemy']){
 for(const mode of ['single','multi'])console.log(JSON.stringify(await scenario({mode,actor})));
}
let checks=0;
for(const actor of ['player','enemy','enemy-other'])for(const targetHp of [1,3,4,7,140,500]){
 const patched=await scenario({mode:'multi',actor,targetHp});
 const expected=Math.max(1,Math.floor(Math.min(140,targetHp)*.25));
 assert.equal(patched.recoil,expected,JSON.stringify(patched));checks++;
 if(actor!=='enemy-other'){
  const single=await scenario({mode:'single',actor,targetHp});
  assert.equal(patched.recoil,single.recoil);checks++;
 }
}
const blocked=await scenario({mode:'multi',actor:'enemy',zeroDamage:true});
assert.equal(blocked.recoil,1);checks++;
const immune=await scenario({mode:'multi',guarded:true});assert.equal(immune.recoil,0);checks++;
console.log(JSON.stringify({regressionChecks:checks,result:'PASS',note:'UI, map, difficulty, and link multipliers are stubbed.'}));

const r=make();
const info=r.run(`({card:SKILL_BY_ID.skill_alchemion_01,text:moveEffectText(skillToMove('skill_alchemion_01'))})`);
assert.equal(info.card.power,140);
assert.equal(info.card.cost,5);
assert.equal(info.card.effect,'alchemy_recoil');
assert.equal(info.card.exclusiveMonsterId,'alchemion');
assert.equal(info.text,'無属性 / 威力 140 / 攻撃後、実際に与えたダメージの25％を反動として受ける');
console.log('PASS alchemion skill identity, parameters and single recoil description');
