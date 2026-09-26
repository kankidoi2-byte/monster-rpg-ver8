/* Phase4A: one species, at most one video. Presentation state never enters save. */
const BATTLE_IDLE_MEDIA=Object.freeze({volmoog:Object.freeze({
  src:'images/monsters/motion/volmoog_v18_alpha.webm',
  poster:'images/monsters/motion/volmoog_v18_static.webp',
  type:'video/webm; codecs="vp9"',allyFlip:true
})});
let battleIdleRecord=null;
const battleIdleReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
function disposeBattleIdleMedia(){
  const r=battleIdleRecord;if(!r)return;
  battleIdleRecord=null;r.disposed=true;clearTimeout(r.timer);
  r.video.onplaying=r.video.onerror=null;r.button.onclick=null;
  r.video.pause();r.video.removeAttribute('src');r.video.load();r.video.remove();
  r.img.style.removeProperty('visibility');r.media.classList.remove('has-idle-media','idle-playing');
  r.facing.style.removeProperty('transform');r.details.remove();
}
function battleIdleVisible(){return document.getElementById('battle')?.classList.contains('active')&&!document.hidden&&!battleFeedback.finished&&!multiBattle?.finished;}
function setBattleIdleStatus(r,text,retry=false){r.label.textContent=text;r.button.hidden=!retry;}
function failBattleIdleMedia(r,text){
  if(r!==battleIdleRecord||r.disposed)return;
  r.failed=true;r.pending=false;clearTimeout(r.timer);r.video.pause();
  r.media.classList.remove('idle-playing');r.img.style.visibility='visible';
  setBattleIdleStatus(r,text,!r.retried);
}
function playBattleIdleMedia(r){
  if(r!==battleIdleRecord||r.disposed||r.failed||r.pending||!battleIdleVisible()||battleIdleReduced?.matches)return;
  r.pending=true;
  Promise.resolve(r.video.play()).then(()=>{
    if(r!==battleIdleRecord||r.disposed)return;
    r.pending=false;if(!battleIdleVisible()||battleIdleReduced?.matches)r.video.pause();
  }).catch(()=>{if(r===battleIdleRecord&&!r.disposed){r.pending=false;
    if(battleIdleVisible()&&!battleIdleReduced?.matches)failBattleIdleMedia(r,'静止表示：再生できませんでした');
  }});
}
function syncBattleIdleMedia(){
  const screen=document.getElementById('battle');
  const temporary=document.getElementById('battleItemSelect')?.classList.contains('active');
  if(!screen?.classList.contains('active')&&!temporary){disposeBattleIdleMedia();return;}
  if(battleFeedback.finished||multiBattle?.finished){disposeBattleIdleMedia();return;}
  const candidates=battleCombatants().map(u=>{
    const entry=multiBattle?.active?multiBattle.enemies.find(e=>`${e.id}Vis`===u.vis):null;
    const mon=u.vis==='pVis'?player:entry?.mon||enemy;
    return {...u,mon,key:`${battleFeedback.sequence}:${u.key}:${entry?battleStageKey(entry):mon.id}`};
  }).filter(u=>u.hp>0&&BATTLE_IDLE_MEDIA[u.mon.id]);
  // Keep the existing eligible instance; never start a second decoder in Phase4A.
  const chosen=candidates.find(u=>u.key===battleIdleRecord?.key)||candidates[0];
  const media=chosen&&document.getElementById(chosen.vis)?.querySelector('.battle-static-media');
  if(battleIdleRecord&&(battleIdleRecord.key!==chosen?.key||battleIdleRecord.media!==media))disposeBattleIdleMedia();
  if(!chosen||!media)return;
  const hud=chosen.vis==='pVis'?document.getElementById('singlePlayerBox'):chosen.vis==='eVis'?document.getElementById('singleEnemyBox'):document.getElementById(chosen.vis)?.closest('.multi-enemy-card')?.querySelector('.multi-enemy-copy');
  if(!battleIdleRecord){
    const img=media.querySelector('img');if(!img)return;
    const config=BATTLE_IDLE_MEDIA[chosen.mon.id],video=document.createElement('video');
    const details=document.createElement('details'),summary=document.createElement('summary'),label=document.createElement('span'),button=document.createElement('button');
    details.className='battle-idle-details';summary.textContent='表示設定';button.type='button';button.textContent='再生を試す';button.hidden=true;details.append(summary,label,button);
    video.className='battle-idle-video';video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.setAttribute('aria-hidden','true');
    const r={key:chosen.key,media,img,video,details,label,button,facing:media.parentElement,disposed:false,failed:false,pending:false,retried:false,timer:null};
    battleIdleRecord=r;media.classList.add('has-idle-media');img.src=config.poster;media.append(video);
    if(chosen.vis==='pVis'&&config.allyFlip)r.facing.style.transform='scaleX(-1)';
    video.onplaying=()=>{if(r!==battleIdleRecord||r.disposed||r.failed)return;
      if(!battleIdleVisible()||battleIdleReduced?.matches){video.pause();return;}
      clearTimeout(r.timer);r.media.classList.add('idle-playing');img.style.visibility='hidden';setBattleIdleStatus(r,'待機モーション');
    };
    video.onerror=()=>failBattleIdleMedia(r,'静止表示：動画を読み込めません');
    button.onclick=()=>{if(r!==battleIdleRecord||r.retried||battleIdleReduced?.matches)return;
      r.retried=true;r.failed=false;button.hidden=true;setBattleIdleStatus(r,'準備中');
      if(video.error){video.src=config.src;video.load();}
      r.timer=setTimeout(()=>failBattleIdleMedia(r,'静止表示：読み込み待ちを終了しました'),5000);playBattleIdleMedia(r);
    };
    if(!video.canPlayType(config.type)){r.failed=true;setBattleIdleStatus(r,'この環境では静止表示');}
    else if(!battleIdleReduced?.matches){video.src=config.src;setBattleIdleStatus(r,'準備中');r.timer=setTimeout(()=>failBattleIdleMedia(r,'静止表示：読み込み待ちを終了しました'),5000);}
  }
  const r=battleIdleRecord;if(hud&&!hud.contains(r.details))hud.append(r.details);
  if(battleIdleReduced?.matches){r.video.pause();clearTimeout(r.timer);r.img.style.visibility='visible';r.media.classList.remove('idle-playing');setBattleIdleStatus(r,'モーション控えめ');return;}
  if(!battleIdleVisible()){r.video.pause();return;}
  if(!r.video.getAttribute('src')&&!r.failed){r.video.src=BATTLE_IDLE_MEDIA[chosen.mon.id].src;r.timer=setTimeout(()=>failBattleIdleMedia(r,'静止表示：読み込み待ちを終了しました'),5000);}
  if(r.video.paused)playBattleIdleMedia(r);
}
// Single document-level listeners, never installed per turn or per combatant.
document.addEventListener('visibilitychange',syncBattleIdleMedia);
window.addEventListener('pagehide',disposeBattleIdleMedia);
window.addEventListener('pageshow',syncBattleIdleMedia);
battleIdleReduced?.addEventListener?.('change',syncBattleIdleMedia);
