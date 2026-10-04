// Current-only bounded comparison: Vera has no prior production counterpart.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {battleRunner} from '../tools/balance-audit/battles.mjs';
import {files} from '../tools/balance-audit/runtime.mjs';
const runner=battleRunner(),r=runner.r;
const policy=/const policy=`([\s\S]*?)`;/.exec(fs.readFileSync('scripts/analyze-character-tactical-balance.mjs','utf8'))[1];
r.run(policy);
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const hashes=Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(`js/${f}.js`,'utf8'))]));
const encounters=[['grassland','normal','slime_gold'],['forest','normal','thornbeat'],['lake','normal','aquaron'],['grassland','hard','proto_icegolem'],['starsea','extreme','doom_nemesion']];
const groups=[{level:3,vera:'character_vera_3',peers:['character_roden_3','character_regus_3','character_brigitte_3']},{level:10,vera:'character_vera_4',peers:['character_roden_4','character_regus_4','character_tobia_4']},{level:25,vera:'character_vera_5',peers:['character_roden_4','character_regus_4','elna_kaen']},{level:30,vera:'character_vera_5',peers:['character_roden_4','character_regus_4','elna_kaen']}];
const cases=[],seed=20261004,trials=8;
for(const group of groups){
 const mon=r.run(`by('${group.vera}')`),own=mon.moves.map(m=>m[8]);
 const builds=[{id:group.vera,build:'own',equipped:own},{id:group.vera,build:'inherited',equipped:group.vera.endsWith('_3')?own:[own[0],'skill_character_vera_3_03',own[2]]},{id:group.vera,build:'common-poison',equipped:[own[0],'skill_character_common_poison','skill_character_common_debuff']},...group.peers.map(id=>({id,build:'own'}))];
 for(const build of builds){
  if(build.equipped){r.context.ids=build.equipped;r.context.unit=build.id;r.context.lv=group.level;
   const cost=r.run('ids.reduce((sum,id)=>sum+SKILL_BY_ID[id].cost,0)');
   if(cost>r.run('skillCostLimitFor(by(unit),{level:lv})'))build.equipped=build.equipped.slice(0,2);
   assert(r.run('ids.every(id=>isSkillAllowedForMonster(id,by(unit)))'));
  }
  for(const [map,difficulty,enemy] of encounters){const outcomes=[];
   for(let i=0;i<trials;i++)outcomes.push(await runner.battle({party:[build.id],level:group.level,map,difficulty,enemy,equipped:build.equipped?[build.equipped]:undefined,cap:120,policy:'tactical'},seed+i));
   cases.push({unit:build.id,build:build.build,equipped:build.equipped??r.run(`by('${build.id}').moves.map(m=>m[8])`),level:group.level,map,difficulty,enemy,n:trials,wins:outcomes.filter(x=>x.outcome==='victory').length,capped:outcomes.filter(x=>x.outcome==='capped').length,meanTurns:outcomes.reduce((s,x)=>s+x.turns,0)/trials,outcomes});
  }
 }
}
// Multi-enemy processing is exercised separately from paired single-enemy cases.
for(const mode of ['three_way','invasion_pending'])for(const id of ['character_vera_3','character_vera_4','character_vera_5']){
 const outcomes=[];for(let i=0;i<trials;i++)outcomes.push(await runner.battle({party:[id],level:30,map:'grassland',difficulty:'normal',enemy:'slime_gold',mode,second:'thornbeat',invasionTurn:2,cap:120,policy:'tactical'},seed+i));
 cases.push({unit:id,build:'own-multi',level:30,mode,n:trials,wins:outcomes.filter(x=>x.outcome==='victory').length,capped:outcomes.filter(x=>x.outcome==='capped').length,outcomes});
}
for(const [f,hash] of Object.entries(hashes))assert.equal(sha(fs.readFileSync(`js/${f}.js`,'utf8')),hash,'stable source during audit');
const report={metadata:{generatedAt:new Date().toISOString(),baseCommit:'ecc9d97621fb405d341071b75938e03db43c76df',workingHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:hashes,seed,trials,turnCap:120,battles:cases.reduce((s,c)=>s+c.n,0)},limitations:['Eight seeds per case, heuristic policy; not optimal-play proof or population win-rate estimate.','No items, links or voluntary switching. Newly drawn final form and explicitly built inherited/common loadouts are compared separately.','Existing peers are primarily four-star. Vera five-star is intended to exceed ordinary four-star output and costs a later evolution.','Extreme enemy retains actual Lv100; player Lv25/30 is a stress test, not a normal story-clear gate.','No new overheating/weapon-switch mechanic or undocumented flight dodge is modeled.'],cases};
fs.writeFileSync('docs/vera-balance.json',JSON.stringify(report,null,2)+'\n');
const aggregate=(id,level)=>{const cs=cases.filter(c=>c.unit===id&&c.level===level&&c.build==='own'&&c.difficulty==='normal');return {wins:cs.reduce((s,c)=>s+c.wins,0),n:cs.reduce((s,c)=>s+c.n,0)};};
console.log(JSON.stringify({battles:report.metadata.battles,summary:groups.map(g=>({level:g.level,vera:g.vera,...aggregate(g.vera,g.level),peers:g.peers.map(id=>({id,...aggregate(id,g.level)}))})),veraBoss:cases.filter(c=>c.unit.startsWith('character_vera_')&&c.difficulty==='extreme').map(({unit,level,build,wins,n,capped})=>({unit,level,build,wins,n,capped}))},null,2));
