import {legacyUnitProjection} from './skill110-legacy-projection.mjs';
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

assert.deepEqual(characterIds.slice(0,14), ['elna_beginner','elna_middle','elna_advanced','elna_water','elna_kaen','stella_apprentice','stella_wizard','stella_sorcerer','lumina_apprentice','lumina_wizard','lumina_sorcerer','elysia','elysia_prayer','hikari']);
assert.deepEqual(Array.from(characters, record => record.characterNo), [...Array.from({length:47},(_,i)=>i+1),51,52,53]);
assert(records.filter(record => record.entityKind === 'character').every(record => record.contractable === false));
assert(records.filter(record => record.entityKind === 'character').every(record => Object.entries(record.eligibility).every(([key,value]) => value === (key === 'alchemyCatalyst'))));
assert.equal(records.find(record => record.id === 'elna_beginner').no, 21);
assert.equal(records.find(record => record.id === 'elna_water').no, 25);
assert.equal(records.find(record => record.id === 'elna_kaen').no, 46);
assert.deepEqual(Array.from(records.filter(record => record.entityKind === 'monster').map(record => record.dexNo ?? record.no).sort((a,b)=>a-b)),Array.from({length:50},(_,index)=>index+1));
const expectedMonsterDexOrder = [
  'freigal',
  'freiwolf',
  'aquaron',
  'highaquaron',
  'shenhairon',
  'tienhairon',
  'grassbeat',
  'thornbeat',
  'granbeat',
  'rikasheef',
  'seralphia',
  'volteck',
  'spaquinn',
  'voltax',
  'sylphin',
  'zephyray',
  'tempestray',
  'luxseed',
  'luxiard',
  'lux_galdion',
  'nocle',
  'noclaid',
  'noxvelg',
  'orcana',
  'orca_stream',
  'orca_abyss',
  'volmoog',
  'gran_volmoog',
  'slime',
  'slime_gold',
  'goblin',
  'ignaros',
  'tsubaki',
  'suiren',
  'proto_icegolem',
  'icegolem',
  'nightmare',
  'astralepis',
  'false_dragon_beta',
  'false_dragon_gamma',
  'nemes',
  'nemesia',
  'nemesion',
  'doom_nemesion',
  'false_dragon_alfa',
  'galdra',
  'alchemion',
  'kimeragna',
  'kimeragna_apex',
  'elixion'
];
const actualMonsterDexOrder = Array.from(
  records.filter(record => record.entityKind === 'monster').sort((a,b)=>(a.dexNo??a.no)-(b.dexNo??b.no)),
  record => record.id
);
assert.deepEqual(actualMonsterDexOrder, expectedMonsterDexOrder);
assert(records.filter(record => record.id.startsWith('stella_') || record.id.startsWith('lumina_') || record.id.startsWith('elysia') || record.id === 'hikari').every(record => record.entityKind === 'character'));
assert.match(dexSource, /M\.filter\(m=>!isCharacterUnit\(m\)\)/);
assert.match(dexSource, /isCharacterUnit\(unit\)/);
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
vm.runInContext(coreSource,context);
vm.runInContext(fs.readFileSync(new URL('../js/skill-dex.js',import.meta.url),'utf8'),context);
vm.runInContext(dexSource,context);
const entries=vm.runInContext('characterDexEntries()',context);
assert.equal(entries.length,50);
assert.deepEqual(Array.from(entries,e=>e.prologueCharacterNo??e.characterNo),Array.from({length:50},(_,i)=>i+1));
assert.equal(entries.filter(e=>e.planned).length,0);
assert.equal(entries[14].name,'接雷の従士ブリジット');
assert.equal(entries.at(-1).name,'終焉の殲滅姫ヴェーラ');
vm.runInContext('renderCharacterDex();renderDexHub()',context);
assert.equal((elements.characterDexList.innerHTML.match(/<button /g)||[]).length,50);
assert.equal((elements.characterDexList.innerHTML.match(/character-dex-planned/g)||[]).length,0);
assert.match(elements.dexHubGrid.innerHTML,/1 \/ 50/);
console.log('Character dex validation passed: 50 prologue display forms, empty chapter-one roster; existing IDs and monster numbers preserved.');

// Every retired reservation is already represented by the same implemented form.
const {execFileSync}=await import('node:child_process');
const baseline=execFileSync('git',['show','accc2c5187ddd627c2ea8fbe35f91ece48eeb9d1:js/data.js'],{encoding:'utf8'});
const oldContext=vm.createContext({});vm.runInContext(baseline,oldContext);
const retired=vm.runInContext('CHARACTER_DEX_RESERVED_SLOTS',oldContext);
assert.equal(retired.length,36);
for(const slot of retired){
 const mon=characters.find(m=>m.characterNo===slot.characterNo);
 assert(mon,`implemented equivalent for ${slot.slotId}`);
 for(const field of ['name','rarity','types','imgKey','chapter'])assert.equal(JSON.stringify(mon[field]),JSON.stringify(slot[field]),`${slot.slotId}: ${field}`);
 assert.equal(mon.prologueCharacterNo??mon.characterNo,slot.prologueCharacterNo??slot.characterNo);
}
assert.equal(vm.runInContext('CHARACTER_DEX_RESERVED_SLOTS.length',context),0);
assert.equal(JSON.stringify(records.map(legacyUnitProjection)),vm.runInContext('JSON.stringify(M)',oldContext),'all historical unit data preserved; live110 loadouts tested separately');
assert(!elements.dexHubGrid.innerHTML.includes('登場予定'),'no stale coming-soon label');
// Keep genuine future plans visible, read-only and out of the battle roster.
const future=vm.createContext({...context});
const futureData=dataSource.replace('const CHARACTER_DEX_RESERVED_SLOTS = Object.freeze([]);',`const CHARACTER_DEX_RESERVED_SLOTS = Object.freeze([{slotId:'test_future',characterNo:999,name:'未来の予約',rarity:'★★',types:['star'],chapter:'序章',planned:true}]);`);
vm.runInContext(futureData,future);vm.runInContext(coreSource,future);vm.runInContext(fs.readFileSync(new URL('../js/skill-dex.js',import.meta.url),'utf8'),future);vm.runInContext(dexSource,future);
assert.equal(vm.runInContext('characterDexEntries().length',future),51);
assert.equal(vm.runInContext('M.some(m=>m.characterNo===999)',future),false);
vm.runInContext('renderCharacterDex();renderDexHub();showCharacterDexSlot("test_future")',future);
assert(elements.dexHubGrid.innerHTML.includes('登場予定'));
assert(elements.characterDexDetail.innerHTML.includes('現在は入手・対戦できません'));
assert.equal((elements.characterDexList.innerHTML.match(/character-dex-planned/g)||[]).length,1);
console.log('PASS retired reservations: 36 exact implemented equivalents, unchanged M, preserved future planned-slot rendering');
