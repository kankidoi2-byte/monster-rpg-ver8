# 削除済み序章STEPの実機確認用セーブ

このディレクトリのJSONは、STEP削減前のv2途中セーブを再現する隔離テストデータです。通常プレイ用ではありません。

- `first_hunt.json`：旧救援開始位置からの転送と契約体重複防止
- `request_reward_preview.json`：依頼報酬のコイン・錬成素材重複防止
- `stella_card_offer.json`：ステラ技カードの重複防止
- `lumina_recipe_offer.json`：ルミナ錬成準備資源の重複防止

任意の削除済みSTEP用データは、リポジトリのルートで次のように作成できます。

```sh
node scripts/create-prologue-legacy-step-save.mjs <削除済みSTEP ID> > legacy-step.json
```

読み込み前に、公開版の「メニュー」→「セーブ管理」→「セーブを書き出す」で現在のセーブを退避してください。確認後は、書き出したJSONを読み込んで元へ戻します。
