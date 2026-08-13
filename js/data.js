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
  tsubaki:'images/monsters/tsubaki.webp',
  elnaKaen:'images/monsters/elna_kaen.webp',
  alchemion:'images/monsters/alchemion.webp',
  kimeragna:'images/monsters/kimeragna.webp'
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
  kaen_village:'images/maps/kaen_village.webp'
};

/* ===== マップデータ ===== */
const MAPS = [
  {id:'grassland', name:'草原', image:MAPIMG.grassland,
   enemyIds:['slime','grassbeat','volteck','slime_gold','goblin','spaquinn','voltax','rikasheef','seralphia']},
  {id:'volcano', name:'火山', image:MAPIMG.volcano,
   enemyIds:['freigal','freigal','freiwolf','tsubaki','tsubaki','goblin']},
  {id:'lake', name:'湖', image:MAPIMG.lake,
   enemyIds:['aquaron','highaquaron','suiren','goblin','proto_icegolem']},
  {id:'seikai_irie', name:'蒼海の入り江', image:MAPIMG.seikai_irie,
   enemyIds:['aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','aquaron','highaquaron','highaquaron','highaquaron','highaquaron','orcana','orcana','orcana','orcana','shenhairon','tienhairon','orca_stream']},
  {id:'kaiyu_kaiiki', name:'回遊海域', image:MAPIMG.kaiyu_kaiiki,
   enemyIds:['highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','highaquaron','orcana','orcana','orcana','orcana','orcana','orcana','orcana','orcana','orcana','orcana','shenhairon','shenhairon','shenhairon','shenhairon','tienhairon','tienhairon','tienhairon','tienhairon','orca_stream','orca_stream','orca_stream','orca_abyss']},
  {id:'deep_sea_end', name:'深き海の果て', image:MAPIMG.deep_sea_end,
   enemyIds:['orca_stream','orca_stream','orca_stream','orca_stream','orca_stream','orca_stream','orca_stream','orca_stream','shenhairon','shenhairon','shenhairon','shenhairon','tienhairon','tienhairon','tienhairon','tienhairon','orca_abyss','orca_abyss','orca_abyss']},
  {id:'snow_mountain', name:'雪山', image:MAPIMG.snow_mountain,
   enemyIds:['icegolem','proto_icegolem','slime','aquaron','goblin']},
  {id:'forest', name:'森林', image:MAPIMG.forest,
   enemyIds:['grassbeat','grassbeat','grassbeat','grassbeat','grassbeat','grassbeat','grassbeat','rikasheef','rikasheef','rikasheef','rikasheef','thornbeat','thornbeat','thornbeat','thornbeat','thornbeat','granbeat','granbeat','seralphia','seralphia','slime','slime','slime','goblin','goblin','nightmare']},
  {id:'light_plain', name:'光の平原', image:MAPIMG.light_plain,
   enemyIds:['hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','hikari','slime','slime','slime','goblin','goblin','suiren','aquaron']},
  {id:'starry_plain', name:'星空の平原', image:MAPIMG.starry_plain,
   enemyIds:['nemes','nemes','nemes','nemes','nemes','nemes','nemes','nemes','nemesia','nemesia','nemesia','nemesia','nemesion','slime','slime','goblin','goblin','volteck','spaquinn','nightmare']},
  {id:'highland_ruins', name:'高原遺跡', image:MAPIMG.highland_ruins,
   enemyIds:['volteck','volteck','volteck','volteck','volteck','volteck','volteck','volteck','spaquinn','spaquinn','spaquinn','spaquinn','spaquinn','spaquinn','volmoog','volmoog','volmoog','voltax','voltax','slime','goblin']},
  {id:'arena', name:'闘技場', image:MAPIMG.arena,
   enemyIds:['elna_beginner','elna_beginner','elna_beginner','elna_beginner','elna_beginner','elna_middle','elna_middle','elna_middle','elna_advanced']},
  {id:'magic_academy', name:'魔導学園', image:MAPIMG.magic_academy,
   enemyIds:['stella_apprentice','stella_apprentice','stella_apprentice','stella_apprentice','stella_wizard','stella_wizard','stella_sorcerer','lumina_apprentice','lumina_apprentice','lumina_apprentice','lumina_wizard','lumina_wizard','lumina_sorcerer']},
  {id:'ruined_village', name:'廃村跡', image:MAPIMG.ruined_village,
   enemyIds:['nightmare','nightmare','nightmare','nightmare','goblin','slime']},
  {id:'starsea', name:'遥かなる星の海', image:MAPIMG.starsea,
   enemyIds:['nemesion','doom_nemesion'], bossOnly:true, appearRate:0.10},
  {id:'water_secret', name:'流水の秘境', image:MAPIMG.water_secret,
   enemyIds:['elna_water','suiren'], rareOnly:true, appearRate:0.12},
  {id:'world_between', name:'世界の狭間', image:MAPIMG.world_between,
   enemyIds:['false_dragon_alfa','false_dragon_beta','false_dragon_gamma'], bossOnly:true, appearRate:0.08},
  {id:'kaen_village', name:'華炎の里', image:MAPIMG.kaen_village,
   enemyIds:['tsubaki','tsubaki','tsubaki','elna_kaen']}

];

