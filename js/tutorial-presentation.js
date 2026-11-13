// Ephemeral display state only. The tutorial engine remains the sole owner of progress.
const tutorialPresentation={writer:null,auto:false,timer:null,episode:null,scene:null,portraits:new Map(),log:[],seen:new Set(),key:null};
const TUTORIAL_PORTRAIT_LAYOUT=Object.freeze({gnosis:{height:'50svh',bottom:'29svh',float:true},galdra:{height:'34svh',bottom:'26svh',float:true},human:{height:'60svh',bottom:'21svh',float:false}});
function tutorialPresentationStop(){
  tutorialPresentation.writer?.cancel();clearTimeout(tutorialPresentation.timer);
  tutorialPresentation.writer=null;tutorialPresentation.key=null;tutorialPresentation.auto=false;
  tutorialPresentation.episode=null;tutorialPresentation.scene=null;tutorialPresentation.log=[];
  tutorialPresentation.seen.clear();tutorialPresentation.portraits.clear();
  document.getElementById('tutorialAutoButton')?.setAttribute('aria-pressed','false');
  for(const id of ['tutorialLog','tutorialSkipMenu','tutorialSceneTransition','tutorialEpisodeCaption']){const el=document.getElementById(id);if(el)el.hidden=true;}
}
function tutorialPresentationFinishTyping(){
  if(tutorialPresentation.writer&&!tutorialPresentation.writer.isComplete()){tutorialPresentation.writer.finish();return true;}return false;
}
function tutorialPresentationTap(event){
  if(event.target.closest('button,input,form,[data-no-advance]'))return;
  if(tutorialPresentationFinishTyping())return;
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(!step||step.input||step.choices||tutorialStepRequiresAction(step))return;
  tutorialNext();
}
function tutorialPresentationAuto(){
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(!step||step.input||step.choices||step.target||tutorialStepRequiresAction(step))return;
  tutorialPresentation.auto=!tutorialPresentation.auto;
  document.getElementById('tutorialAutoButton').setAttribute('aria-pressed',String(tutorialPresentation.auto));
  clearTimeout(tutorialPresentation.timer);
  if(tutorialPresentation.auto&&tutorialPresentation.writer?.isComplete())tutorialPresentationScheduleAuto();
}
function tutorialPresentationScheduleAuto(){
  const step=tutorialUiState.steps[tutorialUiState.index];
  if(!tutorialPresentation.auto||!step||step.input||step.choices||step.target||tutorialStepRequiresAction(step))return;
  const key=tutorialPresentation.key;
  tutorialPresentation.timer=setTimeout(()=>{if(key===tutorialPresentation.key&&tutorialUiState.active&&tutorialPresentation.auto)tutorialNext();},1100+55*tutorialResolvedText(tutorialDialogueView(step)).length);
}
function tutorialPresentationLog(){
  tutorialPresentation.auto=false;clearTimeout(tutorialPresentation.timer);
  document.getElementById('tutorialAutoButton').setAttribute('aria-pressed','false');
  const root=document.getElementById('tutorialLog'),list=document.getElementById('tutorialLogLines');
  list.replaceChildren();
  for(const entry of tutorialPresentation.log){const row=document.createElement('p'),name=document.createElement('strong');name.textContent=entry.speaker;row.append(name,document.createTextNode(entry.text));list.append(row);}
  root.hidden=!root.hidden;
}
function tutorialPresentationSkipMenu(){
  clearTimeout(tutorialPresentation.timer);tutorialPresentation.auto=false;
  document.getElementById('tutorialAutoButton').setAttribute('aria-pressed','false');
  document.getElementById('tutorialSceneTransition').hidden=true;
  document.getElementById('tutorialOverlay').classList.remove('is-descent');
  const root=document.getElementById('tutorialSkipMenu');root.hidden=!root.hidden;
}
function tutorialPresentationRender(step,view){
  const overlay=document.getElementById('tutorialOverlay');if(!overlay||typeof createStoryTypewriter!=='function')return;
  const state=tutorialPresentation,story=Boolean((view.scene||view.portrait)&&!step.target);
  const episode=typeof PROLOGUE_STORY_EPISODES!=='undefined'?PROLOGUE_STORY_EPISODES[storyEpisodeIndexForStep(step.id)]:null;
  const episodeKey=tutorialUiState.flowId+':'+(episode?.id||'guide');
  if(state.episode!==episodeKey){state.episode=episodeKey;state.log=[];state.seen.clear();state.portraits.clear();state.scene=null;}
  const key=episodeKey+':'+step.id+':'+tutorialDialogueState.page;
  if(state.key!==key&&episode?.startStepId===step.id&&tutorialDialogueState.page===0){
    const caption=document.getElementById('tutorialEpisodeCaption');caption.textContent=`第${episode.number}話　${episode.title}`;caption.hidden=false;caption.classList.remove('is-visible');void caption.offsetWidth;caption.classList.add('is-visible');
    const transition=document.getElementById('tutorialSceneTransition');
    const descent=episode.number===2;transition.hidden=!descent;
    transition.classList.remove('is-descent');overlay.classList.remove('is-descent');
    if(descent){void transition.offsetWidth;transition.classList.add('is-descent');overlay.classList.add('is-descent');}
    caption.style.animationDelay=descent?'1.4s':'0s';
  }
  const text=tutorialResolvedText(view),speaker=tutorialResolvedText({text:view.speaker||''});
  if(!state.seen.has(key)){state.seen.add(key);state.log.push({speaker,text});}
  overlay.classList.toggle('is-story-step',story);overlay.classList.toggle('is-ui-guide-step',!story);
  document.getElementById('tutorialSceneLabel').textContent=episode?`序章 第${episode.number}話`:step.progressLabel;
  const title=document.getElementById('tutorialTitle'),guideTitle=document.getElementById('tutorialGuideTitle');
  title.textContent=story?speaker:'グノーシス';title.hidden=story&&!speaker;
  guideTitle.textContent=view.title||step.title;guideTitle.hidden=story;
  document.getElementById('tutorialText').classList.toggle('is-narration',story&&!speaker);
  const bubble=document.getElementById('tutorialBubble'),back=document.getElementById('tutorialBackButton');
  if(story){bubble.style.left='0';bubble.style.top='auto';bubble.style.bottom='0';bubble.style.maxHeight='55svh';}
  (story?document.getElementById('tutorialLogBack'):document.getElementById('tutorialGuideBack')).append(back);
  back.textContent=story?'1つ戻る':'戻る';back.hidden=!story&&back.disabled;
  const next=document.getElementById('tutorialNextButton');
  const custom=Boolean(step.nextLabel&&!tutorialDialogueHasMore(step));
  next.hidden=next.hidden||!custom;
  const hint=document.getElementById('tutorialAdvanceHint');hint.textContent=step.target?'光っている場所をタップ':'▼';hint.hidden=Boolean(step.input||tutorialDialogueNeedsChoice(step)||custom);
  const form=document.getElementById('tutorialNameForm'),choices=document.getElementById('tutorialDialogueChoices');
  overlay.append(form,choices);
  document.getElementById('tutorialSkipMenu').append(document.getElementById('tutorialDialogueSkipButton'),document.getElementById('tutorialSkipButton'));
  document.getElementById('tutorialDialogueSkipButton').textContent='この会話をスキップ';
  document.getElementById('tutorialSkipButton').textContent=tutorialUiState.persist?'チュートリアル全体をスキップ':'閉じる';
  document.getElementById('tutorialSkipMenu').hidden=true;
  const backdrop=document.getElementById('tutorialStoryBackdrop');backdrop.hidden=!story||!view.scene;
  if(state.scene!==view.scene){state.scene=view.scene;state.portraits.clear();backdrop.classList.remove('scene-enter');void backdrop.offsetWidth;backdrop.classList.add('scene-enter');}
  if(story&&view.portrait)state.portraits.set(view.portrait,speaker);
  while(state.portraits.size>2)state.portraits.delete(state.portraits.keys().next().value);
  const cast=document.getElementById('tutorialCast');cast.replaceChildren();cast.hidden=!story;
  [...state.portraits].forEach(([src,name],i)=>{
    const image=document.createElement('img');image.src=src;image.alt=name;image.className='story-scene-portrait'+(src===view.portrait?' is-speaking':'');
    const kind=src.includes('gnosis')?'gnosis':src.includes('galdra')?'galdra':'human';image.dataset.character=kind;
    image.style.height=TUTORIAL_PORTRAIT_LAYOUT[kind].height;image.style.bottom=TUTORIAL_PORTRAIT_LAYOUT[kind].bottom;
    image.style.left=state.portraits.size===1?'50%':i===0?'26%':'74%';cast.append(image);
  });
  const guidePortrait=document.getElementById('tutorialGuidePortrait');guidePortrait.hidden=story;
  document.getElementById('tutorialCharacterLayer').hidden=true;
  const autoBlocked=Boolean(step.input||step.choices||!story||tutorialStepRequiresAction(step));
  document.getElementById('tutorialAutoButton').disabled=autoBlocked;
  if(autoBlocked){state.auto=false;clearTimeout(state.timer);document.getElementById('tutorialAutoButton').setAttribute('aria-pressed','false');}
  if(key===state.key&&state.writer&&!state.writer.isComplete())state.writer.finish();
  if(key!==state.key){
    state.writer?.cancel();clearTimeout(state.timer);state.key=key;
    document.getElementById('tutorialLog').hidden=true;
    if(step.input)form.hidden=true;if(tutorialDialogueNeedsChoice(step))choices.hidden=true;
    hint.classList.add('is-typing');
    state.writer=createStoryTypewriter(document.getElementById('tutorialText'),text,()=>{
      if(key!==state.key)return;
      hint.classList.remove('is-typing');form.hidden=step.input!=='player_name';choices.hidden=!tutorialDialogueNeedsChoice(step);
      if(!form.hidden)document.getElementById('tutorialPlayerNameInput').focus({preventScroll:true});
      tutorialPresentationScheduleAuto();scheduleTutorialPosition();
    });
  }
  bubble.onclick=tutorialPresentationTap;backdrop.onclick=tutorialPresentationTap;overlay.onclick=event=>{if(event.target===overlay)tutorialPresentationTap(event);};
}
function tutorialPresentationPosition(){
  const overlay=document.getElementById('tutorialOverlay'),bubble=document.getElementById('tutorialBubble');if(!overlay||!bubble)return;
  if(overlay.classList.contains('is-story-step')){document.getElementById('tutorialText').style.maxHeight='';bubble.style.left='0';bubble.style.top='auto';bubble.style.bottom='0';bubble.style.maxHeight='55svh';return;}
  bubble.style.bottom='auto';
  // The placement engine may shorten a guide to keep its real target usable.
  // Constrain the scrollable text too; overflow:visible is needed for the nameplate.
  const text=document.getElementById('tutorialText'),room=parseFloat(bubble.style.maxHeight);
  if(text&&Number.isFinite(room)){
    const overhead=Math.max(0,bubble.scrollHeight-text.clientHeight);
    text.style.maxHeight=Math.max(40,Math.min(innerHeight*.45,room-overhead))+'px';
  }
  const portrait=document.getElementById('tutorialGuidePortrait');if(!portrait)return;
  const b=bubble.getBoundingClientRect(),target=tutorialUiState.target?.getBoundingClientRect();
  const height=Math.min(innerWidth*.30,160),width=height*.75;
  let x=b.right-width-12,y=b.top-height+10;
  const overlaps=(x,y)=>target&&x<target.right+8&&x+width>target.left-8&&y<target.bottom+8&&y+height>target.top-8;
  if(y<55||overlaps(x,y)){x=b.left+12;y=b.bottom-10;}
  portrait.hidden=y<55||y+height>innerHeight||overlaps(x,y);
  portrait.style.left=x+'px';portrait.style.top=y+'px';portrait.style.height=height+'px';
}
