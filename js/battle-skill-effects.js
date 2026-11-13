// Adopted 2026-11-13 skill effects prototype, adapted to battle coordinates.
// All clocks and layers are visual only: callers own gameplay results and saves.
function startBattleSkillEffect({stage,source,target,profile,rate=1,short=false,cleanupRegistry}){
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d');
  const CW=stage.clientWidth,CH=stage.clientHeight;
  if(!ctx||!CW||!CH)return null;
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(CW*dpr); canvas.height=Math.round(CH*dpr);
  canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',zIndex:'12',pointerEvents:'none'});
  stage.append(canvas);
  let active=true,frame,finished=false,settleContact,settleTail,last=null;
  const contactPromise=new Promise(r=>{settleContact=r;});
  const tail=new Promise(r=>{settleTail=r;});
  const contact=()=>{if(active)settleContact(true);};
  const cues=new Map();
  function hpCue(label){
    if(!cues.has(label)){
      let resolve;const promise=new Promise(r=>{resolve=r;});
      cues.set(label,{promise,resolve});
    }
    return cues.get(label);
  }
  const cueHpDelta=label=>{if(active)hpCue(label).resolve(true);};
  const whenHpCue=label=>active?hpCue(label).promise:Promise.resolve(false);

  const pose=el=>{
    const host=el.querySelector('.visual-wrap img, .visual-wrap video, img, video')||el;
    const base=stage.getBoundingClientRect(),r=host.getBoundingClientRect();
    const xScale=base.width/CW||1,yScale=base.height/CH||1;
    return {el:host,x:0,y:0,sx:1,sy:1,flash:0,alpha:1,glow:0,baseline:{
      x:(r.left+r.width/2-base.left)/xScale,y:(r.top-base.top)/yScale,h:r.height/yScale,
    },styles:Object.fromEntries(['translate','scale','filter','opacity'].map(k=>[k,host.style[k]]))};
  };
  const P=pose(source),EN=source===target?P:pose(target);
  const S={short},SKY={thunder:1,light:1,star:1};
  const center=(e,y=.55)=>({x:e.baseline.x+e.x,y:e.baseline.y+e.baseline.h*y+e.y});
  const dirPE=()=>{const p=center(P),e=center(EN),dx=e.x-p.x,dy=e.y-p.y,L=Math.hypot(dx,dy)||1; return {x:dx/L,y:dy/L,L};};
  const flashO={a:0},dimO={a:0},nameO={a:0,s:1},bandO={x:-1.3,a:0,text:'',colorA:'',colorB:''};
const EL={
  normal:{name:'無',c:'#f4f6fa',g:'#aab4c4',d:'#5b6474',grav:700},
  fire:{name:'火',c:'#ffc45a',g:'#ff5a1f',d:'#a8200a',grav:-150},
  water:{name:'水',c:'#a8e6ff',g:'#2f8fff',d:'#0a3f9a',grav:620},
  grass:{name:'草',c:'#c8f78a',g:'#3fb84a',d:'#17662a',grav:160},
  thunder:{name:'雷',c:'#fffbc0',g:'#ffd21f',d:'#a87400',grav:320},
  wind:{name:'風',c:'#e4fff6',g:'#5fe0c0',d:'#1f8a78',grav:0},
  light:{name:'光',c:'#fffdf0',g:'#ffe27a',d:'#c79a1f',grav:-50},
  dark:{name:'闇',c:'#d2b0ff',g:'#7a35d8',d:'#1c0a3a',grav:-90},
  star:{name:'星',c:'#ffe0f8',g:'#ff6ad0',d:'#3a6aff',grav:60},
  dragon:{name:'竜',c:'#c6ccff',g:'#5a5cff',d:'#c2183f',grav:220}
};

const E_={lin:t=>t,out:t=>1-Math.pow(1-t,3),inQ:t=>t*t,inOut:t=>-(Math.cos(Math.PI*t)-1)/2,
  back:t=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)},
  elastic:t=>t===0?0:t===1?1:Math.pow(2,-9*t)*Math.sin((t*10-0.75)*(2*Math.PI/3.2))+1};
let gTime=0,freezeLeft=0,freezeCbs=[],trauma=0,shakeT=0;
const tweens=[],timers=[];
function tw(o,to,dur,e=E_.out,delay=0){return new Promise(res=>active?tweens.push({o,to,dur:Math.max(1,dur),e,t:-delay,from:null,res}):res())}
function kill(o){for(let i=tweens.length-1;i>=0;i--) if(tweens[i].o===o){const r=tweens[i].res;tweens.splice(i,1);r();}}
function wait(ms){return new Promise(res=>active?timers.push({at:gTime+ms,res}):res())}
function hitStop(ms){if(!active||ms<=0) return Promise.resolve(); freezeLeft=Math.max(freezeLeft,ms); return new Promise(r=>freezeCbs.push(r))}
function vib(ms){if(navigator.vibrate){try{navigator.vibrate(ms)}catch(e){}}}
// Do not consume Math.random: the live battle engine uses that stream.
const entropy=new Uint32Array(1);
if(typeof crypto!=='undefined'&&typeof crypto.getRandomValues==='function')crypto.getRandomValues(entropy);
let visualSeed=entropy[0]||((Date.now()^(CW<<16)^CH)>>>0)||1;
const random=()=>((visualSeed=(Math.imul(visualSeed,1664525)+1013904223)>>>0)/4294967296);
const R=(a,b)=>a+random()*(b-a);


