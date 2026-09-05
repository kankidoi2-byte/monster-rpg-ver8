import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console});
for(const file of ['data','core','state','dex']){
  vm.runInContext(fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),context,{filename:`js/${file}.js`});
}
const run=source=>vm.runInContext(source,context);
const value=source=>JSON.parse(JSON.stringify(run(source)));
run('let save={mapDex:MAPS.map(map=>map.id),worldMap:{active:{}}};');
const difficulties=value('Object.fromEntries(MAPS.map(map=>[map.id,mapDexDifficulties(map)]))');
assert.equal(Object.keys(difficulties).length,19);
for(const id of ['grassland','volcano','lake','seikai_irie','snow_mountain','forest','light_plain','starry_plain','highland_ruins','arena','ruined_village']){
  assert.deepEqual(difficulties[id],['Easy','Normal','Hard'],id);
}
for(const id of ['kaiyu_kaiiki','deep_sea_end','magic_academy','kaen_village'])assert.deepEqual(difficulties[id],['Normal','Hard'],id);
assert.deepEqual(difficulties.starsea,['Hard','Extreme']);
assert.deepEqual(difficulties.world_between,['Extreme']);
assert.deepEqual(difficulties.water_secret,['Hard']);
assert.deepEqual(difficulties.golden_land,['Hard']);

const notes=()=>value(`Object.fromEntries(MAPS.map(map=>[map.id,{
  difficulties:mapDexDifficulties(map),events:mapDexEvents(map),
  encounters:[...new Set(map.enemyIds)].map(id=>({id,frequency:mapEnemyFrequencyLabel(map,id),note:monsterMapEncounterNote(map,by(id))}))
}]))`);
const initial=notes();
run("save.worldMap.active={elysia:{monsterId:'hikari'},crisis:{monsterId:'doom_nemesion'},rift:{monsterId:'false_dragon_alfa'}};");
assert.deepEqual(notes(),initial,'encyclopedia descriptions must not depend on which events are currently active');
const encounter=(map,id)=>initial[map].encounters.find(entry=>entry.id===id);
assert.match(encounter('light_plain','hikari').frequency,/降臨/);
assert.doesNotMatch(encounter('light_plain','hikari').frequency,/よく出現/);
assert.match(encounter('light_plain','hikari').note,/契約不可/);
assert.match(encounter('starsea','doom_nemesion').frequency,/危機.*Extreme/);
assert.match(encounter('starsea','nemesion').note,/入口.*Hard/);
for(const id of ['false_dragon_alfa','false_dragon_beta','false_dragon_gamma']){
  assert.match(encounter('world_between',id).note,/討伐.*対処を任せる.*痕跡/);
}
assert.doesNotMatch(JSON.stringify(initial),/出現率|[0-9]+[％%]/,'old map-refresh probabilities must not be displayed');
assert.match(initial.golden_land.events.join(' '),/出発時に1枚消費/);
assert(!initial.starsea.events.includes('三つ巴バトル'),'event-only entrance uses a single battle');
assert(!initial.world_between.events.includes('戦闘中の乱入'));
assert(initial.grassland.events.includes('三つ巴バトル'),'ordinary battle modes remain documented');
assert.equal(run("mapEnemyFrequencyLabel(MAPS.find(map=>map.id==='light_plain'),'slime')"),'出現','ordinary frequency must exclude the legacy goddess weights');

assert.match(run("monsterObtainEntries(by('hikari')).find(entry=>entry.mapId==='light_plain').note"),/降臨/);
assert.match(run("monsterObtainEntries(by('doom_nemesion')).find(entry=>entry.mapId==='starsea').note"),/危機/);
assert.equal(run("monsterObtainEntries(by('elixion')).filter(entry=>entry.kind==='map').length"),0,'alchemy-only dragon must have no wild source');
assert.equal(run("by('hikari').contractable"),false,'encyclopedia changes do not unlock goddess contracts');
assert.equal(run("by('hikari').rarity.length"),4);
assert.equal(run("MAPS.find(map=>map.id==='light_plain').enemyIds.filter(id=>id==='hikari').length"),12,'keep existing data IDs/legacy weights; the world-map candidate filter separates events');
assert.doesNotMatch(run("MAPS.find(map=>map.id==='light_plain').ecosystem"),/ヒカリの群れ/);
assert.match(run("MAPS.find(map=>map.id==='light_plain').ecosystem"),/降臨/);
assert.match(run("[...SHOP_ITEMS,...ITEM_DEX_EXTRA].find(item=>item.id==='golden_land_map').desc"),/世界地図.*出発.*1枚消費/);
console.log('World map encyclopedia checks passed (19 difficulty sets, event-specific encounters, save-independent descriptions, contract/ID preservation).');
