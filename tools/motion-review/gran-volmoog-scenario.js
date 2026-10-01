// Runs only in the generated sandbox. Storage was replaced before game boot.
let granReviewSpecies='gran_volmoog',granReviewMixed=false,granReviewMode='ally';
// Isolate the selected species in this QA document. As registration expands,
// a supporting ally must not take the one decoder slot from the reviewed enemy.
const granReviewAllCandidates=battleIdleCandidates;
battleIdleCandidates=()=>granReviewAllCandidates().filter(u=>granReviewMixed||u.mon.id===granReviewSpecies);
function granReviewSetup(mode='ally',mapId='grassland',species=granReviewSpecies){
 if(!Object.hasOwn(BATTLE_IDLE_MEDIA,species))return false;
 granReviewSpecies=species;
 if(!['ally','enemy','multi','mixed'].includes(mode))return false;
 granReviewMixed=mode==='mixed';granReviewMode=mode;
 const map=MAPS.find(m=>m.id===mapId);if(!map)return false;
 granMap.value=mapId;granSpecies.value=species;
 disposeBattleIdleMedia();setBattleIdleLimit(1);
 save=initSave();completeTutorial();currentTutorialState().guides={shopItems:true,kokoroLink:true};
 save.instances=[];save.party=[];
 for(const id of [mode==='ally'||mode==='multi'||mode==='mixed'?species:'aquaron','aquaron']){
   const ins=addInstance(id,10);save.party.push(ins.uid);
 }
 prepareBattleParty();selectedMap=map;enemy=by(mode==='ally'?'slime':species);
 activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='single';
 beginChosenBattle(map.id,enemy.id,'normal',activeHuntRequest);show('battle');
 if(mode==='multi'||mode==='mixed'){
   ensureMultiBattleDom();multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by(mode==='mixed'?'orca_abyss':species),'enemy_a'),createMultiEnemy(by(mode==='mixed'?'slime':species),'enemy_b')],pendingMoveIndex:null};
   setMultiBattleLayout(true);setupMultiBattle();setBattleIdleLimit(3);
 }
 granReviewUpdateProgress();
 document.getElementById('granReviewResult').textContent='表示確認待ち：'+by(species).name+' / '+mode+' / '+map.name;
 return true;
}
function granReviewMeasure(){
 const units=[...document.querySelectorAll('.battle-static-media.has-idle-size')].map(media=>{
   const r=media.getBoundingClientRect(),side=media.closest('[id$="Vis"]')?.id;
   const flipped=media.parentElement.style.transform.includes('-1');
   const video=media.querySelector('video');
   const record=[...battleIdleRecords.values()].find(item=>item.media===media);
   const config=record?.config||[...battleIdleSizeDisplays.values()].find(item=>item.media===media)?.config;
   const bounds=config?.sourceBounds||{width:960,height:960,x:0,y:0,right:960,bottom:960};
   const projected=battleIdleBoundsFit(bounds,media.clientWidth,media.clientHeight,config?.layout,Number(media.closest(".battle-arena")?.dataset.sizeUnit));
   const fit=projected?.scale??Math.min(r.width/bounds.width,r.height/bounds.height);
   const width=bounds.width*fit,height=bounds.height*fit;
   const left=projected?.left??((r.width-width)*(config?.layout?.x??0.5));
   const top=projected?.top??((r.height-height)*(config?.layout?.y??0.5));
   const visibleLeft=left+bounds.x*fit,visibleRight=left+bounds.right*fit;
   const contentLeft=r.left+(projected?media.clientLeft:0),contentTop=r.top+(projected?media.clientTop:0);
   const contentWidth=projected?media.clientWidth:r.width;
   const body={left:contentLeft+(flipped?contentWidth-visibleRight:visibleLeft),
     right:contentLeft+(flipped?contentWidth-visibleLeft:visibleRight),
     top:contentTop+top+bounds.y*fit,bottom:contentTop+top+bounds.bottom*fit};
   const gap=el=>{const b=el.getBoundingClientRect();return Math.hypot(Math.max(b.left-body.right,body.left-b.right,0),Math.max(b.top-body.bottom,body.top-b.bottom,0));};
   const hud=[...document.querySelectorAll('#singlePlayerBox,#singleEnemyBox,.multi-enemy-copy')].filter(el=>el.getClientRects().length);
   const dock=document.querySelector('.battle-command-dock');
   return {side,flipped,body,minHudGap:hud.length?Math.min(...hud.map(gap)):null,commandGap:dock?.getClientRects().length?gap(dock):null,
     readyState:media.querySelector('video')?.readyState,currentTime:media.querySelector('video')?.currentTime};
 });
 const report={viewport:[innerWidth,innerHeight],units,note:'現在の配置と既存全編bboxの計算。動画全編の目視、発熱、足場の自然さの合格ではない。'};
 document.getElementById('granReviewResult').textContent=JSON.stringify(report,null,2);return report;
}
const granPanel=document.createElement('details');granPanel.style.cssText='padding:8px;background:#102647;color:white;position:relative;z-index:1000';
granPanel.innerHTML='<strong>Phase D・配置確認</strong><p>採用した体格差で50体を順に確認できます。前／次で種類を切り替え、一覧で大きさを比較できます。足場の自然さ、翼・尾とHPの間隔、横向き・文字拡大を確認してください。</p><div id="granReviewControls"></div><pre id="granReviewResult" style="white-space:pre-wrap"></pre>';
document.body.prepend(granPanel);
const granPanelSummary=document.createElement('summary');granPanelSummary.textContent='モンスター・背景の確認設定';granPanelSummary.style.cssText='min-height:48px;display:flex;align-items:center;cursor:pointer';granPanel.prepend(granPanelSummary);
const granMap=document.createElement('select');granMap.setAttribute('aria-label','確認マップ');granMap.style.minHeight='48px';
for(const map of MAPS){const opt=document.createElement('option');opt.value=map.id;opt.textContent=map.name;granMap.append(opt);}
document.getElementById('granReviewControls').append(granMap);
const granSpecies=document.createElement('select');granSpecies.setAttribute('aria-label','確認モンスター');granSpecies.style.minHeight='48px';
const granReviewOrder=Object.keys(BATTLE_IDLE_MEDIA).sort((a,b)=>by(a).rarity.length-by(b).rarity.length||(by(a).dexNo||by(a).no)-(by(b).dexNo||by(b).no));
for(const id of granReviewOrder){const opt=document.createElement('option');opt.value=id;opt.textContent=by(id).rarity+' '+Math.round(BATTLE_IDLE_MEDIA[id].layout.scale*100)+'% · '+by(id).name;granSpecies.append(opt);}
granSpecies.value=granReviewSpecies;
function granReviewSelectSpecies(id){
 document.getElementById('granMetricsDetails')?.remove();window.granReviewMetrics=null;
 granSpecies.value=id;return granReviewSetup(granReviewMode,granMap.value,id);
}
granSpecies.onchange=()=>granReviewSelectSpecies(granSpecies.value);
granMap.onchange=()=>granReviewSetup(granReviewMode,granMap.value,granSpecies.value);
document.getElementById('granReviewControls').prepend(granSpecies);
const granReviewProgress=document.createElement('p');granReviewProgress.id='granReviewProgress';granReviewProgress.setAttribute('aria-live','polite');granPanel.insertBefore(granReviewProgress,document.getElementById('granReviewControls'));
function granReviewUpdateProgress(){
 const index=granReviewOrder.indexOf(granReviewSpecies),mon=by(granReviewSpecies);
 granReviewProgress.textContent=(index+1)+' / '+granReviewOrder.length+' · '+mon.rarity+' · '+mon.name+' · '+Math.round(BATTLE_IDLE_MEDIA[mon.id].layout.scale*100)+'%';
}
function granReviewStep(delta){
 const index=granReviewOrder.indexOf(granReviewSpecies);
 return granReviewSelectSpecies(granReviewOrder[(index+delta+granReviewOrder.length)%granReviewOrder.length]);
}
function granReviewToggleSizeGallery(){
 let gallery=document.getElementById('granReviewSizeGallery');
 if(gallery){gallery.hidden=!gallery.hidden;return;}
 gallery=document.createElement('section');gallery.id='granReviewSizeGallery';
 const heading=document.createElement('h2');heading.textContent='50体の体格一覧';gallery.append(heading);
 const note=document.createElement('p');note.textContent='同じ基準で静止素材を比較します。種類を押すと戦闘配置へ戻ります。背景や動きの確認は戦闘画面で行ってください。';gallery.append(note);
 const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px';
 for(const id of granReviewOrder){
  const config=BATTLE_IDLE_MEDIA[id],mon=by(id),card=document.createElement('button');card.type='button';card.dataset.sizeSpecies=id;card.style.cssText='margin:0;padding:4px;min-height:180px;width:100%;background:#183653;color:white;border:1px solid #c9a862;border-radius:8px;white-space:normal';
  const box=document.createElement('span');box.style.cssText='position:relative;display:block;width:136px;height:136px;margin:auto;overflow:hidden';
  const fit=battleIdleBoundsFit(config.sourceBounds,136,136,config.layout,100),img=document.createElement('img');img.src=config.poster;img.alt=mon.name;img.loading='lazy';img.style.cssText='position:absolute;max-width:none!important;max-height:none!important;width:'+fit.width+'px!important;height:'+fit.height+'px!important;left:'+fit.left+'px;top:'+fit.top+'px;object-fit:contain';box.append(img);
  const label=document.createElement('span');label.style.display='block';label.textContent=mon.rarity+' '+Math.round(config.layout.scale*100)+'% · '+mon.name;
  card.append(box,label);card.onclick=()=>{gallery.hidden=true;granReviewSelectSpecies(id);granPanel.scrollIntoView({block:'start'});};grid.append(card);
 }
 gallery.append(grid);granPanel.append(gallery);
}

