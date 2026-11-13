import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';

const r=runtime(), run=r.run;
const plain=value=>JSON.parse(JSON.stringify(value));
const load=name=>vm.runInContext(fs.readFileSync(new URL(`../js/${name}.js`,import.meta.url),'utf8'),r.context,{filename:name});
load('traits-data');
load('traits-battle');
load('auto-battle');

const ring=['fire','ice','grass','wind','thunder','water'];
for (const [i,attacker] of ring.entries()) for (const [j,defender] of ring.entries())
  assert.equal(run(`typeEff('${attacker}',['${defender}'])`),j===(i+1)%6?1.5:j===(i+5)%6?.7:1,`${attacker}→${defender}`);
for(const type of ['light','dark','star','dragon','normal']){
  assert.equal(run(`typeEff('ice',['${type}'])`),1);
  assert.equal(run(`typeEff('${type}',['ice'])`),1);
}
assert.equal(run("typeEff('dragon',['dragon'])"),1.2);
assert.equal(run("typeEff('ice',['fire','grass'])"),1.5);
assert.equal(run("typeEff(['ice','water'],['fire'])"),1.5);
assert.equal(run("typeEff(['ice','normal'],['fire'])"),1);
assert.equal(run("typeEff(['ice','water'],['fire','grass'])"),1.5);
assert.deepEqual(plain(run("by('icegolem').types")),['ice']);
assert.deepEqual(plain(run("by('proto_icegolem').types")),['normal']);
assert.equal(run("skillToMove('s110_055')[2]"),'ice');
assert.equal(run("skillToMove('s110_017')[2]"),'water');
assert.deepEqual(plain(run("skillToMove('s110_057').slice(0,3)")),['氷塊拳',54,'ice']);
assert.equal(run("SKILL_BY_ID.s110_057.cost"),4);
assert.equal(run("SKILL110_CATALOG.length"),110);
assert.equal(run("defaultSkillIdsForMonster(by('icegolem'),{level:10}).includes('s110_057')"),true);
assert.equal(run("by('icegolem').legacyMoves[1][2]"),'normal');

run(`function iceSetup(enemyId='thornbeat',ids=['slime','icegolem','grassbeat']){
 let serial=0;Math.random=()=>.05+serial++*.01;save=initSave();save.instances=[];save.party=[];
 for(const id of ids){const ins=addInstance(id,30);save.party.push(ins.uid);}
 prepareBattleParty();selectedMap=MAPS.find(map=>map.id==='snow_mountain');
 enemy=structuredClone(by(enemyId));activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',['map_boost'],{allowOvertier:false});
 eHp=enemyMaxHp();multiBattle=null;busy=false;pFreezeTurns=eFreezeTurns=eSleepTurns=eParalysisTurns=eConfusionTurns=0;
 pGuard=eGuard=pAquaShield=eAquaShield=pFlareCharge=eFlareCharge=false;pAtk=eAtk=1;
 Math.random=()=>.1;
}
function iceLink(stars=2){const ice=partyBattle[1];ice.mon.rarity='★'.repeat(stars);const active=partyBattle[activePartyIdx];const result=activateKokoroLinkSource(ice.uid,partyBattle,activePartyIdx,{maxHp:playerMaxHp(),speed:monSpd(player,activeInstance)});if(!result.ok)throw Error(result.reason);return result.link;}
var iceMove=skillToMove('s110_055');
iceSetup();
activeHuntRequest.conditions=[createHuntCondition(selectedMap,'map_boost')];
`);
assert.equal(run("HUNT_MAP_BOOST_TYPES.snow_mountain"),'ice');
assert.equal(run("huntMapAttackMultiplier('ice')"),1.2);
assert.equal(run("huntMapAttackMultiplier('water')"),1);

await run("performAction(player,enemy,iceMove,true)");
assert.match(r.elements.get('log').innerHTML,/効果は抜群だ/);
run("iceSetup('freigal');");
await run("performAction(player,enemy,iceMove,true)");
assert.match(r.elements.get('log').innerHTML,/いまひとつのようだ/);

