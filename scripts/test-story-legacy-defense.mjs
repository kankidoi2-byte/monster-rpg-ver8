import assert from 'node:assert/strict';
/* Real combat engine, isolated saves; no items, links, evolution or extra grinding. */
import fs from 'node:fs';
import vm from 'node:vm';
import {battleRunner} from '../tools/balance-audit/battles.mjs';
const b=battleRunner(),r=b.r;
for(const f of ['map-story-data','map-story'])vm.runInContext(fs.readFileSync(new URL(`../js/${f}.js`,import.meta.url),'utf8'),r.context);
r.run(`renderBattleInputState=()=>{};showUiNotice=()=>{};
 var storyAuditSwitches=0,storyAuditLostHp=0,originalStoryOutcome=mapStoryOutcome;
 mapStoryOutcome=function(kind,request=activeHuntRequest){
  storyAuditLostHp=partyBattle.reduce((sum,p,i)=>sum+instanceMaxHp(p.inst)-(i===activePartyIdx?pHp:p.hp),0);
  return originalStoryOutcome(kind,request);
 };
 auditSetup=function(c){
  auditOutcome=null;mapStoryUi=null;mapStorySaveRetry=null;storyAuditSwitches=0;storyAuditLostHp=0;
  save=initSave();save.progress.tutorial.status='completed';
  c.party.forEach((id,i)=>{const ins=addInstance(id,c.level);ins.uid='story-audit-'+i;ins.exp=c.exp||0;save.party.push(ins.uid);});
  const episode=mapStoryEpisode(c.episodeId);
  for(const e of GRASSLAND_STORY.episodes){if(e.number<episode.number)mapStoryState().episodes[e.id]={completed:true,firstVictory:true,firstRewardClaimed:true,victoryCount:1};}
  const request=createMapStoryRequest(episode,'audit',save.party);
  mapStoryState().resume={episodeId:episode.id,phase:'battle',nodeId:null,attemptId:'audit',participantUids:save.party,rewardCommitted:false,postPending:false};
  endPartyRecovery();prepareBattleParty();beginChosenBattle('grassland',request.enemyId,'normal',request);
 };
 auditStep=async function(policy){
  const target=multiBattle?.active?aliveMultiEnemies().slice().sort((a,b)=>a.hp-b.hp)[0]:null,def=target?.mon||enemy;
  const score=p=>Math.max(24*typeEff('normal',def.types),...getEquippedMovesForInstance(p.inst).map(m=>m[1]*typeEff(m[2],def.types)));
  const currentScore=score(partyBattle[activePartyIdx]);
  const best=livingPartySwitchCandidates().sort((a,b)=>score(b.entry)-score(a.entry))[0];
  if(policy==='tactical'&&best&&(score(best.entry)>currentScore*1.3||pHp<playerMaxHp()*.2&&best.entry.hp>instanceMaxHp(best.entry.inst)*.5)){
   storyAuditSwitches++;performManualPartySwitch(best.index);return;
  }
  const i=policy==='basic'?-1:auditSelect('tactical');
  if(multiBattle?.active){multiBattle.pendingMoveIndex=i;startMultiBattleTurn(target.id);}else await turn(i);
 };`);

