import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=relativePath=>fs.readFileSync(new URL(`../${relativePath}`,import.meta.url),'utf8');
const context=vm.createContext({console,Math});
vm.runInContext(read('js/data.js'),context,{filename:'js/data.js'});
vm.runInContext(read('js/core.js'),context,{filename:'js/core.js'});
context.save={coins:1000,skillCards:{}};
vm.runInContext(read('js/skill-gacha.js'),context,{filename:'js/skill-gacha.js'});

const contract=vm.runInContext(`({
  monsterPool:skillGachaPool('monster'),characterPool:skillGachaPool('character'),
  monsterRates:skillGachaRates('monster'),characterRates:skillGachaRates('character')
})`,context);
assert.equal(contract.monsterPool.length,136,'monster gacha must contain every consolidated monster skill');
assert.equal(contract.characterPool.length,22,'character gacha must contain every consolidated character skill');
assert(contract.monsterPool.every(card=>card.sourceEntityKind==='monster'&&!card.deprecated));
assert(contract.characterPool.every(card=>card.sourceEntityKind==='character'&&!card.deprecated));
assert(Math.abs(contract.monsterRates.reduce((sum,row)=>sum+row.rate,0)-1)<1e-9);
assert(Math.abs(contract.characterRates.reduce((sum,row)=>sum+row.rate,0)-1)<1e-9);
assert.equal(contract.monsterRates.find(row=>row.cost===1).rate,0.5,'COST 1 monster cards must have a 50% rarity rate');
assert.equal(contract.monsterRates.find(row=>row.cost===6).rate,0.005,'COST 6 monster cards must have a 0.5% rarity rate');

context.zeroRandom=()=>0;
const tenDraw=vm.runInContext("performSkillGacha('monster',10,zeroRandom)",context);
assert.equal(tenDraw.ok,true);
assert.equal(tenDraw.cards.length,10);
assert(tenDraw.cards.some(card=>card.cost>=2),'ten draws must guarantee at least one COST 2+ card');
assert.equal(context.save.coins,100,'ten draws must cost 900 coins');
assert.equal(Object.values(context.save.skillCards).reduce((sum,count)=>sum+count,0),10,'all drawn cards must enter the inventory');

const insufficient=vm.runInContext("performSkillGacha('character',10,zeroRandom)",context);
assert.equal(insufficient.ok,false);
assert.equal(context.save.coins,100,'failed draws must not consume coins');
const single=vm.runInContext("performSkillGacha('character',1,zeroRandom)",context);
assert.equal(single.ok,true);
assert.equal(single.cards[0].sourceEntityKind,'character');
assert.equal(context.save.coins,0,'a single draw must cost 100 coins');

console.log('Skill gacha validation passed (separate pools, COST 1-6 rarity weights, ten-draw guarantee, finite inventory, and coin safety).');