run("iceSetup(); var f=iceLink();");
assert.match(run("applyKokoroLinkStatusAbilityForBattle(f,null,()=>.69)"),/凍りついた/);
assert.equal(run('eFreezeTurns'),1);
const before=run('pHp');
assert.equal((await run("performAction(enemy,player,['試験',20,'normal'],false)")).acted,false);
assert.equal(run('pHp'),before);
assert.equal(run('eFreezeTurns'),0);
assert.match(r.elements.get('log').innerHTML,/凍って動けない/);
assert.equal((await run("performAction(enemy,player,['試験',20,'normal'],false)")).acted,true);

for(const control of ['eParalysisTurns','eConfusionTurns','eSleepTurns']){
  run(`iceSetup();var f=iceLink();${control}=2;`);
  assert.match(run("applyKokoroLinkStatusAbilityForBattle(f,null,()=>0)"),/すでに行動を止める/);
  assert.equal(run('eFreezeTurns'),0);
  assert.equal(run(control),2);
}
run("iceSetup(); var f=iceLink(); applyKokoroLinkStatusAbilityForBattle(f,null,()=>0);");
run('applyParalysisToTargetBase(false);applyConfusionToTargetBase(false);applySleepToTargetBase(false);traitApplyEnemyStatus("paralysis");');
assert.deepEqual(plain(run('[eParalysisTurns,eConfusionTurns,eSleepTurns,eFreezeTurns]')),[0,0,0,1]);
run('iceSetup();var f=iceLink();enemy.bossClass="test";');
assert.match(run("applyKokoroLinkStatusAbilityForBattle(f,null,()=>.35)"),/不発/);
assert.equal(run('eFreezeTurns'),0);
run('iceSetup();var f=iceLink();enemy.kokoroLinkStatusImmune=true;');
assert.match(run("applyKokoroLinkStatusAbilityForBattle(f,null,()=>0)"),/効かなかった/);
assert.equal(run('eFreezeTurns'),0);

for(const attack of [
 "['火試験',20,'fire',null,null,2,null,null,'legacy_test']",
 "['火氷試験',20,['fire','ice'],null,null,2,null,null,'s110_test',{}]"
]){
  run("iceSetup(); var f=iceLink();applyKokoroLinkStatusAbilityForBattle(f,null,()=>0);var start=eHp;");
  await run(`performAction(player,enemy,${attack},true)`);
  const frozenDamage=run('start-eHp');
  assert(frozenDamage>0);
  assert.equal(run('eFreezeTurns'),0);
  assert.match(r.elements.get('log').innerHTML,/氷が溶けた/);
  run("iceSetup();var f=iceLink();var start=eHp;");
  await run(`performAction(player,enemy,${attack},true)`);
  assert.equal(run('start-eHp'),frozenDamage,'fire damage should be unchanged by thaw');
}
run(`iceSetup('freigal');pFreezeTurns=1;applyKokoroLinkEnemyEffectComponents('single',[{category:'accuracy',rate:1,durationTurns:1}]);
var noThawHp=pHp;`);
await run("performAction(enemy,player,['火試験',20,'fire',null,null,2,null,null,'s110_test',{}],false)");
assert.equal(run('pHp'),run('noThawHp'));
assert.equal(run('pFreezeTurns'),1,'a missed fire attack cannot thaw');
run("iceSetup();var f=iceLink();applyKokoroLinkStatusAbilityForBattle(f,null,()=>0);");
await run("performAction(player,enemy,['中立試験',20,'normal'],true)");
assert.equal(run('eFreezeTurns'),1);
run("save.items.full_heal=1; pFreezeTurns=1;");
assert.equal(run("battleItemTargetReason('full_heal',activePartyIdx)"),'');
run("applyBattleItemEffect('full_heal',activePartyIdx);");
assert.equal(run('pFreezeTurns'),0);
assert.match(run("battleItemTargetReason('full_heal',activePartyIdx)"),/治す状態異常がありません/);

