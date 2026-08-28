const TUTORIAL_MAIN_FLOW_ID='prologue';
const TUTORIAL_HELP_FLOW_ID='tutorial_help';
const tutorialFlows=new Map();
const tutorialUiState={
  active:false,flowId:null,steps:[],index:0,persist:false,replay:false,
  returnScreen:null,target:null,previousFocus:null,lastFocusedStep:null
};

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
function activeScreenId(){return document.querySelector('.screen.active')?.id||null;}
function tutorialStepIndex(steps,stepId){
  const index=steps.findIndex(step=>step.id===stepId);
  return index>=0?index:0;
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
  back.disabled=tutorialUiState.index===0;
  skip.textContent=tutorialUiState.persist?'スキップ':'閉じる';
  next.textContent=step.nextLabel||(tutorialUiState.index===tutorialUiState.steps.length-1?'完了':'次へ');
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
  if(step)setTutorialStep(step.id);
  if(typeof saveGame==='function')saveGame();
  updateTutorialMenuSummary();
}
function startTutorialFlow(flowId,{stepId=null,persist=false,replay=false,returnScreen=null}={}){
  const steps=tutorialFlowSteps(flowId);
  if(!steps.length)return false;
  clearTutorialUi();
  tutorialUiState.active=true;tutorialUiState.flowId=flowId;tutorialUiState.steps=steps;
  tutorialUiState.index=tutorialStepIndex(steps,stepId);tutorialUiState.persist=persist;
  tutorialUiState.replay=replay;tutorialUiState.returnScreen=returnScreen;
  tutorialUiState.previousFocus=document.activeElement;tutorialUiState.lastFocusedStep=null;
  if(persist){
    if(replay)beginTutorialReplay(steps[tutorialUiState.index].id);
    else setTutorialStep(steps[tutorialUiState.index].id);
    if(typeof saveGame==='function')saveGame();
  }
  renderTutorialStep();
  updateTutorialMenuSummary();
  return true;
}
function tutorialPrevious(){
  if(!tutorialUiState.active||tutorialUiState.index<=0)return;
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
  if(!tutorialStepCanAdvance(step))return;
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
function handleTutorialScreenChange(){
  updateTutorialMenuSummary();
  if(tutorialUiState.active)setTimeout(renderTutorialStep,0);
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
  {id:'home_menu',screenId:'home',target:'.app-bottom-nav',title:'下部メニュー',text:'ホーム、モンスター、バトル、育成、メニューへは、画面下から移動できます。',progressLabel:'HOME',nextLabel:'ここまで',continueAt:'first_hunt'}
]);
registerTutorialFlow(TUTORIAL_HELP_FLOW_ID,[
  {id:'help_spotlight',screenId:'home',target:'#homeAdventureButton',title:'実際の画面を見ながら進めます',text:'案内する操作だけを明るい枠で示します。照らされたボタンは、そのままタップやキーボードで操作できます。',progressLabel:'GUIDE UI'},
  {id:'help_controls',title:'止めても、あとから続けられます',text:'「戻る」で説明を見直せます。本編チュートリアルは×で閉じると現在位置を保存し、確認してからスキップでき、メニューから再閲覧できます。',progressLabel:'GUIDE UI',nextLabel:'メニューへ戻る'}
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
