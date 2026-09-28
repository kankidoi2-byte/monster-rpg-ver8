# グランボルモーグ v18：独立戦闘接続

2026-09-27 JST。起点99c728fabb73b7f51960eff04ebc4482b59d544b。

## 完了範囲
- Drive採用WebMを取得し1758952 bytes・SHA256 1546cc7f824110e77e71daf0fa02f6b1c5bc68886e48815da885105867cb5e00の一致を確認。動画は無加工。
- 先頭RGBAフレームから960角の全身静止WebPを生成（quality90、alpha保持）。新規ポスターであり原画の差し替えではない。
- `tools/motion-review/build-gran-review.mjs` は実際のindexと戦闘スクリプトを利用し、生成QAページだけで候補を既存の再生管理へ接続する。元indexと通常registryは変更なし。再生成可能な一時的候補注入で、通常登録後は不要。
- 出力 `tools/motion-review/gran-volmoog-review.generated.html`。sandboxはallow-scriptsのみ（allow-same-originなし）。ゲーム起動前にlocalStorage/sessionStorageをメモリ実装へ置換。本編セーブを読み書きしない。
- 味方1体、敵1体、同種3体、19マップ選択、文字200%、間隔測定、停止離脱。1体モードの上限1、3体はQA時のみ。味方の左右反転は候補値で、正面寄りの姿の最終向きは実表示受入待ち。
- 足場はQA内で画像/動画ともcenter bottomに固定。原動画内の足元は既存bbox最大y944（960角）。全編bboxと表示枠からHP/操作までの距離を算出するボタンを実装。実行前の計測値を合格としない。

## 自動検査
`node tools/motion-review/build-gran-review.mjs`
`NODE_PATH=/tmp/gran-dom/node_modules node scripts/test-gran-volmoog-review-dom.mjs`

実ゲームコード+jsdom/Mediaモックで3配置の動画参照、HP更新時のノード/時刻保持、道具往復停止復帰、離脱/旧通知排除、失敗時の静止/再試行、交代破棄、19マップ接続、通常registry不変、原本hashを確認。詳細はgran-volmoog-review-dom.json。これは実デコード、ブラウザレイアウト、配信、Android性能の検査ではない。

## 残条件と再開
現在のmanaged-linux環境のSitesブラウザ検証ガイドはcontrol-browserを必須とし、不在時の別手段を禁じている。利用可能スキル全ページに同スキルなし。別ブラウザ経路で迂回せず、今回の実ブラウザ検証は未実施。

本人の「見た目に問題なし」は確認済み。同じ素材単独の確認は再要求しない。右端66フレーム接触の既存測定値は維持し、端接触ゼロ/切断解消とはしない。

1. 保存branchの最新HEADを取得。上記builderを実行（通常indexを変更しない）。
2. 利用可能な許可済み検証環境でgeneratedページを開く。画像・19背景等はリポジトリの完全な素材配置が必要。今回のローカルcloneは大きな既存画像を省略したsparse checkoutで、完全な配信パッケージではない。
3. 味方/敵/同種3体、縦320〜430・横画面・200%文字、2周以上のループ、足元/向き/切断、HUD8px・操作12px、再生停止復帰を検証。計測はCSS矩形+既存bboxであり、目視に置き換えない。
4. 当該動画の配信MIME/Range・実再生を確認。共通の定量負荷等は別途未完了。
5. 条件がそろった時だけ通常registryへ追加し、必要な告知と関連回帰/full checkを実施する。

現時点では通常登録はボルモーグ1種のまま。今回の独立QA接続を正式登録完了と表現しない。通常ゲームのJS/CSS/index/セーブ/ID/規則は未変更。プレイヤー向け告知不要。mainへのマージ、公開、既存本人限定プレビュー更新なし。

## 2026-09-29 06:54 JST 続行結果
上記「プレビュー更新なし」は初回実装時点の記録。今回は残り差分をGitHubへ保存・13ファイル照合済み、DOM検査再実行PASS。既存本人限定Sitesへ隔離確認ページを追加し反映成功。実再生や配置の受入は未完了。詳細と再開点はphase9-progress.mdの最新項を参照。

## 2026-09-29 07:06 JST 読込修正版
本人の実機で初版はCSS/画像/スクリプトの読み込みに失敗。現在の生成iframeは信頼済み同一サイトのリソース読込用にallow-scripts allow-same-originを使用する。冒頭のallow-scriptsのみという説明は初版の履歴であり現行ではない。セーブ隔離は本編との別originおよび起動前のlocal/sessionStorageメモリ実装による。既存保存を汚さない回帰と44リソース実配置読込検査、失敗時ガード検査PASS。本人限定サイトへ修正反映成功、実機の再確認待ち。詳細はphase9-progress.md。
