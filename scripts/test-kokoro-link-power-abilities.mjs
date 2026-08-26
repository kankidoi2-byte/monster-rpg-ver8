import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,Date,JSON,Math});
vm.runInContext(fs.readFileSync(new URL('../js/kokoro-link.js',import.meta.url),'utf8'),context,{filename:'js/kokoro-link.js'});
const api=vm.runInContext(`({
  resetKokoroLinkBattleState,resolveKokoroLink,activateKokoroLinkSource,
  kokoroLinkPowerAbilityStatus,kokoroLinkMovePowerMultiplierFor,kokoroLinkChanceFor,
  consumeKokoroLinkLifeSteal,tickKokoroLinkRegeneration,absorbKokoroLinkDamage
})`,context);
const plain=value=>JSON.parse(JSON.stringify(value));

const monster=(type,rarity='★')=>({id:`${type}-${rarity.length}`,name:type,entityKind:'monster',rarity,types:[type],moves:[['技',40,type]]});
const targetStats={maxHp:200,speed:100};
const resolve=type=>api.resolveKokoroLink(monster(type),{uid:`source-${type}`,level:99},targetStats);

assert.deepEqual(JSON.parse(JSON.stringify(resolve('normal').effects)),{
  effectRate:.35,barrier:80,barrierCap:80,attackBonus:.4,attackMultiplier:1.4,speedBonus:40,speedCap:40,
  capsApplied:{barrier:false,attack:false,speed:false}
});
assert.equal(resolve('fire').effects.attackMultiplier,1.5);
assert.equal(resolve('water').effects.barrier,100);
assert.equal(resolve('thunder').effects.speedBonus,50);
assert.equal(api.resolveKokoroLink(monster('fire','★★'),{uid:'two'},targetStats).powerAbility,null,'Phase 4-1 must only activate one-star abilities');

const activate=type=>{
  api.resetKokoroLinkBattleState();
  const active={uid:`target-${type}`,hp:100,mon:monster('normal','★★★★★'),inst:{uid:`target-${type}`,level:1}};
  const source={uid:`source-${type}`,hp:100,mon:monster(type),inst:{uid:`source-${type}`,level:1}};
  const result=api.activateKokoroLinkSource(source.uid,[active,source],0,targetStats);
  assert.equal(result.ok,true);
  return {instance:active.inst,link:result.link};
};

{
  const {instance}=activate('grass');
  assert.deepEqual(plain(api.tickKokoroLinkRegeneration(instance,100,200)),{healed:10,hp:110,remainingTurns:1});
  assert.deepEqual(plain(api.tickKokoroLinkRegeneration(instance,110,200)),{healed:10,hp:120,remainingTurns:0});
  assert.equal(api.tickKokoroLinkRegeneration(instance,120,200).healed,0);
}
{
  const {instance}=activate('wind');
  const first=api.absorbKokoroLinkDamage(instance,50,()=>0);
  assert.equal(first.evaded,true);assert.equal(first.hpDamage,0);
  assert.equal(api.absorbKokoroLinkDamage(instance,50,()=>0).evaded,false,'evasion charge must be consumed after one incoming attack');
}
{
  const {instance,link}=activate('light');link.barrierRemaining=0;
  const result=api.absorbKokoroLinkDamage(instance,100);
  assert.equal(result.reduced,25);assert.equal(result.hpDamage,75);
}
{
  const {instance}=activate('dark');
  assert.deepEqual(plain(api.consumeKokoroLinkLifeSteal(instance,100,200)),{healing:20,consumed:true});
  assert.equal(api.consumeKokoroLinkLifeSteal(instance,100,200).consumed,false);
}
{
  const {instance}=activate('star');
  assert.deepEqual(plain(api.kokoroLinkChanceFor(instance,.6)),{chance:.75,boosted:true});
  assert.deepEqual(plain(api.kokoroLinkChanceFor(instance,.6)),{chance:.6,boosted:false});
}
{
  const {instance}=activate('dragon');
  assert.deepEqual(plain(api.kokoroLinkMovePowerMultiplierFor(instance,40)),{multiplier:1.15,boosted:true});
  assert.deepEqual(plain(api.kokoroLinkMovePowerMultiplierFor(instance,40)),{multiplier:1,boosted:false});
  assert.match(api.kokoroLinkPowerAbilityStatus(instance),/使用済み/);
}

console.log('Kokoro Link Phase 4-1 power abilities validated (10 attributes, one-star scope, consumption, and duration).');