const parts=[],projs=[];
function addP(p){const q=Object.assign({age:0,drag:.9,grav:0,size:3,color:'#fff',type:'spark',vx:0,vy:0,rot:R(0,6.28),spin:R(-6,6)},p);if(active&&parts.length<400)parts.push(q);return q}
// 属性ごとの粒を1つ出す
function elP(k,x,y,vx,vy,life,size){
  const e=EL[k],b={x,y,vx,vy,life,size,grav:e.grav};
  switch(k){
    case 'fire': return addP({...b,type:'ember',color:e.g,core:'#fff1b8'});
    case 'water': return addP({...b,type:'drop',color:e.g,core:e.c,drag:.94});
    case 'grass': return addP({...b,type:'leaf',color:random()<.5?e.g:e.c,drag:.92});
    case 'thunder': return addP({...b,type:'spark',color:e.c,size:size*.7,drag:.84});
    case 'wind': return addP({...b,type:'streak',color:e.c,drag:.93});
    case 'light': return addP({...b,type:'star4',color:e.c,glow:e.g,size:size*1.1});
    case 'dark': return random()<.5?addP({...b,type:'smoke',color:e.d,size:size*1.6,drag:.9}):addP({...b,type:'ember',color:e.g,core:e.c});
    case 'star': return addP({...b,type:'star4',color:random()<.5?e.c:'#c8f4ff',glow:random()<.5?e.g:e.d,size:size*1.3});
    case 'dragon': return addP({...b,type:'shard',color:random()<.6?e.g:e.d,core:e.c,size:size*1.2,drag:.9});
    default: return addP({...b,type:'spark',color:e.c,size:size*.7,drag:.86});
  }
}
function burst(c,k,n,s=1,d=null){
  const base=d?Math.atan2(d.y,d.x):0,spread=d?2.4:6.28;
  for(let i=0;i<n;i++){
    const a=base+(random()-.5)*spread,sp=R(120,520)*s;
    elP(k,c.x,c.y,Math.cos(a)*sp,Math.sin(a)*sp,R(.28,.6),R(3,6.5)*s);
  }
}
function ring(c,color,r1=90,life=.35,w=10,r0=8){addP({x:c.x,y:c.y,type:'ring',r0,r1,life,color,size:w})}
function ringIn(c,color,r0=150,life=.5,w=5){addP({x:c.x,y:c.y,type:'ringIn',r0,r1:8,life,color,size:w})}
function slash(c,ang,s,core,glow,len=170){addP({x:c.x,y:c.y,type:'slash',ang,len:len*s,life:.26,color:core,glow,size:13*s})}
function inward(c,k,n,r,life){
  for(let i=0;i<n;i++){const a=R(0,6.28),rr=r*R(.7,1.1),p=elP(k,c.x+Math.cos(a)*rr,c.y+Math.sin(a)*rr,-Math.cos(a)*rr/life,-Math.sin(a)*rr/life,life,R(3,6));p.drag=1;p.grav=0;}
}
function bolt(x0,y0,x1,y1,k,w=4,life=.2){
  const e=EL[k],pts=[[x0,y0]],n=7;
  for(let i=1;i<n;i++){const t=i/n;pts.push([x0+(x1-x0)*t+R(-22,22),y0+(y1-y0)*t+R(-8,8)])}
  pts.push([x1,y1]); addP({type:'bolt',pts,life,color:e.c,glow:e.g,size:w,x:x1,y:y1});
}

