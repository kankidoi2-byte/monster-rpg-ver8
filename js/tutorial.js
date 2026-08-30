Warning: truncated output (original token count: 26757)
Total output lines: 1317

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
const TUTORIAL_STEP_MODE=Object.freeze({
  DIALOGUE:'dialogue',
  TARGET_ACTION:'target_action',
  EXTERNAL_ACTION:'external_action'
});
const TUTORIAL_STEP_MODES=new Set(Object.values(TUTORIAL_STEP_MODE));
const tutorialFlows=new Map();
const tutorialUiState={
  active:false,flowId:null,steps:[],index:0,persist:false,replay:false,
  returnScreen:null,target:null,previousFocus:null,lastFocusedStep:null,advancePendingStepId:null
};
const TUTORIAL_FIRST_HUNT=Object.freeze({mapId:'grassland',enemyId:'slime',difficultyId:'easy'});
const TUTORIAL_STARTER_CONTRACT_IDS=Object.freeze(['freigal','aquaron']);
const TUTORIAL_ELNA_GUEST=Object.freeze({uid:'tutorial_guest_elna',id:'elna_beginner',sourceId:'elna_beginner',level:1,exp:0,locked:true,guest:true,tutorialRole:'person'});
const TUTORIAL_RESCUE_ENEMY_IDS=Object.freeze(['slime','slime']);
const TUTORIAL_ALCHEMY_SUPPLY_REWARD=Object.freeze({
  coins:250,
  materials:Object.freeze(['monster_bone','magic_crystal','metal_ore','unstable_alchemy_matter'])
});
const TUTORIAL_STELLA_SKILL_ID='skill_elna_middle_01';
const TUTORIAL_STELLA_MOCK=Object.freeze({mapId:'grassland',enemyId:'grassbeat',difficultyId:'easy',actorId:'freigal'});
const TUTORIAL_TRANSITIONS=new Set(['start_elna_rescue','grant_stella_skill_card','start_stella_mock_battle']);
const tutorialBattleSession={active:false,kind:null,firstSkillUsed:false,advantageUsed:false,enemyQueue:[]};
function isTutorialRescueBattleActive(){return tutorialBattleSession.active&&tutorialBattleSession.kind==='elna_rescue';}
function isTutorialStellaMockBattleActive(){return tutorialBattleSession.active&&tutorialBattleSession.kind==='stella_mock';}
let tutorialTransitionBusy=false;
let tutorialElnaContractBusy=false;
let tutorialSupplyRewardBusy=false;
let tutorialStellaCardBusy=false;

