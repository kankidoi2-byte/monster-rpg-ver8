import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const index=read('index.html');
const packageJson=JSON.parse(read('package.json'));

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
assert.ok(flowStart>=0&&flowEnd>flowStart,'the prologue main flow is missing');
const main=tutorial.slice(flowStart,flowEnd);
const ids=[...main.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);
assert.equal(ids.length,86,'the reduced prologue must stay at 86 essential steps');
assert.equal(new Set(ids).size,ids.length,'the reduced prologue must not contain duplicate step IDs');
assert.equal(ids.indexOf('battle_enemy'),ids.indexOf('elna_rescue_start')+1,'rescue start must advance from 13/86 to the adjacent battle step, not jump to 60/86');
assert.equal(ids.indexOf('home_party'),ids.indexOf('elna_contract_body')+1,'the contract must continue to the adjacent home guidance');
assert.equal(ids.indexOf('expedition_home_open'),ids.indexOf('expedition_intro')+1,'the expedition introduction must continue to its adjacent operation');

const removed=[
  'party_review','dex_elna_detail','dex_aquaron','growth_elna','growth_skill_current','growth_skill_cards',
  'request_board','request_reward_preview','stella_card_offer','stella_card_received','stella_skill_current',
  'stella_skill_card_detail','stella_type_special','stella_mock_actor','lumina_recipe_offer','lumina_recipe',
  'lumina_coin','lumina_rate','battle_ally','battle_hp','battle_type','battle_turn','battle_skill_cost',
  'first_hunt','tutorial_hunt_request','battle_retry','victory_exp','victory_coin','victory_material','victory_rank',
  'first_contract','contract_confirm','contract_success','contract_card','contract_type','contract_skills',
  'contract_list','contract_future','growth_open','growth_overview','party_edit_open','party_edit_contract',
  'home_finish','tutorial_complete'
];
for(const id of removed){
  assert.ok(!ids.includes(id),`obsolete or duplicate step must stay out of the main flow: ${id}`);
  assert.match(tutorial,new RegExp(`(?:^|[,\\n]\\s*)${id}:'[^']+'`),`old saves need a redirect for removed step: ${id}`);
}
assert.ok(tutorial.includes('const resolvedId=TUTORIAL_REMOVED_STEP_REDIRECTS[stepId]||stepId'),'removed-step redirects must be applied before resuming');

const requiredActions=[
  'gnosis_name','elna_rescue_start','battle_actor_open','battle_actor_select','battle_target','battle_normal_attack',
  'battle_choose_skill','battle_free','elna_contract_execute','party_save','home_dex_open','menu_dex_open',
  'dex_elna_open','growth_skill_open','request_accept','request_reward_claim','stella_card_receive',
  'stella_skill_open','stella_skill_unequip','stella_skill_equip','stella_mock_advantage','lumina_start',
  'lumina_execute','expedition_member','expedition_dispatch','prologue_complete'
];
for(const id of requiredActions)assert.ok(ids.includes(id),`essential operation is missing after reduction: ${id}`);

assert.match(main,/id:'battle_enemy'[^\n]+敵・味方・HP[^\n]+1ターン/,'battle overview must retain the merged enemy, ally, HP, and turn explanation');
assert.match(main,/id:'battle_choose_skill'[^\n]+COST[^\n]+実際に使って/,'skill selection must retain the cost explanation and real operation');
assert.match(main,/id:'stella_skill_equip'[^\n]+無属性・威力34・COST 2[^\n]+剣士タグ/,'Stella equip must retain the card details');
assert.match(main,/id:'lumina_materials'[^\n]+4種類[^\n]+250コイン[^\n]+100％[^\n]+仲間は消費しない/,'alchemy materials must retain all recipe conditions');

const idSet=new Set(ids);
for(const [,key,target] of main.matchAll(/\b(nextStepId|replayNextStepId|continueAt):'([^']+)'/g)){
  assert.ok(idSet.has(target),`${key} points to a missing prologue step: ${target}`);
}

assert.ok(tutorial.includes('tutorialMonsterInLineage'),'evolved Freigal/Aquaron must remain valid tutorial actors');
assert.match(main,/id:'home_dex_open'[^\n]+target:'\[data-nav="more"\]'/,'the mobile dex route must open Menu first');
assert.match(main,/id:'menu_dex_open'[^\n]+target:'#homeDexButton'/,'the visible dex button must remain the spotlight target');
assert.match(main,/id:'request_reward_claim'[^\n]+externalAdvance:true/,'reward receipt must remain an event-backed operation');
assert.match(main,/id:'expedition_member'[^\n]+data-tutorial-expedition-member/,'expedition must retain an unambiguous member target');
assert.match(main,/id:'prologue_complete'[^\n]+speaker:'グノーシス'[^\n]+portrait:/,'the finale must retain Gnosis instead of an empty background');
assert.ok(tutorial.includes("classList.toggle('is-ui-guide-step',Boolean(step?.target))"),'target steps must keep portraits away from controls');

assert.ok(index.includes('prologue-mobile-clarity-1-prologue-step-reduction-1-prologue-progress-order-1"></script>'),'the browser must fetch the chronologically ordered tutorial logic');
assert.equal(packageJson.scripts['check:prologue-step-reduction'],'node scripts/test-prologue-step-reduction.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-step-reduction'));

console.log('Prologue step reduction validation passed (130 -> 86, old-save redirects, essential operations, merged explanations, and prior mobile fixes).');
