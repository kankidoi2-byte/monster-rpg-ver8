# 開発司令塔 基盤

Phase 12の独立したNode.js実行基盤です。ゲーム本体から読み込まず、GitHub Pagesにも組み込みません。

## 現在の境界

- 初期状態は `127.0.0.1` だけで待ち受けます。
- 認証なしで公開するのは `GET /healthz` だけです。
- GitHub API、セーブ、外部送信、書き込み操作には接続しません。
- GitHubトークンやAPIキーはまだ使用せず、リポジトリへ保存しません。
- 0.0.0.0などへ変更する場合は、非公開ネットワークが別途確保されていることを環境変数で明示する必要があります。

## ローカル確認

1. 必要なら `.env.example` を参照して環境変数を設定します。`.env` 自体はGit管理対象外です。
2. `npm --prefix tools/dev-command-center run check` を実行します。
3. `npm --prefix tools/dev-command-center start` を実行します。
4. `http://127.0.0.1:4174/healthz` を開きます。

実際の非公開ホスティング、アクセス制御、秘密情報の設定はPhase 12の対象外です。

## Phase 13: GitHub読み取り

`src/github-reader.mjs` は固定GitHub REST APIへGETだけを送り、コミット、ブランチ、オープンPR、オープンIssueを制限付きで取得します。Issue/PR本文とコメントは保持しません。

公開リポジトリはトークンなしでも取得できます。トークンを使う場合は `DEV_COMMAND_CENTER_GITHUB_TOKEN` を秘密管理機構から実行環境へ渡し、ファイル、URL、ログには保存しません。Phase 13では実トークン設定や外部ホスティングを行いません。

## Phase 14: GitHub Actions読み取り

`src/github-actions-reader.mjs` は直近20件のworkflow runと、最新runの最大100 jobをGETだけで取得します。workflow、対象SHA、状態、開始・終了時刻、失敗job、GitHub上の確認URLを固定形式へ正規化します。

ログ本文は秘密情報が混入する可能性があるためダウンロードしません。`log_url` はGitHub上で人間が確認するためのHTTPS URLだけです。workflowの再実行、キャンセル、dispatchなどの書き込み操作も実装しません。

## Phase 15: GitHub Pages読み取り

`src/github-pages-reader.mjs` はPagesサイト情報と最新ビルドをGETだけで取得し、公開状態、公開URL、公開元、対象SHA、公開時刻を固定形式へ正規化します。

公開URLのqueryとfragment、pusher情報、エラー本文、CNAME、証明書情報、レスポンス生データは保持しません。Pages設定変更、ビルド要求、デプロイ作成・取消などの書き込み操作も実装しません。

## Phase 16: 統一ステータス

`src/unified-status.mjs` はPhase 13〜15の読み取り結果を、正常、作業中、確認待ち、失敗、公開待ち、情報が古い、取得不能の7状態へ決定的に統合します。

判定は固定された優先順位とreason codeだけを使い、AIや自由文の解釈、追加の通信、GitHubやPagesへの書き込みは行いません。mainのコミット、CI対象SHA、Pages公開対象SHAを照合し、古い情報や部分的な取得不能を正常扱いしません。

## Phase 17: 次の作業判定

`src/next-action.mjs` はPhase 16の7状態だけを入力にし、優先度、操作code、理由code、確認リンク、作業を止めている状態を固定形式で返します。数値の小さい優先度ほど先に扱い、失敗、取得不能、古い情報、CI実行中、公開待ち、確認待ち、正常の順に一意に決定します。

AIや自由文を判定に使わず、不明な入力は取得不能として復旧操作を選びます。確認リンクはHTTPSのGitHubまたはGitHub Pagesだけを許可し、認証情報、query、fragmentを除去します。通信、GitHub操作、承認、ゲーム本体への組み込みは行いません。
