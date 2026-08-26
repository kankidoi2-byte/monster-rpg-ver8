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
const plain=value=>JSON.parse(JSON.stringify(value));

assert.deepEqual({...contract.config.rarityMultipliers},{1:3.5,2:2.6,3:1.9,4:1.3,5:1});
assert.equal(contract.config.abilityBands[1],'power');
assert.equal(contract.config.abilityBands[2],'status');
assert.equal(contract.config.abilityBands[3],'tactics');
assert.equal(contract.config.abilityBands[4],null);
assert.equal(contract.config.abilityBands[5],null);

const profiles=contract.monsters.map(monster => contract.buildKokoroLinkProfile(monster,{uid:`test-${monster.id}`,id:monster.id,level:10}));
assert.equal(profiles.length,50);
assert(profiles.every(profile => profile && Number.isFinite(profile.linkRate)));
assert(profiles.filter(profile => profile.rarity <= 3).every(profile => profile.abilityEligible));
assert(profiles.filter(profile => profile.rarity >= 4).every(profile => !profile.abilityEligible));
assert(profiles.filter(profile => profile.rarity === 5).every(profile => profile.multiplier === 1 && profile.abilityBand === null));
assert.equal(contract.buildKokoroLinkProfile(contract.characters[0],{level:1}),null,'characters must not enter monster-only Kokoro Link profiles');

const sameBase=stars => ({id:`same-${stars}`,name:`same-${stars}`,entityKind:'monster',rarity:'★'.repeat(stars),types:['normal'],hp:100,spd:50,moves:[['test',40,'normal']]});
const oneStar=contract.buildKokoroLinkProfile(sameBase(1),{uid:'one',level:1});
const fiveStar=contract.buildKokoroLinkProfile(sameBase(5),{uid:'five',level:1});
assert.equal(oneStar.linkRate,0.35);
assert.equal(fiveStar.linkRate,0.10);
assert.equal(fiveStar.abilityEligible,false,'five-star profiles must never receive a link ability');

const modified=contract.buildKokoroLinkProfile(sameBase(1),{
  uid:'modified',level:5,
  alchemy:{statModifiers:{hp:1.2,speed:1.1,attack:1.15}}
});
assert.equal(modified.linkRate,oneStar.linkRate,'source level and stats must not change rarity-only link strength');

const extremeProfile={linkRate:999};
const capped=contract.convertKokoroLinkEffects(extremeProfile,{maxHp:1000,speed:100});
assert.equal(capped.barrier,350,'barrier must cap at 35% of target maximum HP');
assert.equal(capped.attackBonus,0.35,'attack bonus must cap at 35%');
assert.equal(capped.speedBonus,35,'speed bonus must cap at 35% of target speed');
assert.deepEqual({...capped.capsApplied},{barrier:true,attack:true,speed:true});

const target={maxHp:360,speed:90};
const targetBefore=JSON.stringify(target);
const resolved=contract.resolveKokoroLink(sameBase(1),{uid:'resolved',level:1},target);
assert(resolved?.profile && resolved?.effects);
assert.equal(JSON.stringify(target),targetBefore,'Kokoro Link calculation must not mutate target stats');
assert.deepEqual(plain(resolved.effects),{
  effectRate:0.35,
  barrier:144,
  barrierCap:144,
  attackBonus:0.4,
  attackMultiplier:1.4,
  speedBonus:37,
  speedCap:37,
  capsApplied:{barrier:false,attack:false,speed:false}
});

const alternateOneStar=contract.resolveKokoroLink(
  {id:'alternate',name:'alternate',entityKind:'monster',rarity:'★',types:['fire'],hp:9999,spd:1,moves:[['huge',9999,'fire']]},
  {uid:'alternate',level:99,alchemy:{statModifiers:{hp:5,speed:5,attack:5}}},
  target
);
assert.equal(alternateOneStar.effects.effectRate,resolved.effects.effectRate,'same-rarity sources must share the same base link rate');
assert.equal(alternateOneStar.effects.attackBonus,.5,'one-star primary attributes may add a fixed power ability after rarity scaling');

const malformed=contract.buildKokoroLinkProfile(
  {id:'malformed',name:'malformed',entityKind:'monster',rarity:'★',types:[],hp:Infinity,spd:'bad',moves:[['bad',Infinity,'normal']]},
  {uid:'malformed',level:Infinity,alchemy:{statModifiers:{hp:Infinity,speed:-1,attack:'bad'}}}
);
assert(Number.isFinite(malformed.linkRate),'malformed source values must still produce a finite rarity link rate');
const malformedEffects=contract.convertKokoroLinkEffects({linkRate:Infinity},{maxHp:Infinity,speed:NaN});
assert(Object.values(malformedEffects).filter(value => typeof value === 'number').every(Number.isFinite),'malformed effect inputs must remain finite');

console.log('Kokoro Link engine validation passed (50 monsters, active-monster scaling, rarity-only strength, monster eligibility, five-star restriction, pure calculation, and bounded effects).');
