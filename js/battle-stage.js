/* Phase 3A: presentation only. No battle state or save fields are owned here. */
function syncSingleBattleStage(){
  const screen=document.getElementById('battle');
  const arena=screen?.querySelector('.battle-arena');
  if(!arena)return;
  const single=!multiBattle?.active&&!screen.classList.contains('is-multi-battle');
  screen.classList.toggle('is-single-stage',single);
  // Resolve the existing map image relative to the document, not the CSS file.
  const mapImage=screen.querySelector('#battleMapBanner .map-img');
  if(single&&mapImage)arena.style.backgroundImage=`url("${mapImage.src}")`;
  else arena.style.removeProperty('background-image');
  if(!single)document.getElementById('battleStageResults')?.replaceChildren();
  const enemyBox=document.getElementById('singleEnemyBox');
  if(single&&enemyBox&&arena.firstElementChild!==enemyBox)arena.prepend(enemyBox);
  for(const [prefix,boxId] of [['e','singleEnemyBox'],['p','singlePlayerBox']]){
    const box=document.getElementById(boxId),visual=document.getElementById(`${prefix}Vis`);
    if(!box||!visual)return;
    let slot=document.getElementById(`${prefix}BattleSlot`);
    if(!single){
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
  if(single){
    if(history&&screen.lastElementChild!==history)screen.appendChild(history);
    const order=['kokoroLinkButton','battleSkillButton','battleItemButton','battleSwitchButton','battleEscapeButton'];
    if(pad&&pad.firstElementChild?.id!==order[0])for(const id of order)pad.appendChild(document.getElementById(id));
  }else{
    if(history)screen.insertBefore(history,document.getElementById('log'));
    if(pad&&pad.firstElementChild?.id!=='battleSwitchButton')pad.prepend(document.getElementById('battleSwitchButton'));
  }
  if(dock)dock.dataset.stage=single?'single':'legacy';
}
