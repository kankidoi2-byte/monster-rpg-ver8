import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const base='77730b58f4d9dca1dfd39d484cf8a6510aac484a';
const fixture=fs.readFileSync(new URL('./powered-modifier-fixture.js',import.meta.url),'utf8');
const make=old=>{const patches=old?Object.fromEntries(['battle-rules','multi-battle'].map(n=>[n,()=>execFileSync('git',['show',base+':js/'+n+'.js'],{encoding:'utf8'})])):{};const r=runtime(patches);vm.runInContext(fixture,r.context);return r;};
const before=make(true),after=make(false),plain=x=>JSON.parse(JSON.stringify(x));let count=0,reproduced=0;
for(const opts of plain(after.run('poweredModifierCases()'))){
 const a=plain(await after.run(`poweredModifierScenario(${JSON.stringify(opts)})`));
 const b=plain(await before.run(`poweredModifierScenario(${JSON.stringify(opts)})`));
 const multi=opts.mode!=='single',p=opts.direction==='player',dp=opts.direction==='enemy-player';
 const hp=x=>multi?(dp?x.pHp:x.enemyHp[p?0:1]):p?x.eHp:x.pHp;
 const atk=x=>a.move[3]==='buff'?(p?x.pAtk:multi?x.attacks[0]:x.eAtk):(dp?x.pAtk:multi?x.attacks[p?0:1]:x.eAtk);
 if(opts.zero){assert.equal(hp(a),hp(b));assert.equal(atk(a),atk(b));assert.equal(a.log,b.log);}
 else{
  if(!opts.miss&&!opts.barrier){assert(hp(a)<hp(a.before),JSON.stringify(opts));assert.equal(hp(b),hp(b.before));reproduced++;}
  if(opts.miss){assert.equal(atk(a),atk(a.before));assert.equal(hp(a),hp(a.before));}
  else assert(Math.abs(atk(a)-(a.move[3]==='buff'?Math.min(1.6,atk(a.before)+.25):Math.max(.65,atk(a.before)-.2)))<1e-9,'exactly one modifier');
  const control=plain(await after.run(`poweredModifierScenario(${JSON.stringify({...opts,control:true})})`));
  assert.equal(hp(a),hp(control),'same normal damage calculation');assert.deepEqual(a.hits,control.hits,'same damage/guard/shield/barrier feedback');
  assert.deepEqual(a.guards,control.guards);assert.deepEqual(a.shields,control.shields);
  if(!opts.miss)assert.equal((a.log.match(/攻撃力が/g)||[]).length,1);
  if(a.move[3]==='buff'){if(p){assert.equal(a.eAtk,a.before.eAtk);assert.deepEqual(a.attacks,a.before.attacks);}else{assert.equal(a.pAtk,a.before.pAtk);if(multi)assert.equal(a.attacks[1],a.before.attacks[1]);}}
  else {if(p)assert.equal(a.pAtk,a.before.pAtk);else if(multi)assert.equal(a.attacks[0],a.before.attacks[0]);else assert.equal(a.eAtk,a.before.eAtk);}
  if(multi&&opts.kill&&!dp){assert.equal(a.alive[p?0:1],false);assert.equal(a.attribution[p?0:1],p);}
 }
 assert(a.pHp>=0&&a.eHp>=0&&a.enemyHp.every(h=>h>=0));count++;
}
vm.runInContext(fs.readFileSync(new URL('../js/dex.js',import.meta.url),'utf8'),after.context);
for(const [id,power,cost] of [['skill_shenhairon_02',42,3],['skill_nightmare_02',18,2],['skill_noxvelg_02',46,4]]){
 const current=plain(after.run(`SKILL_BY_ID['${id}']`));assert.equal(current.power,power);assert.equal(current.cost,cost);
 assert.match(after.run(`renderUnitSkillList(by(SKILL_BY_ID['${id}'].sourceUnitId))`),/攻撃後/);
 assert.equal(after.run(`skillBattleMotionForMove(skillToMove('${id}')).role`),'damage');
 assert.match(after.run(`moveEffectText(skillToMove('${id}'),{includeBase:false})`),/攻撃後.*基本値.*上限|攻撃後.*基本値.*下限/);
}

after.context.document.addEventListener=()=>{};
vm.runInContext(fs.readFileSync(new URL('../js/battle-ui.js',import.meta.url),'utf8'),after.context);
for(const multi of [false,true]){after.run(`multiBattle={active:${multi}}`);for(const id of ['skill_shenhairon_02','skill_nightmare_02','skill_noxvelg_02'])assert.equal(after.run(`battleUiMoveTarget(skillToMove('${id}'))`),(id==='skill_shenhairon_02'?'自分と':'')+(multi?'選択した敵1体':'敵1体'));assert.equal(after.run("battleUiMoveTarget(['補助',0,'normal','buff'])"),'自分');}
console.log(JSON.stringify({result:'PASS',cases:count,originalZeroDamageReproductions:reproduced,coverage:'single/three-way/invasion; all directions; caps, zero-power, guard/shield, resistance, half-healing, miss, barrier, kill attribution; rendering stubbed'}));
