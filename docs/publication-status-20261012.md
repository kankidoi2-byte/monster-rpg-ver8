# 公開状態の照合記録（2026-10-12）

この文書は機能追加や仕様変更ではなく、確認した公開コミットと過去資料の読み分けを記録する。過去のPhase/Cycleや進捗率は加算しない。

## 最新の統合状況（2026-10-18）

PR #287・#288・#292・#289を、main `2ef87b73d82c9d3afae68852f6ebcaeb78b07a89`からの統合候補に収録。現時点は検証・公開待ちです。以下の10月12日欄の「未統合」「通常勝利の多段保存」は過去の状態であり、この候補の状態ではありません。

- EXPアイテム/遠征途中帰還、通常勝利の一括保存・同一候補再試行、旧技の40/45/60/70%防御を統合。
- ホームのストーリー入口、草原全画面会話11話、級別ランダム合成、720px動画/同時3体を保持。
- 保存キー/形式、報酬・確率・難易度・加入条件・台本は変更しない。旧吸収、SE #182、火山/第1章は対象外。
- 再試行候補は一時メモリのみ。終了/再読込を跨ぐ復旧、全writerのタブ間排他、Galaxy実機検証は保証しない。

## 過去の照合基準（2026-10-12）

- 開発元main：`7a6fcd7f767ff72004839dcb933e117145d35189`。
- 配信用runtime snapshot：`911ea2ce6d72e23f6703ed0c525deb6706ab7691`。source-refは上記mainと一致。
- [開発元CI](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/38227856160)成功、[配信CI](https://github.com/pactforge-studio/monster-rpg-ver8/actions/runs/38228806879)のbuild/deploy/公開ハッシュ/動画再生検査成功を照合。
- 自動検査と実機確認は別。全Galaxyの負荷・発熱や全プレイヤー構成の楽しさを保証しない。

## 2026-10-12時点の公開済み

|項目|公開済み変更|根拠|
|---|---|---|
|保存取引境界|錬成・通常/複数体契約・ショップ/アイテムガチャ/特殊進化/遠征受取・読込/復旧の保護。プロフィール別復旧記録|[PR278](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/278)、[説明](save-transactions/README.md)|
|モンスター動画|全50登録、同時上限3。48本を720pxへ変更、残り2本は従来の720×640。現行参照50本合計82,676,644 bytes|[PR281](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/281)、[PR282](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/282)、[変換manifest](motion-compression-720-20261011/manifest.json)|
|草原マップ物語|全11話。序章完了/正式スキップで第1話、前話の後会話完了で順次解放。第1章ではない|[PR286](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/286)、[実装記録](map-story/grassland-implementation.md)|
|技合成|同級3枚（最強2枚）からランダム1枚。上位確率は低級30%・上級25%・超級10%、最強は同級100%。降格・追加通貨なし|[PR285](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/285)、[現在の取引仕様](skill110/save-crafting.md)、[現在のUI](skill110/ui-acquisition.md)|

110技・白黒非戦闘画面・魂の契約・技図鑑縦長カードも、この基準mainに含まれる。旧4固定レシピIDは履歴用で、現在のUI/実行APIからは使用しない。移行表は過去の所持品を保全する対応であり、新しい物語用装備へそのまま転用する許可ではない。

## 過去の未公開・未実装記録（2026-10-12）

- [Draft PR287](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/287)：EXPアイテム/遠征途中帰還の保存失敗修正。今回の公開基準mainには含まれない。
- [Draft PR288](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/288)：草原旧技にも数値防御を適用。今回の公開基準mainには含まれない。
- [Draft PR182](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/182)：戦闘SEは未統合。本編に音がないことを再生故障と呼ばない。
- 第1章以降、キャラクター物語、エリシアを含むサイド物語はプレイ可能話が未登録。火山9話原稿は本編実装とは別。
- キャラクター50体の待機動画登録は0。外部制作物の存在と対象形態への採用・公開は区別する。
- 通常探索勝利の多段保存と草原旧吸収の整合は別の点検課題。PR278ですべての保存経路や全タブ競合が解消したとは扱わない。

## 過去資料を読むとき

「公開未実施」「上限1」「動画388MB」「固定2素材レシピ」「草原未実装」は、それぞれの作成時点の記録として残す。現在状態を判断するときは日付・参照SHAと本書の基準を併読する。本文や数値を古い設定へ戻さない。将来の統合・公開後には本書を新しい日付と根拠で追記し、未検証の組合せを公開済みとしない。
