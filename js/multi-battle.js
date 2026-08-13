/* Three-way battle foundation. The combatant array is intentionally open-ended. */
function createMultiEnemy(mon, factionId) {
  const level = activeHuntRequest?.enemyLevel || 1;
  const max = Math.max(1, Math.round(maxHp(mon, level) * (Number(huntDifficulty(activeHuntRequest?.difficultyId).hpMultiplier) || 1)));
  return {
    id:factionId, factionId, mon:structuredClone(mon), level, hp:max, maxHp:max,
    attack:1, guard:false, status:null, poisonTurns:0, paralysisTurns:0,
    confusionTurns:0, sleepTurns:0, flareCharge:false, aquaShield:false,
    poisonSourceIsPlayer:false, alive:true, defeatedByPlayer:false, rewardGranted:false
  };
}

function beginThreeWayBattle() {
  const second = by(activeHuntRequest.secondEnemyId);
  if (!second) {
    activeHuntRequest.battleMode = 'single';
    beginChosenBattle(selectedMap.id, enemy.id, activeHuntRequest.difficultyId, activeHuntRequest);
    return;
  }
  multiBattle = {
    active:true, finished:false, pendingMoveIndex:null,
    enemies:[createMultiEnemy(enemy, 'enemy_a'), createMultiEnemy(second, 'enemy_b')],
    contractAttempts:Object.create(null)
  };
  pendingMultiBattleContractId = null;
  document.getElementById('singleEnemyBox').classList.add('hidden');
  document.getElementById('multiEnemyGrid').classList.remove('hidden');
  document.getElementById('multiTargetSelect').classList.add('hidden');
  document.getElementById('multiContractPanel').classList.add('hidden');
  show('battle');
  setupMultiBattle();
  document.getElementById('log').innerHTML =
    `${selectedMap.name}の${activeHuntRequest.difficultyLabel}討伐依頼を開始！<br>`+
    `⚔️ <b>${multiBattle.enemies[0].mon.name}</b>と<b>${multiBattle.enemies[1].mon.name}</b>が互いを警戒している！<br>${player.name}、三つ巴を制せ！`;
}

function setupMultiBattle() {
  setupBattle();
  document.getElementById('singleEnemyBox').classList.add('hidden');
  document.getElementById('multiEnemyGrid').classList.remove('hidden');
  const request = activeHuntRequest;
  document.getElementById('battleMapBanner').innerHTML =
    `<div class="panel"><img class="map-img" src="${selectedMap.image}" alt="${selectedMap.name}"><h2>${selectedMap.name}</h2>`+
    `<div class="battle-hunt-summary"><span class="hunt-difficulty difficulty-${request.difficultyId}">${request.difficultyLabel}</span><span>⚔️ 三つ巴</span><span>敵Lv.${request.enemyLevel}</span><span>報酬：2体分</span></div>`+
    `<div class="battle-hunt-conditions"><h3>特殊条件</h3>${huntConditionsHtml(request, true)}</div></div>`;
  renderSkillButtons();
  updateMultiBattleView();
}

function aliveMultiEnemies() { return multiBattle?.enemies?.filter(entry => entry.alive && entry.hp > 0) || []; }
function multiEnemy(id) { return multiBattle?.enemies?.find(entry => entry.id === id) || null; }
function multiStatusHtml(entry) { return statusHtml(entry.status,entry.poisonTurns,entry.paralysisTurns,entry.confusionTurns,entry.sleepTurns,entry.flareCharge,entry.aquaShield); }

