/* Water home presentation. Full-body cutouts use the shared battle geometry. */
let waterHomeRecord=null,waterHomeFrame=null,waterHomePageHidden=false;
const waterHomeReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
function openHomeMonsters(){
  const step=typeof tutorialCurrentStepId==='function'?tutorialCurrentStepId():null;
  show(['home_party','expedition_party_open'].includes(step)?'partySet':'party');
}
function waterHomeBoundsFit(config,width,upper,plateTop){
  const b=config.sourceBounds,scale=config.layout.scale;
  const bw=b.right-b.x,bh=b.bottom-b.y,available=plateTop-upper;
  if(width<=0||available<=0||bw<=0||bh<=0)return null;
  const base=Math.min(Math.min(width,480)*1.15,available/0.75);
  // Keep the original body-based scale unless a large creature would cover the banner.
  const k=Math.min(scale*base/Math.max(bw,bh),available/bh);
  let top=(upper+plateTop)/2-(b.y+bh/2)*k;
  if(bh*k<=available){
    if(top+b.bottom*k>plateTop+6)top=plateTop+6-b.bottom*k;
    if(top+b.y*k<upper)top=upper-b.y*k;
  }
  return {base,k,width:b.width*k,height:b.height*k,left:width/2-(b.x+bw/2)*k,top,
    shadowLeft:width/2,shadowTop:top+b.bottom*k,shadowWidth:Math.max(40,bw*k*0.7),
    reflectionOffset:-(b.height-b.bottom)*k*2};
}
function layoutWaterHome(){
  const r=waterHomeRecord,home=document.getElementById('home');
  if(!r||!home?.classList.contains('active'))return;
  const banner=document.getElementById('homeBanner'),plate=document.getElementById('homeNamePlate');
  const origin=home.getBoundingClientRect();
  const upper=(banner?.getBoundingClientRect().bottom||origin.top)-origin.top+8;
  const plateTop=plate.getBoundingClientRect().top-origin.top;
  if(!r.config){
    r.stage.style.setProperty('--home-art-upper',upper+'px');
    r.stage.style.setProperty('--home-art-height',Math.max(0,plateTop-upper-10)+'px');return;
  }
  // Short landscape uses the left half for the creature, leaving controls on the right.
  const artWidth=window.matchMedia('(max-height:500px) and (min-width:600px)').matches?home.clientWidth/2:home.clientWidth;
  const fit=waterHomeBoundsFit(r.config,artWidth,upper,plateTop);
  if(!fit)return;
  for(const key of ['left','top','width','height'])r.art.style[key]=fit[key]+'px';
  r.art.style.setProperty('--home-reflection-offset',fit.reflectionOffset+'px');
  r.shadow.style.left=fit.shadowLeft+'px';r.shadow.style.top=fit.shadowTop+'px';r.shadow.style.width=fit.shadowWidth+'px';
}
function scheduleWaterHomeLayout(){
  if(waterHomeFrame!==null)return;
  waterHomeFrame=requestAnimationFrame(()=>{waterHomeFrame=null;layoutWaterHome();});
}
function disposeWaterHome(){
  const r=waterHomeRecord;waterHomeRecord=null;
  if(!r)return;
  clearTimeout(r.timer);r.observer?.disconnect();
  if(r.video){r.video.onplaying=r.video.onerror=null;r.video.pause();r.video.removeAttribute('src');r.video.load();}
}
function waterHomeCanAnimate(){
  // WebKit can decode VP9 without its alpha plane. Prefer the transparent poster there.
  return !waterHomeReduced?.matches&&!/iPad|iPhone|iPod/.test(navigator.userAgent)&&
    !(navigator.vendor==='Apple Computer, Inc.');
}
function syncWaterHomeRank(){
  const bar=document.getElementById('homeRankProgress');
  if(!bar||typeof contractorRankProgress!=='function')return;
  const p=contractorRankProgress(save?.contractor?.exp||0),percent=Math.round((p.isMax?1:p.ratio)*100);
  bar.setAttribute('aria-valuenow',String(percent));bar.querySelector('i').style.width=percent+'%';
}
function syncWaterHomeMedia(){
  syncWaterHomeRank();
  if(!document.getElementById('home')?.classList.contains('active')){disposeWaterHome();return;}
  const r=waterHomeRecord;if(!r?.video||r.failed)return;
  if(document.hidden||waterHomePageHidden||!waterHomeCanAnimate()){
    clearTimeout(r.timer);r.timer=null;r.video.pause();r.art.classList.remove('is-playing');return;
  }
  if(!r.video.getAttribute('src'))r.video.src=r.config.src;
  if(!r.video.paused)return;
  const fail=()=>{
    if(waterHomeRecord!==r)return;
    r.failed=true;clearTimeout(r.timer);r.timer=null;r.art.classList.remove('is-playing');
    r.video.pause();r.video.removeAttribute('src');r.video.load();
  };
  r.video.onerror=fail;
  r.video.onplaying=()=>{
    if(waterHomeRecord!==r||r.video.paused)return;
    clearTimeout(r.timer);r.timer=null;r.art.classList.add('is-playing');
  };
  if(!r.timer)r.timer=setTimeout(fail,5000);
  try{Promise.resolve(r.video.play()).catch(()=>{if(!document.hidden&&!waterHomePageHidden)fail();});}catch{fail();}
}
function renderWaterHomeFavorite(stage,mon){
  disposeWaterHome();stage.replaceChildren();
  const plate=document.getElementById('homeNamePlate');
  if(plate){
    const name=document.createElement('span');name.textContent=mon?`${mon.name} ${mon.rarity||''}`:'最初の仲間を迎えよう';
    const heart=document.createElement('span');heart.className='home-favorite-heart';heart.setAttribute('aria-hidden','true');heart.textContent='♥';plate.replaceChildren(name,heart);
  }
  const config=mon&&typeof battleDisplayMedia==='function'?battleDisplayMedia(mon.id):null;
  const r={stage,config,art:null,video:null,timer:null,observer:null,failed:false};waterHomeRecord=r;
  if(config){
    const shadow=document.createElement('div');shadow.className='home-water-shadow';shadow.setAttribute('aria-hidden','true');r.shadow=shadow;
    const art=document.createElement('button');art.type='button';art.className='home-water-monster';art.setAttribute('aria-label',mon.name+'：お気に入りを選ぶ');r.art=art;
    const poster=document.createElement('img');poster.src=config.poster;poster.alt=mon.name;poster.draggable=false;
    art.append(poster);
    if(config.src&&waterHomeCanAnimate()){
      const video=document.createElement('video');video.className='home-water-video';video.muted=true;video.defaultMuted=true;
      video.loop=true;video.playsInline=true;video.preload='none';video.poster=config.poster;video.setAttribute('aria-hidden','true');
      if(video.canPlayType(config.type)){r.video=video;art.append(video);}
    }
    art.addEventListener('click',()=>show('homeFavoriteSelect'));stage.append(shadow,art);
  }else{
    // Artwork without an adopted cutout keeps its existing portrait presentation.
    stage.innerHTML=`<div class="home-favorite-art">${mon?`<div class="home-portrait-frame" role="button" tabindex="0" aria-label="お気に入りを選ぶ" onclick="show('homeFavoriteSelect')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();show('homeFavoriteSelect')}">${vis(mon,`onload="this.parentElement.style.setProperty('--portrait-ratio',this.naturalWidth/this.naturalHeight)"`)}</div>`:'<div class="home-favorite-empty">最初の仲間を迎えよう</div>'}</div>`;
  }
  if(typeof ResizeObserver==='function'){
    r.observer=new ResizeObserver(scheduleWaterHomeLayout);
    for(const id of ['home','homeBanner','homeNamePlate','homeActions']){const el=document.getElementById(id);if(el)r.observer.observe(el);}
  }
  scheduleWaterHomeLayout();syncWaterHomeMedia();
}
window.addEventListener('resize',scheduleWaterHomeLayout);
window.visualViewport?.addEventListener('resize',scheduleWaterHomeLayout);
document.addEventListener('visibilitychange',syncWaterHomeMedia);
window.addEventListener('pagehide',()=>{waterHomePageHidden=true;disposeWaterHome();});
window.addEventListener('pageshow',()=>{waterHomePageHidden=false;if(document.getElementById('home')?.classList.contains('active'))renderHomeFavorite();});
waterHomeReduced?.addEventListener?.('change',()=>{if(document.getElementById('home')?.classList.contains('active'))renderHomeFavorite();});
