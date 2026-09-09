# 世界地図開発 進捗正本

## PR #174 / #176 統合引継ぎ（実機確認報告・公開承認受領）

- 最新の公開済み基準: PR #176、main `927fdbe40adee4eb43f38b3b722063f08e2019d6`。世界地図v2と19マップ・14地点・王都2施設・特殊領域3件を維持。
- PR #174: 育成・編成・探索案内の5点修正。#176が先に統合されたため、#174へ最新mainをマージして追従。お知らせ2件を日付降順で保持し、first-play専用検査と世界地図検査を両方維持。
- ユーザーから「実機確認を行った。承認するから、先へ進めて」と報告・承認を受領。これはユーザー実施の確認であり、エージェントの実端末操作ではない。端末名・ブラウザ版・対象SHA・幅ごとの詳細結果は未記録。過去の未確認記録は当時の履歴として残す。
- PR #174の最終統合・CI・Pages・本番照合結果は [PR #174](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/174) の公開結果を正とする。ブランチ上の変更は公開前、main統合およびPages成功後は公開済みと区別する。
- `world_map_prologue_phase4_v1.webp` と `world_map_prologue_v2.webp` のSHA-256はともに `7c99acc4a9f52474d276ca6a8ef2291010a09e2aae572cfe7747c94891183776`。完成画像と制作履歴の中間画像を変更・削除しない。
- 未公開: 別作業のDraft PR #175。ブランチ・コード・PR本文は変更も統合もしない。バランス調整案、未実装ストーリー、将来構想は未公開のまま維持。
- 継続記録: 端末別・項目別の詳細証跡、初見10/30/60分の楽しさ評価は完了扱いにしない。今回の実機確認報告と承認を受けた公開を妨げる追加条件として扱わない。


## 現在の公開・確認状態（2026-09-08 JST同期）

- 公開状態: **PR #164はmainへ統合・GitHub Pages公開済み**。
- 統合PR: https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/164
- 統合commit: `44552c5658a3029c8ac4ede11c04f5e419041444`（2026-09-06 JST）。本人の「承認する。公開して。」に基づく公開結果をPR本文で確認。
- 統合時CI: [33991442094 / success](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/33991442094)
- 統合時Pages: [33991441294 / success](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/33991441294)
- 同期時のmain: `e8a643d38ffcf5e446ea2f8222beaf7cc8dae607`。このSHAのCI [34018231423](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34018231423)・Pages [34018230720](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34018230720)もsuccess。
- 公開URL: https://kankidoi2-byte.github.io/monster-rpg-ver8/
- ユーザー確認: **ユーザーが実際に遊んだ範囲では確認済み**（今回の資料整理依頼による申告）。対象SHA・端末・ブラウザ・項目ID別の記録はないため、全項目合格には拡張しない。
- 詳細確認: `docs/world-map-device-checklist.md`の空欄は未記録・未確認のまま。実機別・320〜430px・読み上げ・実ブラウザ20勝比較などの包括的な合格記録はない。
- 草原コイン方針: PR #164の公開承認時に現状維持。今回の資料整理では報酬や出現仕様を変更しない。

| 工程 | 現在状態 | 残る確認 |
|---|---|---|
| 0A〜5C | PR #164で実装・自動検証成果を統合済み | 下記履歴の自動検証と手動確認を区別。後続変更は最新mainを対象に確認する |
| 5D | 手順作成済み・項目別結果は未記録 | ユーザープレイ確認を端末別の全項目合格とみなさない |
| 5E | 本人の公開承認済み | 当時の確認待ち・バランス懸念を把握したうえで現状公開を承認 |
| 5F | 完了 | main統合・Pages公開済み |
| 5G | 配信点検済み・ユーザープレイ範囲確認済み | 詳細な実機・ブラウザ別チェックリストの記録は継続課題 |

### 次の開始点

今後の検証は最新mainと公開先を照合してから、チェックリストの未記録項目へ対象SHA・端末・証拠を残す。統合済みPR #164の公開承認を再度待つ作業ではない。後続のPR #171では特殊入口を他の戦闘2〜3回で閉じる仕様が追加済みであり、古い保持条件だけで不具合と判定しない。新たな修正は別の専用ブランチで行う。

## 当時の履歴：PR #164公開前の開発記録（以下すべて）

