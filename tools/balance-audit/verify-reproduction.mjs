// Hash decoded gzip payloads and parsed JSON, excluding container/formatting differences.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const out=new URL('../../docs/balance-audit/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('reproduction-manifest.json',out),'utf8'));
const all=process.argv.includes('--generated');
let checked=0;
for(const row of manifest.files){
 if(!row.retained&&!all)continue;
 let bytes=fs.readFileSync(new URL(row.name,out));
 if(row.kind==='gzip-payload')bytes=gunzipSync(bytes);
 if(row.kind==='json')bytes=Buffer.from(JSON.stringify(JSON.parse(bytes)));
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256,row.name);
 checked++;
}
console.log(`PASS: ${checked} reproduction hashes (${all?'including regenerated raw artifacts':'retained aggregates'}); baseline ${manifest.source}; ${manifest.totalBattleTrials} battles.`);
