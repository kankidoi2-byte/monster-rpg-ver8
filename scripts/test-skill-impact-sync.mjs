import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {runtime,seeded} from '../tools/balance-audit/runtime.mjs';
const base='282f774d00e240c599f8542843d7f27a65a49cec';
const old=Object.fromEntries(['core','battle-view','battle-rules','multi-battle'].map(f=>[f,()=>execFileSync('git',['show',`${base}:js/${f}.js`],{encoding:'utf8'})]));
const before=runtime(old),after=runtime();
const setup=`save=initSave();save.instances=[];save.party=[];const ins=addInstance('freigal',10);save.party=[ins.uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);beginChosenBattle('grassland','slime','normal',activeHuntRequest);pHp=70;eHp=60;`;
const multiSetup=setup+`activeHuntRequest.battleMode='three_way';activeHuntRequest.secondEnemyId='goblin';beginThreeWayBattle();multiBattle.enemies.forEach(e=>{e.hp=60;e.guard=true;e.aquaShield=true;});`;
const moves=after.run('MOVE_CARDS.map(s=>skillToMove(s.id))');
moves.push(['通常攻撃',24,'normal'],['弱体化',0,'dark','debuff'],['追加攻撃確定',24,'thunder','repeat_attack',1]);
let cases=0;
for(const direction of ['single-player','single-enemy','player-enemy','enemy-player','enemy-enemy'])for(const move of moves){
 const states=[],draws=[];
 for(const r of [before,after]){
  r.context.Math.random=()=>.99;
  r.run(`(()=>{${direction.startsWith('single')?setup:multiSetup}})()`);
  const rng=seeded(192);let count=0;r.context.Math.random=()=>{count++;return rng();};
  if(direction.startsWith('single'))await r.run(`doAttack(${direction==='single-player'?'player,enemy':'enemy,player'},${JSON.stringify(move)},${direction==='single-player'})`);
  else await r.run(`performMultiAttack(${direction==='player-enemy'?"{kind:'player'}":'multiBattle.enemies[0]'},${direction==='enemy-player'?"{kind:'player'}":'multiBattle.enemies[1]'},${JSON.stringify(move)})`);
  states.push(r.run('JSON.stringify([pHp,eHp,pAtk,eAtk,pGuard,eGuard,pStatus,eStatus,pPoisonTurns,ePoisonTurns,pParalysisTurns,eParalysisTurns,pConfusionTurns,eConfusionTurns,pSleepTurns,eSleepTurns,pAquaShield,eAquaShield,pFlareCharge,eFlareCharge,multiBattle?.enemies,save.coins,battleTurnCount])'));draws.push(count);
 }
 assert.equal(states[0],states[1],`${direction}/${move[0]} outcomes`);assert.equal(draws[0],draws[1],`${direction}/${move[0]} RNG`);cases++;
}
console.log(`PASS ${cases} real-handler outcomes and RNG counts match main (${moves.length} moves × 5 directions)`);
// Real renderer, deterministic clock: ensure contact precedes cleanup and cleanup owns its nodes.
let now=0,id=0;const timers=new Map(),nodes=new Map();
function node(name,left=0,top=0){return {name,removed:false,children:[],style:{setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}},classList:{v:new Set(),add(...v){v.forEach(x=>this.v.add(x));},remove(...v){v.forEach(x=>this.v.delete(x));},contains(v){return this.v.has(v);}},setAttribute(){},getBoundingClientRect:()=>({left,top,width:120,height:120}),appendChild(n){this.children.push(n);},remove(){this.removed=true;},querySelector(){return null;}};}
const stage=node('stage');nodes.set('pVis',node('pVis',30,210));nodes.set('eVis',node('eVis',210,30));nodes.set('enemy2Vis',node('enemy2Vis',10,30));
const c=vm.createContext({console,Math,matchMedia:()=>({matches:false}),document:{getElementById:n=>nodes.get(n),querySelector:()=>stage,createElement:()=>node('effect')},setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},clearTimeout:i=>timers.delete(i)});
for(const f of ['data','core','battle-view'])vm.runInContext(fs.readFileSync(`js/${f}.js`,'utf8'),c);
async function tick(ms){const end=now+ms;while(true){const entry=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;now=entry[1].at;timers.delete(entry[0]);entry[1].fn();for(let i=0;i<6;i++)await Promise.resolve();}now=end;for(let i=0;i<6;i++)await Promise.resolve();}
for(const mv of moves){c.mv=mv;const motion=vm.runInContext('skillBattleMotionForMove(mv)',c);const timing=vm.runInContext('battleMotionTiming(skillBattleMotionForMove(mv))',c);let contact=false;const self=['heal','guard','buff','aqua_shield'].includes(mv[3]);
 const p=vm.runInContext(`playBattleSkillMotion('pVis','${self?'pVis':'eVis'}',mv,{untilImpact:true})`,c).then(()=>contact=true);
 const effect=stage.children.at(-1);await tick(timing.contact-1);assert(!contact,`${mv[0]} must not resolve before contact`);assert(!effect.removed);
 await tick(1);assert(contact,`${mv[0]} must resolve at contact`);assert(!effect.removed,`${mv[0]} effect still exists at result`);
 await tick(timing.duration-timing.contact);await p;assert(effect.removed);assert.equal(vm.runInContext('battleMotionTails.size',c),0);
}
const count=stage.children.length;c.matchMedia=()=>({matches:true});assert.equal(await vm.runInContext("playBattleSkillMotion('pVis','eVis',['通常攻撃',24,'normal'],{untilImpact:true})",c),false);assert.equal(stage.children.length,count);
c.matchMedia=()=>({matches:false});const pending=vm.runInContext("playBattleSkillMotion('enemy2Vis','eVis',skillToMove('skill_freigal_03'),{untilImpact:true})",c);await tick(300);await pending;assert(Number.parseFloat(stage.children.at(-1).style.left)>200,'enemy-to-enemy target coordinates');
vm.runInContext("playBattleImpact('eVis',24);clearBattleVisuals()",c);assert(stage.children.every(n=>n.removed));assert.equal(vm.runInContext('battleVisuals.size',c),0);await tick(1000);assert(!nodes.get('eVis').classList.contains('battle-hit-impact'));assert.equal(timers.size,0);
console.log(`PASS ${moves.length} contact/cleanup timelines, reduced motion, enemy-to-enemy coordinates, cancellation`);
// Handler event order: two hits must have independent cast/contact/result phases.
const events=[];after.context.record=(...e)=>events.push(e);
after.run(`playBattleSkillMotion=async(s,t,m,o)=>{record('contact',s,t,m[3],o?.untilImpact);return true;};finishBattleSkillMotion=async animated=>{record('finish');return {animated};};battleHpResult=(target,before,after,options)=>record('hp',target,before,after,options.impact);`);
for(const dir of ['single','multi']){
 after.run(`(()=>{${dir==='single'?setup:multiSetup}})()`);after.context.Math.random=()=>0;events.length=0;
 await after.run(dir==='single'?`doAttack(player,enemy,['chain',10,'thunder','repeat_attack',1],true)`:`performMultiAttack({kind:'player'},multiBattle.enemies[1],['chain',10,'thunder','repeat_attack',1])`);
 assert.deepEqual(events.map(e=>e[0]),['contact','hp','finish','contact','hp','finish']);assert(events.filter(e=>e[0]==='hp').every(e=>e[4]===true));
 after.run(`(()=>{${dir==='single'?setup:multiSetup}})()`);events.length=0;
 await after.run(dir==='single'?`doAttack(player,enemy,['weak',0,'dark','debuff'],true)`:`performMultiAttack(multiBattle.enemies[0],multiBattle.enemies[1],['weak',0,'dark','debuff'])`);
 assert.notEqual(events[0][1],events[0][2],'debuff must target defender');
}
console.log('PASS repeat-hit ordering and debuff targets in both handlers');
