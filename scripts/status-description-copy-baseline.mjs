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
export const applyStatusDataCopy = source => applySimpleStatusData(dataEdits.reduce((s,[before,after])=>s.replace(before,after),source));
export const applyStatusCoreCopy = source => applySimpleStatusCore(coreEdits.reduce((s,[before,after])=>s.replace(before,after),source));

// Approved 2026-10-07 follow-up: fixed short descriptions, without performance changes.
const simpleDataEdits = [
  [
    "\"毒を帯びた針を放つ。\"",
    "\"毒を帯びた針で攻撃する。\""
  ],
  [
    "\"猛毒の植物園を生み出す。\"",
    "\"猛毒の植物で相手を包み込んで攻撃する。\""
  ],
  [
    "\"強力な電撃を放つ。\"",
    "\"強力な電撃で攻撃する。\""
  ],
  [
    "\"強烈な電撃を放つ。\"",
    "\"しびれる電撃で攻撃する。\""
  ],
  [
    "\"激しい雷嵐を巻き起こす。\"",
    "\"激しい雷嵐で攻撃する。\""
  ],
  [
    "\"幻覚を見せる。\"",
    "\"幻覚を見せて攻撃する。\""
  ],
  [
    "\"毒を含んだ竜の息吹を浴びせる。\"",
    "\"毒を含んだ息吹で攻撃する。\""
  ],
  [
    "\"猛毒をまとった風の斬撃を放つ。\"",
    "\"猛毒をまとった風の斬撃で攻撃する。\""
  ],
  [
    "\"猛毒をまとい、天空から風の斬撃を放つ。\"",
    "\"天空から猛毒をまとった斬撃を放つ。\""
  ],
  [
    "[\"毒の短剣\",22,\"normal\",\"poison\",null,null,null,null,\"skill_goblin_03\"]",
    "[\"毒の短剣\",22,\"normal\",\"poison\",null,null,\"毒を塗った短剣で切りつける。\",null,\"skill_goblin_03\"]"
  ]
];
const simpleCoreEdits = [
  [
    "    poison:`${percent ?? 50}%で相手を毒状態にする。3ターン継続し、各ターン終了時に最大HPの10%ダメージ（端数切り捨て、最低1ダメージ）`",
    "    poison:'相手を毒状態にすることがある'"
  ],
  [
    "    paralysis:`${percent ?? 30}%で相手を麻痺状態にする。3回の行動まで継続し、行動時30%で行動不能（行動できた場合も残り回数を消費）`",
    "    paralysis:'相手を麻痺させることがある'"
  ],
  [
    "    confusion:`${percent ?? 60}%で相手をこんらん状態にする。2～3回の行動まで継続し、行動時50%で通常行動、25%で行動不能、25%で自分を攻撃`",
    "    confusion:'相手をこんらんさせることがある'"
  ],
  [
    "    sleep:`${percent ?? 70}%で相手をねむり状態にする。2回の行動まで継続し、行動時に行動不能`",
    "    sleep:'相手をねむり状態にする'"
  ],
  [
    "  if (fx[effect]) txt +=",
    "  // Legacy status skills use short flavor-first copy; tactical skills keep their own descriptions.\n  if (['poison','paralysis','confusion','sleep'].includes(effect)) {\n    return txt + (txt ? ' / ' : '') + (customDesc || '') + fx[effect] + '。';\n  }\n  if (fx[effect]) txt +="
  ]
];
export const applySimpleStatusData = source => simpleDataEdits.reduce((s,[before,after])=>s.replace(before,after),source);
export const applySimpleStatusCore = source => simpleCoreEdits.reduce((s,[before,after])=>s.includes(after)?s:s.replace(before,after),source);
