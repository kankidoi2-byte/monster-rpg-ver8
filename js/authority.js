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
function renderAuthority(){
  const root=document.getElementById('authoritySection');if(!root)return;
  root.hidden=!authorityUnlocked();
  if(root.hidden){document.getElementById('authorityBoard').innerHTML='';return;}
  const state=authorityState();
  document.getElementById('authorityBoard').innerHTML=AUTHORITY_DATA.nodes.map(node=>{
    const open=authorityNodeOpen(node,state),center=node.id==='0';
    const angle=(Number(node.id)-1)*2*Math.PI/7-Math.PI/2;
    const x=center?50:50+37*Math.cos(angle),y=center?50:50+37*Math.sin(angle);
    return `<div class="authority-node ${center?'authority-center':''} ${open?'is-open':'is-locked'}" style="--x:${x}%;--y:${y}%" role="listitem" aria-label="${center?'0':node.chapter+'章のマス'}：${open?'開放済み':'未開放'}"><b>${node.id}</b><span>${open?'開放済み':'未開放'}</span></div>`;
  }).join('');
  const locked=AUTHORITY_DATA.nodes.filter(n=>n.chapter!==null&&!authorityNodeOpen(n,state)).length;
  document.getElementById('authorityNote').textContent='通常の戦闘・ストーリーで常時有効。'+(locked===7?'七つの章のマスは、現在すべて未開放です。':locked+'個の章のマスが未開放です。');
  const zero=AUTHORITY_DATA.nodes.find(n=>n.id==='0');
  const hp=zero.effects.find(e=>e.stat==='maxHp');
  document.getElementById('authorityEffect').textContent=hp?`0の権能：味方の最大HP +${hp.percent}%${zero.provisional?'（仮の効果・仮の数値）':''}`:'0の権能：効果未定';
}
