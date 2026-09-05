import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';

const BASE_REV='d31cfccd37219549d25df9f85c62db559aa649f3';
const RUN_DATE='2026-09-06';
const BATTLE_SEED=0x5b202609;
const ACCESS_SEED=0x5bacc355;
const ACCESS_SAMPLES=100000;
const SOURCE_FILES=['js/data.js','js/core.js','js/state.js','js/items.js','js/contract-animation.js','js/expedition.js'];
const AUDIT_FILES=[...SOURCE_FILES,'js/battle-flow.js','js/multi-battle.js'];
const CURRENT_HEAD=gitRevision('HEAD');
const CURRENT_HEAD_TREE=gitRevision('HEAD^{tree}');
const NEUTRAL_EXPECTATIONS=Object.freeze({
  normal:Object.freeze({exp:55.4371,coins:15.5294,materials:.528,fineMaterials:.120}),
  hard:Object.freeze({exp:118.44,coins:37.354,materials:.616,fineMaterials:.140})
});
const GRASSLAND_COIN_RISK=Object.freeze({
  normal:Object.freeze({coinsPerWin:33.30,neutralMultiple:2.14}),
  hard:Object.freeze({coinsPerWin:126,neutralMultiple:3.37})
});

function gitRevision(expression){
  return execFileSync('git',['rev-parse',expression],{cwd:new URL('..',import.meta.url),encoding:'utf8'}).trim();
}

function sourceAt(revision,file){
  if(revision==='working-tree')return fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
  return execFileSync('git',['show',`${revision}:${file}`],{cwd:new URL('..',import.meta.url),encoding:'utf8'});
}

function mulberry32(seed){
  let state=seed>>>0;
  return ()=>{
    state=(state+0x6d2b79f5)>>>0;
    let value=state;
    value=Math.imul(value^(value>>>15),value|1);
    value^=value+Math.imul(value^(value>>>7),value|61);
    return ((value^(value>>>14))>>>0)/4294967296;
  };
}

function loadRules(revision){
  const save={coins:0,items:{},history:{wins:0,logs:[]},instances:[],party:[],expeditions:{completedCount:0,active:[]}};
  const document={
    getElementById:id=>id==='expeditionNav'||id==='expedition'?{}:null,
    querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>({})
  };
  const context=vm.createContext({
    console,structuredClone,Math,Date,save,document,
    saveGame:()=>true,registerItemDex:()=>{},show:()=>{},alert:()=>{},
    getInstance:()=>null,checkEvolution:()=>{},setTimeout:()=>0,clearTimeout:()=>{}
  });
  for(const file of SOURCE_FILES)vm.runInContext(sourceAt(revision,file),context,{filename:`${revision}:${file}`});
  vm.runInContext(`
    globalThis.ensureContractScrollItem=function(){
      if(!save.items)save.items={};
      SHOP_ITEMS.forEach(item=>{if(save.items[item.id]==null)save.items[item.id]=0;});
      if(save.items.water_mirror==null)save.items.water_mirror=0;
      if(save.items.doom_fragment==null)save.items.doom_fragment=0;
    };
  `,context);
  const auditFiles=revision==='working-tree'?[...AUDIT_FILES,'js/world-map.js']:AUDIT_FILES;
  return {context,source:Object.fromEntries(auditFiles.map(file=>[file,sourceAt(revision,file)]))};
}

function evaluate(rules,expression){return vm.runInContext(expression,rules.context);}
function plain(value){return JSON.parse(JSON.stringify(value));}

