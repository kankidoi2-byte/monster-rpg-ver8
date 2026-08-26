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

const SKILL_FORM_RULES = Object.freeze([
  Object.freeze({tag:'anatomy:fang', form:'fang', pattern:/牙/}),
  Object.freeze({tag:'anatomy:claw', form:'claw', pattern:/(爪|クロー|ひっかき)/}),
  Object.freeze({tag:'anatomy:horn', form:'horn', pattern:/(角|ホーン)/}),
  Object.freeze({tag:'anatomy:tail', form:'tail', pattern:/(尾撃|テイル|しっぽ|幼竜の尾)/}),
  Object.freeze({tag:'anatomy:fin', form:'fin', pattern:/(フィン|ひれ)/}),
  Object.freeze({tag:'anatomy:wing', form:'wing', pattern:/(翼撃|光翼)/}),
  Object.freeze({tag:'anatomy:fist', form:'fist', pattern:/拳/}),
  Object.freeze({tag:'anatomy:beak', form:'beak', pattern:/つつき/}),
  Object.freeze({tag:'anatomy:leg', form:'leg', pattern:/(蹴り|兎跳)/}),
  Object.freeze({tag:'capability:breath', form:'breath', pattern:/(ブレス|息吹)/}),
  Object.freeze({tag:'capability:roar', form:'roar', pattern:/咆哮/}),
  Object.freeze({tag:'weapon:club', form:'club', pattern:/棍棒/}),
  Object.freeze({tag:'weapon:dagger', form:'dagger', pattern:/短剣/}),
  Object.freeze({tag:null, form:'strike', pattern:/(クラッシュ|崩し|崩砕|砕き|一撃)/}),
  Object.freeze({tag:'capability:charge', form:'charge', pattern:/(突進|急降下|ダイブ|ラッシュ|ランページ|チャージ)/}),
  Object.freeze({tag:'anatomy:body', form:'body', pattern:/(たいあたり|アタック)/}),
  Object.freeze({tag:null, form:'blade', pattern:/(水刃|風刃)/}),
  Object.freeze({tag:'capability:beam', form:'beam', pattern:/(光砲|断界光|コード・)/}),
  Object.freeze({tag:null, form:'magic', pattern:/(弾|波動|波紋|ウェーブ|瀑流|奔流|スパイラル|ノヴァ|アーク|レイ|ストーム|召喚|裁き|光輪|エクリプス)/})
]);

function skillFormFor(sourceUnit,mv){
  if (sourceUnit?.entityKind === 'character') {
    if ((sourceUnit.tags || []).includes('class:swordsman')) return 'sword';
    if ((sourceUnit.tags || []).includes('class:mage')) return 'magic';
  }
  const name=String(mv?.[0] || '');
  return SKILL_FORM_RULES.find(rule => rule.pattern.test(name))?.form || 'generic';
}
function skillRequirementsFor(sourceUnit,mv,form){
  const requiredAll=[];
  if (sourceUnit?.entityKind === 'character') {
    if ((sourceUnit.tags || []).includes('class:swordsman')) requiredAll.push('class:swordsman','weapon:sword');
    if ((sourceUnit.tags || []).includes('class:mage')) requiredAll.push('class:mage','weapon:staff');
  } else {
    const name=String(mv?.[0] || '');
    const matched=SKILL_FORM_RULES.find(rule => rule.tag && rule.pattern.test(name));
    if (matched?.tag && (sourceUnit?.tags || []).includes(matched.tag)) requiredAll.push(matched.tag);
    if (form === 'magic' && (sourceUnit?.tags || []).includes('capability:magic')) requiredAll.push('capability:magic');
  }
  return Object.freeze({
    entityKinds:Object.freeze([sourceUnit?.entityKind || 'monster']),
    requiredAll:Object.freeze([...new Set(requiredAll)])
  });
}
function skillTagsFor(sourceUnit,mv,form){
  const power=Number(mv?.[1]) || 0;
  const effect=mv?.[3] || null;
  return Object.freeze([...new Set([
    `source:${sourceUnit?.entityKind || 'monster'}`,
    `role:${power > 0 ? 'damage' : 'support'}`,
    `form:${form}`,
    ...moveTypes(mv).map(type => `element:${type}`),
    ...(effect ? [`effect:${effect}`] : [])
  ])]);
}