function updateParts(dt){
  if(dt<=0) return;
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i]; p.age+=dt;
    if(p.age>=p.life){parts.splice(i,1);continue}
    if(p.orb){const o=p.orb; o.ang+=o.av*dt; o.rad=Math.max(4,o.rad+o.rv*dt);
      const nx=o.cx+Math.cos(o.ang)*o.rad,ny=o.cy+o.yo-o.lift*p.age+Math.sin(o.ang)*o.rad*.38;
      p.vx=(nx-p.x)/dt; p.vy=(ny-p.y)/dt; p.x=nx; p.y=ny; continue;}
    const dr=Math.pow(p.drag,dt*60); p.vx*=dr; p.vy*=dr; p.vy+=p.grav*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.rot+=p.spin*dt;
  }
  for(const pr of projs){ if(pr.path&&pr.active){const q=pr.path,t=pr.t,u=1-t; pr.x=u*u*q[0]+2*u*t*q[2]+t*t*q[4]; pr.y=u*u*q[1]+2*u*t*q[3]+t*t*q[5];} }
  for(const pr of projs){ if(!pr.active||!pr.el) continue;
    elP(pr.el,pr.x+R(-6,6),pr.y+R(-6,6),R(-50,50),R(-50,50),R(.2,.4),R(2.5,5)*(pr.r/12)); }
}
function star4(x,y,r,rot){ctx.beginPath();for(let i=0;i<8;i++){const a=rot+i*Math.PI/4,rr=i%2?r*.32:r;ctx[i?'lineTo':'moveTo'](x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.closePath()}
function drawParts(){
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,CW,CH);
  // Extra strikes can shake their visual layer without disturbing battle controls.
  ctx.save();
  const amp=16*trauma*trauma;
  ctx.translate(amp*(Math.sin(shakeT*53.1)*.6+Math.sin(shakeT*91.7)*.4),amp*(Math.sin(shakeT*61.3+1.7)*.6+Math.sin(shakeT*79.9+.3)*.4));
  ctx.lineCap='round'; ctx.lineJoin='round';
  for(const p of parts){
    const t=p.age/p.life; ctx.globalAlpha=1;
    switch(p.type){
    case 'spark': ctx.globalAlpha=1-t; ctx.strokeStyle=p.color; ctx.lineWidth=p.size*(1-t*.6);
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*.028,p.y-p.vy*.028); ctx.stroke(); break;
    case 'streak': ctx.globalAlpha=(1-t)*.85; ctx.strokeStyle=p.color; ctx.lineWidth=Math.max(1,p.size*.45);
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.quadraticCurveTo(p.x-p.vx*.04+p.vy*.015,p.y-p.vy*.04-p.vx*.015,p.x-p.vx*.085,p.y-p.vy*.085); ctx.stroke(); break;
    case 'ember': {const r=p.size*(1-t);
      ctx.globalAlpha=.3*(1-t); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,r*2.4,0,7); ctx.fill();
      ctx.globalAlpha=1-t*.5; ctx.fillStyle=p.core||'#fff'; ctx.beginPath(); ctx.arc(p.x,p.y,r*.8,0,7); ctx.fill();
      ctx.globalAlpha=1-t; ctx.strokeStyle=p.color; ctx.lineWidth=1.5; ctx.stroke(); break;}
    case 'drop': {const r=p.size*(1-t*.5);
      ctx.globalAlpha=(1-t)*.9; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,r,0,7); ctx.fill();
      ctx.fillStyle=p.core; ctx.beginPath(); ctx.arc(p.x-r*.3,p.y-r*.3,r*.45,0,7); ctx.fill(); break;}
    case 'leaf': ctx.globalAlpha=1-t*t; ctx.fillStyle=p.color; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.beginPath(); ctx.ellipse(0,0,p.size*1.5,p.size*.6,0,0,7); ctx.fill(); ctx.restore(); break;
    case 'star4': {const r=p.size*(1-t)*(1+.3*Math.sin(p.age*30));
      ctx.globalAlpha=(1-t)*.5; ctx.fillStyle=p.glow||p.color; star4(p.x,p.y,r*1.9,p.rot); ctx.fill();
      ctx.globalAlpha=1-t; ctx.fillStyle=p.color; star4(p.x,p.y,r*1.2,p.rot); ctx.fill(); break;}
    case 'smoke': ctx.globalAlpha=.55*(1-t); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(1+t*1.6),0,7); ctx.fill(); break;
    case 'shard': ctx.globalAlpha=1-t; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.atan2(p.vy,p.vx));
      ctx.fillStyle=p.color; ctx.beginPath(); ctx.moveTo(p.size*1.6,0); ctx.lineTo(0,p.size*.6); ctx.lineTo(-p.size*1.1,0); ctx.lineTo(0,-p.size*.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=p.core; ctx.lineWidth=1; ctx.stroke(); ctx.restore(); break;
    case 'ring': case 'ringIn': {const k=p.type==='ring'?E_.out(t):E_.inQ(t),r=p.r0+(p.r1-p.r0)*k;
      ctx.globalAlpha=p.type==='ring'?1-t:Math.min(1,t*2.5)*(1-t*.3); ctx.strokeStyle=p.color;
      ctx.lineWidth=Math.max(.5,p.size*(p.type==='ring'?(1-t):1)); ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(1,r),0,7); ctx.stroke(); break;}
    case 'slash': {const k=Math.min(1,t/.3),fade=t<.3?1:1-(t-.3)/.7,h=p.len/2,cx=Math.cos(p.ang),cy=Math.sin(p.ang);
      const x1=p.x-cx*h,y1=p.y-cy*h,x2=x1+cx*p.len*k,y2=y1+cy*p.len*k;
      ctx.globalAlpha=fade*.6; ctx.strokeStyle=p.glow; ctx.lineWidth=p.size*2*fade; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.globalAlpha=fade; ctx.strokeStyle=p.color; ctx.lineWidth=p.size*fade; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.strokeStyle='#fff'; ctx.lineWidth=p.size*.35*fade; ctx.stroke(); break;}
    case 'bolt': {const a=(1-t)*(Math.sin(p.age*90)>-.3?1:.35);
      ctx.beginPath(); p.pts.forEach((q,i)=>ctx[i?'lineTo':'moveTo'](q[0],q[1]));
      ctx.globalAlpha=a*.5; ctx.strokeStyle=p.glow; ctx.lineWidth=p.size*3; ctx.stroke();
      ctx.globalAlpha=a; ctx.strokeStyle=p.color; ctx.lineWidth=p.size; ctx.stroke();
      ctx.strokeStyle='#fff'; ctx.lineWidth=p.size*.4; ctx.stroke(); break;}
    case 'ray': {const w=p.size*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.05)),.5);
      ctx.globalAlpha=.4; ctx.fillStyle=p.glow; ctx.fillRect(p.x-w*1.3,-10,w*2.6,p.y+10);
      ctx.globalAlpha=.9; ctx.fillStyle=p.color; ctx.fillRect(p.x-w*.6,-10,w*1.2,p.y+10);
      ctx.fillStyle='#fff'; ctx.fillRect(p.x-w*.25,-10,w*.5,p.y+10);
      ctx.globalAlpha=.5*(1-t); ctx.fillStyle=p.glow; ctx.beginPath(); ctx.ellipse(p.x,p.y,w*2.6,w*.8,0,0,7); ctx.fill(); break;}
    case 'beam': {const w=p.size*Math.pow(Math.sin(Math.PI*Math.min(1,t*1.05)),.6);
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x2,p.y2);
      ctx.globalAlpha=.45; ctx.strokeStyle=p.glow; ctx.lineWidth=w*2.3; ctx.stroke();
      ctx.globalAlpha=.95; ctx.strokeStyle=p.color; ctx.lineWidth=w; ctx.stroke();
      ctx.strokeStyle='#fff'; ctx.lineWidth=w*.4; ctx.stroke(); break;}
    case 'fang': {const k=E_.out(Math.min(1,t/.4)),a=t<.55?1:1-(t-.55)/.45,s=p.size,gap=(1-k)*52*s,tw_=15*s,th=30*s;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.ang); ctx.globalAlpha=a;
      for(const sg of [-1,1]) for(let i=-2;i<=1;i++){const x=(i+.5)*tw_*1.12,h=th*(Math.abs(i+.5)<1?1:.72);
        ctx.beginPath(); ctx.moveTo(x-tw_/2,sg*(gap+h)); ctx.lineTo(x+tw_/2,sg*(gap+h)); ctx.lineTo(x,sg*gap+sg*-2); ctx.closePath();
        ctx.fillStyle=p.color; ctx.fill(); ctx.strokeStyle=p.glow; ctx.lineWidth=2.5; ctx.stroke();}
      ctx.restore(); break;}
    case 'arc': {const k=E_.out(Math.min(1,t/.55)),a=t<.5?1:1-(t-.5)/.5,a1=p.a0+p.span*k,a0=p.a0+p.span*Math.max(0,k-.55);
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,Math.min(a0,a1),Math.max(a0,a1));
      ctx.globalAlpha=a*.55; ctx.strokeStyle=p.glow; ctx.lineWidth=p.size*2.1; ctx.stroke();
      ctx.globalAlpha=a; ctx.strokeStyle=p.color; ctx.lineWidth=p.size; ctx.stroke();
      ctx.strokeStyle='#fff'; ctx.lineWidth=p.size*.3; ctx.stroke(); break;}
    case 'cone': {const k=E_.out(Math.min(1,t/.3)),a=t<.4?1:1-(t-.4)/.6,L=p.len*k,w=p.size,px=-p.dy,py=p.dx;
      const bx=p.x-p.dx*p.len,by=p.y-p.dy*p.len,tx=bx+p.dx*(L+p.len*.25),ty=by+p.dy*(L+p.len*.25);
      ctx.globalAlpha=a*.5; ctx.fillStyle=p.glow; ctx.beginPath(); ctx.moveTo(bx+px*w*1.7,by+py*w*1.7); ctx.lineTo(tx,ty); ctx.lineTo(bx-px*w*1.7,by-py*w*1.7); ctx.closePath(); ctx.fill();
      ctx.globalAlpha=a; ctx.fillStyle=p.color; ctx.beginPath(); ctx.moveTo(bx+px*w,by+py*w); ctx.lineTo(tx,ty); ctx.lineTo(bx-px*w,by-py*w); ctx.closePath(); ctx.fill(); break;}
    case 'poly': {const r=p.r*E_.out(Math.min(1,t/.35)),a=1-t;
      ctx.beginPath(); for(let i=0;i<p.n*2;i++){const an=p.rot0+i*Math.PI/p.n,rr=i%2?r*.42:r*p.j[i%p.j.length];ctx[i?'lineTo':'moveTo'](p.x+Math.cos(an)*rr,p.y+Math.sin(an)*rr)} ctx.closePath();
      ctx.globalAlpha=a*.9; ctx.fillStyle=p.color; ctx.fill(); ctx.strokeStyle=p.glow; ctx.lineWidth=4; ctx.stroke(); break;}
    case 'plus': {const s=p.size*(t<.2?t/.2:1); ctx.globalAlpha=1-t*t; ctx.fillStyle=p.glow; ctx.fillRect(p.x-s*.5-1.5,p.y-s*1.5-1.5,s+3,s*3+3); ctx.fillRect(p.x-s*1.5-1.5,p.y-s*.5-1.5,s*3+3,s+3);
      ctx.fillStyle=p.color; ctx.fillRect(p.x-s*.5,p.y-s*1.5,s,s*3); ctx.fillRect(p.x-s*1.5,p.y-s*.5,s*3,s); break;}
    case 'arrow': {const s=p.size,dn=p.down?-1:1; ctx.globalAlpha=Math.min(1,t*6)*(1-t*t);
      ctx.beginPath(); ctx.moveTo(p.x-s,p.y+dn*s*.7); ctx.lineTo(p.x,p.y-dn*s*.5); ctx.lineTo(p.x+s,p.y+dn*s*.7);
      ctx.strokeStyle=p.glow; ctx.lineWidth=s*.75; ctx.stroke(); ctx.strokeStyle=p.color; ctx.lineWidth=s*.38; ctx.stroke(); break;}
    case 'circle': {const k=E_.out(Math.min(1,t/.22)),a=t<.78?1:1-(t-.78)/.22,r=p.r*k,rot=p.age*(p.sp2||1);
      ctx.save(); ctx.translate(p.x,p.y); ctx.scale(1,p.sy||1);
      ctx.globalAlpha=a*.35; ctx.strokeStyle=p.glow; ctx.lineWidth=9; ctx.beginPath(); ctx.arc(0,0,r,0,7); ctx.stroke();
      ctx.globalAlpha=a; ctx.strokeStyle=p.color; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(0,0,r,0,7); ctx.stroke();
      ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(0,0,r*.8,0,7); ctx.stroke();
      ctx.save(); ctx.rotate(rot);
      for(const o of [0,Math.PI/3]){ctx.beginPath(); for(let i=0;i<3;i++){const an=o+i*2*Math.PI/3-Math.PI/2; ctx[i?'lineTo':'moveTo'](Math.cos(an)*r*.8,Math.sin(an)*r*.8)} ctx.closePath(); ctx.stroke();}
      ctx.restore(); ctx.save(); ctx.rotate(-rot*1.6); ctx.lineWidth=2;
      for(let i=0;i<24;i++){const an=i*Math.PI/12; ctx.beginPath(); ctx.moveTo(Math.cos(an)*r*.83,Math.sin(an)*r*.83); ctx.lineTo(Math.cos(an)*r*(i%3?.9:.97),Math.sin(an)*r*(i%3?.9:.97)); ctx.stroke();}
      ctx.restore(); ctx.restore(); break;}
    case 'crack': {const k=Math.min(1,t/.12),a=t<.6?1:1-(t-.6)/.4;
      ctx.globalAlpha=a; for(const ln of p.lines){const m=Math.max(2,Math.ceil(ln.length*k)); ctx.beginPath(); for(let i=0;i<m;i++) ctx[i?'lineTo':'moveTo'](ln[i][0],ln[i][1]);
        ctx.strokeStyle='#1a120c'; ctx.lineWidth=5; ctx.stroke(); ctx.strokeStyle=p.color; ctx.lineWidth=2; ctx.stroke();} break;}
    case 'pillar': {const a=(t<.15?t/.15:t>.7?1-(t-.7)/.3:1)*(.8+.2*Math.sin(p.age*40));
      for(let i=0;i<3;i++){const w=p.w*(1-i*.28),g=ctx.createLinearGradient(0,p.y,0,p.y-p.h);
        g.addColorStop(0,i===2?'#fff':p.color); g.addColorStop(.6,p.glow); g.addColorStop(1,'rgba(255,255,255,0)');
        ctx.globalAlpha=a*(.25+i*.2); ctx.fillStyle=g; ctx.fillRect(p.x-w/2,p.y-p.h,w,p.h);} break;}
    case 'clock': {const k=E_.back(Math.min(1,t/.2)),a=t<.75?1:1-(t-.75)/.25,r=p.r*k;
      ctx.save(); ctx.translate(p.x,p.y); ctx.globalAlpha=a*.35; ctx.strokeStyle=p.glow; ctx.lineWidth=10; ctx.beginPath(); ctx.arc(0,0,r,0,7); ctx.stroke();
      ctx.globalAlpha=a; ctx.strokeStyle=p.color; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,r,0,7); ctx.stroke();
      for(let i=0;i<12;i++){const an=i*Math.PI/6; ctx.lineWidth=i%3?2:4; ctx.beginPath(); ctx.moveTo(Math.cos(an)*r*.82,Math.sin(an)*r*.82); ctx.lineTo(Math.cos(an)*r*.95,Math.sin(an)*r*.95); ctx.stroke();}
      const h1=-p.age*9,h2=-p.age*2.2; ctx.lineCap='round';
      ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(h1)*r*.75,Math.sin(h1)*r*.75); ctx.stroke();
      ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(h2)*r*.5,Math.sin(h2)*r*.5); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(0,0,5,0,7); ctx.fill(); ctx.restore(); break;}
    case 'shield': {const k=E_.back(Math.min(1,t/.25)),a=t<.6?1:1-(t-.6)/.4,r=p.size*k;
      ctx.beginPath(); for(let i=0;i<6;i++){const an=Math.PI/6+i*Math.PI/3;ctx[i?'lineTo':'moveTo'](p.x+Math.cos(an)*r,p.y+Math.sin(an)*r*1.12)} ctx.closePath();
      ctx.globalAlpha=a*.28; ctx.fillStyle=p.color; ctx.fill(); ctx.globalAlpha=a; ctx.strokeStyle=p.color; ctx.lineWidth=4; ctx.stroke();
      ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke(); break;}
    }
  }
  for(const pr of projs){ if(!pr.active) continue;
    if(pr.hex){const r=pr.r; ctx.save(); ctx.translate(pr.x,pr.y); ctx.rotate(pr.rot||0);
      const hx=k=>{ctx.beginPath(); for(let i=0;i<6;i++){const an=i*Math.PI/3; ctx[i?'lineTo':'moveTo'](Math.cos(an)*r*k,Math.sin(an)*r*k)} ctx.closePath();};
      ctx.globalAlpha=.4; ctx.fillStyle=pr.g; hx(1.7); ctx.fill(); ctx.globalAlpha=1; ctx.fillStyle=pr.c; hx(1); ctx.fill();
      ctx.strokeStyle='#0b3a46'; ctx.lineWidth=3; ctx.stroke(); ctx.fillStyle='#fff'; hx(.42); ctx.fill();
      if(pr.cr>0){ctx.strokeStyle=pr.crc; ctx.lineWidth=2.5; for(const ln of pr.cracks){ctx.beginPath(); ctx.moveTo(0,0); ln.forEach((q,i)=>{if(i/ln.length<=pr.cr) ctx.lineTo(q[0]*r,q[1]*r)}); ctx.stroke();}}
      ctx.restore(); continue;}
    if(pr.blade){const r=pr.r; ctx.save(); ctx.translate(pr.x,pr.y); ctx.rotate(pr.rot);
      const cres=(k)=>{ctx.beginPath(); ctx.arc(0,0,r*k,-1.25,1.25); ctx.arc(r*.5*k,0,r*.86*k,1.05,-1.05,true); ctx.closePath();};
      ctx.globalAlpha=.45; ctx.fillStyle=pr.g; cres(1.35); ctx.fill();
      ctx.globalAlpha=1; ctx.strokeStyle=pr.dk; ctx.lineWidth=5; cres(1); ctx.stroke(); ctx.fillStyle=pr.c; ctx.fill(); ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke(); ctx.restore(); continue;}
    ctx.globalAlpha=.4; ctx.fillStyle=pr.g; ctx.beginPath(); ctx.arc(pr.x,pr.y,pr.r*2,0,7); ctx.fill();
    ctx.globalAlpha=1; ctx.fillStyle=pr.c; ctx.beginPath(); ctx.arc(pr.x,pr.y,pr.r,0,7); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(pr.x,pr.y,pr.r*.45,0,7); ctx.fill(); }
  ctx.globalAlpha=1;ctx.restore();
}


