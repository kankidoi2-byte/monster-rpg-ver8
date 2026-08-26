import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,Date,JSON,Math});
vm.runInContext(fs.readFileSync(new URL('../js/data.js',import.meta.url),'utf8'),context,{filename:'js/data.js'});
vm.runInContext(fs.readFileSync(new URL('../js/kokoro-link.js',import.meta.url),'utf8'),context,{filename:'js/kokoro-link.js'});

const contract=vm.runInContext(`({
  monsters:M.filter(unit => unit.entityKind === 'monster'),
  rules:KOKORO_LINK_ABILITY_RULES,
  buildKokoroLinkProfile,
  buildKokoroLinkAbilityPlan
})`,context);
const plain=value=>JSON.parse(JSON.stringify(value));

assert.equal(contract.rules.timing,'link-activation');
assert.equal(contract.rules.resolutionCount,1);
assert.equal(contract.rules.enemyEffectBaseChance,.70);
assert.equal(contract.rules.bossResistanceMultiplier,.50);
assert.equal(contract.rules.enemyEffectBaseChance * contract.rules.bossResistanceMultiplier,.35);
assert.equal(contract.rules.caps.actionControlTurns,1);
assert.equal(contract.rules.caps.durationTurns,2);
assert.equal(contract.rules.caps.costReduction,1);
assert.equal(contract.rules.caps.minimumBattleCost,1);

const attributeIds=['normal','fire','water','grass','thunder','wind','light','dark','star','dragon'];
assert.deepEqual(Object.keys(contract.rules.attributes).sort(),attributeIds.sort());
for(const type of attributeIds){
  const matrix=contract.rules.attributes[type];
  assert.equal(typeof matrix.power,'string',`${type} must define a one-star power ability`);
  assert.equal(typeof matrix.status,'string',`${type} must define a two-star status ability`);
  assert.equal(typeof matrix.tactics,'string',`${type} must define a three-star tactics ability`);
  assert(contract.rules.abilities[matrix.power],`${type} power ability must resolve`);
  assert(contract.rules.abilities[matrix.status],`${type} status ability must resolve`);
  assert(contract.rules.abilities[matrix.tactics],`${type} tactics ability must resolve`);
}

const plans=contract.monsters.map(monster => {
  const profile=contract.buildKokoroLinkProfile(monster,{uid:`phase4-${monster.id}`,level:99});
  return {monster,profile,plan:contract.buildKokoroLinkAbilityPlan(profile)};
});
assert(plans.filter(({profile})=>profile.rarity <= 3).every(({plan})=>plan));
assert(plans.filter(({profile})=>profile.rarity >= 4).every(({plan})=>plan === null));
assert(plans.filter(({profile})=>profile.rarity === 1).every(({plan})=>plan.band === 'power'));
assert(plans.filter(({profile})=>profile.rarity === 2).every(({plan})=>plan.band === 'status'));
assert(plans.filter(({profile})=>profile.rarity === 3).every(({plan})=>plan.band === 'tactics'));

const dualType={id:'dual',name:'dual',entityKind:'monster',rarity:'★★',types:['water','dragon']};
const dualPlan=contract.buildKokoroLinkAbilityPlan(contract.buildKokoroLinkProfile(dualType,{uid:'dual',level:1}));
assert.deepEqual(plain({...dualPlan,ability:undefined}),{
  rulesVersion:'phase4-0',band:'status',bandLabel:'属性・状態異常',primaryType:'water',abilityId:'slow',
  timing:'link-activation',resolutionCount:1,successRule:'enemy-resisted',deferredReason:null
});

const costPlan=contract.buildKokoroLinkAbilityPlan(contract.buildKokoroLinkProfile(
  {id:'water-three',name:'water-three',entityKind:'monster',rarity:'★★★',types:['water']},
  {uid:'water-three',level:1}
));
assert.equal(costPlan.abilityId,'cost_reduction');
assert.equal(costPlan.deferredReason,'battle-cost-resource-required');

const malformedPlan=contract.buildKokoroLinkAbilityPlan({rarity:2,primaryType:'unknown',abilityEligible:true});
assert.equal(malformedPlan.primaryType,'normal','unknown attributes must safely use the universal normal matrix');
assert.equal(malformedPlan.abilityId,'origin_weaken');
assert.equal(contract.buildKokoroLinkAbilityPlan(null),null);
assert.equal(contract.buildKokoroLinkAbilityPlan({rarity:5,primaryType:'normal',abilityEligible:false}),null);

console.log('Kokoro Link Phase 4-0 ability rules passed (10 attributes, rarity bands, primary-type routing, boss resistance, caps, deferral, and ★4/★5 exclusion).');