function canonicalSnapshot(rules){
  return plain(evaluate(rules,`({
    difficulties:Object.fromEntries(Object.entries(HUNT_DIFFICULTIES).map(([id,value])=>[id,{...value,rarities:[...value.rarities]}])),
    rates:{threeWay:{...THREE_WAY_RATES},invasion:{...INVASION_RATES}},
    materialDrops:ALCHEMY_MATERIAL_DROPS.map(value=>({...value})),
    contractScroll:({...ITEM_BY_ID.contract_scroll}),
    maps:MAPS.map(map=>({id:map.id,bossOnly:!!map.bossOnly,rareOnly:!!map.rareOnly,goldenLand:!!map.goldenLand,appearRate:map.appearRate||null,enemyIds:[...(map.enemyIds||[])]})),
    monsters:M.map(mon=>({id:mon.id,rarity:mon.rarity,expBonus:mon.expBonus||null,coinBonus:mon.coinBonus||null,catchRate:mon.catchRate??.25,contractable:isContractableUnit(mon),dropItem:mon.dropItem||null,dropRate:Number.isFinite(mon.dropRate)?mon.dropRate:1}))
  })`));
}

function canonicalValue(rules,expression,bindings={}){
  Object.assign(rules.context,bindings);
  return plain(evaluate(rules,expression));
}

function addItem(target,id,count=1){if(id)target[id]=(target[id]||0)+count;}

function functionSource(source,name){
  const start=source.indexOf(`function ${name}(`);
  assert.notEqual(start,-1,`function ${name} not found`);
  const bodyStart=source.indexOf('{',start);
  let depth=0;
  for(let index=bodyStart;index<source.length;index++){
    if(source[index]==='{')depth++;
    if(source[index]==='}'&&--depth===0)return source.slice(start,index+1);
  }
  assert.fail(`function ${name} is not balanced`);
}

function normalizedRuleSource(source){
  return source
    .replace(/if\(typeof recordWorldMapVictory==='function'\)\s*recordWorldMapVictory\(\);?/g,'')
    .replace(/\s+/g,'');
}

function simulateTwentyWins(rules){
  const random=mulberry32(BATTLE_SEED);
  const battles=[];
  const expeditionTotals={completions:0,coins:0,exp:0,items:{}};
  let expeditionSerial=1;

  const startLongExpedition=()=>{
    rules.context.save.expeditions.active=[{
      id:`economy_${expeditionSerial++}`,mapId:'grassland',distanceId:'long',memberUids:['economy_member'],
      progress:0,requiredWins:5,status:'active',suitability:{grade:'D',total:0,greatRate:0,reasons:[]},reward:null
    }];
  };
  startLongExpedition();

  for(let index=0;index<20;index++){
    const difficultyId=index<10?'normal':'hard';
    const candidateIds=canonicalValue(rules,`huntCandidatesFor(MAPS.find(map=>map.id==='grassland'),difficultyId).map(mon=>mon.id)`,{difficultyId});
    const enemyId=candidateIds[Math.floor(random()*candidateIds.length)];
    const mode=canonicalValue(rules,'rollHuntBattleMode(difficultyId,randomFn)',{difficultyId,randomFn:random});
    const secondEnemyId=mode==='single'?null:canonicalValue(rules,`chooseSecondHuntEnemy(MAPS.find(map=>map.id==='grassland'),enemyId,difficultyId,randomFn)?.id||null`,{difficultyId,enemyId,randomFn:random});
    const resolvedMode=secondEnemyId?mode:'single';
    if(resolvedMode==='invasion_pending')canonicalValue(rules,'rollInvasionTurn(randomFn)',{randomFn:random});
    const conditionIds=canonicalValue(rules,'rollHuntConditionIds(difficultyId,randomFn)',{difficultyId,randomFn:random});
    const swiftClear=conditionIds.includes('swift_clear');
    const rewardMultiplier=canonicalValue(rules,'huntDifficulty(difficultyId).rewardMultiplier',{difficultyId});
    canonicalValue(rules,'activeHuntRequest={difficultyId,rewardMultiplier,conditions:conditionIds.map(id=>({id}))}',{difficultyId,rewardMultiplier,conditionIds});

    const defeatedIds=secondEnemyId?[enemyId,secondEnemyId]:[enemyId];
    let exp=0,coins=0;
    const materials={};
    for(const defeatedId of defeatedIds){
      const mon=canonicalValue(rules,'M.find(mon=>mon.id===defeatedId)',{defeatedId});
      const baseExp=mon.expBonus||(35+Math.floor(random()*25));
      const baseCoins=mon.coinBonus||(8+Math.floor(random()*10));
      exp+=canonicalValue(rules,'huntRewardAmount(baseExp,swiftClear)',{baseExp,swiftClear});
      coins+=canonicalValue(rules,'huntRewardAmount(baseCoins,swiftClear)',{baseCoins,swiftClear});
      if(mon.dropItem&&random()<mon.dropRate)addItem(materials,mon.dropItem);
      const material=canonicalValue(rules,'grantAlchemyMaterialReward(randomFn)?.id||null',{randomFn:random});
      addItem(materials,material);
    }

    const virtualContractCheck=canonicalValue(rules,`(()=>{
      const mon=M.find(value=>value.id===enemyId),item=ITEM_BY_ID.contract_scroll;
      const eligible=isContractableUnit(mon);
      const rate=eligible?Math.min(.95,(mon.catchRate??.25)*(item.catchMultiplier||1)):0;
      const roll=randomFn();
      return {eligible,rate,success:eligible&&contractAnimationStage(roll,rate)===3};
    })()`,{enemyId,randomFn:random});

    canonicalValue(rules,'progressActiveExpeditions(randomFn)',{randomFn:random});
    const expedition=plain(rules.context.save.expeditions.active[0]);
    const expeditionProgress=expedition.progress;
    if(expedition.status==='complete'){
      expeditionTotals.completions++;
      expeditionTotals.coins+=expedition.reward.coins;
      expeditionTotals.exp+=expedition.reward.exp;
      for(const [id,count] of Object.entries(expedition.reward.items))addItem(expeditionTotals.items,id,count);
      if(index<19)startLongExpedition();
    }

    battles.push({
      win:index+1,difficultyId,enemyId,mode:resolvedMode,secondEnemyId,conditionIds,
      exp,coins,materials,virtualContractCheck,expeditionProgress
    });
  }
  return {battles,totals:summarizeBattles(battles),expeditionTotals};
}