以下の担当・released・基準main・未公開・外部待ち・次の開始点・担当取得手順は、開発ブランチを解放した当時の記録である。`released`は担当解放を示していた。現在の公開状態や作業指示として使用しない。現在状態は上記を正本とする。

- 担当: world-map-20260906T030243JST-root
- 状態: released
- 開始: 2026-09-06T03:02:43+09:00
- 更新: 2026-09-06T03:27:00+09:00
- 基準main: d31cfccd37219549d25df9f85c62db559aa649f3
- ブランチ: codex/world-map-system
- 実装・自動検証コミット: fd2ba9612c60e3247d90b1bdac7198946121d4e3
- 実装・自動検証tree: 70458e851d4837984db2297152c417d8adaac305
- Draft PR: https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/164
- 公開: 未公開。main変更・マージなし。公開承認依頼前。
- 全体: 5Bの決定論的比較、5Cのrollback互換修正、5D実機手順、5E公開前復旧パッケージまで保存し、単一担当を正常解放。実ブラウザ・実機・バランス判断・本人公開承認は外部待ち。
- 停止理由: 自動化できる確認成果は作成済み。Android/Chromebook実機、実ブラウザ20勝、草原コイン方針、本人公開承認が必要。

## 26作業の状態

| ID | 状態 | 実装・検証証拠 / 未確認 |
|---|---|---|
| 0A | 検証済・制約あり | 最新main/PR/CI/AGENTS/承認契約を確認。released取得を通常FFで実施。別実行の生存を直接照会する確実な手段だけ未確認 |
| 0B | 検証済 | docs/world-map-audit.mdの19地点・候補・特殊入口・既存参照対応表 |
| 0C | 検証済 | 状態/receipt/加算save/旧step対応/暫定率。docs/world-map-implementation.md と economy基準を更新 |
| 1A | 実装済・検証待ち | 19地点、詳細、難易度、正式地形。DOM/データ検査済、実ブラウザ操作待ち |
| 1B | 実装済・検証待ち | 草原→既存戦闘→報酬/契約→地図、地点/難易度/scroll再読込を自動検査。実一連操作待ち |
| 1C | 実装済・検証待ち | 全19地点、特殊入口、黄金郷消費rollbackを自動検査。全地点実操作待ち |
| 1D | 実装済・検証待ち | 乱入/三つ巴/遠征/図鑑/旧tutorialを全check。手動回帰待ち |
| 2A | 検証済 | 発生/保持/敗北/再挑戦/解決/見送り/receipt重複防止 |
| 2B | 検証済 | 光の平原限定の★4エリシア降臨、通常/乱入非混入、契約不可維持 |
| 2C | 検証済 | ★5 doom_nemesion危機、見送り、★4 nemesion経路維持 |
| 2D | 検証済 | 討伐/見送り同機会、偽竜3体queueと巡回、未消化保持 |
| 2E | 実装済・検証待ち | 入口共存、初回説明既読、イベント非消費をテスト。実UI再読込待ち |
| 3A | 実装済・検証待ち | 初版world_map_prologue_v1.webpから、個別19マップとの整合版world_map_prologue_v2.webp（1024²/約213KiB）へ更新。文字/ロゴなしを目視、画像予算check済。Android / Chromebook実機確認待ち |
| 3B | 実装済・検証待ち | 場所一覧、44px操作、横scroll/地点/難易度復帰。320〜430px・下部nav実確認待ち |
| 3C | 実装済・検証待ち | 降臨光/危機波/裂け目/特殊入口演出、名称併記、reduced-motion。実見た目/コントラスト待ち |
| 4A | 実装済・検証待ち | Battle→草原→Easy→固定救援→契約/報酬→次話の地図帰還を自動検査。誤地点・通常探索への脱線を遮断。新規セーブ実通し待ち |
| 4B | 実装済・検証待ち | 報酬後は地図→魔導学園→ステラ、模擬戦後は地図→学園併設工房→ルミナ。既存の錬成・遠征・完了経路を全check。実操作待ち |
| 4C | 検証済（自動範囲） | TUTORIAL_VERSION=2と旧checkpointを維持。新規/地図途中/救援/学園以降/完了/skip/v1を専用fixtureで2回移行し、再開対象と二重付与なしを確認。実再読込待ち |
| 4D | 実装済・検証待ち | 初回異変説明、案内中の地図階層復元、解決済みeventKey除去。実画面中断/復帰待ち |
| 5A | 検証済（自動範囲） | commit fd2ba96で npm run check:world-map / check:world-map-economy / check exit 0。GitHub Actions run 33984024744 completed/success |
| 5B | 検証済（自動範囲）・実ブラウザ待ち | 同一入力20勝の報酬ルールを許容差0で比較。固定seed10万回の入口差、中立期待値、草原コインリスクを記録。実ブラウザ20勝は未実施 |
| 5C | 一部検証済 | 新地図案内9stepを旧mainの安全IDへ永続化し、downgrade再開を検証。実ブラウザ/実機で見つかる問題の修正は待ち |
| 5D | 外部待ち（手順完成） | Android/Chromebook、320〜430px、19地点、イベント、序章、save、a11yの証拠付きチェックリストを作成。実施結果は未確認 |
| 5E | 外部待ち（自動準備済み） | 公開対象、必須確認、バランス判断、セーブ保護、rollback、承認欄を一式化しDraft PRを更新。実機結果と本人承認が残る |
| 5F | 未着手 | 本人の公開承認前。merge/publicなし |
| 5G | 未着手 | 未公開のため公開後点検不可 |

