import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const storage=new Map();let failStorage=false;const dialogs=[];let answers=[];
const context=vm.createContext({console,Math,Date,JSON,document:{addEventListener(){},getElementById:()=>({classList:{add(){},remove(){}},style:{},setAttribute(){}})},setTimeout:()=>{},alert:()=>{},confirm:message=>{dialogs.push(message);return answers.shift()??false;},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(failStorage)throw Error('full');storage.set(k,v);}}});
for(const file of ['data','core','save','skills','ui','items','party','expedition','alchemy','character-gacha'])vm.runInContext(fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),context);
const run=s=>vm.runInContext(s,context);
run('save=initSave(); const first=addInstance("elna_beginner"), second=addInstance("elna_beginner"); const other=addInstance("freigal");');
assert(run('first.locked && !second.locked'));
assert(run('alchemyEligibleInstances().includes(second) && !alchemyEligibleInstances().includes(first)'));
assert(run('M.filter(isCharacterUnit).every(isAlchemyCatalystUnit)'));
assert(run('M.filter(isCharacterUnit).every(m=>!isAlchemyResultEligible(m,"success")&&!isAlchemyResultEligible(m,"failure"))'));
for(const setup of ['second.locked=true','second.locked=false;save.party=[second.uid]','save.party=[];save.expeditions.active=[{memberUids:[second.uid]}]']){
 run(setup);const before=run('JSON.stringify(save)');assert(!run('performCharacterRecycle(second.uid).ok'));assert(!run('alchemyEligibleInstances().includes(second)'));assert.equal(run('JSON.stringify(save)'),before);
}
run('save.expeditions.active=[];save.equippedSkills[second.uid]=[]');
answers=[false];const beforeCancel=run('JSON.stringify(save)');run('recycleCharacter(second.uid)');assert.equal(run('JSON.stringify(save)'),beforeCancel);
failStorage=true;const beforeFail=run('JSON.stringify(save)');assert(!run('performCharacterRecycle(second.uid).ok'));assert.equal(run('JSON.stringify(save)'),beforeFail);failStorage=false;
assert(run('performCharacterRecycle(second.uid).ok'));
assert.equal(run('save.items.kilo_data'),1);assert.equal(run('save.coins'),5);
assert(run('!save.equippedSkills[second.uid] && save.caught.includes(first.id) && getInstance(first.uid)'));
const once=run('JSON.stringify(save)');assert(!run('performCharacterRecycle(second.uid).ok'));assert.equal(run('JSON.stringify(save)'),once);
run('getInstance(first.uid).locked=false');assert(!run('performCharacterRecycle(first.uid).ok'));
answers=[true,false];const lastBefore=run('JSON.stringify(save)');run('recycleCharacter(first.uid)');assert.equal(run('JSON.stringify(save)'),lastBefore);assert.match(dialogs.at(-1),/最後/);
assert(run('performCharacterRecycle(first.uid,true).ok'));
assert.equal(run('save.items.kilo_data'),2);assert.equal(run('save.coins'),10);
assert.equal(run('parseAndPrepareSave(localStorage.getItem(SAVE_KEY),[]).coins'),10);
// Old saves: preserve UIDs, resources and custom fields; lock one per form only once.
run('save=initSave();addInstance("elna_beginner");addInstance("elna_beginner");addInstance("stella_apprentice");save.instances.forEach(i=>i.locked=false);delete save.saveMeta;save.customField={keep:true}; const oldUids=save.instances.map(i=>i.uid).join(); repairSave(save,[])');
assert.equal(run('save.instances.map(i=>i.locked).join()'),'true,false,true');
assert(run('save.instances.map(i=>i.uid).join()===oldUids && save.customField.keep'));
run('save.instances[0].locked=false;saveGame();save=parseAndPrepareSave(localStorage.getItem(SAVE_KEY),[])');assert(!run('save.instances[0].locked'));
run('save=initSave();save.coins=1000;const ten=performCharacterGacha(10,()=>0)');
assert.equal(run('ten.entries.filter(e=>e.instance.locked).length'),1);
assert.equal(run('new Set(ten.entries.map(e=>e.instance.uid)).size'),10);
console.log('Character recycle passed: first lock, duplicates, catalysts/results, protected instances, cancellation, last copy, rewards, double execution, storage rollback, old migration and reload.');

const partyList={innerHTML:''};context.document.getElementById=()=>partyList;
run('renderParty()');
assert.match(partyList.innerHTML,/経験値アイテム＋コインに変換/);
assert.equal((partyList.innerHTML.match(/ロック中です。/g)||[]).length,1);
assert.match(partyList.innerHTML,/キロデータ × 1 ＋ 5コイン/);
run('save=initSave();addInstance("freigal");addInstance("stella_apprentice");const stella=addInstance("stella_apprentice",100);');
assert(run('performCharacterRecycle(stella.uid).ok'));
assert.equal(run('save.items.mega_data'),1);assert.equal(run('save.coins'),10);
console.log('Roster rendering and fixed star-2 rewards at level 100 passed.');
