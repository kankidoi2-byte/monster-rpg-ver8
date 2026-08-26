/* Player-facing update notices. Keep newest entries first. */
const NOTICE_CATEGORIES = Object.freeze({
  update: Object.freeze({ label: 'アップデート', icon: '✨' }),
  fix: Object.freeze({ label: '不具合修正', icon: '🛠️' }),
  important: Object.freeze({ label: '重要', icon: '⚠️' })
});

const GAME_NOTICES = Object.freeze([
  Object.freeze({
    id: '20260826-kokoro-link-scaling',
    date: '2026-08-26',
    category: 'fix',
    title: 'ココロリンクの強化計算と表示を改善しました',
    body: '強化量が戦闘中モンスターの能力を基準に決まるよう修正しました。効果欄にはレアリティ補正を適用した最終値を表示します。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link',
    date: '2026-08-26',
    category: 'update',
    title: '新バトルシステム「ココロリンク」を追加しました',
    body: '戦闘中、控えモンスター1体の力を借りて、味方に障壁・攻撃・素早さの強化を付与できるようになりました。低レアリティほど高いリンク倍率を持ちます。'
  }),
  Object.freeze({
    id: '20260825-notice-center',
    date: '2026-08-25',
    category: 'update',
    title: 'お知らせ機能を追加しました',
    body: 'ホーム画面から最新情報と、これまでの主な更新履歴を確認できるようになりました。'
  }),
  Object.freeze({
    id: '20260825-skill-gacha',
    date: '2026-08-25',
    category: 'update',
    title: '技ガチャを追加しました',
    body: 'コインを使って技カードを獲得できるようになりました。技コストが高いカードほど出現しにくくなります。'
  }),
  Object.freeze({
    id: '20260825-evolution-skill-card',
    date: '2026-08-25',
    category: 'update',
    title: '進化時に初期技カードを獲得できるようになりました',
    body: 'モンスターが進化すると、進化後のモンスターが持つ初期装備技を技カードとして獲得します。'
  }),
  Object.freeze({
    id: '20260825-skill-card-system',
    date: '2026-08-25',
    category: 'update',
    title: '技カードと装備技の管理を改善しました',
    body: '技の分類と装備区分を整理し、入手・所持した技カードを使って技を付け替える仕組みに変更しました。'
  }),
  Object.freeze({
    id: '20260824-title-loading',
    date: '2026-08-24',
    category: 'update',
    title: 'ゲームの初期読み込みを軽量化しました',
    body: 'タイトル画面の画像と読み込み処理を見直し、スマートフォンでゲームを開く際の通信量を削減しました。'
  }),
  Object.freeze({
    id: '20260824-monster-dex-obtain',
    date: '2026-08-24',
    category: 'update',
    title: 'モンスター図鑑の入手情報を改善しました',
    body: '図鑑の詳細画面で、出現マップや進化・錬成などの主な入手方法を確認できるようになりました。'
  }),
  Object.freeze({
    id: '20260824-chimeragna-rarity',
    date: '2026-08-24',
    category: 'update',
    title: 'キメラグナ・アペクスを★4へ調整しました',
    body: 'キメラグナ・アペクスのレアリティを★5から★4へ変更し、装備できる技コスト上限も調整しました。'
  })
]);
