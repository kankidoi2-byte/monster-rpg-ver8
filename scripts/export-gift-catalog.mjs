// Explicit source ref prevents unreviewed working-tree IDs entering the distribution catalog.
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const ref=process.argv[2];
if(!ref)throw Error('Usage: node scripts/export-gift-catalog.mjs <published-game-source-commit> [output.json]');
const sourceCommit=execFileSync('git',['rev-parse',`${ref}^{commit}`],{encoding:'utf8'}).trim();
const c=vm.createContext({console,Math});
for(const path of ['js/data.js','js/core.js'])vm.runInContext(execFileSync('git',['show',`${sourceCommit}:${path}`],{encoding:'utf8'}),c,{filename:path});
const catalog=JSON.parse(vm.runInContext(`JSON.stringify({schemaVersion:1,sourceCommit:${JSON.stringify(sourceCommit)},maxLevel:MAX_LEVEL,rewards:[
 {kind:'coins',name:'コイン'},
 ...Object.values(ITEM_DEX_BY_ID).map(x=>({kind:'item',id:x.id,name:x.name})),
 ...M.map(x=>({kind:isCharacterUnit(x)?'character':'monster',id:x.id,name:x.name,rarity:x.rarity,maxLevel:MAX_LEVEL})),
 ...Object.values(SKILL_BY_ID).filter(x=>!x.deprecated).map(x=>({kind:'skill',id:x.id,name:x.name}))
]})`,c));
const keys=new Set();for(const r of catalog.rewards){const key=r.kind+':'+(r.id||'');if(keys.has(key)||!r.name)throw Error('Invalid catalog '+key);keys.add(key);}
const output=process.argv[3]||'data/gift-catalog.json';fs.mkdirSync(output.slice(0,output.lastIndexOf('/'))||'.',{recursive:true});fs.writeFileSync(output,JSON.stringify(catalog,null,2)+'\n');
console.log(`Exported ${catalog.rewards.length} reward choices from ${sourceCommit} to ${output}`);
