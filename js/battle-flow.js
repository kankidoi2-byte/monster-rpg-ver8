function prepareBattleParty() {
  if (typeof resetKokoroLinkBattleState === 'function') resetKokoroLinkBattleState();
  const savedParty = getPartyInstances();
  const party = typeof tutorialBattlePartyInstances === 'function'
    ? tutorialBattlePartyInstances(savedParty)
    : savedParty;
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
function huntRecommendationScore(request, monster) {
  const party = getPartyInstances();
  if (!party.length || !monster) return -Infinity;
  const bestMatchup = Math.max(...party.map(ins => {
    const moves = getEquippedMovesForInstance(ins).filter(move => Number(move[1]) > 0);
    return moves.length ? Math.max(...moves.map(move => typeEff(moveTypes(move), monster.types))) : 1;
  }));
  const averageLevel = party.reduce((sum, ins) => sum + (ins.level || 1), 0) / party.length;
  const levelMargin = Math.max(-1, Math.min(1, (averageLevel - request.enemyLevel) / 5));
  return bestMatchup * 10 + levelMargin - (request.difficultyId === 'extreme' ? .5 : 0);
}
function showBattleChoices() {
  activeHuntRequest = null;
  resetHuntRequestChoices();
  resetBattleTurnCounter();
  show('battleChoices');
  const list = document.getElementById('battleChoiceList');
  if(typeof renderTutorialHuntChoice==='function'&&renderTutorialHuntChoice(list))return;
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
  const preparedEntries = entries.map(({map,difficulty,goldenLandMapEntry=false}) => {
    const candidates = huntCandidatesFor(map, difficulty.id);
    const m = candidates[Math.floor(Math.random()*candidates.length)];
    if (!m) return null;
    const conditionIds = rollHuntConditionIds(difficulty.id);
    const request = registerHuntRequest(createHuntRequest(map, m, difficulty.id, conditionIds));
    request.goldenLandMapEntry = goldenLandMapEntry;
    return {map,difficulty,goldenLandMapEntry,m,request};
  }).filter(Boolean);
  let discoveredNewMap=false;
  preparedEntries.forEach(({map})=>{if(typeof registerMapDex==='function'&&registerMapDex(map.id))discoveredNewMap=true;});
  if(discoveredNewMap)saveGame();
  const recommended = preparedEntries.reduce((best, entry) => {
    const score = huntRecommendationScore(entry.request, entry.m);
    return !best || score > best.score ? {requestId:entry.request.requestId,score} : best;
  }, null)?.requestId;
  list.innerHTML = preparedEntries.map(({map,difficulty,goldenLandMapEntry,m,request}) => {
    const secondEnemy = request.secondEnemyId ? by(request.secondEnemyId) : null;
    const hasInvasion = request.battleMode === 'invasion_pending' && request.invasionEnemyId;
    const isRecommended = request.requestId === recommended;
    return `<article class="enemy-choice-card difficulty-card-${difficulty.id}${isRecommended?' is-recommended':''}" ${map.goldenLand?'data-tutorial-golden-land':''}>
      <div class="hunt-card-visual"><img class="map-img" src="${map.image}" alt="${map.name}"><div class="hunt-card-shade"></div>${vis(m)}
        <div class="hunt-card-badges">${isRecommended?'<span class="hunt-recommended">おすすめ</span>':''}<span class="hunt-difficulty difficulty-${difficulty.id}">${difficulty.label}</span></div>
        <div class="hunt-card-title"><small>${map.name}</small><h2>${m.name}</h2><p>${m.rarity} ${typesHtml(m.types)}</p></div>
      </div>
      <div class="hunt-card-body">
        <div class="hunt-primary-rewards"><span><small>ENEMY</small><strong>Lv.${request.enemyLevel}</strong></span><span><small>REWARD</small><strong>×${request.rewardText}</strong></span></div>
        ${secondEnemy ? `<div class="three-way-preview"><b>⚔️ 三つ巴バトル</b><span>敵2体分の報酬を獲得できる</span></div>` : ''}
        ${hasInvasion ? '<div class="three-way-preview"><b>❗ 不穏な気配</b><span>戦闘中に別の敵が現れる可能性あり</span></div>' : ''}
        ${goldenLandMapEntry?'<p class="hunt-map-notice">🗺️ 地図で出現確定・出発時に1枚消費</p>':''}
        <details class="hunt-card-details"><summary>依頼の詳細を見る</summary>
          <p class="hunt-danger">${difficulty.danger}</p><p>${m.desc}</p>
          <div class="hunt-stats"><span>推定HP ${request.enemyHp}</span><span>攻撃 ×${request.attackText}</span></div>
          ${m.bossClass?`<p>🔥 ${m.bossClass}</p>`:''}${map.rareOnly?'<p>✨ 特殊マップ</p>':''}${map.goldenLand?'<p>💰 ゴールド系モンスター限定</p>':''}
          ${huntConditionsHtml(request)}
        </details>
        <button class="hunt-accept-button" onclick="startChosenBattle('${map.id}','${m.id}','${difficulty.id}','${request.requestId}')">この依頼へ出発 ›</button>
      </div></article>`;
  }).join('');
  if(preparedEntries.some(entry=>entry.map.goldenLand)&&typeof offerGoldenLandTutorialGuide==='function')setTimeout(offerGoldenLandTutorialGuide,0);
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
  singleBattleContractAttempted = false;
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
  if (typeof setMultiBattleLayout === 'function') setMultiBattleLayout(false);
  pendingMultiBattleContractId = null;
  busy = false;
  hideBattleOutcome();
  show('battle');
  setupBattle();
  document.getElementById('log').innerHTML =
    `${selectedMap.name}の${activeHuntRequest.difficultyLabel}討伐依頼を開始！<br><b>Lv.${activeHuntRequest.enemyLevel} ${enemy.name}</b>が現れた！<br>${player.name}、出番だ！`;
}
function afterBattleNext() {
  singleBattleContractAttempted = false;
  endPartyRecovery();
  hideBattleOutcome();
  showBattleChoices();
}
function livingPartySwitchCandidates(entries=partyBattle, currentIndex=activePartyIdx) {
  return (entries || []).map((entry,index) => ({entry,index}))
    .filter(({entry,index}) => index !== currentIndex && entry && !entry.fainted && entry.hp > 0);
}
function changeActivePartyMember(nextIndex, {faintCurrent=false, message=''}={}) {
  const current = partyBattle[activePartyIdx];
  const next = partyBattle[nextIndex];
  if (!next || nextIndex === activePartyIdx || next.fainted || next.hp <= 0) return false;
  if (current) {
    current.hp = faintCurrent ? 0 : Math.max(0,pHp);
    if (faintCurrent) current.fainted = true;
  }
  activePartyIdx = nextIndex;
  activeInstance = next.inst;
  player = next.mon;
  pHp = next.hp;
  pAtk = 1; pGuard = false; pStatus = null; pPoisonTurns = 0; pParalysisTurns = 0; pConfusionTurns = 0; pSleepTurns = 0; pFlareCharge = false; pAquaShield = false;
  const log = document.getElementById('log');
  if (message && log) log.innerHTML += `${log.innerHTML?'<br>':''}${message}`;
  document.getElementById('pName').textContent = player.name;
  document.getElementById('pVis').innerHTML = vis(player);
  renderSkillButtons();
  if (typeof renderKokoroLinkPanel === 'function') renderKokoroLinkPanel();
  if (typeof renderBattleSwitchButton === 'function') renderBattleSwitchButton();
  update();
  return true;
}
function switchPartyMember() {
  const current = partyBattle[activePartyIdx];
  if (current) { current.hp = 0; current.fainted = true; }
  const next = livingPartySwitchCandidates(partyBattle, activePartyIdx)[0];
  if (!next) { losePartyBattle(); return false; }
  return changeActivePartyMember(next.index, {faintCurrent:true, message:`<b>${next.entry.mon.name}</b>に交代した！`});
}
function performManualPartySwitch(nextIndex) {
  if (busy || !livingPartySwitchCandidates().some(candidate => candidate.index === nextIndex)) return false;
  const previousName = player.name;
  busy = true;
  startBattleTurn();
  if (!changeActivePartyMember(nextIndex, {message:`🔄 ${previousName}から<b>${partyBattle[nextIndex].mon.name}</b>へ交代した！`})) {
    busy = false;
    return false;
  }
  if (multiBattle?.active) {
    const actions = aliveMultiEnemies().map(actor => {
      const delayed = consumeKokoroLinkEnemyActionDelay(actor.id);
      const enemyAction = nextEnemyMoveWithKokoroLinkForesight(actor.id,actor.mon);
      return {kind:'enemy',actorId:actor.id,speed:delayed?-Infinity:multiEnemyKokoroLinkSpeed(actor),move:enemyAction.move};
    }).sort((a,b) => b.speed-a.speed || Math.random()-.5);
    runMultiActions(actions,0);
    return true;
  }
  const enemyAction = nextEnemyMoveWithKokoroLinkForesight(singleEnemyKokoroLinkKey(),enemy);
  const delayed = typeof consumeKokoroLinkEnemyActionDelay === 'function' && consumeKokoroLinkEnemyActionDelay(singleEnemyKokoroLinkKey());
  setTimeout(async () => {
    await performAction(enemy,player,enemyAction.move,false);
    if (eHp <= 0) { win(); return; }
    if (pHp <= 0) {
      if (!switchPartyMember()) return;
      completeBattleTurn();
      if (triggerInvasionIfDue()) return;
      busy = false;
      return;
    }
    finishTurnWithPoison();
  }, delayed ? 850 : 550);
  return true;
}
function losePartyBattle() {
  completeBattleTurn();
  document.getElementById('log').innerHTML += '<br>💔 パーティーが全滅した……敗北！';
  endPartyRecovery();
  showBattleOutcome({kind:'defeat',title:'パーティー全滅',note:'編成や相性を見直して、もう一度挑もう。'});
  if(typeof handleTutorialBattleOutcome==='function')handleTutorialBattleOutcome('defeat');
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
  if (typeof setMultiBattleLayout === 'function') setMultiBattleLayout(false);
  if (typeof resetKokoroLinkBattleState === 'function') resetKokoroLinkBattleState();
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
  if (typeof resetKokoroLinkBattleState === 'function') resetKokoroLinkBattleState();
  resetBattleTurnCounter();
  document.getElementById('log').innerHTML = '🏃 うまく逃げきった！';
  showBattleOutcome({kind:'retreat',title:'撤退成功',note:'態勢を整えてから再挑戦できる。'});
  if(typeof handleTutorialBattleOutcome==='function')handleTutorialBattleOutcome('retreat');
  busy = true;
}
function win() {
  if (eHp > 0) return;
  if (typeof continueTutorialRescueWave === 'function' && continueTutorialRescueWave()) return;
  if (typeof completeTutorialStellaMockVictory === 'function' && completeTutorialStellaMockVictory()) return;
  if (battleRewardGranted) return;
  battleRewardGranted = true;
  if (typeof resetKokoroLinkBattleState === 'function') resetKokoroLinkBattleState();
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
  let displayedCoinGain = coinGain;
  save.coins += coinGain;
  let msg = `🏆 ${enemy.name}を倒した！<br>`;
  const materialRewards=[];
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
    displayedCoinGain += bonus;
    msg += `<br>💰 黄金郷ボーナス：コイン${bonus}枚獲得！`;
  } else if (grantGoldenLandMapFromHuntWin(activeHuntRequest?.difficultyId)) {
    msg += '<br>🗺️ 黄金郷への地図を入手！';
  }
  if (enemy.dropItem) {
    const dropRate = Number.isFinite(enemy.dropRate) ? enemy.dropRate : 1;
    if (Math.random() < dropRate) {
      save.items[enemy.dropItem] = (save.items[enemy.dropItem]||0)+1;
      materialRewards.push(enemy.dropItemName||ITEM_BY_ID[enemy.dropItem]?.name||enemy.dropItem);
      const dropVisual = enemy.dropItem === 'fire_orb' ? `${itemInlineVisual(ITEM_DEX_BY_ID.fire_orb)} ` : '';
      msg += `<br>🎁 ${dropVisual}${enemy.dropItemName||enemy.dropItem}を入手！`;
    }
  }
  const alchemyMaterial = grantAlchemyMaterialReward();
  if (alchemyMaterial) {
    materialRewards.push(alchemyMaterial.name);
    msg += `<br>⚗️ ${itemInlineVisual(alchemyMaterial)} ${alchemyMaterial.name}を入手！`;
  }
  save.history.wins = (save.history.wins||0)+1;
  save.history.logs = save.history.logs||[];
  save.history.logs.push(`${enemy.name}に勝利`);
  if (save.history.logs.length > 30) save.history.logs = save.history.logs.slice(-30);
  const contractorReward=typeof grantContractorBattleWin==='function'?grantContractorBattleWin({difficultyId:activeHuntRequest?.difficultyId||'normal',enemies:[enemy]}):{amount:0};
  if(typeof progressActiveExpeditions==='function') progressActiveExpeditions();
  saveGame();
  document.getElementById('log').innerHTML = msg;
  // ⑤ endPartyRecovery()はafterBattleNext()側のみで呼ぶ（二重呼び出し解消）
  showBattleOutcome({
    kind:'victory', title:`${enemy.name}を討伐！`, exp:expGain, coins:displayedCoinGain,
    materials:materialRewards,contractorExp:contractorReward.amount,
    note:turnBonusActive && turnBonusSucceeded ? `迅速討伐達成・${battleTurnCount}ターン` : `${battleTurnCount}ターンで勝利`
  });
  const tutorialOutcomeHandled=typeof handleTutorialBattleOutcome==='function'&&handleTutorialBattleOutcome('victory',{exp:expGain,coins:displayedCoinGain,materials:materialRewards,contractorExp:contractorReward.amount});
  if(!tutorialOutcomeHandled)renderSingleBattleContractPanel();
  busy = true;
  renderParty();
  // The prologue resumes its next guide immediately after a tutorial battle.
  // Do not let an automatic evolution screen replace that resumed guide.
  if(!tutorialOutcomeHandled)setTimeout(processNextEvolution, 300);
}
