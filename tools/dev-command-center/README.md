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

実際の非公開ホスティング、アクセス制御、秘密情報の設定はPhase 12の対象外です。Phase 13で読み取り専用GitHubアダプターを追加します。
