function typeEff(atkTypeOrTypes, defTypes) {
  const attackTypes=normalizeMoveTypes(atkTypeOrTypes);
  const defenseTypes=normalizeMoveTypes(defTypes);
  const multipliers = attackTypes.flatMap(atkType =>
    defenseTypes.map(defType => ADV[atkType]?.[defType] ?? 1)
  );
  return multipliers.length ? Math.max(...multipliers) : 1;
}
// Load the optional battle module without document.write, which can remove the
// following parser script on preview CDNs and leave battle-flow.js unloaded.
(function loadMultiBattleModule() {
  if (document.querySelector('script[data-multi-battle]')) return;
  const script = document.createElement('script');
  script.src = 'js/multi-battle.js?v=kokoro-link-phase5-1';
  script.dataset.multiBattle = 'true';
  document.head.appendChild(script);
})();
function alchemyRecoilDamage(actualDamage){
  return Math.max(1, Math.floor(Math.max(0, Number(actualDamage) || 0) * .25));
}
function resolvePlayerIncomingDamage(damage){
  if(typeof absorbKokoroLinkDamage==='function')return absorbKokoroLinkDamage(activeInstance,damage);
  const incoming=Math.max(0,Math.floor(Number(damage)||0));
  return {incoming,afterReduction:incoming,hpDamage:incoming,absorbed:0,reduced:0,reductionLabel:null,evaded:false,barrierRemaining:0};
}
function kokoroLinkDefenseMessage(result){
  if(!result)return '';
  const messages=[];
  if(result.evaded)messages.push('🌪️ 風渡りで攻撃を回避！');
  if(result.reduced)messages.push(`✨ ${result.reductionLabel||'リンク能力'}が${result.reduced}ダメージを軽減！`);
  if(result.absorbed)messages.push(`💞 ココロ障壁が${result.absorbed}ダメージを防いだ！（残り${result.barrierRemaining}）`);
  return messages.join('<br>');
}
function applyPlayerKokoroLinkRegeneration(){
  if(typeof tickKokoroLinkRegeneration!=='function')return '';
  const result=tickKokoroLinkRegeneration(activeInstance,pHp,playerMaxHp());
  pHp=result.hp;
  if(partyBattle[activePartyIdx])partyBattle[activePartyIdx].hp=pHp;
  return result.healed?`🌿 森命再生でHPを${result.healed}回復！（残り${result.remainingTurns}ターン）`:'';
}
function applyPlayerKokoroLinkLifeSteal(actualDamage){
  if(typeof consumeKokoroLinkLifeSteal!=='function')return '';
  const result=consumeKokoroLinkLifeSteal(activeInstance,actualDamage,playerMaxHp());
  if(!result.consumed)return '';
  const before=pHp;
  pHp=Math.min(playerMaxHp(),pHp+result.healing);
  if(partyBattle[activePartyIdx])partyBattle[activePartyIdx].hp=pHp;
  return `🌑 闇命吸収でHPを${pHp-before}回復！`;
}
function playerKokoroLinkChance(baseChance){
  if(typeof kokoroLinkChanceFor!=='function')return {chance:baseChance,boosted:false};
  return kokoroLinkChanceFor(activeInstance,baseChance);
}
function singleEnemyKokoroLinkKey(){return 'single';}
function enemyKokoroLinkAttackMultiplier(targetKey){return typeof kokoroLinkEnemyAttackMultiplierFor==='function'?kokoroLinkEnemyAttackMultiplierFor(targetKey):1;}
function enemyKokoroLinkSpeed(monster,targetKey){const base=monSpd(monster);const multiplier=typeof kokoroLinkEnemySpeedMultiplierFor==='function'?kokoroLinkEnemySpeedMultiplierFor(targetKey):1;return Math.max(1,Math.round(base*multiplier));}
function enemyKokoroLinkMisses(targetKey,randomFn=Math.random){const accuracy=typeof kokoroLinkEnemyAccuracyFor==='function'?kokoroLinkEnemyAccuracyFor(targetKey):1;return randomFn()>=accuracy;}
function enemyKokoroLinkStatusHtml(targetKey){
  const parts=[];const status=typeof kokoroLinkEnemyStatusText==='function'?kokoroLinkEnemyStatusText(targetKey):'';const foresight=typeof kokoroLinkForesightTextForTarget==='function'?kokoroLinkForesightTextForTarget(targetKey):'';
  if(status)parts.push(`💔${status}`);if(foresight)parts.push(foresight);return parts.length?` / ${parts.join('・')}`:'';
}
function applyKokoroLinkControlStatus(result,target){
  const turns=Math.max(1,Number(result.durationTurns)||1),multi=target?.kind==='multi';
  if(multi){
    target.entry.paralysisTurns=0;target.entry.confusionTurns=0;target.entry.sleepTurns=0;
    if(result.controlStatus==='paralysis')target.entry.paralysisTurns=turns;
    if(result.controlStatus==='confusion')target.entry.confusionTurns=turns;
    if(result.controlStatus==='sleep')target.entry.sleepTurns=turns;
  }else{
    eParalysisTurns=0;eConfusionTurns=0;eSleepTurns=0;
    if(result.controlStatus==='paralysis')eParalysisTurns=turns;
    if(result.controlStatus==='confusion')eConfusionTurns=turns;
    if(result.controlStatus==='sleep')eSleepTurns=turns;
  }
}
function applyKokoroLinkStatusAbilityForBattle(link,targetId=null,randomFn=Math.random){
  if(!link?.statusAbility||typeof attemptKokoroLinkStatusAbility!=='function')return '';
  const multiEntry=multiBattle?.active?multiEnemy(targetId):null;
  const targetMon=multiEntry?.mon||enemy;
  const targetKey=multiEntry?.id||singleEnemyKokoroLinkKey();
  if(!targetMon)return '⚠️ 追加能力の対象が見つからなかった。';
  const result=attemptKokoroLinkStatusAbility(link,{targetKey,bossClass:targetMon.bossClass,immune:targetMon.kokoroLinkStatusImmune===true},randomFn);
  const rate=Math.round((result.successRate||0)*100);
  if(!result.resolved)return '⚠️ 追加能力はすでに判定済みです。';
  if(!result.succeeded)return result.immune?`🛡️ ${targetMon.name}には「${result.label}」が効かなかった！`:`💨 「${result.label}」は不発だった！（成功率${rate}%）`;
  const strongerPoisonActive=result.abilityId==='poison'&&(multiEntry?multiEntry.status==='poison'&&multiEntry.poisonTurns>0:eStatus==='poison'&&ePoisonTurns>0);
  if(result.components?.length&&!strongerPoisonActive)applyKokoroLinkEnemyEffectComponents(targetKey,result.components);
  if(strongerPoisonActive){if(multiEntry)multiEntry.poisonTurns=Math.max(multiEntry.poisonTurns,result.components?.[0]?.durationTurns||2);else ePoisonTurns=Math.max(ePoisonTurns,result.components?.[0]?.durationTurns||2);}
  if(result.controlStatus)applyKokoroLinkControlStatus(result,multiEntry?{kind:'multi',entry:multiEntry}:{kind:'single'});
  return `💔 ${targetMon.name}に「${result.label}」が発動！（成功率${rate}%）<br>${result.summary}`;
}
function clearPlayerKokoroLinkStatuses(){
  const cleared=[];
  if(pStatus==='poison'||pPoisonTurns>0)cleared.push('毒');if(pParalysisTurns>0)cleared.push('麻痺');if(pConfusionTurns>0)cleared.push('こんらん');if(pSleepTurns>0)cleared.push('ねむり');
  pStatus=null;pPoisonTurns=0;pParalysisTurns=0;pConfusionTurns=0;pSleepTurns=0;
  return [...new Set(cleared)];
}
function healPlayerByKokoroLink(rate){
  const before=pHp,requested=Math.max(1,Math.floor(playerMaxHp()*(Number(rate)||0))),healing=typeof adjustedBattleHealing==='function'?adjustedBattleHealing(requested):requested;
  pHp=Math.min(playerMaxHp(),pHp+healing);if(partyBattle[activePartyIdx])partyBattle[activePartyIdx].hp=pHp;return pHp-before;
}
function dispelEnemyKokoroLinkBoosts(targetId=null){
  const entry=multiBattle?.active?multiEnemy(targetId):null;const removed=[];
  if(entry){if(entry.attack>1){entry.attack=1;removed.push('攻撃強化');}if(entry.guard){entry.guard=false;removed.push('防御');}if(entry.flareCharge){entry.flareCharge=false;removed.push('フレアチャージ');}if(entry.aquaShield){entry.aquaShield=false;removed.push('水の盾');}}
  else{if(eAtk>1){eAtk=1;removed.push('攻撃強化');}if(eGuard){eGuard=false;removed.push('防御');}if(eFlareCharge){eFlareCharge=false;removed.push('フレアチャージ');}if(eAquaShield){eAquaShield=false;removed.push('水の盾');}}
  return removed;
}
function applyKokoroLinkTacticsAbilityForBattle(link,targetId=null,randomFn=Math.random){
  const ability=link?.tacticsAbility;if(!ability)return '';
  if(ability.deferred)return `⏸️ ★3リンク能力「${ability.label}」は、戦闘内コスト実装まで保留中です。`;
  if(ability.id==='origin_choice')return `✨ ★3リンク能力「${ability.label}」：効果を選択してください。`;
  if(ability.id==='instant_heal'){const healed=healPlayerByKokoroLink(ability.maxHpRate);markKokoroLinkTacticsResolved(link);return `🌿 「${ability.label}」でHPを${healed}回復！`;}
  if(ability.id==='cleanse'){const cleared=clearPlayerKokoroLinkStatuses();markKokoroLinkTacticsResolved(link);return cleared.length?`✨ 「${ability.label}」で${cleared.join('・')}を解除！`:`✨ 「${ability.label}」が発動したが、解除する状態異常はなかった。`;}
  if(ability.id==='dispel'){
    const target=multiBattle?.active?multiEnemy(targetId):null,targetMon=target?.mon||enemy;if(!targetMon)return '⚠️ 強化解除の対象が見つからなかった。';
    const removed=dispelEnemyKokoroLinkBoosts(targetId);markKokoroLinkTacticsResolved(link,{targetKey:target?.id||singleEnemyKokoroLinkKey()});return removed.length?`🌑 「${ability.label}」で${targetMon.name}の${removed.join('・')}を解除！`:`🌑 「${ability.label}」が発動したが、${targetMon.name}に解除可能な強化はなかった。`;
  }
  if(ability.id==='foresight'){
    const target=multiBattle?.active?multiEnemy(targetId):null,targetMon=target?.mon||enemy,targetKey=target?.id||singleEnemyKokoroLinkKey(),moves=targetMon?.moves||[];
    if(!moves.length)return '⚠️ 予知する行動が見つからなかった。';const move=moves[Math.floor(randomFn()*moves.length)]||moves[0];setKokoroLinkForesight(link,targetKey,move);return `🔮 「${ability.label}」で${targetMon.name}の次の行動「${move[0]}」を予知！`;
  }
  markKokoroLinkTacticsResolved(link);return `✨ ★3リンク能力「${ability.label}」が待機状態になった！<br>${ability.summary}`;
}
function applyKokoroLinkOriginChoiceForBattle(optionId){
  const result=typeof resolveKokoroLinkTacticsChoice==='function'?resolveKokoroLinkTacticsChoice(activeInstance,optionId):{resolved:false};if(!result.resolved)return '⚠️ 原初選択を実行できませんでした。';
  if(optionId==='small_heal'){const healed=healPlayerByKokoroLink(.10);return `✨ 原初選択「小回復」でHPを${healed}回復！`;}
  const cleared=clearPlayerKokoroLinkStatuses();return cleared.length?`✨ 原初選択「浄化」で${cleared.join('・')}を解除！`:'✨ 原初選択「浄化」が発動したが、解除する状態異常はなかった。';
}
function nextEnemyMoveWithKokoroLinkForesight(targetKey,monster,randomFn=Math.random){
  const foretold=typeof consumeKokoroLinkForesightMove==='function'?consumeKokoroLinkForesightMove(targetKey):null;if(foretold)return {move:foretold,foretold:true};
  const moves=monster?.moves||[];return {move:moves[Math.floor(randomFn()*moves.length)]||moves[0]||['通常攻撃',24,'normal'],foretold:false};
}
function kokoroLinkPenetratedMultiplier(multiplier,rate){return Number(multiplier)<1?Math.min(1,Number(multiplier)+(Number(rate)||0)):Number(multiplier);}
function tickSingleEnemyKokoroLinkEffects(){
  if(typeof tickKokoroLinkEnemyEffects!=='function'||eHp<=0)return '';
  const result=tickKokoroLinkEnemyEffects(singleEnemyKokoroLinkKey(),eHp,enemyMaxHp());eHp=result.hp;
  const messages=[];if(result.damage)messages.push(`🔥☠️ ${enemy.name}はリンク状態異常で${result.damage}ダメージ！`);if(result.expiredLabels.length&&eHp>0)messages.push(`✨ ${[...new Set(result.expiredLabels)].join('・')}の効果が切れた！`);return messages.join('<br>');
}
function applySleepToTarget(targetIsPlayer) {
  const actor = targetIsPlayer ? player : enemy;
  const current = targetIsPlayer ? pSleepTurns : eSleepTurns;
  if (current > 0) return `<br>💤 ${actor.name}はすでに眠っている！`;
  if (targetIsPlayer) pSleepTurns = 2; else eSleepTurns = 2;
  return `<br>💤 ${actor.name}はねむり状態になった！`;
}
function trySleepAction(isPlayer) {
  let turns = isPlayer ? pSleepTurns : eSleepTurns;
  if (turns <= 0) return {canAct:true, message:''};
  const actor = isPlayer ? player : enemy;
  turns--;
  if (isPlayer) pSleepTurns = turns; else eSleepTurns = turns;
  let message = `💤 ${actor.name}は眠っていて動けない！`;
  if (turns === 0) message += `<br>✨ ${actor.name}は目を覚ました！`;
  update();
  return {canAct:false, message};
}
function applyParalysisToTarget(targetIsPlayer) {
  if (targetIsPlayer) {
    pParalysisTurns = 3;
    return `<br>⚡ ${player.name}は麻痺状態になった！`;
  }
  eParalysisTurns = 3;
  return `<br>⚡ ${enemy.name}は麻痺状態になった！`;
}
function tryParalysisAction(isPlayer) {
  let turns = isPlayer ? pParalysisTurns : eParalysisTurns;
  if (turns <= 0) return {canAct:true, message:''};
  const actor = isPlayer ? player : enemy;
  const stopped = Math.random() < 0.30;
  turns--;
  if (isPlayer) pParalysisTurns = turns; else eParalysisTurns = turns;
  let message = stopped ? `⚡ ${actor.name}は体がしびれて動けない！` : '';
  if (turns === 0) message += `${message ? '<br>' : ''}✨ ${actor.name}の麻痺が治った！`;
  update();
  return {canAct:!stopped, message};
}
function applyConfusionToTarget(targetIsPlayer) {
  const actor = targetIsPlayer ? player : enemy;
  const current = targetIsPlayer ? pConfusionTurns : eConfusionTurns;
  if (current > 0) return `<br>🌀 ${actor.name}はすでにこんらんしている！`;
  const turns = 2 + Math.floor(Math.random() * 2);
  if (targetIsPlayer) pConfusionTurns = turns; else eConfusionTurns = turns;
  return `<br>🌀 ${actor.name}はこんらんした！（${turns}ターン）`;
}
function tryConfusionAction(isPlayer) {
  let turns = isPlayer ? pConfusionTurns : eConfusionTurns;
  if (turns <= 0) return {canAct:true, selfHit:false, message:''};
  const actor = isPlayer ? player : enemy;
  const roll = Math.random();
  turns--;
  if (isPlayer) pConfusionTurns = turns; else eConfusionTurns = turns;
  let result;
  if (roll < 0.50) {
    result = {canAct:true, selfHit:false, message:`🌀 ${actor.name}はこんらんしているが、うまく行動した！`};
  } else if (roll < 0.75) {
    result = {canAct:false, selfHit:false, message:`🌀 ${actor.name}はこんらんして動けない！`};
  } else {
    const atkMultiplier = isPlayer ? pAtk * playerAttackInstanceMultiplier() : eAtk * enemyDifficultyAttackMultiplier() * enemyKokoroLinkAttackMultiplier(singleEnemyKokoroLinkKey());
    const rawDamage = Math.max(1, Math.floor(24 * atkMultiplier * 0.5));
    const barrier = isPlayer ? resolvePlayerIncomingDamage(rawDamage) : {hpDamage:rawDamage,absorbed:0};
    const damage = barrier.hpDamage;
    if (isPlayer) {
      pHp = Math.max(0, pHp - damage);
      if (partyBattle[activePartyIdx]) partyBattle[activePartyIdx].hp = pHp;
    } else {
      eHp = Math.max(0, eHp - damage);
    }
    result = {canAct:false, selfHit:true, message:`🌀 ${actor.name}はこんらんして自分を攻撃した！ <b>${damage}</b>ダメージ！${barrier.absorbed?`<br>💞 ココロ障壁が${barrier.absorbed}ダメージを防いだ！`:''}`};
  }
  if (turns === 0) result.message += `<br>✨ ${actor.name}のこんらんが治った！`;
  update();
  return result;
}
async function performAction(attacker, defender, move, isPlayer) {
  const logEl = document.getElementById('log');
  const sleep = trySleepAction(isPlayer);
  if (!sleep.canAct) {
    logEl.innerHTML = sleep.message;
    return {acted:false,animated:false};
  }
  const paralysis = tryParalysisAction(isPlayer);
  if (!paralysis.canAct) {
    logEl.innerHTML = paralysis.message;
    return {acted:false,animated:false};
  }
  const confusion = tryConfusionAction(isPlayer);
  if (!confusion.canAct) {
    logEl.innerHTML = confusion.message;
    return {acted:false,animated:false};
  }
  const result=await doAttack(attacker, defender, move, isPlayer);
  const extra = [paralysis.message, confusion.message].filter(Boolean).join('<br>');
  if (extra) logEl.innerHTML += `<br>${extra}`;
  return {acted:true,animated:!!result?.animated};
}
function applyPoisonToTarget(targetIsPlayer) {
  const poison = BATTLE_STATUS_EFFECTS.poison;
  const actor = targetIsPlayer ? player : enemy;
  const wasPoisoned = targetIsPlayer ? pPoisonTurns > 0 : ePoisonTurns > 0;
  if (targetIsPlayer) {
    pStatus = 'poison';
    pPoisonTurns = poison.duration;
  } else {
    if(typeof removeKokoroLinkEnemyEffectCategory==='function')removeKokoroLinkEnemyEffectCategory(singleEnemyKokoroLinkKey(),'poison');
    eStatus = 'poison';
    ePoisonTurns = poison.duration;
  }
  return `<br>☠️ ${actor.name}の毒は${wasPoisoned ? '更新され' : '付与され'}、残り${poison.duration}ターンになった！`;
}
function applyPoisonEndTurn() {
  const poison = BATTLE_STATUS_EFFECTS.poison;
  const msgs = [];
  if (pStatus === 'poison' && pPoisonTurns > 0 && pHp > 0) {
    const dmg = Math.max(1, Math.floor(playerMaxHp() * poison.maxHpDamageRate));
    pHp = Math.max(0, pHp - dmg);
    pPoisonTurns--;
    if (partyBattle[activePartyIdx]) partyBattle[activePartyIdx].hp = pHp;
    msgs.push(`☠️ ${player.name}は毒で${dmg}ダメージ！ 残り${pPoisonTurns}ターン${pHp <= 0 ? '<br>💀 '+player.name+'は毒で戦闘不能になった！' : ''}`);
    if(pPoisonTurns <= 0){ pStatus = null; if(pHp > 0) msgs.push(`✨ ${player.name}の毒が治った！`); }
  }
  if (eStatus === 'poison' && ePoisonTurns > 0 && eHp > 0) {
    const dmg = Math.max(1, Math.floor(enemyMaxHp() * poison.maxHpDamageRate));
    eHp = Math.max(0, eHp - dmg);
    ePoisonTurns--;
    msgs.push(`☠️ ${enemy.name}は毒で${dmg}ダメージ！ 残り${ePoisonTurns}ターン${eHp <= 0 ? '<br>💀 '+enemy.name+'は毒で戦闘不能になった！' : ''}`);
    if(ePoisonTurns <= 0){ eStatus = null; if(eHp > 0) msgs.push(`✨ ${enemy.name}の毒が治った！`); }
  }
  update();
  return msgs.join('<br>');
}
function finishTurnWithPoison() {
  const logEl = document.getElementById('log');
  completeBattleTurn();
  const poisonMsg = applyPoisonEndTurn();
  if (poisonMsg) logEl.innerHTML += `<br>${poisonMsg}`;
  const linkStatusMsg=tickSingleEnemyKokoroLinkEffects();if(linkStatusMsg)logEl.innerHTML+=`<br>${linkStatusMsg}`;
  if (eHp <= 0) { win(); return; }
  if(pHp>0){const regenMsg=applyPlayerKokoroLinkRegeneration();if(regenMsg)logEl.innerHTML+=`<br>${regenMsg}`;}
  if (pHp <= 0) {
    if (!switchPartyMember()) return;
  }
  if (triggerInvasionIfDue()) return;
  busy = false;
}
async function turn(i) {
  if (busy) return;
  const tutorialAction=i===-1?'normal_attack':'skill';
  const playerMove = i===-1?['通常攻撃',24,'normal',null,null,0]:getEquippedMovesForInstance(activeInstance)[i] || ['通常攻撃',24,'normal'];
  if (typeof closeBattleSkillPanel === 'function') closeBattleSkillPanel();
  if (multiBattle?.active) { chooseMultiBattleTarget(i); return; }
  busy = true;
  startBattleTurn();
  if(typeof handleTutorialBattleAction==='function')handleTutorialBattleAction(tutorialAction,{move:playerMove,actor:activeInstance,target:enemy});
  else if(tutorialAction==='skill'&&typeof handleTutorialFirstSkillUsed==='function')handleTutorialFirstSkillUsed();

  const enemyAction=nextEnemyMoveWithKokoroLinkForesight(singleEnemyKokoroLinkKey(),enemy);
  const enemyMove = enemyAction.move;
  const prioritized=typeof consumeKokoroLinkActionPriority==='function'&&consumeKokoroLinkActionPriority(activeInstance);
  const pSpeed = prioritized?Infinity:monSpd(player, activeInstance);
  const delayed=typeof consumeKokoroLinkEnemyActionDelay==='function'&&consumeKokoroLinkEnemyActionDelay(singleEnemyKokoroLinkKey());
  const eSpeed = delayed?-Infinity:enemyKokoroLinkSpeed(enemy,singleEnemyKokoroLinkKey());
  const playerFirst = pSpeed === eSpeed ? Math.random() < 0.5 : pSpeed > eSpeed;

  if (playerFirst) {
    const playerResult=await performAction(player, enemy, playerMove, true);
    if (eHp <= 0) { win(); return; }
    if (pHp <= 0 && !switchPartyMember()) return;
    await battleMotionDelay(playerResult.animated?140:700);
    await performAction(enemy, player, enemyMove, false);
    if (eHp <= 0) { win(); return; }
    if (pHp <= 0) {
      if (!switchPartyMember()) return;
      completeBattleTurn();
      if (triggerInvasionIfDue()) return;
      busy = false;
      return;
    }
    finishTurnWithPoison();
  } else {
    const enemyResult=await performAction(enemy, player, enemyMove, false);
    if (eHp <= 0) { win(); return; }
    if (pHp <= 0) {
      if (!switchPartyMember()) return;
      completeBattleTurn();
      if (triggerInvasionIfDue()) return;
      busy = false;
      return;
    }
    await battleMotionDelay(enemyResult.animated?140:700);
    await performAction(player, enemy, playerMove, true);
    if (eHp <= 0) { win(); return; }
    if (pHp <= 0 && !switchPartyMember()) return;
    finishTurnWithPoison();
  }
}
async function doAttack(attacker, defender, mv, isPlayer) {
  const [name, power, type, effect, effectChance] = mv;
  const logEl = document.getElementById('log');
  const sourceId=isPlayer?'pVis':'eVis',targetId=isPlayer?'eVis':'pVis';
  const supportTargetId=effect==='sleep'?targetId:sourceId;
  const supportAnimated=power<=0&&typeof playBattleSkillMotion==='function'?await playBattleSkillMotion(sourceId,supportTargetId,mv):false;
  // 補助技
  if (effect === 'guard') {
    isPlayer ? pGuard=true : eGuard=true;
    logEl.innerHTML = `🛡️ ${attacker.name}は身を守った！`; update(); return {animated:supportAnimated};
  }
  if (effect === 'heal') {
    const baseHealing = 24 + (isPlayer ? (activeInstance?.level || 1) : 1)*3;
    const healing = adjustedBattleHealing(baseHealing);
    const before = isPlayer ? pHp : eHp;
    if (isPlayer) pHp = Math.min(playerMaxHp(), pHp+healing);
    else eHp = Math.min(enemyMaxHp(), eHp+healing);
    const healed = (isPlayer ? pHp : eHp) - before;
    logEl.innerHTML = `💚 ${attacker.name}はHPを${healed}回復した！`; update(); return {animated:supportAnimated};
  }
  if (effect === 'buff') {
    isPlayer ? pAtk=Math.min(1.6,pAtk+.25) : eAtk=Math.min(1.6,eAtk+.25);
    logEl.innerHTML = `⬆️ ${attacker.name}の攻撃力が上がった！`; update(); return {animated:supportAnimated};
  }
  if (effect === 'debuff') {
    isPlayer ? eAtk=Math.max(.65,eAtk-.2) : pAtk=Math.max(.65,pAtk-.2);
    logEl.innerHTML = `⬇️ ${defender.name}の攻撃力が下がった！`; update(); return {animated:supportAnimated};
  }
  if (effect === 'aqua_shield') {
    if (isPlayer) pAquaShield = true; else eAquaShield = true;
    logEl.innerHTML = `💧 ${attacker.name}は水の盾を展開した！ 次に受ける攻撃ダメージを半減する！`;
    update();
    return {animated:supportAnimated};
  }
  if (effect === 'sleep') {
    let msg = `🌿 ${attacker.name}の「${name}」！`;
    const chance=isPlayer?playerKokoroLinkChance(Number.isFinite(effectChance)?effectChance:0.70):{chance:Number.isFinite(effectChance)?effectChance:0.70,boosted:false};
    if(chance.boosted)msg+='<br>⭐ 星運上昇で成功率アップ！';
    if (Math.random() < chance.chance) {
      msg += applySleepToTarget(!isPlayer);
    } else {
      msg += `<br>しかし、${defender.name}には効かなかった！`;
    }
    logEl.innerHTML = msg;
    update();
    return {animated:supportAnimated};
  }
  const animated=power>0&&typeof playBattleSkillMotion==='function'?await playBattleSkillMotion(sourceId,targetId,mv):false;
  if(!isPlayer&&power>0&&enemyKokoroLinkMisses(singleEnemyKokoroLinkKey())){logEl.innerHTML=`⚔️ ${attacker.name}の「${name}」！<br>✨ 目くらましで攻撃は外れた！`;update();return {animated};}
  // ダメージ計算
  const r = typeEff(type, defender.types);
  const hasFlareCharge = effect !== 'flare_charge' && power > 0 && (isPlayer ? pFlareCharge : eFlareCharge);
  const baseAtk = isPlayer ? pAtk * playerAttackInstanceMultiplier() : eAtk*enemyKokoroLinkAttackMultiplier(singleEnemyKokoroLinkKey());
  const atk = baseAtk * (hasFlareCharge ? 1.20 : 1);
  const difficultyAttackMultiplier = isPlayer ? 1 : enemyDifficultyAttackMultiplier();
  const mapAttackMultiplier = power > 0 ? huntMapAttackMultiplier(moveTypes(mv)) : 1;
  const powerBoost=isPlayer&&typeof kokoroLinkMovePowerMultiplierFor==='function'?kokoroLinkMovePowerMultiplierFor(activeInstance,power):{multiplier:1,boosted:false};
  const penetration=isPlayer&&typeof consumeKokoroLinkPenetration==='function'?consumeKokoroLinkPenetration(activeInstance,power):{rate:0,penetrated:false};
  const effectivePower=power*powerBoost.multiplier;
  const g = isPlayer ? eGuard : pGuard;
  const shield = isPlayer ? eAquaShield : pAquaShield;
  const effectiveType=kokoroLinkPenetratedMultiplier(r,penetration.rate),guardMultiplier=g?kokoroLinkPenetratedMultiplier(.55,penetration.rate):1,shieldMultiplier=shield?kokoroLinkPenetratedMultiplier(.50,penetration.rate):1;
  const rawDmg = Math.max(1, Math.floor((effectivePower * atk * effectiveType + Math.random()*9) * difficultyAttackMultiplier * mapAttackMultiplier * guardMultiplier * shieldMultiplier));
  const linkBarrier = isPlayer ? {hpDamage:rawDmg,absorbed:0,barrierRemaining:0} : resolvePlayerIncomingDamage(rawDmg);
  const dmg = linkBarrier.hpDamage;
  const defenderHpBefore = isPlayer ? eHp : pHp;
  if (isPlayer) {
    eHp -= dmg;
    eGuard = false;
    if (shield) eAquaShield = false;
  } else {
    pHp -= dmg;
    pGuard = false;
    if (shield) pAquaShield = false;
  }
  const actualDamage = Math.min(dmg, Math.max(0, defenderHpBefore));

  let msg = `⚔️ ${attacker.name}の「${name}」！ <b>${dmg}</b>ダメージ！`;
  const defenseMsg=kokoroLinkDefenseMessage(linkBarrier);if(defenseMsg)msg+=`<br>${defenseMsg}`;
  if(powerBoost.boosted)msg+='<br>🐉 竜威増幅で技威力アップ！';
  if(penetration.penetrated)msg+='<br>🐲 竜牙貫通で耐性・軽減を20%分貫通！';
  if (mapAttackMultiplier > 1) msg += `<br>🗺️ マップ属性強化！（×1.2）`;
  if (shield) msg += `<br>💧 ${defender.name}のアクアシールドがダメージを半減し、消えた！`;
  if (hasFlareCharge) {
    if (isPlayer) pFlareCharge = false; else eFlareCharge = false;
    msg += `<br>🔥 ${attacker.name}はフレアチャージの力を解放した！`;
  }
  if (effect === 'flare_charge') {
    if (isPlayer) pFlareCharge = true; else eFlareCharge = true;
    msg += `<br>🔥 ${attacker.name}は力をためた！ 次の攻撃力が20%上がる！`;
  }
  if (r > 1) msg += `<br>🔥 効果はバツグン！（属性倍率×${Number(r.toFixed(2))}）`;
  if (r < 1) msg += `<br>💧 効果はいまひとつ……（属性倍率×${Number(r.toFixed(2))}）`;
  if (effect === 'drain') {
    const healing = adjustedBattleHealing(Math.floor(dmg/2));
    const before = isPlayer ? pHp : eHp;
    if (isPlayer) pHp = Math.min(playerMaxHp(), pHp+healing);
    else eHp = Math.min(enemyMaxHp(), eHp+healing);
    const healed = (isPlayer ? pHp : eHp) - before;
    msg += `<br>🌱 HPを${healed}吸収した！`;
  }
  if(isPlayer){const linkHeal=applyPlayerKokoroLinkLifeSteal(actualDamage);if(linkHeal)msg+=`<br>${linkHeal}`;}
  if (effect === 'recoil') {
    const guarded=isPlayer&&typeof consumeKokoroLinkRecoilGuard==='function'&&consumeKokoroLinkRecoilGuard(activeInstance);
    if(guarded)msg+='<br>🔥 炎身不動が反動ダメージを無効化！';else{if (isPlayer) pHp -= 8; else eHp -= 8;msg += `<br>💢 ${attacker.name}は反動で8ダメージ！`;}
  }
  if (effect === 'alchemy_recoil') {
    const recoilDamage = alchemyRecoilDamage(actualDamage);
    const guarded=isPlayer&&typeof consumeKokoroLinkRecoilGuard==='function'&&consumeKokoroLinkRecoilGuard(activeInstance);
    if(guarded)msg+='<br>🔥 炎身不動が反動ダメージを無効化！';else{if (isPlayer) pHp -= recoilDamage; else eHp -= recoilDamage;msg += `<br>💥 ${attacker.name}は反動で${recoilDamage}ダメージ！`;}
  }
  if (effect === 'poison' && (isPlayer ? eHp > 0 : pHp > 0)) {
    const chance=isPlayer?playerKokoroLinkChance(Number.isFinite(effectChance)?effectChance:0.5):{chance:Number.isFinite(effectChance)?effectChance:0.5,boosted:false};
    if(chance.boosted)msg+='<br>⭐ 星運上昇で成功率アップ！';
    if(Math.random()<chance.chance)
    msg += applyPoisonToTarget(!isPlayer);
  }
  if (effect === 'paralysis' && (isPlayer ? eHp > 0 : pHp > 0)) {
    const chance=isPlayer?playerKokoroLinkChance(Number.isFinite(effectChance)?effectChance:0.30):{chance:Number.isFinite(effectChance)?effectChance:0.30,boosted:false};
    if(chance.boosted)msg+='<br>⭐ 星運上昇で成功率アップ！';
    if(Math.random()<chance.chance)
    msg += applyParalysisToTarget(!isPlayer);
  }
  if (effect === 'sleep' && (isPlayer ? eHp > 0 : pHp > 0)) {
    const chance=isPlayer?playerKokoroLinkChance(Number.isFinite(effectChance)?effectChance:0.70):{chance:Number.isFinite(effectChance)?effectChance:0.70,boosted:false};
    if(chance.boosted)msg+='<br>⭐ 星運上昇で成功率アップ！';
    if(Math.random()<chance.chance)
    msg += applySleepToTarget(!isPlayer);
  }
  if (effect === 'confusion' && (isPlayer ? eHp > 0 : pHp > 0)) {
    const chance=isPlayer?playerKokoroLinkChance(Number.isFinite(effectChance)?effectChance:0.60):{chance:Number.isFinite(effectChance)?effectChance:0.60,boosted:false};
    if(chance.boosted)msg+='<br>⭐ 星運上昇で成功率アップ！';
    if(Math.random()<chance.chance)
    msg += applyConfusionToTarget(!isPlayer);
  }
  if (effect === 'repeat_attack' && (isPlayer ? eHp > 0 : pHp > 0)) {
    const chance=isPlayer?playerKokoroLinkChance(Number.isFinite(effectChance)?effectChance:0.30):{chance:Number.isFinite(effectChance)?effectChance:0.30,boosted:false};
    if(chance.boosted)msg+='<br>⭐ 星運上昇で成功率アップ！';
    if(Math.random()<chance.chance){
    // 追加攻撃は最大1回。1撃目でガード・アクアシールドが消費されているため、2撃目には適用しない。
    const rawSecondDmg = Math.max(1, Math.floor((effectivePower * atk * effectiveType + Math.random()*9) * difficultyAttackMultiplier * mapAttackMultiplier));
    const secondBarrier = isPlayer ? {hpDamage:rawSecondDmg,absorbed:0,barrierRemaining:0} : resolvePlayerIncomingDamage(rawSecondDmg);
    const secondDmg = secondBarrier.hpDamage;
    if (isPlayer) eHp -= secondDmg; else pHp -= secondDmg;
    msg += `<br>⚡ 電撃が連鎖した！ ライトニングチェインの追加攻撃！ <b>${secondDmg}</b>ダメージ！`;
    const secondDefenseMsg=kokoroLinkDefenseMessage(secondBarrier);if(secondDefenseMsg)msg+=`<br>${secondDefenseMsg}`;
    }
  }
  logEl.innerHTML = msg;
  // ヒットアニメとダメージ表示
  if (typeof playBattleImpact === 'function') playBattleImpact(targetId, dmg, r, moveTypes(mv), power);
  else {
    const el = document.getElementById(targetId);
    el.classList.remove('hit-anim'); void el.offsetWidth; el.classList.add('hit-anim');
    setTimeout(() => el.classList.remove('hit-anim'), 300);
  }
  if (partyBattle[activePartyIdx] && !isPlayer) partyBattle[activePartyIdx].hp = Math.max(0, pHp);
  update();
  if(animated)await battleMotionDelay(120);
  return {animated};
}
