// Trait rewards derive from the current species. No trait data is persisted.
function traitRewardParty(){
  if(typeof partyBattle==='undefined'||!partyBattle.length)return [];
  return partyBattle.map(entry=>save.instances.find(ins=>ins.uid===entry.uid)||entry.inst).filter(Boolean);
}
function partyTraitBonus(types,party=traitRewardParty()){
  if(typeof traitValue!=='function')return 0;
  return Math.max(0,...party.flatMap(ins=>types.map(type=>traitValue(ins,type,0))));
}
function traitCoinReward(amount){return Math.round(amount*(1+partyTraitBonus(['fortune','golden_fortune'])));}
function traitDropRate(rate){return Math.min(1,Math.max(0,rate)+partyTraitBonus(['appraiser','scavenger']));}
function traitExperienceReward(ins,amount,party=[]){
  if(typeof traitValue!=='function')return amount;
  return Math.floor(amount*(1+traitValue(ins,'learner',0))*(1+partyTraitBonus(['party_learner'],party))+1e-9);
}
function traitContractRate(rate){return Math.min(1,rate+partyTraitBonus(['bond']));}
let traitRetreatReceipt=null;
function resetTraitRewardState(){traitRetreatReceipt=null;}
function traitRetreatEligible(){
  return activeHuntRequest&&activeHuntRequest.source!=='map_story'
    &&!(typeof tutorialBattleSession!=='undefined'&&tutorialBattleSession?.active)
    &&!(typeof isTutorialBattle==='function'&&isTutorialBattle())
    &&partyTraitBonus(['retreat'])>0;
}
// Failed saves retain the same rolled candidate, preventing repeated rolls.
function settleTraitRetreatReward(){
  if(!traitRetreatEligible())return {exp:0,materials:[]};
  if(traitRetreatReceipt?.committed)return traitRetreatReceipt.outcome;
  if(!traitRetreatReceipt){
    const originalSave=save,before=JSON.stringify(save),evolutions=structuredClone(pendingEvolutions),request=activeHuntRequest;
    try{
      save=JSON.parse(before);pendingEvolutions=structuredClone(evolutions);
      const targets=multiBattle?.active?multiBattle.enemies.map(e=>({mon:e.mon,multiplier:e.rewardMultiplier})):[{mon:enemy,multiplier:Number(activeHuntRequest.rewardMultiplier)||1}];
      const blessing=normalizeGBless(save.gBless);
      const expMultiplier=gBlessUnlocked()&&blessing.on&&gBlessTotal(blessing)>0?G_BLESS_RULES.exp:1;
      let exp=0;const materials=[],rolledMaterials={};
      for(const {mon,multiplier} of targets){
        exp+=huntRewardAmount(mon.expBonus||(35+Math.floor(Math.random()*25)),huntTurnBonusSucceeded(),expMultiplier,multiplier);
        if(partyTraitBonus(['retreat'])>=2){
          // Roll the normal rewards first, then halve integer quantities per item.
          const add=id=>{if(id&&ITEM_BY_ID[id])rolledMaterials[id]=(rolledMaterials[id]||0)+1;};
          if(mon.dropItem&&Math.random()<traitDropRate(Number.isFinite(mon.dropRate)?mon.dropRate:1))add(mon.dropItem);
          add(rollAlchemyMaterialDrop(Math.random,partyTraitBonus(['appraiser','scavenger'])));
        }
      }
      for(const [id,count] of Object.entries(rolledMaterials)){
        const quantity=Math.floor(count/2);if(!quantity)continue;
        save.items[id]=(save.items[id]||0)+quantity;registerItemDex(id);
        materials.push(ITEM_BY_ID[id].name+(quantity>1?` ×${quantity}`:''));
      }
      exp=Math.floor(exp/2);
      grantPartyExp(exp,{saveNow:false,animate:false});
      if(typeof autoPrepareLossCheckpoint==='function')autoPrepareLossCheckpoint('retreat');
      traitRetreatReceipt={before,after:JSON.stringify(save),evolutions:structuredClone(pendingEvolutions),request,identity:saveTransactionIdentity(),outcome:{exp,materials},committed:false};
    }finally{save=originalSave;pendingEvolutions=evolutions;if(typeof rebindNormalVictoryInstances==='function')rebindNormalVictoryInstances();}
  }
  const receipt=traitRetreatReceipt;
  if(receipt.before!==JSON.stringify(save)||receipt.request!==activeHuntRequest||receipt.identity!==saveTransactionIdentity()){
    saveTransactionNotice('保存の変更を検出したため、撤退報酬を確定できませんでした。');return null;
  }
  if(!commitSaveMutation(()=>{save=JSON.parse(receipt.after);pendingEvolutions=structuredClone(receipt.evolutions);rebindNormalVictoryInstances();},{requireReadable:true}))return null;
  receipt.committed=true;return receipt.outcome;
}