function updateMultiBattleView() {
  if (!multiBattle?.active) return;
  pHp = Math.max(0,pHp);
  const pm=playerMaxHp(), lv=activeInstance?.level||1, xp=activeInstance?.exp||0, nd=needExp(lv);
  document.getElementById('pInfo').innerHTML=`Lv.${lv} ${typesHtml(player.types)} / 素早さ:${monSpd(player,activeInstance)}${statusHtml(pStatus,pPoisonTurns,pParalysisTurns,pConfusionTurns,pSleepTurns,pFlareCharge,pAquaShield)}`;
  const pp=pHp/pm*100, pBar=document.getElementById('pHpBar'); pBar.style.width=pp+'%'; pBar.className='hp'+(pp<25?' hp-danger':pp<50?' hp-warn':'');
  document.getElementById('pHpText').textContent=`${pHp} / ${pm}`; document.getElementById('pExpBar').style.width=xp/nd*100+'%'; document.getElementById('pExpText').textContent=`EXP ${xp} / ${nd}`;
  document.getElementById('multiEnemyGrid').innerHTML=multiBattle.enemies.map(entry=>{
    const pct=Math.max(0,entry.hp)/entry.maxHp*100;
    const targetable=multiBattle.pendingMoveIndex!==null&&entry.alive;
    return `<div class="box multi-enemy-card ${targetable?'is-targetable':''} ${entry.alive?'':'is-defeated'}" ${targetable?`onclick="startMultiBattleTurn('${entry.id}')"`:''}>`+
      `<h2>${entry.mon.name}</h2><div id="${entry.id}Vis">${vis(entry.mon)}</div>`+
      `<p class="small">Lv.${entry.level} ${typesHtml(entry.mon.types)} / 素早さ:${monSpd(entry.mon)}${multiStatusHtml(entry)}</p>`+
      `<p class="multi-warning">${entry.alive?'⚠️ 誰を狙うか分からない':'💀 撃破済み'}</p>`+
      `<div class="bar"><div class="hp${pct<25?' hp-danger':pct<50?' hp-warn':''}" style="width:${pct}%"></div></div><p class="small">${Math.max(0,entry.hp)} / ${entry.maxHp}</p></div>`;
  }).join('');
}

function chooseMultiBattleTarget(moveIndex) {
  if (busy || !multiBattle?.active || multiBattle.finished) return;
  const living=aliveMultiEnemies();
  if (!living.length) return;
  multiBattle.pendingMoveIndex=moveIndex;
  const picker=document.getElementById('multiTargetSelect');
  picker.innerHTML=`<p>攻撃対象を選んでください</p>${living.map(entry=>`<button onclick="startMultiBattleTurn('${entry.id}')">${entry.mon.name}</button>`).join('')}<button onclick="cancelMultiBattleTarget()" class="secondary-button">やめる</button>`;
  picker.classList.remove('hidden');
  updateMultiBattleView();
}
function cancelMultiBattleTarget(){ if(!multiBattle)return; multiBattle.pendingMoveIndex=null; document.getElementById('multiTargetSelect').classList.add('hidden'); updateMultiBattleView(); }

function startMultiBattleTurn(targetId) {
  if (busy || multiBattle?.pendingMoveIndex===null || multiBattle?.pendingMoveIndex===undefined) return;
  const moveIndex=multiBattle.pendingMoveIndex; multiBattle.pendingMoveIndex=null;
  document.getElementById('multiTargetSelect').classList.add('hidden'); busy=true; startBattleTurn();
  const actions=[{kind:'player',speed:monSpd(player,activeInstance),targetId,move:getEquippedMovesForInstance(activeInstance)[moveIndex]||['通常攻撃',24,'normal']}];
  aliveMultiEnemies().forEach(actor=>actions.push({kind:'enemy',actorId:actor.id,speed:monSpd(actor.mon),move:actor.mon.moves[Math.floor(Math.random()*actor.mon.moves.length)]}));
  actions.sort((a,b)=>b.speed-a.speed || Math.random()-.5);
  runMultiActions(actions,0);
}

