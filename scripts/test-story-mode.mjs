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
    setAttribute(name,value){this.attributes[name]=value;},classList:{toggle(){},remove(){}}});
}
let tutorialState={status:'not_started',stepId:'intro_gnosis'};
let checkpoint='intro_gnosis';
const context=vm.createContext({
  document:{getElementById:id=>elements.get(id)},
  currentTutorialState:()=>tutorialState,
  save:{progress:{get tutorial(){return tutorialState;}}},
  normalizeTutorialSave:value=>({...value}),
  tutorialCurrentStepId:()=>checkpoint
});
vm.runInContext(story,context);
for(const status of ['not_started','in_progress','completed','skipped']){
  tutorialState={status,stepId:'intro_gnosis'};
  const before=JSON.stringify(tutorialState);
  vm.runInContext('renderStoryMode();renderHomeStoryCard();',context);
  assert.equal(elements.get('homeAdventureTitle').textContent,'ストーリー');
  assert.equal(elements.get('storyContinueCard').hidden,['completed','skipped'].includes(status));
  assert.equal(elements.get('storyPrologueChapter').open,!['completed','skipped'].includes(status),'unfinished prologue exposes its continuation; completed/skipped returns to collapsed chapters');
  assert.equal((elements.get('storyEpisodeList').innerHTML.match(/<article /g)||[]).length,6);
  assert.equal((elements.get('storyEpisodeList').innerHTML.match(/data-prologue-replay=/g)||[]).length,status==='completed'?6:0);
  if(status==='completed')assert.equal((elements.get('storyEpisodeList').innerHTML.match(/story-episode-status">完了/g)||[]).length,6);
  assert.ok(!elements.get('homeAdventureKicker').textContent.includes('序章クリア'));
  for(const selected of ['character','side','map','main']){
    vm.runInContext(`selectStoryCategory('${selected}')`,context);
    for(const category of ['main','map','character','side']){
      assert.equal(elements.get('storyPanel-'+category).hidden,category!==selected);
      assert.equal(elements.get('storyCategory-'+category).attributes['aria-pressed'],String(category===selected));
    }
  }
  assert.equal(JSON.stringify(tutorialState),before,'browsing categories must not write progress');
}
checkpoint='home_requests';
vm.runInContext('renderHomeStoryCard()',context);
assert.equal(elements.get('homeAdventureTitle').textContent,'救援依頼を報告');
console.log('Story hub behavior passed (four categories, untouched progress, terminal states, six episodes, request guidance).');

assert.doesNotMatch(index,/第6話の続きは、今後追加されます|story-coming-soon/,'no stale fixed Chapter 7 card');
vm.runInContext(read('js/prologue-part2-data.js'),context);
vm.runInContext(read('js/prologue-part2.js'),context);
const plainSteps=vm.runInContext('PROLOGUE_STORY_EPISODES.flatMap(e=>[{id:e.startStepId},{id:e.endStepId}])',context);
context.tutorialFlowSteps=()=>plainSteps;
context.TUTORIAL_MAIN_FLOW_ID='prologue';
const laterIds=vm.runInContext('prologuePart2Episodes().map(e=>e.id)',context);
for(const [status,complete,cardClass,note,count,progress] of [
 ['in_progress',[],'locked','第6話クリアで第7話を解放',7,'続き：第6話 ・ 5/6 完了'],
 ['completed',[],'current','つづきから',23,'続き：第7話 ・ 6/23 完了'],
 ['completed',['pb_07'],'completed','読み返す',23,'続き：第8話 ・ 7/23 完了'],
 ['completed',laterIds.slice(0,-1),'completed','読み返す',23,'続き：終幕 ・ 22/23 完了']
]){
 tutorialState={status,stepId:status==='in_progress'?'expedition_intro':null};
 context.save.prologuePart2={episodes:Object.fromEntries(complete.map(id=>[id,{completed:true}]))};
 const saved=JSON.stringify(context.save);
 vm.runInContext('renderStoryMode()',context);
 const html=elements.get('storyEpisodeList').innerHTML;
 const cards=[...html.matchAll(/<article class="story-episode-card is-([^"]+)" data-prologue-episode="pb_07">[\s\S]*?<\/article>/g)];
 assert.equal(cards.length,1);assert.equal(cards[0][1],cardClass);assert.ok(cards[0][0].includes(note));
 assert.equal((html.match(/<article /g)||[]).length,count);
 assert.equal(elements.get('storyChapterProgress').textContent,progress);
 assert.equal(JSON.stringify(context.save),saved,'episode list does not mutate unlock state or progress');
}
console.log('PASS one Chapter 7 card: before Chapter 6 clear, unlocked, completed, and finale 22/23');


vm.runInContext(read('js/map-story-data.js'),context);
let available=false;
context.mapStoryAvailable=()=>available;
context.mapStoryCompletedCount=story=>story.mapId==='grassland'?3:1;
context.mapStoryMap=story=>({name:story.mapId==='grassland'?'草原':'火山',image:`images/maps/${story.mapId}.webp`});
context.mapStoryEscape=String;
vm.runInContext('renderStoryMapCatalog()',context);
assert.match(elements.get('storyMapList').innerHTML,/3\/11 完了/);
assert.match(elements.get('storyMapList').innerHTML,/1\/9 完了/);
assert.match(elements.get('storyMapList').innerHTML,/disabled/);
available=true;
vm.runInContext('renderStoryMapCatalog()',context);
assert.ok(!elements.get('storyMapList').innerHTML.includes('disabled'));
assert.match(elements.get('storyMapList').innerHTML,/onclick="openMapStory\('grassland_whose'\)"/);
assert.match(elements.get('storyMapList').innerHTML,/onclick="openMapStory\('volcano_breath'\)"/);
console.log('Map catalog passed (existing gate, shared progress, playable entrance).');
