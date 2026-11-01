/* Shared TCG card: data and effects stay owned by the existing catalog. */
/* Adopted silhouettes: one shared asset per visual category; never changes gameplay tags. */
const SKILL_ART_ASSETS=Object.freeze({
  "牙": "images/skills/fang_silhouette_20261101.webp",
  "爪": "images/skills/claw_silhouette_20261101.webp",
  "剣": "images/skills/sword_silhouette_20261101.webp",
  "回復": "images/skills/healing_silhouette_20261101.webp",
  "混乱": "images/skills/confusion_silhouette_20261101.webp",
  "防御": "images/skills/guard_silhouette_20261101.webp",
  "尾": "images/skills/tail_silhouette_20261101.webp",
  "角": "images/skills/horn_silhouette_20261101.webp",
  "拳": "images/skills/fist_silhouette_20261101.webp",
  "突進": "images/skills/charge_silhouette_20261101.webp",
  "弾・射撃": "images/skills/projectile_silhouette_20261101.webp",
  "光線・砲撃": "images/skills/beam_silhouette_20261101.webp",
  "波動": "images/skills/wave_silhouette_20261101.webp",
  "斬撃": "images/skills/slash_silhouette_20261101.webp",
  "嵐・放出": "images/skills/storm_release_silhouette_20261101.webp",
  "雷撃": "images/skills/lightning_silhouette_20261101.webp",
  "咆哮": "images/skills/roar_silhouette_20261101.webp",
  "吸収": "images/skills/absorption_silhouette_20261101.webp",
  "強化": "images/skills/enhancement_silhouette_20261101.webp",
  "威圧": "images/skills/intimidation_silhouette_20261101.webp",
  "弱体化": "images/skills/weakening_silhouette_20261101.webp",
  "解除": "images/skills/dispel_silhouette_20261101.webp"
});
const SKILL_ART_GROUPS=Object.freeze({
  "牙": [
    46,
    47,
    48,
    87
  ],
  "爪": [
    43,
    44,
    45,
    86
  ],
  "剣": [
    40,
    41,
    42,
    85
  ],
  "回復": [
    4,
    62,
    66,
    100,
    110
  ],
  "混乱": [
    36,
    82
  ],
  "防御": [
    3,
    63,
    101,
    102
  ],
  "尾": [
    49,
    50,
    51,
    88
  ],
  "角": [
    52,
    53,
    54
  ],
  "拳": [
    1,
    2,
    20,
    31,
    55,
    56,
    57,
    61,
    90,
    104,
    107
  ],
  "突進": [
    15,
    37,
    58,
    59,
    60,
    89
  ],
  "弾・射撃": [
    14,
    16,
    21,
    23,
    27,
    28,
    29,
    30,
    34,
    38,
    97,
    106
  ],
  "光線・砲撃": [
    35,
    67,
    77,
    91,
    96
  ],
  "波動": [
    17,
    32,
    69,
    79,
    83,
    92,
    93,
    99,
    103
  ],
  "斬撃": [
    19,
    26,
    71,
    75,
    98
  ],
  "嵐・放出": [
    13,
    25,
    72,
    81,
    95,
    105
  ],
  "雷撃": [
    22,
    24,
    73,
    74,
    94
  ],
  "咆哮": [
    39,
    84
  ],
  "吸収": [
    18,
    70,
    108
  ],
  "強化": [
    8,
    10,
    64,
    109
  ],
  "威圧": [
    9,
    33
  ],
  "弱体化": [
    80
  ],
  "解除": [
    5,
    6,
    7,
    11,
    12,
    65,
    68,
    76,
    78
  ]
});
const SKILL_ART_BY_ID=Object.freeze(Object.fromEntries(Object.entries(SKILL_ART_GROUPS).flatMap(([category,ids])=>ids.map(n=>['s110_'+String(n).padStart(3,'0'),category]))));
const SKILL_ART_BY_FORM=Object.freeze({fang:'牙',claw:'爪',sword:'剣',tail:'尾',horn:'角',fist:'拳',charge:'突進'});
function skillArtCategory(sk){return SKILL_ART_BY_ID[sk.id]||SKILL_ART_BY_FORM[sk.form]||null;}
const SKILL_ART_COLORS=Object.freeze({fire:'#ef724a',water:'#54a9df',grass:'#63b97a',thunder:'#e8c94a',wind:'#75c9b6',light:'#f0d77b',dark:'#ae79d0',star:'#a6a1ed',dragon:'#6bb4d2',normal:'#c4bcb0'});
const SKILL_ART_KANJI=Object.freeze({fire:'炎',water:'水',grass:'森',thunder:'雷',wind:'風',light:'光',dark:'闇',star:'星',dragon:'竜',normal:'無'});
function skillArtMarkup(sk){const types=skillTypes(sk),type=types[0],color=SKILL_ART_COLORS[type]||'#c4bcb0',category=skillArtCategory(sk),src=SKILL_ART_ASSETS[category];return `<span class="tcg-art"${category?` data-art-category="${category}"`:''} style="--art-color:${color};--art-second:${SKILL_ART_COLORS[types[1]]||color}">${src?`<i class="tcg-silhouette" style="mask-image:url('${src}');-webkit-mask-image:url('${src}')" aria-hidden="true"></i>`:`<span class="tcg-kanji" aria-hidden="true">${SKILL_ART_KANJI[type]||'無'}</span>`}</span>`;}
function tcgSkillCardMarkup(sk,{compact=false}={}){
 const types=skillTypes(sk),tier=sk.cost>10?'super':sk.cost>5?'upper':'lower';
 return `<span class="tcg-card tcg-${tier}${compact?' tcg-compact':''}" data-tcg-id="${sk.id}" style="--art-color:${SKILL_ART_COLORS[types[0]]||'#c4bcb0'}"><span class="tcg-head skill-card-head"><span class="skill-card-title">${sk.name}</span><span class="skill-cost-badge" aria-label="COST ${sk.cost}"><span class="tcg-cost-label">COST </span>${sk.cost}</span></span>${skillArtMarkup(sk)}<span class="tcg-type skill-type-line">◆ ${types.map(t=>TN[t]||t).join('・')}属性 <b>${sk.cost===25?'最強':sk.cost>10?'超級':sk.cost>5?'上級':'低級'}</b></span>${compact?'':`<span class="tcg-description">${sk.desc||sk.customDesc||sk.description||''}</span><span class="tcg-power">${sk.power===0?'補助':`威力 ${sk.power}`}</span>`}<i class="tcg-holo" aria-hidden="true"></i></span>`;
}
function bindTcgTilt(root){root.querySelectorAll('.tcg-card:not(.tcg-compact)').forEach(el=>{el.addEventListener('pointermove',e=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;el.style.setProperty('--tilt-x',`${(y-.5)*-12}deg`);el.style.setProperty('--tilt-y',`${(x-.5)*12}deg`);el.style.setProperty('--holo-x',`${x*100}%`);});const reset=()=>{el.style.removeProperty('--tilt-x');el.style.removeProperty('--tilt-y');};el.addEventListener('pointerleave',reset);el.addEventListener('pointercancel',reset);el.addEventListener('pointerup',reset);});}
