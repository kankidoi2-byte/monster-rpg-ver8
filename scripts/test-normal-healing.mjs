import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

const r=runtime();
r.run(`save=initSave();save.instances=[];save.party=[];
save.party=[addInstance('freigal',10).uid];prepareBattleParty();
selectedMap=MAPS[0];enemy=by('slime');
activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);
activeHuntRequest.battleMode='three_way';activeHuntRequest.secondEnemyId='goblin';
beginChosenBattle('grassland','slime','normal',activeHuntRequest);
playerMaxHp=()=>1000;enemyMaxHp=()=>1000;
var healingFeedback=[];battleHpResult=(id,before,after,options)=>healingFeedback.push({id,before,after,label:options.label});`);
let cases=0;
for(const mode of ['single','multi'])for(const side of ['player','enemyA','enemyB']){
 if(mode==='single'&&side==='enemyB')continue;
 for(const [level,amount] of [[1,27],[10,54],[50,174],[100,324],[undefined,27],[null,27],[0,27],[-10,27],['bad',27],[Infinity,27],[NaN,27],['10',54],[1000,324],[10.9,54]]){
  const levelCode=level===undefined?'undefined':typeof level==='number'&&!Number.isFinite(level)?String(level):JSON.stringify(level);
  for(const missing of [800,5,0])for(const half of [false,true]){
   const isPlayer=side==='player',index=side==='enemyB'?1:0;
   // Deliberately give the target and the other enemy different levels.
   r.run(`activeInstance.level=${isPlayer?levelCode:99};
    activeHuntRequest.enemyLevel=${!isPlayer&&mode==='single'?levelCode:99};
    activeHuntRequest.conditions=${half?"[{id:'healing_half'}]":'[]'};
    pHp=${1000-missing};eHp=${1000-missing};
    multiBattle.enemies.forEach(e=>{e.level=99;e.maxHp=1000;e.hp=${1000-missing};e.sleepTurns=0;e.paralysisTurns=0;e.confusionTurns=0;});
    ${!isPlayer&&mode==='multi'?`multiBattle.enemies[${index}].level=${levelCode};`:''}
    healingFeedback=[];`);
   const actor=isPlayer?"{kind:'player'}":`multiBattle.enemies[${index}]`;
   const target=isPlayer?'multiBattle.enemies[1]':"{kind:'player'}";
   await r.run(mode==='single'?`doAttack(${isPlayer?'player,enemy':'enemy,player'},['回復',0,'normal','heal'],${isPlayer})`:
    `performMultiAttack(${actor},${target},['回復',0,'normal','heal'])`);
   const expected=Math.min(missing,half?Math.floor(amount/2):amount);
   const hp=r.run(isPlayer?'pHp':mode==='single'?'eHp':`multiBattle.enemies[${index}].hp`);
   assert.equal(hp,1000-missing+expected,`${mode}/${side}/${level}/${missing}/${half}`);
   assert.match(r.elements.get('log').innerHTML,new RegExp(`HPを${expected}回復した`));
   const feedback=r.context.healingFeedback;
   assert.equal(feedback.length,1);
   assert.equal(feedback[0].after-feedback[0].before,expected);
   assert.equal(feedback[0].id,isPlayer?'pVis':mode==='single'?'eVis':r.run(`multiBattle.enemies[${index}].id+'Vis'`));
   assert.equal(feedback[0].label,'回復');cases++;
  }
 }
}
console.log(`PASS ${cases} normal healing cases: caster levels, both sides/modes, caps, actual logs/feedback, invalid levels and existing hunt modifier`);
