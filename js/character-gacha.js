const CHARACTER_GACHA_SINGLE_COST = 100;
const CHARACTER_GACHA_TEN_COST = 900;
const CHARACTER_GACHA_IDS = Object.freeze(['elna_beginner','stella_apprentice','lumina_apprentice', ...M.filter(unit=>unit.entityKind==='character' && unit.characterNo>=15 && unit.chapter==='序章' && !unit.evolutionOnly).map(unit=>unit.id)]);
function characterGachaPool(){ return CHARACTER_GACHA_IDS.map(id=>M.find(unit=>unit.id===id)).filter(isCharacterUnit); }
function characterGachaRates(){
  const pool=characterGachaPool();
  const weights=pool.map(unit=>({unit,weight:Number.isFinite(unit.gachaWeight)&&unit.gachaWeight>0?unit.gachaWeight:7}));
  const total=weights.reduce((sum,row)=>sum+row.weight,0);
  return weights.map(row=>({...row,rate:row.weight/total}));
}
function pickCharacterGachaUnit(randomFn=Math.random){
  const rates=characterGachaRates();
  if(!rates.length)return null;
  let roll=Math.max(0,Math.min(0.999999999999,Number(randomFn())||0));
  for(const row of rates){roll-=row.rate;if(roll<0)return row.unit;}
  return rates.at(-1).unit;
}
function performCharacterGacha(count,randomFn=Math.random){
  if(count!==1 && count!==10) return {ok:false,error:'回数が正しくありません。'};
  const pool=characterGachaPool();
  const cost=count===10?CHARACTER_GACHA_TEN_COST:CHARACTER_GACHA_SINGLE_COST;
  if(!pool.length) return {ok:false,error:'排出できるキャラクターがありません。'};
  if((save.coins||0)<cost) return {ok:false,error:`コインが${cost-(save.coins||0)}枚足りません。`};
  const units=Array.from({length:count},()=>pickCharacterGachaUnit(randomFn));
  save.coins-=cost;
  const entries=units.map(unit=>{
    const isNew=!caughtHas(unit.id);
    const instance=addInstance(unit.id,1);
    return {unit,instance,isNew};
  });
  return {ok:true,count,cost,entries};
}
// The optional receipt is additive: an absent/null value in any older save means
// there is no interrupted presentation. It never drives acquisition or rerolls.
let characterGachaCommitting=false;
let characterGachaPresentation=null;
let characterGachaSeenReceipt=null;
let characterGachaLockPending=null;
const CHARACTER_GACHA_RECOVERY_KEY=`${SAVE_KEY}_soulContractRecovery_v1`;
function isCharacterGachaPresenting(){
  return Boolean(characterGachaLockPending)||characterGachaCommitting||Boolean(characterGachaPresentation?.owner===save);
}
function cancelPendingCharacterGacha(){ characterGachaLockPending=null; }
function characterGachaStorageKey(){
  return typeof MonsterProfiles!=='undefined'?MonsterProfiles.key(SAVE_KEY):SAVE_KEY;
}
function characterGachaRecoveryKey(){
  return typeof MonsterProfiles!=='undefined'?MonsterProfiles.key(CHARACTER_GACHA_RECOVERY_KEY):CHARACTER_GACHA_RECOVERY_KEY;
}
function readCharacterGachaStorage(key){
  try{return {ok:true,raw:localStorage.getItem(key)};}catch(_error){return {ok:false,raw:null};}
}
function writeCharacterGachaRecovery(raw){
  const key=characterGachaRecoveryKey();
  try{if(raw===null)localStorage.removeItem(key);else localStorage.setItem(key,raw);}catch(_error){}
  const stored=readCharacterGachaStorage(key);
  return stored.ok&&stored.raw===raw;
}
function characterGachaRecoveryRecord(raw){
  if(raw===null)return null;
  try{
    const record=JSON.parse(raw);
    if(record?.version!==1||!['prepared','committed','failed','baseline'].includes(record.status)||
      typeof record.id!=='string'||!isSaveObject(record.before)||!isSaveObject(record.after)||
      record.after.soulContractAppliedId!==record.id||
      (record.status!=='baseline'&&(record.after.soulContractReceipt?.id!==record.id||
      !characterGachaReceiptResult(record.after.soulContractReceipt))))return null;
    return record;
  }catch(_error){return null;}
}
function inspectCharacterGachaRecovery(){
  const stored=readCharacterGachaStorage(characterGachaRecoveryKey());
  if(!stored.ok)return {blocked:true,reason:'unreadable',record:null,raw:null};
  const record=characterGachaRecoveryRecord(stored.raw);
  if(stored.raw!==null&&!record)return {blocked:true,reason:'invalid',record:null,raw:stored.raw};
  if(!record){
    const primary=readCharacterGachaStorage(characterGachaStorageKey());let persisted=null;
    if(!primary.ok)return {blocked:true,reason:'unreadable',record:null,raw:null};
    try{if(primary.ok&&primary.raw!==null)persisted=JSON.parse(primary.raw);}catch(_error){}
    return {blocked:Boolean(save.soulContractAppliedId||persisted?.soulContractAppliedId),reason:'missing',record:null,raw:null,
      canEstablishBaseline:typeof save.soulContractAppliedId==='string'&&Boolean(save.soulContractAppliedId)&&persisted?.soulContractAppliedId===save.soulContractAppliedId};
  }
  const primary=readCharacterGachaStorage(characterGachaStorageKey());
  let persisted=null;
  try{if(primary.ok&&primary.raw!==null)persisted=JSON.parse(primary.raw);}catch(_error){}
  // The marker survives acknowledgment and ordinary progression. Do not test
  // owned UIDs: evolution, fusion and recycling can legitimately consume them.
  const matches=primary.ok&&persisted?.soulContractAppliedId===record.id&&save.soulContractAppliedId===record.id;
  return {blocked:record.status==='failed'||!matches,reason:record.status==='failed'?'failed':'diverged',record,raw:stored.raw};
}
function renderCharacterGachaRecoveryWarning(state=inspectCharacterGachaRecovery()){
  if(!state.blocked)return false;
  const target=document.getElementById('characterGachaResult');
  const importedNote=state.record?.status==='baseline'?'<p>この復旧記録は、この端末で確認した読み込み済みセーブです。元の契約時点の記録ではありません。</p>':'';
  if(target)target.innerHTML='<h2>契約のセーブ記録を確認してください</h2><p>現在のセーブと契約時の記録を照合できないため、新しい契約を停止しました。現在のデータを上書きしたり、仲間を再追加したりしていません。別の画面での更新や保存エラーがないか確認してください。</p>'+
    (state.record?importedNote+'<p>復旧記録を書き出して保管できます。自動復元は行いません。保存に失敗した記録の場合、契約後の内容は確定済みとは限りません。</p><button type="button" onclick="exportCharacterGachaRecovery()">契約時のセーブを書き出す</button><button type="button" onclick="exportCharacterGachaRecovery(\'before\')">契約前のセーブを書き出す</button>':'<p>契約時の記録を読み取れません。現在のデータを書き出して保管してください。</p>')+
    '<button type="button" onclick="exportCharacterGachaRecovery(\'current\')">現在の保存済みセーブを書き出す（保存しない）</button>'+
    (state.canEstablishBaseline?'<p>別の端末から読み込んだセーブの場合、元の契約時点の復旧記録はこの端末にありません。現在の保存済みセーブを確認し、この端末の基準として記録できます。</p><button type="button" onclick="establishCharacterGachaRecoveryBaseline()">読み込んだセーブをこの端末の基準にする</button>':'');
  document.querySelectorAll('[data-character-gacha-count]').forEach(button=>{button.disabled=true;});
  return true;
}
function exportCharacterGachaRecovery(which='after'){
  const state=inspectCharacterGachaRecovery();
  const snapshot=state.record?.[which==='before'?'before':'after'];
  const primary=which==='current'?readCharacterGachaStorage(characterGachaStorageKey()):null;
  const text=which==='current'?(primary.ok?primary.raw:null):(snapshot?JSON.stringify(snapshot,null,2):null);
  if(text===null){alert('保存記録を読み取れませんでした。ブラウザの保存設定を確認してください。');return false;}
  // Unlike exportSaveData, this read-only action must never save the live state.
  downloadTextFile(`soul-contract-${which==='current'?'current':which==='before'?'before':'recovery'}-${new Date().toISOString().slice(0,10)}.json`,text);
  return true;
}
function establishCharacterGachaRecoveryBaseline(){
  if(isCharacterGachaPresenting()||!inspectCharacterGachaRecovery().canEstablishBaseline)return false;
  if(!confirm('元の契約時点の復旧記録はこの端末にありません。現在の保存済みセーブを、この端末で今後の契約に使う基準として記録しますか？仲間・コイン・現在のセーブは変更しません。'))return false;
  return withCharacterGachaLock(()=>{
    if(!inspectCharacterGachaRecovery().canEstablishBaseline)return false;
    const primary=readCharacterGachaStorage(characterGachaStorageKey());let snapshot=null;
    try{if(primary.ok&&primary.raw!==null)snapshot=JSON.parse(primary.raw);}catch(_error){}
    if(!snapshot||snapshot.soulContractAppliedId!==save.soulContractAppliedId)return false;
    const record={version:1,id:snapshot.soulContractAppliedId,status:'baseline',before:snapshot,after:snapshot,previous:null};
    if(!writeCharacterGachaRecovery(JSON.stringify(record))){alert('基準の記録を保存できませんでした。端末の空き容量やブラウザ設定を確認してください。');return false;}
    const target=document.getElementById('characterGachaResult');if(target)target.innerHTML='';
    renderCharacterGacha();return true;
  },false);
}
function rollbackCharacterGachaRecovery(record,previousRaw,previousPrimary){
  if(!record)return;
  const current=readCharacterGachaStorage(characterGachaRecoveryKey());
  if(!current.ok||current.raw===previousRaw)return;
  if(characterGachaRecoveryRecord(current.raw)?.id!==record.id)return;
  const primary=readCharacterGachaStorage(characterGachaStorageKey());
  // Restore/remove a prepared record only if the durable primary is still the
  // exact pre-attempt value. Any intervening writer makes commitment uncertain;
  // retain both snapshots as failed/manual-only instead of deleting evidence.
  if(primary.ok&&previousPrimary.ok&&primary.raw===previousPrimary.raw&&writeCharacterGachaRecovery(previousRaw))return;
  // Failed cleanup is never treated as a fresh draw or silently reapplied.
  const remaining=readCharacterGachaStorage(characterGachaRecoveryKey());
  if(remaining.ok&&characterGachaRecoveryRecord(remaining.raw)?.id===record.id)
    writeCharacterGachaRecovery(JSON.stringify({...record,status:'failed'}));
}
function withCharacterGachaLock(action,failureResult){
  // Command-line tests retain the synchronous primitives. In actual browsers,
  // every draw/acknowledgment must use the same exclusive origin/profile lock.
  // A localStorage spinlock cannot close the check-then-write race across tabs.
  if(typeof navigator==='undefined')return action();
  if(!navigator.locks||typeof navigator.locks.request!=='function'){
    alert('このブラウザでは安全な同時保存を利用できないため、契約を開始できません。対応する最新のブラウザで開き直してください。');
    return failureResult;
  }
  const pending={owner:save,key:characterGachaStorageKey()};
  characterGachaLockPending=pending;
  renderCharacterGacha();
  let entered=false;
  const failed=()=>{
    if(characterGachaLockPending===pending)characterGachaLockPending=null;
    renderCharacterGacha();
    alert(entered?'契約結果の表示を再開できませんでした。画面を開き直して保存済みの結果を確認してください。':'安全な保存の準備に失敗しました。画面を開き直してから契約をやり直してください。');
    return failureResult;
  };
  try{
    return navigator.locks.request(`monster-rpg:character-gacha:${pending.key}`,{mode:'exclusive'},()=>{
      entered=true;
      if(characterGachaLockPending!==pending)return failureResult;
      // Release only the local input guard before the synchronous transaction's
      // own guard. The browser lock remains held until this callback returns.
      characterGachaLockPending=null;
      if(save!==pending.owner||characterGachaStorageKey()!==pending.key){renderCharacterGacha();return failureResult;}
      // Another tab may have committed while this request waited. Re-read the
      // existing profile baseline under the lock, before RNG or acquisition.
      if(typeof MonsterProfiles!=='undefined'&&!MonsterProfiles.beforeSave()){
        renderCharacterGacha();return failureResult;
      }
      return action();
    }).catch(failed);
  }catch(_error){return failed();}
}
function characterGachaReceiptResult(receipt=save.soulContractReceipt){
  if(!receipt||receipt.version!==1||typeof receipt.id!=='string'||!receipt.id||
    ![1,10].includes(receipt.count)||!Array.isArray(receipt.entries)||receipt.entries.length!==receipt.count||
    receipt.cost!==(receipt.count===10?CHARACTER_GACHA_TEN_COST:CHARACTER_GACHA_SINGLE_COST))return null;
  const seen=new Set(),entries=[];
  for(const entry of receipt.entries){
    const unit=M.find(candidate=>candidate.id===entry?.unitId);
    if(!unit||!isCharacterUnit(unit)||typeof entry.instanceUid!=='string'||!entry.instanceUid||
      seen.has(entry.instanceUid)||typeof entry.isNew!=='boolean'||typeof entry.locked!=='boolean')return null;
    seen.add(entry.instanceUid);
    // Keep the acquisition snapshot even if the player later evolves/recycles it.
    // Recovery must never recreate an instance that is no longer in inventory.
    entries.push({unit,instance:{uid:entry.instanceUid,id:entry.unitId,level:1,exp:0,locked:entry.locked},isNew:entry.isNew});
  }
  return {ok:true,count:receipt.count,cost:receipt.cost,receiptId:receipt.id,entries};
}
function characterGachaReceiptWasSeen(){
  return Boolean(characterGachaSeenReceipt?.owner===save&&characterGachaSeenReceipt.id===save.soulContractReceipt?.id);
}
function refreshCharacterGachaResources(){
  if(typeof updateAppResourceBar==='function')updateAppResourceBar();
  // addInstance also grants skill cards, catalog EXP and pending Rank ups. They
  // all belong to the staged save; refresh after rollback as well as success.
  if(typeof refreshContractorRankUi==='function')refreshContractorRankUi();
}
function persistCharacterGachaSave(beforePrimaryWrite=null){
  const originalStorageSet=safeStorageSet;
  if(beforePrimaryWrite)safeStorageSet=(key,raw)=>key===SAVE_KEY&&!beforePrimaryWrite(raw)?false:originalStorageSet(key,raw);
  let saved=false;
  try{saved=saveGame();}catch(error){if(typeof console!=='undefined')console.warn('Soul Contract save failed',error);}
  finally{if(beforePrimaryWrite)safeStorageSet=originalStorageSet;}
  if(saved)return true;
  // A storage write can succeed before an after-save hook throws. A byte-for-
  // byte read-back proves commitment; rolling that transaction back would let a
  // subsequent click charge/acquire again. Never overwrite a conflicting save.
  try{
    const raw=JSON.stringify(save);
    if(safeStorageGet(SAVE_KEY)!==raw)return false;
    // Failure of a notification hook cannot undo verified durable storage.
    if(typeof MonsterProfiles!=='undefined'){
      try{MonsterProfiles.afterSave(raw);}catch(_error){}
    }
    return true;
  }catch(_error){return false;}
}
function commitCharacterGacha(count,randomFn=Math.random){
  if(isCharacterGachaPresenting())return {ok:false,busy:true,error:'契約の結果を確認してください。'};
  const recovery=inspectCharacterGachaRecovery();
  if(recovery.blocked)return {ok:false,recovery:true,error:'契約のセーブ記録を照合できません。契約画面から記録を書き出して保管してください。'};
  if(save.soulContractReceipt&&!characterGachaReceiptWasSeen())return {ok:false,pending:true,error:'保存された契約の結果を先に確認してください。'};
  const previousSave=save,previousReport=saveRecoveryReport;
  const previousPrimary=readCharacterGachaStorage(characterGachaStorageKey());
  if(!previousPrimary.ok)return {ok:false,recovery:true,error:'セーブを読み取れないため契約を停止しました。'};
  let recoveryRecord=null,recoveryPrepared=false;
  characterGachaCommitting=true;
  try{
    // Staging the entire object includes addInstance side effects, custom fields,
    // and saveGame's repairs without damaging live objects when saving fails.
    save=JSON.parse(JSON.stringify(previousSave));
    saveRecoveryReport=previousReport.slice();
    const result=performCharacterGacha(count,randomFn);
    if(!result.ok){save=previousSave;saveRecoveryReport=previousReport;return result;}
    // saveGame repairs duplicate UIDs. Resolve them before snapshotting the
    // receipt too, so even a rare legacy UID collision records the real IDs.
    repairSave(save,saveRecoveryReport);
    const receipt={version:1,id:`character_gacha:${result.entries.map(entry=>entry.instance.uid).join(':')}`,
      count:result.count,cost:result.cost,entries:result.entries.map(({unit,instance,isNew})=>({
        unitId:unit.id,instanceUid:instance.uid,isNew,locked:instance.locked===true
      }))};
    save.soulContractReceipt=receipt;
    save.soulContractAppliedId=receipt.id;
    const persisted=persistCharacterGachaSave(raw=>{
      // Capture saveGame's exact finalized JSON (including grants, repairs and
      // integrity hash), and verify an independent durable copy BEFORE setItem.
      // Retain one prior envelope until success; never build a history chain.
      const previous=recovery.record?{version:1,id:recovery.record.id,status:recovery.record.status,
        before:recovery.record.before,after:recovery.record.after}:null;
      recoveryRecord={version:1,id:receipt.id,status:'prepared',before:JSON.parse(JSON.stringify(previousSave)),after:JSON.parse(raw),previous};
      recoveryPrepared=writeCharacterGachaRecovery(JSON.stringify(recoveryRecord));
      return recoveryPrepared;
    });
    if(!persisted||!recoveryPrepared)throw new Error('契約結果または復旧用の記録を保存できませんでした。');
    // Compaction is optional: if it fails, the verified prepared envelope still
    // contains the exact committed snapshot and at most one prior envelope.
    writeCharacterGachaRecovery(JSON.stringify({...recoveryRecord,status:'committed',previous:null}));
    characterGachaSeenReceipt=null;
    return {...result,receiptId:receipt.id};
  }catch(error){
    if(typeof console!=='undefined')console.warn('Soul Contract transaction failed',error);
    save=previousSave;saveRecoveryReport=previousReport;
    rollbackCharacterGachaRecovery(recoveryRecord,recovery.raw,previousPrimary);
    if(inspectCharacterGachaRecovery().blocked)return {ok:false,recovery:true,error:'保存状態を確認できないため新しい契約を停止しました。契約画面から復旧記録と現在の保存済みセーブを書き出して保管してください。'};
    return {ok:false,error:'保存できなかったため、コインと仲間を契約前の状態に戻しました。端末の空き容量やブラウザ設定を確認してください。'};
  }finally{
    characterGachaCommitting=false;
    refreshCharacterGachaResources();
  }
}
function showCharacterGacha(){ show('characterGacha'); }
function renderCharacterGacha(){
  const pool=characterGachaPool();
  document.getElementById('characterGachaCoinView').textContent=save.coins||0;
  document.getElementById('characterGachaPoolSummary').textContent=`全${pool.length}形態・個別の排出率は下記のとおりです。10連も1回ごとに同じ確率で抽選します。`;
  document.getElementById('characterGachaRateList').innerHTML=characterGachaRates().map(({unit,rate})=>`<article class="character-gacha-card">${vis(unit,'loading="lazy" decoding="async"')}<strong>${unit.name}</strong><small>${unit.rarity} / ${(rate*100).toFixed(2)}%</small></article>`).join('');
  document.querySelectorAll('[data-character-gacha-count]').forEach(button=>{
    const cost=Number(button.dataset.characterGachaCount)===10?CHARACTER_GACHA_TEN_COST:CHARACTER_GACHA_SINGLE_COST;
    button.disabled=isCharacterGachaPresenting()||!pool.length||(save.coins||0)<cost;
  });
  recoverCharacterGachaReceipt();
}
function renderCharacterGachaResults(result,{recovered=false}={}){
  const target=document.getElementById('characterGachaResult');
  if(!target)return false;
  target.innerHTML=`<h2>${result.count}体が仲間になりました</h2>${recovered?'<p>保存済みの契約結果です。コインや仲間の追加処理は行っていません。</p>':''}<div class="character-gacha-grid">${result.entries.map(({unit,isNew,instance})=>`<article class="character-gacha-card">${vis(unit)}<strong>${unit.name}</strong><small>${unit.rarity} / Lv.1</small><span>${isNew?'NEW・図鑑登録':'同じ形態の別個体を獲得'}${instance.locked?'・🔒 自動ロック':''}</span></article>`).join('')}</div><button onclick="show('partySet')">編成する</button><button type="button" onclick="acknowledgeCharacterGachaReceipt()">結果を確認して閉じる</button>`;
  characterGachaSeenReceipt={owner:save,id:result.receiptId};
  if(typeof replayUiMotion==='function')replayUiMotion(target,'ui-reward-pop',850);
  target.scrollIntoView?.({block:'start'});
  return true;
}
function recoverCharacterGachaReceipt(){
  const recovery=inspectCharacterGachaRecovery();
  if(recovery.blocked){renderCharacterGachaRecoveryWarning(recovery);return null;}
  if(isCharacterGachaPresenting()||!save.soulContractReceipt)return null;
  const result=characterGachaReceiptResult();
  if(!result){
    // Retain unsupported/corrupt receipts for export and diagnosis. Never replace
    // them with a new draw, silently clear them, or guess missing acquisitions.
    const target=document.getElementById('characterGachaResult');
    if(target)target.textContent='保存された契約結果を読み取れません。セーブ管理からデータを書き出して保管してください。';
    return null;
  }
  if(!characterGachaReceiptWasSeen())renderCharacterGachaResults(result,{recovered:true});
  return result;
}
function acknowledgeCharacterGachaReceipt(){
  if(renderCharacterGachaRecoveryWarning())return false;
  if(isCharacterGachaPresenting()||!characterGachaReceiptWasSeen()||!characterGachaReceiptResult())return false;
  return withCharacterGachaLock(acknowledgeCharacterGachaReceiptCommitted,false);
}
function acknowledgeCharacterGachaReceiptCommitted(){
  if(renderCharacterGachaRecoveryWarning())return false;
  if(isCharacterGachaPresenting()||!characterGachaReceiptWasSeen()||!characterGachaReceiptResult())return false;
  const previousSave=save,previousReport=saveRecoveryReport;
  characterGachaCommitting=true;
  let saved=false;
  try{
    save=JSON.parse(JSON.stringify(previousSave));
    saveRecoveryReport=previousReport.slice();
    save.soulContractReceipt=null;
    saved=persistCharacterGachaSave();
  }catch(_error){saved=false;}
  if(!saved){
    save=previousSave;saveRecoveryReport=previousReport;
  }else{
    characterGachaSeenReceipt=null;
    const target=document.getElementById('characterGachaResult');
    if(target)target.innerHTML='';
  }
  characterGachaCommitting=false;
  refreshCharacterGachaResources();
  renderCharacterGacha();
  if(!saved)alert('結果の確認を保存できませんでした。仲間とコインは保存済みです。結果の記録を残しています。');
  return saved;
}
function rollCharacterGacha(count){
  if(isCharacterGachaPresenting())return {ok:false,busy:true};
  if(renderCharacterGachaRecoveryWarning())return {ok:false,recovery:true};
  if(save.soulContractReceipt&&!characterGachaReceiptWasSeen()){
    const recovered=recoverCharacterGachaReceipt();
    return recovered?{...recovered,recovered:true}:{ok:false,pending:true};
  }
  return withCharacterGachaLock(()=>rollCharacterGachaCommitted(count),{ok:false,blocked:true});
}
function rollCharacterGachaCommitted(count){
  if(isCharacterGachaPresenting())return {ok:false,busy:true};
  const result=commitCharacterGacha(count);
  if(!result.ok){if(!result.busy)alert(result.error);renderCharacterGacha();return result;}
  if(renderCharacterGachaRecoveryWarning())return {...result,recovery:true};
  const session={owner:save,id:result.receiptId};
  characterGachaPresentation=session;
  renderCharacterGacha();
  const finish=()=>{
    // Late/cancelled callbacks may not affect a new profile, imported save, or
    // later contract. The saved receipt alone is the final-result authority.
    if(characterGachaPresentation!==session)return;
    characterGachaPresentation=null;
    if(save!==session.owner||save.soulContractReceipt?.id!==session.id)return;
    const committed=characterGachaReceiptResult();
    if(committed)renderCharacterGachaResults(committed);
    renderCharacterGacha();
    refreshCharacterGachaResources();
  };
  try{
    if(typeof playSoulContractPresentation==='function'){
      const presentation=playSoulContractPresentation(result,finish);
      if(presentation===false)finish();
      else if(presentation&&typeof presentation.catch==='function')presentation.catch(finish);
    }else finish();
  }catch(_error){
    if(typeof cancelSoulContractPresentation==='function'){
      try{cancelSoulContractPresentation();}catch(_cancelError){}
    }
    finish();
  }
  return result;
}
if(typeof globalThis.addEventListener==='function')globalThis.addEventListener('storage',event=>{
  if(event.key!==null&&event.key!==characterGachaStorageKey()&&event.key!==characterGachaRecoveryKey())return;
  if(!inspectCharacterGachaRecovery().blocked)return;
  cancelPendingCharacterGacha();
  if(typeof cancelSoulContractPresentation==='function')cancelSoulContractPresentation();
  if(document.querySelector?.('.screen.active')?.id==='characterGacha')renderCharacterGacha();
});
