// Presentation only. Inputs are committed battle results; never recompute HP.
const BATTLE_SKILL_HIT_FEEL=Object.freeze({
  '低級':Object.freeze({stop:50,trauma:.30,knockback:16}),
  '上級':Object.freeze({stop:80,trauma:.46,knockback:24}),
  '超級':Object.freeze({stop:120,trauma:.74,knockback:32}),
});
const battleSkillShakeOwners=new WeakMap();
const battleSkillSpriteOwners=new WeakMap();
function battleSkillImpactSuppressed(){
  return (typeof autoFastForward==='function'&&autoFastForward())
    ||(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function battleSkillHitFeel(profile,power){
  const id=profile?.skillId;
  if(id==='s110_104')return {stop:165,trauma:1,knockback:38,big:true};
  if(profile?.special)return {stop:145,trauma:.9,knockback:38,big:true};
  const tier=profile?.scale??(power>=75?'超級':power>=50?'上級':'低級');
  const big=['超級','最強',2].includes(tier);
  return {...BATTLE_SKILL_HIT_FEEL[big?'超級':tier===1?'上級':tier]??BATTLE_SKILL_HIT_FEEL['低級'],big};
}
function battleSkillEffectRate(value){
  const rate=Number(value??(typeof autoSpeed==='function'?autoSpeed():1));
  return Number.isFinite(rate)&&rate>0?rate:1;
}
function battleSkillStartShake(stage,trauma,rate,cleanupRegistry){
  if(!stage||!trauma||typeof requestAnimationFrame!=='function')return;
  const running=battleSkillShakeOwners.get(stage);
  if(running){running.trauma=Math.min(1,running.trauma+trauma);running.rate=rate;return;}
  const state={trauma,rate,last:null,frame:0,phase:0};
  const cleanup=()=>{
    cancelAnimationFrame(state.frame);
    for(const prop of ['--battle-hit-shake-x','--battle-hit-shake-y','--battle-hit-shake-angle'])stage.style.removeProperty(prop);
    stage.classList.remove('battle-skill-shaking');battleSkillShakeOwners.delete(stage);cleanupRegistry?.delete(cleanup);
  };
  const frame=now=>{
    if(!stage.isConnected||battleSkillImpactSuppressed()){cleanup();return;}
    const elapsed=state.last===null?0:(now-state.last)*state.rate/1000;
    state.last=now;state.phase+=elapsed;
    state.trauma=Math.max(0,state.trauma-elapsed*1.7);
    if(!state.trauma){cleanup();return;}
    const a=state.trauma**2,t=state.phase;
    stage.style.setProperty('--battle-hit-shake-x',`${16*a*Math.cos(t*113)}px`);
    stage.style.setProperty('--battle-hit-shake-y',`${16*a*Math.sin(t*137)}px`);
    stage.style.setProperty('--battle-hit-shake-angle',`${1.3*a*Math.cos(t*97)}deg`);
    state.frame=requestAnimationFrame(frame);
  };
  battleSkillShakeOwners.set(stage,state);cleanupRegistry?.add(cleanup);
  stage.classList.add('battle-skill-shaking');state.frame=requestAnimationFrame(frame);
}
function battleSkillCenter(el){
  const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
}
function battleSkillKnockback({source,target,distance,rate,cleanupRegistry,recoil=false}){
  const sprite=target.querySelector?.('.battle-static-media')||target.querySelector?.('img')||target;
  if(typeof sprite.animate!=='function')return;
  battleSkillSpriteOwners.get(sprite)?.();
  const a=battleSkillCenter(target),b=source?battleSkillCenter(source):{x:a.x+(target.id==='pVis'?1:-1),y:a.y};
  const dx=a.x-b.x,dy=a.y-b.y,length=Math.hypot(dx,dy)||1;
  const x=distance*(dx||(!dy?(target.id==='pVis'?-1:1):0))/length,y=distance*dy/length;
  const phase=s=>`${x*s}px ${y*s}px`;
  const frames=[
    {translate:'0 0',scale:'1 1',offset:0},
    {translate:phase(1),scale:'1.14 .86',offset:.13},
    {translate:phase(-.25),scale:'.97 1.04',offset:.42},
    {translate:phase(.10),scale:'1.02 .99',offset:.61},
    {translate:phase(-.04),scale:'1 1',offset:.78},
    {translate:'0 0',scale:'1 1',offset:1},
  ];
  const flash=sprite.animate([{filter:'brightness(3.4) saturate(.25)'},{filter:'brightness(1) saturate(1)'}],{duration:170/rate,easing:'ease-out'});
  const knock=sprite.animate(frames,{duration:(recoil?380:560)/rate,easing:'ease-out'});
  const cleanup=()=>{
    flash.cancel();knock.cancel();battleSkillSpriteOwners.delete(sprite);cleanupRegistry?.delete(cleanup);
  };
  battleSkillSpriteOwners.set(sprite,cleanup);cleanupRegistry?.add(cleanup);knock.onfinish=cleanup;
}
function battleSkillPopNumber({stage,target,text,kind,big=false,rate,cleanupRegistry}){
  if(!stage||!target||battleSkillImpactSuppressed())return;
  const pos=battleSkillCenter(target),rect=stage.getBoundingClientRect();
  const node=document.createElement('strong');node.className=`battle-skill-number is-${kind}${big?' is-big':''}`;
  node.textContent=text;node.setAttribute('aria-hidden','true');
  node.style.left=`${pos.x-rect.left}px`;node.style.top=`${pos.y-rect.top}px`;
  node.style.setProperty('--battle-skill-pop-duration',`${700/rate}ms`);
  stage.appendChild(node);
  const cleanup=()=>{clearTimeout(timer);node.remove();cleanupRegistry?.delete(cleanup);};
  const timer=setTimeout(cleanup,700/rate);cleanupRegistry?.add(cleanup);
}
function renderBattleSkillImpact({stage,target,source,damage,effectiveness=1,power=0,profile,rate,freeze,cleanupRegistry}){
  if(!stage||!target||battleSkillImpactSuppressed())return false;
  rate=battleSkillEffectRate(rate);
  const feel=battleSkillHitFeel(profile,power);
  battleSkillPopNumber({stage,target,text:`${effectiveness>1?'WEAK! ':''}-${damage}`,kind:'damage',big:feel.big,rate,cleanupRegistry});
  if(!(damage>0))return true;
  battleSkillStartShake(stage,feel.trauma,rate,cleanupRegistry);
  battleSkillKnockback({source,target,distance:feel.knockback,rate,cleanupRegistry});
  freeze?.(feel.stop);
  if(typeof navigator!=='undefined'&&/Android/i.test(navigator.userAgent||'')&&typeof navigator.vibrate==='function'){
    try{navigator.vibrate(Math.round(feel.stop/(2*rate)+15));}catch(_error){/* Unsupported or denied vibration is optional. */}
  }
  return true;
}
function renderBattleSkillHpDelta({stage,target,loss,label,rate,cleanupRegistry}){
  if(!stage||!target||!loss||battleSkillImpactSuppressed())return false;
  rate=battleSkillEffectRate(rate);
  const recoil=label==='反動';
  battleSkillPopNumber({stage,target,text:`${loss<0?'+':'-'}${Math.abs(loss)}`,kind:loss<0?'heal':recoil?'recoil':'damage',rate,cleanupRegistry});
  if(recoil)battleSkillKnockback({target,distance:12,rate,cleanupRegistry,recoil:true});
  return true;
}

// Apply before the HP widths are written. Use inherited variables so multi-card
// reconciliation does not remove presentation timing attributes from the bars.
const battleSkillTrailOwners=new WeakMap();
function setBattleSkillHpTrailTiming(stage,rate,cleanupRegistry,{healed=false}={}){
  if(!stage)return;
  rate=battleSkillEffectRate(rate);
  const suppressed=battleSkillImpactSuppressed();
  stage.style.setProperty('--battle-skill-trail-duration',suppressed||healed?'0ms':`${420/rate}ms`);
  stage.style.setProperty('--battle-skill-trail-delay',suppressed||healed?'0ms':`${320/rate}ms`);
  if(battleSkillTrailOwners.has(stage))return;
  const cleanup=()=>{
    stage.style.removeProperty('--battle-skill-trail-duration');
    stage.style.removeProperty('--battle-skill-trail-delay');
    battleSkillTrailOwners.delete(stage);cleanupRegistry?.delete(cleanup);
  };
  battleSkillTrailOwners.set(stage,cleanup);cleanupRegistry?.add(cleanup);
}
