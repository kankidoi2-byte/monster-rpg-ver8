import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime();
r.run(fs.readFileSync('js/battle-feedback.js','utf8'));
r.run(`var audioEvents=[];var BattleAudio={hp:(before,after,options)=>audioEvents.push({before,after,...options}),reset(){},victory(){audioEvents.push({victory:true});}};resetBattleFeedback=()=>{};battleHistoryEntry=()=>{};renderBattleHpResults=()=>{};captureBattleLog=()=>{};refreshBattleFeedback=()=>{};renderBattleInputState=()=>{};`);
const setup=`save=initSave();save.instances=[];save.party=[];const ins=addInstance('freigal',10);save.party=[ins.uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='single';`;
let cases=0;
for(const mode of ['single','multi'])for(const direction of (mode==='single'?['player-enemy','enemy-player']:['player-enemy','enemy-player','enemy-enemy']))for(const effect of [null,'heal','drain','repeat_attack','recoil']){
 r.run(`(()=>{${setup}${mode==='multi'?"activeHuntRequest.battleMode='three_way';activeHuntRequest.secondEnemyId='goblin';":''}beginChosenBattle('grassland','slime','normal',activeHuntRequest);pHp=60;eHp=500;if(multiBattle?.active)multiBattle.enemies.forEach(e=>{e.hp=500;e.maxHp=1000;});audioEvents=[];})()`);
 r.context.Math.random=()=>0;
 const move=JSON.stringify(['確認',effect==='heal'?0:24,'water',effect,1]);
 if(mode==='single')await r.run(`performAction(${direction==='player-enemy'?'player,enemy':'enemy,player'},${move},${direction==='player-enemy'})`);
 else await r.run(`performMultiAttack(${direction==='player-enemy'?"{kind:'player'}":'multiBattle.enemies[0]'},${direction==='enemy-player'?"{kind:'player'}":'multiBattle.enemies[1]'},${move})`);
 const events=r.run('audioEvents');assert.ok(events.length,`${mode}/${direction}/${effect}`);
 if(effect==='repeat_attack')assert.equal(events.filter(e=>e.impact).length,2);
 if(effect==='recoil')assert.equal(events.filter(e=>e.impact).length,1);
 for(const e of events.filter(e=>e.impact))assert.ok(Number.isFinite(e.effectiveness));cases++;
}
// Restore the real outcome renderer to exercise the common victory hook.
r.run(fs.readFileSync('js/battle-view.js','utf8').split('function showBattleOutcome(')[1].split('function huntConditionsHtml(')[0].replace(/^/, 'function showBattleOutcome('));r.run('audioEvents=[];showBattleOutcome({kind:"victory",title:"test"});showBattleOutcome({kind:"retreat",title:"test"});showBattleOutcome({kind:"defeat",title:"test"});');assert.equal(r.run('audioEvents.filter(e=>e.victory).length'),1);
// Win's continued wave must exit before the outcome hook.
r.run('eHp=0;audioEvents=[];continueTutorialRescueWave=()=>true;win();');assert.equal(r.run('audioEvents.length'),0);
console.log(`PASS ${cases} single/multi/faction real action integrations, repeat-hit metadata, recoil exclusion, final victory hook and continued-wave silence`);
// Item recovery is presented after navigation back to the battle, never lost in its menu.
r.run(`(()=>{${setup}beginChosenBattle('grassland','slime','normal',activeHuntRequest);pHp=20;save.items.potion=2;})()`);
r.run(`var currentScreen='battleItemSelect',itemSoundScreen=null;show=id=>currentScreen=id;update=()=>{itemSoundScreen=currentScreen;};updateItems=()=>{};useBattleItem('potion');`);
assert.equal(r.run('itemSoundScreen'),'battle');assert.equal(r.run('pHp'),70);
console.log('PASS item healing returns to battle before HP presentation');