let cases=0;const damageCases=[];
for(const episodeId of ['gl_01','gl_03','gl_11'])for(const [guard,sid] of [[0,null],[.4,'s110_110'],[.45,'s110_003'],[.6,'s110_101'],[.7,'s110_063']])for(const shield of [false,true]){
 r.context.config={party:['galdra','freigal','aquaron'],level:100,episodeId};r.run('auditSetup(config);pAtk=eAtk=1;pFlareCharge=eFlareCharge=false;Math.random=()=>0');
 if(sid){r.context.sid=sid;assert(r.run('isSkillAllowedForMonster(sid,player)'));await r.run('doAttack(player,enemy,skillToMove(sid),true)');}
 r.context.shield=shield;r.run('pAquaShield=shield');const before=r.run('pHp');
 if(r.run('!!multiBattle?.active'))await r.run('performMultiAttack(multiBattle.enemies[0],{kind:"player"},multiBattle.enemies[0].mon.moves.find(m=>m[1]>0))');
 else await r.run('doAttack(enemy,player,enemy.moves.find(m=>m[1]>0),false)');
 const raw=({gl_01:14*.8,gl_03:24*.85,gl_11:48*.75})[episodeId];
 const expected=Math.max(1,Math.floor(raw*(1-Math.max(guard,shield?.5:0)))),damage=before-r.run('pHp');
 assert.equal(damage,expected,JSON.stringify({episodeId,guard,shield}));assert.equal(r.run('pGuard'),false);assert.equal(r.run('pAquaShield'),false);damageCases.push({episodeId,guard,shield,damage});cases++;
}
// One defensive decision per whole legacy repeat attack, including link charges.
const originalLink=r.run('kokoroLinkEffectForInstance');r.context.originalLink=originalLink;
for(const mode of ['single','three_way'])for(const evasion of [false,true]){
 r.context.config={party:['galdra'],level:100,episodeId:mode==='single'?'gl_01':'gl_03'};r.run('auditSetup(config);pGuard=.7;Math.random=()=>0;');
 r.context.evasion=evasion;r.run('var defenseTestLink={barrierRemaining:5,powerAbility:evasion?{id:"evasion",charges:1,chance:1}:{id:"first_hit_guard",charges:1,reductionRate:.3},tacticsAbility:{id:"water_mirror_guard",charges:1,reductionRate:.3}};kokoroLinkEffectForInstance=()=>defenseTestLink;');
 r.run('var chain=["互換連撃",100,"normal","repeat_attack",1,1,"",null,"legacy_defense_fixture"];');
 const before=r.run('pHp'),multiplier=mode==='single'?.8:.85;
 if(mode==='single')await r.run('doAttack(enemy,player,chain,false)');else await r.run('performMultiAttack(multiBattle.enemies[0],{kind:"player"},chain)');
 const hit=Math.max(1,Math.floor(100*multiplier*(1-.7)));
 assert.equal(before-r.run('pHp'),evasion?0:hit*2-5);assert.equal(r.run('defenseTestLink.powerAbility.charges'),0);
 assert.equal(r.run('defenseTestLink.tacticsAbility.charges'),evasion?1:0);assert.equal(r.run('pGuard'),false);assert.equal(r.run('defenseTestLink.barrierRemaining'),evasion?5:0);cases++;
 r.run('kokoroLinkEffectForInstance=originalLink');
}
// Legacy compatibility attacks in the other directions use the same numeric guard.
for(const direction of ['single-player','multi-player','enemy-enemy'])for(const guard of [.4,.7]){
 r.context.config={party:['galdra'],level:100,episodeId:direction==='single-player'?'gl_01':'gl_03'};r.run('auditSetup(config);pAtk=eAtk=1;pFlareCharge=eFlareCharge=false;Math.random=()=>0');r.context.g=guard;
 r.run('var plainHit=["互換攻撃",100,"normal",null,null,1,"",null,"legacy_hit_fixture"];');
 let before,after,raw;
 if(direction==='single-player'){r.run('eHp=1000;eGuard=g');before=r.run('eHp');await r.run('doAttack(player,enemy,plainHit,true)');after=r.run('eHp');raw=100*r.run('playerAttackInstanceMultiplier()');assert.equal(r.run('eGuard'),false);}
 else {r.run('multiBattle.enemies[1].hp=1000;multiBattle.enemies[1].guard=g');before=r.run('multiBattle.enemies[1].hp');await r.run(direction==='multi-player'?'performMultiAttack({kind:"player"},multiBattle.enemies[1],plainHit)':'performMultiAttack(multiBattle.enemies[0],multiBattle.enemies[1],plainHit)');after=r.run('multiBattle.enemies[1].hp');raw=direction==='multi-player'?100*r.run('playerAttackInstanceMultiplier()'):85;assert.equal(r.run('multiBattle.enemies[1].guard'),false);}
 assert.equal(before-after,Math.floor(raw*(1-guard)),direction);cases++;
}
// Stronger 110 guard survives a weaker support; periodic poison and recoil do not consume it.
r.context.config={party:['galdra'],level:100,episodeId:'gl_01'};r.run('auditSetup(config);pAtk=eAtk=1;pFlareCharge=eFlareCharge=false;Math.random=()=>0');
await r.run('doAttack(player,enemy,skillToMove("s110_063"),true)');await r.run('doAttack(player,enemy,skillToMove("s110_003"),true)');assert.equal(r.run('pGuard'),.7);
let before=r.run('pHp');await r.run('doAttack(player,enemy,["互換反動",1,"normal","recoil",null,1,"",null,"legacy_recoil_fixture"],true)');assert.equal(before-r.run('pHp'),8);assert.equal(r.run('pGuard'),.7);
r.run('pStatus="poison";pPoisonTurns=3;');before=r.run('pHp');r.run('applyPoisonEndTurn()');
assert.equal(before-r.run('pHp'),r.run('Math.floor(playerMaxHp()*.1)'));assert.equal(r.run('pGuard'),.7);cases++;
console.log(JSON.stringify({result:'PASS',cases,damageCases,scope:'real grassland single/multi legacy attacks, 110 support skills, strongest shield/link, repeat hit/evasion once, poison/recoil bypass; VM rendering/save stubbed'}));
