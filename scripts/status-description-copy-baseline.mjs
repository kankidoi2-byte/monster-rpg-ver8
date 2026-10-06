// Exact, frozen copy migrations for historical compatibility baselines.
// No current-source reads or skipped skill IDs: every comparison stays active.
const dataEdits = [
  [
    "毒を帯びた針を放ち、相手を毒状態にする。",
    "毒を帯びた針を放つ。"
  ],
  [
    "眠りを誘う粉をまき、相手を深い眠りに落とす。",
    "眠りを誘う粉をまく。"
  ],
  [
    "猛毒の植物園を生み出し、相手を強い毒で包み込む。",
    "猛毒の植物園を生み出す。"
  ],
  [
    "強力な電撃を放ち、敵の身体をしびれさせる。",
    "強力な電撃を放つ。"
  ],
  [
    "強烈なしびれを引き起こす電撃を放つ。",
    "強烈な電撃を放つ。"
  ],
  [
    "激しい雷嵐を巻き起こし、相手を麻痺させる。",
    "激しい雷嵐を巻き起こす。"
  ],
  [
    "幻覚を見せ、敵の判断を狂わせる。",
    "幻覚を見せる。"
  ],
  [
    "40％の確率で相手を3ターンの毒状態にする。",
    "猛毒をまとった風の斬撃を放つ。"
  ],
  [
    "60％の確率で相手を3ターンの毒状態にする。",
    "猛毒をまとい、天空から風の斬撃を放つ。"
  ]
];
const coreEdits = [
  [
    "poison:`${percent ?? 50}%で相手を毒状態にする`",
    "poison:`${percent ?? 50}%で相手を毒状態にする。3ターン継続し、各ターン終了時に最大HPの10%ダメージ（端数切り捨て、最低1ダメージ）`"
  ],
  [
    "paralysis:`${percent ?? 30}%で相手を麻痺状態にする`",
    "paralysis:`${percent ?? 30}%で相手を麻痺状態にする。3回の行動まで継続し、行動時30%で行動不能（行動できた場合も残り回数を消費）`"
  ],
  [
    "confusion:`${percent ?? 60}%で相手をこんらん状態にする`",
    "confusion:`${percent ?? 60}%で相手をこんらん状態にする。2～3回の行動まで継続し、行動時50%で通常行動、25%で行動不能、25%で自分を攻撃`"
  ],
  [
    "sleep:`${percent ?? 70}%で相手をねむり状態にする`",
    "sleep:`${percent ?? 70}%で相手をねむり状態にする。2回の行動まで継続し、行動時に行動不能`"
  ]
];
export const applyStatusDataCopy = source => dataEdits.reduce((s,[before,after])=>s.replace(before,after),source);
export const applyStatusCoreCopy = source => coreEdits.reduce((s,[before,after])=>s.replace(before,after),source);