run(`iceSetup();activeHuntRequest.invasionEnemyId='slime';activeHuntRequest.invasionTurn=1;activeHuntRequest.battleMode='invasion_pending';
var f=iceLink();applyKokoroLinkStatusAbilityForBattle(f,null,()=>0);battleTurnCount=1;triggerInvasionIfDue();`);
assert.equal(run("multiEnemy('enemy_a').freezeTurns"),1,'invasion preserves original target freeze');
assert.equal(run("multiEnemy('enemy_b').freezeTurns"),0);
const multiBefore=run('pHp');
await run("performMultiAttack(multiEnemy('enemy_a'),{kind:'player'},['試験',20,'normal'])");
assert.equal(run('pHp'),multiBefore);
assert.equal(run("multiEnemy('enemy_a').freezeTurns"),0);
run("multiEnemy('enemy_a').freezeTurns=1;");
await run("performMultiAttack({kind:'player'},multiEnemy('enemy_a'),['火試験',20,'fire',null,null,2,null,null,'legacy_test'])");
assert.equal(run("multiEnemy('enemy_a').freezeTurns"),0);

run(`iceSetup();var f=iceLink();applyKokoroLinkStatusAbilityForBattle(f,null,()=>0);
var tutorialUiState={active:false};var battleUiCanAct=()=>true;autoEligible=()=>true;
autoRun=autoNewRun(selectedMap.id,activeHuntRequest.difficultyId,1);autoRun.phase='fight';autoRun.request=activeHuntRequest;
autoRun.settings.stopOnNewDex=false;autoRun.fightRandom=()=>.1;var autoBefore=pHp;autoAct();`);
await r.flush();
assert.equal(run('eFreezeTurns'),0);
assert.equal(run('pHp'),run('autoBefore'),'auto routes through freeze gate');
run('autoRun=null;');

run("iceSetup();var defLink=iceLink(1);");
assert.equal(run('playerLinkDefenseMultiplier(true)'),1.15);
assert.equal(run('playerLinkDefenseMultiplier(false)'),1);
const attackStats=run("battleStatDamageMultiplier(enemy,30,player,30)");
assert.equal(run("battleStatDamageMultiplier(enemy,30,player,30,playerLinkDefenseMultiplier(true))"),attackStats/1.15);
run('player.itemDefense=1.6;');
assert.equal(run("battleStatDamageMultiplier(enemy,30,player,30,playerLinkDefenseMultiplier(true))"),attackStats/(1.15*1.6));
run("player.itemDefense=1;defLink.barrierRemaining=0;var defStart=pHp;");
await run("performAction(enemy,player,['試験',80,'normal'],false)");
const withDefense=run("defStart-pHp");
run("iceSetup();var defLink=iceLink(1);defLink.barrierRemaining=0;defLink.effects.defenseMultiplier=1;var defStart=pHp;");
await run("performAction(enemy,player,['試験',80,'normal'],false)");
assert(withDefense<run("defStart-pHp"),'defense boosts damage calculation, independently of shield');

run(`iceSetup();
var reg=activateKokoroLinkSource(partyBattle[2].uid,partyBattle,0,{maxHp:playerMaxHp(),speed:100});
changeActivePartyMember(2);var stop=iceLink(3);
`);
assert.equal(run('reg.link.powerAbility.remainingTurns'),2);
assert.match(run('applyKokoroLinkTacticsAbilityForBattle(stop)'),/1件を1ターン延長/);
assert.equal(run('reg.link.powerAbility.remainingTurns'),3);
assert.equal(run('applyKokoroLinkTacticsAbilityForBattle(stop)'),'');
assert.equal(run('reg.link.powerAbility.remainingTurns'),3);

