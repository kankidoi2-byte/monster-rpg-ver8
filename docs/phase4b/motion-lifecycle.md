# Phase4B 再生寿命管理（2026-09-27 JST）

Phase4A `6d06159f6d4cc48cabdfcc3decdcb9e0e72f7826` 起点。ボルモーグv18・最大1video限定。mainへのマージ・本編公開なし。

## 状態と境界

`battleIdleRecord` は表示専用。素材情報は凍結した種族別config、個体は戦闘sequence・既存UID/敵side・stage entryのキーで識別。同種候補の順序が変わっても生存中の選定を維持。セーブに追加しない。

|状態|入口|出口|
|---|---|---|
|loading|初回/復帰play要求・手動再試行|playing通知、停止理由追加、失敗/前景待ち超過|
|playing|現行要素のplaying通知|道具/hidden/減動でpaused、errorでstatic、交代/終了でdisposed|
|paused|screen/hidden/reducedのいずれか|全理由解除かつ現在個体・DOM・戦闘有効ならloadingへ|
|static|取得/デコード/再生拒否/待ち超過/非対応|対応環境のみ表示寿命内で手動1回、またはdisposed|
|disposed|交代/HP0/勝敗/ホーム/次戦/pagehide|再利用しない。必要なら新record|

HP・状態・パネル更新は同video・src・currentTimeを保持。道具はpauseして静止画を見せ、復帰は同要素から再生。減動設定もsrc・位置を保持して停止、初期減動はsrc未設定。失敗表示を減動で一時的に隠しても失敗状態と手動回数を保持する。

pagehideは永続/非永続を問わず破棄しpageHiddenラッチを立てる。非表示中のupdateで再生成しない。pageshowでラッチ解除後、現行画面・生存個体・戦闘終了・設定・接続DOMを検査して生成。BFCacheのゲーム戦闘状態を独自復元しない。実BFCache確認は未実施。

## 待ち時間・競合

5秒は前景で再生可能な状態の待ち予算に変更。Phase4A実測の開始約275ms、現状のクラウド実動画の正常開始を踏まえ、値の延長を正当化する実機根拠がないため暫定維持。壁時計の5秒ではなく停止時に残予算を保存し、背景滞在を除外する。復帰playの待ちも上限あり。playingで予算をリセットする。再生中のネットワークstall監視を新設したものではない。

record同一性/disposed、video/attempt、playToken、clockTokenを検査。古いplay Promise・取り消し済みtimer・旧video eventが新試行へ書き戻さない。手動再試行は先にラッチし、旧videoのsrcとハンドラを外してから新videoを1個だけ作る。通常HP更新での自動再試行はなく、非対応codecは再試行なし。

## 資源

停止はpause・待機timer取消・静止表示。破棄はそれに加えsrc解除、load、video DOM除去、onplaying/onerror/onclick解除、UI除去。動画フレームcallback、object URL、定期polling、個体別global listener、IntersectionObserverは本実装では使わない。4つのdocument/window/MediaQuery listenerはページ寿命で固定。

スクロール画面外停止は今回は不採用。1video上限のもと、200％文字で上下移動するたびに再開しないことを優先。複数化時は十分なマージンと時間ヒステリシスを持つ可視性管理を検討する。

検査で保証するのは所有DOM・src・handler・timer・不要再生の停止。ブラウザdecoder/GPU/内部cacheの即時メモリ解放は直接測定しておらず、DOM0をその証明にしない。QA側は検査のため古いvideo参照を保持するのでheap計測の対象にも適さない。

## 検証

- `npm run check` 全件PASS（postcheck含む）。ログ内の既往Android evidenceは今回の実機確認ではない。
- Phase3A/B/CとPhase4A DOM回帰4本PASS。
- `NODE_PATH=/tmp/phase4b-dom/node_modules node scripts/test-battle-idle-lifecycle-dom.mjs` 11群PASS。Media API、時計、hidden、pagehide/pageshow、減動はモック/人工イベント。60秒停止、複数理由、古timer/Promise/event、再試行20連打、途中交代、同種候補順序変更、5回循環を含む。
- Cloud Chrome実動画: 8項目の新規受入PASS。位置0.968619秒で道具中停止、復帰1.335013秒。同video保持、5循環で旧src/handler/timerなし、404、不正動画中の実turn、再試行連打後再生、内部MIME/Range206。
- Phase4A実ブラウザ受入23項目PASS。実再生・8秒ループ・技と敵応答・交代・勝利・次戦。拒否/減動/hidden/codecは模擬項目として区別。
- 390×844通常字、320×568/740×360で200％、740×360通常字: 表示設定/再試行48px以上、スクロールで到達。320/740の200％で再試行を実押下して動画復帰。OS文字拡大ではない。
- 別タブを実際に開いても元タブvisibilityState=visible、イベントなし。実非表示復帰は未確認。

## 性能比較

同じreview内のPhase4A/4Bを逐次測定。390×844、通常字、同一v18素材/編成、1.2秒warmup後、待機・パネル9往復・技3回を各約9秒。QA DOM observerを停止し、計測中のスクリーンショットなし。200msの時刻samplingのみ。ゲーム乱数は通常のまま、同時に別のコンテナ検査が走った期間を含む。各1回で信頼区間なし。

|版/場面|実時間ms|動画進行秒|総frames差分|落ちたframes差分|
|---|---:|---:|---:|---:|
|4A待機|9001|8.959|266|1|
|4B待機|9001|8.926|267|0|
|4Aパネル|9152|9.093|273|0|
|4Bパネル|9147|9.100|272|3|
|4A技|9057|8.966|268|30|
|4B技|9045|8.949|269|22|

全区間video保持。両版とも技時に増える。Phase4A旧ログ（約10秒313中9、技開始近傍345中24）は累積値で条件が違い、今回の区間差分と直接比較しない。

コード調査: 待機管理に毎frame更新やlayout readなし。status textは同値書込みを回避。既存技演出にはgetBoundingClientRectとoffsetWidthによる同期layout、CSS効果があるが、命中同期契約のため今回変更しない。技演出の描画・合成/クラウド負荷は候補で原因確定ではない。素材負荷とも断定しない。改善/解決/軽量化の主張なし、解像度/fps変換なし。

## Phase4Cへ

限定実装に進むコード上の阻害は検出されなかった。ただし3体再生/Android性能合格ではない。最初に代表Androidで停止復帰・画面ロック・技演出・減動を確認する検証枠を設ける。性能上限を決める前に3体の短時間比較が必要。未確認の配信済みURL/実機/実BFCacheを合格扱いしない。

- 素材のsrc/version/typeは共有可、DOM/play Promise/timer/再試行回数/失敗/reasonsは個体別。
- displayKeyは種族IDだけで作らず既存UID/入場世代を使う。乱入single→enemy_aは所有権移管または旧破棄→新生成で二重再生を防ぐ。
- schedulerで上限と優先順位（現在選定維持、味方/対象/可視）を決定。可視3体は評価案で確定上限ではない。
- 同時fetchやretryの競合、古い通知、共有素材cacheと個体破棄を分離。
- 低性能時は低優先個体から静止へ、復帰条件にヒステリシスを設定。1サンプルのdropで全員を再取得しない。
- 今回複数video・別種・全50体・攻撃同期・原本変更は未実装。

完全な保存SHA、Sites保存版、証拠、復元、Android手順はLibraryのPhase4B-motion-lifecycle-handoff.mdを参照。
