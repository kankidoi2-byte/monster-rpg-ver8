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
  expect(Array.isArray(map.enemyIds)&&map.enemyIds.length>0,'every map needs an encounter list');
  const profile=ecosystemProfile(map);
  expect(profile.species.length===new Set(map.enemyIds).size,'ecosystem species must match unique encounter species');
  expect(profile.typeTrends.length>0,'every map needs at least one ecosystem type trend');
  expect(profile.species.every((entry,index,list)=>index===0||list[index-1].count>=entry.count),'ecosystem species must be ordered by encounter weight');
  expect(profile.typeTrends.every(entry=>Number.isInteger(entry.rate)&&entry.rate>=0&&entry.rate<=100),'ecosystem type rates must be bounded percentages');
});
expect(dex.includes('function renderDexHub'),'dex hub renderer is missing');
expect(dex.includes('function renderMapDex'),'map dex renderer is missing');
expect(dex.includes('function showMapDexDetail'),'map detail renderer is missing');
expect(dex.includes('map-dex-ecosystem')&&dex.includes('属性傾向')&&dex.includes('主な生息種'),'map ecosystem detail UI is missing');
expect(dex.includes('function openMapFromMonsterDex')&&dex.includes('function openUnitFromMapDex'),'dex cross-links are missing');
expect(save.includes('mapDex:[]')&&save.includes('function registerMapDex'),'map discovery persistence is missing');
expect(battle.includes("registerMapDex(map.id)"),'hunt requests must register discovered maps');
expect(expedition.includes("registerMapDex(map.id)"),'expeditions must register discovered maps');

if(errors.length){console.error(`Map dex validation failed (${errors.length} issue(s)):`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1);}
console.log(`Map dex validation passed (${maps.length} maps, metadata, ecosystems, discovery, hub, and cross-links).`);
