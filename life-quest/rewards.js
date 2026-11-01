/* Standalone bridge: never reads or writes the Monster Battle save. */
(function(root){
'use strict';
const KEY='lifequest_rewards_v1', STATE='lifequest.v1';
const skills=[
  {id:"tanren1",nm:"鍛錬の習慣 I",cat:"str",n:5,ds:"筋トレを5回達成。続ける力が基礎を強くする。"},
  {id:"tanren2",nm:"鍛錬の習慣 II",cat:"str",n:20,ds:"筋トレを20回達成。"},
  {id:"soha1",nm:"走破の脚 I",cat:"end",n:5,ds:"持久力のクエストを5回達成。"},
  {id:"kotoba1",nm:"言葉の種 I",cat:"int",n:8,ds:"学習クエストを8回達成。"},
  {id:"kotoba2",nm:"言葉の種 II",cat:"int",n:25,ds:"学習クエストを25回達成。"},
  {id:"sousaku1",nm:"創作の灯 I",cat:"cre",n:5,ds:"創作を5回達成。"},
  {id:"kyuyo1",nm:"休む勇気",cat:"rest",n:3,ds:"休養を3回。休むことも冒険の準備。"},
  {id:"streak3",nm:"三日坊主の向こう側",streak:3,ds:"3日連続で何かを達成。",cat:"life"},
  {id:"streak7",nm:"七日の道",streak:7,ds:"7日連続で何かを達成。",cat:"life"},
  {id:"streak14",nm:"二週間の行軍",streak:14,ds:"14日連続で何かを達成。",cat:"life"}
];
const day=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const positive=n=>Number.isFinite(n)&&n>0?n:0;
function rows(s,k){return (s.quests||[]).map(q=>({...q,amount:positive(s.hist?.[k]?.[q.id])}));}
function capture(s,k){
 s.rewardDays=s.rewardDays||{};
 // Freeze the quest roster on each day, including days with zero progress.
 s.rewardDays[k]=rows(s,k);
}
function xp(q){return Math.round(positive(q.exp)*Math.min(positive(q.amount),positive(q.per)*3)/(positive(q.per)||1));}
function dailyCoins(s,k){return rows(s,k).reduce((n,q)=>n+xp(q),0)*3;}
function readBox(){
 const raw=localStorage.getItem(KEY);if(!raw)return {v:1,entries:[],highestLevel:1,skillIds:[],streakIds:[]};
 const b=JSON.parse(raw);if(b.v!==1||!Array.isArray(b.entries))throw Error('Invalid reward box');return b;
}
function sync(s,now=new Date()){
 if(!s){const raw=localStorage.getItem(STATE);if(!raw)return readBox();s=JSON.parse(raw);}
 if(!Array.isArray(s.quests)||!s.hist||typeof s.hist!=='object')throw Error('Invalid Life Quest state');
 const today=day(now),box=readBox(),before=JSON.stringify(box),ids=new Set(box.entries.map(e=>e.id));
 const add=(id,label,coins,items={},source='lifequest')=>{if(ids.has(id))return;ids.add(id);box.entries.push({id,createdAt:now.toISOString(),source,label,coins,items});};
 const dates=[...new Set([...Object.keys(s.hist),...Object.keys(s.rewardDays||{})])].filter(k=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&k<=today).sort();
 let total=0,streak=0,prev=null;const counts={},unlocked=new Set();
 for(const k of dates){
  // Today's live roster is editable; earlier snapshots survive later quest deletion.
  const qs=k===today?rows(s,k):(s.rewardDays?.[k]||rows(s,k));
  const active=qs.filter(q=>positive(q.amount)&&positive(q.per));
  const exp=active.reduce((n,q)=>n+xp(q),0);
  if(k<today&&exp>0){add('daily-'+k,k+'のEXP',exp*3,{},'daily');
   if(qs.length&&qs.every(q=>q.amount>=q.per))add('complete-'+k,k+' 全目標達成',0,{mega_data:2},'complete');}
  if(!active.length)continue;
  const next=prev?new Date(prev+'T00:00:00'):null;if(next)next.setDate(next.getDate()+1);
  streak=next&&day(next)===k?streak+1:1;prev=k;
  total+=exp;
  active.forEach(q=>counts[q.cat]=(counts[q.cat]||0)+Math.min(q.amount,q.per*3)/q.per);
  skills.forEach(sk=>{if(sk.streak?streak>=sk.streak:(counts[sk.cat]||0)>=sk.n)unlocked.add(sk.id)});
  for(const n of [7,14,30])if(streak===n){
   const id='streak'+n+'-'+k;
   box.streakIds=box.streakIds||[];
   if(!box.streakIds.includes(id)){add(id,'連続'+n+'日',0,{rainbow_contract_scroll:n===7?1:n===14?2:3,...(n===30?{giga_data:1}:{})},'streak');box.streakIds.push(id)}
  }
 }
 let lv=1;while(total>=100+60*lv){total-=100+60*lv;lv++}
 const highest=Math.max(1,box.highestLevel||1);
 for(let n=highest+1;n<=lv;n++)add('level-'+n,'Lv.'+n,900,{rainbow_contract_scroll:1},'level');
 box.highestLevel=Math.max(highest,lv);box.skillIds=box.skillIds||[];
 for(const id of unlocked)if(!box.skillIds.includes(id)){const sk=skills.find(x=>x.id===id);add('skill-'+id,sk.nm,0,{gold_contract_scroll:3,fine_magic_crystal:1},'skill');box.skillIds.push(id)}
 if(JSON.stringify(box)!==before)localStorage.setItem(KEY,JSON.stringify(box));
 return box;
}
root.LifeQuestRewards={skills,day,capture,dailyCoins,readBox,sync};
})(globalThis);
