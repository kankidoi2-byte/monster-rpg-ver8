import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const dataSource=read('js/data.js');
const context=vm.createContext({console});
vm.runInContext(`${dataSource}\nglobalThis.__maps=MAPS;`,context);
const maps=context.__maps;
const dex=read('js/dex.js');
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
});
expect(dex.includes('function renderDexHub'),'dex hub renderer is missing');
expect(dex.includes('function renderMapDex'),'map dex renderer is missing');
expect(dex.includes('function showMapDexDetail'),'map detail renderer is missing');
expect(dex.includes('function openMapFromMonsterDex')&&dex.includes('function openUnitFromMapDex'),'dex cross-links are missing');
expect(save.includes('mapDex:[]')&&save.includes('function registerMapDex'),'map discovery persistence is missing');
expect(battle.includes("registerMapDex(map.id)"),'hunt requests must register discovered maps');
expect(expedition.includes("registerMapDex(map.id)"),'expeditions must register discovered maps');

if(errors.length){console.error(`Map dex validation failed (${errors.length} issue(s)):`);errors.forEach(error=>console.error(`- ${error}`));process.exit(1);}
console.log(`Map dex validation passed (${maps.length} maps, metadata, discovery, hub, and cross-links).`);
