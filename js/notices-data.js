/* Player-facing update notices. Keep newest entries first. */
const NOTICE_CATEGORIES = Object.freeze({
  update: Object.freeze({ label: 'アップデート', icon: '✨' }),
  fix: Object.freeze({ label: '不具合修正', icon: '🛠️' }),
  important: Object.freeze({ label: '重要', icon: '⚠️' })
});

const GAME_NOTICES = Object.freeze([
  Object.freeze({
    id: '20260903-kokoro-link-one-second-layout',
    date: '2026-09-03',
    category: 'update',
    title: 'ココロリンクの発動を見やすくしました',
    body: '「ココロリンク！」の文字をモンスターの上、効果付与の表示を下に配置し、リンクする仲間の姿を約1秒でしっかり確認できるようにしました。演出中もバトル操作を続けられます。'
  }),
  Object.freeze({
    id: '20260903-kokoro-link-centered-animation',
    date: '2026-09-03',
    category: 'update',
    title: 'ココロリンクの発動演出を見直しました',
    body: '選んだ控えモンスターが画面中央へ大きく現れ、「ココロリンク！」の文字と強い発光に続いて、戦闘中のモンスターへ効果が付与されたことを約0.6秒で確認できます。'
  }),
  Object.freeze({
    id: '20260903-kokoro-link-animation',
    date: '2026-09-03',
    category: 'update',
    title: 'ココロリンクの発動演出を追加しました',
    body: 'リンクする控えモンスターの高速カットインから光が走り、衝撃とオーラでココロが繋がる瞬間を約0.6秒で表示します。演出中もバトル操作を続けられます。'
  }),
  Object.freeze({
    id: '20260903-prologue-story-mode',
    date: '2026-09-03',
    category: 'update',
    title: '序章を6話のストーリーとして楽しめます',
    body: 'ホームの「次の冒険へ」からストーリーモードへ進めるようになりました。序章は区切りのよい全6話で進み、話の終わりには一覧へ戻ります。完了した話はあらすじで振り返れます。'
  }),
  Object.freeze({
    id: '20260903-skill-gacha-compact-result',
    date: '2026-09-03',
    category: 'update',
    title: '技ガチャの結果表示を見やすくしました',
    body: '召喚後に同じ技カードを縦長に並べ直す表示をなくしました。10連結果は召喚画面内でまとめて確認でき、気になるカードをタップしたときだけ技の詳細が開きます。'
  }),
  Object.freeze({
    id: '20260903-skill-gacha-presentation',
    date: '2026-09-03',
    category: 'update',
    title: '技ガチャに「技紋の召喚」演出を追加しました',
    body: '召喚陣から技カードが1枚ずつ現れ、希少な技ほど強い光で獲得を知らせるようになりました。初獲得・所持枚数を確認でき、結果から続けて引くか仲間の技変更へ進めます。高速表示とスキップにも対応しています。'
  }),
  Object.freeze({
    id: '20260903-all-map-ecosystem-diagrams',
    date: '2026-09-03',
    category: 'update',
    title: '全マップの生態系を図で確認できます',
    body: '草原に続き、残り18マップにも生態系や環境の構造図を追加しました。自然地域では命と魔力の流れを、闘技場・秘境・異界などでは、その場所を成り立たせる関係を確認できます。'
  }),
  Object.freeze({
    id: '20260903-grassland-ecosystem-pyramid',
    date: '2026-09-03',
    category: 'update',
    title: '草原の生態系を図で確認できます',
    body: 'マップ図鑑の草原に、生態系の詳しい解説と4層の生態系ピラミッドを追加しました。草木から採食者、空の捕食者へつながる関係に加え、スライムによる循環やゴブリンの立ち位置も確認できます。'
  }),
  Object.freeze({
    id: '20260903-tutorial-skill-button-layout-fix',
    date: '2026-09-03',
    category: 'fix',
    title: '技カード変更のチュートリアル表示を修正しました',
    body: '技を外す・装備する場面で、操作ボタンがチュートリアル専用の大きな表示へ変わっていた問題を修正しました。通常と同じ技カード内のボタンを黄色い枠で案内します。'
  }),
  Object.freeze({
    id: '20260903-tutorial-replay-retired',
    date: '2026-09-03',
    category: 'update',
    title: 'チュートリアルの再閲覧を終了しました',
    body: '通常チュートリアルとの表示・進行の混在を防ぐため、完了後の再閲覧を廃止しました。途中で閉じた通常チュートリアルは、メニューの「チュートリアルを続ける」から再開できます。'
  }),
  Object.freeze({
    id: '20260903-tutorial-main-growth-display-fix',
    date: '2026-09-03',
    category: 'fix',
    title: '本編の育成チュートリアル表示を修正しました',
    body: '再閲覧向けの大きな「育成・個体情報」ボタンが、最初から遊ぶチュートリアルにも表示されていた問題を修正しました。本編はカード上の黄色い枠、再閲覧は画面下の大きなボタンで案内します。'
  }),
  Object.freeze({
    id: '20260903-tutorial-growth-guidance-fix',
    date: '2026-09-03',
    category: 'fix',
    title: '育成チュートリアルの操作案内を修正しました',
    body: 'スマートフォンでチュートリアルを再閲覧した際に、「育成・個体情報」の操作先が分かりにくい問題を修正しました。再閲覧中は押す場所を画面下部へ大きく表示し、案内文も具体的にします。'
  }),
  Object.freeze({
    id: '20260903-tutorial-replay-battle-fix',
    date: '2026-09-03',
    category: 'fix',
    title: 'チュートリアル再閲覧の停止を修正しました',
    body: '旧セーブなどで序章の契約体を所持していない場合でも、再閲覧用の一時パーティーで救援戦と模擬戦を開始できるようにしました。仲間や報酬、現在の編成は変更されません。'
  }),
  Object.freeze({
    id: '20260903-prologue-tutorial-galdra',
    date: '2026-09-03',
    category: 'update',
    title: '入門錬成でガルドラが仲間になります',
    body: '序章のルミナの入門錬成で、最初の錬成モンスターとしてガルドラが完成するようになりました。すでに仲間にしたモンスターやセーブデータはそのまま保持されます。'
  }),
  Object.freeze({
    id: '20260902-map-dex-ecosystem',
    date: '2026-09-02',
    category: 'update',
    title: 'マップ図鑑に生態系を追加しました',
    body: '発見済みマップの詳細で、全19マップ固有の生態解説、出現データから集計した属性傾向、主な生息種を確認できるようになりました。'
  }),
  Object.freeze({
    id: '20260901-diagnostics-export',
    date: '2026-09-01',
    category: 'update',
    title: '診断結果をコピー・保存・共有できるようにしました',
    body: '診断画面から要約のコピー、JSONファイルの保存、OSの共有画面を開けます。いずれもボタンを押したときだけ動作し、共有先への送信は自動では行いません。'
  }),
  Object.freeze({
    id: '20260901-diagnostics-screen',
    date: '2026-09-01',
    category: 'update',
    title: 'ゲームの状態を確認できる診断画面を追加しました',
    body: 'メニューの「診断」から、端末環境やセーブの件数、チュートリアル・錬成・遠征の状態、エラー件数を確認できます。セーブ全文や個体IDは表示せず、診断内容が外部へ自動送信されることもありません。'
  }),
  Object.freeze({
    id: '20260831-prologue-existing-expedition-fix',
    date: '2026-08-31',
    category: 'fix',
    title: '序章の遠征案内で進めない問題を修正しました',
    body: '派遣中または完了済みの遠征がある途中セーブで、満員の遠征枠へ新しい派遣を求められ、序章を進められない問題を修正しました。既存の遠征を保持したまま案内済みとして続行します。'
  }),
  Object.freeze({
    id: '20260831-completed-alchemy-recap-fix',
    date: '2026-08-31',
    category: 'fix',
    title: '完了済みの入門錬成案内を修正しました',
    body: '入門錬成を完了済みの途中セーブで、完了済みの説明が表示されないまま次の案内へ進む問題を修正しました。報酬や素材を重複させず、完了済みであることを確認してから遠征案内へ進みます。'
  }),
  Object.freeze({
    id: '20260831-prologue-mobile-skill-action-fix',
    date: '2026-08-31',
    category: 'fix',
    title: 'スマートフォンの技カード案内を修正しました',
    body: '序章の技カード変更で、案内された「外す」または「装備」ボタンが説明パネルの背後に隠れ、先へ進めない場合がある問題を修正しました。操作中の実際のボタンを下部メニューの直上へ表示します。'
  }),
  Object.freeze({
    id: '20260831-legacy-expedition-victory-fix',
    date: '2026-08-31',
    category: 'fix',
    title: '一部の途中セーブで勝利後に停止する問題を修正しました',
    body: '古い遠征データを含む途中セーブで、バトルに勝利しても「倒した！」の表示から先へ進まない場合がある問題を修正しました。遠征の適性データがない場合は、派遣中の仲間と遠征先から安全に復元します。'
  }),
  Object.freeze({
    id: '20260830-game-title-cleanup',
    date: '2026-08-30',
    category: 'update',
    title: 'ゲーム名の表示を整理しました',
    body: 'タイトル画面とブラウザのタブに表示されるゲーム名を「モンスターバトル Ver8.0」に統一しました。ゲーム内容やセーブデータへの変更はありません。'
  }),
  Object.freeze({
    id: '20260829-tutorial-action-guidance',
    date: '2026-08-29',
    category: 'fix',
    title: 'チュートリアルの操作案内を分かりやすくしました',
    body: '「冒険」や「技」など実際の画面操作が必要な案内では「次へ」を表示せず、黄色い枠の操作だけを選べるようにしました。押しても進まない「次へ」に迷わず、説明を読む場面と操作する場面を区別できます。'
  }),
  Object.freeze({
    id: '20260829-tutorial-android-flow-fix',
    date: '2026-08-29',
    category: 'fix',
    title: 'チュートリアルの開始操作とスクロールを修正しました',
    body: '入門依頼のボタンを押してもスライム戦へ進まず、バトルを選び直す必要がある問題を修正しました。スマートフォンで説明が長い場合に、案内の吹き出しを指で縦スクロールできない問題も修正しました。'
  }),
  Object.freeze({
    id: '20260829-tutorial-battle-start-fix',
    date: '2026-08-29',
    category: 'fix',
    title: '最初のバトルが空になる問題を修正しました',
    body: 'チュートリアルの入門依頼で、まれに敵と味方が表示されないままバトル画面へ進む問題を修正しました。依頼の準備が完了したことを確認してからバトル案内を開始します。'
  }),
  Object.freeze({
    id: '20260829-tutorial-growth-collection-guides',
    date: '2026-08-29',
    category: 'update',
    title: '育成・収集機能の初回案内を追加しました',
    body: '錬成、遠征、進化・融合、技カード・技ガチャ、黄金郷、図鑑、ショップ・アイテム、契約者Rank・称号を初めて使う時に、現行ルールを実際の画面で短く確認できるようになりました。案内は機能ごとに一度だけ表示されます。'
  }),
  Object.freeze({
    id: '20260829-tutorial-battle-feature-guides',
    date: '2026-08-29',
    category: 'update',
    title: '特殊バトルとココロリンクの初回案内を追加しました',
    body: '三つ巴、乱入、ココロリンクを初めて使う時に、現在のルールを実際のバトル画面で短く確認できるようになりました。一度確認した案内は繰り返し表示されません。'
  }),
  Object.freeze({
    id: '20260829-tutorial-first-contract',
    date: '2026-08-29',
    category: 'update',
    title: '最初の契約と加入後の案内を追加しました',
    body: '新しくゲームを始めた契約者向けに、草原のスライムとの最初の契約だけが必ず成功する案内を追加しました。通常契約書は1枚だけ支給・消費され、加入後はカード、属性、技、編成、成長を実際の画面で確認できます。'
  }),
  Object.freeze({
    id: '20260829-tutorial-first-battle',
    date: '2026-08-29',
    category: 'update',
    title: '最初の討伐バトル案内を追加しました',
    body: '新しくゲームを始めた契約者向けに、草原のスライムとの入門依頼を追加しました。敵と味方、HP、属性、技、ターン、勝利報酬を実際のバトル画面で短く確認できます。敗北や撤退のあとも同じ依頼へ再挑戦できます。'
  }),
  Object.freeze({
    id: '20260829-tutorial-party-home',
    date: '2026-08-29',
    category: 'update',
    title: '仲間選びとホームのチュートリアルを追加しました',
    body: '新しくゲームを始めた契約者向けに、グノーシスが最初のパーティー編成とホーム画面の基本を案内します。既存のセーブデータでは自動開始しません。'
  }),
  Object.freeze({
    id: '20260829-tutorial-guide-foundation',
    date: '2026-08-29',
    category: 'update',
    title: '画面上で確認できる操作ガイドを追加しました',
    body: '実際の操作場所を照らしながら説明するチュートリアル表示を追加しました。メニューの「チュートリアル」から表示方法を確認できます。案内は戻る操作と、画面を閉じる操作に対応しています。'
  }),
  Object.freeze({
    id: '20260828-post-battle-contract',
    date: '2026-08-28',
    category: 'update',
    title: 'モンスターとの契約を勝利後に統一しました',
    body: '通常戦でも敵を倒した後に契約を試みる方式へ変更しました。三つ巴バトルと同じく、勝利結果から契約書を使い、成功すると仲間に加わります。契約に失敗することもあります。'
  }),
  Object.freeze({
    id: '20260828-prologue-dex-elysia-galdra',
    date: '2026-08-28',
    category: 'update',
    title: '序章の図鑑にエリシアとガルドラを追加しました',
    body: 'エリシア、光祈の巫女エリシア、光の女神エリシアをキャラクター図鑑へ追加しました。モンスター図鑑ではアストラレピスをNo.16へ移し、新たな錬成限定モンスター「ガルドラ」をNo.46へ追加しました。'
  }),
  Object.freeze({
    id: '20260827-elixion-neutral-dragon',
    date: '2026-08-27',
    category: 'update',
    title: 'エリクシオンの属性を変更しました',
    body: '賢金神竜エリクシオンの属性を光／竜から無／竜へ変更しました。専用技「賢金錬輪」と「エリクシオン・ノヴァ」も、新しい属性に合わせて無属性を持つ技へ変更しました。'
  }),
  Object.freeze({
    id: '20260827-contractor-rank-rewards',
    date: '2026-08-27',
    category: 'update',
    title: '契約者Rank報酬を追加しました',
    body: 'Rank 2〜50に一度限りの報酬を追加しました。契約書、コイン、育成データ、錬成素材などを、契約者Rank画面から個別または一括で受け取れます。これまでの冒険記録から到達したRankの報酬も未受取として用意されます。'
  }),
  Object.freeze({
    id: '20260827-contractor-title-menu',
    date: '2026-08-27',
    category: 'update',
    title: '獲得した称号を装備できるようになりました',
    body: 'メニューの「称号」から、契約者Rankで獲得した称号を1つ選んで装備できます。現在の称号は契約者Rank画面にも表示されます。称号は冒険の達成記録で、戦闘能力や利用できる機能には影響しません。'
  }),
  Object.freeze({
    id: '20260827-contractor-rank-ui',
    date: '2026-08-27',
    category: 'update',
    title: '契約者Rankを確認できるようになりました',
    body: '討伐、契約、図鑑登録、進化、錬成、遠征などで契約者EXPを獲得し、冒険全体の歩みをRankとして記録します。上部のRank表示やメニューから進捗と最近の獲得履歴を確認でき、Rankアップ時は専用演出が表示されます。Rankによる機能制限や能力補正はありません。'
  }),
  Object.freeze({
    id: '20260826-fixed-hunt-difficulty',
    date: '2026-08-26',
    category: 'update',
    title: '討伐依頼の難易度とレアリティを刷新しました',
    body: '敵の強さがパーティーに連動しない固定Lv制になりました。EasyはLv.1の★1、Normalは★1～★3、Hardは★2～★4、ExtremeはLv.100の★5だけが出現します。モンスターのレベル上限もLv.100になりました。'
  }),
  Object.freeze({
    id: '20260826-dex-hub-map-dex',
    date: '2026-08-26',
    category: 'update',
    title: '図鑑をまとめ、マップ図鑑を追加しました',
    body: 'メニューの図鑑から、モンスター・キャラクター・マップ・アイテムの記録を選べるようになりました。マップ図鑑では土地の特徴、出現する相手、難易度、特殊イベントを確認できます。'
  }),
  Object.freeze({
    id: '20260826-battle-support-motion',
    date: '2026-08-26',
    category: 'update',
    title: '回復・強化・防御技にも専用演出を追加しました',
    body: '回復、能力強化、防御、水の盾、睡眠の補助技に、属性色付きの専用演出を追加しました。これですべての攻撃技と補助技が演出に対応しました。'
  }),
  Object.freeze({
    id: '20260826-battle-all-attack-motion',
    date: '2026-08-26',
    category: 'update',
    title: 'すべての攻撃技に専用演出を追加しました',
    body: '波動、葉や光の投射物、雷撃、嵐などの範囲攻撃、幻術・吸収など、残っていた攻撃技にも属性色付きの演出を追加しました。これですべての攻撃技が演出に対応しました。'
  }),
  Object.freeze({
    id: '20260826-battle-roar-motion',
    date: '2026-08-26',
    category: 'update',
    title: '攻撃系の咆哮技に専用演出を追加しました',
    body: 'ダメージを与える咆哮技を使うと、技の属性色をまとった衝撃波が相手へ広がるようになりました。強化や防御を目的とする咆哮技は、攻撃演出の対象外です。'
  }),
  Object.freeze({
    id: '20260826-battle-anatomy-motion',
    date: '2026-08-26',
    category: 'update',
    title: '身体攻撃・武器攻撃の演出を追加しました',
    body: '尻尾・翼・ひれ・蹴り・角・くちばし・拳・棍棒・短剣を使う攻撃に、薙ぎ払い・突き・打撃の専用演出を追加しました。技の属性に応じて演出の色も変化します。'
  }),
  Object.freeze({
    id: '20260826-battle-impact-motion',
    date: '2026-08-26',
    category: 'update',
    title: '突進・打撃・体当たり技に攻撃演出を追加しました',
    body: '突進と体当たりでは攻撃側が相手へ踏み込み、打撃技では相手の位置に重い衝撃が走るようになりました。通常戦と複数の敵が登場するバトルの両方に対応しています。'
  }),
  Object.freeze({
    id: '20260826-battle-ranged-motion',
    date: '2026-08-26',
    category: 'update',
    title: '魔法・飛刃技に攻撃演出を追加しました',
    body: '攻撃魔法では属性色の魔力弾が、刃を飛ばす技では三日月状の刃が相手へ飛ぶようになりました。通常戦と複数の敵が登場するバトルの両方に対応しています。'
  }),
  Object.freeze({
    id: '20260826-battle-melee-motion',
    date: '2026-08-26',
    category: 'update',
    title: '剣・爪・牙の攻撃演出を追加しました',
    body: '剣技・爪技・牙技を使うと、相手の位置に属性色をまとった斬撃、爪痕、噛みつきの演出が表示されるようになりました。通常戦と複数の敵が登場するバトルの両方に対応しています。'
  }),
  Object.freeze({
    id: '20260826-battle-skill-motion',
    date: '2026-08-26',
    category: 'update',
    title: 'ブレス・ビーム技に攻撃演出を追加しました',
    body: 'ブレス系とビーム系の攻撃技を使うと、技の属性色をまとった光が相手へ飛ぶようになりました。通常戦と複数の敵が登場するバトルの両方に対応しています。'
  }),
  Object.freeze({
    id: '20260826-battle-command-pad',
    date: '2026-08-26',
    category: 'update',
    title: 'バトルコマンドを見やすく整理しました',
    body: '技・交代・リンク・道具・逃走を十字型の操作盤にまとめました。契約書は道具から使用でき、契約可能なときは道具ボタンに表示されます。'
  }),
  Object.freeze({
    id: '20260826-battle-switch',
    date: '2026-08-26',
    category: 'update',
    title: '戦闘中にモンスターを交代できるようにしました',
    body: 'バトルコマンドの「交代」から、戦闘可能な控えモンスターへ交代できます。通常の交代は1ターンを使い、風渡り交代はこれまで通り行動を消費しません。'
  }),
  Object.freeze({
    id: '20260826-single-battle-vertical-layout',
    date: '2026-08-26',
    category: 'fix',
    title: '通常戦のモンスター配置を見直しました',
    body: '通常戦でも三つ巴バトルと同じように、敵を上、プレイヤーのモンスターを下に表示するよう変更しました。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-water-mirror-guard',
    date: '2026-08-26',
    category: 'update',
    title: '★3水属性のリンク能力を変更しました',
    body: '保留中だった「水脈節約」を「水鏡の護り」へ変更しました。次に受ける直接ダメージを30％軽減し、1回発動すると消費します。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-active-details',
    date: '2026-08-26',
    category: 'fix',
    title: '発動中のリンク効果を確認できるようにしました',
    body: 'ココロリンク発動後も「発動中」ボタンから、残り障壁・攻撃・素早さと追加リンク能力の状態をいつでも確認できます。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-three-star-abilities',
    date: '2026-08-26',
    category: 'update',
    title: '★3モンスターのリンク能力を追加しました',
    body: '★3モンスターが主属性に応じて、回復・状態解除・反動無効・先制行動・無消費交代・敵強化解除・行動予知・耐性貫通などの戦術支援を発動するようになりました。技コスト軽減は戦闘内コスト実装まで保留されます。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-two-star-abilities',
    date: '2026-08-26',
    category: 'update',
    title: '★2モンスターのリンク能力を追加しました',
    body: '★2モンスターが主属性に応じて、弱体化・火傷・鈍足・毒・麻痺・行動遅延・目くらまし・こんらん・ねむり・攻撃低下を発動するようになりました。ボスには通常より効きにくくなります。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-one-star-abilities',
    date: '2026-08-26',
    category: 'update',
    title: '★1モンスターのリンク能力を追加しました',
    body: '★1モンスターが主属性ごとの追加能力を発動するようになりました。攻撃・障壁・素早さ強化のほか、継続回復、回避、初撃軽減、HP吸収、確率補正、技威力強化が使えます。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-scaling',
    date: '2026-08-26',
    category: 'fix',
    title: 'ココロリンクの強化計算と表示を改善しました',
    body: '強化量が戦闘中モンスターの能力を基準に決まるよう修正しました。効果欄にはレアリティ補正を適用した最終値を表示します。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link',
    date: '2026-08-26',
    category: 'update',
    title: '新バトルシステム「ココロリンク」を追加しました',
    body: '戦闘中、控えモンスター1体の力を借りて、味方に障壁・攻撃・素早さの強化を付与できるようになりました。低レアリティほど高いリンク倍率を持ちます。'
  }),
  Object.freeze({
    id: '20260825-notice-center',
    date: '2026-08-25',
    category: 'update',
    title: 'お知らせ機能を追加しました',
    body: 'ホーム画面から最新情報と、これまでの主な更新履歴を確認できるようになりました。'
  }),
  Object.freeze({
    id: '20260825-skill-gacha',
    date: '2026-08-25',
    category: 'update',
    title: '技ガチャを追加しました',
    body: 'コインを使って技カードを獲得できるようになりました。技コストが高いカードほど出現しにくくなります。'
  }),
  Object.freeze({
    id: '20260825-evolution-skill-card',
    date: '2026-08-25',
    category: 'update',
    title: '進化時に初期技カードを獲得できるようになりました',
    body: 'モンスターが進化すると、進化後のモンスターが持つ初期装備技を技カードとして獲得します。'
  }),
  Object.freeze({
    id: '20260825-skill-card-system',
    date: '2026-08-25',
    category: 'update',
    title: '技カードと装備技の管理を改善しました',
    body: '技の分類と装備区分を整理し、入手・所持した技カードを使って技を付け替える仕組みに変更しました。'
  }),
  Object.freeze({
    id: '20260824-title-loading',
    date: '2026-08-24',
    category: 'update',
    title: 'ゲームの初期読み込みを軽量化しました',
    body: 'タイトル画面の画像と読み込み処理を見直し、スマートフォンでゲームを開く際の通信量を削減しました。'
  }),
  Object.freeze({
    id: '20260824-monster-dex-obtain',
    date: '2026-08-24',
    category: 'update',
    title: 'モンスター図鑑の入手情報を改善しました',
    body: '図鑑の詳細画面で、出現マップや進化・錬成などの主な入手方法を確認できるようになりました。'
  }),
  Object.freeze({
    id: '20260824-chimeragna-rarity',
    date: '2026-08-24',
    category: 'update',
    title: 'キメラグナ・アペクスを★4へ調整しました',
    body: 'キメラグナ・アペクスのレアリティを★5から★4へ変更し、装備できる技コスト上限も調整しました。'
  })
]);
