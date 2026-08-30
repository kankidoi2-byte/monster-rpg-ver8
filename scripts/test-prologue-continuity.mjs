import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const battleFlow=read('js/battle-flow.js');
const index=read('index.html');
const packageJson=JSON.parse(read('package.json'));

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
assert.ok(flowStart>=0&&flowEnd>flowStart,'main prologue flow must exist');
const main=tutorial.slice(flowStart,flowEnd);

const waits=[...main.matchAll(/waitForEvent:'([^']+)'/g)].map(match=>match[1]);
assert.deepEqual([...new Set(waits)].sort(),['alchemy_result','battle_outcome'],
  'only real asynchronous gameplay events may dismiss the guide while waiting');
assert.equal(waits.filter(event=>event==='battle_outcome').length,2,
  'both tutorial battles must wait for a real result');
assert.equal(waits.filter(event=>event==='alchemy_result').length,1,
  'the alchemy animation must wait for its real result');

assert.match(main,/id:'request_reward_received'[^\n]+persistAs:'stella_intro'[^\n]+nextStepId:'stella_intro'/,
  'reward receipt must continue directly instead of waiting for a nonexistent event');
assert.match(main,/id:'elna_contract_body'[^\n]+persistAs:'home_party'[^\n]+nextStepId:'home_party'/,
  'Elna contract completion must continue directly into the home guide');
assert.ok(!/waitForEvent:'(?:stella_intro|home_party)'/.test(main),
  'checkpoint names must never be treated as external events');

assert.ok(tutorial.includes('function resumeTutorialMainFlowAfterEvent(stepId,replay=false)'),
  'external completions need one shared resume path');
for(const target of ['lumina_alchemy_result','stella_mock_victory','stella_mock_retry','elna_rescue_complete','elna_rescue_retry','battle_retry','contract_success']){
  assert.ok(tutorial.includes(`resumeTutorialMainFlowAfterEvent(${target.includes('?')?'':`'${target}'`}`)||tutorial.includes(`resumeTutorialMainFlowAfterEvent(cleared?`),
    `external completion must resume automatically: ${target}`);
}
assert.match(tutorial,/setTimeout\(resume,0\)/,
  'the guide must reopen after the external renderer finishes its current DOM update');

assert.match(battleFlow,/const tutorialOutcomeHandled=[^\n]+handleTutorialBattleOutcome\('victory'/,
  'battle victory must report to the tutorial before post-battle UI');
assert.ok(battleFlow.includes('if(!tutorialOutcomeHandled)setTimeout(processNextEvolution, 300);'),
  'automatic evolution must not replace the guide resumed after a tutorial battle');

assert.ok(index.includes('prologue-continuity-1'),'changed runtime files must bypass stale mobile caches');
assert.equal(packageJson.scripts['check:prologue-continuity'],'node scripts/test-prologue-continuity.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-continuity'));

console.log('Prologue continuity validation passed (all dismissing boundaries are event-backed, direct checkpoints stay visible, and battle evolution cannot replace resumed guidance).');