for(const [label,fn] of [['前の種類',()=>granReviewStep(-1)],['次の種類',()=>granReviewStep(1)],['50体一覧',granReviewToggleSizeGallery],['味方1体',()=>granReviewSetup('ally',granMap.value)],['敵1体',()=>granReviewSetup('enemy',granMap.value)],['同種3体',()=>granReviewSetup('multi',granMap.value)],['大型・横長・小型',()=>{granSpecies.value='elixion';granReviewSetup('mixed',granMap.value,'elixion');}],['間隔を計測',granReviewMeasure],['文字200%',()=>document.documentElement.style.fontSize=document.documentElement.style.fontSize?'':'200%'],['停止・離脱',()=>show('home')]]){
 const b=document.createElement('button');b.textContent=label;b.type='button';b.style.cssText='min-height:48px;margin:4px';b.onclick=fn;document.getElementById('granReviewControls').append(b);
}
granReviewSetup();

// Explicit, foreground-only diagnostic. Measurements are observations, not acceptance.
let granMetricsRunning=false;
async function granReviewCollect(){
 if(granMetricsRunning)return;
 granMetricsRunning=true;
 const out=document.getElementById('granReviewResult');
 const controls=[...document.querySelectorAll('#granReviewControls button,#granReviewControls select')];
 controls.forEach(el=>el.disabled=true);
 let interrupted=document.hidden;
 const markHidden=()=>{if(document.hidden)interrupted=true;};
 document.addEventListener('visibilitychange',markHidden);
 const report={version:2,species:granReviewSpecies,viewport:[innerWidth,innerHeight],map:granMap.value,delivery:null,samples:[],limitations:'現在の端末・画面幅の計測。横向き・他の幅・200%文字・発熱・BFCacheは別項目。自動合格判定ではありません。'};
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const quality=v=>{if(typeof v.getVideoPlaybackQuality!=='function')return null;const q=v.getVideoPlaybackQuality();return {total:q.totalVideoFrames,dropped:q.droppedVideoFrames};};
 const round=v=>Number.isFinite(v)?Math.round(v*10)/10:null;
 try{
  out.textContent='動画の配信を確認中…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch(new URL(BATTLE_IDLE_MEDIA[granReviewSpecies].src,document.baseURI),{headers:{Range:'bytes=0-1023'},signal:controller.signal});
   const bytes=(await response.arrayBuffer()).byteLength;
   report.delivery={status:response.status,type:response.headers.get('content-type'),range:response.headers.get('content-range'),bytes};
  }catch(error){report.delivery={error:error.name};}finally{clearTimeout(timer);}
  for(const [mode,label] of [['ally','味方1体'],['enemy','敵1体'],['multi','同種3体']]){
   if(interrupted)throw Error('計測中に画面が非表示になりました');
   granReviewSetup(mode,granMap.value);
   out.textContent=label+'を準備中…';await delay(1500);
   const videos=[...document.querySelectorAll('video')];
   const before=videos.map(quality),start=performance.now();
   let raf=0,last=0,frames=0,maxGap=0;
   const tick=t=>{if(last){frames++;maxGap=Math.max(maxGap,t-last);}last=t;raf=requestAnimationFrame(tick);};
   raf=requestAnimationFrame(tick);
   out.textContent=label+'を16秒計測中…画面を開いたままお待ちください。';
   try{await delay(16000);}finally{cancelAnimationFrame(raf);}
   if(interrupted)throw Error('計測中に画面が非表示になりました');
   const placement=granReviewMeasure();
   report.samples.push({mode,label,elapsedMs:round(performance.now()-start),animationFrames:frames,maxFrameGapMs:round(maxGap),placement:placement.units.map(u=>({side:u.side,hudGapPx:round(u.minHudGap),commandGapPx:round(u.commandGap)})),videos:videos.map((v,i)=>{const after=quality(v),b=before[i];return {readyState:v.readyState,paused:v.paused,retained:v.isConnected,error:v.error?.code??null,totalFrames:b&&after?after.total-b.total:null,droppedFrames:b&&after?after.dropped-b.dropped:null};})});
  }
 }catch(error){report.error=error.message;}finally{
  document.removeEventListener('visibilitychange',markHidden);
  controls.forEach(el=>el.disabled=false);granMetricsRunning=false;
 }
 const delivery=report.delivery;
 const lines=['計測結果（この表示を送ってください）', '対象 '+by(report.species).name, '画面 '+report.viewport.join('×'),
  '配信 '+(delivery?.error||`${delivery?.status} / ${delivery?.type} / ${delivery?.bytes} bytes`),
  '範囲 '+(delivery?.range||'未取得')];
 for(const sample of report.samples){
  const gaps=sample.placement.map(u=>`${u.side}: HP ${u.hudGapPx??'不明'} / 操作 ${u.commandGapPx??'不明'} px`).join('、');
  lines.push(sample.label+'：コマ落ち '+sample.videos.map(v=>`${v.droppedFrames??'不明'}/${v.totalFrames??'不明'}`).join('・'));
  lines.push(gaps);
  lines.push('描画最大間隔 '+sample.maxFrameGapMs+'ms / 再生中 '+sample.videos.filter(v=>!v.paused&&!v.error&&v.readyState>=2).length+'体');
 }
 if(report.error)lines.push('未完了：'+report.error);
 lines.push('HP 8px以上・操作12px以上が配置条件。数値は判定前です。');
 out.textContent=lines.join('\n');
 let details=document.getElementById('granMetricsDetails');
 if(!details){details=document.createElement('details');details.id='granMetricsDetails';granPanel.append(details);}
 details.replaceChildren();const summary=document.createElement('summary');summary.textContent='詳細データ';details.append(summary);
 const raw=document.createElement('pre');raw.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';raw.textContent=JSON.stringify(report,null,2);details.append(raw);
 window.granReviewMetrics=report;
 return report;
}
const metricsButton=document.createElement('button');metricsButton.type='button';metricsButton.textContent='まとめて計測（約1分）';metricsButton.style.cssText='min-height:48px;margin:4px';metricsButton.onclick=granReviewCollect;document.getElementById('granReviewControls').append(metricsButton);
