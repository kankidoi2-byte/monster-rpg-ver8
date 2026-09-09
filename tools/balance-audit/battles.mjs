import {runtime,seeded} from './runtime.mjs';
export function battleRunner(patches={}){
 const r=runtime(patches);
 r.run(`
 function auditSetup(c){
  auditOutcome=null;save=initSave();save.instances=[];save.party=[];save.caught=[];save.equippedSkills={};save.skillCards={};
  c.party.forEach((id,i)=>{const ins=addInstance(id,Array.isArray(c.level)?c.level[i]:c.level);ins.uid='audit-'+i;save.party.push(ins.uid);if(c.equipped?.[i])save.equippedSkills[ins.uid]=c.equipped[i];});
  prepareBattleParty();const map=MAPS.find(m=>m.id===c.map);const mon=by(c.enemy);
  const req=createHuntRequest({...map,enemyIds:worldMapCandidates(map,c.difficulty).map(m=>m.id)},mon,c.difficulty,c.conditions??(c.randomEnemy?rollHuntConditionIds(c.difficulty):[]));
  if(c.mode){req.battleMode=c.mode;req.secondEnemyId=c.mode==='three_way'?c.second:null;req.invasionEnemyId=c.mode==='invasion_pending'?c.second:null;req.invasionTurn=c.invasionTurn||3;}
  beginChosenBattle(c.map,c.enemy,c.difficulty,req);
  if(c.link){const src=partyBattle[c.link];const result=activateKokoroLinkSource(src.uid,partyBattle,0,{maxHp:playerMaxHp(),speed:monSpd(player,activeInstance)});if(!result.ok)throw Error(result.reason);const target=multiBattle?.active?aliveMultiEnemies()[0].id:null;applyKokoroLinkStatusAbilityForBattle(result.link,target);applyKokoroLinkTacticsAbilityForBattle(result.link,target);}
 }
 function auditSelect(policy){
  const target=multiBattle?.active?aliveMultiEnemies().slice().sort((a,b)=>a.hp-b.hp)[0]:null;
  const def=target?.mon||enemy;const hp=target?.hp??eHp;const sleep=target?.sleepTurns??eSleepTurns;const poison=target?.poisonTurns??ePoisonTurns;
  const moves=getEquippedMovesForInstance(activeInstance);
  if(policy==='first')return 0;
  let best=0,score=-Infinity;
  moves.forEach((mv,i)=>{let s=mv[1]*typeEff(mv[2],def.types)*pAtk*playerAttackInstanceMultiplier()*huntMapAttackMultiplier(moveTypes(mv));
   if(mv[3]==='repeat_attack')s*=1+(mv[4]??.3);
   if(policy==='tactical'){
    if(mv[3]==='heal')s=pHp<playerMaxHp()*.45?Math.min(playerMaxHp()-pHp,adjustedBattleHealing(24+activeInstance.level*3))*1.3:-1;
    if(mv[3]==='sleep')s=!sleep&&monSpd(player,activeInstance)>monSpd(def)?90:-1;
    if(mv[3]==='poison'&&!poison)s+=(target?.maxHp||enemyMaxHp())*BATTLE_STATUS_EFFECTS.poison.maxHpDamageRate*2*(mv[4]??.5);
    if(mv[3]==='drain')s+=Math.min(playerMaxHp()-pHp,s*.5);
    if(mv[3]==='buff')s=pAtk<1.5&&hp>s*5?60:-1;
   }
   if(s>score){score=s;best=i;}
  });return best;
 }
 async function auditStep(policy){const i=auditSelect(policy);if(multiBattle?.active){multiBattle.pendingMoveIndex=i;startMultiBattleTurn(aliveMultiEnemies().slice().sort((a,b)=>a.hp-b.hp)[0].id);}else await turn(i);}
 `);
 return {r,async battle(config,seed,log=false){r.context.Math.random=seeded(seed);r.context.auditConfig=config;r.run('auditSetup(auditConfig)');const logs=[];let turns=0;for(;turns<(config.cap||200);turns++){await r.run(`auditStep(${JSON.stringify(config.policy||'damage')})`);await r.flush();if(log)logs.push({turn:turns+1,html:r.elements.get('log').innerHTML});if(r.run('auditOutcome!==null'))break;}const out=r.run('auditOutcome');return {outcome:out?.kind||'capped',turns:Math.min(turns+1,config.cap||200),coins:out?.coins||0,exp:out?.exp||0,...(log?{logs}:{} )};}};
}
