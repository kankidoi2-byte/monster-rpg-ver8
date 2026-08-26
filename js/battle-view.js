function setupBattle() {
  pendingKokoroLinkStatusSourceUid=null;
  pendingKokoroLinkTacticsMode=null;
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
  renderKokoroLinkPanel();
  updateItemText();
  update();
}
function battleImpactType(typeOrTypes) {
  const type = normalizeMoveTypes(typeOrTypes)[0] || 'normal';
  return /^[a-z_]+$/.test(type) ? type : 'normal';
}
function playBattleImpact(targetId, damage, effectiveness=1, typeOrTypes='normal', power=0) {
  const target = document.getElementById(targetId);
  const stage = document.querySelector('#battle .battle-arena');
  if (!target || !stage) return;
  const impactType = battleImpactType(typeOrTypes);
  const isStrong = Number(power) >= 50;
  target.classList.remove('battle-hit-impact');
  stage.classList.remove('battle-impact-stop');
  stage.classList.remove('battle-impact-strong');
  void target.offsetWidth;
  target.classList.add('battle-hit-impact');
  stage.classList.add('battle-impact-stop');
  if (isStrong) stage.classList.add('battle-impact-strong');
  const burst = document.createElement('strong');
  burst.className = `battle-damage-burst is-${impactType}${effectiveness > 1 ? ' is-critical' : ''}${isStrong ? ' is-strong' : ''}`;
  burst.textContent = `${effectiveness > 1 ? 'WEAK! ' : ''}-${damage}`;
  const targetRect = target.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  burst.style.left = `${targetRect.left - stageRect.left + targetRect.width * .62}px`;
  burst.style.top = `${targetRect.top - stageRect.top + targetRect.height * .28}px`;
  stage.appendChild(burst);
  const flash = document.createElement('i');
  flash.className = `battle-element-flash is-${impactType}${isStrong ? ' is-strong' : ''}`;
  flash.setAttribute('aria-hidden', 'true');
  stage.appendChild(flash);
  setTimeout(() => stage.classList.remove('battle-impact-stop', 'battle-impact-strong'), isStrong ? 190 : 130);
  setTimeout(() => { target.classList.remove('battle-hit-impact'); burst.remove(); flash.remove(); }, isStrong ? 820 : 650);
}
function hideBattleOutcome() {
  const battle = document.getElementById('battle');
  const outcome = document.getElementById('battleOutcome');
  battle?.classList.remove('is-finished');
  if (outcome) {
    outcome.className = 'battle-outcome hidden';
    document.getElementById('battleOutcomeActions').innerHTML = '';
  }
  document.getElementById('next')?.classList.add('hidden');
}
function showBattleOutcome({kind='victory', title, exp=0, coins=0, note=''}) {
  const battle = document.getElementById('battle');
  const outcome = document.getElementById('battleOutcome');
  if (!battle || !outcome) return;
  const victory = kind === 'victory';
  const labels = {
    victory:['BATTLE CLEAR','★'], defeat:['BATTLE LOST','×'], retreat:['RETREAT','↩']
  };
  const [eyebrow, icon] = labels[kind] || labels.victory;
  battle.classList.add('is-finished');
  outcome.className = `battle-outcome is-${kind} is-revealing`;
  document.getElementById('battleOutcomeIcon').textContent = icon;
  document.getElementById('battleOutcomeEyebrow').textContent = eyebrow;
  document.getElementById('battleOutcomeTitle').textContent = title;
  document.getElementById('battleOutcomeRewards').innerHTML = victory
    ? `<span><small>EXP</small><strong>+${exp}</strong></span><span><small>COIN</small><strong>+${coins}</strong></span>`
    : '<span class="battle-outcome-empty">報酬なし</span>';
  document.getElementById('battleOutcomeNote').textContent = note;
  const next = document.getElementById('next');
  next.classList.remove('hidden');
  next.textContent = victory ? '次の討伐依頼へ ›' : '依頼を選び直す ›';
  setTimeout(() => outcome.classList.remove('is-revealing'), 850);
  if (typeof updateAppResourceBar === 'function') updateAppResourceBar();
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
function kokoroLinkTargetStats(){
  return {maxHp:playerMaxHp(),speed:Math.max(1,Math.round(Number(player?.spd ?? 50)*instanceStatModifier(activeInstance,'speed')))};
}
let pendingKokoroLinkStatusSourceUid=null;
let pendingKokoroLinkTacticsMode=null;
function kokoroLinkStatusAbilityStateText(ability){
  if(!ability)return '';
  if(!ability.resolved)return '対象選択後に1回判定';
  return ability.succeeded?'発動成功':'不発';
}
function kokoroLinkStatusHtml(){
  const link=typeof kokoroLinkEffectForInstance==='function' ? kokoroLinkEffectForInstance(activeInstance) : null;
  if(!link)return '';
  const barrier=Math.max(0,Number(link.barrierRemaining)||0);
  const attack=Math.round((link.effects.attackMultiplier-1)*100);
  const ability=typeof kokoroLinkPowerAbilityStatus==='function'?kokoroLinkPowerAbilityStatus(activeInstance):'';
  const tactics=typeof kokoroLinkTacticsAbilityStatus==='function'?kokoroLinkTacticsAbilityStatus(activeInstance):'';
  return ` / 💞${link.sourceName}（攻撃ダメージ+${attack}%・素早さ+${link.effects.speedBonus}・障壁${barrier}${ability?`・${ability}`:''}${tactics?`・${tactics}`:''}）`;
}
function kokoroLinkFailureText(reason){
  return {
    'invalid-target':'現在の戦闘個体はココロリンクの対象外です。',
    'target-linked':'この戦闘個体にはすでにココロリンクが発動しています。',
    'invalid-source':'その控えモンスターは現在リンクできません。'
  }[reason] || 'ココロリンクを発動できませんでした。';
}
function renderKokoroLinkPanel(){
  const panel=document.getElementById('kokoroLinkPanel');
  const button=document.getElementById('kokoroLinkButton');
  if(!panel||!button)return;
  const current=typeof kokoroLinkEffectForInstance==='function' ? kokoroLinkEffectForInstance(activeInstance) : null;
  const sources=typeof currentKokoroLinkSources==='function' ? currentKokoroLinkSources({includeUsed:true}) : [];
  const targetEligible=player?.entityKind==='monster';
  const available=sources.filter(source=>source.available).length;
  const tacticsAction=current?.tacticsAbility?.id==='origin_choice'&&!current.tacticsAbility.resolved||current?.tacticsAbility?.id==='free_switch'&&current.tacticsAbility.charges>0;
  button.disabled=!targetEligible||!!current&&!tacticsAction||!current&&available===0;
  button.innerHTML=current?'💞 発動中':`💞 リンク${available?` (${available})`:''}`;
  const tacticsActionHtml=current?.tacticsAbility?.id==='origin_choice'&&!current.tacticsAbility.resolved?'<button onclick="beginKokoroLinkOriginChoice()">原初選択を決める</button>':current?.tacticsAbility?.id==='free_switch'&&current.tacticsAbility.charges>0?'<button onclick="beginKokoroLinkFreeSwitch()">無消費交代を使う</button>':'';
  const activeHtml=current
    ? `<div class="kokoro-link-active"><b>💞 ${current.sourceName} → ${current.targetName}</b><span>最終効果：障壁 ${current.barrierRemaining} / 攻撃ダメージ +${Math.round((current.effects.attackMultiplier-1)*100)}% / 素早さ +${current.effects.speedBonus}</span>${current.powerAbility?`<small>★1リンク能力：${current.powerAbility.label}（${current.powerAbility.summary}）</small>`:''}${current.statusAbility?`<small>★2リンク能力：${current.statusAbility.label}（${kokoroLinkStatusAbilityStateText(current.statusAbility)}）</small>`:''}${current.tacticsAbility?`<small>★3リンク能力：${current.tacticsAbility.label}（${kokoroLinkTacticsAbilityStatus(activeInstance)}）</small>${tacticsActionHtml}`:''}</div>`
    : '';
  const message=!targetEligible
    ? '<p class="kokoro-link-empty">現在の戦闘個体はリンク対象外です。</p>'
    : current
      ? '<p class="kokoro-link-empty">この個体へのリンクは発動済みです。効果は戦闘終了まで保持されます。</p>'
      : !sources.length
        ? '<p class="kokoro-link-empty">リンクできる控えモンスターがいません。</p>'
        : '';
  const cards=sources.map(source=>{
    const preview=resolveKokoroLink(source.entry.mon,source.entry.inst,kokoroLinkTargetStats());
    if(!preview)return '';
    const effects=preview.effects;
    const disabled=source.used||!!current||!targetEligible;
    return `<button class="kokoro-link-source${source.used?' is-used':''}" onclick="activateKokoroLinkFromBattle('${source.uid}')" ${disabled?'disabled':''}>`+
      `<span>${source.entry.mon.rarity} ${source.entry.mon.name}</span>`+
      `<small>レアリティ補正 ×${source.profile.multiplier}（適用済み）</small>`+
      `<strong>最終効果：障壁 ${effects.barrier} / 攻撃ダメージ +${Math.round(effects.attackBonus*100)}% / 素早さ +${effects.speedBonus}</strong>`+
      `${preview.powerAbility?`<small>★1リンク能力：${preview.powerAbility.label}（${preview.powerAbility.summary}）</small>`:''}`+
      `${preview.statusAbility?`<small>★2リンク能力：${preview.statusAbility.label}（${preview.statusAbility.summary}）</small>`:''}`+
      `${preview.tacticsAbility?`<small>★3リンク能力：${preview.tacticsAbility.label}（${preview.tacticsAbility.summary}）</small>`:''}`+
      `<small>${source.used?'この戦闘で使用済み':'行動を消費せず発動'}</small></button>`;
  }).join('');
  panel.innerHTML=`<div class="kokoro-link-panel-head"><div><small>KOKORO LINK</small><h3>控えの力を借りる</h3></div><button onclick="toggleKokoroLinkPanel()" aria-label="閉じる">×</button></div>${activeHtml}${message}<div class="kokoro-link-source-grid">${cards}</div>`;
}
function toggleKokoroLinkPanel(){
  if(busy)return;
  if(pendingKokoroLinkStatusSourceUid)cancelKokoroLinkStatusTarget();
  if(pendingKokoroLinkTacticsMode)cancelKokoroLinkTacticsPicker();
  if(multiBattle?.pendingMoveIndex!==null&&multiBattle?.pendingMoveIndex!==undefined)cancelMultiBattleTarget();
  const panel=document.getElementById('kokoroLinkPanel');
  if(!panel)return;
  renderKokoroLinkPanel();
  panel.classList.toggle('hidden');
}
function beginKokoroLinkStatusTargetSelection(sourceUid){
  const picker=document.getElementById('multiTargetSelect'),living=typeof aliveMultiEnemies==='function'?aliveMultiEnemies():[];
  if(!picker||!living.length)return;
  pendingKokoroLinkStatusSourceUid=sourceUid;
  picker.innerHTML=`<p><b>リンク能力の対象を選択</b><span>光っている敵の画像をタップ</span></p>${living.map(entry=>`<button onclick="selectKokoroLinkStatusTarget('${entry.id}')">${entry.mon.name}へ発動</button>`).join('')}<button onclick="cancelKokoroLinkStatusTarget()" class="secondary-button">やめる</button>`;
  picker.classList.remove('hidden');document.getElementById('kokoroLinkPanel')?.classList.add('hidden');updateMultiBattleView();
}
function cancelKokoroLinkStatusTarget(){pendingKokoroLinkStatusSourceUid=null;document.getElementById('multiTargetSelect')?.classList.add('hidden');if(multiBattle?.active)updateMultiBattleView();}
function selectKokoroLinkStatusTarget(targetId){const sourceUid=pendingKokoroLinkStatusSourceUid;if(!sourceUid)return;pendingKokoroLinkStatusSourceUid=null;document.getElementById('multiTargetSelect')?.classList.add('hidden');activateKokoroLinkFromBattle(sourceUid,targetId);}
function kokoroLinkSourceNeedsEnemyTarget(source){return source?.profile?.rarity===2||source?.profile?.rarity===3&&['dark','star'].includes(source.profile.primaryType);}
function beginKokoroLinkOriginChoice(){
  const picker=document.getElementById('multiTargetSelect');if(!picker)return;pendingKokoroLinkTacticsMode='origin-choice';
  picker.innerHTML='<p><b>原初選択</b><span>発動する支援効果を選択</span></p><button onclick="selectKokoroLinkOriginChoice(\'small_heal\')">🌿 小回復：最大HP10%</button><button onclick="selectKokoroLinkOriginChoice(\'cleanse\')">✨ 浄化：状態異常を解除</button><button disabled>💧 技コスト軽減：保留中</button><button onclick="cancelKokoroLinkTacticsPicker()" class="secondary-button">あとで選ぶ</button>';
  picker.classList.remove('hidden');document.getElementById('kokoroLinkPanel')?.classList.add('hidden');
}
function selectKokoroLinkOriginChoice(optionId){
  if(pendingKokoroLinkTacticsMode!=='origin-choice')return;const msg=applyKokoroLinkOriginChoiceForBattle(optionId),log=document.getElementById('log');if(log)log.innerHTML+=(log.innerHTML?'<br>':'')+msg;cancelKokoroLinkTacticsPicker();renderKokoroLinkPanel();update();
}
function beginKokoroLinkFreeSwitch(){
  const picker=document.getElementById('multiTargetSelect'),candidates=partyBattle.map((entry,index)=>({entry,index})).filter(item=>item.index!==activePartyIdx&&!item.entry.fainted&&item.entry.hp>0);if(!picker||!candidates.length)return;
  pendingKokoroLinkTacticsMode='free-switch';picker.innerHTML=`<p><b>風渡り交代</b><span>行動を消費せず交代する仲間を選択</span></p>${candidates.map(({entry,index})=>`<button onclick="selectKokoroLinkFreeSwitch(${index})">${entry.mon.name}（HP ${entry.hp}）</button>`).join('')}<button onclick="cancelKokoroLinkTacticsPicker()" class="secondary-button">あとで使う</button>`;
  picker.classList.remove('hidden');document.getElementById('kokoroLinkPanel')?.classList.add('hidden');
}
function selectKokoroLinkFreeSwitch(nextIndex){
  if(pendingKokoroLinkTacticsMode!=='free-switch'||busy)return;const next=partyBattle[nextIndex];if(!next||nextIndex===activePartyIdx||next.fainted||next.hp<=0||!consumeKokoroLinkFreeSwitch(activeInstance))return;
  const previous=player.name;partyBattle[activePartyIdx].hp=pHp;activePartyIdx=nextIndex;activeInstance=next.inst;player=next.mon;pHp=next.hp;pAtk=1;pGuard=false;pStatus=null;pPoisonTurns=0;pParalysisTurns=0;pConfusionTurns=0;pSleepTurns=0;pFlareCharge=false;pAquaShield=false;
  document.getElementById('pName').textContent=player.name;document.getElementById('pVis').innerHTML=vis(player);renderSkillButtons();const log=document.getElementById('log');if(log)log.innerHTML+=(log.innerHTML?'<br>':'')+`🌪️ 風渡り交代で${previous}から<b>${player.name}</b>へ交代した！`;
  cancelKokoroLinkTacticsPicker();renderKokoroLinkPanel();update();
}
function cancelKokoroLinkTacticsPicker(){pendingKokoroLinkTacticsMode=null;const picker=document.getElementById('multiTargetSelect');picker?.classList.add('hidden');if(picker)picker.innerHTML='';if(multiBattle?.active)updateMultiBattleView();}
function activateKokoroLinkFromBattle(sourceUid,targetId=null){
  if(busy)return;
  const source=typeof currentKokoroLinkSources==='function'?currentKokoroLinkSources({includeUsed:true}).find(candidate=>candidate.uid===sourceUid):null;
  if(!targetId&&multiBattle?.active&&kokoroLinkSourceNeedsEnemyTarget(source)){beginKokoroLinkStatusTargetSelection(sourceUid);return;}
  const result=activateCurrentKokoroLink(sourceUid,kokoroLinkTargetStats());
  const log=document.getElementById('log');
  if(!result.ok){if(log)log.innerHTML+=(log.innerHTML?'<br>':'')+`⚠️ ${kokoroLinkFailureText(result.reason)}`;renderKokoroLinkPanel();return;}
  const {link}=result;
  const statusMsg=link.statusAbility&&typeof applyKokoroLinkStatusAbilityForBattle==='function'?applyKokoroLinkStatusAbilityForBattle(link,targetId):'';
  const tacticsMsg=link.tacticsAbility&&typeof applyKokoroLinkTacticsAbilityForBattle==='function'?applyKokoroLinkTacticsAbilityForBattle(link,targetId):'';
  if(log)log.innerHTML+=(log.innerHTML?'<br>':'')+`💞 <b>${link.sourceName}</b>と<b>${link.targetName}</b>のココロが繋がった！<br>🛡️ 最終効果：障壁${link.effects.barrier}・攻撃ダメージ+${Math.round(link.effects.attackBonus*100)}%・素早さ+${link.effects.speedBonus}${link.powerAbility?`<br>✨ ★1リンク能力「${link.powerAbility.label}」：${link.powerAbility.summary}`:''}${statusMsg?`<br>${statusMsg}`:''}${tacticsMsg?`<br>${tacticsMsg}`:''}`;
  document.getElementById('kokoroLinkPanel')?.classList.add('hidden');
  renderKokoroLinkPanel();
  update();
  if(link.tacticsAbility?.id==='origin_choice'&&!link.tacticsAbility.resolved)beginKokoroLinkOriginChoice();
  if(link.tacticsAbility?.id==='free_switch'&&link.tacticsAbility.charges>0)beginKokoroLinkFreeSwitch();
}
function update() {
  if (multiBattle?.active) { updateMultiBattleView(); return; }
  if (!player || !enemy) return;
  pHp = Math.max(0,pHp); eHp = Math.max(0,eHp);
  const pm = playerMaxHp(), em = enemyMaxHp();
  const lv = activeInstance?.level || 1, xp = activeInstance?.exp || 0, nd = needExp(lv);
  document.getElementById('pInfo').innerHTML = `Lv.${lv} ${typesHtml(player.types)} / 素早さ:${monSpd(player, activeInstance)}${statusHtml(pStatus,pPoisonTurns,pParalysisTurns,pConfusionTurns,pSleepTurns,pFlareCharge,pAquaShield)}${kokoroLinkStatusHtml()}`;
  const enemyLevel = activeHuntRequest?.enemyLevel || 1;
  document.getElementById('eInfo').innerHTML = `Lv.${enemyLevel} ${typesHtml(enemy.types)} / 素早さ:${enemyKokoroLinkSpeed(enemy,singleEnemyKokoroLinkKey())}${statusHtml(eStatus,ePoisonTurns,eParalysisTurns,eConfusionTurns,eSleepTurns,eFlareCharge,eAquaShield)}${enemyKokoroLinkStatusHtml(singleEnemyKokoroLinkKey())}`;
  const pBar = document.getElementById('pHpBar');
  const pp = pHp/pm*100;
  pBar.style.width = pp+'%';
  document.getElementById('pHpTrail').style.width = pp+'%';
  pBar.className = 'hp'+(pp<25?' hp-danger':pp<50?' hp-warn':'');
  pBar.setAttribute('aria-valuemin', '0');
  pBar.setAttribute('aria-valuemax', String(pm));
  pBar.setAttribute('aria-valuenow', String(pHp));
  const eBar = document.getElementById('eHpBar');
  const ep = eHp/em*100;
  eBar.style.width = ep+'%';
  document.getElementById('eHpTrail').style.width = ep+'%';
  eBar.className = 'hp'+(ep<25?' hp-danger':ep<50?' hp-warn':'');
  eBar.setAttribute('aria-valuemin', '0');
  eBar.setAttribute('aria-valuemax', String(em));
  eBar.setAttribute('aria-valuenow', String(eHp));
  document.getElementById('pHpText').textContent = `${pHp} / ${pm}`;
  document.getElementById('eHpText').textContent = `${eHp} / ${em}`;
  document.getElementById('pExpBar').style.width = xp/nd*100+'%';
  document.getElementById('pExpText').textContent = `EXP ${xp} / ${nd}`;
}
