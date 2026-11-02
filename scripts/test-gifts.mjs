import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const c=vm.createContext({console,Math,Date,Intl,setInterval(){},window:{addEventListener(){}},document:{addEventListener(){},getElementById(){return null}}});
for(const f of ['js/data.js','js/core.js','js/gifts-data.js','js/gifts.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});
const run=s=>vm.runInContext(s,c);
const opening=JSON.parse(run('JSON.stringify(DEV_GIFTS.find(g=>g.id==="20261102-present-box-open"))'));
assert.deepEqual(opening,{
 id:'20261102-present-box-open',title:'プレゼントBOX開設記念',letter:'プレゼントBOXを開きました。ちゃんと届いていますか？',startAt:'2026-11-02',until:'2026-11-30',
 rewards:[{kind:'coins',amount:5000},{kind:'item',id:'rainbow_contract_scroll',count:3},{kind:'item',id:'giga_data',count:5},{kind:'item',id:'upper_potion',count:10},{kind:'item',id:'fine_magic_crystal',count:2}]
},'approved opening gift: exact letter, period, item mapping and quantities');
assert.deepEqual(Array.from(run('validateDeveloperGifts(DEV_GIFTS)')),[]);
// Synthetic validator cases must not depend on the current live campaigns.
run('DEV_GIFTS.splice(0,DEV_GIFTS.length)');
run(`globalThis.sample={id:'test',title:'混在',letter:'手紙\\n改行',startAt:'2026-11-02',until:'2026-11-30',rewards:[{kind:'coins',amount:5},{kind:'item',id:'rainbow_contract_scroll',count:3},{kind:'monster',id:'false_dragon_alfa',level:30},{kind:'character',id:'character_vera_3',level:1},{kind:'skill',id:'s110_110',count:2}]}`);
assert.equal(run('giftDeveloperErrors(sample).length'),0);
for(const expr of ["({...sample,id:''})","({...sample,startAt:'2026-02-30'})","({...sample,until:'2026-11-01'})","({...sample,until:undefined})","({...sample,rewards:[]})","({...sample,rewards:[{kind:'item',id:'missing',count:1}]})","({...sample,rewards:[{kind:'skill',id:'missing',count:1}]})","({...sample,rewards:[{kind:'monster',id:'elna_beginner',level:1}]})","({...sample,rewards:[{kind:'character',id:'freigal',level:1}]})","({...sample,rewards:[{kind:'monster',id:'freigal',level:101}]})","({...sample,rewards:[{kind:'monster',id:'freigal',level:0}]})","({...sample,rewards:[{kind:'coins',amount:-1}]})","({...sample,rewards:[{kind:'coins',amount:1.5}]})","({...sample,rewards:[{kind:'skill',id:'s110_110',count:0}]})"]){assert(run(`giftDeveloperErrors(${expr}).length>0`),expr);}
assert(run('validateDeveloperGifts([sample,sample]).some(e=>e.includes("duplicate"))'));
c.save={giftClaimedIds:[]};run('DEV_GIFTS.push(sample)');
assert.equal(run("developerGiftEntries(Date.parse('2026-11-01T14:59:59.999Z')).length"),0);
assert.equal(run("developerGiftEntries(Date.parse('2026-11-01T15:00:00Z')).length"),1);
assert.equal(run("developerGiftEntries(Date.parse('2026-11-30T14:59:59.999Z')).length"),1);
assert.equal(run("developerGiftEntries(Date.parse('2026-11-30T15:00:00Z')).length"),0);
run('DEV_GIFTS.push(sample)');assert.equal(run("developerGiftEntries(Date.parse('2026-11-02T00:00:00Z')).length"),0,'duplicate runtime IDs hidden entirely');
run('DEV_GIFTS.pop();DEV_GIFTS[0]={...sample,rewards:[{kind:"monster",id:"missing",level:1}]}');assert.equal(run("developerGiftEntries(Date.parse('2026-11-02T00:00:00Z')).length"),0,'invalid runtime reward suppresses entire gift');
assert.throws(()=>run('giftCombineRewards([{rewards:[{kind:"coins",amount:Number.MAX_SAFE_INTEGER},{kind:"coins",amount:1}]}])'));
const ids=fs.readFileSync('index.html','utf8');assert(!ids.includes('lifeQuestRewardBox'));assert(ids.includes('id="giftBox"'));assert(ids.includes('js/gifts-data.js?v='));
console.log('PASS gifts: real registries/all five types, synthesis-only skill, integer/level/classification/date/duplicate validation, JST start/end boundaries, invalid-runtime exclusion and overflow.');
// Sort, source adapters, prefix migration, and history have independent clocks.
c.LifeQuestRewards={sync:()=>({entries:[{id:'old',label:'Lv.5',source:'level',coins:900,items:{rainbow_contract_scroll:1},createdAt:'2026-11-01T12:00:00Z'},{id:'new',label:'連続7日',coins:0,items:{rainbow_contract_scroll:1},createdAt:'2026-11-02T12:00:00Z'}]})};
vm.runInContext(fs.readFileSync('js/life-quest.js','utf8'),c);
c.save={giftClaimedIds:[],lifeQuestClaimedIds:[],giftReceiptVersion:1,giftHistory:[]};
run(`DEV_GIFTS.splice(0,DEV_GIFTS.length,{...sample,id:'no-expiry',until:null},{...sample,id:'later',until:'2026-11-20'},{...sample,id:'sooner',until:'2026-11-03'})`);
assert.equal(run(`pendingGifts(Date.parse('2026-11-02T00:00:00Z')).slice(0,2).map(g=>g.id).join()`),'sooner,later');
assert.equal(run('lifeQuestGiftEntries()[0].title'),'Life Quest Lv.5 到達');
assert.equal(run('lifeQuestGiftEntries()[1].title'),'連続7日達成');
run('save.lifeQuestClaimedIds=["new"]');assert.equal(run('pendingLifeQuestRewards()[0].id'),'old','v1 never consumes earlier unclaimed entries');
run('delete save.giftReceiptVersion');assert.equal(run('pendingLifeQuestRewards().length'),0,'v0 still protects already-claimed prefix');
run('migrateLifeQuestGiftReceipts(LifeQuestRewards.sync().entries)');assert.equal(run('save.lifeQuestClaimedIds.includes("old")'),true);assert.equal(run('save.giftReceiptVersion'),1);
run(`save.giftHistory=Array.from({length:220},(_,i)=>({...sample,key:'history-'+i,receivedAt:new Date(Date.now()-i*1000).toISOString()}));save.giftHistory.push({...sample,key:'expired',receivedAt:'2000-01-01T00:00:00Z'})`);
assert.equal(run('giftHistoryEntries().length'),200);assert.equal(run('giftHistoryEntries()[0].key'),'history-0');assert.equal(run('giftHistoryEntries().some(g=>g.key==="expired")'),false);
console.log('PASS gifts: deadline/newest ordering, Life Quest labels, old-prefix migration versus individual receipts, 90-day/200-history retention.');
