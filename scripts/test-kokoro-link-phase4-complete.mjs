import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,Date,JSON,Math});
vm.runInContext(fs.readFileSync(new URL('../js/kokoro-link.js',import.meta.url),'utf8'),context,{filename:'js/kokoro-link.js'});
const api=vm.runInContext(`({resolveKokoroLink})`,context);

const types=['normal','fire','water','grass','thunder','wind','light','dark','star','dragon'];
const expected={
  1:{band:'power',ids:['balanced_boost','attack_boost','barrier_boost','regeneration','speed_boost','evasion','first_hit_guard','life_steal','fate_boost','move_power_boost'],rate:.35},
  2:{band:'status',ids:['origin_weaken','burn','slow','poison','paralysis','action_delay','dazzle','confusion','sleep','attack_down'],rate:.26},
  3:{band:'tactics',ids:['origin_choice','recoil_guard','water_mirror_guard','instant_heal','action_priority','free_switch','cleanse','dispel','foresight','penetration'],rate:.19},
  4:{band:null,ids:[],rate:.13},
  5:{band:null,ids:[],rate:.10}
};
const target={maxHp:200,speed:100};
let checked=0;

for(const rarity of [1,2,3,4,5]){
  for(const [index,type] of types.entries()){
    const monster={id:`matrix-${rarity}-${type}`,name:type,entityKind:'monster',rarity:'★'.repeat(rarity),types:[type],moves:[['技',40,type]]};
    const lowLevel=api.resolveKokoroLink(monster,{uid:`low-${rarity}-${type}`,level:1},target);
    const highLevel=api.resolveKokoroLink(monster,{uid:`high-${rarity}-${type}`,level:99},target);
    assert.equal(lowLevel.profile.linkRate,expected[rarity].rate,`★${rarity} ${type}: rarity rate`);
    assert.equal(highLevel.profile.linkRate,lowLevel.profile.linkRate,`★${rarity} ${type}: level independence`);
    assert.equal(lowLevel.effects.effectRate,expected[rarity].rate,`★${rarity} ${type}: applied effect rate`);
    assert.equal(lowLevel.abilityPlan?.band||null,expected[rarity].band,`★${rarity} ${type}: ability band`);
    assert.equal(lowLevel.abilityPlan?.abilityId||null,expected[rarity].ids[index]||null,`★${rarity} ${type}: ability routing`);
    assert.equal([lowLevel.powerAbility,lowLevel.statusAbility,lowLevel.tacticsAbility].filter(Boolean).length,rarity<=3?1:0,`★${rarity} ${type}: one ability at most`);
    checked++;
  }
}

console.log(`Kokoro Link Phase 4 complete matrix passed (${checked} rarity/type combinations, level independence, exact bands, and ★4/★5 exclusion).`);
