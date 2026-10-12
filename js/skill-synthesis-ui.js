/* Material picker and presentation. Draw and durable inventory transaction live in skill-synthesis.js. */
let skillSynthesisUiBusy=false;
let skillSynthesisUiTier='synth_tier_low_v1';
let skillSynthesisUiSelection={};
let skillSynthesisUiOwner=null;
let skillSynthesisUiResult=null;
function skillSynthesisRecipeMarkup(recipe){return `${recipe.label}の技カード ×${recipe.required}`;}
function skillSynthesisOddsMarkup(recipe){return recipe.outcomes.map(outcome=>`${skillSynthesisTierLabel(outcome.tier)} ${Math.round(outcome.chance*100)}％`).join(' ／ ');}
function showSkillSynthesis(){show('skillSynthesis');}
function selectSkillSynthesisTier(recipeId){
  if(skillSynthesisUiBusy||!SKILL_SYNTHESIS_TIERS.some(recipe=>recipe.id===recipeId))return;
  skillSynthesisUiTier=recipeId;skillSynthesisUiSelection={};skillSynthesisUiResult=null;renderSkillSynthesis();
  document.querySelector?.(`[data-synthesis-id="${recipeId}"]`)?.focus?.({preventScroll:true});
}
function changeSkillSynthesisMaterial(id,delta){
  if(skillSynthesisUiBusy||![1,-1].includes(delta))return;
  const recipe=SKILL_SYNTHESIS_TIERS.find(recipe=>recipe.id===skillSynthesisUiTier);
  if(!skillSynthesisPool(recipe.tier).some(card=>card.id===id))return;
  const total=Object.values(skillSynthesisUiSelection).reduce((sum,n)=>sum+n,0);
  const n=(skillSynthesisUiSelection[id]||0)+delta,owned=Number(save.skillCards?.[id])||0;
  if(n<0||n>owned||(delta>0&&total>=recipe.required))return;
  if(n)skillSynthesisUiSelection[id]=n;else delete skillSynthesisUiSelection[id];
  renderSkillSynthesis();
  document.getElementById(`synthesis-${delta>0?'add':'remove'}-${id}`)?.focus?.({preventScroll:true});
}
function renderSkillSynthesis(){
  const list=document.getElementById('skillSynthesisList');if(!list)return;
  if(skillSynthesisUiOwner!==save){skillSynthesisUiOwner=save;skillSynthesisUiSelection={};skillSynthesisUiResult=null;}
  const recipe=SKILL_SYNTHESIS_TIERS.find(recipe=>recipe.id===skillSynthesisUiTier)||SKILL_SYNTHESIS_TIERS[0];
  const pool=skillSynthesisPool(recipe.tier);
  // Selection is UI-only; stale inventory never silently changes what will be consumed.
  const total=Object.values(skillSynthesisUiSelection).reduce((sum,n)=>sum+n,0);
  const preview=previewSkillSynthesis(recipe.id,skillSynthesisUiSelection);
  const tiers=SKILL_SYNTHESIS_TIERS.map(entry=>`<button type="button" data-synthesis-id="${entry.id}" aria-pressed="${entry.id===recipe.id}" onclick="selectSkillSynthesisTier('${entry.id}')" ${skillSynthesisUiBusy?'disabled':''}><strong>${entry.label}合成</strong><small>素材${entry.required}枚 → 1枚</small></button>`).join('');
  const materials=pool.filter(card=>Number(save.skillCards?.[card.id])>0).map(card=>{
    const selected=skillSynthesisUiSelection[card.id]||0,owned=Number(save.skillCards[card.id]),equipped=countEquippedSkill(card.id);
    return `<article class="panel synthesis-material" data-synthesis-material="${card.id}"><strong>${card.name}</strong><small>${skillTypes(card).map(type=>TN[type]||type).join(' / ')} · COST ${card.cost}</small><p>所持 ${owned}枚 ／ 装備 ${equipped}枚</p><div class="synthesis-quantity"><button id="synthesis-remove-${card.id}" type="button" aria-label="${card.name}の素材を1枚減らす" onclick="changeSkillSynthesisMaterial('${card.id}',-1)" ${!selected||skillSynthesisUiBusy?'disabled':''}>−</button><span aria-label="選択枚数" data-selected-count="${card.id}">${selected}</span><button id="synthesis-add-${card.id}" type="button" aria-label="${card.name}の素材を1枚増やす" onclick="changeSkillSynthesisMaterial('${card.id}',1)" ${selected>=owned||total>=recipe.required||skillSynthesisUiBusy?'disabled':''}>＋</button></div></article>`;
  }).join('');
  const candidates=recipe.outcomes.map(outcome=>{
    const candidates=skillSynthesisPool(outcome.tier),percent=outcome.chance*100/candidates.length;
    return `<h3>${skillSynthesisTierLabel(outcome.tier)}（${candidates.length}種類）</h3><p>1技あたり ${(Math.round(percent*10000)/10000).toLocaleString('ja-JP',{maximumFractionDigits:4})}％</p><p>${candidates.map(card=>card.name).join('、')}</p>`;
  }).join('');
  const selectedText=Object.entries(skillSynthesisUiSelection).map(([id,n])=>`${SKILL_BY_ID[id]?.name||id} ×${n}`).join(' ＋ ')||'素材を選んでください。';
  const result=skillSynthesisUiResult?.ok?SKILL_BY_ID[skillSynthesisUiResult.resultId]:null;
  list.innerHTML=`<div class="synthesis-tier-picker" role="group" aria-label="合成する級">${tiers}</div><article class="panel synthesis-rules"><h2>${recipe.label}合成</h2><p>${skillSynthesisOddsMarkup(recipe)}</p><p>同じ級の技カード${recipe.required}枚を消費し、ランダムな技1枚を獲得します。追加コイン不要・降格なし。</p><p class="small">技名・属性・COSTは素材の条件になりません。同じ技を複数枚使用できます。級内は均等抽選で、素材や所持済みの技も出ます。毎回独立した抽選で、天井はありません。</p><details><summary>完成候補と1技あたりの確率</summary>${candidates}</details></article>${result?`<article id="skillSynthesisResult" class="panel skill-synthesis-card synthesis-result" role="status" aria-live="polite"><span class="synthesis-flash" aria-hidden="true">✧</span><p class="synthesis-result-tier">${skillSynthesisTierLabel(skillSynthesisTierOf(result))}の技が完成！</p><div class="synthesis-result-card">${skillCardHeader(result)}${skillCardStats(result)}<p>${result.customDesc||result.description||''}</p><details><summary>詳しい効果</summary><p>${result.detailedDesc||''}</p></details><strong>1枚獲得しました</strong></div></article>`:''}<div class="synthesis-selection" role="status" aria-live="polite"><strong>素材選択 ${total} / ${recipe.required}枚</strong><p>${selectedText}</p></div><div class="synthesis-material-grid">${materials||'<p class="panel">この級の技カードを持っていません。</p>'}</div><article class="panel synthesis-confirm-panel"><p>素材${recipe.required}枚を消費し、ランダムな技1枚を獲得</p><p>${skillSynthesisOddsMarkup(recipe)}</p><button id="skillSynthesisSubmit" type="button" onclick="confirmSkillSynthesis()" ${!preview.ok||skillSynthesisUiBusy?'disabled':''}>${preview.ok?'選んだ素材で合成する':preview.reason||'素材を選んでください'}</button></article>`;
}
function confirmSkillSynthesis(){
  if(skillSynthesisUiBusy)return;
  if(skillSynthesisUiOwner!==save){renderSkillSynthesis();showUiNotice('所持内容が変わりました。素材を選び直してください。','error');return;}
  const selection={...skillSynthesisUiSelection},preview=previewSkillSynthesis(skillSynthesisUiTier,selection);
  if(!preview.ok){showUiNotice(preview.reason||'合成できません。','error');renderSkillSynthesis();return;}
  const changes=preview.equipmentChanges||[];
  const impact=changes.length?'\n\n素材の消費により次の装備が外れます。\n'+changes.map(change=>`${by(change.monsterId)?.name||change.monsterId}（${change.uid}）: ${SKILL_BY_ID[change.skillId]?.name||change.skillId}・枠${change.slot+1}`).join('\n'):'';
  const names=preview.materials.map(material=>`${SKILL_BY_ID[material.id].name} ×${material.required}`).join(' ＋ ');
  if(!confirm(`${names}\n\n${preview.recipe.required}枚を消費し、ランダムな技を1枚獲得します。\n${skillSynthesisOddsMarkup(preview.recipe)}\n級内は均等抽選・素材と同じ技も排出・追加コイン不要。${impact}\n\n合成しますか？`))return;
  skillSynthesisUiBusy=true;
  try{
    const completed=executeSkillSynthesis(preview.recipe.id,{selection,confirmEquipment:changes.length>0,token:preview.token});
    skillSynthesisUiOwner=save;
    if(completed.ok){skillSynthesisUiSelection={};skillSynthesisUiResult=completed;}
    showUiNotice(completed.ok?`${SKILL_BY_ID[completed.resultId].name}を1枚合成しました。`:completed.reason||'合成を保存できませんでした。',completed.ok?'success':'error');
  }catch(error){showUiNotice('合成を完了できませんでした。所持数を確認してください。','error');}
  finally{skillSynthesisUiBusy=false;renderSkillSynthesis();}
  if(skillSynthesisUiResult?.ok)document.getElementById('skillSynthesisResult')?.scrollIntoView?.({behavior:'smooth',block:'center'});
}
