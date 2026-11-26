import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const checker = fileURLToPath(new URL('./check-image-sizes.mjs', import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'image-size-budgets-'));
const video = 'images/monsters/motion/fixture_alpha.webm';
const poster = 'images/monsters/motion/fixture_static.webp';
const unused = 'images/monsters/motion/unused_original.webm';
const unusedBytes = 8 * 1024 * 1024 + 1;
let cases = 0;

function writeSizedFile(relativePath, bytes) {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const fd = fs.openSync(absolutePath, 'w');
  try {
    fs.ftruncateSync(fd, bytes);
  } finally {
    fs.closeSync(fd);
  }
}

function writeRegistry(extra = '') {
  fs.writeFileSync(path.join(root, 'js/battle-idle-media.js'), `
// src: 'images/monsters/motion/comment_only.webm'
const example = "poster: 'images/monsters/motion/string_only.webp'";
const BATTLE_IDLE_MEDIA = Object.freeze({
  fixture: Object.freeze({ src: '${video}', poster: '${poster}' })${extra}
});
// 5s of eligible foreground waiting, not wall time spent on another screen.
throw new Error('The image checker must not execute battle runtime code');
`);
}

function runCheck(expectedStatus, label, expectedError = '') {
  const result = spawnSync(process.execPath, [checker, root], { encoding: 'utf8' });
  assert.ifError(result.error);
  assert.equal(result.signal, null, label);
  assert.equal(result.status, expectedStatus, `${label}\n${result.stdout}\n${result.stderr}`);
  if (expectedStatus === 0) {
    assert.match(result.stdout, /Image size validation passed \(\d+ files, \d+ total bytes, 0 legacy warning\(s\)\)\./, label);
  } else {
    assert.match(result.stderr, /Image size validation failed:\n- /, label);
    assert.ok(result.stderr.includes(expectedError), `${label}\n${result.stderr}`);
  }
  cases += 1;
  console.log(`PASS ${label}`);
  return result;
}

try {
  for (const directory of ['images/monsters/motion', 'images/items', 'images/maps', 'images/ui',
    'images/tutorial/characters', 'js']) {
    fs.mkdirSync(path.join(root, directory), { recursive: true });
  }
  const boundaries = [
    ['monsters', 'images/monsters/fixture.webp', 614400],
    ['items', 'images/items/fixture.webp', 307200],
    ['maps', 'images/maps/fixture.webp', 716800],
    ['ui', 'images/ui/fixture.webp', 102400],
    ['battle videos', video, 4194304],
    ['battle posters', poster, 614400],
    ['tutorial PNG', 'images/tutorial/characters/fixture.png', 716800],
    ['tutorial WebP', 'images/tutorial/characters/fixture.webp', 716800]
  ];
  for (const [, relativePath] of boundaries) writeSizedFile(relativePath, 1);
  writeRegistry();
  writeSizedFile(unused, unusedBytes);
  writeSizedFile('images/tutorial/characters/metadata.json', 716801);
  writeSizedFile('images/tutorial/characters/README.md', 716801);

  const baseline = runCheck(0, 'unused originals, tutorial metadata, and registry decoys do not fail');
  assert.ok(baseline.stdout.includes('battle videos: 1 files, battle posters: 1 files, tutorial characters: 2 files'));
  assert.ok(baseline.stdout.includes(`Unused motion originals (not size-limited): 1 files, ${unusedBytes} total bytes.`));

  for (const [category, relativePath, limit] of boundaries) {
    writeSizedFile(relativePath, limit);
    runCheck(0, `${category}: exactly ${limit} bytes passes`);
    writeSizedFile(relativePath, limit + 1);
    const result = runCheck(1, `${category}: ${limit + 1} bytes fails`, relativePath);
    assert.ok(result.stderr.includes(`budget is ${limit} bytes`), result.stderr);
    writeSizedFile(relativePath, 1);
  }

  for (const relativePath of [video, poster]) {
    fs.unlinkSync(path.join(root, relativePath));
    runCheck(1, `missing registered file fails: ${relativePath}`, `Registered media file is missing: ${relativePath}`);
    writeSizedFile(relativePath, 1);
  }

  const newVideo = 'images/monsters/motion/new_entry.webm';
  const newPoster = 'images/monsters/motion/new_entry.webp';
  writeRegistry(`, newlyRegistered: { "src": "${newVideo}", "poster": "${newPoster}" }`);
  const missing = runCheck(1, 'new registry references are automatically checked', `Registered media file is missing: ${newVideo}`);
  assert.ok(missing.stderr.includes(`Registered media file is missing: ${newPoster}`), missing.stderr);
  writeSizedFile(newVideo, 4194305);
  writeSizedFile(newPoster, 614401);
  const oversized = runCheck(1, 'newly registered video and poster receive their budgets', newVideo);
  assert.ok(oversized.stderr.includes(`${newPoster} is 614401 bytes`), oversized.stderr);
  writeSizedFile(newVideo, 1);
  writeSizedFile(newPoster, 1);
  const added = runCheck(0, 'new in-budget references pass without checker edits');
  assert.ok(added.stdout.includes('battle videos: 2 files, battle posters: 2 files'));
  assert.ok(added.stdout.includes(`Unused motion originals (not size-limited): 1 files, ${unusedBytes} total bytes.`));
  assert.equal(fs.statSync(path.join(root, unused)).size, unusedBytes, 'unused original is unchanged');

  const motionDirectory = path.join(root, 'images/monsters/motion');
  fs.renameSync(motionDirectory, `${motionDirectory}-backup`);
  runCheck(1, 'missing motion directory reports missing registrations', `Registered media file is missing: ${video}`);
  fs.renameSync(`${motionDirectory}-backup`, motionDirectory);

  fs.unlinkSync(path.join(root, 'js/battle-idle-media.js'));
  runCheck(1, 'missing registry fails closed', 'Cannot read battle idle media registry:');
  writeRegistry();
  fs.writeFileSync(path.join(root, 'js/battle-idle-media.js'), 'const BATTLE_IDLE_MEDIA = {};');
  runCheck(1, 'unrecognized registry boundary fails closed', 'battle idle registry boundary was not found');

  console.log(`Image size budget regression passed (${cases} cases).`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
