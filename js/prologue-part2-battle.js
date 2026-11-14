/* Dedicated story combat adapter. Rewards and durable progress belong to the controller. */
let prologuePart2BattleSession=null;
function isProloguePart2Battle(){return activeHuntRequest?.source==='prologue_part2';}
function prologuePart2BattleToken(){return isProloguePart2Battle()?activeHuntRequest:null;}
function prologuePart2SessionValid(token){return !token||(prologuePart2BattleSession?.request===token&&activeHuntRequest===token&&token.identity===saveTransactionIdentity()&&!prologuePart2BattleSession.closed);}
function prologuePart2BattleTokenValid(token){return prologuePart2SessionValid(token)&&(!token||!prologuePart2BattleSession.finished);}
function createProloguePart2Enemy(spec){
  const mon=by(spec?.speciesId);
  if(!mon||!Number.isFinite(spec.level)||spec.level<1||!Array.isArray(spec.moveIds)||!spec.moveIds.length||spec.moveIds.some(id=>!SKILL_BY_ID[id]))throw new Error('prologue_battle_data_missing');
  return {...structuredClone(mon),level:spec.level,moves:spec.moveIds.map(id=>skillToMove(id)),mapStoryFixedMoves:true};
}
function createProloguePart2BattleRequest(episodeId,battle,party){
  if(!/^pb_(07|09|12|13|14|15|17|18|19|20)$/.test(episodeId)||!battle?.id?.startsWith('p2_'+episodeId.slice(3)+'_'))throw new Error('prologue_battle_id');
  if(!['single','three_way','invasion'].includes(battle.mode)||battle.enemies?.length!==(battle.mode==='single'?1:2))throw new Error('prologue_battle_mode');
  battle.enemies.forEach(spec=>{createProloguePart2Enemy(spec);if(!Number.isFinite(spec.attackMultiplier)||spec.attackMultiplier<=0||!Number.isFinite(spec.hpMultiplier)||spec.hpMultiplier<=0)throw new Error('prologue_battle_multiplier');});
  const first=battle.enemies[0];
  const maps={pb_12:'forest',pb_13:'forest',pb_14:'ruined_village',pb_15:'ruined_village',pb_17:'highland_ruins',pb_18:'highland_ruins',pb_19:'starry_plain',pb_20:'starsea'};
  return {source:'prologue_part2',episodeId,battleId:battle.id,identity:saveTransactionIdentity(),participantUids:party.map(p=>p.uid),
    mapId:MAPS.find(m=>m.id===maps[episodeId])?.id||MAPS[0].id,battleBackground:battle.background||null,battleLocation:battle.location||null,enemyId:first.speciesId,difficultyId:'normal',difficultyLabel:'序章後半',enemyLevel:first.level,
    enemyHp:Math.max(1,Math.round(maxHp(by(first.speciesId),first.level)*first.hpMultiplier)),attackMultiplier:first.attackMultiplier,
    rewardMultiplier:1,rewardText:'話完了時のみ',conditions:[],battleMode:battle.mode==='invasion'?'invasion_pending':battle.mode,
    secondEnemyId:battle.mode==='three_way'?battle.enemies[1].speciesId:null,invasionEnemyId:battle.mode==='invasion'?battle.enemies[1].speciesId:null,invasionTurn:1,
    enemies:structuredClone(battle.enemies),contractAllowed:battle.id==='p2_07_a'&&first.speciesId==='slime'&&battle.contractAllowed===true};
}
function startProloguePart2Battle(episodeId,battle,callbacks={}){
  if((typeof normalVictoryPending==='function'&&normalVictoryPending())||(typeof worldMapBattleSavePending==='function'&&worldMapBattleSavePending())||(prologuePart2BattleSession&&!prologuePart2BattleSession.closed))return false;
  const party=getPartyInstances().slice(0,3);if(!party.length)return false;
  if(typeof callbacks.onOutcome!=='function')throw new Error('prologue_outcome_callback_required');
  const request=createProloguePart2BattleRequest(episodeId,battle,party);
  prologuePart2BattleSession={request,battle,callbacks,closed:false,settling:false,finished:false};
  endPartyRecovery();prepareBattleParty(party);
  beginChosenBattle(request.mapId,request.enemyId,'normal',request);
  prologuePart2BattleBanner();
  return request;
}
function prologuePart2BattleBanner(){
  if(!isProloguePart2Battle())return;
  const request=activeHuntRequest,el=document.getElementById('battleMapBanner');
  if(el){el.textContent='';const p=document.createElement('p');p.textContent=request.contractAllowed?'この戦闘の勝利後は通常の条件でスライムと契約できます。':'この物語の戦闘では契約できません。通常探索では対象と条件を確認できます。';el.append(p);
    if(request.episodeId==='pb_09'&&prologuePart2BattleSession?.callbacks.loanHealAvailable?.()){
      const b=document.createElement('button');b.type='button';b.textContent='実習用の回復薬を使う（手持ちは減りません）';b.onclick=useProloguePart2LoanPotion;el.append(b);
    }
  }
  const overlay=document.getElementById('enemyDefeatOverlay');if(overlay)overlay.textContent='道を開いた';
}
function prologuePart2BattleOutcome(kind){
  if(!isProloguePart2Battle())return false;
  const session=prologuePart2BattleSession,request=activeHuntRequest;
  if(!prologuePart2SessionValid(request)||session.settling||session.finished)return true;
  if(kind==='victory'&&request.battleMode==='invasion_pending'){
    // An early KO ends the current round, not the encounter. The scripted intruder still arrives.
    completeBattleTurn();if(pHp<=0&&!switchPartyMember())return true;triggerInvasionIfDue();return true;
  }
  if(kind==='victory'&&(multiBattle?.active?aliveMultiEnemies().length:eHp>0))return true;
  if(kind==='victory'&&pHp<=0&&!partyBattle.some(p=>p.uid!==activeInstance?.uid&&!p.fainted&&p.hp>0))kind='defeat';
  session.settling=true;busy=true;renderBattleInputState();
  const finish=()=>{
    if(!prologuePart2SessionValid(request)||session.finished)return;
    session.finished=true;session.settling=false;battleRewardGranted=kind==='victory';
    if(multiBattle)multiBattle.finished=true;
    completeBattleTurn();resetBattleTransientEffects();resetKokoroLinkBattleState();
    partyBattle.forEach(p=>{p.hp=instanceMaxHp(p.inst);p.fainted=false;});
    if(activeInstance)pHp=instanceMaxHp(activeInstance);
    session.callbacks.onFinished?.(kind,request);
  };
  // A failed durable write leaves combat frozen; controller retries the same completion.
  session.callbacks.onOutcome(kind,request,finish);
  return true;
}
function closeProloguePart2Battle(){
  const session=prologuePart2BattleSession;if(!session)return;
  session.closed=true;prologuePart2BattleSession=null;
  if(activeHuntRequest===session.request){endPartyRecovery();resetBattleTransientEffects();resetKokoroLinkBattleState();multiBattle=null;activeHuntRequest=null;busy=false;battleRewardGranted=false;setMultiBattleLayout(false);hideBattleOutcome();}
}
function prologuePart2InvasionStarted(){
  if(!isProloguePart2Battle())return;
  const session=prologuePart2BattleSession,request=activeHuntRequest;
  prologuePart2BattleBanner();
  if(session.callbacks.onInvasion){busy=true;renderBattleInputState();session.callbacks.onInvasion(()=>{if(prologuePart2SessionValid(request)&&!session.finished){busy=false;renderBattleInputState();}},session.battle.interruptCards||[]);}
}
function prologuePart2ContractAllowed(){return isProloguePart2Battle()&&activeHuntRequest.contractAllowed&&battleRewardGranted&&prologuePart2BattleSession?.finished&&!singleBattleContractAttempted;}
function resumeProloguePart2Contract(episodeId,battle,callbacks){
  closeProloguePart2Battle();
  const request=startProloguePart2Battle(episodeId,battle,callbacks);if(!request)return false;
  if(!request.contractAllowed){closeProloguePart2Battle();return false;}
  eHp=0;battleRewardGranted=true;prologuePart2BattleSession.finished=true;busy=true;
  showBattleOutcome({kind:'victory',title:'契約',note:'契約するかどうかは自由です。',restored:true});
  document.getElementById('next')?.classList.add('hidden');
  renderSingleBattleContractPanel();
  return request;
}
async function tryProloguePart2Contract(itemId='contract_scroll'){
  if(!prologuePart2ContractAllowed()||postBattleContractBusy)return false;
  const session=prologuePart2BattleSession,request=activeHuntRequest,target=enemy;
  if(!ITEM_BY_ID[itemId]?.contract||!(save.items[itemId]>0)||!isContractableUnit(target)||typeof session.callbacks.onContract!=='function')return false;
  const stage=postBattleContractStage(target,itemId,null,false),result=stage===3?'ok':'ng';
  postBattleContractBusy=true;
  const mutate=()=>{if(!(save.items[itemId]>0))throw new Error('prologue_contract_stock');save.items[itemId]--;if(result==='ok'){addInstance(target.id);if(typeof grantContractorContractSuccess==='function')grantContractorContractSuccess(target.id);}};
  const finish=async()=>{
    if(!prologuePart2SessionValid(request))return;
    singleBattleContractAttempted=true;postBattleContractRetry=null;
    try{await playContractAnimation({monsterName:target.name,stage});if(prologuePart2SessionValid(request))session.callbacks.onContractFinished?.(result,request);}
    finally{postBattleContractBusy=false;}
  };
  try{return session.callbacks.onContract(result,request,mutate,finish)!==false;}
  finally{if(!singleBattleContractAttempted)postBattleContractBusy=false;}
}
function skipProloguePart2Contract(){
  if(!prologuePart2ContractAllowed()||postBattleContractBusy)return false;
  const session=prologuePart2BattleSession,request=activeHuntRequest;
  if(typeof session.callbacks.onContract!=='function')return false;
  return session.callbacks.onContract('skip',request,()=>{},()=>{if(prologuePart2SessionValid(request)){singleBattleContractAttempted=true;session.callbacks.onContractFinished?.('skip',request);}});
}
function prologuePart2LoanItemMarkup(){
  if(!isProloguePart2Battle()||activeHuntRequest.episodeId!=='pb_09'||!prologuePart2BattleSession?.callbacks.loanHealAvailable?.())return '';
  return `<button type="button" class="br-item" data-prologue-loan-potion onclick="useProloguePart2LoanPotion()" ${pHp<=0||pHp>=playerMaxHp()?'disabled':''}>実習用の回復薬（手持ちは減りません）</button>`;
}
function useProloguePart2LoanPotion(){
  const session=prologuePart2BattleSession,request=activeHuntRequest;
  if(!isProloguePart2Battle()||request.episodeId!=='pb_09'||busy||session.finished||!session.callbacks.loanHealAvailable?.()||pHp<=0||pHp>=playerMaxHp())return false;
  if(typeof session.callbacks.onLoanHeal!=='function')return false;
  if(typeof renewalClose==='function')renewalClose();
  if(typeof activeScreenId==='function'&&activeScreenId()==='battleItemSelect')show('battle');
  busy=true;renderBattleInputState();
  const saved=session.callbacks.onLoanHeal(()=>{if(!prologuePart2SessionValid(request))return;applyBattleItemEffect('potion',activePartyIdx);prologuePart2BattleBanner();update();battleItemEnemyTurn();});
  if(saved===false){busy=false;renderBattleInputState();}
  return saved;
}
