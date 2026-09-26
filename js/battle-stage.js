/* Phase 3B: presentation only. No battle state or save fields are owned here. */
function syncSingleBattleStage(){
  const screen=document.getElementById('battle');
  const arena=screen?.querySelector('.battle-arena');
  if(!arena)return;
  const single=!multiBattle?.active&&!screen.classList.contains('is-multi-battle');
  screen.classList.add('is-battle-stage');
  screen.classList.toggle('is-single-stage',single);
  // Resolve the existing map image relative to the document, not the CSS file.
  const mapImage=screen.querySelector('#battleMapBanner .map-img');
  if(mapImage)arena.style.backgroundImage=`url("${mapImage.src}")`;
  else arena.style.removeProperty('background-image');
  if(single)document.getElementById('multiEnemyGrid')?.replaceChildren();
  const enemyBox=document.getElementById('singleEnemyBox');
  if(single&&enemyBox&&arena.firstElementChild!==enemyBox)arena.prepend(enemyBox);
  for(const [prefix,boxId] of [['e','singleEnemyBox'],['p','singlePlayerBox']]){
    const box=document.getElementById(boxId),visual=document.getElementById(`${prefix}Vis`);
    if(!box||!visual)return;
    let slot=document.getElementById(`${prefix}BattleSlot`);
    if(!single&&prefix==='e'){
      if(visual.parentElement!==box)box.insertBefore(visual,box.querySelector('.battle-vitals'));
      const facing=visual.querySelector('.battle-facing');
      if(facing){const media=facing.querySelector('.battle-static-media');visual.replaceChildren(...media.childNodes);}
      slot?.remove();
      continue;
    }
    if(!slot){slot=document.createElement('div');slot.id=`${prefix}BattleSlot`;slot.className=`battle-stage-slot ${prefix==='p'?'is-ally':'is-enemy'}`;arena.appendChild(slot);}
    if(visual.parentElement!==slot)slot.appendChild(visual);
    // Existing impact/cast code owns pVis/eVis. Facing and media are inside it;
    // HUD boxes remain siblings, outside all action transforms.
    if(!visual.querySelector('.battle-facing')){
      const facing=document.createElement('div'),media=document.createElement('div');
      facing.className='battle-facing';media.className='battle-static-media';
      media.append(...visual.childNodes);facing.appendChild(media);visual.appendChild(facing);
      const img=media.querySelector('img');
      if(img){
        img.addEventListener('error',()=>{
          img.hidden=true;
          let fallback=media.querySelector('.battle-static-fallback');
          if(!fallback){fallback=document.createElement('span');fallback.className='battle-static-fallback';fallback.textContent=`${prefix==='p'?'味方':'敵'}：${img.alt||'画像なし'}`;media.appendChild(fallback);}
        },{once:true});
      }
    }
  }
  const history=screen.querySelector('.battle-log-panel'),dock=screen.querySelector('.battle-command-dock');
  const pad=screen.querySelector('.battle-command-pad');
  {
    if(history&&screen.lastElementChild!==history)screen.appendChild(history);
    const order=['kokoroLinkButton','battleSkillButton','battleItemButton','battleSwitchButton','battleEscapeButton'];
    if(pad&&pad.firstElementChild?.id!==order[0])for(const id of order)pad.appendChild(document.getElementById(id));
  }
  if(dock)dock.dataset.stage=single?'single':'multi';
}

