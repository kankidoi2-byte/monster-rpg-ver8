import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const tutorial=read('js/tutorial.js');
const skills=read('js/skills.js');
const battleView=read('js/battle-view.js');
const battleRules=read('js/battle-rules.js');
const packageJson=JSON.parse(read('package.json'));

const order=[
  'battle_enemy','battle_actor_open','battle_actor_select','battle_target','battle_attack_open',
  'battle_normal_attack','battle_skill','battle_skill_cost','battle_choose_skill','battle_free'
];
let previous=-1;
for(const id of order){
  const at=tutorial.indexOf(`id:'${id}'`);
  assert.ok(at>previous,`missing or out-of-order first-battle step: ${id}`);
  previous=at;
}
for(const id of ['battle_target']){
  assert.match(tutorial,new RegExp(`id:'${id}'[^\\n]+advanceOnTarget:true`),`${id} must wait for its highlighted target click`);
}
for(const id of ['battle_actor_open','battle_actor_select','battle_attack_open','battle_normal_attack','battle_skill','battle_choose_skill']){
  assert.match(tutorial,new RegExp(`id:'${id}'[^\\n]+externalAdvance:true`),`${id} must wait for a successful battle operation`);
}
assert.match(tutorial,/id:'battle_skill_cost'[^\n]+target:'\[data-tutorial-skill-cost\]'/,'skill cost must have its own spotlight checkpoint');
assert.ok(order.every(id=>tutorial.match(new RegExp(`id:'${id}'[^\\n]+persistAs:'elna_rescue_start'`))), 'rescue battle basics must resume at the rescue checkpoint');
assert.ok(tutorial.includes("function isTutorialRescueBattleActive()")&&tutorial.includes("action==='actor_picker_opened'?'battle_actor_open'")&&tutorial.includes("action==='skill_panel_opened'")&&tutorial.includes("actor_selected:'battle_actor_select'")&&tutorial.includes("normal_attack:'battle_normal_attack'")&&tutorial.includes("skill:'battle_choose_skill'"),'real battle operations must map to their expected blocking step');
assert.ok(tutorial.includes("queueTutorialActionAdvance"),'successful battle operations must advance after their DOM event completes');

assert.ok(battleView.includes('data-tutorial-actor-select'),'switch candidates must expose a stable tutorial target');
assert.ok(battleView.includes("handleTutorialBattleAction('actor_picker_opened')")&&battleView.includes("handleTutorialBattleAction('skill_panel_opened')"),'actor and skill panels must release their waits only after opening');
assert.ok(battleView.includes("const switched=performManualPartySwitch(nextIndex)")&&battleView.includes("if(switched&&typeof handleTutorialBattleAction==='function')handleTutorialBattleAction('actor_selected')"),'actor selection must advance only after a successful real switch');

assert.ok(skills.includes("isTutorialRescueBattleActive()")&&skills.includes('data-tutorial-normal-attack')&&skills.includes('onclick="turn(-1)"'),'the COST 0 normal attack must exist only during the rescue tutorial');
assert.ok(skills.includes('data-tutorial-skill')&&skills.includes('data-tutorial-skill-cost')&&skills.includes('Number.isFinite(mv[5])'),'real equipped skills must expose their real equipment cost');
assert.ok(battleRules.includes("const tutorialAction=i===-1?'normal_attack':'skill'"),'normal attack and equipped skill events must be distinguished');
assert.ok(battleRules.includes("i===-1?['通常攻撃',24,'normal',null,null,0]"),'the tutorial normal attack must execute through the real turn engine at COST 0');
assert.ok(battleRules.indexOf("busy = true;\n  startBattleTurn();")<battleRules.indexOf("handleTutorialBattleAction(tutorialAction,"),'failed or double-tapped actions must not release an operation wait');

assert.ok(index.includes('js/tutorial.js?v=prologue-rescue-stability-1'),'tutorial cache key must refresh');
assert.ok(index.includes('js/skills.js?v=evolution-skill-cards-1-prologue-battle-basics-1'),'skill UI cache key must refresh');
assert.ok(index.includes('prologue-battle-basics-1'),'battle browser scripts must refresh');
assert.equal(packageJson.scripts['check:prologue-battle-basics'],'node scripts/test-prologue-battle-basics.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-battle-basics'));

console.log('Prologue first-battle basics validation passed (actor, target, COST 0 normal attack, equipped skill cost, real action waits, and rescue resume checkpoint).');