run("iceSetup();var stop=iceLink(3);pGuard=true;pAtk=1.6;");
assert.match(run('applyKokoroLinkTacticsAbilityForBattle(stop)'),/次に味方/);
assert.equal(run('pGuard&&pAtk===1.6'),true,'untimed and hit-based effects unchanged');
run(`iceSetup();
var stop=iceLink(3);applyKokoroLinkTacticsAbilityForBattle(stop);
changeActivePartyMember(1);var reg=activateKokoroLinkSource(partyBattle[2].uid,partyBattle,1,{maxHp:playerMaxHp(),speed:100});
`);
assert.equal(run('reg.link.powerAbility.remainingTurns'),3,'next real regeneration consumes pending boost');
assert.equal(run('extendNextPlayerTimedBuff(2)'),2);

run(`iceSetup('thornbeat',['slime','icegolem','character_tobia_4']);battleTurnCount=0;
changeActivePartyMember(2);changeActivePartyMember(0);var stop=iceLink(3);
`);
assert.match(run('applyKokoroLinkTacticsAbilityForBattle(stop)'),/1件を1ターン延長/);
run('changeActivePartyMember(2);battleTurnCount=1;');
assert.equal(run('traitPlayerSpeed(100)'),120,'same-turn re-entry keeps extended Swift');
run('battleTurnCount=2;');
assert.equal(run('traitPlayerSpeed(100)'),100,'extended Swift expires normally');

run(`iceSetup('thornbeat',['character_safira_4','icegolem','slime']);battleTurnCount=0;
changeActivePartyMember(2,{faintCurrent:true});var stop=iceLink(3);
`);
assert.equal(run('traitMember().giftUntil'),2);
assert.match(run('applyKokoroLinkTacticsAbilityForBattle(stop)'),/1件を1ターン延長/);
assert.equal(run('traitMember().giftUntil'),3);
run('battleTurnCount=2;');
assert.equal(run('traitMember().giftUntil>battleTurnCount'),true);
run('battleTurnCount=3;');
assert.equal(run('traitMember().giftUntil>battleTurnCount'),false);

run(`save=initSave();save.instances=[{uid:'legacy-ice',id:'icegolem',level:10}];save.party=['legacy-ice'];
save.skillCards={'skill_icegolem_01':2,'skill_icegolem_03':1,'sk_g5p_or4_9m7_9nt_9mr_9mf_9np_water_40_none':1,'s110_017':3};save.equippedSkills={'legacy-ice':['skill_icegolem_01','skill_icegolem_03']};save.saveMeta.migrations=[];
save=parseAndPrepareSave(JSON.stringify(save),[]);
`);
assert.equal(run("save.instances[0].uid"),'legacy-ice');
assert.equal(run('save.skillCards.s110_055'),2);
assert.equal(run('save.skillCards.s110_057'),2);
assert.equal(run("getEquippedMovesForInstance(save.instances[0])[1][2]"),'ice');
assert.equal(run('save.skillCards.s110_017'),3);
assert.equal(run("getEquippedMovesForInstance(save.instances[0])[0][2]"),'ice');
assert.equal(run("by(save.instances[0].id).types[0]"),'ice');
const stable=run('JSON.stringify(save)');
run('save=parseAndPrepareSave(JSON.stringify(save),[]);');
assert.equal(run('JSON.stringify(save)'),stable);
run(`save=initSave();save.instances=[{uid:'modern-ice',id:'icegolem',level:10}];save.party=['modern-ice'];
save.skillCards={s110_055:2,s110_057:1,s110_017:3};save.equippedSkills={'modern-ice':['s110_055','s110_017']};
save=parseAndPrepareSave(JSON.stringify(save),[]);`);
assert.equal(run('save.skillCards.s110_017'),3);
assert.equal(run('save.skillCards.s110_055'),2);
assert.equal(run('save.skillCards.s110_057'),1);
assert.deepEqual(plain(run("getEquippedSkillIds(save.instances[0])")),['s110_055']);
assert.equal(run("SKILL_BY_ID.s110_017.name"),'大波召喚');
console.log('Ice attribute: six-type and compound matches, messages, freeze single/multi/invasion/auto, resistance, exclusivity, fire thaw, Panacea, defense, both Time Stop paths, snow bonus, and old save passed.');
