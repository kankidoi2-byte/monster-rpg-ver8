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

console.log('Character dex validation passed (14 forms, stable IDs/numbers, contract and alchemy guards, and save key).');
