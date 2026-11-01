/* Result-only canvas scenes. No currency, acquisition, save or draw calls. */
function paintGachaSky(ctx,w,h,time){
 ctx.fillStyle='#05121e';ctx.fillRect(0,0,w,h);
 for(let i=0;i<100;i++){const x=((i*73+17)%101)/101*w,y=((i*41+9)%103)/103*h,r=i%13===0?1.8:i%5===0?1.15:.55;ctx.globalAlpha=.45+.23*Math.sin(time*.00065+i*1.7);if(r>1){const g=ctx.createRadialGradient(x,y,0,x,y,r*8);g.addColorStop(0,'#e5f4ff');g.addColorStop(.2,'#bfd8ef');g.addColorStop(1,'#b0d0ef00');ctx.fillStyle=g;ctx.fillRect(x-r*8,y-r*8,r*16,r*16);}ctx.fillStyle='#e5f4ff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
}
function drawGachaRing(ctx,x,y,r,time,color='#e6c57b',strength=1){
 ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.lineWidth=1.2;ctx.shadowColor=color;ctx.shadowBlur=8*strength;
 [.4,.32,.23].forEach((f,i)=>{ctx.save();ctx.rotate(time*(i===1?-.0002:.00013)*(1+strength));ctx.beginPath();ctx.arc(0,0,r*f,0,Math.PI*2);ctx.stroke();for(let j=0;j<21;j++){const a=j*Math.PI*2/21;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(r*f-5,0);ctx.lineTo(r*f+5,0);ctx.lineTo(r*f+1,5);ctx.stroke();ctx.restore();}ctx.restore();});
 ctx.beginPath();for(let j=0;j<=7;j++){const a=j*3*Math.PI*2/7-Math.PI/2;j?ctx.lineTo(Math.cos(a)*r*.21,Math.sin(a)*r*.21):ctx.moveTo(Math.cos(a)*r*.21,Math.sin(a)*r*.21);}ctx.stroke();ctx.restore();
}
function drawGachaBurst(ctx,w,h,p,color){
 ctx.save();ctx.translate(w/2,h*.44);ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=15;
 for(let i=0;i<3;i++){ctx.globalAlpha=Math.max(0,1-p-i*.15);ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,Math.max(1,p*Math.min(w,h)*(.6+i*.14)),0,Math.PI*2);ctx.stroke();}
 for(let i=0;i<50;i++){const a=i*2.399,r=p*Math.min(w,h)*(.15+(i%7)*.055);ctx.globalAlpha=(1-p)*.8;ctx.fillStyle=color;ctx.fillRect(Math.cos(a)*r,Math.sin(a)*r,2+(i%3),2+(i%3));}ctx.restore();
}
function playGachaCinema(kind,result,entries,onFinish){
 if(gachaCinema)return false;
 const overlay=document.createElement('div');overlay.className='gacha-cinema';overlay.dataset.kind=kind;
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',kind==='skill'?'技紋の刻印':'星の宝箱');
 overlay.innerHTML='<canvas aria-hidden="true"></canvas><div class="gacha-cinema-cards"></div><div class="gacha-cinema-controls"><span></span><button type="button" data-speed>×1</button><button type="button" data-modal-close>スキップ</button></div>';
 document.body.append(overlay);const restore=gachaOpenModal(overlay),canvas=overlay.querySelector('canvas'),cards=overlay.querySelector('.gacha-cinema-cards');
 let ctx=null;try{ctx=canvas.getContext('2d');}catch(_error){}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const promotions=entries.map(e=>gachaPromotion(kind==='skill'&&e.card.cost>10));
 const duration=kind==='skill'?(entries.length===10?6000:4000):(entries.length===10?4000:3000);
 const highest=kind==='item'?entries.reduce((a,e)=>['normal','silver','gold','rainbow'].indexOf(gachaItemTier(e.item.id))>['normal','silver','gold','rainbow'].indexOf(a)?gachaItemTier(e.item.id):a,'normal'):null;
 const palette={normal:'#edf7ff',silver:'#d6e3ef',gold:'#f5d27d',rainbow:'#f2baff'};
 let t=0,last=performance.now(),lastPaint=-40,speed=1,raf=0,done=false,w=0,h=0,lastCue='',frames=0;
 function finish(){if(done)return;done=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('pagehide',finish);restore();overlay.remove();gachaCinema=null;onFinish();}
 function resize(){const r=overlay.getBoundingClientRect();w=r.width;h=r.height;const d=Math.min(devicePixelRatio||1,1.5);canvas.width=w*d;canvas.height=h*d;ctx?.setTransform(d,0,0,d,0,0);}
 function cue(name){if(lastCue===name)return;lastCue=name;overlay.dataset.stage=name;gachaAudioCue(name,kind);}
 function paint(){
 if(!ctx)return;paintGachaSky(ctx,w,h,reduced?0:t);
 if(kind==='skill'){
 const cell=entries.length===10?duration/10:duration,slot=Math.min(entries.length-1,Math.floor(t/cell)),entry=entries[slot],local=t%cell,p=local/cell;
 const tier=entry.card.cost>10?'super':entry.card.cost>5?'upper':'lower',color=palette[tier==='super'?'gold':tier==='upper'?'silver':'normal'];
 drawGachaRing(ctx,w/2,h*.2,Math.min(w,h)*.6,t,'#d5b875',.3);
 if(!cards.innerHTML){cards.classList.toggle('is-ten',entries.length===10);cards.innerHTML=entries.map((e,i)=>`<div class="cinema-skill-back" data-cinema-card="${i}"><span>✦</span></div>`).join('');}
 entries.forEach((e,i)=>{const node=cards.children[i];if(i>slot){node.style.setProperty('--preview-color',e.card.cost>10&&!promotions[i]?'#f5d27d':e.card.cost>5&&e.card.cost<=10?'#74b6ee':'#d6e3ef');return;}if(i<slot||p>.8){if(!node.dataset.revealed){node.innerHTML=tcgSkillCardMarkup(e.card,{compact:entries.length===10});node.dataset.revealed='true';node.classList.add('is-revealed');}}else{node.style.setProperty('--preview-color',tier==='super'&&promotions[i]&&p<.52?'#d6e3ef':tier==='upper'?'#74b6ee':color);node.classList.toggle('is-promoting',!!promotions[i]&&p>.45&&p<.65);}});
 cue(p<.35?'stamp':p<.65&&promotions[slot]?'promotion':'reveal');
 if(!reduced&&p>.55&&p<.9)drawGachaBurst(ctx,w,h,(p-.55)/.35,color);
 if(!reduced&&tier==='super'&&p>.45&&p<.8){ctx.fillStyle='#ffe9a633';ctx.fillRect(w*.46,0,w*.08,h);}
 }else{
 const p=t/duration,color=highest==='rainbow'?`hsl(${t*.12%360} 90% 78%)`:palette[highest];
 const appear=p<.22?Math.min(1,p/.22):1,opening=p>.63,vanish=p>.74?Math.min(1,(p-.74)/.12):0;
 const cx=w/2,cy=h*.46-(1-appear)*h*.4+(!reduced&&p<.3?Math.sin(appear*Math.PI)*22:0)+vanish*75,size=Math.min(w*.55,235);
 if(!reduced&&highest==='rainbow'&&p>.52&&p<.63)drawGachaBurst(ctx,w,h,(p-.52)/.11,color);
 if(p<.86){ctx.save();ctx.translate(cx+(!reduced&&p>.28&&p<.62?Math.sin((p-.28)/.34*Math.PI*2*(highest==='normal'?1:highest==='silver'?2:3))*6:0),cy);ctx.globalAlpha=1-vanish;
 ctx.shadowColor=color;ctx.shadowBlur=opening?45:18;
 const grad=ctx.createLinearGradient(-size/2,0,size/2,size*.5);grad.addColorStop(0,'#453049');grad.addColorStop(.45,'#35475f');grad.addColorStop(1,'#142137');ctx.fillStyle=grad;ctx.strokeStyle='#d1b070';ctx.lineWidth=3;
 ctx.fillRect(-size/2,0,size,size*.47);ctx.strokeRect(-size/2,0,size,size*.47);
 ctx.fillStyle='#b28a47';[-.35,.28].forEach(x=>ctx.fillRect(size*x,0,size*.075,size*.47));
 ctx.save();if(opening){ctx.translate(0,-(p-.63)*size*2);ctx.rotate((p-.63)*-.8);}const lid=ctx.createLinearGradient(0,-size*.27,0,0);lid.addColorStop(0,'#6a5d6e');lid.addColorStop(1,'#202f46');ctx.fillStyle=lid;ctx.fillRect(-size/2,-size*.27,size,size*.27);ctx.strokeRect(-size/2,-size*.27,size,size*.27);ctx.restore();
 ctx.fillStyle=color;ctx.shadowBlur=25;ctx.fillRect(-size/2,-3,size,4);ctx.fillStyle='#e5c77d';ctx.fillRect(-size*.05,-5,size*.1,size*.13);ctx.restore();}
 cue(p<.23?'arrival':p<.6?'chest-shake':p<.74?'chest-open':'reveal');
 if(!reduced&&p>.6&&p<.86){const alpha=Math.sin((p-.6)/.26*Math.PI);ctx.fillStyle=highest==='rainbow'?`hsla(${t*.12%360} 90% 78% / ${alpha*.4})`:`rgba(255,228,160,${alpha*.35})`;ctx.fillRect(w*.43,0,w*.14,h*.55);drawGachaBurst(ctx,w,h,(p-.6)/.26,color);if(highest==='rainbow')drawGachaBurst(ctx,w,h,Math.min(1,(p-.6)*6),color);}
 if(!reduced&&p>.87){entries.forEach((e,i)=>{if(!['gold','rainbow'].includes(gachaItemTier(e.item.id)))return;const cols=entries.length===10?5:1,cx=entries.length===10?w*(.1+(i%cols)*.2):w/2,cy=entries.length===10?h*(.4+Math.floor(i/cols)*.25):h*.5;for(let j=0;j<9;j++){const a=j*2.399,r=20+(t*.02+j*7)%40;ctx.fillStyle=color;ctx.globalAlpha=.5;ctx.fillRect(cx+Math.cos(a)*r,cy+Math.sin(a)*r,2,2);}ctx.globalAlpha=1;});}
 // Reveal after the chest has fully disappeared; never overlap its artwork or name.
 if(p>.87&&!cards.innerHTML){cards.classList.add('item-cinema-grid');cards.classList.toggle('is-ten',entries.length===10);cards.innerHTML=entries.map(e=>`<div class="tier-${gachaItemTier(e.item.id)}">${gachaItemVisual(e.item)}<strong>${gachaEscape(e.item.name)}</strong></div>`).join('');}
 }
 frames++;
 }
 function frame(now){if(done)return;const delta=Math.max(0,Math.min(now-last,100));last=now;if(!document.hidden)t+=delta*(reduced?14:speed);if(t>=duration){finish();return;}if(now-lastPaint>=33){paint();lastPaint=now;}raf=requestAnimationFrame(frame);}
 overlay.querySelector('[data-speed]').onclick=e=>{speed=speed===1?2:1;e.currentTarget.textContent=`×${speed}`;overlay.style.setProperty('--cinema-speed',speed);};
 overlay.querySelector('[data-modal-close]').onclick=finish;
 overlay.querySelector('.gacha-cinema-controls span').textContent=kind==='skill'?'技紋の刻印':'星の宝箱';
 gachaCinema={finish,kind,promotions,get frames(){return frames;}};window.addEventListener('resize',resize);window.addEventListener('pagehide',finish);resize();raf=requestAnimationFrame(frame);return true;
}
