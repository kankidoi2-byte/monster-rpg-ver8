# Phase C 第9便 — 光属性3体

2026-09-30 JST。ルクシードv1、ルクシアードv1、ルクスガルディオンv1。通常登録33/50、残り17体。

採用Drive ZIPと別添MP4の全バイト一致を確認。ZIPには透過WebMがないため、採用render.pyのtransparent=TrueからVP9 CRF18の派生動画を作成。採用原画・rig・motion・rendererは無変更。色キー処理や画像生成は実施していない。provenance.jsonに入力・出力のハッシュを記録。

全3体は960×960、30fps、8秒、240フレーム。元MP4との全240フレーム数値比較、6時点の透過再合成比較（元不透過描画との差は最大0階調）、元描画の0秒/8秒RGBA完全一致を検査。VP9はRGBの非可逆圧縮であり、MP4との画素完全一致や最終画質受入を主張しない。派生動画の全240フレームをデコードし、透過・不透明画素、全時刻の外接矩形、端接触を検査。端接触は0。静止代替WebPは先頭透過フレームから作成。

```sh
OPENBLAS_NUM_THREADS=1 python3 scripts/export-approved-rgba.py SOURCE_DIR ADOPTED_MP4 OUTPUT_WEBM REPORT_JSON
python3 scripts/audit-motion-alpha.py OUTPUT_WEBM ALPHA_JSON SAMPLE_DIR
```

SOURCE_DIRはluxseed-motion-v1、luxiard-motion-v1、lux_galdion-motion-v1。検査済みrendererのSHA-256をexportスクリプトで制限する。

3体とも右寄りの向きとして味方反転なし・敵反転あり。共通足場を使用し、最終配置・Galaxyでの描画・200%文字・負荷・受入はPhase D/Eで確認する。DOM/mediaの模擬検査と実端末の受入を区別する。

動画原本は作業ブランチに保存。確認サイトでは固定コミット・サイズ・SHA-256付きmanifestによるR2保管配信を使い、動画をarchiveへ再同梱しない。mainマージ・一般公開は行わない。
