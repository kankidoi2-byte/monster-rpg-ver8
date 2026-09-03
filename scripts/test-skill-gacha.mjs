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
assert.equal(contract.characterPool.length,30,'character gacha must contain every consolidated character skill');
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

const presentation=vm.runInContext(`({
  basic:skillGachaRarityTier(2),rare:skillGachaRarityTier(3),legendary:skillGachaRarityTier(5),mythic:skillGachaRarityTier(6),
  prophecy:skillGachaProphecy(6),
  snapshots:skillGachaInventorySnapshots([{id:'skill-a',cost:3},{id:'skill-a',cost:3},{id:'skill-b',cost:6}],{'skill-a':0})
})`,context);
assert.equal(presentation.basic,'basic');
assert.equal(presentation.rare,'rare');
assert.equal(presentation.legendary,'legendary');
assert.equal(presentation.mythic,'mythic');
assert.equal(presentation.prophecy.tier,'mythic');
assert.deepEqual(JSON.parse(JSON.stringify(presentation.snapshots.map(entry=>({before:entry.before,after:entry.after,isNew:entry.isNew})))),[
  {before:0,after:1,isNew:true},
  {before:1,after:2,isNew:false},
  {before:0,after:1,isNew:true}
]);

const skillGachaSource=read('js/skill-gacha.js');
const htmlSource=read('index.html');
const cssSource=read('css/ui-redesign.css');
assert(skillGachaSource.includes("matchMedia('(prefers-reduced-motion: reduce)')"),'presentation must respect reduced-motion preference');
assert(skillGachaSource.includes('skipSkillGachaPresentation')&&skillGachaSource.includes('repeatSkillGachaPresentation')&&skillGachaSource.includes('openSkillInventoryFromGacha'),'presentation actions are incomplete');
assert(htmlSource.includes('id="skillGachaPresentation"')&&htmlSource.includes('data-skill-gacha-speed="quick"'),'presentation overlay or speed control is missing');
assert(cssSource.includes('.skill-gacha-presentation')&&cssSource.includes('.skill-gacha-card-inner'),'presentation styles are missing');

console.log('Skill gacha validation passed (existing draw rules, inventory safety, rarity presentation, NEW/owned tracking, reduced motion, and result actions).');
