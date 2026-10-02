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
assert.equal(contract.monsterPool.length,138,'monster gacha must contain every consolidated monster skill');
assert.equal(contract.characterPool.length,144,'character gacha must include all 138 character skills and six common additions');
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

const commonCards=contract.characterPool.filter(card=>card.commonCharacterSkill);
assert.equal(commonCards.length,6,'the character guarantee must have exactly six common choices');
assert(commonCards.every(card=>card.cost>=2),'the new guarantee must retain the existing COST 2+ minimum');
assert(contract.monsterPool.every(card=>!card.commonCharacterSkill),'character additions must not enter the monster pool');
const commonIds=commonCards.map(card=>card.id);
const reset=(inventory={},coins=10000)=>{context.save={coins,skillCards:{...inventory}};};

// Normal pulls still use the displayed COST weights and can yield every common card.
for(const card of commonCards){
  const row=contract.characterRates.find(entry=>entry.cost===card.cost);
  const earlierRate=contract.characterRates.filter(entry=>entry.cost<card.cost).reduce((sum,entry)=>sum+entry.rate,0);
  const randomValues=[earlierRate+row.rate/2,(row.cards.findIndex(entry=>entry.id===card.id)+0.5)/row.cards.length];
  context.controlledRandom=()=>randomValues.shift();
  reset();
  const result=vm.runInContext("performSkillGacha('character',1,controlledRandom)",context);
  assert.equal(result.cards[0].id,card.id,'each common card must be obtainable from a single pull');
  assert.equal(context.save.skillCards[card.id],1);
  assert.equal(context.save.coins,9900);
}

// Six 10-pulls complete the set even if every normal slot rolls a COST 1 card.
reset({},5400);
const guaranteedIds=[];
for(let i=0;i<6;i++){
  const result=vm.runInContext("performSkillGacha('character',10,zeroRandom)",context);
  assert.equal(result.ok,true);
  assert.equal(result.cards.length,10);
  assert(result.cards.slice(0,9).every(card=>card.cost===1&&!card.commonCharacterSkill));
  assert(result.cards[9].commonCharacterSkill,'the final slot must always contain an additional common skill');
  guaranteedIds.push(result.cards[9].id);
}
assert.equal(new Set(guaranteedIds).size,6,'unowned common skills must be preferred over duplicates');
assert(commonIds.every(id=>context.save.skillCards[id]===1));
assert.equal(context.save.coins,0);
assert.equal(Object.values(context.save.skillCards).reduce((sum,count)=>sum+count,0),60);

// Include the ninth normal draw when calculating which guaranteed card is unowned.
reset(Object.fromEntries(commonIds.slice(2).map(id=>[id,1])),900);
const firstCommon=commonCards[0];
const firstCommonRow=contract.characterRates.find(entry=>entry.cost===firstCommon.cost);
const firstCommonEarlier=contract.characterRates.filter(entry=>entry.cost<firstCommon.cost).reduce((sum,entry)=>sum+entry.rate,0);
const ninthDrawRandoms=[...Array(16).fill(0),firstCommonEarlier+firstCommonRow.rate/2,(firstCommonRow.cards.findIndex(card=>card.id===firstCommon.id)+0.5)/firstCommonRow.cards.length,0];
context.controlledRandom=()=>ninthDrawRandoms.shift();
const provisionalDraw=vm.runInContext("performSkillGacha('character',10,controlledRandom)",context);
assert.equal(provisionalDraw.cards[8].id,commonIds[0]);
assert.equal(provisionalDraw.cards[9].id,commonIds[1],'the guarantee must account for common skills acquired in the first nine slots');
assert.equal(ninthDrawRandoms.length,0,'character 10-pulls require nine normal rolls and one guarantee roll');

// Once every common skill is owned, select uniformly among the least-owned kinds.
reset(Object.fromEntries(commonIds.map((id,index)=>[id,index<2?2:5])));
const leastOwned=vm.runInContext('skillGachaCommonGuaranteePool(save.skillCards)',context);
assert.deepEqual(Array.from(leastOwned,card=>card.id),Array.from(commonIds.slice(0,2)));
for(const [roll,expected] of [[0,0],[0.499999,0],[0.5,1],[0.999999,1],[-1,0],[1,1],[NaN,0]]){
  context.boundaryRandom=()=>roll;
  assert.equal(vm.runInContext('pickSkillGachaCommonGuarantee(save.skillCards,boundaryRandom).id',context),commonIds[expected],'equal guarantee intervals must handle boundary random values');
}
const ownedTen=vm.runInContext("performSkillGacha('character',10,zeroRandom)",context);
assert.equal(ownedTen.cards[9].id,commonIds[0]);
assert.equal(context.save.skillCards[commonIds[0]],3);
assert.equal(context.save.skillCards[commonIds[1]],2);

