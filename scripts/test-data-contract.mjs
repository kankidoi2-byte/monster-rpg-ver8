import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const ctx=vm.createContext({console});
vm.runInContext(read('js/data.js')+read('js/core.js'),ctx);
const x=vm.runInContext('({M,INITIAL_PARTY_IDS,MOVE_CARDS,SKILL_BY_ID,SKILL110_MIGRATION_MAP,skillIdFromMove,canonicalSkillId,skillCostLimitFor,defaultSkillIdsForMonster,isCharacterUnit,isContractableUnit,isAlchemyCatalystUnit,SHOP_ITEMS,ALCHEMY_RECIPES,ALCHEMY_ALL_FAILURE_CANDIDATES,MAPS})',ctx);
const by=id=>x.M.find(m=>m.id===id);
assert.equal(x.M.length,100);assert.deepEqual([...x.INITIAL_PARTY_IDS],['elna_beginner','freigal','aquaron']);
assert.equal(x.M.filter(m=>m.entityKind==='character').length,50);
assert.deepEqual(x.M.filter(m=>m.entityKind==='monster').map(m=>m.dexNo??m.no).sort((a,b)=>a-b).join(','),Array.from({length:50},(_,i)=>i+1).join(','));
assert.equal(x.MOVE_CARDS.length,426);assert.equal(new Set(x.MOVE_CARDS.map(s=>s.id)).size,426);
assert(x.M.every(m=>m.moves.every(mv=>typeof mv[8]==='string')));
const contracts=x.SHOP_ITEMS.filter(s=>s.contract);assert(contracts.length&&contracts.every(s=>s.usableInBattle===false));
for(const m of x.M)for(const mv of m.legacyMoves){assert(x.SKILL_BY_ID[mv[8]],`legacy record ${mv[8]}`);assert(x.SKILL110_MIGRATION_MAP[mv[8]],`mapping ${mv[8]}`);}
const mv=by('freigal').moves[0],id=mv[8],name=mv[0];mv[0]='表示名変更';assert.equal(x.skillIdFromMove(mv),id);mv[0]=name;
assert(x.isCharacterUnit(by('elna_advanced')));assert(!x.isContractableUnit(by('elna_advanced')));assert(x.isAlchemyCatalystUnit(by('elna_advanced')));assert(x.isAlchemyCatalystUnit(by('freigal')));
const apex=by('kimeragna_apex');assert(apex.evolutionOnly);assert.equal(apex.rarity,'★★★★');assert.equal(x.skillCostLimitFor(apex,{level:1}),8);assert.equal(apex.eligibility.alchemySuccess,false);
assert.deepEqual([...by('elixion').types],['normal','dragon']);assert.deepEqual([...by('galdra').types],['normal','dragon']);assert.equal(by('galdra').dexNo,46);assert.equal(by('astralepis').dexNo,38);
assert(!x.ALCHEMY_ALL_FAILURE_CANDIDATES.some(s=>['elna_advanced','stella_wizard','lumina_wizard'].includes(s.monsterId)));
for(const id of ['elixion_standard','galdra_standard'])assert(x.ALCHEMY_RECIPES.some(r=>r.recipeId===id));
for(const [id,name,no,dex,type,map,level] of [['false_dragon_beta','アシュレイア',30,39,'fire','volcano',92],['false_dragon_gamma','モルグラム',31,40,'grass','forest',94]]){
 const m=by(id);assert.equal(m.name,name);assert.equal(m.no,no);assert.equal(m.dexNo,dex);assert.equal(m.rarity,'★★★★');assert.equal(m.types.join(','),type);assert.equal(m.huntLevels.hard,level);assert.equal(x.MAPS.filter(a=>a.enemyIds?.includes(id)).map(a=>a.id).join(','),map);
 assert.deepEqual([...m.legacyMoves.map(mv=>mv[8])],[1,2,3].map(n=>`skill_${id}_0${n}`));
 for(const level of [1,50]){const ids=x.defaultSkillIdsForMonster(m,{level});assert(ids.some(id=>x.SKILL_BY_ID[id].power>0));assert(ids.reduce((n,id)=>n+x.SKILL_BY_ID[id].cost,0)<=x.skillCostLimitFor(m,{level}));}
}
const html=read('index.html');
for(const file of ['data','core','skills','save','progression','skill-gacha','ui','alchemy','dex'])assert(new RegExp(`js/${file}\\.js\\?v=[^"']+`).test(html),`versioned ${file} script`);
assert(/const SAVE_KEY\s*=\s*['"]mb_v95c['"]/.test(read('js/save.js')));
console.log('Data contract: 100 stable units, 50 monster dex numbers, 316 retained legacy records + 110 adopted skills, habitats, eligibility, fixed IDs and cache keys passed.');
