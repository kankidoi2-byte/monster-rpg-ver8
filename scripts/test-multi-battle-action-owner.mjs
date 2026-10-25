// Isolated real combat runtime: queued moves belong to the member that chose them.
import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

function setup({invasion=false,reserves=1,hp=1}={}){
  const r=runtime();
  r.context.Math.random=()=>0;
  r.context.config={invasion,reserves,hp};
  r.run(`save=initSave();save.instances=[];save.party=[];
    var first=addInstance('freigal',1);first.uid='first';save.party.push(first.uid);
    for(var i=0;i<config.reserves;i++){var reserve=addInstance('aquaron',1);reserve.uid='reserve-'+i;save.party.push(reserve.uid);}
    prepareBattleParty();selectedMap=MAPS[0];enemy=by('slime');
    activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);
    multiBattle={active:true,finished:false,invasion:config.invasion,enemies:[createMultiEnemy(enemy,'enemy_a'),createMultiEnemy(by('goblin'),'enemy_b')],contractAttempts:{}};
    pHp=config.hp;busy=true;startBattleTurn();
    var observed=[],realAttack=performMultiAttack;
    performMultiAttack=async(actor,target,move)=>{
      observed.push({uid:actor.kind==='player'?activeInstance.uid:actor.id,move:move[0]});
      return await realAttack(actor,target,move);
    };
    var enemyAction={kind:'enemy',actorId:'enemy_a',move:['確実な致命打',9999,'normal']};
    var playerAction={kind:'player',targetId:'enemy_a',move:['選択した支援技',0,'normal','buff']};
  `);
  return r;
}
let cases=0;
for(const invasion of [false,true]){
  for(const reserves of [1,2]){
    const r=setup({invasion,reserves});
    await r.run('runMultiActions([enemyAction,playerAction],0)');await r.flush();
    assert.equal(r.run('activeInstance.uid'),'reserve-0');
    assert.equal(r.run('partyBattle[0].fainted'),true);
    assert.equal(r.run("observed.filter(x=>x.uid.startsWith('reserve')).length"),0,'reserve must not inherit queued skill');
    assert.equal(r.run('pAtk'),1,'canceled buff must not change the reserve');
    assert.equal(r.run('battleTurnCount'),1);
    assert.equal(r.run('busy'),false,'next turn remains playable');
    await r.run('busy=true;startBattleTurn();runMultiActions([playerAction],0)');await r.flush();
    assert.equal(r.run("observed.filter(x=>x.uid==='reserve-0').length"),1,'reserve may choose its own next-turn action');
    assert(r.run('pAtk>1'));
    cases++;
  }
  const survives=setup({invasion,hp:100000});
  await survives.run('runMultiActions([enemyAction,playerAction],0)');await survives.flush();
  assert.equal(survives.run("observed.filter(x=>x.uid==='first').length"),1,'surviving actor still takes its action');
  assert(survives.run('pAtk>1'));cases++;
  const firstActs=setup({invasion});
  await firstActs.run('runMultiActions([playerAction,enemyAction],0)');await firstActs.flush();
  assert.equal(firstActs.run("observed.filter(x=>x.uid==='first').length"),1,'earlier action occurs exactly once');
  assert.equal(firstActs.run('activeInstance.uid'),'reserve-0');cases++;
  const wiped=setup({invasion,reserves:0});
  await wiped.run('runMultiActions([enemyAction,playerAction],0)');await wiped.flush();
  assert.equal(wiped.run('auditOutcome.kind'),'defeat');
  assert.equal(wiped.run("observed.filter(x=>x.uid==='first').length"),0);cases++;
}
console.log(`PASS multi-battle action ownership: ${cases} real-combat cases (three-way/invasion, forced replacement, survivor, next turn, defeat).`);