function summarizeBattles(battles){
  const totals={wins:battles.length,normalWins:0,hardWins:0,exp:0,coins:0,materials:{},virtualContractEligible:0,virtualContractSuccesses:0,threeWay:0,invasions:0,expeditionProgress:0};
  for(const battle of battles){
    totals[`${battle.difficultyId}Wins`]++;
    totals.exp+=battle.exp;totals.coins+=battle.coins;
    for(const [id,count] of Object.entries(battle.materials))addItem(totals.materials,id,count);
    totals.virtualContractEligible+=Number(battle.virtualContractCheck.eligible);
    totals.virtualContractSuccesses+=Number(battle.virtualContractCheck.success);
    totals.threeWay+=Number(battle.mode==='three_way');
    totals.invasions+=Number(battle.mode==='invasion_pending');
    totals.expeditionProgress++;
  }
  return totals;
}

function rollDifficulty(snapshot,map,random){
  const available=Object.values(snapshot.difficulties).filter(difficulty=>{
    const candidates=map.enemyIds.map(id=>snapshot.monsters.find(mon=>mon.id===id)).filter(mon=>mon&&difficulty.rarities.includes(mon.rarity.length));
    return (!(map.bossOnly||map.rareOnly||map.goldenLand)||['hard','extreme'].includes(difficulty.id))&&candidates.length;
  });
  let roll=random()*available.reduce((sum,difficulty)=>sum+difficulty.weight,0);
  for(const difficulty of available){roll-=difficulty.weight;if(roll<0)return difficulty;}
  return available.at(-1);
}

