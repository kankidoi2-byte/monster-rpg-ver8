/* 全員への開発者プレゼント。新しい順。公開済みidは変更・再利用しない。
 * startAt: 日本時間0:00、until: 日本時間のその日いっぱい（null=無期限）。
 * rewards: coins(amount), item(id,count), monster/character(id,level), skill(id,count)。
 * 配布を追加したら npm run check:gifts / npm run check とお知らせの追加が必要。
 * 初回の配布内容は所有者の決定待ち。見本やテスト用報酬をここへ入れない。
 */
const DEV_GIFTS = [];
