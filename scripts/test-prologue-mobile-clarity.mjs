import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const party=read('js/party.js');
const css=read('css/tutorial.css');
const index=read('index.html');
const packageJson=JSON.parse(read('package.json'));

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
const main=tutorial.slice(flowStart,flowEnd);

assert.match(main,/id:'growth_skill_open'[^\n]+target:'\[data-monster-id="elna_beginner"\] \[data-tutorial-skill-edit\]'[^\n]+advanceOnTarget:true/,'the existing saved STEP must continue to target the real skill-edit button');
assert.ok(party.includes('data-tutorial-skill-edit onclick="openSkillEdit('),'the highlighted element must execute the real skill editor action');
assert.ok(tutorial.includes("document.body.classList.toggle('tutorial-growth-skill-open',step?.id==='growth_skill_open')"),'only the skill-open STEP may promote the action above the mobile nav');
assert.match(css,/body\.tutorial-growth-skill-open \[data-monster-id="elna_beginner"\]\{overflow:visible\}/,'the roster card must not clip the promoted action');
assert.match(css,/body\.tutorial-growth-skill-open \[data-monster-id="elna_beginner"\] \[data-tutorial-skill-edit\]\{[^}]*position:fixed;[^}]*z-index:81;[^}]*bottom:calc\(var\(--ui-nav-height\) \+ 14px\);[^}]*width:min\(300px,calc\(100vw - 32px\)\)/,'the real action must remain visible and tappable above the fixed mobile nav');

assert.match(main,/id:'prologue_complete'(?![^\n]+target:)[^\n]+speaker:'グノーシス'[^\n]+portrait:'images\/tutorial\/characters\/gnosis-dialogue-transparent-final\.png'[^\n]+scene:'world_descent'[^\n]+nextLabel:'自由行動へ'/,'the final scene must render Gnosis as story dialogue instead of a target-only background');
assert.ok(css.includes('.tutorial-overlay.is-ui-guide-step .tutorial-character-layer{display:none}'),'ordinary UI-guide steps must still protect their controls from portrait overlap');
assert.ok(index.includes('tutorial.css?v=')&&index.includes('prologue-ui-guide-portrait-1-prologue-mobile-clarity-1'),'the mobile browser must fetch the new tutorial CSS');
assert.ok(index.includes('prologue-continuity-1-prologue-mobile-clarity-1-prologue-step-reduction-1"></script>'),'the mobile browser must fetch the new tutorial logic');
assert.equal(packageJson.scripts['check:prologue-mobile-clarity'],'node scripts/test-prologue-mobile-clarity.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-mobile-clarity'));

console.log('Prologue mobile clarity validation passed (real skill-edit target above nav and Gnosis visible in the final story scene).');
