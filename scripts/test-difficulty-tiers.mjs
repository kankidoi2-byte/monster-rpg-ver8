import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({console,structuredClone});
for(const name of ['data','core','state'])vm.runInContext(fs.readFileSync(new URL(`../js/${name}.js`,import.meta.url),'utf8'),context);
const run=s=>vm.runInContext(s,context);
const plain=value=>JSON.parse(JSON.stringify(value));
const expected=[
 ['d1',[1,6],[1,2],.7,20,0,0,0,0,0,0,5],
 ['d2',[6,18],[1,2,3],1,30,.05,.05,.02,200,0,.3,8],
 ['d3',[18,32],[2,3],1.4,25,.1,.1,.03,300,0,1,12],
 ['d4',[32,46],[2,3,4],1.8,15,.15,.15,.04,450,.01,1,16],
 ['d5',[46,60],[3,4],2.4,10,.2,.2,.05,600,.015,1,22],
 ['extreme',[100,100],[5],3,10,.3,.3,.08,1000,.03,2,35]
];
assert.deepEqual(plain(run('Object.keys(HUNT_DIFFICULTIES)')),expected.map(x=>x[0]));
for(const [id,range,rarities,reward,weight,threeWay,invasion,golden,coins,mapRate,conditions,exp] of expected){
 const d=plain(run(`huntDifficulty('${id}')`));
 assert.deepEqual(d.levelRange,range);assert.deepEqual(d.rarities,rarities);
 assert.equal(d.rewardMultiplier,reward);assert.equal(d.weight,weight);
 assert.equal(d.hpMultiplier,id==='extreme'?1.3:1);assert.equal(d.attackMultiplier,id==='extreme'?1.3:1);
 assert.equal(d.contractorExp,exp);assert.equal(d.conditionCount,conditions);
 for(const [constant,value] of [['THREE_WAY_RATES',threeWay],['INVASION_RATES',invasion],['GOLDEN_LAND_RATES',golden],['GOLDEN_LAND_COIN_BONUSES',coins],['GOLDEN_LAND_MAP_HUNT_RATES',mapRate]])assert.equal(run(`${constant}['${id}']`),value,`${id} ${constant}`);
 // Midpoints of equal bins must cover each integer level once, regardless of obsolete species settings.
 const count=range[1]-range[0]+1;
 assert.deepEqual(plain(run(`Array.from({length:${count}},(_,i)=>huntLevelFor({huntLevels:{normal:99,hard:99}},'${id}',()=> (i+.5)/${count}))`)),Array.from({length:count},(_,i)=>range[0]+i));
 const low=run(`rollHuntConditionIds('${id}',()=>0).length`),high=run(`rollHuntConditionIds('${id}',()=>.999999).length`);
 assert.equal(low,conditions===.3?1:conditions);assert.equal(high,conditions===.3?0:conditions);
 assert.equal(run(`new Set(rollHuntConditionIds('${id}',()=>0)).size`),low,'conditions must be distinct');
 assert.equal(run(`rollHuntBattleMode('${id}',()=>${threeWay+invasion})`),'single');
 if(threeWay)assert.equal(run(`rollHuntBattleMode('${id}',()=>${threeWay/2})`),'three_way');
 if(invasion)assert.equal(run(`rollHuntBattleMode('${id}',()=>${threeWay+invasion/2})`),'invasion_pending');
}
assert.deepEqual(plain(run(`['easy','normal','hard'].map(id=>huntDifficulty(id).id)`)),['d1','d2','d4']);
run(`var testMap=MAPS.find(m=>m.id==='grassland');var first=huntCandidatesFor(testMap,'d2')[0];`);
for(const [rank,chance] of [[1,.1],[50,.2],[0,.1],[100,.2]])assert.equal(run(`huntOvertierChance(${rank})`),chance);
for(const [rank,count] of [[1,100],[50,200]]){
 assert.equal(run(`Array.from({length:1000},(_,i)=>{let n=0;return createHuntRequest(testMap,first,'d2',[],{contractorRank:${rank},randomFn:()=>n++===0?(i+.5)/1000:.5}).overtier}).filter(Boolean).length`),count,'rank probability must exactly cover the deterministic sample');
}
for(let tier=1;tier<=5;tier++){
 const id=`d${tier}`;
 const request=plain(run(`createHuntRequest(testMap,huntCandidatesFor(testMap,'${id}')[0],'${id}',[],{randomFn:()=>0})`));
 const range=tier===5?[61,70]:expected[tier][1];
 assert.equal(request.difficultyId,id,'selected tier must remain the reward/unlock key');
 assert.equal(request.overtier,tier===5?'nushi':'stronger');
 assert.equal(request.encounterLabel,tier===5?'ヌシ':'格上');
 assert.equal(request.enemyLevel,range[0]);
 assert.equal(request.attackMultiplier,tier===5?1.8:1);
 assert.equal(request.rewardMultiplier,Number((expected[tier-1][3]*(tier===5?3:1.5)).toFixed(4)));
 context.request=request;
 assert.equal(request.enemyHp,run(`Math.round(maxHp(by(request.enemyId),request.enemyLevel)*${tier===5?3:1})`));
 assert.equal(run(`huntDifficulty('${tier===5?'d5':`d${tier+1}`}').rarities.includes(huntMonsterRarity(by(request.enemyId)))`),true);
 if(request.secondEnemyId){
   assert.equal(run(`isHuntMonsterEligible(by(request.secondEnemyId),'${id}')`),true,'second monster must stay in selected tier');
   const secondary=plain(run(`createHuntRequest(testMap,by(request.secondEnemyId),'${id}',[],{allowOvertier:false,randomFn:()=>0})`));
   assert.equal(secondary.overtier,null);assert.equal(secondary.enemyLevel,expected[tier-1][1][0]);
   assert.equal(secondary.attackMultiplier,1);assert.equal(secondary.rewardMultiplier,expected[tier-1][3]);
 }
}
assert.equal(run(`createHuntRequest(testMap,first,'extreme',[],{randomFn:()=>0}).overtier`),null);
assert.equal(run(`createHuntRequest(testMap,first,'d2',[],{randomFn:()=>0,candidatesFor:()=>[]}).overtier`),null,'no eligible higher-tier candidates means no elevation');
const fixed=plain(run(`createHuntRequest(testMap,first,'d1',[],{randomFn:()=>0,enemyLevel:1,hpMultiplier:.85,attackMultiplier:.85})`));
assert.equal(fixed.enemyLevel,1);assert.equal(fixed.overtier,null);assert.equal(fixed.attackMultiplier,.85);
context.fixed=fixed;assert.equal(fixed.enemyHp,run('Math.round(maxHp(by(fixed.enemyId),1)*.85)'));
// Filter callback owns world-event exclusions. Neither primary nor second selection may leak outside it.
const filtered=plain(run(`createHuntRequest(testMap,first,'d2',[],{randomFn:()=>0,candidatesFor:(map,id)=>huntCandidatesFor(map,id).filter(m=>m.id==='slime')})`));
assert.equal(filtered.enemyId,'slime');assert.equal(filtered.secondEnemyId,'slime');
console.log('Difficulty tiers passed: tuning table, uniform levels, rates, legacy aliases, rank probabilities, overtier/nushi stats and rewards, secondary filtering, scripted and Extreme exclusions.');
