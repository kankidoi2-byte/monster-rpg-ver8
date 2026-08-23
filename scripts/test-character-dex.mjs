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
const characterIds = Array.from(records.filter(record => record.unitType === 'character'), record => record.id);

assert.deepEqual(characterIds, ['elna_beginner','elna_middle','elna_advanced','elna_water','elna_kaen']);
assert.deepEqual(Array.from(records.filter(record => record.unitType === 'character'), record => record.characterNo), [1,2,3,4,5]);
assert(records.filter(record => record.unitType === 'character').every(record => record.contractable === false));
assert.equal(records.find(record => record.id === 'elna_beginner').no, 21);
assert.equal(records.find(record => record.id === 'elna_water').no, 25);
assert.equal(records.find(record => record.id === 'elna_kaen').no, 46);
assert(records.filter(record => record.id.startsWith('stella_') || record.id.startsWith('lumina_')).every(record => record.unitType !== 'character'));
assert.match(dexSource, /M\.filter\(m=>!isCharacterUnit\(m\)\)/);
assert.match(dexSource, /M\.filter\(isCharacterUnit\)/);
assert.match(coreSource, /function isContractableUnit/);
assert.match(itemsSource, /!isContractableUnit\(enemy\)/);
assert.match(multiSource, /isContractableUnit\(entry\.mon\)/);
assert.match(saveSource, /const SAVE_KEY = 'mb_v95c'/);
assert.match(saveSource, /safeStorageGet\(SAVE_KEY\)/);
assert.match(saveSource, /safeStorageSet\(SAVE_KEY,raw\)/);

console.log('Elna character dex validation passed (5 forms, stable IDs/numbers, contract guards, and save key).');
