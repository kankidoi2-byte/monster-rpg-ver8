/* Phase4C: independent display lifetimes. One accepted species; default budget 1. */
const BATTLE_IDLE_MEDIA=Object.freeze({volmoog:Object.freeze({
  src:'images/monsters/motion/volmoog_v18_alpha.webm',
  poster:'images/monsters/motion/volmoog_v18_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true
})});
// 5s of eligible foreground waiting, not wall time spent on another screen.
// Phase4A measured ~275ms locally; no slow-device evidence justifies a new value yet.
const BATTLE_IDLE_WAIT_MS=5000;
const battleIdleRecords=new Map();
let battleIdleRecord=null,battleIdlePageHidden=false,battleIdleLimit=1;
// Session-only evaluation limit. No save writes; Android gate precedes raising default.
function setBattleIdleLimit(value){
  if(!Number.isInteger(value)||value<1||value>3)return false;
  battleIdleLimit=value;syncBattleIdleMedia();return true;
}
function battleIdleOwned(r){return !r.disposed&&battleIdleRecords.get(r.key)===r;}
function refreshBattleIdlePrimary(){battleIdleRecord=battleIdleRecords.values().next().value||null;}
const battleIdleReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
function battleIdleCandidates(){
  return battleCombatants().map(u=>{
    const entry=multiBattle?.active?multiBattle.enemies.find(e=>`${e.id}Vis`===u.vis):null;
    const mon=u.vis==='pVis'?player:entry?.mon||enemy;
    return {...u,mon,key:`${battleFeedback.sequence}:${u.key}:${entry?battleStageKey(entry):mon.id}`};
  }).filter(u=>u.hp>0&&BATTLE_IDLE_MEDIA[u.mon.id]);
}
function battleIdleCurrent(r){
  return battleIdleOwned(r)&&r.media.isConnected&&r.video.isConnected&&
    !battleFeedback.finished&&!multiBattle?.finished&&battleIdleCandidates().some(u=>
      u.key===r.key&&document.getElementById(u.vis)?.querySelector('.battle-static-media')===r.media);
}
function battleIdleStops(){
  const reasons=[];
  if(!document.getElementById('battle')?.classList.contains('active'))reasons.push('screen');
  if(document.hidden)reasons.push('hidden');
  if(battleIdlePageHidden)reasons.push('pagehide');
  if(battleIdleReduced?.matches)reasons.push('reduced');
  return reasons;
}
function battleIdleVisible(){return !battleIdleStops().length&&!battleFeedback.finished&&!multiBattle?.finished;}
function setBattleIdleStatus(r,text,retry=false){
  if(r.label.textContent!==text)r.label.textContent=text;
  r.button.hidden=!retry;
}
function stopBattleIdleClock(r){
  if(r.timer!==null){clearTimeout(r.timer);r.timer=null;r.clockToken++;
    r.remaining=Math.max(0,r.remaining-(performance.now()-r.waitStarted));}
}
function startBattleIdleClock(r){
  if(r.timer!==null)return;
  const attempt=r.attempt,clockToken=++r.clockToken;
  r.waitStarted=performance.now();
  r.timer=setTimeout(()=>{
    // A queued callback may run after cancellation. Never touch a newer attempt.
    if(!battleIdleOwned(r)||r.attempt!==attempt||r.clockToken!==clockToken||r.timer===null)return;
    if(!battleIdleCurrent(r)){disposeBattleIdleRecord(r);return;}
    if(battleIdleStops().length){syncBattleIdleMedia();return;}
    r.timer=null;r.remaining=0;
    failBattleIdleMedia(r,'静止表示：読み込み待ちを終了しました');
  },r.remaining);
}
function staticBattleIdle(r){
  r.media.classList.remove('idle-playing');r.img.style.visibility='visible';
}
function releaseBattleIdleVideo(r){
  r.attempt++;r.playToken++;r.pending=false;stopBattleIdleClock(r);
  const v=r.video;v.onplaying=v.onerror=null;
  v.pause();v.removeAttribute('src');v.load();v.remove();
}
function disposeBattleIdleRecord(r){
  if(!battleIdleOwned(r))return;
  battleIdleRecords.delete(r.key);refreshBattleIdlePrimary();r.disposed=true;r.state='disposed';
  releaseBattleIdleVideo(r);r.button.onclick=null;
  r.img.style.removeProperty('visibility');r.media.classList.remove('has-idle-media','idle-playing');
  r.facing.style.removeProperty('transform');r.details.remove();
}
function disposeBattleIdleMedia(){
  for(const r of [...battleIdleRecords.values()])disposeBattleIdleRecord(r);
}
function failBattleIdleMedia(r,text){
  if(!battleIdleCurrent(r))return;
  r.failed=true;r.state='static';r.failureText=text;r.playToken++;r.pending=false;
  stopBattleIdleClock(r);r.video.pause();staticBattleIdle(r);
  setBattleIdleStatus(r,text,!r.retried);
}
function playBattleIdleMedia(r){
  if(!battleIdleCurrent(r)||r.failed||r.pending||!battleIdleVisible())return;
  const video=r.video,attempt=r.attempt,token=++r.playToken;
  r.pending=true;r.state='loading';startBattleIdleClock(r);
  const valid=()=>battleIdleOwned(r)&&r.video===video&&r.attempt===attempt&&r.playToken===token;
  const rejected=()=>{if(!valid())return;r.pending=false;
    if(!battleIdleCurrent(r)){disposeBattleIdleRecord(r);return;}
    if(battleIdleStops().length){syncBattleIdleMedia();return;}
    failBattleIdleMedia(r,'静止表示：再生できませんでした');
  };
  try{Promise.resolve(video.play()).then(()=>{
    if(!valid())return;r.pending=false;
    if(!battleIdleCurrent(r)){disposeBattleIdleRecord(r);return;}
    if(battleIdleStops().length)syncBattleIdleMedia();
  },rejected);}catch{rejected();}
}
function createBattleIdleVideo(r){
  const video=document.createElement('video');r.video=video;
  const attempt=++r.attempt;
  video.className='battle-idle-video';video.muted=true;video.defaultMuted=true;
  video.loop=true;video.playsInline=true;video.preload='auto';video.setAttribute('aria-hidden','true');
  const valid=()=>battleIdleOwned(r)&&r.video===video&&r.attempt===attempt;
  video.onplaying=()=>{
    if(!valid()||r.failed)return;
    if(!battleIdleCurrent(r)){disposeBattleIdleRecord(r);return;}
    if(battleIdleStops().length){syncBattleIdleMedia();return;}
    // Ignore an obsolete queued playing event when the element is now paused.
    if(video.paused)return;
    stopBattleIdleClock(r);r.remaining=BATTLE_IDLE_WAIT_MS;r.state='playing';
    r.media.classList.add('idle-playing');r.img.style.visibility='hidden';
    setBattleIdleStatus(r,'待機モーション');
  };
  video.onerror=()=>{if(valid())failBattleIdleMedia(r,'静止表示：動画を読み込めません');};
  r.media.append(video);
  if(!video.canPlayType(r.config.type)){
    r.failed=true;r.state='static';r.failureText='この環境では静止表示';r.retried=true;
    setBattleIdleStatus(r,r.failureText);
  }
}
function syncBattleIdleMedia(){
  const screen=document.getElementById('battle');
  const temporary=document.getElementById('battleItemSelect')?.classList.contains('active');
  if((!screen?.classList.contains('active')&&!temporary)||battleFeedback.finished||multiBattle?.finished){disposeBattleIdleMedia();return;}
  // pagehide disposes; updates while hidden must not recreate a decoder.
  if(battleIdlePageHidden){disposeBattleIdleMedia();return;}
  const candidates=battleIdleCandidates();
  // Stable incumbents first; new slots follow battleCombatants (ally, enemy A, B).
  const ordered=[...candidates.filter(u=>battleIdleRecords.has(u.key)),
    ...candidates.filter(u=>!battleIdleRecords.has(u.key))];
  const selected=ordered.slice(0,battleIdleLimit);
  for(const r of [...battleIdleRecords.values()]){
    const u=selected.find(u=>u.key===r.key);
    if(!u||document.getElementById(u.vis)?.querySelector('.battle-static-media')!==r.media)disposeBattleIdleRecord(r);
  }
  for(const chosen of selected)syncBattleIdleCandidate(chosen);
  refreshBattleIdlePrimary();
}
function syncBattleIdleCandidate(chosen){
  const media=document.getElementById(chosen.vis)?.querySelector('.battle-static-media');
  if(!media)return;
  const hud=chosen.vis==='pVis'?document.getElementById('singlePlayerBox'):chosen.vis==='eVis'?document.getElementById('singleEnemyBox'):document.getElementById(chosen.vis)?.closest('.multi-enemy-card')?.querySelector('.multi-enemy-copy');
  if(!battleIdleRecords.has(chosen.key)){
    const img=media.querySelector('img');if(!img)return;
    const config=BATTLE_IDLE_MEDIA[chosen.mon.id];
    const details=document.createElement('details'),summary=document.createElement('summary'),label=document.createElement('span'),button=document.createElement('button');
    details.className='battle-idle-details';summary.textContent='表示設定';button.type='button';button.textContent='再生を試す';button.hidden=true;details.append(summary,label,button);
    const r={key:chosen.key,config,media,img,details,label,button,facing:media.parentElement,
      disposed:false,failed:false,pending:false,retried:false,state:'loading',reasons:[],
      attempt:0,playToken:0,clockToken:0,timer:null,remaining:BATTLE_IDLE_WAIT_MS,waitStarted:0};
    battleIdleRecords.set(r.key,r);refreshBattleIdlePrimary();media.classList.add('has-idle-media');img.src=config.poster;
    if(chosen.vis==='pVis'&&config.allyFlip)r.facing.style.transform='scaleX(-1)';
    createBattleIdleVideo(r);
    button.onclick=()=>{
      if(!battleIdleCurrent(r)||!r.failed||r.retried||battleIdleStops().length)return;
      // One manual attempt per display lifetime, latched before any async work.
      r.retried=true;r.failed=false;r.failureText='';releaseBattleIdleVideo(r);
      r.remaining=BATTLE_IDLE_WAIT_MS;createBattleIdleVideo(r);syncBattleIdleMedia();
    };
  }
  const r=battleIdleRecords.get(chosen.key);if(hud&&!hud.contains(r.details))hud.append(r.details);
  r.reasons=battleIdleStops();
  if(r.reasons.length){
    if(r.pending){r.playToken++;r.pending=false;}
    stopBattleIdleClock(r);if(!r.video.paused)r.video.pause();staticBattleIdle(r);
    r.state=r.failed?'static':'paused';
    setBattleIdleStatus(r,r.reasons.includes('reduced')?'モーション控えめ':'一時停止');return;
  }
  if(r.failed){setBattleIdleStatus(r,r.failureText,!r.retried);return;}
  if(!r.video.getAttribute('src'))r.video.src=r.config.src;
  if(r.video.paused||r.state==='paused'){
    setBattleIdleStatus(r,'準備中');playBattleIdleMedia(r);
  }
}
// Fixed document listeners only; no per-frame polling, observers, object URLs,
// requestVideoFrameCallback, or per-combatant global listeners are owned here.
document.addEventListener('visibilitychange',syncBattleIdleMedia);
window.addEventListener('pagehide',()=>{battleIdlePageHidden=true;disposeBattleIdleMedia();});
window.addEventListener('pageshow',()=>{battleIdlePageHidden=false;syncBattleIdleMedia();});
battleIdleReduced?.addEventListener?.('change',syncBattleIdleMedia);
