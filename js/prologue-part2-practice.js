/* Episode 14 loans live only in memory. Never replace the player's party/save. */
let prologuePart2LinkPractice=null;
function prologuePart2LinkPracticeClear(){prologuePart2LinkPractice=null;}
function prologuePart2LinkPracticeValid(eventId){
  return Boolean(prologuePart2Ui&&prologuePart2Ui.id==='pb_14'&&
    prologuePart2Ui.identity===saveTransactionIdentity()&&!prologuePart2Retry&&
    prologuePart2Step()?.id===eventId&&prologuePart2Step()?.action==='linkPractice');
}
function prologuePart2LinkPracticeCreate(eventId){
  const party=['galdra','aquaron'].map((id,index)=>{
    const mon=M.find(m=>m.id===id),inst={id,uid:`p2-practice-${index}`,level:1};
    if(!mon)throw new Error('prologue_link_loan_missing');
    return {mon,inst,uid:inst.uid,hp:mon.hp,maxHp:mon.hp,fainted:false};
  });
  return {eventId,context:prologuePart2Ui,party,selected:false,link:null,
    state:{usedSourceUids:new Set(),linksByTargetUid:new Map(),enemyEffectsByTargetKey:new Map(),pendingTimeStops:0}};
}
function prologuePart2LinkPracticeIsolated(practice,operation){
  // Existing link functions use one runtime binding. Swap only synchronously,
  // with restoration even on failure; no battle UI, timers or save code runs here.
  const realState=kokoroLinkBattleState;
  try{kokoroLinkBattleState=practice.state;return operation();}
  finally{practice.state=kokoroLinkBattleState;kokoroLinkBattleState=realState;}
}
function prologuePart2LinkPracticeMarkup(eventId){
  if(!prologuePart2LinkPracticeValid(eventId))return '';
  if(!prologuePart2LinkPractice||prologuePart2LinkPractice.context!==prologuePart2Ui||prologuePart2LinkPractice.eventId!==eventId){
    prologuePart2LinkPractice=prologuePart2LinkPracticeCreate(eventId);
  }
  const p=prologuePart2LinkPractice,esc=prologuePart2Escape;
  const arg=esc(JSON.stringify(eventId));
  const source=prologuePart2LinkPracticeIsolated(p,()=>listKokoroLinkSources(p.party,0,{includeUsed:true})[0]);
  const preview=resolveKokoroLink(p.party[1].mon,p.party[1].inst,{maxHp:p.party[0].maxHp,speed:p.party[0].mon.spd});
  const effects=(p.link||preview).effects;
  return `<section aria-label="ココロリンクの練習"><h3>ココロリンク</h3><p>練習用です。手持ちは変わりません</p>
    <p>前衛：ガルドラ（貸与） HP ${p.party[0].hp} / ${p.party[0].maxHp}</p>
    <p>控え：アクアロン（貸与）${source?.available?'・発動可能':'・使用済み'}</p>
    <p>生存している控えのモンスターから力を借ります。控えは1戦につき1回、前衛はリンク中でないときに発動できます。</p>
    ${p.link?'<p role="status">ココロリンク発動！ アクアロンの力がガルドラを支えています。</p>':`<button type="button" onclick="prologuePart2LinkPracticeSelect(${arg})" ${source?.available?'':'disabled'}>アクアロンを選ぶ</button>`}
    ${p.selected||p.link?`<p>障壁 ${effects.barrier} / 攻撃ダメージ +${Math.round(effects.attackBonus*100)}% / 素早さ +${effects.speedBonus}</p><p>${esc(preview.powerAbility?.summary||'')}</p>${p.link?'':`<button type="button" onclick="prologuePart2LinkPracticeActivate(${arg})">リンクする</button>`}`:''}
    ${p.link?`<button type="button" onclick="prologuePart2LinkPracticeReset(${arg})">もう一度練習する</button>`:''}
    <button type="button" onclick="prologuePart2LinkPracticeFinish(${arg},false)">練習を終える</button>
    <button type="button" onclick="prologuePart2LinkPracticeFinish(${arg},true)">後で見る</button></section>`;
}
function prologuePart2LinkPracticeCurrent(eventId){
  const p=prologuePart2LinkPractice;
  return prologuePart2LinkPracticeValid(eventId)&&p?.context===prologuePart2Ui&&p.eventId===eventId?p:null;
}
function prologuePart2LinkPracticeSelect(eventId){
  const p=prologuePart2LinkPracticeCurrent(eventId);if(!p||p.link)return false;
  p.selected=true;renderProloguePart2();return true;
}
function prologuePart2LinkPracticeActivate(eventId){
  const p=prologuePart2LinkPracticeCurrent(eventId);if(!p||!p.selected||p.link)return false;
  const result=prologuePart2LinkPracticeIsolated(p,()=>activateKokoroLinkSource(p.party[1].uid,p.party,0,{maxHp:p.party[0].maxHp,speed:p.party[0].mon.spd}));
  if(!result.ok)return false;
  p.link=result.link;renderProloguePart2();return true;
}
function prologuePart2LinkPracticeReset(eventId){
  if(!prologuePart2LinkPracticeCurrent(eventId))return false;
  prologuePart2LinkPractice=prologuePart2LinkPracticeCreate(eventId);renderProloguePart2();return true;
}
function prologuePart2LinkPracticeFinish(eventId,skip=false){
  const p=prologuePart2LinkPracticeCurrent(eventId);if(!p)return false;
  const seen=!skip&&Boolean(p.link);
  return prologuePart2AdvanceEvent(eventId,{
    mutate:()=>{if(seen){save.prologuePart2.trainingSeen??={};save.prologuePart2.trainingSeen.pb14=true;}},
    onSaved:()=>{prologuePart2LinkPracticeClear();renderProloguePart2();}
  });
}
