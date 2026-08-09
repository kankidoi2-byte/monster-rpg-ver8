function typeEff(atkTypeOrTypes, defTypes) {
  const attackTypes=normalizeMoveTypes(atkTypeOrTypes);
  return attackTypes.reduce((total,atkType) =>
    (defTypes || []).reduce((r,t) => ADV[atkType]?.[t] ? r * ADV[atkType][t] : r, total)
  , 1);
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
    const atkMultiplier = isPlayer ? pAtk : eAtk * enemyDifficultyAttackMultiplier();
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
  if (targetIsPlayer) {
    if (pStatus === 'poison') return '';
    pStatus = 'poison';
    return `<br>☠️ ${player.name}は毒状態になった！`;
  }
  if (eStatus === 'poison') return '';
  eStatus = 'poison';
  return `<br>☠️ ${enemy.name}は毒状態になった！`;
}
function applyPoisonEndTurn() {
  const msgs = [];
  if (pStatus === 'poison' && pHp > 0) {
    const dmg = Math.max(1, Math.floor(playerMaxHp() * 0.10));
    pHp = Math.max(0, pHp - dmg);
    if (partyBattle[activePartyIdx]) partyBattle[activePartyIdx].hp = pHp;
    msgs.push(`☠️ ${player.name}は毒で${dmg}ダメージ！`);
  }
  if (eStatus === 'poison' && eHp > 0) {
    const dmg = Math.max(1, Math.floor(enemyMaxHp() * 0.10));
    eHp = Math.max(0, eHp - dmg);
    msgs.push(`☠️ ${enemy.name}は毒で${dmg}ダメージ！`);
  }
  update();
  return msgs.join('<br>');
}
function finishTurnWithPoison() {
  const logEl = document.getElementById('log');
  const poisonMsg = applyPoisonEndTurn();
  if (poisonMsg) logEl.innerHTML += `<br>${poisonMsg}`;
  if (eHp <= 0) { win(); return; }
  if (pHp <= 0) {
    if (!switchPartyMember()) return;
  }
  busy = false;
}
function turn(i) {
  if (busy) return;
  busy = true;

  const playerMove = getEquippedMovesForInstance(activeInstance)[i] || ['通常攻撃',24,'normal'];
  const enemyMove = enemy.moves[Math.floor(Math.random()*enemy.moves.length)];
  const pSpeed = monSpd(player);
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
    const h = 24 + (isPlayer ? (activeInstance?.level || 1) : 1)*3;
    if (isPlayer) pHp = Math.min(playerMaxHp(), pHp+h);
    else eHp = Math.min(enemyMaxHp(), eHp+h);
    logEl.innerHTML = `💚 ${attacker.name}はHPを${h}回復した！`; update(); return;
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
  const baseAtk = isPlayer ? pAtk : eAtk;
  const atk = baseAtk * (hasFlareCharge ? 1.20 : 1);
  const difficultyAttackMultiplier = isPlayer ? 1 : enemyDifficultyAttackMultiplier();
  const g = isPlayer ? eGuard : pGuard;
  const shield = isPlayer ? eAquaShield : pAquaShield;
  const dmg = Math.max(1, Math.floor((power * atk * r + Math.random()*9) * difficultyAttackMultiplier * (g ? .55 : 1) * (shield ? .50 : 1)));
  if (isPlayer) {
    eHp -= dmg;
    eGuard = false;
    if (shield) eAquaShield = false;
  } else {
    pHp -= dmg;
    pGuard = false;
    if (shield) pAquaShield = false;
  }

  let msg = `⚔️ ${attacker.name}の「${name}」！ <b>${dmg}</b>ダメージ！`;
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
    const h = Math.floor(dmg/2);
    if (isPlayer) pHp = Math.min(playerMaxHp(), pHp+h);
    else eHp = Math.min(enemyMaxHp(), eHp+h);
    msg += `<br>🌱 HPを${h}吸収した！`;
  }
  if (effect === 'recoil') {
    if (isPlayer) pHp -= 8; else eHp -= 8;
    msg += `<br>💢 ${attacker.name}は反動で8ダメージ！`;
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
    const secondDmg = Math.max(1, Math.floor((power * atk * r + Math.random()*9) * difficultyAttackMultiplier));
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
