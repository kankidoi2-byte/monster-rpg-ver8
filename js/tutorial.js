const TUTORIAL_MAIN_FLOW_ID='prologue';
const TUTORIAL_HELP_FLOW_ID='tutorial_help';
const TUTORIAL_THREE_WAY_FLOW_ID='guide_three_way';
const TUTORIAL_INVASION_FLOW_ID='guide_invasion';
const TUTORIAL_KOKORO_LINK_FLOW_ID='guide_kokoro_link';
const TUTORIAL_ALCHEMY_FLOW_ID='guide_alchemy';
const TUTORIAL_EXPEDITION_FLOW_ID='guide_expedition';
const TUTORIAL_FUSION_FLOW_ID='guide_evolution_fusion';
const TUTORIAL_EVOLUTION_FLOW_ID='guide_evolution';
const TUTORIAL_SKILL_CARDS_FLOW_ID='guide_skill_cards';
const TUTORIAL_SKILL_GACHA_FLOW_ID='guide_skill_gacha';
const TUTORIAL_GOLDEN_LAND_FLOW_ID='guide_golden_land';
const TUTORIAL_DEX_FLOW_ID='guide_dex';
const TUTORIAL_SHOP_ITEMS_FLOW_ID='guide_shop_items';
const TUTORIAL_BATTLE_ITEMS_FLOW_ID='guide_battle_items';
const TUTORIAL_CONTRACTOR_RANK_FLOW_ID='guide_contractor_rank';
const TUTORIAL_CONTRACTOR_TITLES_FLOW_ID='guide_contractor_titles';
const tutorialFlows=new Map();
const tutorialUiState={
  active:false,flowId:null,steps:[],index:0,persist:false,replay:false,
  returnScreen:null,target:null,previousFocus:null,lastFocusedStep:null
};
const TUTORIAL_FIRST_HUNT=Object.freeze({mapId:'grassland',enemyId:'slime',difficultyId:'easy'});
const tutorialBattleSession={active:false,firstSkillUsed:false};

function normalizeTutorialStep(step,index){
  if(!step||typeof step!=='object')return null;
  const id=typeof step.id==='string'&&step.id?step.id:`step_${index+1}`;
  return Object.freeze({
    id,
    title:typeof step.title==='string'&&step.title?step.title:'操作ガイド',
    text:typeof step.text==='string'?step.text:'',
    screenId:typeof step.screenId==='string'&&step.screenId?step.screenId:null,
    target:typeof step.target==='string'&&step.target?step.target:null,
    advanceOnTarget:step.advanceOnTarget===true,
    nextStepId:typeof step.nextStepId==='string'&&step.nextStepId?step.nextStepId:null,
    replayNextStepId:typeof step.replayNextStepId==='string'&&step.replayNextStepId?step.replayNextStepId:null,
    persistAs:typeof step.persistAs==='string'&&step.persistAs?step.persistAs:null,
    waitForEvent:typeof step.waitForEvent==='string'&&step.waitForEvent?step.waitForEvent:null,
    externalAdvance:step.externalAdvance===true,
    disableBack:step.disableBack===true,
    requiredPartyMin:Math.max(0,Math.floor(Number(step.requiredPartyMin)||0)),
    requiredPartyMax:Math.max(0,Math.floor(Number(step.requiredPartyMax)||0)),
    continueAt:typeof step.continueAt==='string'&&step.continueAt?step.continueAt:null,
    progressLabel:typeof step.progressLabel==='string'&&step.progressLabel?step.progressLabel:'TUTORIAL',
    nextLabel:typeof step.nextLabel==='string'&&step.nextLabel?step.nextLabel:null
  });
}
function registerTutorialFlow(flowId,steps){
  if(typeof flowId!=='string'||!flowId||!Array.isArray(steps))return false;
  const normalized=steps.map(normalizeTutorialStep).filter(Boolean);
  if(!normalized.length)return false;
  tutorialFlows.set(flowId,Object.freeze(normalized));
  return true;
}
function tutorialFlowSteps(flowId){return tutorialFlows.get(flowId)||[];}
function startTutorialFeatureGuide(guideId,flowId){
  const steps=tutorialFlowSteps(flowId);
  if(!steps.length||tutorialUiState.active||typeof currentTutorialState!=='function')return false;
  const tutorial=currentTutorialState();
  if(tutorial.guides?.[guideId])return false;
  if(typeof markTutorialGuideSeen!=='function'||!markTutorialGuideSeen(guideId))return false;
  if(typeof saveGame==='function'&&!saveGame()){
    const current=currentTutorialState();
    if(current.guides)current.guides[guideId]=false;
    return false;
  }
  return startTutorialFlow(flowId,{persist:false});
}
function activeScreenId(){return document.querySelector('.screen.active')?.id||null;}
function tutorialStepIndex(steps,stepId){
  if(!stepId)return 0;
  const index=steps.findIndex(step=>step.id===stepId);
  return index;
}
function persistedTutorialStepId(step){return step?.persistAs||step?.id||null;}

function calculateTutorialPlacement(targetRect,bubbleSize,viewport,options={}){
  const margin=Math.max(0,Number(options.margin)||10);
  const gap=Math.max(0,Number(options.gap)||16);
  const width=Math.min(Number(bubbleSize?.width)||360,Math.max(0,viewport.width-margin*2));
  const height=Math.min(Number(bubbleSize?.height)||240,Math.max(0,viewport.height-margin*2));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  if(!targetRect){
    return {left:clamp((viewport.width-width)/2,margin,viewport.width-width-margin),top:clamp((viewport.height-height)/2,margin,viewport.height-height-margin),maxHeight:viewport.height-margin*2,side:'center'};
  }
  const below=Math.max(0,viewport.height-targetRect.bottom-gap-margin);
  const above=Math.max(0,targetRect.top-gap-margin);
  const side=below>=Math.min(height,180)||below>=above?'below':'above';
  const available=side==='below'?below:above;
  const maxHeight=Math.max(96,available);
  const fittedHeight=Math.min(height,maxHeight);
  const top=side==='below'?targetRect.bottom+gap:targetRect.top-gap-fittedHeight;
  const centered=targetRect.left+(targetRect.width-width)/2;
  return {left:clamp(centered,margin,viewport.width-width-margin),top:clamp(top,margin,viewport.height-fittedHeight-margin),maxHeight,side};
}

