import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

const r=runtime();
r.run(`save=initSave();save.instances=[];save.party=[];
save.party=[addInstance('freigal',10).uid];prepareBattleParty();
selectedMap=MAPS[0];enemy=by('slime');
activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);
activeHuntRequest.battleMode='three_way';activeHuntRequest.secondEnemyId='goblin';
beginChosenBattle('grassland','slime','normal',activeHuntRequest);
var playerMaximum=1000,enemyMaximum=1000;playerMaxHp=()=>playerMaximum;enemyMaxHp=()=>enemyMaximum;
var healingFeedback=[];battleHpResult=(id,before,after,options)=>healingFeedback.push({id,before,after,label:options.label});`);
let cases=0;
for(const mode of ['single','multi'])for(const side of ['player','enemyA','enemyB']){
 if(mode==='single'&&side==='enemyB')continue;
 for(const maximum of [90,123,360,693,1000]){
  const amount=Math.floor(maximum*.22);
  for(const missing of [maximum-1,5,0])for(const half of [false,true]){
   const isPlayer=side==='player',index=side==='enemyB'?1:0;
   // Deliberately give the other side and the other enemy different HP caps.
   r.run(`playerMaximum=${isPlayer?maximum:1000};enemyMaximum=${side==='enemyA'?maximum:1000};
    activeHuntRequest.conditions=${half?"[{id:'healing_half'}]":'[]'};
    pHp=${maximum-missing};eHp=${maximum-missing};
    multiBattle.enemies.forEach((e,i)=>{e.maxHp=i===${index}?${maximum}:1000;e.hp=${maximum-missing};e.sleepTurns=0;e.paralysisTurns=0;e.confusionTurns=0;});
    healingFeedback=[];`);
   const actor=isPlayer?"{kind:'player'}":`multiBattle.enemies[${index}]`;
   const target=isPlayer?'multiBattle.enemies[1]':"{kind:'player'}";
   await r.run(mode==='single'?`doAttack(${isPlayer?'player,enemy':'enemy,player'},['回復',0,'normal','heal'],${isPlayer})`:
    `performMultiAttack(${actor},${target},['回復',0,'normal','heal'])`);
   const expected=Math.min(missing,half?Math.floor(amount/2):amount);
   const hp=r.run(isPlayer?'pHp':mode==='single'?'eHp':`multiBattle.enemies[${index}].hp`);
   assert.equal(hp,maximum-missing+expected,`${mode}/${side}/${maximum}/${missing}/${half}`);
   assert.match(r.elements.get('log').innerHTML,new RegExp(`HPを${expected}回復した`));
   const feedback=r.context.healingFeedback;
   assert.equal(feedback.length,1);
   assert.equal(feedback[0].after-feedback[0].before,expected);
   assert.equal(feedback[0].id,isPlayer?'pVis':mode==='single'?'eVis':r.run(`multiBattle.enemies[${index}].id+'Vis'`));
   assert.equal(feedback[0].label,'回復');cases++;
  }
 }
}
console.log(`PASS ${cases} normal healing cases: caster max HP, both sides/modes, caps, actual logs/feedback and existing hunt modifier`);
