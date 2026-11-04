// Only progress and preferences persist. A run and its timers belong to one battle/profile.
let autoRun=null,autoSheetKey=null,autoTimer=null,autoAfterEvolution=null;
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
  if(normalVictoryPending()||!commitSaveMutation(()=>{save.autoBattle.settings[key]=value;})){
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
    body=`<div class="ab-options"><b>回数</b>
      <div>${[1,5,10,20].map(n=>option('times',n,n+'回')).join('')}</div>
      <b>戦闘後の契約</b><div>${option('contract','skip','契約しない')}${option('contract','pause','止めて契約する')}</div>
      <b>止める条件</b><label><input type="checkbox" checked disabled> 負けたら止める（いつも）</label>
      ${toggle('stopOnBlessEmpty','G-BLESSがなくなったら')}${toggle('stopOnNewDex','図鑑にいないモンスターに会ったら')}</div>`;
  }
  return `<section class="ab-sheet"><button role="switch" aria-checked="${on}" onclick="autoToggleSheet()" ${p.open?'':'disabled'}>
    ⏩ オートで周回　${on?'ON':'OFF'}</button>${body}</section>`;
}
function autoNewRun(map,d,times){
  return {map,d,times,settings:{...save.autoBattle.settings},identity:saveTransactionIdentity(),phase:'depart',manual:false,
    battles:[],coins:0,exp:{},items:{},bless:0,contracts:[],levels:[],stop:false,reason:'',request:null};
}
function autoPrepareDeparture(){
  if(!autoRun&&autoSheetKey===worldMapSelectedId+':'+worldMapSelectedDifficulty)
    autoRun=autoNewRun(worldMapSelectedId,worldMapSelectedDifficulty,save.autoBattle.settings.times);
}
function autoBindDeparture(map,request,event){
  if(autoRun?.phase==='depart'&&autoRun.identity!==saveTransactionIdentity()){autoRun=null;return;}
  if(autoRun?.phase!=='depart')return;
  autoRun.request=request;
  autoRun.phase='fight';
  autoRun.manual=false;
  if(!autoField(map,event))autoRun.reason='オート対象外の戦闘';
}
function autoSpeed(){return autoRun?.phase==='fight'&&!autoRun.manual?autoRun.settings.speed:1;}
function autoChooseMove(moves,target,hpRatio){
  if(hpRatio<.35){
    const heal=moves.findIndex(m=>m[3]==='heal'||(m[3]==='tactical'&&tacticalSkillProfile(m)?.heal));
    if(heal>=0)return heal;
  }
  let best=-1,score=-Infinity;
  moves.forEach((m,i)=>{const power=Number(m[1])*typeEff(moveTypes(m),target.types);if(power>score){score=power;best=i;}});
  return best;
}
function autoClearTimer(){clearTimeout(autoTimer);autoTimer=null;}
function autoLater(run,ms,fn){
  autoClearTimer();
  autoTimer=setTimeout(()=>{autoTimer=null;if(autoRun===run&&run.identity===saveTransactionIdentity()&&document.querySelector('#battle.active'))fn();},ms);
}
function autoFoes(){return multiBattle?.active?aliveMultiEnemies().map(e=>e.mon):[enemy];}
function autoAct(){
  const r=autoRun;
  if(!r||r.phase!=='fight'||r.request!==activeHuntRequest||r.manual||!battleUiCanAct())return;
  if(tutorialUiState.active){autoLater(r,350,autoAct);return;}
  if(!autoEligible())r.reason='オート対象外の戦闘';
  const fresh=r.settings.stopOnNewDex&&autoFoes().find(m=>m&&!isCharacterUnit(m)&&!caughtHas(m.id));
  if(fresh)r.reason=fresh.name+'は図鑑にいないモンスター';
  if(r.reason){autoSummary(true);return;}
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
  else if(action==='manual')autoRun.manual=!autoRun.manual;
  else if(action==='speed'){
    const speed=autoRun.settings.speed===1?2:1;
    if(autoChangeSetting('speed',speed))autoRun.settings.speed=speed;
  }else if(action==='end')autoRun.stop=!autoRun.stop;
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
    if(!r.manual&&!busy&&autoTimer===null)autoLater(r,480/autoSpeed(),autoAct);
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
  autoClearTimer();autoRun=null;
}
function autoStopReason(run,bless){
  if(run.stop)return 'この戦闘で終了';
  if(bless&&run.settings.stopOnBlessEmpty&&gBlessTotal(save.gBless)===0)return 'G-BLESSがなくなった';
  return run.battles.length>=run.times?'設定回数を完了':'';
}
function autoVictoryCommitted(receipt,outcome){
  const r=autoRun;
  if(!r||r.phase!=='fight'||r.request!==activeHuntRequest)return;
  autoClearTimer();r.phase='between';r.battles.push('win');
  const before=JSON.parse(receipt.before);
  r.coins+=save.coins-before.coins;
  for(const ins of getPartyInstances()){
    const old=before.instances.find(x=>x.uid===ins.uid);
    if(!old)continue;
    let exp=ins.exp-old.exp;
    for(let lv=old.level;lv<ins.level;lv++)exp+=needExp(lv);
    const row=r.exp[ins.uid]||={name:by(ins.id).name,total:0};
    row.total+=exp;
    if(old.level<ins.level)r.levels.push(row.name+' Lv.'+old.level+' → '+ins.level);
  }
  for(const [id,count] of Object.entries(save.items)){
    const n=count-(before.items[id]||0);if(n>0)r.items[id]=(r.items[id]||0)+n;
  }
  if(outcome.bless)r.bless++;
  r.reason=autoStopReason(r,outcome.bless);
  const candidates=(receipt.multi?multiBattle.enemies.filter(e=>e.defeatedByPlayer).map(e=>({mon:e.mon,entry:e.id})):[{mon:enemy}]).filter(c=>isContractableUnit(c.mon));
  r.offers=candidates.map(c=>{const offer={...c,result:'見送り'};r.contracts.push(offer);return offer;});
  const pause=candidates.length&&r.settings.contract==='pause';
  const actions=document.getElementById('battleOutcomeActions');
  actions.replaceChildren();document.getElementById('next').classList.add('hidden');
  actions.textContent=candidates.length?(pause?'契約のチャンス！':'契約のチャンス → 設定どおり見送り'):'';
  autoLater(r,1300,()=>pause?autoContractOffer():autoAdvance());
}
function autoContractOffer(){
  const r=autoRun;if(!r||!['between','offer'].includes(r.phase))return;
  r.phase='offer';
  const actions=document.getElementById('autoContractChoices');
  document.getElementById('contractConfirm').classList.add('ab-contract');
  actions.hidden=false;show('contractConfirm');
  actions.innerHTML=r.offers.map((c,i)=>'<div class="ab-offer">'+vis(c.mon)+'<b>'+c.mon.name+'と契約できそうだ！</b>'+SHOP_ITEMS.filter(it=>it.contract&&save.items[it.id]>0).map(it=>'<button onclick="autoContract('+i+',\''+it.id+'\')">'+it.name+' ×'+save.items[it.id]+'</button>').join('')+'</div>').join('')+'<button onclick="autoContractDecision()">今回は契約しない</button>';
}
async function autoContract(i,itemId){
  const r=autoRun,c=r?.offers[i];
  if(!c||r.phase!=='offer'||!ITEM_BY_ID[itemId]?.contract||!save.items[itemId])return;
  r.phase='contract';document.getElementById('battleOutcomeActions').replaceChildren();
  const count=save.instances.length;
  if(c.entry){pendingMultiBattleContractId=c.entry;enemy=c.mon;}
  const committed=await (c.entry?useMultiBattleContractScroll(itemId):tryContractWithScroll(itemId));
  if(autoRun!==r)return;
  if(!committed){r.phase='offer';autoContractOffer();return;}
  c.result=save.instances.length>count?'成功':'失敗';
  autoContractDecision(c.mon.name+'との契約に'+c.result);
}
function autoContractDecision(message='契約を見送りました'){
  const r=autoRun;if(!r||!['contract','offer'].includes(r.phase))return;
  r.phase='decision';show('battle');
  document.getElementById('battleOutcomeActions').innerHTML='<p>'+message+'</p>'+(r.reason?'<button onclick="autoAdvance()">周回の結果へ</button>':'<button onclick="autoAdvance()">周回を続ける（残り'+(r.times-r.battles.length)+'回）</button><button onclick="autoEndAfterContract()">ここで周回を終える</button>');
}
function autoEndAfterContract(){if(autoRun?.phase==='decision'){autoRun.reason='契約のあと終了';autoAdvance();}}
function autoLost(kind){
  if(autoRun?.phase!=='fight'||autoRun.request!==activeHuntRequest)return;
  autoClearTimer();autoRun.battles.push(kind);autoRun.reason=kind==='defeat'?'負けた':'撤退した';autoSummary(false);
}
function autoAdvance(){
  const r=autoRun;if(!r||!['between','decision'].includes(r.phase))return;
  if(r.reason){autoSummary(false);return;}
  endPartyRecovery();hideBattleOutcome();worldMapDeparting=false;resetHuntRequestChoices();
  r.phase='depart';
  if(!startWorldMapExploration(r.map,r.d)){r.reason='出発できませんでした';autoSummary(false);}
}
function autoSummary(live){
  const r=autoRun;if(!r)return;
  autoClearTimer();r.phase='summary';
  const dialog=document.getElementById('autoSummary'),wins=r.battles.filter(x=>x==='win').length,loss=r.battles.filter(x=>x==='defeat').length;
  const rows=Object.entries(r.items).map(([id,n])=>(ITEM_DEX_BY_ID[id]?.name||id)+' ×'+n);
  const early=r.battles.length<r.times?'・途中で終了':'';
  const experience=Object.values(r.exp).map(x=>`<p>${x.name}　EXP +${x.total}</p>`).join('');
  const contracts=r.contracts.map(c=>c.mon.name+'：'+c.result).join('、')||'なし';
  const actions=live?`<button onclick="autoCloseResult('manual')">手動で戦闘を続ける</button>`
    :`<button onclick="autoCloseResult('map')">世界地図へ</button>
      <button onclick="autoCloseResult('repeat')">もう一度 ×${r.times}</button>`;
  dialog.innerHTML=`<small>AUTO RESULT</small><h2>オート周回の結果</h2>
    <p>${selectedMap.name} / ${huntDifficulty(r.d).label}　${r.battles.length}戦${early}</p>
    <div class="ab-bars">${autoBars(r)}</div><strong>${wins}勝　${loss}敗</strong><p>${r.reason}</p>
    <h3>手に入れたもの</h3><p>コイン +${r.coins}${r.bless?'（G-BLESS ×2 適用あり）':''}</p>
    ${experience}<p>素材・アイテム：${rows.join('、')||'なし'}</p>
    <p>G-BLESS 使用 ${r.bless}（残り ${gBlessTotalText(save.gBless)}）</p>
    <h3>契約のチャンス</h3><p>${contracts}</p>${actions}`;
  dialog.oncancel=e=>e.preventDefault();dialog.showModal();
}
function autoCloseResult(target){
  const r=autoRun;if(r?.phase!=='summary')return;
  if(worldMapBattleSavePending()&&recordWorldMapBattleResult({saveNow:true})===null){showUiNotice('世界地図の保存を再試行してください。','error');return;}
  document.getElementById('autoSummary').close();autoRun=null;autoSheetKey=null;
  if(r.levels.length)showUiNotice(r.levels.join('、'));
  if(target==='manual'){syncBattleUi();return;}
  afterBattleNext();
  if(currentEvolution){autoAfterEvolution={target,run:r};return;}
  if(target==='repeat')autoRepeat(r);
}
function autoRepeat(r){
  autoRun=autoNewRun(r.map,r.d,r.times);
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