function setTutorialShadeRect(element,top,left,width,height){
  if(!element)return;
  element.style.top=`${Math.max(0,top)}px`;
  element.style.left=`${Math.max(0,left)}px`;
  element.style.width=`${Math.max(0,width)}px`;
  element.style.height=`${Math.max(0,height)}px`;
}
function clearTutorialTarget(){
  tutorialUiState.target?.classList.remove('tutorial-target-active');
  tutorialUiState.target=null;
}
function positionTutorialUi(){
  if(!tutorialUiState.active)return;
  const bubble=document.getElementById('tutorialBubble');
  const spotlight=document.getElementById('tutorialSpotlight');
  const arrow=document.getElementById('tutorialArrow');
  const topShade=document.querySelector('.tutorial-shade-top');
  const leftShade=document.querySelector('.tutorial-shade-left');
  const rightShade=document.querySelector('.tutorial-shade-right');
  const bottomShade=document.querySelector('.tutorial-shade-bottom');
  if(!bubble)return;
  const viewport={width:window.innerWidth,height:window.innerHeight};
  const rect=tutorialUiState.target?.getBoundingClientRect?.()||null;
  let hole=null;
  if(rect&&rect.width>0&&rect.height>0){
    const pad=8;
    hole={
      top:Math.max(4,rect.top-pad),left:Math.max(4,rect.left-pad),
      right:Math.min(viewport.width-4,rect.right+pad),bottom:Math.min(viewport.height-4,rect.bottom+pad)
    };
    hole.width=Math.max(0,hole.right-hole.left);hole.height=Math.max(0,hole.bottom-hole.top);
    setTutorialShadeRect(topShade,0,0,viewport.width,hole.top);
    setTutorialShadeRect(leftShade,hole.top,0,hole.left,hole.height);
    setTutorialShadeRect(rightShade,hole.top,hole.right,viewport.width-hole.right,hole.height);
    setTutorialShadeRect(bottomShade,hole.bottom,0,viewport.width,viewport.height-hole.bottom);
    spotlight?.classList.remove('is-empty');
    if(spotlight){setTutorialShadeRect(spotlight,hole.top,hole.left,hole.width,hole.height);}
  }else{
    setTutorialShadeRect(topShade,0,0,viewport.width,viewport.height);
    [leftShade,rightShade,bottomShade].forEach(element=>setTutorialShadeRect(element,0,0,0,0));
    spotlight?.classList.add('is-empty');
  }
  bubble.style.visibility='hidden';
  bubble.style.maxHeight='calc(100svh - 20px)';
  const placement=calculateTutorialPlacement(hole,bubble.getBoundingClientRect(),viewport);
  bubble.style.left=`${placement.left}px`;
  bubble.style.top=`${placement.top}px`;
  bubble.style.maxHeight=`${placement.maxHeight}px`;
  bubble.style.visibility='visible';
  arrow?.classList.toggle('is-empty',!hole||placement.side==='center');
  if(arrow&&hole&&placement.side!=='center'){
    arrow.className=`tutorial-arrow is-${placement.side==='below'?'up':'down'}`;
    arrow.style.left=`${Math.max(12,Math.min(viewport.width-34,hole.left+hole.width/2-11))}px`;
    arrow.style.top=`${placement.side==='below'?hole.bottom+1:hole.top-16}px`;
  }
}
function scheduleTutorialPosition(){requestAnimationFrame(()=>requestAnimationFrame(positionTutorialUi));}

function renderTutorialStep(){
  if(!tutorialUiState.active)return;
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(!step){finishTutorialFlow();return;}
  prepareTutorialStep(step);
  if(step.screenId&&activeScreenId()!==step.screenId){
    show(step.screenId);
    setTimeout(renderTutorialStep,0);
    return;
  }
  const overlay=document.getElementById('tutorialOverlay');
  const bubble=document.getElementById('tutorialBubble');
  if(!overlay||!bubble)return;
  clearTutorialTarget();
  tutorialUiState.target=step.target?document.querySelector(step.target):null;
  tutorialUiState.target?.classList.add('tutorial-target-active');
  document.getElementById('tutorialProgressLabel').textContent=step.progressLabel;
  document.getElementById('tutorialProgressText').textContent=`${tutorialUiState.index+1} / ${tutorialUiState.steps.length}`;
  document.getElementById('tutorialProgressBar').style.width=`${(tutorialUiState.index+1)/tutorialUiState.steps.length*100}%`;
  document.getElementById('tutorialTitle').textContent=step.title;
  document.getElementById('tutorialText').textContent=step.text;
  const back=document.getElementById('tutorialBackButton');
  const skip=document.getElementById('tutorialSkipButton');
  const next=document.getElementById('tutorialNextButton');
  back.disabled=tutorialUiState.index===0||step.disableBack;
  skip.textContent=tutorialUiState.persist?'スキップ':'閉じる';
  next.textContent=step.nextLabel||(tutorialUiState.index===tutorialUiState.steps.length-1?'完了':'次へ');
  next.disabled=step.externalAdvance;
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden','false');
  scheduleTutorialPosition();
  if(tutorialUiState.lastFocusedStep!==step.id){
    tutorialUiState.lastFocusedStep=step.id;
    setTimeout(()=>bubble.focus({preventScroll:true}),0);
  }
}
function persistTutorialStep(){
  if(!tutorialUiState.persist)return;
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(step)setTutorialStep(persistedTutorialStepId(step));
  if(typeof saveGame==='function')saveGame();
  updateTutorialMenuSummary();
}
function startTutorialFlow(flowId,{stepId=null,persist=false,replay=false,returnScreen=null}={}){
  const steps=tutorialFlowSteps(flowId);
  if(!steps.length)return false;
  clearTutorialUi();
  tutorialUiState.active=true;tutorialUiState.flowId=flowId;tutorialUiState.steps=steps;
  tutorialUiState.index=tutorialStepIndex(steps,stepId);tutorialUiState.persist=persist;
  if(tutorialUiState.index<0){clearTutorialUi();return false;}
  tutorialUiState.replay=replay;tutorialUiState.returnScreen=returnScreen;
  tutorialUiState.previousFocus=document.activeElement;tutorialUiState.lastFocusedStep=null;
  if(persist){
    const persistedStepId=persistedTutorialStepId(steps[tutorialUiState.index]);
    if(replay)beginTutorialReplay(persistedStepId);
    else setTutorialStep(persistedStepId);
    if(typeof saveGame==='function')saveGame();
  }
  renderTutorialStep();
  updateTutorialMenuSummary();
  return true;
}
function tutorialPrevious(){
  if(!tutorialUiState.active||tutorialUiState.index<=0)return;
  if(tutorialUiState.steps[tutorialUiState.index]?.disableBack)return;
  tutorialUiState.index-=1;tutorialUiState.lastFocusedStep=null;persistTutorialStep();renderTutorialStep();
}
function tutorialStepCanAdvance(step){
  if(!step?.requiredPartyMin&&!step?.requiredPartyMax)return true;
  const count=typeof getPartyInstances==='function'?getPartyInstances().length:0;
  const below=step.requiredPartyMin&&count<step.requiredPartyMin;
  const above=step.requiredPartyMax&&count>step.requiredPartyMax;
  if(!below&&!above)return true;
  if(typeof showUiNotice==='function')showUiNotice(`パーティーを${step.requiredPartyMin||1}〜${step.requiredPartyMax||3}体で編成してください。`,'warning');
  return false;
}
function checkpointTutorialFlow(step){
  const returnScreen=tutorialUiState.returnScreen;
  if(tutorialUiState.persist&&step?.continueAt){
    setTutorialStep(step.continueAt);
    if(typeof saveGame==='function')saveGame();
  }
  clearTutorialUi();restoreTutorialReturnScreen(returnScreen);updateTutorialMenuSummary();
}
function tutorialNext(){
  if(!tutorialUiState.active)return;
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(step?.externalAdvance)return;
  if(!tutorialStepCanAdvance(step))return;
  if(step?.waitForEvent){persistTutorialStep();clearTutorialUi();updateTutorialMenuSummary();return;}
  const nextStepId=tutorialUiState.replay&&step?.replayNextStepId?step.replayNextStepId:step?.nextStepId;
  if(nextStepId){
    const nextIndex=tutorialStepIndex(tutorialUiState.steps,nextStepId);
    if(nextIndex<0)return;
    tutorialUiState.index=nextIndex;tutorialUiState.lastFocusedStep=null;persistTutorialStep();renderTutorialStep();return;
  }
  if(tutorialUiState.index>=tutorialUiState.steps.length-1){
    if(step?.continueAt){checkpointTutorialFlow(step);return;}
    finishTutorialFlow();return;
  }
  tutorialUiState.index+=1;tutorialUiState.lastFocusedStep=null;persistTutorialStep();renderTutorialStep();
}
function restoreTutorialReturnScreen(returnScreen){
  if(returnScreen&&activeScreenId()!==returnScreen&&document.getElementById(returnScreen))show(returnScreen);
}
function finishTutorialFlow(){
  if(!tutorialUiState.active)return;
  const persist=tutorialUiState.persist;
  const returnScreen=tutorialUiState.returnScreen;
  if(persist){completeTutorial();if(typeof saveGame==='function')saveGame();}
  clearTutorialUi();restoreTutorialReturnScreen(returnScreen);updateTutorialMenuSummary();
}
function pauseTutorial(){
  if(!tutorialUiState.active)return;
  const returnScreen=tutorialUiState.returnScreen;
  clearTutorialUi();restoreTutorialReturnScreen(returnScreen);updateTutorialMenuSummary();
}
function requestTutorialSkip(){
  if(!tutorialUiState.active)return;
  if(!tutorialUiState.persist){pauseTutorial();return;}
  if(!confirm('必須チュートリアルをスキップしますか？ メニューからいつでも見直せます。'))return;
  const returnScreen=tutorialUiState.returnScreen;
  skipTutorial();if(typeof saveGame==='function')saveGame();
  clearTutorialUi();restoreTutorialReturnScreen(returnScreen);updateTutorialMenuSummary();
}
function clearTutorialUi(){
  const overlay=document.getElementById('tutorialOverlay');
  clearTutorialTarget();
  overlay?.classList.add('hidden');overlay?.setAttribute('aria-hidden','true');
  const previousFocus=tutorialUiState.previousFocus;
  tutorialUiState.active=false;tutorialUiState.flowId=null;tutorialUiState.steps=[];
  tutorialUiState.index=0;tutorialUiState.persist=false;tutorialUiState.replay=false;
  tutorialUiState.returnScreen=null;tutorialUiState.previousFocus=null;tutorialUiState.lastFocusedStep=null;
  previousFocus?.focus?.({preventScroll:true});
}

