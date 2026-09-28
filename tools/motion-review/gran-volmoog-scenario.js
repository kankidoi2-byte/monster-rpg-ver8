// Runs only in the generated sandbox. Storage was replaced before game boot.
function granReviewSetup(mode='ally',mapId='grassland'){
 if(!['ally','enemy','multi'].includes(mode))return false;
 const map=MAPS.find(m=>m.id===mapId);if(!map)return false;
 disposeBattleIdleMedia();setBattleIdleLimit(1);
 save=initSave();completeTutorial();currentTutorialState().guides={shopItems:true,kokoroLink:true};
 save.instances=[];save.party=[];
 for(const id of [mode==='ally'||mode==='multi'?'gran_volmoog':'aquaron','aquaron']){
   const ins=addInstance(id,10);save.party.push(ins.uid);
 }
 prepareBattleParty();selectedMap=map;enemy=by(mode==='ally'?'slime':'gran_volmoog');
 activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='single';
 beginChosenBattle(map.id,enemy.id,'normal',activeHuntRequest);show('battle');
 if(mode==='multi'){
   ensureMultiBattleDom();multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by('gran_volmoog'),'enemy_a'),createMultiEnemy(by('gran_volmoog'),'enemy_b')],pendingMoveIndex:null};
   setMultiBattleLayout(true);setupMultiBattle();setBattleIdleLimit(3);
 }
 document.getElementById('granReviewResult').textContent='表示確認待ち：'+mode+' / '+map.name;
 return true;
}
function granReviewMeasure(){
 const units=[...document.querySelectorAll('.battle-static-media.has-idle-media')].map(media=>{
   const r=media.getBoundingClientRect(),side=media.closest('[id$="Vis"]')?.id;
   const size=Math.min(r.width,r.height),left=r.left+(r.width-size)/2,top=r.bottom-size;
   const flipped=media.parentElement.style.transform.includes('-1');
   // Existing full-frame union alpha>8 bbox, inclusive endpoints converted to edges.
   const body={left:left+size*(flipped?0:8)/960,right:left+size*(flipped?952:960)/960,
     top:top+size*8/960,bottom:top+size*945/960};
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
granPanel.innerHTML='<strong>グランボルモーグ戦闘確認</strong><p>各配置を2周再生し、足場・向き・切断・HPとの重なりを確認。3体は負荷確認用です。</p><div id="granReviewControls"></div><pre id="granReviewResult" style="white-space:pre-wrap"></pre>';
document.body.prepend(granPanel);
const granMap=document.createElement('select');granMap.setAttribute('aria-label','確認マップ');granMap.style.minHeight='48px';
for(const map of MAPS){const opt=document.createElement('option');opt.value=map.id;opt.textContent=map.name;granMap.append(opt);}
document.getElementById('granReviewControls').append(granMap);
for(const [label,fn] of [['味方1体',()=>granReviewSetup('ally',granMap.value)],['敵1体',()=>granReviewSetup('enemy',granMap.value)],['同種3体',()=>granReviewSetup('multi',granMap.value)],['間隔を計測',granReviewMeasure],['文字200%',()=>document.documentElement.style.fontSize=document.documentElement.style.fontSize?'':'200%'],['停止・離脱',()=>show('home')]]){
 const b=document.createElement('button');b.textContent=label;b.type='button';b.style.cssText='min-height:48px;margin:4px';b.onclick=fn;document.getElementById('granReviewControls').append(b);
}
const granStyle=document.createElement('style');granStyle.textContent='#battle.is-battle-stage .has-idle-media img,#battle.is-battle-stage .battle-idle-video{object-position:center bottom!important}';document.head.append(granStyle);
granReviewSetup();
