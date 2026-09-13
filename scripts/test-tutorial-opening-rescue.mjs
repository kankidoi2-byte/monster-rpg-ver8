import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const nodes=new Map();let clock=1000,saveCount=0;
const saved={status:'in_progress',playerName:'Tester',stepId:'elna_encounter',guides:{}};
const node=()=>({style:{},dataset:{},hidden:false,textContent:'',children:[],
  classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  setAttribute(){},getAttribute(){return null;},toggleAttribute(){},focus(){},closest(){return node();},
  replaceChildren(){this.children=[];},appendChild(c){this.children.push(c);},addEventListener(){}});
const get=id=>{if(id==='tutorialMenuButton')return null;if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
const queued=[];
let screen='home';
const context=vm.createContext({console,Date:{now:()=>clock},
  show:id=>screen=id,
  document:{getElementById:get,createElement:node,addEventListener(){},body:node(),querySelector:s=>s==='.screen.active'?{id:screen}:null},
  window:{addEventListener(){}},requestAnimationFrame(){},setTimeout:f=>queued.push(f),
  currentTutorialState:()=>saved,setTutorialStep:id=>saved.stepId=id,saveGame:()=>{saveCount++;return true;}
});
vm.runInContext(read('js/tutorial.js'),context);
const run=code=>vm.runInContext(code,context);
for(const x of [170,570]){
  context.target={left:x,right:x+60,top:165,bottom:225,width:60,height:60};
  const p=run('calculateTutorialPlacement(target,{width:360,height:250},{width:844,height:390})');
  assert.ok(p.side==='left'||p.side==='right','landscape guide uses available horizontal room');
  assert.ok(p.left+360<=x||p.left>=x+60,'guide must not cover the required map action');
  assert.ok(p.top>=0&&p.top+250<=390);
}
run('prepareTutorialStep=()=>{};'); // Presentation/outcome isolation; full browser check uses real setup.
const compactAction=run('calculateTutorialPlacement({left:20,right:824,top:166,bottom:224,width:804,height:58},{width:360,height:250},{width:844,height:390},{avoidTarget:true})');
assert.ok(compactAction.maxHeight>=128&&compactAction.maxHeight<250,'a wide required button gets a scrollable guide');
assert.ok(compactAction.top+compactAction.maxHeight<=166||compactAction.top>=224,'required button stays outside the guide');
const next=()=>{clock+=300;run('tutorialNext();');};
run("startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'elna_encounter',persist:true});");
const initialSaves=saveCount;
assert.equal(get('tutorialTitle').textContent,'グノーシス');
next();next();
assert.equal(get('tutorialTitle').textContent,'エルナ');
assert.equal(get('tutorialStoryBackdrop').dataset.scene,'grassland');
assert.equal(saveCount,initialSaves,'arrival pages must not grant or save gameplay state');
run("pauseTutorial();startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:currentTutorialState().stepId,persist:true});");
assert.equal(get('tutorialTitle').textContent,'グノーシス');
run("startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'elna_guest_join',persist:true});");
next();
assert.equal(get('tutorialTitle').textContent,'グノーシス');
assert.ok(get('tutorialText').textContent.includes('君とボク、それにあの子の3人'));
next();assert.equal(run('tutorialCurrentStepId()'),'rescue_world_map_open','rally leads into real map operation');
next();assert.equal(run('tutorialCurrentStepId()'),'rescue_world_map_open','Next cannot bypass map operation');
for(const outcome of ['defeat','retreat','error','victory']){
  run("clearTutorialUi();tutorialBattleSession.active=true;tutorialBattleSession.kind='elna_rescue';tutorialBattleSession.enemyQueue=['slime'];");
  context.outcome=outcome;
  assert.equal(run('handleTutorialBattleOutcome(outcome)'),true);
  assert.equal(run('tutorialBattleSession.active'),false);
  assert.equal(run('tutorialBattleSession.enemyQueue.length'),0);
  assert.equal(run('handleTutorialBattleOutcome(outcome)'),false,'duplicate outcomes ignored');
  while(queued.length)queued.shift()();
  const expected=outcome==='victory'?'elna_rescue_complete':'elna_rescue_retry';
  assert.equal(run('tutorialCurrentStepId()'),expected);
  assert.equal(saved.stepId,outcome==='victory'?'elna_rescue_complete':'elna_rescue_start');
}
next();
assert.ok(get('tutorialText').textContent.includes('私の名前はエルナ'));
run("pauseTutorial();startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:currentTutorialState().stepId,persist:true});");
assert.equal(run('tutorialDialogueState.page'),0,'victory interruption replays thanks before contract');
next();next();assert.equal(run('tutorialCurrentStepId()'),'elna_contract_intro');
assert.equal(saved.stepId,'elna_contract_intro','finished thanks advances to existing contract checkpoint');
let scrolled;
context.window.innerWidth=844;context.window.innerHeight=390;
context.landscapeTarget={style:{scrollMarginTop:'5px'},getBoundingClientRect:()=>({top:800,bottom:868,left:36,right:808,width:772,height:68}),scrollIntoView:options=>{scrolled=options;}};
run('ensureTutorialTargetVisible(landscapeTarget)');
assert.equal(scrolled.block,'start','short landscape scroll reserves room for the guide');
assert.equal(context.landscapeTarget.style.scrollMarginTop,'5px','temporary scroll margin is restored');
console.log('Opening/rescue integration passed: arrival, speakers, checkpoint replay, map action gate, victory/defeat/retreat/error, duplicate outcomes and contract connection.');
