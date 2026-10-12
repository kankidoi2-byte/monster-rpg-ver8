/* Historical recipe IDs remain readable; new synthesis uses tier recipes only. */
const SKILL110_SYNTHESIS_RECIPES = Object.freeze([
  {id:'synth110_107',resultId:'s110_107',materials:['s110_091','s110_094']},
  {id:'synth110_108',resultId:'s110_108',materials:['s110_092','s110_093']},
  {id:'synth110_109',resultId:'s110_109',materials:['s110_101','s110_095']},
  {id:'synth110_110',resultId:'s110_110',materials:['s110_100','s110_102']}
].map(recipe => Object.freeze({...recipe,materials:Object.freeze(recipe.materials)})));
const SKILL_SYNTHESIS_TIERS = Object.freeze([
  {id:'synth_tier_low_v1',tier:'low',label:'低級',required:3,outcomes:[{tier:'low',chance:.7},{tier:'high',chance:.3}]},
  {id:'synth_tier_high_v1',tier:'high',label:'上級',required:3,outcomes:[{tier:'high',chance:.75},{tier:'super',chance:.25}]},
  {id:'synth_tier_super_v1',tier:'super',label:'超級',required:3,outcomes:[{tier:'super',chance:.9},{tier:'ultimate',chance:.1}]},
  {id:'synth_tier_ultimate_v1',tier:'ultimate',label:'最強',required:2,outcomes:[{tier:'ultimate',chance:1}]}
].map(recipe=>Object.freeze({...recipe,outcomes:Object.freeze(recipe.outcomes.map(Object.freeze))})));
function skillSynthesisTierOf(card){return card?.cost===25?'ultimate':card?.cost>10?'super':card?.cost>5?'high':'low';}
function skillSynthesisPool(tier){return EQUIPPABLE_MOVE_CARDS.filter(card=>/^s110_\d{3}$/.test(card.id)&&!card.deprecated&&skillSynthesisTierOf(card)===tier);}
function skillSynthesisTierLabel(tier){return SKILL_SYNTHESIS_TIERS.find(recipe=>recipe.tier===tier)?.label||'';}
let skillSynthesisBusy = false;
const skillSynthesisPreviews = new Map();
let skillSynthesisPreviewSequence=0;
function skillSynthesisStateKey(){
  return JSON.stringify([save.skillCards || {},save.equippedSkills || {},(save.instances || []).map(ins=>[ins.uid,ins.id]),save.skillSynthesis?.sequence || 0]);
}
function skillSynthesisRecipe(value){
  if (Array.isArray(value)) return SKILL110_SYNTHESIS_RECIPES.find(recipe => [...recipe.materials].sort().join('|') === [...value].sort().join('|'));
  return SKILL110_SYNTHESIS_RECIPES.find(recipe => recipe.id === value || recipe.resultId === value);
}
function skillSynthesisPlan(value,selection={}){
  const recipe = SKILL_SYNTHESIS_TIERS.find(recipe=>recipe.id===value);
  if (!recipe) return {ok:false,reason:'対応する合成レシピがありません。'};
  if(!selection||typeof selection!=='object'||Array.isArray(selection))return {ok:false,reason:'素材を選んでください。'};
  const entries=Object.entries(selection).sort(([a],[b])=>a.localeCompare(b));
  if(entries.some(([id,n])=>!Number.isSafeInteger(n)||n<=0||!skillSynthesisPool(recipe.tier).some(card=>card.id===id)))return {ok:false,reason:'同じ級の有効な技カードを選んでください。'};
  const materials = entries.map(([id,required])=>({id,required,owned:Math.max(0,Math.floor(Number(save.skillCards?.[id])||0)),equipped:countEquippedSkill(id)}));
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
  const total=materials.reduce((sum,material)=>sum+material.required,0);
  const enough=total===recipe.required&&materials.every(material=>material.owned>=material.required);
  const poolsValid=recipe.outcomes.every(outcome=>skillSynthesisPool(outcome.tier).length>0);
  return {ok:enough&&poolsValid,reason:!poolsValid?'完成技の候補がありません。':total!==recipe.required?`${recipe.label}の技カードを${recipe.required}枚選んでください。`:enough?'':'素材の技カードが足りません。',recipe,materials,equipmentChanges};
}
function previewSkillSynthesis(recipeId,selection={}){
  const plan = skillSynthesisPlan(recipeId,selection);
  if (!plan.recipe) return plan;
  const stateKey = skillSynthesisStateKey();
  // Re-rendering a recipe reuses its current token; obsolete previews cannot commit.
  const selectionKey=JSON.stringify(plan.materials.map(material=>[material.id,material.required]));
  let entry = [...skillSynthesisPreviews.entries()].find(([,value])=>value.recipeId===plan.recipe.id&&value.stateKey===stateKey&&value.selectionKey===selectionKey&&value.saveObject===save);
  if (!entry) {
    const token = `craft110_${Date.now().toString(36)}_${(++skillSynthesisPreviewSequence).toString(36)}`;
    entry = [token,{recipeId:plan.recipe.id,stateKey,selectionKey,saveObject:save}];
    if (skillSynthesisPreviews.size > 32) skillSynthesisPreviews.clear();
    skillSynthesisPreviews.set(...entry);
  }
  return {...plan,token:entry[0]};
}
function executeSkillSynthesis(recipeId,{selection={},confirmEquipment=false,token,rng=Math.random}={}){
  if (skillSynthesisBusy) return {ok:false,reason:'合成を保存中です。'};
  const plan = skillSynthesisPlan(recipeId,selection), preview = skillSynthesisPreviews.get(token);
  if (!plan.ok) return plan;
  if (!preview || preview.recipeId !== plan.recipe.id || preview.stateKey !== skillSynthesisStateKey()||preview.saveObject!==save||preview.selectionKey!==JSON.stringify(plan.materials.map(material=>[material.id,material.required]))) {
    return {ok:false,reason:'所持・装備内容が変わりました。もう一度素材を確認してください。'};
  }
  if (plan.equipmentChanges.length && confirmEquipment !== true) return {...plan,ok:false,reason:'装備から外れる技と仲間を確認してください。',needsEquipmentConfirmation:true};
  skillSynthesisBusy = true;
  const previous = JSON.parse(JSON.stringify(save));
  try {
    // Roll only after validation/confirmation. Failed persistence retries retain the same draw.
    if(!preview.resultId){
      const rankRoll=rng(),cardRoll=rng();
      if(!Number.isFinite(rankRoll)||rankRoll<0||rankRoll>=1||!Number.isFinite(cardRoll)||cardRoll<0||cardRoll>=1)throw Error('抽選値が無効です。');
      let cumulative=0;
      const outcome=plan.recipe.outcomes.find(entry=>{cumulative+=entry.chance;return rankRoll<cumulative;})||plan.recipe.outcomes.at(-1);
      const pool=skillSynthesisPool(outcome.tier);
      preview.resultId=pool[Math.floor(cardRoll*pool.length)].id;
    }
    plan.materials.forEach(material => { save.skillCards[material.id] -= material.required; });
    const removed = new Map();
    plan.equipmentChanges.forEach(change => {
      if (!removed.has(change.uid)) removed.set(change.uid,new Set());
      removed.get(change.uid).add(change.slot);
    });
    removed.forEach((slots,uid) => { save.equippedSkills[uid] = save.equippedSkills[uid].filter((_,slot)=>!slots.has(slot)); });
    const resultId = preview.resultId;
    save.skillCards[resultId] = Math.max(0,Math.floor(Number(save.skillCards[resultId]) || 0)) + 1;
    save.skillSynthesis = {...save.skillSynthesis,version:2,sequence:(Number(save.skillSynthesis?.sequence) || 0)+1,lastTransaction:token,lastRecipeId:plan.recipe.id,lastResultId:resultId};
    if (saveGame() !== true) {
      save = previous;
      preview.saveObject=save;
      return {ok:false,reason:'保存できなかったため、素材・装備・完成技を元に戻しました。'};
    }
    skillSynthesisPreviews.clear();
    return {ok:true,resultId,recipe:plan.recipe,equipmentChanges:plan.equipmentChanges};
  } catch (error) {
    save = previous;
    preview.saveObject=save;
    return {ok:false,reason:`合成を中止し、変更を元に戻しました。${error.message || ''}`};
  } finally { skillSynthesisBusy = false; }
}
