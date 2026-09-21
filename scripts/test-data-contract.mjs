import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const dataSource = fs.readFileSync(new URL('../js/data.js', import.meta.url), 'utf8');
const coreSource = fs.readFileSync(new URL('../js/core.js', import.meta.url), 'utf8');
const skillsSource = fs.readFileSync(new URL('../js/skills.js', import.meta.url), 'utf8');
const fullSaveSource = fs.readFileSync(new URL('../js/save.js', import.meta.url), 'utf8');
const htmlSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const saveSource = fullSaveSource.slice(0, fullSaveSource.indexOf('/* Ver7.8:'));
const storage = new Map();
const context = vm.createContext({
  console, Date, JSON, Math,
  localStorage:{
    getItem:key => storage.has(key) ? storage.get(key) : null,
    setItem:(key,value) => storage.set(key,String(value)),
    removeItem:key => storage.delete(key)
  },
  confirm:()=>false,
  alert:()=>{}
});

vm.runInContext(dataSource, context, {filename:'js/data.js'});
vm.runInContext(coreSource, context, {filename:'js/core.js'});

const contract = vm.runInContext(`({
  monsters:M,
  cards:MOVE_CARDS,
  firstMove:M[0].moves[0],
  firstFixedId:M[0].moves[0][8],
  firstLegacyId:legacySkillIdFromMove(M[0].moves[0]),
  normalizeSkillId,
  skillIdFromMove,
  skillCostLimitFor,
  defaultSkillIdsForMonster,
  isCharacterUnit,
  isContractableUnit,
  isAlchemyCatalystUnit,
  monsterDexNumbers:M.filter(monster=>monster.entityKind==='monster').map(monster=>monster.dexNo??monster.no),
  characterCount:M.filter(monster=>monster.entityKind==='character').length,
  recipeIds:ALCHEMY_RECIPES.map(recipe=>recipe.recipeId),
  failureIds:ALCHEMY_ALL_FAILURE_CANDIDATES.map(entry=>entry.monsterId),
  initialPartyIds:INITIAL_PARTY_IDS,
  contractItems:SHOP_ITEMS.filter(item=>item.contract)
})`, context);

assert.equal(contract.monsters.length,64);
assert.deepEqual([...contract.initialPartyIds],['elna_beginner','freigal','aquaron']);
assert.equal(contract.characterCount,14);
assert.equal(contract.monsterDexNumbers.length,50);
assert.deepEqual([...contract.monsterDexNumbers].sort((a,b)=>a-b),Array.from({length:50},(_,index)=>index+1));
assert.equal(contract.cards.length,200);
assert.equal(new Set(contract.cards.map(card => card.id)).size,200);
assert(contract.monsters.every(monster => monster.moves.every(move => typeof move[8] === 'string')));
assert(contract.monsters.every(monster => ['monster','character'].includes(monster.entityKind)));
assert(contract.contractItems.length>0&&contract.contractItems.every(item=>item.usableInBattle===false),'contract scrolls must only be usable after battle victory');
assert.equal(contract.normalizeSkillId(contract.firstLegacyId),contract.firstFixedId,'legacy skill ID must resolve to its fixed ID');
assert.notEqual(contract.firstLegacyId,contract.firstFixedId,'fixed IDs must not reuse the mutable legacy format');

const originalName = contract.firstMove[0];
contract.firstMove[0] = `${originalName}・調整版`;
assert.equal(contract.skillIdFromMove(contract.firstMove),contract.firstFixedId,'display-name changes must not change a fixed skill ID');
contract.firstMove[0] = originalName;