M.forEach(mon => (mon.moves || []).forEach((mv,index) => {
  const id = mv?.[8];
  if (typeof id !== 'string' || !id) throw new Error(`固定skillIdがありません: ${mon.id} moves[${index}]`);
  _skillIdByMove.set(mv,id);
  const legacyId = legacySkillIdFromMove(mv);
  if (!LEGACY_SKILL_ID_ALIASES[legacyId]) LEGACY_SKILL_ID_ALIASES[legacyId] = id;
  if (_skillSeen.has(id)) return;
  _skillSeen.add(id);
  const types=moveTypes(mv);
  const form=skillFormFor(mon,mv);
  MOVE_CARDS.push({
    id, name:mv[0], power:mv[1] || 0, type:types[0] || 'normal', types, effect:mv[3] || null,
    chance:Number.isFinite(mv[4]) ? Number(mv[4]) : null, cost:skillCostFromMove(mv), customDesc:mv[6] || '',
    exclusiveMonsterId:mv[7] || null, desc:moveEffectText ? moveEffectText(mv) : '',
    sourceUnitId:mon.id, sourceEntityKind:mon.entityKind, form,
    tags:skillTagsFor(mon,mv,form), requirements:skillRequirementsFor(mon,mv,form)
  });
}));

function skillPowerBand(power){
  const value=Number(power) || 0;
  if (value <= 0) return 'support';
  if (value <= 30) return 'basic';
  if (value <= 45) return 'standard';
  if (value <= 60) return 'advanced';
  if (value <= 80) return 'master';
  return 'signature';
}
function skillConsolidationKey(sk){
  const source=by(sk.sourceUnitId);
  const consolidatableEffect=!sk.effect || ['guard','heal','buff','debuff'].includes(sk.effect);
  if (!consolidatableEffect || sk.exclusiveMonsterId || source?.bossClass || source?.alchemyExclusive || sk.types.length !== 1 || sk.power > 80) return `keep:${sk.id}`;
  const requirements=(sk.requirements?.requiredAll || []).join(',');
  const elementalFamily=sk.types.includes('dragon') && ['fang','claw','horn','tail','wing','breath'].includes(sk.form)
    ? (source?.types || []).filter(type => type !== 'dragon').sort().join('+')
    : '';
  return [sk.sourceEntityKind,sk.types.join('+'),sk.effect || 'damage',sk.form,requirements,elementalFamily,skillPowerBand(sk.power)].join('|');
}
function preferredPowerForBand(band){
  return {basic:28,standard:42,advanced:60,master:78,support:0}[band] ?? 0;
}
const _skillConsolidationGroups = new Map();
MOVE_CARDS.forEach(sk => {
  const key=skillConsolidationKey(sk);
  if (!_skillConsolidationGroups.has(key)) _skillConsolidationGroups.set(key,[]);
  _skillConsolidationGroups.get(key).push(sk);
});
const SKILL_CANONICAL_BY_ID = Object.create(null);
const SKILL_CANONICAL_PRIORITY = Object.freeze([
  'skill_icegolem_02','skill_suiren_02','skill_thornbeat_02','skill_rikasheef_02',
  'skill_tsubaki_03','skill_zephyray_02','skill_luxiard_03','skill_slime_01',
  'skill_aquaron_03','skill_highaquaron_03','skill_orca_abyss_02',
  'skill_rikasheef_03','skill_elna_middle_01','skill_elna_beginner_02','skill_elna_middle_03',
  'skill_stella_apprentice_01','skill_stella_apprentice_02','skill_stella_apprentice_03',
  'skill_stella_wizard_01','skill_stella_wizard_02','skill_stella_wizard_03','skill_stella_sorcerer_01'
]);
function canonicalPriority(skillId){
  const index=SKILL_CANONICAL_PRIORITY.indexOf(skillId);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}
