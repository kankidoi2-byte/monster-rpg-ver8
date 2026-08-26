import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function read(relativePath) {
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

const context = vm.createContext({console, alert:()=>{}, confirm:()=>false});
vm.runInContext(read('js/data.js'), context, {filename:'js/data.js'});
vm.runInContext(read('js/core.js'), context, {filename:'js/core.js'});

const motion = vm.runInContext(`({
  skillToMove,
  skillBattleMotionForMove,
  by,
  cards:MOVE_CARDS
})`, context);

const breathMove = motion.skillToMove('skill_nemes_03');
const beamMove = motion.skillToMove('skill_false_dragon_alfa_01');
const healingBreathMove = motion.skillToMove('skill_luxseed_03');
const swordMove = motion.skillToMove('skill_elna_beginner_01');
const swordSupportMove = motion.skillToMove('skill_elna_beginner_02');
const clawMove = motion.skillToMove('skill_freigal_02');
const fangMove = motion.skillToMove('skill_freigal_01');
const magicMove = motion.skillToMove('skill_aquaron_01');
const magicSupportMove = motion.skillToMove('skill_stella_apprentice_03');
const bladeMove = motion.skillToMove('skill_tienhairon_02');
const chargeMove = motion.skillToMove('skill_freigal_03');
const strikeMove = motion.skillToMove('skill_icegolem_03');
const bodyMove = motion.skillToMove('skill_slime_01');
const tailMove = motion.skillToMove('skill_aquaron_02');
const hornMove = motion.skillToMove('skill_thornbeat_01');
const fistMove = motion.skillToMove('skill_icegolem_01');
const wingMove = motion.skillToMove('skill_false_dragon_beta_02');
const finMove = motion.skillToMove('skill_sylphin_01');
const legMove = motion.skillToMove('skill_astralepis_01');
const beakMove = motion.skillToMove('skill_volteck_01');
const clubMove = motion.skillToMove('skill_goblin_01');
const daggerMove = motion.skillToMove('skill_goblin_03');
const roarMove = motion.skillToMove('skill_false_dragon_gamma_02');
const roarSupportMove = motion.skillToMove('skill_freiwolf_03');
const genericMotionCases = [
  ['skill_grassbeat_01','blade'],
  ['skill_nightmare_01','strike'],
  ['skill_orca_stream_02','charge'],
  ['skill_tienhairon_03','wave'],
  ['skill_grassbeat_04','projectile'],
  ['skill_spaquinn_01','lightning'],
  ['skill_voltax_01','field'],
  ['skill_nightmare_02','mystic']
];

assert.equal(breathMove[8], 'skill_nemes_03', 'converted moves must retain their fixed skill ID');
assert.deepEqual(
  {...motion.skillBattleMotionForMove(breathMove), types:[...motion.skillBattleMotionForMove(breathMove).types]},
  {skillId:'skill_nemes_03', form:'breath', role:'damage', types:['star'], effect:null, animated:true},
  'damage breath tags must select a colored breath motion'
);
assert.equal(motion.skillBattleMotionForMove(beamMove).form, 'beam');
assert.equal(motion.skillBattleMotionForMove(beamMove).animated, true, 'damage beam tags must select a beam motion');
assert.equal(motion.skillBattleMotionForMove(healingBreathMove).role, 'support');
assert.equal(motion.skillBattleMotionForMove(healingBreathMove).animated, false, 'support breath skills must not launch an attack motion');
assert.equal(motion.skillBattleMotionForMove(swordMove).form, 'sword');
assert.equal(motion.skillBattleMotionForMove(swordMove).animated, true, 'damage sword tags must select a slash motion');
assert.equal(motion.skillBattleMotionForMove(swordSupportMove).animated, false, 'support sword skills must not launch a slash motion');
assert.equal(motion.skillBattleMotionForMove(clawMove).animated, true, 'damage claw tags must select a claw-rake motion');
assert.equal(motion.skillBattleMotionForMove(fangMove).animated, true, 'damage fang tags must select a bite motion');
assert.equal(motion.skillBattleMotionForMove(magicMove).animated, true, 'damage magic tags must select a magic projectile');
assert.equal(motion.skillBattleMotionForMove(magicSupportMove).animated, false, 'support magic skills must not launch an attack projectile');
assert.equal(motion.skillBattleMotionForMove(bladeMove).animated, true, 'damage blade tags must select a flying blade');
assert.equal(motion.skillBattleMotionForMove(chargeMove).animated, true, 'damage charge tags must select a charge motion');
assert.equal(motion.skillBattleMotionForMove(strikeMove).animated, true, 'damage strike tags must select a heavy-impact motion');
assert.equal(motion.skillBattleMotionForMove(bodyMove).animated, true, 'damage body tags must select a body-check motion');
for(const move of [tailMove,hornMove,fistMove,wingMove,finMove,legMove,beakMove,clubMove,daggerMove]){
  assert.equal(motion.skillBattleMotionForMove(move).animated, true, 'tagged anatomy and weapon attacks must select a dedicated motion');
}
assert.equal(motion.skillBattleMotionForMove(roarMove).animated, true, 'damage roar tags must select a shockwave motion');
assert.equal(motion.skillBattleMotionForMove(roarSupportMove).animated, false, 'support roar skills must not launch an attack shockwave');
for(const [skillId,form] of genericMotionCases){
  const descriptor=motion.skillBattleMotionForMove(motion.skillToMove(skillId));
  assert.equal(descriptor.form, form, `${skillId} must select its supplemented motion family`);
  assert.equal(descriptor.animated, true, `${skillId} must receive a supplemented attack motion`);
}

const originalBreath = motion.by('nemes').moves.find(move => move[0] === 'コスモブレス');
assert(originalBreath, 'the source monster must still expose its original breath move');
assert.equal(motion.skillBattleMotionForMove(originalBreath).skillId, 'skill_nemes_03', 'original monster moves must resolve through the existing move-to-skill bridge');
assert.equal(motion.skillBattleMotionForMove(originalBreath).animated, true);

const projectileCards = motion.cards
  .filter(card => card.tags.includes('role:damage') && (card.tags.includes('form:breath') || card.tags.includes('form:beam')));
const meleeCards = motion.cards
  .filter(card => card.tags.includes('role:damage') && ['sword','claw','fang'].some(form => card.tags.includes(`form:${form}`)));
const rangedCards = motion.cards
  .filter(card => card.tags.includes('role:damage') && ['magic','blade'].some(form => card.tags.includes(`form:${form}`)));
const impactCards = motion.cards
  .filter(card => card.tags.includes('role:damage') && ['charge','strike','body'].some(form => card.tags.includes(`form:${form}`)));
const anatomyCards = motion.cards
  .filter(card => card.tags.includes('role:damage') && ['tail','horn','fist','wing','fin','leg','beak','club','dagger'].some(form => card.tags.includes(`form:${form}`)));
const roarCards = motion.cards
  .filter(card => card.tags.includes('role:damage') && card.tags.includes('form:roar'));
const genericDamageCards = motion.cards
  .filter(card => card.tags.includes('role:damage') && card.tags.includes('form:generic'));
const damageCards = motion.cards.filter(card => card.tags.includes('role:damage'));
assert.equal(projectileCards.length, 8, 'the tagged catalog must include the expected breath and beam attack set');
assert.equal(meleeCards.length, 28, 'the tagged catalog must include the expected sword, claw, and fang attack set');
assert.equal(rangedCards.length, 40, 'the tagged catalog must include the expected magic and flying-blade attack set');
assert.equal(impactCards.length, 20, 'the tagged catalog must include the expected charge, strike, and body attack set');
assert.equal(anatomyCards.length, 21, 'the tagged catalog must include the expected anatomy and weapon attack set');
assert.equal(roarCards.length, 3, 'the tagged catalog must include the expected damage roar set');
assert.equal(genericDamageCards.length, 35, 'the catalog must retain the expected generic attack set without changing card taxonomy');
assert.equal(damageCards.length, 155, 'the catalog must retain the complete attack set');
const supplementedCounts=Object.create(null);
for(const card of genericDamageCards){
  const form=motion.skillBattleMotionForMove(motion.skillToMove(card.id)).form;
  supplementedCounts[form]=(supplementedCounts[form]||0)+1;
}
assert.deepEqual(
  {...supplementedCounts},
  {wave:5,blade:2,mystic:4,projectile:5,lightning:5,field:7,charge:6,strike:1},
  'generic attack motions must stay in their reviewed visual families'
);
for (const card of damageCards) {
  const descriptor = motion.skillBattleMotionForMove(motion.skillToMove(card.id));
  assert.equal(descriptor.animated, true, `${card.id} must receive an attack motion`);
  assert(card.types.every(type => descriptor.types.includes(type)), `${card.id} must preserve its attribute colors`);
}

const battleView = read('js/battle-view.js');
const battleRules = read('js/battle-rules.js');
const battleFlow = read('js/battle-flow.js');
const multiBattle = read('js/multi-battle.js');
const css = read('css/ui-redesign.css');

function classList() {
  const values = new Set();
  return {add:value=>values.add(value), remove:value=>values.delete(value), contains:value=>values.has(value)};
}
const sourceStyle={values:{},setProperty(name,value){this.values[name]=value;},removeProperty(name){delete this.values[name];}};
const source = {classList:classList(), style:sourceStyle, offsetWidth:120, getBoundingClientRect:()=>({left:20, top:200, width:120, height:140})};
const target = {classList:classList(), getBoundingClientRect:()=>({left:220, top:20, width:120, height:140})};
const stage = {
  appended:null,
  getBoundingClientRect:()=>({left:0, top:0, width:360, height:380}),
  appendChild(element){ this.appended=element; }
};
context.document = {
  getElementById:id => id === 'sourceVis' ? source : id === 'targetVis' ? target : null,
  querySelector:selector => selector === '#battle .battle-arena' ? stage : null,
  createElement(){
    return {
      className:'',
      removed:false,
      setAttribute(){},
      style:{setProperty(name,value){ this[name]=value; }},
      remove(){ this.removed=true; }
    };
  }
};
context.matchMedia = () => ({matches:false});
context.setTimeout = callback => { callback(); return 1; };
vm.runInContext(battleView, context, {filename:'js/battle-view.js'});
const rendered = await vm.runInContext("playBattleSkillMotion('sourceVis','targetVis',skillToMove('skill_nemes_03'))", context);
assert.equal(rendered, true, 'a tagged attack must render a projectile');
assert(stage.appended.className.includes('is-breath') && stage.appended.className.includes('is-star'), 'the projectile must use its form and element classes');
assert.equal(stage.appended.style['--skill-color'], '#ff8fe7', 'the projectile must use the element palette');
assert(Number.parseFloat(stage.appended.style.width) > 100, 'the projectile must span from attacker toward target');
assert.equal(stage.appended.removed, true, 'the completed projectile must be removed from the arena');
assert.equal(source.classList.contains('battle-skill-cast'), false, 'the cast pulse must be cleared after the projectile');

for (const [skillId,form] of [['skill_elna_beginner_01','sword'],['skill_freigal_02','claw'],['skill_freigal_01','fang']]) {
  const meleeRendered = await vm.runInContext(`playBattleSkillMotion('sourceVis','targetVis',skillToMove('${skillId}'))`, context);
  const meleeEffect = stage.appended;
  assert.equal(meleeRendered, true, `${form} must render a target-local melee effect`);
  assert(meleeEffect.className.includes('battle-melee-motion') && meleeEffect.className.includes(`is-${form}`), `${form} must use its dedicated visual class`);
  assert.equal(meleeEffect.style.left, '280px', `${form} must be centered on the target horizontally`);
  assert.equal(meleeEffect.style.top, '90px', `${form} must be centered on the target vertically`);
  assert.equal(meleeEffect.removed, true, `${form} must be removed after its animation`);
}

for (const [skillId,form] of [['skill_aquaron_01','magic'],['skill_tienhairon_02','blade']]) {
  const rangedRendered = await vm.runInContext(`playBattleSkillMotion('sourceVis','targetVis',skillToMove('${skillId}'))`, context);
  const rangedEffect = stage.appended;
  assert.equal(rangedRendered, true, `${form} must travel toward the target`);
  assert(rangedEffect.className.includes('battle-skill-motion') && rangedEffect.className.includes(`is-${form}`), `${form} must use its dedicated visual class`);
  assert(Number.parseFloat(rangedEffect.style.width) > 100, `${form} must span from attacker toward target`);
  assert.equal(rangedEffect.removed, true, `${form} must be removed after its animation`);
}

const roarRendered = await vm.runInContext("playBattleSkillMotion('sourceVis','targetVis',skillToMove('skill_false_dragon_gamma_02'))", context);
const roarEffect = stage.appended;
assert.equal(roarRendered, true, 'damage roar must travel toward the target');
assert(roarEffect.className.includes('battle-skill-motion') && roarEffect.className.includes('is-roar'), 'roar must use its dedicated shockwave class');
assert(Number.parseFloat(roarEffect.style.width) > 100, 'roar must span from attacker toward target');
assert.equal(roarEffect.removed, true, 'roar must be removed after its animation');

for (const [skillId,form] of [['skill_tienhairon_03','wave'],['skill_grassbeat_04','projectile']]) {
  const supplementedRendered = await vm.runInContext(`playBattleSkillMotion('sourceVis','targetVis',skillToMove('${skillId}'))`, context);
  const supplementedEffect = stage.appended;
  assert.equal(supplementedRendered, true, `${form} must travel toward the target`);
  assert(supplementedEffect.className.includes('battle-skill-motion') && supplementedEffect.className.includes(`is-${form}`), `${form} must use its traveling visual class`);
  assert(Number.parseFloat(supplementedEffect.style.width) > 100, `${form} must span from attacker toward target`);
  assert.equal(supplementedEffect.removed, true, `${form} must be removed after its animation`);
}

for (const [skillId,form] of [['skill_spaquinn_01','lightning'],['skill_voltax_01','field'],['skill_nightmare_02','mystic']]) {
  const arcaneRendered = await vm.runInContext(`playBattleSkillMotion('sourceVis','targetVis',skillToMove('${skillId}'))`, context);
  const arcaneEffect = stage.appended;
  assert.equal(arcaneRendered, true, `${form} must render on the target`);
  assert(arcaneEffect.className.includes('battle-arcane-motion') && arcaneEffect.className.includes(`is-${form}`), `${form} must use its target-local visual class`);
  assert.equal(arcaneEffect.style.left, '280px', `${form} must be centered on the target horizontally`);
  assert.equal(arcaneEffect.style.top, '90px', `${form} must be centered on the target vertically`);
  assert.equal(arcaneEffect.removed, true, `${form} must be removed after its animation`);
}

for (const [skillId,form] of [['skill_freigal_03','charge'],['skill_icegolem_03','strike'],['skill_slime_01','body']]) {
  const impactRendered = await vm.runInContext(`playBattleSkillMotion('sourceVis','targetVis',skillToMove('${skillId}'))`, context);
  const impactEffect = stage.appended;
  assert.equal(impactRendered, true, `${form} must render a target-local impact effect`);
  assert(impactEffect.className.includes('battle-impact-motion') && impactEffect.className.includes(`is-${form}`), `${form} must use its dedicated visual class`);
  assert.equal(impactEffect.style.left, '280px', `${form} must be centered on the target horizontally`);
  assert.equal(impactEffect.style.top, '90px', `${form} must be centered on the target vertically`);
  assert.equal(impactEffect.removed, true, `${form} must be removed after its animation`);
}
assert.equal(source.classList.contains('battle-charge-cast'), false, 'the charge lunge must be cleared after the motion');
assert.deepEqual(sourceStyle.values, {}, 'temporary charge direction variables must be cleared');

for (const [skillId,form,family] of [
  ['skill_aquaron_02','tail','sweep'],['skill_false_dragon_beta_02','wing','sweep'],['skill_sylphin_01','fin','sweep'],['skill_astralepis_01','leg','sweep'],
  ['skill_thornbeat_01','horn','pierce'],['skill_volteck_01','beak','pierce'],['skill_goblin_03','dagger','pierce'],
  ['skill_icegolem_01','fist','blunt'],['skill_goblin_01','club','blunt']
]) {
  const anatomyRendered = await vm.runInContext(`playBattleSkillMotion('sourceVis','targetVis',skillToMove('${skillId}'))`, context);
  const anatomyEffect = stage.appended;
  assert.equal(anatomyRendered, true, `${form} must render a target-local anatomy effect`);
  assert(anatomyEffect.className.includes('battle-anatomy-motion') && anatomyEffect.className.includes(`is-${form}`) && anatomyEffect.className.includes(`is-${family}`), `${form} must use its form and ${family} family classes`);
  assert.equal(anatomyEffect.style.left, '280px', `${form} must be centered on the target horizontally`);
  assert.equal(anatomyEffect.style.top, '90px', `${form} must be centered on the target vertically`);
  assert.equal(anatomyEffect.removed, true, `${form} must be removed after its animation`);
}

assert(battleView.includes('async function playBattleSkillMotion'), 'the battle view must expose the projectile renderer');
assert(battleView.includes('BATTLE_MOTION_DURATIONS'), 'each battle motion must use an explicit duration');
assert(battleRules.includes("await playBattleSkillMotion(sourceId,targetId,mv)"), 'single battles must await the tagged motion before impact');
assert(battleFlow.includes('await performAction(enemy,player,enemyAction.move,false)'), 'manual-switch retaliation must await its attack motion');
assert(multiBattle.includes('await playBattleSkillMotion(sourceId,impactTargetId,move)'), 'multi battles must target the selected combatant');
assert(css.includes('.battle-skill-motion.is-beam') && css.includes('@keyframes battleSkillBeam'), 'beam styling is missing');
assert(css.includes('.battle-skill-motion.is-breath') && css.includes('@keyframes battleSkillBreath'), 'breath styling is missing');
assert(css.includes('.battle-melee-motion.is-sword') && css.includes('@keyframes battleSwordCut'), 'sword styling is missing');
assert(css.includes('.battle-melee-motion.is-claw') && css.includes('@keyframes battleClawRake'), 'claw styling is missing');
assert(css.includes('.battle-melee-motion.is-fang') && css.includes('@keyframes battleFangTop'), 'fang styling is missing');
assert(css.includes('.battle-skill-motion.is-magic') && css.includes('@keyframes battleMagicOrb'), 'magic projectile styling is missing');
assert(css.includes('.battle-skill-motion.is-blade') && css.includes('@keyframes battleFlyingBlade'), 'flying-blade styling is missing');
assert(css.includes('.battle-impact-motion.is-charge') && css.includes('@keyframes battleChargeBurst'), 'charge styling is missing');
assert(css.includes('.battle-impact-motion.is-strike') && css.includes('@keyframes battleHeavyStrike'), 'strike styling is missing');
assert(css.includes('.battle-impact-motion.is-body') && css.includes('@keyframes battleBodyShock'), 'body-check styling is missing');
assert(css.includes('.battle-anatomy-motion.is-sweep') && css.includes('@keyframes battleSweepArc'), 'sweeping anatomy styling is missing');
assert(css.includes('.battle-anatomy-motion.is-pierce') && css.includes('@keyframes battlePierceThrust'), 'piercing anatomy styling is missing');
assert(css.includes('.battle-anatomy-motion.is-blunt') && css.includes('@keyframes battleBluntBurst'), 'blunt anatomy styling is missing');
assert(css.includes('.battle-skill-motion.is-roar') && css.includes('@keyframes battleRoarWave'), 'roar shockwave styling is missing');
assert(css.includes('.battle-skill-motion.is-wave') && css.includes('@keyframes battleWaveTravel'), 'wave styling is missing');
assert(css.includes('.battle-skill-motion.is-projectile') && css.includes('@keyframes battleElementProjectile'), 'element projectile styling is missing');
assert(css.includes('.battle-arcane-motion.is-lightning') && css.includes('@keyframes battleLightningStrike'), 'lightning styling is missing');
assert(css.includes('.battle-arcane-motion.is-field') && css.includes('@keyframes battleFieldBurst'), 'field attack styling is missing');
assert(css.includes('.battle-arcane-motion.is-mystic') && css.includes('@keyframes battleMysticSpiral'), 'mystic styling is missing');
assert(css.includes('.battle-skill-motion,.battle-melee-motion,.battle-impact-motion,.battle-anatomy-motion,.battle-arcane-motion{display:none}'), 'reduced-motion users must be able to skip attack motion');

console.log(`Battle skill motion validation passed (all ${damageCards.length} attacks: ${projectileCards.length} breath/beam, ${meleeCards.length} melee, ${rangedCards.length} magic/blade, ${impactCards.length} charge/strike/body, ${anatomyCards.length} anatomy/weapon, ${roarCards.length} roar, and ${genericDamageCards.length} supplemented generic attacks; normal and multi-battle wiring, reduced-motion fallback).`);
