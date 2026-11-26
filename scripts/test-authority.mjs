import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime({save:s=>s+'\nglobalThis.authorityActualSave=saveGame;'});
for(const name of ['authority-data','authority'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),r.context);
r.run("save=initSave();var a=addInstance('freigal',10);var b=addInstance('aquaron',8);save.party=[a.uid,b.uid];var base=instanceMaxHp(a,false);");
assert.equal(r.run('authorityUnlocked()'),false);
assert.equal(r.run('instanceMaxHp(a)'),r.run('base'));
assert.equal(r.run('SAVE_KEY'),'mb_v95c');
assert.equal(r.run('AUTHORITY_DATA.nodes.length'),1);
assert.equal(r.run('AUTHORITY_DATA.nodes.filter(n=>n.chapter!==null).every(n=>!n.implemented&&!n.effects.length)'),true);
// Additive later-prologue defaults, stable card cursors, grants, and unknown fields.
assert.deepEqual(JSON.parse(r.run('JSON.stringify(save.prologuePart2)')),
 {version:1,episodes:{},completed:false,hubArrived:false,trainingSeen:{},evidence:{},grants:{}});
r.run("repairSave(save);var untouched=JSON.parse(JSON.stringify(save));delete untouched.prologuePart2;var untouchedBefore=JSON.stringify(untouched);repairSave(untouched);var migratedPart2=untouched.prologuePart2;delete untouched.prologuePart2");
assert.equal(r.run('JSON.stringify(untouched)'),r.run('untouchedBefore'));
r.run(`var part2Fixture={version:1,episodes:{pb_07:{phase:'battle',cursor:'pb_07_mid_01',wonBattleIds:['p2_07_a','p2_07_a'],completed:false,rewardClaimed:true,rewardTargetUids:['u1','u1','u2'],future:42},pb_ep:{cursor:null,completed:true,rewardClaimed:true},future_episode:{kept:true}},completed:true,hubArrived:true,trainingSeen:{synthesis:true},evidence:{shard:true},grants:{scroll:true,gacha:{uid:'kept'}},future:'keep'};var normalized=normalizeProloguePart2(part2Fixture);var serialized=JSON.stringify(normalized);`);
assert.equal(r.run('JSON.stringify(normalizeProloguePart2(normalized))'),r.run('serialized'));
assert.equal(r.run('normalized.episodes.pb_07.cursor'),'pb_07_mid_01');
assert.equal(r.run('JSON.stringify(normalized.episodes.pb_07.wonBattleIds)'), '["p2_07_a"]');
assert.equal(r.run('JSON.stringify(normalized.episodes.pb_07.rewardTargetUids)'), '["u1","u2"]');
assert.equal(r.run('normalized.episodes.pb_07.future'),42);
assert.equal(r.run('normalized.episodes.future_episode.kept'),true);
assert.equal(r.run('normalized.grants.gacha.uid'),'kept');
assert.equal(r.run('part2Fixture.episodes.pb_07.wonBattleIds.length'),2,'normalization does not mutate source');
assert.equal(r.run("normalizeProloguePart2({episodes:{pb_07:{cursor:-1},pb_08:[]},completed:'true',hubArrived:1,grants:[]}).episodes.pb_07.cursor"),null);
assert.equal(r.run("normalizeProloguePart2({completed:'true'}).completed"),false);
assert.equal(r.run("normalizeProloguePart2({episodes:{pb_07:{cursor:3}}}).episodes.pb_07.cursor"),3);
// Existing old saves migrate additively; repeated migration is stable.
r.run("save.progress.tutorial=tutorialSaveDefaults({legacy:true});repairSave(save);var old=JSON.parse(JSON.stringify(save));delete old.authority;var before=JSON.stringify(old);repairSave(old);var added=old.authority;delete old.authority;");
assert.equal(r.run('JSON.stringify(old)'),r.run('before'));
assert.equal(r.run('added.unlocked'),false);
assert.equal(r.run('JSON.stringify(added.clearedChapters)'),'[]');
r.run("save=old;repairSave(save);var once=JSON.stringify(save.authority);repairSave(save);");
assert.equal(r.run('JSON.stringify(save.authority)'),r.run('once'));
assert.equal(r.run('instanceMaxHp(a)'),r.run('base'));
assert.equal(r.run('instanceMaxHp(a,false)'),r.run('base'),'expedition retains old stats');
assert.equal(r.run('maxHp(by(a.id),a.level)'),r.run('base'),'enemy/base HP unchanged');
// No coins/items/flags are touched by reads.
r.run("var balance=JSON.stringify({coins:save.coins,items:save.items,progress:save.progress,gBless:save.gBless});authorityState();authorityNumericMultiplier('maxHp');");
assert.equal(r.run('JSON.stringify({coins:save.coins,items:save.items,progress:save.progress,gBless:save.gBless})'),r.run('balance'));
for(let chapter=1;chapter<=7;chapter++)assert.equal(r.run('recordAuthorityChapterClear('+chapter+')'),false);
assert.equal(r.run('authorityState().clearedChapters.length'),0);
assert.deepEqual(JSON.parse(r.run("JSON.stringify(normalizeAuthoritySave({unlocked:'yes',clearedChapters:[1,1,'2',-1,8,2.5],future:'keep'},{}))")),{v:1,unlocked:false,clearedChapters:[1],future:'keep'});
r.run("save.authority.clearedChapters=[1,2,3,4,5,6,7]");
assert.equal(r.run('AUTHORITY_DATA.nodes.filter(n=>authorityNodeOpen(n)).length'),0);
r.run('save.authority.clearedChapters=[]');
// New epilogue is the only unlock; old explicit unlock and tutorial flags are insufficient.
r.run("save.authority.unlocked=true;repairSave(save)");
assert.equal(r.run('authorityUnlocked()'),false);
r.run("save.prologuePart2.completed=true;save.prologuePart2.hubArrived=true;repairSave(save)");
assert.equal(r.run('authorityUnlocked()'),true);
assert.equal(r.run("authorityNumericMultiplier('maxHp')"),1);
// Save failure does not alter persisted data; reload restores the state.
r.run("saveGame=authorityActualSave;saveGame();var disk=localStorage.getItem(SAVE_KEY);var setter=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota')};");
assert.equal(r.run('saveGame()'),false);
assert.equal(r.run('localStorage.getItem(SAVE_KEY)'),r.run('disk'));
r.run('localStorage.setItem=setter;save=loadSave()');
assert.equal(r.run('save.authority.unlocked'),true);
// Actual prepare -> beginChosenBattle path, every difficulty.
r.run("saveGame=()=>true;showBattleChoices=()=>{};renderBattleMapBanner=()=>{};document.addEventListener=()=>{};");
for(const tier of ['d1','d2','d3','d4','d5','extreme']){
 r.run("AUTHORITY_DATA.enabledByDifficulty."+tier+"=false;activeHuntRequest=null;prepareBattleParty();beginChosenBattle('grassland','slime','"+tier+"');");
 assert.equal(r.run('pHp'),r.run('instanceMaxHp(activeInstance,false)'),tier+' disabled start');
 assert.equal(r.run('playerMaxHp()'),r.run('instanceMaxHp(activeInstance,false)'));
 r.run("AUTHORITY_DATA.enabledByDifficulty."+tier+"=true;activeHuntRequest=null;prepareBattleParty();beginChosenBattle('grassland','slime','"+tier+"');");
 assert.equal(r.run('pHp'),r.run('instanceMaxHp(activeInstance)'),tier+' enabled start');
 assert.equal(r.run('pHp'),r.run('instanceMaxHp(activeInstance,false)'));
}
r.run("AUTHORITY_DATA.enabledByDifficulty.d2=false;activeHuntRequest={difficultyId:'d4'};prepareBattleParty();partyBattle[0].hp=Math.floor(partyBattle[0].hp/2);partyBattle[1].hp=0;partyBattle[1].fainted=true;activeHuntRequest={source:'map_story',difficultyId:'normal'};applyAuthorityBattleContext();");
assert(r.run('partyBattle[0].hp<=instanceMaxHp(partyBattle[0].inst)/2+1'));
assert.equal(r.run('partyBattle[1].hp'),0);
assert.equal(r.run("authorityNumericMultiplier('maxHp')"),1,'story normalized difficulty');
r.run("AUTHORITY_DATA.enabledByDifficulty.d2=true;applyAuthorityBattleContext();");
assert.equal(r.run("authorityNumericMultiplier('maxHp')"),1,'story enabled');
// UI gating and one inert marker; only its name is revealed on tap.
r.run('save=initSave();renderAuthority()');assert.equal(r.elements.get('authoritySection').hidden,true);
r.run("save.progress.tutorial.prologueCompleted=true;renderAuthority()");
assert.equal(r.elements.get('authoritySection').hidden,true);
r.run("save.prologuePart2.completed=true;renderAuthority()");
assert.equal(r.elements.get('authoritySection').hidden,false);
assert.equal((r.elements.get('authorityBoard').innerHTML.match(/is-locked/g)||[]).length,0);
assert.equal((r.elements.get('authorityBoard').innerHTML.match(/role="listitem"/g)||[]).length,1);
assert.equal(r.elements.get('authorityEffect').hidden,true);
r.run('showAuthorityName()');assert.equal(r.elements.get('authorityEffect').textContent,'0の権能');
console.log('authority: epilogue-only migration, inert marker, no stat effects, battle context, failed save/reload passed');
