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
assert.equal(motion.skillBattleMotionForMove(genericMove).animated, false, 'unimplemented forms must retain the existing impact-only presentation');

const originalBreath = motion.by('nemes').moves.find(move => move[0] === 'コスモブレス');
assert(originalBreath, 'the source monster must still expose its original breath move');
assert.equal(motion.skillBattleMotionForMove(originalBreath).skillId, 'skill_nemes_03', 'original monster moves must resolve through the existing move-to-skill bridge');
assert.equal(motion.skillBattleMotionForMove(originalBreath).animated, true);

const damageForms = motion.cards
  .filter(card => card.tags.includes('role:damage') && (card.tags.includes('form:breath') || card.tags.includes('form:beam')));
assert(damageForms.length >= 8, 'the tagged catalog must include the expected breath and beam attack set');
for (const card of damageForms) {
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

assert(battleView.includes('async function playBattleSkillMotion'), 'the battle view must expose the projectile renderer');
assert(battleView.includes("motion.form==='breath'?430:350"), 'breath and beam motion timing must remain explicit');
assert(battleRules.includes("await playBattleSkillMotion(sourceId,targetId,mv)"), 'single battles must await the tagged motion before impact');
assert(battleFlow.includes('await performAction(enemy,player,enemyAction.move,false)'), 'manual-switch retaliation must await its attack motion');
assert(multiBattle.includes('await playBattleSkillMotion(sourceId,impactTargetId,move)'), 'multi battles must target the selected combatant');
assert(css.includes('.battle-skill-motion.is-beam') && css.includes('@keyframes battleSkillBeam'), 'beam styling is missing');
assert(css.includes('.battle-skill-motion.is-breath') && css.includes('@keyframes battleSkillBreath'), 'breath styling is missing');
assert(css.includes('.battle-skill-motion{display:none}'), 'reduced-motion users must be able to skip projectile motion');

console.log(`Battle skill motion validation passed (${damageForms.length} tagged breath/beam attacks, normal and multi-battle wiring, reduced-motion fallback).`);
