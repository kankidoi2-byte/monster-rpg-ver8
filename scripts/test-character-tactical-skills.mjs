import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';

const r=runtime(), run=r.run;
const plain=value=>JSON.parse(JSON.stringify(value));
const units=plain(run('M'));
const revised=units.filter(unit=>unit.entityKind==='character'&&unit.characterNo>=15&&!unit.id.startsWith('character_vera_'));
const exclusive=revised.flatMap(unit=>unit.legacyMoves);
const commons=plain(run('CHARACTER_COMMON_MOVES'));
const cards=plain(run('MOVE_CARDS'));
assert.equal(revised.length,33);
assert.equal(exclusive.length,99);
assert.equal(commons.length,6);
assert.deepEqual(commons.map(move=>move[8]).sort(),[
 'skill_character_common_buff','skill_character_common_debuff','skill_character_common_guard',
 'skill_character_common_paralysis','skill_character_common_poison','skill_character_common_recoil'
]);

// Fixed IDs preserve ownership while every rewritten card has its own name and mechanics.
const revisedIds=exclusive.map(move=>move[8]);
assert.equal(new Set(revisedIds).size,99);
const legacy=plain(run('CHARACTER_SKILL_LEGACY_MOVES'));
assert.deepEqual(Object.keys(legacy).sort(),[...revisedIds].sort());
for(const move of [...exclusive,...commons]){
 r.context.testMove=move;
 const card=cards.find(candidate=>candidate.id===move[8]);
 assert(card,move[8]);
 assert.equal(cards.filter(candidate=>candidate.deprecated&&candidate.name===move[0]).length,1,`unique name: ${move[0]}`);
 assert.doesNotMatch(move[0],/[・\s][234２３４]$/,'remove stage-number suffixes');
 const converted=plain(run('skillToMove(testMove[8])'));
 assert.deepEqual(converted.slice(0,3),move.slice(0,3));
 assert.equal(converted[5],move[5]);
 assert.equal(converted[8],move[8]);
 assert.deepEqual(converted[9]??null,move[9]??null,`${move[8]} metadata round trip`);
 assert.deepEqual(card.tactical??null,move[9]??null);
 assert.equal(run('normalizeSkillId(legacySkillIdFromMove(testMove))'),move[8]);
 if(move[1]===0){
  const motion=plain(run('skillBattleMotionForMove(testMove)'));
  assert.equal(motion.role,'support');
  assert.equal(motion.animated,true,`${move[8]} has an animated support effect`);
  assert(['heal','guard','buff','debuff'].includes(motion.form),`${move[8]} cannot use a damaging strike animation`);
 }
}
for(const [id,form] of [
 ['skill_character_common_guard','guard'],['skill_character_common_buff','buff'],['skill_character_common_debuff','debuff'],
 ['skill_character_bordo_2_02','heal'],['skill_character_nico_3_02','buff'],['skill_character_mireille_4_02','debuff']
]){
 r.context.testId=id;
 assert.equal(run('skillBattleMotionForMove(skillToMove(testId)).form'),form,`${id}: support animation semantics`);
}
for(const [id,move] of Object.entries(legacy)){
 r.context.testMove=move;
 assert.equal(run('normalizeSkillId(legacySkillIdFromMove(testMove))'),id,`old name alias ${id}`);
}

// Legacy records retain identity while their adopted replacements use shared
// attribute/body compatibility rather than character-only restrictions.
for(const move of commons){
 r.context.testId=move[8];
 assert(run('SKILL_BY_ID[testId].commonCharacterSkill'));
 assert(run('SKILL_BY_ID[testId].deprecated'));
 assert(run('SKILL110_MIGRATION_MAP[testId]'));
}
for(const unit of units){
 r.context.unitId=unit.id;
 run('save=initSave();var fresh=addInstance(unitId,1);');
 const defaults=plain(run('getEquippedSkillIds(fresh)'));
 assert(!defaults.some(id=>commons.some(move=>move[8]===id)),'common cards are not initial grants');
 assert(commons.every(move=>!(run('save.skillCards')[move[8]]>0)));
 if(revised.some(candidate=>candidate.id===unit.id)){
  assert.deepEqual(defaults,unit.moves.map(move=>move[8]),`${unit.id}: all three own-form moves fit at level 1`);
  assert(run('equippedSkillCost(fresh)<=skillCostLimitFor(by(unitId),fresh)'));
 }
}

