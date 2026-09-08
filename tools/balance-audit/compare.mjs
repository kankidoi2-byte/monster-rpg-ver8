import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {battleRunner} from './battles.mjs';
import {runtime,seeded} from './runtime.mjs';
import {multiFix,poisonHalf,distanceParity,expSlopeHalf} from './candidates.mjs';
process.env.AUDIT_REF ||= '4ad50548f3dd9e5803cb7f2308c8df2e2d3c6f1a';
const seed=20260908,n=500,out=new URL('../../docs/balance-audit/',import.meta.url);
const r=runtime(),run=r.run;
const mean=x=>x.reduce((a,b)=>a+b,0)/x.length;
const ci=(k,n)=>{const z=1.96,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [c-h,c+h]};
const stats=rows=>({winCI95:ci(rows.filter(x=>x.outcome==='victory').length,rows.length),n:rows.length,winRate:mean(rows.map(x=>+(x.outcome==='victory'))),capped:rows.filter(x=>x.outcome==='capped').length,turns:mean(rows.map(x=>x.turns)),coinsPerAttempt:mean(rows.map(x=>x.coins)),expPerAttempt:mean(rows.map(x=>x.exp))});
const b=battleRunner(),fixed=battleRunner({'multi-battle':multiFix}),poison=battleRunner({'data':poisonHalf});
const comparisons=[],rawComparisons=[];
for(const level of [10,30])for(const first of ['slime','seralphia']){const c={party:['freiwolf','highaquaron','granbeat'],level,map:'grassland',enemy:first,second:first==='slime'?'seralphia':'slime',difficulty:'normal',mode:'three_way',policy:'damage'};const a=[],z=[];for(let i=0;i<n;i++){a.push(await b.battle(c,seed+i));z.push(await fixed.battle(c,seed+i));}rawComparisons.push({config:c,before:a,after:z});comparisons.push({proposal:'multi species level bugfix',config:c,before:stats(a),after:stats(z)});}
const needle=run(`MONSTER_MOVE_CARDS.find(c=>c.id==='skill_grassbeat_04')`);
assert(run(`isSkillAllowedForMonster('skill_grassbeat_04',by('seralphia'))`));
for(const level of [30,60,100]){const base={party:['seralphia','granbeat','highaquaron'],level,map:'starsea',enemy:'doom_nemesion',difficulty:'extreme',mode:'single',policy:'tactical'};const natural=run(`defaultSkillIdsForMonster(by('seralphia'),{id:'seralphia',level:${level}})`);const c={...base,equipped:[[needle.id,...natural.slice(0,2)]],acquisition:'extra poison needle card required; monster gacha COST1 pool; conditional crisis encounter'};const a=[],z=[],na=[];for(let i=0;i<n;i++){a.push(await b.battle(c,seed+i));z.push(await poison.battle(c,seed+i));na.push(await b.battle(base,seed+i));}rawComparisons.push({config:c,withoutNeedle:na,before:a,after:z});comparisons.push({proposal:'poison 10% to 5% (experimental, not recommended globally)',config:c,withoutNeedle:stats(na),before:stats(a),after:stats(z)});}
// Same seeded rewards for short/medium/long, including integer rounding and great success.
const exped=[];for(const grade of ['D','S'])for(const distance of ['short','medium','long']){const rows=[];for(const [label,rt] of [['before',r],['after',runtime({expedition:distanceParity})]]){rt.context.Math.random=seeded(seed);const row=rt.run(`(()=>{let coins=0,exp=0;const d=EXPEDITION_DISTANCES['${distance}'],s={grade:'${grade}',total:250,greatRate:EXPEDITION_GREAT_RATES['${grade}'],reasons:[]};for(let i=0;i<10000;i++){const x=expeditionRewardPlan(MAPS[0],d,s);coins+=x.coins;exp+=x.exp;}return {coinsPerWin:coins/10000/d.wins,expPerWin:exp/10000/d.wins}})()`);rows.push({label,...row});}exped.push({grade,distance,rows});}
const exp=runtime({core:expSlopeHalf});const growth=[10,30,60,100].map(l=>({level:l,before:run(`Array.from({length:${l}-1},(_,i)=>needExp(i+1)).reduce((a,b)=>a+b,0)`),after:exp.run(`Array.from({length:${l}-1},(_,i)=>needExp(i+1)).reduce((a,b)=>a+b,0)`)}));
// Exact engine reproduction of poison attribution and request-level preservation.
const repro=[];for(const [label,rt] of [['before',r],['after',runtime({'multi-battle':multiFix})]]){repro.push({label,...rt.run(`(()=>{activeHuntRequest=createHuntRequest(MAPS[0],by('slime'),'normal',[]);enemy=by('slime');eHp=1;eStatus='poison';ePoisonTurns=2;const extra=createMultiEnemy(by('seralphia'),'enemy_b');const existing=createExistingMultiEnemy();return {extraLevel:extra.level,extraHP:extra.maxHp,poisonCredit:existing.poisonSourceIsPlayer}})()`)});}
// Healing and offensive stats do not scale identically for enemies and players; collect, do not call it a bug.
const mechanics=run(`({limits:[1,3,10,30,100].map(level=>({level,skillCost:skillCostLimitFor(by('slime'),{level}),hp:maxHp(by('slime'),level),speed:monSpd(by('slime'),{level})})),link:M.filter(m=>m.entityKind==='monster').map(m=>({id:m.id,rarity:m.rarity.length,...resolveKokoroLink(m,{uid:m.id,level:1},{maxHp:500,speed:100}).effects})),unobtainableCharacters:M.filter(isCharacterUnit).filter(m=>!CHARACTER_GACHA_IDS.includes(m.id)).map(m=>m.id)})`);
fs.writeFileSync(new URL('comparison-trials.json.gz',out),gzipSync(JSON.stringify(rawComparisons)));
fs.writeFileSync(new URL('comparisons.json',out),JSON.stringify({metadata:{seed,n,source:process.env.AUDIT_REF},comparisons,exped,growth,repro,mechanics},null,2)+'\n');console.log(JSON.stringify({comparisons:comparisons.length,exped,growth,repro}));
