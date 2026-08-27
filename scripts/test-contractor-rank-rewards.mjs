import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/contractor-rank.js',import.meta.url),'utf8');
const dataSource=fs.readFileSync(new URL('../js/data.js',import.meta.url),'utf8');
const defaults=()=>({systemVersion:1,exp:0,claimedRankRewards:[],expEventIds:[],unlockedTitleIds:[],equippedTitleId:null,recentExp:[],pendingRankUps:[],legacyMigrationVersion:1,legacyMigrationSummary:null});
const registeredItems=[];
const save={saveMeta:{migrations:[]},history:{wins:0,logs:[]},caught:[],itemDex:[],mapDex:[],items:{},coins:0,expeditions:{completedCount:0},contractor:{...defaults(),exp:10450}};
const context=vm.createContext({console,Date,Math,M:[],save,contractorSaveDefaults:defaults,registerItemDex:itemId=>registeredItems.push(itemId)});
vm.runInContext(source,context);
const value=expression=>vm.runInContext(expression,context);

assert.equal(value('CONTRACTOR_RANK_REWARD_CATALOG.length'),49,'Ranks 2-50 must all have one reward entry');
assert.deepEqual({...value('contractorRankReward(2).items')},{contract_scroll:2});
assert.equal(value('contractorRankReward(5).coins'),150);
assert.deepEqual({...value('contractorRankReward(6).items')},{monster_bone:1,magic_crystal:1,metal_ore:1,unstable_alchemy_matter:1,raptor_feather:1,venom_carapace:1});
assert.deepEqual({...value('contractorRankReward(12).items')},{fine_monster_bone:1,fine_magic_crystal:1,fine_metal_ore:1,fine_unstable_alchemy_matter:1,fine_raptor_feather:1,fine_venom_carapace:1});
assert.equal(value('contractorRankReward(20).coins'),750);
assert.equal(value('contractorRankReward(50).titleId'),'rank_50_star_binder');
assert.equal(value('contractorRankReward(1)'),null);
const knownItemIds=new Set([...dataSource.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]));
const rewardItemIds=value('CONTRACTOR_RANK_REWARD_CATALOG.flatMap(reward=>Object.keys(reward.items))');
rewardItemIds.forEach(itemId=>assert.ok(knownItemIds.has(itemId),`Rank reward item must exist in game data: ${itemId}`));

const first=value('claimContractorRankReward(2)');
assert.equal(first.claimed,true);
assert.equal(save.items.contract_scroll,2);
assert.deepEqual([...save.contractor.claimedRankRewards],[2]);
assert.ok(registeredItems.includes('contract_scroll'));

const duplicate=value('claimContractorRankReward(2)');
assert.equal(duplicate.claimed,false);
assert.equal(duplicate.reason,'already_claimed');
assert.equal(save.items.contract_scroll,2,'duplicate claims must not grant items again');

const locked=value('claimContractorRankReward(21)');
assert.equal(locked.claimed,false);
assert.equal(locked.reason,'rank_locked');

const all=value('claimAllContractorRankRewards()');
assert.deepEqual([...all.claimedRanks],Array.from({length:18},(_,index)=>index+3));
assert.equal(all.coins,2800);
assert.equal(save.coins,2800);
assert.equal(save.items.rainbow_contract_scroll,2);
assert.equal(save.items.giga_data,1);
assert.equal(save.items.kilo_data,2);
assert.equal(save.items.fine_venom_carapace,1);
assert.deepEqual([...save.contractor.claimedRankRewards],Array.from({length:19},(_,index)=>index+2));

const afterAll=JSON.stringify({coins:save.coins,items:save.items,claims:save.contractor.claimedRankRewards});
assert.equal(value('claimAllContractorRankRewards().reason'),'nothing_to_claim');
assert.equal(JSON.stringify({coins:save.coins,items:save.items,claims:save.contractor.claimedRankRewards}),afterAll,'claim-all must be idempotent');

console.log('Contractor Rank reward validation passed (49 rewards, milestones, locks, individual/all claims, item registration, and idempotency).');
