import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(p,'utf8');
for(const name of ['battle-idle-media','notices-data'])assert.ok(read('index.html').includes(name+'.js?v=')&&read('index.html').match(new RegExp(name+'\\.js\\?v=[^\"]*three-motion-20261011')), 'cache revision '+name);
const manifest=JSON.parse(read('docs/motion-compression-20261011/manifest.json'));
const media=vm.runInNewContext(read('js/battle-idle-media.js').split('// 5s')[0]+';BATTLE_IDLE_MEDIA');
const catalog=vm.runInNewContext(read('tools/motion-review/catalog-data.generated.js')+';MOTION_CATALOG');
assert.deepEqual(manifest.entries.map(e=>e.id).sort(),['elixion','kimeragna','slime']);
let oldTotal=0,newTotal=0;
for(const e of manifest.entries){
 assert.equal(media[e.id].src,e.src);assert.notEqual(e.src,e.original);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(e.src)).digest('hex'),e.sha256);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(e.original)).digest('hex'),e.originalSha256);
 assert.equal(fs.statSync(e.src).size,e.bytes);assert.equal(fs.statSync(e.original).size,e.originalBytes);assert.ok(e.bytes<e.originalBytes);
 assert.equal(e.duration,8);assert.equal(e.frames,240);assert.equal(e.fps,30);
 assert.equal(media[e.id].sourceBounds.width,e.width);assert.equal(media[e.id].sourceBounds.height,e.height);
 const row=catalog.rows.find(r=>r.id===e.id);assert.equal(row.motion.src,e.src);assert.equal(row.fingerprint,e.sha256);
 oldTotal+=e.originalBytes;newTotal+=e.bytes;
}
assert.equal(oldTotal,33448278);assert.equal(newTotal,21913615);
console.log(`three-motion compression: exact approved assets, retained originals, catalog fingerprints, ${oldTotal} -> ${newTotal} bytes PASS`);
