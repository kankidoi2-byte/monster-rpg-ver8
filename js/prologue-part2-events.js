/* Isolated prologue operations. Loan cards never enter the private inventory. */
const ProloguePart2Events=(()=>{
  const LOANS=Object.freeze(['s110_001','s110_002','s110_008']);
  const SYNTHESIS_RESULT='s110_061';
  let shopSession=null,selection=new Set(),selectionOwner=null,operationBusy=false;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const identity=()=>typeof saveTransactionIdentity==='function'?saveTransactionIdentity():'';
  const episode=id=>prologuePart2EpisodeState(id)||{};
  function grants(id){const state=prologuePart2WritableEpisode(id);if(!state.grants||typeof state.grants!=='object')state.grants={};return state.grants;}
  function notice(text){if(typeof showUiNotice==='function')showUiNotice(text,'error');else if(typeof alert==='function')alert(text);}
  function replay(){return typeof prologuePart2Ui!=='undefined'&&prologuePart2Ui?.replay===true;}
  function contextMatches(eventId){return typeof prologuePart2Step==='function'&&prologuePart2Step()?.id===eventId;}
  function resetSelection(){if(selectionOwner!==save){selectionOwner=save;selection=new Set();}}
  function shopActive(){return Boolean(shopSession&&shopSession.owner===save&&shopSession.identity===identity()&&contextMatches(shopSession.eventId));}
  function openShop(eventId='pb_08_shop'){
    if(!contextMatches(eventId))return false;
    // Replay can revisit the ordinary shop, but cannot rewrite the original branch.
    shopSession={eventId,owner:save,identity:identity(),replay:replay()};
    showShop();return true;
  }
  function recordShopPurchase(){
    // Called INSIDE buyItem's existing atomic consumption/acquisition transaction.
    if(shopActive()&&!shopSession.replay)prologuePart2WritableEpisode('pb_08').shopPurchased=true;
  }
  function shopReturnMarkup(){return shopActive()?'<button type="button" data-prologue-shop-return onclick="ProloguePart2Events.finishShop()">物語に戻る</button>':'';}
  function finishShop(){
    if(!shopActive())return false;
    const session=shopSession;
    const ok=prologuePart2AdvanceEvent(session.eventId,{mutate:()=>{prologuePart2WritableEpisode('pb_08').shopVisited=true;},onSaved:()=>{shopSession=null;prologuePart2Return();}});
    if(ok)shopSession=null;return ok;
  }
  function shopPurchased(){return episode('pb_08').shopPurchased===true;}
  function trainingModel(){
    resetSelection();
    return {materials:LOANS.map(id=>({id,name:SKILL_BY_ID[id]?.name||id,count:1,selected:selection.has(id)})),selected:[...selection],ready:LOANS.every(id=>selection.has(id)),receipt:episode('pb_11').grants?.skillSynthesis||null};
  }
  function synthesisMarkup(eventId='pb_11_synthesis'){
    const model=trainingModel();
    return `<section class="panel prologue-synthesis" aria-label="技合成の実習"><p>実習用の3枚を選んで合成します。手持ちのカードやコインは使いません。</p><div role="group" aria-label="実習用の技カード">${model.materials.map(card=>`<button type="button" data-prologue-loan="${card.id}" aria-pressed="${card.selected}" onclick="ProloguePart2Events.toggleSynthesisMaterial('${card.id}')">${escape(card.name)} ×1${card.selected?' ✓':''}</button>`).join('')}</div><p data-prologue-selection-count>${model.selected.length} / 3枚</p><button type="button" data-prologue-synthesize onclick="ProloguePart2Events.synthesize('${escape(eventId)}')" ${model.ready?'':'disabled'}>選んだ3枚で合成する</button></section>`;
  }
  function toggleSynthesisMaterial(id){
    if(operationBusy||!LOANS.includes(id))return false;
    resetSelection();if(selection.has(id))selection.delete(id);else selection.add(id);
    if(typeof document!=='undefined'){
      for(const button of document.querySelectorAll('[data-prologue-loan]')){
        const selected=selection.has(button.dataset.prologueLoan);button.setAttribute('aria-pressed',String(selected));
        button.textContent=`${SKILL_BY_ID[button.dataset.prologueLoan]?.name||button.dataset.prologueLoan} ×1${selected?' ✓':''}`;
      }
      const count=document.querySelector('[data-prologue-selection-count]');if(count)count.textContent=`${selection.size} / 3枚`;
      const submit=document.querySelector('[data-prologue-synthesize]');if(submit)submit.disabled=selection.size!==3;
    }
    return true;
  }
  function grantSynthesis(selectedIds){
    if(!Array.isArray(selectedIds)||selectedIds.length!==3||new Set(selectedIds).size!==3||!LOANS.every(id=>selectedIds.includes(id)))throw Error('実習用の3枚を選んでください。');
    const receipts=grants('pb_11');
    if(receipts.skillSynthesis)return receipts.skillSynthesis;
    grantSkillCards(SYNTHESIS_RESULT,1);
    const receipt={id:'pb_11_skill_synthesis_v1',resultId:SYNTHESIS_RESULT,count:1,materials:LOANS.slice()};
    receipts.skillSynthesis=receipt;prologuePart2WritableEpisode('pb_11').trainingSeen=true;
    return receipt;
  }
  function synthesize(eventId='pb_11_synthesis'){
    if(operationBusy||!contextMatches(eventId))return false;
    const model=trainingModel();if(!model.ready){notice('実習用の3枚を選んでください。');return false;}
    operationBusy=true;
    try{
      const ok=prologuePart2AdvanceEvent(eventId,{mutate:()=>grantSynthesis(model.selected)});
      if(ok)selection=new Set();return ok;
    }finally{operationBusy=false;}
  }
  function synthesisResultMarkup(){
    const receipt=episode('pb_11').grants?.skillSynthesis,card=SKILL_BY_ID[receipt?.resultId];
    return card?`<section class="panel" data-prologue-synthesis-result><strong>${escape(card.name)}</strong><p>1枚獲得しました</p><button type="button" onclick="prologuePart2ShowParty()">装備できる仲間を見る</button></section>`:'';
  }
  function equipmentCandidates(){
    const card=SKILL_BY_ID[SYNTHESIS_RESULT];
    if(!card||typeof isSkillAllowedForMonster!=='function')return [];
    return (save.instances||[]).filter(ins=>{
      const mon=by(ins.id);if(!mon||!isSkillAllowedForMonster(card.id,mon))return false;
      const ids=getEquippedSkillIds(ins);
      return !ids.includes(card.id)&&ids.length<3&&equippedSkillCost(ins)+card.cost<=skillCostLimitFor(mon,ins)&&availableSkillCount(card.id)>0;
    });
  }
  function synthesisEquipMarkup(eventId){
    const candidates=equipmentCandidates();
    return `<section class="panel"><h3>捨て身打ち</h3>${candidates.length?`<p>装備できる仲間：${candidates.map(ins=>escape(by(ins.id)?.name||ins.id)).join('、')}</p>`:''}<button type="button" onclick="prologuePart2ShowParty()">仲間の技装備を確認</button><button type="button" onclick="prologuePart2AdvanceEvent('${escape(eventId)}')">物語を続ける</button></section>`;
  }
  function characterReceipt(){return episode('pb_ep').grants?.freeCharacter||null;}
  function receiptResult(receipt=characterReceipt()){
    if(!receipt||typeof receipt.unitId!=='string'||typeof receipt.instanceUid!=='string')return null;
    const unit=M.find(candidate=>candidate.id===receipt.unitId);if(!unit||!isCharacterUnit(unit))return null;
    return {ok:true,count:1,cost:0,receiptId:receipt.id,entries:[{unit,instance:{uid:receipt.instanceUid,id:unit.id,level:1,exp:0,locked:receipt.locked===true},isNew:receipt.isNew===true}]};
  }
  function characterResultMarkup(){
    const result=receiptResult();if(!result)return '';
    const entry=result.entries[0];
    return `<section class="panel" data-prologue-character-result>${typeof vis==='function'?vis(entry.unit):''}<strong>${escape(entry.unit.name)}</strong><p>${entry.isNew?'NEW・図鑑登録':'同じ形態の別個体を獲得'}</p></section>`;
  }
  function grantCharacter(randomFn=Math.random){
    const receipts=grants('pb_ep');if(receipts.freeCharacter)return receipts.freeCharacter;
    const unit=pickCharacterGachaUnit(randomFn);if(!unit)throw Error('排出できるキャラクターがありません。');
    const isNew=!caughtHas(unit.id),instance=addInstance(unit.id,1);
    // Same acquisition helper and weighted pool as the ordinary character draw.
    // This permanent receipt is also the story's draw history; ordinary receipts
    // and their recovery journal remain unchanged, including pending paid draws.
    const receipt={id:`pb_ep_character:${instance.uid}`,unitId:unit.id,instanceUid:instance.uid,isNew,locked:instance.locked===true,cost:0,count:1};
    receipts.freeCharacter=receipt;return receipt;
  }
  function drawCharacterCommitted(eventId,randomFn){
    if(!contextMatches(eventId))return {ok:false,busy:true};
    if(typeof isCharacterGachaPresenting==='function'&&isCharacterGachaPresenting())return {ok:false,busy:true};
    if(typeof inspectCharacterGachaRecovery==='function'&&inspectCharacterGachaRecovery().blocked){notice('契約の保存記録を先に確認してください。');return {ok:false,recovery:true};}
    let result=null,roll;
    const onceRandom=()=>roll??=(Number(randomFn())||0);
    const already=characterReceipt(),isReplay=replay();
    const ok=prologuePart2AdvanceEvent(eventId,{mutate:()=>{result=receiptResult(grantCharacter(onceRandom));}});
    if(!ok)return {ok:false};
    result=result||receiptResult();
    if(!result)return {ok:true,replay:isReplay};
    if(!already&&!isReplay&&typeof playSoulContractPresentation==='function'){
      // The cursor and exact result are durable BEFORE animation. Closing or
      // reloading this presentation never repeats RNG or acquisition.
      try{playSoulContractPresentation(result,()=>{});}catch(error){console.warn('Saved story contract presentation failed',error);}
    }
    return {...result,recovered:Boolean(already),replay:isReplay};
  }
  function drawCharacter(eventId='pb_ep_gacha_draw',randomFn=Math.random){
    if(operationBusy||!contextMatches(eventId))return {ok:false,busy:true};
    const context=prologuePart2Ui,owner=save,profile=identity();
    const action=()=>{
      if(prologuePart2Ui!==context||save!==owner||identity()!==profile||!contextMatches(eventId))return {ok:false,cancelled:true};
      if(typeof MonsterProfiles!=='undefined'&&!MonsterProfiles.beforeSave())return {ok:false,conflict:true};
      return drawCharacterCommitted(eventId,randomFn);
    };
    if(typeof navigator!=='undefined'&&(!navigator.locks||typeof navigator.locks.request!=='function')){notice('このブラウザでは契約を開始できません。最新のブラウザで開き直してください。');return {ok:false,unsupported:true};}
    operationBusy=true;
    if(typeof navigator==='undefined'){try{return action();}finally{operationBusy=false;}}
    try{return navigator.locks.request(`monster-rpg:character-gacha:${characterGachaStorageKey()}`,{mode:'exclusive'},action)
      .catch(error=>{notice('安全な保存の準備に失敗しました。');return {ok:false,error:String(error)};}).finally(()=>{operationBusy=false;});}
    catch(error){operationBusy=false;notice('安全な保存の準備に失敗しました。');return {ok:false,error:String(error)};}
  }
  return Object.freeze({openShop,shopActive,recordShopPurchase,shopReturnMarkup,finishShop,shopPurchased,trainingModel,synthesisMarkup,toggleSynthesisMaterial,synthesize,grantSynthesis,synthesisResultMarkup,equipmentCandidates,synthesisEquipMarkup,characterReceipt,receiptResult,characterResultMarkup,grantCharacter,drawCharacter});
})();
