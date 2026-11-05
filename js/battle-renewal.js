/* Adopted battle UI v4. Only ephemeral selections and presentation live here.
   Save writes, damage, rewards, contract rolls and AUTO decisions remain owned
   by the existing engines. No persisted fields or IDs are introduced. */
const renewal={targetId:null,itemId:null,itemTarget:null,linkUid:null,linkReady:false,linkPending:false,contractBusy:false,focus:null,epoch:0,bannerTimer:null,turns:0,result:null};
const renewalEl=id=>document.getElementById(id);
const renewalHtml=escapeGameHtml;
function renewalMarkup(id,html){const el=renewalEl(id);if(el&&el.innerHTML!==html)el.innerHTML=html;}
function renewalAuto(){return autoRun?.phase==='fight'&&!autoRun.manual;}
function renewalCanAct(){return renewalEl('battle')?.classList.contains('active')&&battleUiCanAct()&&!renewalAuto()&&!renewal.linkPending;}
function renewalTarget(){
  if(multiBattle?.active){const living=aliveMultiEnemies();const target=living.find(e=>e.id===renewal.targetId)||living[0];renewal.targetId=target?.id||null;return target||null;}
  return enemy?{id:'single',mon:enemy,hp:eHp,maxHp:enemyMaxHp(),level:activeHuntRequest?.enemyLevel||1}:null;
}
function renewalSelectTarget(id){
  if(!renewalCanAct())return;
  const target=multiEnemy(id);if(!target?.alive||target.hp<=0)return;
  renewal.targetId=id;renewalRender();renewalDecorateSkills();
}
function renewalEffect(move,target=renewalTarget()?.mon){
  if(!Number(move?.[1]))return {label:'補助',kind:'support'};
  const ratio=typeEff(moveTypes(move),target?.types||[]);
  return ratio>1?{label:'◎ 効果抜群',kind:'good'}:ratio<1?{label:'△ いまひとつ',kind:'weak'}:{label:'○ ふつう',kind:'normal'};
}
function renewalBest(inst){return getEquippedMovesForInstance(inst).some(m=>renewalEffect(m).kind==='good');}
function renewalMount(){
  const battle=renewalEl('battle');if(!battle||renewalEl('renewalHeader'))return;
  battle.classList.add('is-renewed');
  battle.insertAdjacentHTML('afterbegin','<header id="renewalHeader" class="br-header"></header><div id="renewalLoop" class="br-loop" hidden></div>');
  const dock=battle.querySelector('.battle-command-dock');
  dock.insertAdjacentHTML('beforebegin','<div id="renewalMessages" class="br-messages" aria-live="polite"></div><div id="renewalParty" class="br-party" aria-label="編成中の仲間"></div>');
  dock.insertAdjacentHTML('beforeend','<p id="renewalHint" class="br-hint"></p>');
  battle.querySelector('.battle-arena').insertAdjacentHTML('beforeend','<div id="renewalBanner" class="br-banner" role="status"></div>');
  document.body.insertAdjacentHTML('beforeend','<dialog id="renewalSheet" class="br-sheet" aria-labelledby="renewalSheetTitle"><header><h2 id="renewalSheetTitle"></h2><button type="button" onclick="renewalClose()" aria-label="閉じる">×</button></header><div id="renewalSheetBody"></div></dialog>');
  const dialog=renewalEl('renewalSheet');dialog.addEventListener('close',()=>{renewal.focus?.focus?.({preventScroll:true});renewal.focus=null;syncBattleIdleMedia();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientY<b.top||e.clientY>b.bottom||e.clientX<b.left||e.clientX>b.right)renewalClose();}});
  // Result sections must survive reconciliation by the engine's actions panel.
  renewalEl('battleOutcomeRewards').insertAdjacentHTML('afterend','<div id="renewalResultMeta"></div><div id="renewalResultExp"></div>');
  renewalEl('next').insertAdjacentHTML('afterend','<div id="renewalResultButtons" class="br-result-buttons"></div>');
}
function renewalReset(){
  renewal.epoch++;renewal.targetId=null;renewal.itemId=null;renewal.itemTarget=null;renewal.linkUid=null;renewal.linkPending=false;renewal.linkReady=false;renewal.result=null;renewal.turns=0;
  renewalEl('battle')?.classList.remove('br-auto-between');
  renewalClose();clearTimeout(renewal.bannerTimer);renewalEl('renewalBanner')?.classList.remove('on');renewalEl('renewalLinkFx')?.remove();
  renewalMarkup('renewalResultMeta','');renewalMarkup('renewalResultExp','');renewalMarkup('renewalResultButtons','');
}
function renewalOpen(title,html){
  renewalMount();const dialog=renewalEl('renewalSheet');if(!dialog.open)renewal.focus=document.activeElement;
  renewalEl('renewalSheetTitle').textContent=title;renewalEl('renewalSheetBody').innerHTML=html;
  if(!dialog.open){dialog.showModal();syncBattleIdleMedia();}
}
function renewalClose(){
  const sheet=renewalEl('renewalSheet');
  if(sheet?.open)sheet.close();
}
function renewalRender(){
  if(!renewalEl('battle')?.classList.contains('active')||!player||!enemy)return;
  renewalMount();const target=renewalTarget(),canAct=renewalCanAct(),auto=renewalAuto();
  const kind=multiBattle?.invasion?'乱入戦':multiBattle?.active?'三つ巴':'';
  renewal.turns=Math.max(renewal.turns,battleTurnCount+(battleTurnInProgress?1:0));
  const r=autoRun,participating=r?.phase==='fight'&&r.request===activeHuntRequest;
  const autoVisible=!renewalEl('autoControls').hidden;
  renewalMarkup('renewalHeader',`<div class="br-location"><b>${renewalHtml(selectedMap?.name||'バトル')}</b><span>${renewalHtml(activeHuntRequest?.difficultyLabel||'')}</span>${kind?`<span class="br-kind">${kind}</span>`:''}<small>ターン <b>${battleFeedback.finished?Math.max(1,renewal.turns):battleTurnCount+1}</b></small>${save.gBless?.on?'<small>✦ G-BLESS</small>':''}</div><div class="br-tools">${autoVisible?`<button onclick="autoControl('manual')" aria-pressed="${auto}">⏩ ${auto?'AUTO':'オート'}</button><button onclick="autoControl('speed')" ${participating?'':'disabled'}>×${r?.settings?.speed||1}</button>`:''}<button onclick="renewalHistory()" aria-label="戦闘の履歴">≡</button></div>`);
  const loop=renewalEl('renewalLoop');loop.hidden=!participating;
  if(participating)renewalMarkup('renewalLoop',`<span>⏩ オート周回 <b>${Math.min(r.times,r.battles.length+1)}/${r.times}戦目</b></span><div class="ab-bars">${autoBars(r)}</div><button onclick="autoControl('end')">${r.stop?'✓ この戦闘で終了':'周回を終える'}</button>`);
  const latest=battleFeedback.history.filter(h=>h.kind==='result'||h.kind==='action').slice(-2).reverse();
  renewalMarkup('renewalMessages',latest.map((h,i)=>`<p class="${i?'old':''}">${auto?'[AUTO] ':''}${renewalHtml(h.text.split('\n').filter(Boolean).slice(-1)[0]||'')}</p>`).join('')||'<p>コマンドを選んでください</p>');
  renewalEl('battle').classList.toggle('br-auto',auto);
  const pad=renewalEl('battle').querySelector('.battle-command-pad');pad.inert=!canAct;
  const commands=renewalEl('commands');commands.inert=!canAct;
  for(const [id,text] of [['battleSkillButton','技'],['battleItemButton','道具'],['battleSwitchButton','交代'],['battleEscapeButton','逃走']]){
    const button=renewalEl(id);
    if(!button||id==='battleItemButton')continue;
    const label=`<strong>${text}</strong>`;
    if(button.innerHTML!==label)button.innerHTML=label;
  }
  const link=kokoroLinkEffectForInstance(activeInstance),sources=currentKokoroLinkSources({includeUsed:true}),available=sources.filter(s=>s.available).length;
  const reason=player.entityKind!=='monster'?'対象外':link?'発動中':!available?(sources.some(s=>s.used)?'使用済み':'利用可能な控えなし'):'';
  renewalMarkup('kokoroLinkButton',`<strong>リンク (${available})</strong>${reason?`<small>${reason}</small>`:''}`);
  renewalEl('battleSkillButton').classList.toggle('has-effective',renewalBest(activeInstance));
  renewalEl('battleSkillButton').setAttribute('data-effective',renewalBest(activeInstance)?'◎ 効果抜群あり':'');
  renewalMarkup('renewalParty',partyBattle.map((entry,index)=>{
    const hp=index===activePartyIdx?pHp:entry.hp,max=instanceMaxHp(entry.inst),active=index===activePartyIdx,down=entry.fainted||hp<=0;
    const states=active?battleStateLabels(battleCombatants()[0]):[];
    return `<button type="button" data-reserve-index="${index}" class="br-member ${active?'active':''} ${down?'down':''}" ${!canAct||active||down?'disabled':''} onclick="renewalSwitch(${index})"><img src="${renewalHtml(IMG[entry.mon.id]||'')}" alt=""><span><b>${renewalHtml(entry.mon.name)}</b><small>Lv.${entry.inst.level} · ${Math.max(0,hp)}/${max}</small><i class="br-mini"><i style="width:${Math.max(0,hp)/max*100}%"></i></i><small>${renewalHtml(states.map(s=>s.includes('💞')?'💞':s.split(' ')[0]).join(' '))}</small></span>${active?'<em>出撃中</em>':!down&&renewalBest(entry.inst)?'<em class="good">◎技あり</em>':''}</button>`;
  }).join(''));
  const reserve=partyBattle.find((entry,i)=>i!==activePartyIdx&&!entry.fainted&&entry.hp>0&&renewalBest(entry.inst));
  renewalEl('renewalHint').textContent=multiBattle?.active?'相手の絵か札をタップすると、狙う相手を変えられます':!renewalBest(activeInstance)&&reserve?`ヒント：${reserve.mon.name}には効果抜群の技がある`:'';
  renewalNameplates(target);
  renewalDecorateSkills();
}
function renewalNameplates(target){
  for(const [id,mon,level,entry] of [['singlePlayerBox',player,activeInstance?.level||1,null],...multiBattle?.active?multiBattle.enemies.map(e=>[e.id+'Card',e.mon,e.level,e]):[['singleEnemyBox',enemy,activeHuntRequest?.enemyLevel||1,null]]]){
    const box=renewalEl(id);if(!box)continue;
    const playerBox=id==='singlePlayerBox',hud=playerBox||id==='singleEnemyBox'?box:box.querySelector('.multi-enemy-copy');if(!hud)continue;
    let meta=hud.querySelector('.br-plate-meta');
    if(!meta){meta=document.createElement('div');meta.className='br-plate-meta';hud.querySelector('h2')?.insertAdjacentElement('afterend',meta);}
    const selected=!!entry&&!!target&&entry.id===target.id&&multiBattle?.active;
    meta.innerHTML=`<span>Lv.${level}</span>${!playerBox?`<span class="br-stars">${renewalHtml(mon.rarity)}</span>`:''}<span>${multiBattle?.active?normalizeMoveTypes(mon.types).map(t=>skillTypeIcon(t)).join(''):skillTypeLabel(mon.types)}</span>${selected?'<span class="br-target-label">🎯狙う</span>':''}`;
    hud.classList.toggle('br-target',!!selected);
    if(!playerBox){
      let info=hud.querySelector('.br-info');if(!info){info=document.createElement('button');info.className='br-info';info.type='button';info.textContent='i';info.setAttribute('aria-label',`${mon.name}の詳細`);hud.append(info);}
      info.onclick=e=>{e.stopPropagation();renewalEnemyInfo(entry?.id);};info.disabled=false;
      if(!entry){hud.onclick=e=>{if(!e.target.closest('button'))renewalEnemyInfo();};hud.setAttribute('role','button');hud.tabIndex=0;hud.onkeydown=e=>{if(e.target===hud&&(e.key==='Enter'||e.key===' ')){e.preventDefault();renewalEnemyInfo();}};}
    }
    if(entry){
      if(multiBattle?.invasion&&entry.id==='enemy_b'&&!box.dataset.renewalEntered){box.dataset.renewalEntered='true';box.classList.add('br-enter');setTimeout(()=>box.classList.remove('br-enter'),700/autoSpeed());}
      const slot=box.querySelector('.battle-stage-slot');slot?.classList.toggle('br-selected',!!selected);
      for(const hit of [slot,hud])if(hit){hit.setAttribute('role','button');hit.setAttribute('aria-label',mon.name+'を狙う');hit.tabIndex=entry.alive&&entry.hp>0?0:-1;hit.onclick=e=>{if(e.target.closest('button'))return;if(pendingKokoroLinkStatusSourceUid)handleMultiEnemyCard(entry.id);else renewalSelectTarget(entry.id);};hit.onkeydown=e=>{if(e.target===hit&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(pendingKokoroLinkStatusSourceUid)handleMultiEnemyCard(entry.id);else renewalSelectTarget(entry.id);}};}
      // KO art fades rather than switching to an opaque fallback card.
      slot?.classList.toggle('br-ko',!entry.alive||entry.hp<=0);
    }
  }
  renewalEl('pBattleSlot')?.classList.toggle('br-ko',pHp<=0);
  renewalEl('eBattleSlot')?.classList.toggle('br-ko',!multiBattle?.active&&eHp<=0);
  for(const el of document.querySelectorAll('#battle .battle-status')){
    const id=el.id,unit=battleCombatants().find(u=>u.statusId===id);if(!unit)continue;
    el.innerHTML=battleStateLabels(unit).map(s=>`<span class="br-status ${/毒/.test(s)?'poison':/麻痺/.test(s)?'para':/眠/.test(s)?'sleep':/混乱/.test(s)?'conf':/防御|盾/.test(s)?'guard':/💞/.test(s)?'link':'buff'}">${renewalHtml(s.includes('💞')?'💞リンク中':s)}</span>`).join('');
  }
}
function renewalDecorateSkills(){
  const commands=renewalEl('commands');if(!commands||!activeInstance)return;
  const target=renewalTarget(),moves=getEquippedMovesForInstance(activeInstance);
  for(const button of commands.querySelectorAll('.skill-button')){
    const index=Number(button.getAttribute('onclick')?.match(/turn\((-?\d+)\)/)?.[1]);
    const move=index===-1?['通常攻撃',24,'normal']:moves[index];if(!move)continue;
    let badge=button.querySelector('.br-effect');if(!badge){badge=document.createElement('span');badge.className='br-effect';button.append(badge);}
    const stats=button.querySelector('small');if(!Number(move[1])&&stats?.firstChild?.nodeType===3)stats.firstChild.textContent=renewalSupportLabel(move)+' / ';
    const eff=renewalEffect(move);badge.textContent=eff.label;badge.className='br-effect '+eff.kind;
    // Equipped COST is a loadout budget, not a consumable combat resource.
  }
  let head=commands.querySelector('.br-skill-heading');if(!head){head=document.createElement('div');head.className='br-skill-heading';commands.prepend(head);}
  const heading=`<span>技を選んでください</span>${multiBattle?.active&&target?`<small>🎯 ${renewalHtml(target.mon.name)}</small>`:''}<button type="button" class="br-skill-help" aria-label="装備中の技の詳細" onclick="renewalSkillHelp()">詳細</button>`;
  if(head.innerHTML!==heading)head.innerHTML=heading;
}
function renewalSkillHelp(){
  if(!renewalCanAct())return;
  const cards=[...renewalEl('commands').querySelectorAll('.skill-button')];
  renewalOpen('装備中の技の詳細',`<p>COSTは編成用。戦闘では減らない</p>${cards.map(card=>`<div class="br-info-move"><b>${renewalHtml(card.querySelector('strong')?.textContent||'')}</b><p>${renewalHtml(card.querySelector('small')?.textContent||'')}</p>${card.querySelector('.battle-choice-detail')?.outerHTML||''}</div>`).join('')}`);
}
function renewalSwitch(index){
  if(!renewalCanAct())return;const picker=renewalEl('multiTargetSelect');
  if(picker?.querySelector('[data-tutorial-actor-select]'))selectBattleSwitchTarget(index);
  else{battleUiClear();performManualPartySwitch(index);}
}
function renewalHistory(){renewalOpen('戦闘の履歴',`<div class="br-history">${[...battleFeedback.history].reverse().map(h=>`<p><small>ターン ${h.turn}</small>${renewalHtml(h.text)}</p>`).join('')||'<p>まだ履歴はありません</p>'}</div>`);}
function renewalTraits(mon){
  return [mon.atk,mon.def,mon.spd];
}
const renewalDistribution=[0,1,2].map(i=>M.map(m=>renewalTraits(m)[i]).sort((a,b)=>a-b));
function renewalEnemyInfo(id=null){
  const entry=id?multiEnemy(id):renewalTarget();if(!entry)return;const mon=entry.mon;
  const weak=Object.keys(TN).filter(t=>typeEff(t,mon.types)>1),resist=Object.keys(TN).filter(t=>typeEff(t,mon.types)<1);
  const traits=renewalTraits(mon),known=caughtHas(mon.id),owned=save.instances.some(i=>i.id===mon.id);
  const unit=battleCombatants().find(u=>u.vis===(id?id+'Vis':'eVis'));
  renewalOpen('相手の詳細',`<div class="br-enemy-head"><img src="${renewalHtml(IMG[mon.id]||'')}" alt=""><div><h3>${renewalHtml(mon.name)}</h3><p>Lv.${entry.level} · ${renewalHtml(mon.rarity)} · ${skillTypeLabel(mon.types)}</p><p>HP ${Math.max(0,entry.hp)} / ${entry.maxHp}</p><p>${renewalHtml(unit?battleStateLabels(unit).join('・'):'')}</p></div></div><h3>能力の目安</h3>${traits.map((n,i)=>{const d=renewalDistribution[i],rank=d.filter(v=>v<n).length/d.length;return `<p class="br-stat"><span>${['攻撃','防御','素早さ'][i]}</span><i><i style="width:${Math.max(8,rank*100)}%"></i></i><span>${n>d[Math.floor(d.length*2/3)]?'高い':n<d[Math.floor(d.length/3)]?'低い':'ふつう'}</span></p>`;}).join('')}<h3>弱点</h3><p>${weak.map(t=>skillTypeLabel(t)).join('・')||'なし'}</p><h3>効きにくい属性</h3><p>${resist.map(t=>skillTypeLabel(t)).join('・')||'なし'}</p><h3>使ってくる技</h3>${(mon.moves||[]).map(m=>`<div class="br-info-move"><b>${renewalHtml(m[0])}</b><small>${skillTypeLabel(moveTypes(m))} · ${m[1]?'威力 '+m[1]:'補助'}</small><p>${renewalHtml(moveEffectText(m).replace(/\d+(?:\.\d+)?[%％]/g,'').replace(/確率[^。]*/g,'ことがある'))}</p></div>`).join('')}<p class="br-dex">図鑑：${known?'登録済み':'未登録'} · ${owned?'契約済み':'未契約'}</p>`);
}
function renewalBanner(text,kind=''){
  renewalMount();const el=renewalEl('renewalBanner');el.textContent=text;el.className='br-banner on '+kind;clearTimeout(renewal.bannerTimer);renewal.bannerTimer=setTimeout(()=>el.classList.remove('on'),1100/autoSpeed());
}
function renewalHpFeedback(unit,loss,{label,effectiveness}){
  const visual=renewalEl(unit.vis);if(!visual)return;
  const stage=visual.closest('.battle-stage-slot'),arena=renewalEl('battle').querySelector('.battle-arena');if(!stage||!arena)return;
  const rect=stage.getBoundingClientRect(),base=arena.getBoundingClientRect(),num=document.createElement('span');
  num.className='br-damage '+(loss<0?'heal':/毒|継続/.test(label)?'poison':effectiveness>1?'good':'');num.textContent=(loss<0?'+':'')+Math.abs(loss);num.style.left=rect.left-base.left+rect.width/2+'px';num.style.top=rect.top-base.top+rect.height/2+'px';arena.append(num);setTimeout(()=>num.remove(),950/autoSpeed());
  if(effectiveness>1)renewalBanner('効果は抜群だ！');else if(effectiveness<1)renewalBanner('いまひとつのようだ…','weak');
}
function renewalEscape(){if(!renewalCanAct())return;renewalOpen('逃走','<p>戦闘から逃げますか？</p><p>逃げると、この戦闘の報酬はもらえません。</p><div class="br-two"><button onclick="renewalClose()">戦いを続ける</button><button onclick="renewalConfirmEscape()">逃げる</button></div>');}
function renewalConfirmEscape(){if(!renewalCanAct())return;renewalClose();runAway();}
function renewalItems(){if(!renewalCanAct())return;battleUiClear();renewal.itemId=null;renewal.itemTarget=null;renewalItemSheet();}
function renewalItemReason(id,index){
  const entry=partyBattle[index];if(!entry||entry.fainted||(index===activePartyIdx?pHp:entry.hp)<=0)return '戦闘不能';
  if((save.items[id]||0)<=0)return '残数なし';
  if(id!=='attack_potion'&&(index===activePartyIdx?pHp:entry.hp)>=instanceMaxHp(entry.inst))return 'HPは満タンです';return '';
}
function renewalItemSheet(){
  const id=renewal.itemId,item=ITEM_BY_ID[id];
  renewalOpen('道具',SHOP_ITEMS.filter(i=>i.usableInBattle||i.contract).map(i=>`<button class="br-item ${id===i.id?'selected':''}" ${!['potion','upper_potion','attack_potion'].includes(i.id)||(save.items[i.id]||0)<=0?'disabled':''} data-item="${i.id}" onclick="renewalPickItem(this.dataset.item)">${itemInlineVisual(i)}<span><b>${renewalHtml(i.name)}</b><small>${renewalHtml(i.battleDesc||i.desc)}</small></span><small>${i.contract?'戦闘後':(save.items[i.id]||0)+'個'}</small></button>`).join('')+(item?`<h3>だれに使う？</h3><div class="br-item-targets">${partyBattle.map((p,i)=>`<button data-item-target="${i}" ${renewalItemReason(id,i)?'disabled':''} onclick="renewalPickItemTarget(${i})" class="${renewal.itemTarget===i?'selected':''}"><img src="${renewalHtml(IMG[p.mon.id]||'')}" alt=""><b>${renewalHtml(p.mon.name)}</b><small>${renewalItemReason(id,i)||`${i===activePartyIdx?pHp:p.hp}/${instanceMaxHp(p.inst)}`}</small></button>`).join('')}</div><button class="br-go" ${renewal.itemTarget===null?'disabled':''} onclick="renewalUseItem()">${renewalHtml(item.name)}を使う</button>`:''));
}
function renewalPickItem(id){renewal.itemId=id;renewal.itemTarget=null;renewalItemSheet();}
function renewalPickItemTarget(i){if(renewalItemReason(renewal.itemId,i))return;renewal.itemTarget=i;renewalItemSheet();}
function renewalUseItem(){
  const id=renewal.itemId,index=renewal.itemTarget;if(!renewalCanAct()||battleItemSaveBusy||renewalItemReason(id,index))return;
  const entry=partyBattle[index],identity=saveTransactionIdentity();battleItemSaveBusy=true;
  try{
    // Existing transactional inventory writer. No transient HP changes on failure.
    if(!commitSaveMutation(()=>{save.items[id]--;},{requireReadable:true})){
      const sheet=renewalEl('renewalSheet');
      if(sheet?.open&&!sheet.querySelector('.br-item-save-error')){
        sheet.querySelector('.br-go').insertAdjacentHTML('beforebegin','<p class="br-item-save-error" role="alert">保存できませんでした。道具は消費されていません。</p>');
      }
      return;
    }
    if(identity!==saveTransactionIdentity())return;
    if(id==='attack_potion'){if(index===activePartyIdx)pAtk=1.6;else entry.itemAttack=1.6;}
    else{
      const maxHp=instanceMaxHp(entry.inst),amount=battlePotionHealing(id,entry.mon,entry.inst,maxHp);
      if(index===activePartyIdx){pHp=Math.min(maxHp,pHp+amount);entry.hp=pHp;}
      else entry.hp=Math.min(maxHp,entry.hp+amount);
    }
    renewal.itemId=null;renewal.itemTarget=null;busy=true;renewalClose();
    try{const log=renewalEl('log');log.textContent=`${ITEM_BY_ID[id].name}を${entry.mon.name}に使った！`;captureBattleLog();updateItems();update();}catch(error){console.error('Committed battle item display failed',error);}finally{renewalItemEnemyTurn();}
  }finally{battleItemSaveBusy=false;}
}
function renewalItemEnemyTurn(){
  busy=true;startBattleTurn();renderBattleInputState();
  if(multiBattle?.active){const actions=aliveMultiEnemies().map(actor=>{const delayed=consumeKokoroLinkEnemyActionDelay(actor.id),next=nextEnemyMoveWithKokoroLinkForesight(actor.id,actor.mon);return {kind:'enemy',actorId:actor.id,speed:delayed?-Infinity:multiEnemyKokoroLinkSpeed(actor),move:next.move};}).sort((a,b)=>b.speed-a.speed||Math.random()-.5);runMultiActions(actions,0);return;}
  const token=mapStoryBattleToken(),actor=enemy,next=nextEnemyMoveWithKokoroLinkForesight(singleEnemyKokoroLinkKey(),enemy);consumeKokoroLinkEnemyActionDelay(singleEnemyKokoroLinkKey());
  (async()=>{await battleMotionDelay(300);if(!mapStoryTokenValid(token))return;await performAction(actor,player,next.move,false);if(!mapStoryTokenValid(token))return;if(eHp<=0){win();return;}if(pHp<=0&&!switchPartyMember())return;finishTurnWithPoison();})();
}
function renewalDelayLink(uid,targetId,source){
  if(renewal.linkReady){renewal.linkReady=false;return false;}
  if(renewal.linkPending||!source?.available)return true;
  const epoch=renewal.epoch,identity=saveTransactionIdentity(),actor=activeInstance?.uid;renewal.linkPending=true;
  renewalEl('kokoroLinkPanel').classList.add('hidden');
  const effect=document.createElement('div');effect.id='renewalLinkFx';effect.className='br-link-fx';
  const preview=resolveKokoroLink(source.entry.mon,source.entry.inst,kokoroLinkTargetStats());
  effect.innerHTML=`<h2>💞 ココロリンク</h2><img src="${renewalHtml(IMG[source.entry.mon.id]||'')}" alt="${renewalHtml(source.entry.mon.name)}"><p>${renewalHtml(source.entry.mon.name)} の力を ${renewalHtml(player.name)} へ</p><b>障壁 ${preview.effects.barrier} · 攻撃 +${Math.round(preview.effects.attackBonus*100)}% · 素早さ +${preview.effects.speedBonus}</b>`;
  renewalEl('battle').querySelector('.battle-arena').append(effect);renewalRender();
  setTimeout(()=>effect.classList.add('fly'),1300);
  setTimeout(()=>{effect.remove();if(epoch!==renewal.epoch)return;renewal.linkPending=false;if(identity!==saveTransactionIdentity()||actor!==activeInstance?.uid||!renewalEl('battle').classList.contains('active'))return;renewal.linkReady=true;activateKokoroLinkFromBattle(uid,targetId);renewalEl('pVis')?.classList.add('br-linked');setTimeout(()=>renewalEl('pVis')?.classList.remove('br-linked'),800);renewalRender();},1800);return true;
}
function renewalOutcome({kind}){
  renewalClose();
  const savePending=worldMapBattleSavePending();
  if(!savePending)renewalEl('next').textContent='探索先へ';
  const request=activeHuntRequest?structuredClone(activeHuntRequest):null;
  renewal.result={map:selectedMap?.id,enemy:enemy?.id,request};
  const defeated=multiBattle?.enemies||[{mon:enemy,defeatedByPlayer:kind==='victory'}];
  renewalEl('battleOutcomeEyebrow').prepend(document.createTextNode(kind==='victory'?'VICTORY · ':kind==='defeat'?'DEFEAT · ':''));
  renewalMarkup('renewalResultMeta',`<p>${renewalHtml(selectedMap?.name||'')} · ${renewalHtml(request?.difficultyLabel||'')} · ${renewal.turns}ターン${defeated.length>1?` · ${defeated.length}体`:''}</p>${kind==='victory'?defeated.map(e=>`<p>${renewalHtml(e.mon.name)} <b>${e.defeatedByPlayer?'✓ 討伐':'(敵どうしで倒れた)'}</b></p>`).join(''):kind==='retreat'?'<p>撤退・報酬はありません</p>':`<div class="br-defeat-tip"><b>💡 次へのヒント</b><p>相手は${skillTypeLabel(enemy.types)}。${Object.keys(TN).filter(t=>typeEff(t,enemy.types)>1).map(t=>TN[t]).join('・')||'相性のよい'}属性の技を試そう。</p><p>${renewalHtml((enemy.moves||[]).filter(m=>['poison','paralysis','sleep','confusion'].includes(m[3])).map(m=>m[0]+'に注意。').join(''))}</p></div>`}`);
  if(kind==='victory'&&normalVictoryReceipt?.committed){
    const before=JSON.parse(normalVictoryReceipt.before);
    renewalMarkup('renewalResultExp',partyBattle.map(p=>{const old=before.instances.find(i=>i.uid===p.inst.uid),now=getInstance(p.inst.uid)||p.inst;return `<div class="br-exp-row"><b>${renewalHtml(p.mon.name)}</b><span>Lv.${old?.level||now.level} → ${now.level} ${old&&now.level>old.level?'<em>LEVEL UP!</em>':''}</span><div class="br-exp ${old&&now.level>old.level?'br-levelup':''}"><i style="--exp-before:${(old?.exp||0)/needExp(old?.level||1)*100}%;width:${isMaxLevel(now.level)?100:(now.exp||0)/needExp(now.level)*100}%"></i></div></div>`;}).join(''));
  }
  const ordinary=!savePending&&!request?.source&&!tutorialBattleSession?.active;
  renewalMarkup('renewalResultButtons',`${kind==='defeat'&&ordinary?'<button onclick="renewalPartyReview()">編成を見直す</button>':''}${ordinary?'<button onclick="renewalRetry()">もう一度</button>':''}`);
}
function renewalPartyReview(){afterBattleNext();if(!normalVictoryPending()&&!worldMapBattleSavePending())show('party');}
function renewalRetry(){
  if(postBattleContractBusy||renewal.contractBusy||normalVictoryPending()||autoRun)return;
  const result=renewal.result;if(!result?.request||result.request.source)return;
  afterBattleNext();if(currentEvolution||worldMapBattleSavePending())return;
  if(result.request.worldMapExploration){worldMapDeparting=false;startWorldMapExploration(result.map,result.request.difficultyId);}
  else beginChosenBattle(result.map,result.enemy,result.request.difficultyId,result.request);
}
renewalMount();
function renewalLinkPreview(uid){
  if(!renewalCanAct())return;const source=currentKokoroLinkSources({includeUsed:true}).find(s=>s.uid===uid);if(!source?.available)return;
  const preview=resolveKokoroLink(source.entry.mon,source.entry.inst,kokoroLinkTargetStats());renewal.linkUid=uid;
  renewalOpen('ココロリンク',`<div class="br-enemy-head"><img src="${renewalHtml(IMG[source.entry.mon.id]||'')}" alt=""><h3>${renewalHtml(source.entry.mon.name)} · ${renewalHtml(source.entry.mon.rarity)}</h3></div><p>控えの仲間から力を借ります。</p><p>障壁 ${preview.effects.barrier} / 攻撃ダメージ +${Math.round(preview.effects.attackBonus*100)}% / 素早さ +${preview.effects.speedBonus}</p>${[preview.powerAbility,preview.statusAbility,preview.tacticsAbility].filter(Boolean).map(a=>`<p>${renewalHtml(a.label)}：${renewalHtml(a.summary)}</p>`).join('')}<p>行動を使わずに発動します</p><button class="br-go" onclick="renewalLinkConfirm()">リンクする</button>`);
}
function renewalLinkConfirm(){if(!renewalCanAct())return;const uid=renewal.linkUid;renewal.linkUid=null;renewalClose();if(uid)activateKokoroLinkFromBattle(uid);}
function renewalContracts(){
  if(tutorialBattleSession?.active||activeHuntRequest?.source||autoRun)return false;
  if(!battleRewardGranted||normalVictoryPending())return false;
  const candidates=multiBattle?.active?multiBattle.enemies.filter(e=>e.defeatedByPlayer&&isContractableUnit(e.mon)&&!multiBattle.contractAttempts[e.id]):!singleBattleContractAttempted&&isContractableUnit(enemy)?[{id:'single',mon:enemy}]:[];
  const stocks=SHOP_ITEMS.filter(i=>i.contract&&(save.items[i.id]||0)>0);
  renewalMarkup('battleOutcomeActions',candidates.map(e=>`<section class="br-contract"><h3>${renewalHtml(e.mon.name)}と契約できそうだ！</h3>${stocks.map(i=>`<button data-contract-item="${i.id}" data-contract-target="${e.id}" onclick="renewalContract(this.dataset.contractTarget,this.dataset.contractItem)">${itemInlineVisual(i)} ${renewalHtml(i.name)} ×${save.items[i.id]}</button>`).join('')||'<p>契約書を持っていません。</p>'}</section>`).join('')+(candidates.length?'<button onclick="renewalSkipContract()">今回は契約しない</button>':'<p>契約の判定は終了しました。</p>'));
  return true;
}
function renewalSkipContract(){if(renewal.contractBusy||postBattleContractBusy)return;renewalMarkup('battleOutcomeActions','<p>今回は契約しません</p>');}
async function renewalContract(targetId,itemId){
  if(renewal.contractBusy||postBattleContractBusy||normalVictoryPending()||!battleRewardGranted)return;
  renewal.contractBusy=true;renewalEl('battleOutcomeActions').inert=true;renewalEl('next').disabled=true;renewalEl('renewalResultButtons').inert=true;
  try{
    const count=save.instances.length;
    if(targetId==='single')await tryContractWithScroll(itemId);
    else {const entry=multiEnemy(targetId);if(!entry?.defeatedByPlayer)return;pendingMultiBattleContractId=targetId;enemy=entry.mon;await useMultiBattleContractScroll(itemId);}
    if(singleBattleContractAttempted||multiBattle?.contractAttempts[targetId]){
      renewalContracts();const p=document.createElement('p');p.className='br-contract-result';p.textContent=save.instances.length>count?'契約成功！':'契約失敗…';renewalEl('battleOutcomeActions').prepend(p);
    }
  }finally{renewal.contractBusy=false;renewalEl('battleOutcomeActions').inert=false;renewalEl('next').disabled=false;renewalEl('renewalResultButtons').inert=false;}
}
function renewalAutoBetween(outcome,pause){
  renewalEl('battle').classList.add('br-auto-between');
  renewalEl('battleOutcomeNote').textContent=pause?'契約のチャンス！':`EXP +${outcome.exp} · 契約は見送り · 次の戦闘へ`;
}
function renewalStatusFeedback(labels,prior){
  const status=labels.find(s=>{const name=s.match(/毒|麻痺|眠り|混乱/)?.[0];return name&&!prior.includes(name);});
  if(status)renewalBanner(status,'status');
}
function renewalKoClone(){
  const visual=renewalEl('pVis'),slot=renewalEl('pBattleSlot');if(!visual||!slot)return;
  const ghost=visual.cloneNode(true);ghost.removeAttribute('id');ghost.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));ghost.querySelectorAll('video').forEach(el=>el.remove());ghost.querySelectorAll('img').forEach(el=>el.style.visibility='visible');
  ghost.className='br-ko-ghost';slot.append(ghost);setTimeout(()=>ghost.remove(),550/autoSpeed());
}
function renewalScreenChanged(id){
  if(id==='battle')return;
  renewalClose();renewal.itemId=null;renewal.itemTarget=null;renewal.linkUid=null;
  if(renewal.linkPending){renewal.epoch++;renewal.linkPending=false;renewal.linkReady=false;renewalEl('renewalLinkFx')?.remove();}
}
function renewalSupportLabel(move){
  const profile=move?.[3]==='tactical'?tacticalSkillProfile(move):null;
  if(move?.[3]==='heal'||profile?.heal)return 'HP回復';
  if(move?.[3]==='guard'||profile?.guard)return '防御';
  if(profile?.cleanse?.length)return '状態回復';
  if(move?.[3]==='buff'||profile?.buff)return '能力強化';
  return '補助';
}
