/* Four deterministic recipes; inventory + equipment + result commit in one save write. */
const SKILL110_SYNTHESIS_RECIPES = Object.freeze([
  {id:'synth110_107',resultId:'s110_107',materials:['s110_091','s110_094']},
  {id:'synth110_108',resultId:'s110_108',materials:['s110_092','s110_093']},
  {id:'synth110_109',resultId:'s110_109',materials:['s110_101','s110_095']},
  {id:'synth110_110',resultId:'s110_110',materials:['s110_100','s110_102']}
].map(recipe => Object.freeze({...recipe,materials:Object.freeze(recipe.materials)})));
let skillSynthesisBusy = false;
const skillSynthesisPreviews = new Map();
function skillSynthesisStateKey(){
  return JSON.stringify([save.skillCards || {},save.equippedSkills || {},(save.instances || []).map(ins=>[ins.uid,ins.id]),save.skillSynthesis?.sequence || 0]);
}
function skillSynthesisRecipe(value){
  if (Array.isArray(value)) return SKILL110_SYNTHESIS_RECIPES.find(recipe => [...recipe.materials].sort().join('|') === [...value].sort().join('|'));
  return SKILL110_SYNTHESIS_RECIPES.find(recipe => recipe.id === value || recipe.resultId === value);
}
function skillSynthesisPlan(value){
  const recipe = skillSynthesisRecipe(value);
  if (!recipe) return {ok:false,reason:'対応する合成レシピがありません。'};
  const materials = recipe.materials.map(id => ({id,required:1,owned:Math.max(0,Math.floor(Number(save.skillCards?.[id]) || 0)),equipped:countEquippedSkill(id)}));
  const equipmentChanges = [];
  materials.forEach(material => {
    let toRemove = Math.max(0,material.equipped - Math.max(0,material.owned-material.required));
    Object.entries(save.equippedSkills || {}).forEach(([uid,ids]) => {
      if (!Array.isArray(ids)) return;
      ids.forEach((id,slot) => {
        if (id === material.id && toRemove > 0) {
          equipmentChanges.push({uid,monsterId:(save.instances || []).find(ins => ins.uid === uid)?.id || null,skillId:id,slot});
          toRemove--;
        }
      });
    });
  });
  const enough = materials.every(material => material.owned >= material.required);
  return {ok:enough,reason:enough?'':'素材の技カードが足りません。',recipe,materials,equipmentChanges};
}
function previewSkillSynthesis(recipeId){
  const plan = skillSynthesisPlan(recipeId);
  if (!plan.recipe) return plan;
  const stateKey = skillSynthesisStateKey();
  // Re-rendering a recipe reuses its current token; obsolete previews cannot commit.
  let entry = [...skillSynthesisPreviews.entries()].find(([,value])=>value.recipeId===plan.recipe.id&&value.stateKey===stateKey);
  if (!entry) {
    const token = `craft110_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    entry = [token,{recipeId:plan.recipe.id,stateKey}];
    if (skillSynthesisPreviews.size > 32) skillSynthesisPreviews.clear();
    skillSynthesisPreviews.set(...entry);
  }
  return {...plan,token:entry[0]};
}
function executeSkillSynthesis(recipeId,{confirmEquipment=false,token}={}){
  if (skillSynthesisBusy) return {ok:false,reason:'合成を保存中です。'};
  const plan = skillSynthesisPlan(recipeId), preview = skillSynthesisPreviews.get(token);
  if (!plan.ok) return plan;
  if (!preview || preview.recipeId !== plan.recipe.id || preview.stateKey !== skillSynthesisStateKey()) {
    return {ok:false,reason:'所持・装備内容が変わりました。もう一度素材を確認してください。'};
  }
  if (plan.equipmentChanges.length && confirmEquipment !== true) return {...plan,ok:false,reason:'装備から外れる技と仲間を確認してください。',needsEquipmentConfirmation:true};
  skillSynthesisBusy = true;
  const previous = JSON.parse(JSON.stringify(save));
  try {
    plan.materials.forEach(material => { save.skillCards[material.id] -= material.required; });
    const removed = new Map();
    plan.equipmentChanges.forEach(change => {
      if (!removed.has(change.uid)) removed.set(change.uid,new Set());
      removed.get(change.uid).add(change.slot);
    });
    removed.forEach((slots,uid) => { save.equippedSkills[uid] = save.equippedSkills[uid].filter((_,slot)=>!slots.has(slot)); });
    const resultId = plan.recipe.resultId;
    save.skillCards[resultId] = Math.max(0,Math.floor(Number(save.skillCards[resultId]) || 0)) + 1;
    save.skillSynthesis = {version:1,sequence:(Number(save.skillSynthesis?.sequence) || 0)+1,lastTransaction:token,lastRecipeId:plan.recipe.id};
    if (saveGame() !== true) {
      save = previous;
      return {ok:false,reason:'保存できなかったため、素材・装備・完成技を元に戻しました。'};
    }
    skillSynthesisPreviews.clear();
    return {ok:true,resultId,recipe:plan.recipe,equipmentChanges:plan.equipmentChanges};
  } catch (error) {
    save = previous;
    return {ok:false,reason:`合成を中止し、変更を元に戻しました。${error.message || ''}`};
  } finally { skillSynthesisBusy = false; }
}
