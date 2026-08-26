import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console,Date,JSON,Math});
vm.runInContext(fs.readFileSync(new URL('../js/kokoro-link.js',import.meta.url),'utf8'),context,{filename:'js/kokoro-link.js'});
const api=vm.runInContext(`({
  resetKokoroLinkBattleState,resolveKokoroLink,attemptKokoroLinkStatusAbility,
  applyKokoroLinkEnemyEffectComponents,kokoroLinkEnemyAttackMultiplierFor,
  kokoroLinkEnemySpeedMultiplierFor,kokoroLinkEnemyAccuracyFor,
  consumeKokoroLinkEnemyActionDelay,tickKokoroLinkEnemyEffects,kokoroLinkEnemyStatusText,
  kokoroLinkBattleSnapshot
})`,context);
const plain=value=>JSON.parse(JSON.stringify(value));
const monster=type=>({id:type,name:type,entityKind:'monster',rarity:'★★',types:[type],moves:[['技',40,type]]});
const types=['normal','fire','water','grass','thunder','wind','light','dark','star','dragon'];
const link=type=>api.resolveKokoroLink(monster(type),{uid:`source-${type}`,level:99},{maxHp:200,speed:100});

for(const type of types){const resolved=link(type);assert(resolved.statusAbility,`${type} must have a two-star status ability`);assert.equal(resolved.powerAbility,null);}

{
  const resolved=link('fire');
  const normal=api.attemptKokoroLinkStatusAbility(resolved,{targetKey:'single'},()=>.69);
  assert.equal(normal.succeeded,true);assert.equal(normal.successRate,.7);
  assert.deepEqual(plain(api.attemptKokoroLinkStatusAbility(resolved,{targetKey:'single'},()=>0)),{resolved:false,reason:'unavailable'},'status ability must resolve only once');
}
{
  assert.equal(api.attemptKokoroLinkStatusAbility(link('water'),{targetKey:'boss',bossClass:'ボス級'},()=>.34).succeeded,true);
  const failed=api.attemptKokoroLinkStatusAbility(link('water'),{targetKey:'boss',bossClass:'ボス級'},()=>.35);
  assert.equal(failed.succeeded,false);assert.equal(failed.successRate,.35);
  const immune=api.attemptKokoroLinkStatusAbility(link('water'),{targetKey:'immune',immune:true},()=>0);
  assert.equal(immune.succeeded,false);assert.equal(immune.successRate,0);assert.equal(immune.immune,true);
}

api.resetKokoroLinkBattleState();
for(const type of ['normal','water','light','wind','dragon']){
  const result=api.attemptKokoroLinkStatusAbility(link(type),{targetKey:'enemy-a'},()=>0);
  api.applyKokoroLinkEnemyEffectComponents('enemy-a',result.components);
}
assert.equal(api.kokoroLinkEnemyAttackMultiplierFor('enemy-a'),.8,'stronger dragon attack reduction must replace the normal reduction');
assert.equal(api.kokoroLinkEnemySpeedMultiplierFor('enemy-a'),.8,'stronger slow must replace the normal speed reduction');
assert.equal(api.kokoroLinkEnemyAccuracyFor('enemy-a'),.8);
assert.equal(api.consumeKokoroLinkEnemyActionDelay('enemy-a'),true);
assert.equal(api.consumeKokoroLinkEnemyActionDelay('enemy-a'),false);
assert.match(api.kokoroLinkEnemyStatusText('enemy-a'),/竜圧/);

api.resetKokoroLinkBattleState();
for(const type of ['fire','grass']){
  const result=api.attemptKokoroLinkStatusAbility(link(type),{targetKey:'enemy-dot'},()=>0);
  api.applyKokoroLinkEnemyEffectComponents('enemy-dot',result.components);
}
assert.deepEqual(plain(api.tickKokoroLinkEnemyEffects('enemy-dot',200,200)),{damage:20,hp:180,expiredLabels:[]});
const secondTick=api.tickKokoroLinkEnemyEffects('enemy-dot',180,200);
assert.equal(secondTick.damage,20);assert.equal(secondTick.hp,160);assert.deepEqual([...secondTick.expiredLabels].sort(),['毒','火傷'].sort());
assert.equal(api.tickKokoroLinkEnemyEffects('enemy-dot',160,200).damage,0);
assert.deepEqual(plain(api.kokoroLinkBattleSnapshot().enemyEffects),[],'expired effects must leave no battle-state residue');

for(const [type,status] of [['thunder','paralysis'],['dark','confusion'],['star','sleep']]){
  const result=api.attemptKokoroLinkStatusAbility(link(type),{targetKey:type},()=>0);assert.equal(result.controlStatus,status);assert.equal(result.durationTurns,1);
}

console.log('Kokoro Link Phase 4-2 status abilities validated (10 attributes, target binding, 70/35% rates, immunity, stacking, duration, and consumption).');