function accessComparison(snapshot){
  const random=mulberry32(ACCESS_SEED);
  const normalMaps=snapshot.maps.filter(map=>!map.bossOnly&&!map.rareOnly&&!map.goldenLand);
  const specialMaps=snapshot.maps.filter(map=>(map.bossOnly||map.rareOnly)&&!map.goldenLand);
  const goldenLand=snapshot.maps.find(map=>map.goldenLand);
  const monsterById=new Map(snapshot.monsters.map(mon=>[mon.id,mon]));
  let legacyMapCards=0,legacyTargetCards=0,newTargetEncounters=0;

  const candidates=(map,difficulty)=>map.enemyIds.map(id=>monsterById.get(id)).filter(mon=>mon&&difficulty.rarities.includes(mon.rarity.length));
  const consumeRequestRolls=(map,difficulty,enemyId)=>{
    let conditionCount=0;
    if(difficulty.id==='normal')conditionCount=random()<.30?1:0;
    if(difficulty.id==='hard')conditionCount=1;
    if(difficulty.id==='extreme')conditionCount=2;
    const conditionPool=[0,1,2];
    while(conditionCount--&&conditionPool.length)conditionPool.splice(Math.min(conditionPool.length-1,Math.floor(random()*conditionPool.length)),1);
    const modeRoll=random();
    const three=snapshot.rates.threeWay[difficulty.id]||0,invasion=snapshot.rates.invasion[difficulty.id]||0;
    if(modeRoll<three+invasion){
      const pool=[...new Map(candidates(map,difficulty).map(mon=>[mon.id,mon])).values()].filter(mon=>mon.id!==enemyId);
      if(pool.length)random();
      if(modeRoll>=three&&pool.length)random();
    }
  };

  for(let sample=0;sample<ACCESS_SAMPLES;sample++){
    let entries=[...normalMaps].sort(()=>random()-.5).slice(0,3).map(map=>({map,difficulty:rollDifficulty(snapshot,map,random)}));
    const triggered=specialMaps.filter(map=>random()<(map.appearRate||.1)).map(map=>({map,difficulty:rollDifficulty(snapshot,map,random)}));
    const lastDifficulty=entries[2]?.difficulty||snapshot.difficulties.normal;
    const goldenRates={easy:0,normal:.03,hard:.05,extreme:.08};
    if(goldenLand&&random()<(goldenRates[lastDifficulty.id]||0))triggered.push({map:goldenLand,difficulty:lastDifficulty});
    if(triggered.length){
      const chosen=triggered[Math.floor(random()*triggered.length)];
      if(entries.length>=3)entries[2]=chosen;else entries.push(chosen);
    }
    for(const entry of entries){
      const pool=candidates(entry.map,entry.difficulty);
      if(!pool.length)continue;
      const enemy=pool[Math.floor(random()*pool.length)];
      if(entry.map.id==='volcano')legacyMapCards++;
      if(entry.map.id==='volcano'&&entry.difficulty.id==='hard'&&enemy.id==='tsubaki')legacyTargetCards++;
      consumeRequestRolls(entry.map,entry.difficulty,enemy.id);
    }

    const volcano=normalMaps.find(map=>map.id==='volcano'),hard=snapshot.difficulties.hard;
    const worldMapPool=candidates(volcano,hard);
    const enemy=worldMapPool[Math.floor(random()*worldMapPool.length)];
    if(enemy.id==='tsubaki')newTargetEncounters++;
    consumeRequestRolls(volcano,hard,enemy.id);
  }
  return {
    samples:ACCESS_SAMPLES,target:'火山 / Hard / ツバキ',legacyCardsPerRefresh:3,
    legacyMapAccessRate:legacyMapCards/ACCESS_SAMPLES,
    legacyTargetEncounterRate:legacyTargetCards/ACCESS_SAMPLES,
    worldMapAccessRate:1,
    worldMapTargetEncounterRate:newTargetEncounters/ACCESS_SAMPLES
  };
}

const baseline=loadRules(BASE_REV);
const current=loadRules('working-tree');
const baselineSnapshot=canonicalSnapshot(baseline);
const currentSnapshot=canonicalSnapshot(current);

