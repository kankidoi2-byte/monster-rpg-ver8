/* Presentation only: reserve real HUD/command heights before sizing artwork.
   Expanded information and 200% text remain scrollable rather than clipped. */
let battleViewportFrame=null;
function prepareBattleFloatingPanel(panel){
  // Choices occupy the normal command area; never cover the battlefield.
  panel.classList.remove('battle-floating-panel');panel.classList.add('battle-inline-panel');
  const enemyTarget=panel.id==='multiTargetSelect'&&multiBattle?.active&&multiBattle.pendingMoveIndex!==null&&multiBattle.pendingMoveIndex!==undefined;
  panel.classList.toggle('is-enemy-target',!!enemyTarget);
  if(panel.id==='multiTargetSelect'&&!enemyTarget){panel.querySelector('.battle-target-skill')?.remove();return;}
  if(enemyTarget){
    const notes=[...panel.querySelectorAll(':scope > p')];
    // Read the nested source span before removing explanatory prose. A later
    // refresh reuses the saved skill name, never concatenates instructions.
    const source=panel.querySelector(':scope > p > span');
    const text=source?.textContent||notes.find(p=>p.textContent.includes('選択中：'))?.textContent||'';
    const name=text.match(/選択中：\s*(.*?)\s*\//)?.[1];
    if(name)panel.dataset.selectedSkill=name;
    notes.forEach(p=>p.remove());
    let label=panel.querySelector('.battle-target-skill');
    if(!label){label=document.createElement('span');label.className='battle-target-skill';panel.append(label);}
    label.textContent=panel.dataset.selectedSkill||'通常攻撃';label.title=label.textContent;
    panel.querySelectorAll(':scope > button:not([data-battle-panel-back])').forEach(button=>button.hidden=true);
    return;
  }
  if(panel.id!=='commands')return;
  syncBattleViewportInfo();
  const info=document.getElementById('battleCompactInfo');
  let help=info.querySelector('.battle-skill-help');
  if(!help){help=document.createElement('details');help.className='battle-skill-help';info.append(help);}
  if(panel.querySelector('.battle-panel-note')){
    help.replaceChildren();const summary=document.createElement('summary');summary.textContent='技の効果・対象・装備コスト';help.append(summary);
    help.append(panel.querySelector('.battle-panel-note'));
    for(const button of panel.querySelectorAll('.skill-button')){
      const row=document.createElement('div'),name=document.createElement('strong');
      name.textContent=button.querySelector('strong')?.textContent||'';row.append(name);
      const stats=button.querySelector('small');if(stats){row.append(stats.cloneNode(true));stats.textContent=stats.textContent.split(' / ')[0];}
      const description=button.querySelector('.battle-choice-detail');if(description)row.append(description);
      help.append(row);
    }
  }
}
function battleViewportBudget(viewportHeight,top,chrome,hud){
  if(![viewportHeight,top,chrome,hud].every(Number.isFinite)||viewportHeight<=0)return null;
  const available=Math.max(0,viewportHeight-top-chrome-8);
  // HP panels live within the field, not in extra rows above and below it.
  // Keep a usable field when text or expanded targeting needs natural scroll.
  const artwork=Math.max(300,hud*2+120,available);
  return {arena:Math.ceil(artwork),artwork,scroll:artwork>available};
}
function battleCompactSizePlan(enemies,ally,width,height,enemyHud=64,tracks=enemies.length){
  if(!Number.isFinite(width)||width<=80||!Number.isFinite(height)||height<=0)return null;
  const bodyWidth=c=>{const b=c.sourceBounds;return (b.right-b.x)/Math.max(b.right-b.x,b.bottom-b.y)*c.layout.scale;};
  const bodyHeight=c=>{const b=c.sourceBounds;return (b.bottom-b.y)/Math.max(b.right-b.x,b.bottom-b.y)*c.layout.scale;};
  // Equal enemy tracks keep the two HP plates aligned. The far plane is 85%
  // of the near plane; registry rarity/body scales remain unchanged.
  const depth=.85,weights=enemies.map(()=>1);
  const allyBody=ally?bodyHeight(ally):.75;
  const enemyBody=depth*Math.max(...enemies.map(bodyHeight),enemies.length?0:.75);
  const caps=[width*.85];
  // Separate full-loop body bands. Their combined height and a 16px gap
  // must fit below the measured enemy HP plates, even for wide-winged allies.
  caps.push(Math.max(1,height-enemyHud-60)/(allyBody+enemyBody));
  if(ally)caps.push(Math.max(1,width*.8-16)/bodyWidth(ally));
  if(weights.length){
    const count=Math.max(1,tracks),group=Math.max(1,width*(count===1?.4:.84)-8*(count-1));
    enemies.forEach(config=>{
      caps.push(Math.max(1,group/count-16)/(bodyWidth(config)*depth));
    });
  }
  const unit=Math.min(...caps);
  return {unit,weights,rowHeight:height,allyHeight:allyBody*unit+16,enemyHeight:enemyBody*unit+16};
}
function syncBattleViewportInfo(){
  const screen=document.getElementById('battle');if(!screen)return;
  let tools=document.getElementById('battleCompactTools');
  if(!tools){tools=document.createElement('div');tools.id='battleCompactTools';screen.append(tools);}
  let info=document.getElementById('battleCompactInfo');
  if(!info){info=document.createElement('details');info.id='battleCompactInfo';const summary=document.createElement('summary');summary.textContent='設定';info.append(summary);tools.append(info);}
  const history=screen.querySelector('.battle-log-panel');if(history&&history.parentElement!==tools)tools.append(history);
  if(history){
    const summary=history.querySelector('summary');
    if(summary?.firstChild?.nodeType===Node.TEXT_NODE)summary.firstChild.textContent='履歴 ';
    let note=history.querySelector('.battle-history-limit');
    if(!note){note=document.createElement('p');note.className='battle-history-limit';note.textContent=`最新${BATTLE_HISTORY_LIMIT}件まで保存`;history.insertBefore(note,history.querySelector('ol'));}
  }
  const units=[['pVis','singlePlayerBox','味方'],['eVis','singleEnemyBox','敵'],['enemy_aVis','enemy_aCard','敵A'],['enemy_bVis','enemy_bCard','敵B']];
  for(const [vis,id,label] of units){
    const hud=document.getElementById(id);let group=info.querySelector(`[data-info-vis="${vis}"]`);
    const visible=!!hud&&!hud.classList.contains('hidden')&&(vis==='pVis'||(vis==='eVis'?!multiBattle?.active:!!multiBattle?.active));
    if(!visible){if(group)group.hidden=true;continue;}
    if(!group){group=document.createElement('section');group.dataset.infoVis=vis;const heading=document.createElement('h3');group.append(heading);info.append(group);}
    group.hidden=false;group.firstElementChild.textContent=label+'：'+(hud.querySelector('h2')?.textContent||'');
    for(const detail of hud.querySelectorAll('.battle-detail,.battle-idle-details'))group.append(detail);
    if(vis.startsWith('enemy_')){
      // Keep the existing battle handler; its stable proxy lives outside the HP
      // plate, so ordinary waiting only shows name, HP and active status.
      const source=hud.querySelector('.battle-enemy-controls button[aria-expanded]');
      let button=group.querySelector('.compact-enemy-detail');
      if(source){
        if(!button){button=document.createElement('button');button.type='button';button.className='compact-enemy-detail';group.append(button);}
        button.textContent=source.getAttribute('aria-expanded')==='true'?'能力を閉じる':'能力を見る';
        button.disabled=source.disabled;button.setAttribute('aria-expanded',source.getAttribute('aria-expanded'));
        button.onclick=()=>hud.querySelector('.battle-enemy-controls button[aria-expanded]')?.click();
      }
      const stats=hud.querySelector('.multi-enemy-details'),old=group.querySelector('.multi-enemy-details');
      if(stats){old?.remove();group.append(stats);}
      else if(source?.getAttribute('aria-expanded')!=='true')old?.remove();
    }
  }
}
function updateBattleViewport(){
  const screen=document.getElementById('battle'),arena=screen?.querySelector('.battle-arena');
  if(!arena||!screen.classList.contains('active'))return;
  syncBattleViewportInfo();
  const viewport=window.visualViewport?.height||window.innerHeight;
  const floating=screen.querySelector('.battle-inline-panel:not(.hidden)');
  // Choice changes keep the body-size unit. CSS transfers targeting
  // command space into the field, without adding to the page height.
  if(floating&&Number(arena.dataset.compactHeight)>0&&Number(arena.dataset.viewportWidth)===arena.clientWidth&&Number(arena.dataset.viewportHeight)===viewport)return;
  const top=Math.max(0,screen.getBoundingClientRect().top+window.scrollY);
  let chrome=0;
  for(const el of screen.children){
    if(el===arena||!el.getClientRects().length||getComputedStyle(el).position==='fixed')continue;
    const style=getComputedStyle(el);chrome+=el.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);
  }
  if(floating&&Number.isFinite(Number(arena.dataset.restChrome)))chrome=Number(arena.dataset.restChrome);
  else arena.dataset.restChrome=String(chrome);
  const hudHeight=el=>el?.getClientRects().length?el.getBoundingClientRect().height:0;
  const enemyHeight=multiBattle?.active?Math.max(...[...screen.querySelectorAll('.multi-enemy-copy')].map(hudHeight),0):hudHeight(document.getElementById('singleEnemyBox'));
  const budget=battleViewportBudget(viewport,top,chrome,Math.max(hudHeight(document.getElementById('singlePlayerBox')),enemyHeight));
  if(!budget||arena.clientWidth<=80)return; // No fake geometry for an unlaid-out DOM.
  screen.classList.add('is-viewport-battle');
  arena.dataset.compactHeight=String(budget.artwork);
  arena.dataset.viewportWidth=String(arena.clientWidth);arena.dataset.viewportHeight=String(viewport);
  arena.dataset.enemyHud=String(enemyHeight);
  arena.dataset.enemyDepth='.85';
  arena.style.setProperty('--battle-enemy-hud',enemyHeight+'px');
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
