/* Player-facing update notices. Keep newest entries first. */
const NOTICE_CATEGORIES = Object.freeze({
  update: Object.freeze({ label: 'アップデート', icon: '✨' }),
  fix: Object.freeze({ label: '不具合修正', icon: '🛠️' }),
  important: Object.freeze({ label: '重要', icon: '⚠️' })
});

const GAME_NOTICES = Object.freeze([
  Object.freeze({
    id: '20260826-battle-melee-motion',
    date: '2026-08-26',
    category: 'update',
    title: '剣・爪・牙の攻撃演出を追加しました',
    body: '剣技・爪技・牙技を使うと、相手の位置に属性色をまとった斬撃、爪痕、噛みつきの演出が表示されるようになりました。通常戦と複数の敵が登場するバトルの両方に対応しています。'
  }),
  Object.freeze({
    id: '20260826-battle-skill-motion',
    date: '2026-08-26',
    category: 'update',
    title: 'ブレス・ビーム技に攻撃演出を追加しました',
    body: 'ブレス系とビーム系の攻撃技を使うと、技の属性色をまとった光が相手へ飛ぶようになりました。通常戦と複数の敵が登場するバトルの両方に対応しています。'
  }),
  Object.freeze({
    id: '20260826-battle-command-pad',
    date: '2026-08-26',
    category: 'update',
    title: 'バトルコマンドを見やすく整理しました',
    body: '技・交代・リンク・道具・逃走を十字型の操作盤にまとめました。契約書は道具から使用でき、契約可能なときは道具ボタンに表示されます。'
  }),
  Object.freeze({
    id: '20260826-battle-switch',
    date: '2026-08-26',
    category: 'update',
    title: '戦闘中にモンスターを交代できるようにしました',
    body: 'バトルコマンドの「交代」から、戦闘可能な控えモンスターへ交代できます。通常の交代は1ターンを使い、風渡り交代はこれまで通り行動を消費しません。'
  }),
  Object.freeze({
    id: '20260826-single-battle-vertical-layout',
    date: '2026-08-26',
    category: 'fix',
    title: '通常戦のモンスター配置を見直しました',
    body: '通常戦でも三つ巴バトルと同じように、敵を上、プレイヤーのモンスターを下に表示するよう変更しました。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-water-mirror-guard',
    date: '2026-08-26',
    category: 'update',
    title: '★3水属性のリンク能力を変更しました',
    body: '保留中だった「水脈節約」を「水鏡の護り」へ変更しました。次に受ける直接ダメージを30％軽減し、1回発動すると消費します。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-active-details',
    date: '2026-08-26',
    category: 'fix',
    title: '発動中のリンク効果を確認できるようにしました',
    body: 'ココロリンク発動後も「発動中」ボタンから、残り障壁・攻撃・素早さと追加リンク能力の状態をいつでも確認できます。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-three-star-abilities',
    date: '2026-08-26',
    category: 'update',
    title: '★3モンスターのリンク能力を追加しました',
    body: '★3モンスターが主属性に応じて、回復・状態解除・反動無効・先制行動・無消費交代・敵強化解除・行動予知・耐性貫通などの戦術支援を発動するようになりました。技コスト軽減は戦闘内コスト実装まで保留されます。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-two-star-abilities',
    date: '2026-08-26',
    category: 'update',
    title: '★2モンスターのリンク能力を追加しました',
    body: '★2モンスターが主属性に応じて、弱体化・火傷・鈍足・毒・麻痺・行動遅延・目くらまし・こんらん・ねむり・攻撃低下を発動するようになりました。ボスには通常より効きにくくなります。'
  }),
  Object.freeze({
    id: '20260826-kokoro-link-one-star-abilities',
    date: '2026-08-26',
    category: 'update',
    title: '★1モンスターのリンク能力を追加しました',
    body: '★1モンスターが主属性ごとの追加能力を発動するようになりました。攻撃・障壁・素早さ強化のほか、継続回復、回避、初撃軽減、HP吸収、確率補正、技威力強化が使えます。'
  }),
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
