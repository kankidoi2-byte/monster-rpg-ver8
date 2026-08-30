// --- 画像データはここに挿入される ---
const IMG={
  orca_abyss:'images/monsters/orca_abyss.webp',
  orca_stream:'images/monsters/orca_stream.webp',
  orcana:'images/monsters/orcana.webp',
  lumina_sorcerer:'images/monsters/lumina_sorcerer.webp',
  lumina_wizard:'images/monsters/lumina_wizard.webp',
  lumina_apprentice:'images/monsters/lumina_apprentice.webp',
  stella_sorcerer:'images/monsters/stella_sorcerer.webp',
  stella_wizard:'images/monsters/stella_wizard.webp',
  stella_apprentice:'images/monsters/stella_apprentice.webp',
  gran_volmoog:'images/monsters/gran_volmoog.webp',
  volmoog:'images/monsters/volmoog.webp',
  proto_icegolem:'images/monsters/proto_icegolem.webp',
  seralphia:'images/monsters/seralphia.webp',
  rikasheef:'images/monsters/rikasheef.webp',
  false_dragon_gamma:"images/monsters/false_dragon_gamma.webp",
  false_dragon_beta:"images/monsters/false_dragon_beta.webp",
  false_dragon_alfa:"images/monsters/false_dragon_alfa.webp",
  voltax:"images/monsters/voltax.webp",
  spaquinn:"images/monsters/spaquinn.webp",
  goblin:"images/monsters/goblin.webp",
  slime_gold:"images/monsters/slime_gold.webp",
  slime:"images/monsters/slime.webp",
  granbeat:"images/monsters/granbeat.webp",
  thornbeat:"images/monsters/thornbeat.webp",
  elnaWater:"images/monsters/elna_water.webp",
  suiren:"images/monsters/suiren.webp",
  elnaAdvanced:"images/monsters/elna_advanced.webp",
  elnaMiddle:"images/monsters/elna_middle.webp",
  elna:"images/monsters/elna_beginner.webp",
  doomNemesion:"images/monsters/doom_nemesion.webp",
  nemesion:"images/monsters/nemesion.webp",
  nemesia:"images/monsters/nemesia.webp",
  nemes:"images/monsters/nemes.webp",
  basicChart:"images/monsters/basicChart.webp",
  specialChart:"images/monsters/specialChart.webp",
  icegolem:"images/monsters/icegolem.webp",
  volteck:"images/monsters/volteck.webp",
  nightmare:"images/monsters/nightmare.webp",
  shenhairon:"images/monsters/shenhairon.webp",
  tienhairon:"images/monsters/tienhairon.webp",
  highaquaron:"images/monsters/highaquaron.webp",
  grassbeat:"images/monsters/grassbeat.webp",
  aquaron:"images/monsters/aquaron.webp",
  freiwolf:"images/monsters/freiwolf.webp",
  freigal:"images/monsters/freigal.webp",
  goddess:"images/monsters/hikari.webp",
  elysia_prologue:"images/monsters/elysia_prologue_v1.webp",
  elysia_prayer:"images/monsters/elysia_prayer_v1.webp",
  elysia_goddess:"images/monsters/elysia_goddess_v1.webp",
  galdra:"images/monsters/galdra_v1.webp",
  tsubaki:'images/monsters/tsubaki.webp',
  elnaKaen:'images/monsters/elna_kaen.webp',
  alchemion:'images/monsters/alchemion.webp',
  kimeragna:'images/monsters/kimeragna.webp',
  sylphin:'images/monsters/sylphin.webp',
  zephyray:'images/monsters/zephyray.webp',
  tempestray:'images/monsters/tempestray.webp',
  ignaros:'images/monsters/ignaros.webp',
  nocle:'images/monsters/nocle.webp',
  noclaid:'images/monsters/noclaid.webp',
  noxvelg:'images/monsters/noxvelg.webp',
  luxseed:'images/monsters/luxseed.webp',
  luxiard:'images/monsters/luxiard.webp',
  lux_galdion:'images/monsters/lux_galdion.webp',
  astralepis:'images/monsters/astralepis.webp',
  kimeragna_apex:'images/monsters/kimeragna_apex.webp',
  elixion:'images/monsters/elixion.webp'
};
const MAPIMG={
  magic_academy:'images/maps/magic_academy.webp',
  grassland:'images/maps/grassland.webp',
  grass:'images/maps/grass.webp',
  volcano:'images/maps/volcano.webp',
  lake:'images/maps/lake.webp',
  snow_mountain:'images/maps/snow_mountain.webp',
  snow:'images/maps/snow.webp',
  starsea:'images/maps/starsea.webp',
  water_secret:'images/maps/water_secret.webp',
  world_between:'images/maps/world_between.webp',
  forest:"images/maps/forest.webp",
  ruined_village:"images/maps/ruined_village.webp",
  light_plain:"images/maps/light_plain.webp",
  starry_plain:'images/maps/starry_plain.webp'
,
  highland_ruins:'images/maps/highland_ruins.webp',
  arena:'images/maps/arena.webp',
  seikai_irie:'images/maps/seikai_irie.webp',
  kaiyu_kaiiki:'images/maps/kaiyu_kaiiki.webp',
  deep_sea_end:'images/maps/deep_sea_end.webp',
  kaen_village:'images/maps/kaen_village.webp',
  golden_land:'images/maps/golden_land.webp'
};

/* ===== マップデータ ===== */
const MAPS = [
  {id:'grassland', name:'草原', image:MAPIMG.grassland, chapter:'序章', region:'中央平原', desc:'旅の始まりに広がる穏やかな草原。森・雷・無属性の生き物が行き交う。',
   enemyIds:['slime','grassbeat','volteck','slime_gold','goblin','spaquinn','voltax','rikasheef','seralphia','sylphin','sylphin','zephyray']},
  {id:'volcano', name:'火山', image:MAPIMG.volcano, chapter:'序章', region:'南部火山帯', desc:'灼熱の溶岩と火山灰に覆われた危険地帯。火に適応したモンスターが多い。',
   enemyIds:['freigal','freigal','freiwolf','tsubaki','tsubaki','goblin','ignaros']},
  {id:'lake', name:'湖', image:MAPIMG.lake, chapter:'序章', region:'中央水域', desc:'澄んだ水をたたえる静かな湖。水辺を好むモンスターが集まる。',
   enemyIds:['aquaron','highaquaron','suiren','goblin','proto_icegolem']},
  {id:'seikai_irie', name:'蒼海の入り江', image:MAPIMG.seikai_irie, chapter:'序章', region:'蒼海地方', desc:'青い海と岩礁が入り組む入り江。浅瀬から外洋性の水棲種まで姿を見せる。',
   enemyIds:['aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','highaquaron','highaquaron','highaquaron','highaquaron','orcana','orcana','orcana','orcana','shenhairon','tienhairon','orca_stream']},
  {id:'kaiyu_kaiiki', name:'回遊海域', image:MAPIMG.kaiyu_kaiiki, chapter:'序章', region:'蒼海地方', desc:'巨大な海流が巡る外洋。群れとともに強力な水棲モンスターが回遊する。',
   enemyIds:['highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','orcana','orcana','orcana','orcana','orcana','orcana','orcana','orcana','orcana','orcana','shenhairon','shenhairon','shenhairon','shenhairon','tienhairon','tienhairon','tienhairon','tienhairon','orca_stream','orca_stream','orca_stream','orca_abyss']},
  {id:'deep_sea_end', name:'深き海の果て', image:MAPIMG.deep_sea_end, chapter:'序章', region:'蒼海地方', desc:'光の届かない深海の最奥。深淵に適応した強大な存在が潜む。',
   enemyIds:['orca_stream','orca_stream','orca_stream','orca_stream','orca_stream','orca_stream','orca_stream','orca_stream','shenhairon','shenhairon','shenhairon','shenhairon','tienhairon','tienhairon','tienhairon','tienhairon','orca_abyss','orca_abyss','orca_abyss']},
  {id:'snow_mountain', name:'雪山', image:MAPIMG.snow_mountain, chapter:'序章', region:'北部山岳', desc:'一年を通じて雪と氷に閉ざされた山岳。寒冷地に強い種が生息する。',
   enemyIds:['icegolem','proto_icegolem','slime','aquaron','goblin']},
  {id:'forest', name:'森林', image:MAPIMG.forest, chapter:'序章', region:'緑樹地方', desc:'深い緑と古木が広がる森林。森の力を宿す多様な生命が暮らす。',
   enemyIds:['grassbeat','grassbeat','grassbeat','grassbeat','grassbeat','grassbeat','grassbeat','rikasheef','rikasheef','rikasheef','rikasheef','thornbeat','thornbeat','thornbeat','thornbeat','thornbeat','granbeat','granbeat','seralphia','seralphia','slime','slime','slime','goblin','goblin','nightmare']},
  {id:'light_plain', name:'光の平原', image:MAPIMG.light_plain, chapter:'序章', region:'光明地方', desc:'柔らかな光が絶えず降り注ぐ平原。光属性のモンスターが力を得る。',
   enemyIds:['hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','slime','slime','slime','goblin','goblin','suiren','aquaron','luxseed','luxseed','luxseed','luxiard']},
  {id:'starry_plain', name:'星空の平原', image:MAPIMG.starry_plain, chapter:'序章', region:'星見地方', desc:'昼夜を問わず星が瞬く不思議な平原。星の力を宿す種が現れる。',
   enemyIds:['nemes','nemes','nemes','nemes','nemes','nemes','nemes','nemes','nemesia','nemesia','nemesia','nemesia','nemesion','slime','slime','goblin','goblin','volteck','spaquinn','nightmare','astralepis']},
  {id:'highland_ruins', name:'高原遺跡', image:MAPIMG.highland_ruins, chapter:'序章', region:'雷鳴高原', desc:'風雨にさらされた古代遺跡。高所に集まる雷と風の力が残響する。',
   enemyIds:['volteck','volteck','volteck','volteck','volteck','volteck','volteck','volteck','spaquinn','spaquinn','spaquinn','spaquinn','spaquinn','spaquinn','volmoog','volmoog','volmoog','voltax','voltax','slime','goblin','sylphin','sylphin','zephyray','tempestray']},
  {id:'arena', name:'闘技場', image:MAPIMG.arena, chapter:'序章', region:'王都地方', desc:'戦士たちが腕を競う石造りの闘技場。鍛え上げられた剣士と対峙する。',
   enemyIds:['elna_beginner','elna_beginner','elna_beginner','elna_beginner','elna_beginner','elna_middle','elna_middle','elna_middle','elna_advanced']},
  {id:'magic_academy', name:'魔導学園', image:MAPIMG.magic_academy, chapter:'序章', region:'王都地方', desc:'魔法を学ぶ者たちが集う学園。星と無属性の術式が研究されている。',
   enemyIds:['stella_apprentice','stella_apprentice','stella_apprentice','stella_apprentice','stella_wizard','stella_wizard','stella_sorcerer','lumina_apprentice','lumina_apprentice','lumina_apprentice','lumina_wizard','lumina_wizard','lumina_sorcerer']},
  {id:'ruined_village', name:'廃村跡', image:MAPIMG.ruined_village, chapter:'序章', region:'影森地方', desc:'人の気配が絶えた村の跡。夜になると闇のモンスターが徘徊する。',
   enemyIds:['nightmare','nightmare','nightmare','nightmare','goblin','slime','nocle','nocle','nocle','noclaid','noxvelg']},
  {id:'starsea', name:'遥かなる星の海', image:MAPIMG.starsea, chapter:'序章', region:'星界', desc:'地上から隔絶された星の海。滅亡の力を帯びた存在へ至る特異領域。',
   enemyIds:['nemesion','doom_nemesion'], bossOnly:true, appearRate:0.10},
  {id:'water_secret', name:'流水の秘境', image:MAPIMG.water_secret, chapter:'序章', region:'蒼海地方', desc:'清流と水鏡に守られた秘境。選ばれた水の使い手だけが姿を見せる。',
   enemyIds:['elna_water','suiren'], rareOnly:true, appearRate:0.12},
  {id:'world_between', name:'世界の狭間', image:MAPIMG.world_between, chapter:'序章', region:'境界領域', desc:'世界と世界の境目に生じた裂け目。法則から外れた偽竜が出現する。',
   enemyIds:['false_dragon_alfa','false_dragon_beta','false_dragon_gamma'], bossOnly:true, appearRate:0.08},
  {id:'kaen_village', name:'華炎の里', image:MAPIMG.kaen_village, chapter:'序章', region:'南部火山帯', desc:'火の恵みとともに暮らす里。炎を操る戦士とモンスターが集う。',
   enemyIds:['tsubaki','tsubaki','tsubaki','elna_kaen']},
  {id:'golden_land', name:'黄金郷', image:MAPIMG.golden_land, chapter:'序章', region:'幻の領域', desc:'黄金の輝きに満ちた希少領域。莫大なコインをもたらす存在が棲む。',
   enemyIds:['slime_gold'], rareOnly:true, goldenLand:true, expeditionExcluded:true}

];

