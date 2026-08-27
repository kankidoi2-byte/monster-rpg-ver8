import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/contractor-rank.js',import.meta.url),'utf8');
const save={contractor:{systemVersion:1,exp:0,claimedRankRewards:[],expEventIds:[],unlockedTitleIds:[],equippedTitleId:null,recentExp:[],legacyMigrationVersion:0}};
const context=vm.createContext({console,Date,Math,save,contractorSaveDefaults:()=>({systemVersion:1,exp:0,claimedRankRewards:[],expEventIds:[],unlockedTitleIds:[],equippedTitleId:null,recentExp:[],legacyMigrationVersion:0})});
vm.runInContext(source,context);

const value=expression=>vm.runInContext(expression,context);
assert.equal(value('contractorExpToNextRank(1)'),100);
assert.equal(value('contractorExpToNextRank(2)'),150);
assert.equal(value('contractorCumulativeExpForRank(5)'),700);
assert.equal(value('contractorCumulativeExpForRank(10)'),2700);
assert.equal(value('contractorCumulativeExpForRank(15)'),5950);
assert.equal(value('contractorCumulativeExpForRank(20)'),10450);
assert.equal(value('contractorCumulativeExpForRank(30)'),23200);
assert.equal(value('contractorCumulativeExpForRank(50)'),63700);
assert.equal(value('contractorRankFromExp(699)'),4);
assert.equal(value('contractorRankFromExp(700)'),5);

const first=value("grantContractorExp(700,{source:'test',eventId:'phase1:first',awardedAt:'2026-08-26T00:00:00.000Z'})");
assert.equal(first.oldRank,1);
assert.equal(first.newRank,5);
assert.deepEqual([...first.reachedRanks],[2,3,4,5]);
assert.deepEqual([...first.unlockedTitleIds],['rank_05_full_contractor']);
assert.equal(save.contractor.recentExp.length,1);
assert.equal(value("equipContractorTitle('rank_05_full_contractor')"),true);
assert.equal(value("equippedContractorTitle().name"),'一人前の契約者');
assert.equal(value("equipContractorTitle('rank_10_veteran_contractor')"),false);

const duplicate=value("grantContractorExp(100,{eventId:'phase1:first'})");
assert.equal(duplicate.awarded,false);
assert.equal(duplicate.reason,'duplicate_event');
assert.equal(save.contractor.exp,700);

for(let index=0;index<25;index++)value(`grantContractorExp(1,{source:'history-${index}'})`);
assert.equal(save.contractor.recentExp.length,20,'recent EXP history must stay bounded');
value('grantContractorExp(999999,{eventId:"phase1:max"})');
assert.equal(value('contractorRankFromExp(save.contractor.exp)'),50);
assert.equal(save.contractor.exp,63700);
assert.equal(value('contractorRankProgress(save.contractor.exp).isMax'),true);
assert.equal(save.contractor.unlockedTitleIds.length,7,'all Rank titles must unlock by Rank 50');

const atMax=value("grantContractorExp(100,{eventId:'phase1:after-max'})");
assert.equal(atMax.reason,'max_rank');
assert.ok(save.contractor.expEventIds.includes('phase1:after-max'),'unique events must still be consumed at the Rank cap');

console.log('Contractor Rank foundation validation passed (curve, cap, title unlock/equip, event dedupe, and bounded history).');