function inferTutorialStepMode(step){
  if(TUTORIAL_STEP_MODES.has(step?.mode))return step.mode;
  if(step?.advanceOnTarget===true)return TUTORIAL_STEP_MODE.TARGET_ACTION;
  if(step?.externalAdvance===true)return TUTORIAL_STEP_MODE.EXTERNAL_ACTION;
  return TUTORIAL_STEP_MODE.DIALOGUE;
}
function tutorialStepMode(step){return inferTutorialStepMode(step);}
function tutorialStepRequiresAction(step){return tutorialStepMode(step)!==TUTORIAL_STEP_MODE.DIALOGUE;}
function tutorialStepAcceptsTargetAction(step){
  return tutorialStepMode(step)===TUTORIAL_STEP_MODE.TARGET_ACTION&&Boolean(step?.target);
}
function normalizeTutorialStep(step,index){
  if(!step||typeof step!=='object'||(step.advanceOnTarget===true&&step.externalAdvance===true))return null;
  const id=typeof step.id==='string'&&step.id?step.id:`step_${index+1}`;
  const mode=inferTutorialStepMode(step);
  const target=typeof step.target==='string'&&step.target?step.target:null;
  if(mode===TUTORIAL_STEP_MODE.TARGET_ACTION&&!target)return null;
  return Object.freeze({
    id,
    mode,
    speaker:typeof step.speaker==='string'&&step.speaker?step.speaker:null,
    portrait:typeof step.portrait==='string'&&step.portrait?step.portrait:null,
    scene:typeof step.scene==='string'&&step.scene?step.scene:null,
    input:['player_name','elna_contract'].includes(step.input)?step.input:null,
    transition:TUTORIAL_TRANSITIONS.has(step.transition)?step.transition:null,
    title:typeof step.title==='string'&&step.title?step.title:'操作ガイド',
    text:typeof step.text==='string'?step.text:'',
    screenId:typeof step.screenId==='string'&&step.screenId?step.screenId:null,
    target,
    advanceOnTarget:mode===TUTORIAL_STEP_MODE.TARGET_ACTION,
    nextStepId:typeof step.nextStepId==='string'&&step.nextStepId?step.nextStepId:null,
    replayNextStepId:typeof step.replayNextStepId==='string'&&step.replayNextStepId?step.replayNextStepId:null,
    persistAs:typeof step.persistAs==='string'&&step.persistAs?step.persistAs:null,
    waitForEvent:typeof step.waitForEvent==='string'&&step.waitForEvent?step.waitForEvent:null,
    externalAdvance:mode===TUTORIAL_STEP_MODE.EXTERNAL_ACTION,
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
  const normalized=steps.map(normalizeTutorialStep);
  if(!normalized.length||normalized.some(step=>!step))return false;
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

function calculateTutorialStoryPlacement(bubbleSize,viewport){
  const margin=10;
  const width=Math.min(Number(bubbleSize?.width)||360,Math.max(0,viewport.width-margin*2));
  const height=Math.min(Number(bubbleSize?.height)||260,Math.max(0,viewport.height-margin*2));
  if(viewport.width>=720){
    return {left:viewport.width-width-24,top:Math.max(margin,(viewport.height-height)/2),maxHeight:viewport.height-margin*2,side:'story'};
  }
  const maxHeight=Math.max(190,Math.min(viewport.height*.48,viewport.height-margin*2));
  const fittedHeight=Math.min(height,maxHeight);
  return {left:margin,top:viewport.height-fittedHeight-margin,maxHeight,side:'story'};
}
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
function ensureTutorialTargetVisible(target){
  const rect=target?.getBoundingClientRect?.();
  if(!rect||rect.width<=0||rect.height<=0)return;
  const viewportHeight=window.innerHeight||document.documentElement.clientHeight;
  const viewportWidth=window.innerWidth||document.documentElement.clientWidth;
  if(rect.top<8||rect.bottom>viewportHeight-8||rect.left<4||rect.right>viewportWidth-4){
    target.scrollIntoView?.({block:'center',inline:'nearest'});
  }
}
function positionTutorialUi(){
  if(!tutorialUiState.active)return;
  const bubble=document.getElementById('tutorialBubble');
  const spotlight=document.getElementById('tutorialSpotlight');
  const arrow=document.getElementById('tutorialArrow');
  const overlay=document.getElementById('tutorialOverlay');
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
  const placement=overlay?.classList.contains('is-story-step')&&!hole
    ?calculateTutorialStoryPlacement(bubble.getBoundingClientRect(),viewport)
    :calculateTutorialPlacement(hole,bubble.getBoundingClientRect(),viewport);
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
function tutorialResolvedText(step){
  const playerName=typeof currentTutorialState==='function'?currentTutorialState().playerName:null;
  return String(step?.text||'').replaceAll('{{playerName}}',playerName||'契約者');
}
function renderTutorialStoryStep(step){
  const overlay=document.getElementById('tutorialOverlay');
  const backdrop=document.getElementById('tutorialStoryBackdrop');
  const layer=document.getElementById('tutorialCharacterLayer');
  const portrait=document.getElementById('tutorialCharacterPortrait');
  const story=Boolean(step?.scene||step?.portrait);
  overlay?.classList.toggle('is-story-step',story);
  if(backdrop){
    backdrop.hidden=!step?.scene;
    backdrop.dataset.scene=step?.scene||'';
  }
  if(layer)layer.hidden=!step?.portrait;
  if(portrait){
    portrait.hidden=!step?.portrait;
    if(step?.portrait&&portrait.getAttribute('src')!==step.portrait)portrait.setAttribute('src',step.portrait);
    portrait.alt=step?.speaker?step.speaker:'';
  }
}
function confirmTutorialPlayerName(event){
  event?.preventDefault?.();
  if(!tutorialUiState.active)return false;
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(step?.input!=='player_name')return false;
  const input=document.getElementById('tutorialPlayerNameInput');
  const value=input?.value||'';
  const snapshot=JSON.stringify(save);
  if(typeof setTutorialPlayerName!=='function'||!setTutorialPlayerName(value)){
    input?.setCustomValidity?.('1文字以上の名前を入力してください。');
    input?.reportValidity?.();input?.focus?.();return false;
  }
  input?.setCustomValidity?.('');
  if(typeof saveGame==='function'&&!saveGame()){
    save=JSON.parse(snapshot);
    if(typeof showUiNotice==='function')showUiNotice('名前を保存できませんでした。もう一度お試しください。','warning');
    return false;
  }
  tutorialNext(true);
  return false;
}

function tutorialInitialPartyReady(party=typeof getPartyInstances==='function'?getPartyInstances():[]){
  const ids=(party||[]).map(instance=>instance?.id).filter(Boolean);
  return ids.length===3&&['freigal','aquaron','elna_beginner'].every(id=>ids.includes(id));
}
function canConfirmTutorialParty(party){
  if(tutorialCurrentStepId()!=='party_save')return true;
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  if(tutorial?.replaying)return true;
  if(tutorialInitialPartyReady(party))return true;
  if(typeof showUiNotice==='function')showUiNotice('フレイガル、アクアロン、エルナの3体を編成してください。','warning');
  return false;
}
function handleTutorialPartySaved(){
  if(!tutorialUiState.active||tutorialCurrentStepId()!=='party_save')return false;
  tutorialNext(true);
  return true;
}

function tutorialElnaContractInstance(){
  if(!Array.isArray(save?.instances))return null;
  const matches=save.instances.filter(instance=>instance?.id==='elna_beginner'&&instance?.guest!==true);
  return matches.find(instance=>instance.tutorialRole==='contract_body')
    ||matches.find(instance=>instance.tutorialContract===true)
    ||matches[matches.length-1]
    ||null;
}
function commitTutorialElnaContract(){
  if(typeof currentTutorialState!=='function'||typeof addInstance!=='function')return null;
  const tutorial=currentTutorialState();
  if(tutorial.replaying)return {instance:tutorialElnaContractInstance(),replay:true};
  const snapshot=JSON.stringify(save);
  try{
    const starters=TUTORIAL_STARTER_CONTRACT_IDS.map(tutorialOwnedStarterInstance);
    if(starters.some(instance=>!instance))throw new Error('elna_contract_starters_missing');
    let instance=tutorialElnaContractInstance();
    if(!instance)instance=addInstance('elna_beginner',1,0,{tutorialContract:true,tutorialRole:'contract_body'});
    if(!instance)throw new Error('elna_contract_body_missing');
    instance.tutorialContract=true;
    instance.tutorialRole='contract_body';
    if(!tutorial.elnaContractGranted&&typeof markTutorialElnaContractGranted==='function'&&!markTutorialElnaContractGranted()){
      throw new Error('elna_contract_flag');
    }
    if(typeof setTutorialElnaGuestActive==='function')setTutorialElnaGuestActive(false);
    save.party=[...new Set([...starters.map(entry=>entry.uid),instance.uid])].slice(0,3);
    if(save.party.length!==3)throw new Error('elna_contract_party');
    if(typeof setTutorialStep==='function')setTutorialStep('elna_contract_departure');
    if(typeof saveGame==='function'&&!saveGame())throw new Error('elna_contract_save');
    try{
      if(typeof updateParty==='function')updateParty();
      if(typeof renderParty==='function')renderParty();
      if(typeof renderDex==='function')renderDex();
    }catch(error){console.error('エルナ契約後の画面更新に失敗しました。',error);}
    return {instance,replay:false};
  }catch(error){
    save=JSON.parse(snapshot);
    console.error('エルナの契約体を保存できませんでした。',error);
    if(typeof showUiNotice==='function')showUiNotice('契約状態を保存できませんでした。もう一度お試しください。','warning');
    return null;
  }
}
async function confirmTutorialElnaContract(){
  if(tutorialElnaContractBusy||!tutorialUiState.active)return false;
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(step?.input!=='elna_contract')return false;
  if(typeof playContractAnimation!=='function'){
    if(typeof showUiNotice==='function')showUiNotice('契約演出を開始できませんでした。もう一度お試しください。','warning');
    return false;
  }
  tutorialElnaContractBusy=true;
  renderTutorialStep();
  const committed=commitTutorialElnaContract();
  if(!committed){
    tutorialElnaContractBusy=false;
    renderTutorialStep();
    return false;
  }
  try{
    await playContractAnimation({monsterName:'エルナの契約体',stage:3});
  }catch(error){
    console.error('エルナの契約演出を完了できませんでした。',error);
    if(typeof showUiNotice==='function')showUiNotice('契約は保存されています。続きから再開できます。','warning');
  }finally{
    tutorialElnaContractBusy=false;
  }
  if(tutorialUiState.active&&tutorialUiState.steps[tutorialUiState.index]?.id===step.id)tutorialNext(true);
  else updateTutorialMenuSummary();
  return true;
}

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
  renderTutorialStoryStep(step);
  bubble.scrollTop=0;
  clearTutorialTarget();
  tutorialUiState.target=step.target?document.querySelector(step.target):null;
  tutorialUiState.target?.classList.add('tutorial-target-active');
  ensureTutorialTargetVisible(tutorialUiState.target);
  document.getElementById('tutorialProgressLabel').textContent=step.progressLabel;
  document.getElementById('tutorialProgressText').textContent=`${tutorialUiState.index+1} / ${tutorialUiState.steps.length}`;
  document.getElementById('tutorialProgressBar').style.width=`${(tutorialUiState.index+1)/tutorialUiState.steps.length*100}%`;
  document.getElementById('tutorialTitle').textContent=step.speaker||step.title;
  document.getElementById('tutorialText').textContent=tutorialResolvedText(step);
  const nameForm=document.getElementById('tutorialNameForm');
  const nameInput=document.getElementById('tutorialPlayerNameInput');
  if(nameForm)nameForm.hidden=step.input!=='player_name';
  if(step.input==='player_name'&&nameInput){
    const savedName=typeof currentTutorialState==='function'?currentTutorialState().playerName:'';
    nameInput.value=savedName||'';
  }
  const back=document.getElementById('tutorialBackButton');
  const skip=document.getElementById('tutorialSkipButton');
  const next=document.getElementById('tutorialNextButton');
  const actions=next?.closest('.tutorial-actions');
  const requiresAction=tutorialStepRequiresAction(step);
  back.disabled=tutorialElnaContractBusy||tutorialUiState.index===0||step.disableBack;
  skip.disabled=tutorialElnaContractBusy;
  document.querySelector('.tutorial-pause')?.toggleAttribute('disabled',tutorialElnaContractBusy);
  skip.textContent=tutorialUiState.persist?'スキップ':'閉じる';
  next.textContent=step.nextLabel||(tutorialUiState.index===tutorialUiState.steps.length-1?'完了':'次へ');
  next.hidden=requiresAction;
  next.disabled=requiresAction||tutorialElnaContractBusy;
  actions?.classList.toggle('is-target-action',requiresAction);
  actions?.classList.toggle('is-name-entry',step.input==='player_name');
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden','false');
  scheduleTutorialPosition();
  if(tutorialUiState.lastFocusedStep!==step.id){
    tutorialUiState.lastFocusedStep=step.id;
    setTimeout(()=>step.input==='player_name'?nameInput?.focus({preventScroll:true}):bubble.focus({preventScroll:true}),0);
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
  if(tutorialElnaContractBusy||!tutorialUiState.active||tutorialUiState.index<=0)return;
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
function queueTutorialActionAdvance(stepId=tutorialCurrentStepId()){
  if(!tutorialUiState.active||!stepId||tutorialCurrentStepId()!==stepId||tutorialUiState.advancePendingStepId===stepId)return false;
  tutorialUiState.advancePendingStepId=stepId;
  setTimeout(()=>{
    if(tutorialUiState.advancePendingStepId===stepId)tutorialUiState.advancePendingStepId=null;
    if(tutorialUiState.active&&tutorialCurrentStepId()===stepId)tutorialNext(true);
  },0);
  return true;
}
function tutorialNext(actionCompleted=false){
  if(!tutorialUiState.active||tutorialElnaContractBusy&&actionCompleted!==true)return;
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(step?.input==='elna_contract'&&actionCompleted!==true){void confirmTutorialElnaContract();return;}
  if(tutorialStepRequiresAction(step)&&actionCompleted!==true)return;
  if(!tutorialStepCanAdvance(step))return;
  if(step?.transition&&!runTutorialTransition(step.transition))return;
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
  if(tutorialElnaContractBusy||!tutorialUiState.active)return;
  const returnScreen=tutorialUiState.returnScreen;
  clearTutorialUi();restoreTutorialReturnScreen(returnScreen);updateTutorialMenuSummary();
}
function requestTutorialSkip(){
  if(tutorialElnaContractBusy||!tutorialUiState.active)return;
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
  renderTutorialStoryStep(null);
  const previousFocus=tutorialUiState.previousFocus;
  tutorialUiState.active=false;tutorialUiState.flowId=null;tutorialUiState.steps=[];
  tutorialUiState.index=0;tutorialUiState.persist=false;tutorialUiState.replay=false;
  tutorialUiState.returnScreen=null;tutorialUiState.previousFocus=null;tutorialUiState.lastFocusedStep=null;tutorialUiState.advancePendingStepId=null;
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

function tutorialOwnedStarterInstance(id){
  return Array.isArray(save?.instances)?save.instances.find(instance=>instance.id===id)||null:null;
}
function ensureTutorialStarterContracts(){
  if(typeof currentTutorialState!=='function'||typeof addInstance!=='function')return false;
  const tutorial=currentTutorialState();
  if(tutorial.replaying)return TUTORIAL_STARTER_CONTRACT_IDS.every(id=>tutorialOwnedStarterInstance(id));
  const snapshot=JSON.stringify(save);
  try{
    const starters=TUTORIAL_STARTER_CONTRACT_IDS.map(id=>tutorialOwnedStarterInstance(id)||addInstance(id,1,0,{tutorialContract:true}));
    if(starters.some(instance=>!instance))throw new Error('starter_contract_missing');
    if(!tutorial.starterContractsGranted&&typeof markTutorialStarterContractsGranted==='function'&&!markTutorialStarterContractsGranted())throw new Error('starter_contract_flag');
    save.party=starters.map(instance=>instance.uid);
    if(typeof setTutorialElnaGuestActive==='function')setTutorialElnaGuestActive(true);
    if(typeof saveGame==='function'&&!saveGame())throw new Error('starter_contract_save');
    if(typeof updateParty==='function')updateParty();
    return true;
  }catch(error){
    save=JSON.parse(snapshot);
    console.error('序章の契約体を準備できませんでした。',error);
    if(typeof showUiNotice==='function')showUiNotice('契約体を準備できませんでした。もう一度お試しください。','warning');
    return false;
  }
}
function tutorialElnaGuestInstance(){
  return {...TUTORIAL_ELNA_GUEST,equippedSkills:[]};
}
function tutorialBattlePartyInstances(defaultParty=[]){
  if(!tutorialBattleSession.active)return defaultParty;
  const starters=TUTORIAL_STARTER_CONTRACT_IDS.map(tutorialOwnedStarterInstance).filter(Boolean);
  if(starters.length!==TUTORIAL_STARTER_CONTRACT_IDS.length)return defaultParty;
  if(tutorialBattleSession.kind==='stella_mock'){
    const elna=tutorialElnaContractInstance();
    return elna?[...starters,elna]:starters;
  }
  if(tutorialBattleSession.kind!=='elna_rescue')return defaultParty;
  return [...starters,tutorialElnaGuestInstance()];
}
function tutorialRescueRequest(){
  const map=MAPS.find(entry=>entry.id===TUTORIAL_FIRST_HUNT.mapId);
  const slime=by(TUTORIAL_FIRST_HUNT.enemyId);
  if(!map||!slime)return null;
  const request=createHuntRequest(map,slime,TUTORIAL_FIRST_HUNT.difficultyId,[]);
  request.battleMode='single';request.secondEnemyId=null;request.invasionEnemyId=null;request.invasionTurn=null;
  request.tutorialRescue=true;request.enemyIds=[...TUTORIAL_RESCUE_ENEMY_IDS];
  return registerHuntRequest(request);
}
function startTutorialRescueBattle(){
  if(tutorialTransitionBusy||!ensureTutorialStarterContracts())return false;
  tutorialTransitionBusy=true;
  tutorialBattleSession.active=true;tutorialBattleSession.kind='elna_rescue';
  tutorialBattleSession.firstSkillUsed=false;tutorialBattleSession.enemyQueue=TUTORIAL_RESCUE_ENEMY_IDS.slice(1);
  try{
    const request=tutorialRescueRequest();
    if(!request)throw new Error('rescue_request_missing');
    partyBattle=[];
    startChosenBattle(TUTORIAL_FIRST_HUNT.mapId,TUTORIAL_FIRST_HUNT.enemyId,TUTORIAL_FIRST_HUNT.difficultyId,request.requestId);
    const guestReady=partyBattle.length===3&&partyBattle.some(entry=>entry.inst?.guest===true&&entry.inst?.sourceId==='elna_beginner');
    const ready=activeScreenId()==='battle'&&player?.id&&enemy?.id==='slime'&&guestReady;
    if(!ready)throw new Error('rescue_battle_not_ready');
    return true;
  }catch(error){
    console.error('エルナ救援戦を開始できませんでした。',error);
    tutorialBattleSession.active=false;tutorialBattleSession.kind=null;tutorialBattleSession.enemyQueue=[];
    partyBattle=[];
    if(typeof showUiNotice==='function')showUiNotice('救援戦を開始できませんでした。もう一度お試しください。','warning');
    return false;
  }finally{
    tutorialTransitionBusy=false;
  }
}
function failTutorialRescueBattle(reason){
  console.error('エルナ救援戦の敵を準備できませんでした。',reason);
  tutorialBattleSession.enemyQueue=[];
  if(typeof showBattleOutcome==='function')showBattleOutcome({kind:'retreat',title:'救援戦を再準備',note:'スライムを準備できませんでした。進行を保持して再挑戦できます。'});
  handleTutorialBattleOutcome('error');
  busy=true;
  return true;
}
function continueTutorialRescueWave(){
  if(!isTutorialRescueBattleActive()||!tutorialBattleSession.enemyQueue.length)return false;
  const nextId=tutorialBattleSession.enemyQueue[0];
  const nextEnemy=by(nextId);
  if(!nextEnemy)return failTutorialRescueBattle('rescue_enemy_missing');
  busy=true;
  try{
    enemy=structuredClone(nextEnemy);eHp=enemyMaxHp();eAtk=1;eGuard=false;eStatus=null;
    ePoisonTurns=0;eParalysisTurns=0;eConfusionTurns=0;eSleepTurns=0;eFlareCharge=false;eAquaShield=false;
    battleRewardGranted=false;
    setupBattle();
    if(enemy?.id!==nextId||eHp<=0)throw new Error('rescue_enemy_not_ready');
    tutorialBattleSession.enemyQueue.shift();
    const log=document.getElementById('log');
    if(log)log.innerHTML='<b>もう1体のスライム</b>が飛び出した！ エルナを守りながら戦おう！';
    busy=false;
    return true;
  }catch(error){
    return failTutorialRescueBattle(error);
  }
}
function tutorialStellaMockRequest(){
  const map=MAPS.find(entry=>entry.id===TUTORIAL_STELLA_MOCK.mapId);
  const target=by(TUTORIAL_STELLA_MOCK.enemyId);
  if(!map||!target)return null;
  const request=createHuntRequest(map,target,TUTORIAL_STELLA_MOCK.difficultyId,[]);
  request.battleMode='single';request.secondEnemyId=null;request.invasionEnemyId=null;request.invasionTurn=null;
  request.tutorialStellaMock=true;
  return registerHuntRequest(request);
}
function startTutorialStellaMockBattle(){
  if(tutorialTransitionBusy)return false;
  tutorialTransitionBusy=true;
  tutorialBattleSession.active=true;tutorialBattleSession.kind='stella_mock';
  tutorialBattleSession.firstSkillUsed=false;tutorialBattleSession.advantageUsed=false;tutorialBattleSession.enemyQueue=[];
  try{
    const request=tutorialStellaMockRequest();
    if(!request)throw new Error('stella_mock_request_missing');
    partyBattle=[];
    startChosenBattle(TUTORIAL_STELLA_MOCK.mapId,TUTORIAL_STELLA_MOCK.enemyId,TUTORIAL_STELLA_MOCK.difficultyId,request.requestId);
    const ready=activeScreenId()==='battle'&&player?.id===TUTORIAL_STELLA_MOCK.actorId&&enemy?.id===TUTORIAL_STELLA_MOCK.enemyId;
    if(!ready)throw new Error('stella_mock_battle_not_ready');
    return true;
  }catch(error){
    console.error('ステラ模擬戦を開始できませんでした。',error);
    tutorialBattleSession.active=false;tutorialBattleSession.kind=null;tutorialBattleSession.advantageUsed=false;
    partyBattle=[];
    if(typeof showUiNotice==='function')showUiNotice('模擬戦を開始できませんでした。もう一度お試しください。','warning');
    return false;
  }finally{
    tutorialTransitionBusy=false;
  }
}
function isTutorialStellaMockAdvantageMove(move,actor=typeof activeInstance!=='undefined'?activeInstance:null,target=typeof enemy!=='undefined'?enemy:null){
  if(!isTutorialStellaMockBattleActive()||actor?.id!==TUTORIAL_STELLA_MOCK.actorId||target?.id!==TUTORIAL_STELLA_MOCK.enemyId)return false;
  return Number(move?.[1])>0&&moveTypes(move).includes('fire')&&typeEff(moveTypes(move),target.types)>1;
}
function completeTutorialStellaMockVictory(){
  if(!isTutorialStellaMockBattleActive())return false;
  battleRewardGranted=true;
  if(typeof resetKokoroLinkBattleState==='function')resetKokoroLinkBattleState();
  if(typeof completeBattleTurn==='function')completeBattleTurn();
  eHp=0;pStatus=null;eStatus=null;pPoisonTurns=0;ePoisonTurns=0;
  const cleared=tutorialBattleSession.advantageUsed===true;
  const log=document.getElementById('log');
  if(log)log.innerHTML=cleared?'🔥 炎属性の技が効果抜群！<br><b>属性模擬戦に勝利した！</b>':'相性を確かめる前に模擬戦が終わった。もう一度、炎属性の技を試そう！';
  if(typeof showBattleOutcome==='function')showBattleOutcome(cleared
    ?{kind:'victory',title:'属性模擬戦クリア',note:'模擬戦のため通常報酬はありません。'}
    :{kind:'retreat',title:'相性をもう一度確認',note:'フレイガルの炎属性の技を使って再挑戦しよう。'});
  handleTutorialBattleOutcome(cleared?'victory':'error');
  busy=true;
  return true;
}
function runTutorialTransition(transition){
  if(transition==='start_elna_rescue')return startTutorialRescueBattle();
  if(transition==='grant_stella_skill_card')return Boolean(commitTutorialStellaSkillCard());
  if(transition==='start_stella_mock_battle')return startTutorialStellaMockBattle();
  return false;
}

function tutorialSupplyRewardMaterialEntries(){
  return TUTORIAL_ALCHEMY_SUPPLY_REWARD.materials.map(itemId=>({itemId,item:ITEM_BY_ID[itemId]}));
}
function tutorialSupplyRequestIsPending(){
  if(typeof currentTutorialState!=='function')return false;
  const tutorial=currentTutorialState();
  return (tutorial.status==='in_progress'||tutorial.replaying)&&[
    'home_requests','request_board','request_accept'
  ].includes(tutorial.stepId);
}
function shouldOfferTutorialSupplyRequest(){
  return tutorialSupplyRequestIsPending()||[
    'home_requests','request_board','request_accept'
  ].includes(tutorialCurrentStepId());
}
function renderTutorialSupplyRequest(list){
  if(!list||!shouldOfferTutorialSupplyRequest())return false;
  const current=tutorialCurrentStepId();
  const canOpen=current==='request_accept';
  const mat…6757 tokens truncated…を押すと、冒険へ連れていく仲間を編成できるぞ！',progressLabel:'HOME'},
  {id:'party_review',screenId:'partySet',target:'#currentPartyView',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'最初の3体',text:'フレイガル、アクアロン、エルナの契約体がそろってるな！ 先頭がリーダーだぞ！',progressLabel:'PARTY'},
  {id:'party_save',screenId:'partySet',target:'#partySetupSaveButton',externalAdvance:true,disableBack:true,title:'編成を保存',text:'3体を確認したら「この編成を保存」を押そう！',progressLabel:'PARTY'},
  {id:'home_dex_open',screenId:'home',target:'#homeDexButton',advanceOnTarget:true,title:'図鑑を開こう',text:'ここを押すと、出会った仲間の記録を確認できるぞ！',progressLabel:'DEX'},
  {id:'dex_character_open',screenId:'dexHub',target:'#dexHubCharacterButton',advanceOnTarget:true,title:'キャラクター図鑑',text:'まずはキャラクター図鑑を押してみよう！',progressLabel:'DEX'},
  {id:'dex_elna_open',screenId:'characterDex',target:'[data-tutorial-character="elna_beginner"]',advanceOnTarget:true,title:'エルナの記録',text:'エルナを押すと、本人と成長形態の記録を見られるぞ！',progressLabel:'CHARACTER DEX'},
  {id:'dex_elna_detail',screenId:'characterDex',target:'#characterDexDetail',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'キャラクター図鑑のエルナ',text:'ここには本人エルナの記録が載る。呼び出す契約体とは役割を分けてあるぞ！',progressLabel:'CHARACTER DEX'},
  {id:'dex_character_back',screenId:'characterDex',target:'#characterDexBackButton',advanceOnTarget:true,title:'図鑑一覧へ',text:'図鑑一覧へ戻って、今度はモンスター図鑑を見よう！',progressLabel:'DEX'},
  {id:'dex_monster_open',screenId:'dexHub',target:'#dexHubMonsterButton',advanceOnTarget:true,title:'モンスター図鑑',text:'ここを押すと、契約したモンスターの記録を見られるぞ！',progressLabel:'DEX'},
  {id:'dex_freigal',screenId:'dex',target:'[data-tutorial-monster="freigal"]',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'フレイガル',text:'炎の契約体フレイガルだ！ 図鑑では属性や進化先を確認できるぞ！',progressLabel:'MONSTER DEX'},
  {id:'dex_aquaron',screenId:'dex',target:'[data-tutorial-monster="aquaron"]',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'アクアロン',text:'こっちは水の契約体アクアロン！ 入手した仲間はここへ記録されるぞ！',progressLabel:'MONSTER DEX'},
  {id:'home_growth_open',screenId:'dex',target:'[data-nav="growth"]',advanceOnTarget:true,title:'育成へ',text:'ここを押すと、仲間の育成や技を確認できるぞ！',progressLabel:'GROWTH'},
  {id:'home_growth_overview',screenId:'growthHub',target:'#growthMonsterButton',advanceOnTarget:true,title:'モンスター育成',text:'ここを押して、エルナの契約体を見てみよう！',progressLabel:'GROWTH'},
  {id:'growth_elna',screenId:'party',target:'[data-monster-id="elna_beginner"] .monster-roster-summary',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'育成する仲間',text:'レベルと経験値はここで確認できる。育つほど能力も上がるぞ！',progressLabel:'GROWTH'},
  {id:'growth_elna_details',screenId:'party',target:'[data-monster-id="elna_beginner"] .monster-roster-details > summary',advanceOnTarget:true,title:'個体情報を開こう',text:'ここを押すと、装備中の技や個体情報を確認できるぞ！',progressLabel:'GROWTH'},
  {id:'growth_skill_open',screenId:'party',target:'[data-monster-id="elna_beginner"] [data-tutorial-skill-edit]',advanceOnTarget:true,title:'技を変更',text:'ここを押すと、技カードを組み替えられるぞ！',progressLabel:'SKILL'},
  {id:'growth_skill_current',screenId:'skillEdit',target:'#skillEditCurrent',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'装備中の技',text:'技は3つまで。仲間ごとのコスト上限に収めて装備するぞ！',progressLabel:'SKILL'},
  {id:'growth_skill_cards',screenId:'skillEdit',target:'#skillCardList',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'所持している技カード',text:'持っているカードから、条件に合う技を選べるぞ！',progressLabel:'SKILL'},
  {id:'growth_return',screenId:'party',target:'[data-nav="growth"]',advanceOnTarget:true,title:'育成一覧へ戻ろう',text:'育成を押して、最後に進化を確認しよう！',progressLabel:'GROWTH'},
  {id:'growth_evolution',screenId:'growthHub',target:'#growthEvolutionButton',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'進化',text:'レベル条件を満たすと進化できる。特殊な進化はここから条件を確認できるぞ！',progressLabel:'EVOLUTION',nextStepId:'home_requests'},
  {id:'home_requests',screenId:'home',target:'#homeAdventureButton',persistAs:'home_requests',advanceOnTarget:true,title:'依頼を見よう',text:'ここを押すと、討伐依頼と報酬を確認できるぞ！',progressLabel:'REQUEST'},
  {id:'request_board',screenId:'battleChoices',target:'[data-tutorial-request-report]',persistAs:'request_board',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'エルナ救援の報告',text:'さっきの救援が依頼として認められたぞ！ 内容と報酬を確認しよう！',progressLabel:'REQUEST'},
  {id:'request_accept',screenId:'battleChoices',target:'[data-tutorial-request-open]',externalAdvance:true,title:'依頼を報告',text:'ここを押すと、依頼を報告して報酬を受け取れるぞ！',progressLabel:'REQUEST'},
  {id:'request_reward_preview',screenId:'tutorialRequestReport',target:'#tutorialRequestRewardList',persistAs:'request_reward_preview',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'依頼報酬',text:'コイン250枚と、錬成に使う4種類の素材だ！',progressLabel:'REWARD'},
  {id:'request_reward_claim',screenId:'tutorialRequestReport',target:'#tutorialRequestClaimButton',externalAdvance:true,disableBack:true,title:'報酬を受け取ろう',text:'ここを押すと、依頼報酬を受け取れるぞ！',progressLabel:'REWARD'},
  {id:'request_reward_received',screenId:'tutorialRequestReport',target:'#tutorialRequestRewardStatus',persistAs:'stella_intro',waitForEvent:'stella_intro',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'報酬受領完了',text:'よし、受け取れた！ この素材とコインは、あとで錬成に使うぞ！',progressLabel:'REWARD',nextLabel:'次の出会いへ'},
  {id:'stella_intro',screenId:'home',persistAs:'stella_intro',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'academy',title:'技に詳しい子を探そう',text:'準備はできたな！ 技と属性に詳しいステラに会いに行くぞ！',progressLabel:'PROLOGUE'},
  {id:'stella_encounter',screenId:'home',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',scene:'academy',title:'見習い魔法使いステラ',text:'こんにちは！ グノーシスから聞いたよ。技カードの使い方なら、私に任せて！',progressLabel:'STELLA'},
  {id:'stella_card_offer',screenId:'home',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',scene:'academy',title:'技カードを受け取ろう',text:'エルナが使える「連続斬り」のカードをあげる。装備して、技と属性を見てみよう！',progressLabel:'SKILL CARD'},
  {id:'stella_card_receive',screenId:'home',transition:'grant_stella_skill_card',nextStepId:'stella_card_received',replayNextStepId:'stella_attribute_intro',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',scene:'academy',title:'連続斬りを受け取る',text:'このカードは一度だけ渡すね。受け取ったら、エルナの技へ装備しよう！',progressLabel:'SKILL CARD',nextLabel:'受け取る'},
  {id:'stella_card_received',screenId:'tutorialStellaCard',target:'#tutorialStellaSkillCardVisual',persistAs:'stella_card_received',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'技カード獲得',text:'カードには属性、威力、COSTが書いてあるよ。まず内容を確認してね！',progressLabel:'SKILL CARD'},
  {id:'stella_skill_open',screenId:'tutorialStellaCard',target:'#tutorialStellaSkillEditButton',externalAdvance:true,disableBack:true,title:'技編集を開こう',text:'ここを押すと、エルナの技カードを組み替えられるぞ！',progressLabel:'SKILL CARD'},
  {id:'stella_skill_current',screenId:'skillEdit',target:'#skillEditCurrent',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'装備枠とCOST',text:'技は3枚まで。合計COSTが上限を超えないように組み合わせるよ！',progressLabel:'SKILL CARD'},
  {id:'stella_skill_unequip',screenId:'skillEdit',target:'[data-tutorial-stella-unequip]',externalAdvance:true,disableBack:true,title:'技を1枚外そう',text:'ここを押して、今の技を1枚外そう。新しいカードを入れる空きを作るぞ！',progressLabel:'SKILL CARD'},
  {id:'stella_skill_card_detail',screenId:'skillEdit',target:'[data-tutorial-stella-skill-card]',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'連続斬り',text:'無属性、威力34、COST 2。エルナの剣士タグに合うから装備できるよ！',progressLabel:'SKILL CARD'},
  {id:'stella_skill_equip',screenId:'skillEdit',target:'[data-tutorial-stella-skill-equip]',externalAdvance:true,disableBack:true,title:'連続斬りを装備',text:'ここを押すと、受け取った技カードを装備できるぞ！',progressLabel:'SKILL CARD'},
  {id:'stella_attribute_intro',screenId:'skillEdit',target:'[data-tutorial-stella-skill-card]',persistAs:'stella_attribute_intro',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'技の属性',text:'技には属性があるよ。相手に有利な属性なら、ダメージが大きくなるの！',progressLabel:'ATTRIBUTE'},
  {id:'stella_more_open',screenId:'skillEdit',target:'[data-nav="more"]',advanceOnTarget:true,title:'属性表を見よう',text:'ここを押すと、属性相性を確認できるメニューへ進めるぞ！',progressLabel:'ATTRIBUTE'},
  {id:'stella_type_chart_open',screenId:'moreMenu',target:'#typeChartButton',advanceOnTarget:true,title:'属性相性',text:'ここを押すと、どの属性が有利か確認できるぞ！',progressLabel:'ATTRIBUTE'},
  {id:'stella_type_basic',screenId:'typeChart',target:'#typeBasicChart',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'基本5属性',text:'火・水・雷・風・森は輪になっているよ。水は火に強く、火は森に強いの！',progressLabel:'ATTRIBUTE'},
  {id:'stella_type_special',screenId:'typeChart',target:'#typeSpecialChart',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'特殊3属性',text:'光・闇・星にも相性の輪があるよ。表示の矢印を見れば、すぐ確認できるからね！',progressLabel:'ATTRIBUTE'},
  {id:'stella_mock_battle',screenId:'typeChart',persistAs:'stella_mock_battle',transition:'start_stella_mock_battle',nextStepId:'stella_mock_enemy',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',scene:'academy',title:'次は相性を試そう',text:'装備できたね！ 森属性のグラスビートを用意したよ。炎属性が有利なことを実戦で確かめよう！',progressLabel:'STELLA',nextLabel:'模擬戦へ'},
  {id:'stella_mock_enemy',screenId:'battle',target:'#singleEnemyBox',persistAs:'stella_mock_battle',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'森属性の練習相手',text:'相手は森属性のグラスビート。炎属性の技なら効果抜群だよ！',progressLabel:'MOCK BATTLE'},
  {id:'stella_mock_actor',screenId:'battle',target:'#singlePlayerBox',persistAs:'stella_mock_battle',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'炎属性のフレイガル',text:'先頭は炎属性のフレイガル。相手との属性を見比べてね！',progressLabel:'MOCK BATTLE'},
  {id:'stella_mock_skill_open',screenId:'battle',target:'#battleSkillButton',externalAdvance:true,persistAs:'stella_mock_battle',disableBack:true,title:'技を開こう',text:'ここを押すと、フレイガルの技を選べるぞ！',progressLabel:'MOCK BATTLE'},
  {id:'stella_mock_advantage',screenId:'battle',target:'[data-tutorial-stella-advantage]',externalAdvance:true,persistAs:'stella_mock_battle',disableBack:true,title:'炎属性で攻撃',text:'炎属性の技を押して、効果抜群のダメージを確かめよう！',progressLabel:'MOCK BATTLE'},
  {id:'stella_mock_free',screenId:'battle',target:'#battleCommandPad',persistAs:'stella_mock_battle',waitForEvent:'battle_outcome',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'効果抜群！',text:'今のが有利属性だよ！ あとは自由に戦って、グラスビートを倒してみよう！',progressLabel:'MOCK BATTLE'},
  {id:'stella_mock_victory',screenId:'battle',persistAs:'lumina_intro',nextStepId:'lumina_intro',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',scene:'academy',title:'属性模擬戦クリア！',text:'ばっちり！ 相手の属性を見て、有利な技を選べば戦いを有利に進められるよ！',progressLabel:'STELLA',nextLabel:'次へ'},
  {id:'stella_mock_retry',screenId:'battle',target:'#next',advanceOnTarget:true,nextStepId:'stella_mock_battle',persistAs:'stella_mock_battle',disableBack:true,title:'模擬戦を再開しよう',text:'進行は失われていないぞ！ 「依頼を選び直す」を押して、炎属性の技をもう一度試そう！',progressLabel:'RETRY'},
  {id:'lumina_intro',screenId:'home',persistAs:'lumina_intro',waitForEvent:'lumina_intro',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'academy',title:'工房へ行こう！',text:'属性も分かったな！ 次はルミナの工房で、錬成を教えてもらうぞ！',progressLabel:'PROLOGUE',nextLabel:'工房へ'},
  {id:'first_hunt',screenId:'home',target:'#homeAdventureButton',advanceOnTarget:true,title:'最初の依頼へ',text:'「冒険」を押してください。草原で待つスライムの入門依頼へ向かいます。',progressLabel:'FIRST HUNT'},
  {id:'tutorial_hunt_request',screenId:'battleChoices',target:'[data-tutorial-hunt-start]',externalAdvance:true,persistAs:'first_hunt',title:'草原のスライム',text:'この依頼は既存のEasyルールで進みます。「この依頼へ出発」を押してください。',progressLabel:'FIRST HUNT'},
  {id:'battle_enemy',screenId:'battle',target:'#singleEnemyBox',persistAs:'elna_rescue_start',title:'上が敵です',text:'上側が敵のスライムです。HPを0にすると倒せるぞ！',progressLabel:'BATTLE'},
  {id:'battle_ally',screenId:'battle',target:'#singlePlayerBox',persistAs:'elna_rescue_start',title:'下が味方です',text:'下側が味方です。今は3人でエルナを助けるぞ！',progressLabel:'BATTLE'},
  {id:'battle_hp',screenId:'battle',target:'.battle-vitals',persistAs:'elna_rescue_start',title:'HPを確認',text:'このバーがHPだ。0になる前に交代しよう！',progressLabel:'BATTLE'},
  {id:'battle_type',screenId:'battle',target:'#singleEnemyBox',persistAs:'elna_rescue_start',title:'属性と相性',text:'属性が有利なら、与えるダメージが大きくなるぞ！',progressLabel:'BATTLE'},
  {id:'battle_turn',screenId:'battle',target:'#battleCommandTitle',persistAs:'elna_rescue_start',title:'1回選ぶと1ターン',text:'攻撃を1つ選ぶと、敵も動いて1ターン進むぞ！',progressLabel:'BATTLE'},
  {id:'battle_actor_open',screenId:'battle',target:'#battleSwitchButton',externalAdvance:true,persistAs:'elna_rescue_start',title:'行動者を選ぼう',text:'ここを押すと、戦う仲間を選べるぞ！',progressLabel:'BATTLE'},
  {id:'battle_actor_select',screenId:'battle',target:'[data-tutorial-actor-select]',externalAdvance:true,persistAs:'elna_rescue_start',title:'仲間を交代',text:'交代する仲間を1人選んでみよう！',progressLabel:'BATTLE'},
  {id:'battle_target',screenId:'battle',target:'#singleEnemyBox',advanceOnTarget:true,persistAs:'elna_rescue_start',title:'対象を選ぼう',text:'このスライムを押して、攻撃対象に決めよう！',progressLabel:'BATTLE'},
  {id:'battle_attack_open',screenId:'battle',target:'#battleSkillButton',externalAdvance:true,persistAs:'elna_rescue_start',title:'攻撃を開こう',text:'ここを押すと、使える攻撃を選べるぞ！',progressLabel:'BATTLE'},
  {id:'battle_normal_attack',screenId:'battle',target:'[data-tutorial-normal-attack]',externalAdvance:true,persistAs:'elna_rescue_start',title:'通常攻撃',text:'まずはCOST 0の通常攻撃を押してみよう！',progressLabel:'BATTLE'},
  {id:'battle_skill',screenId:'battle',target:'#battleSkillButton',externalAdvance:true,persistAs:'elna_rescue_start',title:'技を開こう',text:'もう一度ここを押して、今度は技を選ぶぞ！',progressLabel:'BATTLE'},
  {id:'battle_skill_cost',screenId:'battle',target:'[data-tutorial-skill-cost]',persistAs:'elna_rescue_start',title:'技コスト',text:'COSTは、その技を装備するために必要な値だぞ！',progressLabel:'BATTLE'},
  {id:'battle_choose_skill',screenId:'battle',target:'[data-tutorial-skill]',externalAdvance:true,persistAs:'elna_rescue_start',title:'技を使おう',text:'好きな技を1つ押して、実際に使ってみよう！',progressLabel:'BATTLE'},
  {id:'battle_free',screenId:'battle',target:'.battle-command-dock',persistAs:'elna_rescue_start',waitForEvent:'battle_outcome',title:'ここからは自由戦闘',text:'よし！ 交代や技を使って、残りのスライムを倒そう！',progressLabel:'BATTLE',nextLabel:'戦闘を続ける'},
  {id:'battle_retry',screenId:'battle',target:'#next',advanceOnTarget:true,nextStepId:'tutorial_hunt_request',persistAs:'first_hunt',title:'何度でも再挑戦できます',text:'敗北や撤退でも進行は失われません。「依頼を選び直す」から同じ入門依頼へ戻れます。',progressLabel:'RETRY'},
  {id:'elna_rescue_retry',screenId:'battle',target:'#next',advanceOnTarget:true,nextStepId:'elna_rescue_start',persistAs:'elna_rescue_start',title:'エルナを助けに戻ろう',text:'進行は失われていません。「依頼を選び直す」を押して、救援戦をもう一度始めよう。',progressLabel:'RETRY'},
  {id:'elna_rescue_complete',screenId:'battle',speaker:'エルナ',portrait:'images/tutorial/characters/elna_beginner.png',scene:'grassland',persistAs:'elna_contract_intro',nextStepId:'elna_contract_intro',disableBack:true,title:'救援成功',text:'助かった……！ あなたたちが来てくれなかったら危なかった。ありがとう。',progressLabel:'RESCUE',nextLabel:'エルナと話す'},
  {id:'elna_contract_intro',screenId:'battle',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',disableBack:true,title:'エルナの力を借りよう！',text:'契約！ 契約を貰って！',progressLabel:'CONTRACT'},
  {id:'elna_contract_consent',screenId:'battle',speaker:'エルナ',portrait:'images/tutorial/characters/elna_beginner.png',scene:'grassland',disableBack:true,title:'本人エルナの同意',text:'うん。助けてもらったあなたになら、私の力を預けられる。契約を受け取って！',progressLabel:'CONTRACT'},
  {id:'elna_contract_execute',screenId:'battle',input:'elna_contract',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',disableBack:true,title:'契約を結ぼう！',text:'契約書が3回反応して、手形が押されたら成功だ！',progressLabel:'CONTRACT',nextLabel:'契約する'},
  {id:'elna_contract_departure',screenId:'battle',speaker:'エルナ',portrait:'images/tutorial/characters/elna_beginner.png',scene:'grassland',disableBack:true,title:'本人エルナとの別れ',text:'契約は結ばれたよ。呼ばれる契約体は私の力を写した存在。本人の私は、ここでお別れだね。',progressLabel:'CONTRACT'},
  {id:'elna_contract_body',screenId:'battle',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',persistAs:'home_party',waitForEvent:'home_party',disableBack:true,title:'エルナの契約体',text:'できた！ これでエルナの契約体を呼べるぞ！ フレイガル、アクアロンと一緒に編成しておいた！',progressLabel:'NEW ALLY',nextLabel:'ホームへ'},
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
  if(tutorialStepAcceptsTargetAction(step)&&event.target.closest?.(step.target))queueTutorialActionAdvance(step.id);
},true);
document.addEventListener('keydown',event=>{
  if(!tutorialUiState.active)return;
  if(event.key==='Escape'){event.preventDefault();pauseTutorial();return;}
  const bubble=document.getElementById('tutorialBubble');
  if(!bubble?.contains(document.activeElement))return;
  if(event.key==='ArrowLeft'){event.preventDefault();tutorialPrevious();}
  if(event.key==='ArrowRight'){event.preventDefault();tutorialNext();}
});
function handleTutorialViewportScroll(event){
  const bubble=document.getElementById('tutorialBubble');
  if(bubble&&(event.target===bubble||bubble.contains(event.target)))return;
  scheduleTutorialPosition();
}
window.addEventListener('resize',scheduleTutorialPosition);
window.addEventListener('scroll',handleTutorialViewportScroll,true);
updateTutorialMenuSummary();
