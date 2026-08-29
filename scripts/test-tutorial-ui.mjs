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
  'tutorialOverlay','tutorialStoryBackdrop','tutorialCharacterLayer','tutorialCharacterPortrait','tutorialSpotlight','tutorialArrow','tutorialBubble','tutorialProgressText',
  'tutorialProgressBar','tutorialTitle','tutorialText','tutorialNameForm','tutorialPlayerNameInput','tutorialBackButton','tutorialSkipButton','tutorialNextButton'
].forEach(id=>assert.ok(index.includes(`id="${id}"`),`missing tutorial UI contract: #${id}`));
assert.ok(index.includes('id="tutorialMenuButton"')&&index.includes('onclick="openTutorialFromMenu()"'),'the menu must expose tutorial replay');
assert.ok(index.includes('css/tutorial.css?v=prologue-story-scenes-1'),'the tutorial stylesheet must be cache-versioned');
assert.ok(index.indexOf('js/ui.js')<index.indexOf('js/tutorial.js')&&index.indexOf('js/tutorial.js')<index.indexOf('js/init.js'),'the tutorial engine must load after shared UI and before initialization');

assert.match(css,/\.tutorial-overlay\{[^}]*pointer-events:none/,'the overlay must not block the highlighted game control');
assert.match(css,/\.tutorial-bubble\{[^}]*pointer-events:auto/,'the tutorial controls must remain interactive');
assert.match(css,/\.tutorial-bubble\{[^}]*overflow-y:auto/,'long mobile guidance must scroll vertically');
assert.match(css,/\.tutorial-bubble\{[^}]*touch-action:pan-y/,'Android must allow a vertical swipe inside the guidance bubble');
assert.match(css,/\.tutorial-bubble\{[^}]*-webkit-overflow-scrolling:touch/,'mobile guidance must retain touch momentum scrolling');
assert.match(css,/\.tutorial-actions\.is-target-action\{[^}]*grid-template-columns:1fr 1fr/,'target-action guidance must use the space left by the hidden Next button');
assert.match(css,/\.tutorial-next\[hidden\]\{[^}]*display:none/,'the unusable Next button must be absent during target actions');
assert.match(css,/\.tutorial-shade\{[^}]*pointer-events:none/,'spotlight shades must not intercept target operations');
assert.match(css,/@media\(max-width:480px\)/,'portrait-phone tutorial layout is missing');
assert.match(css,/\.tutorial-story-backdrop\{/,'story background layer is missing');
assert.match(css,/\.tutorial-character-layer\{/,'transparent portrait layer is missing');
assert.match(css,/@media\(max-width:719px\)/,'story dialogue must have a phone-portrait layout');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'reduced-motion support is missing');

[
  'function registerTutorialFlow','function startTutorialFlow','function tutorialPrevious','function tutorialNext',
  'function pauseTutorial','function requestTutorialSkip','function openTutorialFromMenu',
  'function resumeTutorialIfNeeded','function handleTutorialScreenChange','function renderTutorialStoryStep','function confirmTutorialPlayerName'
].forEach(contract=>assert.ok(tutorial.includes(contract),`missing tutorial engine contract: ${contract}`));
assert.ok(tutorial.includes("confirm('必須チュートリアルをスキップしますか？"),'required tutorial skip must ask for confirmation');
assert.ok(tutorial.includes('beginTutorialReplay(')&&tutorial.includes('setTutorialStep(')&&tutorial.includes("typeof saveGame==='function'"),'tutorial progress must use the shared persisted state');
assert.ok(tutorial.includes("event.key==='Escape'")&&tutorial.includes("event.key==='ArrowLeft'")&&tutorial.includes("event.key==='ArrowRight'"),'keyboard tutorial controls are missing');
assert.ok(tutorial.includes('function handleTutorialViewportScroll')&&tutorial.includes('bubble.contains(event.target)')&&tutorial.includes("window.addEventListener('scroll',handleTutorialViewportScroll,true)"),'scrolling the guidance bubble must not trigger viewport repositioning');
assert.ok(tutorial.includes('bubble.scrollTop=0'),'each new tutorial step must begin at the top of its own guidance');
assert.ok(tutorial.includes('function tutorialStepRequiresAction(step)')&&tutorial.includes('next.hidden=requiresAction')&&tutorial.includes("actions?.classList.toggle('is-target-action',requiresAction)"),'real-screen action steps must hide Next and expose only the highlighted operation');
assert.ok(tutorial.includes('if(tutorialStepRequiresAction(step)&&actionCompleted!==true)return'),'Next and the Right Arrow must not bypass a required real-screen action');
assert.ok(tutorial.includes('queueTutorialActionAdvance'),'the guide must advance after the highlighted target operation succeeds');
[
  'first_hunt','tutorial_hunt_request','battle_actor_open','battle_actor_select','battle_target','battle_attack_open','battle_normal_attack','battle_skill',
  'battle_choose_skill','first_contract','contract_confirm','growth_open','party_edit_open','home_finish'
].forEach(id=>assert.match(tutorial,new RegExp(`id:'${id}'[^\\n]+(?:advanceOnTarget|externalAdvance):true`),`${id} must be classified as a real-screen action`));
assert.match(tutorial,/id:'gnosis_name'[^\n]+mode:'external_action'/,'player-name entry must be classified as a blocking external action');
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

console.log('Tutorial UI validation passed (story layers, transparent portrait, spotlight, bubble, navigation, resume/replay hooks, accessibility, and portrait placement).');
