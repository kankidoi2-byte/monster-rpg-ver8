const HOME_BANNER_INTERVAL=4000;
const homeBannerMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)');
let homeBannerIndex=0,homeBannerTimer=null,homeBannerReady=false;
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
  if(!homeBannerReady||screenId!=='home'||document.getElementById('homeMissionsSheet')?.open||document.hidden||homeBannerMotion?.matches||HOME_BANNERS.length<2)return;
  homeBannerTimer=setTimeout(()=>{
    if(document.getElementById('home')?.classList.contains('active')&&!document.hidden&&!homeBannerMotion?.matches){
      selectHomeBanner((homeBannerIndex+1)%HOME_BANNERS.length);
    }
  },HOME_BANNER_INTERVAL);
}
function selectHomeBanner(index){
  if(!Number.isInteger(index)||!HOME_BANNERS[index])return;
  const track=document.getElementById('homeBannerTrack'),dots=document.getElementById('homeBannerDots');
  if(!track||!dots)return;
  homeBannerIndex=index;
  track.style.transform=`translate3d(-${index*100}%,0,0)`;
  [...track.children].forEach((slide,i)=>{
    slide.inert=i!==index;
    slide.setAttribute('aria-hidden',String(i!==index));
  });
  [...dots.children].forEach((dot,i)=>{
    if(i===index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');
  });
  syncHomeBannerTimer();
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
    homeBannerReady=true;
    selectHomeBanner(homeBannerIndex);
  }else syncHomeBannerTimer();
}
document.addEventListener('visibilitychange',()=>syncHomeBannerTimer());
homeBannerMotion?.addEventListener?.('change',()=>syncHomeBannerTimer());
