# PR #175 公開・文書同期記録

## 現在の実装と公開

- [PR #175](https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/175) をユーザーの実機確認報告・公開承認後にReadyへ変更し、保護された通常PR手順（merge、expected head指定）で統合。
- 検証head: `9514e87e9a7701c66b4f112019a182042942625b`。
- ゲーム本体公開コミット: `d2e6fb123d544b5f525dff68692064bc16d2efe6`。
- 検証済みtree: `c33cad49c3f65dc754a820d0e8002c83fec5128c`。統合後treeも一致。
- 前提PR #174・#176は統合済み。mainへの直接push、force push、保護の回避なし。
- ユーザーの報告はPR #175固有のもの。PR #174の承認は流用しない。エージェントが端末を操作したという記録にはしない。端末名・ブラウザ版・対象SHA・幅別詳細は未報告。

現在の修正は、追加敵の種族・難易度別レベル、既存敵HP維持、乱入前の毒による討伐・契約帰属、リンク効果の個体追従と期限維持、各敵Lv表示。先行の世界地図・初回体験変更も保持。

## 検査と配信確認

- [PR CI 34410294682](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34410294682): success。
- [統合後main CI 34411215620](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34411215620): success。
- [Pages build/deployment 34411214650](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34411214650): success。
- [公開ゲーム](https://kankidoi2-byte.github.io/monster-rpg-ver8/): HTTP 200。
- HTMLと以下3 JSはHTTP 200、検証済みtreeとバイト一致。公開処理完了前の初回HTML取得は旧版だったため、Pages成功後の再取得で一致を確認。

| ファイル | 公開SHA-256 |
|---|---|
| index.html | `4222b4fd606d7a6627cf2493beaf2512fb593f8b8bceb9d27ea86f5f8e5be08c` |
| js/kokoro-link.js | `100021f8dfc4d4bde522392348d6e0e922b96da0bfe5823cc8292bb962e4ac69` |
| js/multi-battle.js | `35b773cdb89950d35af15c7ce287b2a12244bbb7bd61b9539a666e4319cab710` |
| js/notices-data.js | `a42f0dca4594704d56de9860fea1512f2addac0d79f49ba851b9f82219e7fb6d` |

3 JSのindex内配信識別子はいずれも`balance-audit-20260908`を含む。32 script読込の重複0。公開後の戦闘をエージェントが実端末でプレイしたとは主張しない。

全92検査群・106コマンドと別途報酬比較が成功。54,300戦の歴史的基準ソースと比較案の再現結果、圧縮形式差の説明、全成果物ハッシュは[統合レビュー](INTEGRATION-REVIEW.md)と[manifest](reproduction-manifest.json)を参照。3修正込みの最新コード54,300戦という意味ではない。

## 未実装の提案

遠征報酬倍率、高COST技の抽選重み、必要EXP半減、毒一律半減は隔離VM内の比較のみ。本番の獲得EXP、必要EXP、排出率、経済ルールは変更していない。第1章、サイドストーリー、別チュートリアル改修も今回の完成へ含めない。歴史的記録と将来案は削除しない。

## 正本文書同期

GitHubでは`roadmap-status.md`と`INTEGRATION-REVIEW.md`の冒頭へ公開済み状態を追記し、旧Draft・未公開記述を履歴として区別。この文書同期自体もmain保護を守る別PRで統合する。文書のみの変更で、ゲームコード、配信識別子、監査集計は変更しない。プレイヤー向けお知らせは追加不要。

Google Driveの以下6正本へ、現在の実装・監査結果・未実装案・ユーザー実機確認報告・公開証跡を文書ごとの対象範囲に合わせて追記。既存タブ、履歴、将来案、ネイティブ要素を保持。本文と根拠リンクのreadbackで検証する。

- モンスターバトル Ver8 総合監査・マスター設計書
- モンスターバトルゲーム 開発履歴・完了記録
- 本編チュートリアル制作ロードマップ・引継ぎ記録
- UI再設計方針・実装ロードマップ
- モンスターバトル ゲーム企画書 現行版
- モンスターバトルゲーム 開発・システム設計案

最新のmain SHA、文書同期PRのCI・Pages、ブランチ削除・open/Draft残数は、すべての統合完了後にPR #175本文へ記録する。