const elna = contract.monsters.find(monster => monster.id === 'elna_advanced');
const freigal = contract.monsters.find(monster => monster.id === 'freigal');
const kimeragnaApex = contract.monsters.find(monster => monster.id === 'kimeragna_apex');
const elixion = contract.monsters.find(monster => monster.id === 'elixion');
const galdra = contract.monsters.find(monster => monster.id === 'galdra');
assert.equal(contract.isCharacterUnit(elna),true);
assert.equal(contract.isContractableUnit(elna),false);
assert.equal(contract.isAlchemyCatalystUnit(elna),true);
assert.equal(contract.isAlchemyCatalystUnit(freigal),true);
assert.equal(kimeragnaApex.evolutionOnly,true);
assert.equal(kimeragnaApex.rarity,'★★★★','Kimeragna Apex must be a four-star monster');
assert.equal(contract.skillCostLimitFor(kimeragnaApex,{level:1}),8,'four-star Kimeragna Apex must use the four-star skill-cost limit');
assert.deepEqual([...contract.defaultSkillIdsForMonster(kimeragnaApex,{level:1})],['skill_kimeragna_apex_01'],'level-1 default skills must fit the four-star cost limit');
assert.equal(kimeragnaApex.eligibility.alchemySuccess,false,'Kimeragna Apex must only be reached by evolution');
assert.deepEqual([...elixion.types],['normal','dragon'],'Elixion must be a neutral/dragon monster');
assert.equal(elixion.moves[0][2],'normal','Elixion\'s first exclusive move must be neutral');
assert.deepEqual([...elixion.moves[2][2]],['normal','dragon'],'Elixion Nova must be neutral/dragon');
assert.equal(galdra.dexNo,46,'Galdra must occupy monster dex No.46');
assert.deepEqual([...galdra.types],['normal','dragon'],'Galdra must be a neutral/dragon monster');
assert.equal(contract.monsters.find(monster => monster.id === 'astralepis').dexNo,38,'Astralepis must occupy monster dex No.38');
assert(!contract.failureIds.includes('elna_advanced'),'characters must not enter alchemy failure results');
assert(!contract.failureIds.includes('stella_wizard'),'Stella characters must not enter alchemy failure results');
assert(!contract.failureIds.includes('lumina_wizard'),'Lumina characters must not enter alchemy failure results');
assert(contract.recipeIds.includes('elixion_standard'),'Elixion alchemy recipe must be registered');
assert(contract.recipeIds.includes('galdra_standard'),'Galdra alchemy recipe must be registered');

storage.set('mb_v95c',JSON.stringify({
  schemaVersion:1,
  saveMeta:{migrations:[]},
  instances:[{uid:'u1',id:'freigal',level:1,exp:0}],
  caught:['freigal'],
  items:{},
  skillCards:{[contract.firstLegacyId]:3},
  equippedSkills:{u1:[contract.firstLegacyId]}
}));
vm.runInContext(saveSource, context, {filename:'js/save.js'});
const migrated = vm.runInContext('save', context);
assert.equal(migrated.skillCards[contract.firstFixedId],3);
assert.deepEqual([...migrated.equippedSkills.u1],[contract.firstFixedId]);
assert(migrated.saveMeta.migrations.includes('fixed_skill_ids_v1'));
vm.runInContext(`
  save.instances.push({uid:'apex-u1',id:'kimeragna_apex',level:1,exp:0});
  save.equippedSkills['apex-u1']=['skill_kimeragna_apex_01','skill_kimeragna_apex_02'];
`, context);
vm.runInContext(skillsSource, context, {filename:'js/skills.js'});
vm.runInContext("ensureInstanceSkills(save.instances.find(instance => instance.uid === 'apex-u1'))", context);
assert.deepEqual(
  [...migrated.equippedSkills['apex-u1']],
  ['skill_kimeragna_apex_01'],
  'existing Kimeragna Apex skill loadouts must be safely trimmed to the four-star cost limit'
);
assert(htmlSource.includes('js/data.js?v=skill-taxonomy-1'),'data.js cache key must be updated for unit tags');
assert(htmlSource.includes('js/core.js?v=kokoro-link-phase4-1'),'core.js cache key must include the current Kokoro Link combat modifiers');
assert(htmlSource.includes('js/skills.js?v=evolution-skill-cards-1'),'skills.js cache key must be updated for evolution skill-card grants');
assert(htmlSource.includes('js/save.js?v=skill-inventory-1'),'save.js cache key must be updated for skill cards granted with new instances');
assert(htmlSource.includes('js/progression.js?v=evolution-skill-cards-1'),'progression.js cache key must be updated for evolution skill-card grants');
assert(htmlSource.includes('js/skill-gacha.js?v=skill-gacha-1'),'skill-gacha.js must be loaded with its release cache key');
assert(htmlSource.includes('js/ui.js?v=skill-gacha-1'),'ui.js cache key must be updated for the skill-gacha screen');
assert(htmlSource.includes('css/ui-redesign.css?v=kokoro-link-scaling-1'),'UI stylesheet cache key must include the Kokoro Link battle panel');
assert(htmlSource.includes('js/alchemy.js?v=phase3-prologue-1'),'alchemy.js cache key must remain aligned with Phase 3');
assert(htmlSource.includes('js/dex.js?v=monster-obtain-2'),'dex.js cache key must be updated for the monster acquisition display');

