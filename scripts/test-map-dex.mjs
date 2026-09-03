import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const dataSource=read('js/data.js');
const context=vm.createContext({console});
const dex=read('js/dex.js');
vm.runInContext(`${dataSource}\nfunction by(id){return M.find(unit=>unit.id===id);}\n${dex}\nglobalThis.__maps=MAPS;globalThis.__ecosystemProfile=mapDexEcosystemProfile;`,context);
const maps=context.__maps;
const ecosystemProfile=context.__ecosystemProfile;
const save=read('js/save.js');
const battle=read('js/battle-flow.js');
const expedition=read('js/expedition.js');

const errors=[];
const expect=(condition,message)=>{if(!condition)errors.push(message);};
expect(Array.isArray(maps)&&maps.length>0,'map data must be available');
maps.forEach(map=>{
  expect(typeof map.id==='string'&&map.id,'every map needs a stable id');
  expect(typeof map.chapter==='string'&&map.chapter,'every map needs a chapter label');
  expect(typeof map.region==='string'&&map.region,'every map needs a region label');
  expect(typeof map.desc==='string'&&map.desc,'every map needs a dex description');
  expect(typeof map.ecosystem==='string'&&map.ecosystem.trim().length>=30,`${map.id} needs a substantial ecosystem explanation`);
  expect(map.ecosystem!==map.desc,`${map.id} ecosystem explanation must add information beyond its description`);
  expect(Array.isArray(map.enemyIds)&&map.enemyIds.length>0,'every map needs an encounter list');
  const profile=ecosystemProfile(map);
  expect(profile.species.length===new Set(map.enemyIds).size,'ecosystem species must match unique encounter species');
  expect(profile.typeTrends.length>0,'every map needs at least one ecosystem type trend');
  expect(profile.species.every((entry,index,list)=>index===0||list[index-1].count>=entry.count),'ecosystem species must be ordered by encounter weight');
  expect(profile.typeTrends.every(entry=>Number.isInteger(entry.rate)&&entry.rate>=0&&entry.rate<=100),'ecosystem type rates must be bounded percentages');
  const diagram=map.ecosystemDiagram;
  expect(diagram&&typeof diagram==='object',`${map.id} needs an ecosystem or environment diagram`);
  if(diagram){
    expect(typeof diagram.heading==='string'&&diagram.heading.length>=8,`${map.id} diagram needs a clear heading`);
    expect(typeof diagram.note==='string'&&diagram.note.length>=20,`${map.id} diagram needs an interpretation note`);
    expect(Array.isArray(diagram.layers)&&diagram.layers.length>=2,`${map.id} diagram needs at least two structural layers`);
    expect(!diagram.cycles||Array.isArray(diagram.cycles),`${map.id} diagram cycles must be an array when present`);
    const entries=[...(diagram.layers||[]),...(diagram.cycles||[])];
    expect(entries.every(entry=>typeof entry.role==='string'&&entry.role&&typeof entry.detail==='string'&&entry.detail),`${map.id} diagram entries need roles and explanations`);
    expect(entries.every(entry=>(Array.isArray(entry.ids)&&entry.ids.length)||(Array.isArray(entry.labels)&&entry.labels.length)),`${map.id} diagram entries need species or environment labels`);
    const diagramIds=entries.flatMap(entry=>entry.ids||[]);
    const encounterIds=[...new Set(map.enemyIds)];
    expect(diagramIds.length===new Set(diagramIds).size,`${map.id} diagram must not assign a species twice`);
    expect(diagramIds.every(id=>encounterIds.includes(id)),`${map.id} diagram species must belong to its encounters`);
    expect(encounterIds.every(id=>diagramIds.includes(id)),`${map.id} diagram must explain every encountered species`);
  }
});
const grassland=maps.find(map=>map.id==='grassland');
expect(grassland&&grassland.ecosystemDiagram,'grassland needs an ecosystem diagram');
if(grassland?.ecosystemDiagram){
  const diagram=grassland.ecosystemDiagram;
  expect(typeof diagram.heading==='string'&&diagram.heading.includes('生態系ピラミッド'),'grassland diagram needs a clear heading');
  expect(typeof diagram.note==='string'&&diagram.note.includes('戦闘での強さ順ではない'),'grassland diagram must distinguish ecology from battle strength');
  expect(Array.isArray(diagram.layers)&&diagram.layers.length===4,'grassland diagram needs four trophic layers');
  expect(Array.isArray(diagram.cycles)&&diagram.cycles.length===2,'grassland diagram needs circulation and visitor notes');
  expect(diagram.layers.every(entry=>typeof entry.role==='string'&&typeof entry.detail==='string'&&entry.detail),'every trophic layer needs a role and explanation');
}
expect(dex.includes('function renderDexHub'),'dex hub renderer is missing');
expect(dex.includes('function renderMapDex'),'map dex renderer is missing');
expect(dex.includes('function showMapDexDetail'),'map detail renderer is missing');
expect(dex.includes('map-dex-ecosystem')&&dex.includes('属性傾向')&&dex.includes('主な生息種'),'map ecosystem detail UI is missing');
expect(dex.includes('function mapDexEcosystemDiagram')&&dex.includes('map-dex-pyramid'),'map ecosystem diagram UI is missing');
expect(dex.includes('function openMapFromMonsterDex')&&dex.includes('function openUnitFromMapDex'),'dex cross-links are missing');
expect(save.includes('mapDex:[]')&&save.includes('function registerMapDex'),'map discovery persistence is missing');
expect(battle.includes("registerMapDex(map.id)"),'hunt requests must register discovered maps');
expect(expedition.includes("registerMapDex(map.id)"),'expeditions must register discovered maps');

if(errors.length){console.error(`Map dex validation failed (${errors.length} issue(s)):`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1);}
console.log(`Map dex validation passed (${maps.length} maps, metadata, ecosystems, discovery, hub, and cross-links).`);
