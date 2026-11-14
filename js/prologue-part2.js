/* Main-story continuation. Keep all progress and one-time grants in the current save. */
let prologuePart2Ui=null;
let prologuePart2Typewriter=null;
let prologuePart2Retry=null;
let prologuePart2Raid=null;
let prologuePart2PartyReturn=false;
const prologuePart2Escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function prologuePart2Data(){return typeof PROLOGUE_PART2_DATA==='undefined'?null:PROLOGUE_PART2_DATA;}
function prologuePart2Episodes(){return prologuePart2Data()?.episodes||[];}
function prologuePart2Episode(id){return prologuePart2Episodes().find(e=>e.id===id);}
function prologuePart2DefaultEpisode(){return {phase:'pre',cursor:null,wonBattleIds:[],completed:false,rewardClaimed:false,rewardTargetUids:[]};}
function prologuePart2EpisodeState(id){return save.prologuePart2?.episodes?.[id]||prologuePart2DefaultEpisode();}
function prologuePart2WritableEpisode(id){return save.prologuePart2.episodes[id]??=prologuePart2DefaultEpisode();}
function prologuePart2Available(){
  const t=save.progress?.tutorial;
  return Boolean(save.prologuePart2&&(['completed','skipped'].includes(t?.status)||t?.completed===true||t?.skipped===true||save.progress?.storyFlags?.prologueCompleted===true));
}
function prologuePart2CurrentEpisode(){return prologuePart2Available()?prologuePart2Episodes().find(e=>!prologuePart2EpisodeState(e.id).completed):null;}
function prologuePart2Label(episode){return episode?.id==='pb_ep'?'終幕':`第${episode?.number}話`;}
function prologuePart2Opened(id){const e=prologuePart2Episode(id);return Boolean(e&&prologuePart2Available()&&(e===prologuePart2CurrentEpisode()||prologuePart2EpisodeState(id).completed));}
function prologuePart2Root(){return document.getElementById('prologuePart2Content');}
function prologuePart2Write(mutate,onSaved){
  if(!prologuePart2Ui||prologuePart2Retry)return false;
  const context=prologuePart2Ui;
  const attempt=()=>{
    if(prologuePart2Ui!==context||context.identity!==saveTransactionIdentity()){prologuePart2Retry=null;return false;}
    if(!commitSaveMutation(mutate,{requireReadable:true})){
      prologuePart2Retry=attempt;
      prologuePart2StopText();
      show('prologuePart2');
      prologuePart2Root().innerHTML='<p role="alert">進行を保存できませんでした。</p><button type="button" onclick="prologuePart2RetrySave()">保存を再試行</button>';
      return false;
    }
    prologuePart2Retry=null;
    if(onSaved)showCommittedSaveResult(onSaved);
    return true;
  };
  return attempt();
}
function prologuePart2RetrySave(){return prologuePart2Retry?.()||false;}
function prologuePart2Index(episode,context=prologuePart2Ui){
  if(!episode||!context)return 0;
  if(context.replay)return context.index;
  const cursor=prologuePart2EpisodeState(episode.id).cursor;
  if(cursor==null)return 0;
  if(Number.isInteger(cursor))return Math.min(cursor,episode.steps.length-1);
  const index=episode.steps.findIndex(step=>step.id===cursor);
  return index<0?0:index;
}
function prologuePart2Step(){const ep=prologuePart2Episode(prologuePart2Ui?.id);return ep?.steps[prologuePart2Index(ep)];}
function prologuePart2ApplyMilestone(step){
  const {grants,evidence}=save.prologuePart2;
  if(step.action==='evidence'){
    for(const key of step.keys||[step.key])if(key){evidence[key]=true;if(key==='blackShardRoad')grants.blackShardRoad=true;}
  }
  if(step.action==='grant'&&step.key==='travelStipend'&&!grants.travelStipend){
    save.coins+=step.coins;grants.travelStipend=true;
  }
}
function prologuePart2SetNext(episode,position){
  const entry=prologuePart2WritableEpisode(episode.id);
  let next=episode.steps[++position];
  while(next&&(next.kind==='event'&&['evidence','grant'].includes(next.action)||next.when&&!Object.entries(next.when).every(([k,v])=>entry[k]===v))){
    if(next.kind==='event')prologuePart2ApplyMilestone(next);
    next=episode.steps[++position];
  }
  if(!next)throw new Error('prologue_next_step_missing');
  entry.cursor=next.id;
  entry.phase=next.kind==='battle'?'pre':next.kind==='complete'?'post':'scene';
}
function prologuePart2AdvanceEvent(expectedId,{mutate,onSaved}={}){
  const context=prologuePart2Ui,episode=prologuePart2Episode(context?.id);
  if(!episode||context.identity!==saveTransactionIdentity()||prologuePart2Retry)return false;
  const index=prologuePart2Index(episode),step=episode.steps[index];
  if(!step||step.id!==expectedId||step.kind==='complete')return false;
  if(context.replay){
    context.index++;
    (onSaved||renderProloguePart2)();
    return true;
  }
  return prologuePart2Write(()=>{if(mutate)mutate();prologuePart2SetNext(episode,index);},onSaved||renderProloguePart2);
}
function openProloguePart2(id=prologuePart2CurrentEpisode()?.id,{replay=false}={}){
  if(!prologuePart2Opened(id)||prologuePart2Retry)return false;
  if(replay!==prologuePart2EpisodeState(id).completed)return false;
  prologuePart2StopText();
  prologuePart2Ui={id,replay,index:0,identity:saveTransactionIdentity(),seen:[],auto:false};
  show('prologuePart2');renderProloguePart2();
  return true;
}
function prologuePart2Leave(){
  if(prologuePart2Retry||prologuePart2Raid)return;
  prologuePart2StopText();
  if(typeof closeProloguePart2Battle==='function')closeProloguePart2Battle();
  if(typeof prologuePart2LinkPracticeClear==='function')prologuePart2LinkPracticeClear();
  prologuePart2Ui=null;prologuePart2PartyReturn=false;
  openStoryMode();
}
function prologuePart2StopText(){
  prologuePart2Typewriter?.cancel();prologuePart2Typewriter=null;
  if(prologuePart2Ui?.autoTimer){clearTimeout(prologuePart2Ui.autoTimer);prologuePart2Ui.autoTimer=null;}
}
function prologuePart2ScreenChanged(id){
  if(id!=='prologuePart2'){
    prologuePart2StopText();
    prologuePart2Root()?.replaceChildren();
    if(typeof prologuePart2LinkPracticeClear==='function')prologuePart2LinkPracticeClear();
  }
  if(!['battle','battleItemSelect','contractConfirm','prologuePart2'].includes(id)&&!prologuePart2Retry&&typeof isProloguePart2Battle==='function'&&isProloguePart2Battle()){
    if(prologuePart2Raid){const overlay=document.getElementById('prologuePart2Raid');if(overlay){overlay.hidden=true;overlay.innerHTML='';}prologuePart2Raid=null;}
    if(!prologuePart2BattleSession?.finished&&typeof showUiNotice==='function')showUiNotice('中断した戦闘は最初から再開します。使った通常の道具は戻りません。','warning');
    closeProloguePart2Battle();
  }
  if(id!=='partySet')prologuePart2PartyReturn=false;
}
function prologuePart2Return(){
  if(!prologuePart2Ui||prologuePart2Ui.identity!==saveTransactionIdentity())return openStoryMode();
  show('prologuePart2');renderProloguePart2();
}
function prologuePart2ShowParty(){
  if(prologuePart2Retry)return;
  prologuePart2PartyReturn=true;show('partySet');
}
function renderProloguePart2PartyReturn(){
  const button=document.getElementById('prologuePart2PartyReturn');
  if(button)button.hidden=!prologuePart2PartyReturn;
}
function prologuePart2PlayerText(text){
  const name=save.progress?.tutorial?.playerName||'契約者';
  return String(text??'').replace(/PrayerName|\{\{playerName\}\}/g,()=>name);
}
function prologuePart2Conditional(step,context=prologuePart2Ui){
  if(!step.when)return true;
  const episode=prologuePart2EpisodeState(context.id);
  return Object.entries(step.when).every(([key,val])=>episode[key]===val);
}
function prologuePart2ResolveText(step){
  if(step.id==='pb_08_post_01'){
    const bought=prologuePart2EpisodeState('pb_08').shopPurchased===true;
    return step.variants?.[bought?'purchased':'notPurchased']||'';
  }
  return prologuePart2PlayerText(step.text);
}
function prologuePart2Log(){
  const ui=prologuePart2Ui,log=document.getElementById('prologuePart2Log');
  if(!ui||!log)return;
  log.hidden=!log.hidden;
  if(!log.hidden){prologuePart2Typewriter?.finish();if(ui.autoTimer){clearTimeout(ui.autoTimer);ui.autoTimer=null;}}
}
function prologuePart2ToggleAuto(){
  if(!prologuePart2Ui)return;
  prologuePart2Ui.auto=!prologuePart2Ui.auto;
  renderProloguePart2();
}
function prologuePart2Tap(event){
  if(event&&event.currentTarget?.matches('.map-story-scene')&&event.target.closest('button, #prologuePart2Log, input, label'))return;
  if(!document.getElementById('prologuePart2Log')?.hidden)return;
  if(prologuePart2Typewriter&&!prologuePart2Typewriter.isComplete()){prologuePart2Typewriter.finish();return;}
  const step=prologuePart2Step();
  if(step&&['dialogue','narration','system','production'].includes(step.kind))prologuePart2AdvanceCard(step);
}
function prologuePart2AdvanceCard(step){return prologuePart2AdvanceEvent(step.id);}
function prologuePart2AwardExp(uids,amount){
  if(!amount)return;
  for(const uid of [...new Set(uids)].slice(0,3)){
    const unit=save.instances.find(i=>i.uid===uid);
    if(!unit||unit.guest===true)continue;
    unit.exp=(Number(unit.exp)||0)+amount;
    while(!isMaxLevel(unit.level)&&unit.exp>=needExp(unit.level)){unit.exp-=needExp(unit.level);unit.level++;}
    if(isMaxLevel(unit.level))unit.exp=0;
  }
}
function prologuePart2Complete(){
  const ui=prologuePart2Ui,e=prologuePart2Episode(ui?.id);
  if(!e||prologuePart2Step()?.kind!=='complete'||prologuePart2Retry)return;
  if(ui.replay)return prologuePart2Leave();
  const targets=[...(prologuePart2EpisodeState(e.id).rewardTargetUids||[])];
  return prologuePart2Write(()=>{
    const state=prologuePart2WritableEpisode(e.id);
    if(state.completed||state.rewardClaimed)return;
    if(e.steps.some(s=>s.kind==='battle'&&!state.wonBattleIds.includes(s.battleId)))throw new Error('prologue_battle_unfinished');
    prologuePart2AwardExp(targets,e.rewards.exp);
    save.coins+=e.rewards.coins;
    state.completed=true;state.rewardClaimed=true;state.phase='complete';
    if(e.id==='pb_ep'){
      save.prologuePart2.completed=true;save.prologuePart2.hubArrived=true;
      save.authority=normalizeAuthoritySave(save.authority,save);
    }
  },()=>{
    for(const uid of targets){const ins=save.instances.find(i=>i.uid===uid);if(ins&&typeof checkEvolution==='function')checkEvolution(ins);}
    const next=prologuePart2CurrentEpisode();
    show('prologuePart2');
    prologuePart2Root().innerHTML=`<section class="prologue-part2-finish"><h2>${prologuePart2Label(e)} 完了</h2>${next?`<button type="button" onclick="openProloguePart2('${next.id}')">次の話へ</button>`:'<button type="button" onclick="prologuePart2GoHome()">拠点へ</button>'}<button type="button" onclick="prologuePart2Leave()">話一覧へ</button></section>`;
  });
}
function prologuePart2GoHome(){prologuePart2Ui=null;show('home');}
function prologuePart2BattleCallbacks(episode,step,battle){
  return {
    loanHealAvailable:()=>episode.id==='pb_09'&&!save.prologuePart2.grants.pb09LoanHealUsed,
    onLoanHeal(finish){
      return prologuePart2Write(()=>{save.prologuePart2.grants.pb09LoanHealUsed=true;},()=>{if(!document.getElementById('battle')?.classList.contains('active'))show('battle');finish();});
    },
    onOutcome(kind,request,finish){
      const index=episode.steps.findIndex(s=>s.id===step.id);
      return prologuePart2Write(()=>{
        const state=prologuePart2WritableEpisode(episode.id);
        if(state.cursor!==step.id||state.phase!=='battle')throw new Error('prologue_battle_cursor_moved');
        if(kind==='victory'){
          if(!state.wonBattleIds.includes(battle.id))state.wonBattleIds.push(battle.id);
          state.rewardTargetUids=[...(request.participantUids||[])].slice(0,3);
          if(battle.id==='p2_07_a'&&!save.prologuePart2.grants.pb07Scroll){
            save.items.contract_scroll=(save.items.contract_scroll||0)+1;
            save.prologuePart2.grants.pb07Scroll=true;
          }
          prologuePart2SetNext(episode,index);
        }else state.phase='pre';
      },finish);
    },
    onFinished(kind){
      if(typeof closeProloguePart2Battle==='function')closeProloguePart2Battle();
      if(kind==='victory')prologuePart2Return();
      else{
        show('prologuePart2');
        const msg=kind==='retreat'?'無理はしない。道を考え直そう！':'大丈夫、いったん戻ろう。立て直してからだ！';
        prologuePart2Root().innerHTML=`<section class="prologue-part2-finish"><p>グノーシス：${msg}</p><button type="button" onclick="prologuePart2Return()">再挑戦</button><button type="button" onclick="prologuePart2ShowParty()">編成を見直す</button><button type="button" onclick="prologuePart2Leave()">話一覧へ</button></section>`;
      }
    },
    onContract(result,request,mutate,finish){
      const current=prologuePart2Step();
      if(episode.id!=='pb_07'||!current||current.kind!=='event')return false;
      return prologuePart2AdvanceEvent(current.id,{mutate(){
        if(mutate)mutate();
        prologuePart2WritableEpisode(episode.id).contractOutcome=result;
      },onSaved:finish||prologuePart2Return});
    },
    onContractFinished(){closeProloguePart2Battle();prologuePart2Return();},
    onInvasion(resume,interruptCards){
      const cards=episode.steps.filter(n=>/^pb_14_post_0[123]$/.test(n.id));
      const source=interruptCards||battle.interruptCards||cards;
      prologuePart2Raid={cards:source,index:0,resume};
      renderProloguePart2Raid();
    }
  };
}
function prologuePart2StartBattle(){
  const step=prologuePart2Step(),episode=prologuePart2Episode(prologuePart2Ui?.id);
  if(!episode||step?.kind!=='battle'||prologuePart2Ui.replay||typeof startProloguePart2Battle!=='function')return false;
  const source=prologuePart2Data().battles[step.battleId];
  const battle=source&&{...source,background:step.background||episode.background,location:episode.location};
  if(!battle)return false;
  if(typeof getPartyInstances==='function'&&!getPartyInstances().length){
    showUiNotice('戦える仲間を編成してください。','warning');return false;
  }
  const firstThreeWay=step.battleId==='p2_12_a'&&!save.prologuePart2.trainingSeen.pb12ThreeWay;
  return prologuePart2Write(()=>{
    const s=prologuePart2WritableEpisode(episode.id);
    s.cursor=step.id;s.phase='battle';
    if(firstThreeWay)save.prologuePart2.trainingSeen.pb12ThreeWay=true;
  },()=>{
    const started=startProloguePart2Battle(episode.id,battle,prologuePart2BattleCallbacks(episode,step,battle));
    if(started&&firstThreeWay)showUiNotice('三つ巴では、相手同士も戦います。','success');
  });
}
function prologuePart2Contract(){
  const e=prologuePart2Episode('pb_07'),step=prologuePart2Step(),battle=prologuePart2Data().battles.p2_07_a;
  if(prologuePart2Ui?.id!=='pb_07'||step?.kind!=='event'||prologuePart2Ui.replay)return false;
  if(!prologuePart2EpisodeState(e.id).wonBattleIds.includes(battle.id))return false;
  return resumeProloguePart2Contract(e.id,battle,prologuePart2BattleCallbacks(e,step,battle));
}
function renderProloguePart2Raid(){
  const overlay=document.getElementById('prologuePart2Raid');
  const raid=prologuePart2Raid,card=raid?.cards[raid.index];
  if(!overlay||!raid)return;
  if(!card){overlay.hidden=true;overlay.innerHTML='';prologuePart2Raid=null;raid.resume();return;}
  overlay.hidden=false;
  const production=card.kind==='production';
  overlay.innerHTML=`<section class="story-scene-panel">${production?'':`<strong>${prologuePart2Escape(card.speaker)}</strong><p>${prologuePart2Escape(prologuePart2ResolveText(card))}</p>`}<button type="button" onclick="prologuePart2RaidNext()">次へ</button></section>`;
  overlay.querySelector('button')?.focus();
}
function prologuePart2RaidNext(){if(prologuePart2Raid){prologuePart2Raid.index++;renderProloguePart2Raid();}}
function prologuePart2EventAction(eventId,action){
  const step=prologuePart2Step();
  if(step?.id!==eventId||step.kind!=='event'||prologuePart2Retry)return false;
  if(prologuePart2Ui.replay)return prologuePart2AdvanceEvent(eventId);
  if(action==='contract')return prologuePart2Contract();
  if(action==='shop')return ProloguePart2Events.openShop(eventId);
  if(action==='synthesis')return ProloguePart2Events.synthesize(eventId);
  if(action==='freeCharacterGacha')return ProloguePart2Events.drawCharacter(eventId);
  if(action==='returnRoute')return prologuePart2OpenReturnRoute(eventId);
  return prologuePart2AdvanceEvent(eventId,{mutate:()=>prologuePart2ApplyMilestone(step)});
}
function prologuePart2EventMarkup(step){
  const id=step.id,action=step.action;
  const button=(key,label)=>`<button type="button" class="map-story-next" onclick="prologuePart2EventAction('${id}','${key}')">${label}</button>`;
  if(prologuePart2Ui.replay)return button('next','次へ');
  if(action==='synthesis')return ProloguePart2Events.synthesisMarkup(id);
  if(action==='linkPractice')return prologuePart2LinkPracticeMarkup(id);
  if(action==='equipment')return ProloguePart2Events.synthesisEquipMarkup?.(id)||ProloguePart2Events.synthesisResultMarkup()+button('next','次へ');
  if(action==='contract')return button(action,'契約を確認');
  if(action==='shop')return button(action,'ショップを開く');
  if(action==='freeCharacterGacha')return button(action,'無料で1回引く');
  if(action==='returnRoute')return button(action,'バトルから世界地図へ');
  if(action==='lightPath')return button(action,'光の道を渡る');
  if(action==='joinHands')return button(action,'手を重ねる');
  return button(action,prologuePart2Escape(step.label||'次へ'));
}
function prologuePart2Presentation(episode,step,index){
  const portraits=prologuePart2Data().portraits;
  const background=step.background||episode.background||'images/maps/world_between.webp';
  const earlier=episode.steps.slice(Math.max(0,index-4),index+1);
  const cast=[...new Set(earlier.map(s=>s.speaker).filter(name=>portraits[name]))].slice(-2);
  const shown=(Array.isArray(step.cast)?step.cast.filter(name=>portraits[name]):cast).slice(-3);
  return {background,portraits:shown.map((name,i)=>{
    const x=shown.length===1?50:shown.length===2?(i===0?27:73):[20,50,80][i];
    return `<img class="map-story-speaker story-scene-portrait${name===step.speaker?' is-speaking':''}" style="left:${x}%" src="${prologuePart2Escape(portraits[name])}" alt="${prologuePart2Escape(name)}">`;
  }).join('')};
}
function renderProloguePart2(){
  prologuePart2StopText();
  const ui=prologuePart2Ui,episode=prologuePart2Episode(ui?.id),root=prologuePart2Root();
  if(!root||!episode||ui.identity!==saveTransactionIdentity()||prologuePart2Retry)return;
  const index=prologuePart2Index(episode),step=episode.steps[index];
  if(!step)return;
  if(!prologuePart2Conditional(step))return prologuePart2AdvanceEvent(step.id);
  if(step.kind==='battle'&&ui.replay)return prologuePart2AdvanceEvent(step.id);
  const {background,portraits}=prologuePart2Presentation(episode,step,index);
  const textKind=['dialogue','narration','system'].includes(step.kind);
  const production=step.kind==='production';
  const effect=step.effect||(['pb_15_post_05','pb_18_post_01'].includes(step.id)?'closeRift':'');
  const conversation=textKind||production;
  const battle=step.kind==='battle'?prologuePart2Data().battles[step.battleId]:null;
  const text=textKind?prologuePart2ResolveText(step):battle?(battle.contractAllowed?'この戦闘のあと、通常の条件で契約できます。':episode.id==='pb_12'?'今は隊商の退路確保を優先します。通常探索の三つ巴では、結果画面で契約候補を確認できます':'この物語の戦闘では契約できません。通常探索では対象と条件を確認できます。'):'';
  if(textKind&&!ui.seen.some(s=>s.id===step.id))ui.seen.push({id:step.id,text,speaker:step.speaker});
  const label=prologuePart2Label(episode);
  const eventButtons=step.kind==='event'?prologuePart2EventMarkup(step):'';
  const receipt=step.id==='pb_ep_gacha_03'?ProloguePart2Events.characterResultMarkup():step.id==='pb_11_post_01'?ProloguePart2Events.synthesisResultMarkup():'';
  const actions=conversation?'<button type="button" class="map-story-next story-scene-cue" onclick="prologuePart2Tap(event)" aria-label="次へ">▼</button>':
    step.kind==='complete'?`<button type="button" class="map-story-next" onclick="prologuePart2Complete()">${ui.replay?'読み返しを終える':episode.id==='pb_ep'?'序章を終える':label+'を終える'}</button>`:
    battle?`<button type="button" class="map-story-next" onclick="prologuePart2StartBattle()">${step.battleId==='p2_19_b'?'先へ進む':'戦闘開始'}</button><button type="button" onclick="prologuePart2ShowParty()">編成を確認</button><button type="button" onclick="prologuePart2Leave()">戻る</button>`:eventButtons;
  const optional=step.kind==='complete'&&episode.id==='pb_16'?prologuePart2OptionalButtons('episode16'):'';
  const log=ui.seen.map(s=>`<article>${s.speaker?`<b>${prologuePart2Escape(s.speaker)}</b>`:''}<p>${prologuePart2Escape(s.text)}</p></article>`).join('');
  const cinematic=!ui.captionShown;ui.captionShown=true;
  root.innerHTML=`<div class="map-story-scene prologue-part2-scene" data-card="${prologuePart2Escape(step.id)}" data-kind="${step.kind}" data-effect="${prologuePart2Escape(effect)}" onclick="prologuePart2Tap(event)">
    <img class="map-story-bg story-scene-bg" src="${prologuePart2Escape(background)}" alt="">
    <div class="map-story-character-stage">${portraits}</div>
    <div class="prologue-part2-effect" aria-hidden="true"></div>
    <header class="map-story-heading"><span>序章 · ${label}${ui.replay?' · 読み返し':''}</span><h2 id="prologuePart2Title" class="${cinematic?'is-intro':''}">${prologuePart2Escape(episode.title)}</h2></header>
    <nav class="story-scene-tools map-story-tools" aria-label="会話の操作">
      <button type="button" onclick="prologuePart2Log()">ログ</button>
      <button type="button" onclick="prologuePart2ToggleAuto()" aria-pressed="${ui.auto}" ${conversation?'':'disabled'}>自動</button>
      <button type="button" onclick="prologuePart2Leave()" aria-label="会話を閉じて話一覧へ戻る">×</button>
    </nav>
    <section class="map-story-dialogue story-scene-panel" aria-labelledby="prologuePart2Title">
      ${textKind&&step.speaker&&!['地の文','システム','演出'].includes(step.speaker)?`<strong class="story-scene-nameplate">${prologuePart2Escape(step.speaker)}</strong>`:''}
      <div class="map-story-message"><p class="story-scene-text${step.kind!=='dialogue'?' is-narration':''}" id="prologuePart2Text"></p></div>
      ${receipt}<div class="map-story-actions${conversation?' is-conversation':''}">${actions}${optional}</div>
    </section>
    <section id="prologuePart2Log" class="story-scene-log" role="dialog" aria-modal="true" aria-label="会話ログ" hidden><header><strong>会話ログ</strong><button type="button" onclick="prologuePart2Log()">閉じる</button></header><div class="map-story-log-lines">${log}</div></section>
  </div>`;
  const element=document.getElementById('prologuePart2Text');
  if(!conversation){element.textContent=text;return;}
  const animateDone=()=>{
    if(prologuePart2Ui!==ui||prologuePart2Step()!==step||!document.getElementById('prologuePart2Log')?.hidden)return;
    if(ui.auto)ui.autoTimer=setTimeout(()=>prologuePart2AdvanceCard(step),Math.max(850,Math.min(text.length*28,2500)));
  };
  prologuePart2Typewriter=createStoryTypewriter(element,text,animateDone);
}

