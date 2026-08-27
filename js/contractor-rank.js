/* ===== 契約者Rank・称号 基盤 ===== */
const CONTRACTOR_RANK_SYSTEM_VERSION = 1;
const CONTRACTOR_MAX_RANK = 50;
const CONTRACTOR_LEGACY_MIGRATION_VERSION = 1;
const CONTRACTOR_ACTION_EXP = Object.freeze({
  battle:Object.freeze({easy:5,normal:10,hard:20,extreme:35,multiBonus:10}),
  contractSuccess:20,
  firstSpeciesContract:30,
  dexRegistration:30,
  dexMilestone:100,
  evolution:30,
  specialEvolution:50,
  alchemySuccess:50,
  expedition:Object.freeze({short:10,medium:25,long:45}),
  bossFirstWin:100,
  superBossFirstWin:250
});

const CONTRACTOR_TITLE_CATALOG = Object.freeze([
  Object.freeze({id:'rank_05_full_contractor',name:'一人前の契約者',category:'rank',rank:5,description:'契約者として確かな一歩を刻んだ証。'}),
  Object.freeze({id:'rank_10_veteran_contractor',name:'熟練契約者',category:'rank',rank:10,description:'数多くの経験を積んだ契約者の証。'}),
  Object.freeze({id:'rank_15_advanced_contractor',name:'上級契約者',category:'rank',rank:15,description:'卓越した経験を備えた契約者の証。'}),
  Object.freeze({id:'rank_20_contract_master',name:'契約の達人',category:'rank',rank:20,description:'契約の道を深く究めた者の証。'}),
  Object.freeze({id:'rank_30_hundred_beasts',name:'百獣の契約者',category:'rank',rank:30,description:'多くのモンスターと縁を結んだ者の証。'}),
  Object.freeze({id:'rank_40_legendary_contractor',name:'伝説の契約者',category:'rank',rank:40,description:'その歩みが伝説として語られる契約者の証。'}),
  Object.freeze({id:'rank_50_star_binder',name:'星を結ぶ契約者',category:'rank',rank:50,description:'星々を結ぶほどの契約を成し遂げた者の証。'})
]);

const CONTRACTOR_NORMAL_MATERIAL_SET=Object.freeze({monster_bone:1,magic_crystal:1,metal_ore:1,unstable_alchemy_matter:1,raptor_feather:1,venom_carapace:1});
const CONTRACTOR_FINE_MATERIAL_SET=Object.freeze({fine_monster_bone:1,fine_magic_crystal:1,fine_metal_ore:1,fine_unstable_alchemy_matter:1,fine_raptor_feather:1,fine_venom_carapace:1});
const CONTRACTOR_RANK_REWARD_OVERRIDES=Object.freeze({
  2:Object.freeze({items:Object.freeze({contract_scroll:2})}),
  3:Object.freeze({items:Object.freeze({silver_contract_scroll:1})}),
  4:Object.freeze({items:Object.freeze({potion:3,attack_potion:1})}),
  5:Object.freeze({coins:150}),
  6:Object.freeze({items:CONTRACTOR_NORMAL_MATERIAL_SET}),
  7:Object.freeze({items:Object.freeze({mega_data:1})}),
  8:Object.freeze({items:Object.freeze({gold_contract_scroll:1})}),
  9:Object.freeze({coins:200}),
  10:Object.freeze({items:Object.freeze({rainbow_contract_scroll:1})}),
  12:Object.freeze({items:CONTRACTOR_FINE_MATERIAL_SET}),
  15:Object.freeze({coins:500}),
  20:Object.freeze({coins:750,items:Object.freeze({rainbow_contract_scroll:1,giga_data:1})}),
  30:Object.freeze({coins:1000,items:Object.freeze({rainbow_contract_scroll:1})}),
  40:Object.freeze({coins:1500,items:Object.freeze({giga_data:1})}),
  50:Object.freeze({coins:2500,items:Object.freeze({rainbow_contract_scroll:2,giga_data:2})})
});

