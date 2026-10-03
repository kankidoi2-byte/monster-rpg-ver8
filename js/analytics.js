/* Anonymous event reporting with a per-profile off switch. No save payloads or administrator credentials. */
(function(global){
  'use strict';
  const ENDPOINT='https://monster-battle-records.kanki-doi-2.chatgpt.site/api/events';
  const profile=()=>global.MonsterProfiles?.current();
  let started=false,sending=false,queue=[],sessionId=null,lastInput=Date.now(),lastTick=Date.now(),lastProgress='',timer=null;
  const enabled=()=>profile()?.consent===true;
  const queueKey=()=>`mb_analytics_queue_${profile()?.id}`;
  function status(text){const e=document.getElementById('profileTelemetryStatus');if(e)e.textContent=text;}
  function persist(){try{if(enabled())localStorage.setItem(queueKey(),JSON.stringify(queue.slice(-100)));else if(profile())localStorage.removeItem(queueKey());}catch(_){}}
  function summary(){return {rank:typeof contractorRankFromExp==='function'?contractorRankFromExp(save.contractor?.exp||0):null,wins:Number(save.history?.wins||0),monsters:save.instances?.length||0,step:save.progress?.tutorial?.stepId||null,completed:save.progress?.tutorial?.completed===true};}
  function event(type,data={}){if(!enabled())return;queue.push({id:crypto.randomUUID(),session:sessionId,type,at:new Date().toISOString(),data});queue=queue.slice(-100);persist();}
  async function flush(){if(!enabled()||sending||!queue.length)return;sending=true;const batch=queue.slice(0,25);try{const p=profile();const response=await fetch(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json','Authorization':`Bearer ${p.token}`},body:JSON.stringify({profileId:p.id,name:p.name,events:batch,snapshot:summary()}),keepalive:true});if(!response.ok)throw Error(String(response.status));const sent=new Set(batch.map(x=>x.id));queue=queue.filter(x=>!sent.has(x.id));persist();status(enabled()?'記録送信：有効（送信済み）':'記録送信：無効');}catch(_){status(enabled()?'記録送信：接続待ち。ゲームはそのまま遊べます。':'記録送信：無効');}finally{sending=false;}}
  function tick(){const now=Date.now(),delta=Math.min(30000,Math.max(0,now-lastTick));lastTick=now;if(enabled()&&document.visibilityState==='visible'&&now-lastInput<60000){event('active_time',{seconds:Math.round(delta/1000)});}if(enabled()){const s=summary(),key=JSON.stringify([s.step,s.completed]);if(key!==lastProgress){lastProgress=key;event('progress',{step:s.step,completed:s.completed});}}void flush();}
  function begin(){sessionId=crypto.randomUUID();lastTick=Date.now();lastInput=Date.now();lastProgress='';try{queue=JSON.parse(localStorage.getItem(queueKey())||'[]');if(!Array.isArray(queue))queue=[];}catch(_){queue=[];}event('session_start');void flush();}
  global.MonsterAnalytics={
    start(){if(started||!profile())return;started=true;
      const original=global.showBattleOutcome;global.showBattleOutcome=function(options){const result=original.apply(this,arguments);event('battle_result',{result:options?.kind||'victory',map:typeof selectedMap==='object'?selectedMap?.id:selectedMap,difficulty:typeof activeHuntRequest!=='undefined'?activeHuntRequest?.difficultyId:null,turns:typeof battleTurnCount==='number'?battleTurnCount:0,mode:typeof multiBattle!=='undefined'&&multiBattle?.active?(multiBattle.invasion?'invasion':'three_way'):'single',party:(save.party||[]).slice(0,3).map(uid=>{const ins=save.instances.find(x=>x.uid===uid);return {id:ins?.id,level:ins?.level,skills:(save.equippedSkills?.[uid]||[]).slice(0,3)};}),enemies:typeof multiBattle!=='undefined'&&multiBattle?.active?multiBattle.enemies.map(x=>x.mon.id):[typeof enemy!=='undefined'?enemy?.id:null]});void flush();return result;};
      const showOriginal=global.show;global.show=function(id){const result=showOriginal.apply(this,arguments);event('screen',{screen:String(id).slice(0,50)});return result;};
      if(enabled())begin();timer=setInterval(tick,30000);
      ['pointerdown','keydown'].forEach(type=>global.addEventListener(type,()=>{lastInput=Date.now();},{passive:true}));
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){tick();void flush();}else lastTick=Date.now();});
      global.addEventListener('pagehide',()=>{void flush();});
    },
    consentChanged(){queue=[];persist();if(enabled()){begin();status('記録送信：有効');}else{status('記録送信：無効');}}
  };
})(globalThis);
