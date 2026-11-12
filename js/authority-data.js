/* 権能の調整用データ。章名・章効果は未決定なので空のまま保持する。 */
const AUTHORITY_DATA = {
  version: 1,
  // 開発用の設定。プレイヤーによる切り替えや消費はない。
  enabledByDifficulty: { d1:true, d2:true, d3:true, d4:true, d5:true, extreme:true },
  nodes: [
    { id:'0', chapter:null, implemented:true, provisional:true,
      effects:[{stat:'maxHp', percent:1}] },
    ...Array.from({length:7}, (_,i)=>({id:String(i+1), chapter:i+1,
      implemented:false, provisional:false, effects:[]}))
  ]
};
