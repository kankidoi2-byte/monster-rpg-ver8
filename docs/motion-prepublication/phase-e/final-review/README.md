# モーション統合：公開済みの現在状態

2026-10-02 07:58 JSTの本人許可に基づき、PR #220で本編へ反映しGitHub Pages公開を完了。旧記録の「公開禁止・未マージ」は許可前の履歴であり、現在の状態ではない。

- 本編：https://kankidoi2-byte.github.io/monster-rpg-ver8/
- 初回公開のmerge：`de0f1e324349d4f0abaacb772a92cf5b26da3ce3`
- 初回公開CI/Pages：success。HTTP148件（動画50・静止画50を含む）照合で問題なし。
- 現在の点検報告：`post-publication-review.json` / `media-load-review.md`
- 実機受入範囲：`device-review-20261002.md`
- 初回公開証拠：`publication-result.json` / `publication-http.json`
- 反映前の検査・判断：`prepublication-history.md` / `validation.json`（履歴）

## 採用状態と検査の限界

50体を登録、採用した個体サイズと戦闘UIを本編反映済み。通常ルートとチュートリアル、案内範囲の重なり・連続再生・アプリ復帰について本人確認を受領。final50SpeciesGateは、全50体×19背景×全端末条件の数値・目視網羅や一部原本再現手順まで完了したという意味ではなく、残条件を維持する。

味方HP欄との全編長方形間隔0pxは既知の数値。実画面の本人受入と、alpha交差の数値証明を区別する。公開後の端末での初回起動・既存セーブ・実復号は、HTTP配信照合では代用しない。

## 公開後の読み込み点検

初回全動画一括取得なし、通常1体・上限3体の再生枠、初期画面外/控えめ設定でsrc未設定、戦闘終了・画面離脱・pagehide時の取得元/ハンドラ/observer解放を点検。読み込み失敗時はpauseだけではpreload=autoの取得が続く可能性があるため、静止代替への切り替え時点でsrcとハンドラを解除しload()で資源を解放する修正を同梱。空のvideo要素は再試行判定のため残し、手動再試行時に新しい要素へ入れ替える。詳細は `media-load-review.md`。