// Each entry object is one combatant lifetime; no species-only cache and no save fields.
const battleStageEntries=new WeakMap();
let battleStageEntrySequence=0;
function battleStageKey(entry){
  if(!battleStageEntries.has(entry))battleStageEntries.set(entry,++battleStageEntrySequence);
  return `${battleFeedback.sequence}:${entry.id}:${battleStageEntries.get(entry)}`;
}
function battleStageName(visId){
  const unit=battleCombatants().find(u=>u.vis===visId);
  if(!unit)return '';
  const side=visId==='pVis'?'味方':visId==='enemy_aVis'?'敵A':visId==='enemy_bVis'?'敵B':'敵';
  return `${side}：${unit.name}`;
}
function prepareBattleStageMedia(visual,label){
  if(visual.querySelector('.battle-facing'))return;
  const facing=document.createElement('div'),media=document.createElement('div');
  facing.className='battle-facing';media.className='battle-static-media';
  media.append(...visual.childNodes);facing.append(media);visual.append(facing);
  const img=media.querySelector('img');
  if(img)img.addEventListener('error',()=>{
    img.hidden=true;
    const fallback=document.createElement('span');fallback.className='battle-static-fallback';
    fallback.textContent=`${label}：${img.alt||'画像なし'}`;media.append(fallback);
  },{once:true});
}
function renderMultiBattleStageCards(html){
  const grid=document.getElementById('multiEnemyGrid');if(!grid)return;
  const template=document.createElement('div');template.innerHTML=html;
  for(const next of [...template.children]){
    const entry=multiBattle.enemies.find(e=>`${e.id}Card`===next.id);if(!entry)continue;
    const key=battleStageKey(entry),label=entry.id==='enemy_a'?'敵A':'敵B';
    const incomingVisual=next.querySelector('.multi-enemy-visual');
    const artwork= incomingVisual.innerHTML;
    const hud=next.querySelector('.multi-enemy-copy');
    const controls=document.createElement('div');controls.className='battle-enemy-controls';
    const details=document.createElement('button');details.textContent='詳細';details.type='button';
    details.setAttribute('aria-expanded',String(!!entry.detailsOpen));
    details.onclick=()=>{if(busy||multiBattle?.finished)return;entry.detailsOpen=!entry.detailsOpen;updateMultiBattleView();};
    const selecting=multiBattle.pendingMoveIndex!==null||Boolean(pendingKokoroLinkStatusSourceUid);
    if(selecting){
      const target=document.createElement('button');target.type='button';target.textContent=entry.alive?'対象にする':'対象外';
      target.disabled=!entry.alive||entry.hp<=0||busy||!!multiBattle.finished;
      target.onclick=()=>handleMultiEnemyCard(entry.id);controls.append(target);
    }
    details.disabled=busy||!!multiBattle.finished;controls.append(details);
    hud.querySelector('.multi-warning')?.remove();hud.append(controls);
    let card=document.getElementById(next.id);
    if(card?.dataset.displayKey!==key){card?.remove();card=document.createElement('article');card.id=next.id;card.dataset.displayKey=key;grid.append(card);}
    card.className=`multi-enemy-card${entry.alive&&entry.hp>0?'':' is-defeated'}${selecting&&entry.alive?' is-targetable':''}`;
    let slot=card.querySelector('.battle-stage-slot');
    if(!slot){slot=document.createElement('div');slot.className='battle-stage-slot';card.append(slot);}
    if(slot.dataset.artwork!==artwork){slot.replaceChildren(incomingVisual);slot.dataset.artwork=artwork;prepareBattleStageMedia(incomingVisual,label);}
    // Only HUD reconciliation; never walk or overwrite the media subtree.
    const oldHud=card.querySelector('.multi-enemy-copy');
    if(oldHud){
      // Keep details focus while updating numeric/status content.
      const oldControls=oldHud.querySelector('.battle-enemy-controls');
      const focused=document.activeElement;
      const status=oldHud.querySelector('.battle-status'),incomingStatus=hud.querySelector('.battle-status');
      const statesOpen=status?.querySelector('details')?.open||false;
      oldControls?.remove();hud.removeChild(controls);reconcileBattleNode(oldHud,hud);
      if(status&&incomingStatus){const currentStatus=oldHud.querySelector('.battle-status');if(statesOpen&&currentStatus)currentStatus.dataset.statesOpen='true';if(status.contains(focused)&&currentStatus)currentStatus.dataset.statesFocus='true';}
      if(oldControls&&oldControls.children.length===controls.children.length){
        [...oldControls.children].forEach((button,index)=>{
          const nextButton=controls.children[index];
          button.textContent=nextButton.textContent;button.disabled=nextButton.disabled;button.onclick=nextButton.onclick;
          if(nextButton.hasAttribute('aria-expanded'))button.setAttribute('aria-expanded',nextButton.getAttribute('aria-expanded'));
        });
        oldHud.append(oldControls);
        if(oldControls.contains(focused)&&!focused.disabled)focused.focus({preventScroll:true});
      }else oldHud.append(controls);
    }else card.prepend(hud);
    const hp=card.querySelector('.hp');hp?.setAttribute('role','progressbar');hp?.setAttribute('aria-label',`${label}のHP`);
    hp?.setAttribute('aria-valuemin','0');hp?.setAttribute('aria-valuemax',String(entry.maxHp));hp?.setAttribute('aria-valuenow',String(Math.max(0,entry.hp)));
  }
  const ids=new Set(multiBattle.enemies.map(e=>`${e.id}Card`));
  for(const child of [...grid.children])if(!ids.has(child.id))child.remove();
  syncSingleBattleStage();
}
function clearBattleStageAction(){
  document.querySelectorAll('[data-stage-action]').forEach(el=>{el.removeAttribute('data-stage-action');el.classList.remove('is-stage-actor','is-stage-target');});
}
function showBattleStageAction(sourceId,targetId){
  clearBattleStageAction();
  if(!battleFeedback.action)return;
  const sourceName=battleStageName(sourceId),targetName=battleStageName(targetId);
  if(!sourceName||!targetName)return;
  // The skill renderer receives the resolved target, including enemy -> enemy.
  const move=battleFeedback.action.match(/「.*」/)?.[0]||'';
  battleFeedback.action=`${sourceName} ${move} → ${targetName}`;
  if(!multiBattle?.active)battleHistoryEntry(battleFeedback.action,'target');
  for(const [id,kind,text] of [[sourceId,'actor','行動中'],[targetId,'target','対象']]){
    const visual=document.getElementById(id),slot=visual?.closest('.battle-stage-slot');
    if(slot){slot.classList.add(`is-stage-${kind}`);slot.dataset.stageAction=slot.dataset.stageAction?`${slot.dataset.stageAction}・${text}`:text;}
  }
  renderBattleInputState();
}

function syncBattleStageInput(processing){
  const grid=document.getElementById('multiEnemyGrid');
  if(grid){
    grid.inert=processing;
    for(const card of grid.children){
      const entry=multiBattle?.enemies?.find(e=>`${e.id}Card`===card.id);
      for(const button of card.querySelectorAll('.battle-enemy-controls button'))button.disabled=processing||(button.textContent!=='詳細'&&(!entry?.alive||entry.hp<=0));
    }
  }
}