function contractorStandardRankReward(rank){
  if(rank%3===0)return {coins:0,items:{kilo_data:Math.max(1,Math.floor(rank/15)+1)}};
  return {coins:50+rank*10,items:{}};
}

function contractorRankReward(rank){
  const normalized=Math.floor(Number(rank)||0);
  if(normalized<2||normalized>CONTRACTOR_MAX_RANK)return null;
  const standard=contractorStandardRankReward(normalized);
  const hasOverride=Object.prototype.hasOwnProperty.call(CONTRACTOR_RANK_REWARD_OVERRIDES,normalized);
  const override=CONTRACTOR_RANK_REWARD_OVERRIDES[normalized]||{};
  const title=CONTRACTOR_TITLE_CATALOG.find(entry=>entry.category==='rank'&&entry.rank===normalized)||null;
  return Object.freeze({rank:normalized,coins:Math.max(0,Math.floor(Number(hasOverride?(override.coins||0):standard.coins)||0)),items:Object.freeze(hasOverride?{...(override.items||{})}:{...standard.items}),titleId:title?.id||null});
}

const CONTRACTOR_RANK_REWARD_CATALOG=Object.freeze(Array.from({length:CONTRACTOR_MAX_RANK-1},(_,index)=>contractorRankReward(index+2)));

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
  if(!Array.isArray(save.contractor.pendingRankUps))save.contractor.pendingRankUps=[];
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

function availableContractorRankRewardRanks(){
  const state=ensureContractorState();
  const rank=contractorRankFromExp(state.exp);
  return Array.from({length:Math.max(0,rank-1)},(_,index)=>index+2);
}

function unclaimedContractorRankRewardRanks(){
  const state=ensureContractorState();
  return availableContractorRankRewardRanks().filter(rank=>!state.claimedRankRewards.includes(rank));
}

function claimContractorRankReward(rank){
  const state=ensureContractorState();
  const reward=contractorRankReward(rank);
  if(!reward)return {claimed:false,reason:'invalid_rank',rank:null,coins:0,items:{},titleId:null};
  const currentRank=contractorRankFromExp(state.exp);
  if(currentRank<reward.rank)return {claimed:false,reason:'rank_locked',rank:reward.rank,coins:0,items:{},titleId:reward.titleId};
  if(state.claimedRankRewards.includes(reward.rank))return {claimed:false,reason:'already_claimed',rank:reward.rank,coins:0,items:{},titleId:reward.titleId};
  if(!save.items||typeof save.items!=='object'||Array.isArray(save.items))save.items={};
  save.coins=Math.max(0,Math.floor(Number(save.coins)||0))+reward.coins;
  Object.entries(reward.items).forEach(([itemId,count])=>{save.items[itemId]=Math.max(0,Math.floor(Number(save.items[itemId])||0))+count;});
  state.claimedRankRewards.push(reward.rank);
  state.claimedRankRewards=[...new Set(state.claimedRankRewards)].sort((a,b)=>a-b);
  if(reward.titleId)unlockContractorTitle(reward.titleId);
  Object.keys(reward.items).forEach(itemId=>{if(typeof registerItemDex==='function')registerItemDex(itemId);});
  return {claimed:true,reason:'claimed',rank:reward.rank,coins:reward.coins,items:{...reward.items},titleId:reward.titleId};
}

function claimAllContractorRankRewards(){
  const targetRanks=unclaimedContractorRankRewardRanks();
  const results=targetRanks.map(rank=>claimContractorRankReward(rank)).filter(result=>result.claimed);
  return {
    claimed:results.length>0,
    reason:results.length?'claimed':'nothing_to_claim',
    claimedRanks:results.map(result=>result.rank),
    coins:results.reduce((sum,result)=>sum+result.coins,0),
    items:results.reduce((items,result)=>{Object.entries(result.items).forEach(([id,count])=>{items[id]=(items[id]||0)+count;});return items;},{}),
    results
  };
}