// All 99 historical name-derived inventories merge additively by target.
run(`save=initSave();save.saveMeta.migrations=save.saveMeta.migrations.filter(id=>id!=='skill_system_110_v1');
 save.coins=4321;save.instances=[];save.party=[];save.skillCards={};save.equippedSkills={};`);
const expected={};
for(const [index,unit] of revised.entries()){
 r.context.savedUnit={id:unit.id,uid:`tactical_saved_${index}`,level:100,exp:0,locked:false};
 r.context.savedMoves=unit.legacyMoves.map(move=>move[8]);
 run('save.instances.push(savedUnit);save.equippedSkills[savedUnit.uid]=savedMoves;');
}
for(const [index,[id,move]] of Object.entries(legacy).entries()){
 r.context.testMove=move;
 const oldId=run('legacySkillIdFromMove(testMove)');r.context.oldId=oldId;
 const target=run('SKILL110_MIGRATION_MAP[oldId]');assert(target);
 expected[target]=(expected[target]||0)+index+7;r.context.count=index+7;
 run('save.skillCards[oldId]=count;');
}
run(`save.party=save.instances.slice(0,3).map(ins=>ins.uid);var previousUids=save.instances.map(ins=>ins.uid);
 save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem();`);
assert.equal(run('SAVE_KEY'),'mb_v95c');assert.equal(run('save.coins'),4321);
assert.deepEqual(plain(run('save.instances.map(ins=>ins.uid)')),plain(run('previousUids')));
for(const [id,count] of Object.entries(expected)){
 r.context.testId=id;assert.equal(run('save.skillCards[testId]'),count,`merged historical inventory ${id}`);
}
assert(run('save.instances.every(ins=>getEquippedSkillIds(ins).some(id=>SKILL_BY_ID[id].power>0))'));
assert(run('save.instances.every(ins=>equippedSkillCost(ins)<=skillCostLimitFor(by(ins.id),ins))'));
const once=run('JSON.stringify(save.skillCards)');run('migrateSkillSystem();');assert.equal(run('JSON.stringify(save.skillCards)'),once);
for(const base of revised.filter(unit=>!unit.evolutionOnly)){
 r.context.unitId=base.id;
 run('save=initSave();var evolved=addInstance(unitId,100);save.party=[evolved.uid];');
 const equipment=plain(run('getEquippedSkillIds(evolved)'));
 const uid=run('evolved.uid');
 for(let stage=0;stage<2;stage++){
  run('currentEvolution={uid:evolved.uid,from:evolved.id,choices:getEvoCandidates(evolved)};confirmEvolution(currentEvolution.choices[0]);');
  assert.equal(run('evolved.uid'),uid);
  assert.deepEqual(plain(run('getEquippedSkillIds(evolved)')),equipment,'earlier skills survive each evolution');
  assert(run('by(evolved.id).moves.every(move=>save.skillCards[move[8]]>=1)'),'new-form cards are granted');
 }
}

