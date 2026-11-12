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
assert.equal(r.run('AUTHORITY_DATA.nodes.length'),8);
assert.equal(r.run('AUTHORITY_DATA.nodes.filter(n=>n.chapter!==null).every(n=>!n.implemented&&!n.effects.length)'),true);
// Existing old saves migrate additively; repeated migration is stable.
r.run("save.progress.tutorial=tutorialSaveDefaults({legacy:true});repairSave(save);var old=JSON.parse(JSON.stringify(save));delete old.authority;var before=JSON.stringify(old);repairSave(old);var added=old.authority;delete old.authority;");
assert.equal(r.run('JSON.stringify(old)'),r.run('before'));
assert.equal(r.run('added.unlocked'),true);
assert.equal(r.run('JSON.stringify(added.clearedChapters)'),'[]');
r.run("save=old;repairSave(save);var once=JSON.stringify(save.authority);repairSave(save);");
assert.equal(r.run('JSON.stringify(save.authority)'),r.run('once'));
assert.equal(r.run('instanceMaxHp(a)'),r.run('Math.round(base*1.01)'));
assert.equal(r.run('instanceMaxHp(a,false)'),r.run('base'),'expedition retains old stats');
assert.equal(r.run('maxHp(by(a.id),a.level)'),r.run('base'),'enemy/base HP unchanged');
// No coins/items/flags are touched by reads.
r.run("var balance=JSON.stringify({coins:save.coins,items:save.items,progress:save.progress,gBless:save.gBless});authorityState();authorityNumericMultiplier('maxHp');");
assert.equal(r.run('JSON.stringify({coins:save.coins,items:save.items,progress:save.progress,gBless:save.gBless})'),r.run('balance'));
for(let chapter=1;chapter<=7;chapter++)assert.equal(r.run('recordAuthorityChapterClear('+chapter+')'),false);
assert.equal(r.run('authorityState().clearedChapters.length'),0);
assert.deepEqual(JSON.parse(r.run("JSON.stringify(normalizeAuthoritySave({unlocked:'yes',clearedChapters:[1,1,'2',-1,8,2.5],future:'keep'},{}))")),{v:1,unlocked:false,clearedChapters:[1],future:'keep'});
r.run("save.authority.clearedChapters=[1,2,3,4,5,6,7]");
assert.equal(r.run('AUTHORITY_DATA.nodes.filter(n=>authorityNodeOpen(n)).length'),1);
r.run('save.authority.clearedChapters=[]');
// Future hook is idempotent, data driven; shipped chapters all remain disabled.
r.run("AUTHORITY_DATA.nodes[1].implemented=true;AUTHORITY_DATA.nodes[1].effects=[{stat:'maxHp',percent:2}];");
assert.equal(r.run('recordAuthorityChapterClear(1)'),true);
assert.equal(r.run('recordAuthorityChapterClear(1)'),true);
assert.equal(r.run('save.authority.clearedChapters.length'),1);
assert.equal(r.run("authorityNumericMultiplier('maxHp')"),1.03);
r.run("AUTHORITY_DATA.nodes[1].implemented=false;AUTHORITY_DATA.nodes[1].effects=[];save.authority.clearedChapters=[];");
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
 assert.equal(r.run('pHp'),r.run('Math.round(instanceMaxHp(activeInstance,false)*1.01)'));
}
r.run("AUTHORITY_DATA.enabledByDifficulty.d2=false;activeHuntRequest={difficultyId:'d4'};prepareBattleParty();partyBattle[0].hp=Math.floor(partyBattle[0].hp/2);partyBattle[1].hp=0;partyBattle[1].fainted=true;activeHuntRequest={source:'map_story',difficultyId:'normal'};applyAuthorityBattleContext();");
assert(r.run('partyBattle[0].hp<=instanceMaxHp(partyBattle[0].inst)/2+1'));
assert.equal(r.run('partyBattle[1].hp'),0);
assert.equal(r.run("authorityNumericMultiplier('maxHp')"),1,'story normalized difficulty');
r.run("AUTHORITY_DATA.enabledByDifficulty.d2=true;applyAuthorityBattleContext();");
assert.equal(r.run("authorityNumericMultiplier('maxHp')"),1.01,'story enabled');
// UI gating and seven locked placeholders.
r.run('save=initSave();renderAuthority()');assert.equal(r.elements.get('authoritySection').hidden,true);
r.run("save.progress.tutorial.prologueCompleted=true;renderAuthority()");
assert.equal(r.elements.get('authoritySection').hidden,false);
assert.equal((r.elements.get('authorityBoard').innerHTML.match(/is-locked/g)||[]).length,7);
assert.equal((r.elements.get('authorityBoard').innerHTML.match(/role="listitem"/g)||[]).length,8);
assert(r.elements.get('authorityEffect').textContent.includes('+1%（仮の効果・仮の数値）'));
console.log('authority: migration, gating, nodes, all difficulties, battle preparation, story, failed save/reload passed');
