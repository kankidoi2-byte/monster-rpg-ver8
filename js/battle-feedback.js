/* Transient battle presentation only. Never serialized into player saves. */
const battleFeedback={history:[],lastLog:'',action:'',finished:false,hp:new Map(),states:new Map(),results:new Map(),sequence:0};
const BATTLE_HISTORY_LIMIT=240;
function battlePlainText(html){
  const box=document.createElement('div');
  box.innerHTML=String(html||'').replace(/<br\s*\/?>/gi,'\n');
  return (box.textContent||'').trim();
}
function battleHistoryEntry(text,kind='result'){
  if(!text)return;
  const turn=Math.max(battleFeedback.history.at(-1)?.turn||0,battleTurnCount+(battleTurnInProgress?1:0));
  battleFeedback.history.push({turn,kind,text:String(text).slice(0,4000)});
  if(battleFeedback.history.length>BATTLE_HISTORY_LIMIT)battleFeedback.history.shift();
  const list=document.getElementById('battleHistory');
  if(list){
    const row=document.createElement('li');row.textContent=`${turn?`T${turn}`:'開始'} · ${text}`;list.appendChild(row);
    while(list.children.length>BATTLE_HISTORY_LIMIT)list.firstElementChild.remove();
  }
  const count=document.getElementById('battleHistoryCount');if(count)count.textContent=`${battleFeedback.history.length}件（最新${BATTLE_HISTORY_LIMIT}件まで）`;
}
function captureBattleLog(){
  const log=document.getElementById('log');if(!log)return;
  const html=log.innerHTML;
  if(html===battleFeedback.lastLog)return;
  const added=battleFeedback.lastLog&&html.startsWith(battleFeedback.lastLog)?html.slice(battleFeedback.lastLog.length):html;
  battleFeedback.lastLog=html;
  battleHistoryEntry(battlePlainText(added));
  // Legacy append sites only keep their current message; history owns prior text.
  if(html.length>8000){log.innerHTML=added;battleFeedback.lastLog=log.innerHTML;}
  const message=battlePlainText(added);
  if(busy&&/動けない|眠っていて|自分を攻撃|自分に/.test(message))battleFeedback.action=message.split('\n')[0];
  refreshBattleFeedback(message);
}
function resetBattleFeedback(){
  battleFeedback.history=[];battleFeedback.lastLog='';battleFeedback.action='';battleFeedback.finished=false;
  battleFeedback.hp.clear();battleFeedback.states.clear();battleFeedback.results.clear();battleFeedback.sequence++;
  const log=document.getElementById('log');if(log)log.innerHTML='';
  const history=document.getElementById('battleHistory');if(history)history.replaceChildren();
  const count=document.getElementById('battleHistoryCount');if(count)count.textContent='0件';
  document.querySelectorAll('.battle-hp-result').forEach(el=>el.remove());
}
function beginBattleAction(actor,move,isPlayer){
  battleFeedback.results.clear();document.querySelectorAll('.battle-hp-result').forEach(el=>el.remove());
  const log=document.getElementById('log');if(log)log.innerHTML='';battleFeedback.lastLog='';
  battleFeedback.action=`${isPlayer?'味方':'敵'}・${actor.name}の「${move[0]}」`;
  battleHistoryEntry(battleFeedback.action,'action');
  renderBattleInputState();
}
function renderBattleInputState(){
  const screen=document.getElementById('battle');if(!screen)return;
  const finished=battleFeedback.finished||screen.classList.contains('is-finished');
  const processing=busy||finished;
  screen.classList.toggle('is-processing',processing);
  const dock=screen.querySelector('.battle-command-dock');
  if(dock){dock.inert=processing;dock.setAttribute('aria-busy',String(busy&&!finished));}
  const label=document.getElementById('battleInputLabel');if(label)label.textContent=finished?'戦闘終了':busy?'行動中':'操作可能';
  const title=document.getElementById('battleCommandTitle');
  const selecting=!document.getElementById('commands')?.classList.contains('hidden');
  const target=multiBattle?.active&&multiBattle.pendingMoveIndex!==null;
  const text=finished?'戦闘終了・履歴を確認できます':busy?(battleFeedback.action||'行動を処理しています'):target?'対象を選んでください':selecting?'技を選んでください':'コマンドを選んでください';
  if(title)title.textContent=text;
  const status=document.getElementById('battleActionStatus');if(status)status.textContent=text;
  if(!busy)battleFeedback.action='';
}
function battleCombatants(){
  if(!player||!enemy)return [];
  const units=[{key:`player:${activeInstance?.uid||activePartyIdx}`,vis:'pVis',name:player.name,hp:pHp,max:playerMaxHp(),statusId:'pBattleStatus',status:pStatus,poison:pPoisonTurns,paralysis:pParalysisTurns,sleep:pSleepTurns,confusion:pConfusionTurns,guard:pGuard,shield:pAquaShield,charge:pFlareCharge,attack:pAtk,link:typeof kokoroLinkStatusHtml==='function'?kokoroLinkStatusHtml():''}];
  if(multiBattle?.active){for(const e of multiBattle.enemies)units.push({key:e.id,vis:`${e.id}Vis`,name:e.mon.name,hp:e.hp,max:e.maxHp,statusId:`${e.id}Status`,status:e.status,poison:e.poisonTurns,paralysis:e.paralysisTurns,sleep:e.sleepTurns,confusion:e.confusionTurns,guard:e.guard,shield:e.aquaShield,charge:e.flareCharge,attack:e.attack,link:enemyKokoroLinkStatusHtml(e.id)});}
  else units.push({key:`single:${enemy.id}`,vis:'eVis',name:enemy.name,hp:eHp,max:enemyMaxHp(),statusId:'eBattleStatus',status:eStatus,poison:ePoisonTurns,paralysis:eParalysisTurns,sleep:eSleepTurns,confusion:eConfusionTurns,guard:eGuard,shield:eAquaShield,charge:eFlareCharge,attack:eAtk,link:enemyKokoroLinkStatusHtml(singleEnemyKokoroLinkKey())});
  return units;
}
function battleStateLabels(u){
  if(u.hp<=0)return ['戦闘不能'];
  const labels=[];
  if(u.status==='poison'&&u.poison>0)labels.push(`☠ 毒 ${u.poison}T`);
  if(u.paralysis>0)labels.push(`⚡ 麻痺 ${u.paralysis}T`);
  if(u.sleep>0)labels.push(`眠り ${u.sleep}T`);
  if(u.confusion>0)labels.push(`混乱 ${u.confusion}T`);
  if(u.guard)labels.push('防御 次の被弾');
  if(u.shield)labels.push('水の盾 次の被弾');
  if(u.charge)labels.push('溜め 次の攻撃+20%');
  if(u.attack!==1)labels.push(`攻撃 ×${Number(u.attack.toFixed(2))}`);
  const link=battlePlainText(u.link).replace(/^\s*\/\s*/,'');if(link)labels.push(link);
  return labels;
}
function battleHpResult(vis,before,after,{label='HP',damage=null,barrier=0,reduced=0,effectiveness=1,types='normal',power=0,impact=false}={}){
  const u=battleCombatants().find(u=>u.vis===vis);if(!u)return;
  const loss=Math.max(0,before)-Math.max(0,after),amount=Math.abs(loss);
  const over=damage===null?0:Math.max(0,damage-Math.max(0,before));
  const text=`${label} ${loss<0||/回復|吸収|再生/.test(label)?'+':'−'}${amount}${reduced?` / 軽減 ${reduced}`:''}${barrier?` / 障壁 ${barrier}`:''}${over?` / 超過 ${over}`:''}`;
  battleFeedback.hp.set(u.key,Math.max(0,after));
  battleHistoryEntry(`${u.name}：${text}（HP ${Math.max(0,before)} → ${Math.max(0,after)}）`,'hp');
  if(impact&&typeof playBattleImpact==='function')playBattleImpact(vis,amount,effectiveness,types,power);
  const queue=battleFeedback.results.get(u.key)||[];queue.push(text);if(queue.length>3)queue.shift();battleFeedback.results.set(u.key,queue);
  renderBattleHpResults(u,queue);
}
function renderBattleHpResults(u,queue){
  const target=document.getElementById(u.vis);if(!target)return;
  const host=target.closest('.battle-combatant,.multi-enemy-card');if(!host)return;
  let result=host.querySelector('.battle-hp-result');
  if(!result){result=document.createElement('div');result.className='battle-hp-result';host.appendChild(result);}
  const text=queue.join(' ／ ');if(result.textContent!==text){result.textContent=text;result.classList.remove('is-new-result');void result.offsetWidth;result.classList.add('is-new-result');}
}
function refreshBattleFeedback(message=''){
  for(const u of battleCombatants()){
    const before=battleFeedback.hp.get(u.key),hp=Math.max(0,u.hp);
    if(before!==undefined&&hp!==before){
      const label=hp>before?(/吸収/.test(message)?'吸収':'回復'):/反動/.test(message)?'反動':/毒|状態異常/.test(message)?'継続':/こんらん/.test(message)?'混乱':'HP';
      battleHpResult(u.vis,before,hp,{label});
    }else battleFeedback.hp.set(u.key,hp);
    const labels=battleStateLabels(u),state=labels.join('・');
    const prior=battleFeedback.states.get(u.key);
    if(prior!==undefined&&prior!==state)battleHistoryEntry(`${u.name}：${state||'状態正常（効果解除）'}`,'status');
    battleFeedback.states.set(u.key,state);
    const el=document.getElementById(u.statusId);
    if(el){el.classList.toggle('is-normal',labels.length===0);el.replaceChildren();for(const label of labels.length?labels:['状態正常']){const chip=document.createElement('span');chip.textContent=label;el.appendChild(chip);}}
    const queue=battleFeedback.results.get(u.key);if(queue)renderBattleHpResults(u,queue);
  }
  renderBattleInputState();
}
// Patch only changed nodes. Keep combatant visual and HP-bar identities across updates.
function reconcileBattleNode(node,next){
  if(node.nodeType!==next.nodeType||node.nodeName!==next.nodeName){node.replaceWith(next);return;}
  if(node.nodeType===3){if(node.nodeValue!==next.nodeValue)node.nodeValue=next.nodeValue;return;}
  if(node.nodeType!==1)return;
  for(const attr of [...node.attributes])if(!next.hasAttribute(attr.name))node.removeAttribute(attr.name);
  for(const attr of [...next.attributes])if(node.getAttribute(attr.name)!==attr.value)node.setAttribute(attr.name,attr.value);
  const children=[...node.childNodes],incoming=[...next.childNodes];
  incoming.forEach((child,i)=>children[i]?reconcileBattleNode(children[i],child):node.appendChild(child));
  children.slice(incoming.length).forEach(child=>child.remove());
}
function renderMultiBattleCards(html){
  const grid=document.getElementById('multiEnemyGrid');if(!grid)return;
  const template=document.createElement('div');template.innerHTML=html;
  for(const next of [...template.children]){
    const old=document.getElementById(next.id);
    if(old&&old.parentElement===grid){
      // Feedback lives outside the generated card. Temporarily detach it during patching.
      const result=old.querySelector('.battle-hp-result');if(result)result.remove();
      reconcileBattleNode(old,next);if(result)old.appendChild(result);
    }else grid.appendChild(next);
  }
  const ids=new Set(multiBattle.enemies.map(e=>`${e.id}Card`));
  [...grid.children].forEach(node=>{if(!ids.has(node.id))node.remove();});
}
function forgetBattleEnemyFeedback(){
  document.getElementById('singleEnemyBox')?.querySelector('.battle-hp-result')?.remove();
  for(const map of [battleFeedback.hp,battleFeedback.states,battleFeedback.results])for(const key of map.keys())if(key.startsWith('single:'))map.delete(key);
  battleFeedback.action='';
}
