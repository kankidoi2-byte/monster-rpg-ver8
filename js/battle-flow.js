function prepareBattleParty() {
  const party = getPartyInstances();
  partyBattle = party.map(ins => ({
    uid:ins.uid, inst:ins,
    mon:structuredClone(by(ins.id)),
    hp:instanceMaxHp(ins), fainted:false
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
  resetHuntRequestChoices();
  resetBattleTurnCounter();
  show('battleChoices');
  const list = document.getElementById('battleChoiceList');
  const normal = MAPS.filter(m => !m.bossOnly && !m.rareOnly && !m.goldenLand);
  const special = MAPS.filter(m => (m.bossOnly || m.rareOnly) && !m.goldenLand);
  const goldenLand = MAPS.find(m => m.goldenLand);
  let entries = [...normal].sort(()=>Math.random()-.5).slice(0,3)
    .map(map => ({map, difficulty:rollHuntDifficulty(map)}));
  // Ver8.0 Claude修正: 複数のレア/ボスマップが同時に抽選成功すると、
  // forEachの上書きにより最後に処理された1つ以外の当選チャンスが
  // 静かに消えていたバグを修正。当選した候補を全て集めてから
  // その中でランダムに1つを選んで反映する。
  const mapEntryReady = goldenLandMapIsReady();
  const triggeredSpecials = special.filter(sm => Math.random() < (sm.appearRate||0.1))
    .map(map => ({map, difficulty:rollHuntDifficulty(map)}));
  const lastDifficulty = entries[2]?.difficulty || HUNT_DIFFICULTIES.normal;
  if (!mapEntryReady && goldenLand && rollGoldenLand(lastDifficulty.id)) {
    triggeredSpecials.push({map:goldenLand, difficulty:lastDifficulty});
  }
  if (mapEntryReady && goldenLand) {
    const forcedDifficulty = ['hard','extreme'].includes(lastDifficulty.id) ? lastDifficulty : HUNT_DIFFICULTIES.hard;
    const forcedEntry = {map:goldenLand, difficulty:forcedDifficulty, goldenLandMapEntry:true};
    if (entries.length >= 3) entries[2] = forcedEntry; else entries.push(forcedEntry);
  } else if (triggeredSpecials.length) {
    const chosenSpecial = triggeredSpecials[Math.floor(Math.random()*triggeredSpecials.length)];
    if (entries.length >= 3) entries[2] = chosenSpecial; else entries.push(chosenSpecial);
  }
  list.innerHTML = entries.map(({map,difficulty,goldenLandMapEntry=false}) => {
    const candidates = (map.enemyIds||[]).map(id=>by(id)).filter(Boolean);
    const m = candidates[Math.floor(Math.random()*candidates.length)];
    if (!m) return '';
    const conditionIds = rollHuntConditionIds(difficulty.id);
    const request = registerHuntRequest(createHuntRequest(map, m, difficulty.id, conditionIds));
    request.goldenLandMapEntry = goldenLandMapEntry;
    const secondEnemy = request.secondEnemyId ? by(request.secondEnemyId) : null;
    const hasInvasion = request.battleMode === 'invasion_pending' && request.invasionEnemyId;
    return `<div class="card enemy-choice-card difficulty-card-${difficulty.id}">
      <img class="map-img" src="${map.image}" alt="${map.name}">
      <div class="map-name">${map.name}</div>
      ${vis(m)}<h2>${m.name}</h2>
      <p>${m.rarity} ${typesHtml(m.types)}</p>
      ${m.bossClass?`<p class="small">🔥 ${m.bossClass}</p>`:''}
      ${map.rareOnly?`<p class="small">✨ 特殊マップ</p>`:''}
      ${map.goldenLand?`<p class="small">💰 ゴールド系モンスター限定</p>`:''}
      ${goldenLandMapEntry?`<p class="small">🗺️ 地図により出現確定（出発時に1枚消費）</p>`:''}
      <p style="font-size:12px;color:#8892b0">${m.desc}</p>
      <div class="hunt-request-info">
        <span class="hunt-difficulty difficulty-${difficulty.id}">${difficulty.label}</span>
        <p class="hunt-danger">${difficulty.danger}</p>
        <div class="hunt-stats">
          <span>敵Lv.${request.enemyLevel}</span><span>推定HP ${request.enemyHp}</span>
          <span>攻撃 ×${request.attackText}</span><span>EXP・コイン ×${request.rewardText}</span>
        </div>
        ${huntConditionsHtml(request)}
        ${secondEnemy ? `<div class="three-way-preview"><b>⚔️ 三つ巴バトル</b><span>${m.name}と${secondEnemy.name}も互いに争う</span></div>` : ''}
        ${hasInvasion ? '<div class="three-way-preview"><b>❗ 不穏な気配</b><span>戦闘中、別の何かが現れる可能性がある</span></div>' : ''}
      </div>
      <button onclick="startChosenBattle('${map.id}','${m.id}','${difficulty.id}','${request.requestId}')">この討伐依頼を受ける</button></div>`;
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
function startChosenBattle(mapId, enemyId, difficultyId='normal', requestId=null){
  if(bossCautionPlaying) return;
  const chosenEnemy = by(enemyId);
  if(!chosenEnemy) return;
  const normalizedDifficultyId = huntDifficulty(difficultyId).id;
  const request = preparedHuntRequest(requestId, mapId, enemyId, normalizedDifficultyId);

  if(isBossClassMonster(chosenEnemy)){
    playBossCaution(chosenEnemy, () => beginChosenBattle(mapId, enemyId, normalizedDifficultyId, request));
  }else{
    beginChosenBattle(mapId, enemyId, normalizedDifficultyId, request);
  }
}
function beginChosenBattle(mapId, enemyId, difficultyId='normal', request=null) {
  selectedMap = MAPS.find(m => m.id === mapId) || MAPS[0];
  enemy = structuredClone(by(enemyId));
  if (!enemy) return;
  activeHuntRequest = request || createHuntRequest(selectedMap, enemy, difficultyId, []);
  if (activeHuntRequest.goldenLandMapEntry) {
    if (!consumeReservedGoldenLandMap()) {
      alert('黄金郷への地図が見つかりません。討伐依頼を選び直してください。');
      showBattleChoices();
      return;
    }
    saveGame();
    updateItems();
  }
  battleRewardGranted = false;
  resetBattleTurnCounter();
  if (!partyBattle.length) prepareBattleParty();
  activePartyIdx = partyBattle.findIndex(p => !p.fainted && p.hp > 0);
  if (activePartyIdx < 0) activePartyIdx = 0;
  activeInstance = partyBattle[activePartyIdx].inst;
  player = partyBattle[activePartyIdx].mon;
  pHp = partyBattle[activePartyIdx].hp;
  eHp = enemyMaxHp();
  pAtk = eAtk = 1; pGuard = eGuard = false;
  pStatus = null; eStatus = null;
  pPoisonTurns = 0; ePoisonTurns = 0;
  pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
  pFlareCharge = false; eFlareCharge = false;
  pAquaShield = false; eAquaShield = false;
  if (activeHuntRequest.battleMode === 'three_way' && activeHuntRequest.secondEnemyId) {
    beginThreeWayBattle();
    return;
  }
  multiBattle = null;
  pendingMultiBattleContractId = null;
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
  pAtk = 1; pGuard = false; pStatus = null; pPoisonTurns = 0; pParalysisTurns = 0; pConfusionTurns = 0; pSleepTurns = 0; pFlareCharge = false; pAquaShield = false;
  document.getElementById('log').innerHTML += `<br><b>${player.name}</b>に交代した！`;
  // ② 名前・画像・技ボタンを全更新
  document.getElementById('pName').textContent = player.name;
  document.getElementById('pVis').innerHTML = vis(player);
  renderSkillButtons();
  update();
  return true;
}
function losePartyBattle() {
  completeBattleTurn();
  document.getElementById('log').innerHTML += '<br>💔 パーティーが全滅した……敗北！';
  endPartyRecovery();
  document.getElementById('next').classList.remove('hidden');
  document.getElementById('next').textContent = '➡️ 次のバトルへ';
  busy = true;
}
function endPartyRecovery() {
  partyBattle.forEach(p => { p.hp = instanceMaxHp(p.inst); p.fainted = false; });
  partyBattle = []; activePartyIdx = 0;
  pStatus = null; eStatus = null;
  pPoisonTurns = 0; ePoisonTurns = 0;
  pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
  pFlareCharge = false; eFlareCharge = false;
  pAquaShield = false; eAquaShield = false;
  multiBattle = null;
  pendingMultiBattleContractId = null;
  resetBattleTurnCounter();
}
function runAway() {
  if (busy) return;
  if (multiBattle?.active) { runAwayFromMultiBattle(); return; }
  pStatus = null; eStatus = null;
  pPoisonTurns = 0; ePoisonTurns = 0;
  pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
  pFlareCharge = false; eFlareCharge = false;
  pAquaShield = false; eAquaShield = false;
  resetBattleTurnCounter();
  document.getElementById('log').innerHTML = '🏃 うまく逃げきった！';
  document.getElementById('next').classList.remove('hidden');
  busy = true;
}
function win() {
  if (battleRewardGranted) return;
  battleRewardGranted = true;
  completeBattleTurn();
  eHp = 0;
  pStatus = null; eStatus = null;
  pPoisonTurns = 0; ePoisonTurns = 0;
  pParalysisTurns = 0; eParalysisTurns = 0;
  pConfusionTurns = 0; eConfusionTurns = 0;
  pSleepTurns = 0; eSleepTurns = 0;
  pFlareCharge = false; eFlareCharge = false;
  pAquaShield = false; eAquaShield = false;
  const ov = document.getElementById('enemyDefeatOverlay');
  if (ov) ov.style.display = 'flex';
  const turnBonusActive = hasHuntCondition('swift_clear');
  const turnBonusSucceeded = huntTurnBonusSucceeded();
  const baseExpGain = enemy.expBonus || (35 + Math.floor(Math.random()*25));
  const baseCoinGain = enemy.coinBonus || (8 + Math.floor(Math.random()*10));
  const expGain = huntRewardAmount(baseExpGain, turnBonusSucceeded);
  const coinGain = huntRewardAmount(baseCoinGain, turnBonusSucceeded);
  save.coins += coinGain;
  let msg = `🏆 ${enemy.name}を倒した！<br>`;
  if (turnBonusActive) {
    msg += turnBonusSucceeded
      ? `⏱️ ${battleTurnCount}ターンで撃破！ 迅速討伐達成（経験値・コイン50％追加）<br>`
      : `⌛ ${battleTurnCount}ターンで撃破。迅速討伐失敗（8ターン以内）<br>`;
  }
  msg += grantPartyExp(expGain);
  msg += `<br>🪙 コイン${coinGain}枚獲得！`;
  if (selectedMap?.goldenLand) {
    const bonus = goldenLandCoinBonus(activeHuntRequest?.difficultyId);
    save.coins += bonus;
    msg += `<br>💰 黄金郷ボーナス：コイン${bonus}枚獲得！`;
  } else if (rollGoldenLandMapFromHunt(activeHuntRequest?.difficultyId)) {
    save.items.golden_land_map = (save.items.golden_land_map || 0) + 1;
    registerItemDex('golden_land_map');
    msg += '<br>🗺️ 黄金郷への地図を入手！';
  }
  if (enemy.dropItem) {
    const dropRate = Number.isFinite(enemy.dropRate) ? enemy.dropRate : 1;
    if (Math.random() < dropRate) {
      save.items[enemy.dropItem] = (save.items[enemy.dropItem]||0)+1;
      const dropVisual = enemy.dropItem === 'fire_orb' ? `${itemInlineVisual(ITEM_DEX_BY_ID.fire_orb)} ` : '';
      msg += `<br>🎁 ${dropVisual}${enemy.dropItemName||enemy.dropItem}を入手！`;
    }
  }
  const alchemyMaterial = grantAlchemyMaterialReward();
  if (alchemyMaterial) {
    msg += `<br>⚗️ ${itemInlineVisual(alchemyMaterial)} ${alchemyMaterial.name}を入手！`;
  }
  save.history.wins = (save.history.wins||0)+1;
  save.history.logs = save.history.logs||[];
  save.history.logs.push(`${enemy.name}に勝利`);
  if (save.history.logs.length > 30) save.history.logs = save.history.logs.slice(-30);
  if(typeof progressActiveExpeditions==='function') progressActiveExpeditions();
  saveGame();
  document.getElementById('log').innerHTML = msg;
  // ⑤ endPartyRecovery()はafterBattleNext()側のみで呼ぶ（二重呼び出し解消）
  document.getElementById('next').classList.remove('hidden');
  document.getElementById('next').textContent = '➡️ 次の敵へ';
  busy = true;
  renderParty();
  setTimeout(processNextEvolution, 300);
}
