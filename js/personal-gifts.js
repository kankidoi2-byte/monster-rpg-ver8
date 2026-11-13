/* Profile-authenticated personal developer gifts. Server pending is the durable outbox.
 * Receipts remain in giftClaimedIds forever; history retention never permits a second claim. */
(function(global){
 'use strict';
 const BASE='https://monster-battle-records.kanki-doi-2.chatgpt.site/api/gifts/';
 let owner=null,identity='',cache=new Map(),versions=new Map(),revision=0,inflight=null;
 const profile=()=>global.MonsterProfiles?.available?.()===false?null:global.MonsterProfiles?.current();
 function scope(){
  const p=profile(),s=typeof save==='object'?save:null,k=p?p.id+':'+p.token:'';
  if(owner!==s||identity!==k){owner=s;identity=k;cache=new Map();versions=new Map();inflight=null;}
  return p&&s?{id:p.id,token:p.token,owner:s,key:k}:null;
 }
 function current(s){const p=profile();return Boolean(p&&typeof save==='object'&&s.owner===save&&s.id===p.id&&s.token===p.token);}
 function valid(g,s){
  return g&&typeof g==='object'&&typeof g.id==='string'&&/^pg-[A-Za-z0-9_-]{1,160}$/.test(g.id)&&g.profileId===s.id&&
   typeof g.feedbackId==='string'&&g.feedbackId.length>0&&g.feedbackId.length<=160&&['auto','special'].includes(g.type)&&
   typeof g.title==='string'&&g.title.trim().length>0&&g.title.length<=200&&typeof g.letter==='string'&&g.letter.length<=5000&&
   typeof g.createdAt==='string'&&Number.isFinite(Date.parse(g.createdAt))&&g.claimedAt==null&&
   Array.isArray(g.rewards)&&g.rewards.length>0&&g.rewards.length<=100&&g.rewards.every(r=>r&&typeof r==='object'&&r.kind!=='bless'&&giftRewardValid(r));
 }
 function ingest(g,s){
  if(!current(s)||!valid(g,s))return false;
  // Copy only supported fields, never prototype keys or arbitrary server properties.
  const rewards=g.rewards.map(r=>r.kind==='coins'?{kind:r.kind,amount:r.amount}:['monster','character'].includes(r.kind)?{kind:r.kind,id:r.id,level:r.level}:{kind:r.kind,id:r.id,count:r.count});
  cache.set(g.id,{id:g.id,key:'developer:'+g.id,source:'developer',personal:true,profileId:s.id,feedbackId:g.feedbackId,type:g.type,title:g.title,letter:g.letter,rewards,createdAt:g.createdAt,until:null});
  versions.set(g.id,++revision);return true;
 }
 async function request(path,s,extra={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const r=await fetch(BASE+path,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({profileId:s.id,token:s.token,...extra}),signal:controller.signal});
   if(!r.ok)throw Error('gift request failed');return await r.json();
  }finally{clearTimeout(timer);}
 }
 function entries(){const s=scope();if(!s)return [];const claimed=new Set(s.owner.giftClaimedIds||[]);return [...cache.values()].filter(g=>g.profileId===s.id&&!claimed.has(g.id)&&g.rewards.every(giftRewardValid));}
 function accept(g,profileId){const s=scope();if(!s||s.id!==profileId)return false;const ok=ingest(g,s);if(ok&&typeof refreshGiftUi==='function')refreshGiftUi();return ok;}
 async function sync(){
  const s=scope();if(!s)return;if(inflight)return inflight;
  const requestRevision=revision;
  const task=(async()=>{try{
   const response=await request('pending',s);if(!current(s)||!Array.isArray(response.gifts))return;
   const counts=new Map();for(const g of response.gifts)counts.set(g?.id,(counts.get(g?.id)||0)+1);
   const claimed=new Set(s.owner.giftClaimedIds||[]),ack=[],seen=new Set();
   for(const g of response.gifts){if(counts.get(g?.id)!==1||!valid(g,s))continue;seen.add(g.id);if(claimed.has(g.id)){ack.push(g.id);cache.delete(g.id);}else ingest(g,s);}
   // Authoritative refresh removes stale gifts, except feedback accepted after this request began.
   for(const id of cache.keys())if(!seen.has(id)&&(versions.get(id)||0)<=requestRevision){cache.delete(id);versions.delete(id);}
   if(typeof refreshGiftUi==='function')refreshGiftUi();
   // Local save was already committed. A failed ACK remains server-pending and retries next time.
   for(let i=0;i<ack.length;i+=100){if(!current(s))return;await request('claimed',s,{ids:ack.slice(i,i+100)});}
  }catch(_){/* Offline and auth failures do not interrupt play or expose another profile. */}})();
  inflight=task;try{await task;}finally{if(inflight===task)inflight=null;}
 }
 global.PersonalGifts={entries,accept,sync,screenChanged(id){if(id==='home'||id==='giftBox')void sync();},start(){void sync();}};
 global.addEventListener('online',()=>void sync());
})(globalThis);
