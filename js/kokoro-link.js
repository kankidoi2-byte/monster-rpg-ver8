const KOKORO_LINK_CONFIG = Object.freeze({
  rarityMultipliers:Object.freeze({1:3.5, 2:2.6, 3:1.9, 4:1.3, 5:1.0}),
  abilityBands:Object.freeze({1:'power', 2:'status', 3:'tactics', 4:null, 5:null}),
  conversion:Object.freeze({
    baseEffectRate:0.10,
    maximumEffectRate:0.35
  })
});

let kokoroLinkBattleState={usedSourceUids:new Set(),linksByTargetUid:new Map()};

function resetKokoroLinkBattleState(){
  kokoroLinkBattleState={usedSourceUids:new Set(),linksByTargetUid:new Map()};
  return kokoroLinkBattleSnapshot();
}

function kokoroLinkBattleSnapshot(){
  return {
    usedSourceUids:[...kokoroLinkBattleState.usedSourceUids],
    activeLinks:[...kokoroLinkBattleState.linksByTargetUid.values()].map(link => ({
      ...link,
      profile:{...link.profile},
      effects:{...link.effects,capsApplied:{...link.effects.capsApplied}}
    }))
  };
}

function kokoroLinkPartyEntryUid(entry){
  const value=entry?.uid || entry?.inst?.uid;
  return typeof value === 'string' && value ? value : null;
}

function kokoroLinkPartyEntryAlive(entry){
  return !!entry && entry.fainted !== true && Number(entry.hp) > 0;
}

function kokoroLinkRarity(monster){
  return Math.max(1, Math.min(5, String(monster?.rarity || '★').length));
}

function kokoroLinkMultiplier(monster){
  return KOKORO_LINK_CONFIG.rarityMultipliers[kokoroLinkRarity(monster)] || 1;
}

