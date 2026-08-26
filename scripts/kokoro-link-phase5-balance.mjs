import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const rootUrl=new URL('../',import.meta.url);
export const TARGET_LEVELS=Object.freeze([1,10,30]);
export const ATTRIBUTE_IDS=Object.freeze(['normal','fire','water','grass','thunder','wind','light','dark','star','dragon']);

function rounded(value,digits=4){return Number(Number(value).toFixed(digits));}
function mean(values){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;}
function rarityOf(monster){return Math.max(1,String(monster?.rarity||'★').length);}

export function loadBalanceRuntime(){
  const context=vm.createContext({console,Date,JSON,Math});
  for(const file of ['data.js','kokoro-link.js'])vm.runInContext(fs.readFileSync(new URL(`js/${file}`,rootUrl),'utf8'),context,{filename:`js/${file}`});
  return vm.runInContext(`({
    monsters:M.filter(unit=>unit.entityKind==='monster'),
    config:KOKORO_LINK_CONFIG,
    rules:KOKORO_LINK_ABILITY_RULES,
    buildKokoroLinkProfile,
    buildKokoroLinkAbilityPlan,
    resolveKokoroLink
  })`,context);
}

export function targetStatsAtLevel(monster,level){
  return {maxHp:Math.max(1,Number(monster?.hp||1)+(Math.max(1,level)-1)*12),speed:Math.max(1,Number(monster?.spd??50))};
}

export function buildPairRows(runtime=loadBalanceRuntime(),levels=TARGET_LEVELS){
  const rows=[];
  for(const source of runtime.monsters){
    for(const target of runtime.monsters){
      if(source.id===target.id)continue;
      for(const level of levels){
        const targetStats=targetStatsAtLevel(target,level);
        const resolved=runtime.resolveKokoroLink(source,{uid:`source-${source.id}`,level:99},targetStats);
        const barrierRate=resolved.effects.barrier/targetStats.maxHp;
        const speedRate=resolved.effects.speedBonus/targetStats.speed;
        const basePackage=resolved.profile.linkRate*3;
        const statPackage=barrierRate+resolved.effects.attackBonus+speedRate;
        const persistentStatBoost=!!resolved.powerAbility&&['extraAttackRate','extraBarrier','extraSpeed'].some(key=>Number(resolved.powerAbility[key])>0);
        rows.push({
          sourceId:source.id,sourceName:source.name,rarity:resolved.profile.rarity,primaryType:resolved.profile.primaryType,
          abilityBand:resolved.abilityPlan?.band||null,abilityId:resolved.abilityPlan?.abilityId||null,deferred:!!resolved.abilityPlan?.deferredReason,
          targetId:target.id,targetLevel:level,effectRate:resolved.profile.linkRate,
          barrierRate:rounded(barrierRate),attackRate:resolved.effects.attackBonus,speedRate:rounded(speedRate),
          basePackage:rounded(basePackage),statPackage:rounded(statPackage),persistentStatBonus:rounded(statPackage-basePackage),persistentStatBoost
        });
      }
    }
  }
  return rows;
}

export function summarizeRarities(runtime,rows){
  return [1,2,3,4,5].map(rarity=>{
    const sources=runtime.monsters.filter(monster=>rarityOf(monster)===rarity);
    const group=rows.filter(row=>row.rarity===rarity);
    const packages=group.map(row=>row.statPackage);
    return {
      rarity,sourceCount:sources.length,pairCount:group.length,multiplier:runtime.config.rarityMultipliers[rarity],
      effectRate:rounded(runtime.config.conversion.baseEffectRate*runtime.config.rarityMultipliers[rarity]),
      basePackage:rounded(runtime.config.conversion.baseEffectRate*runtime.config.rarityMultipliers[rarity]*3),
      statPackageMean:rounded(mean(packages)),statPackageMin:rounded(Math.min(...packages)),statPackageMax:rounded(Math.max(...packages)),
      persistentBoostSourceCount:new Set(group.filter(row=>row.persistentStatBoost).map(row=>row.sourceId)).size
    };
  });
}