function prologuePart2OpenReturnRoute(expectedId){
  const context=prologuePart2Ui;
  if(!context||context.replay||prologuePart2Step()?.id!==expectedId)return false;
  context.routeVisit=expectedId;
  showBattleChoices();
  return true;
}
function renderProloguePart2ReturnRoute(){
  const button=document.getElementById('prologuePart2WorldReturn'),ui=prologuePart2Ui;
  if(button)button.hidden=!(ui?.routeVisit&&prologuePart2Step()?.id===ui.routeVisit);
}
function prologuePart2ReturnFromWorld(){
  const ui=prologuePart2Ui;
  if(!ui?.routeVisit||prologuePart2Step()?.id!==ui.routeVisit)return false;
  return prologuePart2AdvanceEvent(ui.routeVisit,{onSaved:()=>{
    ui.routeVisit=null;renderProloguePart2ReturnRoute();prologuePart2Return();
  }});
}
function renderProloguePart2EpisodeCards(){
  if(!prologuePart2Available())return '';
  const current=prologuePart2CurrentEpisode();
  return prologuePart2Episodes().map(e=>{
    const done=prologuePart2EpisodeState(e.id).completed;
    const active=e===current,state=done?'completed':active?'current':'locked';
    const action=done||active?`<button type="button" onclick="openProloguePart2('${e.id}',{replay:${done}})">${done?'読み返す':'つづきから'} ›</button>`:'';
    return `<article class="story-episode-card is-${state}"><img src="${prologuePart2Escape(e.background)}" alt=""><div class="story-episode-copy"><span>序章 ${prologuePart2Label(e)}</span><h3>${prologuePart2Escape(e.title)}</h3>${action}</div><strong class="story-episode-status">${done?'完了':active?'NEXT':'LOCKED'}</strong></article>`;
  }).join('');
}
const PROLOGUE_PART2_OPTION_LABELS={gacha:'キャラクターガチャ',evolution:'特殊進化',rank:'Rank・称号',expedition:'遠征',home:'地上との往復'};
let prologuePart2Optional=null;
function prologuePart2OptionalButtons(location){
  if(!prologuePart2Available())return '';
  const routes=prologuePart2Data()?.optionalRoutes||[];
  return routes.filter(r=>r.location===location&&PROLOGUE_PART2_OPTION_LABELS[r.id]&&(!r.afterEpisode||prologuePart2EpisodeState(r.afterEpisode).completed)).map(r=>
    `<button type="button" onclick="prologuePart2OpenOptional('${r.id}')">${PROLOGUE_PART2_OPTION_LABELS[r.id]}を詳しく聞く</button>`).join('');
}
function prologuePart2RenderOptionalEntry(screen){
  const location={home:'hub',expedition:'expedition'}[screen];
  const section=document.getElementById(screen);
  if(!location||!section)return;
  let el=section.querySelector('[data-prologue-part2-optional-entry]');
  const buttons=prologuePart2OptionalButtons(location);
  if(!el&&!buttons)return;
  if(!el){el=document.createElement('div');el.dataset.prologuePart2OptionalEntry='';section.append(el);}
  el.innerHTML=buttons;
}
function prologuePart2OpenOptional(id){
  const route=prologuePart2Data()?.optionalRoutes?.find(r=>r.id===id);
  const d=document.getElementById('prologuePart2Optional');
  if(!d||!route||!PROLOGUE_PART2_OPTION_LABELS[id]||!prologuePart2Available()||(route.afterEpisode&&!prologuePart2EpisodeState(route.afterEpisode).completed))return false;
  prologuePart2Optional={route,identity:saveTransactionIdentity()};
  const cards=route.cardIds.map(id=>prologuePart2Data().optionalCards.find(c=>c.id===id&&c.display)).filter(Boolean);
  d.innerHTML=`<h2>${PROLOGUE_PART2_OPTION_LABELS[id]}</h2>${cards.map(card=>`<p>${card.kind==='dialogue'?'<strong>'+prologuePart2Escape(card.speaker)+'：</strong>':''}${prologuePart2Escape(prologuePart2ResolveText(card))}</p>`).join('')}<div><button type="button" onclick="prologuePart2CloseOptional(false)">スキップ・閉じる</button>${['gacha','evolution','rank','home'].includes(id)?'<button type="button" onclick="prologuePart2CloseOptional(true)">画面を開く</button>':''}</div>`;
  if(!d.open)d.showModal();
  return true;
}
function prologuePart2CloseOptional(openTarget){
  const previous=prologuePart2Optional;
  document.getElementById('prologuePart2Optional')?.close();prologuePart2Optional=null;
  if(!previous||previous.identity!==saveTransactionIdentity()||!openTarget)return;
  switch(previous.route.id){
    case 'gacha':show('characterGacha');break;
    case 'evolution':show('growthHub');break;
    case 'rank':show('contractorRank');break;
    case 'home':showBattleChoices();break;
  }
}
