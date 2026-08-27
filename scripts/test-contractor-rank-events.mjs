import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const source=fs.readFileSync(new URL('js/contractor-rank.js',root),'utf8');
const defaults=()=>({systemVersion:1,exp:0,claimedRankRewards:[],expEventIds:[],unlockedTitleIds:[],equippedTitleId:null,recentExp:[],legacyMigrationVersion:0,legacyMigrationSummary:null});
const save={saveMeta:{migrations:[]},history:{wins:0,logs:[]},caught:[],expeditions:{completedCount:0},contractor:defaults()};
const context=vm.createContext({console,Date,Math,M:[],save,contractorSaveDefaults:defaults});
vm.runInContext(source,context);
const value=expression=>vm.runInContext(expression,context);

assert.equal(value("grantContractorBattleWin({difficultyId:'easy'}).amount"),5);
assert.equal(value("grantContractorBattleWin({difficultyId:'normal',multi:true}).amount"),20);
assert.equal(value("grantContractorBattleWin({difficultyId:'hard'}).amount"),20);
assert.equal(value("grantContractorBattleWin({difficultyId:'extreme'}).amount"),35);

context.boss={id:'boss',name:'Boss',bossClass:'ボス級'};
context.superBoss={id:'super',name:'Super',bossClass:'超ボス級'};
assert.equal(value("grantContractorBattleWin({difficultyId:'normal',enemies:[boss,superBoss]}).amount"),360);
assert.equal(value("grantContractorBattleWin({difficultyId:'normal',enemies:[boss,superBoss]}).amount"),10,'boss bonuses must only be awarded once');

assert.equal(value("grantContractorContractSuccess('freigal').amount"),50);
assert.equal(value("grantContractorContractSuccess('freigal').amount"),20,'repeat contracts must not repeat the first-species bonus');
save.caught.push('new_species');
assert.equal(value("contractorGrantSummary([grantContractorDexRegistration('new_species'),grantContractorContractSuccess('new_species')]).amount"),80,'a first contract with a new species must total 80 EXP');

for(let index=1;index<=9;index++){save.caught.push(`dex_${index}`);value(`grantContractorDexRegistration('dex_${index}')`);}
assert.ok(save.contractor.expEventIds.includes('dex:milestone:10'),'the tenth unique dex registration must award a milestone');
assert.equal(value("grantContractorDexRegistration('dex_9').amount"),0,'the same dex registration and milestone must not repeat');
assert.equal(value("grantContractorCatalogRegistration('item','potion').amount"),30);
assert.equal(value("grantContractorCatalogRegistration('map','grassland').amount"),30);
assert.equal(value("grantContractorCatalogRegistration('map','grassland').amount"),0,'the same map registration must not repeat');

assert.equal(value('grantContractorEvolution().amount'),30);
assert.equal(value('grantContractorEvolution({special:true}).amount'),50);
assert.equal(value('grantContractorAlchemySuccess().amount'),50);
context.shortExpedition={id:'short_1',distanceId:'short'};
context.mediumExpedition={id:'medium_1',distanceId:'medium'};
context.longExpedition={id:'long_1',distanceId:'long'};
assert.equal(value('grantContractorExpeditionComplete(shortExpedition).amount'),10);
assert.equal(value('grantContractorExpeditionComplete(mediumExpedition).amount'),25);
assert.equal(value('grantContractorExpeditionComplete(longExpedition).amount'),45);
assert.equal(value('grantContractorExpeditionComplete(longExpedition).amount'),0,'the same expedition completion must not repeat');

const wiring=[
  ['js/save.js','grantContractorDexRegistration'],
  ['js/save.js',"grantContractorCatalogRegistration('item',itemId)"],
  ['js/save.js',"grantContractorCatalogRegistration('map',mapId)"],
  ['js/battle-flow.js','grantContractorBattleWin'],
  ['js/multi-battle.js','multi:true'],
  ['js/multi-battle.js','grantContractorContractSuccess'],
  ['js/items.js','grantContractorContractSuccess'],
  ['js/progression.js','grantContractorEvolution({special:true})'],
  ['js/progression.js','grantContractorEvolution()'],
  ['js/alchemy.js','grantContractorAlchemySuccess'],
  ['js/expedition.js','grantContractorExpeditionComplete']
];
wiring.forEach(([file,needle])=>assert.ok(fs.readFileSync(new URL(file,root),'utf8').includes(needle),`${file} must wire ${needle}`));

console.log('Contractor Rank event validation passed (battle, multi bonus, bosses, contracts, dex milestones, evolution, alchemy, expedition, and wiring).');
