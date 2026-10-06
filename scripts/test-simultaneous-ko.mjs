import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime({save:source=>source+'\nvar koActualSaveGame=saveGame;', 'world-map-flow':source=>source+'\nvar koActualWorldVictory=recordWorldMapVictory;'});
r.run('saveGame=koActualSaveGame;recordWorldMapVictory=koActualWorldVictory;');
vm.runInContext(fs.readFileSync(new URL('../js/contractor-rank.js',import.meta.url),'utf8'),r.context);
vm.runInContext(fs.readFileSync(new URL('./simultaneous-ko-fixture.js',import.meta.url),'utf8'),r.context);
let count=0;
for(const mode of ['single','multi','invasion'])for(const cause of ['player-recoil','enemy-recoil','poison'])for(const reserve of [false,true])for(const enemiesRemain of [false,true]){
 await r.run(`simultaneousKoScenario(${JSON.stringify({mode,cause,reserve,enemiesRemain})})`);count++;
}
for(const mode of ['single','multi','invasion'])for(const cause of ['victory','defeat','continue'])for(const reserve of [false,true]){
 await r.run(`simultaneousKoScenario(${JSON.stringify({mode,cause,reserve})})`);count++;
}
console.log(`PASS ${count} real-runtime scenarios: simultaneous KO, survival, reserve, rewards/progression once, attribution and save/reload`);
for(const mode of ['multi','invasion'])for(const reserve of [false,true])for(const poison of [false,true]){
 await r.run(`simultaneousKoEnemyAttribution(${JSON.stringify({mode,reserve,poison})})`);
}
console.log('PASS 8 additional actual enemy-vs-enemy attack/poison attribution cases (62 total)');
