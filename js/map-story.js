/* Map story controller. Normal exploration never enters this outcome path. */
let mapStoryId=GRASSLAND_STORY.id;
let mapStoryUi=null;
let mapStorySaveRetry=null;
let mapStoryStarting=false;
const mapStoryEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function currentMapStory(){return MAP_STORIES.find(story=>story.id===mapStoryId);}
function mapStoryMap(story){return MAPS.find(map=>map.id===story.mapId);}
function mapStoryState(storyId=mapStoryId){return save.mapStories[storyId];}
function mapStoryEpisode(id){return currentMapStory().episodes.find(e=>e.id===id);}
function mapStoryProgress(id,storyId=mapStoryId){return mapStoryState(storyId).episodes[id]||{completed:false,firstVictory:false,firstRewardClaimed:false,victoryCount:0};}
function mapStoryCompletedCount(story){return story.episodes.filter(e=>mapStoryProgress(e.id,story.id).completed).length;}
function mapStoryAvailable(story=currentMapStory()){return ['completed','skipped'].includes(save.progress?.tutorial?.status)&&worldMapEntryAvailable(mapStoryMap(story));}
function mapStoryUnlocked(episode){return mapStoryAvailable()&&(!episode.unlockAfter||mapStoryProgress(episode.unlockAfter).completed);}
function isMapStoryBattle(){return activeHuntRequest?.source==='map_story';}
function mapStoryBattleToken(){return isMapStoryBattle()?activeHuntRequest:null;}
function mapStoryTokenValid(token){return !token||(activeHuntRequest===token&&token.storyId===mapStoryId&&token.identity===saveTransactionIdentity()&&mapStoryState().resume?.phase==='battle'&&mapStoryState().resume?.attemptId===token.attemptId);}
function mapStoryWrite(mutate,onSaved){
  if(mapStorySaveRetry)return false;
  const identity=saveTransactionIdentity(),storyId=mapStoryId;
  const attempt=()=>{
    if(identity!==saveTransactionIdentity()||storyId!==mapStoryId){mapStorySaveRetry=null;mapStoryUi=null;return false;}
    if(!commitSaveMutation(mutate)){
      mapStorySaveRetry=attempt;
      const next=document.getElementById('next');if(next)next.classList.add('hidden');
      document.getElementById('battleOutcomeActions').innerHTML='';
      show('mapStory');
      document.getElementById('mapStoryContent').innerHTML='<p role="alert">保存できませんでした。もう一度保存してください。</p><button type="button" onclick="retryMapStorySave()">保存を再試行</button>';
      return false;
    }
    mapStorySaveRetry=null;if(onSaved)showCommittedSaveResult(onSaved);return true;
  };
  return attempt();
}
function retryMapStorySave(){return mapStorySaveRetry?.()||false;}
function mapStoryEntryHtml(map){
  const story=MAP_STORIES.find(entry=>entry.mapId===map.id);
  if(!story)return '';
  const total=story.episodes.length,count=mapStoryCompletedCount(story),available=mapStoryAvailable(story);
  return `<aside class="wm-event-notice"><strong>マップストーリー</strong><p>${mapStoryEscape(story.title)}／全${total}話 · ${count}/${total} 完了</p><button type="button" class="wm-depart" data-story-id="${story.id}" onclick="openMapStory('${story.id}')" ${available?'':'disabled'}>${mapStoryEscape(map.name)}の物語を見る ›</button>${available?'':'<p>序章を完了またはスキップすると解放されます。</p>'}</aside>`;
}
function openMapStory(storyId=mapStoryId){
  if(mapStorySaveRetry)return retryMapStorySave();
  const story=MAP_STORIES.find(entry=>entry.id===storyId);
  if(!story||!mapStoryAvailable(story))return false;
  mapStoryId=story.id;
  mapStoryUi=null;show('mapStory');renderMapStory();return true;
}
function mapStoryEnemiesLabel(episode){return episode.enemies.map(e=>`${by(e.speciesId).name}（${by(e.speciesId).rarity}・Lv.${e.level}）`).join('／');}
function renderMapStory(){
  cancelMapStoryPresentation();
  if(mapStorySaveRetry)return;
  const root=document.getElementById('mapStoryContent');if(!root)return;
  if(!mapStoryAvailable()){root.innerHTML='<p>序章を完了またはスキップすると解放されます。</p>';return;}
  const resume=mapStoryState().resume;
  if(mapStoryUi?.identity!==saveTransactionIdentity())mapStoryUi=null;
  if(mapStoryUi){renderMapStoryDialogue();return;}
  const story=currentMapStory(),map=mapStoryMap(story),total=story.episodes.length,count=mapStoryCompletedCount(story);
  root.innerHTML=`<button type="button" onclick="returnToStoryMapCatalog()">‹ ストーリーへ戻る</button><h2>${mapStoryEscape(story.title)}</h2><p>全${total}話 · ${count}/${total} 完了</p>${count===total?`<p>${mapStoryEscape(story.completedText)}</p>`:''}<div class="map-story-list">${story.episodes.map(e=>{
    const p=mapStoryProgress(e.id),unlocked=mapStoryUnlocked(e),pending=resume?.episodeId===e.id;
    const status=p.completed?'完了':pending?'進行中':unlocked?'解放済':'未解放';
    const action=pending?`<button type="button" onclick="startMapStoryEpisode('${e.id}')">${resume.phase==='post'?'戦闘後から再開':'つづきから'}</button>`:!p.completed?`<button type="button" onclick="startMapStoryEpisode('${e.id}')" ${unlocked?'':'disabled'}>第${e.number}話を始める</button>`:'';
    return `<article class="map-story-card"><small>第${e.number}話 · ${status}</small><h3>${mapStoryEscape(e.title)}</h3><p>推奨Lv.${e.recommendedLevel} · ${e.battleMode==='three_way'?'三つ巴戦':'1対1'}</p><p>${mapStoryEscape(mapStoryEnemiesLabel(e))}</p><p>初回：各個体EXP ${e.firstReward.exp}／コイン ${e.firstReward.coins}<br>再戦：各個体EXP ${e.repeatReward.exp}／コイン ${e.repeatReward.coins}</p>${action}${p.completed?`<button type="button" onclick="readMapStoryEpisode('${e.id}')">読み返す</button>${!pending?`<button type="button" onclick="startMapStoryEpisode('${e.id}',true)">再戦する</button>`:''}`:''}</article>`;
  }).join('')}</div><button type="button" onclick="leaveMapStory()">${mapStoryEscape(map.name)}へ戻る</button>`;
}
function leaveMapStory(){
  cancelMapStoryPresentation();
  if(mapStorySaveRetry)return;
  mapStoryUi=null;activeHuntRequest=null;endPartyRecovery();busy=false;
  showBattleChoices();worldMapSelectedId=currentMapStory().mapId;worldMapSelectedEvent=null;
  renderWorldMap(document.getElementById('battleChoiceList'));
}
function startMapStoryEpisode(id,repeat=false){
  const episode=mapStoryEpisode(id);if(!episode||!mapStoryUnlocked(episode)||mapStorySaveRetry)return false;
  const resume=mapStoryState().resume;
  if(resume&&resume.episodeId!==id){showUiNotice('先に進行中の話を再開してください。','warning');return false;}
  if(resume?.phase==='battle'){
    showUiNotice('戦闘が中断されました。最初から再挑戦します。','info');
    return launchMapStoryBattle(id);
  }
  if(resume){mapStoryUi={episodeId:id,phase:resume.phase,identity:saveTransactionIdentity()};show('mapStory');renderMapStory();return true;}
  return mapStoryWrite(()=>{mapStoryState().resume={episodeId:id,phase:'pre',nodeId:repeat?null:episode.preNodes[0].id,attemptId:null,rewardCommitted:false,postPending:false,participantUids:[]};},()=>{
    mapStoryUi={episodeId:id,phase:'pre',identity:saveTransactionIdentity()};show('mapStory');renderMapStory();
  });
}
function readMapStoryEpisode(id){
  if(!mapStoryEpisode(id)||!mapStoryProgress(id).completed||mapStorySaveRetry)return false;
  mapStoryUi={episodeId:id,phase:'pre',cursor:0,replay:true,identity:saveTransactionIdentity()};show('mapStory');renderMapStory();return true;
}
// Stage directions become narration when an existing illustration cannot show them.
const MAP_STORY_STAGE_COPY={
  gl_02_pre_01:'短い草の帯が続いている。脇には茎だけ残った草。遠くでリカシーフが低木の葉を食べている。',
  gl_02_post_01:'グラスビートが草の深い側へ退く。残った葉の縁と、低木の食べ跡が見える。',
  gl_03_post_01:'二体は別々の方向へ退く。離れた先で、ゴブリンが落とした枝を拾っていた。',
  gl_05_post_05:'遠くの雲が一段暗くなった。',
  gl_07_pre_01:'石の古道をゴーレムが決まった線に沿って巡回している。三人は崩れた石の脇で止まる。',
  gl_11_post_01:'ボルタックスが遠い雲の方へ離れる。三人は斜面の陰へ避難した。空にはまだ雲が広がっている。',
  gl_11_post_05:'雨が弱まったころ。',
  gl_11_post_08:'それから数日後。一行は最初の窪地へ戻ってきた。',
  vc_09_post_01:'アシュレイアが高度を上げ、熱気の筋へ離れる。一行は追撃せず、尾根を下る。溶岩は流れ続け、噴気が上がっていた。',
  vc_09_post_05:'それから数日後。一行は麓の、広く見渡せる場所を再訪した。',
  vc_09_post_09:'遠くの斜面にフレイウルフ。熱気のそばにはツバキ、岩壁の赤い光の近くにはイグナロスの姿があった。'
};
function mapStoryNodeText(node){return node.kind==='stage'?(MAP_STORY_STAGE_COPY[node.id]||node.text):node.text;}
// Ephemeral presentation state belongs to the open episode, never to the save.
let mapStoryTypewriter=null,mapStoryAutoTimer=null;
function cancelMapStoryPresentation(){
  mapStoryTypewriter?.cancel();mapStoryTypewriter=null;clearTimeout(mapStoryAutoTimer);mapStoryAutoTimer=null;
}
function mapStoryPresentationCurrent(ui){
  return ui===mapStoryUi&&ui.identity===saveTransactionIdentity()&&!mapStorySaveRetry&&document.getElementById('mapStory')?.classList.contains('active');
}
function scheduleMapStoryAuto(ui,text){
  clearTimeout(mapStoryAutoTimer);
  if(!ui.presentation?.auto||ui.presentation.logOpen||!ui.presentation.node)return;
  mapStoryAutoTimer=setTimeout(()=>{if(mapStoryPresentationCurrent(ui)&&!ui.presentation.logOpen)advanceMapStoryNode();},1100+Array.from(text).length*55);
}
function mapStoryTap(event){
  if(event?.target?.closest('button,input,select,a,[role="dialog"]')&&!event.target.closest('.map-story-next'))return;
  event?.stopPropagation();
  const ui=mapStoryUi;if(!ui||!mapStoryPresentationCurrent(ui)||ui.presentation?.logOpen)return;
  if(mapStoryTypewriter&&!mapStoryTypewriter.isComplete()){mapStoryTypewriter.finish();return;}
  if(ui.presentation?.node)advanceMapStoryNode();
}
function toggleMapStoryAuto(){
  const ui=mapStoryUi;if(!ui?.presentation)return;
  ui.presentation.auto=!ui.presentation.auto;
  document.getElementById('mapStoryAuto')?.setAttribute('aria-pressed',String(ui.presentation.auto));
  if(mapStoryTypewriter?.isComplete())scheduleMapStoryAuto(ui,ui.presentation.text);
  if(!ui.presentation.auto)clearTimeout(mapStoryAutoTimer);
}
function toggleMapStoryLog(open=true){
  const ui=mapStoryUi;if(!ui?.presentation)return;
  ui.presentation.logOpen=open;clearTimeout(mapStoryAutoTimer);
  const log=document.getElementById('mapStoryLog');if(log){log.hidden=!open;if(open)log.querySelector('button')?.focus();}
  if(!open){document.getElementById('mapStoryLogButton')?.focus();if(mapStoryTypewriter?.isComplete())scheduleMapStoryAuto(ui,ui.presentation.text);}
}
function renderMapStoryDialogue(){
  cancelMapStoryPresentation();
  const ui=mapStoryUi,episode=mapStoryEpisode(ui.episodeId),resume=mapStoryState().resume;
  const story=currentMapStory(),map=mapStoryMap(story),mapName=mapStoryEscape(map.name);
  const finalEpisode=episode.number===story.episodes.length,isVolcano=map.id==='volcano';
  const nodes=ui.phase==='post'?episode.postNodes:episode.preNodes;
  const index=ui.replay?ui.cursor:resume?.nodeId?nodes.findIndex(n=>n.id===resume.nodeId):nodes.length;
  const node=nodes[index],root=document.getElementById('mapStoryContent');
  const names={gnosis:'グノーシス',galdra:'ガルドラ',contractor:'契約者',system:'システム',tsubaki:'ツバキ'};
  const label=node?(names[node.speaker]||(isVolcano?'':'情景')):ui.phase==='pre'?(ui.replay?'戦闘の記録':'戦闘の準備'):'この話の終わり';
  const narration=!node||node.kind==='stage'||!node.speaker;
  const speaker=node?.speaker;
  const portraitFor=id=>id==='gnosis'?'images/tutorial/characters/gnosis-dialogue-transparent-final.png':(id==='galdra'||id==='tsubaki')?IMG[by(id).imgKey]:null;
  const lighting=isVolcano?(episode.number>=7&&episode.number<=8?'ash':episode.number>=5&&episode.number<=6?'warm':''):'';
  const text=node?mapStoryNodeText(node):ui.phase==='pre'?(ui.replay?`${mapStoryEnemiesLabel(episode)}との戦闘を切り抜けた。`:`敵：${mapStoryEnemiesLabel(episode)}／推奨Lv.${episode.recommendedLevel}。ストーリー戦では契約できません。`):ui.replay?'戦闘後の会話を読み終えました。':finalEpisode?`${map.name}の物語を読み終えました。`:'戦闘後の会話を読み終えました。次の話へ進めます。';
  const primary=node?'<button type="button" class="map-story-next" onclick="mapStoryTap(event)" aria-label="次へ">▼</button>':ui.phase==='pre'?(ui.replay?'<button type="button" class="map-story-next" onclick="advanceMapStoryNode()">戦闘後へ</button>':`<button type="button" class="map-story-next" onclick="launchMapStoryBattle('${episode.id}')">戦闘開始</button>`):`<button type="button" class="map-story-next" onclick="completeMapStoryEpisode()">${ui.replay?'読み返しを終える':finalEpisode?`${mapName}の物語を終える`:`第${episode.number}話を終える`}</button>`;
  const presentation=ui.presentation||(ui.presentation={auto:false,logOpen:false,seen:{}});
  presentation.node=Boolean(node);presentation.text=text;presentation.logOpen=false;
  presentation.seen[ui.phase]=Math.max(presentation.seen[ui.phase]??-1,index);
  if(!node)presentation.auto=false; // Never auto-start battles or grant completion/rewards.
  const seen=nodes.slice(0,Math.min(nodes.length,(presentation.seen[ui.phase]??index)+1));
  const cast=[...new Set(nodes.slice(0,Math.min(index+1,nodes.length)).map(n=>n.speaker).filter(id=>portraitFor(id)))].slice(-2);
  if(speaker&&portraitFor(speaker)&&!cast.includes(speaker))cast[1]=speaker;
  const portraits=cast.map((id,i)=>`<img class="map-story-speaker story-scene-portrait${id===speaker?' is-speaking':''}" data-character="${id}" style="left:${cast.length===1?50:i===0?26:74}%" src="${portraitFor(id)}" alt="${names[id]}">`).join('');
  const showCaption=!presentation.captionShown;presentation.captionShown=true;
  const log=seen.map(n=>`<article>${n.kind!=='stage'&&names[n.speaker]?`<b>${names[n.speaker]}</b>`:''}<p>${mapStoryEscape(mapStoryNodeText(n))}</p></article>`).join('');
  const secondary=!node&&ui.phase==='pre'&&!ui.replay?'<button type="button" class="map-story-party" onclick="editMapStoryParty()">編成を確認</button>':'';
  root.innerHTML=`<div class="map-story-scene${node?.id==='vc_09_post_05'?' map-story-time-skip':''}" data-lighting="${lighting}" onclick="mapStoryTap(event)">
    <img class="map-story-bg story-scene-bg" src="${mapStoryEscape(BATTLE_MAPIMG[map.id]||map.image)}" alt="${mapName}">
    <div class="map-story-character-stage">${portraits}</div>
    <header class="map-story-heading"><span>${mapName} · ${ui.replay?'読み返し · ':''}${ui.phase==='pre'?'戦闘前':'戦闘後'}</span><h2 id="mapStoryEpisodeTitle" class="${showCaption?'is-intro':''}">第${episode.number}話「${mapStoryEscape(episode.title)}」</h2></header>
    <nav class="story-scene-tools map-story-tools" aria-label="会話の操作">
      <button type="button" id="mapStoryLogButton" onclick="toggleMapStoryLog()">ログ</button>
      <button type="button" id="mapStoryAuto" onclick="toggleMapStoryAuto()" aria-pressed="${presentation.auto}" ${node?'':'disabled'}>自動</button>
      <button type="button" class="map-story-skip" onclick="skipMapStoryDialogue()" ${node?'':'disabled'}>会話スキップ</button>
      <button type="button" class="map-story-close" onclick="closeMapStoryDialogue()" aria-label="会話を閉じて話一覧へ戻る">×</button>
    </nav>
    <section class="map-story-dialogue story-scene-panel" aria-labelledby="mapStoryEpisodeTitle">
      ${!narration&&label?`<strong class="story-scene-nameplate">${label}</strong>`:''}
      <div class="map-story-message"><p class="story-scene-text${narration?' is-narration':''}" id="mapStoryText"></p></div>
      <div class="map-story-actions${node?' is-conversation':''}">${primary}${secondary}</div>
    </section>
    <section id="mapStoryLog" class="story-scene-log" role="dialog" aria-modal="true" aria-label="会話ログ" hidden>
      <header><strong>会話ログ</strong><button type="button" onclick="toggleMapStoryLog(false)">閉じる</button></header>
      <div class="map-story-log-lines">${log}</div>
      <div><button type="button" class="map-story-back" onclick="previousMapStoryNode()" ${index>0?'':'disabled'}>1つ戻る</button><button type="button" class="map-story-list-button" onclick="closeMapStoryDialogue()">話一覧へ</button></div>
    </section>
  </div>`;
  const cue=document.querySelector('#mapStoryContent .is-conversation .map-story-next');if(cue)cue.classList.add('is-typing');
  const textElement=document.querySelector('#mapStoryText');if(!textElement)return;
  mapStoryTypewriter=createStoryTypewriter(textElement,text,()=>{
    if(!mapStoryPresentationCurrent(ui))return;
    if(cue){cue.classList.remove('is-typing');cue.classList.add('story-scene-cue');}
    scheduleMapStoryAuto(ui,text);
  });
}
// Move only within the current conversation. Battle, rewards and completion keep
// their existing explicit actions; replay navigation never writes to the save.
function moveMapStoryCursor(target){
  const ui=mapStoryUi;if(!ui||mapStorySaveRetry||ui.identity!==saveTransactionIdentity())return;
  const episode=mapStoryEpisode(ui.episodeId),nodes=ui.phase==='post'?episode.postNodes:episode.preNodes;
  const r=mapStoryState().resume;
  if(!ui.replay&&(!r||r.episodeId!==ui.episodeId||r.phase!==ui.phase))return;
  const index=ui.replay?ui.cursor:r.nodeId?nodes.findIndex(n=>n.id===r.nodeId):nodes.length;
  const next=target==='end'?nodes.length:Math.max(0,index-1);
  if(next===index)return;
  if(ui.replay){ui.cursor=next;renderMapStory();return;}
  mapStoryWrite(()=>{mapStoryState().resume.nodeId=nodes[next]?.id||null;},renderMapStory);
}
function previousMapStoryNode(){moveMapStoryCursor('previous');}
function skipMapStoryDialogue(){moveMapStoryCursor('end');}
function advanceMapStoryNode(){
  const ui=mapStoryUi;if(!ui||mapStorySaveRetry||ui.identity!==saveTransactionIdentity())return;
  const e=mapStoryEpisode(ui.episodeId),nodes=ui.phase==='post'?e.postNodes:e.preNodes;
  if(ui.replay){if(ui.cursor>=nodes.length&&ui.phase==='pre'){ui.phase='post';ui.cursor=0;}else ui.cursor++;renderMapStory();return;}
  const r=mapStoryState().resume;if(!r||r.phase!==ui.phase)return;
  const index=r.nodeId?nodes.findIndex(n=>n.id===r.nodeId):nodes.length;
  mapStoryWrite(()=>{mapStoryState().resume.nodeId=nodes[index+1]?.id||null;},renderMapStory);
}
function closeMapStoryDialogue(){if(mapStorySaveRetry)return;cancelMapStoryPresentation();mapStoryUi=null;renderMapStory();}
function editMapStoryParty(){if(mapStorySaveRetry||mapStoryState().resume?.phase==='battle')return;cancelMapStoryPresentation();mapStoryUi=null;show('partySet');}
function renderMapStoryPartyReturn(){
  document.getElementById('mapStoryPartyReturn')?.remove();
  const story=currentMapStory();
  if(mapStoryState().resume?.phase!=='pre'&&!mapStoryCompletedCount(story))return;
  const b=document.createElement('button');b.id='mapStoryPartyReturn';b.type='button';b.textContent=`${mapStoryMap(story).name}の物語へ戻る`;b.onclick=()=>openMapStory(story.id);
  document.getElementById('partySet').prepend(b);
}
function createMapStoryEnemy(spec){
  const mon=by(spec.speciesId);if(!mon||spec.moveIds.some(id=>!SKILL_BY_ID[id]))throw new Error('story_data_missing');
  return {...structuredClone(mon),level:spec.level,moves:spec.moveIds.map(id=>skillToMove(id)),mapStoryFixedMoves:true};
}
function createMapStoryRequest(episode,attemptId,participantUids){
  // Validate every enemy and move before saving departure; never use random hunt construction.
  episode.enemies.forEach(createMapStoryEnemy);
  const story=currentMapStory(),first=episode.enemies[0];
  return {source:'map_story',storyId:story.id,storyVersion:story.version,episodeId:episode.id,attemptId,identity:saveTransactionIdentity(),participantUids:[...participantUids],
    mapId:story.mapId,enemyId:first.speciesId,difficultyId:'normal',difficultyLabel:`${mapStoryMap(story).name}ストーリー／第${episode.number}話`,enemyLevel:first.level,enemyHp:maxHp(by(first.speciesId),first.level),
    attackMultiplier:first.attackMultiplier,attackText:String(first.attackMultiplier),rewardMultiplier:1,rewardText:'固定',conditions:[],battleMode:episode.battleMode,
    secondEnemyId:episode.enemies[1]?.speciesId||null,invasionEnemyId:null,invasionTurn:null,enemies:structuredClone(episode.enemies)};
}
function launchMapStoryBattle(id){
  const episode=mapStoryEpisode(id),resume=mapStoryState().resume;
  if(mapStoryStarting||mapStorySaveRetry||!episode||!mapStoryUnlocked(episode)||resume?.episodeId!==id||!['pre','battle'].includes(resume.phase))return false;
  if(isMapStoryBattle()&&mapStoryTokenValid(activeHuntRequest))return false;
  // Persist the rescue before allowing a new party or attempt; failed saves retain the old resume.
  if(resume.phase==='battle'&&!resume.participantUids.some(uid=>save.instances.some(ins=>ins.uid===uid))){
    if((resume.rewardCommitted||resume.postPending)&&!mapStoryState().episodes[id]){
      showUiNotice('物語の戦闘データを読み込めませんでした','error');return false;
    }
    mapStoryWrite(()=>{
      const r=mapStoryState().resume;
      // Already committed outcomes must never be replayed for another reward.
      const awarded=r.rewardCommitted||r.postPending||Boolean(r.attemptId&&mapStoryProgress(id).lastAttemptId===r.attemptId);
      mapStoryState().resume={...r,phase:awarded?'post':'pre',nodeId:awarded?episode.postNodes[0].id:null,
        attemptId:awarded?r.attemptId:null,rewardCommitted:Boolean(awarded),postPending:Boolean(awarded),participantUids:[]};
    },()=>{
      activeHuntRequest=null;mapStoryUi=null;
      if(mapStoryState().resume.phase==='pre')showUiNotice('戦闘に参加していた仲間がいないため、戦闘前に戻しました。','warning');
      if(mapStoryState().resume.phase==='pre')editMapStoryParty();else startMapStoryEpisode(id);
    });
    return false;
  }
  const party=resume.phase==='battle'?resume.participantUids.map(uid=>save.instances.find(i=>i.uid===uid)).filter(Boolean):getPartyInstances();if(!party.length){showUiNotice('戦えるモンスターを編成してください。','warning');editMapStoryParty();return false;}
  const attemptId=`${id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  let request;try{request=createMapStoryRequest(episode,attemptId,party.map(p=>p.uid));}catch(_error){showUiNotice('物語の戦闘データを読み込めませんでした','error');return false;}
  mapStoryStarting=true;
  const saved=mapStoryWrite(()=>{mapStoryState().resume={...mapStoryState().resume,phase:'battle',nodeId:null,attemptId,rewardCommitted:false,postPending:false,participantUids:request.participantUids};},()=>{
    mapStoryStarting=false;mapStoryUi=null;endPartyRecovery();prepareBattleParty(request.participantUids.map(uid=>save.instances.find(i=>i.uid===uid)).filter(Boolean));
    beginChosenBattle(request.mapId,request.enemyId,request.difficultyId,request);
    document.getElementById('log').innerHTML=`${mapStoryEscape(request.difficultyLabel)}を開始！<br>${mapStoryEscape(mapStoryEnemiesLabel(episode))}が立ちはだかった。`;
    mapStoryBattleBanner();
  });
  if(!saved)mapStoryStarting=false;return saved;
}
function mapStoryBattleBanner(){
  if(!isMapStoryBattle())return;
  const e=mapStoryEpisode(activeHuntRequest.episodeId);
  document.getElementById('battleMapBanner').innerHTML=`<div class="panel"><h2>${mapStoryEscape(activeHuntRequest.difficultyLabel)}</h2><p>${mapStoryEscape(e.title)} · ${e.battleMode==='three_way'?'三つ巴戦':'1対1'}</p><p>${mapStoryEscape(mapStoryEnemiesLabel(e))}</p></div>`;
}
function mapStoryAwardExp(uids,amount){
  for(const uid of uids){const ins=save.instances.find(i=>i.uid===uid);if(!ins)continue;
    if(isMaxLevel(ins.level)){ins.level=MAX_LEVEL;ins.exp=0;continue;}
    ins.exp=(ins.exp||0)+(typeof traitExperienceReward==='function'?traitExperienceReward(ins,amount,uids.map(id=>save.instances.find(p=>p.uid===id)).filter(Boolean)):amount);
    while(!isMaxLevel(ins.level)&&ins.exp>=needExp(ins.level)){ins.exp-=needExp(ins.level);ins.level++;}
    if(isMaxLevel(ins.level))ins.exp=0;
  }
}
function mapStoryOutcome(kind,request=activeHuntRequest){
  if(request?.source!=='map_story')return false;
  if(!mapStoryTokenValid(request))return true;
  const episode=mapStoryEpisode(request.episodeId);
  if(kind==='victory'&&(multiBattle?.active?aliveMultiEnemies().length>0:eHp>0))return true;
  const reward=mapStoryProgress(episode.id).firstRewardClaimed?episode.repeatReward:episode.firstReward;
  busy=true;renderBattleInputState();
  mapStoryWrite(()=>{
    const s=mapStoryState(),r=s.resume;if(r?.attemptId!==request.attemptId||r.phase!=='battle')return;
    if(kind==='victory'){
      const p=s.episodes[episode.id]||{completed:false,firstVictory:false,firstRewardClaimed:false,victoryCount:0};
      if(p.lastAttemptId===request.attemptId)return;
      mapStoryAwardExp(r.participantUids,reward.exp);save.coins+=typeof traitCoinReward==='function'?traitCoinReward(reward.coins):reward.coins;
      s.episodes[episode.id]={...p,firstVictory:true,firstRewardClaimed:true,victoryCount:p.victoryCount+1,lastAttemptId:request.attemptId};
      s.resume={...r,phase:'post',nodeId:episode.postNodes[0].id,rewardCommitted:true,postPending:true};
    }else s.resume={...r,phase:'pre',nodeId:null,attemptId:null,rewardCommitted:false,postPending:false};
  },()=>{
    battleRewardGranted=kind==='victory';
    if(multiBattle)multiBattle.finished=true;
    completeBattleTurn();
    resetBattleTransientEffects();
    if(typeof resetKokoroLinkBattleState==='function')resetKokoroLinkBattleState();
    partyBattle.forEach(p=>{p.hp=instanceMaxHp(p.inst);p.fainted=false;});
    if(kind==='victory')request.participantUids.forEach(uid=>{const ins=save.instances.find(i=>i.uid===uid);if(ins)checkEvolution(ins);});
    show('battle');showBattleOutcome({kind,title:kind==='victory'?`第${episode.number}話：道を切り開いた`:kind==='defeat'?'いったん戻ろう':'無理せず、戻ろう',exp:kind==='victory'?reward.exp:0,coins:kind==='victory'?reward.coins:0,note:kind==='victory'?'野生個体はその場を離れた。契約は通常探索で行えます。':kind==='defeat'?'グノーシス：大丈夫、いったん戻ろう。立て直してからだ！':'契約者：無理せず、戻ろう。'});
    const next=document.getElementById('next');next.classList.add('hidden');
    document.getElementById('battleOutcomeActions').innerHTML=kind==='victory'?'<button type="button" onclick="resumeMapStoryAfterBattle()">物語の続きを見る</button>':'<button type="button" onclick="resumeMapStoryAfterBattle()">再挑戦</button><button type="button" onclick="mapStoryEditAfterBattle()">編成を見直す</button><button type="button" onclick="mapStoryListAfterBattle()">話一覧へ</button>';
  });return true;
}
function mapStoryListAfterBattle(){if(mapStorySaveRetry)return;endPartyRecovery();hideBattleOutcome();activeHuntRequest=null;busy=false;openMapStory();}
function resumeMapStoryAfterBattle(){
  if(mapStorySaveRetry)return;
  const id=mapStoryState().resume?.episodeId;endPartyRecovery();hideBattleOutcome();activeHuntRequest=null;busy=false;if(id)startMapStoryEpisode(id);
}
function mapStoryEditAfterBattle(){mapStoryListAfterBattle();editMapStoryParty();}
function completeMapStoryEpisode(){
  if(!mapStoryUi||mapStorySaveRetry||mapStoryUi.identity!==saveTransactionIdentity())return;
  if(mapStoryUi.replay){mapStoryUi=null;renderMapStory();return;}
  const id=mapStoryUi.episodeId,e=mapStoryEpisode(id),r=mapStoryState().resume;
  if(r?.episodeId!==id||r.phase!=='post'||r.nodeId!==null)return;
  mapStoryWrite(()=>{mapStoryState().episodes[id].completed=true;mapStoryState().resume=null;},()=>{
    mapStoryUi=null;
    const root=document.getElementById('mapStoryContent');
    const story=currentMapStory(),next=story.episodes.find(episode=>episode.unlockAfter===id);
    root.innerHTML=next?`<h2>第${e.number}話 完了</h2><button type="button" onclick="startMapStoryEpisode('${next.id}')">次の話へ</button><button type="button" onclick="openMapStory()">話一覧へ</button>`:
      `<button type="button" onclick="returnToStoryMapCatalog()">‹ ストーリーへ戻る</button><h2>${mapStoryEscape(story.title)} 全${story.episodes.length}話 完了</h2><p>${mapStoryEscape(story.completedText)}</p><button type="button" onclick="leaveMapStory()">${mapStoryEscape(mapStoryMap(story).name)}へ戻る</button><button type="button" onclick="openMapStory()">読み返す</button>`;
    if(typeof processNextEvolution==='function')processNextEvolution();
  });
}

