import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const story=read('js/story.js');
const tutorial=read('js/tutorial.js');
const save=read('js/save.js');
const ui=read('js/ui.js');
const css=read('css/ui-redesign.css');

assert.ok(index.includes('id="storyMode"')&&index.includes('id="storyEpisodeList"'),'story screen is missing');
assert.match(index,/id="homeAdventureButton"[^>]+onclick="openHomeAdventure\(\)"/,'home story entrance is not wired');
assert.ok(index.includes('js/story.js?v=prologue-story-mode-1'),'story controller is not loaded');
assert.ok(story.includes('PROLOGUE_STORY_EPISODES')&&((story.match(/startStepId:/g)||[]).length===6),'the prologue must be split into six episodes');
assert.ok(story.includes('function continuePrologueStory')&&story.includes('function renderStoryMode'),'story progress controls are missing');
assert.ok(story.includes("state==='locked'")&&story.includes("state==='current'")&&story.includes("state==='completed'"),'episode states are incomplete');
assert.ok(!story.includes('replaying=true')&&!story.includes('beginTutorialReplay'),'retired tutorial replay must not return');
assert.ok(ui.includes("tutorialCurrentStepId()==='home_requests'")&&ui.includes('openBattleHub()'),'the guided request step must retain its battle route');
assert.equal((tutorial.match(/chapterBreak:true/g)||[]).length,6,'five episode breaks plus the safe completed-alchemy branch are required');
assert.ok(tutorial.includes('chapterBreak:step.chapterBreak===true'),'episode break flags must survive STEP normalization');
assert.ok(tutorial.includes('function checkpointTutorialChapter')&&tutorial.includes("show('storyMode')"),'episode endings must return to story mode');
assert.ok(save.includes('chapterGate:false')&&save.includes('chapterGate:source.chapterGate===true'),'old saves need a safe chapter-gate default');
assert.ok(css.includes('.story-episode-card')&&css.includes('@media(max-width:480px)'),'mobile story layout is missing');

console.log('Story mode validation passed (home entry, six episodes, checkpoints, old-save default, and mobile layout).');

// Exercise switching and progress rendering without mutating a player's save.
const { default: vm } = await import('node:vm');
const elements = new Map();
for (const id of [...index.matchAll(/id="([^"]+)"/g)].map(match=>match[1])) {
  elements.set(id, {textContent:'',innerHTML:'',hidden:false,attributes:{},
    setAttribute(name,value){this.attributes[name]=value;},classList:{toggle(){}}});
}
let tutorialState={status:'not_started',stepId:'intro_gnosis'};
let checkpoint='intro_gnosis';
const context=vm.createContext({
  document:{getElementById:id=>elements.get(id)},
  currentTutorialState:()=>tutorialState,
  tutorialCurrentStepId:()=>checkpoint
});
vm.runInContext(story,context);
for(const status of ['not_started','completed','skipped']){
  tutorialState={status,stepId:'intro_gnosis'};
  const before=JSON.stringify(tutorialState);
  vm.runInContext('renderStoryMode();renderHomeStoryCard();',context);
  assert.equal(elements.get('homeAdventureTitle').textContent,'ストーリー');
  assert.equal(elements.get('storyContinueCard').hidden,status!=='not_started');
  assert.equal((elements.get('storyEpisodeList').innerHTML.match(/<article /g)||[]).length,6);
  for(const selected of ['character','side','main']){
    vm.runInContext(`selectStoryCategory('${selected}')`,context);
    for(const category of ['main','character','side']){
      assert.equal(elements.get('storyPanel-'+category).hidden,category!==selected);
      assert.equal(elements.get('storyCategory-'+category).attributes['aria-pressed'],String(category===selected));
    }
  }
  assert.equal(JSON.stringify(tutorialState),before,'browsing categories must not write progress');
}
checkpoint='home_requests';
vm.runInContext('renderHomeStoryCard()',context);
assert.equal(elements.get('homeAdventureTitle').textContent,'救援依頼を報告');
console.log('Story hub behavior passed (three categories, untouched progress, terminal states, six episodes, request guidance).');