function runMultiActions(actions,index) {
  if (!multiBattle?.active || multiBattle.finished) return;
  if (index>=actions.length) { finishMultiBattleTurn(); return; }
  const action=actions[index];
  if (action.kind==='player') {
    if (pHp<=0) { runMultiActions(actions,index+1); return; }
    if (pSleepTurns>0) { pSleepTurns--; appendMultiLog(`💤 ${player.name}は眠っていて動けない！`); runMultiActions(actions,index+1); return; }
    if (pParalysisTurns>0) { pParalysisTurns--; if(Math.random()<.30){appendMultiLog(`⚡ ${player.name}は体がしびれて動けない！`);runMultiActions(actions,index+1);return;} }
    if (pConfusionTurns>0) {
      pConfusionTurns--;
      const roll=Math.random();
      if(roll>=.50&&roll<.75){appendMultiLog(`🌀 ${player.name}はこんらんして動けない！`);runMultiActions(actions,index+1);return;}
      if(roll>=.75){const dmg=Math.max(1,Math.floor(12*pAtk*playerAttackInstanceMultiplier()));pHp=Math.max(0,pHp-dmg);appendMultiLog(`🌀 ${player.name}はこんらんして自分に${dmg}ダメージ！`);runMultiActions(actions,index+1);return;}
    }
    let target=multiEnemy(action.targetId);
    if (!target?.alive) target=aliveMultiEnemies()[0];
    if (target) performMultiAttack({kind:'player'},target,action.move);
  } else {
    const actor=multiEnemy(action.actorId);
    if (!actor?.alive) { runMultiActions(actions,index+1); return; }
    const targets=[{kind:'player',id:'player'},...aliveMultiEnemies().filter(entry=>entry.id!==actor.id).map(entry=>({kind:'enemy',id:entry.id}))];
    const targetDescriptor=targets[Math.floor(Math.random()*targets.length)];
    const target=targetDescriptor?.kind==='enemy' ? multiEnemy(targetDescriptor.id) : targetDescriptor;
    if (target) performMultiAttack(actor,target,action.move);
  }
  if (pHp<=0 && !switchPartyMember()) return;
  if (!aliveMultiEnemies().length) { winMultiBattle(); return; }
  setTimeout(()=>runMultiActions(actions,index+1),550);
}

