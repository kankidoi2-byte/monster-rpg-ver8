import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx=vm.createContext({console});
for(const file of ['data','core','monster-status'])vm.runInContext(fs.readFileSync('js/'+file+'.js','utf8'),ctx);
vm.runInContext(`
const scale=monsterStatusScale();
for(const mon of M)for(const level of [1,12,50,100]){
 const ins={id:mon.id,level,alchemy:{statModifiers:{hp:1.05,attack:1.1,speed:1.15}}};
 const values=monsterStatusValues(ins);
 if(values.hp!==instanceMaxHp(ins)||values.speed!==baseBattleSpeed(mon,ins,level)||values.attack!==battleBaseAttack(mon,level)*1.1||values.defense!==battleBaseDefense(mon,level))throw Error('Shared battle values');
 if(battleStatDamageMultiplier(mon,level,mon,level)!==0.8*(battleBaseAttack(mon,level)/battleBaseDefense(mon,level))*battleStatGrowth(level))throw Error('Damage formula changed');
 const clean=monsterStatusValues({id:mon.id,level:MAX_LEVEL});
 for(const key of Object.keys(scale))if(clean[key]>scale[key])throw Error('Scale');
}
`,ctx);
const status=fs.readFileSync('js/monster-status.js','utf8');
assert(!/saveGame\(|commitSaveMutation\(|localStorage|sessionStorage|evo/.test(status));
assert.match(status,/rosterVisibleInstances\(\)/);
assert.match(status,/openSkillEdit\(uid\)/);
assert.match(fs.readFileSync('css/monster-status.css','utf8'),/\.status-scroll>\*\{flex:none\}/);
console.log('Status: shared battle functions for 100 units × 4 levels with alchemy, data-driven scale, no save writes.');
