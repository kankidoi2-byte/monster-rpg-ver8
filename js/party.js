/* Roster preferences are device-local; player save schema and IDs are unchanged. */
var ROSTER_FILTERS = {all:'すべて',monster:'モンスター',character:'キャラクター',star1:'★1',star2:'★2',star3:'★3+',duplicates:'重複'};
var ROSTER_SORTS = {newest:'入手が新しい順',oldest:'入手が古い順',rarity:'レアリティ順',level:'Lv順',dex:'図鑑番号順'};
var rosterUi = {identity:null,filter:'all',sort:'newest',selecting:false,selected:new Set(),detailUid:null,confirmation:null,busy:false,returnFocus:null};
function rosterEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function rosterIdentity(){return typeof saveTransactionIdentity==='function'?saveTransactionIdentity():'mb_v95c';}
function rosterPreferenceKey(){return `mb_roster_view_v1:${rosterIdentity()}`;}
function ensureRosterState(){
  if(rosterUi.identity===rosterIdentity())return;
  Object.assign(rosterUi,{identity:rosterIdentity(),filter:'all',sort:'newest',selecting:false,selected:new Set(),detailUid:null,confirmation:null,busy:false,returnFocus:null});
  try{const pref=JSON.parse(localStorage.getItem(rosterPreferenceKey())||'null');if(pref&&Object.hasOwn(ROSTER_FILTERS,pref.filter))rosterUi.filter=pref.filter;if(pref&&Object.hasOwn(ROSTER_SORTS,pref.sort))rosterUi.sort=pref.sort;}catch(_error){/* The roster works with storage disabled. */}
}
function setRosterView(kind,value){
  ensureRosterState();
  if(kind==='filter'&&Object.hasOwn(ROSTER_FILTERS,value))rosterUi.filter=value;
  else if(kind==='sort'&&Object.hasOwn(ROSTER_SORTS,value))rosterUi.sort=value;else return;
  try{localStorage.setItem(rosterPreferenceKey(),JSON.stringify({filter:rosterUi.filter,sort:rosterUi.sort}));}catch(_error){}
  const list=document.getElementById('partyList');if(list)list.scrollTop=0;
  renderParty();
}
function rosterSpeciesCounts(){const counts=new Map();for(const ins of save.instances)counts.set(ins.id,(counts.get(ins.id)||0)+1);return counts;}
function rosterVisibleInstances(){
  const counts=rosterSpeciesCounts(),order=new Map(save.instances.map((ins,i)=>[ins.uid,i]));
  const stars=ins=>(by(ins.id)?.rarity.match(/★/g)||[]).length;
  return save.instances.filter(ins=>{
    const mon=by(ins.id);if(!mon)return false;
    const f=rosterUi.filter;
    return f==='all'||(f==='monster'&&!isCharacterUnit(mon))||(f==='character'&&isCharacterUnit(mon))||
      (f==='star1'&&stars(ins)===1)||(f==='star2'&&stars(ins)===2)||(f==='star3'&&stars(ins)>=3)||(f==='duplicates'&&counts.get(ins.id)>1);
  }).sort((a,b)=>{
    const s=rosterUi.sort;
    const primary=s==='newest'?order.get(b.uid)-order.get(a.uid):s==='oldest'?order.get(a.uid)-order.get(b.uid):
      s==='rarity'?stars(b)-stars(a):s==='level'?b.level-a.level:(by(a.id).no??Infinity)-(by(b.id).no??Infinity);
    return primary||b.level-a.level||order.get(a.uid)-order.get(b.uid);
  });
}
function rosterTutorialProtected(ins){
  const tutorial=save.progress?.tutorial;
  if(!tutorial||tutorial.completed||tutorial.skipped||['completed','skipped'].includes(tutorial.status))return false;
  const targets=[];
  if(typeof tutorialContractInstanceUid==='function')targets.push(tutorialContractInstanceUid());
  if(typeof tutorialElnaContractInstance==='function')targets.push(tutorialElnaContractInstance()?.uid);
  if(typeof tutorialExpeditionCandidateInstance==='function')targets.push(tutorialExpeditionCandidateInstance()?.uid);
  if(typeof tutorialOwnedStarterInstance==='function')for(const id of ['freigal','aquaron','grassbeat','volteck'])targets.push(tutorialOwnedStarterInstance(id)?.uid);
  return ins.guest===true||ins.tutorialContract===true||ins.tutorialAlchemyLesson===true||Boolean(ins.tutorialRole)||targets.includes(ins.uid);
}
function rosterRecycleReward(ins){
  const mon=by(ins?.id);if(!mon)return null;
  return (isCharacterUnit(mon)?CHARACTER_RECYCLE_REWARDS:MONSTER_RECYCLE_REWARDS)[(mon.rarity.match(/★/g)||[]).length]||null;
}
function rosterRecycleError(ins){
  if(!ins||!by(ins.id))return '対象の個体が見つかりません。';
  if(ins.locked)return 'ロック中です。';
  if((save.party||[]).includes(ins.uid))return 'パーティー編成中です。';
  if(save.expeditions?.active?.some(e=>e.memberUids?.includes(ins.uid)))return '遠征中です。';
  if(rosterTutorialProtected(ins))return 'チュートリアルで使用する個体です。';
  if(typeof selectedAlchemyCatalystUid!=='undefined'&&selectedAlchemyCatalystUid===ins.uid)return '錬成の触媒に選択中です。';
  if(typeof alchemyBusy!=='undefined'&&alchemyBusy)return '錬成中です。';
  if((typeof currentEvolution!=='undefined'&&currentEvolution?.uid===ins.uid)||(typeof pendingEvolutions!=='undefined'&&pendingEvolutions.some(e=>e.uid===ins.uid)))return '進化の確認待ちです。';
  if(typeof normalVictoryPending==='function'&&normalVictoryPending())return '戦闘結果の保存待ちです。';
  if(typeof postBattleContractBusy!=='undefined'&&postBattleContractBusy)return '契約の処理中です。';
  const battleActive=typeof battleFeedback!=='undefined'&&typeof enemy!=='undefined'&&enemy&&!battleFeedback.finished&&typeof partyBattle!=='undefined'&&partyBattle.some(e=>e.inst?.uid===ins.uid);
  if(battleActive)return '戦闘中です。';
  if(Object.values(save.mapStories||{}).some(story=>story?.resume?.participantUids?.includes(ins.uid)))return '物語の戦闘で使用中です。';
  if(save.instances.length<=1)return '最後の所持契約体は変換できません。';
  if(!rosterRecycleReward(ins))return '変換報酬が未設定です。';
  return '';
}
function rosterRecyclePlan(uids){
  if(!Array.isArray(uids)||!uids.length)return {error:'変換する個体を選択してください。'};
  if(new Set(uids).size!==uids.length)return {error:'同じ個体が重複しています。選び直してください。'};
  const instances=uids.map(getInstance),items={},lastNames=[],warnings=[];
  for(const ins of instances){const error=rosterRecycleError(ins);if(error)return {error};}
  let coins=0;const selectedCounts=new Map(),owned=rosterSpeciesCounts();
  for(const ins of instances){const reward=rosterRecycleReward(ins);items[reward.itemId]=(items[reward.itemId]||0)+reward.count;coins+=reward.coins;selectedCounts.set(ins.id,(selectedCounts.get(ins.id)||0)+1);}
  for(const [id,count] of selectedCounts)if(owned.get(id)===count)lastNames.push(by(id).name);
  if(lastNames.length)warnings.push(`最後の1体：${lastNames.join('、')}（この種類の手持ちがなくなります）`);
  const high=instances.filter(i=>i.level>=20||by(i.id).rarity.length>=3);
  if(high.length)warnings.push(`Lv20以上または★3以上を${high.length}体含みます：${[...new Set(high.map(i=>by(i.id).name))].slice(0,3).join('、')}${high.length>3?' ほか':''}`);
  return {instances,items,coins,warnings,...(uids.length>=save.instances.length?{error:'手持ちを0体にはできません。1体以上残してください。'}:{})};
}
function rosterRewardText(plan){
  return plan?.items?[...Object.entries(plan.items).map(([id,count])=>`${ITEM_BY_ID[id].name} × ${count}`),`${plan.coins}コイン`].join(' ＋ '):'';
}
function rosterRewardForInstance(ins){const r=rosterRecycleReward(ins);return r?`${ITEM_BY_ID[r.itemId].name} × ${r.count} ＋ ${r.coins}コイン`:'';}
function rosterNotice(message){if(typeof showUiNotice==='function')showUiNotice(message,'warning');else alert(message);}
function renderParty(){
  const list=document.getElementById('partyList');if(!list)return;
  ensureRosterState();
  const scroll=list.scrollTop||0,visible=rosterVisibleInstances();
  // Keep selections across filters, but drop stale/protected individual references.
  for(const uid of rosterUi.selected)if(rosterRecycleError(getInstance(uid)))rosterUi.selected.delete(uid);
  const tutorialContractUid=typeof tutorialContractInstanceUid==='function'?tutorialContractInstanceUid():null;
  const tutorialElnaUid=typeof tutorialElnaContractInstance==='function'?tutorialElnaContractInstance()?.uid:null;
  const controls=document.getElementById('rosterControls');
  if(controls)controls.innerHTML=`<div class="roster-chips" role="group" aria-label="絞り込み">${Object.entries(ROSTER_FILTERS).map(([id,label])=>`<button type="button" aria-pressed="${rosterUi.filter===id}" onclick="setRosterView('filter','${id}')">${label}</button>`).join('')}</div><label class="roster-sort"><span>並び替え</span><select aria-label="並び替え" onchange="setRosterView('sort',this.value)">${Object.entries(ROSTER_SORTS).map(([id,label])=>`<option value="${id}" ${rosterUi.sort===id?'selected':''}>${label}</option>`).join('')}</select></label>`;
  const count=document.getElementById('rosterCount');
  if(count)count.innerHTML=rosterUi.selecting?`<span>${rosterUi.selected.size}体を選択中</span><button type="button" onclick="rosterSelectVisible()">${rosterAllVisibleSelected()?'選択を外す':rosterUi.filter==='duplicates'?'重複分を選ぶ（1体残す）':'表示中をすべて選ぶ'}</button>`:`<span>${visible.length} / ${save.instances.length}体</span>`;
  list.innerHTML=visible.length?visible.map(ins=>{
    const mon=by(ins.id),error=rosterUi.selecting?rosterRecycleError(ins):'',selected=rosterUi.selected.has(ins.uid);
    const badges=[ins.locked?'🔒':'',(save.party||[]).includes(ins.uid)?'編':'',save.expeditions?.active?.some(e=>e.memberUids?.includes(ins.uid))?'遠':''].filter(Boolean).join(' ');
    return `<button type="button" class="roster-icon${selected?' is-selected':''}${error?' is-unavailable':''}" data-stars="${Math.min(4,mon.rarity.length)}" data-monster-id="${rosterEscape(ins.id)}" data-instance-uid="${rosterEscape(ins.uid)}"${ins.uid===tutorialElnaUid?' data-tutorial-elna-instance="true"':''}${ins.uid===tutorialContractUid?' data-tutorial-contract-instance="true"':''} aria-label="${rosterEscape(mon.name)} Lv.${ins.level}${badges?' '+badges:''}${error?' '+rosterEscape(error):''}"${rosterUi.selecting?` aria-pressed="${selected}" aria-disabled="${Boolean(error)}"`:''} onclick="rosterTap('${rosterEscape(ins.uid)}')">${vis(mon,'loading="lazy" decoding="async"')}<span class="roster-badges">${badges}</span><span class="roster-level">Lv.${ins.level}<small>${mon.rarity}</small></span>${selected?'<span class="roster-check">✓</span>':''}${error?`<span class="roster-blocked">${rosterEscape(error.replace(/です。$/,''))}</span>`:''}</button>`;
  }).join(''):'<p class="roster-empty">表示する仲間がいません。</p>';
  list.scrollTop=scroll;
  const actions=document.getElementById('rosterActions'),plan=rosterRecyclePlan([...rosterUi.selected]);
  if(actions)actions.innerHTML=rosterUi.selecting?`<button type="button" onclick="endRosterSelection()">やめる</button><div class="roster-total" aria-live="polite"><b>${rosterUi.selected.size}体</b><small>${rosterEscape(rosterRewardText(plan))}</small>${plan.error&&rosterUi.selected.size?`<small role="alert">${rosterEscape(plan.error)}</small>`:''}</div><button type="button" class="roster-danger" onclick="openRosterConfirmation()" ${!plan.items?'disabled':''}>変換</button>`:`<button type="button" data-roster-party onclick="show('partySet')">パーティー編成</button><button type="button" onclick="startRosterSelection()">まとめて変換</button>`;
  document.getElementById('party')?.classList?.toggle('is-selecting',rosterUi.selecting);
  renderRosterSheet();
}
function startRosterSelection(){ensureRosterState();rosterUi.selecting=true;rosterUi.detailUid=null;rosterUi.confirmation=null;rosterUi.selected.clear();renderParty();}
function endRosterSelection(){rosterUi.selecting=false;rosterUi.selected.clear();rosterUi.confirmation=null;renderParty();if(typeof scheduleContractorRankUpPresentation==='function')scheduleContractorRankUpPresentation();}
function rosterTap(uid){
  if(!rosterUi.selecting){openRosterDetail(uid);return;}
  const error=rosterRecycleError(getInstance(uid));if(error){rosterNotice(error);return;}
  if(rosterUi.selected.has(uid))rosterUi.selected.delete(uid);else rosterUi.selected.add(uid);
  renderParty();document.querySelector?.(`[data-instance-uid="${uid}"]`)?.focus?.();
}
function rosterDuplicateKeepers(){
  // Existing order breaks level ties: the oldest owned individual stays.
  const keep=new Map();for(const ins of save.instances){const prev=keep.get(ins.id);if(!prev||ins.level>prev.level)keep.set(ins.id,ins);}return keep;
}
function rosterSelectableVisible(){
  const visible=rosterVisibleInstances();if(rosterUi.filter!=='duplicates')return visible.filter(i=>!rosterRecycleError(i));
  const keep=rosterDuplicateKeepers();
  return visible.filter(i=>keep.get(i.id)?.uid!==i.uid&&!rosterRecycleError(i));
}
function rosterAllVisibleSelected(){const eligible=rosterSelectableVisible();return eligible.length>0&&eligible.every(i=>rosterUi.selected.has(i.uid));}
function rosterSelectVisible(){
  const eligible=rosterSelectableVisible(),clear=rosterAllVisibleSelected();
  // Enforce the promised keeper even if it was manually selected earlier.
  if(rosterUi.filter==='duplicates'){
    const visibleIds=new Set(rosterVisibleInstances().map(ins=>ins.id));
    for(const [id,ins] of rosterDuplicateKeepers())if(visibleIds.has(id))rosterUi.selected.delete(ins.uid);
  }
  for(const ins of eligible)if(clear)rosterUi.selected.delete(ins.uid);else rosterUi.selected.add(ins.uid);renderParty();
}
function openRosterDetail(uid){ensureRosterState();if(!getInstance(uid))return false;rosterUi.returnFocus=document.activeElement;rosterUi.detailUid=uid;rosterUi.confirmation=null;renderRosterSheet();rosterFocusSheet();return true;}
function closeRosterSheet(){rosterUi.confirmation=null;rosterUi.detailUid=null;renderRosterSheet();const focus=document.querySelector?.(`[data-instance-uid="${rosterUi.returnFocus?.dataset?.instanceUid}"]`);(focus||rosterUi.returnFocus)?.focus?.();if(typeof scheduleContractorRankUpPresentation==='function')scheduleContractorRankUpPresentation();}
function rosterFocusSheet(){document.querySelector?.('#rosterSheetHost [data-sheet-focus]')?.focus?.();}
function rosterSheetKeydown(event){
  if(event.key==='Escape'){event.preventDefault();if(rosterUi.confirmation)backRosterConfirmation();else closeRosterSheet();return;}
  if(event.key!=='Tab')return;
  const nodes=[...event.currentTarget.querySelectorAll('button:not(:disabled),select,[tabindex="0"]')];if(!nodes.length)return;
  const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
function renderRosterSheet(){
  const host=document.getElementById('rosterSheetHost');if(!host)return;
  const focused=document.activeElement?.getAttribute?.('data-roster-action');
  const ins=getInstance(rosterUi.detailUid),confirmation=rosterUi.confirmation;
  let content='';
  if(confirmation){
    const plan=rosterRecyclePlan(confirmation.uids),valid=!plan.error;
    content=`<h2 id="rosterSheetTitle">${confirmation.uids.length}体を変換しますか？</h2><div class="roster-confirm-icons">${confirmation.uids.slice(0,20).map(uid=>{const i=getInstance(uid);return i?`<div>${vis(by(i.id),'loading="lazy"')}<small>${rosterEscape(by(i.id).name)} Lv.${i.level}</small></div>`:'';}).join('')}${confirmation.uids.length>20?`<p>ほか${confirmation.uids.length-20}体</p>`:''}</div><div class="roster-rewards">${rosterEscape(rosterRewardText(valid?plan:confirmation.plan))}</div>${(plan.warnings||[]).map(w=>`<p class="roster-warning">${rosterEscape(w)}</p>`).join('')}<p>選んだ個体は消費され、元に戻せません。</p>${plan.error?`<p role="alert">${rosterEscape(plan.error)}</p>`:''}<div class="roster-sheet-buttons"><button type="button" data-sheet-focus onclick="backRosterConfirmation()">戻る</button><button type="button" class="roster-danger" onclick="confirmRosterRecycle()" ${!valid||rosterUi.busy?'disabled':''}>変換する</button></div>`;
  }else if(ins){
    const mon=by(ins.id),error=rosterRecycleError(ins),skills=getEquippedSkillIds(ins).map(id=>SKILL_BY_ID[id]).filter(Boolean);
    content=`<button type="button" class="roster-sheet-close" data-sheet-focus onclick="closeRosterSheet()" aria-label="詳細を閉じる">閉じる ×</button><div class="roster-detail-portrait">${vis(mon,'loading="lazy"')}</div><h2 id="rosterSheetTitle">${rosterEscape(mon.name)}</h2><p>${isCharacterUnit(mon)?'キャラクター':'モンスター'} / ${mon.rarity} / ${typesHtml(mon.types)}</p><p>Lv.${ins.level} ・ ${isMaxLevel(ins.level)?'EXP MAX':`EXP ${ins.exp}/${needExp(ins.level)}`} ・ 所持 ${save.instances.filter(i=>i.id===ins.id).length}体</p>${instanceAlchemySummary(ins)}<div ${typeof tutorialElnaContractInstance==='function'&&tutorialElnaContractInstance()?.uid===ins.uid?'data-tutorial-elna-instance="true"':''} class="roster-detail-actions"><p data-tutorial-skill-summary>装備技：${skills.map(sk=>rosterEscape(sk.name)).join(' / ')}<br>コスト ${equippedSkillCost(ins)}/${skillCostLimitFor(mon,ins)}</p><button type="button" data-tutorial-skill-edit data-roster-action="skills" onclick="openSkillEdit('${rosterEscape(ins.uid)}')">🃏 技変更</button><details class="roster-data-items"><summary>データを使う</summary>${getDataItems().map(it=>`<button type="button" data-roster-action="${it.id}" onclick="useExpItemOnInstance('${it.id}','${rosterEscape(ins.uid)}')" ${(save.items[it.id]||0)<=0?'disabled':''}>${itemInlineVisual(it)}${it.name} × ${save.items[it.id]||0}</button>`).join('')}</details><button type="button" data-roster-action="lock" onclick="toggleInstanceLock('${rosterEscape(ins.uid)}')">${ins.locked?'🔓 ロック解除':'🔒 ロックする'}</button><button type="button" data-roster-action="convert" onclick="openRosterConfirmation(['${rosterEscape(ins.uid)}'])" ${error?'disabled':''}>変換：${rosterEscape(rosterRewardForInstance(ins))}</button>${error?`<p class="roster-warning">${rosterEscape(error)}</p>`:''}</div><p>${rosterEscape(mon.desc)}</p>`;
  }else rosterUi.detailUid=null;
  const dataOpen=host.querySelector?.('.roster-data-items')?.open;
  host.innerHTML=content?`<div class="roster-sheet-backdrop" onclick="if(event.target===this){if(rosterUi.confirmation)backRosterConfirmation();else closeRosterSheet();}"><section class="roster-sheet" role="dialog" aria-modal="true" aria-labelledby="rosterSheetTitle" onkeydown="rosterSheetKeydown(event)">${content}</section></div>`:'';
  const data=host.querySelector?.('.roster-data-items');if(data)data.open=Boolean(dataOpen);
  for(const id of ['rosterControls','rosterCount','partyList','rosterActions']){const el=document.getElementById(id);if(el)el.inert=Boolean(content);}
  const tabs=document.querySelector?.('#party .monster-section-tabs');if(tabs)tabs.inert=Boolean(content);
  // The sheet replaces its content after lock/data actions without changing the individual.
  if(focused)host.querySelector?.(`[data-roster-action="${focused}"]`)?.focus?.();
}
function openRosterConfirmation(uids=[...rosterUi.selected]){
  ensureRosterState();const plan=rosterRecyclePlan(uids);if(plan.error&&!plan.items){rosterNotice(plan.error);return false;}
  rosterUi.confirmation={uids:[...uids],identity:rosterIdentity(),before:JSON.stringify(save),plan};renderRosterSheet();rosterFocusSheet();return true;
}
function backRosterConfirmation(){rosterUi.confirmation=null;renderRosterSheet();rosterFocusSheet();}
function performRosterRecycle(uids,{identity=rosterIdentity(),before=null}={}){
  if(rosterUi.busy)return {ok:false,error:'変換を処理中です。'};
  if(identity!==rosterIdentity()||(before!==null&&before!==JSON.stringify(save)))return {ok:false,error:'状態が変わりました。内容を確認して選び直してください。'};
  const plan=rosterRecyclePlan(uids);if(plan.error)return {ok:false,error:plan.error};
  const snapshot=captureSaveTransaction(),removed=new Set(uids);rosterUi.busy=true;
  try{
    save.instances=save.instances.filter(i=>!removed.has(i.uid));
    for(const uid of uids)if(save.equippedSkills)delete save.equippedSkills[uid];
    for(const [id,count] of Object.entries(plan.items)){save.items[id]=(save.items[id]||0)+count;registerItemDex(id);}
    save.coins=(save.coins||0)+plan.coins;
    if(save.homeFavoriteId&&!save.instances.some(i=>i.id===save.homeFavoriteId))save.homeFavoriteId=save.instances[0]?.id||null;
    if(!saveGame({requireReadable:true}))throw Error('recycle_save');
  }catch(error){rollbackSaveTransaction(snapshot);return {ok:false,error:'保存できなかったため、変換前の状態に戻しました。'};}
  finally{rosterUi.busy=false;}
  // Clear transient references only after the single durable commit succeeds.
  if(typeof editingSkillUid!=='undefined'&&removed.has(editingSkillUid))editingSkillUid=null;
  if(typeof expeditionSelectedUids!=='undefined')expeditionSelectedUids=expeditionSelectedUids.filter(uid=>!removed.has(uid));
  return {ok:true,items:plan.items,coins:plan.coins,count:uids.length};
}
function confirmRosterRecycle(){
  const confirmation=rosterUi.confirmation;if(!confirmation)return false;
  const result=performRosterRecycle(confirmation.uids,confirmation);
  if(!result.ok){rosterUi.confirmation=null;renderParty();rosterNotice(result.error);rosterFocusSheet();return false;}
  rosterUi.confirmation=null;rosterUi.detailUid=null;rosterUi.selecting=false;rosterUi.selected.clear();
  showCommittedSaveResult(()=>{renderParty();if(typeof updateAppResourceBar==='function')updateAppResourceBar();if(typeof refreshContractorRankUi==='function')refreshContractorRankUi();if(typeof showUiNotice==='function')showUiNotice(`${result.count}体を変換しました`);});
  document.querySelector?.('#rosterActions button')?.focus?.();return true;
}
function rosterScreenChanged(id){
  if(id==='party')return;
  rosterUi.detailUid=null;rosterUi.confirmation=null;rosterUi.selecting=false;rosterUi.selected.clear();
  renderRosterSheet();document.getElementById('party')?.classList?.remove('is-selecting');
}
function instanceAlchemySummary(ins){
  if(!ins?.alchemy) return '';
  const mod = ins.alchemy.statModifiers || {};
  const pct = value => `${value >= 1 ? '+' : ''}${Math.round((Number(value||1)-1)*100)}%`;
  return `<div class="mini"><b>錬成個体：${ins.alchemy.archetypeLabel}</b><br><span class="small">HP ${pct(mod.hp)} / 攻撃 ${pct(mod.attack)} / 素早さ ${pct(mod.speed)}</span></div>`;
}
function toggleInstanceLock(uidValue){
  if(!getInstance(uidValue))return false;
  if(!commitSaveMutation(()=>{const ins=getInstance(uidValue);ins.locked=!ins.locked;}))return false;
  showCommittedSaveResult(()=>{
    renderParty();
    if(typeof renderAlchemy === 'function' && document.getElementById('alchemy')?.classList.contains('active')) renderAlchemy();
  });
  return true;
}
function togglePartyMember(u) {
  if (!(save.party||[]).includes(u)) {
    if (typeof isInstanceOnExpedition === 'function' && isInstanceOnExpedition(u)) { alert('遠征中のモンスターはパーティーに編成できません。'); return; }
    if ((save.party||[]).length >= 3) { alert('パーティーは最大3体まで！'); return; }
    if (!getInstance(u))return false;
  }
  if(!commitSaveMutation(()=>{
    if(!save.party)save.party=[];
    const idx=save.party.indexOf(u);
    if(idx>=0)save.party.splice(idx,1);
    else save.party.push(u);
  }))return false;
  showCommittedSaveResult(()=>{
    renderPartySetup();
    if(typeof refreshTutorialPartyGuide==='function')refreshTutorialPartyGuide();
  });
  return true;
}
function renderPartySetup() {
  const cur  = document.getElementById('currentPartyView');
  const list = document.getElementById('partySelectList');
  if (!cur || !list) return;
  const party = getPartyInstances();
  const tutorialContractUid=typeof tutorialContractInstanceUid==='function'?tutorialContractInstanceUid():null;
  cur.innerHTML = party.length
    ? party.map((ins,i) => { const m=by(ins.id); return `<div class="party-current-member"><span>${i===0?'LEADER':i+1}</span>${vis(m)}<strong>${m.name}</strong><small>Lv.${ins.level}</small></div>`; }).join('')
    : '<p class="small">まだ設定されていません。</p>';
  list.innerHTML = save.instances.map(ins => {
    const m = by(ins.id); if (!m) return '';
    const inParty = (save.party||[]).includes(ins.uid);
    const onExpedition = typeof isInstanceOnExpedition === 'function' && isInstanceOnExpedition(ins.uid);
    return `<article class="party-select-card${inParty?' is-selected':''}${onExpedition?' is-expedition':''}">
      <div class="party-select-visual">${vis(m)}${inParty?'<span>編成中</span>':onExpedition?'<span>遠征中</span>':''}</div><div><h2>${m.name}</h2>
      <p><span class="rarity">${m.rarity}</span> ${typesHtml(m.types)}</p><strong>Lv.${ins.level}</strong><small>${isMaxLevel(ins.level)?'EXP MAX':`EXP ${ins.exp}/${needExp(ins.level)}`}</small></div>
      <button data-monster-id="${m.id}" data-party-uid="${ins.uid}"${ins.uid===tutorialContractUid?' data-tutorial-contract-party="true"':''} onclick="togglePartyMember('${ins.uid}')" ${onExpedition&&!inParty?'disabled':''}>${inParty?'パーティーから外す':onExpedition?'遠征中':'パーティーに入れる'}</button>
    </article>`;
  }).join('');
}

function savePartySetup(){
  const party=typeof getPartyInstances==='function'?getPartyInstances():[];
  if(!party.length||party.length>3){
    if(typeof showUiNotice==='function')showUiNotice('パーティーを1〜3体で編成してください。','warning');
    return false;
  }
  if(typeof canConfirmTutorialParty==='function'&&!canConfirmTutorialParty(party))return false;
  if(typeof saveGame==='function'&&!saveGame()){
    if(typeof showUiNotice==='function')showUiNotice('編成を保存できませんでした。もう一度お試しください。','warning');
    return false;
  }
  renderPartySetup();
  if(typeof handleTutorialPartySaved==='function'&&handleTutorialPartySaved())return true;
  show('home');
  return true;
}

// Legacy callers share the new transaction; the UI uses a single confirmation sheet.
function isLastCharacterInstance(ins){return isCharacterUnit(by(ins?.id))&&save.instances.filter(i=>i.id===ins.id).length===1;}
function characterRecycleReward(ins){return CHARACTER_RECYCLE_REWARDS[(by(ins?.id)?.rarity.match(/★/g)||[]).length];}
function characterRecycleRewardText(ins){return rosterRewardForInstance(ins);}
function characterRecycleError(ins){return !ins||!isCharacterUnit(by(ins.id))?'キャラクターを選択してください。':rosterRecycleError(ins);}
function performCharacterRecycle(uidValue){const error=characterRecycleError(getInstance(uidValue));if(error)return {ok:false,error};return performRosterRecycle([uidValue]);}
function recycleCharacter(uidValue){return openRosterConfirmation([uidValue]);}