function kokoroLinkPositiveNumber(value, fallback=1){
  const number=Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function kokoroLinkLevel(instance){
  return Math.max(1,Math.floor(kokoroLinkPositiveNumber(instance?.level,1)));
}

function kokoroLinkRounded(value, digits=2){
  if(!Number.isFinite(Number(value))) return 0;
  const scale=10 ** digits;
  return Math.round((Number(value) || 0) * scale) / scale;
}

function kokoroLinkClamp(value, minimum, maximum){
  const safe=Number.isFinite(Number(value)) ? Number(value) : minimum;
  return Math.min(maximum, Math.max(minimum, safe));
}

function buildKokoroLinkProfile(monster, instance={}){
  if(!monster || monster.entityKind !== 'monster') return null;
  const rarity=kokoroLinkRarity(monster);
  const multiplier=KOKORO_LINK_CONFIG.rarityMultipliers[rarity];
  const abilityBand=KOKORO_LINK_CONFIG.abilityBands[rarity];
  return {
    sourceUid:typeof instance?.uid === 'string' ? instance.uid : null,
    monsterId:monster.id || null,
    monsterName:monster.name || monster.id || '不明なモンスター',
    level:kokoroLinkLevel(instance),
    rarity,
    multiplier,
    primaryType:Array.isArray(monster.types) && monster.types.length ? monster.types[0] : 'normal',
    abilityEligible:abilityBand !== null,
    abilityBand,
    linkRate:kokoroLinkRounded(KOKORO_LINK_CONFIG.conversion.baseEffectRate * multiplier,4)
  };
}

function convertKokoroLinkEffects(profile, targetStats={}){
  if(!profile) return null;
  const conversion=KOKORO_LINK_CONFIG.conversion;
  const targetMaxHp=kokoroLinkPositiveNumber(targetStats.maxHp,1);
  const targetSpeed=kokoroLinkPositiveNumber(targetStats.speed,1);
  const rawEffectRate=Number.isFinite(Number(profile.linkRate)) ? Math.max(0,Number(profile.linkRate)) : 0;
  const effectRate=kokoroLinkClamp(rawEffectRate,0,conversion.maximumEffectRate);
  const barrier=Math.round(kokoroLinkRounded(targetMaxHp * effectRate,8));
  const speedBonus=Math.round(kokoroLinkRounded(targetSpeed * effectRate,8));
  return {
    effectRate:kokoroLinkRounded(effectRate,4),
    barrier,
    barrierCap:Math.round(kokoroLinkRounded(targetMaxHp * conversion.maximumEffectRate,8)),
    attackBonus:kokoroLinkRounded(effectRate,4),
    attackMultiplier:kokoroLinkRounded(1 + effectRate,4),
    speedBonus,
    speedCap:Math.round(kokoroLinkRounded(targetSpeed * conversion.maximumEffectRate,8)),
    capsApplied:{
      barrier:rawEffectRate > conversion.maximumEffectRate,
      attack:rawEffectRate > conversion.maximumEffectRate,
      speed:rawEffectRate > conversion.maximumEffectRate
    }
  };
}

function resolveKokoroLink(monster, instance, targetStats){
  const profile=buildKokoroLinkProfile(monster,instance);
  if(!profile) return null;
  return {profile,effects:convertKokoroLinkEffects(profile,targetStats)};
}

function listKokoroLinkSources(partyEntries, activeIndex, options={}){
  if(!Array.isArray(partyEntries) || !Number.isInteger(activeIndex) || activeIndex < 0 || activeIndex >= partyEntries.length) return [];
  const includeUsed=options.includeUsed === true;
  const seen=new Set();
  return partyEntries.flatMap((entry,index) => {
    if(index === activeIndex || !kokoroLinkPartyEntryAlive(entry)) return [];
    const uid=kokoroLinkPartyEntryUid(entry);
    const monster=entry?.mon;
    const instance=entry?.inst;
    if(!uid || seen.has(uid) || !monster || monster.entityKind !== 'monster' || !instance) return [];
    seen.add(uid);
    const used=kokoroLinkBattleState.usedSourceUids.has(uid);
    if(used && !includeUsed) return [];
    const profile=buildKokoroLinkProfile(monster,instance);
    if(!profile) return [];
    return [{uid,index,used,available:!used,entry,profile}];
  });
}

function currentKokoroLinkSources(options={}){
  const entries=typeof partyBattle !== 'undefined' ? partyBattle : [];
  const activeIndex=typeof activePartyIdx !== 'undefined' ? activePartyIdx : -1;
  return listKokoroLinkSources(entries,activeIndex,options);
}

function canUseKokoroLinkSource(uid, partyEntries, activeIndex){
  return listKokoroLinkSources(partyEntries,activeIndex).some(source => source.uid === uid);
}

function markKokoroLinkSourceUsed(uid, partyEntries, activeIndex){
  if(!canUseKokoroLinkSource(uid,partyEntries,activeIndex)) return false;
  kokoroLinkBattleState.usedSourceUids.add(uid);
  return true;
}

function markCurrentKokoroLinkSourceUsed(uid){
  const entries=typeof partyBattle !== 'undefined' ? partyBattle : [];
  const activeIndex=typeof activePartyIdx !== 'undefined' ? activePartyIdx : -1;
  return markKokoroLinkSourceUsed(uid,entries,activeIndex);
}

function kokoroLinkTargetUid(entry){
  return kokoroLinkPartyEntryUid(entry);
}

function kokoroLinkEffectForTarget(uid){
  return typeof uid === 'string' ? kokoroLinkBattleState.linksByTargetUid.get(uid) || null : null;
}

function kokoroLinkEffectForInstance(instance){
  return kokoroLinkEffectForTarget(instance?.uid);
}

function activateKokoroLinkSource(sourceUid, partyEntries, activeIndex, targetStats={}){
  if(!Array.isArray(partyEntries) || !Number.isInteger(activeIndex)) return {ok:false,reason:'invalid-party'};
  const target=partyEntries[activeIndex];
  const targetUid=kokoroLinkTargetUid(target);
  if(!targetUid || !kokoroLinkPartyEntryAlive(target) || target?.mon?.entityKind !== 'monster') return {ok:false,reason:'invalid-target'};
  if(kokoroLinkEffectForTarget(targetUid)) return {ok:false,reason:'target-linked'};
  const source=listKokoroLinkSources(partyEntries,activeIndex).find(candidate => candidate.uid === sourceUid);
  if(!source) return {ok:false,reason:'invalid-source'};
  const resolved=resolveKokoroLink(source.entry.mon,source.entry.inst,targetStats);
  if(!resolved?.effects || !markKokoroLinkSourceUsed(sourceUid,partyEntries,activeIndex)) return {ok:false,reason:'invalid-source'};
  const link={
    sourceUid,
    sourceName:resolved.profile.monsterName,
    targetUid,
    targetName:target.mon.name || target.mon.id || '不明なモンスター',
    profile:resolved.profile,
    effects:resolved.effects,
    barrierRemaining:resolved.effects.barrier
  };
  kokoroLinkBattleState.linksByTargetUid.set(targetUid,link);
  return {ok:true,link};
}

function activateCurrentKokoroLink(sourceUid,targetStats={}){
  const entries=typeof partyBattle !== 'undefined' ? partyBattle : [];
  const activeIndex=typeof activePartyIdx !== 'undefined' ? activePartyIdx : -1;
  return activateKokoroLinkSource(sourceUid,entries,activeIndex,targetStats);
}

function kokoroLinkAttackMultiplierFor(instance){
  return kokoroLinkEffectForInstance(instance)?.effects?.attackMultiplier || 1;
}

function kokoroLinkSpeedBonusFor(instance){
  return Math.max(0,Number(kokoroLinkEffectForInstance(instance)?.effects?.speedBonus) || 0);
}

function kokoroLinkBarrierFor(instance){
  return Math.max(0,Number(kokoroLinkEffectForInstance(instance)?.barrierRemaining) || 0);
}

function absorbKokoroLinkDamage(instance,damage){
  const incoming=Math.max(0,Math.floor(Number(damage) || 0));
  const link=kokoroLinkEffectForInstance(instance);
  if(!link || link.barrierRemaining <= 0) return {incoming,hpDamage:incoming,absorbed:0,barrierRemaining:0};
  const absorbed=Math.min(incoming,link.barrierRemaining);
  link.barrierRemaining-=absorbed;
  return {incoming,hpDamage:incoming-absorbed,absorbed,barrierRemaining:link.barrierRemaining};
}
