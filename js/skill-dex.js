/* Read-only encyclopedia: derive performance and eligibility from runtime rules. */
const SKILL_DEX_TYPE_ORDER = ['fire','water','grass','thunder','wind','light','dark','star','dragon','normal'];
let skillDexSelectedId = null;
function skillDexEntries(){return EQUIPPABLE_MOVE_CARDS;}
function skillDexEffectKeys(sk){
  const keys=new Set();
  if(sk.effect)keys.add(sk.effect);
  Object.keys(sk.tactical||{}).forEach(key=>{if(sk.tactical[key])keys.add(key);});
  if(sk.tactical?.hits>1)keys.add('repeat_attack');
  if(sk.tactical?.cleanse)keys.add('cleanse');
  if(sk.tactical?.bonus?.condition)keys.add('conditional_power');
  if(keys.has('drain')||keys.has('heal'))keys.add('recovery');
  if(keys.has('recoil')||keys.has('alchemy_recoil'))keys.add('recoil');
  if(['poison','paralysis','confusion','sleep','blind'].some(key=>keys.has(key)))keys.add('status');
  if(keys.has('flare_charge'))keys.add('charge');
  if(keys.has('guard')||keys.has('aqua_shield'))keys.add('defense');
  return keys;
}
function skillDexQueryEntries({query='',type='',cost='',kind='',effect='',tier='',sort='type'}={}){
  const needle=query.trim().toLocaleLowerCase('ja-JP');
  const rank=sk=>SKILL_DEX_TYPE_ORDER.indexOf(skillTypes(sk)[0]);
  return skillDexEntries().filter(sk=>(!needle||sk.name.toLocaleLowerCase('ja-JP').includes(needle))&&
    (!tier||skillDexTier(sk.cost)===tier)&&(!type||skillTypes(sk).includes(type))&&(!cost||sk.cost===Number(cost))&&
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
// Presentation-only colors: same element hues as the existing skill-card palette.
// Kept out of the skill data so performance, eligibility and acquisition stay unchanged.
const SKILL_DEX_CARD_PALETTE=Object.freeze({
  fire:['#4b1715','#ff7043'],water:['#102b49','#42a5f5'],grass:['#12351a','#66bb6a'],
  thunder:['#453b0c','#ffee58'],wind:['#0b3c3f','#80deea'],light:['#3b300d','#ffd740'],
  dark:['#30153a','#ce93d8'],star:['#103830','#64ffda'],dragon:['#451529','#f48fb1'],
  normal:['#252b36','#cdd3e0']
});
function skillDexCardMarkup(sk){
  const types=skillTypes(sk),colors=types.map(type=>SKILL_DEX_CARD_PALETTE[type]||SKILL_DEX_CARD_PALETTE.normal);
  return `<button class="move-box skill-dex-card ${skillCardClass(types)}" style="--dex-fill-a:${colors[0][0]};--dex-fill-b:${(colors[1]||colors[0])[0]};--dex-edge:${colors[0][1]}" data-skill-dex-id="${sk.id}" onclick="showSkillDexDetail('${sk.id}')">
    <span class="skill-card-title">${sk.name}</span>
    <span class="skill-cost-badge">COST ${sk.cost}</span>
    <span class="skill-type-line">${skillTypeLabel(types)}</span>
    <span class="skill-dex-performance">${sk.power===0?'補助技':`威力 <strong>${sk.power}</strong>`}</span>
    <span class="skill-dex-description">${skillDexTier(sk.cost)} · ${sk.customDesc||sk.description||''}</span>
    <span class="skill-dex-cta">詳細を見る ›</span>
  </button>`;
}
function renderSkillDex(){
  const list=document.getElementById('skillDexList');if(!list)return;
  const get=id=>document.getElementById(id)?.value||'';
  const entries=skillDexQueryEntries({query:get('skillDexSearch'),type:get('skillDexType'),cost:get('skillDexCost'),kind:get('skillDexKind'),effect:get('skillDexEffect'),tier:get('skillDexTier'),sort:get('skillDexSort')});
  document.getElementById('skillDexCount').textContent=`${entries.length} / ${skillDexEntries().length} 技`;
  list.innerHTML=entries.length?entries.map(skillDexCardMarkup).join(''):'<p class="panel">条件に合う技はありません。検索条件を変更してください。</p>';
  if(skillDexSelectedId)showSkillDexDetail(skillDexSelectedId,false);
}
function showSkillDexDetail(id,focus=true){
  const sk=SKILL_BY_ID[canonicalSkillId(id)],detail=document.getElementById('skillDexDetail');if(!sk||!detail)return;
  skillDexSelectedId=sk.id;
  const learners=skillDexLearners(sk),eligible=skillDexEligibleUnits(sk);
  const recipe=skillSynthesisRecipeFor(sk.id);
  const acquisition=recipe?`合成限定：${skillSynthesisRecipeMarkup(recipe)}<br><button onclick="showSkillSynthesis()">合成画面へ</button>`:'技カードガチャ（モンスター・キャラクター共通）。初期装備などからも入手できます。';
  const aptitude=skillDexAptitude(sk);
  detail.innerHTML=`<article class="panel ${skillCardClass(skillTypes(sk))}">${skillCardHeader(sk)}${skillCardStats(sk)}<p>${skillDexTier(sk.cost)} · ${sk.customDesc||sk.description||'追加効果なし。'}</p>
    <p>適性：${aptitude}</p><details><summary>数値・詳しい効果</summary><p class="skill-dex-numbers">${sk.detailedDesc||skillCardEffect(skillToMove(sk.id))||'追加効果はありません。'}</p></details>
    <h3>入手方法</h3><p>${acquisition}</p>
    <details><summary>初期装備に持つユニット（${learners.length}体）</summary><div class="skill-dex-units">${skillDexUnitLinks(learners)}</div></details>
    <details><summary>カードを装備できるユニット（${eligible.length}体）</summary><p class="small">装備には技カードと空き枠、合計COST内の余裕が必要です。</p><div class="skill-dex-units">${skillDexUnitLinks(eligible)}</div></details></article>`;

  if(focus){detail.focus({preventScroll:true});detail.scrollIntoView({behavior:'smooth',block:'start'});}
}
function openSkillDex(id){show('skillDex');showSkillDexDetail(id);}
function openUnitFromSkillDex(id){
  const m=by(id);if(!m)return;
  if(isCharacterUnit(m)){show('characterDex');showCharacterDexDetail(id);}else{show('dex');showDexDetail(id);}
}
function resetSkillDexFilters(){
  ['skillDexSearch','skillDexType','skillDexCost','skillDexKind','skillDexEffect','skillDexTier'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('skillDexSort').value='type';renderSkillDex();
}

function skillDexTier(cost){return cost===25?'最強':cost>10?'超級':cost>5?'上級':'低級';}
function skillDexAptitude(sk){
  if(sk.universal)return '全ユニット共通';
  const labels={sword:'剣',claw:'爪',fang:'牙',tail:'尾',horn:'角',fist:'拳',rush:'突進',charge:'突進'};
  const required=(sk.requirements?.requiredAll||[]).map(tag=>labels[tag.split(':').pop()]||tag);
  const types=skillTypes(sk).filter(type=>type!=='normal').map(type=>TN[type]||type);
  return [...(types.length?[types.join('・')+'のいずれかの属性']:[]),...required].join(' ＋ ')||'共通';
}
