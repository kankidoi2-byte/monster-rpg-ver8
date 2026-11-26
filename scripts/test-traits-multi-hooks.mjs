import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

function setup(){
  const r=runtime();r.context.Math.random=()=>0;
  r.run(`save=initSave();save.instances=[];save.party=[];
    var front=addInstance('elixion',40);save.party=[front.uid];prepareBattleParty();
    selectedMap=MAPS[0];enemy=by('slime');
    activeHuntRequest=createHuntRequest(selectedMap,enemy,'d2',[],{allowOvertier:false,enemyLevel:40});
    multiBattle={active:true,finished:false,enemies:[createMultiEnemy(enemy,'enemy_a'),createMultiEnemy(enemy,'enemy_b')],contractAttempts:{}};
    multiBattle.enemies.forEach(e=>{e.hp=e.maxHp=100000;});
    var traitCalls=[];skill110BattleMove=()=>null;
    runTraitAttack=async(callback,move,isPlayer,actor,target)=>{traitCalls.push(['wrapper',isPlayer,actor?.id,target?.id]);return callback(move);};
    traitDamageMultiplier=(isPlayer,move,actor,target)=>{traitCalls.push(['damage',isPlayer,actor?.id,target?.id]);return 1;};
    traitHealing=(amount,isPlayer)=>{traitCalls.push(['heal',isPlayer]);return isPlayer?amount*1.4:amount;};
    traitReceiveStatus=(kind,apply,source)=>{traitCalls.push(['status',kind,source?.id]);return false;};
    traitEndTurn=()=>{traitCalls.push(['end']);};
    traitPlayerSpeed=value=>{traitCalls.push(['speed']);return value*1.2;};
  `);
  return r;
}
const damage=setup();
await damage.run(`performMultiAttack({kind:'player'},multiBattle.enemies[0],['test strike',24,'normal'])`);
assert.deepEqual(JSON.parse(damage.run('JSON.stringify(traitCalls.filter(c=>c[0]!=="speed"))')),[['wrapper',true,null,'enemy_a'],['damage',true,null,'enemy_a']]);
const baseline=damage.run('100000-multiBattle.enemies[0].hp');
damage.run('multiBattle.enemies[0].hp=100000;traitDamageMultiplier=()=>2;');
await damage.run(`performMultiAttack({kind:'player'},multiBattle.enemies[0],['test strike',24,'normal'])`);
assert(Math.abs(damage.run('100000-multiBattle.enemies[0].hp')-baseline*2)<=1);
for(const kind of ['sleep','poison','paralysis','confusion']){
  const r=setup();
  await r.run(`performMultiAttack(multiBattle.enemies[1],{kind:'player'},['status',${kind==='sleep'?0:1},'normal','${kind}',1])`);
  assert(r.run(`traitCalls.some(c=>c[0]==='status'&&c[1]==='${kind}'&&c[2]==='enemy_b')`));
  assert.equal(r.run(`p${kind[0].toUpperCase()+kind.slice(1)}Turns`),0);
}
const heal=setup();heal.run('pHp=1;');
const expected=heal.run('Math.min(playerMaxHp(),1+normalBattleHealing(playerMaxHp())*1.4)');
await heal.run(`performMultiAttack({kind:'player'},multiBattle.enemies[0],['heal',0,'normal','heal'])`);
assert.equal(heal.run('pHp'),expected);
const end=setup();end.run('startBattleTurn();finishMultiBattleTurn();');
assert.equal(end.run('traitCalls.filter(c=>c[0]==="end").length'),1);
const wrapper=setup();wrapper.run(`runTraitAttack=(callback,move)=>callback([move[0],move[1]/2,...move.slice(2)]);`);
await wrapper.run(`performMultiAttack({kind:'player'},multiBattle.enemies[0],['test strike',24,'normal'])`);
assert(wrapper.run('100000-multiBattle.enemies[0].hp')<baseline);
console.log('PASS multi traits hooks: action context, damage, status protection/source, healing, turn end, effective combo move');