const battle=runtime(), b=battle.run;
battle.context.document.addEventListener=()=>{};
vm.runInContext(fs.readFileSync(new URL('../js/battle-ui.js',import.meta.url),'utf8'),battle.context,{filename:'js/battle-ui.js'});
battle.context.motionCalls=[];
b('playBattleSkillMotion=async(source,target,move)=>{motionCalls.push({source,target,id:move[8]||move[0]});return false;};');
function setup(mode='single'){
 b(`save=initSave();save.instances=[];save.party=[];var fighter=addInstance('character_bordo_4',10);save.party=[fighter.uid];
 prepareBattleParty();selectedMap=MAPS[0];enemy=by('character_bordo_4');
 activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);activeHuntRequest.battleMode='single';
 beginChosenBattle('grassland',enemy.id,'normal',activeHuntRequest);
 activeHuntRequest.enemyLevel=10;activeHuntRequest.enemyHp=playerMaxHp();activeHuntRequest.attackMultiplier=1;
 pHp=300;eHp=300;pAtk=eAtk=1;pGuard=eGuard=false;pAquaShield=eAquaShield=false;
 pFlareCharge=eFlareCharge=false;pStatus=eStatus=null;
 pPoisonTurns=ePoisonTurns=pParalysisTurns=eParalysisTurns=pConfusionTurns=eConfusionTurns=pSleepTurns=eSleepTurns=0;
 multiBattle=null;`);
 if(mode==='multi')b(`multiBattle={active:true,finished:false,enemies:[createMultiEnemy(enemy,'enemy_a'),createMultiEnemy(enemy,'enemy_b')]};
 multiBattle.enemies.forEach(entry=>{entry.hp=300;entry.maxHp=playerMaxHp();entry.level=10;});`);
 battle.context.Math.random=()=>0;
}
function moveWith(profile,power=0){return ['効果検証',power,'normal','tactical',null,2,'',null,null,profile];}
function resolve(profile,options={}){
 battle.context.testMove=moveWith(profile,options.power??0);
 return b(`resolveTacticalSkillEffects(testMove,${options.enemy?'false':'true'},null,null,${options.damage??0})`);
}
async function attack(move,mode='single',enemy=false){
 battle.context.testMove=move;
 if(mode==='single')await b(`doAttack(${enemy?'enemy,player':'player,enemy'},testMove,${!enemy})`);
 else await b(`performMultiAttack(${enemy?'multiBattle.enemies[0]':"{kind:'player'}"},${enemy?"{kind:'player'}":'multiBattle.enemies[0]'},testMove)`);
}
function snapshot(mode='single'){
 return plain(b(`[
 {hp:pHp,attack:pAtk,guard:pGuard,status:pStatus,poisonTurns:pPoisonTurns,paralysisTurns:pParalysisTurns,confusionTurns:pConfusionTurns,sleepTurns:pSleepTurns,charge:pFlareCharge,shield:pAquaShield},
 ${mode==='single'?'{hp:eHp,attack:eAtk,guard:eGuard,status:eStatus,poisonTurns:ePoisonTurns,paralysisTurns:eParalysisTurns,confusionTurns:eConfusionTurns,sleepTurns:eSleepTurns,charge:eFlareCharge,shield:eAquaShield}':
 "((entry)=>({hp:entry.hp,attack:entry.attack,guard:entry.guard,status:entry.status,poisonTurns:entry.poisonTurns,paralysisTurns:entry.paralysisTurns,confusionTurns:entry.confusionTurns,sleepTurns:entry.sleepTurns,charge:entry.flareCharge,shield:entry.aquaShield}))(multiBattle.enemies[0])"}]`));
}

// Player-facing target text and actual effect animation must agree in either
// battle mode, including when an enemy uses the same support effect.
const supportTargets=[
 {move:commons.find(move=>move[8]==='skill_character_common_guard'),self:true},
 {move:commons.find(move=>move[8]==='skill_character_common_buff'),self:true},
 {move:exclusive.find(move=>move[8]==='skill_character_bordo_4_02'),self:true},
 {move:commons.find(move=>move[8]==='skill_character_common_debuff'),self:false},
 {move:moveWith({dispel:true}),self:false},
 {move:moveWith({guard:true,debuff:.1}),self:false,mixed:true}
];
for(const mode of ['single','multi'])for(const enemyActs of [false,true])for(const test of supportTargets){
 setup(mode);battle.context.testMove=test.move;battle.context.motionCalls=[];
 const enemyLabel=mode==='single'?'敵1体':'選択した敵1体';
 const expectedLabel=test.mixed?`自分と${enemyLabel}`:test.self?'自分':enemyLabel;
 assert.equal(b('battleUiMoveTarget(testMove)'),expectedLabel,'target label describes actual recipients');
 assert(b('battleUiSkillInfo(testMove)').includes(`対象：${expectedLabel}<br>`),'skill explanation includes correct target');
 const actorHp=enemyActs?(mode==='single'?'eHp':'multiBattle.enemies[0].hp'):'pHp';
 const before=b(actorHp),maximum=b(enemyActs&&mode==='single'?'enemyMaxHp()':'playerMaxHp()');
 await attack(test.move,mode,enemyActs);
 const enemyVisual=mode==='single'?'eVis':'enemy_aVis';
 const source=enemyActs?enemyVisual:'pVis',opponent=enemyActs?'pVis':enemyVisual;
 assert.deepEqual(plain(battle.context.motionCalls),[{source,target:test.self?source:opponent,id:test.move[8]||test.move[0]}],`${mode}/${enemyActs}: support animation target`);
 if(test.move[9]?.heal){
  const healing=test.move[9].heal;
  assert.equal(b(actorHp),Math.min(maximum,before+Math.floor(healing.flat+10*healing.perLevel)),'shipped healing follows its current data');
 }
}

