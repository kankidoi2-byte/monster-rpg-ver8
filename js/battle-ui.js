/* Phase3C: transient panel navigation. Combat and save state stay in their owners. */
const battleUi={panel:null,origin:'battleSkillButton',itemReturn:false,scrollY:0,awaitingReturn:false};
function battleUiEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function battleUiCanAct(){return !busy&&!battleFeedback.finished&&!multiBattle?.finished&&!document.getElementById('battle')?.classList.contains('is-finished');}
function battleUiRemember(id){battleUi.origin=id;battleUi.scrollY=window.scrollY;}
function battleUiFocus(node){if(!node||node.disabled)return;node.focus({preventScroll:true});node.scrollIntoView?.({block:'nearest',behavior:'instant'});}
function battleUiClear(){
  for(const id of ['commands','kokoroLinkPanel','multiTargetSelect']){
    const panel=document.getElementById(id);
    if(panel?.contains(document.activeElement)){document.activeElement.blur();if(busy)battleUi.awaitingReturn=true;}
    panel?.classList.add('hidden');
  }
  if(multiBattle)multiBattle.pendingMoveIndex=null;
  pendingKokoroLinkStatusSourceUid=null;pendingKokoroLinkTacticsMode=null;
  const skillButton=document.getElementById('battleSkillButton');
  skillButton?.setAttribute('aria-expanded','false');
  if(skillButton)skillButton.innerHTML='<span aria-hidden="true">✨</span><strong>技</strong><small>決定</small>';
}
function battleUiBack(){
  if(!battleUiCanAct())return;
  if(pendingKokoroLinkStatusSourceUid||pendingKokoroLinkTacticsMode){
    battleUiClear();renderKokoroLinkPanel();document.getElementById('kokoroLinkPanel')?.classList.remove('hidden');
  }else if(multiBattle?.pendingMoveIndex!==null&&multiBattle?.pendingMoveIndex!==undefined){
    cancelMultiBattleTarget();renderSkillButtons();document.getElementById('commands')?.classList.remove('hidden');
  }else {battleUiClear();closeBattleSkillPanel();}
  renderBattleInputState();
}
function battleUiMoveTarget(move){
  // Matches the support branches in doAttack / performMultiAttack.
  return ['guard','heal','buff','aqua_shield'].includes(move?.[3])?'自分':multiBattle?.active?'選択した敵1体':'敵1体';
}
function battleUiSkillInfo(move){return `<small class="battle-choice-detail">対象：${battleUiMoveTarget(move)}<br>${battleUiEscape(moveEffectText(move))}</small>`;}
function syncBattleUi(){
  const screen=document.getElementById('battle');if(!screen)return;
  const active=screen.classList.contains('active');
  const processing=busy||battleFeedback.finished||screen.classList.contains('is-finished');
  if(battleFeedback.finished||screen.classList.contains('is-finished'))battleUiClear();
  const panel=['multiTargetSelect','kokoroLinkPanel','commands'].map(id=>document.getElementById(id)).find(el=>el&&!el.classList.contains('hidden'));
  const pad=screen.querySelector('.battle-command-pad');if(pad)pad.hidden=!!panel;
  document.getElementById('kokoroLinkButton')?.setAttribute('aria-expanded',String(panel?.id==='kokoroLinkPanel'));
  document.getElementById('battleSkillButton')?.setAttribute('aria-expanded',String(panel?.id==='commands'));
  if(panel){
    if(panel.id==='multiTargetSelect'){
      const note=panel.querySelector('p')?.textContent;
      if(note){document.getElementById('battleActionStatus').textContent=note;document.getElementById('battleInputLabel').textContent='対象を選択';}
    }
    panel.setAttribute('role','region');
    if(!panel.querySelector('[data-battle-panel-back]')){
      const back=document.createElement('button');back.type='button';back.dataset.battlePanelBack='';back.className='battle-panel-back';back.textContent='← 戻る';back.onclick=battleUiBack;panel.prepend(back);
    }
  }
  const changed=battleUi.panel!==panel?.id;
  if(active&&processing&&battleUi.awaitingReturn){const status=document.getElementById('battleActionStatus');status?.setAttribute('tabindex','-1');status?.focus({preventScroll:true});}
  if(active&&!processing&&battleUi.awaitingReturn){battleUi.awaitingReturn=false;battleUiFocus(document.getElementById(battleUi.origin));}
  if(active&&changed&&!processing){
    if(panel)battleUiFocus(panel.querySelector('[data-battle-panel-back]'));
    else if(battleUi.panel)battleUiFocus(document.getElementById(battleUi.origin));
  }
  battleUi.panel=panel?.id||null;
}
function battleUiScreenChanged(id){
  if(id==='battleItemSelect'){
    battleUi.itemReturn=true;battleUiClear();battleUi.panel=null;
    battleUiFocus(document.getElementById('battleItemBack'));
  }else if(id==='battle'){
    syncBattleUi();
    if(battleUi.itemReturn){battleUi.itemReturn=false;update();battleUiFocus(document.getElementById('battleItemButton'));}
  }else {battleUiClear();battleUi.panel=null;battleUi.itemReturn=false;}
}
function renderBattleStateSummary(el,labels,u){
  const open=el.querySelector('details')?.open||el.dataset.statesOpen==='true';
  delete el.dataset.statesOpen;
  const hadFocus=el.contains(document.activeElement)||el.dataset.statesFocus==='true';
  delete el.dataset.statesFocus;
  el.replaceChildren();
  for(const label of labels.length?labels.slice(0,2):['状態正常']){const chip=document.createElement('span');chip.textContent=label;el.append(chip);}
  if(labels.length>2){
    const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('div');
    details.className='battle-state-details';details.open=open;
    summary.textContent=`他${labels.length-2}件・全状態を見る`;
    list.setAttribute('aria-label',`${battleStageName(u.vis)}の全状態`);
    for(const label of labels){const row=document.createElement('p');row.textContent=label;list.append(row);}
    details.append(summary,list);el.append(details);
    if(hadFocus)summary.focus({preventScroll:true});
  }
}
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||!battleUiCanAct())return;
  if(!document.getElementById('tutorialOverlay')?.classList.contains('hidden')&&document.querySelector('.tutorial-overlay:not(.hidden)'))return;
  if(document.getElementById('battleItemSelect')?.classList.contains('active')){event.preventDefault();show('battle');}
  else if(document.getElementById('battle')?.classList.contains('active')&&battleUi.panel){event.preventDefault();battleUiBack();}
});
