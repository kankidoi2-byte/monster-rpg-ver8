# 最新状態（2026-10-02）

[組み込み前の最終整理](final-review/README.md)と[最新検査記録](final-review/validation.json)を現在の判断に使う。採用サイズ・戦闘UI・通常ルート・更新チュートリアルの本人確認を記録した。以下は過去の作業履歴であり、以前のpendingを現行UIの確認待ちとして重複計上しない。全50体/19背景/実機負荷の最終受入は別途pending。本編マージ・一般公開は禁止のまま。

---

# Phase E：最新検査と次の確認

2026-10-01。表示サイズは本人が採用済み。最新コード d3e671fba20bd385f32cd933459216ccf825fe4b の全体検査 npm run check はpostcheckを含め終了0。モーション専用6検査もすべてPASS。結果は validation.json / full-check.log / latest-motion-checks.json。

この更新は記録のみで、ゲーム動作・素材・サイズ設定は変更していない。本人限定確認Site version33のまま。本編mainへのマージ・一般公開は行わない。

## 次の確認

通常の戦闘経路で、味方の交代、乱入・三つ巴、勝利・敗北、次の戦闘、画面離脱・復帰時に、表示と操作・HP・再生が正しく続くことを確認する。自動検査では交代と乱入・離脱の所有権、動画の解除・再利用などを確認済み。実機では見た目・操作・再生負荷を確認する。

過去に本人から戦闘一連と動作・切り取りに問題なしとの報告はあるが、今回のサイズ変更後に上記全経路を網羅したとは扱わない。19背景ごとの足元・重なり、横向き・文字200%、停止設定や動画失敗時の代替表示・再試行、実測負荷も、明示された範囲を超えて合格にしない。

サイズ採用は完了。全体の最終受入・公開準備完了という判定は保留。追加修正は具体的な不具合に基づいて行う。

## 後続更新：画面高さの調整

本人の指摘を受け、共通画像行・折りたたみ情報・画面高さに基づく共通画像単位を実装した。採用済み各種倍率は維持。最新の変更と検査記録は [viewport/README.md](viewport/README.md) と [viewport/validation.json](viewport/validation.json) を優先する。配置変更後のGalaxy受入はpending。

## Reference composition correction

The owner rejected the shared-row layout. [The near/far layout correction](depth/README.md) replaces it and records current checks. Galaxy visual acceptance is pending.

## Actor separation and poster size correction

Owner feedback identified overlapping wings and oversized static enemies. [The spacing correction](spacing/README.md) supersedes the fixed near/far regions and records the CSS sizing fix. Device acceptance remains pending.

## Skill and target selection sheet

Owner confirmed separation and reported scrolling in the skill picker. [Floating skill and target choices](skill-sheet/README.md) preserve field size while selecting. Star1 values are unchanged; new device acceptance remains pending.

Latest UI: [Inline commands and compact HP plates](inline-command-hud/README.md). This supersedes the previous floating skill sheet; Android acceptance is pending.
