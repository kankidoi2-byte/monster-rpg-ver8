import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,Date,JSON,Math});
vm.runInContext(fs.readFileSync(new URL('../js/data.js',import.meta.url),'utf8'),context,{filename:'js/data.js'});
vm.runInContext(fs.readFileSync(new URL('../js/kokoro-link.js',import.meta.url),'utf8'),context,{filename:'js/kokoro-link.js'});

const contract=vm.runInContext(`({
  monsters:M.filter(unit => unit.entityKind === 'monster'),
  characters:M.filter(unit => unit.entityKind === 'character'),
  config:KOKORO_LINK_CONFIG,
  buildKokoroLinkProfile,
  convertKokoroLinkEffects,
  resolveKokoroLink
})`,context);

assert.deepEqual({...contract.config.rarityMultipliers},{1:3.5,2:2.6,3:1.9,4:1.3,5:1});
assert.equal(contract.config.abilityBands[1],'power');
assert.equal(contract.config.abilityBands[2],'status');
assert.equal(contract.config.abilityBands[3],'tactics');
assert.equal(contract.config.abilityBands[4],null);
assert.equal(contract.config.abilityBands[5],null);

const profiles=contract.monsters.map(monster => contract.buildKokoroLinkProfile(monster,{uid:`test-${monster.id}`,id:monster.id,level:10}));
assert.equal(profiles.length,50);
assert(profiles.every(profile => profile && Object.values(profile.indices).every(Number.isFinite)));
assert(profiles.filter(profile => profile.rarity <= 3).every(profile => profile.abilityEligible));
assert(profiles.filter(profile => profile.rarity >= 4).every(profile => !profile.abilityEligible));
assert(profiles.filter(profile => profile.rarity === 5).every(profile => profile.multiplier === 1 && profile.abilityBand === null));
assert.equal(contract.buildKokoroLinkProfile(contract.characters[0],{level:1}),null,'characters must not enter monster-only Kokoro Link profiles');

const sameBase=stars => ({id:`same-${stars}`,name:`same-${stars}`,entityKind:'monster',rarity:'★'.repeat(stars),types:['normal'],hp:100,spd:50,moves:[['test',40,'normal']]});
const oneStar=contract.buildKokoroLinkProfile(sameBase(1),{uid:'one',level:1});
const fiveStar=contract.buildKokoroLinkProfile(sameBase(5),{uid:'five',level:1});
assert.equal(oneStar.indices.hp,fiveStar.indices.hp*3.5);
assert.equal(oneStar.indices.speed,fiveStar.indices.speed*3.5);
assert.equal(oneStar.indices.offense,fiveStar.indices.offense*3.5);
assert.equal(fiveStar.abilityEligible,false,'five-star profiles must never receive a link ability');

const modified=contract.buildKokoroLinkProfile(sameBase(1),{
  uid:'modified',level:5,
  alchemy:{statModifiers:{hp:1.2,speed:1.1,attack:1.15}}
});
assert(modified.sourceStats.hp > oneStar.sourceStats.hp);
assert(modified.sourceStats.speed > oneStar.sourceStats.speed);
assert(modified.sourceStats.offense > oneStar.sourceStats.offense);

const extremeProfile={indices:{hp:999999,speed:999999,offense:999999}};
const capped=contract.convertKokoroLinkEffects(extremeProfile,{maxHp:1000,speed:100});
assert.equal(capped.barrier,400,'barrier must cap at 40% of target maximum HP');
assert.equal(capped.attackBonus,0.30,'attack bonus must cap at 30%');
assert.equal(capped.speedBonus,30,'speed bonus must cap at 30% of target speed');
assert.deepEqual({...capped.capsApplied},{barrier:true,attack:true,speed:true});

const target={maxHp:360,speed:90};
const targetBefore=JSON.stringify(target);
const resolved=contract.resolveKokoroLink(sameBase(1),{uid:'resolved',level:1},target);
assert(resolved?.profile && resolved?.effects);
assert.equal(JSON.stringify(target),targetBefore,'Kokoro Link calculation must not mutate target stats');
assert(resolved.effects.attackMultiplier >= 1.08 && resolved.effects.attackMultiplier <= 1.30);
assert(resolved.effects.barrier <= Math.round(target.maxHp*0.40));
assert(resolved.effects.speedBonus <= Math.round(target.speed*0.30));

const malformed=contract.buildKokoroLinkProfile(
  {id:'malformed',name:'malformed',entityKind:'monster',rarity:'★',types:[],hp:Infinity,spd:'bad',moves:[['bad',Infinity,'normal']]},
  {uid:'malformed',level:Infinity,alchemy:{statModifiers:{hp:Infinity,speed:-1,attack:'bad'}}}
);
assert(Object.values(malformed.sourceStats).every(Number.isFinite),'malformed source values must be repaired to finite values');
assert(Object.values(malformed.indices).every(Number.isFinite),'malformed indices must remain finite');
const malformedEffects=contract.convertKokoroLinkEffects({indices:{hp:Infinity,speed:NaN,offense:'bad'}},{maxHp:Infinity,speed:NaN});
assert(Object.values(malformedEffects).filter(value => typeof value === 'number').every(Number.isFinite),'malformed effect inputs must remain finite');

console.log('Kokoro Link engine validation passed (50 monsters, rarity multipliers, monster eligibility, alchemy modifiers, five-star restriction, pure calculation, and bounded effects).');
