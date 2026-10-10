import {retiredReservations} from './retired-dex-reservations-baseline.mjs';
import {applyNormalHealingSpec} from './normal-healing-baseline.mjs';
import {applyStatusDataCopy,applyStatusCoreCopy} from './status-description-copy-baseline.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runtime} from '../tools/balance-audit/runtime.mjs';
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
async function scenario({skillId,mode='single',actor='player',targetHp=3,guarded=false,zeroDamage=false}){
 const r=make(),isPlayer=actor==='player';
 r.context.playerAttackInstanceMultiplier=()=>1;
 r.context.consumeKokoroLinkRecoilGuard=()=>guarded;
 r.run(`var player=by('${isPlayer?'alchemion':'slime'}'),enemy=by('${isPlayer?'slime':'alchemion'}');
 var activeInstance={id:player.id,level:1};var activePartyIdx=0;
 var pHp=${isPlayer?1000:targetHp},eHp=${isPlayer?targetHp:1000},pAtk=1,eAtk=1,pGuard=false,eGuard=false,pAquaShield=false,eAquaShield=false,pFlareCharge=false,eFlareCharge=false;
 var partyBattle=[{hp:pHp}];
 var entryA={id:'enemy_a',kind:'enemy',mon:enemy,hp:eHp,maxHp:1000,attack:1,alive:true,guard:false,aquaShield:false,flareCharge:false};
 var entryB={id:'enemy_b',kind:'enemy',mon:by('slime'),hp:${targetHp},maxHp:1000,attack:1,alive:true,guard:false,aquaShield:false,flareCharge:false};
 var multiBattle={enemies:[entryA,entryB]};var testMove=skillToMove('${skillId}');`);
 if(zeroDamage)r.context.resolvePlayerIncomingDamage=()=>({hpDamage:0,absorbed:140,barrierRemaining:0});
 const before=r.run(actor==='player'?'pHp':mode==='single'?'eHp':'entryA.hp');
 if(mode==='single')await r.run(`doAttack(${isPlayer?'player,enemy':'enemy,player'},testMove,${isPlayer})`);
 else await r.run(`performMultiAttack(${isPlayer?"{kind:'player'}":'entryA'},${actor==='enemy-other'?'entryB':isPlayer?'entryA':"{kind:'player'}"},testMove)`);
 const after=r.run(actor==='player'?'pHp':mode==='single'?'eHp':'entryA.hp');
 return {mode,actor,targetHp,guarded,zeroDamage,recoil:before-after};
}
const base='d0d67c85fcdb3ccc426c8774736d330302bd62e4';
const original=file=>execFileSync('git',['show',base+':js/'+file+'.js'],{encoding:'utf8'});
const r=runtime();vm.runInContext(fs.readFileSync(new URL('js/dex.js',root),'utf8'),r.context);
const old=runtime({data:()=>applyStatusDataCopy(original('data')),core:()=>applyStatusCoreCopy(original('core'))});
const cards=JSON.parse(JSON.stringify(r.run('MOVE_CARDS.filter(s=>s.effect==="recoil")')));
assert.deepEqual(cards.map(s=>s.id).sort(),['skill_freigal_03','skill_freiwolf_02','skill_doom_nemesion_03','skill_ignaros_03','skill_kimeragna_apex_03'].sort());
const text='攻撃後、自分も8ダメージを受ける';
for(const sk of cards){
 const arg=JSON.stringify(sk.id);
 const effect=r.run(`moveEffectText(skillToMove(${arg}),{includeBase:false})`);
 assert.equal(effect.split(text).length-1,1);
 assert(!effect.includes('威力')&&!effect.includes('属性 /')&&!effect.includes('代わりに反動'));
 const full=r.run(`moveEffectText(skillToMove(${arg}))`);assert(full.includes(text));
 const html=r.run(`renderUnitSkillList({...by(${JSON.stringify(sk.sourceUnitId)}),moves:by(${JSON.stringify(sk.sourceUnitId)}).legacyMoves})`);
 assert(html.includes(text));
 r.run(`save=initSave();save.instances=[];save.party=[];var ins=addInstance(${JSON.stringify(sk.sourceUnitId)},1);save.party=[ins.uid];save.skillCards=Object.fromEntries(MOVE_CARDS.map(s=>[s.id,10]));editingSkillUid=ins.uid;renderSkillEdit();`);
 assert(!r.context.document.getElementById('skillCardList').innerHTML.includes(`equipSkill('${sk.id}')`),'retired recoil cards excluded from equipment');
 for(const actor of ['player','enemy','enemy-other'])for(const mode of actor==='enemy-other'?['multi']:['single','multi']){
  const result=await scenario({skillId:sk.id,mode,actor,targetHp:1000});assert.equal(result.recoil,8,JSON.stringify(result));
 }
 console.log('PASS fixed recoil: '+sk.id+' '+sk.name+' / '+effect);
}
assert.equal(r.run(`moveEffectText(skillToMove('skill_kimeragna_apex_03'),{includeBase:false})`),text+'。極限の嵐を解放する。');
for(const sk of r.run('MOVE_CARDS.filter(s=>!s.id.startsWith("s110_")&&s.effect!=="recoil"&&!["skill_shenhairon_02","skill_nightmare_02","skill_noxvelg_02"].includes(s.id))')){
 const arg=JSON.stringify(sk.id);assert.equal(r.run(`moveEffectText(skillToMove(${arg}))`),old.run(`moveEffectText(skillToMove(${arg}))`));
}
assert.equal(r.run(`moveEffectText(skillToMove('skill_alchemion_01'),{includeBase:false})`),'攻撃後、実際に与えたダメージの25％を反動として受ける');
for(const sk of r.run('MOVE_CARDS.filter(s=>s.effect==="tactical" && s.tactical?.recoil)'))assert((sk.detailedDesc||r.run(`moveEffectText(skillToMove(${JSON.stringify(sk.id)}))`)).includes('最大HP'));
// Exact source equality from a narrow historical copy patch is superseded by the approved110 migration.
assert.equal(r.run('EQUIPPABLE_MOVE_CARDS.length'),110);
assert(r.run('SKILL110_CATALOG.filter(sk=>sk.tactical.recoil).every(sk=>sk.tactical.recoil>0&&sk.tactical.recoil<=.15)'));
console.log('PASS preserved legacy fixed recoil: five skills and25 battle scenarios; new maxHP recoil verified by skill110 combat suite.');
