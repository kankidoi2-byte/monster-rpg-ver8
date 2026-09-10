const PROLOGUE_STORY_EPISODES=Object.freeze([
  Object.freeze({id:'awakening',number:1,title:'異世界での目覚め',startStepId:'intro_gnosis',endStepId:'gnosis_descent',image:'images/maps/world_between.webp',summary:'遠くから響く声に導かれ、グノーシスとともに新しい世界へ降り立つ。'}),
  Object.freeze({id:'rescue',number:2,title:'草原の救援',startStepId:'elna_encounter',endStepId:'elna_contract_body',image:'images/maps/grassland.webp',summary:'スライムに囲まれたエルナを救い、初めての仲間と契約を結ぶ。'}),
  Object.freeze({id:'preparations',number:3,title:'契約者の支度',startStepId:'home_party',endStepId:'request_reward_received',image:'images/maps/light_plain.webp',summary:'編成・図鑑・育成を確かめ、救援依頼の報酬を受け取る。'}),
  Object.freeze({id:'stella',number:4,title:'王都での出会い',startStepId:'stella_intro',endStepId:'stella_mock_retry',image:'images/maps/magic_academy.webp',summary:'王都への道中でグノーシスの願いを聞き、突然の対決に備えて技を整える。'}),
  Object.freeze({id:'lumina',number:5,title:'錬成の工房',startStepId:'lumina_intro',endStepId:'lumina_alchemy_replay',image:'images/maps/kaen_village.webp',summary:'逃げたステラを追って学園の地下工房へ。ルミナの錬成に協力する。'}),
  Object.freeze({id:'expedition',number:6,title:'最初の遠征',startStepId:'expedition_intro',endStepId:'prologue_complete',image:'images/maps/grassland.webp',summary:'仲間を草原へ送り出し、契約者としての最初の一歩を踏み出す。'})
]);

