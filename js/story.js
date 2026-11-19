const PROLOGUE_STORY_EPISODES=Object.freeze([
  Object.freeze({id:'awakening',number:1,title:'異世界での目覚め',startStepId:'intro_gnosis',endStepId:'gnosis_descent',image:'images/maps/world_between.webp',summary:'遠くから響く声に導かれ、グノーシスとともに新しい世界へ降り立つ。'}),
  Object.freeze({id:'rescue',number:2,title:'草原の救援',startStepId:'elna_encounter',endStepId:'elna_contract_body',image:'images/maps/grassland.webp',summary:'スライムに囲まれたエルナを救い、初めての仲間と契約を結ぶ。'}),
  Object.freeze({id:'preparations',number:3,title:'契約者の支度',startStepId:'home_party',endStepId:'request_reward_received',image:'images/maps/light_plain.webp',summary:'編成・図鑑・育成を確かめ、救援依頼の報酬を受け取る。'}),
  Object.freeze({id:'stella',number:4,title:'王都での出会い',startStepId:'stella_intro',endStepId:'stella_mock_retry',image:'images/maps/magic_academy.webp',summary:'王都への道中でグノーシスの願いを聞き、突然の対決に備えて技を整える。'}),
  Object.freeze({id:'lumina',number:5,title:'錬成の工房',startStepId:'lumina_intro',endStepId:'lumina_farewell',image:'images/maps/kaen_village.webp',summary:'逃げたステラを追って学園の地下工房へ。ルミナの錬成に協力する。'}),
  Object.freeze({id:'expedition',number:6,title:'最初の遠征',startStepId:'expedition_intro',endStepId:'prologue_epilogue',image:'images/maps/grassland.webp',summary:'仲間を草原へ送り出し、契約者としての最初の一歩を踏み出す。'})
]);

// Only narrative pages are adapted. Action metadata (inputs, rewards, fights,
// choices and retry routes) never enters the reader.
const PROLOGUE_REPLAY_NARRATIVE=Object.freeze({
  awakening:['intro_gnosis','gnosis_call_2','gnosis_call_3','gnosis_reveal','gnosis_name','gnosis_contract_power','gnosis_descent'],
  rescue:['elna_encounter','gnosis_rescue_alert','gnosis_starter_contracts','starter_contracts_received','elna_guest_join','elna_rescue_complete','elna_contract_intro','elna_contract_consent','elna_contract_execute','elna_contract_departure','elna_contract_body'],
  preparations:['home_requests','request_accept','request_reward_received'],
  stella:['stella_intro','stella_road_response','stella_mock_enemy','stella_mock_victory'],
  lumina:['lumina_intro','lumina_academy_arrival','lumina_world_map_visit','lumina_encounter','lumina_wait','lumina_alchemy_result','lumina_farewell'],
  expedition:['expedition_intro','expedition_party_plan','prologue_epilogue']
});
// For a mixed page, take the source text verbatim up to the start of its UI instructions.
const PROLOGUE_REPLAY_GUIDANCE_START=Object.freeze({
  elna_contract_body:' フレイガル、アクアロンと一緒に編成しておいたぞ！',
  home_requests:' ここを押すと、',
  request_accept:' このボタンを押して、',
  lumina_world_map_visit:'「錬成工房へ入る」を押して',
  expedition_party_plan:' まずは編成で'
});
const PROLOGUE_REPLAY_BACKGROUNDS=Object.freeze({
  void:null,
  world_descent:null,
  grassland:'images/maps/grassland_battle_v1.webp',
  academy:'images/maps/magic_academy_battle_v1.webp',
  capital:'images/maps/capital_market_story_v1.webp',
  workshop:'images/maps/lumina_secret_workshop_story_v1.webp'
});
function storyPrologueReplayEpisode(id){
  const entry=PROLOGUE_STORY_EPISODES.find(episode=>episode.id===id);
  if(!entry||typeof tutorialFlowSteps!=='function')return null;
  const source=tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID);
  const start=source.findIndex(step=>step.id===entry.startStepId);
  const end=source.findIndex(step=>step.id===entry.endStepId);
  if(start<0||end<start)return null;
  const selected=new Set(PROLOGUE_REPLAY_NARRATIVE[id]);
  const steps=[];
  let background=entry.image;
  for(const step of source.slice(start,end+1)){
    if(!selected.has(step.id))continue;
    const pages=step.dialogue||[step];
    pages.forEach((page,i)=>{
      if(step.id==='elna_contract_departure'&&i===4)return; // Standalone operation prompt, not the farewell.
      const marker=PROLOGUE_REPLAY_GUIDANCE_START[step.id];
      const end=marker?page.text.indexOf(marker):page.text.length;
      if(end<=0)return;
      if(Object.hasOwn(PROLOGUE_REPLAY_BACKGROUNDS,page.scene))background=PROLOGUE_REPLAY_BACKGROUNDS[page.scene];
      steps.push({id:step.dialogue?`${step.id}:${i+1}`:step.id,sourceId:step.id,
        kind:page.speaker?'dialogue':'narration',speaker:page.speaker,portrait:page.portrait,text:page.text.slice(0,end),background});
    });
  }
  if(!steps.length)return null;
  steps.push({id:`${id}:complete`,kind:'complete',background});
  return {...entry,steps};
}
function storyPrologueReplayAvailable(index,snapshot=storyProgressSnapshot()){
  if(!PROLOGUE_STORY_EPISODES[index])return false;
  const state=storyEpisodeState(index,snapshot);
  return state==='completed'||state==='skipped'&&typeof prologuePart2Available==='function'&&prologuePart2Available();
}