function updateTutorialMenuSummary(){
  const summary=document.getElementById('tutorialMenuSummary');
  if(!summary||typeof currentTutorialState!=='function')return;
  const tutorial=currentTutorialState();
  if(tutorial.replaying)summary.textContent='再閲覧を途中から続ける';
  else if(tutorial.status==='in_progress')summary.textContent='途中からチュートリアルを続ける';
  else if(tutorial.status==='completed')summary.textContent='完了済み・最初から見直す';
  else if(tutorial.status==='skipped')summary.textContent='スキップ済み・最初から見直す';
  else summary.textContent='基本操作を実画面で確認';
}
function openTutorialFromMenu(){
  const returnScreen=activeScreenId()||'moreMenu';
  const mainSteps=tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID);
  if(mainSteps.length&&typeof currentTutorialState==='function'){
    const tutorial=currentTutorialState();
    const continuing=tutorial.status==='in_progress'||tutorial.replaying;
    return startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{
      stepId:continuing?tutorial.stepId:mainSteps[0].id,
      persist:true,replay:continuing?tutorial.replaying:['completed','skipped'].includes(tutorial.status),returnScreen
    });
  }
  return startTutorialFlow(TUTORIAL_HELP_FLOW_ID,{persist:false,returnScreen});
}
function resumeTutorialIfNeeded(){
  if(document.body.classList.contains('title-mode')||typeof currentTutorialState!=='function')return false;
  const tutorial=currentTutorialState();
  if(tutorialShouldAutoStart())return startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{persist:true});
  if(tutorial.status!=='in_progress'&&!tutorial.replaying)return false;
  return startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:tutorial.stepId,persist:true,replay:tutorial.replaying});
}
function tutorialFeatureGuideForScreen(screenId){
  return ({
    alchemy:['alchemy',TUTORIAL_ALCHEMY_FLOW_ID],
    expedition:['expedition',TUTORIAL_EXPEDITION_FLOW_ID],
    fusion:['evolutionFusion',TUTORIAL_FUSION_FLOW_ID],
    evolution:['evolutionFusion',TUTORIAL_EVOLUTION_FLOW_ID],
    skillEdit:['skillCards',TUTORIAL_SKILL_CARDS_FLOW_ID],
    skillGacha:['skillCards',TUTORIAL_SKILL_GACHA_FLOW_ID],
    dexHub:['dex',TUTORIAL_DEX_FLOW_ID],
    shop:['shopItems',TUTORIAL_SHOP_ITEMS_FLOW_ID],
    battleItemSelect:['shopItems',TUTORIAL_BATTLE_ITEMS_FLOW_ID],
    contractorRank:['contractorRank',TUTORIAL_CONTRACTOR_RANK_FLOW_ID],
    contractorTitles:['contractorRank',TUTORIAL_CONTRACTOR_TITLES_FLOW_ID]
  })[screenId]||null;
}
function handleTutorialScreenChange(screenId){
  updateTutorialMenuSummary();
  if(tutorialUiState.active){setTimeout(renderTutorialStep,0);return;}
  const guide=tutorialFeatureGuideForScreen(screenId);
  if(guide)setTimeout(()=>startTutorialFeatureGuide(guide[0],guide[1]),0);
}
function offerGoldenLandTutorialGuide(){
  return startTutorialFeatureGuide('goldenLand',TUTORIAL_GOLDEN_LAND_FLOW_ID);
}

