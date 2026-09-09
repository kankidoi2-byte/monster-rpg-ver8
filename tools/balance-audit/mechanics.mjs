import fs from 'node:fs';
import {runtime,seeded} from './runtime.mjs';
process.env.AUDIT_REF ||= '4ad50548f3dd9e5803cb7f2308c8df2e2d3c6f1a';
const r=runtime();r.context.Math.random=seeded(20260908);
const result=await r.run(`(async()=>{
 const attributes=['normal','fire','water','grass','thunder','wind','light','dark','star','dragon'];
 const matrix=attributes.map(a=>({attack:a,against:Object.fromEntries(attributes.map(d=>[d,typeEff(a,[d])]))}));
 const moves=[];save=initSave();save.instances=[];save.party=[];
 const reps=attributes.map(t=>M.find(m=>m.types.length===1&&m.types[0]===t)||M.find(m=>m.types[0]===t)).filter(Boolean);
 for(const card of [...MONSTER_MOVE_CARDS,...CHARACTER_MOVE_CARDS]){
  const host=M.find(m=>isSkillAllowedForMonster(card.id,m));if(!host)continue;
  activeInstance={id:host.id,uid:'mechanic',level:30};player=host;partyBattle=[{inst:activeInstance,mon:player,hp:400}];activePartyIdx=0;resetKokoroLinkBattleState();
  for(const def of reps){enemy=def;activeHuntRequest={enemyHp:1000,attackMultiplier:1,rewardMultiplier:1,conditions:[]};let damage=0,healed=0,status=0;
   for(let i=0;i<100;i++){pHp=100;eHp=1000;pAtk=eAtk=1;pGuard=eGuard=false;pAquaShield=eAquaShield=false;pFlareCharge=eFlareCharge=false;pStatus=eStatus=null;pPoisonTurns=ePoisonTurns=pSleepTurns=eSleepTurns=pParalysisTurns=eParalysisTurns=pConfusionTurns=eConfusionTurns=0;
    await doAttack(player,enemy,skillToMove(card.id),true);damage+=1000-eHp;healed+=pHp-100;status+=Number(ePoisonTurns>0||eSleepTurns>0||eParalysisTurns>0||eConfusionTurns>0);
   }moves.push({skill:card.id,name:card.name,cost:card.cost,host:host.id,defender:def.id,defenderTypes:def.types,damage:damage/100,hpChange:healed/100,statusRate:status/100});
  }
 }
 const gifts=MONSTER_MOVE_CARDS.filter(c=>c.cost===6).map(c=>({name:c.name,id:c.id,early:M.filter(m=>defaultSkillIdsForMonster(m,{level:3}).includes(c.id)).map(m=>m.id),late:M.filter(m=>defaultSkillIdsForMonster(m,{level:30}).includes(c.id)).map(m=>m.id)}));
 const contract=[];for(const p of [.05,.25,.5,.75,.95]){let hits=0;for(let i=0;i<100000;i++)if(contractAnimationStage(Math.random(),p)===3)hits++;contract.push({p,n:100000,hits});}
 return {matrix,moves,gifts,contract,representativeDefenders:reps.map(m=>m.id)};
})()`);
fs.writeFileSync(new URL('../../docs/balance-audit/mechanics.json',import.meta.url),JSON.stringify({metadata:{seed:20260908,source:process.env.AUDIT_REF,scope:'one-action isolated mechanics; lv30 legal host, enemy HP1000, neutral field, no links, 100 samples each. Not complete battle win rates or natural encounters.'},...result},null,2)+'\n');console.log('Mechanics samples',result.moves.length*100);
