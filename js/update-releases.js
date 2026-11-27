/* The first row is the permanent migration baseline (no gift for this row).
 * Append releases oldest-first. Never edit or drop a published row.
 * Set index.html's update-releases.js?v= to the new latest version.
 * Optional extraRewards use the same records as gifts-data.js.
 */
const UPDATE_RELEASES = [
  {version:'8.0.1',date:'2026-11-21',change:'アップデートごとにプレゼントBOXへ報酬が届くようになりました。'},
  {version:'8.0.2',date:'2026-11-21',change:'画質を保ったまま、タイトルや会話、仲間の編成で画像を読み込む待ち時間を短くしました。'},
  {version:'8.0.3',date:'2026-11-22',change:'エリシア、光祈の巫女エリシア、光の女神エリシアの立ち絵をホームと戦闘に追加しました。'},
  {version:'8.0.4',date:'2026-11-22',change:'接雷の従士ブリジット、雷壁騎士ブリジット、城塞隊長ブリジットの立ち絵をホームと戦闘に追加しました。'},
  {version:'8.0.5',date:'2026-11-22',change:'風便見習いトビア、峡谷便使いトビア、天路伝令長トビアの立ち絵をホームと戦闘に追加しました。'},
  {version:'8.0.6',date:'2026-11-22',change:'流炉職人ローデン、戦炉術師ローデン、百錬の炉匠ローデンの立ち絵をホームと戦闘に追加しました。'},
  {version:'8.0.7',date:'2026-11-23',change:'巡回水医セレネ、水脈医セレネ、命泉の医導師セレネの立ち絵をホームと戦闘に追加しました。'},
  {version:'8.0.8',date:'2026-11-23',change:'隊商槍士サフィラ、砂嵐槍士サフィラ、紅砂護商長サフィラの立ち絵をホームと戦闘に追加しました。'},
  {version:'8.0.9',date:'2026-11-23',change:'新入りのボルド、熟練のボルド、司厨長ボルドの立ち絵をホームと戦闘に追加しました。'},
  {version:'8.0.10',date:'2026-11-23',change:'札売り娘リゼ、影札師リゼ、千契の奇術頭リゼの立ち絵をホームと戦闘に追加しました。'},
  {version:'8.0.11',date:'2026-11-23',change:'傷負いの剣士レグス、呪鉄剣士レグス、断呪の紫刃レグスの立ち絵をホームと戦闘に追加しました。'},
  {version:'8.0.12',date:'2026-11-24',change:'経験値データのまとめ使いとショップのまとめ買いに対応し、属性・状態異常の表示とアイテムのイラストを更新しました。'},
  {version:'8.0.13',date:'2026-11-25',change:'全身立ち絵がある仲間や敵は、バトル開始時や交代時から立ち絵で表示されるようになりました。'},
  {version:'8.0.14',date:'2026-11-26',change:'序章前半のミッションと第13話の退避条件の案内、会話送りボタンを修正しました。'},
  {version:'8.0.15',date:'2026-11-27',change:'命中音のなかった技と弱点命中、HP回復に効果音を追加しました。'},
  {version:'8.0.16',date:'2026-11-27',change:'序章後半の会話で、再び話し始めた人物の立ち絵が表示されるようになりました。'},
  {version:'8.0.17',date:'2026-11-27',change:'序章の会話で、トビアなど8人の立ち絵の背景が隣の人物や風景を隠す不具合を修正しました。'},
  {version:'8.0.18',date:'2026-11-27',change:'タイトル画面の最初のタップで曲が流れ、2回目でゲームが始まるようになりました。'},
  {version:'8.0.19',date:'2026-11-27',change:'お知らせを以前のカード表示に戻し、同じ変更が重複して表示される不具合を修正しました。'},
  {version:'8.0.20',date:'2026-11-28',change:'戦闘中と技の説明で、状態異常の名前を「ねむり」「こんらん」に統一しました。'}
];

const UpdateReleases = (() => {
  const LIMIT = 20;
  const baseline = UPDATE_RELEASES[0].version;
  const current = UPDATE_RELEASES.at(-1).version;
  const rewards = {small:[{kind:'coins',amount:100},{kind:'bless',amount:10}]};
  const dates = new Map(UPDATE_RELEASES.map(r=>[r.version,r.date]));
  function monthDay(date){
    const [,month,day]=date.split('-');
    return Number(month)+'/'+Number(day);
  }
  function giftTitle(version,createdAt){
    const date=dates.get(version);
    if(date)return 'アップデート報酬（'+monthDay(date)+'）';
    // A receipt can outlive its catalog row (for example when opening an older build).
    // Only use a complete timestamp with an explicit zone, so it cannot depend on the device zone.
    if(typeof createdAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt)){
      const time=Date.parse(createdAt), calendarDate=createdAt.slice(0,10);
      const midnight=Date.parse(calendarDate+'T00:00:00Z');
      if(Number.isFinite(time)&&Number.isFinite(midnight)&&new Date(midnight).toISOString().startsWith(calendarDate+'T')){
        const jstDate=new Date(time+9*3600000);
        return 'アップデート報酬（'+(jstDate.getUTCMonth()+1)+'/'+jstDate.getUTCDate()+'）';
      }
    }
    return 'アップデート報酬';
  }
  function parts(version){
    if(typeof version!=='string'||!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*))?$/.test(version))return null;
    const numbers=version.split('.').map(Number);
    if(!numbers.every(Number.isSafeInteger))return null;
    return [numbers[0],numbers[1],numbers[2]??0];
  }
  function compare(a,b){
    const first=parts(a),second=parts(b);
    return first[0]-second[0]||first[1]-second[1]||first[2]-second[2];
  }
  function normalize(state){
    const delivered=parts(state?.delivered)?state.delivered:baseline;
    const pending=Array.isArray(state?.pending)?[...new Set(state.pending.filter(v=>parts(v)&&compare(v,baseline)>0&&compare(v,delivered)<=0))]:[];
    return {delivered,pending:pending.sort(compare).slice(-LIMIT)};
  }
  function advance(state){
    const next=normalize(state);
    // Do not rewind markers or erase gifts from a newer build on downgrade.
    if(compare(next.delivered,current)>=0)return next;
    return normalize({
      delivered:current,
      pending:[...next.pending,...UPDATE_RELEASES.slice(1).filter(r=>compare(r.version,next.delivered)>0).map(r=>r.version)]
    });
  }
  function gifts(state){
    const pending=new Set(normalize(state).pending);
    // Newest version first even when several releases share the same date.
    return UPDATE_RELEASES.slice(1).map(release=>{
      if(!pending.has(release.version))return null;
      const tier='small';
      return {
        id:release.version,key:'update:'+release.version,source:'update',tier,
        title:giftTitle(release.version),letter:release.change,
        createdAt:new Date(release.date+'T00:00:00+09:00').toISOString(),until:null,
        rewards:[...rewards[tier],...(release.extraRewards||[])]
      };
    }).filter(Boolean).reverse();
  }
  return {current,parts,compare,normalize,advance,gifts,giftTitle};
})();
