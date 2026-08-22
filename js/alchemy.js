let alchemyBusy = false;
let selectedAlchemyRecipeId = DEFAULT_ALCHEMY_RECIPE_ID;
let selectedAlchemyMode = 'normal';
let selectedAlchemyMaterialIds = [];
let selectedAlchemyMaterialCounts = [];
let selectedAlchemyCatalystUid = '';
let selectedAlchemyCoinOptionId = 'standard';
let alchemyGuideOpen = false;

function showAlchemy(){
  show('alchemy');
  renderAlchemy();
}
function selectAlchemyRecipe(recipeId){
  selectedAlchemyRecipeId = ALCHEMY_RECIPE_BY_ID[recipeId] ? recipeId : DEFAULT_ALCHEMY_RECIPE_ID;
  if(selectedAlchemyMode === 'designated'){
    const recipe = resolveAlchemyRecipe({recipeId:selectedAlchemyRecipeId});
    selectedAlchemyMaterialIds = recipe.materialChoices.map(choice => choice.normal);
    selectedAlchemyMaterialCounts = [1, 1, 1, 1];
  }
  renderAlchemy();
}
function selectAlchemyMode(mode){
  selectedAlchemyMode = mode === 'designated' ? 'designated' : 'normal';
  if(selectedAlchemyMode === 'designated'){
    const recipe = resolveAlchemyRecipe({recipeId:selectedAlchemyRecipeId});
    selectedAlchemyMaterialIds = recipe.materialChoices.map(choice => choice.normal);
    selectedAlchemyMaterialCounts = [1, 1, 1, 1];
  }
  renderAlchemy();
}
function toggleAlchemyGuide(force){
  alchemyGuideOpen = typeof force === 'boolean' ? force : !alchemyGuideOpen;
  document.querySelector('.alchemy-guide-overlay')?.classList.toggle('is-open', alchemyGuideOpen);
}
function alchemyBaseMaterialId(itemId){
  const item = ITEM_BY_ID[itemId];
  if(item?.quality !== 'fine') return itemId;
  const normal = SHOP_ITEMS.find(entry => entry.alchemyMaterial && entry.quality === 'normal' && `fine_${entry.id}` === itemId);
  return normal?.id || itemId;
}
function alchemyRecipeMatchScore(recipe, materialIds){
  const required = recipe.materialChoices.map(choice => choice.normal);
  const selected = materialIds.map(alchemyBaseMaterialId);
  return required.reduce((score, id) => score + (selected.includes(id) ? 1 : 0), 0);
}
function inferAlchemyRecipe(materialIds=selectedAlchemyMaterialIds){
  return ALCHEMY_RECIPES.reduce((best, recipe) =>
    alchemyRecipeMatchScore(recipe, materialIds) > alchemyRecipeMatchScore(best, materialIds) ? recipe : best
  , ALCHEMY_RECIPES[0]);
}
function ensureAlchemyWorkbenchSelection(){
  if(selectedAlchemyMaterialIds.length !== 4){
    const recipe = resolveAlchemyRecipe({recipeId:selectedAlchemyRecipeId});
    selectedAlchemyMaterialIds = recipe.materialChoices.map(choice => choice.normal);
  }
  if(selectedAlchemyMaterialCounts.length !== 4) selectedAlchemyMaterialCounts = [1, 1, 1, 1];
}
function selectAlchemyWorkbenchMaterial(index, itemId){
  if(!ITEM_BY_ID[itemId]?.alchemyMaterial) return;
  ensureAlchemyWorkbenchSelection();
  selectedAlchemyMaterialIds[index] = itemId;
  selectedAlchemyRecipeId = inferAlchemyRecipe(selectedAlchemyMaterialIds).recipeId;
  renderAlchemy();
}
function changeAlchemyMaterialCount(index, delta){
  ensureAlchemyWorkbenchSelection();
  selectedAlchemyMaterialCounts[index] = Math.max(0, Math.min(99, selectedAlchemyMaterialCounts[index] + delta));
  renderAlchemy();
}
function selectAlchemyCatalyst(uid){
  selectedAlchemyCatalystUid = uid || '';
  updateAlchemyPreview();
}
function selectAlchemyCoin(optionId){
  selectedAlchemyCoinOptionId = optionId;
  updateAlchemyPreview();
}
function alchemyEligibleInstances(){
  return (save.instances || []).filter(ins =>
    !ins.locked && !(save.party || []).includes(ins.uid) && !(typeof isInstanceOnExpedition==='function'&&isInstanceOnExpedition(ins.uid)) && save.instances.length > 1 && by(ins.id)
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
function alchemyResonanceOnFailure(coinOption){
  const value = Number(coinOption?.resonanceOnFailure);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
function alchemyResonanceStatus(plan){
  if(plan.designated){
    return `<div class="alchemy-resonance-status"><b>錬成残響：${save.alchemyResonance}</b><span>指定錬成で${plan.resonanceCost}消費 / 使用後：${Math.max(0, save.alchemyResonance-plan.resonanceCost)}</span></div>`;
  }
  return `<div class="alchemy-resonance-status"><b>錬成残響：${save.alchemyResonance}</b><span>失敗時の獲得予定量：+${alchemyResonanceOnFailure(plan.coinOption)}（成功時は獲得なし）</span></div>`;
}
function isAlchemyCandidateEligible(candidate, context={}){
  const mon = by(candidate?.monsterId);
  if(!mon) return false;
  const conditions = candidate.conditions || {};
  const requiredCoinOptionIds = Array.isArray(candidate.requiredCoinOptionIds) ? candidate.requiredCoinOptionIds : [];
  if(requiredCoinOptionIds.length && !requiredCoinOptionIds.includes(context.coinOptionId)) return false;
  if(conditions.requiresNormalWildMap){
    const wildIds = new Set(MAPS.filter(map => !map.bossOnly && !map.rareOnly).flatMap(map => map.enemyIds || []));
    if(!wildIds.has(mon.id)) return false;
  }
  if(conditions.excludeBossClass && mon.bossClass) return false;
  if(conditions.excludeEvolutionOnly && mon.evolutionOnly) return false;
  if(conditions.excludeAlchemyExclusive && mon.alchemyExclusive) return false;
  if(conditions.requiresEvolutionDefinition && alchemyEvolutionStage(mon.id) < 1) return false;
  const exactRarity = Number(conditions.exactRarity);
  if(Number.isInteger(exactRarity) && alchemyMonsterRarity(mon) !== exactRarity) return false;
  const minimumRarity = Number(context.minimumRarity);
  if(Number.isInteger(minimumRarity) && minimumRarity > 0 && alchemyMonsterRarity(mon) < minimumRarity) return false;
  return true;
}
function eligibleAlchemyCandidates(recipe, success, coinOption=null){
  const context = {
    minimumRarity:success ? null : alchemyMinimumFailureRarity(coinOption),
    coinOptionId:coinOption?.id || null
  };
  return alchemyCandidatePool(recipe, success).filter(candidate => isAlchemyCandidateEligible(candidate, context));
}
function designatedAlchemyCandidates(recipe){
  return eligibleAlchemyCandidates(recipe, true).filter(candidate =>
    candidate.alchemyInstance === true && by(candidate.monsterId)?.alchemyExclusive === true
  );
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
  ensureAlchemyWorkbenchSelection();
  const recipeId = selectedAlchemyMode === 'designated'
    ? (document.getElementById('alchemyRecipeSelect')?.value || selectedAlchemyRecipeId)
    : inferAlchemyRecipe(selectedAlchemyMaterialIds).recipeId;
  const recipe = resolveAlchemyRecipe({recipeId});
  return {
    recipeId,
    mode:document.querySelector('input[name="alchemyMode"]:checked')?.value || selectedAlchemyMode,
    instanceUid:document.getElementById('alchemyMonsterSelect')?.value || selectedAlchemyCatalystUid || '',
    materialIds:[...selectedAlchemyMaterialIds],
    materialCounts:[...selectedAlchemyMaterialCounts],
    coinOptionId:document.querySelector('input[name="alchemyCoin"]:checked')?.value || selectedAlchemyCoinOptionId || recipe.defaultCoinOptionId
  };
}
function alchemyPlan(selection=collectAlchemySelection()){
  selection = {
    ...selection,
    materialIds:Array.isArray(selection.materialIds) ? selection.materialIds : [],
    materialCounts:Array.isArray(selection.materialCounts)
      ? selection.materialCounts
      : (Array.isArray(selection.materialIds) ? selection.materialIds.map(() => 1) : [])
  };
  const recipe = resolveAlchemyRecipe(selection);
  const modeSelectionValid = selection.mode === 'normal' || selection.mode === 'designated';
  const designated = selection.mode === 'designated' && recipe.designation?.enabled === true;
  const instance = getInstance(selection.instanceUid);
  const requestedCoinOptionId = selection.coinOptionId || recipe.defaultCoinOptionId;
  const selectedCoinOption = recipe.coinOptions.find(option => option.id === requestedCoinOptionId);
  const coinOption = selectedCoinOption
    || recipe.coinOptions.find(option => option.id === recipe.defaultCoinOptionId)
    || recipe.coinOptions[0];
  const fineCount = selection.materialIds.filter(id => ITEM_BY_ID[id]?.quality === 'fine').length;
  const monsterBonus = alchemyMonsterBonus(instance);
  const quantityBonus = Math.min(8, (selection.materialCounts || []).reduce((sum, count) => sum + Math.max(0, count - 1), 0));
  const recipeMatchScore = alchemyRecipeMatchScore(recipe, selection.materialIds);
  const recipeMatchBonus = recipeMatchScore === 4 ? 0 : -(4 - recipeMatchScore) * 5;
  const unclampedRate = recipe.baseSuccessRate + fineCount * recipe.fineMaterialBonus + monsterBonus.total + quantityBonus + recipeMatchBonus + coinOption.bonus;
  return {
    selection, recipe, instance, coinOption,
    recipeSelectionValid:!!ALCHEMY_RECIPE_BY_ID[selection.recipeId], modeSelectionValid,
    coinOptionSelectionValid:!!selectedCoinOption, fineCount, monsterBonus, quantityBonus, recipeMatchScore,
    designated,
    resonanceCost:designated ? Number(recipe.designation.resonanceCost) || 0 : 0,
    coinCost:designated ? Number(recipe.designation.coinAmount) || 0 : coinOption.amount,
    rate:Math.max(recipe.minSuccessRate, Math.min(recipe.maxSuccessRate, unclampedRate))
  };
}
function validateAlchemyPlan(plan){
  const errors = [];
  const ins = plan.instance;
  if(!plan.recipeSelectionValid) errors.push('錬成レシピが正しく選択されていません。再選択してください。');
  if(!plan.modeSelectionValid) errors.push('錬成方法が正しく選択されていません。再選択してください。');
  if(plan.selection.mode === 'designated' && !plan.recipe.designation?.enabled) errors.push('このレシピは指定錬成の対象外です。');
  if(ins && (save.instances || []).length <= 1) errors.push('最後の所持モンスターは投入できません。');
  if(ins && (save.party || []).includes(ins.uid)) errors.push(`${by(ins.id)?.name || ins.id}はパーティー編成中です。`);
  if(ins && typeof isInstanceOnExpedition==='function' && isInstanceOnExpedition(ins.uid)) errors.push(`${by(ins.id)?.name || ins.id}は遠征中です。`);
  if(ins?.locked) errors.push(`${by(ins.id)?.name || ins.id}はロック中です。`);
  if(!plan.designated && !plan.coinOptionSelectionValid) errors.push('投入コイン帯が正しく選択されていません。再選択してください。');
  plan.selection.materialIds.forEach((itemId, index) => {
    const count = Number(plan.selection.materialCounts?.[index] || 0);
    const item = ITEM_BY_ID[itemId];
    if(!item?.alchemyMaterial){
      errors.push(`素材${index + 1}が正しく選択されていません。`);
      return;
    }
    if(count < 1){
      errors.push(`${item.name}の投入数を1個以上にしてください。`);
      return;
    }
    if(Number(save.items?.[itemId] || 0) < count) errors.push(`${item.name}が${count - Number(save.items?.[itemId] || 0)}個不足しています。`);
  });
  if(new Set(plan.selection.materialIds).size !== plan.selection.materialIds.length){
    errors.push('同じ素材を複数の枠には設定できません。');
  }
  if(plan.designated) plan.recipe.materialChoices.forEach((choice, index) => {
    const itemId = plan.selection.materialIds[index];
    if(itemId !== choice.normal && itemId !== choice.fine){
      errors.push(`指定錬成には${choice.label}が必要です。`);
    }
  });
  if((save.coins || 0) < plan.coinCost) errors.push(`コインが${plan.coinCost - (save.coins || 0)}枚不足しています。`);
  if(plan.designated && normalizeAlchemyResonance(save.alchemyResonance) < plan.resonanceCost){
    errors.push(`錬成残響が${plan.resonanceCost - normalizeAlchemyResonance(save.alchemyResonance)}不足しています。`);
  }
  const successCandidates = plan.designated ? designatedAlchemyCandidates(plan.recipe) : eligibleAlchemyCandidates(plan.recipe, true);
  if(!successCandidates.some(candidate => Number(candidate.weight) > 0)){
    errors.push('成功候補となる錬成限定種が登録されていません。');
  }
  if(!plan.designated && !alchemyFailureCandidates(plan.recipe, plan.coinOption).length){
    errors.push(`${plan.coinOption.label}では${alchemyFailureGuaranteeText(plan.coinOption)}を満たす外れ候補がないため、選択できません。`);
  }
  return [...new Set(errors)];
}
function alchemyMaterialOption(itemId){
  const item = ITEM_BY_ID[itemId];
  const count = Number(save.items?.[itemId] || 0);
  return `<option value="${itemId}">${item?.icon || '📦'} ${item?.name || itemId}（所持${count}）</option>`;
}
function alchemyWorkbenchMaterialOptions(selectedId){
  return SHOP_ITEMS.filter(item => item.alchemyMaterial).map(item => {
    const count = Number(save.items?.[item.id] || 0);
    return `<option value="${item.id}" ${item.id===selectedId?'selected':''}>${item.icon || '📦'} ${item.name}（${count}）</option>`;
  }).join('');
}
function alchemyTendency(plan){
  const bases = plan.selection.materialIds.map(alchemyBaseMaterialId);
  let label = '不定形の反応';
  if(bases.includes('raptor_feather') && bases.includes('venom_carapace')) label = '風・竜の反応';
  else if(bases.includes('magic_crystal') && bases.includes('metal_ore')) label = '鉱物・錬核の反応';
  if(plan.fineCount >= 2) label = `高純度／${label}`;
  if(plan.instance) label = `生命触媒／${label}`;
  return label;
}
function renderAlchemy(){
  ensureContractScrollItem();
  const root = document.getElementById('alchemyForm');
  if(!root) return;
  ensureAlchemyWorkbenchSelection();
  const eligible = alchemyEligibleInstances();
  if(selectedAlchemyCatalystUid && !eligible.some(ins => ins.uid === selectedAlchemyCatalystUid)) selectedAlchemyCatalystUid = '';
  const recipe = selectedAlchemyMode === 'designated'
    ? resolveAlchemyRecipe({recipeId:selectedAlchemyRecipeId})
    : inferAlchemyRecipe(selectedAlchemyMaterialIds);
  selectedAlchemyRecipeId = recipe.recipeId;
  const coinOption = recipe.coinOptions.find(option => option.id === selectedAlchemyCoinOptionId) || recipe.coinOptions.find(option => option.id === recipe.defaultCoinOptionId) || recipe.coinOptions[0];
  selectedAlchemyCoinOptionId = coinOption.id;
  root.innerHTML = `
    <div class="alchemy-workbench">
      <header class="alchemy-workbench-header">
        <div><span class="ui-eyebrow">ALCHEMY</span><h1>錬成</h1></div>
        <div class="alchemy-resources"><span>残響 <b>${save.alchemyResonance}</b></span><span>🪙 <b>${Number(save.coins || 0).toLocaleString('ja-JP')}</b></span></div>
        <button type="button" class="alchemy-guide-toggle" onclick="toggleAlchemyGuide()" aria-label="ルミナの説明を開く">✦ ルミナ</button>
      </header>
      <div class="alchemy-guide-overlay ${alchemyGuideOpen?'is-open':''}" role="dialog" aria-label="ルミナの錬成案内">
        <img src="${IMG.lumina_apprentice}" alt="見習い魔法使いルミナ">
        <div><b>ルミナ</b><p>素材の種類と数で、生まれる可能性が変わります。触媒モンスターは使わなくても錬成できますよ。</p></div>
        <button type="button" onclick="toggleAlchemyGuide(false)" aria-label="説明を閉じる">×</button>
      </div>
      <div class="alchemy-compact-modes">
        <label><input type="radio" name="alchemyMode" value="normal" onchange="selectAlchemyMode(this.value)" ${selectedAlchemyMode==='normal'?'checked':''}><span>通常錬成</span></label>
        <label><input type="radio" name="alchemyMode" value="designated" onchange="selectAlchemyMode(this.value)" ${selectedAlchemyMode==='designated'?'checked':''}><span>指定錬成</span></label>
        ${selectedAlchemyMode==='designated'?`<select id="alchemyRecipeSelect" onchange="selectAlchemyRecipe(this.value)" aria-label="指定錬成の対象">${ALCHEMY_RECIPES.map(entry=>`<option value="${entry.recipeId}" ${entry.recipeId===recipe.recipeId?'selected':''}>${entry.displayName}</option>`).join('')}</select>`:'<small>完成するモンスターは錬成後に判明</small>'}
      </div>
      <section class="alchemy-material-board">
        <div class="alchemy-section-title"><h2>投入素材</h2><small>種類と個数を選択</small></div>
        <div class="alchemy-workbench-materials">${selectedAlchemyMaterialIds.map((itemId,index) => {
          const item = ITEM_BY_ID[itemId];
          const owned = Number(save.items?.[itemId] || 0);
          const count = selectedAlchemyMaterialCounts[index];
          return `<div class="alchemy-material-row ${owned<count?'is-short':''}">
            <span class="alchemy-material-icon" aria-hidden="true">${item?.icon || '📦'}</span>
            <label><select onchange="selectAlchemyWorkbenchMaterial(${index},this.value)" aria-label="素材${index+1}">${alchemyWorkbenchMaterialOptions(itemId)}</select><small>所持 ${owned}${owned<count?'・不足':''}</small></label>
            <div class="alchemy-quantity"><button type="button" onclick="changeAlchemyMaterialCount(${index},-1)" aria-label="${item?.name || '素材'}を減らす">−</button><strong>${count}</strong><button type="button" onclick="changeAlchemyMaterialCount(${index},1)" aria-label="${item?.name || '素材'}を増やす">＋</button></div>
          </div>`;
        }).join('')}</div>
      </section>
      <div class="alchemy-input-strip">
        <label class="alchemy-catalyst"><span>触媒モンスター <small>任意</small></span><select id="alchemyMonsterSelect" onchange="selectAlchemyCatalyst(this.value)"><option value="">使用しない</option>${eligible.map(ins => `<option value="${ins.uid}" ${ins.uid===selectedAlchemyCatalystUid?'selected':''}>${by(ins.id)?.name || ins.id} Lv.${ins.level || 1}</option>`).join('')}</select></label>
        <fieldset class="alchemy-coin-compact"><legend>投入コイン</legend>${selectedAlchemyMode==='normal'?recipe.coinOptions.map(option => {
          const failureCount = eligibleAlchemyCandidates(recipe, false, option).length;
          return `<label><input type="radio" name="alchemyCoin" value="${option.id}" onchange="selectAlchemyCoin(this.value)" ${option.id===selectedAlchemyCoinOptionId?'checked':''} ${failureCount?'':'disabled'}><span>🪙 ${option.amount}</span></label>`;
        }).join(''):`<strong>🪙 ${recipe.designation.coinAmount}＋残響${recipe.designation.resonanceCost}</strong>`}</fieldset>
      </div>
      <div id="alchemyPreview"></div>
    </div>`;
  updateAlchemyPreview();
}
function updateAlchemyPreview(){
  const preview = document.getElementById('alchemyPreview');
  if(!preview) return;
  const plan = alchemyPlan();
  const errors = validateAlchemyPlan(plan);
  preview.innerHTML = `<section class="alchemy-forecast">
    <div class="alchemy-forecast-mark">?</div>
    <div class="alchemy-forecast-copy"><span>${plan.designated?'指定錬成':'成功率'} <strong>${plan.designated?'確定':`${plan.rate}%`}</strong></span><p>錬成傾向：<b>${alchemyTendency(plan)}</b></p></div>
    <details><summary>判定の詳細</summary><p>${plan.designated?`${plan.recipe.displayName}を指定して確定錬成します。`:`素材一致 ${plan.recipeMatchScore}/4・品質補正 +${plan.fineCount*plan.recipe.fineMaterialBonus}%・数量補正 +${plan.quantityBonus}%・触媒補正 +${plan.monsterBonus.total}%・${alchemyFailureGuaranteeText(plan.coinOption)}`}</p>${errors.length?`<div class="alchemy-errors">${errors.map(error=>`<p>❌ ${error}</p>`).join('')}</div>`:''}</details>
    <button class="alchemy-start-button" onclick="openAlchemyConfirmation()" ${errors.length || alchemyBusy?'disabled':''}>✦ 錬成開始</button>
  </section>`;
}
function openAlchemyConfirmation(){
  const plan = alchemyPlan();
  const errors = validateAlchemyPlan(plan);
  if(errors.length){ updateAlchemyPreview(); return; }
  const target = document.getElementById('alchemyConfirmContent');
  if(!target) return;
  target.innerHTML = `<div class="alchemy-confirm-card">
    ${plan.instance ? vis(by(plan.instance.id)) : '<div class="alchemy-core">⚗</div>'}
    <h2>${plan.designated?`指定錬成：${plan.recipe.displayName}`:'通常錬成の最終確認'}</h2>
    <p><b>触媒：</b>${plan.instance ? alchemyInstanceLabel(plan.instance) : '使用しない'}</p>
    <p>${plan.selection.materialIds.map((id,index)=>`${ITEM_BY_ID[id].name} ×${plan.selection.materialCounts[index]}`).join(' / ')}</p>
    ${plan.designated
      ? `<p><b>指定対象：</b>${plan.recipe.displayName}</p><p><b>投入コイン：</b>${plan.coinCost}枚</p><p><b>結果：</b>確定成功</p><p><b>個体型：</b>${(ALCHEMY_MONSTER_CONFIGS[designatedAlchemyCandidates(plan.recipe)[0]?.monsterId]?.archetypes||[]).map(type=>type.label).join('・')}から等確率</p>`
      : `<p><b>投入コイン：</b>${plan.coinOption.amount}枚</p><p><b>成功率：</b>${plan.rate}%</p><p><b>錬成傾向：</b>${alchemyTendency(plan)}</p><p class="alchemy-guarantee"><b>結果は錬成完了まで不明です。</b></p>`}
    ${alchemyResonanceStatus(plan)}
    <p class="alchemy-warning">この操作を確定すると、素材・コイン${plan.instance?'・触媒モンスター':''}${plan.designated?'・錬成残響':''}を消費します。元には戻せません。</p>
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

    plan.selection.materialIds.forEach((id,index) => { save.items[id] -= plan.selection.materialCounts[index]; });
    save.coins -= plan.coinCost;
    if(plan.designated) save.alchemyResonance = normalizeAlchemyResonance(save.alchemyResonance) - plan.resonanceCost;
    if(plan.instance){
      save.instances = save.instances.filter(ins => ins.uid !== plan.instance.uid);
      if(save.equippedSkills) delete save.equippedSkills[plan.instance.uid];
    }

    const success = plan.designated || rollAlchemySuccess(plan);
    const candidate = plan.designated
      ? rollWeightedAlchemyCandidate(designatedAlchemyCandidates(plan.recipe))
      : rollAlchemyResultCandidate(plan.recipe, success, plan.coinOption);
    const resonanceGain = !success && candidate?.alchemyInstance === false ? alchemyResonanceOnFailure(plan.coinOption) : 0;
    if(resonanceGain > 0) save.alchemyResonance = normalizeAlchemyResonance(save.alchemyResonance) + resonanceGain;
    const {resultMonster, resultInstance, archetype} = createAlchemyResultInstance(candidate);
    saveGame();

    const content = document.getElementById('alchemyResultContent');
    const modifierHtml = archetype ? instanceAlchemySummary(resultInstance) : '<p class="small">通常モンスターとして完成しました。</p>';
    content.innerHTML = `<div class="alchemy-result-card ${success?'success':'fallback'}">
      <p class="alchemy-result-label">${plan.designated?'✨ 指定錬成成功！':success?'✨ 錬成成功！':'🔹 通常個体が完成'}</p>
      ${vis(resultMonster)}<h1>${resultMonster.name}</h1>
      <p>Lv.1 / ${typesHtml(resultMonster.types)} / 個体ID ${String(resultInstance.uid).slice(-8)}</p>
      ${modifierHtml}
      ${candidate?.alchemyInstance?`<p><b>専用技：</b>${resultMonster.moves.filter((_,index)=>(ALCHEMY_MONSTER_CONFIGS[resultMonster.id]?.exclusiveMoveIndexes||[]).includes(index)).map(move=>`${skillTypeLabel(moveTypes(move))} ${move[0]}（威力${move[1]}・${moveEffectText(move)}）`).join('')}</p>`:''}
      ${resonanceGain>0?`<p class="alchemy-resonance-gain"><b>錬成残響を${resonanceGain}獲得</b><br>残響合計：${save.alchemyResonance}</p>`:''}
      <button onclick="show('party')">完成個体を手持ちで確認</button>
      <button onclick="showAlchemy()" class="secondary-button">もう一度錬成する</button>
    </div>`;
    if(typeof replayUiMotion==='function')replayUiMotion(content.firstElementChild,'ui-reward-pop',1000);
    if(typeof showUiNotice==='function')showUiNotice(`${resultMonster.name}が完成！`);
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
