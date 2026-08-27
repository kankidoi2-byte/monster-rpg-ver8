import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/contractor-rank.js',import.meta.url),'utf8');
const defaults=()=>({systemVersion:1,exp:0,claimedRankRewards:[],expEventIds:[],unlockedTitleIds:[],equippedTitleId:null,recentExp:[],pendingRankUps:[],legacyMigrationVersion:0,legacyMigrationSummary:null});
const monsters=[
  {id:'field_mon',name:'野の獣'},
  {id:'boss_mon',name:'黒鉄の王',bossClass:'ボス級'},
  {id:'super_mon',name:'星喰らい',bossClass:'超ボス級'}
];

function run(save){
  const context=vm.createContext({console,Date,Math,M:monsters,save,contractorSaveDefaults:defaults});
  vm.runInContext(source,context);
  return {context,value:expression=>vm.runInContext(expression,context)};
}

const legacySave={
  saveMeta:{migrations:['v0_to_v1','v1_to_v2_map_dex','v2_to_v3_contractor_rank']},
  history:{wins:12,logs:['野の獣に勝利','黒鉄の王に勝利','星喰らいとの三つ巴に勝利']},
  caught:['field_mon','boss_mon','field_mon'],itemDex:[],mapDex:[],
  expeditions:{completedCount:2},
  contractor:defaults()
};
const legacy=run(legacySave);
assert.equal(legacySave.contractor.exp,570,'legacy EXP must combine wins, unique unit dex entries, expeditions, and detected bosses');
assert.equal(legacySave.contractor.legacyMigrationVersion,1);
assert.equal(legacySave.contractor.legacyMigrationSummary.winsExp,120);
assert.equal(legacySave.contractor.legacyMigrationSummary.unitDexExp,60);
assert.equal(legacySave.contractor.legacyMigrationSummary.expeditionExp,40);
assert.equal(legacySave.contractor.legacyMigrationSummary.bossExp,350);
assert.equal(legacySave.contractor.legacyMigrationSummary.storyExp,0);
assert.equal(legacySave.contractor.legacyMigrationSummary.missionExp,0);
assert.deepEqual(legacySave.contractor.pendingRankUps,[],'legacy reconstruction must not replay Rank-up animations');
assert.deepEqual([...legacy.value('unclaimedContractorRankRewardRanks()')],[2,3,4]);
assert.ok(legacySave.contractor.expEventIds.includes('boss:first:boss_mon'));
assert.ok(legacySave.contractor.expEventIds.includes('boss:first:super_mon'));
const before=JSON.stringify(legacySave.contractor);
assert.equal(legacy.value('migrateLegacyContractorProgress().reason'),'already_migrated');
assert.equal(JSON.stringify(legacySave.contractor),before,'legacy reconstruction must be idempotent');

const milestoneSave={saveMeta:{migrations:['v2_to_v3_contractor_rank']},history:{wins:0,logs:[]},caught:Array.from({length:10},(_,index)=>`unit_${index}`),itemDex:[],mapDex:[],expeditions:{completedCount:0},contractor:defaults()};
run(milestoneSave);
assert.equal(milestoneSave.contractor.exp,400,'legacy dex reconstruction must include the 10-unit milestone bonus');
assert.equal(milestoneSave.contractor.legacyMigrationSummary.dexMilestoneCount,1);
assert.equal(milestoneSave.contractor.legacyMigrationSummary.dexMilestoneExp,100);
assert.ok(milestoneSave.contractor.expEventIds.includes('dex:milestone:10'));

const freshSave={saveMeta:{migrations:[]},history:{wins:99,logs:['黒鉄の王に勝利']},caught:[],itemDex:[],mapDex:[],expeditions:{completedCount:8},contractor:defaults()};
run(freshSave);
assert.equal(freshSave.contractor.exp,0,'a new schema-v3 save must not receive legacy reconstruction');
assert.equal(freshSave.contractor.legacyMigrationSummary.eligible,false);
assert.equal(freshSave.contractor.legacyMigrationSummary.resultingRank,1);

const seededFreshSave={saveMeta:{migrations:[]},history:{wins:0,logs:[]},caught:['field_mon'],itemDex:['potion'],mapDex:['grassland'],expeditions:{completedCount:0},contractor:defaults()};
run(seededFreshSave);
assert.equal(seededFreshSave.contractor.exp,90,'new saves must count already-created initial dex entries without reconstructing unrelated history');

console.log('Contractor Rank legacy migration validation passed (activity reconstruction, boss detection, pending rewards, new-save guard, and idempotency).');
