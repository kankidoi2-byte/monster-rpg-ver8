import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const dataSource = fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const dexSource = fs.readFileSync(new URL('../js/dex.js', import.meta.url), 'utf8');
const coreSource = fs.readFileSync(new URL('../js/core.js', import.meta.url), 'utf8');
const itemsSource = fs.readFileSync(new URL('../js/items.js', import.meta.url), 'utf8');
const multiSource = fs.readFileSync(new URL('../js/multi-battle.js', import.meta.url), 'utf8');
const saveSource = fs.readFileSync(new URL('../js/save.js', import.meta.url), 'utf8');

const context = {};
vm.createContext(context);
vm.runInContext(`${dataSource};globalThis.__MONSTERS__=M`, context);
const records = context.__MONSTERS__;
const characters = records.filter(record => record.entityKind === 'character').sort((a,b) => a.characterNo - b.characterNo);
const characterIds = Array.from(characters, record => record.id);

assert.deepEqual(characterIds, ['elna_beginner','elna_middle','elna_advanced','elna_water','elna_kaen','stella_apprentice','stella_wizard','stella_sorcerer','lumina_apprentice','lumina_wizard','lumina_sorcerer','elysia','elysia_prayer','hikari']);
assert.deepEqual(Array.from(characters, record => record.characterNo), [1,2,3,4,5,6,7,8,9,10,11,12,13,14]);
assert(records.filter(record => record.entityKind === 'character').every(record => record.contractable === false));
assert(records.filter(record => record.entityKind === 'character').every(record => Object.entries(record.eligibility).every(([key,value]) => value === (key === 'alchemyCatalyst'))));
assert.equal(records.find(record => record.id === 'elna_beginner').no, 21);
assert.equal(records.find(record => record.id === 'elna_water').no, 25);
assert.equal(records.find(record => record.id === 'elna_kaen').no, 46);
assert.deepEqual(Array.from(records.filter(record => record.entityKind === 'monster').map(record => record.dexNo ?? record.no).sort((a,b)=>a-b)),Array.from({length:50},(_,index)=>index+1));
assert.equal(records.find(record => record.id === 'sylphin').dexNo,21);
assert.equal(records.find(record => record.id === 'tempestray').dexNo,23);
assert.equal(records.find(record => record.id === 'nocle').dexNo,36);
assert.equal(records.find(record => record.id === 'noxvelg').dexNo,38);
assert.equal(records.find(record => record.id === 'luxseed').dexNo,39);
assert.equal(records.find(record => record.id === 'lux_galdion').dexNo,41);
assert.equal(records.find(record => record.id === 'astralepis').dexNo,16);
assert.equal(records.find(record => record.id === 'galdra').dexNo,46);
assert.equal(records.find(record => record.id === 'kimeragna_apex').dexNo,49);
assert.equal(records.find(record => record.id === 'elixion').dexNo,50);
assert(records.filter(record => record.id.startsWith('stella_') || record.id.startsWith('lumina_') || record.id.startsWith('elysia') || record.id === 'hikari').every(record => record.entityKind === 'character'));
assert.match(dexSource, /M\.filter\(m=>!isCharacterUnit\(m\)\)/);
assert.match(dexSource, /M\.filter\(isCharacterUnit\)/);
assert.match(dexSource, /function monsterDexNumber/);
assert.match(coreSource, /function isContractableUnit/);
assert.match(itemsSource, /!isContractableUnit\(enemy\)/);
assert.match(multiSource, /isContractableUnit\(entry\.mon\)/);
assert.match(saveSource, /const SAVE_KEY = 'mb_v95c'/);
assert.match(saveSource, /safeStorageGet\(SAVE_KEY\)/);
assert.match(saveSource, /safeStorageSet\(SAVE_KEY,raw\)/);

// Reserved encyclopedia slots must not become obtainable battle units.
const elements=Object.fromEntries(['characterDex','characterDexList','characterDexDetail','dexHubGrid'].map(id=>[id,{innerHTML:'',classList:{contains:()=>true},scrollIntoView(){}}]));
Object.assign(context,{
  document:{getElementById:id=>elements[id]},
  isCharacterUnit:unit=>unit.entityKind==='character',
  vis:unit=>`<img data-unit="${unit.id}">`,
  typesHtml:types=>types.join('/'),
  caughtHas:id=>id==='elna_beginner',
  syncItemDexFromInventory(){},
  ITEM_DEX_ITEMS:[],
  save:{itemDex:[],mapDex:[]}
});
vm.runInContext(dexSource,context);
const entries=vm.runInContext('characterDexEntries()',context);
assert.equal(entries.length,50);
assert.deepEqual(Array.from(entries,e=>e.characterNo),Array.from({length:50},(_,i)=>i+1));
const reserved=entries.filter(e=>e.planned);
assert.equal(reserved.length,36);
assert.deepEqual(Array.from(reserved.filter(e=>e.imgKey),e=>e.characterNo),[15,16,17,27,28,29,30,31,32,39,40,41]);
assert.equal(new Set(reserved.map(e=>e.slotId)).size,36);
assert.equal(reserved[0].name,'接雷の従士ブリジット');
assert.equal(reserved.at(-1).name,'地脈の導標師ノアム');
assert(reserved.every(e=>e.chapter==='序章'&&!records.some(m=>m.id===e.slotId)));
assert.equal(reserved.filter(e=>e.rarity==='★★').length,12);
assert.equal(reserved.filter(e=>e.rarity==='★★★').length,12);
assert.equal(reserved.filter(e=>e.rarity==='★★★★').length,12);
vm.runInContext('renderCharacterDex();renderDexHub()',context);
assert.equal((elements.characterDexList.innerHTML.match(/<button /g)||[]).length,50);
assert.equal((elements.characterDexList.innerHTML.match(/character-dex-planned/g)||[]).length,36);
assert.match(elements.dexHubGrid.innerHTML,/1 \/ 50/);
for(const slot of reserved){
  context.testSlotId=slot.slotId;
  vm.runInContext('showCharacterDexSlot(testSlotId)',context);
  assert(elements.characterDexDetail.innerHTML.includes(slot.name));
  assert.match(elements.characterDexDetail.innerHTML,/現在は入手・対戦できません/);
  if(slot.imgKey){
    const imagePath=vm.runInContext('IMG',context)[slot.imgKey];
    assert(fs.existsSync(new URL('../'+imagePath,import.meta.url)));
    assert(elements.characterDexDetail.innerHTML.includes(imagePath));
    assert(elements.characterDexList.innerHTML.includes(imagePath));
  }else assert.doesNotMatch(elements.characterDexDetail.innerHTML,/<img/);
}
// Future implementation replaces its reservation without increasing the denominator.
vm.runInContext("M.push({id:'test_future_character',entityKind:'character',characterNo:15});",context);
assert.equal(vm.runInContext('characterDexEntries().length',context),50);
assert.equal(vm.runInContext('characterDexEntries()[14].id',context),'test_future_character');
vm.runInContext('M.pop()',context);
console.log('Character dex validation passed (14 playable forms + 36 reserved slots, stable IDs/numbers, replacement, rendering and acquisition isolation).');
