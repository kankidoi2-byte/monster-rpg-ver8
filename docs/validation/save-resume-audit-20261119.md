# セーブ中断・復帰点検（2026-11-19）

開発元 main の検証開始時 SHA: `0de5be562f1f9531b699667df2e823d7bc3ea551`。
検証専用ブランチ: `test/save-resume-audit-20261119`。製品コード・main・PR #364 は変更していない。

## 実施方法

GitHub Actions の独立 runner 上で Chromium / Playwright を起動し、127.0.0.1 の一時HTTP配信を使用。毎ケース新規の非永続ブラウザコンテキストと合成セーブを作成した。412×915のモバイル表示。HTTP CSPで外部接続とworkerを禁止し、ブラウザのルーティングでも同一originのGET以外を遮断した。実アカウント、既存セーブ、公開サイト、配信用リポジトリは対象外。

合成チェックポイントを作った後、画面の実ボタンで報酬を確定。主セーブ書込みを計測し、メモリ・localStorage・画面・スクリーンショットを記録した。各経路につき通常、確定操作前reload/reopen、保存後reload/reopenの5ケース。追加で主セーブsetItemの例外注入→reload/reopen→再操作を各2回（4ケース）。失敗注入は通常操作で発生した不具合ではない。

「確定前」はクリック前の操作可能時点、「確定後」は主セーブ保存済みの結果表示。クリックと同期保存の間を通常操作で正確に割り込んだという意味ではない。演出中の追加ケースは別記する。

## 結果

基本比較54ケースは全てPASS（通常30・失敗注入24）。初回45成功に、テスト側の操作を直した2回目の戦闘9成功を合わせた結果であり、単一runが54/54成功したという意味ではない。

|経路・合成開始点|通常の実測結果|復帰後|
|---|---|---|
|第22話、最後の完了ボタン直前|コイン500→750、completed/rewardClaimed=true。「第22話 完了 コイン+250」|同値。読み返し後も追加なし|
|終幕、最後の完了ボタン直前|500→600、全体completed/hubArrived=true、権限解放。「終幕 完了」|同値。読み返し後も追加なし|
|草原最終話、戦闘報酬確定済み・後日談末尾|500→500、最終話completed=true、resume=null、11話完了表示|同値。ここでは追加報酬なしが正しい|
|通常戦闘、ガルドラLv30対草原スライムLv12|500→513、EXP0→80、勝利0→1、素材なし。結果表示EXP+80/COIN+13|同値。結果は再受領されない|
|遠征、帰還済み草原短距離1件|500→620、回復薬3→5、フレイガルEXP0→10、完了0→1・帰還枠削除|受取ボタン消失、二重付与なし|
|同梱プレゼントpresent-box-open|500→5500、虹の契約書0→3・ギガデータ0→5・上回復薬0→10・上質な魔晶石0→2、受取ID/履歴各1|未受取0、履歴詳細で受取ボタンなし|

各基本ケースの確定前中断では未受取状態を保持し、その後の操作で通常と同じ値になった。確定後中断では保存値を保持。主セーブへの成功書込みは基準ケース各1回。注入した主セーブ失敗ではメモリと保存値が開始値へ戻り、reload/reopen後の再操作で1回分だけ反映された（各経路・各復帰方法2/2回）。

演出中の最終再確認は12試行中11PASS・1未検証:
- 第22話・終幕: 各会話末尾の文字表示中（typing=true、rewardClaimed=false）にreload/reopenを各2回。計8/8で未確定の保存値に戻り、続行後は通常と同じ報酬・完了状態、再復帰しても追加なし。
- 戦闘: 攻撃演出中（busy=true、rewardGranted=false、主保存0回）でreload1回・reopen2回を実施し3/3成功。未受取500coins/0EXP/0勝から戦い直すと513coins/80EXP/1勝。
- 戦闘reloadの2回目は観測時にすでにcommitted=true・主保存1回・敵HP0となっていたため、実中断前にUNVERIFIEDで打ち切った。目標タイミングに割り込めたとは数えない。Actions最終runはこの1件により14/15でfailure（うち基準3件、演出11成功・1未検証）。

製品の報酬消失・二重付与・進行フラグ不整合は、確認した範囲では再現しなかった。製品修正は行っていない。

