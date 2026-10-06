// Test-only fixture shared by VM regression and real-browser smoke. Not loaded by index.html.
async function simultaneousKoScenario({mode='single',cause='player-recoil',reserve=false,enemiesRemain=false}) {
  const assert=(ok,message)=>{if(!ok)throw Error(`${mode}/${cause}/${reserve}/${enemiesRemain}: ${message}`);};
  if(typeof clearTutorialUi==='function')clearTutorialUi();
  save=initSave();save.instances=[];save.party=[];
  if(typeof tutorialSaveDefaults==='function')save.progress.tutorial=tutorialSaveDefaults({legacy:true});
  // Evolved units keep unrelated evolution dialogs out of the outcome matrix.
  save.party.push(addInstance('freiwolf',10).uid);
  if(reserve)save.party.push(addInstance('freiwolf',10).uid);
  prepareBattleParty();
  const request=createHuntRequest(MAPS[0],by('slime'),'normal',[]);
  request.battleMode=mode==='multi'?'three_way':'single';request.secondEnemyId='goblin';
  beginChosenBattle('grassland','slime','normal',request);
  if(mode==='invasion'){
    activeHuntRequest.battleMode='invasion_pending';activeHuntRequest.invasionEnemyId='goblin';activeHuntRequest.invasionTurn=0;
    assert(triggerInvasionIfDue(),'actual invasion transition');
  }
  const multi=mode!=='single', entries=multi?multiBattle.enemies:[];
  const move=['KO検証',1000,'normal',cause.includes('recoil')?'recoil':null];
  const idle=['待機検証',0,'normal','guard'];
  const originals={switchPartyMember,grantPartyExp,progressActiveExpeditions,recordWorldMapVictory,grantContractorBattleWin,showBattleOutcome,getEquippedMovesForInstance,nextEnemyMoveWithKokoroLinkForesight,monSpd,enemyKokoroLinkSpeed,random:Math.random};
  const calls={switches:0,exp:0,expeditions:0,world:0,contractor:0,outcomes:[]};
  switchPartyMember=function(){calls.switches++;return originals.switchPartyMember();};
  for(const [name,key] of [['grantPartyExp','exp'],['progressActiveExpeditions','expeditions'],['recordWorldMapVictory','world'],['grantContractorBattleWin','contractor']]){
    const original=originals[name];
    globalThis[name]=function(...args){calls[key]++;return original(...args);};
  }
  showBattleOutcome=function(result){calls.outcomes.push(result.kind);return originals.showBattleOutcome(result);};
  Math.random=()=>0;
  getEquippedMovesForInstance=()=>[cause==='player-recoil'||cause==='victory'?move:idle];
  nextEnemyMoveWithKokoroLinkForesight=()=>({move:cause==='enemy-recoil'||cause==='defeat'?move:idle});
  monSpd=()=>cause==='enemy-recoil'||cause==='defeat'?0:99999;
  enemyKokoroLinkSpeed=()=>1;
  const coinsBefore=save.coins,winsBefore=save.history.wins||0;
  try {
    pHp=cause==='player-recoil'?8:cause==='poison'||cause==='enemy-recoil'||cause==='defeat'?1:100;
    partyBattle[0].hp=pHp;
    eHp=cause==='enemy-recoil'?8:cause==='poison'||cause==='player-recoil'||cause==='victory'?1:100;
    pAtk=eAtk=1;pGuard=eGuard=pAquaShield=eAquaShield=false;
    if(multi){
      entries[0].hp=eHp;
      // Recoil only attacks one target; the other faction is already defeated.
      entries[1].hp=cause==='poison'?1:0;entries[1].alive=cause==='poison';entries[1].defeatedByPlayer=false;
      if(enemiesRemain){entries[1].hp=100;entries[1].alive=true;}
    }else if(enemiesRemain){
      // Single has one enemy: preserve it for the same nonterminal/death controls.
      if(cause==='player-recoil')eHp=10000;
      if(cause==='enemy-recoil')eHp=100;
      if(cause==='poison')eHp=100;
    }
    if(cause==='poison'){
      pStatus=eStatus='poison';pPoisonTurns=ePoisonTurns=1;
      entries.forEach((e,i)=>{e.status='poison';e.poisonTurns=1;e.poisonSourceIsPlayer=i===0;});
    }
    busy=true;startBattleTurn();
    if(cause==='poison')multi?finishMultiBattleTurn():finishTurnWithPoison();
    else if(multi){
      const enemyActs=cause==='enemy-recoil'||cause==='defeat';
      await runMultiActions([enemyActs?{kind:'enemy',actorId:'enemy_a',move:nextEnemyMoveWithKokoroLinkForesight().move}:{kind:'player',targetId:'enemy_a',move:getEquippedMovesForInstance()[0]}],0);
      // runMultiActions tail recursion intentionally isn't awaited in production.
      for(let i=0;i<30;i++)await Promise.resolve();
    }else{busy=false;await turn(0);}
    const simultaneous=['player-recoil','enemy-recoil','poison'].includes(cause);
    const winning=(simultaneous&&!enemiesRemain)||cause==='victory';
    const dying=cause==='defeat'||(simultaneous&&enemiesRemain);
    const expected=winning?'victory':dying&&!reserve?'defeat':null;
    assert(JSON.stringify(calls.outcomes)===JSON.stringify(expected?[expected]:[]),'correct outcome '+JSON.stringify(calls));
    assert(calls.switches===(dying?1:0),'no unnecessary switch / required switch');
    assert(calls.exp===(winning?1:0)&&calls.expeditions===(winning?1:0)&&calls.world===(winning?1:0)&&calls.contractor===(winning?1:0),'reward and progression once');
    assert(save.history.wins===winsBefore+(winning?1:0),'win counter');
    if(dying&&reserve)assert(activePartyIdx===1&&pHp>0,'living reserve selected');
    if(winning){
      assert(activePartyIdx===0,'same active member at victory');
      assert(save.coins>coinsBefore,'coins granted');
      if(multi){
        assert(entries.every(e=>e.rewardGranted),'each enemy rewarded');
        if(cause==='enemy-recoil')assert(!entries[0].defeatedByPlayer,'enemy recoil has no player attribution');
        if(cause==='player-recoil'||cause==='poison')assert(entries[0].defeatedByPlayer,'player kill / poison attribution');
        assert(!entries[1].defeatedByPlayer,'nonplayer defeated enemy excluded');
      }
      const snapshot=JSON.stringify(save),counterSnapshot=JSON.stringify(calls);
      if(multi){winMultiBattle();await runMultiActions([],0);}else win();
      assert(JSON.stringify(save)===snapshot&&JSON.stringify(calls)===counterSnapshot,'repeated completion grants nothing');
      const stored=localStorage.getItem(SAVE_KEY);
      assert(stored&&JSON.parse(stored).history.wins===save.history.wins,'actual saved victory');
      const reloaded=parseAndPrepareSave(stored,[]);
      for(const key of ['coins','history','party','instances','items','skillCards','equippedSkills','progress'])assert(JSON.stringify(reloaded[key])===JSON.stringify(save[key]),'saved/reloaded '+key);
    }else if(expected===null)assert(!busy,'battle continues and input unlocks');
    return {mode,cause,reserve,enemiesRemain,outcome:expected||'continue',switches:calls.switches};
  }finally{
    for(const [name,fn] of Object.entries(originals))if(name!=='random')globalThis[name]=fn;
    Math.random=originals.random;
  }
}