/* ===== 属性名 ===== */
const TN = {
  fire:'火', water:'水', thunder:'雷', wind:'風', grass:'森',
  light:'光', dark:'闇', star:'星', dragon:'竜', normal:'無'
};

const TYPE_ICONS={fire:'🔥',water:'💧',thunder:'⚡',wind:'🌪️',grass:'🌳',light:'✨',dark:'🌑',star:'⭐',dragon:'🐉',normal:'⚪'};
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
  {id:'freigal',imgKey:'freigal',no:1,name:'フレイガル',rarity:'★',types:['fire'],
   hp:120,spd:70,catchRate:.35,evolution:'freiwolf',evolutionLevel:2,
   desc:'炎をまとう子狼。',
   moves:[['火炎牙',28,'fire'],['フレイムクロー',24,'fire'],['爆炎チャージ',42,'fire','recoil'],['フレアチャージ',35,'fire','flare_charge',null,2,'炎をまとって突撃し、次の攻撃の威力を高める。']]},
  {id:'freiwolf',imgKey:'freiwolf',no:2,name:'フレイウルフ',rarity:'★★',types:['fire'],
   evolutionOnly:true,hp:155,spd:82,catchRate:.18,
   desc:'フレイガルが進化した姿。',
   moves:[['炎狼牙',36,'fire'],['フレアラッシュ',45,'fire','recoil'],['猛火の咆哮',0,'fire','buff']]},
  {id:'aquaron',imgKey:'aquaron',no:3,name:'アクアロン',rarity:'★',types:['water','dragon'],
   hp:130,spd:55,catchRate:.35,evolution:'highaquaron',evolutionLevel:2,
   desc:'水辺にすむ小さな龍。',
   moves:[['水流弾',26,'water'],['しっぽ打ち',20,'normal'],['大波召喚',38,'water'],['アクアシールド',0,'water','aqua_shield',null,2,'水の盾を展開し、次に受ける攻撃ダメージを半減する。']]},
  {id:'highaquaron',imgKey:'highaquaron',no:4,name:'ハイアクアロン',rarity:'★★',types:['water','dragon'],
   evolutionOnly:true,hp:165,spd:68,catchRate:.16,
   evolutions:[{level:3,to:'shenhairon'},{level:3,to:'tienhairon'}],
   desc:'アクアロンが進化した姿。水流と竜の力をより強く操る。',
   moves:[['水竜弾',36,'water'],['竜の尾撃',32,'dragon'],['ハイドロスパイラル',52,'water']]},
  {id:'shenhairon',imgKey:'shenhairon',no:5,name:'シェンハイロン',rarity:'★★★',types:['water','dragon'],
   evolutionOnly:true,hp:210,spd:58,catchRate:.08,
   desc:'ハイアクアロンが神海の力を得て進化した姿。水の王のような威厳を持つ。',
   moves:[['神海の爪',46,'water'],['蒼竜の咆哮',42,'dragon','buff'],['海王瀑流',68,'water']]},
  {id:'tienhairon',imgKey:'tienhairon',no:6,name:'ティエンハイロン',rarity:'★★★',types:['water','dragon'],
   evolutionOnly:true,hp:200,spd:76,catchRate:.08,
   desc:'ハイアクアロンが天海の力を得て進化した姿。優雅さと強大な水流を持つ。',
   moves:[['天海の舞',0,'water','heal'],['月華水刃',48,'water'],['蒼天龍波',66,'dragon']]},
  {id:'grassbeat',imgKey:'grassbeat',no:7,name:'グラスビート',rarity:'★',types:['grass'],
   hp:110,spd:62,catchRate:.45,evolution:'thornbeat',evolutionLevel:2,
   desc:'草むらの小型モンスター。',
   moves:[['リーフカッター',27,'grass'],['吸収',18,'grass','drain'],['森の一撃',40,'grass'],['ポイズンニードル',18,'grass','poison',0.60,1,'毒を帯びた針を放ち、相手を毒状態にする。'],['スリープパウダー',0,'grass','sleep',0.70,2,'眠りを誘う粉をまき、相手を深い眠りに落とす。'],['トキシックガーデン',40,'grass','poison',0.70,4,'猛毒の植物園を生み出し、相手を強い毒で包み込む。']]},
  {id:'thornbeat',imgKey:'thornbeat',no:8,name:'ソーンビート',rarity:'★★',types:['grass'],
   evolutionOnly:true,evolution:'granbeat',evolutionLevel:3,hp:155,spd:48,catchRate:.18,
   desc:'グラスビートが進化した姿。鋭い棘と硬い甲殻で森を守る守護虫。',
   moves:[['ソーンホーン',36,'grass'],['森の甲殻',0,'grass','guard'],['スパイクラッシュ',54,'grass']]},
  {id:'granbeat',imgKey:'granbeat',no:9,name:'グランビート',rarity:'★★★',types:['grass'],
   evolutionOnly:true,hp:215,spd:35,catchRate:.08,
   desc:'ソーンビートが進化した森の重装守護者。',
   moves:[['グランホーン',50,'grass'],['森王の装甲',0,'grass','guard'],['ガイアスラッシュ',72,'grass']]},
  {id:'rikasheef',imgKey:'rikasheef',no:32,name:'リカシーフ',rarity:'★',types:['grass'],
   hp:95,spd:78,catchRate:.38,evolution:'seralphia',evolutionLevel:3,
   desc:'森の光を宿した小鹿のようなモンスター。若葉の角から生命力を放つ。',
   moves:[['若葉の突進',24,'grass'],['癒しの芽吹き',0,'grass','heal'],['リーフスパーク',36,'grass']]},
  {id:'seralphia',imgKey:'seralphia',no:33,name:'セラルフィア',rarity:'★★★',types:['grass'],
   hp:225,spd:92,catchRate:.10,
   desc:'リカシーフが進化した神秘の森鹿。花咲く角と翠の翼で森に清浄な風を巡らせる。',
   moves:[['翠翼の突風',42,'grass'],['森精の祝福',0,'grass','heal'],['セラフィックリーフ',68,'grass']]},
  {id:'nightmare',imgKey:'nightmare',no:10,name:'ナイトメア',rarity:'★★',types:['dark'],
   hp:105,spd:88,catchRate:.24,
   desc:'暗闇から現れる影の魔物。',
   moves:[['影打ち',25,'dark'],['呪いの視線',18,'dark','debuff'],['闇の波動',44,'dark']]},
  {id:'volteck',imgKey:'volteck',no:11,name:'ボルテック',rarity:'★',types:['thunder','wind'],
   hp:100,spd:95,catchRate:.35,evolution:'spaquinn',evolutionLevel:2,
   desc:'雷雲を飛ぶ鳥型モンスター。',
   moves:[['雷つつき',30,'thunder'],['急降下',24,'wind'],['雷鳴弾',46,'thunder'],['サンダーボルト',30,'thunder','paralysis',0.30,2,'強力な電撃を放ち、敵の身体をしびれさせる。'],['パラライズショック',15,'thunder','paralysis',0.80,2,'強烈なしびれを引き起こす電撃を放つ。'],['サンダーストーム',45,'thunder','paralysis',0.50,4,'激しい雷嵐を巻き起こし、相手を麻痺させる。'],['ライトニングチェイン',28,'thunder','repeat_attack',0.30,3,'連鎖する電撃を放ち、一定確率でもう一度攻撃する。']]},
  {id:'spaquinn',imgKey:'spaquinn',no:12,name:'スパクイン',rarity:'★★',types:['thunder','wind'],
   evolutionOnly:true,evolution:'voltax',evolutionLevel:3,hp:170,spd:105,catchRate:.35,
   desc:'ボルテックが進化した雷風の猛禽モンスター。雷をまとい、空中から鋭く襲いかかる。',
   moves:[['雷撃',34,'thunder'],['突風',28,'wind'],['スパークダイブ',42,'thunder']]},
  {id:'voltax',imgKey:'voltax',no:13,name:'ボルタックス',rarity:'★★★',types:['thunder','wind'],
   evolutionOnly:true,hp:240,spd:115,catchRate:.22,
   desc:'スパクインが進化した雷風の王。黒金の翼で嵐を裂き、雷雲そのものを操る。',
   moves:[['雷嵐',48,'thunder'],['暴風刃',42,'wind'],['ボルテックストーム',62,'thunder'],['疾風迅雷',58,['thunder','wind'],null,null,6,'雷と風を同時にまとい、神速の一撃を放つ。']]},
  {id:'icegolem',imgKey:'icegolem',no:15,name:'アイスゴーレム',rarity:'★★',types:['water'],
   hp:145,spd:32,catchRate:.28,
   desc:'氷河から生まれた水属性のゴーレム。',
   moves:[['氷の拳',26,'water'],['守りを固める',0,'normal','guard'],['凍結クラッシュ',40,'water']]},
  {id:'proto_icegolem',imgKey:'proto_icegolem',no:14,name:'プロトアイスゴーレム',rarity:'★★',types:['water'],
   hp:180,spd:18,catchRate:.16,
   desc:'古代の氷核から造られた試作型ゴーレム。アイスゴーレムより鈍重だが、破壊力に優れる。',
   moves:[['氷塊拳',44,'water'],['重装防御',0,'normal','guard'],['大氷河クラッシュ',70,'water']]},
  {id:'hikari',imgKey:'goddess',no:16,name:'光の女神',rarity:'★★★★',types:['light'],
   hp:175,spd:90,catchRate:.08,bossClass:'ボス級',
   desc:'光を司る女神。闇属性に強い。',
   moves:[['聖光の槍',38,'light'],['ヒールオーラ',0,'light','heal'],['ジャッジメント',58,'light']]},
  {id:'nemes',imgKey:'nemes',no:17,name:'ネメス',rarity:'★★',types:['star','dragon'],
   hp:125,spd:78,catchRate:.22,evolution:'nemesia',evolutionLevel:2,
   desc:'星の力を宿した幼き竜。',
   moves:[['星屑の牙',32,'star'],['竜のひっかき',26,'dragon'],['コスモブレス',44,'star'],['イリュージョン',15,'star','confusion',0.60,2,'幻覚を見せ、敵の判断を狂わせる。'],['ベノムブレス',30,'dragon','poison',0.40,2,'毒を含んだ竜の息吹を浴びせる。']]},
  {id:'nemesia',imgKey:'nemesia',no:18,name:'ネメシア',rarity:'★★★',types:['star','dragon'],
   evolutionOnly:true,evolution:'nemesion',evolutionLevel:3,hp:185,spd:92,catchRate:.1,
   desc:'ネメスが進化した星竜。星雲の魔力を翼に宿す。',
   moves:[['星雲の爪',42,'star'],['竜星ブレス',50,'dragon'],['コズミックノヴァ',68,'star']]},
  {id:'nemesion',imgKey:'nemesion',no:19,name:'ネメシオン',rarity:'★★★★',types:['star','dragon'],
   evolutionOnly:true,hp:240,spd:100,catchRate:.04,bossClass:'ボス級',
   desc:'ネメシアが進化した星竜の最終形態。銀河を裂く力を持つ。',
   moves:[['星界の爪',56,'star'],['銀河竜波',62,'dragon'],['アストラルエンド',82,'star']]},
  {id:'doom_nemesion',imgKey:'doomNemesion',no:20,name:'滅亡の星 ネメシオン',rarity:'★★★★★',types:['star','dragon'],
   evolutionOnly:true,hp:300,spd:85,catchRate:.02,bossClass:'超ボス級',dropItem:'doom_fragment',dropItemName:'滅亡のカケラ',
   desc:'ネメシオンが滅亡の星の力を得た最終形態。星を喰らい終焉の光を放つ。倒すと「滅亡のカケラ」を落とす。',
   moves:[['滅星爪',70,'star'],['終焉竜波',78,'dragon'],['アポカリプスノヴァ',100,'star','recoil']]},
  {id:'elna_beginner',imgKey:'elna',no:21,name:'初級剣士エルナ',rarity:'★',types:['normal'],
   hp:115,spd:65,catchRate:.35,evolution:'elna_middle',evolutionLevel:2,
   desc:'冒険者として歩み始めたばかりの少女剣士。',
   moves:[['斬りつけ',24,'normal'],['見習いの構え',0,'normal','guard'],['勇気の一撃',36,'normal']]},
  {id:'elna_middle',imgKey:'elnaMiddle',no:22,name:'中級剣士エルナ',rarity:'★★',types:['normal'],
   evolutionOnly:true,evolution:'elna_advanced',evolutionLevel:3,hp:150,spd:78,catchRate:.18,
   desc:'初級剣士エルナが成長した姿。安定した剣技を身につけた。',
   moves:[['連続斬り',34,'normal'],['受け流し',0,'normal','guard'],['白刃一閃',50,'normal']]},
  {id:'elna_advanced',imgKey:'elnaAdvanced',no:23,name:'上級剣士エルナ',rarity:'★★★',types:['normal'],
   evolutionOnly:true,hp:190,spd:88,catchRate:.1,
   desc:'中級剣士エルナがさらに成長した姿。磨き抜かれた剣技で戦場を切り開く。',
   moves:[['閃光斬り',46,'normal'],['剣士の集中',0,'normal','buff'],['白銀連斬',64,'normal']]},
  {id:'suiren',imgKey:'suiren',no:24,name:'水の精霊スイレン',rarity:'★★',types:['water'],
   hp:135,spd:72,catchRate:.2,dropItem:'water_mirror',dropItemName:'水鏡',
   desc:'清らかな水辺に現れる水の精霊。倒すと「水鏡」を落とす。',
   moves:[['水霊弾',32,'water'],['癒しの水',0,'water','heal'],['水鏡の波紋',46,'water']]},
  {id:'elna_water',imgKey:'elnaWater',no:25,name:'流水の剣士エルナ',rarity:'★★★★',types:['water','normal'],
   evolutionOnly:true,hp:220,spd:96,catchRate:.06,bossClass:'ボス級',
   desc:'上級剣士エルナが水鏡の力で進化した姿。流れる水のような剣技で敵を翻弄する。',
   moves:[['流水斬り',54,'water'],['水鏡の構え',0,'water','guard'],['蒼流連閃',76,'water']]},
  {id:'slime',imgKey:'slime',no:26,name:'スライム',rarity:'★',types:['normal'],
   hp:55,spd:40,catchRate:.45,expBonus:80,
   desc:'ぷるぷるした弱めのモンスター。倒すと大量の経験値を得られる。',
   moves:[['たいあたり',14,'normal'],['ぷるぷる',0,'normal','guard'],['スライムアタック',22,'normal']]},
  {id:'slime_gold',imgKey:'slime_gold',no:27,name:'スライムゴールド',rarity:'★★',types:['normal'],
   hp:70,spd:85,catchRate:.25,coinBonus:200,
   desc:'金色に輝く珍しいスライム。倒すと大量のコインを落とす。',
   moves:[['たいあたり',16,'normal'],['きんいろボディ',0,'normal','guard'],['ゴールドアタック',25,'normal']]},
  {id:'goblin',imgKey:'goblin',no:28,name:'ゴブリン',rarity:'★',types:['normal'],
   hp:80,spd:50,catchRate:.70,coinBonus:5,expBonus:10,
   desc:'どのマップにも現れる雑魚モンスター。原始的な武器を持ち、群れで行動することが多い。',
   moves:[['棍棒攻撃',18,'normal'],['威嚇',0,'normal','guard'],['毒の短剣',22,'normal','poison']]},
  {id:'false_dragon_alfa',imgKey:'false_dragon_alfa',no:29,name:'偽竜 code:alfa',rarity:'★★★★★',types:['normal','light'],
   hp:360,spd:82,catchRate:.05,bossClass:'超ボス級',
   desc:'神に似せて造られた銀色の偽竜。無機質な装甲と光の力を持つ、超ボス級モンスター。',
   moves:[['虚光砲',70,'light'],['偽神の爪',58,'normal'],['コード・アルファ',88,'light']]},
  {id:'false_dragon_beta',imgKey:'false_dragon_beta',no:30,name:'偽竜 code:beta',rarity:'★★★★★',types:['normal','light'],
   hp:390,spd:88,catchRate:.04,bossClass:'超ボス級',
   desc:'世界の狭間に現れる二体目の偽竜。白銀の装甲翼を広げ、空間を裂く光を放つ超ボス級モンスター。',
   moves:[['断界光',76,'light'],['偽竜の翼撃',62,'normal'],['コード・ベータ',94,'light']]},
  {id:'false_dragon_gamma',imgKey:'false_dragon_gamma',no:31,name:'偽竜 code:gamma',rarity:'★★★★★',types:['normal','light'],
   hp:420,spd:94,catchRate:.035,bossClass:'超ボス級',
   desc:'世界の狭間に現れる三体目の偽竜。完成度を増した銀翼の機械竜で、光と虚無を同時に操る超ボス級モンスター。',
   moves:[['虚無光翼',82,'light'],['偽竜の咆哮',66,'normal'],['コード・ガンマ',100,'light']]},
  {id:'volmoog',imgKey:'volmoog',no:34,name:'ボルモーグ',rarity:'★★',types:['thunder'],
   hp:155,spd:72,catchRate:.20,evolution:'gran_volmoog',evolutionLevel:2,
   desc:'雷をまとった獣型モンスター。巨大な爪で大地を砕き、帯電した岩片を巻き上げて襲いかかる。',
   moves:[['雷爪',34,'thunder'],['帯電咆哮',0,'thunder','guard'],['ボルテッククロー',56,'thunder']]},
  {id:'gran_volmoog',imgKey:'gran_volmoog',no:35,name:'グランボルモーグ',rarity:'★★★',types:['thunder'],
   hp:245,spd:66,catchRate:.12,
   desc:'ボルモーグが進化した雷獣の巨体。結晶化した装甲と巨大な爪に雷をまとい、大地を割るほどの一撃を放つ。',
   moves:[['雷岩砕き',48,'thunder'],['帯電結晶鎧',0,'thunder','guard'],['グランボルトクロー',78,'thunder']]},
  {id:'stella_apprentice',imgKey:'stella_apprentice',no:36,name:'見習い魔法使いステラ',rarity:'★★',types:['star','light'],
   hp:115,spd:90,catchRate:.20,evolution:'stella_wizard',evolutionLevel:2,
   desc:'魔導学園で星魔法を学ぶ見習い魔法使い。明るい笑顔と未完成ながら鋭い魔力で戦う。',
   moves:[['星屑弾',30,'star'],['マジックショット',24,'normal'],['スターブースト',0,'star','buff']]},
  {id:'stella_wizard',imgKey:'stella_wizard',no:37,name:'魔法使いステラ',rarity:'★★★',types:['star','light'],
   evolutionOnly:true,evolution:'stella_sorcerer',evolutionLevel:3,hp:155,spd:102,catchRate:.10,
   desc:'見習い魔法使いステラが成長した姿。星の魔力を自在に操り、軽やかな詠唱で戦場を照らす魔法使い。',
   moves:[['スターライトレイ',42,'star'],['マジックバースト',36,'normal'],['アストラルフレア',64,'star']]},
  {id:'stella_sorcerer',imgKey:'stella_sorcerer',no:38,name:'魔導師ステラ',rarity:'★★★★',types:['star','light'],
   evolutionOnly:true,hp:205,spd:112,catchRate:.06,
   desc:'魔法使いステラがさらに成長した姿。星辰の知識と高位魔術を操る魔導師。幾つもの魔導書を従え、戦場を星の光で支配する。',
   moves:[['星天の裁き',56,'star'],['グランドマジック',44,'normal'],['コスモスアーク',86,'star']]},
  {id:'lumina_apprentice',imgKey:'lumina_apprentice',no:39,name:'見習い魔法使いルミナ',rarity:'★★',types:['star','dark'],
   hp:110,spd:88,catchRate:.20,evolution:'lumina_wizard',evolutionLevel:2,
   desc:'魔導学園で星魔法を学ぶ内気な見習い魔法使い。魔導書を大切に抱え、静かな詠唱で星の力を呼び出す。',
   moves:[['星光弾',28,'star'],['マジックノート',24,'normal'],['ルミナスチャージ',0,'star','buff']]},
  {id:'lumina_wizard',imgKey:'lumina_wizard',no:40,name:'魔法使いルミナ',rarity:'★★★',types:['star','dark'],
   evolutionOnly:true,evolution:'lumina_sorcerer',evolutionLevel:3,hp:155,spd:98,catchRate:.10,
   desc:'見習い魔法使いルミナが成長した姿。星の術式を丁寧に編み上げる魔法使いで、静かな魔力から鋭い星光魔法を放つ。',
   moves:[['星月の光弾',40,'star'],['マジックブルーム',34,'normal'],['ルミナスレイ',62,'star']]},
  {id:'lumina_sorcerer',imgKey:'lumina_sorcerer',no:41,name:'魔導師ルミナ',rarity:'★★★★',types:['star','dark'],
   evolutionOnly:true,hp:205,spd:108,catchRate:.06,
   desc:'魔法使いルミナがさらに成長した姿。静謐な星術と高位魔法を操る魔導師。青白い星の結晶と術式で戦場を包み込む。',
   moves:[['星晶の裁き',54,'star'],['ルミナスマジック',46,'normal'],['セレスティアルレイ',84,'star']]},
  {id:'orcana',imgKey:'orcana',no:42,name:'オルカーナ',rarity:'★★',types:['water'],
   hp:160,spd:76,catchRate:.16,evolution:'orca_stream',evolutionLevel:2,
   desc:'蒼海の入り江に現れる水属性のシャチ型モンスター。蒼い結晶の背びれと水流をまとい、海中を俊敏に泳ぐ。',
   moves:[['アクアテイル',34,'water'],['蒼海の突進',38,'water'],['クリスタルウェーブ',56,'water']]},
  {id:'orca_stream',imgKey:'orca_stream',no:43,name:'オルカストリーム',rarity:'★★★',types:['water'],
   evolutionOnly:true,evolution:'orca_abyss',evolutionLevel:3,hp:220,spd:88,catchRate:.10,
   desc:'オルカーナが進化した姿。蒼海の水流と結晶をまとい、海中を疾走する水属性のシャチ型モンスター。',
   moves:[['ストリームテイル',44,'water'],['蒼流の突撃',52,'water'],['オルカウェーブ',72,'water']]},
  {id:'orca_abyss',imgKey:'orca_abyss',no:44,name:'オルカアビス',rarity:'★★★★',types:['water'],
   evolutionOnly:true,hp:285,spd:98,catchRate:.06,
   desc:'オルカストリームが深海の魔力を得て進化した姿。蒼い結晶と渦巻く水流をまとい、深き海の果てを支配する水属性のシャチ型モンスター。',
   moves:[['アビステイル',56,'water'],['深海の奔流',68,'water'],['オルカアビス',92,'water']]},
  {id:'tsubaki',imgKey:'tsubaki',no:45,name:'炎の精霊ツバキ',rarity:'★★',types:['fire'],
   hp:185,spd:88,catchRate:.12,dropItem:'fire_orb',dropItemName:'炎玉',dropRate:.30,
   desc:'華炎の里や火山に現れる炎の精霊。花弁のような結晶翼から灼熱の炎を放つ。倒すと30%の確率で「炎玉」を落とす。',
   moves:[['火花の舞',36,'fire'],['灼熱花弁',48,'fire'],['炎華結界',0,'fire','guard']]},
  {id:'elna_kaen',imgKey:'elnaKaen',no:46,name:'華炎の剣士エルナ',rarity:'★★★★',types:['fire','normal'],
   hp:235,spd:102,catchRate:.05,bossClass:'ボス級',
   desc:'炎玉の力を受け、華炎を剣に宿したエルナの新たな姿。舞う花弁のような炎で敵を斬り裂く。',
   moves:[['華炎斬り',58,'fire'],['炎花の構え',0,'fire','guard'],['紅蓮連閃',80,'fire']]},
  {id:'alchemion',imgKey:'alchemion',no:47,name:'錬核獣アルケミオン',rarity:'★★★',types:['normal'],
   hp:180,spd:75,catchRate:0,alchemyExclusive:true,
   desc:'錬成核から生まれる無属性の錬成限定モンスター。個体ごとに異なる能力傾向を持つ。',
   moves:[['錬核崩砕',140,'normal','alchemy_recoil',null,5,'攻撃後、実際に与えたダメージの25％を反動として受ける。','alchemion']]},
  {id:'kimeragna',imgKey:'kimeragna',no:48,name:'混成翼竜キメラグナ',rarity:'★★★',types:['wind','dragon'],
   hp:150,spd:100,catchRate:0,alchemyExclusive:true,
   desc:'風と竜の性質を併せ持つ錬成限定の翼竜。猛毒を帯びた翼で獲物を追い詰める。',
   moves:[['猛毒翔破',110,'wind','poison',.40,4,'40％の確率で相手を3ターンの毒状態にする。','kimeragna']]}

];

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
  {id:'contract_scroll', name:'契約書', icon:'📜', price:20, desc:'モンスターと契約するための書類。バトル中に使用できる。', battleDesc:'相手モンスターと契約するための書類。成功すると手持ちに加わる。', usableInBattle:true, contract:true, catchMultiplier:1},
  {id:'silver_contract_scroll', name:'銀の契約書', icon:'📃', price:40, desc:'通常の契約書より契約成功率が高い銀色の書類。バトル中に使用できる。', battleDesc:'通常の契約書より高い確率で相手モンスターと契約できる。', usableInBattle:true, contract:true, catchMultiplier:2},
  {id:'gold_contract_scroll', name:'金の契約書', icon:'📒', price:80, desc:'銀の契約書より契約成功率がさらに高い金色の書類。バトル中に使用できる。', battleDesc:'銀の契約書よりさらに高い確率で相手モンスターと契約できる。', usableInBattle:true, contract:true, catchMultiplier:3},
  {id:'rainbow_contract_scroll', name:'虹の契約書', icon:'🌈', price:160, desc:'金の契約書より契約成功率がさらに高い虹色の書類。バトル中に使用できる。', battleDesc:'金の契約書よりさらに高い確率で相手モンスターと契約できる。', usableInBattle:true, contract:true, catchMultiplier:5},
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
  {id:'fine_venom_carapace', name:'上質な毒虫の甲殻', icon:'✨🪲', price:110, desc:'毒性と強度を高い水準で保つ上質な虫の甲殻。', category:'錬成素材', obtain:'ショップ／バトル勝利報酬', alchemyMaterial:true, quality:'fine'}

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
  alchemion:Object.freeze({
    monsterId:'alchemion',
    archetypes:ALCHEMY_ARCHETYPES,
    exclusiveMoveIndexes:Object.freeze([0])
  }),
  kimeragna:Object.freeze({
    monsterId:'kimeragna',
    archetypes:ALCHEMY_ARCHETYPES,
    exclusiveMoveIndexes:Object.freeze([0])
  })
});
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
const ALCHEMY_FAILURE_CANDIDATES = Object.freeze([
  'freigal','aquaron','grassbeat','rikasheef','nightmare','volteck','icegolem',
  'proto_icegolem','nemes','suiren','slime','slime_gold','goblin','volmoog','orcana'
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
  'elna_advanced','gran_volmoog','stella_wizard','lumina_wizard','orca_stream'
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
  Object.freeze({id:'low', amount:50, bonus:-10, label:'少額', minimumFailureRarity:null, resonanceOnFailure:2}),
  Object.freeze({id:'standard', amount:100, bonus:0, label:'標準', minimumFailureRarity:2, resonanceOnFailure:5}),
  Object.freeze({id:'high', amount:250, bonus:15, label:'高額', minimumFailureRarity:3, resonanceOnFailure:12})
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
    failureCandidates:ALCHEMY_ALL_FAILURE_CANDIDATES,
    designation:Object.freeze({enabled:true, resonanceCost:100, coinAmount:100})
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
    failureCandidates:ALCHEMY_ALL_FAILURE_CANDIDATES,
    designation:Object.freeze({enabled:true, resonanceCost:100, coinAmount:100})
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
  fire_orb: 'images/items/fire_orb.webp'
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
