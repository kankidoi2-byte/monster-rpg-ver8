/* Edit only this file to update the development roadmap. No save data. */
const ROADMAP = (function(){
  const freeze = value => {
    if(value && typeof value === "object"){Object.values(value).forEach(freeze);Object.freeze(value);}
    return value;
  };
  return freeze({
  ui:{heroImage:'images/maps/world_map_prologue_v2.webp', eyebrow:'DEVELOPMENT ROADMAP',title:'開発ロードマップ',intro:'3つの制作を、同時に進めています。',description:'時期は決めず、それぞれの順番だけをお知らせします。',back:'‹ メニュー',main:'本編',side:'おまけ',wip:'制作中',done:'追加済み',recent:'最近追加したもの',more:'もっと見る ▼',less:'閉じる ▲',close:'閉じる',notes:['※内容や順番は、開発の都合で変更になる場合があります。','※時期は決まり次第、お知らせでお伝えします。'],sheetImage:'images/maps/light_plain.webp',sheetEmojiImage:'images/maps/magic_academy.webp'},
  lanes:[
    {id:'story',label:'ストーリー',sub:'本編＋おまけ',icon:'📖',color:'#7a4fc4'},
    {id:'art',  label:'絵と音',   sub:'立ち絵・BGM', icon:'🎨',color:'#d0567e'},
    {id:'sys',  label:'システム', sub:'遊びの改修', icon:'⚙️',color:'#2f9e78'}
  ],
  stages:[
    {id:'now', label:'開発中', title:'いま作っています'},
    {id:'next',label:'その次', title:'その次に作ります'},
    {id:'later',label:'いずれ',title:'いずれ作ります', hint:'順番は前後するかも'}
  ],
  items:[
    {id:'prologue',lane:'story',stage:'now',kind:'main',wip:true,title:'序章ストーリー',sub:'ブラッシュアップ',art:{bg:'images/maps/light_plain.webp',chr:'images/monsters/elna_beginner_20261004.webp'},
      lead:'序章（第1話〜終幕）を、より遊びやすく磨き直します。',
      synopsis:{title:'序章のあらすじ',text:'目を覚ますと、そこは見知らぬ世界だった。小さな姿のグノーシスに呼ばれた契約者は、剣士エルナや王都の仲間たち、不思議な竜ガルドラと出会い、各地に開いた裂け目の異変に立ち向かう。異変の果てで託された、ひとつの願い。契約者とグノーシス、ガルドラは、まだ見ぬ世界へと踏み出す――冒険は、ここから始まる！'},
      points:['会話や演出、遊びやすさを見直す','第1章へつながる序章を、もっと楽しく']},
    {id:'charstory',lane:'story',stage:'now',kind:'side',wip:true,title:'サイドストーリー',sub:'エリシア・ヴェーラの物語',iconImg:'images/monsters/elysia_goddess_20261004.webp',
      lead:'本編とは別に楽しめる、キャラクターごとの物語です。',points:['光の女神エリシアの物語','ヴェーラの物語','仲間の過去や想いにふれる']},
    {id:'ch1',lane:'story',stage:'next',kind:'main',mystery:true,title:'第1章',sub:'？？？',
      lead:'序章の先に続く、本編の新しい章です。',points:['内容はまだ秘密']},
    {id:'ch2',lane:'story',stage:'later',kind:'main',mystery:true,title:'第2章',sub:'？？？',
      lead:'第1章のさらに先に続く、本編の章です。',points:['内容はまだ秘密']},
    {id:'portrait',lane:'art',stage:'now',wip:true,title:'第1章の仲間の立ち絵',sub:'新しい仲間たちの姿',iconImg:'images/monsters/stella_apprentice_20261004.webp',
      lead:'第1章で出会う仲間たちの立ち絵を用意しています。',points:['物語にも、バトルにも登場','第1章ストーリーと並行して制作中']},
    {id:'eventcg',lane:'art',stage:'now',wip:true,title:'イベントCG',sub:'物語の名場面を一枚絵で',icon:'🖼️',
      lead:'物語の大事な場面を、一枚絵で描きます。',points:['ストーリーの名場面を大きな絵で','会話画面の演出と組み合わせて']},
    {id:'bgm2',lane:'art',stage:'next',title:'BGM 第2弾',sub:'火山・湖・強敵・ヌシの戦闘曲',icon:'🎵',
      lead:'バトルのBGMを増やします。',points:['火山と湖のバトルに専用の曲','格上の強敵との戦いに専用の曲','ヌシとの戦いにも専用の曲']},
    {id:'bgmmaps',lane:'art',stage:'later',title:'マップごとのBGM',sub:'すべてのマップに戦闘曲を',icon:'🎶',
      lead:'まだ曲のないマップにも、それぞれの戦闘曲を追加していきます。',points:['森や海、雪山など、その土地らしい曲','マップごとに順番に追加']},
    {id:'bgmscenes',lane:'art',stage:'later',title:'場面ごとのBGM',sub:'ストーリー・ボス戦・ガチャなど',icon:'🎼',
      lead:'バトル以外の場面にも音楽を追加します。',points:['ストーリーの会話や大事な場面に曲を','ボス戦やEXTREMEに専用の曲','ガチャやショップにも音楽を']},

    {id:'evo',lane:'sys',stage:'now',wip:true,title:'キャラクターの進化レベル',sub:'キャラも個体ごとの進化に',iconImg:'images/monsters/elna_middle_20261004.webp',
      lead:'モンスターと同じように、キャラクターの進化にも個体差を取り入れます。',points:['同じキャラクターでも、進化するタイミングが少しずつ違う','育てながら進化の瞬間を見つける楽しみ']},
    {id:'material',lane:'sys',stage:'now',wip:true,title:'素材クエスト',sub:'育成素材を集めやすく',iconImg:'images/items/mega_data_art_v1.webp',
      lead:'経験値データや錬成素材が手に入りやすいクエストを追加します。',
      points:['キロ／メガ／ギガデータや、錬成の素材を集めやすく','オートと組み合わせて周回しやすく']},
    {id:'extreme',lane:'sys',stage:'now',wip:true,title:'EXTREMEの強敵',sub:'特別な力を持つボス',icon:'💀',
      lead:'EXTREMEのボスに、そこでしか見られない特別な力を追加します。',
      points:['育てきった仲間でも、備えなしでは勝てない','相手を知って備えれば、道は開ける','初めて倒すと、その証となる称号がもらえる']},
    {id:'linkfx',lane:'sys',stage:'now',wip:true,title:'ココロリンクの見直し',sub:'作戦の幅を広げる',icon:'💞',
      lead:'ココロリンクの効果を見直します。',
      points:['相手に合わせて選ぶ楽しさを','つなぐ仲間で戦い方が変わる']}
  ],
  done:[
    {title:'ホームの整理（ミッション・バナー）',lane:'sys',note:'改善'},
    {title:'序章 第7話〜終幕',lane:'story',note:'追加'},
    {title:'氷属性',lane:'sys',note:'追加'},
    {title:'技の演出',lane:'art',note:'リニューアル'},
    {title:'道具の追加と入手',lane:'sys',note:'追加'},
    {title:'意見箱のお礼',lane:'sys',note:'追加'},
    {title:'会話画面の統一',lane:'sys',note:'改善'},
    {title:'権能',lane:'sys',note:'追加'},
    {title:'画面を離れてもオート周回',lane:'sys',note:'改善'},
    {title:'火山マップストーリー（全9話）',lane:'story',note:'おまけ'},
    {title:'BGM・効果音（第1弾）',lane:'art',note:'追加'},
    {id:'traits',lane:'sys',stage:'now',note:'追加',title:'特性',sub:'仲間それぞれの個性',icon:'✨',
      lead:'モンスターやキャラクターに、それぞれの特性を追加しました。',
      points:['同じレア度でも、得意なことがそれぞれ違う','進化すると、特性も変わっていく']},
    {id:'difficulty',lane:'sys',stage:'now',note:'見直し',title:'難易度の見直し',sub:'5段階の難易度',icon:'🧭',lead:'野生のモンスターの難易度を見直しました。',points:['難易度をⅠ〜Ⅴの5段階に','どの場所にも、弱い相手から強い相手まで']},
    {id:'status',lane:'sys',stage:'now',note:'追加',title:'ステータス確認',sub:'仲間の能力を見やすく',icon:'📊',
      lead:'モンスターやキャラクターのステータスを確認できるようになりました。',points:['HP・攻撃などの能力値を確認','モンスターとキャラクターの両方に対応','進化のタイミングは秘密のまま。育てて見つけよう']},
    {id:'stat4',lane:'sys',stage:'now',note:'見直し',title:'能力値の見直し',sub:'攻撃と防御を追加',icon:'⚔️',
      lead:'モンスターとキャラクターの能力値を見直しました。',
      points:['HP・攻撃・防御・速度の4つの能力に','育てるほど、はっきり強くなる']},
    {title:'バトル画面',lane:'sys',note:'リニューアル'},
    {title:'エルナの全身立ち絵',lane:'art',note:'追加'},
    {id:'auto',lane:'sys',stage:'now',note:'追加',title:'オートバトル',sub:'討伐済みの探索を自動で',icon:'⏩',
      lead:'バトルを自動で進めるオート機能を追加しました。',
      points:['同じマップ・難易度の相手を全員倒すと解放','2倍速にも対応','序章・チュートリアルの戦闘では使えない']},
    {id:'money',lane:'sys',stage:'now',title:'金策',sub:'G-BLESS(グノーシスの加護)',note:'G-BLESSを追加',lead:'使っている間、バトルで手に入るコインや経験値が増える『G-BLESS』を追加します。',points:['オンの間、コインや経験値が増える','毎週回復。Life Questでも貯められる','使うタイミングは自分で選べる']},
    {title:'開発ロードマップ画面',lane:'sys',note:'この画面'},
    {title:'プレゼントBOX',lane:'sys',note:'追加'},
    {title:'意見箱',lane:'sys',note:'追加'},
    {title:'Life Quest',lane:'sys',note:'追加'},
    {title:'モンスター一覧・まとめて変換',lane:'sys',note:'改善'},
    {title:'技カードの影絵',lane:'art',note:'追加'},
    {title:'ガチャ画面と演出',lane:'sys',note:'リニューアル'},
    {title:'世界地図',lane:'sys',note:'リニューアル'},
    {title:'水面のホーム',lane:'sys',note:'リニューアル'},
    {title:'草原マップストーリー（全11話）',lane:'story',note:'おまけ'}
  ]
});
})();
