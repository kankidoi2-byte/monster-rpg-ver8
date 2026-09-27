// Read-only preflight. This does not decode video or prove browser playback/layout.
// Usage: node scripts/audit-gran-volmoog-registration.mjs /path/to/adopted-v18.webm
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
assert(process.argv[2], 'Supply the adopted v18 candidate bytes; do not substitute another species');
const bytes = fs.readFileSync(process.argv[2]);
const audit = JSON.parse(read('docs/motion-prepublication/gran-volmoog-alpha.json'));
const sha256 = createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256, audit.sha256);
assert.equal(bytes.length, audit.bytes);
const context = vm.createContext({});
vm.runInContext(read('js/data.js'), context);
const identity = vm.runInContext(`(() => {
  const matches = M.filter(m => m.id === 'gran_volmoog');
  const m = matches[0];
  return {count:matches.length,id:m.id,no:m.no,dexNo:m.dexNo,imgKey:m.imgKey,poster:IMG[m.imgKey]};
})()`, context);
assert.equal(identity.count, 1);
assert.equal(identity.no, 35);
assert.equal(identity.dexNo, 28);
assert.equal(identity.imgKey, 'gran_volmoog');
// Sparse checkouts may omit image bytes; verify the pinned Git tree, not local presence.
const posterTreeEntry = execFileSync('git', ['ls-tree', 'HEAD', '--', identity.poster], {cwd:root,encoding:'utf8'}).trim();
assert(posterTreeEntry.endsWith('\t' + identity.poster));
const media = read('js/battle-idle-media.js');
// Evaluate only the actual registry declaration, before lifecycle/global side effects.
const start = media.indexOf('const BATTLE_IDLE_MEDIA=');
const end = media.indexOf('\n// 5s', start);
assert(start >= 0 && end > start);
vm.runInContext(media.slice(start, end), context);
const registeredIds = vm.runInContext('Object.keys(BATTLE_IDLE_MEDIA)', context);
assert.deepEqual(Array.from(registeredIds), ['volmoog']);
assert(media.includes('battleIdleLimit=1'));
const html = read('tools/motion-review/asset-review.html');
const match = html.match(/gran_volmoog:\{src:'([^']+)'/);
assert(match, 'Candidate review route must be present');
assert.equal(match[1], '/motion-review-assets/gran_volmoog_v18.webm');
assert(!read('index.html').includes('tools/motion-review/asset-review.html'));
console.log(JSON.stringify({
  scope:'candidate bytes, current identity and static registration-route preflight only',
  result:'PASS', sha256, bytes:bytes.length, identity, posterTreeEntry,
  posterValidation:'tracked Git tree entry only; image rendering not tested',
  registeredIds:Array.from(registeredIds), defaultVideoLimit:1,
  candidateReviewRoute:match[1], normalRuntimeRegistration:'absent',
  routeReachability:'not tested; URL reference alone does not prove delivery',
  inheritedAlphaEvidence:{file:'gran-volmoog-alpha.json',frames:audit.frames,edgeTouchFrames:audit.edgeTouchFrames.length,remeasured:false},
  notVerified:['footing','anchor','facing and reflection in battle','full-loop battle occupancy and HUD gaps','HTTP MIME/Range','actual browser playback','Android quantitative performance'],
  publication:'forbidden'
}, null, 2));
