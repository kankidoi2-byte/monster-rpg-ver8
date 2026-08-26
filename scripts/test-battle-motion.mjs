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
const genericMove = motion.skillToMove('skill_slime_01');

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
assert.equal(motion.skillBattleMotionForMove(genericMove).animated, false, 'unimplemented forms must retain the existing impact-only presentation');

const originalBreath = motion.by('nemes').moves.find(move => move[0] === 'コスモブレス');
assert(originalBreath, 'the source monster must still expose its original breath move');
assert.equal(motion.skillBattleMotionForMove(originalBreath).skillId, 'skill_nemes_03', 'original monster moves must resolve through the existing move-to-skill bridge');
assert.equal(motion.skillBattleMotionForMove(originalBreath).animated, true);

const projectileCards = motion.cards
  .filter(card => card.tags.includes('role:damage') && (card.tags.includes('form:breath') || card.tags.includes('form:beam')));
const meleeCards = motion.cards
  .filter(card => card.tags.includes('role:damage') && ['sword','claw','fang'].some(form => card.tags.includes(`form:${form}`)));
assert.equal(projectileCards.length, 8, 'the tagged catalog must include the expected breath and beam attack set');
assert.equal(meleeCards.length, 28, 'the tagged catalog must include the expected sword, claw, and fang attack set');
for (const card of [...projectileCards,...meleeCards]) {
  const descriptor = motion.skillBattleMotionForMove(motion.skillToMove(card.id));
  assert.equal(descriptor.animated, true, `${card.id} must receive its tagged attack motion`);
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
const source = {classList:classList(), offsetWidth:120, getBoundingClientRect:()=>({left:20, top:200, width:120, height:140})};
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
assert(css.includes('.battle-skill-motion,.battle-melee-motion{display:none}'), 'reduced-motion users must be able to skip attack motion');

console.log(`Battle skill motion validation passed (${projectileCards.length} projectile and ${meleeCards.length} melee attacks, normal and multi-battle wiring, reduced-motion fallback).`);