const backTo=(e,ms=240)=>tw(e,{x:0,y:0,sx:1,sy:1},ms);
const TK=[{s:.8,stop:50,tr:.3,kb:16,n:10},{s:1.05,stop:80,tr:.46,kb:24,n:18},{s:1.4,stop:120,tr:.74,kb:32,n:28}];

/* 攻撃の型ごとの見た目（当たる瞬間） */
function formFx(form,c,d,e1,K,i=0){
  const a=Math.atan2(d.y,d.x),s=K.s;
  switch(form){
    case 'sword': slash(c,a+(i%2?-1.15:1.15),s,e1.c,e1.g); break;
    case 'claw': {const an=a+1.0,px=-Math.sin(an),py=Math.cos(an);
      for(const o of [-1,0,1]) slash({x:c.x+px*o*20*s,y:c.y+py*o*20*s},an,s*.8,e1.c,e1.g,150); break;}
    case 'fang': addP({type:'fang',x:c.x,y:c.y,ang:a+Math.PI/2*0,size:s,life:.42,color:'#ffffff',glow:e1.g}); break;
    case 'tail': addP({type:'arc',x:c.x-d.x*20,y:c.y+26*s,r:78*s,a0:Math.PI*1.05,span:Math.PI*.95,size:17*s,life:.34,color:e1.c,glow:e1.g}); break;
    case 'horn': addP({type:'cone',x:c.x,y:c.y,dx:d.x,dy:d.y,len:120*s,size:11*s,life:.3,color:e1.c,glow:e1.g}); ring(c,e1.c,60*s,.3,6); break;
    case 'fist': addP({type:'poly',x:c.x,y:c.y,r:66*s,n:9,rot0:R(0,6),j:[1,.8,1.1,.75,.95,1.15,.85],life:.28,color:'#fff',glow:e1.g}); ring(c,e1.g,95*s,.35,11); break;
    case 'charge': ring(c,e1.c,120*s,.4,13); ring(c,e1.g,70*s,.3,8); break;
  }
}

