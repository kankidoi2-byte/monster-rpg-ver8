import fs from 'node:fs';import {execFileSync} from 'node:child_process';
for(const f of ['js/data.js','js/core.js','js/battle-view.js','css/ui-redesign.css']){const dest=`review-baseline/${f}`;fs.mkdirSync(dest.slice(0,dest.lastIndexOf('/')),{recursive:true});fs.writeFileSync(dest,execFileSync('git',['show',`282f774d00e240c599f8542843d7f27a65a49cec:${f}`],{encoding:'utf8'}));}
console.log('Prepared comparison baseline from reviewed main');
