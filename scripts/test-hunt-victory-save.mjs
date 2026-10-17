// Real save/profile/world/tutorial code, synthetic data, no external requests.
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {runtime,seeded} from '../tools/balance-audit/runtime.mjs';
const source=f=>fs.readFileSync(new URL(`../js/${f}.js`,import.meta.url),'utf8');
export function harness(slot=1,kind='single',expedition='none',seed=12,difficulty='hard'){
 const r=runtime({data:s=>`globalThis.crypto={randomUUID:()=>String(Math.random())};globalThis.sessionStorage={getItem:()=> '${slot}',setItem(){}};localStorage.setItem('mb_v95c',JSON.stringify({coins:11111,marker:'other'}));\n${source('profiles')}\n${s}`,save:s=>s+'\nglobalThis.realVictorySave=saveGame;', 'world-map-flow':s=>s+'\nglobalThis.realWorldVictory=recordWorldMapVictory;'});
 r.context.console={...console,error(){}};r.context.document.addEventListener=()=>{};r.context.window={addEventListener(){}};
 for(const f of ['contractor-rank','tutorial'])vm.runInContext(source(f),r.context);
 r.context.Math.random=seeded(seed);
 r.context.config={kind,expedition,difficulty};
 r.run(`saveGame=realVictorySave;recordWorldMapVictory=realWorldVictory;save=initSave();save.progress.tutorial.status='completed';
 updateItems=()=>{};refreshContractorRankUi=()=>{if(normalVictoryPreparing)throw Error('premature rank display')};renderBattleInputState=()=>{};
 showUiNotice=()=>{};resumeTutorialMainFlowAfterEvent=()=>{guideCount++};var guideCount=0;
 var hero=addInstance('aquaron',1);hero.uid='hero';hero.exp=59;save.party=[hero.uid];var member=addInstance('freigal',1);member.uid='member';
 ensureContractorState().exp=99;prepareBattleParty();selectedMap=MAPS.find(m=>m.id==='grassland');
 enemy={...by('slime'),dropItem:'fire_orb',dropItemName:'火炎玉',dropRate:.5};
 if(config.kind==='boss')enemy={...enemy,bossClass:'ボス',id:'boss_test'};
 if(config.kind==='golden')selectedMap={...selectedMap,goldenLand:true};
 activeHuntRequest={mapId:selectedMap.id,difficultyId:config.difficulty,conditions:[],worldMapExploration:true};
 if(config.kind==='event'){enemy={...by('doom_nemesion')};save.worldMap=normalizeWorldMapState(save.worldMap);save.worldMap.active.crisis={monsterId:enemy.id,remainingBattles:3};activeHuntRequest.worldMapEventKey='crisis';activeHuntRequest.worldMapEventMonsterId=enemy.id;}
 if(config.expedition!=='none')save.expeditions.active=[{id:'exp_test',mapId:'grassland',distanceId:'short',memberUids:[member.uid],progress:config.expedition==='complete'?0:0,requiredWins:config.expedition==='complete'?1:3,status:'active',suitability:{greatRate:.1},reward:null}];
 multiBattle=['three','invasion'].includes(config.kind)?{active:true,finished:false,invasion:config.kind==='invasion',enemies:[{id:'a',mon:enemy,hp:0,alive:false,defeatedByPlayer:true,rewardGranted:false},{id:'b',mon:by('freigal'),hp:0,alive:false,defeatedByPlayer:config.kind!=='three',rewardGranted:false}],contractAttempts:{}}:null;
 if(config.kind==='rescue'){save.progress.tutorial.status='in_progress';save.progress.tutorial.stepId='battle_choose_skill';Object.assign(tutorialBattleSession,{active:true,kind:'elna_rescue',enemyQueue:[],waveIndex:2});}
 eHp=0;battleRewardGranted=false;normalVictoryReceipt=null;battleTurnCount=5;busy=false;saveGame();
 var key=MonsterProfiles.key(SAVE_KEY),otherKey=key===SAVE_KEY?SAVE_KEY+'_profile2':SAVE_KEY;localStorage.setItem(otherKey,'other-profile');
 var before=JSON.stringify(save),disk=localStorage.getItem(key),other=localStorage.getItem(otherKey),sessionBefore=JSON.stringify(tutorialBattleSession),requestBefore=JSON.stringify(activeHuntRequest),evosBefore=JSON.stringify(pendingEvolutions);
 var actualSet=localStorage.setItem,actualGet=localStorage.getItem,writes=0,reads=0,rolls=0;var rng=Math.random;Math.random=()=>{rolls++;return rng()};
 localStorage.setItem=(k,v)=>{if(k===key)writes++;return actualSet(k,v)};
 `);
 return r;
}
let cases=0;
for(const slot of [1,2])for(const kind of ['single','three','invasion','boss','golden','event','rescue'])for(const expedition of ['none','progress','complete'])for(const fault of ['none','quota','read','stale','display']){
 const r=harness(slot,kind,expedition);
 if(fault==='quota')r.run(`localStorage.setItem=(k,v)=>{if(k===key){writes++;throw Error('quota')}return actualSet(k,v)};`);
 if(fault==='read')r.run(`localStorage.getItem=k=>{if(k===key)throw Error('read');return actualGet(k)};`);
 if(fault==='stale')r.run(`actualSet(key,'newer-save');`);
 if(fault==='display')r.run(`showBattleOutcome=()=>{throw Error('display')};`);
 r.run(kind==='three'||kind==='invasion'?'winMultiBattle()':'win()');
 if(['quota','read','stale'].includes(fault)){
  for(const [a,b] of [['JSON.stringify(save)','before'],['JSON.stringify(tutorialBattleSession)','sessionBefore'],['JSON.stringify(activeHuntRequest)','requestBefore'],['JSON.stringify(pendingEvolutions)','evosBefore']])assert.equal(r.run(a),r.run(b),`${slot}/${kind}/${expedition}/${fault}: ${a}`);
  assert(!r.run('battleRewardGranted'));assert(!r.run('auditOutcome'));assert(r.run('normalVictoryPending()'));
  assert(!r.run('!!multiBattle?.finished'));assert.equal(r.run('guideCount'),0);
  r.run(`var previousRolls=rolls;localStorage.getItem=actualGet;localStorage.setItem=(k,v)=>{if(k===key)writes++;return actualSet(k,v)};`);
  if(fault==='stale'){
   r.run('retryNormalVictorySave()');assert(!r.run('battleRewardGranted'));assert.equal(r.run('actualGet(key)'),'newer-save');cases++;continue;
  }
  if(fault==='quota')r.run(`Math.random=()=>{throw Error('reroll')};`);
  r.run('retryNormalVictorySave()');
  if(fault==='quota')assert.equal(r.run('rolls'),r.run('previousRolls'));
 }
 assert(r.run('battleRewardGranted'),`${slot}/${kind}/${expedition}/${fault}`);
 assert(!r.run('normalVictoryPending()'));assert.equal(r.run('save.history.wins'),1);
 assert.equal(r.run('writes'),fault==='quota'?2:1);
 assert.equal(r.run('actualGet(otherKey)'),r.run('other'));
 assert.equal(r.run('JSON.parse(actualGet(key)).history.wins'),1);
 assert.equal(r.run('JSON.parse(actualGet(key)).coins'),r.run('save.coins'));
 if(expedition!=='none')assert.equal(r.run('save.expeditions.active[0].progress'),1);
 if(expedition==='complete')assert(r.run('save.expeditions.active[0].reward'));
 if(kind==='rescue'){assert.equal(r.run('save.progress.tutorial.stepId'),'elna_rescue_complete');if(fault!=='display')assert.equal(r.run('guideCount'),1);}
 r.run(`var committed=actualGet(key);retryNormalVictorySave();${kind==='three'||kind==='invasion'?'winMultiBattle()':'win()'};`);
 assert.equal(r.run('actualGet(key)'),r.run('committed'));assert.equal(r.run('writes'),fault==='quota'?2:1);
 cases++;
}
// In-memory/profile/request drift cannot apply an old candidate, nor overwrite disk.
for(const change of ['save.coins++','activeHuntRequest.difficultyId="easy"','partyBattle[0].inst.uid="different"','activeHuntRequest={...activeHuntRequest}','pendingEvolutions.push({uid:"changed"})','eHp=1']){
 const r=harness();r.run(`localStorage.setItem=(k,v)=>{if(k===key)throw Error('quota');return actualSet(k,v)};win();localStorage.setItem=actualSet;${change};retryNormalVictorySave();`);assert(!r.run('battleRewardGranted'));assert.equal(r.run('actualGet(key)'),r.run('disk'));cases++;
}
// A read failure at saveGame's own final read must also keep the fixed candidate.
for(const slot of [1,2]){
 const r=harness(slot);r.run(`localStorage.getItem=k=>{if(k===key&&++reads===4)throw Error('late read');return actualGet(k)};win();`);
 assert(!r.run('battleRewardGranted'));assert.equal(r.run('JSON.stringify(save)'),r.run('before'));assert.equal(r.run('writes'),0);
 assert(r.run('!!normalVictoryReceipt.candidate'));
 r.run(`localStorage.getItem=actualGet;Math.random=()=>{throw Error('reroll')};retryNormalVictorySave();`);
 assert(r.run('battleRewardGranted'));assert.equal(r.run('writes'),1);cases++;
}
{
 const r=harness();r.run(`localStorage.setItem=(k,v)=>{if(k===key){writes++;retryNormalVictorySave();win();}return actualSet(k,v)};win();`);
 assert.equal(r.run('writes'),1);assert.equal(r.run('save.history.wins'),1);cases++;
}
{
 const r=harness();r.run(`localStorage.setItem=(k,v)=>{if(k===key)throw Error('quota');return actualSet(k,v)};win();localStorage.setItem=actualSet;MonsterProfiles.current=()=>({id:'changed-profile'});retryNormalVictorySave();`);
 assert(!r.run('battleRewardGranted'));assert.equal(r.run('actualGet(key)'),r.run('disk'));cases++;
}
// Compare seeded successful outcomes with the actual pre-fix settlement functions.
// All save fields except nondeterministic timestamps/hash must remain identical.
const baseline='2ef87b73d82c9d3afae68852f6ebcaeb78b07a89';
const oldFlow=execFileSync('git',['show',`${baseline}:js/battle-flow.js`],{encoding:'utf8'});
const oldMulti=execFileSync('git',['show',`${baseline}:js/multi-battle.js`],{encoding:'utf8'});
function clean(value){
 if(Array.isArray(value))return value.map(clean);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!['lastSavedAt','integrityHash','awardedAt','createdAt'].includes(k)).map(([k,v])=>[k,clean(v)]));
 return value;
}
let parity=0;
for(const slot of [1,2])for(const kind of ['single','three','invasion','boss','golden','event','rescue'])for(const difficulty of ['easy','normal','hard','extreme'])for(const seed of [1,12,47,99]){
 const current=harness(slot,kind,'complete',seed,difficulty),old=harness(slot,kind,'complete',seed,difficulty);
 vm.runInContext(oldFlow.slice(oldFlow.indexOf('function win()')),old.context);
 vm.runInContext(oldMulti.slice(oldMulti.indexOf('function winMultiBattle()'),oldMulti.indexOf('function renderMultiContractPanel')),old.context);
 const call=['three','invasion'].includes(kind)?'winMultiBattle()':'win()';
 old.run(call);current.run(call);
 assert(current.run('battleRewardGranted'),`${kind}/${difficulty}/${seed}`);
 assert.deepEqual(clean(JSON.parse(current.run('JSON.stringify(save)'))),clean(JSON.parse(old.run('JSON.stringify(save)'))),`baseline parity: ${slot}/${kind}/${difficulty}/${seed}`);
 assert.deepEqual(JSON.parse(current.run('JSON.stringify(auditOutcome)')),JSON.parse(old.run('JSON.stringify(auditOutcome)')));
 assert.equal(current.run('rolls'),old.run('rolls'),'random call sequence');parity++;
}
console.log(`PASS seeded pre-fix parity: ${parity} outcomes across all difficulties; full save payload, result and random count.`);
console.log(`PASS atomic hunt victory: ${cases} cases; two profiles, 7 battle types, 3 expedition states, faults, fixed retries, stale protection, committed display failure.`);
