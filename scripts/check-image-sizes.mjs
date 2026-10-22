import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// An optional repository root lets the regression test use disposable fixtures.
const root = path.resolve(process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const kib = 1024;
const budgets = {
  monsters: 600 * kib,
  items: 300 * kib,
  maps: 700 * kib,
  ui: 100 * kib
};

// Keep this map available only for assets that genuinely cannot meet the budgets.
const legacyAllowlist = new Map();

const allowedExtensions = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif']);
const errors = [];
const warnings = [];
let checked = 0;
let totalBytes = 0;

for (const [category, budget] of Object.entries(budgets)) {
  const directory = path.join(root, 'images', category);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const extension = path.extname(entry.name).toLowerCase();
    const relativePath = path.posix.join('images', category, entry.name);
    if (!allowedExtensions.has(extension)) {
      errors.push(`${relativePath} has unsupported image extension ${extension || '(none)'}`);
      continue;
    }

    const bytes = fs.statSync(path.join(directory, entry.name)).size;
    checked += 1;
    totalBytes += bytes;

    const legacyLimit = legacyAllowlist.get(relativePath);
    if (legacyLimit !== undefined) {
      if (bytes > legacyLimit) {
        errors.push(`${relativePath} grew from its legacy ceiling of ${legacyLimit} bytes to ${bytes} bytes`);
      } else if (bytes > budget) {
        warnings.push(`${relativePath} is a legacy oversized asset (${bytes} bytes; budget ${budget} bytes)`);
      }
    } else if (bytes > budget) {
      errors.push(`${relativePath} is ${bytes} bytes; ${category} budget is ${budget} bytes`);
    }
  }
}

for (const legacyPath of legacyAllowlist.keys()) {
  if (!fs.existsSync(path.join(root, legacyPath))) {
    errors.push(`Legacy image budget entry no longer has a matching file: ${legacyPath}`);
  }
}

const motionDirectory = 'images/monsters/motion';
const additionalCategories = [
  { name: 'battle videos', field: 'src', extension: '.webm', budget: 4 * 1024 * kib, files: new Set() },
  { name: 'battle posters', field: 'poster', extension: '.webp', budget: 600 * kib, files: new Set() },
  { name: 'tutorial characters', budget: 700 * kib, files: new Set() }
];

function readDirectory(relativePath) {
  try {
    return fs.readdirSync(path.join(root, relativePath), { withFileTypes: true });
  } catch (error) {
    errors.push(`Cannot read image directory ${relativePath}: ${error.message}`);
    return [];
  }
}

try {
  const registryPath = 'js/battle-idle-media.js';
  const source = fs.readFileSync(path.join(root, registryPath), 'utf8');
  // Use the same data-only boundary as test-motion-720-compression.mjs; never run the DOM code.
  const boundary = source.indexOf('// 5s');
  if (boundary === -1) throw new Error('battle idle registry boundary was not found');
  const media = vm.runInNewContext(`${source.slice(0, boundary)};BATTLE_IDLE_MEDIA`, {}, { timeout: 1000 });
  for (const entry of Object.values(media)) {
    for (const category of additionalCategories.filter(category => category.field)) {
      const relativePath = entry[category.field];
      if (typeof relativePath === 'string' && path.posix.dirname(relativePath) === motionDirectory &&
          path.posix.extname(relativePath).toLowerCase() === category.extension) {
        category.files.add(relativePath);
      }
    }
  }
} catch (error) {
  errors.push(`Cannot read battle idle media registry: ${error.message}`);
}

const tutorialDirectory = 'images/tutorial/characters';
for (const entry of readDirectory(tutorialDirectory)) {
  if (entry.isFile() && ['.png', '.webp'].includes(path.extname(entry.name).toLowerCase())) {
    additionalCategories[2].files.add(path.posix.join(tutorialDirectory, entry.name));
  }
}

const categoryCounts = [];
for (const category of additionalCategories) {
  let count = 0;
  for (const relativePath of category.files) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      errors.push(`Registered media file is missing: ${relativePath}`);
      continue;
    }
    const bytes = fs.statSync(absolutePath).size;
    checked += 1;
    totalBytes += bytes;
    count += 1;
    if (bytes > category.budget) {
      errors.push(`${relativePath} is ${bytes} bytes; ${category.name} budget is ${category.budget} bytes`);
    }
  }
  categoryCounts.push(`${category.name}: ${count} files`);
}
console.log(`Additional image categories checked (${categoryCounts.join(', ')}).`);

// Retain unused originals for review tools and tests, without applying the game's size budget.
let unusedMotionCount = 0;
let unusedMotionBytes = 0;
for (const entry of readDirectory(motionDirectory)) {
  const relativePath = path.posix.join(motionDirectory, entry.name);
  if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.webm' ||
      additionalCategories[0].files.has(relativePath)) continue;
  unusedMotionCount += 1;
  unusedMotionBytes += fs.statSync(path.join(root, relativePath)).size;
}
console.log(`Unused motion originals (not size-limited): ${unusedMotionCount} files, ${unusedMotionBytes} total bytes.`);

for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (errors.length) {
  console.error('Image size validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Image size validation passed (${checked} files, ${totalBytes} total bytes, ${warnings.length} legacy warning(s)).`);