function storyEpisodeIndexForStep(stepId){
  const steps=typeof tutorialFlowSteps==='function'?tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID):[];
  if(!steps.length)return 0;
  const foundIndex=steps.findIndex(step=>step.id===stepId);
  const stepIndex=foundIndex>=0?foundIndex:0;
  const episodeIndex=PROLOGUE_STORY_EPISODES.findIndex(episode=>{
    const start=steps.findIndex(step=>step.id===episode.startStepId);
    const end=steps.findIndex(step=>step.id===episode.endStepId);
    return start>=0&&end>=start&&stepIndex>=start&&stepIndex<=end;
  });
  return episodeIndex>=0?episodeIndex:0;
}
function storyProgressSnapshot(){
  const tutorial=typeof currentTutorialState==='function'?currentTutorialState():{status:'not_started',stepId:null};
  const finished=tutorial.status==='completed'||tutorial.status==='skipped';
  const currentIndex=finished?PROLOGUE_STORY_EPISODES.length:storyEpisodeIndexForStep(tutorial.stepId);
  return {tutorial,finished,currentIndex};
}
function storyEpisodeState(index,snapshot=storyProgressSnapshot()){
  if(snapshot.finished)return snapshot.tutorial.status==='skipped'?'skipped':'completed';
  if(index<snapshot.currentIndex)return 'completed';
  if(index===snapshot.currentIndex)return 'current';
  return 'locked';
}
function currentStoryEpisode(){
  const snapshot=storyProgressSnapshot();
  return snapshot.finished?PROLOGUE_STORY_EPISODES.at(-1):PROLOGUE_STORY_EPISODES[snapshot.currentIndex];
}
function openStoryMode(){
  if(typeof tutorialUiState==='object'&&tutorialUiState.active&&typeof pauseTutorial==='function')pauseTutorial();
  show('storyMode');
}
function continuePrologueStory(){
  if(typeof currentTutorialState!=='function'||typeof startTutorialFlow!=='function')return false;
  const tutorial=currentTutorialState();
  if(tutorial.status==='completed'||tutorial.status==='skipped')return false;
  tutorial.chapterGate=false;
  if(typeof saveGame==='function'&&!saveGame()){
    tutorial.chapterGate=true;
    if(typeof showUiNotice==='function')showUiNotice('物語の進行状態を保存できませんでした。','warning');
    return false;
  }
  const steps=tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID);
  return startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:tutorial.stepId||steps[0]?.id,persist:true});
}
function renderHomeStoryCard(){
  const episode=currentStoryEpisode();
  const snapshot=storyProgressSnapshot();
  const kicker=document.getElementById('homeAdventureKicker');
  const title=document.getElementById('homeAdventureTitle');
  const summary=document.getElementById('homeAdventureSummary');
  const action=document.getElementById('homeAdventureAction');
  if(!episode||!kicker||!title||!summary||!action)return;
  if(typeof tutorialCurrentStepId==='function'&&tutorialCurrentStepId()==='home_requests'){
    kicker.textContent='序章 第3話';title.textContent='救援依頼を報告';summary.textContent='エルナ救援の報酬を受け取る';action.textContent='依頼へ ›';return;
  }
  if(snapshot.finished){
    kicker.textContent=snapshot.tutorial.status==='skipped'?'序章スキップ済み':'序章クリア';title.textContent='ストーリー';summary.textContent='メイン・キャラクター・サイド';action.textContent='物語を見る ›';return;
  }
  kicker.textContent=`序章 第${episode.number}話`;title.textContent='ストーリー';
  summary.textContent=episode.title;action.textContent=snapshot.tutorial.status==='not_started'?'物語を始める ›':'物語を進める ›';
}
const STORY_CATEGORIES=Object.freeze(['main','character','side']);
function selectStoryCategory(category){
  if(!STORY_CATEGORIES.includes(category))return;
  STORY_CATEGORIES.forEach(key=>{
    const button=document.getElementById('storyCategory-'+key);
    const panel=document.getElementById('storyPanel-'+key);
    if(button)button.setAttribute('aria-pressed',String(key===category));
    if(panel)panel.hidden=key!==category;
  });
}
function renderStoryMode(){
  selectStoryCategory('main');
  const continueCard=document.getElementById('storyContinueCard');
  const list=document.getElementById('storyEpisodeList');
  if(!continueCard||!list)return;
  const snapshot=storyProgressSnapshot();
  const episode=currentStoryEpisode();
  const cleared=PROLOGUE_STORY_EPISODES.filter((_,index)=>['completed','skipped'].includes(storyEpisodeState(index,snapshot))).length;
  const progress=document.getElementById('storyChapterProgress');
  if(progress)progress.textContent=snapshot.tutorial.status==='skipped'?'スキップ済み':snapshot.finished?`${cleared}/${PROLOGUE_STORY_EPISODES.length} 完了`:`続き：第${episode.number}話 ・ ${cleared}/${PROLOGUE_STORY_EPISODES.length} 完了`;
  continueCard.hidden=snapshot.finished;
  continueCard.classList.toggle('is-complete',snapshot.finished);
  continueCard.innerHTML=snapshot.finished?'':`<div><span>つづきから</span><h2>第${episode.number}話　${episode.title}</h2></div><button type="button" onclick="continuePrologueStory()">${snapshot.tutorial.status==='not_started'?'始める':'再開する'} ›</button>`;
  list.innerHTML=PROLOGUE_STORY_EPISODES.map((entry,index)=>{
    const state=storyEpisodeState(index,snapshot);
    const statusLabel=state==='completed'?'CLEAR':state==='skipped'?'SKIP':state==='current'?'NEXT':'LOCKED';
    const action=state==='current'?`<button type="button" onclick="continuePrologueStory()">${snapshot.tutorial.status==='not_started'?'始める':'つづきから'} ›</button>`:'';
    return `<article class="story-episode-card is-${state}"><img src="${entry.image}" alt=""><div class="story-episode-copy"><span>序章 第${entry.number}話</span><h3>${entry.title}</h3><p>${state==='locked'?'前の話を完了すると解放されます。':entry.summary}</p>${action}</div><strong class="story-episode-status">${statusLabel}</strong></article>`;
  }).join('');
}
