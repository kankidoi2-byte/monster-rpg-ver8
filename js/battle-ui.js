/* Phase3C: transient panel navigation. Combat and save state stay in their owners. */
const battleUi={panel:null,origin:'battleSkillButton',itemReturn:false,scrollY:0,awaitingReturn:false};
function battleUiEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function battleUiCanAct(){return !busy&&!battleFeedback.finished&&!multiBattle?.finished&&!document.getElementById('battle')?.classList.contains('is-finished');}
function battleUiRemember(id){battleUi.origin=id;battleUi.scrollY=window.scrollY;}
function battleUiFocus(node){if(!node||node.disabled)return;node.focus({preventScroll:true});if(!node.closest('#battle.is-battle-stage'))node.scrollIntoView?.({block:'nearest',behavior:'instant'});}
let battleSwitchMode=null,battleSwitchWatcher=null,battleSwitchCardsMarkup='';
function battleSwitchCanAct(){
  return document.getElementById('battle')?.classList.contains('active')&&battleUiCanAct()&&
    (typeof renewalCanAct!=='function'||renewalCanAct());
}
function battleSwitchCanSelect(mode,index){
  return battleSwitchMode===mode&&battleSwitchCanAct()&&livingPartySwitchCandidates().some(candidate=>candidate.index===index);
}
function refreshBattleSwitchTutorialTarget(){
  if(typeof tutorialUiState==='undefined'||!tutorialUiState.active||tutorialCurrentStepId()!=='battle_actor_select')return;
  const target=document.querySelector('#battleSwitchCards [data-tutorial-actor-select]')||document.getElementById('battleSwitchButton');
  if(tutorialUiState.target!==target){
    clearTutorialTarget();
    tutorialUiState.target=target;
    target?.classList.add('tutorial-target-active');
  }
  scheduleTutorialPosition();
}
function showBattleSwitchSheet(mode){
  const layer=document.getElementById('battleSwitchLayer');
  if(!layer)return false;
  battleSwitchMode=mode;
  layer.classList.remove('hidden');
  if(!battleSwitchWatcher&&typeof CloseWatcher==='function'){
    battleSwitchWatcher=new CloseWatcher();
    battleSwitchWatcher.addEventListener('close',()=>cancelBattleSwitchPicker());
  }
  syncBattleUi();
  if(mode==='manual'){
    refreshBattleSwitchTutorialTarget();
    document.getElementById('battleSwitchSheet')?.addEventListener('animationend',refreshBattleSwitchTutorialTarget,{once:true});
  }
  return true;
}
function clearBattleSwitchSheet(){
  const layer=document.getElementById('battleSwitchLayer'),cards=document.getElementById('battleSwitchCards');
  const wasManual=battleSwitchMode==='manual';
  document.getElementById('battleSwitchSheet')?.removeEventListener('animationend',refreshBattleSwitchTutorialTarget);
  if(layer?.contains(document.activeElement))document.activeElement.blur();
  if(cards)cards.textContent='';
  battleSwitchCardsMarkup='';
  layer?.classList.add('hidden');
  battleSwitchWatcher?.destroy();
  battleSwitchWatcher=null;battleSwitchMode=null;
  document.getElementById('battleSwitchButton')?.setAttribute('aria-expanded','false');
  if(wasManual)refreshBattleSwitchTutorialTarget();
}
function renderBattleSwitchSheet(){
  const cards=document.getElementById('battleSwitchCards');
  if(!cards||!battleSwitchMode)return;
  const manual=battleSwitchMode==='manual',canAct=battleSwitchCanAct();
  const html=partyBattle.map((entry,index)=>{
    const active=index===activePartyIdx,hp=Math.max(0,active?pHp:entry.hp);
    const max=instanceMaxHp(entry.inst),down=entry.fainted||hp<=0;
    const img=IMG[entry.mon.imgKey],esc=battleUiEscape;
    const types=normalizeMoveTypes(entry.mon.types).map(t=>`<span class="br-switch-type" data-type="${esc(t)}">${esc(TN[t]||t)}</span>`).join('');
    const disabled=!canAct||active||down;
    return `<button type="button" class="br-switch-card${active?' active':''}${down?' down':''}" data-switch-index="${index}" ${disabled?'disabled':manual?'data-tutorial-actor-select':''} onclick="${manual?'selectBattleSwitchTarget':'selectKokoroLinkFreeSwitch'}(${index})">${active?'<span class="br-switch-now">出撃中</span>':''}${img?`<img src="${esc(img)}" alt="">`:'<span class="br-switch-thumb" aria-hidden="true"></span>'}<span class="br-switch-main"><b>${esc(entry.mon.name)}</b><small>Lv.${entry.inst.level} ${types}</small><span class="br-switch-hpbar" aria-hidden="true"><i style="width:${max>0?Math.min(100,hp/max*100):0}%"></i></span></span><span class="br-switch-hp">${hp}<small>/ ${max}</small></span></button>`;
  }).join('');
  if(battleSwitchCardsMarkup!==html){
    battleSwitchCardsMarkup=html;
    const focused=cards.contains(document.activeElement)?document.activeElement.dataset.switchIndex:null;
    cards.innerHTML=html;
    if(manual)refreshBattleSwitchTutorialTarget();
    if(focused!==null){
      const el=cards.querySelector(`[data-switch-index="${focused}"]:not(:disabled)`);
      battleUiFocus(el||document.querySelector('#battleSwitchSheet .br-switch-back'));
    }
  }
}
function battleUiClear(){
  for(const id of ['commands','kokoroLinkPanel','multiTargetSelect']){
    const panel=document.getElementById(id);
    if(panel?.contains(document.activeElement)){document.activeElement.blur();if(busy)battleUi.awaitingReturn=true;}
    panel?.classList.add('hidden');
  }
  clearBattleSwitchSheet();
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
  const enemyLabel=multiBattle?.active?'選択した敵1体':'敵1体';
  if(move?.[3]==='tactical'){
    const profile=tacticalSkillProfile(move)||{};
    const self=profile.heal||profile.cleanse?.length||profile.buff||profile.guard||profile.charge||profile.drain;
    const opponent=Number(move[1])>0||profile.debuff||profile.dispel||profile.status;
    return self?(opponent?`自分と${enemyLabel}`:'自分'):enemyLabel;
  }
  if(move?.[3]==='buff'&&Number(move[1])>0)return `自分と${enemyLabel}`;
  return ['guard','heal','buff','aqua_shield'].includes(move?.[3])?'自分':enemyLabel;
}
function battleUiSkillInfo(move){
  const card=String(move?.[8]||'').startsWith('s110_')?SKILL_BY_ID[move[8]]:null;
  const numeric=card?.detailedDesc?`<br><span class="battle-choice-numbers">${battleUiEscape(card.detailedDesc)}</span>`:'';
  return `<small class="battle-choice-detail">対象：${battleUiMoveTarget(move)}<br>${battleUiEscape(moveEffectText(move))}${numeric}</small>`;
}
function syncBattleUi(){
  const screen=document.getElementById('battle');if(!screen||screen.classList.contains('is-prologue-contract-choice'))return;
  if(typeof autoSyncBattle==='function')autoSyncBattle();
  const active=screen.classList.contains('active');
  const processing=busy||battleFeedback.finished||screen.classList.contains('is-finished');
  if(battleFeedback.finished||screen.classList.contains('is-finished'))battleUiClear();
  if(battleSwitchMode&&!battleSwitchCanAct()){
    if(battleSwitchMode==='free-switch')pendingKokoroLinkTacticsMode=null;
    clearBattleSwitchSheet();
  }
  const panel=['battleSwitchLayer','multiTargetSelect','kokoroLinkPanel','commands'].map(id=>document.getElementById(id)).find(el=>el&&!el.classList.contains('hidden'));
  const switchOpen=panel?.id==='battleSwitchLayer';
  const pad=screen.querySelector('.battle-command-pad');if(pad)pad.hidden=!!panel&&!switchOpen;
  document.getElementById('battleSwitchButton')?.setAttribute('aria-expanded',String(switchOpen));
  document.getElementById('kokoroLinkButton')?.setAttribute('aria-expanded',String(panel?.id==='kokoroLinkPanel'));
  document.getElementById('battleSkillButton')?.setAttribute('aria-expanded',String(panel?.id==='commands'));
  if(switchOpen)renderBattleSwitchSheet();
  else if(panel){
    if(typeof prepareBattleFloatingPanel==='function')prepareBattleFloatingPanel(panel);
    const enemyTarget=panel.classList.contains('is-enemy-target');
    if(enemyTarget){
      document.getElementById('battleActionStatus').textContent='攻撃する敵をタップ';document.getElementById('battleInputLabel').textContent='対象を選択';
    }
    panel.setAttribute('role','region');
    if(!panel.querySelector('[data-battle-panel-back]')){
      const back=document.createElement('button');back.type='button';back.dataset.battlePanelBack='';back.className='battle-panel-back';back.textContent=enemyTarget?'← 技に戻る':'← 戻る';back.onclick=battleUiBack;panel.prepend(back);
    }
    const back=panel.querySelector('[data-battle-panel-back]');if(back)back.textContent=enemyTarget?'‹ 技に戻る':'‹ 戻る';
  }
  const changed=battleUi.panel!==panel?.id;
  if(active&&processing&&battleUi.awaitingReturn){const status=document.getElementById('battleActionStatus');status?.setAttribute('tabindex','-1');status?.focus({preventScroll:true});}
  if(active&&!processing&&battleUi.awaitingReturn){battleUi.awaitingReturn=false;battleUiFocus(document.getElementById(battleUi.origin));}
  if(active&&changed&&!processing){
    if(panel)battleUiFocus(panel.querySelector('[data-battle-panel-back]'));
    else if(battleUi.panel)battleUiFocus(document.getElementById(battleUi.origin));
  }
  battleUi.panel=panel?.id||null;
  if(typeof renewalRender==='function')renewalRender();
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
  if(!labels.length)return;
  const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('div');
  details.className='battle-state-details';details.open=open;
  const short=label=>label.replace(/次の被弾/g,'次回').replace(/防御/g,'防').replace(/攻撃/g,'攻').replace(/素早さ/g,'速');
  summary.textContent=labels.slice(0,2).map(short).join('・')+(labels.length>2?` ＋${labels.length-2}`:'');
  summary.setAttribute('aria-label',`${battleStageName(u.vis)}の状態の詳細`);
  list.setAttribute('aria-label',`${battleStageName(u.vis)}の全状態`);
  for(const label of labels){const row=document.createElement('p');row.textContent=label;list.append(row);}
  details.append(summary,list);el.append(details);
  if(hadFocus)summary.focus({preventScroll:true});
}
document.addEventListener('keydown',event=>{
  if(battleSwitchMode&&event.key==='Tab'&&!document.querySelector('.tutorial-overlay:not(.hidden)')){
    const buttons=[...document.querySelectorAll('#battleSwitchSheet button:not(:disabled)')];
    if(buttons.length){const i=buttons.indexOf(document.activeElement);event.preventDefault();battleUiFocus(buttons[i<0?(event.shiftKey?buttons.length-1:0):(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length]);}
    return;
  }
  if(event.key!=='Escape'||!battleUiCanAct())return;
  if(!document.getElementById('tutorialOverlay')?.classList.contains('hidden')&&document.querySelector('.tutorial-overlay:not(.hidden)'))return;
  if(document.getElementById('battleItemSelect')?.classList.contains('active')){event.preventDefault();show('battle');}
  else if(document.getElementById('battle')?.classList.contains('active')&&battleUi.panel){event.preventDefault();battleUiBack();}
});
