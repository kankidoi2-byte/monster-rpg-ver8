import fs from 'node:fs';
import {runtime,seeded} from './runtime.mjs';
process.env.AUDIT_REF ||= '4ad50548f3dd9e5803cb7f2308c8df2e2d3c6f1a';
const geo=p=>({p,mean:1/p,p50:Math.ceil(Math.log(.5)/Math.log1p(-p)),p95:Math.ceil(Math.log(.05)/Math.log1p(-p))});
const rows=[];
for(const [label,patch] of [['before',{}],['cost6_weight_1',{'skill-gacha':s=>{if(!s.includes('6:0.5'))throw Error('changed anchor');return s.replace('6:0.5','6:1')}}]]){
 const r=runtime(patch);r.context.Math.random=seeded(20260908);
 const tiers=r.run(`skillGachaRates('monster').map(t=>({cost:t.cost,rate:t.rate,n:t.cards.length}))`);
 const target=tiers.find(t=>t.cost===6),p=target.rate/target.n;
 const pBatch=1-(1-p)**10+tiers[0].rate**10*(p/(1-tiers[0].rate));
 const counts=r.run(`(()=>{let a={};for(let i=0;i<200000;i++){const c=pickSkillGachaCard('monster');a[c.cost]=(a[c.cost]||0)+1;}return a})()`);
 rows.push({label,tiers,single:geo(p),tenBatches:geo(pBatch),tenMeanCoins:900/pBatch,tenP95Coins:900*geo(pBatch).p95,samples:200000,counts});
}
fs.writeFileSync(new URL('../../docs/balance-audit/acquisition-candidates.json',import.meta.url),JSON.stringify({seed:20260908,source:process.env.AUDIT_REF,rows},null,2)+'\n');console.log(rows.map(x=>({label:x.label,p50:x.single.p50,p95:x.single.p95,p95Coins:x.tenP95Coins})));