/* 追加の味付け・補助 */
const FXS={
  async guard(_,e){const c=center(P,.5); addP({type:'shield',x:c.x+dirPE().x*18,y:c.y,size:62,life:.8,color:'#9fd8ff'}); ring(c,'#cfeaff',80,.4,5); tw(P,{sx:1.05,sy:.96},120).then(()=>backTo(P,200)); await wait(420);},
  async heal(_,e,amt=60){const c=center(P,.6); for(let i=0;i<7;i++){addP({type:'plus',x:c.x+R(-46,46),y:c.y+R(-10,40),vy:-R(60,120),drag:1,life:R(.6,.9),size:R(5,8),color:'#eaffea',glow:'#3fd86a'});await wait(45);}
    ring(c,'#9ff5b0',70,.5,5); tw(P,{glow:1},160).then(()=>tw(P,{glow:0},400));  await wait(260);},
  async cleanse(){const c=center(P,.6); for(let i=0;i<12;i++) addP({type:'star4',x:c.x+R(-50,50),y:c.y+R(0,50),vy:-R(120,240),drag:.97,life:R(.4,.8),size:R(4,8),color:'#ffffff',glow:'#9fe8ff'});
    ring(c,'#ffffff',95,.45,6); P.flash=.7; tw(P,{flash:0},320); await wait(380);},
  async buff(){const c=center(P,.6); for(let i=0;i<6;i++){addP({type:'arrow',x:c.x+R(-48,48),y:c.y+R(10,50),vy:-R(150,230),drag:1,life:.55,size:R(9,13),color:'#fff0c0',glow:'#ff7a2a'});await wait(50);}
    tw(P,{sx:1.08,sy:1.08},140,E_.back).then(()=>backTo(P,220)); await wait(260);},
  async debuff(){const c=center(EN,.35); for(let i=0;i<6;i++){addP({type:'arrow',down:true,x:c.x+R(-44,44),y:c.y-R(30,60),vy:R(130,200),drag:1,life:.55,size:R(9,13),color:'#e6d0ff',glow:'#6a2ad0'});await wait(50);}
    tw(EN,{sx:.93,sy:.93},160).then(()=>backTo(EN,300)); await wait(260);},
  async charge(_,e){const c=center(P,.5); for(let i=0;i<3;i++){ringIn(c,i%2?e.c:e.g,130-i*14,.4);await wait(110);} tw(P,{glow:1},140).then(()=>tw(P,{glow:0},500)); await wait(260);},
  async dispel(){const c=center(EN,.5); ring(c,'#ffffff',90,.35,5); await wait(120);
    for(let i=0;i<14;i++){const a=R(0,6.28),sp=R(160,360); addP({type:'shard',x:c.x+Math.cos(a)*60,y:c.y+Math.sin(a)*60,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,grav:500,life:R(.35,.6),size:R(4,7),color:'#dff1ff',core:'#fff'});}
    await wait(320);},
  async status(_,e){const c=center(EN,.4); for(let i=0;i<9;i++){addP({type:'smoke',x:c.x+R(-40,40),y:c.y+R(-10,40),vy:-R(40,90),drag:.98,life:R(.6,.9),size:R(5,9),color:i%2?e.g:e.d});await wait(40);}
    tw(EN,{x:5},50).then(()=>tw(EN,{x:-5},70)).then(()=>tw(EN,{x:0},70)); await wait(200);},
  async recoil(mv){await wait(120); cueHpDelta('recoil'); const c=center(P,.5); P.flash=.9; tw(P,{flash:0},260); trauma=Math.min(1,trauma+.18);
    const d=dirPE(); P.x=-d.x*10; P.y=-d.y*10; tw(P,{x:0,y:0},360,E_.elastic); burst(c,'normal',6,.6); await wait(300);},
  async drain(mv,e){const c=center(EN,.5),p=center(P,.5),all=[];
    for(let i=0;i<6;i++){const pr={x:c.x+R(-20,20),y:c.y+R(-20,20),r:6,c:'#eaffea',g:'#3fd86a',active:true,el:null}; projs.push(pr);
      all.push(tw(pr,{x:p.x,y:p.y},R(300,420),E_.inQ,i*45).then(()=>{pr.active=false;projs.splice(projs.indexOf(pr),1)}));}
    await Promise.all(all); cueHpDelta('drain'); ring(p,'#9ff5b0',60,.4,5); tw(P,{glow:1},120).then(()=>tw(P,{glow:0},360)); await wait(260);},
  async bonus(){const c=center(EN,.5); for(let i=0;i<10;i++){const a=R(0,6.28),sp=R(100,260); addP({type:'star4',x:c.x,y:c.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,drag:.92,life:R(.4,.7),size:R(5,9),color:'#fff3b0',glow:'#ffb02e'});} await wait(260);}
};



