import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../js/story-presentation.js',import.meta.url),'utf8');
let timers=new Map(),id=0,completed=0;
const element={isConnected:true,textContent:'',setAttribute(k,v){this[k]=v;}};
const context=vm.createContext({element,done:()=>completed++,setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(i){timers.delete(i);}});
vm.runInContext(source,context);
const run=s=>vm.runInContext(s,context);
run("var writer=createStoryTypewriter(element,'こんにちは🌟',done)");
assert.equal(element['aria-label'],'こんにちは🌟');assert.equal(element.textContent,'');
const tick=()=>{const [key,fn]=timers.entries().next().value;timers.delete(key);fn();};
tick();assert.equal(element.textContent,'こ');
run('writer.finish()');assert.equal(element.textContent,'こんにちは🌟');assert.equal(completed,1);assert.equal(timers.size,0);
run('writer.finish()');assert.equal(completed,1,'completion callback only once');
run("writer=createStoryTypewriter(element,'キャンセル',done);writer.cancel()");assert.equal(timers.size,0);assert.equal(completed,1);
run("writer=createStoryTypewriter(element,'',done)");tick();assert.equal(completed,2);assert(run('writer.isComplete()'));
run("writer=createStoryTypewriter(element,'🌟',done)");tick();assert.equal(element.textContent,'🌟');assert.equal(completed,3,'Unicode glyph not split');
run("writer=createStoryTypewriter(element,'closed scene',done)");element.isConnected=false;tick();assert.equal(completed,3,'detached scene cannot advance');assert.equal(timers.size,0);
console.log('PASS story presentation: 30ms typed Unicode, finish/cancel idempotence, empty text, detached DOM safety; no save state.');

// Adapter guards: auto cannot enable on inputs/choices/real UI actions, and
// ending a flow must not leak another player's name/log/cast into the next flow.
const controls=new Map();
const control=id=>{if(!controls.has(id))controls.set(id,{hidden:false,setAttribute(k,v){this[k]=v;}});return controls.get(id);};
const adapter=vm.createContext({
 document:{getElementById:control},clearTimeout(){},setTimeout(){return 1;},
 tutorialUiState:{steps:[{input:'player_name'}],index:0,active:true},
 tutorialStepRequiresAction:step=>Boolean(step.action),
 tutorialDialogueNeedsChoice:step=>Boolean(step.choices&&step.atChoice),tutorialDialogueHasMore:step=>Boolean(step.more),tutorialNext(){adapter.advances=(adapter.advances||0)+1;},
 tutorialResolvedText:view=>view.text||'',tutorialDialogueView:step=>step
});
vm.runInContext(fs.readFileSync(new URL('../js/tutorial-presentation.js',import.meta.url),'utf8'),adapter);
const adapt=s=>vm.runInContext(s,adapter);
for(const step of [{input:'player_name'},{choices:[{}]},{target:'#realButton'},{action:true}]){
 adapter.tutorialUiState.steps=[step];adapt('tutorialPresentationAuto()');
 assert.equal(adapt('tutorialPresentation.auto'),false,'interactive steps cannot enable auto');
}
adapt("tutorialPresentation.log=[{speaker:'old player',text:'old text'}];tutorialPresentation.seen.add('old');tutorialPresentation.portraits.set('old.png','old player');tutorialPresentation.episode='old';tutorialPresentationStop()");
assert.equal(adapt('tutorialPresentation.log.length'),0);assert.equal(adapt('tutorialPresentation.seen.size'),0);assert.equal(adapt('tutorialPresentation.portraits.size'),0);assert.equal(adapt('tutorialPresentation.episode'),null);
console.log('PASS tutorial adapter: input/choice/guide auto guards and session-local log/cast cleanup.');

// Choices belong to their final dialogue page, not every preceding page.
adapter.tutorialUiState.steps=[{choices:[{}],atChoice:false}];
adapt("tutorialPresentationTap({target:{closest(){return null;}}})");
assert.equal(adapter.advances,1,"pre-choice dialogue advances by tapping");
adapter.tutorialUiState.steps[0].atChoice=true;
adapt("tutorialPresentationTap({target:{closest(){return null;}}})");
assert.equal(adapter.advances,1,"visible choices require a choice button");


// A spotlight is not in itself a required action. The engine still decides
// whether advancement is allowed, including external game actions.
const controlState=(step,target=null)=>{
 adapter.tutorialUiState.target=target;adapter.tutorialUiState.steps=[step];
 return JSON.parse(adapt('JSON.stringify(tutorialPresentationControls(tutorialUiState.steps[0]))'));
};
for(const target of ['#singleEnemyBox','[data-tutorial-monster="freigal"]']){
 assert.deepEqual(controlState({target},{}),{next:true,targetTap:false,hint:false});
}
assert.deepEqual(controlState({target:'#battleSwitchButton',action:true},{}),{next:false,targetTap:true,hint:true});
assert.deepEqual(controlState({target:'#battleSwitchButton',action:true}),{next:false,targetTap:false,hint:false});
assert.deepEqual(controlState({}),{next:false,targetTap:false,hint:true});
assert.deepEqual(controlState({nextLabel:'つづける'}),{next:true,targetTap:false,hint:false});
assert.deepEqual(controlState({input:'player_name'}),{next:false,targetTap:false,hint:false});
assert.deepEqual(controlState({target:'#info',choices:[{}],atChoice:true},{}),{next:false,targetTap:false,hint:false});
console.log('PASS tutorial controls: information-only Next, actual target-only tap cue, hidden action/choice/name controls');

vm.runInContext(fs.readFileSync(new URL('../js/story.js',import.meta.url),'utf8'),adapter);
adapter.TUTORIAL_MAIN_FLOW_ID='prologue';
const realBounds=adapt('PROLOGUE_STORY_EPISODES.flatMap(e=>[{id:e.startStepId},{id:e.endStepId}])');
adapter.tutorialFlowSteps=()=>realBounds;
const heading=(flowId,step)=>{
 adapter.tutorialUiState.flowId=flowId;adapter.headingStep=step;
 return JSON.parse(adapt('JSON.stringify(tutorialPresentationContext(headingStep))'));
};
for(const id of ['shop_buy','shop_use']){
 assert.deepEqual(heading('guide_shop_items',{id,screenId:'shop'}),{episode:null,label:'ショップの使い方'});
}
for(const id of ['evolution_intro','evolution_choice']){
 assert.deepEqual(heading('guide_evolution',{id,screenId:'evolution'}),{episode:null,label:'進化の使い方'});
}
assert.equal(heading('prologue',{id:'intro_gnosis'}).label,'序章 第1話　異世界での目覚め');
assert.equal(heading('prologue',{id:'stella_intro'}).label,'序章 第4話　王都での出会い');
assert.deepEqual(heading('guide_shop_items',{id:'intro_gnosis',screenId:'shop'}),{episode:null,label:'ショップの使い方'});
assert.deepEqual(heading('prologue',{id:'unknown',progressLabel:'GUIDE'}),{episode:null,label:'GUIDE'});
assert.equal(adapt("storyEpisodeIndexForStep('unknown')"),0,'keep legacy progress fallback');
assert.equal(adapt("storyEpisodeIndexForStep('unknown',{fallback:-1})"),-1,'do not show a fabricated chapter');
console.log('PASS facility headings: shop/evolution steps; real Chapters 1 and 4; no standalone-to-Chapter-1 fallback');
