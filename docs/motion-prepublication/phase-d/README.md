# Phase D — 回収した表示調整の取り込み（2026-10-01 JST）

## 保存した範囲

GitHub基点30c07b9、確認Site version29/source d129b1eから表示調整6ファイルを回収してゲーム経路へ取り込み。index.htmlにSite専用QAスクリプトは入れず、通常ゲームのキャッシュキーのみ更新。確認HTMLはゲーム側のindex/runtime/scenarioから再生成。セーブ、データ、能力、技、ID、19背景画像は変更なし。動画・画像の再生成や再圧縮なし。

全フレームのalpha unionを等比で表示枠に収め、動画と静止画の配置を統一。ResizeObserverとresize fallback、所有権確認、離脱時の解除を使用。足の解剖学的接地点や背景上の地平線を確定する処理ではない。

19背景を切り替える確認画面に、大型エリクシオン・横長オルカアビス・小型スライムの混成表示を追加。計測は登録レコードから配置を取得する。

## 検証

関連6検査PASS。50種×8枠寸法の400例で数値上の包含・等比を検査。サイズ変更・ゼロサイズ時fallback・observer解除と古いcallbackを検査。再生保持、一時停止、失敗時静止画、再試行、交代、乱入、50回離脱をDOM/media mockで検査。19背景の接続と19背景での混成表示を確認。構文検査・notice検査PASS。

古い検査の「aquaron/slimeは未登録」「volmoogのみ登録」という前提を修正。ライフサイクルと複数体検査で非対応の交代要員が必要な箇所はelna_beginnerを使用し、ゲーム登録数を減らさず従来の後始末検査を維持。媒体DOM検査では交代後の旧video不在を確認し、新登録要員のvideo自体を禁止しない。map検査は50評価登録保持と混成表示を検査。

npm run checkは実行したが、この復元checkoutに過去Git履歴がなく、test-world-map-downgrade-safety.mjsのgit show d31cfccdで終了1。全体PASSとはしない。以前の検査成功を今回の成功へ流用しない。mergeは行わない。

## 次の再開地点・残条件

1. このfeature HEADとvalidation.jsonを読む。回収パッチの二重適用は不要。
2. 完全なGitHub履歴のあるcheckoutでnpm run check（postcheck含む）を完走させる。
3. 実ブラウザで19背景、代表の大型/横長/小型、味方/敵/3体、縦横画面・文字200%、静止画fallbackについて足元・切断・HP/操作部との間隔を検証する。DOM計測は実レイアウトの合格ではない。
4. 本人限定Siteの保存済みversion29とゲーム側変更を照合し、必要な更新だけ反映してGalaxy代表配置の確認へ進む。

Phase D全体、E/F、全50体の最終受入は未完了。本編mainへのマージ・一般公開は禁止を維持。このターンではSite更新もしない。
