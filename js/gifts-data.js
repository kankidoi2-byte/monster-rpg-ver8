/* 全員への開発者プレゼント。新しい順。公開済みidは変更・再利用しない。
 * startAt: 日本時間0:00、until: 日本時間のその日いっぱい（null=無期限）。
 * rewards: coins(amount), item(id,count), monster/character(id,level), skill(id,count)。
 * 配布を追加したら npm run check:gifts / npm run check とお知らせの追加が必要。
 */
const DEV_GIFTS = [
  {
    id: '20261102-present-box-open',
    title: 'プレゼントBOX開設記念',
    letter: 'プレゼントBOXを開きました。ちゃんと届いていますか？',
    startAt: '2026-11-02',
    until: '2026-11-30',
    rewards: [
      {kind: 'coins', amount: 5000},
      {kind: 'item', id: 'rainbow_contract_scroll', count: 3},
      {kind: 'item', id: 'giga_data', count: 5},
      {kind: 'item', id: 'upper_potion', count: 10},
      {kind: 'item', id: 'fine_magic_crystal', count: 2}
    ]
  }
];
