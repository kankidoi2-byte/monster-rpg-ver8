function setupBattle() {
  const targetSelect = document.getElementById('multiTargetSelect');
  if (targetSelect) {
    targetSelect.classList.add('hidden');
    targetSelect.innerHTML = '';
  }
  const contractPanel = document.getElementById('multiContractPanel');
  if (contractPanel) {
    contractPanel.classList.add('hidden');
    contractPanel.innerHTML = '';
  }
  if (selectedMap && document.getElementById('battleMapBanner')) {
    const request = activeHuntRequest || createHuntRequest(selectedMap, enemy, 'normal');
    document.getElementById('battleMapBanner').innerHTML =
      `<div class="panel"><img class="map-img" src="${selectedMap.image}" alt="${selectedMap.name}"><h2>${selectedMap.name}</h2>
        <div class="battle-hunt-summary"><span class="hunt-difficulty difficulty-${request.difficultyId}">${request.difficultyLabel}</span>
        <span>敵Lv.${request.enemyLevel}</span><span>報酬 ×${request.rewardText}</span></div>
        <div class="battle-hunt-conditions"><h3>特殊条件</h3>${huntConditionsHtml(request, true)}</div></div>`;
  }
  document.getElementById('pName').textContent = player.name;
  document.getElementById('pVis').innerHTML = vis(player);
  document.getElementById('singleEnemyBox')?.classList.remove('hidden');
  document.getElementById('multiEnemyGrid')?.classList.add('hidden');
  document.getElementById('eName').textContent = enemy.name;
  document.getElementById('eVis').innerHTML =
    `<div class="visual-wrap">${vis(enemy)}<div id="enemyDefeatOverlay" class="defeat-overlay">倒した！</div></div>`;
  // 技ボタン
  renderSkillButtons();
  updateItemText();
  update();
}
function playBattleImpact(targetId, damage, effectiveness=1) {
  const target = document.getElementById(targetId);
  const stage = document.querySelector('#battle .battle-arena');
  if (!target || !stage) return;
  target.classList.remove('battle-hit-impact');
  void target.offsetWidth;
  target.classList.add('battle-hit-impact');
  const burst = document.createElement('strong');
  burst.className = `battle-damage-burst${effectiveness > 1 ? ' is-critical' : ''}`;
  burst.textContent = `${effectiveness > 1 ? 'WEAK! ' : ''}-${damage}`;
  const targetRect = target.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  burst.style.left = `${targetRect.left - stageRect.left + targetRect.width * .62}px`;
  burst.style.top = `${targetRect.top - stageRect.top + targetRect.height * .28}px`;
  stage.appendChild(burst);
  setTimeout(() => { target.classList.remove('battle-hit-impact'); burst.remove(); }, 650);
}
function huntConditionsHtml(request, inBattle=false) {
  const conditions = Array.isArray(request?.conditions) ? request.conditions : [];
  if (!conditions.length) return '<p class="hunt-no-conditions">特殊条件なし</p>';
  return `<ul class="hunt-condition-list">${conditions.map(condition => {
    const turnStatus = inBattle && condition.id === 'swift_clear'
      ? ` <strong id="huntTurnRemaining">残り${huntTurnRemaining()}ターン</strong>`
      : '';
    return `<li><b>${condition.name}</b><span>${condition.effectText}${turnStatus}</span></li>`;
  }).join('')}</ul>`;
}
function updateHuntTurnDisplay() {
  const el = document.getElementById('huntTurnRemaining');
  if (!el) return;
  el.textContent = battleTurnCount > 8 ? '残り0ターン（制限超過）' : `残り${huntTurnRemaining()}ターン`;
}
function statusHtml(status, poisonTurns=0, paralysisTurns=0, confusionTurns=0, sleepTurns=0, flareCharge=false, aquaShield=false) {
  const parts = [];
  if (status === 'poison' && poisonTurns > 0) parts.push(`<span style="color:#bbf7d0">☠️毒(${poisonTurns})</span>`);
  if (sleepTurns > 0) parts.push(`<span style="color:#93c5fd">💤ねむり(${sleepTurns})</span>`);
  if (paralysisTurns > 0) parts.push(`<span style="color:#fde047">⚡麻痺(${paralysisTurns})</span>`);
  if (confusionTurns > 0) parts.push(`<span style="color:#c4b5fd">🌀こんらん(${confusionTurns})</span>`);
  if (flareCharge) parts.push('<span style="color:#fb923c">🔥攻撃強化(次の攻撃)</span>');
  if (aquaShield) parts.push('<span style="color:#60a5fa">💧アクアシールド</span>');
  return parts.length ? ' / 状態:' + parts.join('・') : '';
}
function update() {
  if (multiBattle?.active) { updateMultiBattleView(); return; }
  if (!player || !enemy) return;
  pHp = Math.max(0,pHp); eHp = Math.max(0,eHp);
  const pm = playerMaxHp(), em = enemyMaxHp();
  const lv = activeInstance?.level || 1, xp = activeInstance?.exp || 0, nd = needExp(lv);
  document.getElementById('pInfo').innerHTML = `Lv.${lv} ${typesHtml(player.types)} / 素早さ:${monSpd(player, activeInstance)}${statusHtml(pStatus,pPoisonTurns,pParalysisTurns,pConfusionTurns,pSleepTurns,pFlareCharge,pAquaShield)}`;
  const enemyLevel = activeHuntRequest?.enemyLevel || 1;
  document.getElementById('eInfo').innerHTML = `Lv.${enemyLevel} ${typesHtml(enemy.types)} / 素早さ:${monSpd(enemy)}${statusHtml(eStatus,ePoisonTurns,eParalysisTurns,eConfusionTurns,eSleepTurns,eFlareCharge,eAquaShield)}`;
  const pBar = document.getElementById('pHpBar');
  const pp = pHp/pm*100;
  pBar.style.width = pp+'%';
  pBar.className = 'hp'+(pp<25?' hp-danger':pp<50?' hp-warn':'');
  pBar.setAttribute('aria-valuemin', '0');
  pBar.setAttribute('aria-valuemax', String(pm));
  pBar.setAttribute('aria-valuenow', String(pHp));
  const eBar = document.getElementById('eHpBar');
  const ep = eHp/em*100;
  eBar.style.width = ep+'%';
  eBar.className = 'hp'+(ep<25?' hp-danger':ep<50?' hp-warn':'');
  eBar.setAttribute('aria-valuemin', '0');
  eBar.setAttribute('aria-valuemax', String(em));
  eBar.setAttribute('aria-valuenow', String(eHp));
  document.getElementById('pHpText').textContent = `${pHp} / ${pm}`;
  document.getElementById('eHpText').textContent = `${eHp} / ${em}`;
  document.getElementById('pExpBar').style.width = xp/nd*100+'%';
  document.getElementById('pExpText').textContent = `EXP ${xp} / ${nd}`;
}
