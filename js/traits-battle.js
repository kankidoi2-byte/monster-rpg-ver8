// Species traits are battle-local. Nothing in this state is serialized to a save.
let traitBattleState={members:new Map(),enemies:new Map(),context:null,lastTurn:-1,messages:[]};
function resetTraitBattleState(){traitBattleState={members:new Map(),enemies:new Map(),context:null,lastTurn:-1,messages:[]};}
function traitMember(ins=activeInstance){
  const key=ins?.uid||ins?.id||'player';
  if(!traitBattleState.members.has(key))traitBattleState.members.set(key,{attacked:false,attackedTurn:-1,sturdy:false,shield:false,purified:0,insights:0,mirror:false,rescue:false,star:0,wind:0,giftUntil:0,gift:1,swiftUntil:-1});
  return traitBattleState.members.get(key);
}
function traitEnemy(key='single'){if(!traitBattleState.enemies.has(key))traitBattleState.enemies.set(key,{frost:0,sparkUntil:0});return traitBattleState.enemies.get(key);}
function traitRule(key,fallback){return typeof TRAIT_RULES!=='undefined'&&Number.isFinite(TRAIT_RULES[key])?TRAIT_RULES[key]:fallback;}
function traitPower(type,fallback=0,ins=activeInstance){return typeof traitValue==='function'?traitValue(ins,type,fallback):fallback;}
function traitPartyReserve(type,fallback=1){
  const values=(typeof partyBattle==='undefined'?[]:partyBattle).filter((p,i)=>i!==activePartyIdx&&!p.fainted&&p.hp>0).map(p=>traitPower(type,fallback,p.inst));
  return fallback===1&&values.some(v=>v<1)?Math.min(fallback,...values):Math.max(fallback,...values);
}
function traitLog(type,verb,ins=activeInstance){
  const t=traitsForSpecies(ins).find(t=>t.type===type),name=typeof by==='function'?by(ins?.id)?.name:'';
  if(t)traitBattleState.messages.push(`${escapeGameHtml(name||'仲間')}は ${escapeGameHtml(t.name)}で ${verb}！`);
}
function flushTraitMessages(){
  if(!traitBattleState.messages.length)return;
  const el=document.getElementById('log');if(el)el.innerHTML+=(el.innerHTML?'<br>':'')+traitBattleState.messages.join('<br>');
  traitBattleState.messages=[];if(typeof captureBattleLog==='function')captureBattleLog();
}
function traitTarget(actorIsPlayer,actorEntry=null,targetEntry=null){return tacticalCombatants(actorIsPlayer,actorEntry,targetEntry);}
function traitEnemySpeedMultiplier(key){return Math.max(0,1-traitEnemy(key).frost);}
function traitPlayerSpeed(base){const s=traitMember();return base*(1+s.wind)*(s.swiftUntil>=battleTurnCount?Math.max(1,traitPower('swift',1)):1);}
function traitHealing(amount,isPlayer=true){return isPlayer?Math.floor(amount*traitPower('healer',1)):amount;}
function traitGuardReduction(reduction){return Math.min(1,reduction*traitPower('guardian',1));}
function traitDamageMultiplier(actorIsPlayer,move,actorEntry=null,targetEntry=null){
  const {actor,target}=traitTarget(actorIsPlayer,actorEntry,targetEntry),s=traitMember();let f=1;
  if(actorIsPlayer){
    if(actor.hp<=actor.maxHp/2)f*=traitPower('adversity',1);
    if(!s.attacked)f*=traitPower('first_strike',1);
    if(moveTypes(move).some(t=>actor.mon.types.includes(t)))f*=traitPower('stab',1);
    if(target.hp<=target.maxHp/2||target.status||target.poison>0||target.paralysis>0||target.confusion>0||target.sleep>0||target.freeze>0||
      (typeof kokoroLinkEnemyEffectsFor==='function'&&kokoroLinkEnemyEffectsFor(target.entry?.id||'single').some(e=>e.remainingTurns>0&&['poison','burn','control'].includes(e.category))))f*=traitPower('pursuit',1);
    f/=1-traitPower('pierce');
    if(battleTurnCount+1>=traitRule('upliftStartTurn',3))f*=traitPower('uplift',1);
    f*=traitPartyReserve('cheer',1)*(1+s.star);
    if(s.giftUntil>battleTurnCount)f*=s.gift;
  }else if(target.isPlayer){
    f*=traitPower('hard_guard',1)*traitPower('intimidate',1)*traitPartyReserve('devotion',1);
    if(battleTurnCount===0)f*=traitPower('shadow_hide',1);
    if(target.hp>=target.maxHp)f*=traitPower('magic_core',1);
  }
  // Intimidation follows the active ally even when an enemy attacks another enemy.
  if(!actorIsPlayer){if(!target.isPlayer)f*=traitPower('intimidate',1);if(traitEnemy(actorEntry?.id||'single').sparkUntil>battleTurnCount)f*=traitRule('sparkDanceAttackRate',.85);}
  return f;
}
function traitIncomingDamage(result){
  const s=traitMember(),before=Math.max(0,pHp);let damage=Math.max(0,result.hpDamage);
  if(s.shield&&damage>0){damage=Math.floor(damage*traitRule('sturdyGuardRate',.5));s.shield=false;}
  if(damage>=before&&before>0){
    if(traitPower('sturdy')&&before>=playerMaxHp()&&!s.sturdy){damage=before-1;s.sturdy=true;s.shield=traitPower('sturdy')>1;traitLog('sturdy','持ちこたえた');}
    else{
      const rescue=(typeof partyBattle==='undefined'?[]:partyBattle).find((p,i)=>i!==activePartyIdx&&!p.fainted&&p.hp>0&&traitPower('desperate_wings',0,p.inst)&&!traitMember(p.inst).rescue);
      if(rescue){damage=before-1;traitMember(rescue.inst).rescue=true;traitLog('desperate_wings','仲間を救った',rescue.inst);}
    }
  }
  const context=traitBattleState.context;
  if(context&&!context.actorIsPlayer){context.received+=Math.min(before,damage);context.hitPlayer=context.hitPlayer||(!result.evaded&&Number(result.incoming??result.hpDamage)>0);}
  return {...result,hpDamage:damage};
}
function traitApplyEnemyStatus(kind,entry=null){
  const target=tacticalCombatant(false,entry);if(target.hp<=0||(kind!=='poison'&&target.freeze>0))return;
  if(kind==='poison'){if(typeof removeKokoroLinkEnemyEffectCategory==='function')removeKokoroLinkEnemyEffectCategory(entry?.id||'single','poison');target.status='poison';target.poison=BATTLE_STATUS_EFFECTS.poison.duration;if(entry)entry.poisonSourceIsPlayer=true;}
  if(kind==='paralysis')target.paralysis=3;
  if(kind==='confusion')target.confusion=2+Math.floor(combatRandom()*2);
  if(kind==='sleep')target.sleep=2;
}
function traitReceiveStatus(kind,apply,actorEntry=null){
  const s=traitMember();
  if(kind==='poison'&&traitPower('mycelium_root'))return false;
  if(s.purified<traitPower('purify')){s.purified++;traitLog('purify','状態異常を防いだ');return false;}
  apply();
  if(traitPower('water_mirror')&&!s.mirror){s.mirror=true;traitApplyEnemyStatus(kind,actorEntry||traitBattleState.context?.actorEntry);traitLog('water_mirror','状態異常を返した');}
  return true;
}
function traitBeforeAttack(ctx){
  if(!ctx.actorIsPlayer)return;
  const s=traitMember(),count=traitPower('insight');
  if(s.insights<count){const removed=dispelEnemyKokoroLinkBoosts(ctx.targetEntry?.id);if(removed.length){s.insights++;traitLog('insight','相手の強化を打ち消した');}}
}
async function runTraitAttack(action,move,actorIsPlayer,actorEntry=null,targetEntry=null){
  // A legacy entry point may delegate to the modern resolver. One outer action
  // owns the first-hit/proc state and the extra hit, never both wrappers.
  if(traitBattleState.context)return action(move);
  const ctx={actorIsPlayer,actorEntry,targetEntry,received:0,move,uid:activeInstance?.uid,storyToken:typeof mapStoryBattleToken==='function'?mapStoryBattleToken():null};
  traitBattleState.context=ctx;traitBeforeAttack(ctx);
  const {actor,target}=traitTarget(actorIsPlayer,actorEntry,targetEntry),before=target.hp;
  let result;
  try{result=await action(move);
    if(typeof mapStoryTokenValid==='function'&&!mapStoryTokenValid(ctx.storyToken))return result;
    if(actorIsPlayer&&Number(move?.[1])>0){
      const s=traitMember();s.attacked=true;s.attackedTurn=battleTurnCount;s.star=0;
      const hit=target.hp<before;
      if(hit&&target.hp>0){
        const inflict=traitsForSpecies(activeInstance).find(t=>t.type==='inflict');
        if(inflict&&combatRandom()<inflict.value)traitApplyEnemyStatus(inflict.status,target.entry);
        if(traitPower('spark_dance')&&moveTypes(move).includes('fire')&&combatRandom()<traitPower('spark_dance'))traitEnemy(target.entry?.id||'single').sparkUntil=battleTurnCount+traitRule('sparkDanceTurns',2);
      }
      if(target.hp>0&&pHp>0&&traitPower('combo')>0&&combatRandom()<traitPower('combo')){
        const repeat=[...move];repeat[1]=Number(move[1])*traitRule('comboPowerRate',.5);
        await action(repeat);
      }
    }else if(!actorIsPlayer&&target.isPlayer&&(ctx.received>0||ctx.hitPlayer)){
      const rate=Math.max(traitPower('counter'),traitPower('lava_armor'));
      if(rate>0){actor.hp-=Math.floor(ctx.received*rate);if(actor.entry&&actor.hp<=0){actor.entry.alive=false;actor.entry.defeatedByPlayer=true;}}
      const frost=traitPower('frost_body');if(frost)traitEnemy(actorEntry?.id||'single').frost=Math.min(traitRule('frostBodyMax',.3),traitEnemy(actorEntry?.id||'single').frost+frost);
    }
    return result;
  }finally{traitBattleState.context=null;flushTraitMessages();if(typeof update==='function')update();}
}
function traitEndTurn({skipPlayerEffects=false}={}){
  if(traitBattleState.lastTurn===battleTurnCount)return;
  traitBattleState.lastTurn=battleTurnCount;
  if(!skipPlayerEffects&&pHp>0&&traitMember().skipEndTurn!==battleTurnCount-1){
    const s=traitMember(),rate=Math.max(traitPower('regen'),traitPower('mycelium_root'));
    if(rate){pHp=Math.min(playerMaxHp(),pHp+Math.floor(playerMaxHp()*rate));if(partyBattle[activePartyIdx])partyBattle[activePartyIdx].hp=pHp;}
    if(s.attackedTurn!==battleTurnCount-1)s.star=Math.min(traitRule('starGatherMax',.25),s.star+traitPower('star_gather'));
    s.wind=Math.min(traitRule('risingWindMax',.25),s.wind+traitPower('rising_wind'));
  }
  flushTraitMessages();
}
function traitPlayerTimedBuffExtensions(entries){
  const buffs=[];
  for(const entry of entries){
    if(entry.fainted||entry.hp<=0)continue;
    const state=traitBattleState.members.get(entry.inst?.uid||entry.inst?.id||'player');
    if(!state)continue;
    if(state.swiftUntil>=battleTurnCount&&traitPower('swift',1,entry.inst)>1)buffs.push(()=>{state.swiftUntil++;});
    if(state.giftUntil>battleTurnCount&&state.gift>1)buffs.push(()=>{state.giftUntil++;});
  }
  return buffs;
}
function traitPartyChanged(previous,next,fainted){
  const s=traitMember(next.inst),entryTurn=battleTurnCount+(fainted&&battleTurnInProgress?1:0);
  const extend=turns=>typeof extendNextPlayerTimedBuff==='function'?extendNextPlayerTimedBuff(turns):turns;
  const swift=traitPower('swift',1,next.inst)>1;
  // A same-turn re-entry must not erase a still-active Time Stop extension.
  s.swiftUntil=swift?Math.max(s.swiftUntil,entryTurn+extend(1)-1):entryTurn;
  s.skipEndTurn=fainted?battleTurnCount:-1;
  if(fainted){const gift=traitPower('parting_gift',1,previous?.inst);if(gift>1){s.gift=gift;s.giftUntil=entryTurn+extend(traitRule('partingGiftTurns',2));traitLog('parting_gift','次の仲間に力を託した',previous.inst);}}
  flushTraitMessages();
}

function traitMoveEnemyTarget(from,to){if(traitBattleState.enemies.has(from)){traitBattleState.enemies.set(to,traitBattleState.enemies.get(from));traitBattleState.enemies.delete(from);}}
