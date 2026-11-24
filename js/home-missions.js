// Home missions are claim receipts, separate from tutorial/progression missions.
const HOME_MISSIONS=Object.freeze([
  Object.freeze({id:'prologue_clear',name:'序章ストーリーをクリアする',reward:500}),
  Object.freeze({id:'alchemy_once',name:'錬成を 1 回実行する',reward:500})
]);
function homeMissionStoryProgress(){
  const number=typeof currentStoryEpisode==='function'?currentStoryEpisode()?.number:null;
  return Number.isInteger(number)&&number>0?`序章 第${number}話を進行中`:'序章ストーリーを進めよう';
}
function syncHomeMissionDialogTimer(){
  if(typeof syncHomeBannerTimer==='function')syncHomeBannerTimer();
}
function homeMissionRows(){
  const state=normalizeHomeMissions(save.homeMissions,save);
  const prologueFlag=save.progress?.storyFlags?.prologueCompleted??save.progress?.tutorial?.prologueCompleted;
  return HOME_MISSIONS.map(mission=>{
    // This is deliberately the existing first-half completion/skip flag, not part 2.
    const complete=mission.id==='prologue_clear'?prologueFlag===true:state.alchemyCount>=1;
    return {...mission,state:state.claimedIds.includes(mission.id)?'claimed':complete?'ready':'locked',progress:mission.id==='alchemy_once'?`${Math.min(state.alchemyCount,1)} / 1 回`:homeMissionStoryProgress()};
  });
}
function updateHomeMissionBadge(){
  const count=homeMissionRows().filter(row=>row.state==='ready').length;
  const badge=document.getElementById('homeMissionCount');
  if(badge){badge.textContent=String(count);badge.hidden=count===0;}
  const button=document.getElementById('homeMissionButton');
  if(button)button.setAttribute('aria-label',count?`ミッション・受け取り可能 ${count} 件`:'ミッション');
}
function renderHomeMissions(){
  const list=document.getElementById('homeMissionsList');
  if(list)list.innerHTML=homeMissionRows().map(row=>`<div class="home-mission-row" data-state="${row.state}"><div class="home-mission-copy"><h3>${row.name}</h3><div class="home-mission-reward">コイン ${row.reward}枚</div>${row.state==='locked'?`<small class="home-mission-progress">${row.progress}</small>`:''}</div>${row.state==='ready'?`<button type="button" class="home-mission-claim" onclick="claimHomeMission('${row.id}')">受け取る</button>`:`<span class="home-mission-status">${row.state==='claimed'?'受け取り済み':'未達成'}</span>`}</div>`).join('');
  updateHomeMissionBadge();
}
function showHomeMissions(){
  renderHomeMissions();
  const sheet=document.getElementById('homeMissionsSheet');
  if(sheet&&!sheet.open){
    if(!sheet.dataset.missionCloseBound){
      // Native Escape also fires close; resume banner cycling for that path too.
      sheet.addEventListener('close',syncHomeMissionDialogTimer);
      sheet.dataset.missionCloseBound='true';
    }
    sheet.showModal();
    document.getElementById('homeMissionsClose')?.focus();
    syncHomeMissionDialogTimer();
  }
}
function closeHomeMissions(){
  const sheet=document.getElementById('homeMissionsSheet');
  if(!sheet?.open||typeof sheet.close!=='function')return;
  sheet.close();
  syncHomeMissionDialogTimer();
}
function claimHomeMission(id){
  const mission=homeMissionRows().find(row=>row.id===id&&row.state==='ready');
  if(!mission)return false;
  const committed=commitSaveMutation(()=>{
    // Re-evaluate at the commit boundary, never accept a UI-provided amount.
    if(!homeMissionRows().some(row=>row.id===id&&row.state==='ready'))throw new Error('mission_not_claimable');
    save.homeMissions=normalizeHomeMissions(save.homeMissions,save);
    save.homeMissions.claimedIds.push(id);
    const coins=save.coins+mission.reward;
    if(!Number.isSafeInteger(coins))throw new Error('mission_coin_limit');
    save.coins=coins;
  },{requireReadable:true});
  if(!committed)return false;
  showCommittedSaveResult(()=>{
    renderHomeMissions();
    if(typeof updateAppResourceBar==='function')updateAppResourceBar();
    // Replacing the claimed button must not strand keyboard focus on the body.
    const sheet=document.getElementById('homeMissionsSheet');
    if(sheet?.open)document.getElementById('homeMissionsClose')?.focus();
    if(typeof showUiNotice==='function')showUiNotice(`${mission.reward} コインを受け取りました。`,'success');
  });
  return true;
}
