// 720px battle idle motion release: every registered video is either the approved 720px encode
// or explicitly listed as already small enough. Previous files are retained for cached clients.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(p,'utf8');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest=JSON.parse(read('docs/motion-compression-720-20261011/manifest.json'));
const media=vm.runInNewContext(read('js/battle-idle-media.js').split('// 5s')[0]+';BATTLE_IDLE_MEDIA');
const catalog=vm.runInNewContext(read('tools/motion-review/catalog-data.generated.js')+';MOTION_CATALOG');
assert.match(read('index.html'),/battle-idle-media\.js\?v=[^"]*motion-720-20261011"/,'cache revision');
const ids=Object.keys(media);
assert.equal(ids.length,50);
assert.equal(manifest.entries.length+manifest.unchanged.length,50);
assert.deepEqual([...manifest.entries.map(e=>e.id),...manifest.unchanged].sort(),[...ids].sort());
let before=0,after=0;
for(const e of manifest.entries){
 const m=media[e.id];
 assert.equal(m.src,e.src,e.id);assert.notEqual(e.src,e.previous);
 assert.match(e.src,/^images\/monsters\/motion\/[a-z0-9_]+_720_alpha\.webm$/);
 assert.ok(fs.existsSync(e.previous),'previous asset retained '+e.previous);
 assert.ok(fs.existsSync(e.encodedFrom),'encode source retained '+e.encodedFrom);
 assert.equal(sha(e.src),e.sha256,e.id);assert.equal(sha(e.encodedFrom),e.encodedFromSha256,e.id);
 assert.equal(fs.statSync(e.src).size,e.bytes);assert.equal(fs.statSync(e.previous).size,e.previousBytes);
 assert.ok(e.bytes<e.previousBytes,e.id+' smaller');
 assert.equal(e.width,720);assert.equal(e.height,720);assert.equal(e.frames,240);assert.equal(e.fps,30);assert.equal(e.duration,8);
 // Layout stays in the original logical coordinates; object-fit:contain scales the decoded frame.
 assert.equal(m.sourceBounds.width,e.logicalSourceBounds.width);assert.equal(m.sourceBounds.height,e.logicalSourceBounds.height);
 assert.equal(m.sourceBounds.width,m.sourceBounds.height,'square source keeps aspect');
 assert.ok(fs.existsSync(m.poster),'poster '+e.id);
 const row=catalog.rows.find(r=>r.id===e.id);assert.equal(row.motion.src,e.src);assert.equal(row.fingerprint,e.sha256);
 before+=e.previousBytes;after+=e.bytes;
}
for(const id of manifest.unchanged)assert.ok(!/_720_alpha\.webm$/.test(media[id].src)&&fs.existsSync(media[id].src),id);
assert.equal(before,manifest.previousTotalBytes);assert.equal(after,manifest.totalBytes);
assert.ok(after<before*0.6,'meaningful size reduction');
console.log(`motion 720 compression: ${manifest.entries.length} encodes, ${manifest.unchanged.length} unchanged, ${before} -> ${after} bytes (${(after/before*100).toFixed(1)}%) PASS`);