function contractorGrantSummary(results=[]){
  const valid=results.filter(Boolean);
  return {
    amount:valid.reduce((sum,result)=>sum+(Number(result.amount)||0),0),
    reachedRanks:[...new Set(valid.flatMap(result=>result.reachedRanks||[]))],
    unlockedTitleIds:[...new Set(valid.flatMap(result=>result.unlockedTitleIds||[]))],
    results:valid
  };
}

function queueContractorRankUp(fromRank,toRank,unlockedTitleIds=[]){
  const state=ensureContractorState();
  if(toRank<=fromRank)return null;
  const latest=state.pendingRankUps[state.pendingRankUps.length-1];
  if(latest&&latest.toRank===fromRank){
    latest.toRank=toRank;
    latest.unlockedTitleIds=[...new Set([...(latest.unlockedTitleIds||[]),...unlockedTitleIds])];
    return latest;
  }
  const entry={fromRank,toRank,unlockedTitleIds:[...new Set(unlockedTitleIds)],createdAt:new Date().toISOString()};
  state.pendingRankUps.push(entry);
  state.pendingRankUps=state.pendingRankUps.slice(-10);
  return entry;
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
  if(newRank>oldRank)queueContractorRankUp(oldRank,newRank,unlockedTitleIds);
  if(typeof refreshContractorRankUi==='function')refreshContractorRankUi();
  return {awarded:grantedAmount>0,reason:grantedAmount>0?'awarded':'max_rank',amount:grantedAmount,oldExp,newExp:state.exp,oldRank,newRank,reachedRanks,unlockedTitleIds};
}

function grantContractorDexMilestones(unitDexCount=null,{source='dex_milestone'}={}){
  const count=unitDexCount===null?new Set(Array.isArray(save.caught)?save.caught:[]).size:Math.max(0,Math.floor(Number(unitDexCount)||0));
  const results=[];
  for(let milestone=10;milestone<=count;milestone+=10){
    results.push(grantContractorExp(CONTRACTOR_ACTION_EXP.dexMilestone,{source,eventId:`dex:milestone:${milestone}`}));
  }
  return contractorGrantSummary(results);
}

function grantContractorDexRegistration(unitId){
  if(typeof unitId!=='string'||!unitId)return contractorGrantSummary([]);
  const registration=grantContractorExp(CONTRACTOR_ACTION_EXP.dexRegistration,{source:'dex_registration',eventId:`dex:first:${unitId}`});
  const milestones=grantContractorDexMilestones();
  return contractorGrantSummary([registration,...milestones.results]);
}

function grantContractorCatalogRegistration(category,entryId){
  if(!['item','map'].includes(category)||typeof entryId!=='string'||!entryId)return contractorGrantSummary([]);
  return contractorGrantSummary([grantContractorExp(CONTRACTOR_ACTION_EXP.dexRegistration,{source:`${category}_dex_registration`,eventId:`dex:${category}:${entryId}`})]);
}

function grantContractorContractSuccess(unitId){
  const results=[grantContractorExp(CONTRACTOR_ACTION_EXP.contractSuccess,{source:'contract_success'})];
  if(typeof unitId==='string'&&unitId)results.push(grantContractorExp(CONTRACTOR_ACTION_EXP.firstSpeciesContract,{source:'first_species_contract',eventId:`contract:first:${unitId}`}));
  return contractorGrantSummary(results);
}

function grantContractorBossFirstWin(mon){
  if(!mon||typeof mon.bossClass!=='string'||!mon.bossClass)return contractorGrantSummary([]);
  const amount=mon.bossClass.includes('超ボス')?CONTRACTOR_ACTION_EXP.superBossFirstWin:CONTRACTOR_ACTION_EXP.bossFirstWin;
  return contractorGrantSummary([grantContractorExp(amount,{source:'boss_first_win',eventId:`boss:first:${mon.id}`})]);
}

