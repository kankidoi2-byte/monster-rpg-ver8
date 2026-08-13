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
  script.src = 'js/multi-battle.js?v=multi-faction-3';
  script.dataset.multiBattle = 'true';
  document.head.appendChild(script);
})();
function alchemyRecoilDamage(actualDamage){
  return Math.max(1, Math.floor(Math.max(0, Number(actualDamage) || 0) * .25));
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
    const atkMultiplier = isPlayer ? pAtk * playerAttackInstanceMultiplier() : eAtk * enemyDifficultyAttackMultiplier();
    const damage = Math.max(1, Math.floor(24 * atkMultiplier * 0.5));
    if (isPlayer) {
      pHp = Math.max(0, pHp - damage);
      if (partyBattle[activePartyIdx]) partyBattle[activePartyIdx].hp = pHp;
    } else {
      eHp = Math.max(0, eHp - damage);
    }
    result = {canAct:false, selfHit:true, message:`🌀 ${actor.name}はこんらんして自分を攻撃した！ <b>${damage}</b>ダメージ！`};
  }
  if (turns === 0) result.message += `<br>✨ ${actor.name}のこんらんが治った！`;
  update();
  return result;
}
function performAction(attacker, defender, move, isPlayer) {
  const logEl = document.getElementById('log');
  const sleep = trySleepAction(isPlayer);
  if (!sleep.canAct) {
    logEl.innerHTML = sleep.message;
    return false;
  }
  const paralysis = tryParalysisAction(isPlayer);
  if (!paralysis.canAct) {
    logEl.innerHTML = paralysis.message;
    return false;
  }
  const confusion = tryConfusionAction(isPlayer);
  if (!confusion.canAct) {
    logEl.innerHTML = confusion.message;
    return false;
  }
  doAttack(attacker, defender, move, isPlayer);
  const extra = [paralysis.message, confusion.message].filter(Boolean).join('<br>');
  if (extra) logEl.innerHTML += `<br>${extra}`;
  return true;
}
function applyPoisonToTarget(targetIsPlayer) {
  const poison = BATTLE_STATUS_EFFECTS.poison;
  const actor = targetIsPlayer ? player : enemy;
  const wasPoisoned = targetIsPlayer ? pPoisonTurns > 0 : ePoisonTurns > 0;
  if (targetIsPlayer) {
    pStatus = 'poison';
    pPoisonTurns = poison.duration;
  } else {
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
  if (eHp <= 0) { win(); return; }
  if (pHp <= 0) {
    if (!switchPartyMember()) return;
  }
  if (triggerInvasionIfDue()) return;
  busy = false;
}
function turn(i) {
  if (busy) return;
  if (multiBattle?.active) { chooseMultiBattleTarget(i); return; }
  busy = true;
  startBattleTurn();

  const playerMove = getEquippedMovesForInstance(activeInstance)[i] || ['通常攻撃',24,'normal'];
  const enemyMove = enemy.moves[Math.floor(Math.random()*enemy.moves.length)];
  const pSpeed = monSpd(player, activeInstance);
  const eSpeed = monSpd(enemy);
  const playerFirst = pSpeed === eSpeed ? Math.random() < 0.5 : pSpeed > eSpeed;

  if (playerFirst) {
    performAction(player, enemy, playerMove, true);
    if (eHp <= 0) { win(); return; }
    if (pHp <= 0 && !switchPartyMember()) return;
    setTimeout(() => {
      performAction(enemy, player, enemyMove, false);
      if (eHp <= 0) { win(); return; }
      if (pHp <= 0) {
        if (!switchPartyMember()) return;
        completeBattleTurn();
        if (triggerInvasionIfDue()) return;
        busy = false;
        return;
      }
      finishTurnWithPoison();
    }, 700);
  } else {
    performAction(enemy, player, enemyMove, false);
    if (eHp <= 0) { win(); return; }
    if (pHp <= 0) {
      if (!switchPartyMember()) return;
      completeBattleTurn();
      if (triggerInvasionIfDue()) return;
      busy = false;
      return;
    }
    setTimeout(() => {
      performAction(player, enemy, playerMove, true);
      if (eHp <= 0) { win(); return; }
      if (pHp <= 0 && !switchPartyMember()) return;
      finishTurnWithPoison();
    }, 700);
  }
}
function doAttack(attacker, defender, mv, isPlayer) {
  const [name, power, type, effect, effectChance] = mv;
  const logEl = document.getElementById('log');
  // 補助技
  if (effect === 'guard') {
    isPlayer ? pGuard=true : eGuard=true;
    logEl.innerHTML = `🛡️ ${attacker.name}は身を守った！`; update(); return;
  }
  if (effect === 'heal') {
    const baseHealing = 24 + (isPlayer ? (activeInstance?.level || 1) : 1)*3;
    const healing = adjustedBattleHealing(baseHealing);
    const before = isPlayer ? pHp : eHp;
    if (isPlayer) pHp = Math.min(playerMaxHp(), pHp+healing);
    else eHp = Math.min(enemyMaxHp(), eHp+healing);
    const healed = (isPlayer ? pHp : eHp) - before;
    logEl.innerHTML = `💚 ${attacker.name}はHPを${healed}回復した！`; update(); return;
  }
  if (effect === 'buff') {
    isPlayer ? pAtk=Math.min(1.6,pAtk+.25) : eAtk=Math.min(1.6,eAtk+.25);
    logEl.innerHTML = `⬆️ ${attacker.name}の攻撃力が上がった！`; update(); return;
  }
  if (effect === 'debuff') {
    isPlayer ? eAtk=Math.max(.65,eAtk-.2) : pAtk=Math.max(.65,pAtk-.2);
    logEl.innerHTML = `⬇️ ${defender.name}の攻撃力が下がった！`; update(); return;
  }
  if (effect === 'aqua_shield') {
    if (isPlayer) pAquaShield = true; else eAquaShield = true;
    logEl.innerHTML = `💧 ${attacker.name}は水の盾を展開した！ 次に受ける攻撃ダメージを半減する！`;
    update();
    return;
  }
  if (effect === 'sleep') {
    let msg = `🌿 ${attacker.name}の「${name}」！`;
    if (Math.random() < (Number.isFinite(effectChance) ? effectChance : 0.70)) {
      msg += applySleepToTarget(!isPlayer);
    } else {
      msg += `<br>しかし、${defender.name}には効かなかった！`;
    }
    logEl.innerHTML = msg;
    update();
    return;
  }
  // ダメージ計算
  const r = typeEff(type, defender.types);
  const hasFlareCharge = effect !== 'flare_charge' && power > 0 && (isPlayer ? pFlareCharge : eFlareCharge);
  const baseAtk = isPlayer ? pAtk * playerAttackInstanceMultiplier() : eAtk;
  const atk = baseAtk * (hasFlareCharge ? 1.20 : 1);
  const difficultyAttackMultiplier = isPlayer ? 1 : enemyDifficultyAttackMultiplier();
  const mapAttackMultiplier = power > 0 ? huntMapAttackMultiplier(moveTypes(mv)) : 1;
  const g = isPlayer ? eGuard : pGuard;
  const shield = isPlayer ? eAquaShield : pAquaShield;
  const dmg = Math.max(1, Math.floor((power * atk * r + Math.random()*9) * difficultyAttackMultiplier * mapAttackMultiplier * (g ? .55 : 1) * (shield ? .50 : 1)));
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
  if (effect === 'recoil') {
    if (isPlayer) pHp -= 8; else eHp -= 8;
    msg += `<br>💢 ${attacker.name}は反動で8ダメージ！`;
  }
  if (effect === 'alchemy_recoil') {
    const recoilDamage = alchemyRecoilDamage(actualDamage);
    if (isPlayer) pHp -= recoilDamage; else eHp -= recoilDamage;
    msg += `<br>💥 ${attacker.name}は反動で${recoilDamage}ダメージ！`;
  }
  if (effect === 'poison' && (isPlayer ? eHp > 0 : pHp > 0) && Math.random() < (Number.isFinite(effectChance) ? effectChance : 0.5)) {
    msg += applyPoisonToTarget(!isPlayer);
  }
  if (effect === 'paralysis' && (isPlayer ? eHp > 0 : pHp > 0) && Math.random() < (Number.isFinite(effectChance) ? effectChance : 0.30)) {
    msg += applyParalysisToTarget(!isPlayer);
  }
  if (effect === 'sleep' && (isPlayer ? eHp > 0 : pHp > 0) && Math.random() < (Number.isFinite(effectChance) ? effectChance : 0.70)) {
    msg += applySleepToTarget(!isPlayer);
  }
  if (effect === 'confusion' && (isPlayer ? eHp > 0 : pHp > 0) && Math.random() < (Number.isFinite(effectChance) ? effectChance : 0.60)) {
    msg += applyConfusionToTarget(!isPlayer);
  }
  if (effect === 'repeat_attack' && (isPlayer ? eHp > 0 : pHp > 0) && Math.random() < (Number.isFinite(effectChance) ? effectChance : 0.30)) {
    // 追加攻撃は最大1回。1撃目でガード・アクアシールドが消費されているため、2撃目には適用しない。
    const secondDmg = Math.max(1, Math.floor((power * atk * r + Math.random()*9) * difficultyAttackMultiplier * mapAttackMultiplier));
    if (isPlayer) eHp -= secondDmg; else pHp -= secondDmg;
    msg += `<br>⚡ 電撃が連鎖した！ ライトニングチェインの追加攻撃！ <b>${secondDmg}</b>ダメージ！`;
  }
  logEl.innerHTML = msg;
  // ヒットアニメ
  const el = document.getElementById(isPlayer ? 'eVis' : 'pVis');
  el.classList.remove('hit-anim'); void el.offsetWidth; el.classList.add('hit-anim');
  setTimeout(() => el.classList.remove('hit-anim'), 300);
  if (partyBattle[activePartyIdx] && !isPlayer) partyBattle[activePartyIdx].hp = Math.max(0, pHp);
  update();
}