function tutorialFirstHuntIsPending(){
  if(typeof currentTutorialState!=='function')return false;
  const tutorial=currentTutorialState();
  return (tutorial.status==='in_progress'||tutorial.replaying)&&tutorial.stepId==='first_hunt';
}
function tutorialCurrentStepId(){return tutorialUiState.active?tutorialUiState.steps[tutorialUiState.index]?.id:null;}
function shouldOfferTutorialHunt(){
  return tutorialFirstHuntIsPending()||['first_hunt','tutorial_hunt_request','battle_retry'].includes(tutorialCurrentStepId());
}
function renderTutorialHuntChoice(list){
  if(!list||!shouldOfferTutorialHunt())return false;
  const map=MAPS.find(entry=>entry.id===TUTORIAL_FIRST_HUNT.mapId);
  const mon=by(TUTORIAL_FIRST_HUNT.enemyId);
  if(!map||!mon)return false;
  const difficulty=huntDifficulty(TUTORIAL_FIRST_HUNT.difficultyId);
  const request=registerHuntRequest(createHuntRequest(map,mon,difficulty.id,[]));
  if(typeof registerMapDex==='function'&&registerMapDex(map.id)&&typeof saveGame==='function')saveGame();
  list.innerHTML=`<article class="enemy-choice-card difficulty-card-${difficulty.id}" data-tutorial-hunt="grassland-slime">
    <div class="hunt-card-visual"><img class="map-img" src="${map.image}" alt="${map.name}"><div class="hunt-card-shade"></div>${vis(mon)}
      <div class="hunt-card-badges"><span class="hunt-recommended">最初の依頼</span><span class="hunt-difficulty difficulty-${difficulty.id}">${difficulty.label}</span></div>
      <div class="hunt-card-title"><small>${map.name}</small><h2>${mon.name}</h2><p>${mon.rarity} ${typesHtml(mon.types)}</p></div>
    </div>
    <div class="hunt-card-body"><div class="hunt-primary-rewards"><span><small>ENEMY</small><strong>Lv.${request.enemyLevel}</strong></span><span><small>REWARD</small><strong>×${request.rewardText}</strong></span></div>
      <p class="hunt-danger">${difficulty.danger}</p>
      <button class="hunt-accept-button" data-tutorial-hunt-start onclick="startTutorialHunt('${request.requestId}')">この依頼へ出発 ›</button>
    </div></article>`;
  return true;
}
function startTutorialHunt(requestId){
  const request=preparedHuntRequest(requestId,TUTORIAL_FIRST_HUNT.mapId,TUTORIAL_FIRST_HUNT.enemyId,TUTORIAL_FIRST_HUNT.difficultyId);
  if(!request){showBattleChoices();return false;}
  tutorialBattleSession.active=true;tutorialBattleSession.firstSkillUsed=false;
  startChosenBattle(TUTORIAL_FIRST_HUNT.mapId,TUTORIAL_FIRST_HUNT.enemyId,TUTORIAL_FIRST_HUNT.difficultyId,requestId);
  return true;
}
function handleTutorialFirstSkillUsed(){
  if(!tutorialBattleSession.active||tutorialBattleSession.firstSkillUsed)return false;
  tutorialBattleSession.firstSkillUsed=true;
  return true;
}
function handleTutorialBattleOutcome(kind,rewards={}){
  if(!tutorialBattleSession.active)return false;
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  if(!tutorial||(tutorial.status!=='in_progress'&&!tutorial.replaying)){tutorialBattleSession.active=false;return false;}
  if(kind==='victory'){
    setTutorialStep('first_contract');
    if(typeof saveGame==='function')saveGame();
    startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'victory_exp',persist:true,replay:tutorial.replaying});
    tutorialBattleSession.active=false;
    return true;
  }
  startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'battle_retry',persist:true,replay:tutorial.replaying});
  tutorialBattleSession.active=false;
  return true;
}

