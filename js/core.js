function normalizeMoveTypes(value){
  const arr = Array.isArray(value) ? value : [value || 'normal'];
  return [...new Set(arr.filter(Boolean))];
}
function moveTypes(mv){ return normalizeMoveTypes(mv?.[2]); }
function skillTypes(sk){ return normalizeMoveTypes(sk?.types?.length ? sk.types : sk?.type); }
function skillTypeIcon(type){return TYPE_ICONS[type]||'🃏';}
function skillTypeLabel(types){return normalizeMoveTypes(types).map(t=>`${skillTypeIcon(t)}${TN[t]||t}`).join(' / ');}
function skillCardClass(typeOrTypes){
  const types=normalizeMoveTypes(typeOrTypes);
  return types.length>1 ? `skill-card skill-dual-${types.join('-')}` : `skill-card skill-${types[0]||'normal'}`;
}
function skillButtonClass(typeOrTypes){
  const types=normalizeMoveTypes(typeOrTypes);
  return types.length>1 ? `dual-${types.join('-')}` : (types[0]||'normal');
}
function skillCardHeader(sk){const types=skillTypes(sk);return `<div class="skill-card-head"><h3 class="skill-card-title">${skillTypeLabel(types)} ${sk.name}</h3><span class="skill-cost-badge">COST ${sk.cost}</span></div>`;}

/* ===== 属性相性 ===== */
/* ===== 技カード定義・技装備システム ===== */
function legacySkillIdFromMove(mv){
  const name = String(mv[0] || 'skill');
  const code = Array.from(name).map(ch => ch.charCodeAt(0).toString(36)).join('_');
  return `sk_${code}_${moveTypes(mv).join('-')}_${mv[1] || 0}_${mv[3] || 'none'}`;
}
function skillCostFromMove(mv){
  if (Number.isFinite(mv[5])) return Math.max(1, Math.min(6, Number(mv[5])));
  const power = Number(mv[1] || 0);
  const effect = mv[3] || '';
  let cost = power <= 0 ? 1 : power <= 30 ? 1 : power <= 45 ? 2 : power <= 60 ? 3 : power <= 80 ? 4 : 5;
  if (['heal','drain','buff','debuff','guard','poison','paralysis','confusion','sleep','flare_charge','aqua_shield','repeat_attack'].includes(effect)) cost += 1;
  return Math.min(6, cost);
}
const MOVE_CARDS = [];
const _skillSeen = new Set();
const _skillIdByMove = new WeakMap();
const LEGACY_SKILL_ID_ALIASES = Object.create(null);
M.forEach(mon => (mon.moves || []).forEach((mv,index) => {
  const id = mv?.[8];
  if (typeof id !== 'string' || !id) throw new Error(`固定skillIdがありません: ${mon.id} moves[${index}]`);
  _skillIdByMove.set(mv,id);
  const legacyId = legacySkillIdFromMove(mv);
  if (!LEGACY_SKILL_ID_ALIASES[legacyId]) LEGACY_SKILL_ID_ALIASES[legacyId] = id;
  if (_skillSeen.has(id)) return;
  _skillSeen.add(id);
  const types=moveTypes(mv);
  MOVE_CARDS.push({
    id, name:mv[0], power:mv[1] || 0, type:types[0] || 'normal', types, effect:mv[3] || null,
    chance:Number.isFinite(mv[4]) ? Number(mv[4]) : null, cost:skillCostFromMove(mv), customDesc:mv[6] || '',
    exclusiveMonsterId:mv[7] || null, desc:moveEffectText ? moveEffectText(mv) : ''
  });
}));
const SKILL_BY_ID = Object.fromEntries(MOVE_CARDS.map(sk => [sk.id, sk]));
function skillIdFromMove(mv){
  return (typeof mv?.[8] === 'string' && mv[8]) || _skillIdByMove.get(mv) || legacySkillIdFromMove(mv);
}
function normalizeSkillId(skillId){
  return SKILL_BY_ID[skillId] ? skillId : (LEGACY_SKILL_ID_ALIASES[skillId] || skillId);
}
function skillToMove(skillId){
  const sk = SKILL_BY_ID[skillId];
  if (!sk) return ['通常攻撃',24,'normal'];
  return [sk.name, sk.power, sk.types?.length>1 ? [...sk.types] : sk.type, sk.effect, sk.chance, sk.cost, sk.customDesc, sk.exclusiveMonsterId];
}
function rarityCount(m){ return (m?.rarity || '★').length || 1; }
function skillCostLimitFor(mon, ins){
  const base = {1:4,2:5,3:6,4:8,5:10}[rarityCount(mon)] || 4;
  const lvBonus = Math.max(0, Math.floor(((ins?.level || 1) - 1) / 3));
  return base + lvBonus;
}
function isSkillAllowedForMonster(skillId, mon){
  const sk = SKILL_BY_ID[skillId];
  if (!sk || !mon) return false;
  if (sk.exclusiveMonsterId && sk.exclusiveMonsterId !== mon.id) return false;
  const types=skillTypes(sk);
  return types.includes('normal') || types.some(t => (mon.types || []).includes(t));
}
function defaultSkillIdsForMonster(mon, ins){
  const ids = (mon?.moves || []).map(skillIdFromMove).filter(id => SKILL_BY_ID[id]);
  const limit = skillCostLimitFor(mon, ins);
  const chosen = [];
  let cost = 0;
  ids.forEach(id => {
    const sk = SKILL_BY_ID[id];
    if (chosen.length < 3 && isSkillAllowedForMonster(id, mon) && cost + sk.cost <= limit) {
      chosen.push(id); cost += sk.cost;
    }
  });
  if (!chosen.length) chosen.push(skillIdFromMove(['通常攻撃',24,'normal']));
  return chosen.slice(0,3);
}
const ITEM_BY_ID = Object.fromEntries(SHOP_ITEMS.map(it => [it.id, it]));

