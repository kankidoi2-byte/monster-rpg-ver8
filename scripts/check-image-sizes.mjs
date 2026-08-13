import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kib = 1024;
const budgets = {
  monsters: 600 * kib,
  items: 300 * kib,
  maps: 700 * kib
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

for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (errors.length) {
  console.error('Image size validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Image size validation passed (${checked} files, ${totalBytes} total bytes, ${warnings.length} legacy warning(s)).`);
