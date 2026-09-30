# Phase C 配信容量対策（2026-09-30 JST）

第8便後の登録は30/50、残り20体。本人限定確認サイトの配信archiveが258,964,006 bytesに達し、256 MiB上限まで9,471,450 bytesしかなかった。追加便の前に、登録済み動作をSitesのR2へ保管し、サイト本体から分離して同じURLで配信する経路を実装した。

## 結果と保存先

- 新archive：56,030,870 bytes、603ファイル。旧版から202,933,136 bytes削減。archive全ファイルを末尾まで読み取り、サイズ一致を検証。SHA-256 `6df0b3d980e893f5bc36d76052a5dcb134c4bef30b2181ff588ae590d63d7101`。
- 原本と通常ゲームのWebMはGitHub採用ブランチに保持。Site配信用の重複コピー30ファイル（202,907,613 bytes）だけをarchive同梱から外し、SHA-256付きmanifestで参照。静止WebP、既存QA比較版、本編ゲーム、セーブ、同時再生上限は変更なし。

## 配信経路

Siteの`app/game/images/monsters/motion/[filename]/route.ts`が既存のURLを受ける。`lib/motion-assets.json`の採用済みファイル名だけを許可し、GitHubの固定コミット`183fda65022579bb6c1f6b247f219ecdbf5c9e64`から原本をサーバー側で取得する。R2のSHA-256検証付きストリーム保存が成功してから配信し、2回目以降はR2を利用する。外部任意URL・任意アップロード・削除APIなし。圧縮・再描画なし。動画はsame-originでRange/HEAD/ETag対応、privateキャッシュ。保管/取得失敗は503と再試行案内、既存の静止画代替を維持。

Sitesのdispatch認可を利用する共有素材読み取り経路。個人データや接続アプリを読む機能ではない。検証は既存のプラットフォームサービス資格をメモリとhidden stdinのみで使用し、Siteのみに送信。資格情報はsource・報告書に保存しない。公開範囲を変更しないことが継続条件。

## 検証

- Site build、TypeScript検査に合格。
- ユニット検査：保存の再利用、checksum不一致拒否、先頭/末尾/開区間/範囲外/複数Range、HEAD、ETag、If-Range、未登録パス、保管/原本障害時503。
- ローカルWorkerでは外部DNS接続が制限され、実R2への原本importを完了できなかった。環境制約をコード合格と扱わず、配信済み本人限定Siteで実保管・配信検査を実施。Worker非対応のredirect:errorはmanual+非成功拒否へ修正済み。
- 実Siteの全30体：先頭1024byteの206応答・Content-Range、全ファイルGETの元SHA-256/サイズ/MIME、2回目のR2保存済み読み取り、HEAD、既存静止WebP、未認証アクセス拒否。具体値は`production-checks.json`。
- 通常ゲーム側はdocumentationのみの変更。第8便で合格したnpm run checkとDOM検査の入力は無変更のため結果を再利用。告知不要（本編プレイヤーの動作は変更なし）。

静止WebPは配信層からapplication/octet-streamとして返る既存挙動。MIMEだけのチェックで失敗と判定したため、保存済みWebPとの全バイトSHA-256一致へ検査を修正し合格。30体検査と静止画/未認証検査の結果を公開可能な技術検証記録に保存。最終Site sourceでは検証スクリプトのみ追加修正し、検査対象の配信実行コードは無変更。

実Galaxyの新配信経路での描画・長時間再生・発熱は未受入。上記は全バイトとHTTP保管配信の検証であり、実機の自然さ/足場/負荷の合格とは別。

## 次便の再開手順

1. 未登録20体の採用版照合・元制作データ検査・透過書き出しまたは既存WebM検査を継続する。登録30/50を増やしたと誤記しない。
2. GitHubへ新素材と通常登録を保存・照合してから、同じSiteのコードと静止WebPを更新する。WebM本体をpublic/gameへ再同梱しない。
3. Site sourceの`scripts/update-motion-manifest.mjs GAME_REPO_PATH SAVED_COMMIT_SHA`を実行する。採用レジストリとGit blob一致を確認し、全登録素材を新しい固定コミットへ参照する。R2キーは内容hashのため、既存bytesは再import不要。
4. `scripts/test-motion-response.mjs`、TypeScript、build、本人限定publish。`scripts/verify-motion-delivery.mjs`で新manifestの全体を保管/検査する。資格情報はhidden stdinのみ。
5. Phase Dの戦闘画面・19背景・配置調整、E/F統合検査・最終受入を続ける。mainマージ/一般公開は未実施。

この変更で動作ファイルの増加をSiteの256 MiB archive上限から分離した。将来の実データ量・ストレージ/通信利用・実機負荷は別途測る。全50体の最終実装完了とは扱わない。
