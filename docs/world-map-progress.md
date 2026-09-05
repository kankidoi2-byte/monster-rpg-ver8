# 世界地図開発 進捗正本

- 担当: world-map-20260906T030243JST-root
- 状態: active
- 開始: 2026-09-06T03:02:43+09:00
- 更新: 2026-09-06T03:17:22+09:00
- 基準main: d31cfccd37219549d25df9f85c62db559aa649f3
- ブランチ: codex/world-map-system
- 実装・自動検証コミット: fd2ba9612c60e3247d90b1bdac7198946121d4e3
- 実装・自動検証tree: 70458e851d4837984db2297152c417d8adaac305
- Draft PR: https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/164
- 公開: 未公開。main変更・マージなし。公開承認依頼前。
- 全体: 5Bの決定論的比較、5Cのrollback互換修正、5D実機手順、5E公開前復旧パッケージまで作成。実ブラウザ・実機・バランス判断・本人公開承認は未完了。

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
| 3A | 実装済・検証待ち | world_map_prologue_v1.webp 1024²/約235KiB。文字/ロゴなしを目視、画像予算check済。ゲーム上の端末確認待ち |
| 3B | 実装済・検証待ち | 場所一覧、44px操作、横scroll/地点/難易度復帰。320〜430px・下部nav実確認待ち |
| 3C | 実装済・検証待ち | 降臨光/危機波/裂け目/特殊入口演出、名称併記、reduced-motion。実見た目/コントラスト待ち |
| 4A | 実装済・検証待ち | Battle→草原→Easy→固定救援→契約/報酬→次話の地図帰還を自動検査。誤地点・通常探索への脱線を遮断。新規セーブ実通し待ち |
| 4B | 実装済・検証待ち | 報酬後は地図→魔導学園→ステラ、模擬戦後は地図→学園併設工房→ルミナ。既存の錬成・遠征・完了経路を全check。実操作待ち |
| 4C | 検証済（自動範囲） | TUTORIAL_VERSION=2と旧checkpointを維持。新規/地図途中/救援/学園以降/完了/skip/v1を専用fixtureで2回移行し、再開対象と二重付与なしを確認。実再読込待ち |
| 4D | 実装済・検証待ち | 初回異変説明、案内中の地図階層復元、解決済みeventKey除去。実画面中断/復帰待ち |
| 5A | 検証済（自動範囲） | commit fd2ba96で npm run check:world-map / check:world-map-economy / check exit 0。新headのGitHub CI待ち |
| 5B | 検証済（自動範囲）・実ブラウザ待ち | 同一入力20勝の報酬ルールを許容差0で比較。固定seed10万回の入口差、中立期待値、草原コインリスクを記録。実ブラウザ20勝は未実施 |
| 5C | 一部検証済 | 新地図案内9stepを旧mainの安全IDへ永続化し、downgrade再開を検証。実ブラウザ/実機で見つかる問題の修正は待ち |
| 5D | 外部待ち（手順完成） | Android/Chromebook、320〜430px、19地点、イベント、序章、save、a11yの証拠付きチェックリストを作成。実施結果は未確認 |
| 5E | 一部実装・検証待ち | 公開対象、必須確認、バランス判断、セーブ保護、rollback、承認欄を一式化。新headのPR/CI更新と実機結果、本人承認が残る |
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
- 直前head c3cde8fのGitHub Actions run 33982866757はcompleted/success。commit fd2ba96のCIはpush後に確認する。
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
