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
