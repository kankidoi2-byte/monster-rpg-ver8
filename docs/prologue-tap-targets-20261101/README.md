# 序章チュートリアル：対象中央のタップと詳細シートの修正

対象報告書：[序章チュートリアル 通しプレイ点検報告と修正依頼｜ChatGPT向け](https://docs.google.com/document/d/1kFGwxS5pga8LAHqXTqAxpmcZjMAmfi3DUdGhZeRIHj0/edit)。全文を確認し、第4章の問題1〜3のみ実装。開始点は開発 main `d486251a5c3ce90b0ca9efca807c0a3144d4a87c`。マージ・公開は未実施。

## 変更

- `js/tutorial.js`：`ensureTutorialTargetVisible`で上部バー・下部ナビ・上に張り出すバトルボタン・遠征の追従固定欄を考慮。詳細シートなどの内側のスクロールにも対応。ナビ自体を案内する手順は除外する。
- 吹き出しの配置時にも対象を再確認。対象中央と吹き出しの操作欄が共存するよう対象を上下に寄せ、ページ端でスクロールできない場合は逆方向を試す。大きな説明パネルでは中央を優先する。画面再描画で対象ノードが差し替わった場合は同じステップの対象を取り直し、中断再開後も案内を維持する。
- `js/party.js`：問題3は採用案(a)。`growth_skill_open`中だけ閉じるボタンを無効にし、背景・閉じる共通処理からも閉じない。一時停止・別ステップへの移行時は無効化を解除。保存地点から再開したときは既存の処理でエルナの詳細を再表示する。
- `js/notices-data.js`にお知らせを追加。`index.html`の該当JSのキャッシュ識別子を更新。
- `package.json`と追加検査2本：`npm run check`で表示範囲の回帰検査と実画面の通し検査も実行する。

セーブキー`mb_v95c`、ステップID、`persistAs`、保存形式、遷移テーブルは変更しない。遠征は専用のメンバー選択を使い、序章以外の技カードガイドは技編集画面を直接案内しているため、この詳細シートの閉鎖制限は適用されない。

## 検査方法

`npm run check:prologue-taps`は、412×780・360×640のタッチ操作対応Chromiumで新しいブラウザコンテキストから開始する。タイトル・会話・名前入力・選択肢・各話の再開・戦闘・錬成・遠征を実画面の座標タップで操作し、第6話の最後と完了保存まで確認する。進行のための内部関数呼び出し、セーブの注入、強制クリック、検査側のスクロールは使わない。各targetステップで中央の`document.elementFromPoint`が対象自身またはその子であることを確認し、通常の案内ボタンも同じ方法でタップする。日本語フォントを表示して検査する。

第5章の未採用項目は現状のUI操作で進める。「各話を見る」→「再開する」をタップし、ランクアップの窓は「冒険を続ける」で閉じる。この窓を閉じた後に案内対象の中央を検査する。

中断・再開の追加検査（再読み込みと一時停止を併用した走行に加え、遠征進行中の一時停止を独立して確認する）：

```sh
PROLOGUE_TEST_WIDTH=360 PROLOGUE_TEST_PORT=4197 \
PROLOGUE_TEST_RELOAD=1 PROLOGUE_TEST_PAUSE=1 PROLOGUE_TEST_RETREAT=1 \
PROLOGUE_EVIDENCE_DIR=artifacts/save-failure-ui/prologue-resume \
node scripts/test-prologue-tap-through-browser.mjs

PROLOGUE_TEST_WIDTH=360 PROLOGUE_TEST_PORT=4198 PROLOGUE_TEST_PAUSE=1 \
PROLOGUE_EVIDENCE_DIR=artifacts/save-failure-ui/prologue-pause \
node scripts/test-prologue-tap-through-browser.mjs
```

再読み込みはbattle_choose_skill / battle_free / growth_skill_open / stella_skill_equip / stella_mock_free / lumina_execute / lumina_wait / expedition_member / expedition_active。9か所とも実操作で到達したセーブをそのまま読み直す。一時停止はmenu_dex_open / growth_skill_open / stella_skill_equip / lumina_execute / expedition_member / expedition_dispatch / expedition_activeの7か所。両戦闘で逃走し、既存の再戦案内から再開する。

## 第5章への提案（未実装・本人確認待ち）

1. 続きの入口：序章未完了中は`storyPrologueChapter`を開いた状態で表示する。既存カード・構造を維持して「再開する」を初めから見せる。完了後は通常の折りたたみへ戻す。
2. ランクアップ：能力値・報酬の保存は現状のまま、演出表示だけチュートリアル中は保留し、`chapterGate`で案内を閉じた後または全編完了後に出す。一時停止から別画面へ移った場合も保留を解消し、受取を失わせない。
3. 再戦：同一プレイ中に操作説明を終えた救援戦・模擬戦の再戦では、説明を省いて自由戦闘へ進める。説明を終える前に逃げた場合は従来の説明を維持する。既存の戦闘開始処理・ステップID・`persistAs`を維持し、再戦時だけ案内の開始位置を選ぶ。再読み込みで通常の説明に戻っても進められる設計とし、既存セーブに新しい必須項目を作らない。

## Galaxyでの確認

実機では未確認。検査用の空きプロフィール等を使い、本来のプレイデータを消さずに確認する。

- 第3話「図鑑を開こう」で図鑑の中央を押せること。「技を変更」で閉じる×・背景を押してもシートが残り、技変更で進めること。一時停止・再開後も同じ対象が出ること。
- 第4話の技編集・技属性の説明、第5話の素材説明・錬成実行で、対象と「次へ」の両方を押せること。
- 第6話の草原・短距離・フレイガル・出発を、手動スクロールなしで順に押せること。
- ブラウザのアドレスバーが開いた状態・縮んだ状態、普段の文字サイズで吹き出しや対象の中央が隠れないこと。
- 第5章の3点は承認前なので残る。各話の再開は「各話を見る」から、ランクアップは「冒険を続ける」で閉じ、再戦時は既存の説明を進める。

## 検査結果

- `npm run check`：終了コード0。既存の保存・旧セーブ移行・チュートリアル・進化済み仲間・遠征・モンスター一覧の検査と、新しい表示範囲／タップ通し検査を含めて合格。
- 412×780：95ステップ、対象中央64回、座標タップ172回。新規データから序章完了保存まで到達。
- 360×640：95ステップ、対象中央65回、座標タップ176回。同じく完了保存まで到達。手動スクロールなし。
- 360×640の中断・逃走検査：98ステップ、対象中央135回、座標タップ280回。再読み込み9か所、一時停止6か所、救援戦・模擬戦の逃走後再戦を含めて完了。遠征進行中の保存地点は`prologue_epilogue`なので、再読み込み後は同じ遠征を増やさず終幕へ進む。
- 360×640の一時停止単独検査：95ステップ、対象中央82回、座標タップ216回。遠征進行中を含む7か所すべてで一時停止→ホーム→ストーリー再開し、完了保存まで到達。
- 全走行でJavaScriptの`pageerror`とブラウザのalert/confirmは0件。詳細シートの閉じるボタンと背景操作も検査済み。
- 序章の`registerTutorialFlow`本体が開始点とバイト単位で一致すること、`js/save.js`に差分がないことも確認。
- `npm run check:tutorial-ui`、`npm run check:tutorial-targets`、`npm run check:prologue-continuity`を最終の対象再取得調整後にも再確認。
- 詳細な座標・保存地点・画面画像は同じフォルダの`browser-results.json`とPNGを参照。
