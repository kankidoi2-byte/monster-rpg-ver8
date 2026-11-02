# プレゼントBOX

`js/gifts-data.js` の `DEV_GIFTS` に全員向けの開発者プレゼントを新しい順で追加する。
初回の開発者プレゼントは所有者決定の「プレゼントBOX開設記念」1件（2026-11-02〜11-30）。idは公開後に変更・再利用しない。

- `id`, `title`, `letter`（改行可）, `startAt`（YYYY-MM-DD）, `until`（同形式またはnull）, `rewards` を指定する。
- 開始は日本時間0時、期限は指定日の終わり。開始前・期限後・不正な配布は受領対象外。
- rewards: `coins/amount`, `item/id/count`, `monster/id/level`, `character/id/level`, `skill/id/count`。混在可能。個数は正の安全な整数、Lvは1〜100。技の合成限定属性は配布を妨げない。
- `npm run check:gifts` と `npm run check` を通し、プレイヤー向けお知らせを追加する。マージと公開には所有者の明示許可が必要。

## 保存と移行

保存キー `mb_v95c` とプロフィール分離は維持。`giftClaimedIds` は期限のない開発者受領記録、`giftHistory` は報酬内容のスナップショット（90日・200件）。履歴削除で受領記録を消さない。

旧Life Questの受領方式は「最新受領IDまでの全エントリ」を受領済みとしていた。`giftReceiptVersion` がないセーブは0として扱い、最初の受領トランザクション内でその範囲のIDを確定して1にする。移行後は `lifeQuestClaimedIds` をID単位で参照し、500件で切り捨てない。表示順と受領順は独立。移行も受領も失敗時は元に戻る。

Life Quest本体と `lifequest.v1` / `lifequest_rewards_v1` は変更しない。別プロフィールでは従来どおり個別に受領できる。

受領はWeb Locksで同一プロフィール内のタブを直列化し、既存のプロフィール保存競合判定も通す。最新状態で対象を再検証し、既存の `addInstance` と技ガチャ共通の `grantSkillCards` で付与する。`captureSaveTransaction` →全報酬・図鑑・記録反映→ `saveGame` 1回。途中例外や保存失敗は `rollbackSaveTransaction`。Web Locksのない環境は受領を安全に停止する（公開HTTPS上のChrome/Chromiumを対象）。

序章チュートリアル未完了では閲覧のみ。完了・スキップ済み・移行済み既存プレイヤーは受領可能。受領保留でも期限は延長しない。

## 確認

`check:gifts` は実データ検証とChromiumで412×780 / 360×640を検査する。実機ではホーム右端の押しやすさ、一覧/詳細のスクロール、Life Questから戻った際の件数更新、個別/一括受領・再起動後の履歴を確認する。