## 今回の主な成果

- 本物のsave/tutorialロジックを使い、新規`mb_v95c`から序章91step、救援2波、両施設、報酬、錬成、遠征、完了後の自由探索まで通す自動journeyを追加。
- 開発版から旧mainへ戻す場合、新しい地図案内9stepを既存3checkpointへ保存して不明step化を防止。短い再案内は許容し、報酬/遷移を直接再実行しないことを専用テストで確認。
- 基準mainと現行の報酬式を同一入力20勝で比較し、EXP 2,155、コイン1,988、素材、仮想契約、複数戦、遠征が完全一致することを記録。
- 地点選択自由化により、草原の期待コインが旧中立値のNormal 2.14倍、Hard 3.37倍となるリスクを検出。自動合格せず本人判断待ちとした。
- Android/Chromebook実機チェックリストと、公開前セーブ保護/rollback/承認パッケージを作成。
- GitHub Actionsでbaseline commitを取得して専用経済比較を実行できるようにした。

## 検証証拠

- commit fd2ba96と同一tree 70458e8で npm run check（postcheck含む）exit 0。
- npm run check:world-map: 既存9本に序章journeyとdowngrade safetyを追加し、全11本成功。
- npm run check:world-map-economy: baseline d31cfccdとの決定論的20勝比較と固定seed10万回の入口比較に成功。
- git diff --check、変更JSの node --check、画像サイズcheck成功。
- GitHub Actions「Validate game data and assets」run 33984024744はhead e21234aでcompleted/success。専用経済比較stepも含む。
- 正式地形WebP SHA-256: c7d2463386c3004e0924774688686522087028d74219eaa97363525f3706e92e。
- クラウドChromeでSHA固定URLを1回試したが、ロード中にCDP refresh tabsが20秒でタイムアウト。現headのタイトル、世界地図、施設、画面幅、スクリーンショットは未確認。前headのタイトル→ホーム確認だけを流用せず、未確認を合格扱いにしない。

## 次の開始点

1. 最新main、PR #164 head、CI、この文書が変化していないか確認し、releasedを通常FFで取得する。
2. 実ブラウザが復旧した時だけ現headを開き、320/360/390/430px、画像失敗fallback、下部nav、地図scroll、新規序章→自由探索、中断復帰、旧/新各20勝を確認する。同じCDP timeoutを盲目的に反復しない。
3. `docs/world-map-device-checklist.md`をAndroid/Chromebookで実施し、対象SHAと証拠を記録する。未確認を合格にしない。
4. 草原の時間あたりコイン収益を現状維持するか、`slime_gold`の通常候補/報酬を調整するか、実測後に本人判断を得る。判断なしに自動変更しない。
5. 失敗を5Cで修正して全検証を再実行し、`docs/world-map-release-readiness.md`の空欄を埋める。5F/5Gは明示承認後のみ。

## 再開/単一担当手順

released時だけ最新headから担当更新commitを作り、forceなしの通常fast-forwardで取得する。同じheadから複数実行が進んだ場合は、ref更新に失敗した担当が編集結果を公開せず最新状態を再確認する。activeなら読み取りのみ。古い時刻だけで担当を奪わない。正常終了時は進捗・検証・次操作を保存してreleasedへ戻す。mainへの直接書込、force push、本人に代わる実機合格・公開承認は禁止。
