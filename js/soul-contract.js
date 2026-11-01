/* Result-only renderer: it never draws, awards, spends or writes a save. */
let soulContractPresentation = null;
function soulContractRarity(unit){ return (String(unit?.rarity||'').match(/★/g)||[]).length || Number(unit?.rarity)||1; }
function soulContractGlyphs(){
  // Original geometric strokes, not an encoded human-language font.
  const marks=['M1 1L7 3L2 9M4 2L4 11','M1 2L6 10L9 1M1 6L9 6','M2 1L2 10L8 7L5 4L9 1','M1 3L8 3L4 11M4 1L9 8','M2 2L8 8M8 2L2 8M5 0L5 11'];
  let paths='';
  for(let row=0;row<10;row++)for(let col=0;col<(row===0?9:row===9?7:16);col++){
    const x=(row===0?44:row===9?130:25)+col*(row===0?19:13), y=row===0?40:row===9?266:68+row*17;
    paths+=`<path class="soul-glyph" style="--glyph-delay:${row*.085+col*.014}s" d="${marks[(row*3+col*7)%marks.length]}" transform="translate(${x} ${y})"/>`;
  }
  return `<svg viewBox="0 0 270 330" aria-hidden="true"><rect x="8" y="8" width="254" height="314" rx="2" class="soul-paper-edge"/><path d="M15 40V15H40M230 15H255V40M15 290V315H40M230 315H255V290" class="soul-paper-edge"/>${paths}<path d="M28 294H242" class="soul-paper-edge"/></svg>`;
}
function cancelSoulContractPresentation(){ soulContractPresentation?.finish(); }
function playSoulContractPresentation(result,onFinish){
  if(soulContractPresentation)return false;
  if(!result?.entries?.length){onFinish?.();return false;}
  const previousFocus=document.activeElement, previousOverflow=document.body.style.overflow;
  const overlay=document.createElement('div');overlay.id='soulContractPresentation';overlay.className='soul-contract';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','キャラクター契約演出');
  const count=result.entries.length;
  overlay.innerHTML=`<canvas class="soul-sky" aria-hidden="true"></canvas><div class="soul-cinematic"><div class="soul-orbit" aria-hidden="true">${result.entries.map((_,i)=>`<i class="soul-star" style="--i:${i};--count:${count}"></i>`).join('')}</div><div class="soul-response" aria-hidden="true">✦</div><div class="soul-document" aria-hidden="true">${soulContractGlyphs()}<i class="soul-paper-sheen"></i></div><div class="soul-release" aria-hidden="true"></div><div class="soul-portrait"></div><div class="soul-caption"><div class="soul-name"></div><div class="soul-rarity"></div><div class="soul-seal" aria-hidden="true">⌁ ⋔ ⟐ ⋮ ⌁</div></div></div><div class="soul-controls"><span class="soul-counter" aria-live="polite"></span><button type="button" class="soul-speed">×1</button><button type="button" class="soul-skip">スキップ</button></div><div class="soul-progress" aria-label="契約済みの数">${result.entries.map((_,i)=>`<span data-soul-progress="${i}" aria-hidden="true">✦</span>`).join('')}</div>`;
  document.body.append(overlay);document.body.style.overflow='hidden';
  // Prevent background keyboard activation without changing game navigation.
  const backgrounds=[...document.body.children].filter(el=>el!==overlay&&el.tagName!=='SCRIPT');
  const inertState=backgrounds.map(el=>[el,el.inert]);backgrounds.forEach(el=>el.inert=true);
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas=overlay.querySelector('canvas');
  let ctx=null;try{ctx=canvas.getContext('2d');}catch(_error){/* Flat navy fallback when Canvas is unavailable. */}
  let stopped=false,raf=0,timer=0,wake=null,lastFrame=0,frameCount=0;
  let width=0,height=0,speed=1,waitRemaining=0,waitClock=0,waitForTap=false;
  const promotions=result.entries.map(e=>typeof gachaPromotion==='function'&&gachaPromotion(soulContractRarity(e.unit)===3));
  const firstGold=result.entries.findIndex(e=>soulContractRarity(e.unit)===3);
  if(firstGold>=0)overlay.querySelectorAll('.soul-star')[firstGold].classList.add('is-gold-star');
  const stars=Array.from({length:100},(_,i)=>({x:((i*73+17)%101)/101,y:((i*41+9)%103)/103,r:i%13===0?1.8:i%5===0?1.15:.55,phase:i*1.7}));
  function resize(){const r=overlay.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);paint(0);}
  function paint(time){
    if(!ctx)return;ctx.fillStyle='#05121e';ctx.fillRect(0,0,width,height);
    for(const s of stars){const x=s.x*width,y=s.y*height,alpha=.42+.25*Math.sin(time*.00065+s.phase);ctx.globalAlpha=alpha;
      if(s.r>1){const glow=ctx.createRadialGradient(x,y,0,x,y,s.r*7);glow.addColorStop(0,'#d9eeff');glow.addColorStop(.18,'#bddeef');glow.addColorStop(1,'#b0d0ef00');ctx.fillStyle=glow;ctx.fillRect(x-s.r*7,y-s.r*7,s.r*14,s.r*14);}
      ctx.fillStyle='#e5f4ff';ctx.beginPath();ctx.arc(x,y,s.r,0,Math.PI*2);ctx.fill();
    }ctx.globalAlpha=1;
    if(typeof drawGachaRing==='function'){
      const stage=overlay.dataset.stage,gold=overlay.classList.contains('is-gold'),color=gold?'#f7d27c':'#badff2',active=['charge','hold','gold','promotion','reveal'].includes(stage);
      drawGachaRing(ctx,width/2,height*.44,Math.min(width,height),reduced?0:time,color,active?2:.25);
      if(!reduced&&['charge','hold','gold','promotion'].includes(stage)){
        const glow=ctx.createRadialGradient(width/2,height*.44,0,width/2,height*.44,Math.min(width,height)*.25);
        glow.addColorStop(0,gold?'#fff2b8cc':'#d9f1ffbb');glow.addColorStop(1,'#ffffff00');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
        for(let i=0;i<45;i++){const p=(time*.00055+i*.137)%1,a=i*2.399,r=(1-p)*Math.min(width,height)*.6;ctx.fillStyle=color;ctx.globalAlpha=p;ctx.fillRect(width/2+Math.cos(a)*r,height*.44+Math.sin(a)*r,2,2);}ctx.globalAlpha=1;
        ctx.fillStyle=gold?'#ffdb7833':'#c9e9ff22';ctx.fillRect(width*.47,0,width*.06,height*.44);
      }
      if(!reduced&&gold&&stage==='portrait'){for(let i=0;i<24;i++){const x=(i*89%101)/101*width,y=((time*.025+i*37)%height);ctx.fillStyle='#f5d68b';ctx.globalAlpha=.3+.4*Math.sin(i+time*.002)**2;ctx.fillRect(x,height-y,2,2);}ctx.globalAlpha=1;}
      if(!reduced&&['reveal','promotion'].includes(stage))drawGachaBurst(ctx,width,height,Math.min(1,(performance.now()-Number(overlay.dataset.stageTime||0))*speed/500),color);
    }
    frameCount++;
  }
  function frame(time){if(stopped)return;if(time-lastFrame>33&&!document.hidden){paint(time);lastFrame=time;}raf=requestAnimationFrame(frame);}
  function delay(ms){return new Promise(resolve=>{wake=resolve;waitRemaining=reduced?Math.min(ms,120):ms;waitClock=performance.now();const tick=()=>{const now=performance.now();waitRemaining-=Math.min(100,now-waitClock)*speed;waitClock=now;if(waitRemaining<=0){wake=null;resolve();}else timer=setTimeout(tick,16);};timer=setTimeout(tick,16);});}
  function nextPortrait(){if(!waitForTap)return;waitForTap=false;overlay.classList.remove('is-waiting-next');const resume=wake;wake=null;resume?.();}
  function tapWait(){if(reduced)return delay(150);waitForTap=true;overlay.classList.add('is-waiting-next');return new Promise(resolve=>wake=resolve);}
  overlay.querySelector('.soul-speed').onclick=e=>{speed=speed===1?2:1;e.currentTarget.textContent=`×${speed}`;overlay.style.setProperty('--soul-speed',speed);};
  overlay.querySelector('.soul-cinematic').addEventListener('click',nextPortrait);
  const next=document.createElement('button');next.type='button';next.className='soul-next';next.textContent='タップで次へ';next.onclick=nextPortrait;overlay.querySelector('.soul-caption').append(next);
  const skip=()=>finish();
  const key=event=>{if(event.key==='Escape'){event.preventDefault();finish();}if(event.key==='Tab'){const buttons=[...overlay.querySelectorAll('button')].filter(b=>b.getClientRects().length);event.preventDefault();const i=buttons.indexOf(document.activeElement);buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}if(event.key==='Enter'&&event.target===overlay)nextPortrait();};
  const pageHide=()=>finish();
  function finish(){if(stopped)return;stopped=true;clearTimeout(timer);wake?.();wake=null;cancelAnimationFrame(raf);
    window.removeEventListener('resize',resize);window.removeEventListener('pagehide',pageHide);overlay.removeEventListener('keydown',key);
    overlay.remove();document.body.style.overflow=previousOverflow;inertState.forEach(([el,value])=>el.inert=value);
    soulContractPresentation=null;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});onFinish?.();
  }
  soulContractPresentation={finish,get frames(){return frameCount;},resultId:result.receiptId||null};
  overlay.querySelector('.soul-skip').addEventListener('click',skip,{once:true});overlay.addEventListener('keydown',key);window.addEventListener('pagehide',pageHide);window.addEventListener('resize',resize);
  resize();if(!reduced)raf=requestAnimationFrame(frame);overlay.querySelector('.soul-skip').focus({preventScroll:true});
  function stage(name,index){overlay.dataset.stage=name;overlay.dataset.stageTime=String(performance.now());if(typeof gachaAudioCue==='function')gachaAudioCue(name,'character');overlay.dataset.index=String(index);overlay.querySelector('.soul-counter').textContent=index<0?`0 / ${count}`:`${index+1} / ${count}`;}
  async function run(){
    stage('intro',-1);await delay(1100);if(stopped)return;
    if(count===10){stage('souls',-1);await delay(1500);if(stopped)return;}
    for(let i=0;i<count;i++){
      const entry=result.entries[i],rarity=soulContractRarity(entry.unit),gold=rarity===3;
      overlay.classList.toggle('is-gold',gold&&!promotions[i]);overlay.dataset.promotion=String(!!promotions[i]);overlay.dataset.unitId=entry.unit.id;overlay.dataset.rarity=String(rarity);
      const portrait=overlay.querySelector('.soul-portrait');portrait.replaceChildren();
      const src=typeof IMG!=='undefined'&&entry.unit.imgKey?IMG[entry.unit.imgKey]:null;
      if(src){const img=new Image();img.src=src;img.alt=entry.unit.name;img.decoding='async';portrait.append(img);}
      else {const fallback=document.createElement('span');fallback.textContent=entry.unit.icon||'✦';fallback.setAttribute('role','img');fallback.setAttribute('aria-label',entry.unit.name);portrait.append(fallback);}
      overlay.querySelector('.soul-name').textContent=entry.unit.name;
      overlay.querySelector('.soul-rarity').textContent=`${'★'.repeat(rarity)} / Lv.${entry.instance?.level||1}`;
      overlay.querySelector('.soul-seal').textContent='⌁ ⋔ ⟐ ⋮ ⌁';
      stage('response',i);await delay(i===0||gold?800:320);if(stopped)return;
      stage('paper',i);await delay(i===0||gold?1350:430);if(stopped)return;
      if(gold){overlay.classList.add('is-gold');stage(promotions[i]?'promotion':'gold',i);await delay(promotions[i]?1100:700);if(stopped)return;}
      stage('charge',i);await delay(gold?1300:i===0?900:380);if(stopped)return;
      stage('hold',i);await delay(gold?380:i===0?220:90);if(stopped)return;
      stage('reveal',i);await delay(160);if(stopped)return;
      overlay.querySelector('.soul-seal').textContent='契約成立';
      overlay.querySelector(`[data-soul-progress="${i}"]`).classList.add('is-lit');
      overlay.querySelector('.soul-progress').setAttribute('aria-label',`${count}体中${i+1}体と契約成立`);
      stage('portrait',i);if(i===0||gold||count===1)await tapWait();else await delay(900);if(stopped)return;
    }
    finish();
  }
  run().catch(()=>finish());return true;
}