function grantContractorBattleWin({difficultyId='normal',multi=false,enemies=[]}={}){
  const difficulty=['easy','normal','hard','extreme'].includes(difficultyId)?difficultyId:'normal';
  const results=[grantContractorExp(CONTRACTOR_ACTION_EXP.battle[difficulty],{source:`battle_${difficulty}`})];
  if(multi)results.push(grantContractorExp(CONTRACTOR_ACTION_EXP.battle.multiBonus,{source:'multi_battle_bonus'}));
  (Array.isArray(enemies)?enemies:[]).forEach(mon=>results.push(...grantContractorBossFirstWin(mon).results));
  return contractorGrantSummary(results);
}

function grantContractorEvolution({special=false}={}){
  const amount=special?CONTRACTOR_ACTION_EXP.specialEvolution:CONTRACTOR_ACTION_EXP.evolution;
  return contractorGrantSummary([grantContractorExp(amount,{source:special?'special_evolution':'evolution'})]);
}

function grantContractorAlchemySuccess(){
  return contractorGrantSummary([grantContractorExp(CONTRACTOR_ACTION_EXP.alchemySuccess,{source:'alchemy_success'})]);
}

function grantContractorExpeditionComplete(entry){
  const distanceId=typeof entry?.distanceId==='string'?entry.distanceId:'short';
  const amount=CONTRACTOR_ACTION_EXP.expedition[distanceId]||CONTRACTOR_ACTION_EXP.expedition.short;
  const eventId=typeof entry?.id==='string'&&entry.id?`expedition:complete:${entry.id}`:null;
  return contractorGrantSummary([grantContractorExp(amount,{source:`expedition_${distanceId}`,eventId})]);
}

function legacyBossVictoryRecords(){
  const logs=Array.isArray(save.history?.logs)?save.history.logs:[];
  if(typeof M==='undefined'||!Array.isArray(M)||!logs.length)return [];
  return M.filter(mon=>typeof mon?.bossClass==='string'&&mon.bossClass&&logs.some(log=>typeof log==='string'&&log.includes('勝利')&&log.includes(mon.name)))
    .map(mon=>({id:mon.id,name:mon.name,bossClass:mon.bossClass,exp:mon.bossClass.includes('超ボス')?250:100}));
}

function contractorLegacyMigrationPlan(){
  const wins=Math.max(0,Math.floor(Number(save.history?.wins)||0));
  const unitDexCount=new Set(Array.isArray(save.caught)?save.caught.filter(id=>typeof id==='string'&&id):[]).size;
  const itemDexCount=new Set(Array.isArray(save.itemDex)?save.itemDex.filter(id=>typeof id==='string'&&id):[]).size;
  const mapDexCount=new Set(Array.isArray(save.mapDex)?save.mapDex.filter(id=>typeof id==='string'&&id):[]).size;
  const expeditions=Math.max(0,Math.floor(Number(save.expeditions?.completedCount)||0));
  const bosses=legacyBossVictoryRecords();
  const dexMilestoneCount=Math.floor(unitDexCount/10);
  const activityExp=wins*10+(unitDexCount+itemDexCount+mapDexCount)*30+expeditions*20;
  const dexMilestoneExp=dexMilestoneCount*CONTRACTOR_ACTION_EXP.dexMilestone;
  const bossExp=bosses.reduce((sum,boss)=>sum+boss.exp,0);
  return {wins,unitDexCount,itemDexCount,mapDexCount,dexMilestoneCount,expeditions,bosses,activityExp,dexMilestoneExp,bossExp,totalExp:activityExp+dexMilestoneExp+bossExp};
}

