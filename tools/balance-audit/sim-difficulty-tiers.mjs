const root=process.argv[2]||'.'; // リポジトリのパス
const {battleRunner}=await import(root+'/tools/balance-audit/battles.mjs');const {seeded}=await import(root+'/tools/balance-audit/runtime.mjs');

const b=battleRunner();const run=b.r.run;
// Deterministic matched samples use the production tuning table and request builder.
const TIERS=Object.fromEntries([1,2,3,4,5,6].map(t=>[t,run(`(()=>{const d=${t===6?'HUNT_OVERTIER.nushi':`HUNT_DIFFICULTIES.d${t}`};return {lv:d.levelRange,r:d.rarities};})()`)]));
run(`var tierLv=1,auditTier=1;const __cr=createHuntRequest;createHuntRequest=function(map,mon,d,c){const spec=auditTier===6?HUNT_OVERTIER.nushi:huntDifficulty('d'+auditTier);return __cr(map,mon,auditTier===6?'d5':'d'+auditTier,c,{allowOvertier:false,enemyLevel:tierLv,hpMultiplier:spec.hpMultiplier,attackMultiplier:spec.attackMultiplier});};`);
const pools={};
function pool(map,t){const key=map+t;if(pools[key])return pools[key];const ids=run(`[...new Set(['d1','d2','d3','d4','d5'].flatMap(d=>worldMapCandidates(MAPS.find(m=>m.id===${JSON.stringify(map)}),d).map(m=>m.id)))]`);const rar=Object.fromEntries(ids.map(id=>[id,run(`by(${JSON.stringify(id)}).rarity.length`)]));return pools[key]={ids:ids.filter(id=>TIERS[t].r.includes(rar[id])),rar};}
function levelFor(t,r,rnd){const [lo,hi]=TIERS[t].lv;return lo+Math.floor(rnd*(hi-lo+1));}
async function c(name,party,level,maps,t,n=40){let w=0,cnt=0;for(const map of maps){const p=pool(map,t);if(!p.ids.length)continue;for(let i=0;i<n;i++){const rnd=seeded(900+i);const enemy=p.ids[Math.floor(rnd()*p.ids.length)];run(`tierLv=${levelFor(t,p.rar[enemy],rnd())};auditTier=${t}`);const r=await b.battle({party,level,map,difficulty:'normal',enemy,mode:'single',conditions:[],policy:'damage'},4000+i);cnt++;if(r.outcome==='victory')w++;}}console.log(`${name}\t${Math.round(w/cnt*100)}%`);}
// 段階: 1〜5=難易度Ⅰ〜Ⅴ、6=ヌシ(HP×3・攻撃×1.8)
const M=['grassland','forest','highland_ruins','seikai_irie','lake'];
const S=['freigal','aquaron','grassbeat'],E=['freiwolf','highaquaron','thornbeat'],T=['voltax','granbeat','shenhairon'],F=['orca_abyss','voltax','granbeat'];
for(const lv of [1,3,6])await c(`Ⅰ 初期3体 Lv${lv}`,S,lv,M,1);
for(const lv of [6,12])await c(`Ⅱ 初期3体(未進化) Lv${lv}`,S,lv,M,2);
for(const lv of [14,18])await c(`Ⅱ ★2進化 Lv${lv}`,E,lv,M,2);
for(const lv of [18,25])await c(`Ⅲ ★2進化 Lv${lv}`,E,lv,M,3);
for(const lv of [32,40])await c(`Ⅳ ★2進化 Lv${lv}`,E,lv,M,4);
for(const lv of [32,40])await c(`Ⅳ ★3 Lv${lv}`,T,lv,M,4);
for(const lv of [46,53])await c(`Ⅴ ★3 Lv${lv}`,T,lv,M,5);
for(const lv of [60,70,80,100])await c(`ヌシ ★3 Lv${lv}`,T,lv,M,6);
for(const lv of [60,70,80])await c(`ヌシ ★3+★4 Lv${lv}`,F,lv,M,6);
