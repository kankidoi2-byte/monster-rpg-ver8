# 世界地図開発 進捗正本

- 担当: world-map-20260906T023057JST-root
- 状態: active
- 開始: 2026-09-06T02:30:57+09:00
- 更新: 2026-09-06T02:34:00+09:00
- 基準main: d31cfccd37219549d25df9f85c62db559aa649f3
- ブランチ: codex/world-map-system
- 実装コミット: 3087bc17ba938523e684a1286d988a6fc7823a3f
- 実装tree: c0149c35ddc36c2e5a31f2d42194154cd524a5e3（ローカル検証済みtreeと一致）
- Draft PR: https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/164
- 公開: 未公開。main変更・マージなし。公開承認依頼前。
- 全体: 4A後半・4B・4Cを単一担当で継続中。

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
| 4A | 実装済・検証待ち | Battle→草原→Easy→固定救援戦、中断再構築、逸脱防止を追加。契約/報酬後を含む実通しと地図帰還案内は残る |
| 4B | 未着手（既存経路は検証済） | 現行の学園・錬成・遠征・完了経路は全check成功。王都施設を新地図操作へ一貫接続する改修は未実装 |
| 4C | 一部実装・検証待ち | TUTORIAL_VERSION据置、旧checkpoint/完了/skip保護、完了/skip向け一度きり地図紹介を追加。専用の全状態fixtureと実再読込待ち |
| 4D | 実装済・検証待ち | 初回異変説明、案内中の地図階層復元、解決済みeventKey除去。実画面中断/復帰待ち |
| 5A | 検証済（自動範囲） | 現treeで npm run check exit 0。GitHub Actions run 33981035116 completed/success |
| 5B | 一部着手 | docs/world-map-economy.mdに同値確認と比較手順。旧/新20勝・通し・収益実測は未実施 |
| 5C | 未着手 | 実ブラウザ/実測で見つかる問題の修正待ち |
| 5D | 未着手 | Android/Chromebook確認用の結果記録とスクリーンショット待ち |
| 5E | 未着手（Draft更新済） | PR #164を現headへ更新しCI成功。通し/実機/収益比較後の最終レビュー・本人承認依頼が残る |
| 5F | 未着手 | 本人の公開承認前。merge/publicなし |
| 5G | 未着手 | 未公開のため公開後点検不可 |

## 今回の主な成果

- 正式地形画像を生成・WebP化し、仮SVGと交換。生成/加工/未確認事項は docs/world-map-art.md に記録。
- 地点、イベント入口、難易度、横スクロール位置を worldMap.navigation に加算保存。破損値・解決済み入口を安全に除去。
- エリシア、ネメシオン危機、偽竜、特殊入口の初回説明と地図上の状態演出を追加。
- 新規チュートリアルを世界地図→草原→Easy→固定救援へ接続。別地点への逸脱を防止。旧 elna_rescue_start は維持。
- 新世界地図で到達不能だった黄金郷ガイドを復旧。地図消費と自然入口保持を説明。
- 完了済み/スキップ済みセーブには世界地図を初めて開いた時だけ短い紹介を表示。
- 新規テスト2本と既存テスト拡張。キャッシュキー更新。

## 検証証拠

- npm run check（postcheck含む）exit 0。最終差分の全自動検証成功。
- npm run check:world-map: 6本成功。saveGame→localStorage→新規VM起動のnavigation復帰を含む。
- git diff --check、変更JSの node --check、画像サイズcheck成功。
- GitHub Actions「Validate game data and assets」run 33981035116、commit 3087bc17、completed/success。
- 正式地形WebP SHA-256: c7d2463386c3004e0924774688686522087028d74219eaa97363525f3706e92e。
- クラウドChromeは前headでタイトル→ホームまで確認。現headの確認時はbrowser recoveryでtab refreshが連続中断し、世界地図実操作を未確認。ローカルChromiumなし。未確認を合格扱いにしない。

## 次の開始点

1. 最新main、PR #164 head、CI、この文書が変化していないか確認し、releasedを通常FFで取得する。
2. 4A後半/4B: 救援契約・報酬後の地図帰還案内と、王都施設→学園、錬成、遠征、自由探索の新地図導線を、旧step IDを残して実装する。
3. 4C: 新規、地図案内途中、救援中、学園以降、完了、skip、v1の専用fixtureを追加し、二重報酬なし/再読込対象ありを検査する。
4. 利用可能な実ブラウザで現headを開き、320/360/390/430px、画像失敗fallback、下部nav、地図scroll、戦闘→契約→報酬→地図、中断復帰を確認する。
5. 5Bの旧/新20勝比較、5DのAndroid/Chromebook確認を記録し、問題修正後に5Eの承認依頼パッケージを作る。

## 再開/単一担当手順

released時だけ最新headから担当更新commitを作り、forceなしの通常fast-forwardで取得する。同じheadから複数実行が進んだ場合は、ref更新に失敗した担当が編集結果を公開せず最新状態を再確認する。activeなら読み取りのみ。古い時刻だけで担当を奪わない。正常終了時は進捗・検証・次操作を保存してreleasedへ戻す。mainへの直接書込、force push、本人に代わる実機合格・公開承認は禁止。
