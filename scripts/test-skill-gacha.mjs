import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=relativePath=>fs.readFileSync(new URL(`../${relativePath}`,import.meta.url),'utf8');
const context=vm.createContext({console,Math});
vm.runInContext(read('js/data.js'),context,{filename:'js/data.js'});
vm.runInContext(read('js/core.js'),context,{filename:'js/core.js'});
context.save={coins:1000,skillCards:{}};
vm.runInContext(read('js/skill-gacha.js'),context,{filename:'js/skill-gacha.js'});

const contract=vm.runInContext(`({monsterPool:skillGachaPool('monster'),characterPool:skillGachaPool('character'),monsterRates:skillGachaRates('monster'),characterRates:skillGachaRates('character')})`,context);
assert.equal(contract.monsterPool.length,106);assert.equal(contract.characterPool.length,106);
assert.deepEqual(Array.from(contract.monsterPool,s=>s.id),Array.from(contract.characterPool,s=>s.id));
assert(contract.monsterPool.every(card=>!card.deprecated&&card.cost<=20&&card.acquisition!=='synthesis'));
assert(Math.abs(contract.monsterRates.reduce((sum,row)=>sum+row.rate,0)-1)<1e-9);
const commonIds=contract.monsterPool.slice(0,6).map(card=>card.id);
const reset=(inventory={},coins=10000)=>{context.save={coins,skillCards:{...inventory}};};
context.zeroRandom=()=>0;
reset({},900);const ten=vm.runInContext("performSkillGacha('character',10,zeroRandom)",context);
assert(ten.ok);assert.equal(ten.cards.length,10);assert(ten.cards.some(card=>card.cost>=6));assert.equal(context.save.coins,0);
assert.equal(Object.values(context.save.skillCards).reduce((a,b)=>a+b,0),10);

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
assert(monsterHighTen.cards.every(card=>card.cost===20&&card.acquisition!=='synthesis'));
assert.equal(monsterRandomCalls,20,'monster draws must not apply the character-only extra guarantee');

// The rate screen distinguishes the normal distribution from the changing guarantee.
const rateElements={skillGachaCoinView:{},skillGachaRateList:{}};
context.document={getElementById:id=>rateElements[id]||null};
vm.runInContext('renderSkillGacha()',context);
assert(rateElements.skillGachaRateList.innerHTML.includes('上級以上1枚保証'));
assert(rateElements.skillGachaRateList.innerHTML.includes('10枚とも低級だった場合'));
assert(rateElements.skillGachaRateList.innerHTML.includes('最強4技は合成限定'));
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
  basic:skillGachaRarityTier(2),rare:skillGachaRarityTier(7),legendary:skillGachaRarityTier(15),mythic:skillGachaRarityTier(25),
  prophecy:skillGachaProphecy(25),
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

console.log('Skill gacha validation passed (106 shared cards, upper+ guarantee, ultimate exclusion, persistence rollback and presentation).');