function cracks(c,n,len,color){const lines=[];for(let i=0;i<n;i++){let a=i/n*6.28+R(-.25,.25),x=c.x,y=c.y;const ln=[[x,y]];
  for(let j=0;j<6;j++){a+=R(-.5,.5); const st=len/6*R(.7,1.3); x+=Math.cos(a)*st; y+=Math.sin(a)*st*.55; ln.push([x,y]);} lines.push(ln);} addP({type:'crack',x:c.x,y:c.y,lines,life:1.1,color});}
function orbitP(c,k,o){const p=elP(k,c.x,c.y,0,0,o.life||R(.5,.9),o.size||R(3,6)); p.orb={cx:c.x,cy:c.y,ang:R(0,6.28),rad:o.rad,av:o.av,rv:o.rv||0,yo:o.yo||0,lift:o.lift||0}; p.grav=0; return p;}
const spStart=async(mv,cA,cB,dim=.62)=>{tw(dimO,{a:dim},240); const b=band(mv.name,cA,cB); if(!short) await wait(380); return b;};
const spEnd=()=>tw(dimO,{a:0},450);
const proj=o=>{const pr=Object.assign({active:true,el:null},o); projs.push(pr); return pr;};
const unproj=pr=>{pr.active=false; const i=projs.indexOf(pr); if(i>=0) projs.splice(i,1);};