// Focused effect contracts cover caps, additive effects, conditions, and real damage.
setup();b('pHp=100;');resolve({heal:{flat:12,perLevel:2}});assert.equal(b('pHp'),132);
b('pHp=playerMaxHp()-1;');resolve({heal:{flat:999,perLevel:2}});assert.equal(b('pHp'),b('playerMaxHp()'));
b("pHp=100;activeHuntRequest.conditions=[{id:'healing_half'}];");resolve({heal:{flat:12,perLevel:2}});assert.equal(b('pHp'),116);
setup();b('pAtk=1.55;eAtk=.7;');resolve({buff:.2,debuff:.2});assert.equal(b('pAtk'),1.6);assert.equal(b('eAtk'),.65);
setup();b("pStatus='poison';pPoisonTurns=3;pParalysisTurns=3;pConfusionTurns=3;pSleepTurns=2;");
resolve({cleanse:['poison','paralysis','confusion','sleep']});assert.deepEqual(plain(b('[pStatus,pPoisonTurns,pParalysisTurns,pConfusionTurns,pSleepTurns]')),[null,0,0,0,0]);
resolve({guard:true,charge:true});assert.equal(b('pGuard'),true);assert.equal(b('pFlareCharge'),true);
setup();b('eAtk=1.5;eGuard=eAquaShield=eFlareCharge=true;');resolve({dispel:true});assert.deepEqual(plain(b('[eAtk,eGuard,eAquaShield,eFlareCharge]')),[1,false,false,false]);
b('eAtk=.8;');resolve({dispel:true});assert.equal(b('eAtk'),.8,'dispel never repairs an attack debuff');
setup();b('pHp=100;');resolve({drain:.5},{damage:7,power:100});assert.equal(b('pHp'),103,'drain uses actual HP loss, with integer rounding');
resolve({drain:.5},{damage:0,power:100});assert.equal(b('pHp'),103,'blocked damage cannot heal');
setup();b('pHp=2;');resolve({recoil:.1},{damage:15,power:50});assert.equal(b('pHp'),0,'recoil can KO but HP never goes negative');
setup();b('pHp=playerMaxHp();');const hp=b('pHp');resolve({recoil:.1},{damage:1,power:50});assert.equal(b('pHp'),hp-Math.floor(hp*.1),'recoil scales with max HP');
// Exercise the existing link contract with a synthetic monster fixture; current
// character cards are not equippable by monsters and do not gain link access.
setup();b(`partyBattle[0].mon={...player,entityKind:'monster'};
 var fireSourceMon={...by('freigal'),rarity:'★★★'};
 var fireSource={uid:'tactical-recoil-source',level:1};
 var recoilLink=activateKokoroLinkSource(fireSource.uid,[partyBattle[0],{uid:fireSource.uid,inst:fireSource,mon:fireSourceMon,hp:100}],0,{maxHp:playerMaxHp(),speed:100});`);
