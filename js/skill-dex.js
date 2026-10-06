/* Read-only encyclopedia: derive performance and eligibility from runtime rules. */
const SKILL_DEX_TYPE_ORDER = ['fire','water','grass','thunder','wind','light','dark','star','dragon','normal'];
let skillDexSelectedId = null;
function skillDexEntries(){return EQUIPPABLE_MOVE_CARDS;}
function skillDexEffectKeys(sk){
  const keys=new Set();
  if(sk.effect)keys.add(sk.effect);
  Object.keys(sk.tactical||{}).forEach(key=>{if(sk.tactical[key])keys.add(key);});
  if(keys.has('drain')||keys.has('heal'))keys.add('recovery');
  if(keys.has('recoil')||keys.has('alchemy_recoil'))keys.add('recoil');
  if(['poison','paralysis','confusion','sleep','blind'].some(key=>keys.has(key)))keys.add('status');
  if(keys.has('flare_charge'))keys.add('charge');
  if(keys.has('guard')||keys.has('aqua_shield'))keys.add('defense');
  return keys;
}
function skillDexQueryEntries({query='',type='',cost='',kind='',effect='',sort='type'}={}){
  const needle=query.trim().toLocaleLowerCase('ja-JP');
  const rank=sk=>SKILL_DEX_TYPE_ORDER.indexOf(skillTypes(sk)[0]);
  return skillDexEntries().filter(sk=>(!needle||sk.name.toLocaleLowerCase('ja-JP').includes(needle))&&
    (!type||skillTypes(sk).includes(type))&&(!cost||sk.cost===Number(cost))&&
    (!kind||(kind==='attack'?sk.power>0:sk.power===0))&&(!effect||skillDexEffectKeys(sk).has(effect)))
    .slice().sort((a,b)=>(sort==='cost'?a.cost-b.cost:sort==='power'?b.power-a.power:rank(a)-rank(b))||a.name.localeCompare(b.name,'ja')||a.id.localeCompare(b.id));
}
function skillDexLearners(sk){
  return M.filter(m=>(m.moves||[]).some(mv=>canonicalSkillId(skillIdFromMove(mv))===sk.id));
}
function skillDexEligibleUnits(sk){return M.filter(m=>isSkillAllowedForMonster(sk.id,m));}
function skillDexUnitLinks(units){
  return units.length?units.map(m=>`<button class="skill-dex-unit" onclick="openUnitFromSkillDex('${m.id}')">${m.name}<small>${m.rarity} · ${m.chapter||'序章'}</small></button>`).join(''):'<p class="small">該当するキャラはいません。</p>';
}
function renderSkillDex(){
  const list=document.getElementById('skillDexList');if(!list)return;
  const get=id=>document.getElementById(id)?.value||'';
  const entries=skillDexQueryEntries({query:get('skillDexSearch'),type:get('skillDexType'),cost:get('skillDexCost'),kind:get('skillDexKind'),effect:get('skillDexEffect'),sort:get('skillDexSort')});
  document.getElementById('skillDexCount').textContent=`${entries.length} / ${skillDexEntries().length} 技`;
  list.innerHTML=entries.length?entries.map(sk=>`<button class="move-box skill-dex-card ${skillCardClass(skillTypes(sk))}" data-skill-dex-id="${sk.id}" onclick="showSkillDexDetail('${sk.id}')">${skillCardHeader(sk)}${skillCardStats(sk)}<small>詳細を見る ›</small></button>`).join(''):'<p class="panel">条件に合う技はありません。検索条件を変更してください。</p>';
  if(skillDexSelectedId)showSkillDexDetail(skillDexSelectedId,false);
}
function showSkillDexDetail(id,focus=true){
  const sk=SKILL_BY_ID[canonicalSkillId(id)],detail=document.getElementById('skillDexDetail');if(!sk||!detail)return;
  skillDexSelectedId=sk.id;
  const learners=skillDexLearners(sk),eligible=skillDexEligibleUnits(sk);
  detail.innerHTML=`<article class="panel ${skillCardClass(skillTypes(sk))}">${skillCardHeader(sk)}${skillCardStats(sk)}${skillCardEffect(skillToMove(sk.id))||'<p class="small">追加効果はありません。</p>'}
    <h3>習得するキャラ・進化段階</h3><p class="small">固有技として持つ形態です。統合された同系統の技を含みます。</p><div class="skill-dex-units">${skillDexUnitLinks(learners)}</div>
    <details><summary>カードを装備できるキャラ（${eligible.length}体）</summary><p class="small">属性・武器・身体・専用条件から判定。装備には技カードと空き枠、合計COST内の余裕が必要です。</p><div class="skill-dex-units">${skillDexUnitLinks(eligible)}</div></details></article>`;
  if(focus){detail.focus({preventScroll:true});detail.scrollIntoView({behavior:'smooth',block:'start'});}
}
function openSkillDex(id){show('skillDex');showSkillDexDetail(id);}
function openUnitFromSkillDex(id){
  const m=by(id);if(!m)return;
  if(isCharacterUnit(m)){show('characterDex');showCharacterDexDetail(id);}else{show('dex');showDexDetail(id);}
}
function resetSkillDexFilters(){
  ['skillDexSearch','skillDexType','skillDexCost','skillDexKind','skillDexEffect'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('skillDexSort').value='type';renderSkillDex();
}
