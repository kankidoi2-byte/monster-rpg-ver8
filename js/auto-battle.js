// Timers are local to this page. The save holds the last committed round boundary.
let autoRun=null,autoSheetKey=null,autoTimer=null,autoAfterEvolution=null;
let autoTask=null;
// Catch-up budgets use a nominal turn length. Foreground motion retains its own timing.
const AUTO_TURN_MS=1200;
const AUTO_BETWEEN_MS=1300;
const AUTO_MAX_CATCHUP_MS=10*60*1000;
const AUTO_MAX_CATCHUP_TURNS=300;
const autoRules={
  field:{
    targets:(map,difficulty)=>worldMapCandidates(map,difficulty),
    complete:({targets,known})=>targets.length>0&&targets.every(m=>known.has(m.id))
  }
};
function autoField(map,eventKey){
  return map&&!eventKey&&!map.goldenLand&&!map.bossOnly&&!map.rareOnly&&gBlessUnlocked()
    &&!(typeof tutorialBattleSession!=='undefined'&&tutorialBattleSession.active);
}
function autoEligible(){
  return activeHuntRequest&&autoField(selectedMap,activeHuntRequest.worldMapEventKey)
    &&!activeHuntRequest.source&&!activeHuntRequest.goldenLandMapEntry;
}
function autoProgress(map,difficulty){
  const key=map.id+':'+difficulty;
  const targets=[...new Map(autoRules.field.targets(map,difficulty).map(m=>[m.id,m])).values()];
  const known=new Set(save.autoBattle.defeated[key]);
  return {key,targets,known,count:targets.filter(m=>known.has(m.id)).length,open:save.autoBattle.unlocked.includes(key)};
}
function autoRecordVictory(multi){
  if(!autoEligible())return;
  const p=autoProgress(selectedMap,activeHuntRequest.difficultyId);
  const kills=multi?multiBattle.enemies.filter(e=>e.defeatedByPlayer).map(e=>e.mon.id):[enemy.id];
  for(const m of p.targets)if(kills.includes(m.id))p.known.add(m.id);
  if(p.known.size)save.autoBattle.defeated[p.key]=[...p.known];
  if(!p.open&&autoRules.field.complete(p))save.autoBattle.unlocked.push(p.key);
}
function autoDifficultyLabel(map,d,event){
  if(!autoField(map,event))return '';
  const p=autoProgress(map,d);
  return '<small class="'+(p.open?'ab-clear':'')+'">討伐 '+p.count+'/'+p.targets.length+(p.open?' ✓':'')+'</small>';
}
function autoDepartureLabel(map,d,event){
  return d&&autoField(map,event)&&autoSheetKey===map.id+':'+d.id?'オートで出発 / '+d.label+' × '+save.autoBattle.settings.times+'回':'出発';
}
function autoChangeSetting(key,value){
  if(normalVictoryPending()||!commitSaveMutation(()=>{
    save.autoBattle.settings[key]=value;
    if(key==='speed'&&autoRun?.persistent&&save.autoBattle.run?.phase==='fight')save.autoBattle.run.settings.speed=value;
  })){
    showUiNotice('設定を保存できませんでした。','error');return false;
  }
  return true;
}
function autoRefreshSheet(){renderWorldMap(document.getElementById('battleChoiceList'),{saveNavigation:false});}
function autoToggleSheet(){
  autoSheetKey=autoSheetKey?null:worldMapSelectedId+':'+worldMapSelectedDifficulty;
  autoRefreshSheet();
}
function autoSheet(map,d,event){
  if(!autoField(map,event)){autoSheetKey=null;return '';}
  const p=autoProgress(map,d.id),s=save.autoBattle.settings;
  if(p.key!==autoSheetKey||!p.open)autoSheetKey=null;
  const on=!!autoSheetKey;
  const option=(key,value,label)=>`<button type="button" aria-pressed="${s[key]===value}"
    value="${value}" onclick="autoChangeSetting('${key}',${key==='times'?'Number(this.value)':'this.value'});autoRefreshSheet()">${label}</button>`;
  const toggle=(key,label)=>`<label><input type="checkbox" ${s[key]?'checked':''}
    onchange="autoChangeSetting('${key}',this.checked);autoRefreshSheet()"> ${label}</label>`;
  let body='';
  if(!p.open){
    const roster=p.targets.map(m=>{
      const known=p.known.has(m.id);
      const art=IMG[m.imgKey]?`<img src="${IMG[m.imgKey]}" alt="">`:`<i>${m.icon||'◆'}</i>`;
      return `<span class="${known?'':'ab-shadow'}">${art}<small>${known?'✓ '+m.name:'？'}</small></span>`;
    }).join('');
    body=`<p>🔒 ${d.label}に出てくる相手をすべて倒すと使えます（あと${p.targets.length-p.count}体）</p><div class="ab-roster">${roster}</div>`;
  }else if(on){
    body=`<div class="ab-options"><p>画面を離れても、戻ったときに経過時間ぶん周回します。</p><b>回数</b>
      <div>${[1,5,10,20].map(n=>option('times',n,n+'回')).join('')}</div>
      <b>戦闘後の契約</b><div>${option('contract','skip','契約しない')}${option('contract','pause','止めて契約する')}</div>
      <b>止める条件</b><label><input type="checkbox" checked disabled> 負けたら止める（いつも）</label>
      ${toggle('stopOnBlessEmpty','G-BLESSがなくなったら')}${toggle('stopOnNewDex','図鑑にいないモンスターに会ったら')}</div>`;
  }
  return `<section class="ab-sheet"><button role="switch" aria-checked="${on}" onclick="autoToggleSheet()" ${p.open?'':'disabled'}>
    ⏩ オートで周回　${on?'ON':'OFF'}</button>${body}</section>`;
}
function autoNewRun(map,d,times,persistent=false){
  return {map,d,times,settings:{...save.autoBattle.settings},identity:saveTransactionIdentity(),phase:'depart',manual:false,persistent,
    battles:[],coins:0,exp:{},items:{},bless:0,contracts:[],offerCount:0,levels:[],stop:false,reason:'',request:null,
    credit:0,catchupTurns:0,fast:false,hiddenAt:null,seed:null,fightRandom:null};
}
function autoPrepareDeparture(){
  if(!autoRun&&autoSheetKey===worldMapSelectedId+':'+worldMapSelectedDifficulty)
    autoRun=autoNewRun(worldMapSelectedId,worldMapSelectedDifficulty,save.autoBattle.settings.times,true);
}
function autoSeedRandom(seed){
  // Separate streams keep the encounter and the battle identical after a reload.
  let state=seed>>>0;
  return ()=>{
    state=(state+0x6d2b79f5)>>>0;
    let n=Math.imul(state^(state>>>15),state|1);
    n^=n+Math.imul(n^(n>>>7),n|61);
    return ((n^(n>>>14))>>>0)/4294967296;
  };
}
function autoDepartureRandom(){
  const r=autoRun;
  if(!r?.persistent||r.phase!=='depart')return Math.random;
  r.seed??=Math.floor(Math.random()*4294967296);
  return autoSeedRandom(r.seed);
}
function autoResultSnapshot(r){
  const {battles,coins,exp,items,bless,contracts,offerCount,levels,reason}=r;
  return structuredClone({battles,coins,exp,items,bless,contracts,offerCount,levels,reason});
}
function autoCheckpoint(r,phase,result=autoResultSnapshot(r)){
  return {v:1,map:r.map,d:r.d,times:r.times,settings:{...r.settings},phase,stop:r.stop,
    seed:r.seed??0,at:Math.max(0,Date.now()-r.credit),...result};
}
function autoPersist(r,phase,result){
  if(!r.persistent)return true;
  return commitSaveMutation(()=>{
    if(phase)save.autoBattle.run=autoCheckpoint(r,phase,result);
    else delete save.autoBattle.run;
  },{requireReadable:true});
}
function autoBindDeparture(map,request,event){
  const r=autoRun;
  if(r?.phase!=='depart')return true;
  if(r.identity!==saveTransactionIdentity()){autoRun=null;return false;}
  r.request=request;
  r.phase='fight';
  r.manual=false;
  r.progress=null;
  r.fightRandom=r.persistent?autoSeedRandom(r.seed^0x9e3779b9):null;
  if(!autoField(map,event))r.reason='オート対象外の戦闘';
  if(!r.restoringFight&&!autoPersist(r,'fight')){autoRun=null;return false;}
  r.restoringFight=false;
  return true;
}
function autoFastForward(){return autoRun?.fast===true;}
function autoGrantCatchup(run,elapsed){
  run.credit=Math.min(AUTO_MAX_CATCHUP_MS,run.credit+Math.max(0,elapsed));
  run.catchupTurns=0;
}
function autoSpendCatchup(run,cost,turn=false){
  if(run.credit<cost||(turn&&run.catchupTurns>=AUTO_MAX_CATCHUP_TURNS)){
    run.credit=0;run.fast=false;return false;
  }
  run.credit-=cost;
  if(turn)run.catchupTurns++;
  run.fast=true;
  return true;
}
function autoSpeed(){return autoRun?.phase==='fight'&&!autoRun.manual?autoRun.settings.speed:1;}
function autoChooseMove(moves,target,hpRatio){
  if(hpRatio<.35){
    const heal=moves.findIndex(m=>m[3]==='heal'||(m[3]==='tactical'&&tacticalSkillProfile(m)?.heal));
    if(heal>=0)return heal;
  }
  let best=-1,score=24*typeEff(['normal'],target.types);
  moves.forEach((m,i)=>{
    if(!(Number(m[1])>0))return;
    const power=Number(m[1])*typeEff(moveTypes(m),target.types);
    if(power>score){score=power;best=i;}
  });
  return best;
}
function autoClearTimer(){clearTimeout(autoTimer);autoTimer=null;autoTask=null;}
function autoScheduleTask(){
  const task=autoTask;
  if(!task||document.hidden||autoTimer!==null)return;
  const threshold=task.cost||(task.fn===autoAct?AUTO_TURN_MS/autoSpeed():Infinity);
  const delay=task.run.credit>=threshold?0:Math.max(0,task.due-Date.now());
  autoTimer=setTimeout(()=>{
    autoTimer=null;
    if(autoTask!==task||document.hidden)return;
    autoTask=null;
    const {run,fn,cost}=task;
    if(autoRun!==run||run.identity!==saveTransactionIdentity()||!document.querySelector('#battle.active'))return;
    if(cost)autoSpendCatchup(run,cost);
    fn();
  },delay);
}
function autoLater(run,ms,fn,cost=0){
  autoClearTimer();
  autoTask={run,fn,cost,due:Date.now()+ms};
  autoScheduleTask();
}
function autoVisibilityChanged(){
  const r=autoRun;
  if(!r||r.manual||!['fight','between','depart'].includes(r.phase))return;
  if(document.hidden){
    r.hiddenAt??=Date.now();
    clearTimeout(autoTimer);autoTimer=null;
    return;
  }
  if(r.hiddenAt!==null){autoGrantCatchup(r,Date.now()-r.hiddenAt);r.hiddenAt=null;}
  autoScheduleTask();
}
if(typeof document!=='undefined')document.addEventListener?.('visibilitychange',autoVisibilityChanged);
function autoFoes(){return multiBattle?.active?aliveMultiEnemies().map(e=>e.mon):[enemy];}
// Observe intermediate HP updates too: damage followed by healing is still progress.
// This state belongs only to the current automated battle, never to the save.
function autoObserveProgress(run,completed=false){
  const foes=multiBattle?.active?multiBattle.enemies.map(e=>[e,Math.max(0,e.hp)]):[[enemy,Math.max(0,eHp)]];
  const now=new Map(foes),prior=run.progress;
  if(!prior||battleTurnCount<prior.turn){
    run.progress={turn:battleTurnCount,hp:now,damaged:false,idle:0};return;
  }
  for(const [mon,hp] of prior.hp)if(now.has(mon)&&now.get(mon)<hp)prior.damaged=true;
  prior.hp=now;
  if(completed&&battleTurnCount>prior.turn){
    prior.idle=prior.damaged?0:prior.idle+1;
    prior.turn=battleTurnCount;prior.damaged=false;
    if(prior.idle>=30)run.reason='戦闘が進まないためオートを停止しました';
  }
}
function autoAct(){
  const r=autoRun;
  if(!r||r.phase!=='fight'||r.request!==activeHuntRequest||r.manual||!battleUiCanAct())return;
  if(tutorialUiState.active){r.credit=0;r.fast=false;autoLater(r,350,autoAct);return;}
  autoObserveProgress(r,true);
  if(!autoEligible())r.reason='オート対象外の戦闘';
  const fresh=r.settings.stopOnNewDex&&autoFoes().find(m=>m&&!isCharacterUnit(m)&&!caughtHas(m.id));
  if(fresh)r.reason=fresh.name+'は図鑑にいないモンスター';
  if(r.reason){autoSummary(true);return;}
  autoSpendCatchup(r,AUTO_TURN_MS/autoSpeed(),true);
  const target=multiBattle?.active?aliveMultiEnemies().reduce((a,b)=>a.hp<=b.hp?a:b):null;
  const i=autoChooseMove(getEquippedMovesForInstance(activeInstance),target?.mon||enemy,pHp/instanceMaxHp(activeInstance));
  if(target){multiBattle.pendingMoveIndex=i;startMultiBattleTurn(target.id);}else turn(i);
}
function autoControl(action){
  if(normalVictoryPending()||battleRewardGranted)return;
  if(!autoRun){
    if(action!=='manual'||!autoEligible()||!autoProgress(selectedMap,activeHuntRequest.difficultyId).open)return;
    autoRun=autoNewRun(selectedMap.id,activeHuntRequest.difficultyId,1);
    autoRun.phase='fight';autoRun.request=activeHuntRequest;
  }else if(autoRun.phase!=='fight')return;
  else if(action==='manual'){
    if(!autoRun.manual){
      const result=autoResultSnapshot(autoRun);
      result.reason='手動操作に切り替えた戦闘で中断しました';
      if(!autoPersist(autoRun,'summary',result))return;
      autoRun.credit=0;autoRun.fast=false;autoRun.fightRandom=null;
    }
    autoRun.manual=!autoRun.manual;autoRun.progress=null;
  }
  else if(action==='speed'){
    const speed=autoRun.settings.speed===1?2:1;
    if(autoChangeSetting('speed',speed))autoRun.settings.speed=speed;
  }else if(action==='end'){
    const stop=!autoRun.stop;
    if(autoRun.persistent&&save.autoBattle.run?.phase==='fight'&&
        !commitSaveMutation(()=>{save.autoBattle.run.stop=stop;},{requireReadable:true}))return;
    autoRun.stop=stop;
  }
  autoClearTimer();battleUiClear();syncBattleUi();
}
function autoBars(run){
  return Array.from({length:run.times},(_,i)=>{
    const result=run.battles[i];
    const state=result==='win'?'won':result?'lost':i===run.battles.length&&run.phase==='fight'?'current':'';
    return '<i class="'+state+'"></i>';
  }).join('');
}
function autoSyncBattle(){
  if(autoRun?.phase==='fight'&&!autoRun.manual&&autoRun.request===activeHuntRequest)autoObserveProgress(autoRun);
  const controls=document.getElementById('autoControls');
  if(!controls)return;
  const r=autoRun,screen=document.getElementById('battle'),panel=document.querySelector('#battleMapBanner>.panel');
  if(r?.phase==='fight'&&activeHuntRequest&&screen.classList.contains('active')&&
      r.request===activeHuntRequest&&!autoEligible()&&!battleFeedback.finished){
    r.reason='オート対象外の戦闘';
    autoSummary(true);
  }
  const ready=screen.classList.contains('active')&&!battleFeedback.finished&&!screen.classList.contains('is-finished')&&autoEligible();
  const participating=r?.request===activeHuntRequest&&r?.phase==='fight';
  const visible=ready&&(participating||(!r&&autoProgress(selectedMap,activeHuntRequest.difficultyId).open));
  controls.hidden=!visible;
  screen.classList.toggle('ab-running',Boolean(visible&&participating&&!r.manual));
  const oldBadge=document.getElementById('autoBadge');
  if(!visible||!participating)oldBadge?.remove();
  if(!visible)return;
  const button=(action,label)=>'<button onclick="autoControl(\''+action+'\')">'+label+'</button>';
  let html=button('manual','⏩ オート');
  if(participating){
    let badge=oldBadge;
    if(panel&&!badge){badge=document.createElement('strong');badge.id='autoBadge';panel.prepend(badge);}
    if(badge){badge.textContent=(r.manual?'手動中（オート一時停止）':'AUTO ×'+r.settings.speed)+'　'+(r.battles.length+1)+' / '+r.times+'戦目';badge.classList.toggle('paused',r.manual);}
    const bars=autoBars(r);
    html='<div class="ab-bars">'+bars+'</div>'+button('manual',r.manual?'⏩ オートに戻す':'✋ 手動にする')+button('speed','速度 ×'+r.settings.speed)+button('end',r.stop?'終了を取り消す':'この戦闘で周回を終える');
    if(!r.manual&&!busy&&autoTask===null)autoLater(r,480/autoSpeed(),autoAct);
  }
  if(controls.innerHTML!==html)controls.innerHTML=html;
}
function autoScreenChange(id){
  if(id!=='contractConfirm'){
    document.getElementById('contractConfirm')?.classList.remove('ab-contract');
    const choices=document.getElementById('autoContractChoices');if(choices)choices.hidden=true;
  }
  if(autoAfterEvolution&&!['battleChoices','partySet','evolution'].includes(id))autoAfterEvolution=null;
  if(id!=='battleChoices')autoSheetKey=null;
  if(!autoRun)return;
  if(id==='contractConfirm'&&autoRun.phase==='offer')return;
  if(id==='battle'||(id==='battleItemSelect'&&autoRun.manual))return;
  if(!normalVictoryPending())autoPersist(autoRun,null);
  autoClearTimer();autoRun=null;
}
function autoStopReason(run,bless){
  if(run.stop)return 'この戦闘で終了';
  if(bless&&run.settings.stopOnBlessEmpty&&gBlessTotal(save.gBless)===0)return 'G-BLESSがなくなった';
  return run.battles.length>=run.times?'設定回数を完了':'';
}
function autoPrepareVictory(receipt,outcome){
  const r=autoRun;
  if(!r||r.phase!=='fight'||r.request!==receipt.request)return null;
  const result=autoResultSnapshot(r);
  result.battles.push('win');
  const before=JSON.parse(receipt.before);
  result.coins+=save.coins-before.coins;
  for(const ins of getPartyInstances()){
    const old=before.instances.find(x=>x.uid===ins.uid);
    if(!old)continue;
    let exp=ins.exp-old.exp;
    for(let lv=old.level;lv<ins.level;lv++)exp+=needExp(lv);
    const previous=Object.hasOwn(result.exp,ins.uid)?result.exp[ins.uid].total:0;
    result.exp={...result.exp,[ins.uid]:{monId:ins.id,total:previous+exp}};
    if(old.level<ins.level)result.levels.push(by(ins.id).name+' Lv.'+old.level+' → '+ins.level);
  }
  for(const [id,count] of Object.entries(save.items)){
    const n=count-(before.items[id]||0);
    if(n>0)result.items[id]=(result.items[id]||0)+n;
  }
  if(outcome.bless)result.bless++;
  result.reason=autoStopReason({...r,battles:result.battles},outcome.bless);
  const candidates=(receipt.multi?multiBattle.enemies.filter(e=>e.defeatedByPlayer).map(e=>({mon:e.mon,entry:e.id})):[{mon:enemy,entry:null}])
    .filter(c=>isContractableUnit(c.mon));
  const offers=candidates.map(c=>({monId:c.mon.id,entry:c.entry,result:'見送り'}));
  result.offerCount=offers.length;
  result.contracts.push(...offers);
  const pause=offers.length>0&&r.settings.contract==='pause';
  if(r.persistent)save.autoBattle.run=autoCheckpoint(r,pause?'offer':result.reason?'summary':'next',result);
  return result;
}
function autoVictoryCommitted(outcome,result){
  const r=autoRun;
  if(!result||!r||r.phase!=='fight'||r.request!==activeHuntRequest)return;
  autoClearTimer();r.phase='between';
  Object.assign(r,result);
  const pause=r.offerCount>0&&r.settings.contract==='pause';
  const actions=document.getElementById('battleOutcomeActions');
  actions.replaceChildren();document.getElementById('next').classList.add('hidden');
  actions.textContent=r.offerCount?(pause?'契約のチャンス！':'契約のチャンス → 設定どおり見送り'):'';
  if(typeof renewalAutoBetween==='function')renewalAutoBetween(outcome,pause);
  autoLater(r,AUTO_BETWEEN_MS,()=>pause?autoContractOffer():autoAdvance(),AUTO_BETWEEN_MS);
}
function autoOffers(r){return r.offerCount?r.contracts.slice(-r.offerCount):[];}
function autoContractOffer(){
  const r=autoRun;if(!r||!['between','offer'].includes(r.phase))return;
  r.phase='offer';r.credit=0;r.fast=false;r.hiddenAt=null;
  const actions=document.getElementById('autoContractChoices');
  document.getElementById('contractConfirm').classList.add('ab-contract');
  actions.hidden=false;show('contractConfirm');
  actions.innerHTML=autoOffers(r).map((c,i)=>'<div class="ab-offer">'+vis(by(c.monId))+'<b>'+by(c.monId).name+'と契約できそうだ！</b>'+SHOP_ITEMS.filter(it=>it.contract&&save.items[it.id]>0).map(it=>'<button onclick="autoContract('+i+',\''+it.id+'\')">'+it.name+' ×'+save.items[it.id]+'</button>').join('')+'</div>').join('')+'<button onclick="autoContractDecision()">今回は契約しない</button>';
}
async function autoContract(i,itemId){
  const r=autoRun,c=r&&autoOffers(r)[i];
  if(!c||r.phase!=='offer'||!ITEM_BY_ID[itemId]?.contract||!save.items[itemId])return;
  r.phase='contract';document.getElementById('battleOutcomeActions').replaceChildren();
  const count=save.instances.length;
  if(c.entry){pendingMultiBattleContractId=c.entry;enemy=by(c.monId);}
  const committed=await (c.entry?useMultiBattleContractScroll(itemId):tryContractWithScroll(itemId));
  if(autoRun!==r)return;
  if(!committed){r.phase='offer';autoContractOffer();return;}
  c.result=save.instances.length>count?'成功':'失敗';
  autoContractDecision(by(c.monId).name+'との契約に'+c.result);
}
function autoPrepareContractCheckpoint(target,entry,ok){
  const r=autoRun;
  if(!r?.persistent||r.phase!=='contract')return;
  const result=autoResultSnapshot(r);
  const offer=autoOffers(result).find(c=>c.monId===target.id&&c.entry===entry);
  if(!offer)return;
  offer.result=ok?'成功':'失敗';
  save.autoBattle.run=autoCheckpoint(r,'decision',result);
}
function autoContractDecision(message='契約を見送りました'){
  const r=autoRun;if(!r||!['contract','offer','decision'].includes(r.phase))return;
  if(r.phase==='offer'&&!autoPersist(r,'decision'))return;
  r.phase='decision';show('battle');
  document.getElementById('battleOutcomeActions').innerHTML='<p>'+message+'</p>'+(r.reason?'<button onclick="autoAdvance()">周回の結果へ</button>':'<button onclick="autoAdvance()">周回を続ける（残り'+(r.times-r.battles.length)+'回）</button><button onclick="autoEndAfterContract()">ここで周回を終える</button>');
}
function autoEndAfterContract(){if(autoRun?.phase==='decision'){autoRun.reason='契約のあと終了';autoAdvance();}}
function autoLossResult(r,kind){
  const result=autoResultSnapshot(r);
  result.battles.push(kind);
  result.reason=kind==='defeat'?'負けた':'撤退した';
  return result;
}
function autoPrepareLossCheckpoint(kind){
  const r=autoRun;
  if(!r?.persistent||r.request!==activeHuntRequest)return;
  if(r.phase==='fight')save.autoBattle.run=autoCheckpoint(r,'summary',autoLossResult(r,kind));
  if(r.phase==='summary')save.autoBattle.run=autoCheckpoint(r,'summary');
}
function autoLost(kind){
  if(autoRun?.phase!=='fight'||autoRun.request!==activeHuntRequest)return;
  autoClearTimer();Object.assign(autoRun,autoLossResult(autoRun,kind));autoSummary(false);
}
function autoAdvance(){
  const r=autoRun;if(!r||!['between','decision'].includes(r.phase))return;
  if(r.reason){autoSummary(false);return;}
  endPartyRecovery();hideBattleOutcome();worldMapDeparting=false;resetHuntRequestChoices();
  r.phase='depart';r.seed=null;r.fast=r.credit>0;
  if(!startWorldMapExploration(r.map,r.d)){
    autoRun=r;r.reason='出発できませんでした';autoSummary(false);
  }
}
function autoSummary(live){
  const r=autoRun;if(!r)return;
  autoClearTimer();r.phase='summary';r.credit=0;r.fast=false;
  if(!worldMapBattleSavePending()&&(save.autoBattle.run?.phase!=='summary'||live))autoPersist(r,'summary');
  const dialog=document.getElementById('autoSummary'),wins=r.battles.filter(x=>x==='win').length,loss=r.battles.filter(x=>x==='defeat').length;
  const rows=Object.entries(r.items).map(([id,n])=>(ITEM_DEX_BY_ID[id]?.name||id)+' ×'+n);
  const early=r.battles.length<r.times?'・途中で終了':'';
  const experience=Object.values(r.exp).map(x=>`<p>${by(x.monId)?.name||'仲間'}　EXP +${x.total}</p>`).join('');
  const contracts=r.contracts.map(c=>(by(c.monId)?.name||'モンスター')+'：'+c.result).join('、')||'なし';
  const actions=live?`<button onclick="autoCloseResult('manual')">手動で戦闘を続ける</button>`
    :`<button onclick="autoCloseResult('map')">世界地図へ</button>
      <button onclick="autoCloseResult('repeat')">もう一度 ×${r.times}</button>`;
  dialog.innerHTML=`<small>AUTO RESULT</small><h2>オート周回の結果</h2>
    <p>${MAPS.find(m=>m.id===r.map)?.name||'探索'} / ${huntDifficulty(r.d).label}　${r.battles.length}戦${early}</p>
    <div class="ab-bars">${autoBars(r)}</div><strong>${wins}勝　${loss}敗</strong><p>${battleUiEscape(r.reason)}</p>
    <h3>手に入れたもの</h3><p>コイン +${r.coins}${r.bless?'（G-BLESS ×2 適用あり）':''}</p>
    ${experience}<p>素材・アイテム：${rows.join('、')||'なし'}</p>
    <p>G-BLESS 使用 ${r.bless}（残り ${gBlessTotalText(save.gBless)}）</p>
    <h3>契約のチャンス</h3><p>${contracts}</p>${actions}`;
  dialog.oncancel=e=>e.preventDefault();dialog.showModal();
}
function autoCloseResult(target){
  const r=autoRun;if(r?.phase!=='summary')return;
  if(worldMapBattleSavePending()&&recordWorldMapBattleResult({saveNow:true,autoEnd:r.battles.at(-1)})===null){showUiNotice('世界地図の保存を再試行してください。','error');return;}
  if(!autoPersist(r,null))return;
  document.getElementById('autoSummary').close();autoRun=null;autoSheetKey=null;
  if(r.levels.length)showUiNotice(r.levels.join('、'));
  if(target==='manual'){syncBattleUi();return;}
  afterBattleNext();
  if(currentEvolution){autoAfterEvolution={target,run:r};return;}
  if(target==='repeat')autoRepeat(r);
}
function autoRepeat(r){
  autoRun=autoNewRun(r.map,r.d,r.times,r.persistent);
  Object.assign(autoRun.settings,r.settings);
  worldMapDeparting=false;
  if(!startWorldMapExploration(r.map,r.d))autoRun=null;
}
function autoEvolutionFinished(){
  if(!autoAfterEvolution)return false;
  const {run,target}=autoAfterEvolution;autoAfterEvolution=null;
  if(run.identity!==saveTransactionIdentity())return false;
  showBattleChoices();
  if(target==='repeat')autoRepeat(run);
  return true;
}
function autoResumeSavedRun(){
  const checkpoint=save.autoBattle.run;
  if(autoRun||!checkpoint||!gBlessUnlocked())return false;
  const r=autoNewRun(checkpoint.map,checkpoint.d,checkpoint.times,true);
  Object.assign(r,autoResultSnapshot(checkpoint),{settings:checkpoint.settings,stop:checkpoint.stop,seed:checkpoint.seed});
  autoRun=r;
  if(r.battles.includes('win'))getPartyInstances().forEach(checkEvolution);
  if(checkpoint.phase==='summary'){autoSummary(false);return true;}
  if(!getPartyInstances().length){r.reason='編成が見つからないため周回を終了しました';autoSummary(false);return true;}
  if(checkpoint.phase==='offer'||checkpoint.phase==='decision'){
    prepareBattleParty();
    selectedMap=MAPS.find(m=>m.id===r.map);
    activeHuntRequest=null;normalVictoryReceipt=null;singleBattleContractAttempted=false;
    battleRewardGranted=true;busy=true;
    const offers=autoOffers(r);
    enemy=offers.length?structuredClone(by(offers[0].monId)):null;
    multiBattle=offers.some(c=>c.entry)?{active:true,finished:true,contractAttempts:Object.create(null),
      enemies:offers.map(c=>({...createMultiEnemy(by(c.monId),c.entry),hp:0,alive:false,defeatedByPlayer:true,rewardGranted:true}))}:null;
    r.phase=checkpoint.phase==='offer'?'between':'decision';
    show('battle');
    renderBattleOutcome({kind:'victory',title:'前回の戦闘に勝利',note:'報酬は保存済みです。',restored:true});
    document.getElementById('next').classList.add('hidden');
    if(checkpoint.phase==='offer')autoContractOffer();
    else {
      const tried=offers.find(c=>c.result!=='見送り');
      autoContractDecision(tried?by(tried.monId).name+'との契約に'+tried.result:undefined);
    }
    return true;
  }
  autoGrantCatchup(r,Date.now()-checkpoint.at);
  r.fast=r.credit>0;
  if(checkpoint.phase==='next'){
    r.phase='between';
    autoSpendCatchup(r,AUTO_BETWEEN_MS);
    autoAdvance();
    return true;
  }
  r.restoringFight=true;
  if(!startWorldMapExploration(r.map,r.d)){
    autoRun=r;r.reason='周回を再開できませんでした';autoSummary(false);
  }
  return true;
}
