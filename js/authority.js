/* Permanent numeric bonuses only: separate from G-BLESS and feature gates. */
function authorityState(payload=save){return normalizeAuthoritySave(payload?.authority,payload);}
function authorityUnlocked(){return authorityState().unlocked;}
function authorityNodeOpen(node,state=authorityState()){
  return state.unlocked && node.implemented===true && (node.chapter===null || state.clearedChapters.includes(node.chapter));
}
function authorityContext(){
  const request=typeof activeHuntRequest==='undefined'?null:activeHuntRequest;
  return {difficultyId:request?.difficultyId||'d2'};
}
function authorityNumericMultiplier(stat,context=authorityContext()){
  // false is an explicit opt-out for non-battle simulations (e.g. expeditions).
  if(context===false||!authorityUnlocked())return 1;
  const id=context?.difficultyId||'d2';
  const difficulty=({easy:'d1',normal:'d2',hard:'d4'})[id]||id;
  if(AUTHORITY_DATA.enabledByDifficulty[difficulty]===false)return 1;
  const state=authorityState();let percent=0;
  for(const node of AUTHORITY_DATA.nodes){
    if(!authorityNodeOpen(node,state))continue;
    for(const effect of node.effects){
      if(effect.stat===stat&&typeof effect.percent==='number'&&Number.isFinite(effect.percent))percent+=effect.percent;
    }
  }
  return Math.max(.01,1+percent/100);
}
// Party preparation can precede difficulty selection. Rebase HP proportionally
// once the real request is selected, without reviving or healing injured allies.
function applyAuthorityBattleContext(){
  for(const entry of partyBattle){
    const next=instanceMaxHp(entry.inst);
    const previous=entry.authorityMaxHp||next;
    if(entry.hp>0&&!entry.fainted)entry.hp=Math.max(1,Math.min(next,Math.round(entry.hp*next/previous)));
    else entry.hp=0;
    entry.authorityMaxHp=next;
  }
}
// Future chapter-clear transaction hook. No chapter currently opts in.
// Call within the same existing save transaction that records the chapter clear.
// This mutates only the provided payload and performs no storage write/reward grant.
function recordAuthorityChapterClear(chapter,payload=save){
  const node=AUTHORITY_DATA.nodes.find(n=>n.chapter===chapter&&n.implemented===true);
  const state=authorityState(payload);
  if(!node||!state.unlocked)return false;
  if(!state.clearedChapters.includes(chapter))state.clearedChapters.push(chapter);
  payload.authority=normalizeAuthoritySave(state,payload);
  return true;
}
function showAuthorityName(){
  if(!authorityUnlocked())return;
  const label=document.getElementById('authorityEffect');
  if(label){label.textContent='0の権能';label.hidden=false;}
}
function renderAuthority(){
  const root=document.getElementById('authoritySection');if(!root)return;
  const board=document.getElementById('authorityBoard');
  const label=document.getElementById('authorityEffect');
  if(label){label.textContent='';label.hidden=true;}
  root.hidden=!authorityUnlocked();
  if(root.hidden){if(board)board.innerHTML='';return;}
  if(board)board.innerHTML='<div role="listitem" class="authority-node authority-center is-open" style="--x:50%;--y:50%"><button type="button" onclick="showAuthorityName()" aria-label="0の権能"><b>0</b></button></div>';
}