assert(b('recoilLink.ok'));
resolve({recoil:.1},{damage:20,power:50});assert.equal(b('pHp'),300,'link negates the first tactical recoil');
resolve({recoil:.1},{damage:20,power:50});assert.equal(b('pHp'),300-Math.floor(b('playerMaxHp()')*.1),'one-shot recoil protection is consumed');
for(const [kind,field] of [['poison','ePoisonTurns'],['paralysis','eParalysisTurns'],['confusion','eConfusionTurns']]){
 setup();resolve({status:{kind,chance:0}},{power:1,damage:1});assert.equal(b(field),0,`${kind} chance 0`);
 resolve({status:{kind,chance:1}},{power:1,damage:1});assert(b(field)>0,`${kind} chance 1`);
 setup();battle.context.Math.random=()=>.99;resolve({status:{kind,chance:.5}},{power:1,damage:1});assert.equal(b(field),0,`${kind} failed roll`);
 setup();b('eHp=0;');resolve({status:{kind,chance:1}},{power:1,damage:1});assert.equal(b(field),0,`${kind} cannot affect a KO target`);
}
for(const [condition,prepare] of [
 ['target_hurt','eHp=Math.floor(enemyMaxHp()*.25);'],
 ['self_hurt','pHp=Math.floor(playerMaxHp()*.25);'],
 ['target_poisoned',"eStatus='poison';ePoisonTurns=3;"],
 ['target_guarded','eGuard=true;']
]){
 setup();battle.context.testMove=moveWith({bonus:{condition,threshold:.5,multiplier:1.5}},40);
 assert.equal(b('tacticalSkillPower(testMove,true)'),40,`${condition} inactive`);
 b(prepare);assert.equal(b('tacticalSkillPower(testMove,true)'),60,`${condition} active`);
}
// Link poison uses its own timed effect store, rather than the ordinary poison
// fields. It must activate poisoned-target skills only while present on that target.
for(const mode of ['single','multi'])for(const state of ['active','expired','other-target','other-status']){
 setup(mode);battle.context.testMove=moveWith({bonus:{condition:'target_poisoned',multiplier:1.5}},40);
 const targetKey=mode==='single'?'single':'enemy_a';
 battle.context.poisonTarget=state==='other-target'?'enemy_b':targetKey;
 battle.context.poisonComponent={category:state==='other-status'?'burn':'poison',durationTurns:state==='expired'?0:2,maxHpRatePerTurn:.05,label:'検証毒'};
 b('applyKokoroLinkEnemyEffectComponents(poisonTarget,[poisonComponent]);');
 assert.equal(b(mode==='single'?'eStatus':'multiBattle.enemies[0].status'),null,'link poison does not require ordinary poison state');
 const expected=state==='active'?60:40;
 const powerCall=mode==='single'?'tacticalSkillPower(testMove,true)':'tacticalSkillPower(testMove,true,null,multiBattle.enemies[0])';
 assert.equal(b(powerCall),expected,`${mode}/${state}: link poison condition`);
 await attack(plain(b('testMove')),mode);
 assert.equal(300-b(mode==='single'?'eHp':'multiBattle.enemies[0].hp'),expected,`${mode}/${state}: real attack uses link poison condition`);
 if(state==='active'){
  assert.equal(b(mode==='single'?'tacticalSkillPower(testMove,false)':'tacticalSkillPower(testMove,false,multiBattle.enemies[0],{kind:"player"})'),40,'an enemy poison record does not make the player poisoned');
  if(mode==='multi')assert.equal(b('tacticalSkillPower(testMove,false,multiBattle.enemies[1],multiBattle.enemies[0])'),60,'enemy-to-enemy targeting reads the selected enemy poison');
 }
}

// Each shipped card traverses both production attack handlers for both sides.
// Matching the complete combat state catches support early-returns and duplicate effects.
for(const move of [...exclusive,...commons])for(const enemyActs of [false,true]){
 const states=[];
 for(const mode of ['single','multi']){
  setup(mode);await attack(move,mode,enemyActs);states.push(snapshot(mode));
 }
 assert.deepEqual(states[1],states[0],`${move[8]} ${enemyActs?'enemy':'player'}: single/multi parity`);
}

