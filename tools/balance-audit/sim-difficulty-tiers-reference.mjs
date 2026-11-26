const root=process.argv[2]||'.'; // リポジトリのパス
const {battleRunner}=await import(root+'/tools/balance-audit/battles.mjs');const {seeded}=await import(root+'/tools/balance-audit/runtime.mjs');
const TIERS={1:{lv:[1,6],r:[1,2]},2:{lv:[6,18],r:[1,2,3]},3:{lv:[18,32],r:[2,3]},4:{lv:[32,46],r:[2,3,4]},5:{lv:[46,60],r:[3,4]},6:{lv:[61,70],r:[3,4]}};
const b=battleRunner();const run=b.r.run;
// 本実装の前に試すための上書き(本実装が入ったら、本実装の値で動かす)
run(`var tierLv=null,nushiMul=1;const __cr=createHuntRequest;createHuntRequest=function(map,mon,d,c){const r=__cr(map,mon,d,c);if(nushiMul!==1){r.enemyHp=Math.round(r.enemyHp*nushiMul);r.attackMultiplier=(r.attackMultiplier||1)*(1+(nushiMul-1)*0.4);}return r;};const __hlT=huntLevelFor;huntLevelFor=function(m,d){return tierLv||__hlT(m,d);};`);
const pools={};
function pool(map,t){const key=map+t;if(pools[key])return pools[key];const ids=run(`[...new Set(['easy','normal','hard'].flatMap(d=>worldMapCandidates(MAPS.find(m=>m.id===${JSON.stringify(map)}),d).map(m=>m.id)))]`);const rar=Object.fromEntries(ids.map(id=>[id,run(`by(${JSON.stringify(id)}).rarity.length`)]));return pools[key]={ids:ids.filter(id=>TIERS[t].r.includes(rar[id])),rar};}
function levelFor(t,r,rnd){const [lo,hi]=TIERS[t].lv;return lo+Math.floor(rnd*(hi-lo+1));}
async function c(name,party,level,maps,t,n=40){let w=0,cnt=0;for(const map of maps){const p=pool(map,t);if(!p.ids.length)continue;for(let i=0;i<n;i++){const rnd=seeded(900+i);const enemy=p.ids[Math.floor(rnd()*p.ids.length)];run(`tierLv=${levelFor(t,p.rar[enemy],rnd())};nushiMul=${t===6?Number(process.env.NUSHI||3):1}`);const r=await b.battle({party,level,map,difficulty:'normal',enemy,mode:'single',conditions:[],policy:'damage'},4000+i);cnt++;if(r.outcome==='victory')w++;}}console.log(`${name}\t${Math.round(w/cnt*100)}%`);}
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
