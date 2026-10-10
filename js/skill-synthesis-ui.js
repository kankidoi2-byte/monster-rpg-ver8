/* Presentation only: inventory transaction and persistence live in skill-synthesis.js. */
let skillSynthesisUiBusy=false;
function skillSynthesisRecipeFor(id){return SKILL110_SYNTHESIS_RECIPES.find(recipe=>recipe.resultId===id);}
function skillSynthesisRecipeMarkup(recipe){
  return recipe.materials.map(id=>`${SKILL_BY_ID[id]?.name||id} ×1`).join(' ＋ ');
}
function showSkillSynthesis(){show('skillSynthesis');}
function renderSkillSynthesis(){
  const list=document.getElementById('skillSynthesisList');if(!list)return;
  list.innerHTML=SKILL110_SYNTHESIS_RECIPES.map(recipe=>{
    const card=SKILL_BY_ID[recipe.resultId],preview=previewSkillSynthesis(recipe.id);
    const materials=preview.materials.map(material=>`<li>${SKILL_BY_ID[material.id]?.name||material.id}<span>必要 ${material.required} / 所持 ${material.owned}</span></li>`).join('');
    return `<article class="panel skill-synthesis-card">${skillCardHeader(card)}${skillCardStats(card)}<p>${card.customDesc||card.description||''}</p><details><summary>詳しい効果</summary><p>${card.detailedDesc||''}</p></details><ul class="skill-synthesis-materials">${materials}</ul><p class="small">成功率100%・追加コイン不要。素材を各1枚消費します。</p><button type="button" data-synthesis-id="${recipe.id}" onclick="confirmSkillSynthesis('${recipe.id}')" ${!preview.ok||skillSynthesisUiBusy?'disabled':''}>${preview.ok?'1枚合成する':preview.reason||'素材が足りません'}</button></article>`;
  }).join('');
}
function confirmSkillSynthesis(recipeId){
  if(skillSynthesisUiBusy)return;
  const preview=previewSkillSynthesis(recipeId);
  if(!preview.ok){showUiNotice(preview.reason||'合成できません。','error');renderSkillSynthesis();return;}
  const result=SKILL_BY_ID[preview.recipe.resultId];
  const changes=preview.equipmentChanges||[];
  const impact=changes.length?'\n\n素材の消費により次の装備が調整されます。\n'+changes.map(change=>`${by(change.monsterId)?.name||change.monsterId}（${change.uid}）: ${SKILL_BY_ID[change.skillId]?.name||change.skillId}`).join('\n'):'';
  if(!confirm(`${skillSynthesisRecipeMarkup(preview.recipe)}を消費して、${result.name}を1枚合成します。${impact}\n\n合成しますか？`))return;
  skillSynthesisUiBusy=true;
  try{
    const completed=executeSkillSynthesis(recipeId,{confirmEquipment:changes.length>0,token:preview.token});
    showUiNotice(completed.ok?`${result.name}を1枚合成しました。`:completed.reason||'合成を保存できませんでした。',completed.ok?'success':'error');
  }catch(error){showUiNotice('合成を完了できませんでした。所持数を確認してください。','error');}
  finally{skillSynthesisUiBusy=false;renderSkillSynthesis();}
}
