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
function skillCardHeader(sk){return `<div class="skill-card-head"><h3 class="skill-card-title">${sk.name}</h3><span class="skill-cost-badge">COST ${sk.cost}</span></div>`;}
function skillCardStats(sk){return `<p class="skill-type-line ${skillTypes(sk)[0]}">${skillTypeLabel(skillTypes(sk))} / ${sk.power === 0 ? '補助技' : `威力 ${sk.power}`}</p>`;}
function skillCardEffect(mv){
  const text=moveEffectText(mv,{includeBase:false});
  const short=text ? `<p class="small skill-effect-text">${text}</p>` : '';
  const card=String(mv?.[8]||'').startsWith('s110_')?SKILL_BY_ID[mv[8]]:null;
  if(!card?.detailedDesc)return short;
  return `${short}<details class="skill-numeric-detail" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"><summary style="min-height:44px;cursor:pointer">数値・詳しい効果</summary><p class="small skill-numeric-text">${card.detailedDesc}</p></details>`;
}

/* ===== 属性相性 ===== */
/* ===== 技カード定義・技装備システム ===== */
function legacySkillIdFromMove(mv){
  const name = String(mv[0] || 'skill');
  const code = Array.from(name).map(ch => ch.charCodeAt(0).toString(36)).join('_');
  return `sk_${code}_${moveTypes(mv).join('-')}_${mv[1] || 0}_${mv[3] || 'none'}`;
}
function skillCostFromMove(mv){
  if (Number.isFinite(mv[5])) return Math.max(1, Math.min(String(mv[8] || '').startsWith('s110_') ? 25 : 6, Number(mv[5])));
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
// Preserve ownership and equipment from the pre-drain, name-derived skill ID.
LEGACY_SKILL_ID_ALIASES[legacySkillIdFromMove(["セラフィックリーフ",68,"grass"])] = "skill_seralphia_03";
if (typeof CHARACTER_SKILL_LEGACY_MOVES !== 'undefined') {
  Object.entries(CHARACTER_SKILL_LEGACY_MOVES).forEach(([id,move]) => {
    LEGACY_SKILL_ID_ALIASES[legacySkillIdFromMove(move)] = id;
  });
}

// User-approved replacement skills. Fixed IDs retain ownership; legacy names/types
// remain readable. Presentation and anatomy are keyed by ID, not mutable names.
const REPLACEMENT_SKILL_COMPAT = Object.freeze({
  skill_false_dragon_beta_01: Object.freeze({legacyMove:['断界光',76,'light'],form:'beam',requiredAll:[]}),
  skill_false_dragon_beta_02: Object.freeze({legacyMove:['偽竜の翼撃',62,'normal'],form:'wing',requiredAll:['anatomy:wing']}),
  skill_false_dragon_beta_03: Object.freeze({legacyMove:['コード・ベータ',94,'light'],form:'beam',requiredAll:[]}),
  skill_false_dragon_gamma_01: Object.freeze({legacyMove:['虚無光翼',82,'light'],form:'projectile',requiredAll:[]}),
  skill_false_dragon_gamma_02: Object.freeze({legacyMove:['偽竜の咆哮',66,'normal'],form:'roar',requiredAll:['capability:roar']}),
  skill_false_dragon_gamma_03: Object.freeze({legacyMove:['コード・ガンマ',100,'light'],form:'wave',requiredAll:[]})
});
Object.entries(REPLACEMENT_SKILL_COMPAT).forEach(([id,profile])=>{
  LEGACY_SKILL_ID_ALIASES[legacySkillIdFromMove(profile.legacyMove)]=id;
});

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
  // 「クラッシュ」内の「ラッシュ」は突進能力の根拠にしない。
  // 他の突進語や、同じ名前に別途含まれる「ラッシュ」は判定を維持する。
  Object.freeze({tag:'capability:charge', form:'charge', pattern:/(突進|急降下|ダイブ|(?<!ク)ラッシュ|ランページ|チャージ)/}),
  Object.freeze({tag:'anatomy:body', form:'body', pattern:/(たいあたり|アタック)/}),
  Object.freeze({tag:null, form:'blade', pattern:/(水刃|風刃)/}),
  Object.freeze({tag:'capability:beam', form:'beam', pattern:/(光砲|断界光|コード・)/}),
  Object.freeze({tag:null, form:'magic', pattern:/(弾|波動|波紋|ウェーブ|瀑流|奔流|スパイラル|ノヴァ|アーク|レイ|ストーム|召喚|裁き|光輪|錬輪|エクリプス)/})
]);