// Compound attack effects happen exactly once after damage; support causes no damage.
setup();await attack(moveWith({heal:{flat:10,perLevel:0},buff:.1,debuff:.1},20));
assert.equal(b('pHp'),310);assert.equal(b('eHp'),280);assert.equal(b('pAtk'),1.1);assert.equal(b('eAtk'),.9);
setup();await attack(moveWith({buff:.1,debuff:.1},0));assert.equal(b('pHp'),300);assert.equal(b('eHp'),300);
setup();await attack(moveWith({charge:true},0));await attack(moveWith({},40));assert.equal(b('eHp'),252);assert.equal(b('pFlareCharge'),false,'charge consumed by next attack');
setup();b('eHp=3;pHp=100;');await attack(moveWith({drain:.5},100));assert.equal(b('pHp'),101,'overkill does not inflate drain');
for(const mode of ['single','multi'])for(const enemyActs of [false,true])for(const condition of ['target_hurt','self_hurt','target_poisoned','target_guarded']){
 setup(mode);
 const enemyHp=mode==='single'?'eHp':'multiBattle.enemies[0].hp';
 const targetHp=enemyActs?'pHp':enemyHp;
 if(condition==='target_hurt')b(`${targetHp}=100;`);
 if(condition==='self_hurt')b(`${enemyActs?enemyHp:'pHp'}=100;`);
 if(condition==='target_poisoned')b(enemyActs?"pStatus='poison';pPoisonTurns=3;":mode==='single'?"eStatus='poison';ePoisonTurns=3;":"multiBattle.enemies[0].status='poison';multiBattle.enemies[0].poisonTurns=3;");
 if(condition==='target_guarded')b(enemyActs?'pGuard=true;':mode==='single'?'eGuard=true;':'multiBattle.enemies[0].guard=true;');
 const before=b(targetHp);
 await attack(moveWith({bonus:{condition,threshold:.5,multiplier:1.5}},40),mode,enemyActs);
 assert.equal(before-b(targetHp),condition==='target_guarded'?33:60,`${mode}/${enemyActs}/${condition}: bonus applied before defenses`);
}

// Multi enemies target each other without changing the player's state or another enemy.
setup('multi');b('multiBattle.enemies[0].hp=100;');const untouched=snapshot('multi')[0];
battle.context.testMove=moveWith({heal:{flat:9,perLevel:1},debuff:.2,status:{kind:'poison',chance:1}},20);
await b('performMultiAttack(multiBattle.enemies[0],multiBattle.enemies[1],testMove)');
assert.deepEqual(snapshot('multi')[0],untouched);
assert.equal(b('multiBattle.enemies[0].hp'),119);assert.equal(b('multiBattle.enemies[0].attack'),1);
assert.equal(b('multiBattle.enemies[1].hp'),280);assert.equal(b('multiBattle.enemies[1].attack'),.8);
assert.equal(b('multiBattle.enemies[1].status'),'poison');assert.equal(b('multiBattle.enemies[1].poisonSourceIsPlayer'),false);
setup('multi');b('multiBattle.enemies[0].hp=1;');battle.context.testMove=moveWith({recoil:.1},20);
await b('performMultiAttack(multiBattle.enemies[0],multiBattle.enemies[1],testMove)');
assert.equal(b('multiBattle.enemies[0].hp'),0);assert.equal(b('multiBattle.enemies[0].alive'),false,'enemy recoil KO updates the living roster');
assert.equal(b('multiBattle.enemies[0].defeatedByPlayer'),false,'enemy recoil KO does not award player kill credit');

// Existing non-tactical skill behavior remains on its old path.
setup();await attack(['従来回復',0,'normal','heal']);assert.equal(b('pHp'),Math.min(b('playerMaxHp()'),354));
setup();await attack(['従来強化',0,'normal','buff']);assert.equal(b('pAtk'),1.25);
setup();await attack(['従来反動',20,'normal','recoil']);assert.equal(b('pHp'),292);assert.equal(b('eHp'),280);

console.log('PASS: 99 revised cards + 6 common cards, unique names, metadata round trip, 50-character common-card compatibility, initial equipment, old aliases/inventory/UIDs, evolution, effect limits, conditional attacks, single/multi parity, enemy targeting, and legacy behavior.');