function storyEpisodeIndexForStep(stepId){
  const steps=typeof tutorialFlowSteps==='function'?tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID):[];
  if(!steps.length)return 0;
  const foundIndex=typeof tutorialStepIndex==='function'?tutorialStepIndex(steps,stepId):steps.findIndex(step=>step.id===stepId);
  const stepIndex=foundIndex>=0?foundIndex:0;
  const episodeIndex=PROLOGUE_STORY_EPISODES.findIndex(episode=>{
    const start=steps.findIndex(step=>step.id===episode.startStepId);
    const end=steps.findIndex(step=>step.id===episode.endStepId);
    return start>=0&&end>=start&&stepIndex>=start&&stepIndex<=end;
  });
  return episodeIndex>=0?episodeIndex:0;
}
function storyProgressSnapshot(){
  const tutorial=typeof normalizeTutorialSave==='function'?normalizeTutorialSave(save.progress?.tutorial):{status:'not_started',stepId:null};
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
function showStoryEpisodeCompletion(nextCard,label,{coins=0,exp=0,base=false}={}){
  if(nextCard){
    nextCard.classList.add('story-episode-next-highlight');
    nextCard.scrollIntoView({block:'center',behavior:'instant'});
  }
  const parts=[label+' 完了'];
  const reward=[];
  if(coins>0)reward.push('コイン+'+coins.toLocaleString('ja-JP'));
  if(exp>0)reward.push('EXP+'+exp.toLocaleString('ja-JP'));
  if(reward.length)parts.push(base?`基本報酬：${reward.join('　')}`:reward.join('　'));
  showUiNotice(parts.join('　'),'story-complete');
}
function continuePrologueStory(){
  if(typeof currentTutorialState!=='function'||typeof startTutorialFlow!=='function')return false;
  const tutorial=currentTutorialState();
  if(tutorial.status==='completed'||tutorial.status==='skipped')return typeof openProloguePart2==='function'?openProloguePart2():false;
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
  const late=snapshot.finished&&typeof prologuePart2CurrentEpisode==='function'?prologuePart2CurrentEpisode():null;
  if(late){
    kicker.textContent=`序章 ${prologuePart2Label(late)}`;title.textContent='ストーリー';summary.textContent=late.title;action.textContent='物語を進める ›';return;
  }
  if(snapshot.finished){
    kicker.textContent=typeof save!=='undefined'&&save.prologuePart2?.completed?'序章完了':snapshot.tutorial.status==='skipped'?'チュートリアルスキップ済み':'第6話まで完了';title.textContent='ストーリー';summary.textContent='メイン・マップ・キャラクター・サイド';action.textContent='物語を見る ›';return;
  }
  kicker.textContent=`序章 第${episode.number}話`;title.textContent='ストーリー';
  summary.textContent=episode.title;action.textContent=snapshot.tutorial.status==='not_started'?'物語を始める ›':'物語を進める ›';
}
const STORY_CATEGORIES=Object.freeze(['main','map','character','side']);
function selectStoryCategory(category){
  if(!STORY_CATEGORIES.includes(category))return;
  STORY_CATEGORIES.forEach(key=>{
    const button=document.getElementById('storyCategory-'+key);
    const panel=document.getElementById('storyPanel-'+key);
    if(button)button.setAttribute('aria-pressed',String(key===category));
    if(panel)panel.hidden=key!==category;
  });
}
function renderStoryMapCatalog(){
  const root=document.getElementById('storyMapList');
  if(!root||typeof MAP_STORIES==='undefined')return;
  root.innerHTML=MAP_STORIES.map(story=>{
    const map=mapStoryMap(story),total=story.episodes.length,count=mapStoryCompletedCount(story),available=mapStoryAvailable(story);
    return `<article class="story-map-card"><img src="${mapStoryEscape(map.image)}" alt=""><div><small>${mapStoryEscape(map.name)} · マップストーリー</small><h2>${mapStoryEscape(story.title)}</h2><p>全${total}話 · ${count}/${total} 完了</p><button type="button" data-story-id="${story.id}" onclick="openMapStory('${story.id}')" ${available?'':'disabled'}>各話を見る ›</button>${available?'':'<p>序章を完了またはスキップすると解放されます。</p>'}</div></article>`;
  }).join('');
}
function returnToStoryMapCatalog(){
  if(mapStorySaveRetry)return;
  mapStoryUi=null;
  openStoryMode();
  selectStoryCategory('map');
}
function renderStoryMode(){
  renderStoryMapCatalog();
  selectStoryCategory('main');
  const continueCard=document.getElementById('storyContinueCard');
  const list=document.getElementById('storyEpisodeList');
  if(!continueCard||!list)return;
  const snapshot=storyProgressSnapshot();
  const episode=currentStoryEpisode();
  const cleared=PROLOGUE_STORY_EPISODES.filter((_,index)=>['completed','skipped'].includes(storyEpisodeState(index,snapshot))).length;
  const progress=document.getElementById('storyChapterProgress');
  const late=typeof prologuePart2Available==='function'&&prologuePart2Available();
  const lateCurrent=late?prologuePart2CurrentEpisode():null;
  const lateEpisodes=late?prologuePart2Episodes():[];
  if(progress)progress.textContent=late?`${lateCurrent?'続き：'+prologuePart2Label(lateCurrent)+' ・ ':''}${cleared+lateEpisodes.filter(e=>prologuePart2EpisodeState(e.id).completed).length}/${PROLOGUE_STORY_EPISODES.length+lateEpisodes.length} 完了`:snapshot.tutorial.status==='skipped'?'スキップ済み':snapshot.finished?`${cleared}/${PROLOGUE_STORY_EPISODES.length} 完了`:`続き：第${episode.number}話 ・ ${cleared}/${PROLOGUE_STORY_EPISODES.length} 完了`;
  const chapter=document.getElementById('storyPrologueChapter');
  if(chapter)chapter.open=!snapshot.finished||Boolean(lateCurrent);
  continueCard.hidden=snapshot.finished;
  continueCard.classList.toggle('is-complete',snapshot.finished);
  continueCard.innerHTML=snapshot.finished?'':`<div><span>つづきから</span><h2>第${episode.number}話　${episode.title}</h2></div><button type="button" onclick="continuePrologueStory()">${snapshot.tutorial.status==='not_started'?'始める':'再開する'} ›</button>`;
  if(lateCurrent){
    continueCard.hidden=false;continueCard.classList.remove('is-complete');
    continueCard.innerHTML=`<div><span>つづきから</span><h2>${prologuePart2Label(lateCurrent)}　${prologuePart2Escape(lateCurrent.title)}</h2></div><button type="button" onclick="openProloguePart2()">再開する ›</button>`;
  }
  list.innerHTML=PROLOGUE_STORY_EPISODES.map((entry,index)=>{
    const state=storyEpisodeState(index,snapshot);
    const statusLabel=state==='completed'?'完了':state==='skipped'?'SKIP':state==='current'?'NEXT':'LOCKED';
    const action=storyPrologueReplayAvailable(index,snapshot)?`<button type="button" data-prologue-replay="${entry.id}" onclick="openPrologueReplay('${entry.id}')">読み返す ›</button>`:state==='current'?`<button type="button" onclick="continuePrologueStory()">${snapshot.tutorial.status==='not_started'?'始める':'つづきから'} ›</button>`:'';
    return `<article class="story-episode-card is-${state}"><img src="${entry.image}" alt=""><div class="story-episode-copy"><span>序章 第${entry.number}話</span><h3>${entry.title}</h3><p>${state==='locked'?'前の話を完了すると解放されます。':entry.summary}</p>${action}</div><strong class="story-episode-status">${statusLabel}</strong></article>`;
  }).join('')+(typeof renderProloguePart2EpisodeCards==='function'?renderProloguePart2EpisodeCards():'');
}

