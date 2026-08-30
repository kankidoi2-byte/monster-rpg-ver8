import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({console, Date, JSON, Math});
for (const file of ['data', 'core', 'dex']) {
  vm.runInContext(fs.readFileSync(new URL(`../js/${file}.js`, import.meta.url), 'utf8'), context, {filename:`js/${file}.js`});
}

const rows = vm.runInContext(`M.filter(monster=>monster.entityKind==='monster').map(monster=>({
  id:monster.id,
  entries:monsterObtainEntries(monster)
}))`, context);
const entriesFor = id => rows.find(row => row.id === id).entries;

assert.equal(rows.length, 50);
assert.equal(rows.filter(row => row.entries.length === 0).length, 0, 'every monster needs an acquisition fallback or source');
for (const id of ['freigal', 'aquaron']) {
  assert(entriesFor(id).some(entry => entry.kind === 'initial'), `${id} must show initial acquisition`);
}
for (const id of ['grassbeat', 'volteck']) {
  assert(!entriesFor(id).some(entry => entry.kind === 'initial'), `${id} must not show initial acquisition`);
}
assert(entriesFor('aquaron').filter(entry => entry.kind === 'map').length > 1, 'multiple encounter maps must all be shown');
assert(entriesFor('kimeragna_apex').some(entry => entry.kind === 'evolution'), 'normal evolution source is missing');
assert(entriesFor('doom_nemesion').some(entry => entry.kind === 'fusion'), 'special evolution source is missing');
assert(entriesFor('alchemion').some(entry => entry.kind === 'alchemy'), 'alchemy source is missing');

console.log('Monster acquisition display validation passed (50 monsters, initial party, maps, evolution, fusion, and alchemy).');
