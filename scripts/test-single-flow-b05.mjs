import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';
async function fixture({playerFirst=false,reserve=true,enemyHp=1000,simultaneous=false}={}){
 const r=runtime();
 r.run(`save=initSave();save.progress.tutorial.status='completed';
 var a=addInstance('freigal',80), b=addInstance('aquaron',80);
 partyBattle=[{inst:a,mon:M.find(m=>m.id===a.id),hp:1},{inst:b,mon:M.find(m=>m.id===b.id),hp:400}];
 activePartyIdx=0;activeInstance=a;player=M.find(m=>m.id===a.id);enemy=M.find(m=>m.id=== 'slime');pHp=1;eHp=${enemyHp};
 eStatus='poison';ePoisonTurns=3;pStatus=null;busy=false;multiBattle=null;activeHuntRequest=null;
 resetBattleTurnCounter();var ticks=0,regens=0,invasions=0,victories=0,defeats=0,actions=0;
 monSpd=()=>${playerFirst?2:0};enemyKokoroLinkSpeed=()=>1;
 nextEnemyMoveWithKokoroLinkForesight=()=>({move:['通常攻撃',24,'normal']});
 consumeKokoroLinkActionPriority=()=>false;consumeKokoroLinkEnemyActionDelay=()=>false;
 tickSingleEnemyKokoroLinkEffects=()=>{ticks++;return '';};
 applyPlayerKokoroLinkRegeneration=()=>{regens++;pHp+=50;return '';};
 triggerInvasionIfDue=()=>{invasions++;return false;};enemyMaxHp=()=>1000;
 win=()=>{victories++;completeBattleTurn();busy=false;};losePartyBattle=()=>{defeats++;completeBattleTurn();busy=false;};
 performAction=async(attacker,defender,move,isPlayer)=>{actions++;if(!isPlayer){pHp=0;${simultaneous?'eHp=0;':''}}return {animated:false};};
 ${reserve?'':'partyBattle.length=1;'}
 `);
 await r.run('turn(-1)');return r;
}
for(const playerFirst of [false,true]){
 const r=await fixture({playerFirst});
 assert.equal(r.run('activePartyIdx'),1);
 assert.equal(r.run('eHp'),1000-Math.max(1,Math.floor(1000*r.run('BATTLE_STATUS_EFFECTS.poison.maxHpDamageRate'))));
 assert.equal(r.run('ePoisonTurns'),2);
 assert.equal(r.run('ticks'),1);
 assert.equal(r.run('regens'),0,'incoming reserve cannot receive old-front regeneration');
 assert.equal(r.run('pHp'),400);
 assert.equal(r.run('invasions'),1);
 assert.equal(r.run('battleTurnCount'),1);r.run('completeBattleTurn()');assert.equal(r.run('battleTurnCount'),1,'completion is guarded');
 assert.equal(r.run('actions'),playerFirst?2:1,'new reserve does not take the defeated member action');
}
const poisonWin=await fixture({enemyHp:1});assert.equal(poisonWin.run('victories'),1);assert.equal(poisonWin.run('ePoisonTurns'),2);assert.equal(poisonWin.run('invasions'),0);
const defeat=await fixture({reserve:false});assert.equal(defeat.run('defeats'),1);assert.equal(defeat.run('ePoisonTurns'),3,'no reserve retains existing defeat precedence');
const simultaneous=await fixture({simultaneous:true});assert.equal(simultaneous.run('victories'),1,'simultaneous KO retains enemy-KO-first precedence');assert.equal(simultaneous.run('defeats'),0);
console.log('PASS B05: both initiative orders, one poison/link tick, reserve isolation, turn guard, poison victory, defeat and simultaneous KO');