function performMultiAttack(actor,target,move) {
  const actorIsPlayer=actor.kind==='player'; const defenderIsPlayer=target.kind==='player';
  const a=actorIsPlayer?player:actor.mon; const d=defenderIsPlayer?player:target.mon;
  const [name,power,type,effect,effectChance]=move; let msg='';
  if (!actorIsPlayer && actor.sleepTurns>0) { actor.sleepTurns--; msg=`💤 ${a.name}は眠っていて動けない！`; appendMultiLog(msg); return; }
  if (!actorIsPlayer && actor.paralysisTurns>0) { actor.paralysisTurns--; if(Math.random()<.30){appendMultiLog(`⚡ ${a.name}は体がしびれて動けない！`);return;} }
  if (!actorIsPlayer && actor.confusionTurns>0) {
    actor.confusionTurns--;
    const roll=Math.random();
    if(roll>=.50&&roll<.75){appendMultiLog(`🌀 ${a.name}はこんらんして動けない！`);return;}
    if(roll>=.75){const dmg=Math.max(1,Math.floor(12*actor.attack));actor.hp=Math.max(0,actor.hp-dmg);appendMultiLog(`🌀 ${a.name}はこんらんして自分に${dmg}ダメージ！`);if(actor.hp<=0){actor.alive=false;actor.defeatedByPlayer=false;}return;}
  }
  if(effect==='guard'){ if(actorIsPlayer)pGuard=true;else actor.guard=true; appendMultiLog(`🛡️ ${a.name}は身を守った！`);updateMultiBattleView();return; }
  if(effect==='heal'){
    const amount=adjustedBattleHealing(24+(actorIsPlayer?(activeInstance?.level||1):1)*3);
    if(actorIsPlayer)pHp=Math.min(playerMaxHp(),pHp+amount);else actor.hp=Math.min(actor.maxHp,actor.hp+amount);
    appendMultiLog(`💚 ${a.name}はHPを${amount}回復した！`);updateMultiBattleView();return;
  }
  if(effect==='buff'){if(actorIsPlayer)pAtk=Math.min(1.6,pAtk+.25);else actor.attack=Math.min(1.6,actor.attack+.25);appendMultiLog(`⬆️ ${a.name}の攻撃力が上がった！`);return;}
  const targetEntry=defenderIsPlayer?null:target;
  if(effect==='debuff'){if(defenderIsPlayer)pAtk=Math.max(.65,pAtk-.2);else targetEntry.attack=Math.max(.65,targetEntry.attack-.2);appendMultiLog(`⬇️ ${d.name}の攻撃力が下がった！`);return;}
  if(effect==='aqua_shield'){if(actorIsPlayer)pAquaShield=true;else actor.aquaShield=true;appendMultiLog(`💧 ${a.name}は水の盾を展開した！`);return;}
  if(effect==='sleep'&&power<=0){
    if(Math.random()<(effectChance??.7)){if(defenderIsPlayer)pSleepTurns=2;else targetEntry.sleepTurns=2;appendMultiLog(`🌿 ${a.name}の「${name}」！<br>💤 ${d.name}はねむり状態になった！`);}else appendMultiLog(`🌿 ${a.name}の「${name}」！ しかし効かなかった！`);
    updateMultiBattleView();return;
  }
  const atk=(actorIsPlayer?pAtk*playerAttackInstanceMultiplier():actor.attack)*(actor.flareCharge||actorIsPlayer&&pFlareCharge?1.2:1);
  const guard=defenderIsPlayer?pGuard:targetEntry.guard, shield=defenderIsPlayer?pAquaShield:targetEntry.aquaShield;
  const r=typeEff(type,d.types), difficulty=actorIsPlayer?1:enemyDifficultyAttackMultiplier(), map=power>0?huntMapAttackMultiplier(moveTypes(move)):1;
  const damage=Math.max(1,Math.floor((power*atk*r+Math.random()*9)*difficulty*map*(guard?.55:1)*(shield?.5:1)));
  if(defenderIsPlayer){pHp=Math.max(0,pHp-damage);pGuard=false;pAquaShield=false;if(partyBattle[activePartyIdx])partyBattle[activePartyIdx].hp=pHp;}
  else{targetEntry.hp=Math.max(0,targetEntry.hp-damage);targetEntry.guard=false;targetEntry.aquaShield=false;}
  msg=`⚔️ ${a.name}の「${name}」！ ${d.name}に<b>${damage}</b>ダメージ！`;
  if(r>1)msg+='<br>🔥 効果はバツグン！';if(r<1)msg+='<br>💧 効果はいまひとつ……';if(map>1)msg+='<br>🗺️ マップ属性強化！（×1.2）';
  if(effect==='drain'){const heal=adjustedBattleHealing(Math.floor(damage/2));if(actorIsPlayer)pHp=Math.min(playerMaxHp(),pHp+heal);else actor.hp=Math.min(actor.maxHp,actor.hp+heal);msg+=`<br>🌱 HPを${heal}吸収した！`;}
  if(effect==='repeat_attack'&&(defenderIsPlayer?pHp:targetEntry.hp)>0&&Math.random()<(effectChance??.3)){
    const second=Math.max(1,Math.floor((power*atk*r+Math.random()*9)*difficulty*map));
    if(defenderIsPlayer){pHp=Math.max(0,pHp-second);if(partyBattle[activePartyIdx])partyBattle[activePartyIdx].hp=pHp;}else targetEntry.hp=Math.max(0,targetEntry.hp-second);
    msg+=`<br>⚡ 電撃が連鎖した！ 追加で<b>${second}</b>ダメージ！`;
  }
  if(effect==='recoil'||effect==='alchemy_recoil'){const recoil=effect==='recoil'?8:alchemyRecoilDamage(damage);if(actorIsPlayer)pHp=Math.max(0,pHp-recoil);else actor.hp=Math.max(0,actor.hp-recoil);msg+=`<br>💥 ${a.name}は反動で${recoil}ダメージ！`;}
  if(effect==='flare_charge'){if(actorIsPlayer)pFlareCharge=true;else actor.flareCharge=true;}else if(power>0){if(actorIsPlayer)pFlareCharge=false;else actor.flareCharge=false;}
  if((defenderIsPlayer?pHp:targetEntry.hp)>0){
    if(effect==='poison'&&Math.random()<(effectChance??.5)){
      if(defenderIsPlayer){pStatus='poison';pPoisonTurns=BATTLE_STATUS_EFFECTS.poison.duration;}else{targetEntry.status='poison';targetEntry.poisonTurns=BATTLE_STATUS_EFFECTS.poison.duration;targetEntry.poisonSourceIsPlayer=actorIsPlayer;}
      msg+='<br>☠️ 毒状態になった！';
    }
    if(effect==='paralysis'&&Math.random()<(effectChance??.3)){if(defenderIsPlayer)pParalysisTurns=3;else targetEntry.paralysisTurns=3;msg+='<br>⚡ 麻痺状態になった！';}
    if(effect==='confusion'&&Math.random()<(effectChance??.6)){const turns=2+Math.floor(Math.random()*2);if(defenderIsPlayer)pConfusionTurns=turns;else targetEntry.confusionTurns=turns;msg+='<br>🌀 こんらんした！';}
  }
  appendMultiLog(msg);
  if(!defenderIsPlayer&&targetEntry.hp<=0){targetEntry.alive=false;targetEntry.defeatedByPlayer=actorIsPlayer;appendMultiLog(`💀 ${targetEntry.mon.name}は${a.name}に倒された！`);}
  if(!actorIsPlayer&&actor.hp<=0){actor.alive=false;actor.defeatedByPlayer=false;appendMultiLog(`💀 ${actor.mon.name}は反動で倒れた！`);}
  updateMultiBattleView();
}