function tutorialFirstContractMode(){
  if(typeof currentTutorialState!=='function')return null;
  const tutorial=currentTutorialState();
  if(tutorial.replaying)return 'replay';
  if(tutorial.status!=='in_progress'||tutorial.completed||tutorial.skipped)return null;
  if(!['first_contract','contract_confirm'].includes(tutorial.stepId))return null;
  if(Array.isArray(save?.saveMeta?.migrations)&&save.saveMeta.migrations.includes('v3_to_v4_tutorial_state'))return null;
  if(tutorial.firstContractGuaranteeUsed||tutorial.starterContractScrollGranted)return null;
  return 'required';
}
function tutorialContractTargetIsValid(target=typeof enemy!=='undefined'?enemy:null,map=typeof selectedMap!=='undefined'?selectedMap:null){
  return target?.id===TUTORIAL_FIRST_HUNT.enemyId&&map?.id===TUTORIAL_FIRST_HUNT.mapId;
}
function shouldGuaranteeTutorialContract(target=typeof enemy!=='undefined'?enemy:null,itemId='contract_scroll'){
  return tutorialFirstContractMode()==='required'&&tutorialContractTargetIsValid(target)&&itemId==='contract_scroll';
}
function setTutorialContractContext(){
  const target=by(TUTORIAL_FIRST_HUNT.enemyId);
  const map=MAPS.find(entry=>entry.id===TUTORIAL_FIRST_HUNT.mapId);
  if(!target||!map)return false;
  enemy=structuredClone(target);selectedMap=map;activeHuntRequest=createHuntRequest(map,target,TUTORIAL_FIRST_HUNT.difficultyId,[]);
  battleRewardGranted=true;singleBattleContractAttempted=false;pendingContractItemId='contract_scroll';
  return true;
}
function renderTutorialContractCheckpoint(){
  if(!setTutorialContractContext())return false;
  const mode=tutorialFirstContractMode();
  const battle=document.getElementById('battle');
  const outcome=document.getElementById('battleOutcome');
  const actions=document.getElementById('battleOutcomeActions');
  if(!battle||!outcome||!actions)return false;
  battle.classList.add('is-finished');outcome.className='battle-outcome is-victory';
  document.getElementById('battleOutcomeIcon').textContent='📜';
  document.getElementById('battleOutcomeEyebrow').textContent='CONTRACT CHANCE';
  document.getElementById('battleOutcomeTitle').textContent='草原のスライムと契約';
  document.getElementById('battleOutcomeRewards').innerHTML='<span><small>対象</small><strong>スライム</strong></span><span><small>契約書</small><strong>通常 ×1</strong></span>';
  document.getElementById('battleOutcomeNote').textContent=mode==='replay'?'再閲覧では契約書の支給と成功保証は行いません。':'確認すると通常契約書を1枚支給し、そのまま1枚消費します。';
  actions.innerHTML=mode==='required'
    ? '<div class="multi-contract-panel" id="tutorialContractPanel"><h3>🤝 最初の契約</h3><p class="small">このスライムへの最初の契約だけ、必ず成功します。</p><button data-tutorial-contract-start onclick="askUseContractScroll(\'contract_scroll\')">通常契約書で契約する</button></div>'
    : '<div class="multi-contract-panel" id="tutorialContractPanel"><h3>🤝 契約の再閲覧</h3><p class="small">実際の契約や報酬なしで、加入後の案内を見直します。</p><button data-tutorial-contract-start>加入後の案内へ</button></div>';
  document.getElementById('next')?.classList.add('hidden');
  return true;
}
function commitTutorialFirstContract(itemId='contract_scroll',target=typeof enemy!=='undefined'?enemy:null){
  if(!shouldGuaranteeTutorialContract(target,itemId))return null;
  const snapshot=JSON.stringify(save);
  ensureContractScrollItem();
  save.items.contract_scroll=(save.items.contract_scroll||0)+1;
  if(!markTutorialStarterContractScrollGranted()){save=JSON.parse(snapshot);return null;}
  save.items.contract_scroll--;
  const instance=addInstance(TUTORIAL_FIRST_HUNT.enemyId);
  if(!instance||!markTutorialFirstContractGuaranteeUsed()){save=JSON.parse(snapshot);return null;}
  if(typeof grantContractorContractSuccess==='function')grantContractorContractSuccess(TUTORIAL_FIRST_HUNT.enemyId);
  setTutorialStep('contract_success');
  if(!saveGame()){save=JSON.parse(snapshot);return null;}
  return instance;
}
function handleTutorialContractCommitted(){
  if(tutorialUiState.active)clearTutorialUi();
  updateTutorialMenuSummary();
}
function handleTutorialContractAnimationComplete(){
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  if(!tutorial||tutorial.stepId!=='contract_success'||tutorial.status!=='in_progress')return false;
  return startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'contract_success',persist:true});
}
function tutorialContractInstance(){
  if(!Array.isArray(save?.instances))return null;
  const matches=save.instances.filter(instance=>instance.id===TUTORIAL_FIRST_HUNT.enemyId);
  return matches[matches.length-1]||null;
}
function tutorialContractInstanceUid(){return tutorialContractInstance()?.uid||null;}
function prepareTutorialStep(step){
  if(['first_contract','contract_confirm'].includes(step?.id)){
    setTutorialContractContext();
    if(step.id==='first_contract')renderTutorialContractCheckpoint();
  }
  if(['contract_success','contract_card','contract_type','contract_skills','contract_list','contract_future'].includes(step?.id)){
    if(activeScreenId()==='party'&&typeof renderParty==='function')renderParty();
    if(step.id==='contract_skills')document.querySelector('[data-tutorial-contract-instance] details')?.setAttribute('open','');
  }
}

registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID,[
  {id:'intro_gnosis',screenId:'home',title:'グノーシス',text:'ようこそ、契約者。まずは一緒に冒険する仲間を選びましょう。長い説明はしません。実際の画面で確かめていきます。',progressLabel:'GNOSIS'},
  {id:'party_open',screenId:'home',target:'#homePartyEditButton',advanceOnTarget:true,title:'仲間を選びましょう',text:'「編成」を開いてください。最初に用意された5体から、好きな仲間を選べます。',progressLabel:'GNOSIS'},
  {id:'party_choose',screenId:'partySet',target:'#partySelectList',advanceOnTarget:true,requiredPartyMin:1,requiredPartyMax:3,title:'好きな1体を選んでください',text:'初級剣士エルナ、フレイガル、アクアロン、グラスビート、ボルテックから、まず1体をパーティーに入れてください。',progressLabel:'PARTY'},
  {id:'party_more',screenId:'partySet',target:'#partySelectList',requiredPartyMin:1,requiredPartyMax:3,title:'最大3体まで編成できます',text:'このまま1体でも、あと2体まで加えても構いません。自分の好きな1〜3体を選んで「次へ」を押してください。',progressLabel:'PARTY'},
  {id:'party_leader',screenId:'partySet',target:'#partyCurrentCard',requiredPartyMin:1,requiredPartyMax:3,title:'最初の仲間がリーダーです',text:'並びの最初がバトル開始時のリーダーです。パーティーと順番は、あとからいつでも変更できます。',progressLabel:'PARTY'},
  {id:'home_return',screenId:'partySet',target:'[data-nav="home"]',advanceOnTarget:true,requiredPartyMin:1,requiredPartyMax:3,title:'ホームへ戻りましょう',text:'下の「ホーム」を押してください。選んだパーティーは自動で保存されています。',progressLabel:'HOME'},
  {id:'home_adventure',screenId:'home',target:'#homeAdventureButton',title:'冒険',text:'ここから討伐依頼へ向かいます。次の案内で、最初の依頼を実際に進めます。',progressLabel:'HOME'},
  {id:'home_party',screenId:'home',target:'#homePartyEditButton',title:'パーティー',text:'編成はここから何度でも変更できます。最初に表示される仲間がリーダーです。',progressLabel:'HOME'},
  {id:'home_coin',screenId:'home',target:'.app-resource',title:'コイン',text:'画面上部で所持コインを確認できます。ショップや育成などで使います。',progressLabel:'HOME'},
  {id:'home_menu',screenId:'home',target:'.app-bottom-nav',title:'下部メニュー',text:'ホーム、モンスター、バトル、育成、メニューへは、画面下から移動できます。',progressLabel:'HOME',nextLabel:'最初の依頼へ'},
  {id:'first_hunt',screenId:'home',target:'#homeAdventureButton',advanceOnTarget:true,title:'最初の依頼へ',text:'「冒険」を押してください。草原で待つスライムの入門依頼へ向かいます。',progressLabel:'FIRST HUNT'},
  {id:'tutorial_hunt_request',screenId:'battleChoices',target:'[data-tutorial-hunt-start]',advanceOnTarget:true,persistAs:'first_hunt',title:'草原のスライム',text:'この依頼は既存のEasyルールで進みます。「この依頼へ出発」を押してください。',progressLabel:'FIRST HUNT'},
  {id:'battle_enemy',screenId:'battle',target:'#singleEnemyBox',persistAs:'first_hunt',title:'上が敵です',text:'上側が敵のスライムです。敵のHPを0にすると勝利です。',progressLabel:'BATTLE'},
  {id:'battle_ally',screenId:'battle',target:'#singlePlayerBox',persistAs:'first_hunt',title:'下が味方です',text:'下側が選んだ仲間です。味方のHPが0になると控えへ交代し、全員が倒れると敗北です。',progressLabel:'BATTLE'},
  {id:'battle_hp',screenId:'battle',target:'.battle-vitals',persistAs:'first_hunt',title:'HPを確認',text:'HPは戦える体力です。バーと数値で、敵と味方の残りHPを確認できます。',progressLabel:'BATTLE'},
  {id:'battle_type',screenId:'battle',target:'#singleEnemyBox',persistAs:'first_hunt',title:'属性と相性',text:'モンスターと技には属性があります。有利な属性の技なら、与えるダメージが大きくなります。',progressLabel:'BATTLE'},
  {id:'battle_turn',screenId:'battle',target:'#battleCommandTitle',persistAs:'first_hunt',title:'技を選ぶと1ターン',text:'技を1つ選ぶと1ターン進み、素早さなどで行動順が決まります。',progressLabel:'BATTLE'},
  {id:'battle_skill',screenId:'battle',target:'#battleSkillButton',advanceOnTarget:true,persistAs:'first_hunt',title:'「技」を開く',text:'中央の「技」を押して、装備中の技を開いてください。',progressLabel:'BATTLE'},
  {id:'battle_choose_skill',screenId:'battle',target:'#commands',advanceOnTarget:true,persistAs:'first_hunt',title:'最初の技を使う',text:'好きな技を1つ押してください。威力と属性は技のボタンで確認できます。',progressLabel:'BATTLE'},
  {id:'battle_free',screenId:'battle',target:'.battle-command-dock',persistAs:'first_hunt',waitForEvent:'battle_outcome',title:'ここからは自由に戦えます',text:'説明はここで止めます。技、交代、リンク、道具、逃走を使いながら、スライムを倒してください。',progressLabel:'BATTLE',nextLabel:'戦闘を続ける'},
  {id:'battle_retry',screenId:'battle',target:'#next',advanceOnTarget:true,nextStepId:'tutorial_hunt_request',persistAs:'first_hunt',title:'何度でも再挑戦できます',text:'敗北や撤退でも進行は失われません。「依頼を選び直す」から同じ入門依頼へ戻れます。',progressLabel:'RETRY'},
  {id:'victory_exp',screenId:'battle',target:'#battleRewardExp',persistAs:'first_contract',title:'勝利：経験値',text:'パーティーの仲間が経験値を獲得します。経験値がたまるとレベルが上がり、強くなります。',progressLabel:'VICTORY'},
  {id:'victory_coin',screenId:'battle',target:'#battleRewardCoins',persistAs:'first_contract',title:'勝利：コイン',text:'コインはショップや育成で使います。今回の獲得数は勝利結果で確認できます。',progressLabel:'VICTORY'},
  {id:'victory_material',screenId:'battle',target:'#battleRewardMaterials',persistAs:'first_contract',title:'勝利：素材',text:'バトルでは錬成などに使う素材を獲得することがあります。出なかった場合も、次の勝利でまた抽選されます。',progressLabel:'VICTORY'},
  {id:'victory_rank',screenId:'battle',target:'#battleRewardContractorExp',persistAs:'first_contract',title:'契約者Rank経験値',text:'勝利すると契約者EXPも増えます。冒険全体の歩みを示すRankで、モンスターの戦闘経験値とは別です。',progressLabel:'VICTORY',nextLabel:'契約へ'},
  {id:'first_contract',screenId:'battle',target:'[data-tutorial-contract-start]',advanceOnTarget:true,replayNextStepId:'contract_success',title:'通常契約書を1枚支給します',text:'このスライムへの最初の契約だけ必ず成功します。契約書は通常どおり1枚消費します。',progressLabel:'CONTRACT'},
  {id:'contract_confirm',screenId:'contractConfirm',target:'#contractConfirmAcceptButton',externalAdvance:true,title:'契約を確定',text:'「はい」を押すと、通常契約書1枚の支給と消費、スライムの加入をまとめて保存してから契約演出を再生します。',progressLabel:'CONTRACT',nextLabel:'「はい」を押してください'},
  {id:'contract_success',screenId:'party',target:'[data-tutorial-contract-instance]',disableBack:true,title:'スライムが仲間になりました',text:'契約書が3回反応し、手形が押されると成功です。加入したスライムのカードを確認しましょう。',progressLabel:'NEW ALLY'},
  {id:'contract_card',screenId:'party',target:'[data-tutorial-contract-instance] .monster-roster-summary',title:'仲間のカード',text:'名前、レベル、経験値がカードにまとまっています。育つとHPや攻撃などが強くなります。',progressLabel:'NEW ALLY'},
  {id:'contract_type',screenId:'party',target:'[data-tutorial-contract-instance] .monster-roster-summary',title:'属性',text:'スライムは無属性です。属性は技の相性や、どんな戦い方が得意かを考える手がかりになります。',progressLabel:'NEW ALLY'},
  {id:'contract_skills',screenId:'party',target:'[data-tutorial-contract-instance] [data-tutorial-skill-summary]',title:'技',text:'「育成・個体情報」を開くと装備技を確認できます。技カードを持っていれば、あとから技変更もできます。',progressLabel:'NEW ALLY'},
  {id:'contract_list',screenId:'party',target:'#partyList',title:'仲間の一覧',text:'契約した仲間は「モンスター」の一覧へ追加されます。同じ種類でも別の個体として育てられます。',progressLabel:'NEW ALLY'},
  {id:'contract_future',screenId:'party',target:'[data-tutorial-contract-instance]',title:'次からの契約',text:'必ず成功するのは今回だけです。これ以後の契約は、使う契約書と相手によって失敗することがあります。',progressLabel:'CONTRACT'},
  {id:'growth_open',screenId:'party',target:'[data-nav="growth"]',advanceOnTarget:true,title:'育成へ',text:'下部メニューの「育成」を押してください。仲間を強くする方法を確認します。',progressLabel:'GROWTH'},
  {id:'growth_overview',screenId:'growthHub',target:'#growthMonsterButton',title:'成長の方法',text:'「モンスター育成」では、経験値によるレベルアップや技変更を確認できます。進化・合成や錬成でも仲間を育てられます。',progressLabel:'GROWTH'},
  {id:'party_edit_open',screenId:'growthHub',target:'#growthPartyEditButton',advanceOnTarget:true,title:'パーティー編成',text:'加入したスライムも、ここから最大3体のパーティーへ入れられます。編成はいつでも変更できます。',progressLabel:'GROWTH'},
  {id:'party_edit_contract',screenId:'partySet',target:'[data-tutorial-contract-party]',title:'加入した仲間を編成できます',text:'スライムを今すぐ入れても、控えで育てても構いません。最初の仲間がリーダーというルールは同じです。',progressLabel:'PARTY'},
  {id:'home_finish',screenId:'partySet',target:'[data-nav="home"]',advanceOnTarget:true,title:'ホームへ戻りましょう',text:'最後にホームへ戻って、基本チュートリアルを完了します。',progressLabel:'FINISH'},
  {id:'tutorial_complete',screenId:'home',target:'#homeGrowthPreview',title:'基本チュートリアル完了',text:'これで準備は完了です。次の討伐へ進むか、ホームの成長目標を見ながら仲間を育ててください。',progressLabel:'GNOSIS',nextLabel:'完了'}
]);
registerTutorialFlow(TUTORIAL_HELP_FLOW_ID,[
  {id:'help_spotlight',screenId:'home',target:'#homeAdventureButton',title:'実際の画面を見ながら進めます',text:'案内する操作だけを明るい枠で示します。照らされたボタンは、そのままタップやキーボードで操作できます。',progressLabel:'GUIDE UI'},
  {id:'help_controls',title:'止めても、あとから続けられます',text:'「戻る」で説明を見直せます。本編チュートリアルは×で閉じると現在位置を保存し、確認してからスキップでき、メニューから再閲覧できます。',progressLabel:'GUIDE UI',nextLabel:'メニューへ戻る'}
]);
registerTutorialFlow(TUTORIAL_THREE_WAY_FLOW_ID,[
  {id:'three_way_intro',screenId:'battle',target:'#multiEnemyGrid',title:'三つ巴バトル',text:'敵が2体いる特殊戦です。敵Aと敵Bは、契約者だけでなく敵同士も攻撃します。',progressLabel:'THREE-WAY'},
  {id:'three_way_target',screenId:'battle',target:'#battleSkillButton',title:'技のあとに対象を選択',text:'技を選んだあと、光っている敵カードをタップして攻撃対象を決めます。倒れた敵は選べません。',progressLabel:'THREE-WAY'},
  {id:'three_way_contract',screenId:'battle',target:'#multiEnemyGrid',title:'契約候補に注意',text:'契約候補になるのは、契約者側が倒した相手だけです。もう一方の敵に倒された相手とは契約できません。',progressLabel:'THREE-WAY',nextLabel:'戦闘へ戻る'}
]);
registerTutorialFlow(TUTORIAL_INVASION_FLOW_ID,[
  {id:'invasion_intro',screenId:'battle',target:'#multiEnemyGrid',title:'乱入が発生しました',text:'通常の1対1戦では、2〜4ターン目に別の敵が乱入することがあります。発生率や登場ターンは通常ルールのままです。',progressLabel:'INVASION'},
  {id:'invasion_wait',screenId:'battle',target:'#multiEnemyGrid',title:'登場したターンは行動しません',text:'乱入した敵は周囲を警戒し、このターンは行動しません。次のターンから三つ巴と同じように戦います。',progressLabel:'INVASION',nextLabel:'戦闘へ戻る'}
]);
registerTutorialFlow(TUTORIAL_KOKORO_LINK_FLOW_ID,[
  {id:'kokoro_link_intro',screenId:'battle',target:'#kokoroLinkPanel',title:'ココロリンク',text:'控えモンスター1体の力を、戦闘中の仲間へ借りられます。発動してもターンは消費しません。',progressLabel:'KOKORO LINK'},
  {id:'kokoro_link_source',screenId:'battle',target:'#kokoroLinkPanel .kokoro-link-source-grid',title:'控えを1体選択',text:'効果は控えのレアリティや属性で変わり、戦闘終了まで続きます。同じ控えが力を貸せるのは1戦につき1回です。',progressLabel:'KOKORO LINK',nextLabel:'リンクを選ぶ'}
]);
registerTutorialFlow(TUTORIAL_ALCHEMY_FLOW_ID,[
  {id:'alchemy_materials',screenId:'alchemy',target:'.alchemy-material-board',title:'素材を4枠にセット',text:'錬成は指定された4枠の素材を消費します。上質素材や投入数、レシピとの一致で成功率が変わります。',progressLabel:'ALCHEMY'},
  {id:'alchemy_catalyst',screenId:'alchemy',target:'.alchemy-catalyst',title:'触媒モンスターは1体消費',text:'遠征中とパーティー編成中を除く仲間から、触媒を1体選びます。錬成すると結果にかかわらず消費されます。',progressLabel:'ALCHEMY'},
  {id:'alchemy_rate',screenId:'alchemy',target:'.alchemy-coin-compact',title:'50・100・250コインから選択',text:'投入額で成功率と失敗時の候補が変わります。最終成功率は確認欄に表示されるので、実行前に確かめてください。',progressLabel:'ALCHEMY',nextLabel:'錬成へ戻る'}
]);
registerTutorialFlow(TUTORIAL_EXPEDITION_FLOW_ID,[
  {id:'expedition_party',screenId:'expedition',target:'.expedition-member-grid',title:'待機中の仲間を1〜3体派遣',text:'パーティーに編成していない仲間から1〜3体を選びます。遠征中の仲間は、編成や他の遠征には使えません。',progressLabel:'EXPEDITION'},
  {id:'expedition_progress',screenId:'expedition',target:'.expedition-distance-grid',title:'勝利すると遠征が進みます',text:'短距離は1勝、中距離は3勝、長距離は5勝で完了します。バトルに勝利するたびに進行します。',progressLabel:'EXPEDITION'},
  {id:'expedition_recall',screenId:'expedition',target:'.expedition-active-grid',title:'途中帰還は進捗報酬の50％',text:'完了前でも帰還できます。その場合は進んだ分の50％だけ受け取り、派遣した仲間が戻ります。',progressLabel:'EXPEDITION',nextLabel:'遠征へ戻る'}
]);
registerTutorialFlow(TUTORIAL_FUSION_FLOW_ID,[
  {id:'fusion_intro',screenId:'fusion',target:'#fusionList',title:'合成・特殊進化',text:'対象の仲間と指定アイテムをそろえると、特別な姿へ進化できます。必要条件は各カードで確認できます。',progressLabel:'EVOLUTION'},
  {id:'fusion_cost',screenId:'fusion',target:'#fusionItemText',title:'素材と対象個体を消費・変化',text:'合成すると指定アイテムを消費し、選んだ個体が進化先へ変わります。遠征中の個体は選べません。',progressLabel:'EVOLUTION',nextLabel:'合成へ戻る'}
]);
registerTutorialFlow(TUTORIAL_EVOLUTION_FLOW_ID,[
  {id:'evolution_intro',screenId:'evolution',target:'#evoVisual',title:'レベル条件を満たして進化',text:'必要レベルに達した仲間は、勝利後に進化できます。分岐がある場合は、進化先をここで選びます。',progressLabel:'EVOLUTION'},
  {id:'evolution_choice',screenId:'evolution',target:'#evoChoices',title:'今は進化しない選択もできます',text:'進化後は姿と能力が変わり、初期技のカードを獲得します。特殊進化は育成メニューの合成から行います。',progressLabel:'EVOLUTION',nextLabel:'進化を選ぶ'}
]);
registerTutorialFlow(TUTORIAL_SKILL_CARDS_FLOW_ID,[
  {id:'skill_equipped',screenId:'skillEdit',target:'#skillEditCurrent',title:'装備中の技',text:'技は最大3つまで装備でき、仲間ごとのコスト上限内で組み替えられます。外したカードは所持品へ戻ります。',progressLabel:'SKILL CARDS'},
  {id:'skill_inventory',screenId:'skillEdit',target:'#skillCardList',title:'技カードは所持枚数ぶん使えます',text:'属性や区分などの条件を満たすカードだけ装備できます。技ガチャではコインを使って新しいカードを獲得できます。',progressLabel:'SKILL CARDS',nextLabel:'技編集へ戻る'}
]);
registerTutorialFlow(TUTORIAL_SKILL_GACHA_FLOW_ID,[
  {id:'skill_gacha_draw',screenId:'skillGacha',target:'.skill-gacha-actions',title:'コインで技カードを獲得',text:'1回は100コイン、10回は900コインです。10回ではCOST 2以上が少なくとも1枚出ます。',progressLabel:'SKILL GACHA'},
  {id:'skill_gacha_rates',screenId:'skillGacha',target:'#skillGachaRateList',title:'種類と排出率を確認',text:'モンスター技とキャラクター技は別のガチャです。獲得したカードは、仲間の技編集で条件とコスト内なら装備できます。',progressLabel:'SKILL GACHA',nextLabel:'ガチャへ戻る'}
]);
registerTutorialFlow(TUTORIAL_GOLDEN_LAND_FLOW_ID,[
  {id:'golden_land_intro',screenId:'battleChoices',target:'[data-tutorial-golden-land]',title:'黄金郷が現れました',text:'ゴールド系モンスターだけが出現する希少マップです。勝利すると難易度に応じた追加コインを獲得できます。',progressLabel:'GOLDEN LAND'},
  {id:'golden_land_map',screenId:'battleChoices',target:'[data-tutorial-golden-land]',title:'地図なら次の候補に出現確定',text:'黄金郷への地図を使った場合、出発した時に地図を1枚消費します。候補を見ただけでは消費されません。',progressLabel:'GOLDEN LAND',nextLabel:'依頼を選ぶ'}
]);
registerTutorialFlow(TUTORIAL_DEX_FLOW_ID,[
  {id:'dex_categories',screenId:'dexHub',target:'#dexHubGrid',title:'4つの図鑑',text:'モンスター、キャラクター、マップ、アイテムの発見記録を確認できます。項目を選ぶと詳細へ進みます。',progressLabel:'DEX'},
  {id:'dex_records',screenId:'dexHub',target:'#dexHubGrid',title:'出会った情報が記録されます',text:'契約や進化、訪れたマップ、入手したアイテムが保存されます。モンスター図鑑では主な入手方法も確認できます。',progressLabel:'DEX',nextLabel:'図鑑を選ぶ'}
]);
registerTutorialFlow(TUTORIAL_SHOP_ITEMS_FLOW_ID,[
  {id:'shop_buy',screenId:'shop',target:'#shopList',title:'コインでアイテムを購入',text:'回復薬、強化薬、契約書などを購入できます。価格と現在の所持数を確認して選んでください。',progressLabel:'SHOP & ITEMS'},
  {id:'shop_use',screenId:'shop',target:'#shopList',title:'アイテムごとに使う場所が違います',text:'回復・強化薬は戦闘中、契約書は勝利後、進化素材は合成で使います。入手した道具はアイテム図鑑にも記録されます。',progressLabel:'SHOP & ITEMS',nextLabel:'ショップへ戻る'}
]);
registerTutorialFlow(TUTORIAL_BATTLE_ITEMS_FLOW_ID,[
  {id:'battle_items_use',screenId:'battleItemSelect',target:'#battleItemList',title:'戦闘中に使うアイテム',text:'回復薬や強化薬を選ぶと、そのターンの行動として消費します。所持数と効果を確認してください。',progressLabel:'SHOP & ITEMS'},
  {id:'battle_items_shop',screenId:'battleItemSelect',target:'#battleItemList',title:'道具はショップなどで入手',text:'ショップではコインで道具や契約書を購入できます。契約書はこの画面ではなく、勝利後の契約で使います。',progressLabel:'SHOP & ITEMS',nextLabel:'道具を選ぶ'}
]);
registerTutorialFlow(TUTORIAL_CONTRACTOR_RANK_FLOW_ID,[
  {id:'rank_progress',screenId:'contractorRank',target:'#contractorRankContent',title:'契約者Rankは冒険全体の記録',text:'討伐、契約、図鑑、進化、錬成、遠征などで契約者EXPを獲得します。モンスターのレベルとは別です。',progressLabel:'CONTRACTOR RANK'},
  {id:'rank_titles',screenId:'contractorRank',target:'.contractor-title-link',title:'Rankで称号や報酬を獲得',text:'称号はプロフィール表示を飾る記録で、装備しても能力補正はありません。Rankによる機能制限もありません。',progressLabel:'CONTRACTOR RANK',nextLabel:'Rankへ戻る'}
]);
registerTutorialFlow(TUTORIAL_CONTRACTOR_TITLES_FLOW_ID,[
  {id:'titles_equip',screenId:'contractorTitles',target:'#contractorTitleContent',title:'獲得した称号を1つ装備',text:'条件を達成した称号から、表示したいものを選べます。あとから何度でも変更できます。',progressLabel:'CONTRACTOR RANK'},
  {id:'titles_cosmetic',screenId:'contractorTitles',target:'#contractorTitleContent',title:'称号に能力補正はありません',text:'称号は冒険の実績を示す表示要素です。装備しても戦闘能力や利用できる機能は変わりません。',progressLabel:'CONTRACTOR RANK',nextLabel:'称号へ戻る'}
]);
document.addEventListener('click',event=>{
  if(!tutorialUiState.active)return;
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(step?.advanceOnTarget&&step.target&&event.target.closest?.(step.target))setTimeout(tutorialNext,0);
},true);
document.addEventListener('keydown',event=>{
  if(!tutorialUiState.active)return;
  if(event.key==='Escape'){event.preventDefault();pauseTutorial();return;}
  const bubble=document.getElementById('tutorialBubble');
  if(!bubble?.contains(document.activeElement))return;
  if(event.key==='ArrowLeft'){event.preventDefault();tutorialPrevious();}
  if(event.key==='ArrowRight'){event.preventDefault();tutorialNext();}
});
window.addEventListener('resize',scheduleTutorialPosition);
window.addEventListener('scroll',scheduleTutorialPosition,true);
updateTutorialMenuSummary();
