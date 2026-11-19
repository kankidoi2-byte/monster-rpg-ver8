# 序章E2Eの修正と再検証（2026-11-19）

比較元：[元の検証報告](https://github.com/kankidoi2-byte/monster-rpg-ver8/blob/a895357edd81622fcf0a00bd270f37a699f2714c/docs/validation/prologue-e2e-20261119.md) · [元の通し実行・761枚](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44469331777)。テスト用PR #364 は変更していません。修正後の実行：[成功ログ](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44545100217/job/135633436282) · [画像755枚付きMarkdown（ZIP内の `report.md` と `shots/`）](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44545100217/artifacts/14541077446)。検証した実装・テストは `0f51193eb7ec62400be2016993627076a425bc8d` です。

縦412×915の新規セーブで第1話から終幕までプレイし、全23区間の開始・終了、チュートリアル表示、前半2戦＋後半15戦の勝利、無料ガチャ1回・獲得個体1体と表示結果の一致を確認しました。第13話は通常の育成・再戦で突破。進行停止・未処理のJavaScript例外・コンソールエラー・測定条件の画面外要素はいずれも0件でした。

| 項目 | 修正前 | 修正後・確認結果 |
| --- | --- | --- |
| 戦闘背景 | `/css/images/maps/` 以下11パスにコンソールの404が2,732件 | 全行程で旧パスのコンソールエラー **0件**、旧パスの実HTTP 404 **0件**。ルート・Pagesと同じ `/monster-rpg-ver8/` の両方で11パスともHTTP 200。草原・城門・森は実際の画面に設定され、画像のデコードと再描画後の保持も確認。 |
| 第7話契約 | 草原・序章後半・0ターン | mainの #370 を再利用。交代を含む実戦の例は **王都外・街道／4ターン／初級剣士エルナ HP272/290** と一致。再読み込み後は地名のみで不明の値は出ません。契約・見送りの双方で進行し、契約書・報酬の重複なし。[検証済みの #370 のログ](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44510870698/job/135514474291) |
| 施設見出し | 第13話の進化が序章 第1話 | #374の同じ実装を使用。**「進化の使い方」「ショップの使い方」** を各2ページで確認。本来の第1話は「序章 第1話　異世界での目覚め」、確認済み状態は再読み込み後も保持。[検証済みの #374 のログ](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44530496850/job/135582192392) |
| 会話送り | 412×915で8回、3〜5 CSS px | 従来と同じ閾値（2 CSS px超）で **0件**。終幕のガチャ前後は、最下点でも44 CSS pxのボタン全体が収まり、下端に **4.00／5.92 CSS px** の余裕。実際にボタン下端近くをタップして次へ進めました。 |

## 対応する画面写真

上のZIP内：本来の第1話 `shots/003-intro_gnosis-0.jpg`、第7話の契約画面 `shots/179-slime-contract.jpg`、第13話の進化ガイド2ページ `shots/448-evolution_intro-0.jpg`・`shots/449-evolution_choice-0.jpg`、終幕の送りボタン最下点 `shots/732-pb_ep_gacha_01-lowest-frame.jpg`・`shots/737-pb_ep_gacha_03-lowest-frame.jpg`。第1話の見出しは[別の画面テストの画像](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/44545099816/artifacts/14540981652)でも確認できます。

## 背景の原因

`setupBattle()` は相対URLを `--battle-map-image` に渡していました。これを `css/ui-redesign.css` の `background-image` から使うと、ブラウザーはCSSファイルを基準にして誤った `css/images/maps/…` を参照します。別経路のバナー画像 `img.src` は文書基準の絶対URLであり、画面上で正しい絵が見えても誤ったCSSの読込は発生します。戦闘開始・切り替え時に `setupBattle()` が背景を再設定し、ストーリー専用の案内がバナー画像を置き換えると、旧ステージ更新は正しいアリーナ背景を取り除いていました。修正後は同じ絶対URLを、戦闘画面とアリーナへ初期設定で一度渡します。スクリーンショット検査の通信スタブに伴うキャッシュ無効化と、開発サーバーの `no-store` があるため、2,732件は公開環境の通信回数ではありません。元の記録に実HTTP応答数はありません。

## 個別プレゼントのCORS（読み取りのみ）

認証情報を渡さず、既存 `/api/gifts/pending` にブラウザーの事前確認相当の `OPTIONS`（POSTとContent-Typeの許可を確認）を実施。開発オリジン `http://127.0.0.1:4173` は403、許可オリジンなし。公開先 `https://pactforge-studio.github.io` と旧Pages `https://kankidoi2-byte.github.io` は204でそれぞれ自オリジン、POST、Content-Typeを許可。開発環境でのCORSを確認しましたが、公開版での認証済み取得や各利用者への配信は未検証です。APIの許可範囲は変更していません。通しテストでは実在の利用者もテスト用プロフィールも外部送信しないよう、個別プレゼント取得は空の応答に置換しています（既存のプレイ記録スタブも維持）。したがって元のCORS19件と通しテストの発生数は直接比較しません。

Android実機、公開先へのデプロイ、任意会話の全分岐、実機での通信量はいずれも対象外です。
