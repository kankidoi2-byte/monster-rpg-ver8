import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/tutorial.js',import.meta.url),'utf8');
const nodes=new Map();
let clock=1000,saves=0;
const saved={playerName:'<img src=x>名前',status:'in_progress',guides:{}};
function node(){
  return {style:{},dataset:{},hidden:false,textContent:'',children:[],listeners:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    setAttribute(){},getAttribute(){return null;},toggleAttribute(){},focus(){},
    closest(){return node();},replaceChildren(){this.children=[];},
    appendChild(child){this.children.push(child);},
    addEventListener(type,handler){this.listeners[type]=handler;}};
}
const get=id=>{if(id==='tutorialMenuButton')return null;if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
const context=vm.createContext({console,Date:{now:()=>clock},
  document:{getElementById:get,createElement:node,addEventListener(){},body:node(),
    querySelector:selector=>selector==='.screen.active'?{id:'home'}:null,activeElement:null},
  window:{addEventListener(){}},requestAnimationFrame(){},setTimeout(){},
  currentTutorialState:()=>saved,setTutorialStep:id=>{saved.stepId=id;},saveGame:()=>{saves++;return true;}
});
vm.runInContext(source,context);
const run=code=>vm.runInContext(code,context);
// Synthetic IDs must not invoke gameplay setup. All actual flow/advance/render
// functions, normalization and save calls below remain the production ones.
run('prepareTutorialStep=()=>{};');
const tick=()=>{clock+=300;};
const setup=(choice='left')=>{
  context.choice=choice;
  run(String.raw`registerTutorialFlow('dialogue_test',[
    {id:'talk',screenId:'home',speaker:'A',scene:'grassland',portrait:'a.webp',
      dialogue:[{text:'First\nline {{playerName}}'},
        {speaker:'A・B',portrait:null,text:'Second'},
        {speaker:'B',scene:'workshop',text:'Choose'}],
      choices:[{id:'left',label:'Left {{playerName}}'},{id:'right',label:'Right'}]},
    {id:'after',screenId:'home',text:'After'},
    {id:'action',screenId:'home',externalAdvance:true,text:'Wait'}]);
    startTutorialFlow('dialogue_test',{persist:true});`);
};

assert.equal(run('tutorialFlowSteps(TUTORIAL_MAIN_FLOW_ID).length'),97,'registered production flow includes capital continuation');
assert.equal(run("normalizeTutorialStep({id:'old',text:'Old'},0).dialogue"),null);
for(const bad of [
  {dialogue:[]},{dialogue:[{text:''}]},{dialogue:[{text:4}]},
  {dialogue:[{text:'A',transition:'grant'}]},
  {dialogue:[{text:'A'}],target:'#real'},
  {dialogue:[{text:'A'}],input:'elna_contract'},
  {dialogue:[{text:'A'}],transition:'start_elna_rescue'},
  {dialogue:[{text:'A'}],externalAdvance:true},
  {dialogue:[{text:'A'}],waitForEvent:'battle_outcome'},
  {choices:[{id:'a',label:'A'},{id:'b',label:'B'}]},
  {dialogue:[{text:'A'}],choices:[{id:'a',label:'A'}]},
  {dialogue:[{text:'A'}],choices:[{id:'a',label:'A'},{id:'a',label:'B'}]},
  {dialogue:[{text:'A'}],choices:[{id:'a',label:'A',nextStepId:'skip'},{id:'b',label:'B'}]}
]){
  context.bad=bad;assert.equal(run('normalizeTutorialStep(bad,0)'),null,JSON.stringify(bad));
}

for(const choice of ['left','right']){
  tick();setup(choice);
  const atStart=saves;
  assert.equal(saved.stepId,'talk');
  assert.equal(get('tutorialTitle').textContent,'A');
  assert.equal(get('tutorialText').textContent,'First\nline <img src=x>名前','names and newlines remain literal text');
  assert.equal(get('tutorialBackButton').disabled,true);
  run('tutorialNext();tutorialNext();');
  assert.equal(run('tutorialDialogueState.page'),1,'rapid double Next advances only one page');
  assert.equal(saved.stepId,'talk');assert.equal(saves,atStart,'page turns do not save or execute gameplay');
  assert.equal(get('tutorialTitle').textContent,'A・B');
  assert.equal(get('tutorialStoryBackdrop').dataset.scene,'grassland','scene inherited across speakers');
  assert.equal(get('tutorialCharacterPortrait').hidden,true,'explicit null removes portrait');
  tick();run('tutorialPrevious();');assert.equal(run('tutorialDialogueState.page'),0,'Back works inside the first step');
  tick();run('tutorialNext();');tick();run('tutorialNext();');
  assert.equal(get('tutorialStoryBackdrop').dataset.scene,'workshop');
  assert.equal(get('tutorialDialogueChoices').hidden,false);
  assert.equal(get('tutorialDialogueChoices').children[0].textContent,'Left <img src=x>名前');
  assert.equal(get('tutorialNextButton').hidden,true);
  tick();run('tutorialNext();tutorialNext(true);tutorialNext(false,"unknown");skipTutorialDialogue();');
  assert.equal(run('tutorialUiState.index'),0,'Next, external completion, invalid choices and skip cannot bypass choices');
  const button=get('tutorialDialogueChoices').children[choice==='left'?0:1];
  button.listeners.click();button.listeners.click();
  assert.equal(run('tutorialUiState.index'),1,'both choices converge exactly once');
  assert.equal(saved.stepId,'after');
  assert.equal(get('tutorialDialogueChoices').hidden,true);
  run('tutorialNext();');assert.equal(run('tutorialUiState.index'),1,'double tap cannot skip the following legacy step');
  tick();run('tutorialNext();tutorialNext();');
  assert.equal(run('tutorialUiState.index'),2,'legacy real-screen action still blocks Next');
}

tick();setup();run('tutorialNext();');
const savedKeys=Object.keys(saved).sort().join(',');
run('pauseTutorial();startTutorialFlow("dialogue_test",{stepId:currentTutorialState().stepId,persist:true});');
assert.equal(run('tutorialDialogueState.page'),0,'reload/resume replays the parent conversation');
assert.equal(Object.keys(saved).sort().join(','),savedKeys,'no new persistent cursor fields');
tick();run('tutorialNext();');tick();run('tutorialNext();');
const stale=get('tutorialDialogueChoices').children[0];
run('pauseTutorial();startTutorialFlow("dialogue_test",{persist:true});');tick();stale.listeners.click();
assert.equal(run('tutorialDialogueState.page'),0,'stale detached buttons cannot affect a resumed flow');

run(`registerTutorialFlow('skip_test',[
  {id:'before',text:'Before'},
  {id:'question',dialogue:[{text:'Question'}],choices:[{id:'a',label:'A'},{id:'b',label:'B'}]},
  {id:'must_act',externalAdvance:true}]);startTutorialFlow('skip_test');skipTutorialDialogue();`);
assert.equal(run('tutorialUiState.index'),1,'conversation skip stops at a choice');

run(`registerTutorialFlow('chapter_test',[
  {id:'chapter',dialogue:[{text:'One'},{text:'Two'}],chapterBreak:true,nextStepId:'next'},
  {id:'next',text:'Next chapter'}]);
  globalThis.chapterCalls=0;checkpointTutorialChapter=()=>{chapterCalls++;return true;};
  startTutorialFlow('chapter_test');tutorialNext();`);
assert.equal(run('chapterCalls'),0,'chapter end cannot fire on an intermediate page');
tick();run('tutorialNext();');assert.equal(run('chapterCalls'),1);
console.log('Dialogue pages passed: validation, legacy flow, speakers/scenes, choices, literal names, double taps, Back, skip, resume, stale controls and chapter boundaries.');

// Real capital checkpoint: choices converge without entering the retained legacy facility route.
for(const answer of ['accept','reluctant']){
  tick();run("startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'stella_intro',persist:true})");
  tick();run('tutorialNext()');
  tick();run('tutorialNext();skipTutorialDialogue()');
  assert.equal(run('tutorialCurrentStepId()'),'stella_intro');
  context.answer=answer;tick();run('tutorialNext(false,answer)');
  assert.equal(run('tutorialCurrentStepId()'),'stella_road_response');
  assert.equal(saved.stepId,'stella_road_response');
  tick();run('tutorialPrevious()');
  assert.equal(run('tutorialCurrentStepId()'),'stella_intro','Back must not enter the retained academy route');
  tick();run('tutorialNext()');tick();run('tutorialNext(false,answer)');
  tick();run('tutorialNext()');tick();run('tutorialNext()');
  assert.equal(get('tutorialStoryBackdrop').dataset.scene,'capital');
  tick();run("startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:savedCheckpoint,persist:true})".replace('savedCheckpoint',JSON.stringify(saved.stepId)));
  assert.equal(run('tutorialDialogueState.page'),0,'resume restarts only the current conversation');
  assert.equal(get('tutorialStoryBackdrop').dataset.scene,'grassland');
  tick();run('skipTutorialDialogue()');
  assert.equal(run('tutorialCurrentStepId()'),'stella_card_receive','skip must stop before the real card transaction');
}
console.log('Capital dialogue passed: both choices, mandatory answer, scene transition, checkpoint resume and action-safe skip.');
