# 公開状態の照合記録（2026-10-12）

この文書は機能追加や仕様変更ではなく、確認した公開コミットと過去資料の読み分けを記録する。過去のPhase/Cycleや進捗率は加算しない。

## 最新の統合・公開記録（2026-10-18）

PR #287・#288・#292・#289は[統合PR #293](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/293)でmainへ統合済みです。以下の10月12日欄の「未統合」「通常勝利の多段保存」は過去の状態です。

- 開発元の統合コミット：`81aa8cbf1c870e67d75cc6133e3da57cbfbc643d`。
- 公開用リポジトリ：[PR #44](https://github.com/pactforge-studio/monster-rpg-ver8/pull/44)、コミット `1cf32d6b7aacbcc334d18c2cac5903ff765b0263`。`source-ref.txt` は上記統合コミットを固定。
- [本編URL](https://pactforge-studio.github.io/monster-rpg-ver8/)。配信結果は[公開CI](https://github.com/pactforge-studio/monster-rpg-ver8/actions/runs/39082467544)を参照。本編配信済み。公開後の検証結果は同CIと下記の公開操作検証を根拠とする。
- この記録を含む後続の開発元変更は文書のみで、公開runtimeと差分なし。

### 今回の変更と維持範囲

- EXPアイテム/遠征途中帰還の消費・成長・報酬・進行を保存失敗時に復元。初回と保存直前の読取失敗も中止し、再操作できる。
- 通常勝利は報酬と関連進行を主キーへ1回保存。同じ候補で再試行し、再抽選・二重獲得を防止。未確定時は次探索・契約・進化・プロフィール切替を停止。
- 草原などの固定旧技にも40/45/60/70%防御を適用。連続攻撃の防御・回避は技全体で判断し、有限HP障壁は各打撃後の損害を吸収。
- ホームのストーリー入口、草原全画面会話11話、級別ランダム合成、720px動画/同時3体を保持。
- 保存キー/形式、報酬・確率・難易度・加入条件・台本は変更なし。草原専用報酬・救援途中波・模擬戦・敗北/撤退も維持。
- 旧吸収の仕様変更、SE #182、火山/第1章は対象外。

### 検証の根拠

- [統合候補CI](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/39081222200)と[main CI](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/39081773902)は全6ジョブ成功。ローカル `npm run check`（postcheck含む）・報酬比較も成功。
- 保存既存130ケース、EXPアイテム/途中帰還24条件、通常勝利故障220ケース、報酬/乱数消費比較224ケース、旧技防御41ケース。草原2,200戦再計算は既存結果と差分なし。
- Chromiumの隔離プロフィールで保存操作8条件・通常勝利24フロー、320/360/390/430px・844px横・文字200%相当を検証。保存失敗→同一候補再試行→契約→進化確認→次探索→再読込、草原11話・ホーム入口・全画面会話を確認。
- 公開後の同じ操作検証は `verify/integrated-public-20261018` のPR CIにある「Verify integrated published save flows with isolated profiles」を根拠とする。これが成功するまで本追記をmainへ統合しない。
- source-refを固定した配信CIでは、配信用overlayを適用したindex/url-transfer/全JS・CSS/対象動画を本編URLのSHA-256と照合する。

### 残る制約

再試行候補は一時メモリのみ。保存失敗中の終了/再読込を跨ぐ復旧は追加していない。別タブの変更検出は確認するが、全writerのタブ間排他は保証しない。故障試験は検証用データのみ。ブラウザー検証はCIのChromiumで、Galaxy/Chromebook実機・OS文字拡大・TalkBack確認とは区別する。全11話のブラウザー検証は2話以降の敵HPを検証用に0として結果経路を通しており、全戦闘を実操作で勝ったという意味ではない。

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