function skillFormFor(sourceUnit,mv){
  const replacement=REPLACEMENT_SKILL_COMPAT[mv?.[8]];
  if(replacement)return replacement.form;
  if (sourceUnit?.entityKind === 'character') {
    if ((sourceUnit.tags || []).includes('class:swordsman')) return 'sword';
    if ((sourceUnit.tags || []).includes('class:mage')) return 'magic';
  }
  const name=String(mv?.[0] || '');
  return SKILL_FORM_RULES.find(rule => rule.pattern.test(name))?.form || 'generic';
}
function skillRequirementsFor(sourceUnit,mv,form){
  const replacement=REPLACEMENT_SKILL_COMPAT[mv?.[8]];
  if(replacement)return Object.freeze({entityKinds:Object.freeze(['monster']),requiredAll:Object.freeze([...replacement.requiredAll])});
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

const skillSources = [...M];
if (typeof CHARACTER_COMMON_MOVES !== 'undefined') {
  skillSources.push({id:'character_common',entityKind:'character',tags:[],moves:CHARACTER_COMMON_MOVES});
}
skillSources.forEach(mon => (mon.moves || []).forEach((mv,index) => {
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
    tactical:mv[9] || null, commonCharacterSkill:mon.id === 'character_common',
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
  if (sk.tactical || sk.commonCharacterSkill) return `keep:${sk.id}`;
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
// All legacy cards remain addressable for old-save inspection; only the approved
// catalog is offered for acquisition/equipment. Mapping is explicit and versioned.
const SKILL_CANONICAL_BY_ID = Object.freeze({...SKILL110_MIGRATION_MAP,
  ...Object.fromEntries(SKILL110_CATALOG.map(card => [card.id,card.id]))});
MOVE_CARDS.forEach(card => {
  card.canonicalId=SKILL110_MIGRATION_MAP[card.id];
  card.deprecated=true;
});
SKILL110_CATALOG.forEach(card => {
  card.canonicalId=card.id;
  card.deprecated=false;
  MOVE_CARDS.push(card);
});
const EQUIPPABLE_MOVE_CARDS = Object.freeze([...SKILL110_CATALOG]);
const MONSTER_MOVE_CARDS = Object.freeze(EQUIPPABLE_MOVE_CARDS.filter(card => card.acquisition !== 'synthesis'));
const CHARACTER_MOVE_CARDS = MONSTER_MOVE_CARDS;
const SKILL_BY_ID = Object.fromEntries(MOVE_CARDS.map(sk => [sk.id, sk]));
function skillIdFromMove(mv){
  return (typeof mv?.[8] === 'string' && mv[8]) || _skillIdByMove.get(mv) || legacySkillIdFromMove(mv);
}
function normalizeSkillId(skillId){
  return SKILL_BY_ID[skillId] ? skillId : (LEGACY_SKILL_ID_ALIASES[skillId] || skillId);
}
function canonicalSkillId(skillId){
  if (SKILL110_MIGRATION_MAP[skillId]) return SKILL110_MIGRATION_MAP[skillId];
  const normalized=normalizeSkillId(skillId);
  return SKILL_CANONICAL_BY_ID[normalized] || normalized;
}
const GENERIC_BATTLE_MOTION_RULES=Object.freeze([
  Object.freeze({form:'blade',pattern:/(リーフカッター|ゼファーカッター)/}),
  Object.freeze({form:'strike',pattern:/影打ち/}),
  Object.freeze({form:'charge',pattern:/(疾風迅雷|蒼流の突撃|猛毒天?翔破|エアスライド|夜滑り)/}),
  Object.freeze({form:'wave',pattern:/(龍波|竜波|突風)/}),
  Object.freeze({form:'projectile',pattern:/(ニードル|リーフスパーク|セラフィックリーフ|聖光の槍|灼熱花弁)/}),
  Object.freeze({form:'lightning',pattern:/(サンダーボルト|パラライズショック|ライトニングチェイン|雷撃|混成竜雷)/}),
  Object.freeze({form:'field',pattern:/(トキシックガーデン|雷嵐|ジャッジメント|アストラルエンド|オルカアビス|火花の舞|天嵐大旋回)/}),
  Object.freeze({form:'mystic',pattern:/(吸収|呪いの視線|イリュージョン|ムーンシャドウ)/})
]);
function genericBattleMotionForm(skill,mv){
  const name=String(skill?.name || mv?.[0] || '');
  // Uncatalogued normal/legacy attacks intentionally use a short shared strike.
  return GENERIC_BATTLE_MOTION_RULES.find(rule => rule.pattern.test(name))?.form || 'strike';
}
function skillBattleMotionForMove(mv){
  const skillId=normalizeSkillId(skillIdFromMove(mv));
  const skill=SKILL_BY_ID[skillId] || null;
  const tags=skill?.tags || [];
  const formTag=tags.find(tag => tag.startsWith('form:'));
  const roleTag=tags.find(tag => tag.startsWith('role:'));
  const elementTags=tags.filter(tag => tag.startsWith('element:')).map(tag => tag.slice(8));
  const catalogForm=formTag?.slice(5) || skill?.form || 'generic';
  const damageForm=catalogForm === 'generic' ? genericBattleMotionForm(skill,mv) : catalogForm;
  const role=roleTag?.slice(5) || ((Number(mv?.[1]) || 0) > 0 ? 'damage' : 'support');
  const effect=skill?.effect || mv?.[3] || null;
  const tactical=skill?.tactical || mv?.[9];
  const tacticalSupport=tactical?.debuff||tactical?.dispel?'debuff':tactical?.heal?'heal':
    tactical?.guard?'guard':tactical?.buff||tactical?.charge?'buff':tactical?.cleanse?.length?'heal':null;
  const supportForm={guard:'guard',heal:'heal',buff:'buff',debuff:'debuff',aqua_shield:'shield',sleep:'sleep'}[effect] || (effect==='tactical'?tacticalSupport:null);
  const form=role === 'support' && supportForm ? supportForm : damageForm;
  return Object.freeze({
    skillId:skill?.id || null,
    form,
    role,
    types:Object.freeze(elementTags.length ? elementTags : moveTypes(mv)),
    effect,
    animated:(role === 'damage' && ['breath','beam','sword','claw','fang','magic','blade','charge','strike','body','tail','horn','fist','wing','fin','leg','beak','club','dagger','roar','wave','projectile','lightning','field','mystic'].includes(form)) || (role === 'support' && ['guard','heal','buff','debuff','shield','sleep'].includes(form))
  });
}
function skillToMove(skillId){
  const sk = SKILL_BY_ID[skillId];
  if (!sk) return ['通常攻撃',24,'normal'];
  const move = [sk.name, sk.power, sk.types?.length>1 ? [...sk.types] : sk.type, sk.effect, sk.chance, sk.cost, sk.customDesc, sk.exclusiveMonsterId, sk.id];
  if (sk.tactical) move.push(sk.tactical);
  return move;
}
function tacticalSkillProfile(move){ return move?.[9] || SKILL_BY_ID[move?.[8]]?.tactical || null; }
function rarityCount(m){ return (m?.rarity || '★').length || 1; }
function skillCostLimitFor(mon, ins){
  const base = {1:4,2:5,3:6,4:8,5:10}[rarityCount(mon)] || 4;
  const lvBonus = Math.max(0, Math.floor(((ins?.level || 1) - 1) / 3));
  return base + lvBonus;
}
function isLaterCharacterForm(sourceId, targetId){
  const source = by(sourceId), target = by(targetId);
  if (source?.entityKind !== 'character' || target?.entityKind !== 'character') return false;
  const visited = new Set([sourceId]), pending = [source];
  while (pending.length) {
    const form = pending.pop();
    const nextIds = [form.evolution, ...(form.evolutions || []).map(evolution => evolution.to)];
    for (const id of nextIds) {
      const next = by(id);
      if (!next || next.entityKind !== 'character' || visited.has(id)) continue;
      if (id === targetId) return true;
      visited.add(id);
      pending.push(next);
    }
  }
  return false;
}
function isSkillAllowedForMonster(skillId, mon, options={}){
  const sk = SKILL_BY_ID[skillId];
  if (!sk || !mon) return false;
  if (sk.deprecated && !options.allowDeprecated) return false;
  if (sk.id.startsWith('s110_')) {
    const tags=new Set(mon.tags || []);
    if ((sk.requirements.requiredAll || []).some(tag => !tags.has(tag))) return false;
    if (sk.universal) return true;
    // Normal mixed with an element never opens that mixed skill to everybody.
    const elements=skillTypes(sk).filter(type => type !== 'normal');
    return elements.length === 0 || elements.some(type => (mon.types || []).includes(type));
  }
  if (sk.sourceEntityKind && sk.sourceEntityKind !== mon.entityKind) return false;
  if (sk.exclusiveMonsterId && sk.exclusiveMonsterId !== mon.id &&
      !isLaterCharacterForm(sk.exclusiveMonsterId, mon.id)) return false;
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
  if (!mon) return [];
  const limit=skillCostLimitFor(mon,ins), chosen=[];
  const legacy=mon.legacyMoves || mon.moves || [];
  const preferred=[...new Set(legacy.map(skillIdFromMove).map(canonicalSkillId))]
    .filter(id => SKILL_BY_ID[id] && SKILL_BY_ID[id].acquisition !== 'synthesis' && isSkillAllowedForMonster(id,mon));
  // Reserve a real, usable attack before support. Favor the unit's weapon/body,
  // then its primary element; never grant an unequippable signature as inventory.
  const basic=EQUIPPABLE_MOVE_CARDS.filter(sk => sk.power>0 && sk.cost<=2 && isSkillAllowedForMonster(sk.id,mon));
  basic.sort((a,b) =>
    Number(!a.requirements.requiredAll.length)-Number(!b.requirements.requiredAll.length) ||
    Number(!a.types.includes(mon.types?.[0]))-Number(!b.types.includes(mon.types?.[0])) || a.cost-b.cost || a.id.localeCompare(b.id));
  const primary=preferred.find(id => SKILL_BY_ID[id].power>0 && SKILL_BY_ID[id].cost<=Math.max(1,limit-2)) || basic[0]?.id || 's110_001';
  let used=0;
  for (const id of [primary,...preferred,'s110_003','s110_010']) {
    const sk=SKILL_BY_ID[id];
    if (sk && !chosen.includes(id) && chosen.length<3 && used+sk.cost<=limit && isSkillAllowedForMonster(id,mon)) {
      chosen.push(id); used+=sk.cost;
    }
  }
  return chosen;
}
// Snapshot immutable legacy source loadouts before replacing runtime defaults.
// All species, including evolved/boss forms, are legal even when created at Lv1.
M.forEach(mon => {
  mon.legacyMoves=mon.moves.map(move => [...move]);
  mon.legacyTags=mon.tags;
  // Luxiard's established ルクスホーン demonstrates its horn; do not infer
  // this anatomy for unrelated dragons or for every character.
  if (mon.id==='luxiard') mon.tags=Object.freeze([...new Set([...mon.tags,'anatomy:horn'])]);
  if (mon.entityKind === 'character') {
    const extra=['anatomy:fist','capability:charge'];
    if (/^character_(brigitte|regus)_/.test(mon.id) || mon.id==='character_remnes_4') extra.push('weapon:sword');
    mon.tags=Object.freeze([...new Set([...mon.tags,...extra])]);
  }
});
M.forEach(mon => { mon.moves=defaultSkillIdsForMonster(mon,{level:1}).map(skillToMove); });
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
const MAX_LEVEL = 100;
function clampLevel(value) {
  const level = Number(value);
  return Math.min(MAX_LEVEL, Math.max(1, Number.isFinite(level) ? Math.floor(level) : 1));
}
function needExp(lv) { return clampLevel(lv) * 60; }
function isMaxLevel(lv) { return clampLevel(lv) >= MAX_LEVEL; }
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
function moveEffectText(mv, {includeBase=true}={}) {
  const [,power,type,effect,chance,,customDesc] = mv;
  const typeText = moveTypes(mv).map(t=>TN[t]||t).join(' / ');
  let txt = includeBase ? (power === 0 ? `${typeText}属性 / 補助技` : `${typeText}属性 / 威力 ${power}`) : '';
  const percent = Number.isFinite(chance) ? Math.round(chance * 100) : null;
  const fx = {
    heal:'自分のHPを回復', drain:'与えたダメージの半分を吸収', recoil:'攻撃後、自分も8ダメージを受ける',
    alchemy_recoil:'攻撃後、実際に与えたダメージの25％を反動として受ける',
    guard:'次のダメージを軽減', buff:'自分の攻撃力を上げる', debuff:'相手の攻撃力を下げる',
    poison:'相手を毒状態にすることがある',
    paralysis:'相手を麻痺させることがある',
    confusion:'相手をこんらんさせることがある',
    sleep:'相手をねむり状態にする',
    flare_charge:'次の攻撃の攻撃力が20%アップする',
    aqua_shield:'次に受ける攻撃ダメージを半減する',
    repeat_attack:`${percent ?? 30}%でもう一度攻撃する`
  };
  const poweredModifierText={
    skill_shenhairon_02:'攻撃後、自分の攻撃力を基本値の25%分上げる（上限160%）。',
    skill_nightmare_02:'攻撃後、相手の攻撃力を基本値の20%分下げる（下限65%）。',
    skill_noxvelg_02:'攻撃後、相手の攻撃力を基本値の20%分下げる（下限65%）。'
  };
  if(poweredModifierText[mv[8]])fx[effect]=poweredModifierText[mv[8]];
  // Legacy status skills use short flavor-first copy; tactical skills keep their own descriptions.
  if (['poison','paralysis','confusion','sleep'].includes(effect)) {
    return txt + (txt ? ' / ' : '') + (customDesc || '') + fx[effect] + '。';
  }
  if (fx[effect]) txt += (txt ? ' / ' : '') + fx[effect];
  let description=customDesc;
  if (!includeBase && description) {
    // Omit only known base-only copy; conditions and numeric effects stay intact.
    if (!fx[effect] && description === '追加効果のない攻撃。') description='';
    const types=moveTypes(mv);
    const dualIntro=types.map(t=>TN[t]||t).join('と')+'の複合攻撃。';
    if (types.length > 1 && description.startsWith(dualIntro)) description=description.slice(dualIntro.length);
  }
  if (description) txt += (txt ? '。' : '') + description;
  return txt;
}