async function simultaneousKoEnemyAttribution({mode='multi',reserve=false,poison=false}) {
  await simultaneousKoScenario({mode,reserve,cause:'continue'});
  const entries=multiBattle.enemies, originalRandom=Math.random;
  const assert=(ok,msg)=>{if(!ok)throw Error(`${mode}/enemy-attribution/${poison}: ${msg}`);};
  try {
    // Target the other faction through the actual enemy action dispatcher.
    Math.random=()=>.75;
    pHp=poison?1:100;
    entries[0].hp=poison?100:8;entries[1].hp=poison?100:1;entries[1].alive=true;
    if(poison){
      await performMultiAttack(entries[0],entries[1],['敵の毒',1,'normal','poison',1]);
      assert(entries[1].status==='poison'&&!entries[1].poisonSourceIsPlayer,'enemy applied poison source');
      await performMultiAttack(entries[1],entries[0],['敵の毒',1,'normal','poison',1]);
      assert(entries[0].status==='poison'&&!entries[0].poisonSourceIsPlayer,'other enemy applied poison source');
      entries.forEach(e=>{e.hp=1;e.poisonTurns=1;});pStatus='poison';pPoisonTurns=1;
      busy=true;startBattleTurn();finishMultiBattleTurn();
    }else{
      busy=true;startBattleTurn();
      await runMultiActions([{kind:'enemy',actorId:'enemy_a',move:['敵同士の反動',1000,'normal','recoil']}],0);
    }
    assert(multiBattle.finished&&battleRewardGranted&&save.history.wins===1,'victory');
    assert(entries.every(e=>!e.alive&&!e.defeatedByPlayer&&e.rewardGranted),'no enemy kill becomes player kill');
    assert(activePartyIdx===0,'no unnecessary switch');
    if(poison)assert(pHp===0,'poison simultaneous KO');
    return {mode,reserve,poison,result:'PASS'};
  }finally{Math.random=originalRandom;}
}