function appendMultiLog(message){const el=document.getElementById('log');if(el)el.innerHTML+=(el.innerHTML?'<br>':'')+message;}
function finishMultiBattleTurn(){
  completeBattleTurn();
  const poison=BATTLE_STATUS_EFFECTS.poison;
  if(pStatus==='poison'&&pPoisonTurns>0&&pHp>0){const dmg=Math.max(1,Math.floor(playerMaxHp()*poison.maxHpDamageRate));pHp=Math.max(0,pHp-dmg);pPoisonTurns--;appendMultiLog(`☠️ ${player.name}は毒で${dmg}ダメージ！`);if(!pPoisonTurns)pStatus=null;}
  aliveMultiEnemies().forEach(entry=>{if(entry.status==='poison'&&entry.poisonTurns>0){const dmg=Math.max(1,Math.floor(entry.maxHp*poison.maxHpDamageRate));entry.hp=Math.max(0,entry.hp-dmg);entry.poisonTurns--;appendMultiLog(`☠️ ${entry.mon.name}は毒で${dmg}ダメージ！`);if(!entry.poisonTurns)entry.status=null;if(entry.hp<=0){entry.alive=false;entry.defeatedByPlayer=entry.poisonSourceIsPlayer;appendMultiLog(`💀 ${entry.mon.name}は毒で倒れた！`);}}});
  updateMultiBattleView(); if(pHp<=0&&!switchPartyMember())return;if(!aliveMultiEnemies().length){winMultiBattle();return;} busy=false;
}