console.log('Canonical data contract validation passed (64 entities, 50-number monster dex, 14-character dex, 200 fixed skills, eligibility separation, and legacy skill-ID migration).');

// Replacement compatibility: retain ownership/cards, but apply current equip rules.
const replacements = [
  {id:'false_dragon_beta',name:'アシュレイア',no:30,dexNo:39,type:'fire',map:'volcano',level:92,powers:[76,62,94],forms:['beam','wing','beam']},
  {id:'false_dragon_gamma',name:'モルグラム',no:31,dexNo:40,type:'grass',map:'forest',level:94,powers:[82,66,100],forms:['wing','roar','beam']}
];
for (const row of replacements) {
  const mon = contract.monsters.find(value=>value.id===row.id);
  assert.equal(mon.name,row.name);
  assert.equal(mon.no,row.no);
  assert.equal(mon.dexNo,row.dexNo);
  assert.equal(mon.rarity,'★★★★');
  assert.deepEqual([...mon.types],[row.type]);
  assert.equal(mon.huntLevels.hard,row.level);
  context.replacementRow=row;
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(MAPS.filter(map=>map.enemyIds?.includes(replacementRow.id)).map(map=>map.id))',context)),[row.map]);
  const ids=mon.moves.map(move=>move[8]);
  assert.deepEqual([...ids],[1,2,3].map(n=>`skill_${row.id}_0${n}`));
  assert.deepEqual(mon.moves.map(move=>move[1]).join(','),row.powers.join(','));
  assert.deepEqual(mon.moves.map(move=>move[2]).join(','),'light,normal,light');
  context.replacementIds=ids;
  const detail=JSON.parse(vm.runInContext(`JSON.stringify(replacementIds.map(id=>({
    allowed:isEquippedSkillUsableForMonster(id,by(replacementRow.id)),
    form:skillBattleMotionForMove(skillToMove(id)).form
  })))`,context));
  assert.deepEqual(detail.map(value=>value.allowed),[false,true,false]);
  assert.deepEqual(detail.map(value=>value.form),row.forms);
  const legacy=JSON.parse(vm.runInContext('JSON.stringify(by(replacementRow.id).moves.map(legacySkillIdFromMove))',context));
  for (const useLegacy of [false,true]) {
    const savedIds=useLegacy?legacy:[...ids];
    const fixture={schemaVersion:4,saveMeta:{migrations:['equipped_skill_cards_v1']},
      instances:[{uid:'replacement-owned',id:row.id,level:50,exp:123,locked:true}],
      party:['replacement-owned'],caught:[row.id],levels:{[row.id]:50},exp:{[row.id]:123},
      skillCards:Object.fromEntries(savedIds.map(id=>[id,3])),equippedSkills:{'replacement-owned':savedIds},coins:789};
    context.replacementRaw=JSON.stringify(fixture);
    vm.runInContext('save=parseAndPrepareSave(replacementRaw,[])',context);
    // Save parsing itself retains all three slots; skills initialization applies rules.
    assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(save.equippedSkills['replacement-owned'])",context)),[...ids]);
    vm.runInContext('migrateSkillSystem()',context);
    const actual=JSON.parse(vm.runInContext('JSON.stringify(save)',context));
    assert.deepEqual(actual.instances[0],fixture.instances[0]);
    assert.deepEqual(actual.party,fixture.party);
    assert.ok(actual.caught.includes(row.id));
    assert.equal(actual.coins,789);
    assert.equal(actual.quarantine.unknownInstances.length,0);
    assert.deepEqual(actual.equippedSkills['replacement-owned'],[ids[1]],'off-type light skills are unequipped, not deleted from inventory');
    for (const id of ids) assert.equal(actual.skillCards[id],3);
    vm.runInContext('save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem()',context);
    const reloaded=JSON.parse(vm.runInContext('JSON.stringify(save)',context));
    assert.deepEqual(reloaded.instances,actual.instances);
    assert.deepEqual(reloaded.party,actual.party);
    assert.deepEqual(reloaded.equippedSkills,actual.equippedSkills);
    assert.deepEqual(reloaded.skillCards,actual.skillCards);
  }
}
console.log('Beta/Gamma replacement passed: stable ownership/UID/no/dexNo, six fixed and legacy skill IDs, card inventory, equip boundary, save reload, habitats and motions.');
