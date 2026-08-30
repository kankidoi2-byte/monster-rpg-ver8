const SKILL_CARD_INVENTORY_MIGRATION = 'equipped_skill_cards_v1';

function migrateSkillSystem(){
  if (!save.saveMeta || typeof save.saveMeta !== 'object') save.saveMeta = {migrations:[]};
  if (!Array.isArray(save.saveMeta.migrations)) save.saveMeta.migrations = [];
  if (!save.equippedSkills) save.equippedSkills = {};
  (save.instances || []).forEach(ins => ensureInstanceSkills(ins));
  const equippedCounts = equippedSkillCardCounts();
  if (!save.saveMeta.migrations.includes(SKILL_CARD_INVENTORY_MIGRATION)) {
    // 旧仕様の全技99枚を廃止し、現在装備している1枠をカード1枚として引き継ぐ。
    save.skillCards = Object.fromEntries(MOVE_CARDS.map(sk => [sk.id,equippedCounts[sk.id] || 0]));
    save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);
    if (typeof saveRecoveryReport !== 'undefined' && Array.isArray(saveRecoveryReport)) saveRecoveryReport.push('技カード所持数を現在の装備内容から再構築');
    return;
  }
  if (!save.skillCards || typeof save.skillCards !== 'object') save.skillCards = {};
  MOVE_CARDS.forEach(sk => {
    const owned = Math.max(0,Math.floor(Number(save.skillCards[sk.id]) || 0));
    save.skillCards[sk.id] = Math.max(owned,equippedCounts[sk.id] || 0);
  });
}
function equippedSkillCardCounts(){
  const counts=Object.create(null);
  Object.values(save.equippedSkills || {}).forEach(ids => {
    if (!Array.isArray(ids)) return;
    ids.forEach(id => { if (SKILL_BY_ID[id]) counts[id]=(counts[id] || 0)+1; });
  });
  return counts;
}
function grantEquippedSkillCardsForInstance(ins){
  if (!ins?.uid) return;
  if (!save.skillCards || typeof save.skillCards !== 'object') save.skillCards = {};
  ensureInstanceSkills(ins);
  (save.equippedSkills?.[ins.uid] || []).forEach(id => {
    if (!SKILL_BY_ID[id]) return;
    save.skillCards[id]=Math.max(0,Math.floor(Number(save.skillCards[id]) || 0))+1;
  });
}
function grantDefaultSkillCardsForInstance(ins){
  if (!ins?.uid) return [];
  const mon = by(ins.id);
  if (!mon) return [];
  if (!save.skillCards || typeof save.skillCards !== 'object') save.skillCards = {};
  const ids = defaultSkillIdsForMonster(mon, ins);
  ids.forEach(id => {
    if (!SKILL_BY_ID[id]) return;
    save.skillCards[id]=Math.max(0,Math.floor(Number(save.skillCards[id]) || 0))+1;
  });
  return ids;
}
function ensureInstanceSkills(ins){
  if (!ins || !ins.uid) return;
  if (!save.equippedSkills) save.equippedSkills = {};
  const mon = by(ins.id);
  let arr = save.equippedSkills[ins.uid];
  if (!Array.isArray(arr) || !arr.length) {
    save.equippedSkills[ins.uid] = defaultSkillIdsForMonster(mon, ins);
    return;
  }
  // 旧セーブで装備中の統合前技は使用可能なまま保持する。
  // キャラクター／モンスター区分や武器・身体条件に違反する技だけを安全に外す。
  arr = arr.filter(id => SKILL_BY_ID[id] && isEquippedSkillUsableForMonster(id, mon)).slice(0,3);
  let total = 0, kept = [];
  const limit = skillCostLimitFor(mon, ins);
  arr.forEach(id => {
    const c = SKILL_BY_ID[id].cost;
    if (total + c <= limit) { kept.push(id); total += c; }
  });
  save.equippedSkills[ins.uid] = kept.length ? kept : defaultSkillIdsForMonster(mon, ins);
}
function getEquippedSkillIds(ins){
  ensureInstanceSkills(ins);
  return (save.equippedSkills?.[ins.uid] || []).filter(id => SKILL_BY_ID[id]);
}
function getEquippedMovesForInstance(ins){
  if (!ins) return [['通常攻撃',24,'normal']];
  return getEquippedSkillIds(ins).map(skillToMove);
}
function equippedSkillCost(ins){ return getEquippedSkillIds(ins).reduce((sum,id)=>sum+(SKILL_BY_ID[id]?.cost||0),0); }
function countEquippedSkill(skillId, exceptUid=null){
  if (!save.equippedSkills) return 0;
  return Object.entries(save.equippedSkills).reduce((sum,[uid,arr]) => {
    if (exceptUid && uid === exceptUid) return sum;
    return sum + (Array.isArray(arr) ? arr.filter(id => id === skillId).length : 0);
  },0);
}
function availableSkillCount(skillId, exceptUid=null){
  return (save.skillCards?.[skillId] || 0) - countEquippedSkill(skillId, exceptUid);
}
function renderSkillButtons(){
  const moves = getEquippedMovesForInstance(activeInstance);
  const el = document.getElementById('commands');
  if (!el) return;
  const rescueBasicAttack=typeof isTutorialRescueBattleActive==='function'&&isTutorialRescueBattleActive()
    ? '<button onclick="turn(-1)" data-tutorial-normal-attack class="skill-button normal" aria-label="通常攻撃、威力24、COST 0"><span>無属性</span><strong>通常攻撃</strong><small>威力 24 / COST 0</small></button>'
    : '';
  el.innerHTML = rescueBasicAttack + moves.map((mv,i) => {
    const power = Number(mv[1]) || 0;
    const role = power > 0 ? `威力 ${power}` : '補助';
    const cost = Number.isFinite(mv[5]) ? Number(mv[5]) : skillCostFromMove(mv);
    const strength = power >= 50 ? ' is-strong-skill' : '';
    const stellaAdvantage=typeof isTutorialStellaMockAdvantageMove==='function'&&isTutorialStellaMockAdvantageMove(mv)?' data-tutorial-stella-advantage':'';
    return `<button onclick="turn(${i})" data-tutorial-skill${stellaAdvantage} class="skill-button ${skillButtonClass(moveTypes(mv))}${strength}" aria-label="${mv[0]}、${role}、COST ${cost}"><span>${skillTypeLabel(moveTypes(mv))}</span><strong>${mv[0]}</strong><small>${role} / <b data-tutorial-skill-cost>COST ${cost}</b></small></button>`;
  }).join('');
}
function openSkillEdit(uid){
  editingSkillUid = uid;
  show('skillEdit');
  renderSkillEdit();
}
function renderSkillEdit(){
  const ins = getInstance(editingSkillUid);
  const target = document.getElementById('skillEditTarget');
  const current = document.getElementById('skillEditCurrent');
  const list = document.getElementById('skillCardList');
  if (!ins || !target || !current || !list) return;
  ensureInstanceSkills(ins);
  const mon = by(ins.id);
  const limit = skillCostLimitFor(mon, ins);
  const equipped = getEquippedSkillIds(ins);
  const used = equippedSkillCost(ins);
  const keyword = (document.getElementById('skillSearchInput')?.value || '').trim().toLowerCase();
  const typeFilter = document.getElementById('skillTypeFilter')?.value || 'all';
  const costFilter = document.getElementById('skillCostFilter')?.value || 'all';
  const equipableOnly = !!document.getElementById('skillEquipableOnly')?.checked;
  target.innerHTML = `<div class="card">${vis(mon)}<h2>${mon.name}</h2><p>Lv.${ins.level} / ${typesHtml(mon.types)}</p><p>技コスト：<b>${used}/${limit}</b></p></div>`;
  current.innerHTML = equipped.map((id,idx) => {
    const sk = SKILL_BY_ID[id];
    const tutorialTarget=typeof shouldMarkTutorialStellaUnequip==='function'&&shouldMarkTutorialStellaUnequip(ins.uid)?' data-tutorial-stella-unequip':'';
    return `<div class="card ${skillCardClass(skillTypes(sk))}">${skillCardHeader(sk)}<p class="skill-type-line ${skillTypes(sk)[0]}">${skillTypeLabel(skillTypes(sk))} / 威力${sk.power}</p><p class="small">${moveEffectText(skillToMove(id))}</p><button${tutorialTarget} onclick="unequipSkill(${idx})" style="background:linear-gradient(135deg,#7f1d1d,#991b1b)">外す</button></div>`;
  }).join('') || '<div class="card">技が未装備です。</div>';
  const skillPool = mon.entityKind === 'character' ? CHARACTER_MOVE_CARDS : MONSTER_MOVE_CARDS;
  const filteredCards = skillPool.filter(sk => {
    const allowed = isSkillAllowedForMonster(sk.id, mon);
    const slotOk = equipped.length < 3;
    const costOk = used + sk.cost <= limit;
    const avail = availableSkillCount(sk.id);
    const can = allowed && slotOk && costOk && avail > 0;
    if (keyword && !sk.name.toLowerCase().includes(keyword)) return false;
    if (typeFilter !== 'all' && !skillTypes(sk).includes(typeFilter)) return false;
    if (costFilter !== 'all') {
      if (costFilter === '5plus') {
        if (sk.cost < 5) return false;
      } else if (sk.cost !== Number(costFilter)) {
        return false;
      }
    }
    if (equipableOnly && !can) return false;
    return true;
  });
  list.innerHTML = filteredCards.map(sk => {
    const allowed = isSkillAllowedForMonster(sk.id, mon);
    const slotOk = equipped.length < 3;
    const costOk = used + sk.cost <= limit;
    const avail = availableSkillCount(sk.id);
    const can = allowed && slotOk && costOk && avail > 0;
    const reason = !allowed ? '区分・属性・タグ条件不一致' : !slotOk ? '技枠上限' : !costOk ? 'コスト超過' : avail <= 0 ? '所持枚数不足' : '装備可能';
    const tutorialTarget=typeof shouldMarkTutorialStellaSkillCard==='function'&&shouldMarkTutorialStellaSkillCard(sk.id,ins.uid);
    return `<div class="card ${skillCardClass(skillTypes(sk))} ${can?'':'is-disabled'}"${tutorialTarget?' data-tutorial-stella-skill-card':''}>${skillCardHeader(sk)}<p class="skill-type-line ${skillTypes(sk)[0]}">${skillTypeLabel(skillTypes(sk))} / 威力${sk.power}</p><p class="small">所持:${save.skillCards[sk.id]||0} / 使用中:${countEquippedSkill(sk.id)}</p><p class="small">${moveEffectText(skillToMove(sk.id))}</p><button${tutorialTarget?' data-tutorial-stella-skill-equip':''} onclick="equipSkill('${sk.id}')" ${can?'':'disabled'}>${reason}</button></div>`;
  }).join('') || '<div class="card">条件に合う技カードがありません。</div>';
}
function resetSkillFilters(){
  const keyword = document.getElementById('skillSearchInput');
  const typeFilter = document.getElementById('skillTypeFilter');
  const costFilter = document.getElementById('skillCostFilter');
  const equipableOnly = document.getElementById('skillEquipableOnly');
  if (keyword) keyword.value = '';
  if (typeFilter) typeFilter.value = 'all';
  if (costFilter) costFilter.value = 'all';
  if (equipableOnly) equipableOnly.checked = false;
  renderSkillEdit();
}
function equipSkill(skillId){
  const ins = getInstance(editingSkillUid); if (!ins) return;
  ensureInstanceSkills(ins);
  const mon = by(ins.id);
  const arr = save.equippedSkills[ins.uid] || [];
  const sk = SKILL_BY_ID[skillId];
  if (!sk) return;
  if (arr.length >= 3) { alert('技は最大3つまでです。'); return; }
  if (!isSkillAllowedForMonster(skillId, mon)) { alert('このユニットは区分・属性・タグ条件を満たしていません。'); return; }
  if (equippedSkillCost(ins) + sk.cost > skillCostLimitFor(mon, ins)) { alert('コスト上限を超えています。'); return; }
  if (availableSkillCount(skillId) <= 0) { alert('この技カードの未使用分がありません。'); return; }
  const previous=[...arr];
  arr.push(skillId);
  save.equippedSkills[ins.uid] = arr;
  if(saveGame()===false){
    save.equippedSkills[ins.uid]=previous;
    if(typeof showUiNotice==='function')showUiNotice('技カードを保存できませんでした。もう一度お試しください。','warning');
    renderSkillEdit();return false;
  }
  renderSkillEdit(); renderParty();
  if(typeof handleTutorialStellaSkillEquipped==='function')handleTutorialStellaSkillEquipped(skillId,ins.uid);
  return true;
}
function unequipSkill(idx){
  const ins = getInstance(editingSkillUid); if (!ins) return;
  const arr = save.equippedSkills?.[ins.uid] || [];
  if(!Number.isInteger(idx)||idx<0||idx>=arr.length)return false;
  const previous=[...arr];
  arr.splice(idx,1);
  save.equippedSkills[ins.uid] = arr;
  if(saveGame()===false){
    save.equippedSkills[ins.uid]=previous;
    if(typeof showUiNotice==='function')showUiNotice('技カードを保存できませんでした。もう一度お試しください。','warning');
    renderSkillEdit();return false;
  }
  renderSkillEdit(); renderParty();
  if(typeof handleTutorialStellaSkillUnequipped==='function')handleTutorialStellaSkillUnequipped(ins.uid);
  return true;
}
