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
  materials:Object.freeze(['monster_bone','magic_crystal','unstable_alchemy_matter','raptor_feather'])
});
const TUTORIAL_STELLA_SKILL_ID='skill_elna_middle_01';
const TUTORIAL_STELLA_MOCK=Object.freeze({mapId:'grassland',enemyId:'grassbeat',difficultyId:'easy',actorId:'freigal'});
const TUTORIAL_LUMINA_ALCHEMY=Object.freeze({
  recipeId:'galdra_standard',displayName:'ルミナの入門錬成',resultId:'galdra',
  coinOptionId:'high',coins:250,
  materials:Object.freeze(['monster_bone','magic_crystal','unstable_alchemy_matter','raptor_feather'])
});
const TUTORIAL_REQUIRED_SKIP_FLAGS=Object.freeze([
  'starterContractsGranted','elnaContractGranted','stellaSkillCardGranted',
  'alchemySuppliesGranted','alchemyLessonPrepared','alchemyLessonCompleted',
  'expeditionDispatched','prologueCompleted'
]);
const TUTORIAL_TRANSITIONS=new Set(['start_elna_rescue','grant_stella_skill_card','start_stella_mock_battle','prepare_lumina_alchemy']);
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
const TUTORIAL_REMOVED_STEP_REDIRECTS=Object.freeze({
  party_review:'party_save',dex_elna_detail:'dex_character_back',dex_aquaron:'home_growth_open',
  growth_elna:'growth_elna_details',growth_skill_current:'growth_return',growth_skill_cards:'growth_return',
  request_board:'request_accept',request_reward_preview:'request_reward_claim',
  stella_card_offer:'stella_card_receive',stella_card_received:'stella_skill_open',
  stella_skill_current:'stella_skill_unequip',stella_skill_card_detail:'stella_skill_equip',
  stella_type_special:'stella_mock_battle',stella_mock_actor:'stella_mock_skill_open',
  lumina_recipe_offer:'lumina_alchemy',lumina_recipe:'lumina_materials',lumina_coin:'lumina_start',lumina_rate:'lumina_start',
  battle_ally:'battle_actor_open',battle_hp:'battle_actor_open',battle_type:'battle_actor_open',battle_turn:'battle_actor_open',
  battle_skill_cost:'battle_choose_skill',first_hunt:'elna_rescue_start',tutorial_hunt_request:'elna_rescue_start',battle_retry:'elna_rescue_start',
  victory_exp:'elna_contract_intro',victory_coin:'elna_contract_intro',victory_material:'elna_contract_intro',victory_rank:'elna_contract_intro',
  first_contract:'elna_contract_intro',contract_confirm:'elna_contract_intro',contract_success:'home_party',contract_card:'home_party',
  contract_type:'home_party',contract_skills:'home_party',contract_list:'home_party',contract_future:'home_party',
  growth_open:'home_party',growth_overview:'home_party',party_edit_open:'home_party',party_edit_contract:'home_party',
  home_finish:'home_party',tutorial_complete:'home_party'
});
function tutorialStepIndex(steps,stepId){
  if(!stepId)return 0;
  const resolvedId=TUTORIAL_REMOVED_STEP_REDIRECTS[stepId]||stepId;
  const index=steps.findIndex(step=>step.id===resolvedId);
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
  const maxHeight=Math.max(0,viewport.height-margin*2);
  return {left:margin,top:viewport.height-height-margin,maxHeight,side:'story'};
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
  // A large highlighted card can leave almost no room above or below it. In that
  // case shrinking the guide to the old 96px minimum hid its text and controls
  // behind an undiscoverable inner scroll area. Keep the guide at its natural
  // height (up to the visual viewport) and allow it to overlap a non-interactive
  // part of the spotlight when there is not enough adjacent space.
  const maxHeight=Math.min(Math.max(0,viewport.height-margin*2),Math.max(available,height));
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
  document.body.classList.toggle('tutorial-growth-skill-open',step?.id==='growth_skill_open');
  document.body.classList.toggle('tutorial-stella-skill-action',['stella_skill_unequip','stella_skill_equip'].includes(step?.id));
  overlay?.classList.toggle('is-story-step',story);
  // Full-body portraits support narrative dialogue, but they obscure the game
  // screen when the current step is explaining or highlighting a real UI target.
  // In UI-guide steps the speaker name remains in the bubble and the target wins.
  overlay?.classList.toggle('is-ui-guide-step',Boolean(step?.target));
  if(backdrop){
    backdrop.hidden=!step?.scene;
    backdrop.dataset.scene=step?.scene||'';
  }
  if(layer)layer.hidden=!step?.portrait;
  if(layer)layer.dataset.portrait=step?.portrait?.split('/').pop()?.split('?')[0]?.replace(/\.png$/,'')||'';
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

function tutorialOwnedStarterInstance(rootId){
  if(!Array.isArray(save?.instances))return null;
  const matches=save.instances.filter(instance=>tutorialMonsterInLineage(instance?.id,rootId));
  return matches.find(instance=>instance.tutorialContract===true)
    ||matches.find(instance=>instance.id===rootId)
    ||matches[0]
    ||null;
}
function tutorialMonsterInLineage(monsterId,rootId){
  if(!monsterId||!rootId)return false;
  const pending=[rootId],visited=new Set();
  while(pending.length){
    const id=pending.shift();
    if(!id||visited.has(id))continue;
    if(id===monsterId)return true;
    visited.add(id);
    const monster=typeof by==='function'?by(id):null;
    if(monster?.evolution)pending.push(monster.evolution);
    for(const evolution of monster?.evolutions||[])pending.push(evolution?.to);
  }
  return false;
}
function tutorialInitialPartyReady(party=typeof getPartyInstances==='function'?getPartyInstances():[]){
  const members=party||[];
  return members.length===3
    &&TUTORIAL_STARTER_CONTRACT_IDS.every(rootId=>members.some(instance=>tutorialMonsterInLineage(instance?.id,rootId)))
    &&members.some(instance=>instance?.id==='elna_beginner');
}
function canConfirmTutorialParty(party){
  if(tutorialCurrentStepId()!=='party_save')return true;
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  if(tutorial?.replaying)return true;
  if(tutorialInitialPartyReady(party))return true;
  if(typeof showUiNotice==='function')showUiNotice('フレイガル系統、アクアロン系統、エルナの3体を編成してください。','warning');
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
  const dialogueSkip=document.getElementById('tutorialDialogueSkipButton');
  const skip=document.getElementById('tutorialSkipButton');
  const next=document.getElementById('tutorialNextButton');
  const actions=next?.closest('.tutorial-actions');
  const requiresAction=tutorialStepRequiresAction(step);
  back.disabled=tutorialElnaContractBusy||tutorialUiState.index===0||step.disableBack;
  if(dialogueSkip){
    dialogueSkip.hidden=tutorialDialogueSkipTargetIndex()<0;
    dialogueSkip.disabled=tutorialElnaContractBusy;
  }
  skip.disabled=tutorialElnaContractBusy;
  document.querySelector('.tutorial-pause')?.toggleAttribute('disabled',tutorialElnaContractBusy);
  skip.textContent=tutorialUiState.persist?(tutorialUiState.replay?'再閲覧を終了':'全体スキップ'):'閉じる';
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
  const resolvedStepId=resolveTutorialExpeditionResumeStep(flowId,stepId,replay);
  clearTutorialUi();
  tutorialUiState.active=true;tutorialUiState.flowId=flowId;tutorialUiState.steps=steps;
  tutorialUiState.index=tutorialStepIndex(steps,resolvedStepId);tutorialUiState.persist=persist;
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
function tutorialLinkedStepIndex(index){
  const step=tutorialUiState.steps[index];
  if(!step)return -1;
  const linkedId=tutorialUiState.replay&&step.replayNextStepId?step.replayNextStepId:step.nextStepId;
  if(linkedId)return tutorialStepIndex(tutorialUiState.steps,linkedId);
  return index<tutorialUiState.steps.length-1?index+1:-1;
}
function tutorialDialogueSkipTargetIndex(){
  if(!tutorialUiState.active)return -1;
  const current=tutorialUiState.steps[tutorialUiState.index];
  if(!current||tutorialStepRequiresAction(current)||current.transition||current.input||current.waitForEvent||current.continueAt)return -1;
  let index=tutorialUiState.index;
  const visited=new Set([index]);
  while(visited.size<=tutorialUiState.steps.length){
    const nextIndex=tutorialLinkedStepIndex(index);
    if(nextIndex<0||visited.has(nextIndex))return -1;
    visited.add(nextIndex);
    const next=tutorialUiState.steps[nextIndex];
    if(tutorialStepRequiresAction(next)||next.transition||next.input||next.waitForEvent||next.continueAt||nextIndex===tutorialUiState.steps.length-1)return nextIndex;
    index=nextIndex;
  }
  return -1;
}
function skipTutorialDialogue(){
  if(tutorialElnaContractBusy||!tutorialUiState.active)return false;
  const nextIndex=tutorialDialogueSkipTargetIndex();
  if(nextIndex<0)return false;
  tutorialUiState.index=nextIndex;tutorialUiState.lastFocusedStep=null;
  persistTutorialStep();renderTutorialStep();return true;
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
function tutorialShouldUseReplayNextStep(step){
  if(tutorialUiState.replay)return true;
  if(step?.transition==='prepare_lumina_alchemy'
    &&typeof currentTutorialState==='function'
    &&currentTutorialState()?.alchemyLessonCompleted===true)return true;
  if(step?.id==='expedition_intro'&&tutorialShouldUseExistingExpeditionPath(step.id)){
    return markTutorialExistingExpeditionGuided();
  }
  return false;
}
function tutorialNext(actionCompleted=false){
  if(!tutorialUiState.active||tutorialElnaContractBusy&&actionCompleted!==true)return;
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(step?.input==='elna_contract'&&actionCompleted!==true){void confirmTutorialElnaContract();return;}
  if(tutorialStepRequiresAction(step)&&actionCompleted!==true)return;
  if(!tutorialStepCanAdvance(step))return;
  if(step?.transition&&!runTutorialTransition(step.transition))return;
  if(step?.waitForEvent){persistTutorialStep();clearTutorialUi();updateTutorialMenuSummary();return;}
  const nextStepId=tutorialShouldUseReplayNextStep(step)&&step?.replayNextStepId?step.replayNextStepId:step?.nextStepId;
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
  const flowId=tutorialUiState.flowId;
  const replay=tutorialUiState.replay;
  if(persist){
    if(flowId===TUTORIAL_MAIN_FLOW_ID){if(!commitTutorialPrologueCompletion())return;}
    else{completeTutorial();if(typeof saveGame==='function'&&!saveGame())return;}
  }
  clearTutorialUi();
  if(flowId===TUTORIAL_MAIN_FLOW_ID&&!replay&&typeof show==='function')show('home');
  else restoreTutorialReturnScreen(returnScreen);
  updateTutorialMenuSummary();
}
function pauseTutorial(){
  if(tutorialElnaContractBusy||!tutorialUiState.active)return;
  const returnScreen=tutorialUiState.returnScreen;
  clearTutorialUi();restoreTutorialReturnScreen(returnScreen);updateTutorialMenuSummary();
}
function tutorialSkipRewardInstance(id,extraFields=null){
  const existing=Array.isArray(save?.instances)?save.instances.find(instance=>instance?.id===id&&instance?.guest!==true):null;
  return existing||(typeof addInstance==='function'?addInstance(id,1,0,extraFields):null);
}
function commitTutorialFullSkip(){
  if(typeof currentTutorialState!=='function'||typeof save==='undefined')return false;
  const snapshot=JSON.stringify(save);
  try{
    const initial=currentTutorialState();
    if(initial.replaying){
      skipTutorial();
      if(typeof saveGame!=='function'||!saveGame())throw new Error('tutorial_replay_exit_save');
      return true;
    }
    const starters=TUTORIAL_STARTER_CONTRACT_IDS.map(id=>tutorialSkipRewardInstance(id,{tutorialContract:true}));
    const elna=tutorialSkipRewardInstance('elna_beginner',{tutorialContract:true,tutorialRole:'contract_body'});
    const alchemyPartner=tutorialSkipRewardInstance(TUTORIAL_LUMINA_ALCHEMY.resultId,{tutorialAlchemyLesson:true});
    if(starters.some(instance=>!instance)||!elna||!alchemyPartner)throw new Error('tutorial_skip_contract_reward');
    elna.tutorialContract=true;elna.tutorialRole='contract_body';alchemyPartner.tutorialAlchemyLesson=true;

    const cardWasGranted=currentTutorialState().stellaSkillCardGranted===true;
    if(typeof SKILL_BY_ID!=='object'||!SKILL_BY_ID[TUTORIAL_STELLA_SKILL_ID])throw new Error('tutorial_skip_skill_missing');
    if(!save.skillCards||typeof save.skillCards!=='object')save.skillCards={};
    if(!cardWasGranted){
      save.skillCards[TUTORIAL_STELLA_SKILL_ID]=Math.max(0,Math.floor(Number(save.skillCards[TUTORIAL_STELLA_SKILL_ID])||0))+1;
    }else save.skillCards[TUTORIAL_STELLA_SKILL_ID]=Math.max(1,Math.floor(Number(save.skillCards[TUTORIAL_STELLA_SKILL_ID])||0));
    for(const flag of TUTORIAL_REQUIRED_SKIP_FLAGS){
      if(currentTutorialState()[flag]===true)continue;
      if(typeof markTutorialOnce!=='function'||!markTutorialOnce(flag))throw new Error(`tutorial_skip_flag_${flag}`);
    }
    if(typeof setTutorialElnaGuestActive==='function')setTutorialElnaGuestActive(false);
    save.party=[...starters.map(instance=>instance.uid),elna.uid];
    save.progress.storyFlags={...(save.progress.storyFlags||{}),prologueCompleted:true};
    skipTutorial();
    if(typeof saveGame!=='function'||!saveGame())throw new Error('tutorial_skip_save');
    tutorialBattleSession.active=false;tutorialBattleSession.kind=null;tutorialBattleSession.enemyQueue=[];
    if(typeof deactivateTutorialAlchemyLesson==='function')deactivateTutorialAlchemyLesson();
    try{
      if(typeof updateParty==='function')updateParty();
      if(typeof renderParty==='function')renderParty();
      if(typeof renderDex==='function')renderDex();
      if(typeof updateItems==='function')updateItems();
      if(typeof updateAppResourceBar==='function')updateAppResourceBar();
    }catch(error){console.error('序章スキップ後の画面更新に失敗しました。',error);}
    return true;
  }catch(error){
    save=JSON.parse(snapshot);
    console.error('序章のスキップ状態を保存できませんでした。',error);
    if(typeof showUiNotice==='function')showUiNotice('序章のスキップ状態を保存できませんでした。もう一度お試しください。','warning');
    return false;
  }
}
function requestTutorialSkip(){
  if(tutorialElnaContractBusy||!tutorialUiState.active)return;
  if(!tutorialUiState.persist){pauseTutorial();return;}
  const replay=tutorialUiState.replay;
  if(!confirm(replay?'チュートリアルの再閲覧を終了しますか？':'必須チュートリアルを全体スキップしますか？ 必須報酬を受け取り、自由行動へ移ります。'))return;
  const returnScreen=tutorialUiState.returnScreen;
  if(!commitTutorialFullSkip())return;
  clearTutorialUi();
  if(!replay&&typeof show==='function')show('home');else restoreTutorialReturnScreen(returnScreen);
  updateTutorialMenuSummary();
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
function resumeTutorialMainFlowAfterEvent(stepId,replay=false){
  if(!stepId)return false;
  const resume=()=>{
    const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
    if(!tutorial||(tutorial.status!=='in_progress'&&!tutorial.replaying))return false;
    return startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId,persist:true,replay:replay||tutorial.replaying===true});
  };
  // External renderers (battle result, contract animation and alchemy result)
  // finish their own DOM update in the current call stack. Reopen the guide on
  // the next task so that their final paint cannot hide or replace it.
  if(typeof setTimeout==='function'){setTimeout(resume,0);return true;}
  return resume();
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
    const ready=activeScreenId()==='battle'&&tutorialMonsterInLineage(player?.id,TUTORIAL_STELLA_MOCK.actorId)&&enemy?.id===TUTORIAL_STELLA_MOCK.enemyId;
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
  if(!isTutorialStellaMockBattleActive()||!tutorialMonsterInLineage(actor?.id,TUTORIAL_STELLA_MOCK.actorId)||target?.id!==TUTORIAL_STELLA_MOCK.enemyId)return false;
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
  if(transition==='prepare_lumina_alchemy')return prepareTutorialLuminaAlchemy();
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
  const materials=tutorialSupplyRewardMaterialEntries();
  if(materials.some(entry=>!entry.item?.alchemyMaterial))return false;
  list.innerHTML=`<article class="enemy-choice-card difficulty-card-easy tutorial-request-card" data-tutorial-request-report>
    <div class="hunt-card-body">
      <div class="hunt-card-badges"><span class="hunt-recommended">序章依頼</span></div>
      <div class="tutorial-request-summary"><small>救援報告</small><h2>エルナ救援の報告</h2><p>草原での救援を依頼所へ報告しよう。</p></div>
      <div class="hunt-primary-rewards"><span><small>COIN</small><strong>250</strong></span><span><small>MATERIAL</small><strong>4種</strong></span></div>
      <p class="hunt-danger">受け取った素材とコインは、後の錬成で使います。</p>
      <button type="button" class="hunt-accept-button" data-tutorial-request-open onclick="openTutorialSupplyRequest()" ${canOpen?'':'disabled'}>報告して報酬を確認 ›</button>
    </div></article>`;
  return true;
}
function openTutorialSupplyRequest(){
  if(tutorialCurrentStepId()!=='request_accept')return false;
  tutorialNext(true);
  return true;
}
function renderTutorialSupplyReward(){
  const list=document.getElementById('tutorialRequestRewardList');
  const status=document.getElementById('tutorialRequestRewardStatus');
  const button=document.getElementById('tutorialRequestClaimButton');
  if(!list||!status||!button)return false;
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  const alreadyGranted=tutorial?.alchemySuppliesGranted===true;
  list.innerHTML=`<span><small>COIN</small><strong>250枚</strong></span>${tutorialSupplyRewardMaterialEntries().map(({item})=>
    `<span><small>${item?.icon||'📦'} MATERIAL</small><strong>${item?.name||'錬成素材'} ×1</strong></span>`
  ).join('')}`;
  status.textContent=alreadyGranted&&!tutorial?.replaying
    ?'報酬は受取済みです。素材とコインは保持されています。'
    :'この報酬は一度だけ受け取れます。途中で再開しても二重には増えません。';
  const canClaim=tutorialCurrentStepId()==='request_reward_claim'&&!tutorialSupplyRewardBusy;
  button.disabled=!canClaim;
  button.textContent=tutorialSupplyRewardBusy?'保存中…':alreadyGranted&&!tutorial?.replaying?'受取済みを確認':'報酬を受け取る';
  return true;
}
function commitTutorialAlchemySupplyReward(){
  if(typeof currentTutorialState!=='function'||typeof save==='undefined')return null;
  const tutorial=currentTutorialState();
  if(tutorial.replaying)return {granted:false,replay:true};
  const snapshot=JSON.stringify(save);
  try{
    const alreadyGranted=tutorial.alchemySuppliesGranted===true;
    if(!alreadyGranted){
      if(typeof ensureContractScrollItem==='function')ensureContractScrollItem();
      const materials=tutorialSupplyRewardMaterialEntries();
      if(materials.some(entry=>!entry.item?.alchemyMaterial))throw new Error('tutorial_alchemy_material_missing');
      save.coins=Math.max(0,Number(save.coins)||0)+TUTORIAL_ALCHEMY_SUPPLY_REWARD.coins;
      materials.forEach(({itemId})=>{
        save.items[itemId]=Math.max(0,Number(save.items[itemId])||0)+1;
        if(typeof registerItemDex==='function')registerItemDex(itemId);
      });
      if(typeof markTutorialAlchemySuppliesGranted!=='function'||!markTutorialAlchemySuppliesGranted()){
        throw new Error('tutorial_alchemy_reward_flag');
      }
    }
    if(typeof setTutorialStep==='function')setTutorialStep('request_reward_received');
    if(typeof saveGame!=='function'||!saveGame())throw new Error('tutorial_alchemy_reward_save');
    if(typeof updateItems==='function')updateItems();
    if(typeof updateAppResourceBar==='function')updateAppResourceBar();
    return {granted:!alreadyGranted,replay:false};
  }catch(error){
    save=JSON.parse(snapshot);
    console.error('序章依頼の報酬を保存できませんでした。',error);
    if(typeof showUiNotice==='function')showUiNotice('報酬を保存できませんでした。もう一度お試しください。','warning');
    return null;
  }
}
function claimTutorialAlchemySupplyReward(){
  if(tutorialSupplyRewardBusy||tutorialCurrentStepId()!=='request_reward_claim')return false;
  tutorialSupplyRewardBusy=true;
  renderTutorialSupplyReward();
  const result=commitTutorialAlchemySupplyReward();
  tutorialSupplyRewardBusy=false;
  renderTutorialSupplyReward();
  if(!result)return false;
  if(tutorialUiState.active&&tutorialCurrentStepId()==='request_reward_claim')tutorialNext(true);
  else updateTutorialMenuSummary();
  return true;
}

function tutorialLuminaAlchemyResourceEntries(){
  return TUTORIAL_LUMINA_ALCHEMY.materials.map(itemId=>({itemId,item:ITEM_BY_ID[itemId]}));
}
function tutorialLuminaAlchemyHasResources(){
  return Number(save?.coins||0)>=TUTORIAL_LUMINA_ALCHEMY.coins
    &&tutorialLuminaAlchemyResourceEntries().every(({itemId,item})=>item?.alchemyMaterial&&Number(save?.items?.[itemId]||0)>=1);
}
function prepareTutorialLuminaAlchemy(){
  if(typeof currentTutorialState!=='function'||typeof save==='undefined')return false;
  const tutorial=currentTutorialState();
  if(tutorial.replaying||tutorial.alchemyLessonCompleted===true){
    if(typeof deactivateTutorialAlchemyLesson==='function')deactivateTutorialAlchemyLesson();
    if(typeof showAlchemy==='function')showAlchemy();
    return true;
  }
  const snapshot=JSON.stringify(save);
  try{
    if(tutorial.alchemyLessonPrepared!==true){
      const resources=tutorialLuminaAlchemyResourceEntries();
      if(resources.some(({item})=>!item?.alchemyMaterial))throw new Error('tutorial_lumina_material_missing');
      save.coins=Math.max(Number(save.coins)||0,TUTORIAL_LUMINA_ALCHEMY.coins);
      resources.forEach(({itemId})=>{
        save.items[itemId]=Math.max(Number(save.items?.[itemId])||0,1);
        if(typeof registerItemDex==='function')registerItemDex(itemId);
      });
      if(typeof markTutorialAlchemyLessonPrepared!=='function'||!markTutorialAlchemyLessonPrepared())throw new Error('tutorial_lumina_prepare_flag');
    }
    if(!tutorialLuminaAlchemyHasResources())throw new Error('tutorial_lumina_resources_spent');
    if(typeof setTutorialStep==='function')setTutorialStep('lumina_alchemy');
    if(typeof saveGame!=='function'||!saveGame())throw new Error('tutorial_lumina_prepare_save');
    if(typeof activateTutorialAlchemyLesson!=='function'||!activateTutorialAlchemyLesson(TUTORIAL_LUMINA_ALCHEMY))throw new Error('tutorial_lumina_activate');
    return true;
  }catch(error){
    save=JSON.parse(snapshot);
    console.error('ルミナの入門錬成を準備できませんでした。',error);
    if(typeof showUiNotice==='function')showUiNotice(error?.message==='tutorial_lumina_resources_spent'?'入門錬成用の素材かコインが不足しています。':'入門錬成を準備できませんでした。もう一度お試しください。','warning');
    return false;
  }
}
function commitTutorialLuminaAlchemySuccess(){
  if(typeof currentTutorialState!=='function')return false;
  const tutorial=currentTutorialState();
  if(tutorial.replaying)return true;
  if(tutorial.alchemyLessonCompleted===true)return false;
  if(typeof markTutorialAlchemyLessonCompleted!=='function'||!markTutorialAlchemyLessonCompleted())return false;
  if(typeof setTutorialStep==='function')setTutorialStep('expedition_intro');
  return true;
}
function handleTutorialAlchemyConfirmationOpened(){
  return tutorialCurrentStepId()==='lumina_start'&&queueTutorialActionAdvance('lumina_start');
}
function handleTutorialAlchemyExecutionStarted(){
  return tutorialCurrentStepId()==='lumina_execute'&&queueTutorialActionAdvance('lumina_execute');
}
function handleTutorialLuminaAlchemyCompleted(){
  const replay=typeof currentTutorialState==='function'&&currentTutorialState().replaying===true;
  return resumeTutorialMainFlowAfterEvent('lumina_alchemy_result',replay);
}
const TUTORIAL_EXPEDITION_OPERATION_STEPS=Object.freeze([
  'expedition_intro','expedition_home_open','expedition_destination','expedition_distance',
  'expedition_member','expedition_suitability','expedition_dispatch','expedition_active'
]);
function tutorialHasExistingExpeditionActivity(){
  const expeditions=save?.expeditions;
  return Array.isArray(expeditions?.active)&&expeditions.active.length>0
    ||Math.max(0,Math.floor(Number(expeditions?.completedCount)||0))>0;
}
function tutorialHasActivePrologueExpedition(){
  return Array.isArray(save?.expeditions?.active)
    &&save.expeditions.active.some(entry=>entry?.tutorialPrologue===true);
}
function tutorialShouldUseExistingExpeditionPath(stepId=tutorialCurrentStepId()){
  if(!TUTORIAL_EXPEDITION_OPERATION_STEPS.includes(stepId))return false;
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  if(!tutorial)return false;
  if(stepId==='expedition_active'&&tutorialHasActivePrologueExpedition())return false;
  return tutorial.replaying===true||tutorial.expeditionDispatched===true||tutorialHasExistingExpeditionActivity();
}
function markTutorialExistingExpeditionGuided(){
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  if(!tutorial)return false;
  if(tutorial.replaying===true||tutorial.expeditionDispatched===true)return true;
  if(!tutorialHasExistingExpeditionActivity())return false;
  return typeof markTutorialExpeditionDispatched==='function'&&markTutorialExpeditionDispatched();
}
function resolveTutorialExpeditionResumeStep(flowId,stepId,replay=false){
  if(flowId!==TUTORIAL_MAIN_FLOW_ID||!stepId||!tutorialShouldUseExistingExpeditionPath(stepId))return stepId;
  if(!replay&&!markTutorialExistingExpeditionGuided())return stepId;
  return 'expedition_replay';
}
function tutorialExpeditionCandidateInstance(){
  const candidates=typeof expeditionAvailableInstances==='function'?expeditionAvailableInstances():[];
  return candidates.find(instance=>instance.id===TUTORIAL_LUMINA_ALCHEMY.resultId)||candidates[0]||null;
}
function shouldMarkTutorialExpeditionMember(uid){
  // Distance selection renders the expedition screen before the tutorial engine
  // advances to expedition_member. Mark the candidate during both steps so the
  // next render can immediately find, scroll to, and spotlight the real button.
  return ['expedition_distance','expedition_member'].includes(tutorialCurrentStepId())&&uid===tutorialExpeditionCandidateInstance()?.uid;
}
function handleTutorialExpeditionDestinationSelected(mapId){
  if(tutorialCurrentStepId()!=='expedition_destination'||mapId!=='grassland')return false;
  tutorialNext(true);return true;
}
function handleTutorialExpeditionDistanceSelected(distanceId){
  if(tutorialCurrentStepId()!=='expedition_distance'||distanceId!=='short')return false;
  tutorialNext(true);return true;
}
function handleTutorialExpeditionMemberSelected(uid,selected){
  if(tutorialCurrentStepId()!=='expedition_member'||selected!==true||uid!==tutorialExpeditionCandidateInstance()?.uid)return false;
  tutorialNext(true);return true;
}
function commitTutorialExpeditionDispatch(entry){
  if(tutorialCurrentStepId()!=='expedition_dispatch')return true;
  if(typeof currentTutorialState!=='function'||!entry)return false;
  const tutorial=currentTutorialState();
  if(tutorial.replaying||tutorial.expeditionDispatched===true)return false;
  if(entry.mapId!=='grassland'||entry.distanceId!=='short'||entry.memberUids.length<1)return false;
  entry.tutorialPrologue=true;
  if(typeof markTutorialExpeditionDispatched!=='function'||!markTutorialExpeditionDispatched())return false;
  if(typeof setTutorialStep==='function')setTutorialStep('expedition_active');
  return true;
}
function handleTutorialExpeditionStarted(entry){
  if(!entry?.tutorialPrologue||tutorialCurrentStepId()!=='expedition_dispatch')return false;
  tutorialNext(true);return true;
}
function commitTutorialPrologueCompletion(){
  if(typeof currentTutorialState!=='function'||typeof save==='undefined')return false;
  const snapshot=JSON.stringify(save);
  try{
    const tutorial=currentTutorialState();
    if(tutorial.replaying){
      completeTutorial();
    }else{
      if(tutorial.expeditionDispatched!==true)throw new Error('tutorial_expedition_required');
      if(tutorial.prologueCompleted!==true&&(typeof markTutorialPrologueCompleted!=='function'||!markTutorialPrologueCompleted()))throw new Error('tutorial_prologue_flag');
      save.progress.storyFlags={...(save.progress.storyFlags||{}),prologueCompleted:true};
      completeTutorial();
    }
    if(typeof saveGame!=='function'||!saveGame())throw new Error('tutorial_prologue_save');
    return true;
  }catch(error){
    save=JSON.parse(snapshot);
    console.error('序章の完了状態を保存できませんでした。',error);
    if(typeof showUiNotice==='function')showUiNotice('序章の完了状態を保存できませんでした。もう一度お試しください。','warning');
    return false;
  }
}

function tutorialStellaSkillCard(){return typeof SKILL_BY_ID==='object'?SKILL_BY_ID[TUTORIAL_STELLA_SKILL_ID]||null:null;}
function tutorialStellaSkillTargetInstance(){return tutorialElnaContractInstance();}
function tutorialStellaSkillIsEquipped(){
  const instance=tutorialStellaSkillTargetInstance();
  return Boolean(instance&&(save?.equippedSkills?.[instance.uid]||[]).includes(TUTORIAL_STELLA_SKILL_ID));
}
function tutorialStellaSkillCanEquip(){
  const instance=tutorialStellaSkillTargetInstance();
  const skill=tutorialStellaSkillCard();
  if(!instance||!skill)return false;
  const unit=by(instance.id);
  const equipped=save?.equippedSkills?.[instance.uid]||[];
  return equipped.length<3&&equippedSkillCost(instance)+skill.cost<=skillCostLimitFor(unit,instance)
    &&isSkillAllowedForMonster(skill.id,unit)&&availableSkillCount(skill.id)>0;
}
function renderTutorialStellaSkillCard(){
  const card=tutorialStellaSkillCard();
  const visual=document.getElementById('tutorialStellaSkillCardVisual');
  const status=document.getElementById('tutorialStellaSkillCardStatus');
  const button=document.getElementById('tutorialStellaSkillEditButton');
  if(!card||!visual||!status||!button)return false;
  visual.className=`tutorial-stella-skill-card ${skillCardClass(skillTypes(card))}`;
  visual.innerHTML=`${skillCardHeader(card)}<p class="skill-type-line ${skillTypes(card)[0]}">${skillTypeLabel(skillTypes(card))} / 威力${card.power}</p><p>${moveEffectText(skillToMove(card.id))}</p><small>エルナの契約体が装備できます。</small>`;
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  status.textContent=tutorialStellaSkillIsEquipped()?'連続斬りは装備済みです。':tutorial?.stellaSkillCardGranted?'技カードを受け取りました。':'ステラから受け取る技カードです。';
  button.disabled=tutorialCurrentStepId()!=='stella_skill_open'||tutorialStellaCardBusy;
  button.textContent=tutorialStellaCardBusy?'準備中…':'エルナの技編集を開く';
  return true;
}
function commitTutorialStellaSkillCard(){
  if(tutorialStellaCardBusy||typeof currentTutorialState!=='function'||typeof save==='undefined')return null;
  const tutorial=currentTutorialState();
  if(tutorial.replaying)return {granted:false,replay:true};
  const snapshot=JSON.stringify(save);
  tutorialStellaCardBusy=true;
  try{
    const card=tutorialStellaSkillCard();
    const instance=tutorialStellaSkillTargetInstance();
    if(!card||card.deprecated||!instance||!isSkillAllowedForMonster(card.id,by(instance.id)))throw new Error('tutorial_stella_skill_invalid');
    const alreadyGranted=tutorial.stellaSkillCardGranted===true;
    if(!alreadyGranted){
      if(!save.skillCards||typeof save.skillCards!=='object')save.skillCards={};
      save.skillCards[card.id]=Math.max(0,Math.floor(Number(save.skillCards[card.id])||0))+1;
      if(typeof markTutorialStellaSkillCardGranted!=='function'||!markTutorialStellaSkillCardGranted())throw new Error('tutorial_stella_skill_flag');
    }
    if(typeof setTutorialStep==='function')setTutorialStep('stella_skill_open');
    if(typeof saveGame!=='function'||!saveGame())throw new Error('tutorial_stella_skill_save');
    return {granted:!alreadyGranted,replay:false};
  }catch(error){
    save=JSON.parse(snapshot);
    console.error('ステラの技カードを保存できませんでした。',error);
    if(typeof showUiNotice==='function')showUiNotice('技カードを保存できませんでした。もう一度お試しください。','warning');
    return null;
  }finally{
    tutorialStellaCardBusy=false;
    renderTutorialStellaSkillCard();
  }
}
function openTutorialStellaSkillEdit(){
  if(tutorialStellaCardBusy||tutorialCurrentStepId()!=='stella_skill_open')return false;
  const instance=tutorialStellaSkillTargetInstance();
  if(!instance||typeof openSkillEdit!=='function')return false;
  tutorialStellaCardBusy=true;
  try{
    openSkillEdit(instance.uid);
    if(typeof resetSkillFilters==='function')resetSkillFilters();
    tutorialNext(true);
    return true;
  }finally{
    tutorialStellaCardBusy=false;
  }
}
function shouldMarkTutorialStellaUnequip(uid){
  return tutorialCurrentStepId()==='stella_skill_unequip'&&uid===tutorialStellaSkillTargetInstance()?.uid;
}
function shouldMarkTutorialStellaSkillCard(skillId,uid){
  return ['stella_skill_equip','stella_attribute_intro'].includes(tutorialCurrentStepId())
    &&skillId===TUTORIAL_STELLA_SKILL_ID&&uid===tutorialStellaSkillTargetInstance()?.uid;
}
function handleTutorialStellaSkillUnequipped(uid){
  if(tutorialCurrentStepId()!=='stella_skill_unequip'||uid!==tutorialStellaSkillTargetInstance()?.uid||!tutorialStellaSkillCanEquip())return false;
  tutorialNext(true);
  return true;
}
function handleTutorialStellaSkillEquipped(skillId,uid){
  if(tutorialCurrentStepId()!=='stella_skill_equip'||skillId!==TUTORIAL_STELLA_SKILL_ID||uid!==tutorialStellaSkillTargetInstance()?.uid)return false;
  tutorialNext(true);
  return true;
}

function tutorialFirstHuntIsPending(){
  if(typeof currentTutorialState!=='function')return false;
  const tutorial=currentTutorialState();
  return (tutorial.status==='in_progress'||tutorial.replaying)&&tutorial.stepId==='first_hunt';
}
function tutorialDiagnosticsWaitingMode(step){
  if(!step)return 'none';
  if(step.input)return 'input';
  if(step.waitForEvent)return 'event';
  const mode=tutorialStepMode(step);
  if(mode===TUTORIAL_STEP_MODE.TARGET_ACTION)return 'target_action';
  if(mode===TUTORIAL_STEP_MODE.EXTERNAL_ACTION)return 'external_action';
  if(step.continueAt)return 'continue';
  return 'dialogue';
}
function tutorialDiagnosticsSnapshot(){
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  const active=tutorialUiState.active===true;
  const mainSteps=tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID);
  const persistedStepId=typeof tutorial?.stepId==='string'?tutorial.stepId:'';
  const persistedIndex=persistedStepId?tutorialStepIndex(mainSteps,persistedStepId):-1;
  const activeStep=active?tutorialUiState.steps[tutorialUiState.index]||null:null;
  const persistedStep=persistedIndex>=0?mainSteps[persistedIndex]||null:null;
  const step=activeStep||persistedStep;
  const steps=active?tutorialUiState.steps:mainSteps;
  const stepIndex=active?tutorialUiState.index:persistedIndex;
  const targetRequired=active&&Boolean(step?.target);
  let targetPresent=false;
  let screen='';
  try{
    targetPresent=targetRequired&&Boolean(document.querySelector(step.target));
    screen=active?activeScreenId()||'':'';
  }catch(_error){
    targetPresent=false;
    screen='';
  }
  return {
    status:tutorial?.status,
    completed:tutorial?.completed===true,
    skipped:tutorial?.skipped===true,
    replaying:tutorial?.replaying===true,
    active,
    paused:!active&&(tutorial?.status==='in_progress'||tutorial?.replaying===true),
    persistedStepId,
    flowId:active?tutorialUiState.flowId:(persistedStep?TUTORIAL_MAIN_FLOW_ID:''),
    stepId:step?.id||'',
    stepIndex:Number.isInteger(stepIndex)&&stepIndex>=0?stepIndex:null,
    stepCount:Array.isArray(steps)?steps.length:0,
    waitingMode:tutorialDiagnosticsWaitingMode(step),
    waitForEvent:step?.waitForEvent||'',
    input:step?.input||'',
    continueAt:step?.continueAt||'',
    targetRequired,
    targetPresent,
    transitionPending:active&&tutorialUiState.advancePendingStepId===step?.id,
    expectedScreen:active?step?.screenId||'':'',
    activeScreen:screen
  };
}
function tutorialCurrentStepId(){return tutorialUiState.active?tutorialUiState.steps[tutorialUiState.index]?.id:null;}
function shouldOfferTutorialHunt(){
  return tutorialFirstHuntIsPending()||['first_hunt','tutorial_hunt_request','battle_retry'].includes(tutorialCurrentStepId());
}
function renderTutorialHuntChoice(list){
  if(renderTutorialSupplyRequest(list))return true;
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
function preparedTutorialHuntRequest(requestId){
  const existing=preparedHuntRequest(requestId,TUTORIAL_FIRST_HUNT.mapId,TUTORIAL_FIRST_HUNT.enemyId,TUTORIAL_FIRST_HUNT.difficultyId);
  if(existing)return existing;
  const map=MAPS.find(entry=>entry.id===TUTORIAL_FIRST_HUNT.mapId);
  const mon=by(TUTORIAL_FIRST_HUNT.enemyId);
  if(!map||!mon)return null;
  return registerHuntRequest(createHuntRequest(map,mon,TUTORIAL_FIRST_HUNT.difficultyId,[]));
}
function startTutorialHunt(requestId){
  const request=preparedTutorialHuntRequest(requestId);
  if(!request){showBattleChoices();return false;}
  tutorialBattleSession.active=true;tutorialBattleSession.firstSkillUsed=false;
  try{
    startChosenBattle(TUTORIAL_FIRST_HUNT.mapId,TUTORIAL_FIRST_HUNT.enemyId,TUTORIAL_FIRST_HUNT.difficultyId,request.requestId);
  }catch(error){
    console.error('チュートリアル戦闘を開始できませんでした。',error);
  }
  const ready=activeScreenId()==='battle'&&player?.id&&enemy?.id;
  if(!ready){tutorialBattleSession.active=false;showBattleChoices();return false;}
  const step=tutorialUiState.active?tutorialUiState.steps[tutorialUiState.index]:null;
  if(step?.id==='tutorial_hunt_request')tutorialNext(true);
  return true;
}
function handleTutorialBattleAction(action,details={}){
  if(isTutorialStellaMockBattleActive()){
    const currentStep=tutorialCurrentStepId();
    if(action==='skill_panel_opened'&&currentStep==='stella_mock_skill_open')return queueTutorialActionAdvance(currentStep);
    if(action==='skill'&&currentStep==='stella_mock_advantage'&&isTutorialStellaMockAdvantageMove(details.move,details.actor,details.target)){
      tutorialBattleSession.advantageUsed=true;
      return queueTutorialActionAdvance(currentStep);
    }
    return false;
  }
  if(!isTutorialRescueBattleActive())return false;
  if(action==='skill')tutorialBattleSession.firstSkillUsed=true;
  const currentStep=tutorialCurrentStepId();
  const expectedStep=action==='actor_picker_opened'?'battle_actor_open'
    :action==='skill_panel_opened'&&['battle_attack_open','battle_skill'].includes(currentStep)?currentStep
    :({actor_selected:'battle_actor_select',normal_attack:'battle_normal_attack',skill:'battle_choose_skill'}[action]||null);
  if(!expectedStep||currentStep!==expectedStep)return false;
  return queueTutorialActionAdvance(currentStep);
}
function handleTutorialFirstSkillUsed(){
  if(!isTutorialRescueBattleActive()||tutorialBattleSession.firstSkillUsed)return false;
  tutorialBattleSession.firstSkillUsed=true;
  return handleTutorialBattleAction('skill')||true;
}
function handleTutorialBattleOutcome(kind,rewards={}){
  if(!tutorialBattleSession.active)return false;
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():null;
  if(!tutorial||(tutorial.status!=='in_progress'&&!tutorial.replaying)){tutorialBattleSession.active=false;tutorialBattleSession.kind=null;return false;}
  const rescue=tutorialBattleSession.kind==='elna_rescue';
  const stellaMock=tutorialBattleSession.kind==='stella_mock';
  if(stellaMock){
    const cleared=kind==='victory'&&tutorialBattleSession.advantageUsed===true;
    tutorialBattleSession.active=false;tutorialBattleSession.kind=null;tutorialBattleSession.advantageUsed=false;tutorialBattleSession.enemyQueue=[];
    setTutorialStep(cleared?'lumina_intro':'stella_mock_battle');
    if(typeof saveGame==='function')saveGame();
    if(typeof endPartyRecovery==='function')endPartyRecovery();
    resumeTutorialMainFlowAfterEvent(cleared?'stella_mock_victory':'stella_mock_retry',tutorial.replaying);
    return true;
  }
  if(kind==='victory'){
    const nextStep=rescue?'elna_rescue_complete':'victory_exp';
    tutorialBattleSession.active=false;tutorialBattleSession.kind=null;tutorialBattleSession.enemyQueue=[];
    setTutorialStep(rescue?'elna_contract_intro':'first_contract');
    if(typeof saveGame==='function')saveGame();
    resumeTutorialMainFlowAfterEvent(nextStep,tutorial.replaying);
    return true;
  }
  tutorialBattleSession.active=false;tutorialBattleSession.kind=null;tutorialBattleSession.enemyQueue=[];
  resumeTutorialMainFlowAfterEvent(rescue?'elna_rescue_retry':'battle_retry',tutorial.replaying);
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
  return resumeTutorialMainFlowAfterEvent('contract_success');
}
function tutorialContractInstance(){
  if(!Array.isArray(save?.instances))return null;
  const matches=save.instances.filter(instance=>instance.id===TUTORIAL_FIRST_HUNT.enemyId);
  return matches[matches.length-1]||null;
}
function tutorialContractInstanceUid(){return tutorialContractInstance()?.uid||null;}
function prepareTutorialStep(step){
  if(step?.id==='starter_contracts_received'&&!ensureTutorialStarterContracts())return false;
  if(step?.id==='request_accept')renderTutorialSupplyRequest(document.getElementById('battleChoiceList'));
  if(['request_reward_claim','request_reward_received'].includes(step?.id))renderTutorialSupplyReward();
  if(step?.id==='stella_skill_open')renderTutorialStellaSkillCard();
  if(['stella_skill_unequip','stella_skill_equip','stella_attribute_intro'].includes(step?.id)&&typeof renderSkillEdit==='function'){
    const instance=tutorialStellaSkillTargetInstance();
    if(instance)editingSkillUid=instance.uid;
    renderSkillEdit();
    if(step.id==='stella_skill_unequip'&&tutorialStellaSkillCanEquip())queueTutorialActionAdvance(step.id);
    if(step.id==='stella_skill_equip'&&tutorialStellaSkillIsEquipped())queueTutorialActionAdvance(step.id);
  }
  if(['growth_elna_details','growth_skill_open'].includes(step?.id)&&typeof renderParty==='function'){
    renderParty();
    if(step.id==='growth_skill_open')document.querySelector('[data-monster-id="elna_beginner"] .monster-roster-details')?.setAttribute('open','');
  }
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
  {id:'intro_gnosis',screenId:'home',speaker:'？？？',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'void',title:'遠くから声がする',text:'ーい……',progressLabel:'PROLOGUE'},
  {id:'gnosis_call_2',screenId:'home',speaker:'？？？',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'void',title:'声が近づいてくる',text:'おーい……',progressLabel:'PROLOGUE'},
  {id:'gnosis_call_3',screenId:'home',speaker:'？？？',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'void',title:'すぐそばから聞こえる',text:'おーい！',progressLabel:'PROLOGUE'},
  {id:'gnosis_reveal',screenId:'home',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'void',title:'グノーシス',text:'やっと起きた！ ボクはグノーシス。契約の力を案内するぞ！',progressLabel:'GNOSIS'},
  {id:'gnosis_name',screenId:'home',mode:'external_action',input:'player_name',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'void',title:'名前を教えて！',text:'君の名前は？ 呼びやすい名前にしてくれ！',progressLabel:'GNOSIS'},
  {id:'gnosis_contract_power',screenId:'home',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'void',title:'契約の力',text:'よし、{{playerName}}だな！ この世界では、契約した相手の力を「契約体」として呼び出せる。ボクの力を少し貸すぞ！',progressLabel:'CONTRACT'},
  {id:'gnosis_descent',screenId:'home',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'world_descent',persistAs:'elna_encounter',nextStepId:'elna_encounter',title:'世界へ降りよう',text:'準備はいいな？ それじゃあ、世界へ降りよう！',progressLabel:'PROLOGUE',nextLabel:'世界へ降りる'},
  {id:'elna_encounter',screenId:'home',speaker:'エルナ',portrait:'images/tutorial/characters/elna_beginner.png?v=2',scene:'grassland',title:'スライムに囲まれた少女',text:'くっ……数が多い。でも、ここで退くわけには……！',progressLabel:'ENCOUNTER'},
  {id:'gnosis_rescue_alert',screenId:'home',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',title:'助けに入ろう！',text:'まずいぞ！ あの子、スライムに囲まれてる！ 助けに入ろう！',progressLabel:'RESCUE'},
  {id:'gnosis_starter_contracts',screenId:'home',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',title:'契約体を貸すぞ！',text:'フレイガルとアクアロンの契約体を貸すぞ！ ふたりを呼び出して戦おう！',progressLabel:'CONTRACT'},
  {id:'starter_contracts_received',screenId:'home',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',title:'2体の契約体',text:'よし、呼び出せた！ 炎のフレイガルと、水のアクアロンだ！',progressLabel:'CONTRACT'},
  {id:'elna_guest_join',screenId:'home',speaker:'エルナ',portrait:'images/tutorial/characters/elna_beginner.png?v=2',scene:'grassland',title:'本人エルナが共闘',text:'助けてくれるの？ 私も一緒に戦う。背中は任せて！',progressLabel:'GUEST'},
  {id:'elna_rescue_start',screenId:'home',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',transition:'start_elna_rescue',nextStepId:'battle_enemy',title:'救援戦を始めよう！',text:'契約体2体と本人エルナの3人で行くぞ！ スライムはボクが逃がさない！',progressLabel:'RESCUE',nextLabel:'助けに入る'},
  {id:'battle_enemy',screenId:'battle',target:'#singleEnemyBox',persistAs:'elna_rescue_start',title:'敵・味方・HP',text:'上が敵、下が味方だ。HPを0にすると倒せる。攻撃を1つ選ぶと1ターン進むぞ！',progressLabel:'BATTLE'},
  {id:'battle_actor_open',screenId:'battle',target:'#battleSwitchButton',externalAdvance:true,persistAs:'elna_rescue_start',title:'行動者を選ぼう',text:'ここを押すと、戦う仲間を選べるぞ！',progressLabel:'BATTLE'},
  {id:'battle_actor_select',screenId:'battle',target:'[data-tutorial-actor-select]',externalAdvance:true,persistAs:'elna_rescue_start',title:'仲間を交代',text:'交代する仲間を1人選んでみよう！',progressLabel:'BATTLE'},
  {id:'battle_target',screenId:'battle',target:'#singleEnemyBox',advanceOnTarget:true,persistAs:'elna_rescue_start',title:'対象を選ぼう',text:'このスライムを押して、攻撃対象に決めよう！',progressLabel:'BATTLE'},
  {id:'battle_attack_open',screenId:'battle',target:'#battleSkillButton',externalAdvance:true,persistAs:'elna_rescue_start',title:'攻撃を開こう',text:'ここを押すと、使える攻撃を選べるぞ！',progressLabel:'BATTLE'},
  {id:'battle_normal_attack',screenId:'battle',target:'[data-tutorial-normal-attack]',externalAdvance:true,persistAs:'elna_rescue_start',title:'通常攻撃',text:'まずはCOST 0の通常攻撃を押してみよう！',progressLabel:'BATTLE'},
  {id:'battle_skill',screenId:'battle',target:'#battleSkillButton',externalAdvance:true,persistAs:'elna_rescue_start',title:'技を開こう',text:'もう一度ここを押して、今度は技を選ぶぞ！',progressLabel:'BATTLE'},
  {id:'battle_choose_skill',screenId:'battle',target:'[data-tutorial-skill]',externalAdvance:true,persistAs:'elna_rescue_start',title:'技を使おう',text:'COSTは装備に必要な値だ。好きな技を1つ押して、実際に使ってみよう！',progressLabel:'BATTLE'},
  {id:'battle_free',screenId:'battle',target:'.battle-command-dock',persistAs:'elna_rescue_start',waitForEvent:'battle_outcome',title:'ここからは自由戦闘',text:'よし！ 交代や技を使って、残りのスライムを倒そう！',progressLabel:'BATTLE',nextLabel:'戦闘を続ける'},
  {id:'elna_rescue_retry',screenId:'battle',target:'#next',advanceOnTarget:true,nextStepId:'elna_rescue_start',persistAs:'elna_rescue_start',title:'エルナを助けに戻ろう',text:'進行は失われていません。「依頼を選び直す」を押して、救援戦をもう一度始めよう。',progressLabel:'RETRY'},
  {id:'elna_rescue_complete',screenId:'battle',speaker:'エルナ',portrait:'images/tutorial/characters/elna_beginner.png?v=2',scene:'grassland',persistAs:'elna_contract_intro',nextStepId:'elna_contract_intro',disableBack:true,title:'救援成功',text:'助かった……！ あなたたちが来てくれなかったら危なかった。ありがとう。',progressLabel:'RESCUE',nextLabel:'エルナと話す'},
  {id:'elna_contract_intro',screenId:'battle',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',disableBack:true,title:'エルナの力を借りよう！',text:'契約！ 契約を貰って！',progressLabel:'CONTRACT'},
  {id:'elna_contract_consent',screenId:'battle',speaker:'エルナ',portrait:'images/tutorial/characters/elna_beginner.png?v=2',scene:'grassland',disableBack:true,title:'本人エルナの同意',text:'うん。助けてもらったあなたになら、私の力を預けられる。契約を受け取って！',progressLabel:'CONTRACT'},
  {id:'elna_contract_execute',screenId:'battle',input:'elna_contract',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',disableBack:true,title:'契約を結ぼう！',text:'契約書が3回反応して、手形が押されたら成功だ！',progressLabel:'CONTRACT',nextLabel:'契約する'},
  {id:'elna_contract_departure',screenId:'battle',speaker:'エルナ',portrait:'images/tutorial/characters/elna_beginner.png?v=2',scene:'grassland',disableBack:true,title:'本人エルナとの別れ',text:'契約は結ばれたよ。呼ばれる契約体は私の力を写した存在。本人の私は、ここでお別れだね。',progressLabel:'CONTRACT'},
  {id:'elna_contract_body',screenId:'battle',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'grassland',persistAs:'home_party',nextStepId:'home_party',disableBack:true,title:'エルナの契約体',text:'できた！ これでエルナの契約体を呼べるぞ！ フレイガル、アクアロンと一緒に編成しておいた！',progressLabel:'NEW ALLY',nextLabel:'ホームへ'},
  {id:'home_party',screenId:'home',target:'#homePartyEditButton',advanceOnTarget:true,title:'編成を確認しよう',text:'ここを押すと、冒険へ連れていく仲間を編成できるぞ！',progressLabel:'HOME'},
  {id:'party_save',screenId:'partySet',target:'#partySetupSaveButton',externalAdvance:true,disableBack:true,title:'3体の編成を保存',text:'フレイガル、アクアロン、エルナを確認したら「この編成を保存」を押そう！ 先頭がリーダーだぞ！',progressLabel:'PARTY'},
  {id:'home_dex_open',screenId:'home',target:'[data-nav="more"]',advanceOnTarget:true,title:'メニューを開こう',text:'図鑑はメニューの中だ。まずは下の「メニュー」を押そう！',progressLabel:'DEX'},
  {id:'menu_dex_open',screenId:'moreMenu',target:'#homeDexButton',advanceOnTarget:true,title:'図鑑を開こう',text:'ここを押すと、出会った仲間の記録を確認できるぞ！',progressLabel:'DEX'},
  {id:'dex_character_open',screenId:'dexHub',target:'#dexHubCharacterButton',advanceOnTarget:true,title:'キャラクター図鑑',text:'まずはキャラクター図鑑を押してみよう！',progressLabel:'DEX'},
  {id:'dex_elna_open',screenId:'characterDex',target:'[data-tutorial-character="elna_beginner"]',advanceOnTarget:true,title:'本人エルナの記録',text:'エルナを押すと、本人と成長形態の記録を見られるぞ！ 呼び出す契約体とは別の記録だ。',progressLabel:'CHARACTER DEX'},
  {id:'dex_character_back',screenId:'characterDex',target:'#characterDexBackButton',advanceOnTarget:true,title:'図鑑一覧へ',text:'図鑑一覧へ戻って、今度はモンスター図鑑を見よう！',progressLabel:'DEX'},
  {id:'dex_monster_open',screenId:'dexHub',target:'#dexHubMonsterButton',advanceOnTarget:true,title:'モンスター図鑑',text:'ここを押すと、契約したモンスターの記録を見られるぞ！',progressLabel:'DEX'},
  {id:'dex_freigal',screenId:'dex',target:'[data-tutorial-monster="freigal"]',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'契約体の記録',text:'フレイガルとアクアロンはモンスター図鑑へ記録される。属性、進化先、主な入手方法を確認できるぞ！',progressLabel:'MONSTER DEX'},
  {id:'home_growth_open',screenId:'dex',target:'[data-nav="growth"]',advanceOnTarget:true,title:'育成へ',text:'ここを押すと、仲間の育成や技を確認できるぞ！',progressLabel:'GROWTH'},
  {id:'home_growth_overview',screenId:'growthHub',target:'#growthMonsterButton',advanceOnTarget:true,title:'モンスター育成',text:'ここを押して、エルナの契約体を見てみよう！',progressLabel:'GROWTH'},
  {id:'growth_elna_details',screenId:'party',target:'[data-monster-id="elna_beginner"] .monster-roster-details > summary',advanceOnTarget:true,title:'育成・個体情報',text:'レベルと経験値はカードで確認できる。ここを押すと、装備中の技や個体情報も見られるぞ！',progressLabel:'GROWTH'},
  {id:'growth_skill_open',screenId:'party',target:'[data-monster-id="elna_beginner"] [data-tutorial-skill-edit]',advanceOnTarget:true,title:'技を変更',text:'ここを押すと、技カードを組み替えられるぞ！',progressLabel:'SKILL'},
  {id:'growth_return',screenId:'party',target:'[data-nav="growth"]',advanceOnTarget:true,title:'育成一覧へ戻ろう',text:'詳しい技編集は、このあと実際にカードを装備しながら覚えるぞ。育成を押して進化を確認しよう！',progressLabel:'GROWTH'},
  {id:'growth_evolution',screenId:'growthHub',target:'#growthEvolutionButton',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'進化',text:'レベル条件を満たすと進化できる。特殊な進化はここから条件を確認できるぞ！',progressLabel:'EVOLUTION',nextStepId:'home_requests'},
  {id:'home_requests',screenId:'home',target:'#homeAdventureButton',persistAs:'home_requests',advanceOnTarget:true,title:'依頼を見よう',text:'ここを押すと、討伐依頼と報酬を確認できるぞ！',progressLabel:'REQUEST'},
  {id:'request_accept',screenId:'battleChoices',target:'[data-tutorial-request-open]',externalAdvance:true,persistAs:'request_accept',title:'エルナ救援を報告',text:'救援が依頼として認められたぞ！ このボタンを押して、報告と報酬の確認へ進もう！',progressLabel:'REQUEST'},
  {id:'request_reward_claim',screenId:'tutorialRequestReport',target:'#tutorialRequestClaimButton',externalAdvance:true,persistAs:'request_reward_claim',disableBack:true,title:'報酬を受け取ろう',text:'報酬はコイン250枚と錬成素材4種類だ。内容を確認して、このボタンで受け取ろう！',progressLabel:'REWARD'},
  {id:'request_reward_received',screenId:'tutorialRequestReport',target:'#tutorialRequestRewardStatus',persistAs:'stella_intro',nextStepId:'stella_intro',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'報酬受領完了',text:'よし、受け取れた！ この素材とコインは、あとで錬成に使うぞ！',progressLabel:'REWARD',nextLabel:'次の出会いへ'},
  {id:'stella_intro',screenId:'home',persistAs:'stella_intro',speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'academy',title:'技に詳しい子を探そう',text:'準備はできたな！ 技と属性に詳しいステラに会いに行くぞ！',progressLabel:'PROLOGUE'},
  {id:'stella_encounter',screenId:'home',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',scene:'academy',title:'見習い魔法使いステラ',text:'こんにちは！ グノーシスから聞いたよ。技カードの使い方なら、私に任せて！',progressLabel:'STELLA'},
  {id:'stella_card_receive',screenId:'home',transition:'grant_stella_skill_card',nextStepId:'stella_skill_open',replayNextStepId:'stella_attribute_intro',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',scene:'academy',title:'連続斬りを受け取る',text:'エルナが使える「連続斬り」をあげるね。カードの属性・威力・COSTを見て、実際に装備しよう！',progressLabel:'SKILL CARD',nextLabel:'受け取る'},
  {id:'stella_skill_open',screenId:'tutorialStellaCard',target:'#tutorialStellaSkillEditButton',externalAdvance:true,persistAs:'stella_skill_open',disableBack:true,title:'カードを確認して技編集へ',text:'連続斬りの内容を確認したら、ここを押してエルナの技編集を開こう！',progressLabel:'SKILL CARD'},
  {id:'stella_skill_unequip',screenId:'skillEdit',target:'[data-tutorial-stella-unequip]',externalAdvance:true,disableBack:true,title:'技を1枚外そう',text:'ここを押して、今の技を1枚外そう。新しいカードを入れる空きを作るぞ！',progressLabel:'SKILL CARD'},
  {id:'stella_skill_equip',screenId:'skillEdit',target:'[data-tutorial-stella-skill-equip]',externalAdvance:true,disableBack:true,title:'連続斬りを装備',text:'無属性・威力34・COST 2で、エルナの剣士タグに合う技だ。ここを押して装備しよう！',progressLabel:'SKILL CARD'},
  {id:'stella_attribute_intro',screenId:'skillEdit',target:'[data-tutorial-stella-skill-card]',persistAs:'stella_attribute_intro',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'技の属性',text:'技には属性があるよ。相手に有利な属性なら、ダメージが大きくなるの！',progressLabel:'ATTRIBUTE'},
  {id:'stella_more_open',screenId:'skillEdit',target:'[data-nav="more"]',advanceOnTarget:true,title:'属性表を見よう',text:'ここを押すと、属性相性を確認できるメニューへ進めるぞ！',progressLabel:'ATTRIBUTE'},
  {id:'stella_type_chart_open',screenId:'moreMenu',target:'#typeChartButton',advanceOnTarget:true,title:'属性相性',text:'ここを押すと、どの属性が有利か確認できるぞ！',progressLabel:'ATTRIBUTE'},
  {id:'stella_type_basic',screenId:'typeChart',target:'#typeBasicChart',speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'属性相性の見方',text:'火・水・雷・風・森と、光・闇・星にはそれぞれ相性の輪があるよ。矢印の向きを見れば有利属性が分かるからね！',progressLabel:'ATTRIBUTE'},
  {id:'stella_mock_battle',screenId:'typeChart',persistAs:'stella_mock_battle',transition:'start_stella_mock_battle',nextStepId:'stella_mock_enemy',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',scene:'academy',title:'次は相性を試そう',text:'装備できたね！ 森属性のグラスビートを用意したよ。炎属性が有利なことを実戦で確かめよう！',progressLabel:'STELLA',nextLabel:'模擬戦へ'},
  {id:'stella_mock_enemy',screenId:'battle',target:'#singleEnemyBox',persistAs:'stella_mock_battle',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'炎は森に有利',text:'相手は森属性のグラスビート、先頭は炎属性のフレイガル。炎属性の技なら効果抜群だよ！',progressLabel:'MOCK BATTLE'},
  {id:'stella_mock_skill_open',screenId:'battle',target:'#battleSkillButton',externalAdvance:true,persistAs:'stella_mock_battle',disableBack:true,title:'技を開こう',text:'ここを押すと、フレイガルの技を選べるぞ！',progressLabel:'MOCK BATTLE'},
  {id:'stella_mock_advantage',screenId:'battle',target:'[data-tutorial-stella-advantage]',externalAdvance:true,persistAs:'stella_mock_battle',disableBack:true,title:'炎属性で攻撃',text:'炎属性の技を押して、効果抜群のダメージを確かめよう！',progressLabel:'MOCK BATTLE'},
  {id:'stella_mock_free',screenId:'battle',target:'#battleCommandPad',persistAs:'stella_mock_battle',waitForEvent:'battle_outcome',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',title:'効果抜群！',text:'今のが有利属性だよ！ あとは自由に戦って、グラスビートを倒してみよう！',progressLabel:'MOCK BATTLE'},
  {id:'stella_mock_victory',screenId:'battle',persistAs:'lumina_intro',nextStepId:'lumina_intro',disableBack:true,speaker:'ステラ',portrait:'images/tutorial/characters/stella_apprentice.png',scene:'academy',title:'属性模擬戦クリア！',text:'ばっちり！ 相手の属性を見て、有利な技を選べば戦いを有利に進められるよ！',progressLabel:'STELLA',nextLabel:'次へ'},
  {id:'stella_mock_retry',screenId:'battle',target:'#next',advanceOnTarget:true,nextStepId:'stella_mock_battle',persistAs:'stella_mock_battle',disableBack:true,title:'模擬戦を再開しよう',text:'進行は失われていないぞ！ 「依頼を選び直す」を押して、炎属性の技をもう一度試そう！',progressLabel:'RETRY'},
  {id:'lumina_intro',screenId:'home',persistAs:'lumina_intro',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'workshop',title:'工房へ行こう！',text:'属性も分かったな！ 次はルミナの工房で、錬成を教えてもらうぞ！',progressLabel:'PROLOGUE',nextLabel:'工房へ'},
  {id:'lumina_encounter',screenId:'home',disableBack:true,speaker:'ルミナ',portrait:'images/tutorial/characters/lumina_apprentice.png',scene:'workshop',title:'見習い錬金術師ルミナ',text:'ようこそ！ 練習用の錬成核は用意したよ。仲間を消費せず、素材4つと250コインで入門錬成を試そう。',progressLabel:'LUMINA'},
  {id:'lumina_alchemy',screenId:'home',persistAs:'lumina_alchemy',transition:'prepare_lumina_alchemy',nextStepId:'lumina_materials',replayNextStepId:'lumina_alchemy_replay',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'workshop',title:'錬成台を開こう！',text:'ここを押すと、素材を組み合わせて新しい契約体を生み出せるぞ！',progressLabel:'ALCHEMY',nextLabel:'錬成台へ'},
  {id:'lumina_materials',screenId:'alchemy',target:'#tutorialAlchemyMaterials',persistAs:'lumina_alchemy',disableBack:true,speaker:'ルミナ',portrait:'images/tutorial/characters/lumina_apprentice.png',title:'投入内容を確認',text:'素材4種類を各1個、250コイン、初回成功率100％だよ。今回は練習用錬成核だから、仲間は消費しないの。',progressLabel:'ALCHEMY'},
  {id:'lumina_start',screenId:'alchemy',target:'#tutorialAlchemyStartButton',externalAdvance:true,persistAs:'lumina_alchemy',disableBack:true,title:'錬成を始めよう',text:'ここを押すと、入門錬成の確認へ進めるぞ！',progressLabel:'ALCHEMY'},
  {id:'lumina_confirm',screenId:'alchemyConfirm',target:'#alchemyConfirmContent',persistAs:'lumina_alchemy',disableBack:true,speaker:'ルミナ',portrait:'images/tutorial/characters/lumina_apprentice.png',title:'消費内容を確認',text:'素材4個と250コイン、成功率100％を確認してね。今回は仲間を消費しないよ！',progressLabel:'CONFIRM'},
  {id:'lumina_execute',screenId:'alchemyConfirm',target:'#alchemyExecuteButton',externalAdvance:true,persistAs:'lumina_alchemy',disableBack:true,title:'錬成を実行',text:'ここを押すと、素材とコインを使って錬成を実行するぞ！',progressLabel:'ALCHEMY'},
  {id:'lumina_wait',screenId:'alchemyResult',target:'#alchemyResultContent',persistAs:'lumina_alchemy',waitForEvent:'alchemy_result',disableBack:true,speaker:'ルミナ',portrait:'images/tutorial/characters/lumina_apprentice.png',title:'錬成核を構築中',text:'素材の反応をひとつに結んでいるよ。もうすぐ新しい契約体が生まれるからね！',progressLabel:'ALCHEMY'},
  {id:'lumina_alchemy_result',screenId:'alchemyResult',target:'#tutorialAlchemyResult',persistAs:'expedition_intro',disableBack:true,speaker:'ルミナ',portrait:'images/tutorial/characters/lumina_apprentice.png',title:'入門錬成成功！',text:'成功だよ！ これで素材とコイン、成功率を確認しながら自分で錬成できるね。',progressLabel:'LUMINA',nextStepId:'expedition_intro'},
  {id:'lumina_alchemy_replay',screenId:'alchemy',persistAs:'expedition_intro',disableBack:true,speaker:'ルミナ',portrait:'images/tutorial/characters/lumina_apprentice.png',scene:'workshop',title:'入門錬成は完了済み',text:'入門錬成の報酬は一度だけだよ。通常の錬成台は自由に使ってね！',progressLabel:'REPLAY',nextStepId:'expedition_intro'},
  {id:'expedition_intro',screenId:'home',persistAs:'expedition_intro',nextStepId:'expedition_home_open',replayNextStepId:'expedition_replay',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'workshop',title:'次は遠征だ！',text:'錬成もばっちりだな！ 次は仲間を短い遠征へ送り出してみるぞ！',progressLabel:'PROLOGUE',nextLabel:'遠征へ'},
  {id:'expedition_home_open',screenId:'home',target:'#homeExpeditionPreview button',advanceOnTarget:true,persistAs:'expedition_intro',disableBack:true,title:'遠征を開こう',text:'ここを押すと、控えの仲間を遠征へ送り出せるぞ！',progressLabel:'EXPEDITION'},
  {id:'expedition_destination',screenId:'expedition',target:'[data-tutorial-expedition-map="grassland"]',externalAdvance:true,persistAs:'expedition_intro',disableBack:true,title:'短い遠征先を選ぼう',text:'草原を押して、最初の遠征先に選ぶぞ！',progressLabel:'EXPEDITION'},
  {id:'expedition_distance',screenId:'expedition',target:'[data-tutorial-expedition-distance="short"]',externalAdvance:true,persistAs:'expedition_intro',disableBack:true,title:'短距離を選ぼう',text:'短距離は、バトルに1回勝つと帰還する遠征だぞ！',progressLabel:'EXPEDITION'},
  {id:'expedition_member',screenId:'expedition',target:'[data-tutorial-expedition-member]',externalAdvance:true,persistAs:'expedition_intro',disableBack:true,title:'派遣する仲間',text:'ここを押して、控えの仲間を1体選ぼう！',progressLabel:'EXPEDITION'},
  {id:'expedition_suitability',screenId:'expedition',target:'#expeditionSuitability',persistAs:'expedition_intro',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'遠征適性',text:'属性、レベル、得意な能力から適性が決まる。Sに近いほど大成功しやすいぞ！',progressLabel:'SUITABILITY'},
  {id:'expedition_dispatch',screenId:'expedition',target:'#expeditionStartButton',externalAdvance:true,persistAs:'expedition_intro',disableBack:true,title:'短距離遠征へ派遣',text:'ここを押すと、選んだ仲間が短距離遠征へ出発するぞ！',progressLabel:'EXPEDITION'},
  {id:'expedition_active',screenId:'expedition',target:'[data-tutorial-expedition-active]',persistAs:'prologue_epilogue',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',title:'遠征は進行中！',text:'帰還を待たなくて大丈夫！ バトルに勝つと進み、完了したらここで報酬を受け取れるぞ！',progressLabel:'EXPEDITION',nextStepId:'prologue_epilogue'},
  {id:'expedition_replay',screenId:'home',persistAs:'prologue_epilogue',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'workshop',title:'遠征は案内済みだ！',text:'派遣中または完了済みの遠征があるから、新しい遠征は増やさないぞ。遠征画面からいつでも状況を確認できる！',progressLabel:'EXPEDITION',nextStepId:'prologue_epilogue'},
  {id:'prologue_epilogue',screenId:'home',persistAs:'prologue_epilogue',disableBack:true,speaker:'ルミナ',portrait:'images/tutorial/characters/lumina_apprentice.png',scene:'workshop',title:'工房からの見送り',text:'錬成も遠征も、もう自分で進められるね。新しい土地でどんな契約体と出会うのか、楽しみにしているよ！',progressLabel:'PROLOGUE'},
  {id:'prologue_complete',screenId:'home',disableBack:true,speaker:'グノーシス',portrait:'images/tutorial/characters/gnosis-dialogue-transparent-final.png',scene:'world_descent',title:'序章完了！',text:'ここまで完璧だ！ これからは自分のペースで、自由に冒険できるぞ！',progressLabel:'PROLOGUE CLEAR',nextLabel:'自由行動へ'}
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
globalThis.GameDiagnostics?.registerTutorialProvider?.(tutorialDiagnosticsSnapshot);

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
