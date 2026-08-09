function prepareBattleParty() {
  const party = getPartyInstances();
  partyBattle = party.map(ins => ({
    uid:ins.uid, inst:ins,
    mon:structuredClone(by(ins.id)),
    hp:maxHp(by(ins.id), ins.level), fainted:false
  }));
  activePartyIdx = 0;
  activeInstance = partyBattle[0].inst;
  player = partyBattle[0].mon;
  pHp = partyBattle[0].hp;
}
function startBattleFromParty() {
  const party = getPartyInstances();
  if (!party.length) { alert('パーティーにモンスターを入れてください。'); return; }
  prepareBattleParty();
  showBattleChoices();
}
function showBattleChoices() {
  activeHuntRequest = null;
  show('battleChoices');
  const list = document.getElementById('battleChoiceList');
  const normal = MAPS.filter(m => !m.bossOnly && !m.rareOnly);
  const special = MAPS.filter(m => m.bossOnly || m.rareOnly);
  let maps = [...normal].sort(()=>Math.random()-.5).slice(0,3);
  // Ver8.0 Claude修正: 複数のレア/ボスマップが同時に抽選成功すると、
  // forEachの上書きにより最後に処理された1つ以外の当選チャンスが
  // 静かに消えていたバグを修正。当選した候補を全て集めてから
  // その中でランダムに1つを選んで反映する。
  const triggeredSpecials = special.filter(sm => Math.random() < (sm.appearRate||0.1));
  if (triggeredSpecials.length) {
    const chosenSpecial = triggeredSpecials[Math.floor(Math.random()*triggeredSpecials.length)];
    if (maps.length >= 3) maps[2] = chosenSpecial; else maps.push(chosenSpecial);
  }
  list.innerHTML = maps.map(map => {
    const candidates = (map.enemyIds||[]).map(id=>by(id)).filter(Boolean);
    const m = candidates[Math.floor(Math.random()*candidates.length)];
    if (!m) return '';
    const difficulty = rollHuntDifficulty(map);
    const request = createHuntRequest(map, m, difficulty.id);
    return `<div class="card enemy-choice-card difficulty-card-${difficulty.id}">
      <img class="map-img" src="${map.image}" alt="${map.name}">
      <div class="map-name">${map.name}</div>
      ${vis(m)}<h2>${m.name}</h2>
      <p>${m.rarity} ${typesHtml(m.types)}</p>
      ${m.bossClass?`<p class="small">🔥 ${m.bossClass}</p>`:''}
      ${map.rareOnly?`<p class="small">✨ 特殊マップ</p>`:''}
      <p style="font-size:12px;color:#8892b0">${m.desc}</p>
      <div class="hunt-request-info">
        <span class="hunt-difficulty difficulty-${difficulty.id}">${difficulty.label}</span>
        <p class="hunt-danger">${difficulty.danger}</p>
        <div class="hunt-stats">
          <span>敵Lv.${request.enemyLevel}</span><span>推定HP ${request.enemyHp}</span>
          <span>攻撃 ×${request.attackText}</span><span>EXP・コイン ×${request.rewardText}</span>
        </div>
      </div>
      <button onclick="startChosenBattle('${map.id}','${m.id}','${difficulty.id}')">この討伐依頼を受ける</button></div>`;
  }).join('');
}
function isBossClassMonster(mon){
  return !!(mon && typeof mon.bossClass === 'string' && mon.bossClass.trim());
}
function playBossCaution(mon, onComplete){
  if(bossCautionPlaying) return;
  bossCautionPlaying = true;
  busy = true;

  const overlay = document.getElementById('bossCautionOverlay');
  const enemyName = document.getElementById('cautionEnemyName');
  const bossClass = document.getElementById('cautionBossClass');

  if(!overlay){
    bossCautionPlaying = false;
    busy = false;
    onComplete();
    return;
  }

  enemyName.textContent = mon?.name || 'UNKNOWN';
  bossClass.textContent = mon?.bossClass || 'ボス級';
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden','false');

  if(bossCautionTimer) clearTimeout(bossCautionTimer);
  bossCautionTimer = setTimeout(() => {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden','true');
    bossCautionPlaying = false;
    busy = false;
    bossCautionTimer = null;
    onComplete();
  }, 1800);
}
function startChosenBattle(mapId, enemyId, difficultyId='normal'){
  if(bossCautionPlaying) return;
  const chosenEnemy = by(enemyId);
  if(!chosenEnemy) return;
  const normalizedDifficultyId = huntDifficulty(difficultyId).id;

  if(isBossClassMonster(chosenEnemy)){
    playBossCaution(chosenEnemy, () => beginChosenBattle(mapId, enemyId, normalizedDifficultyId));
  }else{
    beginChosenBattle(mapId, enemyId, normalizedDifficultyId);
  }
}
function beginChosenBattle(mapId, enemyId, difficultyId='normal') {
  selectedMap = MAPS.find(m => m.id === mapId) || MAPS[0];
  enemy = structuredClone(by(enemyId));
  if (!enemy) return;
  activeHuntRequest = createHuntRequest(selectedMap, enemy, difficultyId);
  if (!partyBattle.length) prepareBattleParty();
  activePartyIdx = partyBattle.findIndex(p => !p.fainted && p.hp > 0);
  if (activePartyIdx < 0) activePartyIdx = 0;
  activeInstance = partyBattle[activePartyIdx].inst;
  player = partyBattle[activePartyIdx].mon;
  pHp = partyBattle[activePartyIdx].hp;
  eHp = enemyMaxHp();
  pAtk = eAtk = 1; pGuard = eGuard = false;
  pStatus = null; eStatus = null;
  pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
  pFlareCharge = false; eFlareCharge = false;
  pAquaShield = false; eAquaShield = false;
  busy = false;
  show('battle');
  document.getElementById('next').classList.add('hidden');
  setupBattle();
  document.getElementById('log').innerHTML =
    `${selectedMap.name}の${activeHuntRequest.difficultyLabel}討伐依頼を開始！<br><b>Lv.${activeHuntRequest.enemyLevel} ${enemy.name}</b>が現れた！<br>${player.name}、出番だ！`;
}
function afterBattleNext() {
  endPartyRecovery();
  document.getElementById('next').classList.add('hidden');
  showBattleChoices();
}
function switchPartyMember() {
  partyBattle[activePartyIdx].hp = 0;
  partyBattle[activePartyIdx].fainted = true;
  const next = partyBattle.findIndex(p => !p.fainted && p.hp > 0);
  if (next < 0) { losePartyBattle(); return false; }
  activePartyIdx = next;
  activeInstance = partyBattle[next].inst;
  player = partyBattle[next].mon;
  pHp = partyBattle[next].hp;
  pAtk = 1; pGuard = false; pStatus = null; pParalysisTurns = 0; pConfusionTurns = 0; pSleepTurns = 0; pFlareCharge = false; pAquaShield = false;
  document.getElementById('log').innerHTML += `<br><b>${player.name}</b>に交代した！`;
  // ② 名前・画像・技ボタンを全更新
  document.getElementById('pName').textContent = player.name;
  document.getElementById('pVis').innerHTML = vis(player);
  renderSkillButtons();
  update();
  return true;
}
function losePartyBattle() {
  document.getElementById('log').innerHTML += '<br>💔 パーティーが全滅した……敗北！';
  endPartyRecovery();
  document.getElementById('next').classList.remove('hidden');
  document.getElementById('next').textContent = '➡️ 次のバトルへ';
  busy = true;
}
function endPartyRecovery() {
  partyBattle.forEach(p => { p.hp = maxHp(by(p.inst.id), p.inst.level); p.fainted = false; });
  partyBattle = []; activePartyIdx = 0;
  pStatus = null; eStatus = null;
  pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
  pFlareCharge = false; eFlareCharge = false;
  pAquaShield = false; eAquaShield = false;
}
function runAway() {
  if (busy) return;
  pStatus = null; eStatus = null;
  pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
  pFlareCharge = false; eFlareCharge = false;
  pAquaShield = false; eAquaShield = false;
  document.getElementById('log').innerHTML = '🏃 うまく逃げきった！';
  document.getElementById('next').classList.remove('hidden');
  busy = true;
}
function win() {
  eHp = 0;
  pStatus = null; eStatus = null;
  pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
  pFlareCharge = false; eFlareCharge = false;
  pAquaShield = false; eAquaShield = false;
  const ov = document.getElementById('enemyDefeatOverlay');
  if (ov) ov.style.display = 'flex';
  const rewardMultiplier = Number(activeHuntRequest?.rewardMultiplier) || 1;
  const baseExpGain = enemy.expBonus || (35 + Math.floor(Math.random()*25));
  const baseCoinGain = enemy.coinBonus || (8 + Math.floor(Math.random()*10));
  const expGain = Math.max(1, Math.round(baseExpGain * rewardMultiplier));
  const coinGain = Math.max(1, Math.round(baseCoinGain * rewardMultiplier));
  save.coins += coinGain;
  let msg = `🏆 ${enemy.name}を倒した！<br>`;
  msg += grantPartyExp(expGain);
  msg += `<br>🪙 コイン${coinGain}枚獲得！`;
  if (enemy.dropItem) {
    const dropRate = Number.isFinite(enemy.dropRate) ? enemy.dropRate : 1;
    if (Math.random() < dropRate) {
      save.items[enemy.dropItem] = (save.items[enemy.dropItem]||0)+1;
      const dropVisual = enemy.dropItem === 'fire_orb' ? `${itemInlineVisual(ITEM_DEX_BY_ID.fire_orb)} ` : '';
      msg += `<br>🎁 ${dropVisual}${enemy.dropItemName||enemy.dropItem}を入手！`;
    }
  }
  save.history.wins = (save.history.wins||0)+1;
  save.history.logs = save.history.logs||[];
  save.history.logs.push(`${enemy.name}に勝利`);
  if (save.history.logs.length > 30) save.history.logs = save.history.logs.slice(-30);
  saveGame();
  document.getElementById('log').innerHTML = msg;
  // ⑤ endPartyRecovery()はafterBattleNext()側のみで呼ぶ（二重呼び出し解消）
  document.getElementById('next').classList.remove('hidden');
  document.getElementById('next').textContent = '➡️ 次の敵へ';
  busy = true;
  renderParty();
  setTimeout(processNextEvolution, 300);
}