/* ===== Ver7.8 アイテム図鑑マスター ===== */
const ITEM_DEX_ITEMS = [...SHOP_ITEMS, ...ITEM_DEX_EXTRA];
const ITEM_DEX_BY_ID = Object.fromEntries(ITEM_DEX_ITEMS.map(it => [it.id, it]));

function itemDexCategory(it){
  if(it.category) return it.category;
  if(it.contract) return '契約書';
  if(it.expItem) return '経験値';
  if(it.usableInBattle) return '戦闘用';
  if(['fire_orb','water_mirror','doom_fragment'].includes(it.id)) return '進化素材';
  return 'その他';
}
function itemDexObtain(it){
  if(it.obtain) return it.obtain;
  if(it.shop !== false) return `ショップ（コイン${it.price}枚）`;
  if(it.expItem) return 'アイテムガチャ';
  if(it.id === 'fire_orb') return '炎の精霊ツバキからドロップ';
  return '特殊報酬・イベントで入手';
}
function itemDexVisual(it, locked=false){
  if(locked) return '<div class="item-dex-placeholder">❔</div>';
  const src = ITEM_IMG[it.id];
  return src
    ? `<img src="${src}" alt="${it.name}">`
    : `<div class="item-dex-placeholder">${it.icon || '📦'}</div>`;
}
function itemInlineVisual(it, className='item-inline-image'){
  if(!it) return '📦';
  const src = ITEM_IMG[it.id];
  return src
    ? `<img class="${className}" src="${src}" alt="${it.name}">`
    : (it.icon || '📦');
}
function by(id)   { return M.find(x => x.id === id); }
function isCharacterUnit(unit) { return unit?.entityKind === 'character' || (!unit?.entityKind && unit?.unitType === 'character'); }
function entityEligibility(unit, key, legacyFallback=false) {
  if (!unit) return false;
  if (typeof unit.eligibility?.[key] === 'boolean') return unit.eligibility[key];
  return typeof legacyFallback === 'function' ? Boolean(legacyFallback(unit)) : Boolean(legacyFallback);
}
function isContractableUnit(unit) { return entityEligibility(unit,'contract',value => !isCharacterUnit(value) && value.contractable !== false); }
function isAlchemyCatalystUnit(unit) { return entityEligibility(unit,'alchemyCatalyst',value => !isCharacterUnit(value)); }
function isAlchemyResultEligible(unit, resultKind) {
  return entityEligibility(unit,resultKind === 'success' ? 'alchemySuccess' : 'alchemyFailure',false);
}
function needExp(lv) { return lv * 60; }
function maxHp(m, level) {
  // Ver5.1 Claude修正: 種族IDだけで検索するinsLevel()に頼ると、
  // 「同種族の別個体」や「野生の敵」が別のプレイヤー所持個体のレベルと
  // 混同されてしまうバグがあったため、呼び出し側で明示的にlevelを渡す方式に変更。
  // level省略時は野生の敵など「基礎(Lv1)」相当として扱う。
  const lv = (typeof level === 'number' && level > 0) ? level : 1;
  return m.hp + (lv - 1) * 12;
}
function instanceStatModifier(ins, stat){
  const value = Number(ins?.alchemy?.statModifiers?.[stat]);
  return Number.isFinite(value) && value > 0 ? value : 1;
}
function instanceMaxHp(ins){
  const mon = by(ins?.id);
  if(!mon) return 1;
  return Math.max(1, Math.round(maxHp(mon, ins?.level || 1) * instanceStatModifier(ins, 'hp')));
}
function monSpd(m, ins=null) {
  return Math.max(1, Math.round(Number(m?.spd ?? 50) * instanceStatModifier(ins, 'speed')));
}
function playerAttackInstanceMultiplier(){
  return instanceStatModifier(activeInstance, 'attack');
}
function moveEffectText(mv) {
  const [,power,type,effect,chance,,customDesc] = mv;
  const typeText = moveTypes(mv).map(t=>TN[t]||t).join(' / ');
  let txt = power === 0 ? `${typeText}属性 / 補助技` : `${typeText}属性 / 威力 ${power}`;
  const percent = Number.isFinite(chance) ? Math.round(chance * 100) : null;
  const fx = {
    heal:'自分のHPを回復', drain:'与えたダメージの半分を吸収', recoil:'強力だが反動ダメージあり',
    alchemy_recoil:'攻撃後、実際に与えたダメージの25％を反動として受ける',
    guard:'次のダメージを軽減', buff:'自分の攻撃力を上げる', debuff:'相手の攻撃力を下げる',
    poison:`${percent ?? 50}%で相手を毒状態にする`,
    paralysis:`${percent ?? 30}%で相手を麻痺状態にする`,
    confusion:`${percent ?? 60}%で相手をこんらん状態にする`,
    sleep:`${percent ?? 70}%で相手をねむり状態にする`,
    flare_charge:'次の攻撃の攻撃力が20%アップする',
    aqua_shield:'次に受ける攻撃ダメージを半減する',
    repeat_attack:`${percent ?? 30}%でもう一度攻撃する`
  };
  if (fx[effect]) txt += ' / ' + fx[effect];
  if (customDesc) txt += '。' + customDesc;
  return txt;
}