function migrateLegacyContractorProgress(){
  const state=ensureContractorState();
  if(state.legacyMigrationVersion>=CONTRACTOR_LEGACY_MIGRATION_VERSION)return {applied:false,reason:'already_migrated',summary:state.legacyMigrationSummary};
  const eligible=Array.isArray(save.saveMeta?.migrations)&&save.saveMeta.migrations.includes('v2_to_v3_contractor_rank');
  const currentUnitDexCount=new Set(Array.isArray(save.caught)?save.caught:[]).size;
  const currentItemDexCount=new Set(Array.isArray(save.itemDex)?save.itemDex:[]).size;
  const currentMapDexCount=new Set(Array.isArray(save.mapDex)?save.mapDex:[]).size;
  const plan=eligible?contractorLegacyMigrationPlan():{wins:0,unitDexCount:currentUnitDexCount,itemDexCount:currentItemDexCount,mapDexCount:currentMapDexCount,dexMilestoneCount:Math.floor(currentUnitDexCount/10),expeditions:0,bosses:[],activityExp:0,dexMilestoneExp:Math.floor(currentUnitDexCount/10)*CONTRACTOR_ACTION_EXP.dexMilestone,bossExp:0,totalExp:0};
  const appliedAt=new Date().toISOString();
  const existingPendingRankUps=state.pendingRankUps.slice();
  let grantedExp=0;
  if(plan.activityExp>0){
    const result=grantContractorExp(plan.activityExp,{source:'legacy_activity',eventId:'legacy:activity:v1',awardedAt:appliedAt});
    grantedExp+=result.amount;
  }
  if(eligible){
    (Array.isArray(save.caught)?save.caught:[]).forEach(id=>{const eventId=`dex:first:${id}`;if(typeof id==='string'&&id&&!state.expEventIds.includes(eventId))state.expEventIds.push(eventId);});
    (Array.isArray(save.itemDex)?save.itemDex:[]).forEach(id=>{const eventId=`dex:item:${id}`;if(typeof id==='string'&&id&&!state.expEventIds.includes(eventId))state.expEventIds.push(eventId);});
    (Array.isArray(save.mapDex)?save.mapDex:[]).forEach(id=>{const eventId=`dex:map:${id}`;if(typeof id==='string'&&id&&!state.expEventIds.includes(eventId))state.expEventIds.push(eventId);});
    const milestones=grantContractorDexMilestones(plan.unitDexCount,{source:'legacy_dex_milestone'});
    grantedExp+=milestones.amount;
  }else{
    (Array.isArray(save.caught)?save.caught:[]).forEach(id=>{grantedExp+=grantContractorDexRegistration(id).amount;});
    (Array.isArray(save.itemDex)?save.itemDex:[]).forEach(id=>{grantedExp+=grantContractorCatalogRegistration('item',id).amount;});
    (Array.isArray(save.mapDex)?save.mapDex:[]).forEach(id=>{grantedExp+=grantContractorCatalogRegistration('map',id).amount;});
  }
  plan.bosses.forEach(boss=>{
    const result=grantContractorExp(boss.exp,{source:'boss_first_win',eventId:`boss:first:${boss.id}`,awardedAt:appliedAt});
    grantedExp+=result.amount;
  });
  state.legacyMigrationVersion=CONTRACTOR_LEGACY_MIGRATION_VERSION;
  state.pendingRankUps=existingPendingRankUps;
  state.legacyMigrationSummary={
    version:CONTRACTOR_LEGACY_MIGRATION_VERSION,
    eligible,
    appliedAt,
    wins:plan.wins,
    winsExp:plan.wins*10,
    unitDexCount:plan.unitDexCount,
    unitDexExp:plan.unitDexCount*30,
    itemDexCount:plan.itemDexCount,
    itemDexExp:plan.itemDexCount*30,
    mapDexCount:plan.mapDexCount,
    mapDexExp:plan.mapDexCount*30,
    dexMilestoneCount:plan.dexMilestoneCount,
    dexMilestoneExp:plan.dexMilestoneExp,
    expeditions:plan.expeditions,
    expeditionExp:plan.expeditions*20,
    bossFirstWins:plan.bosses.map(boss=>({id:boss.id,exp:boss.exp})),
    bossExp:plan.bossExp,
    storyAchievements:0,
    storyExp:0,
    missionAchievements:0,
    missionExp:0,
    grantedExp,
    resultingRank:contractorRankFromExp(state.exp)
  };
  syncContractorRankTitles();
  return {applied:eligible,reason:eligible?'migrated':'new_save',summary:state.legacyMigrationSummary};
}

ensureContractorState();
syncContractorRankTitles();
migrateLegacyContractorProgress();
