/* Presentation only: reserve real HUD/command heights before sizing artwork.
   Expanded information and 200% text remain scrollable rather than clipped. */
let battleViewportFrame=null;
function battleViewportBudget(viewportHeight,top,chrome,hud){
  if(![viewportHeight,top,chrome,hud].every(Number.isFinite)||viewportHeight<=0)return null;
  const available=Math.max(0,viewportHeight-top-chrome-8);
  const artwork=Math.max(64,available-hud-24);
  return {arena:Math.ceil(hud+24+artwork),artwork,scroll:available<hud+88};
}
function battleCompactSizePlan(enemies,ally,width,height){
  if(!Number.isFinite(width)||width<=80||!Number.isFinite(height)||height<=0)return null;
  const bodyWidth=c=>{const b=c.sourceBounds;return (b.right-b.x)/Math.max(b.right-b.x,b.bottom-b.y)*c.layout.scale;};
  const weights=enemies.map(c=>Math.max(.55,bodyWidth(c)));
  const caps=[280,Math.max(1,height-16)/1.2];
  if(ally)caps.push(Math.max(1,width*.4-24)/bodyWidth(ally));
  if(weights.length){
    const total=weights.reduce((a,b)=>a+b,0),group=Math.max(1,width*.6-16-8*(weights.length-1));
    enemies.forEach((config,i)=>caps.push(Math.max(1,group*weights[i]/total-16)/bodyWidth(config)));
  }
  return {unit:Math.min(...caps),weights,rowHeight:height};
}
function syncBattleViewportInfo(){
  const screen=document.getElementById('battle');if(!screen)return;
  let tools=document.getElementById('battleCompactTools');
  if(!tools){tools=document.createElement('div');tools.id='battleCompactTools';screen.append(tools);}
  let info=document.getElementById('battleCompactInfo');
  if(!info){info=document.createElement('details');info.id='battleCompactInfo';const summary=document.createElement('summary');summary.textContent='能力・表示設定';info.append(summary);tools.append(info);}
  const history=screen.querySelector('.battle-log-panel');if(history&&history.parentElement!==tools)tools.append(history);
  const units=[['pVis','singlePlayerBox','味方'],['eVis','singleEnemyBox','敵'],['enemy_aVis','enemy_aCard','敵A'],['enemy_bVis','enemy_bCard','敵B']];
  for(const [vis,id,label] of units){
    const hud=document.getElementById(id);let group=info.querySelector(`[data-info-vis="${vis}"]`);
    const visible=!!hud&&!hud.classList.contains('hidden')&&(vis==='pVis'||(vis==='eVis'?!multiBattle?.active:!!multiBattle?.active));
    if(!visible){if(group)group.hidden=true;continue;}
    if(!group){group=document.createElement('section');group.dataset.infoVis=vis;const heading=document.createElement('h3');group.append(heading);info.append(group);}
    group.hidden=false;group.firstElementChild.textContent=label+'：'+(hud.querySelector('h2')?.textContent||'');
    for(const detail of hud.querySelectorAll('.battle-detail,.battle-idle-details'))group.append(detail);
  }
}
function updateBattleViewport(){
  const screen=document.getElementById('battle'),arena=screen?.querySelector('.battle-arena');
  if(!arena||!screen.classList.contains('active'))return;
  syncBattleViewportInfo();
  const viewport=window.visualViewport?.height||window.innerHeight;
  const top=Math.max(0,screen.getBoundingClientRect().top+window.scrollY);
  let chrome=0;
  for(const el of screen.children){
    if(el===arena||!el.getClientRects().length||getComputedStyle(el).position==='fixed')continue;
    const style=getComputedStyle(el);chrome+=el.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);
  }
  const hudHeight=el=>el?.getClientRects().length?el.getBoundingClientRect().height:0;
  const enemyHeight=multiBattle?.active?Math.max(...[...screen.querySelectorAll('.multi-enemy-copy')].map(hudHeight),0):hudHeight(document.getElementById('singleEnemyBox'));
  const budget=battleViewportBudget(viewport,top,chrome,hudHeight(document.getElementById('singlePlayerBox'))+enemyHeight);
  if(!budget||arena.clientWidth<=80)return; // No fake geometry for an unlaid-out DOM.
  screen.classList.add('is-viewport-battle');
  arena.dataset.compactHeight=String(budget.artwork);
  arena.style.setProperty('--battle-art-height',budget.artwork+'px');
  arena.style.setProperty('--battle-viewport-arena',budget.arena+'px');
  screen.dataset.viewportOverflow=String(budget.scroll);
  syncBattleIdleSizes(battleIdleCandidates());
  for(const record of battleIdleRecords.values())applyBattleIdleLayout(record);
}
function syncBattleViewport(){
  syncBattleViewportInfo();
  if(battleViewportFrame!==null)return;
  battleViewportFrame=requestAnimationFrame(()=>{battleViewportFrame=null;updateBattleViewport();});
}
window.addEventListener('resize',syncBattleViewport);
window.visualViewport?.addEventListener('resize',syncBattleViewport);
document.addEventListener('toggle',event=>{if(event.target.closest?.('#battle'))syncBattleViewport();},true);
// One shared observer, independent of videos; no per-frame polling.
if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(syncBattleViewport);
  for(const el of document.querySelectorAll('#battle .battle-command-dock,#battleActionStatus,#battleMapBanner,.app-topbar,#singlePlayerBox,#multiEnemyGrid'))observer.observe(el);
}
