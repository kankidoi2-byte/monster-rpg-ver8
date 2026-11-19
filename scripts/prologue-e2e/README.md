# 序章のスマホ通しテスト

リポジトリのルートで実行する。Node 20以上と Chromium を使用する。

```sh
npm ci
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
PROLOGUE_E2E_DIR=artifacts/prologue-e2e node scripts/prologue-e2e/run.mjs
```

`report.md` と `shots/` を同じ場所に展開すると、レポートから該当場面の画像を開ける。出力先を省略すると一時ディレクトリを作成する。システムのChromiumを使う場合は `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` を指定する。

新規のPixel 7ブラウザーコンテキストで、タイトルから第22話と終幕まで順に進む。画面の操作にはタップと名前入力を使い、進行・戦闘結果・無料ガチャの個体を読み取って検証する。対戦結果・セーブ・抽選値を設定する処理はない。端末実機、分岐の全組み合わせ、任意の会話の再生は対象外。進行・検証の失敗で終了コード1を返し、コンソールエラーと画面外の測定結果はレポートに一覧化する。
