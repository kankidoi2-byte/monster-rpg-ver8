/* Independent display lifetimes; bounded feature-branch registrations, default budget 1. */
const BATTLE_IDLE_MEDIA=Object.freeze({volmoog:Object.freeze({
  src:'images/monsters/motion/volmoog_v18_alpha.webm',
  poster:'images/monsters/motion/volmoog_v18_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true
}),gran_volmoog:Object.freeze({
  src:'images/monsters/motion/gran_volmoog_v18_alpha.webm',
  poster:'images/monsters/motion/gran_volmoog_v18_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,
  // Preserve the measured QA canvas fit. This is not an anatomical foot anchor.
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:8,y:8,right:960,bottom:945})
}), shenhairon:Object.freeze({
  src:'images/monsters/motion/shenhairon_v5_alpha.webm',
  poster:'images/monsters/motion/shenhairon_v5_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,
  // Phase C evaluation: preserve adopted canvas; anatomical placement pending.
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:0,y:3,right:960,bottom:960})
}), tienhairon:Object.freeze({
  src:'images/monsters/motion/tienhairon_v5_alpha.webm',
  poster:'images/monsters/motion/tienhairon_v5_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,
  // Phase C evaluation: preserve adopted canvas; anatomical placement pending.
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:0,y:16,right:960,bottom:945})
}),slime_gold:Object.freeze({

  src:'images/monsters/motion/slime_gold_v1_alpha.webm',
  poster:'images/monsters/motion/slime_gold_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:false,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:720,height:640,x:47,y:65,right:664,bottom:559})
}),false_dragon_beta:Object.freeze({

  src:'images/monsters/motion/false_dragon_beta_v2_alpha.webm',
  poster:'images/monsters/motion/false_dragon_beta_v2_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:65,y:137,right:898,bottom:845})
}),false_dragon_gamma:Object.freeze({

  src:'images/monsters/motion/false_dragon_gamma_v1_alpha.webm',
  poster:'images/monsters/motion/false_dragon_gamma_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:false,enemyFlip:true,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:90,y:85,right:886,bottom:885})
}),goblin:Object.freeze({
  src:'images/monsters/motion/goblin_v1_alpha.webm',poster:'images/monsters/motion/goblin_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:71,y:125,right:887,bottom:828})
}),
nightmare:Object.freeze({
  src:'images/monsters/motion/nightmare_v1_alpha.webm',poster:'images/monsters/motion/nightmare_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:102,y:83,right:840,bottom:870})
}),
astralepis:Object.freeze({
  src:'images/monsters/motion/astralepis_v1_alpha.webm',poster:'images/monsters/motion/astralepis_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:false,enemyFlip:true,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:122,y:61,right:871,bottom:894})
}),nemes:Object.freeze({
  src:'images/monsters/motion/nemes_v1_alpha.webm',poster:'images/monsters/motion/nemes_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:false,enemyFlip:true,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:107,y:81,right:855,bottom:863})
}),
nemesia:Object.freeze({
  src:'images/monsters/motion/nemesia_v1_alpha.webm',poster:'images/monsters/motion/nemesia_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:86,y:122,right:873,bottom:830})
}),
nemesion:Object.freeze({
  src:'images/monsters/motion/nemesion_v1_alpha.webm',poster:'images/monsters/motion/nemesion_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:57,y:64,right:906,bottom:895})
}),doom_nemesion:Object.freeze({
  src:'images/monsters/motion/doom_nemesion_v5_alpha.webm',poster:'images/monsters/motion/doom_nemesion_v5_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:55,y:122,right:944,bottom:822})
}),
false_dragon_alfa:Object.freeze({
  src:'images/monsters/motion/false_dragon_alfa_v1_alpha.webm',poster:'images/monsters/motion/false_dragon_alfa_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:56,y:58,right:897,bottom:882})
}),
volteck:Object.freeze({
  src:'images/monsters/motion/volteck_v4_alpha.webm',poster:'images/monsters/motion/volteck_v4_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:62,y:149,right:901,bottom:835})
}),
spaquinn:Object.freeze({
  src:'images/monsters/motion/spaquinn_v4_alpha.webm',poster:'images/monsters/motion/spaquinn_v4_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:56,y:49,right:908,bottom:887})
}),
voltax:Object.freeze({
  src:'images/monsters/motion/voltax_v5_alpha.webm',poster:'images/monsters/motion/voltax_v5_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:64,y:69,right:900,bottom:828})
}),freigal:Object.freeze({
  src:'images/monsters/motion/freigal_v2_alpha.webm',poster:'images/monsters/motion/freigal_v2_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:181,y:82,right:873,bottom:839})
}),
freiwolf:Object.freeze({
  src:'images/monsters/motion/freiwolf_v2_alpha.webm',poster:'images/monsters/motion/freiwolf_v2_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:105,y:104,right:878,bottom:850})
}),
aquaron:Object.freeze({
  src:'images/monsters/motion/aquaron_v3_alpha.webm',poster:'images/monsters/motion/aquaron_v3_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:36,y:6,right:941,bottom:949})
}),
highaquaron:Object.freeze({
  src:'images/monsters/motion/highaquaron_v3_alpha.webm',poster:'images/monsters/motion/highaquaron_v3_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:8,y:8,right:941,bottom:946})
}),grassbeat:Object.freeze({
  src:'images/monsters/motion/grassbeat_v1_alpha.webm',poster:'images/monsters/motion/grassbeat_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:103,y:176,right:867,bottom:795})
}),
thornbeat:Object.freeze({
  src:'images/monsters/motion/thornbeat_v1_alpha.webm',poster:'images/monsters/motion/thornbeat_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:87,y:126,right:877,bottom:829})
}),
granbeat:Object.freeze({
  src:'images/monsters/motion/granbeat_v4_alpha.webm',poster:'images/monsters/motion/granbeat_v4_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:121,y:46,right:877,bottom:906})
}),
rikasheef:Object.freeze({
  src:'images/monsters/motion/rikasheef_v1_alpha.webm',poster:'images/monsters/motion/rikasheef_v1_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true,enemyFlip:false,
  layout:Object.freeze({x:0.5,y:1,scale:1}),
  sourceBounds:Object.freeze({width:960,height:960,x:202,y:91,right:780,bottom:852})
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
function battleIdleStops(r){
  const reasons=[];
  if(!document.getElementById('battle')?.classList.contains('active'))reasons.push('screen');
  if(document.hidden)reasons.push('hidden');
  if(battleIdlePageHidden)reasons.push('pagehide');
  if(battleIdleReduced?.matches)reasons.push('reduced');
  if(r?.offscreen)reasons.push('offscreen');
  return reasons;
}
function battleIdleVisible(r){return !battleIdleStops(r).length&&!battleFeedback.finished&&!multiBattle?.finished;}
// Layout values align the full canvas inside its contain box. Per-species values
// never mutate the artwork or infer a foot point from the silhouette bounds.
function applyBattleIdleLayout(r){
  const v=r.config.layout;
  if(!v)return;
  const x=Number.isFinite(v.x)?Math.max(0,Math.min(1,v.x)):0.5;
  const y=Number.isFinite(v.y)?Math.max(0,Math.min(1,v.y)):0.5;
  const scale=Number.isFinite(v.scale)?Math.max(0.1,Math.min(1,v.scale)):1;
  r.media.style.setProperty('--idle-position',`${x*100}% ${y*100}%`);
  r.media.style.setProperty('--idle-scale',String(scale));
}
// One observer per owned record (max 3). Start static until the first visibility
// report. Pause below 2% for 250ms; resume at 15%, avoiding boundary chatter.
function watchBattleIdleViewport(r){
  r.offscreen=typeof IntersectionObserver==='function';
  r.viewportTimer=null;r.viewportToken=0;r.viewportObserver=null;
  if(!r.offscreen)return; // Older engines still use document/screen visibility.
  r.viewportObserver=new IntersectionObserver(entries=>{
    if(!battleIdleOwned(r))return;
    const entry=entries.find(e=>e.target===r.media);if(!entry)return;
    const ratio=entry.isIntersecting?entry.intersectionRatio:0;
    if(r.viewportTimer!==null){clearTimeout(r.viewportTimer);r.viewportTimer=null;}
    const token=++r.viewportToken;
    if(ratio>=0.15){r.offscreen=false;syncBattleIdleMedia();}
    else if(ratio<=0.02&&!r.offscreen){
      r.viewportTimer=setTimeout(()=>{
        if(!battleIdleOwned(r)||token!==r.viewportToken)return;
        r.viewportTimer=null;r.offscreen=true;syncBattleIdleMedia();
      },250);
    }
  },{threshold:[0,0.02,0.15]});
  r.viewportObserver.observe(r.media);
}
function unwatchBattleIdleViewport(r){
  r.viewportToken++;
  if(r.viewportTimer!==null)clearTimeout(r.viewportTimer);
  r.viewportTimer=null;r.viewportObserver?.disconnect();r.viewportObserver=null;
}
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
    if(battleIdleStops(r).length){syncBattleIdleMedia();return;}
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
  unwatchBattleIdleViewport(r);releaseBattleIdleVideo(r);r.button.onclick=null;
  r.media.style.removeProperty('--idle-position');r.media.style.removeProperty('--idle-scale');
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
  if(!battleIdleCurrent(r)||r.failed||r.pending||!battleIdleVisible(r))return;
  const video=r.video,attempt=r.attempt,token=++r.playToken;
  r.pending=true;r.state='loading';startBattleIdleClock(r);
  const valid=()=>battleIdleOwned(r)&&r.video===video&&r.attempt===attempt&&r.playToken===token;
  const rejected=()=>{if(!valid())return;r.pending=false;
    if(!battleIdleCurrent(r)){disposeBattleIdleRecord(r);return;}
    if(battleIdleStops(r).length){syncBattleIdleMedia();return;}
    failBattleIdleMedia(r,'静止表示：再生できませんでした');
  };
  try{Promise.resolve(video.play()).then(()=>{
    if(!valid())return;r.pending=false;
    if(!battleIdleCurrent(r)){disposeBattleIdleRecord(r);return;}
    if(battleIdleStops(r).length)syncBattleIdleMedia();
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
    if(battleIdleStops(r).length){syncBattleIdleMedia();return;}
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
    if(chosen.vis==='pVis'?config.allyFlip:config.enemyFlip)r.facing.style.transform='scaleX(-1)';
    applyBattleIdleLayout(r);watchBattleIdleViewport(r);createBattleIdleVideo(r);
    button.onclick=()=>{
      if(!battleIdleCurrent(r)||!r.failed||r.retried||battleIdleStops(r).length)return;
      // One manual attempt per display lifetime, latched before any async work.
      r.retried=true;r.failed=false;r.failureText='';releaseBattleIdleVideo(r);
      r.remaining=BATTLE_IDLE_WAIT_MS;createBattleIdleVideo(r);syncBattleIdleMedia();
    };
  }
  const r=battleIdleRecords.get(chosen.key);if(hud&&!hud.contains(r.details))hud.append(r.details);
  r.reasons=battleIdleStops(r);
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
// Fixed global listeners and bounded, disposable viewport observers. No polling,
// object URLs or per-combatant global listeners.
document.addEventListener('visibilitychange',syncBattleIdleMedia);
window.addEventListener('pagehide',()=>{battleIdlePageHidden=true;disposeBattleIdleMedia();});
window.addEventListener('pageshow',()=>{battleIdlePageHidden=false;syncBattleIdleMedia();});
battleIdleReduced?.addEventListener?.('change',syncBattleIdleMedia);
