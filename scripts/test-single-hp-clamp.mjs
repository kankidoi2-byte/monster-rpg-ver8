import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const base='70ef014f5c750ca0561a734b2a5620c8f8bec30e';
const original=execFileSync('git',['show',base+':js/battle-rules.js'],{encoding:'utf8'});
const source=fs.readFileSync(new URL('../js/battle-rules.js',import.meta.url),'utf8');
assert.equal((source.slice(source.indexOf('async function doAttack')).match(/[pe]Hp = Math\.max\(0, [pe]Hp - (dmg|8|recoilDamage|secondDmg)\);/g)||[]).length,8,'all eight HP subtractions stay clamped');
assert(!/[pe]Hp\s*-=\s*(dmg|8|recoilDamage|secondDmg)/.test(source),'no direct HP subtraction');
const make=patch=>{
 const r=runtime({'battle-rules':patch,save:s=>s+'\nvar clampActualSave=saveGame;'});
 r.context.Date=class extends Date {constructor(...args){super(...(args.length?args:['2026-10-06T00:00:00Z']));}static now(){return 1791244800000;}};
 r.context.Math.random=()=>.1;
 r.run('saveGame=clampActualSave;update=()=>{pHp=Math.max(0,pHp);eHp=Math.max(0,eHp);};');
 vm.runInContext(fs.readFileSync(new URL('./single-hp-clamp-fixture.js',import.meta.url),'utf8'),r.context);
 return r;
};
const before=make(()=>original),after=make(s=>s);
let count=0,detected=0;
const plain=x=>JSON.parse(JSON.stringify(x));
for(const options of plain(after.run('singleHpCases()'))){
 const a=plain(await after.run(`singleHpScenario(${JSON.stringify(options)})`));
 const b=plain(await before.run(`singleHpScenario(${JSON.stringify(options)},false)`));
 assert(a.observations.every(o=>o.pHp>=0&&o.eHp>=0));
 if(b.observations.some(o=>o.pHp<0||o.eHp<0))detected++;
 delete a.observations;delete b.observations;assert.deepEqual(a,b,JSON.stringify(options));count++;
}
assert(detected>=14,'test must detect the original transient bug');
// Real save/parser and outcomes/attribution/rewards exercise the same prior fixture
// on BOTH sources, including overkill fixed recoil and poison.
for(const r of [before,after]){
 vm.runInContext(fs.readFileSync(new URL('../js/contractor-rank.js',import.meta.url),'utf8'),r.context);
 vm.runInContext(fs.readFileSync(new URL('./simultaneous-ko-fixture.js',import.meta.url),'utf8'),r.context);
}
let outcomes=0;
for(const cause of ['player-recoil','enemy-recoil','poison','victory','defeat','continue'])for(const reserve of [false,true])for(const enemiesRemain of [false,true]){
 const opts={mode:'single',cause,reserve,enemiesRemain};
 const a=plain(await after.run(`simultaneousKoScenario(${JSON.stringify(opts)})`));
 const b=plain(await before.run(`simultaneousKoScenario(${JSON.stringify(opts)})`));
 assert.deepEqual(a,b);assert.deepEqual(plain(after.run('save')),plain(before.run('save')));outcomes++;
}
console.log(JSON.stringify({result:'PASS',attackCases:count,originalNegativeCases:detected,outcomeAndSaveComparisons:outcomes,observations:'each assignment, presentation, history, before update',note:'VM production runtime; rendering/motion stubbed'}));