/* ===== 属性名 ===== */
const TN = {
  fire:'火', water:'水', thunder:'雷', wind:'風', grass:'森',
  light:'光', dark:'闇', star:'星', dragon:'竜', normal:'無'
};

const TYPE_ICONS={fire:'🔥',water:'💧',thunder:'⚡',wind:'🌪️',grass:'🌳',light:'✨',dark:'🌑',star:'⭐',dragon:'🐉',normal:'⚪'};
const INITIAL_PARTY_IDS=Object.freeze(['elna_beginner','freigal','aquaron']);
const ADV = {
  fire:    {grass:1.5, water:.7},
  water:   {fire:1.5, thunder:.7},
  thunder: {water:1.5, wind:.7},
  wind:    {thunder:1.5, grass:.7},
  grass:   {wind:1.5, fire:.7},
  light:   {dark:1.5, star:.7},
  dark:    {star:1.5, light:.7},
  star:    {light:1.5, dark:.7},
  dragon:  {dragon:1.2}
};
const BATTLE_STATUS_EFFECTS = Object.freeze({
  poison:Object.freeze({duration:3, maxHpDamageRate:.10})
});

/* ===== モンスターデータ ===== */
const M = [
  {id:'freigal',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'freigal',no:1,name:'フレイガル',rarity:'★',types:['fire'],huntLevels:{normal:8},
   hp:120,spd:70,catchRate:.35,evolution:'freiwolf',evolutionLevel:2,
   desc:'炎をまとう子狼。',
   moves:[["火炎牙",28,"fire",null,null,null,null,null,"skill_freigal_01"],["フレイムクロー",24,"fire",null,null,null,null,null,"skill_freigal_02"],["爆炎チャージ",42,"fire","recoil",null,null,null,null,"skill_freigal_03"],["フレアチャージ",35,"fire","flare_charge",null,2,"炎をまとって突撃し、次の攻撃の威力を高める。",null,"skill_freigal_04"]]},
  {id:'freiwolf',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'freiwolf',no:2,name:'フレイウルフ',rarity:'★★',types:['fire'],huntLevels:{normal:20,hard:46},
   evolutionOnly:true,hp:155,spd:82,catchRate:.18,
   desc:'フレイガルが進化した姿。',
   moves:[["炎狼牙",36,"fire",null,null,null,null,null,"skill_freiwolf_01"],["フレアラッシュ",45,"fire","recoil",null,null,null,null,"skill_freiwolf_02"],["猛火の咆哮",0,"fire","buff",null,null,null,null,"skill_freiwolf_03"]]},
  {id:'aquaron',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'aquaron',no:3,name:'アクアロン',rarity:'★',types:['water','dragon'],huntLevels:{normal:7},
   hp:130,spd:55,catchRate:.35,evolution:'highaquaron',evolutionLevel:2,
   desc:'水辺にすむ小さな龍。',
   moves:[["水流弾",26,"water",null,null,null,null,null,"skill_aquaron_01"],["しっぽ打ち",20,"normal",null,null,null,null,null,"skill_aquaron_02"],["大波召喚",38,"water",null,null,null,null,null,"skill_aquaron_03"],["アクアシールド",0,"water","aqua_shield",null,2,"水の盾を展開し、次に受ける攻撃ダメージを半減する。",null,"skill_aquaron_04"]]},
  {id:'highaquaron',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'highaquaron',no:4,name:'ハイアクアロン',rarity:'★★',types:['water','dragon'],huntLevels:{normal:20,hard:48},
   evolutionOnly:true,hp:165,spd:68,catchRate:.16,
   evolutions:[{level:3,to:'shenhairon'},{level:3,to:'tienhairon'}],
   desc:'アクアロンが進化した姿。水流と竜の力をより強く操る。',
   moves:[["水竜弾",36,"water",null,null,null,null,null,"skill_highaquaron_01"],["竜の尾撃",32,"dragon",null,null,null,null,null,"skill_highaquaron_02"],["ハイドロスパイラル",52,"water",null,null,null,null,null,"skill_highaquaron_03"]]},
  {id:'shenhairon',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'shenhairon',no:5,name:'シェンハイロン',rarity:'★★★',types:['water','dragon'],huntLevels:{normal:44,hard:74},
   evolutionOnly:true,hp:210,spd:58,catchRate:.08,
   desc:'ハイアクアロンが神海の力を得て進化した姿。水の王のような威厳を持つ。',
   moves:[["神海の爪",46,"water",null,null,null,null,null,"skill_shenhairon_01"],["蒼竜の咆哮",42,"dragon","buff",null,null,null,null,"skill_shenhairon_02"],["海王瀑流",68,"water",null,null,null,null,null,"skill_shenhairon_03"]]},
  {id:'tienhairon',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'tienhairon',no:6,name:'ティエンハイロン',rarity:'★★★',types:['water','dragon'],huntLevels:{normal:44,hard:74},
   evolutionOnly:true,hp:200,spd:76,catchRate:.08,
   desc:'ハイアクアロンが天海の力を得て進化した姿。優雅さと強大な水流を持つ。',
   moves:[["天海の舞",0,"water","heal",null,null,null,null,"skill_tienhairon_01"],["月華水刃",48,"water",null,null,null,null,null,"skill_tienhairon_02"],["蒼天龍波",66,"dragon",null,null,null,null,null,"skill_tienhairon_03"]]},
  {id:'grassbeat',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'grassbeat',no:7,name:'グラスビート',rarity:'★',types:['grass'],huntLevels:{normal:6},
   hp:110,spd:62,catchRate:.45,evolution:'thornbeat',evolutionLevel:2,
   desc:'草むらの小型モンスター。',
   moves:[["リーフカッター",27,"grass",null,null,null,null,null,"skill_grassbeat_01"],["吸収",18,"grass","drain",null,null,null,null,"skill_grassbeat_02"],["森の一撃",40,"grass",null,null,null,null,null,"skill_grassbeat_03"],["ポイズンニードル",18,"grass","poison",0.6,1,"毒を帯びた針を放ち、相手を毒状態にする。",null,"skill_grassbeat_04"],["スリープパウダー",0,"grass","sleep",0.7,2,"眠りを誘う粉をまき、相手を深い眠りに落とす。",null,"skill_grassbeat_05"],["トキシックガーデン",40,"grass","poison",0.7,4,"猛毒の植物園を生み出し、相手を強い毒で包み込む。",null,"skill_grassbeat_06"]]},
  {id:'thornbeat',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'thornbeat',no:8,name:'ソーンビート',rarity:'★★',types:['grass'],huntLevels:{normal:19,hard:47},
   evolutionOnly:true,evolution:'granbeat',evolutionLevel:3,hp:155,spd:48,catchRate:.18,
   desc:'グラスビートが進化した姿。鋭い棘と硬い甲殻で森を守る守護虫。',
   moves:[["ソーンホーン",36,"grass",null,null,null,null,null,"skill_thornbeat_01"],["森の甲殻",0,"grass","guard",null,null,null,null,"skill_thornbeat_02"],["スパイクラッシュ",54,"grass",null,null,null,null,null,"skill_thornbeat_03"]]},
  {id:'granbeat',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'granbeat',no:9,name:'グランビート',rarity:'★★★',types:['grass'],huntLevels:{normal:42,hard:72},
   evolutionOnly:true,hp:215,spd:35,catchRate:.08,
   desc:'ソーンビートが進化した森の重装守護者。',
   moves:[["グランホーン",50,"grass",null,null,null,null,null,"skill_granbeat_01"],["森王の装甲",0,"grass","guard",null,null,null,null,"skill_granbeat_02"],["ガイアスラッシュ",72,"grass",null,null,null,null,null,"skill_granbeat_03"]]},
  {id:'rikasheef',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'rikasheef',no:32,name:'リカシーフ',rarity:'★',types:['grass'],huntLevels:{normal:10},
   hp:95,spd:78,catchRate:.38,evolution:'seralphia',evolutionLevel:3,
   desc:'森の光を宿した小鹿のようなモンスター。若葉の角から生命力を放つ。',
   moves:[["若葉の突進",24,"grass",null,null,null,null,null,"skill_rikasheef_01"],["癒しの芽吹き",0,"grass","heal",null,null,null,null,"skill_rikasheef_02"],["リーフスパーク",36,"grass",null,null,null,null,null,"skill_rikasheef_03"]]},
  {id:'seralphia',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'seralphia',no:33,name:'セラルフィア',rarity:'★★★',types:['grass'],huntLevels:{normal:46,hard:76},
   hp:225,spd:92,catchRate:.10,
   desc:'リカシーフが進化した神秘の森鹿。花咲く角と翠の翼で森に清浄な風を巡らせる。',
   moves:[["翠翼の突風",42,"grass",null,null,null,null,null,"skill_seralphia_01"],["森精の祝福",0,"grass","heal",null,null,null,null,"skill_seralphia_02"],["セラフィックリーフ",68,"grass",null,null,null,null,null,"skill_seralphia_03"]]},
  {id:'nightmare',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'nightmare',no:10,name:'ナイトメア',rarity:'★★',types:['dark'],huntLevels:{normal:28,hard:58},
   hp:105,spd:88,catchRate:.24,
   desc:'暗闇から現れる影の魔物。',
   moves:[["影打ち",25,"dark",null,null,null,null,null,"skill_nightmare_01"],["呪いの視線",18,"dark","debuff",null,null,null,null,"skill_nightmare_02"],["闇の波動",44,"dark",null,null,null,null,null,"skill_nightmare_03"]]},
  {id:'volteck',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'volteck',no:11,name:'ボルテック',rarity:'★',types:['thunder','wind'],huntLevels:{normal:9},
   hp:100,spd:95,catchRate:.35,evolution:'spaquinn',evolutionLevel:2,
   desc:'雷雲を飛ぶ鳥型モンスター。',
   moves:[["雷つつき",30,"thunder",null,null,null,null,null,"skill_volteck_01"],["急降下",24,"wind",null,null,null,null,null,"skill_volteck_02"],["雷鳴弾",46,"thunder",null,null,null,null,null,"skill_volteck_03"],["サンダーボルト",30,"thunder","paralysis",0.3,2,"強力な電撃を放ち、敵の身体をしびれさせる。",null,"skill_volteck_04"],["パラライズショック",15,"thunder","paralysis",0.8,2,"強烈なしびれを引き起こす電撃を放つ。",null,"skill_volteck_05"],["サンダーストーム",45,"thunder","paralysis",0.5,4,"激しい雷嵐を巻き起こし、相手を麻痺させる。",null,"skill_volteck_06"],["ライトニングチェイン",28,"thunder","repeat_attack",0.3,3,"連鎖する電撃を放ち、一定確率でもう一度攻撃する。",null,"skill_volteck_07"]]},
  {id:'spaquinn',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'spaquinn',no:12,name:'スパクイン',rarity:'★★',types:['thunder','wind'],huntLevels:{normal:21,hard:50},
   evolutionOnly:true,evolution:'voltax',evolutionLevel:3,hp:170,spd:105,catchRate:.35,
   desc:'ボルテックが進化した雷風の猛禽モンスター。雷をまとい、空中から鋭く襲いかかる。',
   moves:[["雷撃",34,"thunder",null,null,null,null,null,"skill_spaquinn_01"],["突風",28,"wind",null,null,null,null,null,"skill_spaquinn_02"],["スパークダイブ",42,"thunder",null,null,null,null,null,"skill_spaquinn_03"]]},
  {id:'voltax',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'voltax',no:13,name:'ボルタックス',rarity:'★★★',types:['thunder','wind'],huntLevels:{normal:43,hard:73},
   evolutionOnly:true,hp:240,spd:115,catchRate:.22,
   desc:'スパクインが進化した雷風の王。黒金の翼で嵐を裂き、雷雲そのものを操る。',
   moves:[["雷嵐",48,"thunder",null,null,null,null,null,"skill_voltax_01"],["暴風刃",42,"wind",null,null,null,null,null,"skill_voltax_02"],["ボルテックストーム",62,"thunder",null,null,null,null,null,"skill_voltax_03"],["疾風迅雷",58,["thunder","wind"],null,null,6,"雷と風を同時にまとい、神速の一撃を放つ。",null,"skill_voltax_04"]]},
  {id:'icegolem',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'icegolem',no:15,name:'アイスゴーレム',rarity:'★★',types:['water'],huntLevels:{normal:26,hard:56},
   hp:145,spd:32,catchRate:.28,
   desc:'氷河から生まれた水属性のゴーレム。',
   moves:[["氷の拳",26,"water",null,null,null,null,null,"skill_icegolem_01"],["守りを固める",0,"normal","guard",null,null,null,null,"skill_icegolem_02"],["凍結クラッシュ",40,"water",null,null,null,null,null,"skill_icegolem_03"]]},
  {id:'proto_icegolem',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'proto_icegolem',no:14,name:'プロトアイスゴーレム',rarity:'★★',types:['water'],huntLevels:{normal:18,hard:44},
   hp:180,spd:18,catchRate:.16,
   desc:'古代の氷核から造られた試作型ゴーレム。アイスゴーレムより鈍重だが、破壊力に優れる。',
   moves:[["氷塊拳",44,"water",null,null,null,null,null,"skill_proto_icegolem_01"],["重装防御",0,"normal","guard",null,null,null,null,"skill_proto_icegolem_02"],["大氷河クラッシュ",70,"water",null,null,null,null,null,"skill_proto_icegolem_03"]]},
  {id:'elysia',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'elysia_prologue',no:62,name:'エリシア',rarity:'★★',types:['light'],unitType:'character',characterNo:12,contractable:false,
   hp:120,spd:82,catchRate:0,evolution:'elysia_prayer',evolutionLevel:2,
   desc:'古代文明で暮らす、明るく心優しい少女。自らに宿る大きな光の力には、まだ気づいていない。',
   moves:[["光雫弾",30,"light",null,null,null,null,null,"skill_elysia_01"],["祈りの癒し",0,"light","heal",null,null,null,null,"skill_elysia_02"],["希望の光",0,"light","buff",null,null,null,null,"skill_elysia_03"]]},
  {id:'elysia_prayer',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'elysia_prayer',no:63,name:'光祈の巫女エリシア',rarity:'★★★',types:['light'],unitType:'character',characterNo:13,contractable:false,
   evolutionOnly:true,evolution:'hikari',evolutionLevel:3,hp:158,spd:88,catchRate:0,
   desc:'人々の安寧を願い、聖なる光へ祈りを捧げる巫女。やがて女神へ至る力が静かに目覚め始めている。',
   moves:[["祈光弾",42,"light",null,null,null,null,null,"skill_elysia_prayer_01"],["聖祈の癒し",0,"light","heal",null,null,null,null,"skill_elysia_prayer_02"],["光祈結界",0,"light","guard",null,null,null,null,"skill_elysia_prayer_03"]]},
  {id:'hikari',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'elysia_goddess',no:16,name:'光の女神エリシア',rarity:'★★★★',types:['light'],huntLevels:{hard:88},unitType:'character',characterNo:14,contractable:false,
   evolutionOnly:true,hp:175,spd:90,catchRate:0,bossClass:'ボス級',
   desc:'祈りと光の力によって神格へ至ったエリシア。失われた古代文明の記憶を胸の奥に宿している。',
   moves:[["聖光の槍",38,"light",null,null,null,null,null,"skill_hikari_01"],["ヒールオーラ",0,"light","heal",null,null,null,null,"skill_hikari_02"],["ジャッジメント",58,"light",null,null,null,null,null,"skill_hikari_03"]]},
  {id:'nemes',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'nemes',no:17,name:'ネメス',rarity:'★★',types:['star','dragon'],huntLevels:{normal:24,hard:52},
   hp:125,spd:78,catchRate:.22,evolution:'nemesia',evolutionLevel:2,
   desc:'星の力を宿した幼き竜。',
   moves:[["星屑の牙",32,"star",null,null,null,null,null,"skill_nemes_01"],["竜のひっかき",26,"dragon",null,null,null,null,null,"skill_nemes_02"],["コスモブレス",44,"star",null,null,null,null,null,"skill_nemes_03"],["イリュージョン",15,"star","confusion",0.6,2,"幻覚を見せ、敵の判断を狂わせる。",null,"skill_nemes_04"],["ベノムブレス",30,"dragon","poison",0.4,2,"毒を含んだ竜の息吹を浴びせる。",null,"skill_nemes_05"]]},
  {id:'nemesia',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'nemesia',no:18,name:'ネメシア',rarity:'★★★',types:['star','dragon'],huntLevels:{normal:48,hard:78},
   evolutionOnly:true,evolution:'nemesion',evolutionLevel:3,hp:185,spd:92,catchRate:.1,
   desc:'ネメスが進化した星竜。星雲の魔力を翼に宿す。',
   moves:[["星雲の爪",42,"star",null,null,null,null,null,"skill_nemesia_01"],["竜星ブレス",50,"dragon",null,null,null,null,null,"skill_nemesia_02"],["コズミックノヴァ",68,"star",null,null,null,null,null,"skill_nemesia_03"]]},
  {id:'nemesion',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'nemesion',no:19,name:'ネメシオン',rarity:'★★★★',types:['star','dragon'],huntLevels:{hard:92},
   evolutionOnly:true,hp:240,spd:100,catchRate:.04,bossClass:'ボス級',
   desc:'ネメシアが進化した星竜の最終形態。銀河を裂く力を持つ。',
   moves:[["星界の爪",56,"star",null,null,null,null,null,"skill_nemesion_01"],["銀河竜波",62,"dragon",null,null,null,null,null,"skill_nemesion_02"],["アストラルエンド",82,"star",null,null,null,null,null,"skill_nemesion_03"]]},
  {id:'doom_nemesion',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'doomNemesion',no:20,name:'滅亡の星 ネメシオン',rarity:'★★★★★',types:['star','dragon'],
   evolutionOnly:true,hp:300,spd:85,catchRate:.02,bossClass:'超ボス級',dropItem:'doom_fragment',dropItemName:'滅亡のカケラ',
   desc:'ネメシオンが滅亡の星の力を得た最終形態。星を喰らい終焉の光を放つ。倒すと「滅亡のカケラ」を落とす。',
   moves:[["滅星爪",70,"star",null,null,null,null,null,"skill_doom_nemesion_01"],["終焉竜波",78,"dragon",null,null,null,null,null,"skill_doom_nemesion_02"],["アポカリプスノヴァ",100,"star","recoil",null,null,null,null,"skill_doom_nemesion_03"]]},
  {id:'elna_beginner',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'elna',no:21,name:'初級剣士エルナ',rarity:'★',types:['normal'],huntLevels:{normal:10},unitType:'character',characterNo:1,contractable:false,
   hp:115,spd:65,catchRate:.35,evolution:'elna_middle',evolutionLevel:2,
   desc:'冒険者として歩み始めたばかりの少女剣士。',
   moves:[["斬りつけ",24,"normal",null,null,null,null,null,"skill_elna_beginner_01"],["見習いの構え",0,"normal","guard",null,null,null,null,"skill_elna_beginner_02"],["勇気の一撃",36,"normal",null,null,null,null,null,"skill_elna_beginner_03"]]},
  {id:'elna_middle',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'elnaMiddle',no:22,name:'中級剣士エルナ',rarity:'★★',types:['normal'],huntLevels:{normal:24,hard:52},unitType:'character',characterNo:2,contractable:false,
   evolutionOnly:true,evolution:'elna_advanced',evolutionLevel:3,hp:150,spd:78,catchRate:.18,
   desc:'初級剣士エルナが成長した姿。安定した剣技を身につけた。',
   moves:[["連続斬り",34,"normal",null,null,null,null,null,"skill_elna_middle_01"],["受け流し",0,"normal","guard",null,null,null,null,"skill_elna_middle_02"],["白刃一閃",50,"normal",null,null,null,null,null,"skill_elna_middle_03"]]},
  {id:'elna_advanced',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'elnaAdvanced',no:23,name:'上級剣士エルナ',rarity:'★★★',types:['normal'],huntLevels:{normal:45,hard:75},unitType:'character',characterNo:3,contractable:false,
   evolutionOnly:true,hp:190,spd:88,catchRate:.1,
   desc:'中級剣士エルナがさらに成長した姿。磨き抜かれた剣技で戦場を切り開く。',
   moves:[["閃光斬り",46,"normal",null,null,null,null,null,"skill_elna_advanced_01"],["剣士の集中",0,"normal","buff",null,null,null,null,"skill_elna_advanced_02"],["白銀連斬",64,"normal",null,null,null,null,null,"skill_elna_advanced_03"]]},
  {id:'suiren',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'suiren',no:24,name:'水の精霊スイレン',rarity:'★★',types:['water'],huntLevels:{normal:27,hard:58},
   hp:135,spd:72,catchRate:.2,dropItem:'water_mirror',dropItemName:'水鏡',
   desc:'清らかな水辺に現れる水の精霊。倒すと「水鏡」を落とす。',
   moves:[["水霊弾",32,"water",null,null,null,null,null,"skill_suiren_01"],["癒しの水",0,"water","heal",null,null,null,null,"skill_suiren_02"],["水鏡の波紋",46,"water",null,null,null,null,null,"skill_suiren_03"]]},
  {id:'elna_water',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'elnaWater',no:25,name:'流水の剣士エルナ',rarity:'★★★★',types:['water','normal'],huntLevels:{hard:90},unitType:'character',characterNo:4,contractable:false,
   evolutionOnly:true,hp:220,spd:96,catchRate:.06,bossClass:'ボス級',
   desc:'上級剣士エルナが水鏡の力で進化した姿。流れる水のような剣技で敵を翻弄する。',
   moves:[["流水斬り",54,"water",null,null,null,null,null,"skill_elna_water_01"],["水鏡の構え",0,"water","guard",null,null,null,null,"skill_elna_water_02"],["蒼流連閃",76,"water",null,null,null,null,null,"skill_elna_water_03"]]},
  {id:'slime',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'slime',no:26,name:'スライム',rarity:'★',types:['normal'],huntLevels:{normal:5},
   hp:55,spd:40,catchRate:.45,expBonus:80,
   desc:'ぷるぷるした弱めのモンスター。倒すと大量の経験値を得られる。',
   moves:[["たいあたり",14,"normal",null,null,null,null,null,"skill_slime_01"],["ぷるぷる",0,"normal","guard",null,null,null,null,"skill_slime_02"],["スライムアタック",22,"normal",null,null,null,null,null,"skill_slime_03"]]},
  {id:'slime_gold',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'slime_gold',no:27,name:'スライムゴールド',rarity:'★★',types:['normal'],huntLevels:{normal:30,hard:60},
   hp:70,spd:85,catchRate:.25,coinBonus:200,
   desc:'金色に輝く珍しいスライム。倒すと大量のコインを落とす。',
   moves:[["たいあたり",16,"normal",null,null,null,null,null,"skill_slime_gold_01"],["きんいろボディ",0,"normal","guard",null,null,null,null,"skill_slime_gold_02"],["ゴールドアタック",25,"normal",null,null,null,null,null,"skill_slime_gold_03"]]},
  {id:'goblin',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'goblin',no:28,name:'ゴブリン',rarity:'★',types:['normal'],huntLevels:{normal:7},
   hp:80,spd:50,catchRate:.70,coinBonus:5,expBonus:10,
   desc:'どのマップにも現れる雑魚モンスター。原始的な武器を持ち、群れで行動することが多い。',
   moves:[["棍棒攻撃",18,"normal",null,null,null,null,null,"skill_goblin_01"],["威嚇",0,"normal","guard",null,null,null,null,"skill_goblin_02"],["毒の短剣",22,"normal","poison",null,null,null,null,"skill_goblin_03"]]},
  {id:'false_dragon_alfa',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'false_dragon_alfa',no:29,name:'偽竜 code:alfa',rarity:'★★★★★',types:['normal','light'],
   hp:360,spd:82,catchRate:.05,bossClass:'超ボス級',
   desc:'神に似せて造られた銀色の偽竜。無機質な装甲と光の力を持つ、超ボス級モンスター。',
   moves:[["虚光砲",70,"light",null,null,null,null,null,"skill_false_dragon_alfa_01"],["偽神の爪",58,"normal",null,null,null,null,null,"skill_false_dragon_alfa_02"],["コード・アルファ",88,"light",null,null,null,null,null,"skill_false_dragon_alfa_03"]]},
  {id:'false_dragon_beta',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'false_dragon_beta',no:30,name:'偽竜 code:beta',rarity:'★★★★★',types:['normal','light'],
   hp:390,spd:88,catchRate:.04,bossClass:'超ボス級',
   desc:'世界の狭間に現れる二体目の偽竜。白銀の装甲翼を広げ、空間を裂く光を放つ超ボス級モンスター。',
   moves:[["断界光",76,"light",null,null,null,null,null,"skill_false_dragon_beta_01"],["偽竜の翼撃",62,"normal",null,null,null,null,null,"skill_false_dragon_beta_02"],["コード・ベータ",94,"light",null,null,null,null,null,"skill_false_dragon_beta_03"]]},
  {id:'false_dragon_gamma',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'false_dragon_gamma',no:31,name:'偽竜 code:gamma',rarity:'★★★★★',types:['normal','light'],
   hp:420,spd:94,catchRate:.035,bossClass:'超ボス級',
   desc:'世界の狭間に現れる三体目の偽竜。完成度を増した銀翼の機械竜で、光と虚無を同時に操る超ボス級モンスター。',
   moves:[["虚無光翼",82,"light",null,null,null,null,null,"skill_false_dragon_gamma_01"],["偽竜の咆哮",66,"normal",null,null,null,null,null,"skill_false_dragon_gamma_02"],["コード・ガンマ",100,"light",null,null,null,null,null,"skill_false_dragon_gamma_03"]]},
  {id:'volmoog',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'volmoog',no:34,name:'ボルモーグ',rarity:'★★',types:['thunder'],huntLevels:{normal:23,hard:51},
   hp:155,spd:72,catchRate:.20,evolution:'gran_volmoog',evolutionLevel:2,
   desc:'雷をまとった獣型モンスター。巨大な爪で大地を砕き、帯電した岩片を巻き上げて襲いかかる。',
   moves:[["雷爪",34,"thunder",null,null,null,null,null,"skill_volmoog_01"],["帯電咆哮",0,"thunder","guard",null,null,null,null,"skill_volmoog_02"],["ボルテッククロー",56,"thunder",null,null,null,null,null,"skill_volmoog_03"]]},
  {id:'gran_volmoog',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'gran_volmoog',no:35,name:'グランボルモーグ',rarity:'★★★',types:['thunder'],huntLevels:{normal:45,hard:75},
   hp:245,spd:66,catchRate:.12,
   desc:'ボルモーグが進化した雷獣の巨体。結晶化した装甲と巨大な爪に雷をまとい、大地を割るほどの一撃を放つ。',
   moves:[["雷岩砕き",48,"thunder",null,null,null,null,null,"skill_gran_volmoog_01"],["帯電結晶鎧",0,"thunder","guard",null,null,null,null,"skill_gran_volmoog_02"],["グランボルトクロー",78,"thunder",null,null,null,null,null,"skill_gran_volmoog_03"]]},
  {id:'stella_apprentice',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'stella_apprentice',no:36,name:'見習い魔法使いステラ',rarity:'★★',types:['star','light'],huntLevels:{normal:22,hard:50},unitType:'character',characterNo:6,contractable:false,
   hp:115,spd:90,catchRate:.20,evolution:'stella_wizard',evolutionLevel:2,
   desc:'魔導学園で星魔法を学ぶ見習い魔法使い。明るい笑顔と未完成ながら鋭い魔力で戦う。',
   moves:[["星屑弾",30,"star",null,null,null,null,null,"skill_stella_apprentice_01"],["マジックショット",24,"normal",null,null,null,null,null,"skill_stella_apprentice_02"],["スターブースト",0,"star","buff",null,null,null,null,"skill_stella_apprentice_03"]]},
  {id:'stella_wizard',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'stella_wizard',no:37,name:'魔法使いステラ',rarity:'★★★',types:['star','light'],huntLevels:{normal:46,hard:76},unitType:'character',characterNo:7,contractable:false,
   evolutionOnly:true,evolution:'stella_sorcerer',evolutionLevel:3,hp:155,spd:102,catchRate:.10,
   desc:'見習い魔法使いステラが成長した姿。星の魔力を自在に操り、軽やかな詠唱で戦場を照らす魔法使い。',
   moves:[["スターライトレイ",42,"star",null,null,null,null,null,"skill_stella_wizard_01"],["マジックバースト",36,"normal",null,null,null,null,null,"skill_stella_wizard_02"],["アストラルフレア",64,"star",null,null,null,null,null,"skill_stella_wizard_03"]]},
  {id:'stella_sorcerer',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'stella_sorcerer',no:38,name:'魔導師ステラ',rarity:'★★★★',types:['star','light'],huntLevels:{hard:88},unitType:'character',characterNo:8,contractable:false,
   evolutionOnly:true,hp:205,spd:112,catchRate:.06,
   desc:'魔法使いステラがさらに成長した姿。星辰の知識と高位魔術を操る魔導師。幾つもの魔導書を従え、戦場を星の光で支配する。',
   moves:[["星天の裁き",56,"star",null,null,null,null,null,"skill_stella_sorcerer_01"],["グランドマジック",44,"normal",null,null,null,null,null,"skill_stella_sorcerer_02"],["コスモスアーク",86,"star",null,null,null,null,null,"skill_stella_sorcerer_03"]]},
  {id:'lumina_apprentice',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'lumina_apprentice',no:39,name:'見習い魔法使いルミナ',rarity:'★★',types:['star','dark'],huntLevels:{normal:22,hard:50},unitType:'character',characterNo:9,contractable:false,
   hp:110,spd:88,catchRate:.20,evolution:'lumina_wizard',evolutionLevel:2,
   desc:'魔導学園で星魔法を学ぶ内気な見習い魔法使い。魔導書を大切に抱え、静かな詠唱で星の力を呼び出す。',
   moves:[["星光弾",28,"star",null,null,null,null,null,"skill_lumina_apprentice_01"],["マジックノート",24,"normal",null,null,null,null,null,"skill_lumina_apprentice_02"],["ルミナスチャージ",0,"star","buff",null,null,null,null,"skill_lumina_apprentice_03"]]},
  {id:'lumina_wizard',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'lumina_wizard',no:40,name:'魔法使いルミナ',rarity:'★★★',types:['star','dark'],huntLevels:{normal:46,hard:76},unitType:'character',characterNo:10,contractable:false,
   evolutionOnly:true,evolution:'lumina_sorcerer',evolutionLevel:3,hp:155,spd:98,catchRate:.10,
   desc:'見習い魔法使いルミナが成長した姿。星の術式を丁寧に編み上げる魔法使いで、静かな魔力から鋭い星光魔法を放つ。',
   moves:[["星月の光弾",40,"star",null,null,null,null,null,"skill_lumina_wizard_01"],["マジックブルーム",34,"normal",null,null,null,null,null,"skill_lumina_wizard_02"],["ルミナスレイ",62,"star",null,null,null,null,null,"skill_lumina_wizard_03"]]},
  {id:'lumina_sorcerer',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'lumina_sorcerer',no:41,name:'魔導師ルミナ',rarity:'★★★★',types:['star','dark'],huntLevels:{hard:90},unitType:'character',characterNo:11,contractable:false,
   evolutionOnly:true,hp:205,spd:108,catchRate:.06,
   desc:'魔法使いルミナがさらに成長した姿。静謐な星術と高位魔法を操る魔導師。青白い星の結晶と術式で戦場を包み込む。',
   moves:[["星晶の裁き",54,"star",null,null,null,null,null,"skill_lumina_sorcerer_01"],["ルミナスマジック",46,"normal",null,null,null,null,null,"skill_lumina_sorcerer_02"],["セレスティアルレイ",84,"star",null,null,null,null,null,"skill_lumina_sorcerer_03"]]},
  {id:'orcana',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'orcana',no:42,name:'オルカーナ',rarity:'★★',types:['water'],huntLevels:{normal:22,hard:50},
   hp:160,spd:76,catchRate:.16,evolution:'orca_stream',evolutionLevel:2,
   desc:'蒼海の入り江に現れる水属性のシャチ型モンスター。蒼い結晶の背びれと水流をまとい、海中を俊敏に泳ぐ。',
   moves:[["アクアテイル",34,"water",null,null,null,null,null,"skill_orcana_01"],["蒼海の突進",38,"water",null,null,null,null,null,"skill_orcana_02"],["クリスタルウェーブ",56,"water",null,null,null,null,null,"skill_orcana_03"]]},
  {id:'orca_stream',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'orca_stream',no:43,name:'オルカストリーム',rarity:'★★★',types:['water'],huntLevels:{normal:47,hard:77},
   evolutionOnly:true,evolution:'orca_abyss',evolutionLevel:3,hp:220,spd:88,catchRate:.10,
   desc:'オルカーナが進化した姿。蒼海の水流と結晶をまとい、海中を疾走する水属性のシャチ型モンスター。',
   moves:[["ストリームテイル",44,"water",null,null,null,null,null,"skill_orca_stream_01"],["蒼流の突撃",52,"water",null,null,null,null,null,"skill_orca_stream_02"],["オルカウェーブ",72,"water",null,null,null,null,null,"skill_orca_stream_03"]]},
  {id:'orca_abyss',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'orca_abyss',no:44,name:'オルカアビス',rarity:'★★★★',types:['water'],huntLevels:{hard:90},
   evolutionOnly:true,hp:285,spd:98,catchRate:.06,
   desc:'オルカストリームが深海の魔力を得て進化した姿。蒼い結晶と渦巻く水流をまとい、深き海の果てを支配する水属性のシャチ型モンスター。',
   moves:[["アビステイル",56,"water",null,null,null,null,null,"skill_orca_abyss_01"],["深海の奔流",68,"water",null,null,null,null,null,"skill_orca_abyss_02"],["オルカアビス",92,"water",null,null,null,null,null,"skill_orca_abyss_03"]]},
  {id:'tsubaki',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'tsubaki',no:45,name:'炎の精霊ツバキ',rarity:'★★',types:['fire'],huntLevels:{normal:28,hard:58},
   hp:185,spd:88,catchRate:.12,dropItem:'fire_orb',dropItemName:'炎玉',dropRate:.30,
   desc:'華炎の里や火山に現れる炎の精霊。花弁のような結晶翼から灼熱の炎を放つ。倒すと30%の確率で「炎玉」を落とす。',
   moves:[["火花の舞",36,"fire",null,null,null,null,null,"skill_tsubaki_01"],["灼熱花弁",48,"fire",null,null,null,null,null,"skill_tsubaki_02"],["炎華結界",0,"fire","guard",null,null,null,null,"skill_tsubaki_03"]]},
  {id:'elna_kaen',entityKind:'character',eligibility:{"contract":false,"alchemyCatalyst":false,"alchemySuccess":false,"alchemyFailure":false},imgKey:'elnaKaen',no:46,name:'華炎の剣士エルナ',rarity:'★★★★',types:['fire','normal'],huntLevels:{hard:92},unitType:'character',characterNo:5,contractable:false,
   hp:235,spd:102,catchRate:.05,bossClass:'ボス級',
   desc:'炎玉の力を受け、華炎を剣に宿したエルナの新たな姿。舞う花弁のような炎で敵を斬り裂く。',
   moves:[["華炎斬り",58,"fire",null,null,null,null,null,"skill_elna_kaen_01"],["炎花の構え",0,"fire","guard",null,null,null,null,"skill_elna_kaen_02"],["紅蓮連閃",80,"fire",null,null,null,null,null,"skill_elna_kaen_03"]]},
  {id:'alchemion',entityKind:'monster',eligibility:{"contract":false,"alchemyCatalyst":true,"alchemySuccess":true,"alchemyFailure":false},imgKey:'alchemion',no:47,name:'錬核獣アルケミオン',rarity:'★★★',types:['normal'],
   hp:180,spd:75,catchRate:0,contractable:false,alchemyExclusive:true,
   desc:'錬成核から生まれる無属性の錬成限定モンスター。個体ごとに異なる能力傾向を持つ。',
   moves:[["錬核崩砕",140,"normal","alchemy_recoil",null,5,"攻撃後、実際に与えたダメージの25％を反動として受ける。","alchemion","skill_alchemion_01"]]},
  {id:'kimeragna',entityKind:'monster',eligibility:{"contract":false,"alchemyCatalyst":true,"alchemySuccess":true,"alchemyFailure":false},imgKey:'kimeragna',no:48,name:'混成翼竜キメラグナ',rarity:'★★★',types:['wind','dragon'],
   hp:150,spd:100,catchRate:0,contractable:false,alchemyExclusive:true,evolution:'kimeragna_apex',evolutionLevel:5,
   desc:'風と竜の性質を併せ持つ錬成限定の翼竜。猛毒を帯びた翼で獲物を追い詰める。',
   moves:[["猛毒翔破",110,"wind","poison",0.4,4,"40％の確率で相手を3ターンの毒状態にする。","kimeragna","skill_kimeragna_01"]]},

  // no は旧セーブ互換用の不変レコード番号。dexNo がモンスター図鑑の表示番号。
  {id:'sylphin',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'sylphin',no:51,dexNo:21,name:'シルフィン',rarity:'★',types:['wind'],huntLevels:{normal:8},
   hp:100,spd:90,catchRate:.40,evolution:'zephyray',evolutionLevel:2,
   desc:'風を受けて草原を泳ぐ、小さな空翔けマンタ。胸びれで穏やかな気流を生み出す。',
   moves:[["そよ風のひれ",26,"wind",null,null,null,null,null,"skill_sylphin_01"],["エアスライド",22,"wind",null,null,null,null,null,"skill_sylphin_02"],["風まとう",0,"wind","buff",null,null,null,null,"skill_sylphin_03"]]},
  {id:'zephyray',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'zephyray',no:52,dexNo:22,name:'ゼファーレイ',rarity:'★★',types:['wind'],huntLevels:{normal:19,hard:47},
   evolutionOnly:true,evolution:'tempestray',evolutionLevel:3,hp:155,spd:108,catchRate:.18,
   desc:'シルフィンが成長した風翼マンタ。鋭い翼で大気を切り、渓谷を滑るように飛ぶ。',
   moves:[["ゼファーカッター",38,"wind",null,null,null,null,null,"skill_zephyray_01"],["旋風回避",0,"wind","guard",null,null,null,null,"skill_zephyray_02"],["スカイランページ",56,"wind",null,null,null,null,null,"skill_zephyray_03"]]},
  {id:'tempestray',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'tempestray',no:53,dexNo:23,name:'テンペストレイ',rarity:'★★★',types:['wind'],huntLevels:{normal:45,hard:75},
   evolutionOnly:true,hp:220,spd:125,catchRate:.08,
   desc:'ゼファーレイが嵐の力を得た姿。巨大な風翼で雷雲をかき回し、暴風を支配する。',
   moves:[["テンペストフィン",50,"wind",null,null,null,null,null,"skill_tempestray_01"],["嵐翼の守り",0,"wind","guard",null,null,null,null,"skill_tempestray_02"],["天嵐大旋回",76,"wind",null,null,null,null,null,"skill_tempestray_03"]]},
  {id:'ignaros',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'ignaros',no:54,dexNo:25,name:'イグナロス',rarity:'★★',types:['fire'],huntLevels:{normal:25,hard:54},
   hp:180,spd:52,catchRate:.16,
   desc:'火口の熱を鎧に変える灼熱獣。重い甲殻の内側で絶えず溶岩が脈打つ。',
   moves:[["溶岩角",40,"fire",null,null,null,null,null,"skill_ignaros_01"],["灼熱装甲",0,"fire","guard",null,null,null,null,"skill_ignaros_02"],["火口崩し",62,"fire","recoil",null,null,null,null,"skill_ignaros_03"]]},
  {id:'nocle',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'nocle',no:55,dexNo:36,name:'ノクル',rarity:'★',types:['dark','dragon'],huntLevels:{normal:12},
   hp:112,spd:74,catchRate:.38,evolution:'noclaid',evolutionLevel:2,
   desc:'月影の洞窟に潜む小さな夜竜。光を避け、闇の中を音もなく進む。',
   moves:[["影牙",28,"dark",null,null,null,null,null,"skill_nocle_01"],["夜滑り",24,"dragon",null,null,null,null,null,"skill_nocle_02"],["月蝕の気配",0,"dark","buff",null,null,null,null,"skill_nocle_03"]]},
  {id:'noclaid',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'noclaid',no:56,dexNo:37,name:'ノクレイド',rarity:'★★',types:['dark','dragon'],huntLevels:{normal:24,hard:52},
   evolutionOnly:true,evolution:'noxvelg',evolutionLevel:3,hp:160,spd:88,catchRate:.17,
   desc:'ノクルが月影をまとって成長した幼竜。滑空しながら闇の刃を放つ。',
   moves:[["ムーンシャドウ",38,"dark",null,null,null,null,null,"skill_noclaid_01"],["夜竜爪",36,"dragon",null,null,null,null,null,"skill_noclaid_02"],["暗月障壁",0,"dark","guard",null,null,null,null,"skill_noclaid_03"]]},
  {id:'noxvelg',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'noxvelg',no:57,dexNo:38,name:'ノクスヴェルグ',rarity:'★★★',types:['dark','dragon'],huntLevels:{normal:50,hard:80},
   evolutionOnly:true,hp:230,spd:104,catchRate:.07,
   desc:'ノクレイドが月光さえ呑み込む夜竜へ進化した姿。深い闇で獲物の感覚を奪う。',
   moves:[["夜天竜牙",50,"dark",null,null,null,null,null,"skill_noxvelg_01"],["蝕月咆哮",46,"dragon","debuff",null,null,null,null,"skill_noxvelg_02"],["ノクスエクリプス",78,["dark","dragon"],null,null,6,"闇と竜気を重ね、月光を呑む一撃を放つ。",null,"skill_noxvelg_03"]]},
  {id:'luxseed',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'luxseed',no:58,dexNo:39,name:'ルクシード',rarity:'★',types:['light','dragon'],huntLevels:{normal:12},
   hp:118,spd:68,catchRate:.38,evolution:'luxiard',evolutionLevel:2,
   desc:'陽だまりの森に生まれる小さな光竜。体内に集めた朝の光を分け与える。',
   moves:[["光芽弾",28,"light",null,null,null,null,null,"skill_luxseed_01"],["幼竜の尾",24,"dragon",null,null,null,null,null,"skill_luxseed_02"],["朝光の息吹",0,"light","heal",null,null,null,null,"skill_luxseed_03"]]},
  {id:'luxiard',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'luxiard',no:59,dexNo:40,name:'ルクシアード',rarity:'★★',types:['light','dragon'],huntLevels:{normal:24,hard:52},
   evolutionOnly:true,evolution:'lux_galdion',evolutionLevel:3,hp:168,spd:80,catchRate:.17,
   desc:'ルクシードが朝光を蓄えて成長した幼竜。輝く角で仲間を導く。',
   moves:[["ルクスホーン",38,"light",null,null,null,null,null,"skill_luxiard_01"],["光竜爪",36,"dragon",null,null,null,null,null,"skill_luxiard_02"],["黎明障壁",0,"light","guard",null,null,null,null,"skill_luxiard_03"]]},
  {id:'lux_galdion',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'lux_galdion',no:60,dexNo:41,name:'ルクスガルディオン',rarity:'★★★',types:['light','dragon'],
   evolutionOnly:true,hp:245,spd:92,catchRate:.07,
   desc:'ルクシアードが守護の光を極めた姿。黄金の光翼で大地を覆い、邪気を退ける。',
   moves:[["守光竜牙",50,"light",null,null,null,null,null,"skill_lux_galdion_01"],["聖竜の庇護",0,"light","guard",null,null,null,null,"skill_lux_galdion_02"],["ガルディオンレイ",78,["light","dragon"],null,null,6,"光と竜気を束ねた守護竜の奔流を放つ。",null,"skill_lux_galdion_03"]]},
  {id:'astralepis',entityKind:'monster',eligibility:{"contract":true,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":true},imgKey:'astralepis',no:61,dexNo:16,name:'アストラレピス',rarity:'★★',types:['star'],huntLevels:{normal:22,hard:50},
   hp:150,spd:110,catchRate:.16,
   desc:'星空を軽やかに跳ぶ蒼い兎獣。長い耳で星の魔力を集め、尾に輝きを蓄える。',
   moves:[["星兎跳",38,"star",null,null,null,null,null,"skill_astralepis_01"],["アストラルステップ",0,"star","buff",null,null,null,null,"skill_astralepis_02"],["流星蹴り",60,"star",null,null,null,null,null,"skill_astralepis_03"]]},
  {id:'galdra',entityKind:'monster',eligibility:{"contract":false,"alchemyCatalyst":true,"alchemySuccess":true,"alchemyFailure":false},imgKey:'galdra',no:64,dexNo:46,name:'ガルドラ',rarity:'★★',types:['normal','dragon'],
   hp:148,spd:86,catchRate:0,contractable:false,alchemyExclusive:true,
   desc:'錬成陣から生まれた黒い幼竜。胸の蒼い錬成核に力を秘め、恥ずかしがりながらも信頼した相手のそばを懸命に飛ぶ。',
   moves:[["黒錬牙",36,"normal",null,null,null,null,null,"skill_galdra_01"],["幼竜翼撃",32,"dragon",null,null,null,null,null,"skill_galdra_02"],["蒼核ブレス",52,["normal","dragon"],null,null,4,"蒼い錬成核の力を息吹へ変えて放つ。",null,"skill_galdra_03"]]},
  {id:'kimeragna_apex',entityKind:'monster',eligibility:{"contract":false,"alchemyCatalyst":true,"alchemySuccess":false,"alchemyFailure":false},imgKey:'kimeragna_apex',no:49,dexNo:49,name:'キメラグナ・アペクス',rarity:'★★★★',types:['wind','dragon'],
   evolutionOnly:true,hp:315,spd:132,catchRate:0,contractable:false,alchemyExclusive:true,
   desc:'キメラグナが混成魔力の極点へ到達した姿。雷光と猛毒をまとい、巨翼で戦場を制圧する。',
   moves:[["猛毒天翔破",82,"wind","poison",0.6,4,"60％の確率で相手を3ターンの毒状態にする。",null,"skill_kimeragna_apex_01"],["混成竜雷",72,["thunder","dragon"],null,null,6,"雷と竜気を重ねた混成魔力を放つ。",null,"skill_kimeragna_apex_02"],["アペクスストーム",108,["wind","dragon"],"recoil",null,7,"極限の嵐を解放する代わりに反動を受ける。",null,"skill_kimeragna_apex_03"]]},
  {id:'elixion',entityKind:'monster',eligibility:{"contract":false,"alchemyCatalyst":true,"alchemySuccess":true,"alchemyFailure":false},imgKey:'elixion',no:50,dexNo:50,name:'賢金神竜エリクシオン',rarity:'★★★★★',types:['normal','dragon'],
   hp:330,spd:112,catchRate:0,contractable:false,alchemyExclusive:true,
   desc:'星宮の賢金から錬成される神竜。白銀の一尾に無垢な錬成力と知識を宿す、最高位の錬成限定種。',
   moves:[["賢金錬輪",76,"normal",null,null,null,null,null,"skill_elixion_01"],["神竜錬壁",0,"dragon","guard",null,null,null,null,"skill_elixion_02"],["エリクシオン・ノヴァ",112,["normal","dragon"],null,null,8,"無垢な錬成力と神竜の力を束ねた大爆発を起こす。",null,"skill_elixion_03"]]}

];

/* ===== ユニット能力タグ =====
 * 技の装備条件は属性だけでなく、キャラクター職・武器・モンスターの身体構造も参照する。
 * 既存のユニットIDや技IDは変更せず、タグは既存データへ加算する。
 */
const UNIT_TAG_GROUPS = Object.freeze([
  Object.freeze({ids:['elna_beginner','elna_middle','elna_advanced','elna_water','elna_kaen'], tags:['class:swordsman','weapon:sword']}),
  Object.freeze({ids:['stella_apprentice','stella_wizard','stella_sorcerer','lumina_apprentice','lumina_wizard','lumina_sorcerer'], tags:['class:mage','weapon:staff','capability:magic']}),
  Object.freeze({ids:['freigal','freiwolf'], tags:['species:beast','anatomy:fang','anatomy:claw','capability:roar','capability:charge']}),
  Object.freeze({ids:['aquaron','highaquaron','shenhairon','tienhairon'], tags:['species:dragon','anatomy:fang','anatomy:claw','anatomy:tail','capability:breath','capability:roar','capability:magic']}),
  Object.freeze({ids:['grassbeat','thornbeat','granbeat'], tags:['species:insect','anatomy:horn','armor:shell','capability:spore','capability:charge']}),
  Object.freeze({ids:['rikasheef','seralphia'], tags:['species:beast','anatomy:horn','capability:magic','capability:charge']}),
  Object.freeze({ids:['seralphia'], tags:['anatomy:wing']}),
  Object.freeze({ids:['nightmare'], tags:['species:spirit','capability:magic']}),
  Object.freeze({ids:['volteck','spaquinn','voltax'], tags:['species:avian','anatomy:beak','anatomy:wing','capability:magic','capability:charge']}),
  Object.freeze({ids:['icegolem','proto_icegolem'], tags:['species:construct','anatomy:fist','armor:heavy','capability:charge']}),
  Object.freeze({ids:['elysia','elysia_prayer'], tags:['species:humanoid','capability:magic']}),
  Object.freeze({ids:['hikari'], tags:['origin:divine','species:humanoid','capability:magic']}),
  Object.freeze({ids:['nemes','nemesia','nemesion','doom_nemesion'], tags:['species:dragon','anatomy:fang','anatomy:claw','anatomy:wing','capability:breath','capability:magic']}),
  Object.freeze({ids:['suiren','tsubaki'], tags:['origin:spirit','species:spirit','capability:magic']}),
  Object.freeze({ids:['tsubaki'], tags:['anatomy:wing']}),
  Object.freeze({ids:['slime','slime_gold'], tags:['species:slime','anatomy:body','capability:charge']}),
  Object.freeze({ids:['goblin'], tags:['species:humanoid','weapon:club','weapon:dagger','capability:roar']}),
  Object.freeze({ids:['false_dragon_alfa','false_dragon_beta','false_dragon_gamma'], tags:['species:dragon','origin:construct','anatomy:claw','anatomy:wing','capability:beam','capability:roar','capability:magic']}),
  Object.freeze({ids:['volmoog','gran_volmoog'], tags:['species:beast','anatomy:claw','armor:heavy','capability:roar','capability:charge']}),
  Object.freeze({ids:['orcana','orca_stream','orca_abyss'], tags:['species:aquatic','anatomy:fin','anatomy:tail','capability:magic','capability:charge']}),
  Object.freeze({ids:['alchemion'], tags:['origin:alchemy','species:construct','anatomy:body']}),
  Object.freeze({ids:['galdra'], tags:['origin:alchemy','species:dragon','anatomy:fang','anatomy:tail','anatomy:wing','capability:breath','capability:magic']}),
  Object.freeze({ids:['kimeragna','kimeragna_apex'], tags:['origin:alchemy','species:dragon','anatomy:claw','anatomy:wing','capability:breath','capability:charge']}),
  Object.freeze({ids:['sylphin','zephyray','tempestray'], tags:['species:aquatic','anatomy:fin','anatomy:wing','capability:charge','capability:magic']}),
  Object.freeze({ids:['ignaros'], tags:['species:beast','anatomy:horn','armor:heavy','capability:charge']}),
  Object.freeze({ids:['nocle','noclaid','noxvelg'], tags:['species:dragon','anatomy:fang','anatomy:claw','anatomy:wing','capability:breath','capability:roar','capability:magic']}),
  Object.freeze({ids:['luxseed','luxiard','lux_galdion','elixion'], tags:['species:dragon','anatomy:fang','anatomy:claw','anatomy:tail','anatomy:wing','capability:breath','capability:magic']}),
  Object.freeze({ids:['elixion'], tags:['origin:alchemy','origin:divine']}),
  Object.freeze({ids:['astralepis'], tags:['species:beast','anatomy:leg','anatomy:tail','capability:magic','capability:charge']})
]);
const UNIT_TAGS_BY_ID = Object.create(null);
UNIT_TAG_GROUPS.forEach(group => group.ids.forEach(id => {
  if (!UNIT_TAGS_BY_ID[id]) UNIT_TAGS_BY_ID[id] = [];
  UNIT_TAGS_BY_ID[id].push(...group.tags);
}));
M.forEach(unit => {
  const baseTags = [
    `entity:${unit.entityKind}`,
    ...(unit.types || []).map(type => `element:${type}`)
  ];
  unit.tags = Object.freeze([...new Set([...baseTags, ...(UNIT_TAGS_BY_ID[unit.id] || [])])]);
});
Object.freeze(UNIT_TAGS_BY_ID);

/* ===== 合成レシピ ===== */
const FUSIONS = [
  {from:'elna_advanced', item:'water_mirror', itemName:'水鏡', count:1, to:'elna_water'},
  {from:'nemesion', item:'doom_fragment', itemName:'滅亡のカケラ', count:1, to:'doom_nemesion'},
  {from:'elna_advanced', item:'fire_orb', itemName:'炎玉', count:1, to:'elna_kaen', repeatable:true}
];

/* ===== アイテム定義 ===== */
const SHOP_ITEMS = [
  {id:'potion', name:'回復薬', icon:'💊', price:20, desc:'バトル中にHPを50回復する。', battleDesc:'味方のHPを50回復する。', usableInBattle:true},
  {id:'upper_potion', name:'上回復薬', icon:'💉', price:40, desc:'バトル中にHPを120回復する。', battleDesc:'味方のHPを120回復する。', usableInBattle:true},
  {id:'attack_potion', name:'力の薬', icon:'⚡', price:20, desc:'味方モンスターの攻撃力を倍にする。', battleDesc:'現在戦っている味方モンスターの攻撃力を2倍にする。', usableInBattle:true},
  {id:'contract_scroll', name:'契約書', icon:'📜', price:20, desc:'討伐後、モンスターとの契約を試みるための書類。', battleDesc:'討伐後に相手モンスターとの契約を試みる。成功すると手持ちに加わる。', usableInBattle:false, contract:true, catchMultiplier:1},
  {id:'silver_contract_scroll', name:'銀の契約書', icon:'📃', price:40, desc:'通常の契約書より契約成功率が高い銀色の書類。討伐後に使用できる。', battleDesc:'討伐後、通常の契約書より高い確率で契約を試みる。', usableInBattle:false, contract:true, catchMultiplier:2},
  {id:'gold_contract_scroll', name:'金の契約書', icon:'📒', price:80, desc:'銀の契約書より契約成功率がさらに高い金色の書類。討伐後に使用できる。', battleDesc:'討伐後、銀の契約書よりさらに高い確率で契約を試みる。', usableInBattle:false, contract:true, catchMultiplier:3},
  {id:'rainbow_contract_scroll', name:'虹の契約書', icon:'🌈', price:160, desc:'金の契約書より契約成功率がさらに高い虹色の書類。討伐後に使用できる。', battleDesc:'討伐後、金の契約書よりさらに高い確率で契約を試みる。', usableInBattle:false, contract:true, catchMultiplier:5},
  {id:'kilo_data', name:'キロデータ', icon:'💾', price:0, desc:'モンスターに与えるとEXPが20増える経験値アイテム。アイテムガチャで入手できる。', expItem:true, expAmount:20, shop:false},
  {id:'mega_data', name:'メガデータ', icon:'💿', price:0, desc:'モンスターに与えるとEXPが100増える経験値アイテム。アイテムガチャで入手できる。', expItem:true, expAmount:100, shop:false},
  {id:'giga_data', name:'ギガデータ', icon:'🧠', price:0, desc:'モンスターに与えるとEXPが500増える経験値アイテム。アイテムガチャで入手できる。', expItem:true, expAmount:500, shop:false},
  {id:'fire_orb', name:'炎玉', icon:'🔥', price:0, desc:'ツバキが落とす炎の力を宿した結晶。将来の合成・特殊進化素材として使用できる。', shop:false},
  {id:'monster_bone', name:'魔物の骨', icon:'🦴', price:25, desc:'魔物から得られる丈夫な骨。錬成素材として使用する。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'normal'},
  {id:'fine_monster_bone', name:'上質な魔物の骨', icon:'✨🦴', price:60, desc:'傷が少なく魔力の通りが良い上質な魔物の骨。錬成素材として使用する。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'fine'},
  {id:'magic_crystal', name:'魔晶石', icon:'💎', price:40, desc:'魔力が結晶化した石。錬成素材として使用する。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'normal'},
  {id:'fine_magic_crystal', name:'上質な魔晶石', icon:'✨💎', price:90, desc:'高密度の魔力を蓄えた上質な魔晶石。錬成素材として使用する。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'fine'},
  {id:'metal_ore', name:'金属鉱石', icon:'⛏️', price:35, desc:'錬成加工に適した金属を含む鉱石。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'normal'},
  {id:'fine_metal_ore', name:'上質な金属鉱石', icon:'✨⛏️', price:80, desc:'不純物が少なく加工しやすい上質な金属鉱石。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'fine'},
  {id:'unstable_alchemy_matter', name:'不安定錬成物質', icon:'🧪', price:50, desc:'性質が定まらない反応性の高い錬成素材。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'normal'},
  {id:'fine_unstable_alchemy_matter', name:'上質な不安定錬成物質', icon:'✨🧪', price:110, desc:'不安定さの中に高密度の錬成力を保つ上質な物質。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'fine'},
  {id:'raptor_feather', name:'猛禽の羽', icon:'🪶', price:45, desc:'空を駆ける猛禽から得られる、風の力を帯びた羽。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'normal'},
  {id:'fine_raptor_feather', name:'上質な猛禽の羽', icon:'✨🪶', price:100, desc:'強い風の魔力を保った傷のない猛禽の羽。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'fine'},
  {id:'venom_carapace', name:'毒虫の甲殻', icon:'🪲', price:50, desc:'毒性を残した硬い虫の甲殻。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'normal'},
  {id:'fine_venom_carapace', name:'上質な毒虫の甲殻', icon:'✨🪲', price:110, desc:'毒性と強度を高い水準で保つ上質な虫の甲殻。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'fine'},
  {id:'golden_land_map', name:'黄金郷への地図', icon:'🗺️', price:0, desc:'使用すると、次の討伐依頼候補に黄金郷が確定で出現する。黄金郷へ出発した時に1枚消費する。', category:'特殊アイテム', obtain:'遠征の希少報酬／Hard・Extreme討伐依頼の勝利報酬', shop:false, usableFromDex:true}

];
const ALCHEMY_MATERIAL_DROPS = Object.freeze([
  Object.freeze({id:'monster_bone', rate:.06}),
  Object.freeze({id:'magic_crystal', rate:.055}),
  Object.freeze({id:'metal_ore', rate:.055}),
  Object.freeze({id:'unstable_alchemy_matter', rate:.06}),
  Object.freeze({id:'raptor_feather', rate:.055}),
  Object.freeze({id:'venom_carapace', rate:.055}),
  Object.freeze({id:'fine_monster_bone', rate:.018}),
  Object.freeze({id:'fine_magic_crystal', rate:.017}),
  Object.freeze({id:'fine_metal_ore', rate:.017}),
  Object.freeze({id:'fine_unstable_alchemy_matter', rate:.018}),
  Object.freeze({id:'fine_raptor_feather', rate:.015}),
  Object.freeze({id:'fine_venom_carapace', rate:.015})
]);
const ALCHEMY_ARCHETYPES = Object.freeze([
  Object.freeze({id:'attack', label:'攻撃型', modifiers:Object.freeze({hp:.90, attack:1.15, speed:1})}),
  Object.freeze({id:'durability', label:'耐久型', modifiers:Object.freeze({hp:1.15, attack:1, speed:.90})}),
  Object.freeze({id:'speed', label:'速度型', modifiers:Object.freeze({hp:1, attack:.90, speed:1.15})})
]);
const ALCHEMY_MONSTER_CONFIGS = Object.freeze({
  galdra:Object.freeze({
    monsterId:'galdra',
    archetypes:ALCHEMY_ARCHETYPES,
    exclusiveMoveIndexes:Object.freeze([2])
  }),
  alchemion:Object.freeze({
    monsterId:'alchemion',
    archetypes:ALCHEMY_ARCHETYPES,
    exclusiveMoveIndexes:Object.freeze([0])
  }),
  kimeragna:Object.freeze({
    monsterId:'kimeragna',
    archetypes:ALCHEMY_ARCHETYPES,
    exclusiveMoveIndexes:Object.freeze([0])
  }),
  elixion:Object.freeze({
    monsterId:'elixion',
    archetypes:ALCHEMY_ARCHETYPES,
    exclusiveMoveIndexes:Object.freeze([0, 2])
  })
});
const GALDRA_SUCCESS_CANDIDATES = Object.freeze([
  Object.freeze({
    monsterId:'galdra', weight:1, alchemyInstance:true,
    conditions:Object.freeze({}),
    unlockConditions:Object.freeze([]),
    requiredCoinOptionIds:Object.freeze([]),
    guaranteeConditions:Object.freeze([])
  })
]);
const ALCHEMION_SUCCESS_CANDIDATES = Object.freeze([
  Object.freeze({
    monsterId:'alchemion', weight:1, alchemyInstance:true,
    conditions:Object.freeze({}),
    unlockConditions:Object.freeze([]),
    requiredCoinOptionIds:Object.freeze([]),
    guaranteeConditions:Object.freeze([])
  })
]);
const KIMERAGNA_SUCCESS_CANDIDATES = Object.freeze([
  Object.freeze({
    monsterId:'kimeragna', weight:1, alchemyInstance:true,
    conditions:Object.freeze({}),
    unlockConditions:Object.freeze([]),
    requiredCoinOptionIds:Object.freeze([]),
    guaranteeConditions:Object.freeze([])
  })
]);
const ELIXION_SUCCESS_CANDIDATES = Object.freeze([
  Object.freeze({
    monsterId:'elixion', weight:1, alchemyInstance:true,
    conditions:Object.freeze({}),
    unlockConditions:Object.freeze([]),
    requiredCoinOptionIds:Object.freeze([]),
    guaranteeConditions:Object.freeze([])
  })
]);
const ALCHEMY_FAILURE_CANDIDATES = Object.freeze([
  'freigal','aquaron','grassbeat','rikasheef','nightmare','volteck','icegolem',
  'proto_icegolem','nemes','suiren','slime','slime_gold','goblin','volmoog','orcana',
  'sylphin','ignaros','nocle','luxseed','astralepis'
].map(monsterId => Object.freeze({
  monsterId, weight:1, alchemyInstance:false,
  conditions:Object.freeze({
    requiresNormalWildMap:true,
    excludeBossClass:true,
    excludeEvolutionOnly:true,
    excludeAlchemyExclusive:true
  }),
  unlockConditions:Object.freeze([]),
  requiredCoinOptionIds:Object.freeze([]),
  guaranteeConditions:Object.freeze([])
})));
const ALCHEMY_HIGH_EVOLUTION_FAILURE_CANDIDATES = Object.freeze([
  'shenhairon','tienhairon','granbeat','seralphia','voltax','nemesia',
  'gran_volmoog','orca_stream','tempestray','noxvelg','lux_galdion'
].map(monsterId => Object.freeze({
  monsterId, weight:1, alchemyInstance:false,
  conditions:Object.freeze({
    requiresEvolutionDefinition:true,
    exactRarity:3,
    excludeBossClass:true,
    excludeAlchemyExclusive:true
  }),
  unlockConditions:Object.freeze([]),
  requiredCoinOptionIds:Object.freeze(['high']),
  guaranteeConditions:Object.freeze([])
})));
const ALCHEMY_ALL_FAILURE_CANDIDATES = Object.freeze([
  ...ALCHEMY_FAILURE_CANDIDATES,
  ...ALCHEMY_HIGH_EVOLUTION_FAILURE_CANDIDATES
]);
const ALCHEMY_COIN_OPTIONS = Object.freeze([
  Object.freeze({id:'low', amount:50, bonus:-10, label:'少額', minimumFailureRarity:null}),
  Object.freeze({id:'standard', amount:100, bonus:0, label:'標準', minimumFailureRarity:2}),
  Object.freeze({id:'high', amount:250, bonus:15, label:'高額', minimumFailureRarity:3})
]);
const ALCHEMY_RECIPES = Object.freeze([
  Object.freeze({
    recipeId:'alchemion_standard',
    displayName:'錬核獣アルケミオン',
    materialChoices:Object.freeze([
      Object.freeze({label:'魔物の骨', normal:'monster_bone', fine:'fine_monster_bone'}),
      Object.freeze({label:'魔晶石', normal:'magic_crystal', fine:'fine_magic_crystal'}),
      Object.freeze({label:'金属鉱石', normal:'metal_ore', fine:'fine_metal_ore'}),
      Object.freeze({label:'不安定錬成物質', normal:'unstable_alchemy_matter', fine:'fine_unstable_alchemy_matter'})
    ]),
    coinOptions:ALCHEMY_COIN_OPTIONS,
    defaultCoinOptionId:'standard',
    baseSuccessRate:30,
    fineMaterialBonus:5,
    minSuccessRate:10,
    maxSuccessRate:70,
    successCandidates:ALCHEMION_SUCCESS_CANDIDATES,
    failureCandidates:ALCHEMY_ALL_FAILURE_CANDIDATES
  }),
  Object.freeze({
    recipeId:'galdra_standard',
    displayName:'ガルドラ',
    materialChoices:Object.freeze([
      Object.freeze({label:'魔物の骨', normal:'monster_bone', fine:'fine_monster_bone'}),
      Object.freeze({label:'魔晶石', normal:'magic_crystal', fine:'fine_magic_crystal'}),
      Object.freeze({label:'不安定錬成物質', normal:'unstable_alchemy_matter', fine:'fine_unstable_alchemy_matter'}),
      Object.freeze({label:'猛禽の羽', normal:'raptor_feather', fine:'fine_raptor_feather'})
    ]),
    coinOptions:ALCHEMY_COIN_OPTIONS,
    defaultCoinOptionId:'standard',
    baseSuccessRate:30,
    fineMaterialBonus:5,
    minSuccessRate:10,
    maxSuccessRate:70,
    successCandidates:GALDRA_SUCCESS_CANDIDATES,
    failureCandidates:ALCHEMY_ALL_FAILURE_CANDIDATES
  }),
  Object.freeze({
    recipeId:'kimeragna_standard',
    displayName:'混成翼竜キメラグナ',
    materialChoices:Object.freeze([
      Object.freeze({label:'魔物の骨', normal:'monster_bone', fine:'fine_monster_bone'}),
      Object.freeze({label:'不安定錬成物質', normal:'unstable_alchemy_matter', fine:'fine_unstable_alchemy_matter'}),
      Object.freeze({label:'猛禽の羽', normal:'raptor_feather', fine:'fine_raptor_feather'}),
      Object.freeze({label:'毒虫の甲殻', normal:'venom_carapace', fine:'fine_venom_carapace'})
    ]),
    coinOptions:ALCHEMY_COIN_OPTIONS,
    defaultCoinOptionId:'standard',
    baseSuccessRate:30,
    fineMaterialBonus:5,
    minSuccessRate:10,
    maxSuccessRate:70,
    successCandidates:KIMERAGNA_SUCCESS_CANDIDATES,
    failureCandidates:ALCHEMY_ALL_FAILURE_CANDIDATES
  }),
  Object.freeze({
    recipeId:'elixion_standard',
    displayName:'賢金神竜エリクシオン',
    materialChoices:Object.freeze([
      Object.freeze({label:'魔晶石', normal:'magic_crystal', fine:'fine_magic_crystal'}),
      Object.freeze({label:'金属鉱石', normal:'metal_ore', fine:'fine_metal_ore'}),
      Object.freeze({label:'猛禽の羽', normal:'raptor_feather', fine:'fine_raptor_feather'}),
      Object.freeze({label:'毒虫の甲殻', normal:'venom_carapace', fine:'fine_venom_carapace'})
    ]),
    coinOptions:ALCHEMY_COIN_OPTIONS,
    defaultCoinOptionId:'high',
    baseSuccessRate:20,
    fineMaterialBonus:5,
    minSuccessRate:10,
    maxSuccessRate:70,
    successCandidates:ELIXION_SUCCESS_CANDIDATES,
    failureCandidates:ALCHEMY_ALL_FAILURE_CANDIDATES
  })
]);
const ALCHEMY_RECIPE_BY_ID = Object.freeze(Object.fromEntries(ALCHEMY_RECIPES.map(recipe => [recipe.recipeId, recipe])));
const DEFAULT_ALCHEMY_RECIPE_ID = 'alchemion_standard';
const ITEM_DEX_EXTRA = [
  {id:'water_mirror', name:'水鏡', icon:'🪞', price:0, desc:'水の力を映し出す神秘的な鏡。特殊進化に使用する素材。', shop:false, category:'進化素材', obtain:'特殊報酬・イベントで入手'},
  {id:'doom_fragment', name:'滅亡のカケラ', icon:'🔻', price:0, desc:'滅亡の力が凝縮された危険なカケラ。特殊進化に使用する素材。', shop:false, category:'進化素材', obtain:'特殊報酬・イベントで入手'}
];
const ITEM_IMG = {
  water_mirror: 'images/items/water_mirror.webp',
  fire_orb: 'images/items/fire_orb.webp',
  doom_fragment: 'images/items/doom_fragment.webp'
};
/* ===== アイテムガチャ・経験値データ ===== */
const ITEM_GACHA_COST = 100;
const ITEM_GACHA_POOL = [
  {id:'potion', weight:25},
  {id:'upper_potion', weight:20},
  {id:'attack_potion', weight:10},
  {id:'kilo_data', weight:20},
  {id:'mega_data', weight:15},
  {id:'giga_data', weight:5},
  {id:'contract_scroll', weight:3},
  {id:'silver_contract_scroll', weight:1.5},
  {id:'gold_contract_scroll', weight:0.4},
  {id:'rainbow_contract_scroll', weight:0.1}
];
