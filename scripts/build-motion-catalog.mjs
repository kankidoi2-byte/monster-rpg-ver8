import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(p,'utf8');
const game=vm.runInNewContext(read('js/data.js')+';({M,IMG})');
const media=vm.runInNewContext(read('js/battle-idle-media.js').split('// 5s')[0]+';BATTLE_IDLE_MEDIA');
const status=JSON.parse(read('docs/motion-prepublication/phase-a-species-status.json'));
const rows=status.entries.map(entry=>{
 const mon=game.M.find(m=>m.id===entry.id),motion=media[entry.id]||null;
 if(!mon)throw Error('Unknown monster '+entry.id);
 const art=game.IMG[mon.imgKey];if(!fs.existsSync(art))throw Error('Missing art '+art);
 const fingerprint=motion?crypto.createHash('sha256').update(fs.readFileSync(motion.src)).digest('hex'):null;
 if(motion&&!fs.existsSync(motion.poster))throw Error('Missing poster '+entry.id);
 return {id:mon.id,no:mon.dexNo,name:mon.name,art,motion,fingerprint,sourceState:entry.phase1Baseline.webmLocation==='あり'?'透過動画の所在記録あり':'透過動画の所在確認が残る'};
});
if(rows.length!==50||new Set(rows.map(r=>r.id)).size!==50)throw Error('Expected unique 50');
fs.writeFileSync('tools/motion-review/catalog-data.generated.js','const MOTION_CATALOG='+JSON.stringify({schema:1,rows},null,2)+';\n');
console.log(JSON.stringify({total:rows.length,registered:rows.filter(r=>r.motion).length}));
