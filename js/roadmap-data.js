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
    {id:'lore',lane:'story',stage:'now',kind:'main',wip:true,title:'ストーリーの背景',sub:'いまの章のあらすじ',art:{bg:'images/maps/world_between.webp',chr:'images/tutorial/characters/gnosis-dialogue-transparent-final.png'},
      lead:'物語の土台になる世界の成り立ちを固めています。ここでは、いまの章のあらすじを紹介します。',
      synopsis:{title:'序章のあらすじ',text:'目を覚ますと、そこは見知らぬ世界だった。小さな姿のグノーシスに呼ばれた契約者は、スライムに囲まれた剣士エルナを助け、王都でステラやルミナと出会い、不思議な竜ガルドラと旅を始める。グノーシスの願いは、失われた元の姿を取り戻すこと。手掛かりを探す一行の前で、王都にモンスターが押し寄せ、各地に謎の裂け目が開き始める――。'},
      points:['序章・第1章へ続く物語の根っこ','章が進むと、ここのあらすじも新しくなります']},
    {id:'prologue',lane:'story',stage:'next',kind:'main',title:'序章ストーリー',sub:'王都の異変から、世界の狭間へ',art:{bg:'images/maps/light_plain.webp',chr:'images/monsters/elna_beginner_20261004.webp'},
      lead:'序章の続き（第7話〜終幕）を追加します。',points:['王都に逃げ込むモンスターたち、各地に開く謎の裂け目','王都の仲間と力を合わせて、異変の正体を追う']},
    {id:'mapstory',lane:'story',stage:'next',kind:'side',title:'マップストーリー',sub:'火山の物語',iconImg:'images/maps/volcano.webp',
      lead:'本編とは別に楽しめる、マップごとの物語です。',points:['草原に続いて、火山『火山の息づかい』全9話','その土地に暮らすモンスターたちの生態を描く']},
    {id:'ch1',lane:'story',stage:'later',kind:'main',mystery:true,title:'第1章',sub:'？？？',
      lead:'序章の先に続く、本編の新しい章です。',points:['内容はまだ秘密']},
    {id:'charstory',lane:'story',stage:'later',kind:'side',title:'キャラクターストーリー',sub:'仲間それぞれの物語',iconImg:'images/monsters/elysia_goddess_20261004.webp',
      lead:'本編とは別に楽しめる、キャラクターごとの物語です。',points:['光の女神エリシアの物語から','仲間の過去や想いにふれる']},
    {id:'portrait',lane:'art',stage:'now',wip:true,title:'キャラクターの立ち絵',sub:'王都の仲間たちを会話に',iconImg:'images/monsters/stella_apprentice_20261004.webp',
      lead:'序章の続きに登場する人物の立ち絵を用意します。',points:['ガチャで出会う仲間たちが、物語の中にも登場','序章ストーリーと並行して制作中']},
    {id:'bgm',lane:'art',stage:'later',title:'BGM',sub:'ゲームに音楽を',icon:'🎵',
      lead:'ゲームにBGMを追加します。',points:['ホーム・バトル・ストーリーなど場面ごとの曲','オン／オフの切り替え']},

    {id:'status',lane:'sys',stage:'next',title:'ステータス確認',sub:'仲間の能力を見やすく',icon:'📊',
      lead:'モンスターやキャラクターのステータスを確認できるようにします。',points:['HP・攻撃などの能力値を確認','モンスターとキャラクターの両方に対応','進化のタイミングは秘密のまま。育てて見つけよう']},
    {id:'evo',lane:'sys',stage:'next',title:'キャラクターの進化レベル',sub:'キャラも個体ごとの進化に',iconImg:'images/monsters/elna_middle_20261004.webp',
      lead:'モンスターと同じように、キャラクターの進化にも個体差を取り入れます。',points:['同じキャラクターでも、進化するタイミングが少しずつ違う','育てながら進化の瞬間を見つける楽しみ']},
    {id:'material',lane:'sys',stage:'next',title:'素材クエスト',sub:'育成素材を集めやすく',iconImg:'images/items/mega_data_art_v1.webp',
      lead:'経験値データや錬成素材が手に入りやすいクエストを追加します。',
      points:['キロ／メガ／ギガデータや、錬成の素材を集めやすく','オートと組み合わせて周回しやすく']}
  ],
  done:[
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