テスト側の失敗と対応:
- 初回の戦闘9件: 技パネルを開かず非表示の技ボタンを待ってタイムアウト。UIの「技」→技ボタンの操作へ修正して9/9成功。
- 2回目の会話演出4件: CSSで常時上下する「次へ」にPlaywrightの安定待ちが引っ掛かった。再開データは一致していた。会話欄の通常タップで再確認。
- 2回目の戦闘演出reload1件: sampled busy=true/committed=false/writes=0の後、実際のunloadまでに保存が完了した。復帰値513coins/80EXP/1勝は通常の確定後と一致。保存前と断定するテスト期待値が不適切だったため、再試行では未確定・確定済みのどちらで離脱したかを分け、いずれも通常基準との一致を確認する。同期境界への正確な割込み成功とは数えない。


## 保存境界

- 共通: `js/save.js:906 commitSaveMutation` がスナップショットを取り、保存失敗時は復元。`js/save.js:978 saveGame` はバックアップと主セーブを別々に書く。主セーブの成功後に結果表示する。
- 第22話・終幕: `js/prologue-part2.js:198 prologuePart2Complete` → `prologuePart2Write`。報酬とcompleted/rewardClaimed、終幕のhubArrived/権限状態を同じ保存で確定。
- マップ物語: `js/map-story.js:287 mapStoryOutcome` が戦闘報酬。`:322 completeMapStoryEpisode` が後日談の完了。本点検の草原最終話は後者であり、前者の戦闘報酬テストではない。
- 通常戦闘: `js/battle-flow.js:534 settleNormalVictory` は報酬候補を保存してからbattleRewardGrantedと結果表示を進める。`:530 retryNormalVictorySave` が保存再試行入口。
- 遠征: `js/expedition.js:218 claimExpedition` は報酬・遠征枠削除・完了回数を同一transactionで確定。
- プレゼント: `js/gifts.js:100 commitGiftClaim` が報酬・受取ID・履歴を保存し、失敗時復元。`:136 claimGifts` がWeb Lockと結果表示を制御。

## 未検証・限界

- 全ストーリーを最初から歩くE2Eではなく、第22話・終幕・草原最終話の合成チェックポイントからの実操作。ストーリー内の全戦闘、全報酬種、全分岐は未網羅。
- 物理端末、Safari/Firefox、OS強制終了・電源断・ブラウザ全プロセスクラッシュは未検証。タブ閉じて開き直す試験は同じ使い捨てコンテキストで行う。
- 同期保存処理内の厳密な瞬間、バックアップと主セーブの間の強制終了は未検証。例外注入はその代替ではない。
- 個人宛プレゼントAPI、サーバーの受取確認、LifeQuestの実連携は外部通信禁止のため未検証。製品同梱の配布プレゼントのみ。
- ストーリーの合成戦闘員はLv30・EXP0のまま。経験値が増えるストーリー条件は未検証。通常戦闘はEXP0→80、遠征はLv1のEXP0→10を確認。
- 過去の9ケースVM点検は補助証跡であり、本ブラウザ結果とは別。

## 証跡・再実行

- 初回: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44505809448
- 追加: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44507281910
- 演出中再確認: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44508621677
- 各runの `save-resume-audit` artifactにreport.json（前後の値、画面文言、保存回数、例外、遮断通信）とケース別PNGを格納。保存期間14日。
- 検証コード: `scripts/test-save-resume-audit-browser.mjs`。全ケースは `node scripts/test-save-resume-audit-browser.mjs`、追加分は `AUDIT_FOCUS=followup node scripts/test-save-resume-audit-browser.mjs`。
- 製品差分検査: `git diff 0de5be562f1f9531b699667df2e823d7bc3ea551 -- js css index.html images` が空であることをテスト開始時にassert。

最終の開発main再照合でも同じSHAだった。実ブラウザはChromium 151.0.7922.34 / Playwright 1.62.1。3runともpageerror/404は0。最終検証コードcommitは `b8a408658046dc46c6b02c86e2d06d320d3c603e`。

artifactリンク: [初回](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44505809448/artifacts/14519818098)、[戦闘追加](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44507281910/artifacts/14520391740)、[演出再確認](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44508621677/artifacts/14520781945)。

今後の検証改善案（製品の修正提案ではない）: テスト側でUNVERIFIEDを製品FAILと別集計し、通常の非計測操作と、保存境界を意図的に制御する計測付き試験を別スイートにする。特定瞬間の成功だけを狙って無制限に再試行せず、未達も記録する。今回、製品の保存処理を修正すべき再現不具合は得られていない。
