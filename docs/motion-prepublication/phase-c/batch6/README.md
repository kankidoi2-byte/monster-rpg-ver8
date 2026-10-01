# Phase C 第6便 — 採用制作データからの透過書き出し

2026-09-30 JST。フレイガルv2、フレイウルフv2、アクアロンv3、ハイアクアロンv3。
通常登録22/50、残り28体。実機・最終配置・負荷・受入は別工程。

これまでの既存WebM原本保存と異なり、今回は採用ZIPのrender.pyが持つ
transparent=Trueを利用したVP9の派生物。MP4の背景色を色キーで抜いていない。
採用済みtexture、rig、motion、render.pyは無変更。背景除去や身体補完の画像生成も実施していない。
ZIPの制作時点READMEに残る「採用未確定」は、その後のユーザーの50体採用を取り消す意味ではない。

## 根拠と再現

DriveのZIP/確認MP4 ID、ZIPのSHA-256、内部パスはprovenance.json参照。
ZIPを取得してSHA-256を照合し、安全な作業ディレクトリに展開する。
ZIP内MP4とDrive別添の全バイト一致を確認する。
Python 3、numpy、scipy、Pillow、ffmpeg/libvpx-vp9を使用。

```sh
OPENBLAS_NUM_THREADS=1 python3 scripts/export-approved-rgba.py SOURCE_DIR ADOPTED_MP4 OUTPUT_WEBM REPORT_JSON
python3 scripts/audit-motion-alpha.py OUTPUT_WEBM ALPHA_JSON SAMPLE_DIR
```

SOURCE_DIRはfreigal-motion-v2、freiwolf-motion-v2、aquaron-motion-v3、
high-aquaron-motion-v3のいずれか。export-approved-rgba.pyは検査済みrender.pyのハッシュを制限する。
既存描画コードを読み、960×960、30fps、8秒のRGBAフレームを順次エンコーダーへ送り、全連番をメモリーに保持しない。

*-export.jsonは入力ファイルハッシュ、元MP4と全240フレームの数値比較、
透過を元背景へ再合成した結果と元の不透過描画との比較、0秒/8秒のRGBA完全一致を記録。
再合成比較は6時点、MP4比較は240フレーム。前者は最大0または2階調差。
MP4とVP9は圧縮方式が異なるため、動画バイト・RGB画素の完全一致は主張しない。
この比較は形や動作設定を変えていないことの技術的根拠であり、目視・実端末の最終受入とは分ける。

*-alpha.jsonは派生WebMをlibvpx-vp9で240フレーム逐次デコードし、
透過・不透明画素、全時刻の外接矩形、端接触、数値的なループ端差を記録。
今回4体にキャンバス端接触なし。静止代替WebPは派生WebMの先頭透過フレームから作成。

足場はキャンバス下端の共通配置。解剖学的な接地点、200%文字、端末負荷はPhase D/Eで検証する。
本編mainへのマージ・一般公開は行わない。
