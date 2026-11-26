/* Automatic pseudonymous gameplay event reporting. No save payloads or administrator credentials. */
(function(global){
  'use strict';
  const ENDPOINT='https://monster-battle-records.kanki-doi-2.chatgpt.site/api/events';
  const profile=()=>global.MonsterProfiles?.current();
  let started=false,sending=false,queue=[],sessionId=null,lastInput=Date.now(),lastTick=Date.now(),lastProgress='',timer=null,wasVisible=document.visibilityState==='visible',retryAt=0,retryDelay=30000,lastSendStartedAt=-Infinity,queueWork=Promise.resolve();
  const enabled=()=>Boolean(profile()?.id&&profile()?.token);
  let device={};
  function collectDevice(){try{const api=global.navigator?.userAgentData;if(api?.getHighEntropyValues)Promise.resolve(api.getHighEntropyValues(['model'])).then(hints=>{if(typeof hints?.model==='string')device={model:hints.model.slice(0,60)};}).catch(()=>{});}catch(_){}}
  const queueKey=()=>`mb_analytics_queue_${profile()?.id}`;
  function readQueue(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value.filter(x=>x&&typeof x.id==='string'):[];}catch(_){return queue;}}
  // Merge only this operation into the latest shared queue; never restore a stale tab snapshot.
  function updateQueue(add=[],remove=[]){
    const key=queueKey(),sent=new Set(remove);
    const change=()=>{const records=new Map();for(const item of [...readQueue(key),...add])if(!sent.has(item.id))records.set(item.id,item);queue=[...records.values()].sort((a,b)=>String(a.at).localeCompare(String(b.at))).slice(-100);try{localStorage.setItem(key,JSON.stringify(queue));}catch(_){}};
    queueWork=queueWork.then(()=>global.navigator?.locks?.request?global.navigator.locks.request(key,change):change()).catch(()=>{});
    return queueWork;
  }
  function summary(){return {rank:typeof contractorRankFromExp==='function'?contractorRankFromExp(save.contractor?.exp||0):null,wins:Number(save.history?.wins||0),monsters:save.instances?.length||0,step:save.progress?.tutorial?.stepId||null,completed:save.progress?.tutorial?.completed===true};}
  function event(type,data={}){if(!enabled())return;void updateQueue([{id:crypto.randomUUID(),session:sessionId,type,at:new Date().toISOString(),data}]);}
  async function flush(force=false){
    // Lifecycle exits bypass both pacing and retry backoff, but never overlap a send.
    if(!enabled()||sending||(!force&&(Date.now()<retryAt||Date.now()-lastSendStartedAt<10000)))return;
    sending=true;let timeout;
    try{
      await updateQueue();
      if(!queue.length)return;
      const batch=queue.slice(0,25),p=profile(),controller=new AbortController();
      const expired=new Promise((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(Error('Analytics timeout'));},10000);});
      lastSendStartedAt=Date.now();
      const response=await Promise.race([fetch(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json','Authorization':`Bearer ${p.token}`},body:JSON.stringify({profileId:p.id,name:p.name,events:batch,snapshot:summary(),device}),keepalive:true,signal:controller.signal}),expired]);
      if(!response.ok)throw Error(String(response.status));
      await updateQueue([],batch.map(x=>x.id));retryAt=0;retryDelay=30000;
    }catch(_){retryAt=Date.now()+retryDelay;retryDelay=Math.min(300000,retryDelay*2);}
    finally{clearTimeout(timeout);sending=false;}
  }
  // Keep the existing 30-second cap per settlement; excess is not carried forward.
  function settleTime(){
    const now=Date.now(),delta=Math.min(30000,Math.max(0,Math.min(now,lastInput+60000)-lastTick));
    lastTick=now;
    if(enabled()&&wasVisible&&delta>0)event('active_time',{seconds:Math.round(delta/1000)});
  }
  function tick(force=false){settleTime();if(enabled()){const s=summary(),key=JSON.stringify([s.step,s.completed]);if(key!==lastProgress){lastProgress=key;event('progress',{step:s.step,completed:s.completed});}}void flush(force);}
  function begin(){sessionId=crypto.randomUUID();lastTick=Date.now();lastInput=Date.now();wasVisible=document.visibilityState==='visible';lastProgress='';queue=readQueue(queueKey());event('session_start');void flush();}
  global.MonsterAnalytics={
    feedbackDevice(){return {...device};},
    start(){if(started||!profile())return;started=true;collectDevice();
      const original=global.showBattleOutcome;global.showBattleOutcome=function(options){const result=original.apply(this,arguments);event('battle_result',{result:options?.kind||'victory',map:typeof selectedMap==='object'?selectedMap?.id:selectedMap,difficulty:typeof activeHuntRequest!=='undefined'?activeHuntRequest?.difficultyId:null,turns:typeof battleTurnCount==='number'?battleTurnCount:0,mode:typeof multiBattle!=='undefined'&&multiBattle?.active?(multiBattle.invasion?'invasion':'three_way'):'single',party:(save.party||[]).slice(0,3).map(uid=>{const ins=save.instances.find(x=>x.uid===uid);return {id:ins?.id,level:ins?.level,skills:(save.equippedSkills?.[uid]||[]).slice(0,3)};}),enemies:typeof multiBattle!=='undefined'&&multiBattle?.active?multiBattle.enemies.map(x=>x.mon.id):[typeof enemy!=='undefined'?enemy?.id:null]});void flush();return result;};
      const showOriginal=global.show;global.show=function(id){const result=showOriginal.apply(this,arguments);event('screen',{screen:String(id).slice(0,50)});return result;};
      if(enabled())begin();timer=setInterval(tick,30000);
      ['pointerdown','keydown'].forEach(type=>global.addEventListener(type,()=>{if(Date.now()-lastInput>=60000)settleTime();lastInput=Date.now();},{passive:true}));
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')tick(true);else lastTick=Date.now();wasVisible=document.visibilityState==='visible';});
      global.addEventListener('pagehide',()=>{tick(true);wasVisible=false;});
      global.addEventListener('pageshow',()=>{lastTick=Date.now();wasVisible=document.visibilityState==='visible';});
    }
  };
})(globalThis);
