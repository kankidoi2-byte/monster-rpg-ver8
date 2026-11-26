# Phase4A: ボルモーグ1体の待機動画

Phase3C `3125f9133b3dea71f812fcf445db205be3c7de72` を引き継ぐ限定導入。本編へのマージ・公開はしない。

## 素材と再現
- ID: `volmoog`、採用版v18。Phase1台帳v12に基づく第一候補。独立WebMと制作ZIP内の同一動画のバイト一致を確認。
- Google Drive独立動画: `1_-O26eHlVeoVG6RDp_H5U20Qu6anMb_V`、`ボルモーグ_モーション_v18_透過.webm`。
- 制作ZIP: `1tCdNRjsEARvKN_q-WS22BgHqoHhIjApB`、`ボルモーグ・グランボルモーグ_モーション制作データ_v18.zip`。ZIPは対応する既存静止画像取得に必要。グランボルモーグの素材は展開・導入していない。
- 動画は `images/monsters/motion/volmoog_v18_alpha.webm` に原本と同一バイトで保存。SHA256 `d41b78045234b0b499aec61e644b4b44a269d30c71227e066fd57453993ffb4f`。
- WebM/VP9、960×960、8秒、30fps、240フレーム、1,169,237 bytes、音声なし。動画の変換なし。
- 静止画はZIP内 `volmoog_v18/source.png`（960×960 RGBA）を既存画像予算600KiBに収めるためPillow WebP quality=90, method=6, exact=Trueで派生化。163,604 bytes、アルファ面は原画像と完全一致。RGBは非可逆圧縮。原本は上書きしていない。
- アルファはffmpegのlibvpx-vp9を明示して全240フレームをデコード。メタデータのyuv420p表示だけで不透過とは判定しない。alpha>8の全フレーム合成bboxは[16,12,957,951]（右下含む）。開始・中間・終端・ループ境界、明暗背景の代表フレームと実ブラウザの戦闘背景上で確認した。

## 実装
`BATTLE_IDLE_MEDIA`はmonster IDで引く表示専用設定。セーブへは追加しない。同種複数がいてもPhase4Aは既存対象優先で最大1 video。他個体は既存静止画。

Phase3Cの個体キー・battle-facing・battle-static-mediaを維持し、HUDや操作パネルを動画に含めない。味方は左右反転、敵は元方向、object-fit:containで全身を収める。HP・状態・パネル更新で既存videoを保持。

muted/defaultMuted/playsInline/loop、音声なし。静止画を先に置きonplayingで動画を可視化。失敗・拒否・5秒読み込み待ち終了は静止表示。自動無限再試行なし。「表示設定」から手動1回再試行。非対応コーデックは静止表示。prefers-reduced-motionで静止、初期有効時は動画URLを設定しない。

交代・終了・画面離脱はpause、src解除、load、DOMとハンドラ破棄。古い通知はrecord同一性/disposedで拒否。道具画面は一時停止して同じ要素を再利用。visibilitychange/pageshow/pagehideの最小処理のみ。攻撃演出とHP反映処理は変更しない。

## 配信
既存相対静的アセットで同一オリジン配信。Drive共有URLや期限付きURLをsrcに使わない。動画名v18・JS/CSSキャッシュ識別子phase4a-1で更新。既存Sitesプレビューの内部検証配信はContent-Type video/webm、Range bytes=0-1023に206、Content-Range bytes 0-1023/1169237、1024 bytesを返した。同一オリジンなのでCORS追加不要。

本人限定プレビューでの結果を、未公開の本編ホストでの保証とは扱わない。本編ホスト、独自dev-server、Android実機、OS文字設定、他ブラウザは未確認。素材はGitHub内に永続保存され、Drive認証に依存せず再現可能。

## 検証
- `npm run check` PASS。
- Phase3の3 DOM回帰検査（stage, multi, ui）PASS。
- `NODE_PATH=/tmp/phase4a-dom/node_modules node scripts/test-battle-idle-media-dom.mjs` PASS。jsdomは外部一時ディレクトリにインストールする。この検査はMedia APIモックであり、再生の証拠にはしない。
- 実Chromeで時間進行・8秒ループ、味方/敵別々、技実行・被弾、HP/状態/パネルで要素維持、交代、勝利、次戦、4回離脱で不要再生0。
- autoplay拒否・codec非対応・reduced motion・hidden/visibleは模擬。意図的404と不正WebMの実エラーで静止復帰。失敗中にも技が実行できる。
- 390×844、320×568、740×360、各文字100/200%で動画とHUD/操作の矩形重なりなし。縦スクロールはPhase3Cの方針を維持。実端末検証ではない。
- 代表最終計測: 初回playingまで約275ms（DOM挿入から、画面全体のロード時間ではない）。動画転送body 1,169,237 bytes、Resource Timing transferSize 1,169,537 bytes、duration約193ms。再試行・キャッシュ等で変動する単一クラウド環境の測定。
- 約10秒時点313 frames中9 dropped、技開始近傍345中24 droppedの記録あり。無途切れ・軽量・実機で快適とは判定しない。
- 別タブ作成では実visibilitychangeを観測できず、実タブ復帰は未確認。模擬hidden/visibleでは停止/復帰PASS。

## 続き
本人限定レビュー: https://monster-phase3a-review.kanki-doi-2.chatgpt.site
ゲーム側の実装をコピーしQA adapterはセーブ隔離・編成・操作・観測だけを担当。Phase3C比較は別ディレクトリと保存済み版を保持。

Phase4Bでは実モバイルの非表示/復帰/BFCache・メモリ圧力・フレーム落ちを確認し、複数個体を扱う前に再生管理を設計する。本編ホストのMIME/Range、容量上限と実端末の受入検査も必要。高度な攻撃同期、全50体、素材再制作は未着手。

詳細の保存版ID・GitHub最終SHA・再開/復元手順・証拠一覧はLibraryの `Phase4A-single-motion-handoff.md` を正本とする。
