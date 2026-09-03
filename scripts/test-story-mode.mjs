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
assert.ok(tutorial.includes('function checkpointTutorialChapter')&&tutorial.includes("show('storyMode')"),'episode endings must return to story mode');
assert.ok(save.includes('chapterGate:false')&&save.includes('chapterGate:source.chapterGate===true'),'old saves need a safe chapter-gate default');
assert.ok(css.includes('.story-episode-card')&&css.includes('@media(max-width:480px)'),'mobile story layout is missing');

console.log('Story mode validation passed (home entry, six episodes, checkpoints, old-save default, and mobile layout).');
