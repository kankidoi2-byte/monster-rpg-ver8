/* ===== 契約者Rank・称号 基盤 ===== */
const CONTRACTOR_RANK_SYSTEM_VERSION = 1;
const CONTRACTOR_MAX_RANK = 50;

const CONTRACTOR_TITLE_CATALOG = Object.freeze([
  Object.freeze({id:'rank_05_full_contractor',name:'一人前の契約者',category:'rank',rank:5,description:'契約者として確かな一歩を刻んだ証。'}),
  Object.freeze({id:'rank_10_veteran_contractor',name:'熟練契約者',category:'rank',rank:10,description:'数多くの経験を積んだ契約者の証。'}),
  Object.freeze({id:'rank_15_advanced_contractor',name:'上級契約者',category:'rank',rank:15,description:'卓越した経験を備えた契約者の証。'}),
  Object.freeze({id:'rank_20_contract_master',name:'契約の達人',category:'rank',rank:20,description:'契約の道を深く究めた者の証。'}),
  Object.freeze({id:'rank_30_hundred_beasts',name:'百獣の契約者',category:'rank',rank:30,description:'多くのモンスターと縁を結んだ者の証。'}),
  Object.freeze({id:'rank_40_legendary_contractor',name:'伝説の契約者',category:'rank',rank:40,description:'その歩みが伝説として語られる契約者の証。'}),
  Object.freeze({id:'rank_50_star_binder',name:'星を結ぶ契約者',category:'rank',rank:50,description:'星々を結ぶほどの契約を成し遂げた者の証。'})
]);

function contractorExpToNextRank(rank){
  const normalized=Math.max(1,Math.min(CONTRACTOR_MAX_RANK,Math.floor(Number(rank)||1)));
  return normalized>=CONTRACTOR_MAX_RANK?0:100+(normalized-1)*50;
}

function contractorCumulativeExpForRank(rank){
  const normalized=Math.max(1,Math.min(CONTRACTOR_MAX_RANK,Math.floor(Number(rank)||1)));
  const advances=normalized-1;
  return advances*100+25*advances*(advances-1);
}

const CONTRACTOR_MAX_EXP = contractorCumulativeExpForRank(CONTRACTOR_MAX_RANK);

function contractorRankFromExp(totalExp){
  const exp=Math.max(0,Math.min(CONTRACTOR_MAX_EXP,Math.floor(Number(totalExp)||0)));
  let rank=1;
  while(rank<CONTRACTOR_MAX_RANK&&exp>=contractorCumulativeExpForRank(rank+1))rank++;
  return rank;
}

function contractorRankProgress(totalExp){
  const exp=Math.max(0,Math.min(CONTRACTOR_MAX_EXP,Math.floor(Number(totalExp)||0)));
  const rank=contractorRankFromExp(exp);
  if(rank>=CONTRACTOR_MAX_RANK)return {rank,exp,totalExp:exp,currentExp:0,requiredExp:0,remainingExp:0,ratio:1,isMax:true};
  const floor=contractorCumulativeExpForRank(rank);
  const requiredExp=contractorExpToNextRank(rank);
  const currentExp=exp-floor;
  return {rank,exp,totalExp:exp,currentExp,requiredExp,remainingExp:requiredExp-currentExp,ratio:requiredExp?currentExp/requiredExp:1,isMax:false};
}

function ensureContractorState(){
  if(!save.contractor||typeof save.contractor!=='object'||Array.isArray(save.contractor))save.contractor=contractorSaveDefaults();
  save.contractor.systemVersion=Math.max(CONTRACTOR_RANK_SYSTEM_VERSION,Math.floor(Number(save.contractor.systemVersion)||0));
  if(!Array.isArray(save.contractor.claimedRankRewards))save.contractor.claimedRankRewards=[];
  if(!Array.isArray(save.contractor.expEventIds))save.contractor.expEventIds=[];
  if(!Array.isArray(save.contractor.unlockedTitleIds))save.contractor.unlockedTitleIds=[];
  if(!Array.isArray(save.contractor.recentExp))save.contractor.recentExp=[];
  save.contractor.exp=Math.max(0,Math.min(CONTRACTOR_MAX_EXP,Math.floor(Number(save.contractor.exp)||0)));
  return save.contractor;
}

function contractorTitleById(titleId){return CONTRACTOR_TITLE_CATALOG.find(title=>title.id===titleId)||null;}

function unlockContractorTitle(titleId){
  const state=ensureContractorState();
  const title=contractorTitleById(titleId);
  if(!title||state.unlockedTitleIds.includes(titleId))return false;
  state.unlockedTitleIds.push(titleId);
  return true;
}

function syncContractorRankTitles(){
  const state=ensureContractorState();
  const rank=contractorRankFromExp(state.exp);
  const unlocked=[];
  CONTRACTOR_TITLE_CATALOG.filter(title=>title.category==='rank'&&rank>=title.rank).forEach(title=>{
    if(unlockContractorTitle(title.id))unlocked.push(title.id);
  });
  return unlocked;
}

function equipContractorTitle(titleId){
  const state=ensureContractorState();
  if(titleId===null||titleId===''){state.equippedTitleId=null;return true;}
  if(!contractorTitleById(titleId)||!state.unlockedTitleIds.includes(titleId))return false;
  state.equippedTitleId=titleId;
  return true;
}

function equippedContractorTitle(){
  const state=ensureContractorState();
  return contractorTitleById(state.equippedTitleId);
}

function grantContractorExp(amount,{source='other',eventId=null,awardedAt=null}={}){
  const state=ensureContractorState();
  const normalizedAmount=Math.max(0,Math.floor(Number(amount)||0));
  const normalizedEventId=typeof eventId==='string'&&eventId?eventId:null;
  const oldExp=state.exp;
  const oldRank=contractorRankFromExp(oldExp);
  if(!normalizedAmount)return {awarded:false,reason:'invalid_amount',amount:0,oldExp,newExp:oldExp,oldRank,newRank:oldRank,reachedRanks:[],unlockedTitleIds:[]};
  if(normalizedEventId&&state.expEventIds.includes(normalizedEventId))return {awarded:false,reason:'duplicate_event',amount:0,oldExp,newExp:oldExp,oldRank,newRank:oldRank,reachedRanks:[],unlockedTitleIds:[]};
  if(normalizedEventId)state.expEventIds.push(normalizedEventId);
  state.exp=Math.min(CONTRACTOR_MAX_EXP,oldExp+normalizedAmount);
  const grantedAmount=state.exp-oldExp;
  const newRank=contractorRankFromExp(state.exp);
  const reachedRanks=Array.from({length:Math.max(0,newRank-oldRank)},(_,index)=>oldRank+index+1);
  if(grantedAmount>0){
    state.recentExp.push({amount:grantedAmount,source:typeof source==='string'&&source?source:'other',eventId:normalizedEventId,awardedAt:awardedAt||new Date().toISOString()});
    state.recentExp=state.recentExp.slice(-20);
  }
  const unlockedTitleIds=syncContractorRankTitles();
  return {awarded:grantedAmount>0,reason:grantedAmount>0?'awarded':'max_rank',amount:grantedAmount,oldExp,newExp:state.exp,oldRank,newRank,reachedRanks,unlockedTitleIds};
}

ensureContractorState();
syncContractorRankTitles();
