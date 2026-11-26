import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime,seeded} from '../tools/balance-audit/runtime.mjs';
function fixture(kind='single',on=true){
 const r=runtime({save:s=>s+'\nglobalThis.actualGBSave=saveGame;'});
 r.context.console={...console,error(){}};r.context.document.addEventListener=()=>{};r.context.window={addEventListener(){}};
 vm.runInContext(fs.readFileSync('js/tutorial.js','utf8'),r.context);
 r.context.Math.random=seeded(91);
 r.run(`saveGame=actualGBSave;save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
 var hero=addInstance('aquaron',1);save.party=[hero.uid];prepareBattleParty();
 enemy={...by('slime'),expBonus:41,coinBonus:13};selectedMap=MAPS.find(m=>m.id==='grassland');
 activeHuntRequest={mapId:'grassland',difficultyId:'hard',rewardMultiplier:1.8,conditions:[{id:'swift_clear'}],worldMapExploration:true};
 battleTurnCount=4;eHp=0;battleRewardGranted=false;normalVictoryReceipt=null;
 save.gBless={...normalizeGBless(null),on:${on},week:2,reserve:3};
 multiBattle=${['three','invasion'].includes(kind)?`{active:true,finished:false,invasion:${kind==='invasion'},enemies:[{id:'a',mon:enemy,hp:0,alive:false,rewardGranted:false},{id:'b',mon:{...enemy,id:'other'},hp:0,alive:false,rewardGranted:false}]}`:'null'};
 renderBattleInputState=()=>{};showUiNotice=()=>{};updateItems=()=>{};
 saveGame();var gbBefore=JSON.stringify(save);var originalSet=localStorage.setItem;var gbWrites=0;
 localStorage.setItem=(k,v)=>{if(k===SAVE_KEY)gbWrites++;return originalSet(k,v)};`);
 return r;
}
const r=fixture();
assert.equal(r.run('gBlessTotalText({week:100,reserve:Number.MAX_SAFE_INTEGER})'),(BigInt(Number.MAX_SAFE_INTEGER)+100n).toLocaleString('ja-JP'));
for(const [date,key] of [['2026-11-01T18:59:59.999Z','2026-10-26'],['2026-11-01T19:00:00Z','2026-11-02'],['2026-11-08T18:59:59Z','2026-11-02'],['2026-11-08T19:00:00Z','2026-11-09']])assert.equal(r.run(`gBlessWeekKey(Date.parse('${date}'))`),key);
for(const value of ['null','{}',`{on:'yes',week:-1,reserve:1.5}`,`{on:true,week:101,reserve:'3'}`,`{week:NaN,reserve:Infinity}`]){
 const s=JSON.parse(r.run(`JSON.stringify(normalizeGBless(${value}))`));assert.equal(s.week,100);assert.equal(s.reserve,0);
}
r.run(`var week=gBlessWeekKey();save.gBless={v:1,on:true,weekKey:week,week:0,reserve:1}`);
assert(r.run('beginGBlessVictory()'));assert.equal(r.run('save.gBless.reserve'),0);assert.equal(r.run('save.gBless.on'),false);
r.run(`save.gBless={v:1,on:true,weekKey:'2000-01-01',week:0,reserve:17};ensureGBless()`);assert.equal(r.run('save.gBless.week'),100);assert.equal(r.run('save.gBless.reserve'),17);
for(const kind of ['single','three','invasion']){
 const off=fixture(kind,false),on=fixture(kind,true);
 for(const q of [off,on])q.run(`settleNormalVictory(${kind!=='single'})`);
 assert.equal(on.run('save.gBless.week'),1,kind);assert.equal(off.run('save.gBless.week'),2);assert.equal(off.run('Object.hasOwn(auditOutcome,"bless")'),false,'off outcome remains identical');
 const count=kind==='single'?1:2;
 assert.equal(on.run('auditOutcome.exp'),Math.round(41*1.8*1.5*1.5)*count);
 assert.equal(on.run('auditOutcome.coins'),Math.round(13*1.8*1.5*2)*count);
 assert.equal(off.run('auditOutcome.exp'),Math.round(41*1.8*1.5)*count);
 assert.equal(on.run('gbWrites'),1);
 on.run(`settleNormalVictory(${kind!=='single'});retryNormalVictorySave()`);assert.equal(on.run('gbWrites'),1);assert.equal(on.run('save.gBless.week'),1);
}
for(const change of ["activeHuntRequest.source='map_story'","save.progress.tutorial=tutorialSaveDefaults()","tutorialBattleSession.active=true","activeHuntRequest=null"]){
 const q=fixture();q.run(change);q.run('var checkBefore=save.gBless.week;var b=beginGBlessVictory()');assert.equal(q.run('b'),null,change);assert.equal(q.run('save.gBless.week'),q.run('checkBefore'));
}
for(const kind of ['single','three','invasion']){
 const q=fixture(kind);q.run(`localStorage.setItem=(k,v)=>{if(k===SAVE_KEY)throw Error('quota');return originalSet(k,v)};settleNormalVictory(${kind!=='single'})`);
 assert.equal(q.run('JSON.stringify(save)'),q.run('gbBefore'));assert.equal(q.run('auditOutcome'),null);
 q.run(`localStorage.setItem=(k,v)=>{if(k===SAVE_KEY)gbWrites++;return originalSet(k,v)};retryNormalVictorySave()`);
 assert.equal(q.run('save.gBless.week'),1);assert.equal(q.run('gbWrites'),1);assert.equal(q.run('battleRewardGranted'),true);
}
// Compare identical valid old saves: only the additive feature/item defaults differ.
const q=fixture();q.run(`var old=JSON.parse(JSON.stringify(save));delete old.gBless;delete old.items.g_ichor;var oldFields=JSON.stringify(old);repairSave(old);var added=old.gBless;delete old.gBless;delete old.items.g_ichor;`);
assert.equal(q.run('JSON.stringify(old)'),q.run('oldFields'));assert.equal(q.run('added.on'),false);assert.equal(q.run('added.week'),100);assert.equal(q.run('SAVE_KEY'),'mb_v95c');
for(const kind of ['single','three','invasion'])for(const action of ['retreat','defeat']){
 const x=fixture(kind);x.run('busy=false;var blessings=JSON.stringify(save.gBless)');
 x.run(action==='defeat'?'losePartyBattle()':kind==='single'?'runAway()':'runAwayFromMultiBattle()');
 assert.equal(x.run('JSON.stringify(save.gBless)'),x.run('blessings'),kind+'/'+action);
}
// Golden-land fixed bonus stays fixed; rewards that go through huntRewardAmount are multiplied.
const gold=fixture();gold.run('selectedMap={...selectedMap,goldenLand:true};settleNormalVictory(false)');
assert.equal(gold.run('auditOutcome.coins'),Math.round(13*1.8*1.5*2)+gold.run("goldenLandCoinBonus('hard')"));
const gifts=fixture();gifts.context.document.getElementById=()=>null;gifts.context.setInterval=()=>{};gifts.context.LifeQuestRewards={sync:()=>({entries:[]})};
for(const file of ['js/life-quest.js','js/gifts-data.js','js/gifts.js'])vm.runInContext(fs.readFileSync(file,'utf8'),gifts.context);
gifts.run(`DEV_GIFTS.splice(0,DEV_GIFTS.length,{id:'qa',title:'QA',letter:'QA',startAt:'2000-01-01',until:null,rewards:[{kind:'bless',amount:5},{kind:'bless',amount:5},{kind:'item',id:'g_ichor',count:1}]});`);
assert.equal(gifts.run('giftCombineRewards(DEV_GIFTS).find(r=>r.kind==="bless").amount'),10);
for(const invalid of ['0','-1','1.5','Number.MAX_SAFE_INTEGER+1','"10"'])assert.equal(gifts.run(`giftRewardValid({kind:'bless',amount:${invalid}})`),false);
gifts.run(`save.gBless.reserve=Number.MAX_SAFE_INTEGER;var overflowBefore=JSON.stringify(save);var overflowResult=commitGiftClaim(['developer:qa'],saveTransactionIdentity(),save);`);
assert.equal(gifts.run('overflowResult.ok'),false);assert.equal(gifts.run('JSON.stringify(save)'),gifts.run('overflowBefore'));
gifts.run(`save.gBless.reserve=0;var claimBefore=JSON.stringify(save);localStorage.setItem=(k,v)=>{if(k===SAVE_KEY)throw Error('quota');return originalSet(k,v)};var claimResult=commitGiftClaim(['developer:qa'],saveTransactionIdentity(),save);`);
assert.equal(gifts.run('claimResult.ok'),false);assert.equal(gifts.run('JSON.stringify(save)'),gifts.run('claimBefore'));
gifts.run(`localStorage.setItem=originalSet;var goodClaim=commitGiftClaim(['developer:qa'],saveTransactionIdentity(),save);`);assert.equal(gifts.run('goodClaim.ok'),true);assert.equal(gifts.run('save.gBless.reserve'),10);assert.equal(gifts.run('save.items.g_ichor'),1);
console.log('PASS G-BLESS: JST week boundaries, invalid values, reserve/auto-off, all multipliers and final rounding, single/three/invasion one commit/one consumption, exclusions, failure/retry rollback, additive legacy migration.');
