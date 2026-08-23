import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const notes = [];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function duplicates(values) {
  const seen = new Set();
  const repeated = new Set();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

function checkUnique(label, values) {
  const repeated = duplicates(values);
  if (repeated.length) fail(`${label} contains duplicates: ${repeated.join(', ')}`);
}

function checkAsset(label, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath) {
    fail(`${label} has no asset path`);
    return;
  }
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root + path.sep)) {
    fail(`${label} points outside the repository: ${relativePath}`);
  } else if (!fs.existsSync(resolved)) {
    fail(`${label} references a missing file: ${relativePath}`);
  }
}

for (const file of fs.readdirSync(path.join(root, 'js')).filter(file => file.endsWith('.js'))) {
  const relativePath = `js/${file}`;
  try {
    new vm.Script(read(relativePath), { filename: relativePath });
  } catch (error) {
    fail(`${relativePath} has invalid JavaScript syntax: ${error.message}`);
  }
}

const dataSource = read('js/data.js');
const context = {};
vm.createContext(context);
try {
  vm.runInContext(
    `${dataSource}\n;globalThis.__GAME_DATA__ = {
      IMG, MAPIMG, MAPS, M, FUSIONS, SHOP_ITEMS, ITEM_DEX_EXTRA, ITEM_IMG,
      ALCHEMY_MATERIAL_DROPS, ALCHEMY_ALL_FAILURE_CANDIDATES, ALCHEMY_RECIPES
    };`,
    context,
    { filename: 'js/data.js' }
  );
} catch (error) {
  fail(`js/data.js could not be evaluated: ${error.message}`);
}

