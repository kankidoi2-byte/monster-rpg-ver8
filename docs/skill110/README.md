# 110技体系・レビュー資料

## 公開状況の追記（2026-10-10 JST）

110技体系は[PR #273](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/273)で統合済みです。統合コミットは `ae5e064dda4159cce8b75f462be3bf280eb406d8`、配信側は[PR #29](https://github.com/pactforge-studio/monster-rpg-ver8/pull/29)の `07ceb3a5834d726dad8001de367f1e26323542d3`。その後の白黒UI・魂の契約・技カードの変更を含む今回の照合基準は、開発元 `be298108049bd80886789d5e314524b5b78b7c32`、配信 `ca0cc6f04610b6cf4dae54012f19413978621860` です。

[公開後検証](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/38033322901)と[最新mainのCI](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/38059879660)は成功。以下の「レビュー用」「公開未実施」は初回提出時点の歴史的記録で、現在の公開状態ではありません。未確認の実機項目や、追加監査で見つかった別機能の保存例外を解決済みとはしません。


参照main: `9d62c8f7752e105871702db81a9342d5ba62196e`。開発元の作業ブランチのみで変更し、main統合・配信用リポジトリ更新・本編公開は行わない。

## 提出資料

1. [110種類の最終技仕様表](final-specification.md) / [機械可読JSON](catalog.json)
2. [全旧技ID→新技IDと理由](migration-map.md) / [JSON](migration-map.json)
3. [全100ユニットの初期装備・コスト上限・適性](initial-loadouts.md) / [JSON](initial-loadouts.json)
4. [106技の入手経路・配分と合成UI](ui-acquisition.md)
5. [セーブ移行・バックアップ・合成トランザクション](save-crafting.md)
6. [戦闘処理と検証](../battle-rules/skill110-combat.md) / [実戦シミュレーション結果](../battle-rules/skill110-battle-results.json)
7. [担当者判断で設定した低級技の数値と根拠](designer-decisions.md)
8. [統合検証と残課題](verification.md)

[影響範囲調査](../skill-system-110/investigation.md) / [歴史上の技ID調査](../skill-system-110/historical-skills.json)

## 実装概要

- 新ID `s110_001`〜`s110_110` による共有カタログ。旧316カードは互換記録として保持し、通常利用・図鑑・新規装備は110のみ。
- 768の既知旧ID（固定ID・旧名由来ID・通常攻撃の互換ID）を106技までへ変換。旧カード枚数を合算保存。
- 身体／武器の適性と属性制限を独立して適用。二属性はどちらか、無属性を含む複合は無以外を照合。共通技と最強4技は全員共通。
- プレイヤー・敵・単体・複数戦で同じ110効果処理を使用。既存通常攻撃も同じ防御・集中規則へ接続。
- 最強4技は確定レシピのみ。素材・装備・完成品を一回の保存にまとめ、失敗時はメモリを復元。
- 既存の装備3枠・成長式・保存キー・2プロフィール構造を維持。

## 既存テストを更新した理由

旧体系の316件、コスト6まで、キャラクターとモンスターの別プール、個体専用継承制限、旧ソース全文一致は今回の明示的な置換仕様と両立しないため更新した。旧カードの威力・効果・説明と無関係なユニット情報は互換記録に対して引き続き検証する。新仕様は独立した110カタログ・戦闘・保存・合成・UIテストで直接検証する。

旧モーション／反動／吸収／状態異常テストは旧IDを明示して互換経路を検証し、旧IDを通常の装備候補へ復帰させない。ブラウザーテストは実際の新しい装備候補とCOST25を操作する形へ更新。
