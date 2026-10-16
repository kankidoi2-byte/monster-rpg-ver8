/* Grassland story controller. Normal exploration never enters this outcome path. */
let mapStoryUi=null;
let mapStorySaveRetry=null;
let mapStoryStarting=false;
const mapStoryEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mapStoryState(){return save.mapStories.grassland_whose;}
function mapStoryEpisode(id){return GRASSLAND_STORY.episodes.find(e=>e.id===id);}
function mapStoryProgress(id){return mapStoryState().episodes[id]||{completed:false,firstVictory:false,firstRewardClaimed:false,victoryCount:0};}
function mapStoryAvailable(){return ['completed','skipped'].includes(save.progress?.tutorial?.status)&&worldMapEntryAvailable(MAPS.find(m=>m.id==='grassland'));}
function mapStoryUnlocked(episode){return mapStoryAvailable()&&(!episode.unlockAfter||mapStoryProgress(episode.unlockAfter).completed);}
function isMapStoryBattle(){return activeHuntRequest?.source==='map_story';}
function mapStoryBattleToken(){return isMapStoryBattle()?activeHuntRequest:null;}
function mapStoryTokenValid(token){return !token||(activeHuntRequest===token&&token.identity===saveTransactionIdentity()&&mapStoryState().resume?.phase==='battle'&&mapStoryState().resume?.attemptId===token.attemptId);}
function mapStoryWrite(mutate,onSaved){
  if(mapStorySaveRetry)return false;
  const identity=saveTransactionIdentity();
  const attempt=()=>{
    if(identity!==saveTransactionIdentity()){mapStorySaveRetry=null;mapStoryUi=null;return false;}
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
  if(map.id!=='grassland')return '';
  const count=GRASSLAND_STORY.episodes.filter(e=>mapStoryProgress(e.id).completed).length;
  return `<aside class="wm-event-notice"><strong>マップストーリー</strong><p>草原は、誰のもの／全11話 · ${count}/11 完了</p><button type="button" class="wm-depart" onclick="openMapStory()" ${mapStoryAvailable()?'':'disabled'}>草原の物語を見る ›</button>${mapStoryAvailable()?'':'<p>序章を完了またはスキップすると解放されます。</p>'}</aside>`;
}
function openMapStory(){
  if(mapStorySaveRetry)return retryMapStorySave();
  if(!mapStoryAvailable())return false;
  mapStoryUi=null;show('mapStory');renderMapStory();return true;
}
function mapStoryEnemiesLabel(episode){return episode.enemies.map(e=>`${by(e.speciesId).name}（${by(e.speciesId).rarity}・Lv.${e.level}）`).join('／');}
function renderMapStory(){
  if(mapStorySaveRetry)return;
  const root=document.getElementById('mapStoryContent');if(!root)return;
  if(!mapStoryAvailable()){root.innerHTML='<p>序章を完了またはスキップすると解放されます。</p>';return;}
  const resume=mapStoryState().resume;
  if(mapStoryUi?.identity!==saveTransactionIdentity())mapStoryUi=null;
  if(mapStoryUi){renderMapStoryDialogue();return;}
  const count=GRASSLAND_STORY.episodes.filter(e=>mapStoryProgress(e.id).completed).length;
  root.innerHTML=`<button type="button" onclick="returnToStoryMapCatalog()">‹ ストーリーへ戻る</button><h2>草原は、誰のもの</h2><p>全11話 · ${count}/11 完了</p>${count===11?'<p>草原の暮らしを知り、道を見つけた。</p>':''}<div class="map-story-list">${GRASSLAND_STORY.episodes.map(e=>{
    const p=mapStoryProgress(e.id),unlocked=mapStoryUnlocked(e),pending=resume?.episodeId===e.id;
    const status=p.completed?'完了':pending?'進行中':unlocked?'解放済':'未解放';
    const action=pending?`<button type="button" onclick="startMapStoryEpisode('${e.id}')">${resume.phase==='post'?'戦闘後から再開':'つづきから'}</button>`:!p.completed?`<button type="button" onclick="startMapStoryEpisode('${e.id}')" ${unlocked?'':'disabled'}>第${e.number}話を始める</button>`:'';
    return `<article class="map-story-card"><small>第${e.number}話 · ${status}</small><h3>${mapStoryEscape(e.title)}</h3><p>推奨Lv.${e.recommendedLevel} · ${e.battleMode==='three_way'?'三つ巴戦':'1対1'}</p><p>${mapStoryEscape(mapStoryEnemiesLabel(e))}</p><p>初回：各個体EXP ${e.firstReward.exp}／コイン ${e.firstReward.coins}<br>再戦：各個体EXP 20／コイン 10</p>${action}${p.completed?`<button type="button" onclick="readMapStoryEpisode('${e.id}')">読み返す</button>${!pending?`<button type="button" onclick="startMapStoryEpisode('${e.id}',true)">再戦する</button>`:''}`:''}</article>`;
  }).join('')}</div><button type="button" onclick="leaveMapStory()">草原へ戻る</button>`;
}
function leaveMapStory(){
  if(mapStorySaveRetry)return;
  mapStoryUi=null;activeHuntRequest=null;endPartyRecovery();busy=false;
  showBattleChoices();worldMapSelectedId='grassland';worldMapSelectedEvent=null;
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
  if(!mapStoryProgress(id).completed||mapStorySaveRetry)return false;
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
  gl_11_post_08:'それから数日後。一行は最初の窪地へ戻ってきた。'
};
function mapStoryNodeText(node){return node.kind==='stage'?(MAP_STORY_STAGE_COPY[node.id]||node.text):node.text;}
function renderMapStoryDialogue(){
  const ui=mapStoryUi,episode=mapStoryEpisode(ui.episodeId),resume=mapStoryState().resume;
  const nodes=ui.phase==='post'?episode.postNodes:episode.preNodes;
  const index=ui.replay?ui.cursor:resume?.nodeId?nodes.findIndex(n=>n.id===resume.nodeId):nodes.length;
  const node=nodes[index];
  const root=document.getElementById('mapStoryContent');
  if(!node){
    if(ui.phase==='pre'){
      root.innerHTML=`<h2>第${episode.number}話「${mapStoryEscape(episode.title)}」</h2><p>${ui.replay?`${mapStoryEscape(mapStoryEnemiesLabel(episode))}との戦闘を切り抜けた。`:`第${episode.number}話を開始します。敵：${mapStoryEscape(mapStoryEnemiesLabel(episode))}／推奨Lv${episode.recommendedLevel}。ストーリー戦では契約できません。`}</p>${ui.replay?'<button type="button" onclick="advanceMapStoryNode()">戦闘後へ</button>':`<button type="button" onclick="launchMapStoryBattle('${episode.id}')">戦闘開始</button><button type="button" onclick="editMapStoryParty()">編成を確認</button>`}<button type="button" onclick="closeMapStoryDialogue()">いったん戻る</button>`;
    }else root.innerHTML=`<h2>第${episode.number}話「${mapStoryEscape(episode.title)}」</h2><button type="button" onclick="completeMapStoryEpisode()">${ui.replay?'読み返しを終える':episode.number===11?'草原の物語を終える':`第${episode.number}話を終える`}</button><button type="button" onclick="closeMapStoryDialogue()">いったん戻る</button>`;
    return;
  }
  const label={gnosis:'グノーシス',galdra:'ガルドラ',contractor:'契約者',system:'システム'}[node.speaker]||'';
  const image=node.speaker==='gnosis'?'images/tutorial/characters/gnosis-dialogue-transparent-final.png':node.speaker==='galdra'?IMG[by('galdra').imgKey]:null;
  const shade=episode.number<=4?0:episode.number<=7?.08:episode.number<=10?.14:ui.phase==='pre'?.18:0;
  root.innerHTML=`<h2>第${episode.number}話「${mapStoryEscape(episode.title)}」</h2><div class="map-story-scene" style="--story-shade:${shade}"><img class="map-story-bg" src="images/maps/grassland.webp" alt="草原">${image?`<img class="map-story-speaker" src="${image}" alt="${label}">`:''}<div class="map-story-dialogue" aria-live="polite">${label?`<strong>${label}</strong>`:''}<p>${mapStoryEscape(mapStoryNodeText(node))}</p></div></div><div class="map-story-actions"><button type="button" onclick="advanceMapStoryNode()">次へ ›</button><button type="button" onclick="closeMapStoryDialogue()">話一覧へ</button></div>`;
}
function advanceMapStoryNode(){
  const ui=mapStoryUi;if(!ui||mapStorySaveRetry)return;
  const e=mapStoryEpisode(ui.episodeId),nodes=ui.phase==='post'?e.postNodes:e.preNodes;
  if(ui.replay){if(ui.cursor>=nodes.length&&ui.phase==='pre'){ui.phase='post';ui.cursor=0;}else ui.cursor++;renderMapStory();return;}
  const r=mapStoryState().resume;if(!r||r.phase!==ui.phase)return;
  const index=r.nodeId?nodes.findIndex(n=>n.id===r.nodeId):nodes.length;
  mapStoryWrite(()=>{mapStoryState().resume.nodeId=nodes[index+1]?.id||null;},renderMapStory);
}
function closeMapStoryDialogue(){if(mapStorySaveRetry)return;mapStoryUi=null;renderMapStory();}
function editMapStoryParty(){if(mapStorySaveRetry||mapStoryState().resume?.phase==='battle')return;mapStoryUi=null;show('partySet');}
function renderMapStoryPartyReturn(){
  document.getElementById('mapStoryPartyReturn')?.remove();
  if(mapStoryState().resume?.phase!=='pre'&&!GRASSLAND_STORY.episodes.some(e=>mapStoryProgress(e.id).completed))return;
  const b=document.createElement('button');b.id='mapStoryPartyReturn';b.type='button';b.textContent='草原の物語へ戻る';b.onclick=openMapStory;
  document.getElementById('partySet').prepend(b);
}
function createMapStoryEnemy(spec){
  const mon=by(spec.speciesId);if(!mon||spec.moveIds.some(id=>!SKILL_BY_ID[id]))throw new Error('story_data_missing');
  return {...structuredClone(mon),level:spec.level,moves:spec.moveIds.map(id=>skillToMove(id)),mapStoryFixedMoves:true};
}
function createMapStoryRequest(episode,attemptId,participantUids){
  // Validate every enemy and move before saving departure; never use random hunt construction.
  episode.enemies.forEach(createMapStoryEnemy);
  const first=episode.enemies[0];
  return {source:'map_story',storyId:GRASSLAND_STORY.id,storyVersion:1,episodeId:episode.id,attemptId,identity:saveTransactionIdentity(),participantUids:[...participantUids],
    mapId:'grassland',enemyId:first.speciesId,difficultyId:'normal',difficultyLabel:`草原ストーリー／第${episode.number}話`,enemyLevel:first.level,enemyHp:maxHp(by(first.speciesId),first.level),
    attackMultiplier:first.attackMultiplier,attackText:String(first.attackMultiplier),rewardMultiplier:1,rewardText:'固定',conditions:[],battleMode:episode.battleMode,
    secondEnemyId:episode.enemies[1]?.speciesId||null,invasionEnemyId:null,invasionTurn:null,enemies:structuredClone(episode.enemies)};
}
function launchMapStoryBattle(id){
  const episode=mapStoryEpisode(id),resume=mapStoryState().resume;
  if(mapStoryStarting||mapStorySaveRetry||!episode||!mapStoryUnlocked(episode)||resume?.episodeId!==id||!['pre','battle'].includes(resume.phase))return false;
  if(isMapStoryBattle()&&mapStoryTokenValid(activeHuntRequest))return false;
  const party=resume.phase==='battle'?resume.participantUids.map(uid=>save.instances.find(i=>i.uid===uid)).filter(Boolean):getPartyInstances();if(!party.length){showUiNotice('戦えるモンスターを編成してください。','warning');editMapStoryParty();return false;}
  const attemptId=`${id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  let request;try{request=createMapStoryRequest(episode,attemptId,party.map(p=>p.uid));}catch(_error){showUiNotice('物語の戦闘データを読み込めませんでした','error');return false;}
  mapStoryStarting=true;
  const saved=mapStoryWrite(()=>{mapStoryState().resume={...mapStoryState().resume,phase:'battle',nodeId:null,attemptId,rewardCommitted:false,postPending:false,participantUids:request.participantUids};},()=>{
    mapStoryStarting=false;mapStoryUi=null;endPartyRecovery();prepareBattleParty(request.participantUids.map(uid=>save.instances.find(i=>i.uid===uid)).filter(Boolean));
    beginChosenBattle('grassland',request.enemyId,'normal',request);
    document.getElementById('log').innerHTML=`草原ストーリー／第${episode.number}話を開始！<br>${mapStoryEscape(mapStoryEnemiesLabel(episode))}が立ちはだかった。`;
    mapStoryBattleBanner();
  });
  if(!saved)mapStoryStarting=false;return saved;
}
function mapStoryBattleBanner(){
  if(!isMapStoryBattle())return;
  const e=mapStoryEpisode(activeHuntRequest.episodeId);
  document.getElementById('battleMapBanner').innerHTML=`<div class="panel"><h2>草原ストーリー／第${e.number}話</h2><p>${mapStoryEscape(e.title)} · ${e.battleMode==='three_way'?'三つ巴戦':'1対1'}</p><p>${mapStoryEscape(mapStoryEnemiesLabel(e))}</p></div>`;
}
function mapStoryAwardExp(uids,amount){
  for(const uid of uids){const ins=save.instances.find(i=>i.uid===uid);if(!ins)continue;
    if(isMaxLevel(ins.level)){ins.level=MAX_LEVEL;ins.exp=0;continue;}
    ins.exp=(ins.exp||0)+amount;
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
      mapStoryAwardExp(r.participantUids,reward.exp);save.coins+=reward.coins;
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
  if(!mapStoryUi||mapStorySaveRetry)return;
  if(mapStoryUi.replay){mapStoryUi=null;renderMapStory();return;}
  const id=mapStoryUi.episodeId,e=mapStoryEpisode(id),r=mapStoryState().resume;
  if(r?.episodeId!==id||r.phase!=='post'||r.nodeId!==null)return;
  mapStoryWrite(()=>{mapStoryState().episodes[id].completed=true;mapStoryState().resume=null;},()=>{
    mapStoryUi=null;
    const root=document.getElementById('mapStoryContent');
    root.innerHTML=e.number===11?'<button type="button" onclick="returnToStoryMapCatalog()">‹ ストーリーへ戻る</button><h2>草原は、誰のもの 全11話 完了</h2><p>草原の暮らしを知り、道を見つけた。</p><button type="button" onclick="leaveMapStory()">草原へ戻る</button><button type="button" onclick="openMapStory()">読み返す</button>':`<h2>第${e.number}話 完了</h2><button type="button" onclick="startMapStoryEpisode('gl_${String(e.number+1).padStart(2,'0')}')">次の話へ</button><button type="button" onclick="openMapStory()">話一覧へ</button>`;
    if(typeof processNextEvolution==='function')processNextEvolution();
  });
}

