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
  {version:'8.0.8',date:'2026-11-23',change:'隊商槍士サフィラ、砂嵐槍士サフィラ、紅砂護商長サフィラの立ち絵をホームと戦闘に追加しました。'}
];

const UpdateReleases = (() => {
  const LIMIT = 20;
  const baseline = UPDATE_RELEASES[0].version;
  const current = UPDATE_RELEASES.at(-1).version;
  const rewards = {
    small:[{kind:'coins',amount:100},{kind:'bless',amount:10}],
    medium:[{kind:'coins',amount:500},{kind:'bless',amount:50},{kind:'item',id:'max_potion',count:1}],
    large:[{kind:'coins',amount:2000},{kind:'bless',amount:200},{kind:'item',id:'revive_drop',count:1}]
  };
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
  function size(previous,next){
    const [major,minor]=parts(previous),[nextMajor,nextMinor]=parts(next);
    return major!==nextMajor?'large':minor!==nextMinor?'medium':'small';
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
    return UPDATE_RELEASES.slice(1).map((release,index)=>{
      if(!pending.has(release.version))return null;
      const tier=size(UPDATE_RELEASES[index].version,release.version);
      return {
        id:release.version,key:'update:'+release.version,source:'update',tier,
        title:'Ver'+release.version+' アップデート報酬',letter:release.change,
        createdAt:new Date(release.date+'T00:00:00+09:00').toISOString(),until:null,
        rewards:[...rewards[tier],...(release.extraRewards||[])]
      };
    }).filter(Boolean).reverse();
  }
  function notices(){
    return UPDATE_RELEASES.slice().reverse().map(r=>({
      id:r.date.replaceAll('-','')+'-release-'+r.version.replaceAll('.','-'),
      date:r.date,category:'update',title:'Ver'+r.version+' アップデート',body:r.change
    }));
  }
  return {current,parts,compare,normalize,advance,gifts,notices};
})();
