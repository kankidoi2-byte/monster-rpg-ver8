// Runs only in the generated sandbox. Storage was replaced before game boot.
let granReviewSpecies='gran_volmoog';
function granReviewSetup(mode='ally',mapId='grassland',species=granReviewSpecies){
 if(!Object.hasOwn(BATTLE_IDLE_MEDIA,species))return false;
 granReviewSpecies=species;
 if(!['ally','enemy','multi'].includes(mode))return false;
 const map=MAPS.find(m=>m.id===mapId);if(!map)return false;
 disposeBattleIdleMedia();setBattleIdleLimit(1);
 save=initSave();completeTutorial();currentTutorialState().guides={shopItems:true,kokoroLink:true};
 save.instances=[];save.party=[];
 for(const id of [mode==='ally'||mode==='multi'?species:'aquaron','aquaron']){
   const ins=addInstance(id,10);save.party.push(ins.uid);
 }
 prepareBattleParty();selectedMap=map;enemy=by(mode==='ally'?'slime':species);
 activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='single';
 beginChosenBattle(map.id,enemy.id,'normal',activeHuntRequest);show('battle');
 if(mode==='multi'){
   ensureMultiBattleDom();multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by(species),'enemy_a'),createMultiEnemy(by(species),'enemy_b')],pendingMoveIndex:null};
   setMultiBattleLayout(true);setupMultiBattle();setBattleIdleLimit(3);
 }
 document.getElementById('granReviewResult').textContent='表示確認待ち：'+by(species).name+' / '+mode+' / '+map.name;
 return true;
}
function granReviewMeasure(){
 const units=[...document.querySelectorAll('.battle-static-media.has-idle-media')].map(media=>{
   const r=media.getBoundingClientRect(),side=media.closest('[id$="Vis"]')?.id;
   const flipped=media.parentElement.style.transform.includes('-1');
   const video=media.querySelector('video');
   const config=Object.values(BATTLE_IDLE_MEDIA).find(c=>video?.getAttribute('src')===c.src);
   const bounds=config?.sourceBounds||{width:960,height:960,x:0,y:0,right:960,bottom:960};
   const fit=Math.min(r.width/bounds.width,r.height/bounds.height);
   const width=bounds.width*fit,height=bounds.height*fit;
   const left=r.left+(r.width-width)*(config?.layout?.x??0.5),top=r.top+(r.height-height)*(config?.layout?.y??0.5);
   const body={left:left+(flipped?bounds.width-bounds.right:bounds.x)*fit,
     right:left+(flipped?bounds.width-bounds.x:bounds.right)*fit,
     top:top+bounds.y*fit,bottom:top+bounds.bottom*fit};
   const gap=el=>{const b=el.getBoundingClientRect();return Math.hypot(Math.max(b.left-body.right,body.left-b.right,0),Math.max(b.top-body.bottom,body.top-b.bottom,0));};
   const hud=[...document.querySelectorAll('#singlePlayerBox,#singleEnemyBox,.multi-enemy-copy')].filter(el=>el.getClientRects().length);
   const dock=document.querySelector('.battle-command-dock');
   return {side,flipped,body,minHudGap:hud.length?Math.min(...hud.map(gap)):null,commandGap:dock?.getClientRects().length?gap(dock):null,
     readyState:media.querySelector('video')?.readyState,currentTime:media.querySelector('video')?.currentTime};
 });
 const report={viewport:[innerWidth,innerHeight],units,note:'現在の配置と既存全編bboxの計算。動画全編の目視、発熱、足場の自然さの合格ではない。'};
 document.getElementById('granReviewResult').textContent=JSON.stringify(report,null,2);return report;
}
const granPanel=document.createElement('section');granPanel.style.cssText='padding:8px;background:#102647;color:white;position:relative;z-index:1000';
granPanel.innerHTML='<strong>Phase C・モンスター戦闘確認</strong><p>各配置を2周再生し、足場・向き・切断・HPとの重なりを確認。3体は負荷確認用です。</p><div id="granReviewControls"></div><pre id="granReviewResult" style="white-space:pre-wrap"></pre>';
document.body.prepend(granPanel);
const granMap=document.createElement('select');granMap.setAttribute('aria-label','確認マップ');granMap.style.minHeight='48px';
for(const map of MAPS){const opt=document.createElement('option');opt.value=map.id;opt.textContent=map.name;granMap.append(opt);}
document.getElementById('granReviewControls').append(granMap);
const granSpecies=document.createElement('select');granSpecies.setAttribute('aria-label','確認モンスター');granSpecies.style.minHeight='48px';
for(const id of ['gran_volmoog',...Object.keys(BATTLE_IDLE_MEDIA).filter(id=>id!=='gran_volmoog')]){const opt=document.createElement('option');opt.value=id;opt.textContent=by(id).name;granSpecies.append(opt);}
granSpecies.onchange=()=>{document.getElementById('granMetricsDetails')?.remove();window.granReviewMetrics=null;granReviewSetup('ally',granMap.value,granSpecies.value);};
document.getElementById('granReviewControls').prepend(granSpecies);

for(const [label,fn] of [['味方1体',()=>granReviewSetup('ally',granMap.value)],['敵1体',()=>granReviewSetup('enemy',granMap.value)],['同種3体',()=>granReviewSetup('multi',granMap.value)],['間隔を計測',granReviewMeasure],['文字200%',()=>document.documentElement.style.fontSize=document.documentElement.style.fontSize?'':'200%'],['停止・離脱',()=>show('home')]]){
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
