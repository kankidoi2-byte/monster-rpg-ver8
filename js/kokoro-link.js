const KOKORO_LINK_CONFIG = Object.freeze({
  rarityMultipliers:Object.freeze({1:3.5, 2:2.6, 3:1.9, 4:1.3, 5:1.0}),
  abilityBands:Object.freeze({1:'power', 2:'status', 3:'tactics', 4:null, 5:null}),
  conversion:Object.freeze({
    baseEffectRate:0.10,
    maximumEffectRate:0.35
  })
});

const KOKORO_LINK_ABILITY_RULES = Object.freeze({
  version:'phase4-0',
  timing:'link-activation',
  resolutionCount:1,
  primaryTypeOnly:true,
  supportSuccessRate:1,
  enemyEffectBaseChance:.70,
  bossResistanceMultiplier:.50,
  caps:Object.freeze({
    extraAttackRate:.15,
    extraBarrierMaxHpRate:.15,
    extraSpeedRate:.15,
    instantHealMaxHpRate:.20,
    regenerationMaxHpRatePerTurn:.05,
    damageOverTimeMaxHpRatePerTurn:.05,
    actionControlTurns:1,
    evasionChance:.20,
    firstHitReductionRate:.25,
    lifeStealMaxHpRate:.10,
    fateChanceBonus:.15,
    debuffRate:.20,
    penetrationRate:.20,
    costReduction:1,
    minimumBattleCost:1,
    durationTurns:2
  }),
  stacking:Object.freeze({
    baseLink:'separate',
    sameCategory:'keep-stronger-refresh-longer',
    controlStatus:'one-at-a-time',
    damageOverTime:'one-per-status',
    additionalAbilityPerTarget:1
  }),
  rarityBands:Object.freeze({
    1:Object.freeze({id:'power',label:'数値強化',success:'guaranteed'}),
    2:Object.freeze({id:'status',label:'属性・状態異常',success:'enemy-resisted'}),
    3:Object.freeze({id:'tactics',label:'戦術支援',success:'guaranteed'}),
    4:null,
    5:null
  }),
  attributes:Object.freeze({
    normal:Object.freeze({power:'balanced_boost',status:'origin_weaken',tactics:'origin_choice'}),
    fire:Object.freeze({power:'attack_boost',status:'burn',tactics:'recoil_guard'}),
    water:Object.freeze({power:'barrier_boost',status:'slow',tactics:'cost_reduction'}),
    grass:Object.freeze({power:'regeneration',status:'poison',tactics:'instant_heal'}),
    thunder:Object.freeze({power:'speed_boost',status:'paralysis',tactics:'action_priority'}),
    wind:Object.freeze({power:'evasion',status:'action_delay',tactics:'free_switch'}),
    light:Object.freeze({power:'first_hit_guard',status:'dazzle',tactics:'cleanse'}),
    dark:Object.freeze({power:'life_steal',status:'confusion',tactics:'dispel'}),
    star:Object.freeze({power:'fate_boost',status:'sleep',tactics:'foresight'}),
    dragon:Object.freeze({power:'move_power_boost',status:'attack_down',tactics:'penetration'})
  }),
  abilities:Object.freeze({
    balanced_boost:Object.freeze({target:'ally',kind:'boost',rate:.05,stats:Object.freeze(['attack','barrier','speed'])}),
    attack_boost:Object.freeze({target:'ally',kind:'boost',rate:.15,stat:'attack'}),
    barrier_boost:Object.freeze({target:'ally',kind:'barrier',maxHpRate:.15}),
    regeneration:Object.freeze({target:'ally',kind:'regeneration',maxHpRatePerTurn:.05,durationTurns:2}),
    speed_boost:Object.freeze({target:'ally',kind:'boost',rate:.15,stat:'speed'}),
    evasion:Object.freeze({target:'ally',kind:'evasion',chance:.20,charges:1}),
    first_hit_guard:Object.freeze({target:'ally',kind:'damage-reduction',rate:.25,charges:1}),
    life_steal:Object.freeze({target:'ally',kind:'life-steal',damageRate:.20,maxHpRateCap:.10,charges:1}),
    fate_boost:Object.freeze({target:'ally',kind:'chance-boost',chanceBonus:.15,charges:1}),
    move_power_boost:Object.freeze({target:'ally',kind:'move-power',rate:.15,charges:1}),
    origin_weaken:Object.freeze({target:'enemy',kind:'debuff',rate:.10,stats:Object.freeze(['attack','speed']),durationTurns:2}),
    burn:Object.freeze({target:'enemy',kind:'damage-over-time',maxHpRatePerTurn:.05,durationTurns:2}),
    slow:Object.freeze({target:'enemy',kind:'debuff',rate:.20,stat:'speed',durationTurns:2}),
    poison:Object.freeze({target:'enemy',kind:'damage-over-time',maxHpRatePerTurn:.05,durationTurns:2}),
    paralysis:Object.freeze({target:'enemy',kind:'control',durationTurns:1}),
    action_delay:Object.freeze({target:'enemy',kind:'action-order',durationTurns:1}),
    dazzle:Object.freeze({target:'enemy',kind:'accuracy-down',rate:.20,durationTurns:2}),
    confusion:Object.freeze({target:'enemy',kind:'control',durationTurns:1}),
    sleep:Object.freeze({target:'enemy',kind:'control',durationTurns:1}),
    attack_down:Object.freeze({target:'enemy',kind:'debuff',rate:.20,stat:'attack',durationTurns:2}),
    origin_choice:Object.freeze({target:'ally',kind:'choice',options:Object.freeze(['small_heal','cleanse','cost_reduction'])}),
    small_heal:Object.freeze({target:'ally',kind:'heal',maxHpRate:.10}),
    recoil_guard:Object.freeze({target:'ally',kind:'recoil-guard',charges:1}),
    cost_reduction:Object.freeze({target:'ally',kind:'cost-reduction',amount:1,minimumCost:1,charges:1}),
    instant_heal:Object.freeze({target:'ally',kind:'heal',maxHpRate:.20}),
    action_priority:Object.freeze({target:'ally',kind:'action-order',charges:1}),
    free_switch:Object.freeze({target:'ally',kind:'free-switch',charges:1}),
    cleanse:Object.freeze({target:'ally',kind:'cleanse'}),
    dispel:Object.freeze({target:'enemy',kind:'dispel'}),
    foresight:Object.freeze({target:'enemy',kind:'foresight',durationTurns:1}),
    penetration:Object.freeze({target:'ally',kind:'penetration',rate:.20,charges:1})
  }),
  deferredAbilities:Object.freeze({
    cost_reduction:'battle-cost-resource-required'
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
      effects:{...link.effects,capsApplied:{...link.effects.capsApplied}},
      powerAbility:link.powerAbility ? {...link.powerAbility} : null
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

function buildKokoroLinkAbilityPlan(profile){
  if(!profile || !profile.abilityEligible) return null;
  const band=KOKORO_LINK_ABILITY_RULES.rarityBands[profile.rarity];
  const primaryType=KOKORO_LINK_ABILITY_RULES.attributes[profile.primaryType] ? profile.primaryType : 'normal';
  const abilityId=band ? KOKORO_LINK_ABILITY_RULES.attributes[primaryType]?.[band.id] : null;
  const ability=KOKORO_LINK_ABILITY_RULES.abilities[abilityId];
  if(!band || !abilityId || !ability) return null;
  return {
    rulesVersion:KOKORO_LINK_ABILITY_RULES.version,
    band:band.id,
    bandLabel:band.label,
    primaryType,
    abilityId,
    ability,
    timing:KOKORO_LINK_ABILITY_RULES.timing,
    resolutionCount:KOKORO_LINK_ABILITY_RULES.resolutionCount,
    successRule:band.success,
    deferredReason:KOKORO_LINK_ABILITY_RULES.deferredAbilities[abilityId] || null
  };
}

function buildKokoroLinkPowerAbility(plan,targetStats={}){
  if(!plan || plan.band !== 'power') return null;
  const targetMaxHp=kokoroLinkPositiveNumber(targetStats.maxHp,1);
  const targetSpeed=kokoroLinkPositiveNumber(targetStats.speed,1);
  const definitions={
    balanced_boost:{label:'原初の万能強化',summary:'攻撃・障壁・素早さ +5%',extraAttackRate:.05,extraBarrier:Math.round(targetMaxHp*.05),extraSpeed:Math.round(targetSpeed*.05)},
    attack_boost:{label:'炎心強化',summary:'攻撃ダメージ +15%',extraAttackRate:.15},
    barrier_boost:{label:'水護障壁',summary:'障壁 +15%',extraBarrier:Math.round(targetMaxHp*.15)},
    regeneration:{label:'森命再生',summary:'各ターンHP5%回復（2ターン）',remainingTurns:2,maxHpRatePerTurn:.05},
    speed_boost:{label:'雷速強化',summary:'素早さ +15%',extraSpeed:Math.round(targetSpeed*.15)},
    evasion:{label:'風渡り',summary:'次の攻撃を20%で回避',charges:1,chance:.20},
    first_hit_guard:{label:'光護の一閃',summary:'次の被ダメージを25%軽減',charges:1,reductionRate:.25},
    life_steal:{label:'闇命吸収',summary:'次の与ダメージ20%を吸収',charges:1,damageRate:.20,maxHpRateCap:.10},
    fate_boost:{label:'星運上昇',summary:'次の確率判定 +15ポイント',charges:1,chanceBonus:.15},
    move_power_boost:{label:'竜威増幅',summary:'次の技威力 +15%',charges:1,powerRate:.15}
  };
  const definition=definitions[plan.abilityId];
  return definition ? {id:plan.abilityId,...definition} : null;
}

function applyKokoroLinkPowerAbility(effects,powerAbility){
  if(!effects || !powerAbility) return effects;
  const extraAttackRate=Math.max(0,Number(powerAbility.extraAttackRate)||0);
  const extraBarrier=Math.max(0,Math.round(Number(powerAbility.extraBarrier)||0));
  const extraSpeed=Math.max(0,Math.round(Number(powerAbility.extraSpeed)||0));
  return {
    ...effects,
    barrier:effects.barrier+extraBarrier,
    barrierCap:effects.barrierCap+extraBarrier,
    attackBonus:kokoroLinkRounded(effects.attackBonus+extraAttackRate,4),
    attackMultiplier:kokoroLinkRounded(effects.attackMultiplier+extraAttackRate,4),
    speedBonus:effects.speedBonus+extraSpeed,
    speedCap:effects.speedCap+extraSpeed
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
  const abilityPlan=buildKokoroLinkAbilityPlan(profile);
  const powerAbility=buildKokoroLinkPowerAbility(abilityPlan,targetStats);
  const effects=applyKokoroLinkPowerAbility(convertKokoroLinkEffects(profile,targetStats),powerAbility);
  return {profile,effects,abilityPlan,powerAbility};
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
    powerAbility:resolved.powerAbility,
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

function kokoroLinkPowerAbilityFor(instance){
  return kokoroLinkEffectForInstance(instance)?.powerAbility || null;
}

function kokoroLinkPowerAbilityStatus(instance){
  const ability=kokoroLinkPowerAbilityFor(instance);
  if(!ability) return '';
  if(ability.id === 'regeneration') return ability.remainingTurns > 0 ? `${ability.label} 残り${ability.remainingTurns}ターン` : `${ability.label} 終了`;
  if(Number.isFinite(ability.charges)) return ability.charges > 0 ? `${ability.label} 待機中` : `${ability.label} 使用済み`;
  return ability.label;
}

function kokoroLinkMovePowerMultiplierFor(instance,power){
  const ability=kokoroLinkPowerAbilityFor(instance);
  if(!ability || ability.id !== 'move_power_boost' || ability.charges <= 0 || Number(power) <= 0) return {multiplier:1,boosted:false};
  ability.charges--;
  return {multiplier:1+(Number(ability.powerRate)||0),boosted:true};
}

function kokoroLinkChanceFor(instance,baseChance){
  const safeBase=kokoroLinkClamp(baseChance,0,1);
  const ability=kokoroLinkPowerAbilityFor(instance);
  if(!ability || ability.id !== 'fate_boost' || ability.charges <= 0) return {chance:safeBase,boosted:false};
  ability.charges--;
  return {chance:kokoroLinkClamp(safeBase+(Number(ability.chanceBonus)||0),0,1),boosted:true};
}

function consumeKokoroLinkLifeSteal(instance,actualDamage,maxHp){
  const ability=kokoroLinkPowerAbilityFor(instance);
  const damage=Math.max(0,Math.floor(Number(actualDamage)||0));
  if(!ability || ability.id !== 'life_steal' || ability.charges <= 0 || damage <= 0) return {healing:0,consumed:false};
  ability.charges--;
  const cap=Math.max(0,Math.floor(kokoroLinkPositiveNumber(maxHp,1)*(Number(ability.maxHpRateCap)||0)));
  const healing=Math.min(cap,Math.max(1,Math.floor(damage*(Number(ability.damageRate)||0))));
  return {healing,consumed:true};
}

function tickKokoroLinkRegeneration(instance,currentHp,maxHp){
  const ability=kokoroLinkPowerAbilityFor(instance);
  const safeMaxHp=Math.max(1,Math.floor(kokoroLinkPositiveNumber(maxHp,1)));
  const safeHp=kokoroLinkClamp(Math.floor(Number(currentHp)||0),0,safeMaxHp);
  if(!ability || ability.id !== 'regeneration' || ability.remainingTurns <= 0 || safeHp <= 0) return {healed:0,hp:safeHp,remainingTurns:Math.max(0,Number(ability?.remainingTurns)||0)};
  ability.remainingTurns--;
  const requested=Math.max(1,Math.floor(safeMaxHp*(Number(ability.maxHpRatePerTurn)||0)));
  const hp=Math.min(safeMaxHp,safeHp+requested);
  return {healed:hp-safeHp,hp,remainingTurns:ability.remainingTurns};
}

function absorbKokoroLinkDamage(instance,damage,randomFn=Math.random){
  const incoming=Math.max(0,Math.floor(Number(damage) || 0));
  const link=kokoroLinkEffectForInstance(instance);
  if(!link) return {incoming,afterReduction:incoming,hpDamage:incoming,absorbed:0,reduced:0,evaded:false,barrierRemaining:0};
  const ability=link.powerAbility;
  if(ability?.id === 'evasion' && ability.charges > 0){
    ability.charges--;
    if(randomFn() < (Number(ability.chance)||0)) return {incoming,afterReduction:0,hpDamage:0,absorbed:0,reduced:0,evaded:true,barrierRemaining:link.barrierRemaining};
  }
  let reduced=0;
  if(ability?.id === 'first_hit_guard' && ability.charges > 0){
    ability.charges--;
    reduced=Math.floor(incoming*(Number(ability.reductionRate)||0));
  }
  const afterReduction=Math.max(0,incoming-reduced);
  if(link.barrierRemaining <= 0) return {incoming,afterReduction,hpDamage:afterReduction,absorbed:0,reduced,evaded:false,barrierRemaining:0};
  const absorbed=Math.min(afterReduction,link.barrierRemaining);
  link.barrierRemaining-=absorbed;
  return {incoming,afterReduction,hpDamage:afterReduction-absorbed,absorbed,reduced,evaded:false,barrierRemaining:link.barrierRemaining};
}