// Invalid/insufficient purchases leave the complete inventory and balance intact.
for(const expression of ["performSkillGacha('character',10,zeroRandom)","performSkillGacha('invalid',1,zeroRandom)","performSkillGacha('character',2,zeroRandom)"]){
  reset({[commonIds[0]]:7},99);
  const before=JSON.stringify(context.save);
  assert.equal(vm.runInContext(expression,context).ok,false);
  assert.equal(JSON.stringify(context.save),before);
}

// Monster 10-pulls keep the old rule: already drawing COST 2+ does not replace slot ten.
reset();
let monsterRandomCalls=0;
context.monsterRandom=()=>{monsterRandomCalls++;return 0.999999;};
const monsterHighTen=vm.runInContext("performSkillGacha('monster',10,monsterRandom)",context);
assert(monsterHighTen.cards.every(card=>card.cost===6&&card.sourceEntityKind==='monster'));
assert.equal(monsterRandomCalls,20,'monster draws must not apply the character-only extra guarantee');

// The rate screen distinguishes the normal distribution from the changing guarantee.
const rateElements={skillGachaCoinView:{},skillGachaRateList:{}};
context.document={getElementById:id=>rateElements[id]||null};
vm.runInContext('renderSkillGacha()',context);
assert(rateElements.skillGachaRateList.innerHTML.includes('共通技1枚保証・未所持優先'));
assert(rateElements.skillGachaRateList.innerHTML.includes('1回抽選・10連の1〜9枚目の確率'));
assert(rateElements.skillGachaRateList.innerHTML.includes('所持数が最も少ない種類から均等'));
assert(rateElements.skillGachaRateList.innerHTML.includes('900コイン・COST 2以上1枚保証'),'monster guarantee text must remain unchanged');
delete context.document;

// UI draws are rolled back if persistence fails; do not display an acquisition.
let persistSuccess=false,renderCalls=0,resourceUpdates=0,presentations=0;
const alerts=[];
context.alert=message=>alerts.push(message);
context.saveGame=()=>{context.save.saveMeta.lastSavedAt='attempted';return persistSuccess;};
context.updateAppResourceBar=()=>{resourceUpdates++;};
context.renderStub=()=>{renderCalls++;};
context.presentationStub=()=>{presentations++;};
vm.runInContext('renderSkillGacha=renderStub;presentSkillGachaResult=presentationStub;',context);
reset({[commonIds[0]]:3},900);
context.save.saveMeta={lastSavedAt:'previous',integrityHash:'unchanged'};
const beforeFailedSave=JSON.stringify(context.save);
vm.runInContext("rollSkillGacha('character',10)",context);
assert.equal(JSON.stringify(context.save),beforeFailedSave,'failed persistence must restore inventory, coins and metadata');
assert.equal(presentations,0);
assert.equal(renderCalls,1);
assert.equal(resourceUpdates,1);
assert(alerts.some(message=>message.includes('抽選を取り消しました')));
persistSuccess=true;
vm.runInContext("rollSkillGacha('character',10)",context);
assert.equal(context.save.coins,0);
assert.equal(Object.values(context.save.skillCards).reduce((sum,count)=>sum+count,0),13);
assert.equal(presentations,1,'only persisted results should be presented');

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
assert(!htmlSource.includes('id="skillGachaResult"')&&!skillGachaSource.includes('renderSkillGachaResults'),'persistent skill-card result list must be removed');
assert(htmlSource.includes('id="skillGachaCardDetail"')&&skillGachaSource.includes('openSkillGachaCardDetail'),'tap-only card detail is missing');
assert(cssSource.includes('.skill-gacha-presentation')&&cssSource.includes('.skill-gacha-card-inner'),'presentation styles are missing');

console.log('Skill gacha validation passed (six common cards, 10th-slot unowned/least-owned guarantee, provisional counts, normal rates, unchanged monster draws, persistence rollback, and presentation).');
