const HOME_BANNER_INTERVAL=4000;
const HOME_BANNER_TAP_SLOP=8;
const HOME_BANNER_SWIPE_FRACTION=.2;
const HOME_BANNER_FLICK_WINDOW=100;
const HOME_BANNER_FLICK_DISTANCE=12;
const HOME_BANNER_FLICK_SPEED=.5;
const homeBannerMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
let homeBannerIndex=0,homeBannerTimer=null,homeBannerReady=false;
let homeBannerGesture=null,homeBannerWrap=null,homeBannerSuppressedClick=null;
function openHomeBannerTarget(target){
  switch(target){
    case 'missions':showHomeMissions();break;
    case 'story':openStoryMode();break;
    case 'notices':showNotices();break;
    case 'feedback':show('feedbackBox');break;
  }
}
function syncHomeBannerTimer(screenId=document.querySelector('.screen.active')?.id){
  clearTimeout(homeBannerTimer);
  homeBannerTimer=null;
  if(!homeBannerReady)return;
  if(screenId!=='home'||document.getElementById('homeMissionsSheet')?.open||document.hidden){
    cancelHomeBannerGesture();
    finishHomeBannerWrap();
    return;
  }
  if(homeBannerGesture||homeBannerMotion?.matches||HOME_BANNERS.length<2)return;
  homeBannerTimer=setTimeout(()=>{
    if(document.getElementById('home')?.classList.contains('active')&&!document.getElementById('homeMissionsSheet')?.open
      &&!homeBannerGesture&&!document.hidden&&!homeBannerMotion?.matches){
      stepHomeBanner(1);
    }
  },HOME_BANNER_INTERVAL);
}
function positionHomeBanner(track,slot){
  track.style.transform=`translate3d(${-slot*100}%,0,0)`;
}
function paintHomeBannerSelection(track,dots,index){
  const moveFocus=index!==homeBannerIndex&&track.contains(document.activeElement);
  homeBannerIndex=index;
  // Only real slides can open a banner or participate in keyboard navigation.
  for(let i=0;i<HOME_BANNERS.length;i++){
    const slide=track.children[i];
    slide.inert=i!==index;
    slide.setAttribute('aria-hidden',String(i!==index));
  }
  if(moveFocus)track.children[index].focus({preventScroll:true});
  [...dots.children].forEach((dot,i)=>{
    if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');
  });
}
function finishHomeBannerWrap(){
  if(!homeBannerWrap)return;
  const {track,timer}=homeBannerWrap;
  clearTimeout(timer);
  homeBannerWrap=null;
  track.classList.add('is-banner-instant');
  positionHomeBanner(track,homeBannerIndex);
  // The ghost and real card are pixel-identical; commit the jump without animating it.
  void track.offsetWidth;
  track.classList.remove('is-banner-instant');
}
function bannerTrackX(track){
  const transform=getComputedStyle(track).transform;
  return transform==='none'?0:new DOMMatrixReadOnly(transform).m41;
}
function selectHomeBanner(index,slot=index){
  if(!Number.isInteger(index)||!HOME_BANNERS[index])return;
  const track=document.getElementById('homeBannerTrack'),dots=document.getElementById('homeBannerDots');
  if(!track||!dots)return;
  if(homeBannerWrap&&index===homeBannerIndex&&slot===index&&!homeBannerGesture){
    syncHomeBannerTimer();
    return;
  }
  cancelHomeBannerGesture();
  finishHomeBannerWrap();
  paintHomeBannerSelection(track,dots,index);
  if(slot===index||homeBannerMotion?.matches){
    positionHomeBanner(track,index);
  }else{
    // A directional wrap moves by one card to the adjacent ghost, not through the deck.
    homeBannerWrap={track,slot,timer:setTimeout(finishHomeBannerWrap,450)};
    positionHomeBanner(track,slot);
  }
  syncHomeBannerTimer();
}
function stepHomeBanner(direction){
  const length=HOME_BANNERS.length,slot=homeBannerIndex+direction;
  selectHomeBanner((slot+length)%length,slot);
}
function suppressHomeBannerClick(pointerId){
  homeBannerSuppressedClick={pointerId,until:performance.now()+500};
}
function guardHomeBannerClick(event){
  const blocked=homeBannerSuppressedClick;
  if(!blocked||performance.now()>blocked.until||!event.detail
    ||(event.pointerType&&event.pointerType!=='touch')
    ||(event.pointerId>0&&event.pointerId!==blocked.pointerId))return;
  homeBannerSuppressedClick=null;
  event.preventDefault();
  event.stopImmediatePropagation();
}
function beginHomeBannerGesture(event){
  if(homeBannerGesture||event.pointerType!=='touch'||!event.isPrimary||event.button!==0||HOME_BANNERS.length<2)return;
  const track=document.getElementById('homeBannerTrack'),viewport=event.currentTarget;
  const width=track.getBoundingClientRect().width;
  if(!width)return;
  let base=100*bannerTrackX(track)/width;
  if(homeBannerWrap){
    // The two ends show the same pair. Rebase an interrupted wrap without a jump.
    const {slot,timer}=homeBannerWrap;
    clearTimeout(timer);
    homeBannerWrap=null;
    base+=(slot<0?-1:1)*HOME_BANNERS.length*100;
  }
  homeBannerGesture={track,viewport,id:event.pointerId,x:event.clientX,y:event.clientY,axis:null,base,
    samples:[[event.clientX,event.timeStamp]]};
  track.classList.add('is-dragging');
  track.style.transform=`translate3d(${base}%,0,0)`;
  syncHomeBannerTimer();
}
function moveHomeBannerGesture(event,capture=true){
  const swipe=homeBannerGesture;
  if(!swipe||event.pointerId!==swipe.id)return;
  const dx=event.clientX-swipe.x,dy=event.clientY-swipe.y;
  if(!swipe.axis&&Math.max(Math.abs(dx),Math.abs(dy))>=HOME_BANNER_TAP_SLOP){
    swipe.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
    if(swipe.axis==='x'&&capture){
      try{swipe.viewport.setPointerCapture(swipe.id);}catch{/* Synthetic or already released pointer. */}
    }
  }
  const samples=swipe.samples;
  if(samples.at(-1)[1]===event.timeStamp)samples.at(-1)[0]=event.clientX;
  else samples.push([event.clientX,event.timeStamp]);
  while(samples.length>2&&samples[1][1]<=event.timeStamp-HOME_BANNER_FLICK_WINDOW)samples.shift();
  if(swipe.axis!=='x')return;
  const width=swipe.track.getBoundingClientRect().width;
  const origin=swipe.base*width/100;
  // At most one card in either direction; keep the track within the ghost ends.
  const offset=Math.min(width-origin,Math.max(-HOME_BANNERS.length*width-origin,Math.max(-width,Math.min(width,dx))));
  swipe.track.style.transform=`translate3d(calc(${swipe.base}% + ${offset}px),0,0)`;
}
function settleHomeBannerGesture(swipe){
  homeBannerGesture=null;
  // Commit the dragged position before turning the transition back on for the snap.
  void swipe.track.offsetWidth;
  swipe.track.classList.remove('is-dragging');
  if(swipe.viewport.hasPointerCapture(swipe.id))swipe.viewport.releasePointerCapture(swipe.id);
}
function cancelHomeBannerGesture(){
  const swipe=homeBannerGesture;
  if(!swipe)return;
  suppressHomeBannerClick(swipe.id);
  positionHomeBanner(swipe.track,homeBannerIndex);
  settleHomeBannerGesture(swipe);
}
function endHomeBannerGesture(event,cancelled=false){
  const swipe=homeBannerGesture;
  if(!swipe||event.pointerId!==swipe.id)return;
  if(cancelled){
    cancelHomeBannerGesture();
    syncHomeBannerTimer();
    return;
  }
  moveHomeBannerGesture(event,false);
  let direction=0;
  if(swipe.axis==='x'){
    const dx=event.clientX-swipe.x;
    const width=swipe.track.getBoundingClientRect().width;
    const [sampleX,sampleTime]=swipe.samples.find(([,t])=>t>=event.timeStamp-HOME_BANNER_FLICK_WINDOW&&t<event.timeStamp)||swipe.samples[0];
    const flick=event.clientX-sampleX;
    if(width&&Math.abs(dx)>=width*HOME_BANNER_SWIPE_FRACTION)direction=-Math.sign(dx);
    else if(Math.abs(flick)>=HOME_BANNER_FLICK_DISTANCE&&Math.abs(flick)/Math.max(1,event.timeStamp-sampleTime)>=HOME_BANNER_FLICK_SPEED)direction=-Math.sign(flick);
  }
  if(swipe.axis)suppressHomeBannerClick(swipe.id);
  settleHomeBannerGesture(swipe);
  if(direction)stepHomeBanner(direction);
  else selectHomeBanner(homeBannerIndex);
}
function addHomeBannerGestures(track){
  if(HOME_BANNERS.length>1){
    for(const [edge,source,slot] of [['before',HOME_BANNERS.length-1,-1],['after',0,HOME_BANNERS.length]]){
      const ghost=track.children[source].cloneNode(true);
      ghost.dataset.bannerClone=edge;
      delete ghost.dataset.bannerId;
      ghost.inert=true;ghost.tabIndex=-1;ghost.setAttribute('aria-hidden','true');
      ghost.style.left=`${slot*100}%`;
      track.append(ghost);
    }
  }
  const viewport=document.getElementById('homeBannerViewport');
  if(!viewport)return;
  viewport.addEventListener('pointerdown',event=>{
    if(!homeBannerGesture&&(event.pointerType!=='touch'||event.isPrimary))homeBannerSuppressedClick=null;
    if(homeBannerGesture&&event.pointerType==='touch'&&!event.isPrimary){
      cancelHomeBannerGesture();
      syncHomeBannerTimer();
    }else beginHomeBannerGesture(event);
  },{passive:true});
  viewport.addEventListener('pointermove',event=>moveHomeBannerGesture(event),{passive:true});
  viewport.addEventListener('pointerup',event=>endHomeBannerGesture(event),{passive:true});
  viewport.addEventListener('pointercancel',event=>endHomeBannerGesture(event,true),{passive:true});
  viewport.addEventListener('lostpointercapture',event=>{
    if(event.target===viewport)endHomeBannerGesture(event,true);
  });
  viewport.addEventListener('click',guardHomeBannerClick,true);
  track.addEventListener('transitionend',event=>{
    if(!homeBannerWrap||event.target!==track||event.propertyName!=='transform')return;
    if(Math.abs(bannerTrackX(track)+homeBannerWrap.slot*track.getBoundingClientRect().width)<1)finishHomeBannerWrap();
  });
}
function renderHomeBanners(){
  const track=document.getElementById('homeBannerTrack'),dots=document.getElementById('homeBannerDots');
  if(!track||!dots)return;
  if(!homeBannerReady){
    for(const [index,banner] of HOME_BANNERS.entries()){
      const slide=document.createElement('button');
      slide.type='button';slide.className='home-banner-slide';slide.dataset.bannerId=banner.id;
      slide.setAttribute('aria-label',banner.title+'。'+banner.description);
      slide.addEventListener('click',()=>openHomeBannerTarget(banner.target));
      if(banner.image){
        const art=document.createElement('img');
        art.className='home-banner-image';art.src=banner.image;art.alt='';art.draggable=false;slide.append(art);
      }else{
        const tag=document.createElement('span'),copy=document.createElement('span');
        const title=document.createElement('strong'),description=document.createElement('small');
        tag.className='home-banner-tag';tag.textContent=banner.tag;
        copy.className='home-banner-copy';title.textContent=banner.title;description.textContent=banner.description;
        copy.append(title,description);slide.append(tag,copy);
      }
      const dot=document.createElement('button');
      dot.type='button';dot.setAttribute('aria-label',`${index+1}枚目：${banner.title}`);
      dot.addEventListener('click',()=>selectHomeBanner(index));
      track.append(slide);dots.append(dot);
    }
    addHomeBannerGestures(track);
    homeBannerReady=true;
    selectHomeBanner(homeBannerIndex);
  }else syncHomeBannerTimer();
}
document.addEventListener('visibilitychange',()=>syncHomeBannerTimer());
homeBannerMotion?.addEventListener?.('change',()=>{
  finishHomeBannerWrap();
  syncHomeBannerTimer();
});