export function summarizeLevelStability(rows){
  return [1,2,3,4,5].map(rarity=>{
    const means=TARGET_LEVELS.map(level=>{
      const values=rows.filter(row=>row.rarity===rarity&&row.targetLevel===level).map(row=>row.statPackage);
      return {level,statPackageMean:rounded(mean(values))};
    });
    const values=means.map(row=>row.statPackageMean);
    return {rarity,means,maxDrift:rounded(Math.max(...values)-Math.min(...values))};
  });
}

export function buildAbilityCoverage(runtime){
  const actual=new Map();
  for(const monster of runtime.monsters){
    const profile=runtime.buildKokoroLinkProfile(monster,{uid:`coverage-${monster.id}`,level:1});
    const plan=runtime.buildKokoroLinkAbilityPlan(profile);
    if(!plan)continue;
    const key=`${plan.band}:${plan.abilityId}`;
    const current=actual.get(key)||{rarity:profile.rarity,band:plan.band,primaryType:plan.primaryType,abilityId:plan.abilityId,sourceCount:0,sourceNames:[],deferred:!!plan.deferredReason};
    current.sourceCount++;current.sourceNames.push(monster.name);actual.set(key,current);
  }
  const planned=[];
  for(const rarity of [1,2,3]){
    for(const type of ATTRIBUTE_IDS){
      const synthetic={id:`planned-${rarity}-${type}`,name:type,entityKind:'monster',rarity:'★'.repeat(rarity),types:[type]};
      const profile=runtime.buildKokoroLinkProfile(synthetic,{uid:synthetic.id,level:1});
      const plan=runtime.buildKokoroLinkAbilityPlan(profile);
      const row=actual.get(`${plan.band}:${plan.abilityId}`);
      planned.push(row?{...row,sourceNames:[...row.sourceNames]}:{rarity,band:plan.band,primaryType:type,abilityId:plan.abilityId,sourceCount:0,sourceNames:[],deferred:!!plan.deferredReason});
    }
  }
  return planned;
}

export function analyzeKokoroLinkBalance(runtime=loadBalanceRuntime()){
  const pairRows=buildPairRows(runtime);
  const abilityCoverage=buildAbilityCoverage(runtime);
  const deferredSources=abilityCoverage.filter(row=>row.deferred&&row.sourceCount>0);
  return {
    monsterCount:runtime.monsters.length,targetLevels:[...TARGET_LEVELS],pairCount:pairRows.length,
    raritySummary:summarizeRarities(runtime,pairRows),levelStability:summarizeLevelStability(pairRows),abilityCoverage,
    uncoveredAbilities:abilityCoverage.filter(row=>row.sourceCount===0),
    deferredSources,
    deferredThreeStarSourceShare:rounded(deferredSources.reduce((sum,row)=>sum+row.sourceCount,0)/runtime.monsters.filter(monster=>rarityOf(monster)===3).length)
  };
}

function printReport(analysis){
  console.log(`ココロリンク Phase 5: ${analysis.monsterCount}体、${analysis.pairCount}組を分析`);
  console.table(analysis.raritySummary);
  console.log('\nLv1・10・30の割合安定性');console.table(analysis.levelStability.map(({rarity,means,maxDrift})=>({rarity,levelMeans:means.map(row=>row.statPackageMean).join(' / '),maxDrift})));
  console.log('\n実在するリンク元がいない能力');console.table(analysis.uncoveredAbilities.map(({rarity,primaryType,abilityId})=>({rarity,primaryType,abilityId})));
  console.log('\n実在するが保留中の能力');console.table(analysis.deferredSources.map(({rarity,primaryType,abilityId,sourceCount,sourceNames})=>({rarity,primaryType,abilityId,sourceCount,sourceNames:sourceNames.join('、')})));
  console.log(`★3保留能力のリンク元比率: ${(analysis.deferredThreeStarSourceShare*100).toFixed(1)}%`);
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const analysis=analyzeKokoroLinkBalance();
  if(process.argv.includes('--json'))console.log(JSON.stringify(analysis,null,2));else printReport(analysis);
}
