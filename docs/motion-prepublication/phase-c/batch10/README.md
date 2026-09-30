# Phase C 第10便 — 闇属性3体

2026-09-30 JST。ノクルv1、ノクレイドv1、ノクスヴェルグv1。

採用済みDrive制作ZIPと別添全身MP4の全バイト一致を確認。全3体のZIPには透過WebMがないため、既存render.pyのtransparent=Trueを使い、VP9 CRF18の派生動画を書き出す。採用原画・rig・motion・rendererは無変更。画像生成・色キー処理は行わない。ノクスヴェルグの採用MP4は制作時のfragmented MP4をそのまま照合する。

```sh
OPENBLAS_NUM_THREADS=1 python3 scripts/export-approved-rgba.py SOURCE_DIR ADOPTED_MP4 OUTPUT_WEBM REPORT_JSON
python3 scripts/audit-motion-alpha.py OUTPUT_WEBM ALPHA_JSON SAMPLE_DIR
```

SOURCE_DIRはnocle-motion-v1、noclaid-motion-v1、noxvelg-motion-v1。検査済みrendererのハッシュをexportスクリプトで制限する。960×960、30fps、8秒の240フレームを順次処理し、全連番をメモリーに保持しない。

元MP4全240フレームとの数値比較、6時点の元背景への再合成比較、元描画0秒/8秒RGBA一致、派生WebM全240フレームの透過・外接矩形・端接触を検査。圧縮方式の異なるMP4とのRGB完全一致は主張しない。静止代替WebPは派生WebMの先頭透過フレームから作成する。

ノクルは足先固定、他2体は全身浮遊という採用動作を維持。足場・反転・最終配置・Galaxyでの描画や負荷はPhase D/Eの最終受入へ分ける。DOM/mediaの模擬検査は実端末の受入を代替しない。

動画は作業ブランチへ保存。確認サイトは固定コミット・サイズ・SHA-256付きmanifestによるR2配信を継続し、WebMをarchiveへ再同梱しない。mainへのマージ・一般公開は行わない。非公開Drive IDや確認サイトの運用IDは公開記録に含めない。

登録36/50、残り14体。全3体の端接触なし。ノクルとノクスヴェルグは左寄りの向きとして味方反転あり・敵反転なし、ノクレイドは逆に設定。最終配置受入は別工程。

## 配信完了
本人限定確認サイトへ反映成功。36体すべての実配信で206/1024 bytesのRange、全動画のサイズ/SHA-256一致、保管後の再利用、HEAD 200を確認。新3体の静止代替も全バイト一致。未認証アクセスは401。archiveは56,906,343 bytes、609ファイルを最後まで読み、採用WebMの同梱0件を確認。production-checks.jsonとdelivery.jsonに非公開の運用ID/URLを含めず記録。次は残り14体を同方式で追加し、Phase Dの戦闘画面改修へ進む。
