let alchemyBusy = false;

function showAlchemy(){
  show('alchemy');
  renderAlchemy();
}
function alchemyEligibleInstances(){
  return (save.instances || []).filter(ins =>
    !ins.locked && !(save.party || []).includes(ins.uid) && save.instances.length > 1 && by(ins.id)
  );
}
function alchemyInstanceLabel(ins){
  const mon = by(ins.id);
  return `${mon?.name || ins.id} / Lv.${ins.level || 1} / 個体ID ${String(ins.uid).slice(-8)}`;
}
function alchemyEvolutionStage(monsterId, visited=new Set()){
  if(visited.has(monsterId)) return 0;
  visited.add(monsterId);
  const parents = M.filter(mon =>
    mon.evolution === monsterId || (mon.evolutions || []).some(entry => entry.to === monsterId)
  );
  if(!parents.length) return 0;
  return 1 + Math.max(...parents.map(mon => alchemyEvolutionStage(mon.id, new Set(visited))));
}
function alchemyMonsterBonus(ins){
  const levelBonus = Math.min(6, Math.max(0, (Number(ins?.level) || 1) - 1) * 2);
  const evolutionBonus = Math.min(4, alchemyEvolutionStage(ins?.id) * 2);
  return {levelBonus, evolutionBonus, total:Math.min(10, levelBonus + evolutionBonus)};
}
function resolveAlchemyRecipe(selection={}){
  return ALCHEMY_RECIPE_BY_ID[selection.recipeId] || ALCHEMY_RECIPE_BY_ID[DEFAULT_ALCHEMY_RECIPE_ID] || ALCHEMY_RECIPES[0];
}
function alchemyCandidatePool(recipe, success){
  return success ? (recipe?.successCandidates || []) : (recipe?.failureCandidates || []);
}
function alchemyMonsterRarity(mon){
  const rarity = typeof mon?.rarity === 'string' ? mon.rarity : '';
  return /^★+$/.test(rarity) ? rarity.length : 0;
}
function alchemyMinimumFailureRarity(coinOption){
  const value = Number(coinOption?.minimumFailureRarity);
  return Number.isInteger(value) && value > 0 ? value : null;
}
function alchemyFailureGuaranteeText(coinOption){
  const minimum = alchemyMinimumFailureRarity(coinOption);
  return minimum ? `外れ結果は★${minimum}以上` : '最低レアリティ保証なし';
}
function isAlchemyCandidateEligible(candidate, context={}){
  const mon = by(candidate?.monsterId);
  if(!mon) return false;
  const conditions = candidate.conditions || {};
  if(conditions.requiresNormalWildMap){
    const wildIds = new Set(MAPS.filter(map => !map.bossOnly && !map.rareOnly).flatMap(map => map.enemyIds || []));
    if(!wildIds.has(mon.id)) return false;
  }
  if(conditions.excludeBossClass && mon.bossClass) return false;
  if(conditions.excludeEvolutionOnly && mon.evolutionOnly) return false;
  if(conditions.excludeAlchemyExclusive && mon.alchemyExclusive) return false;
  const minimumRarity = Number(context.minimumRarity);
  if(Number.isInteger(minimumRarity) && minimumRarity > 0 && alchemyMonsterRarity(mon) < minimumRarity) return false;
  return true;
}
function eligibleAlchemyCandidates(recipe, success, coinOption=null){
  const context = {minimumRarity:success ? null : alchemyMinimumFailureRarity(coinOption)};
  return alchemyCandidatePool(recipe, success).filter(candidate => isAlchemyCandidateEligible(candidate, context));
}
function alchemyFailureCandidates(recipe=resolveAlchemyRecipe(), coinOption=null){
  return eligibleAlchemyCandidates(recipe, false, coinOption).map(candidate => by(candidate.monsterId));
}
function alchemyCandidateNames(candidates){
  return candidates.map(candidate => by(candidate.monsterId)?.name).filter(Boolean);
}
function alchemyCandidateDisplay(plan, open=false){
  const successNames = alchemyCandidateNames(eligibleAlchemyCandidates(plan.recipe, true, plan.coinOption));
  const failureNames = alchemyCandidateNames(eligibleAlchemyCandidates(plan.recipe, false, plan.coinOption));
  return `<p><b>成功候補：</b>${successNames.join('、') || '候補なし'}</p>
    <details class="alchemy-candidates" ${open?'open':''}><summary>外れ候補（${failureNames.length}体）</summary><p>${failureNames.join('、') || '保証条件を満たす候補がありません。'}</p></details>`;
}
function rollAlchemySuccess(plan, randomFn=Math.random){
  return randomFn() < plan.rate / 100;
}
function rollWeightedAlchemyCandidate(candidates, randomFn=Math.random){
  const weighted = candidates.filter(candidate => Number(candidate.weight) > 0);
  const totalWeight = weighted.reduce((sum, candidate) => sum + Number(candidate.weight), 0);
  if(!totalWeight) return null;
  if(weighted.length === 1) return weighted[0];
  let roll = Math.min(Math.max(Number(randomFn()) || 0, 0), 1 - Number.EPSILON) * totalWeight;
  for(const candidate of weighted){
    roll -= Number(candidate.weight);
    if(roll < 0) return candidate;
  }
  return weighted[weighted.length - 1] || null;
}
function rollAlchemyArchetype(monsterId, randomFn=Math.random){
  const archetypes = ALCHEMY_MONSTER_CONFIGS[monsterId]?.archetypes || [];
  if(!archetypes.length) return null;
  const index = Math.min(Math.floor(randomFn() * archetypes.length), archetypes.length - 1);
  return archetypes[index];
}
function createAlchemyResultInstance(candidate, randomFn=Math.random){
  const resultMonster = by(candidate?.monsterId);
  if(!resultMonster) throw new Error('完成モンスターを決定できませんでした。');
  const archetype = candidate.alchemyInstance ? rollAlchemyArchetype(resultMonster.id, randomFn) : null;
  const config = ALCHEMY_MONSTER_CONFIGS[resultMonster.id];
  const exclusiveSkillIds = (config?.exclusiveMoveIndexes || [])
    .map(index => resultMonster.moves?.[index])
    .filter(Boolean)
    .map(skillIdFromMove);
  const extraFields = archetype ? {alchemy:{
    archetypeId:archetype.id,
    archetypeLabel:archetype.label,
    statModifiers:{...archetype.modifiers},
    exclusiveSkillIds
  }} : null;
  const resultInstance = addInstance(resultMonster.id, 1, 0, extraFields);
  ensureInstanceSkills(resultInstance);
  return {resultMonster, resultInstance, archetype};
}
function rollAlchemyResultCandidate(recipe, success, coinOption, randomFn=Math.random){
  return rollWeightedAlchemyCandidate(eligibleAlchemyCandidates(recipe, success, coinOption), randomFn);
}
function collectAlchemySelection(){
  const recipe = resolveAlchemyRecipe();
  return {
    recipeId:recipe.recipeId,
    instanceUid:document.getElementById('alchemyMonsterSelect')?.value || '',
    materialIds:recipe.materialChoices.map((_, index) =>
      document.getElementById(`alchemyMaterial${index}`)?.value || ''
    ),
    coinOptionId:document.querySelector('input[name="alchemyCoin"]:checked')?.value || recipe.defaultCoinOptionId
  };
}
function alchemyPlan(selection=collectAlchemySelection()){
  const recipe = resolveAlchemyRecipe(selection);
  const instance = getInstance(selection.instanceUid);
  const requestedCoinOptionId = selection.coinOptionId || recipe.defaultCoinOptionId;
  const selectedCoinOption = recipe.coinOptions.find(option => option.id === requestedCoinOptionId);
  const coinOption = selectedCoinOption
    || recipe.coinOptions.find(option => option.id === recipe.defaultCoinOptionId)
    || recipe.coinOptions[0];
  const fineCount = selection.materialIds.filter(id => ITEM_BY_ID[id]?.quality === 'fine').length;
  const monsterBonus = alchemyMonsterBonus(instance);
  const unclampedRate = recipe.baseSuccessRate + fineCount * recipe.fineMaterialBonus + monsterBonus.total + coinOption.bonus;
  return {
    selection, recipe, instance, coinOption, coinOptionSelectionValid:!!selectedCoinOption, fineCount, monsterBonus,
    rate:Math.max(recipe.minSuccessRate, Math.min(recipe.maxSuccessRate, unclampedRate))
  };
}
function validateAlchemyPlan(plan){
  const errors = [];
  const ins = plan.instance;
  if(!ins) errors.push('投入モンスターが選択されていません。');
  if((save.instances || []).length <= 1) errors.push('最後の所持モンスターは投入できません。');
  if(ins && (save.party || []).includes(ins.uid)) errors.push(`${by(ins.id)?.name || ins.id}はパーティー編成中です。`);
  if(ins?.locked) errors.push(`${by(ins.id)?.name || ins.id}はロック中です。`);
  if(!plan.coinOptionSelectionValid) errors.push('投入コイン帯が正しく選択されていません。再選択してください。');
  plan.recipe.materialChoices.forEach((choice, index) => {
    const itemId = plan.selection.materialIds[index];
    if(itemId !== choice.normal && itemId !== choice.fine){
      errors.push(`${choice.label}の品質が正しく選択されていません。`);
      return;
    }
    if(Number(save.items?.[itemId] || 0) < 1) errors.push(`${ITEM_BY_ID[itemId]?.name || choice.label}が不足しています。`);
  });
  if((save.coins || 0) < plan.coinOption.amount) errors.push(`コインが${plan.coinOption.amount - (save.coins || 0)}枚不足しています。`);
  if(!alchemyFailureCandidates(plan.recipe, plan.coinOption).length){
    errors.push(`${plan.coinOption.label}では${alchemyFailureGuaranteeText(plan.coinOption)}を満たす外れ候補がないため、選択できません。`);
  }
  return [...new Set(errors)];
}
function alchemyMaterialOption(itemId){
  const item = ITEM_BY_ID[itemId];
  const count = Number(save.items?.[itemId] || 0);
  return `<option value="${itemId}">${item?.icon || '📦'} ${item?.name || itemId}（所持${count}）</option>`;
}
function renderAlchemy(){
  ensureContractScrollItem();
  const root = document.getElementById('alchemyForm');
  if(!root) return;
  const eligible = alchemyEligibleInstances();
  const recipe = resolveAlchemyRecipe();
  const unavailable = (save.instances || []).filter(ins => !eligible.includes(ins));
  root.innerHTML = `
    <div class="alchemy-balance">💰 所持コイン：<b>${save.coins || 0}</b>枚</div>
    <div class="alchemy-step">
      <h2>1. 投入モンスター</h2>
      <p class="alchemy-warning">⚠️ 投入した個体は結果にかかわらず失われ、元に戻せません。</p>
      <select id="alchemyMonsterSelect" onchange="updateAlchemyPreview()" ${eligible.length?'':'disabled'}>
        ${eligible.length ? eligible.map(ins => `<option value="${ins.uid}">${alchemyInstanceLabel(ins)}</option>`).join('') : '<option value="">投入可能な個体がいません</option>'}
      </select>
      ${unavailable.length ? `<details><summary>選択できない個体（${unavailable.length}体）</summary><ul class="alchemy-restrictions">${unavailable.map(ins => {
        const reasons=[];
        if((save.party||[]).includes(ins.uid)) reasons.push('パーティー編成中');
        if(ins.locked) reasons.push('ロック中');
        if(save.instances.length<=1) reasons.push('最後の所持モンスター');
        return `<li>${alchemyInstanceLabel(ins)}：${reasons.join('・')}</li>`;
      }).join('')}</ul></details>` : ''}
    </div>
    <div class="alchemy-step">
      <h2>2. 素材品質（各1個）</h2>
      <div class="alchemy-material-grid">${recipe.materialChoices.map((choice,index) => `
        <label>${choice.label}<select id="alchemyMaterial${index}" onchange="updateAlchemyPreview()">${alchemyMaterialOption(choice.normal)}${alchemyMaterialOption(choice.fine)}</select></label>
      `).join('')}</div>
    </div>
    <div class="alchemy-step">
      <h2>3. 投入コイン</h2>
      <div class="alchemy-coin-options">${recipe.coinOptions.map(option => {
        const failureCount = eligibleAlchemyCandidates(recipe, false, option).length;
        return `<label><input type="radio" name="alchemyCoin" value="${option.id}" onchange="updateAlchemyPreview()" ${option.id===recipe.defaultCoinOptionId?'checked':''} ${failureCount?'':'disabled'}>
          <span>${option.label}<b>${option.amount}枚</b><small>成功率 ${option.bonus>0?'+':''}${option.bonus}%</small><small>${alchemyFailureGuaranteeText(option)}</small>${failureCount?'':`<small class="alchemy-unavailable">候補0体のため選択不可</small>`}</span>
        </label>`;
      }).join('')}</div>
    </div>
    <div id="alchemyPreview"></div>`;
  updateAlchemyPreview();
}
function updateAlchemyPreview(){
  const preview = document.getElementById('alchemyPreview');
  if(!preview) return;
  const plan = alchemyPlan();
  const materialNames = plan.selection.materialIds.map(id => ITEM_BY_ID[id]?.name || '未選択');
  const errors = validateAlchemyPlan(plan);
  preview.innerHTML = `<div class="alchemy-preview-card">
    <h2>錬成予定</h2>
    <p><b>投入個体：</b>${plan.instance ? alchemyInstanceLabel(plan.instance) : '未選択'}</p>
    <p><b>使用素材：</b>${materialNames.join(' / ')}</p>
    <p><b>選択中コイン帯：</b>${plan.coinOption.label}（${plan.coinOption.amount}枚）</p>
    <p class="alchemy-guarantee"><b>最低レアリティ保証：</b>${alchemyFailureGuaranteeText(plan.coinOption)}</p>
    <div class="alchemy-rate"><span>アルケミオン成功率</span><strong>${plan.rate}%</strong></div>
    <div class="alchemy-breakdown">基礎${plan.recipe.baseSuccessRate}% / 素材品質 +${plan.fineCount*plan.recipe.fineMaterialBonus}% / レベル +${plan.monsterBonus.levelBonus}% / 進化段階 +${plan.monsterBonus.evolutionBonus}% / コイン ${plan.coinOption.bonus>0?'+':''}${plan.coinOption.bonus}%</div>
    ${alchemyCandidateDisplay(plan)}
    ${errors.length ? `<div class="alchemy-errors">${errors.map(error=>`<p>❌ ${error}</p>`).join('')}</div>` : ''}
    <button onclick="openAlchemyConfirmation()" ${errors.length || alchemyBusy?'disabled':''}>確認画面へ</button>
  </div>`;
}
function openAlchemyConfirmation(){
  const plan = alchemyPlan();
  const errors = validateAlchemyPlan(plan);
  if(errors.length){ updateAlchemyPreview(); return; }
  const target = document.getElementById('alchemyConfirmContent');
  if(!target) return;
  target.innerHTML = `<div class="alchemy-confirm-card">
    ${vis(by(plan.instance.id))}
    <h2>${alchemyInstanceLabel(plan.instance)}を投入</h2>
    <p>${plan.selection.materialIds.map(id=>ITEM_BY_ID[id].name).join(' / ')}</p>
    <p><b>選択中コイン帯：</b>${plan.coinOption.label}（${plan.coinOption.amount}枚）</p>
    <p><b>アルケミオン成功率：</b>${plan.rate}%</p>
    <p class="alchemy-guarantee"><b>最低レアリティ保証：</b>${alchemyFailureGuaranteeText(plan.coinOption)}</p>
    ${alchemyCandidateDisplay(plan, true)}
    <p class="alchemy-warning">この操作を確定すると、投入モンスター・素材4個・コインは結果にかかわらず消費されます。元には戻せません。</p>
    <button id="alchemyExecuteButton" onclick="executeAlchemyConfirmed()">消費して錬成を実行</button>
    <button onclick="showAlchemy()" class="secondary-button">内容を修正する</button>
  </div>`;
  show('alchemyConfirm');
}
function executeAlchemyConfirmed(){
  if(alchemyBusy) return;
  const plan = alchemyPlan();
  const errors = validateAlchemyPlan(plan);
  if(errors.length){
    document.getElementById('alchemyConfirmContent').innerHTML = `<div class="alchemy-errors">${errors.map(error=>`<p>❌ ${error}</p>`).join('')}</div><button onclick="showAlchemy()">錬成画面へ戻る</button>`;
    return;
  }
  alchemyBusy = true;
  const button = document.getElementById('alchemyExecuteButton');
  if(button) button.disabled = true;
  show('alchemyResult');
  document.getElementById('alchemyResultContent').innerHTML = `<div class="alchemy-animation"><div class="alchemy-core">⚗</div><h2>錬成核を構築中……</h2><p>素材と魔力を結合しています</p></div>`;
  setTimeout(() => finalizeAlchemy(plan), 900);
}
function finalizeAlchemy(originalPlan){
  const snapshot = JSON.stringify(save);
  try{
    const plan = alchemyPlan(originalPlan.selection);
    const errors = validateAlchemyPlan(plan);
    if(errors.length) throw new Error(errors.join('\n'));

    plan.selection.materialIds.forEach(id => { save.items[id] -= 1; });
    save.coins -= plan.coinOption.amount;
    save.instances = save.instances.filter(ins => ins.uid !== plan.instance.uid);
    if(save.equippedSkills) delete save.equippedSkills[plan.instance.uid];

    const success = rollAlchemySuccess(plan);
    const candidate = rollAlchemyResultCandidate(plan.recipe, success, plan.coinOption);
    const {resultMonster, resultInstance, archetype} = createAlchemyResultInstance(candidate);
    saveGame();

    const content = document.getElementById('alchemyResultContent');
    const modifierHtml = archetype ? instanceAlchemySummary(resultInstance) : '<p class="small">通常モンスターとして完成しました。</p>';
    content.innerHTML = `<div class="alchemy-result-card ${success?'success':'fallback'}">
      <p class="alchemy-result-label">${success?'✨ 錬成成功！':'🔹 通常個体が完成'}</p>
      ${vis(resultMonster)}<h1>${resultMonster.name}</h1>
      <p>Lv.1 / ${typesHtml(resultMonster.types)} / 個体ID ${String(resultInstance.uid).slice(-8)}</p>
      ${modifierHtml}
      ${success?`<p><b>専用技：</b>⚪ 錬核崩砕（威力140・実ダメージの25%反動）</p>`:''}
      <button onclick="show('party')">完成個体を手持ちで確認</button>
      <button onclick="showAlchemy()" class="secondary-button">もう一度錬成する</button>
    </div>`;
    renderParty();
    renderDex();
    if(typeof renderPartySetup === 'function') renderPartySetup();
  }catch(error){
    save = JSON.parse(snapshot);
    try{ localStorage.setItem('mb_v95c', snapshot); }catch(restoreError){ console.error('alchemy rollback save failed:', restoreError); }
    document.getElementById('alchemyResultContent').innerHTML = `<div class="alchemy-errors"><h2>錬成を中止しました</h2><p>消費前の状態へ戻しました。</p><p>${String(error?.message || error).replaceAll('\n','<br>')}</p></div><button onclick="showAlchemy()">錬成画面へ戻る</button>`;
    console.error('alchemy failed and rolled back:', error);
  }finally{
    alchemyBusy = false;
  }
}
