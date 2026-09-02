# Game production orchestrator

Phase 33以降の制作司令塔、ゲームシステムライン、ゲームコンテンツラインが共有する安全境界を置く。

- `risk-approval-contract.json` がリスク別承認の機械可読な正本。
- `src/risk-approval-policy.mjs` は作業開始とマージ可否をfail-closedで判定する純粋ロジック。
- 通常の管理経路はリポジトリ内バックログと1作業1PR。GitHub Issue投稿は必須にせず、投稿時だけ明示承認を求める。
- システムラインとコンテンツラインは常に最新`main`から別ブランチ・別worktreeで開始する。同じファイルや機能を触る場合は司令塔が直列化する。
- CI成功を観測できない、競合がある、仕様が重大に曖昧、または契約上の承認フラグがある場合は停止する。

実行:

```sh
npm run check:game-production-orchestrator
```
