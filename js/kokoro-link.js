const KOKORO_LINK_CONFIG = Object.freeze({
  rarityMultipliers:Object.freeze({1:3.5, 2:2.6, 3:1.9, 4:1.3, 5:1.0}),
  abilityBands:Object.freeze({1:'power', 2:'status', 3:'tactics', 4:null, 5:null}),
  conversion:Object.freeze({
    barrierIndexRate:0.25,
    barrierTargetHpCapRate:0.40,
    attackIndexRate:1 / 500,
    attackMinimumBonus:0.08,
    attackMaximumBonus:0.30,
    speedIndexRate:0.10,
    speedTargetCapRate:0.30
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
      profile:{...link.profile,sourceStats:{...link.profile.sourceStats},indices:{...link.profile.indices}},
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

function kokoroLinkStatModifier(instance, stat){
  const value=Number(instance?.alchemy?.statModifiers?.[stat]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function kokoroLinkPositiveNumber(value, fallback=1){
  const number=Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function kokoroLinkLevel(instance){
  return Math.max(1,Math.floor(kokoroLinkPositiveNumber(instance?.level,1)));
}

function kokoroLinkMaxHp(monster, instance){
  const level=kokoroLinkLevel(instance);
  const base=kokoroLinkPositiveNumber(monster?.hp,1) + (level - 1) * 12;
  return Math.max(1, Math.round(base * kokoroLinkStatModifier(instance,'hp')));
}

function kokoroLinkSpeed(monster, instance){
  const base=kokoroLinkPositiveNumber(monster?.spd,50);
  return Math.max(1, Math.round(base * kokoroLinkStatModifier(instance,'speed')));
}

function kokoroLinkNativeOffense(monster, instance){
  const powers=(monster?.moves || [])
    .map(move => Number(move?.[1]) || 0)
    .filter(power => Number.isFinite(power) && power > 0);
  if(!powers.length) return 0;
  const average=powers.reduce((sum,power) => sum + power,0) / powers.length;
  return Math.max(0, average * kokoroLinkStatModifier(instance,'attack'));
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
  const hp=kokoroLinkMaxHp(monster,instance);
  const speed=kokoroLinkSpeed(monster,instance);
  const offense=kokoroLinkNativeOffense(monster,instance);
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
    sourceStats:{hp, speed, offense:kokoroLinkRounded(offense)},
    indices:{
      hp:kokoroLinkRounded(hp * multiplier),
      speed:kokoroLinkRounded(speed * multiplier),
      offense:kokoroLinkRounded(offense * multiplier)
    }
  };
}

function convertKokoroLinkEffects(profile, targetStats={}){
  if(!profile?.indices) return null;
  const conversion=KOKORO_LINK_CONFIG.conversion;
  const targetMaxHp=kokoroLinkPositiveNumber(targetStats.maxHp,1);
  const targetSpeed=kokoroLinkPositiveNumber(targetStats.speed,1);
  const hpIndex=Math.max(0,Number.isFinite(Number(profile.indices.hp)) ? Number(profile.indices.hp) : 0);
  const speedIndex=Math.max(0,Number.isFinite(Number(profile.indices.speed)) ? Number(profile.indices.speed) : 0);
  const offenseIndex=Math.max(0,Number.isFinite(Number(profile.indices.offense)) ? Number(profile.indices.offense) : 0);
  const barrierFromIndex=Math.round(hpIndex * conversion.barrierIndexRate);
  const barrierCap=Math.max(1,Math.round(targetMaxHp * conversion.barrierTargetHpCapRate));
  const rawAttackBonus=offenseIndex > 0
    ? offenseIndex * conversion.attackIndexRate
    : 0;
  const attackBonus=rawAttackBonus > 0
    ? kokoroLinkClamp(rawAttackBonus,conversion.attackMinimumBonus,conversion.attackMaximumBonus)
    : 0;
  const speedFromIndex=Math.round(speedIndex * conversion.speedIndexRate);
  const speedCap=Math.max(1,Math.round(targetSpeed * conversion.speedTargetCapRate));
  return {
    barrier:Math.min(barrierFromIndex,barrierCap),
    barrierCap,
    attackBonus:kokoroLinkRounded(attackBonus,4),
    attackMultiplier:kokoroLinkRounded(1 + attackBonus,4),
    speedBonus:Math.min(speedFromIndex,speedCap),
    speedCap,
    capsApplied:{
      barrier:barrierFromIndex > barrierCap,
      attack:rawAttackBonus > conversion.attackMaximumBonus,
      speed:speedFromIndex > speedCap
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
