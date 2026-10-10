# 非戦闘画面の白黒テーマ（レビュー用）

## 参照と作業範囲
- 開発 main: `ae5e064dda4159cce8b75f462be3bf280eb406d8`。110技再編の統合後を基準。
- 開発元: kankidoi2-byte/monster-rpg-ver8。pactforge-studio は配信専用であり変更しない。
- 専用ブランチ: feat/nonbattle-monochrome。レビューPRまで。main統合・本編公開は行わない。
- AGENTS.md、index.html、ui.js、story.js、各renderer、既存CSS/CIを調査。
- 参照プレビューはクラウドブラウザでログイン画面となり標準画面を視認できなかった。所有者Sites APIでversion 5までは確認できたが、source archiveの読取も解決できなかった。認証や共有範囲を変えず、ユーザーの明記した仕様を基準に実装。参照サイトとのピクセル一致を主張しない。

## テーマ管理
`js/nonbattle-theme.js` の凍結した画面registryと9個のpresetに配置・比率を集約。黒い面をCSS clip-pathの大きな多角形で描画し、白地に白い操作面と細い金枠を重ねる。背景に画像、グラデーション、霧、ぼかしは使わない。比率は背景面の初期目安で、操作面と既存画像が占める面積は含まない。

|分類|白/黒|画面|
|---|---|---|
|home|70/30 左斜め|home, homeFavoriteSelect|
|party|85/15 右上|party, partySet|
|growth|85/15 右下|growthHub, evolution, fusion, alchemy, alchemyConfirm, alchemyResult, skillEdit, skillSynthesis, expedition|
|dex|90/10 上部|dexHub, dex, characterDex, mapDex, itemDex, skillDex, typeChart|
|detail|65/35 対角|同画面内の詳細パネル（独立ルートではない）|
|gacha|75/25 下部|gachaHub, itemGacha, characterGacha, skillGacha|
|story|70/30 右上|storyMode, tutorialRequestReport, tutorialStellaCard, battleChoices（探索先選択）|
|menu|95/5 右下|moreMenu, contractorRank, contractorRankRewards, contractorTitles, shop|
|settings|95/5 外角|notices, diagnosticsScreen。save-management/profile-panelはmenu内部|

35の実在する非戦闘screenを対象。架空の装備タブ・図鑑分類・ガチャ分類は追加しない。英語学習は別アプリなので変更対象外。

## 維持する機能
- パーティー最大3体、お気に入りの背景付き元画像、遠征状態、ストーリー導線。
- 図鑑5分類、ガチャ3分類、ストーリー3分類、110技データ/編集/合成。
- 所持枚数、適性、入手、成長、価格、確率、セーブキー、アカウント・管理機能は変更なし。
- ホームの位置表示だけを追加。既存 storyProgressSnapshot().finished（completed又はskipped）で「世界の狭間」、それ以外は「冒険の拠点」。既存進行処理と依頼報告導線はそのまま。新しいグノーシス台詞は作らない。
- ホームへ戻る処理のハンドラは変更せず、白地・濃紺・44px以上のボタンに統一。
- 長い情報は削除せず、ホームも通常フローと縦スクロールで拡大・横向きに対応。

## 除外と隔離
battle、battleItemSelect、contractConfirmはtheme registryから除外。グローバルな:root変数は変えず、bodyのテーマ属性を画面切替時に除去する。contractAnimation・skillGachaPresentation・battle操作パネルは変更しない。tutorialOverlayの会話パネルとRank通知は非戦闘時だけ白い面へ統一し、戦闘時の表示を維持する。titleScreenも既存のオープニング演出を維持する。仲間画像に切抜き・グレースケール・再描画はしない。属性色は暗い小背景で可読性を確保し色の意味を保持。

## 検証
- 静的契約: scripts/test-monochrome-theme.mjs
- ブラウザ: scripts/test-monochrome-browser.mjs。CIの隔離ブラウザで320/360/390/430px、横844x390、空・多数・長名、詳細、200%相当のCSS zoomと半幅reflow、戦闘・契約のCSS不変を検証。実機Android/Chromebook、OSブラウザ拡大そのものとは区別する。
- 成果: CI artifact `nonbattle-monochrome-evidence`、manifest.json と変更前後PNG。
- ローカルでは既知のbrowser socket制限を回避せず、ブラウザ試験をCIに委ねる。CI完了前のスクリーンショットや合格は主張しない。
- npm run check と world-map economy比較を既存CIで実行。

最終PR本文に最新head、実際に合格した検証、プレビューURL、未確認事項を追記する。
