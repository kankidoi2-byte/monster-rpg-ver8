import fs from 'node:fs';
import {runtime,seeded} from './runtime.mjs';
process.env.AUDIT_REF ||= '4ad50548f3dd9e5803cb7f2308c8df2e2d3c6f1a';
const r=runtime(),run=r.run;const seed=20260908;r.context.Math.random=seeded(seed);
const result=run(`(()=>{
 const quant=(a,p)=>a.slice().sort((a,b)=>a-b)[Math.ceil(a.length*p)-1];
 const summarize=a=>({n:a.length,mean:a.reduce((s,x)=>s+x,0)/a.length,p50:quant(a,.5),p90:quant(a,.9),p95:quant(a,.95)});
 const payouts=[];
 for(const map of MAPS.filter(m=>!m.bossOnly&&!m.rareOnly&&!m.goldenLand))for(const d of ['easy','normal','hard']){
  const pool=worldMapCandidates(map,d);if(!pool.length)continue;const rewards=[];
  for(let i=0;i<10000;i++){const mon=pool[Math.floor(Math.random()*pool.length)];activeHuntRequest=createHuntRequest(map,mon,d,[]);rewards.push({coins:huntRewardAmount(mon.coinBonus||(8+Math.floor(Math.random()*10))),exp:huntRewardAmount(mon.expBonus||(35+Math.floor(Math.random()*25)))});}
  payouts.push({map:map.id,difficulty:d,coins:summarize(rewards.map(x=>x.coins)),exp:summarize(rewards.map(x=>x.exp)),pool:pool.map(m=>m.id)});
 }
 const growth=[];
 for(const difficulty of ['easy','normal','hard','extreme'])for(const level of [3,10,30,100]){
  const required=Array.from({length:level-1},(_,i)=>needExp(i+1)).reduce((a,b)=>a+b,0);activeHuntRequest={rewardMultiplier:huntDifficulty(difficulty).rewardMultiplier};
  const battles=[];for(let i=0;i<1000;i++){let exp=0,wins=0;while(exp<required){exp+=huntRewardAmount(35+Math.floor(Math.random()*25));wins++;}battles.push(wins);}
  growth.push({difficulty,level,requiredExp:required,wins:summarize(battles),partySlots:3,perMemberFullShare:true});
 }
 const material=[];
 for(const recipe of ALCHEMY_RECIPES){const needed=new Set(recipe.materialChoices.map(x=>x.normal));const wins=[];
  for(let i=0;i<10000;i++){const found=new Set();let count=0;while(found.size<needed.size){count++;const drop=rollAlchemyMaterialDrop();const base=drop?.replace(/^fine_/,'');if(needed.has(base))found.add(base);}wins.push(count);}
  material.push({recipe:recipe.recipeId,firstSetWins:summarize(wins),scope:'battle material drop only, normal or fine accepted, no expedition, no catalyst/coins'});
 }
 const itemPool=ITEM_GACHA_POOL.map(x=>({...x,price:ITEM_BY_ID[x.id].price,shop:ITEM_BY_ID[x.id].shop!==false,exp:ITEM_BY_ID[x.id].expAmount||0}));
 const itemMeanExp=itemPool.reduce((s,x)=>s+x.exp*x.weight,0)/100;
 const recycle=characterGachaPool().map(m=>{const reward=CHARACTER_RECYCLE_REWARDS[m.rarity.length];return {id:m.id,coins:reward.coins,exp:reward.count*ITEM_BY_ID[reward.itemId].expAmount}});
 // Same currency loop includes new default cards retained after conversion, which have no sale path.
 const recycling={pool:recycle,expPerDraw:recycle.reduce((s,x)=>s+x.exp,0)/recycle.length,coinsRefundPerDraw:recycle.reduce((s,x)=>s+x.coins,0)/recycle.length};
 // Execute grantPartyExp: actual three-member allocation, no threefold grind assumption.
 save=initSave();save.instances=[];save.party=[];['freigal','aquaron','grassbeat'].forEach(id=>{const ins=addInstance(id,1);save.party.push(ins.uid)});grantPartyExp(180);
 const partyProof=getPartyInstances().map(i=>({id:i.id,level:i.level,exp:i.exp}));
 return {payouts,growth,material,itemPool,itemMeanExp,recycling,partyProof};
})()`);
fs.writeFileSync(new URL('../../docs/balance-audit/economy.json',import.meta.url),JSON.stringify({metadata:{seed,source:process.env.AUDIT_REF,scope:'conditional successful single battles; no swift bonus; steady-state reward model, NOT a complete playthrough'},...result},null,2)+'\n');console.log('Economy simulations complete');
