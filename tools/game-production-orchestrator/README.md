# Game production orchestrator

旧Phase 33〜63で完成した制作司令塔、ゲームシステムライン、ゲームコンテンツラインが共有する安全境界を置く。旧Phase 0〜63は履歴として凍結し、2026年9月3日の番号リセット後は、制作目標ごとに`Cycle N / Phase 1〜5`を使用する。

各CycleのPhaseは次の5段階で固定する。

1. 目標受領・境界確定
2. システム／コンテンツ実装
3. 統合QA・安全マージ
4. Pages公開・公開後確認
5. 完了記録・停止

- `risk-approval-contract.json` がリスク別承認の機械可読な正本。
- `src/risk-approval-policy.mjs` は作業開始とマージ可否をfail-closedで判定する純粋ロジック。
- 通常の管理経路はリポジトリ内バックログと1作業1PR。GitHub Issue投稿は必須にせず、投稿時だけ明示承認を求める。
- システムラインとコンテンツラインは常に最新`main`から別ブランチ・別worktreeで開始する。同じファイルや機能を触る場合は司令塔が直列化する。
- CI成功を観測できない、競合がある、仕様が重大に曖昧、または契約上の承認フラグがある場合は停止する。

実行:

```sh
npm run check:game-production-orchestrator
```