_skillConsolidationGroups.forEach(cards => {
  const target=preferredPowerForBand(skillPowerBand(cards[0]?.power));
  const canonical=[...cards].sort((a,b) => canonicalPriority(a.id)-canonicalPriority(b.id) || Math.abs(a.power-target)-Math.abs(b.power-target) || a.id.localeCompare(b.id))[0];
  cards.forEach(card => { SKILL_CANONICAL_BY_ID[card.id]=canonical.id; });
});
MOVE_CARDS.forEach(card => {
  card.canonicalId=SKILL_CANONICAL_BY_ID[card.id] || card.id;
  card.deprecated=card.canonicalId !== card.id;
});
Object.freeze(SKILL_CANONICAL_BY_ID);
const EQUIPPABLE_MOVE_CARDS = Object.freeze(MOVE_CARDS.filter(card => !card.deprecated));
const MONSTER_MOVE_CARDS = Object.freeze(EQUIPPABLE_MOVE_CARDS.filter(card => card.sourceEntityKind === 'monster'));
const CHARACTER_MOVE_CARDS = Object.freeze(EQUIPPABLE_MOVE_CARDS.filter(card => card.sourceEntityKind === 'character'));
const SKILL_BY_ID = Object.fromEntries(MOVE_CARDS.map(sk => [sk.id, sk]));
function skillIdFromMove(mv){
  return (typeof mv?.[8] === 'string' && mv[8]) || _skillIdByMove.get(mv) || legacySkillIdFromMove(mv);
}
function normalizeSkillId(skillId){
  return SKILL_BY_ID[skillId] ? skillId : (LEGACY_SKILL_ID_ALIASES[skillId] || skillId);
}
function canonicalSkillId(skillId){
  const normalized=normalizeSkillId(skillId);
  return SKILL_CANONICAL_BY_ID[normalized] || normalized;
}
function skillBattleMotionForMove(mv){
  const skillId=normalizeSkillId(skillIdFromMove(mv));
  const skill=SKILL_BY_ID[skillId] || null;
  const tags=skill?.tags || [];
  const formTag=tags.find(tag => tag.startsWith('form:'));
  const roleTag=tags.find(tag => tag.startsWith('role:'));
  const elementTags=tags.filter(tag => tag.startsWith('element:')).map(tag => tag.slice(8));
  const form=formTag?.slice(5) || skill?.form || 'generic';
  const role=roleTag?.slice(5) || ((Number(mv?.[1]) || 0) > 0 ? 'damage' : 'support');
  return Object.freeze({
    skillId:skill?.id || null,
    form,
    role,
    types:Object.freeze(elementTags.length ? elementTags : moveTypes(mv)),
    effect:skill?.effect || mv?.[3] || null,
    animated:role === 'damage' && ['breath','beam','sword','claw','fang','magic','blade','charge','strike','body','tail','horn','fist','wing','fin','leg','beak','club','dagger','roar'].includes(form)
  });
}
function skillToMove(skillId){
  const sk = SKILL_BY_ID[skillId];
  if (!sk) return ['通常攻撃',24,'normal'];
  return [sk.name, sk.power, sk.types?.length>1 ? [...sk.types] : sk.type, sk.effect, sk.chance, sk.cost, sk.customDesc, sk.exclusiveMonsterId, sk.id];
}
function rarityCount(m){ return (m?.rarity || '★').length || 1; }
function skillCostLimitFor(mon, ins){
  const base = {1:4,2:5,3:6,4:8,5:10}[rarityCount(mon)] || 4;
  const lvBonus = Math.max(0, Math.floor(((ins?.level || 1) - 1) / 3));
  return base + lvBonus;
}
function isSkillAllowedForMonster(skillId, mon, options={}){
  const sk = SKILL_BY_ID[skillId];
  if (!sk || !mon) return false;
  if (sk.deprecated && !options.allowDeprecated) return false;
  if (sk.sourceEntityKind && sk.sourceEntityKind !== mon.entityKind) return false;
  if (sk.exclusiveMonsterId && sk.exclusiveMonsterId !== mon.id) return false;
  const unitTags=new Set(mon.tags || []);
  if ((sk.requirements?.entityKinds || []).length && !sk.requirements.entityKinds.includes(mon.entityKind)) return false;
  if ((sk.requirements?.requiredAll || []).some(tag => !unitTags.has(tag))) return false;
  const types=skillTypes(sk);
  return types.includes('normal') || types.some(t => (mon.types || []).includes(t));
}
function isEquippedSkillUsableForMonster(skillId,mon){
  return isSkillAllowedForMonster(skillId,mon,{allowDeprecated:true});
}
function defaultSkillIdsForMonster(mon, ins){
  const ids = [...new Set((mon?.moves || []).map(skillIdFromMove).map(canonicalSkillId).filter(id => SKILL_BY_ID[id]))];
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
  const base = Math.round(Number(m?.spd ?? 50) * instanceStatModifier(ins, 'speed'));
  const linkBonus = typeof kokoroLinkSpeedBonusFor === 'function' ? kokoroLinkSpeedBonusFor(ins) : 0;
  return Math.max(1, base + linkBonus);
}
function playerAttackInstanceMultiplier(){
  const linkMultiplier = typeof kokoroLinkAttackMultiplierFor === 'function'
    ? kokoroLinkAttackMultiplierFor(activeInstance)
    : 1;
  return instanceStatModifier(activeInstance, 'attack') * linkMultiplier;
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