// Descriptions changed for the world-map presentation, so compare only economy-bearing records.
assert.deepEqual(currentSnapshot.difficulties,baselineSnapshot.difficulties,'difficulty/reward rules diverged');
assert.deepEqual(currentSnapshot.rates,baselineSnapshot.rates,'three-way/invasion rates diverged');
assert.deepEqual(currentSnapshot.materialDrops,baselineSnapshot.materialDrops,'material drop table diverged');
assert.deepEqual(currentSnapshot.contractScroll,baselineSnapshot.contractScroll,'contract scroll rule diverged');
assert.deepEqual(currentSnapshot.monsters,baselineSnapshot.monsters,'monster reward/contract/drop data diverged');
assert.match(baseline.source['js/items.js'],/Math\.min\(0\.95, baseRate \* \(it\.catchMultiplier \|\| 1\)\)/,'baseline contract formula not recognized');
assert.match(current.source['js/items.js'],/Math\.min\(0\.95, baseRate \* \(it\.catchMultiplier \|\| 1\)\)/,'current contract formula diverged');
assert.match(current.source['js/world-map.js'],/if \(eventKey\) \{ request\.battleMode='single';request\.secondEnemyId=null;request\.invasionEnemyId=null;request\.invasionTurn=null; \}/,'special world-map event single-battle policy diverged');
for(const [file,name] of [
  ['js/battle-flow.js','win'],['js/multi-battle.js','grantMultiEnemyReward'],['js/multi-battle.js','winMultiBattle'],
  ['js/items.js','tryContractWithScroll'],['js/multi-battle.js','useMultiBattleContractScroll'],
  ['js/expedition.js','progressActiveExpeditions'],['js/expedition.js','expeditionRewardPlan']
]){
  assert.equal(
    normalizedRuleSource(functionSource(current.source[file],name)),
    normalizedRuleSource(functionSource(baseline.source[file],name)),
    `${file}:${name} reward rule diverged`
  );
}

const oldMode=simulateTwentyWins(baseline);
const worldMapMode=simulateTwentyWins(current);
assert.equal(oldMode.battles.length,20);
assert.equal(worldMapMode.battles.length,20);
assert.equal(oldMode.totals.normalWins,10);
assert.equal(oldMode.totals.hardWins,10);
assert.deepEqual(worldMapMode.battles,oldMode.battles,'per-battle reward rule parity diverged');
assert.deepEqual(worldMapMode.expeditionTotals,oldMode.expeditionTotals,'expedition reward parity diverged');

const access=accessComparison(baselineSnapshot);
const report={
  kind:'deterministic-rule-simulation-not-browser-play',runDate:RUN_DATE,
  baselineRevision:BASE_REV,currentHead:CURRENT_HEAD,currentHeadTree:CURRENT_HEAD_TREE,
  battleSeed:`0x${BATTLE_SEED.toString(16)}`,accessSeed:`0x${ACCESS_SEED.toString(16)}`,
  baselineRewardRules:{...oldMode.totals,expeditionRewards:oldMode.expeditionTotals},
  currentRewardRules:{...worldMapMode.totals,expeditionRewards:worldMapMode.expeditionTotals},
  virtualContractLimitations:['inventory-not-checked','ui-not-exercised','target-choice-not-exercised','defeatedByPlayer-not-exercised'],
  specialEventBattleMode:{includedInTwentyWinComparison:false,currentRule:'single-fixed',classification:'intentional-specification-difference'},
  neutralPerWinExpectations:NEUTRAL_EXPECTATIONS,
  grasslandCoinAccessRisk:GRASSLAND_COIN_RISK,
  access,
  balanceDecision:'user-review-required-before-publication',
  browserTwentyWinPlaythrough:'not-verified'
};

console.log('World-map reward-rule parity passed: 20 wins per rule set (10 Normal + 10 Hard).');
console.log(JSON.stringify(report,null,2));
