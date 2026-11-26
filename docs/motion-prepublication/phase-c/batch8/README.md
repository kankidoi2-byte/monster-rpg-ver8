# Phase C 第8便 — 採用制作データからの透過書き出し

2026-09-30 JST。セラルフィアv1、シルフィンv1、ゼファーレイv1、テンペストレイv1。
通常登録30/50、残り20体。実機・最終配置・負荷・受入は別工程。

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

SOURCE_DIRはseralphia-motion-v1、sylphin-motion-v1、zephyray-motion-v1、
tempestray-motion-v1のいずれか。export-approved-rgba.pyは検査済みrender.pyのハッシュを制限する。
既存描画コードを読み、960×960、30fps、8秒のRGBAフレームを順次エンコーダーへ送り、全連番をメモリーに保持しない。

*-export.jsonは入力ファイルハッシュ、元MP4と全240フレームの数値比較、
透過を元背景へ再合成した結果と元の不透過描画との比較、0秒/8秒のRGBA完全一致を記録。
再合成比較は6時点、MP4比較は240フレーム。前者は最大0階調差。
MP4とVP9は圧縮方式が異なるため、動画バイト・RGB画素の完全一致は主張しない。
この比較は形や動作設定を変えていないことの技術的根拠であり、目視・実端末の最終受入とは分ける。

*-alpha.jsonは派生WebMをlibvpx-vp9で240フレーム逐次デコードし、
透過・不透明画素、全時刻の外接矩形、端接触、数値的なループ端差を記録。
今回4体にキャンバス端接触なし。静止代替WebPは派生WebMの先頭透過フレームから作成。

足場はキャンバス下端の共通配置。解剖学的な接地点、200%文字、端末負荷はPhase D/Eで検証する。
本編mainへのマージ・一般公開は行わない。

4体は既存の浮遊描画をそのまま使用。シルフィンは右寄り正面向き（味方反転なし・敵反転あり）、他3体は左寄り（味方反転あり・敵反転なし）。採用済み連続メッシュと翼・尾の動作設定は変更しない。解剖学的な向き・浮遊位置の最終受入はPhase D/Eで行う。

## 次便の配信容量
本人限定Siteの配信archiveは258,964,006 bytes。現在の256 MiB上限（268,435,456 bytes）まで約9.5 MBしか残らない。残り20体を同梱方式のまま追加できるとは判断しない。次便ではSitesが提供するアセット保管・配信方法を確認し、原本のGitHub保存と本人限定の確認導線を維持して配信容量を整理する。採用WebMの無断削除や品質を落とす一括再圧縮で解消しない。
