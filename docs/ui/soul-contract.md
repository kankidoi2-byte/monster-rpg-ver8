# 魂の契約・キャラクターガチャ

## 参照と範囲
- 開発main: ae5e064dda4159cce8b75f462be3bf280eb406d8（110技統合済み）
- 先行UI: PR #274 / 450bff04dcaad8b194f57afa1c0deb6e7b0ddd09、tree c10634be21ad7b99558ebf075be27e4a62a10222。先行の実装・検証が完了してから着手。
- 採用文書: https://docs.google.com/document/d/1Ggo5FKdv6ee9M_li-g7XnzK3_Hmhn_480Cu6b5EIYU8/edit
- 採用動画: https://drive.google.com/file/d/1bfXfH75FJona5mQJhLV7sWRHHuodYl_D/view
- 文書を先に全文確認。動画7,831,502 bytesを取得し、0〜23秒の24フレームを抽出して実際の画素を視認。深紺の星空、魂の輪、契約書、金色変化、キャラ画像と下部帯、結果画面を照合。音の聴取は未実施。
- キャラクターの単発・10連のみ。戦闘後のモンスター契約、技・アイテムガチャ、抽選率・価格・排出対象・保証は変更しない。
- UI PRが未統合の場合、当PRのbaseは feat/nonbattle-monochrome。先行PR統合後にmainへ付け替え、差分とCIを再確認する。今回main統合・公開は行わない。

## 実装
`soul-contract.js` は確定済みの result を表示するだけで、通貨・獲得・保存にアクセスしない。body直下の専用overlayにCanvas星空とDOM/CSSの契約書・画像・名前を配置し、白黒テーマから分離。
100個の固定背景星、描画30fps上限、DPR1.5上限。描画時以外の待機、非表示ページで描画休止、終了時のRAF/timer/event/DOM/inert/overflow/focusを復元。
単発は1魂、10連は10魂同時発光。各結果の順を維持し、最初と★3は長めの刻印・溜め、通常の連続結果は短縮。★3のみ金色。現在の15排出形態は★1〜3で、★4/5演出は追加していない。
異世界文字は独自SVG線画で、現実の文章をフォント変換していない。紙面の段階刻印、金色の面に走る光、短い解放光と240msの小振幅揺れ。reduced-motion時は揺れ/閃光/Canvas連続描画を省き、確定結果を維持。
画像はIMG registryの最新背景付き素材、名前/レアリティは実データ。下部星は契約成立順に点灯。スキップ/Escape/画面遷移は確定結果へ終了。音量・ミュート・音声再生の既存機構が存在しないため無音を維持し、新たな音声設定は設けない。

## 保存・復帰
キャラクターガチャは元の抽選関数を利用し、取得に伴う図鑑・技カード・ランク経験値を含むsave全体をステージング。獲得とreceiptを同じ既存保存キーへ1回commitし、成功後のみ演出開始。失敗時は元のsaveへ戻す。
追加フィールド soulContractReceipt は未存在なら通常状態。version/id/count/cost/ordered entries(unitId/instanceUid/isNew/locked)のみ保存。所持個体をreceiptから再生成しない。結果を見て次を引くか、確認ボタンで記録を消去するまで、再読み込み後も入口で結果を復元できる。
演出中の連打は拒否。保存済みの未表示receiptがあれば最初に結果を表示し、新規課金しない。プロフィールごとの既存保存keyを維持し、演出中の切替を拒否。ランクアップoverlayは契約終了まで待機。

## 検証
実行済みの結果はPRとCI artifact manifestを参照。ブラウザテストは外部通信を遮断した専用fixtureでのみ固定結果を使用し、本番コードへ固定抽選/試作表示を含めない。
- Node: 既存character-gacha suite + transaction fault/reload/account suite + full npm run check
- Browser: 320/360/390/430pxと横向き、単発/10連、★3複数・途中位置、順序/画像/金色、連打/スキップ/中断/再読込/保存失敗/reduced motion
- CI上で実ゲームの単発と10連を録画。実機Android/GalaxyのGPU/発熱・実時間FPSは未確認。モバイルChromiumエミュレーションと実機検証は区別する。