function grantMultiEnemyReward(entry,turnBonus){
  if(entry.rewardGranted)return {exp:0,coins:0,message:''};entry.rewardGranted=true;
  const baseExp=entry.mon.expBonus||(35+Math.floor(Math.random()*25)),baseCoins=entry.mon.coinBonus||(8+Math.floor(Math.random()*10));
  const exp=huntRewardAmount(baseExp,turnBonus),coins=huntRewardAmount(baseCoins,turnBonus);save.coins+=coins;let message=`<b>${entry.mon.name}</b>：EXP ${exp}・コイン${coins}枚`;
  if(entry.mon.dropItem&&Math.random()<(Number.isFinite(entry.mon.dropRate)?entry.mon.dropRate:1)){save.items[entry.mon.dropItem]=(save.items[entry.mon.dropItem]||0)+1;message+=`・${entry.mon.dropItemName||entry.mon.dropItem}入手`;}
  const material=grantAlchemyMaterialReward();if(material)message+=`・${material.name}入手`;
  return {exp,coins,message};
}
function winMultiBattle(){
  if(battleRewardGranted)return;battleRewardGranted=true;completeBattleTurn();multiBattle.finished=true;busy=true;
  const turnBonus=huntTurnBonusSucceeded(), rewards=multiBattle.enemies.map(entry=>grantMultiEnemyReward(entry,turnBonus));
  const totalExp=rewards.reduce((sum,r)=>sum+r.exp,0);let msg='🏆 三つ巴バトルに勝利！<br>'+rewards.map(r=>r.message).join('<br>');
  if(hasHuntCondition('swift_clear'))msg+=turnBonus?`<br>⏱️ ${battleTurnCount}ターンで迅速討伐達成！`:`<br>⌛ 迅速討伐失敗（8ターン以内）`;
  msg+='<br>'+grantPartyExp(totalExp);save.history.wins=(save.history.wins||0)+1;save.history.logs=save.history.logs||[];save.history.logs.push(`${multiBattle.enemies.map(e=>e.mon.name).join('・')}との三つ巴に勝利`);if(save.history.logs.length>30)save.history.logs=save.history.logs.slice(-30);saveGame();
  document.getElementById('log').innerHTML=msg;renderMultiContractPanel();document.getElementById('next').classList.remove('hidden');document.getElementById('next').textContent='➡️ 次のバトルへ';renderParty();setTimeout(processNextEvolution,300);
}

function renderMultiContractPanel(){
  const panel=document.getElementById('multiContractPanel');if(!panel||!multiBattle?.finished)return;
  const candidates=multiBattle.enemies.filter(entry=>entry.defeatedByPlayer&&!multiBattle.contractAttempts[entry.id]);
  panel.classList.remove('hidden');panel.innerHTML=`<h3>🤝 契約候補</h3>${candidates.length?candidates.map(entry=>`<button onclick="selectMultiBattleContractTarget('${entry.id}')">${entry.mon.name}と契約</button>`).join(''):'<p class="small">契約できる相手はいません（プレイヤーが倒した相手のみ）。</p>'}`;
}
function selectMultiBattleContractTarget(id){const entry=multiEnemy(id);if(!entry?.defeatedByPlayer||multiBattle.contractAttempts[id])return;pendingMultiBattleContractId=id;enemy=entry.mon;askUseContractScroll();}
function useMultiBattleContractScroll(itemId){
  const entry=multiEnemy(pendingMultiBattleContractId),it=ITEM_BY_ID[itemId]||ITEM_BY_ID.contract_scroll;if(!entry||multiBattle.contractAttempts[entry.id]){show('battle');return;}if((save.items[itemId]||0)<=0){alert(`${it.name}を持っていない！`);show('battle');return;}
  save.items[itemId]--;const rate=Math.min(.95,(entry.mon.catchRate??.25)*(it.catchMultiplier||1)),ok=Math.random()<rate;multiBattle.contractAttempts[entry.id]=true;pendingMultiBattleContractId=null;
  if(ok){addInstance(entry.mon.id);alert(`${entry.mon.name}と契約した！`);appendMultiLog(`🤝 ${it.name}を使い、${entry.mon.name}との契約に成功した！`);}else{alert('契約できなかった……');appendMultiLog(`📜 ${it.name}を使ったが、${entry.mon.name}との契約には失敗した……`);}saveGame();updateItems();renderParty();renderDex();show('battle');renderMultiContractPanel();
}
function runAwayFromMultiBattle(){multiBattle.finished=true;multiBattle.active=false;document.getElementById('log').innerHTML='🏃 三つ巴の戦場から逃げきった！';document.getElementById('next').classList.remove('hidden');document.getElementById('next').textContent='➡️ 次のバトルへ';busy=true;}