const data = context.__GAME_DATA__;
if (data) {
  const monsterIds = data.M.map(monster => monster.id);
  const monsterIdSet = new Set(monsterIds);
  const itemRecords = [...data.SHOP_ITEMS, ...data.ITEM_DEX_EXTRA];
  const itemIds = itemRecords.map(item => item.id);
  const itemIdSet = new Set(itemIds);

  checkUnique('Monster IDs', monsterIds);
  checkUnique('Monster encyclopedia numbers', data.M.map(monster => monster.no));
  const characterRecords = data.M.filter(monster => monster.entityKind === 'character');
  checkUnique('Character encyclopedia numbers', characterRecords.map(character => character.characterNo));
  checkUnique('Map IDs', data.MAPS.map(map => map.id));
  checkUnique('Item IDs', itemIds);

  const allowedEntityKinds = new Set(['monster','character']);
  const requiredEligibilityKeys = ['contract','alchemyCatalyst','alchemySuccess','alchemyFailure'];
  const skillDefinitions = new Map();

  for (const monster of data.M) {
    if (!monster.id || !monster.name || !Number.isInteger(monster.no)) {
      fail(`Monster record is missing id, name, or integer no: ${JSON.stringify(monster)}`);
      continue;
    }
    if (!monster.imgKey || !data.IMG[monster.imgKey]) {
      fail(`Monster ${monster.id} has an unknown imgKey: ${monster.imgKey}`);
    } else {
      checkAsset(`Monster ${monster.id}`, data.IMG[monster.imgKey]);
    }
    if (!Array.isArray(monster.moves) || !monster.moves.length) {
      fail(`Monster ${monster.id} has no moves`);
    }
    if (!allowedEntityKinds.has(monster.entityKind)) {
      fail(`Entity ${monster.id} has an invalid entityKind: ${monster.entityKind}`);
    }
    if (!monster.eligibility || requiredEligibilityKeys.some(key => typeof monster.eligibility[key] !== 'boolean')) {
      fail(`Entity ${monster.id} requires boolean eligibility fields: ${requiredEligibilityKeys.join(', ')}`);
    }
    if (Array.isArray(monster.moves)) {
      monster.moves.forEach((move,index) => {
        const skillId = move?.[8];
        if (!/^skill_[a-z0-9_]+$/.test(skillId)) {
          fail(`Entity ${monster.id} move ${index + 1} has an invalid fixed skillId: ${skillId}`);
          return;
        }
        const definition = JSON.stringify(move.slice(0,8));
        if (skillDefinitions.has(skillId) && skillDefinitions.get(skillId) !== definition) {
          fail(`Fixed skillId ${skillId} is reused with a different move definition`);
        } else {
          skillDefinitions.set(skillId, definition);
        }
      });
    }
    if (monster.entityKind === 'character' && (!Number.isInteger(monster.characterNo) || monster.contractable !== false || monster.unitType !== 'character')) {
      fail(`Character ${monster.id} requires characterNo, legacy unitType:character, and contractable:false`);
    }
    if (monster.entityKind === 'character' && (monster.eligibility.contract || monster.eligibility.alchemyCatalyst || monster.eligibility.alchemySuccess || monster.eligibility.alchemyFailure)) {
      fail(`Character ${monster.id} cannot be contract or alchemy eligible`);
    }
    if (monster.entityKind === 'monster' && monster.eligibility.contract !== (monster.contractable !== false)) {
      fail(`Monster ${monster.id} contract eligibility conflicts with contractable`);
    }
    if (monster.alchemyExclusive === true && monster.eligibility.alchemySuccess !== true) {
      fail(`Alchemy-exclusive monster ${monster.id} must be success eligible`);
    }
    if (monster.evolution && !monsterIdSet.has(monster.evolution)) {
      fail(`Monster ${monster.id} evolves to unknown monster ${monster.evolution}`);
    }
    for (const evolution of monster.evolutions || []) {
      if (!monsterIdSet.has(evolution.to)) {
        fail(`Monster ${monster.id} evolves to unknown monster ${evolution.to}`);
      }
    }
    if (monster.dropItem && !itemIdSet.has(monster.dropItem)) {
      fail(`Monster ${monster.id} drops unknown item ${monster.dropItem}`);
    }
  }

  const expectedElnaCharacters = ['elna_beginner','elna_middle','elna_advanced','elna_water','elna_kaen'];
  const actualCharacterIds = characterRecords.map(character => character.id);
  if (actualCharacterIds.length !== expectedElnaCharacters.length || expectedElnaCharacters.some(id => !actualCharacterIds.includes(id))) {
    fail(`Elna-only character dex mismatch: ${actualCharacterIds.join(', ')}`);
  }

  for (const [key, imagePath] of Object.entries(data.IMG)) {
    checkAsset(`IMG.${key}`, imagePath);
  }
  for (const [key, imagePath] of Object.entries(data.MAPIMG)) {
    checkAsset(`MAPIMG.${key}`, imagePath);
  }

  for (const map of data.MAPS) {
    if (!map.image) fail(`Map ${map.id} has no image`);
    else checkAsset(`Map ${map.id}`, map.image);
    for (const enemyId of map.enemyIds || []) {
      if (!monsterIdSet.has(enemyId)) fail(`Map ${map.id} references unknown monster ${enemyId}`);
    }
  }

  for (const fusion of data.FUSIONS) {
    if (!monsterIdSet.has(fusion.from)) fail(`Fusion source is unknown: ${fusion.from}`);
    if (!monsterIdSet.has(fusion.to)) fail(`Fusion target is unknown: ${fusion.to}`);
    if (!itemIdSet.has(fusion.item)) fail(`Fusion item is unknown: ${fusion.item}`);
  }

  for (const [itemId, imagePath] of Object.entries(data.ITEM_IMG)) {
    if (!itemIdSet.has(itemId)) fail(`ITEM_IMG uses unknown item ID ${itemId}`);
    checkAsset(`Item ${itemId}`, imagePath);
  }

  for (const drop of data.ALCHEMY_MATERIAL_DROPS) {
    if (!itemIdSet.has(drop.id)) fail(`Alchemy drop uses unknown item ID ${drop.id}`);
  }
  for (const candidate of data.ALCHEMY_ALL_FAILURE_CANDIDATES) {
    if (!monsterIdSet.has(candidate.monsterId)) {
      fail(`Alchemy candidate uses unknown monster ID ${candidate.monsterId}`);
    } else if (!data.M.find(monster => monster.id === candidate.monsterId)?.eligibility?.alchemyFailure) {
      fail(`Alchemy failure candidate ${candidate.monsterId} is not failure eligible`);
    }
  }
  for (const recipe of data.ALCHEMY_RECIPES) {
    for (const choice of recipe.materialChoices || []) {
      for (const itemId of [choice.normal, choice.fine]) {
        if (!itemIdSet.has(itemId)) fail(`Alchemy recipe ${recipe.recipeId} uses unknown item ${itemId}`);
      }
    }
    for (const candidate of recipe.successCandidates || []) {
      if (!monsterIdSet.has(candidate.monsterId)) {
        fail(`Alchemy recipe ${recipe.recipeId} uses unknown monster ${candidate.monsterId}`);
      } else if (!data.M.find(monster => monster.id === candidate.monsterId)?.eligibility?.alchemySuccess) {
        fail(`Alchemy recipe ${recipe.recipeId} success candidate ${candidate.monsterId} is not success eligible`);
      }
    }
    for (const candidate of recipe.failureCandidates || []) {
      if (!monsterIdSet.has(candidate.monsterId)) {
        fail(`Alchemy recipe ${recipe.recipeId} uses unknown monster ${candidate.monsterId}`);
      } else if (!data.M.find(monster => monster.id === candidate.monsterId)?.eligibility?.alchemyFailure) {
        fail(`Alchemy recipe ${recipe.recipeId} failure candidate ${candidate.monsterId} is not failure eligible`);
      }
    }
  }

  const saveSource = read('js/save.js');
  const initialItemsMatch = saveSource.match(/items:\{([^}]*)\}/s);
  const initialItemIds = initialItemsMatch
    ? [...initialItemsMatch[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)].map(match => match[1])
    : [];
  const migratesItemsFromDefaults = /Object\.entries\(defaults\.items\)\.forEach/.test(saveSource);
  if (!initialItemsMatch) fail('Could not find initSave().items in js/save.js');
  if (!migratesItemsFromDefaults) fail('Could not find additive item migration from initSave defaults in js/save.js');

  for (const itemId of itemIds) {
    if (!initialItemIds.includes(itemId)) fail(`Item ${itemId} is missing from initSave().items`);
  }

  const primarySaveKey = saveSource.match(/const SAVE_KEY\s*=\s*['"]([^'"]+)['"]/ )?.[1];
  if (primarySaveKey !== 'mb_v95c') fail(`Unexpected primary save key: ${primarySaveKey || 'none'}`);

  notes.push(`${data.M.length} monsters`);
  notes.push(`${data.MAPS.length} maps`);
  notes.push(`${itemRecords.length} items`);
  notes.push(`${data.FUSIONS.length} fusions`);
  notes.push(`${data.ALCHEMY_RECIPES.length} alchemy recipes`);
  notes.push(`${skillDefinitions.size} fixed skills`);
}

if (errors.length) {
  console.error('Game data validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Game data validation passed (${notes.join(', ')}).`);
