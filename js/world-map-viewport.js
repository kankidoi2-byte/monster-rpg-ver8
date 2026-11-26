/* View-only camera. Legacy navigation.overviewScrollLeft retains its old meaning;
 * camera coordinates are deliberately not persisted. */
let worldMapCamera = null;
let worldMapViewportCleanup = null;
let worldMapSuppressClickUntil = 0;
function worldMapIgnoreClick(){return Date.now()<worldMapSuppressClickUntil;}
function cleanupWorldMapViewport({reset=false}={}){
  worldMapViewportCleanup?.();worldMapViewportCleanup=null;
  if(reset)worldMapCamera=null;
}
function worldMapClampCamera(camera,width,height){
  const base=Math.max(width,height),scale=Math.min(2.4,Math.max(1,Number(camera.scale)||1)),size=base*scale;
  return {...camera,scale,x:Math.min(0,Math.max(width-size,Number(camera.x)||0)),y:Math.min(0,Math.max(height-size,Number(camera.y)||0)),width,height,size};
}
function worldMapCameraForPoint(camera,point,width,height,panelHeight=0){
  const next=worldMapClampCamera(camera,width,height);
  return worldMapClampCamera({...next,x:width/2-next.size*point.x/100,y:Math.max(0,height-panelHeight)/2-next.size*point.y/100},width,height);
}
function worldMapZoomAt(camera,scale,point,width,height){
  const current=worldMapClampCamera(camera,width,height);
  const next=worldMapClampCamera({...current,scale},width,height);
  const ratio=next.size/current.size;
  return worldMapClampCamera({...next,x:point.x-(point.x-current.x)*ratio,y:point.y-(point.y-current.y)*ratio},width,height);
}
function setupWorldMapViewport(list){
  const viewport=list.querySelector('.wm-viewport'),terrain=list.querySelector('.wm-map');
  if(!viewport?.getBoundingClientRect||!terrain?.style)return;
  const pins=[...list.querySelectorAll('[data-wm-point]')],sheet=list.querySelector('.wm-sheet');
  const timers=new Set(),pointers=new Map();
  let width=0,height=0,gesture=null,dragged=false,disposed=false;
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);timers.add(id);};
  const reduce=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function markVisibleDiscoveries(){
    if(typeof save==='undefined')return;
    const pending=worldMapPendingIds(),owner=save;
    const targets=pins.filter(pin=>pending.includes(pin.dataset.wmPoint)&&!pin.hidden);
    const beyond=list.querySelector('[data-wm-beyond]');
    if(beyond)targets.push(beyond);
    for(const target of targets){
      const ids=target===beyond?pending.filter(id=>WORLD_MAP_BEYOND_IDS.includes(id)&&MAPS.some(map=>map.id===id&&worldMapVisible(map))):[target.dataset.wmPoint];
      if(!ids.length||target.dataset.wmGlowing)continue;
      target.dataset.wmGlowing='true';target.classList.add('wm-new-glow');
      later(()=>{
        target.classList.remove('wm-new-glow');
        if(save!==owner)return;
        ids.forEach(id=>worldMapUpdateDiscovery(id));
      },reduce()?0:1200);
    }
  }
  function draw(){
    worldMapCamera=worldMapClampCamera(worldMapCamera,width,height);
    const {x,y,size}=worldMapCamera;
    terrain.style.width=`${size}px`;terrain.style.height=`${size}px`;terrain.style.transform=`translate(${x}px,${y}px)`;
    for(const pin of pins){
      const point=worldMapPoint(pin.dataset.wmPoint);
      const px=x+size*point.x/100,py=y+size*point.y/100;
      pin.style.left=`${px}px`;pin.style.top=`${py}px`;
      // Keep labels inside the viewport without moving their geographic anchor.
      pin.style.setProperty('--wm-label-shift',`${Math.min(0,width-54-px)+Math.max(0,54-px)}px`);
      pin.hidden=px<16||px>width-16||py<18||py>height-24;
    }
    markVisibleDiscoveries();
  }
  function measure(initial=false){
    const rect=viewport.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const old=worldMapCamera;width=rect.width;height=rect.height;
    if(sheet&&old&&(old.width!==width||old.height!==height))sheet.style.maxHeight='';
    worldMapCamera=worldMapClampCamera(old||{scale:1,x:0,y:0},width,height);
    const point=worldMapPoint(worldMapSelectedId||(worldMapCityOpen?'royal_capital':null));
    if(point&&(initial||!old||old.width!==width||old.height!==height)){
      list.classList.add('wm-centering');
      let panelHeight=sheet?.getBoundingClientRect().height||0;
      worldMapCamera=worldMapCameraForPoint(worldMapCamera,point,width,height,panelHeight);
      // Near the south edge, translation alone cannot uncover a pin without
      // exposing blank terrain. Increase zoom only as needed, then constrain
      // the sheet if even the maximum zoom cannot leave a full tap target.
      if(sheet&&worldMapCamera.y+worldMapCamera.size*point.y/100>height-panelHeight-40){
        const needed=(panelHeight+40)/(Math.max(width,height)*Math.max(.01,1-point.y/100));
        worldMapCamera=worldMapCameraForPoint({...worldMapCamera,scale:Math.max(worldMapCamera.scale,needed)},point,width,height,panelHeight);
        const room=height-(worldMapCamera.y+worldMapCamera.size*point.y/100)-40;
        if(room<panelHeight){sheet.style.maxHeight=`${Math.max(76,room)}px`;panelHeight=sheet.getBoundingClientRect().height;}
        worldMapCamera=worldMapCameraForPoint(worldMapCamera,point,width,height,panelHeight);
      }
      later(()=>list.classList.remove('wm-centering'),300);
    }else if(!old)worldMapCamera=worldMapCameraForPoint(worldMapCamera,{x:49,y:38},width,height);
    else if(!initial&&(old.width!==width||old.height!==height)){
      const center={x:(old.width/2-old.x)/old.size*100,y:(old.height/2-old.y)/old.size*100};
      worldMapCamera=worldMapCameraForPoint(worldMapCamera,point||center,width,height,point?(sheet?.getBoundingClientRect().height||0):0);
    }
    draw();
  }
  const pointOf=event=>{const rect=viewport.getBoundingClientRect();return {x:event.clientX-rect.left,y:event.clientY-rect.top};};
  function rebase(){
    const points=[...pointers.values()];
    gesture={camera:{...worldMapCamera},points};
  }
  viewport.onpointerdown=event=>{
    if(event.button!==0&&event.pointerType==='mouse')return;
    if(!worldMapCamera)return;
    if(!pointers.size)dragged=false;
    pointers.set(event.pointerId,pointOf(event));
    // Capture only after movement: a stationary pin tap must keep its button target.
    rebase();
  };
  viewport.onpointermove=event=>{
    if(!pointers.has(event.pointerId)||!gesture)return;
    pointers.set(event.pointerId,pointOf(event));
    const points=[...pointers.values()],base=gesture.points;
    if(points.length===1){
      const dx=points[0].x-base[0].x,dy=points[0].y-base[0].y;
      if(!dragged&&Math.hypot(dx,dy)<6)return;
      dragged=true;worldMapCamera={...gesture.camera,x:gesture.camera.x+dx,y:gesture.camera.y+dy};
    }else{
      dragged=true;
      const mid=pts=>({x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2});
      const distance=pts=>Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const before=mid(base),after=mid(points);
      worldMapCamera=worldMapZoomAt(gesture.camera,gesture.camera.scale*distance(points)/Math.max(1,distance(base)),before,width,height);
      worldMapCamera.x+=after.x-before.x;worldMapCamera.y+=after.y-before.y;
    }
    worldMapSuppressClickUntil=Date.now()+350;
    viewport.setPointerCapture?.(event.pointerId);event.preventDefault();draw();
  };
  const end=event=>{
    if(!pointers.has(event.pointerId))return;
    pointers.delete(event.pointerId);if(dragged)worldMapSuppressClickUntil=Date.now()+350;
    if(pointers.size)rebase();else gesture=null;
  };
  viewport.onpointerup=end;viewport.onpointercancel=end;viewport.onlostpointercapture=end;
  const wheel=event=>{event.preventDefault();if(!worldMapCamera)return;worldMapCamera=worldMapZoomAt(worldMapCamera,worldMapCamera.scale*Math.exp(-event.deltaY*.002),pointOf(event),width,height);draw();};
  viewport.addEventListener('wheel',wheel,{passive:false});
  viewport.onkeydown=event=>{
    if(event.target!==viewport||!worldMapCamera)return;
    const moves={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};
    if(moves[event.key]){event.preventDefault();worldMapCamera.x+=moves[event.key][0];worldMapCamera.y+=moves[event.key][1];draw();}
    else if(['+','-','='].includes(event.key)){event.preventDefault();worldMapCamera=worldMapZoomAt(worldMapCamera,worldMapCamera.scale*(event.key==='-'?.85:1.15),{x:width/2,y:height/2},width,height);draw();}
  };
  measure(true);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>measure()):null;
  observer?.observe(viewport);if(sheet)observer?.observe(sheet);
  worldMapViewportCleanup=()=>{
    disposed=true;observer?.disconnect();timers.forEach(clearTimeout);viewport.removeEventListener('wheel',wheel);
    viewport.onpointerdown=viewport.onpointermove=viewport.onpointerup=viewport.onpointercancel=viewport.onlostpointercapture=viewport.onkeydown=null;
  };
}
