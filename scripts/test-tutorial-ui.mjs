import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const css=read('css/tutorial.css');
const tutorial=read('js/tutorial.js');
const ui=read('js/ui.js');
const init=read('js/init.js');

[
  'tutorialOverlay','tutorialSpotlight','tutorialArrow','tutorialBubble','tutorialProgressText',
  'tutorialProgressBar','tutorialTitle','tutorialText','tutorialBackButton','tutorialSkipButton','tutorialNextButton'
].forEach(id=>assert.ok(index.includes(`id="${id}"`),`missing tutorial UI contract: #${id}`));
assert.ok(index.includes('id="tutorialMenuButton"')&&index.includes('onclick="openTutorialFromMenu()"'),'the menu must expose tutorial replay');
assert.ok(index.includes('css/tutorial.css?v=tutorial-phase3b-1'),'the tutorial stylesheet must be cache-versioned');
assert.ok(index.indexOf('js/ui.js')<index.indexOf('js/tutorial.js')&&index.indexOf('js/tutorial.js')<index.indexOf('js/init.js'),'the tutorial engine must load after shared UI and before initialization');

assert.match(css,/\.tutorial-overlay\{[^}]*pointer-events:none/,'the overlay must not block the highlighted game control');
assert.match(css,/\.tutorial-bubble\{[^}]*pointer-events:auto/,'the tutorial controls must remain interactive');
assert.match(css,/\.tutorial-shade\{[^}]*pointer-events:none/,'spotlight shades must not intercept target operations');
assert.match(css,/@media\(max-width:480px\)/,'portrait-phone tutorial layout is missing');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'reduced-motion support is missing');

[
  'function registerTutorialFlow','function startTutorialFlow','function tutorialPrevious','function tutorialNext',
  'function pauseTutorial','function requestTutorialSkip','function openTutorialFromMenu',
  'function resumeTutorialIfNeeded','function handleTutorialScreenChange'
].forEach(contract=>assert.ok(tutorial.includes(contract),`missing tutorial engine contract: ${contract}`));
assert.ok(tutorial.includes("confirm('必須チュートリアルをスキップしますか？"),'required tutorial skip must ask for confirmation');
assert.ok(tutorial.includes('beginTutorialReplay(')&&tutorial.includes('setTutorialStep(')&&tutorial.includes("typeof saveGame==='function'"),'tutorial progress must use the shared persisted state');
assert.ok(tutorial.includes("event.key==='Escape'")&&tutorial.includes("event.key==='ArrowLeft'")&&tutorial.includes("event.key==='ArrowRight'"),'keyboard tutorial controls are missing');
assert.ok(tutorial.includes('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID'),'the required onboarding flow must use the shared tutorial engine');
assert.ok(ui.includes("typeof handleTutorialScreenChange === 'function'"),'screen changes must notify the tutorial engine');
assert.ok(init.includes('setTimeout(resumeTutorialIfNeeded,0)'),'reload/title entry must resume an interrupted tutorial');

const placementStart=tutorial.indexOf('function calculateTutorialPlacement');
const placementEnd=tutorial.indexOf('function setTutorialShadeRect',placementStart);
assert.ok(placementStart>=0&&placementEnd>placementStart,'tutorial placement helper is missing');
const context=vm.createContext({});
vm.runInContext(tutorial.slice(placementStart,placementEnd),context);
const place=(target,bubble,viewport)=>{
  context.target=target;context.bubble=bubble;context.viewport=viewport;
  return vm.runInContext('calculateTutorialPlacement(target,bubble,viewport)',context);
};
const viewport={width:360,height:640};
const upperTarget={top:90,bottom:190,left:30,right:330,width:300,height:100};
const below=place(upperTarget,{width:340,height:220},viewport);
assert.equal(below.side,'below');
assert.ok(below.top>=upperTarget.bottom,'portrait bubble must not cover a target when placed below');
assert.ok(below.left>=0&&below.left+340<=viewport.width,'portrait bubble must remain inside the viewport');
const lowerTarget={top:500,bottom:580,left:20,right:340,width:320,height:80};
const above=place(lowerTarget,{width:340,height:220},viewport);
assert.equal(above.side,'above');
assert.ok(above.top+220<=lowerTarget.top,'portrait bubble must not cover a target when placed above');
const centered=place(null,{width:340,height:220},viewport);
assert.equal(centered.side,'center');
assert.ok(centered.top>=0&&centered.left>=0,'targetless guidance must remain visible');

console.log('Tutorial UI validation passed (spotlight, bubble, progress, navigation, skip confirmation, resume/replay hooks, accessibility, and portrait placement).');