async function playAttack(mv,K,e1,e2,k1,k2){
  const d=dirPE(),hits=mv.keys.includes('hits')?3:1,big=mv.tier===2;
  if(big){tw(dimO,{a:.45},200);}
  if(mv.kind!=='shot'&&mv.kind!=='blade'){
    const far=mv.kind==='charge'?.46:.28;
    await tw(P,{x:-d.x*(14+K.s*8),y:-d.y*(14+K.s*8),sx:1.07,sy:.92},90+mv.tier*45);
    if(mv.kind==='charge'){const p=center(P,.5); for(let i=0;i<8;i++) elP(k1,p.x+R(-20,20),p.y+R(-20,20),-d.x*R(200,400),-d.y*R(200,400),R(.25,.45),R(3,6));}
    for(let i=0;i<hits;i++){
      await tw(P,{x:d.x*d.L*far,y:d.y*d.L*far,sx:.94,sy:1.07},i?70:105,E_.inQ);
      const c=center(EN); formFx(mv.form,c,d,e1,K,i); burst(c,k2,Math.round(K.n/(hits>1?1.6:1)),K.s,d);
      if(i===hits-1&&hits===1) ring(c,e2.g,70*K.s,.3,6);
      await impact(EN,null,d,{first:i>0,stop:hits>1&&i<hits-1?40:K.stop,tr:hits>1&&i<hits-1?K.tr*.5:K.tr,kb:K.kb,big:big&&i===hits-1});
      if(i<hits-1) await tw(P,{x:d.x*d.L*far*.6,y:d.y*d.L*far*.6},60);
    }
    await backTo(P,240);
  }else{
    const p=center(P,.4),c0=center(EN);
    // 溜め
    tw(P,{sx:1.06,sy:.93},200+mv.tier*100,E_.inOut);
    if(mv.tier>0) ringIn(p,e1.c,90+mv.tier*30,.3+mv.tier*.08);
    const end=gTime+200+mv.tier*130;
    while(active&&gTime<end){elP(k1,p.x+R(-40,40),p.y+R(-30,30),R(-30,30),R(-60,10),R(.25,.4),R(2.5,5));await wait(32);}
    tw(P,{x:-d.x*(8+mv.tier*5),y:-d.y*(8+mv.tier*5),sx:.95,sy:1.06},80).then(()=>backTo(P,260));
    if(mv.kind==='blade'){      // 飛ぶ刃
      const n=mv.tier?2:1,a=Math.atan2(d.y,d.x);
      for(let i=0;i<n;i++){
        const off=(n>1?(i?-1:1):0)*40;
        const pr={x:p.x-d.y*off,y:p.y+d.x*off,r:(21+mv.tier*5)*K.s,c:e1.c,g:e1.g,dk:e1.d,active:true,el:k1,blade:true,rot:0}; projs.push(pr);
        tw(pr,{x:c0.x,y:c0.y,rot:Math.PI*5},220,E_.inQ).then(()=>{pr.active=false;unproj(pr);
          slash(center(EN),a+(i?-1.1:1.1),K.s,e1.c,e1.g); burst(center(EN),k2,6,K.s*.7,d);});
        if(i<n-1) await wait(95);
      }
      await wait(225);
    }else if(k1==='dark'){            // 相手の足元から湧く
      for(let i=0;i<=mv.tier;i++){ringIn(c0,i%2?e1.c:e1.g,120*K.s,.36); inward(c0,'dark',8+mv.tier*4,110*K.s,.34); await wait(150);}
      await wait(120); ring(c0,e1.g,110*K.s,.4,12); ring(c0,'#120620',70*K.s,.5,18);
    }else if(SKY[k1]){          // 空から落ちる
      const n=[1,2,4][mv.tier];
      for(let i=0;i<n;i++){
        const cx=c0.x+(i===n-1?0:R(-34,34)),cy=c0.y+(i===n-1?0:R(-14,22));
        if(k1==='thunder'){bolt(cx+R(-50,50),-10,cx,cy,k1,4*K.s); if(mv.tier) bolt(cx+R(-70,70),-10,cx,cy,k1,2.5*K.s);}
        else if(k1==='light'){addP({type:'ray',x:cx,y:cy,size:14*K.s,life:.36,color:e1.c,glow:e1.g});}
        else{const pr={x:cx-70,y:-20,r:9*K.s,c:e1.c,g:e1.g,active:true,el:'star'}; projs.push(pr); await tw(pr,{x:cx,y:cy},150,E_.inQ); pr.active=false; unproj(pr);}
        if(i<n-1){burst({x:cx,y:cy},k2,5,K.s*.7); trauma=Math.min(1,trauma+.12); await wait(90);}
      }
      if(mv.tier===2){flashO.a=.45; tw(flashO,{a:0},240);}
    }else if(mv.tier===2){      // 光線
      addP({type:'beam',x:p.x,y:p.y,x2:c0.x,y2:c0.y,size:20*K.s,life:.46,color:e1.c,glow:e1.g});
      flashO.a=.4; tw(flashO,{a:0},240);
      for(let i=0;i<3;i++){burst(c0,k2,7,K.s*.8,d); trauma=Math.min(1,trauma+.14); await wait(85);}
    }else{                      // 弾
      const pr={x:p.x,y:p.y,r:(10+mv.tier*4)*K.s,c:e1.c,g:e1.g,active:true,el:k1}; projs.push(pr);
      await tw(pr,{x:c0.x,y:c0.y},240-mv.tier*30,E_.inQ); pr.active=false; unproj(pr);
    }
    const c=center(EN); ring(c,e2.c,(80+mv.tier*30)*K.s,.4,10); burst(c,k2,K.n,K.s,SKY[k1]||k1==='dark'?null:d);
    if(k2!==k1) burst(c,k1,Math.round(K.n*.6),K.s);
    await impact(EN,null,SKY[k1]?{x:.3,y:.95}:d,{stop:K.stop,tr:K.tr,kb:K.kb,big});
  }
  if(big) tw(dimO,{a:0},380);
  for(const key of mv.keys) if(FXS[key]) await FXS[key](mv,e1);
  await wait(280);
}
async function playSupport(mv,e1){
  await tw(P,{sx:1.05,sy:.94},110); await tw(P,{sx:.97,sy:1.05,y:-8},110); backTo(P,220); contact();
  for(const key of mv.keys) if(FXS[key]) await FXS[key](mv,e1);
  await wait(260);
}

  const profileTier={'低級':0,'上級':1,'超級':2,'最強':2};
  const elements=(profile.elements||[]).filter(k=>Object.hasOwn(EL,k));
  const k1=elements[0]||'normal',k2=elements[1]||k1;
  const mv={n:Number(profile.skillId?.slice(5)),name:profile.name,c:profile.cost,p:profile.power,t:[k1,k2],kind:profile.effectKind,form:profile.effectKind,tier:profileTier[profile.scale]??0,keys:profile.extras||[],sp:profile.special};
  const K=TK[mv.tier];
  const shake=(v,cap=1)=>{trauma=Math.min(cap,trauma+v);};
  async function impact(T,_hp,_direction,{stop,tr,first=false}={}){
    if(first) {T.flash=1; shake(tr||.12); tw(T,{flash:0},170);}
    else contact();
    await hitStop(stop);
  }
  async function band(label,cA,cB){
    if(short)return;
    Object.assign(bandO,{x:-1.3,a:0,text:label,colorA:cA,colorB:cB});
    await tw(bandO,{x:0,a:1},200); await wait(620); await tw(bandO,{x:1.3,a:0},200,E_.inQ);
  }
  const tags=[];
  function tag(c,label,color){const o={x:c.x,y:c.y-70,s:.3,a:1,label,color}; tags.push(o);
    tw(o,{s:1},160,E_.back); tw(o,{y:o.y-26},900); tw(o,{a:0},260,E_.lin,700).then(()=>{const i=tags.indexOf(o);if(i>=0)tags.splice(i,1);});}
  function renderActor(e){
    e.el.style.translate=`${e.x}px ${e.y}px`;
    e.el.style.scale=`${e.sx} ${e.sy}`;
    if(e.alpha!==1||e.styles.opacity)e.el.style.opacity=e.alpha===1?e.styles.opacity:String(e.alpha);
    const filters=[e.styles.filter];
    if(e.flash>.01)filters.push(`brightness(${1+2.4*e.flash}) saturate(${1-.75*e.flash})`);
    if(e.glow>.01)filters.push(`drop-shadow(0 0 ${14*e.glow}px rgba(255,240,170,${e.glow}))`);
    e.el.style.filter=filters.filter(Boolean).join(' ');
  }
  function paint(){
    renderActor(P); if(EN!==P)renderActor(EN);
    drawParts();
    ctx.globalAlpha=dimO.a; ctx.globalCompositeOperation='destination-over'; ctx.fillStyle='#000';ctx.fillRect(0,0,CW,CH);
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=flashO.a; ctx.fillStyle='#fff';ctx.fillRect(0,0,CW,CH);
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(bandO.a>0){
      ctx.save();ctx.translate(CW*(.5+bandO.x),CH*.38);
      const g=ctx.createLinearGradient(-CW*.55,0,CW*.55,0);
      g.addColorStop(0,'transparent');g.addColorStop(.18,bandO.colorA);g.addColorStop(.82,bandO.colorB);g.addColorStop(1,'transparent');
      ctx.globalAlpha=bandO.a;ctx.fillStyle=g;ctx.fillRect(-CW*.55,-23,CW*1.1,46);
      ctx.fillStyle='#fff';ctx.font='bold 23px sans-serif';ctx.fillText(bandO.text,0,0,CW*.86);ctx.restore();
    }
    ctx.font='bold 22px sans-serif';ctx.globalAlpha=nameO.a;ctx.fillStyle='#fff7df';
    if(nameO.a>0){ctx.save();ctx.translate(CW*.5,CH*.35);ctx.scale(nameO.s,nameO.s);ctx.fillText(mv.name,0,0,CW*.88);ctx.restore();}
    for(const o of tags){ctx.save();ctx.translate(o.x,o.y);ctx.scale(o.s,o.s);ctx.globalAlpha=o.a;ctx.fillStyle=o.color;ctx.fillText(o.label,0,0);ctx.restore();}
    ctx.globalAlpha=1;
  }
  function cleanup(){
    if(!active)return;
    active=false;gTime=Infinity;
    cancelAnimationFrame(frame);
    canvas.remove();
    for(const e of new Set([P,EN]))Object.assign(e.el.style,e.styles);
    cleanupRegistry?.delete(cleanup);
    settleContact(false);settleTail();
    for(const cue of cues.values())cue.resolve(false);
    for(const job of [...timers.splice(0),...tweens.splice(0)])job.res();
    for(const cb of freezeCbs.splice(0))cb();
  }
  function loop(now){
    if(!active)return;
    if(!canvas.isConnected||!source.isConnected||!target.isConnected||stage.clientWidth!==CW||stage.clientHeight!==CH||
      (typeof autoFastForward==='function'&&autoFastForward())||
      (typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)){cleanup();return;}
    let dt=Math.min(50,Math.max(0,now-(last??now)))*Math.max(.1,rate);
    last=now;let gdt=0;
    if(freezeLeft>0){freezeLeft=Math.max(0,freezeLeft-dt);if(!freezeLeft)for(const cb of freezeCbs.splice(0))cb();}
    else gdt=dt;
    gTime+=gdt;
    for(let i=tweens.length-1;i>=0;i--){const w=tweens[i]; w.t+=gdt; if(w.t<0)continue;
      if(!w.from){w.from={};for(const k in w.to)w.from[k]=w.o[k];}
      const p=Math.min(1,w.t/w.dur),v=w.e(p);for(const k in w.to)w.o[k]=w.from[k]+(w.to[k]-w.from[k])*v;
      if(p>=1){tweens.splice(i,1);w.res();}}
    for(let i=timers.length-1;i>=0;i--)if(gTime>=timers[i].at){const [timer]=timers.splice(i,1);timer.res();}
    trauma=Math.max(0,trauma-gdt/1000*1.7);shakeT+=dt/1000;
    updateParts(gdt/1000);paint();
    if(finished&&parts.length===0&&tweens.length===0&&timers.length===0){cleanup();return;}
    frame=requestAnimationFrame(loop);
  }
  async function play(){
    const fx={P,EN,S,EL,TK,SKY,E_,R,CW,CH,center,dirPE,tw,wait,hitStop,impact,backTo,kill,vib,flashO,dimO,nameO,addP,elP,burst,ring,ringIn,slash,inward,bolt,band,tag,cracks,orbitP,spStart,spEnd,proj,unproj,FXS,contact,shake,cueHpDelta,parts,get gTime(){return gTime;},get active(){return active;}};
    const special=mv.sp&&typeof BATTLE_SKILL_SPECIALS==='function'?BATTLE_SKILL_SPECIALS(fx)[mv.n]:null;
    if(special)await special(mv);
    else{
      if(mv.tier===2){nameO.s=1.4;tw(nameO,{a:1,s:1},160,E_.back);tw(nameO,{a:0},220,E_.lin,520);}
      if(mv.p>0)await playAttack(mv,K,EL[k1],EL[k2],k1,k2);else await playSupport(mv,EL[k1]);
    }
  }
  cleanupRegistry?.add(cleanup);
  frame=requestAnimationFrame(loop);
  play().catch(error=>{if(active){console.error('Battle skill effect:',error);cleanup();}}).finally(()=>{contact();finished=true;});
  return {contact:contactPromise,tail,cleanup,whenHpCue};
}
