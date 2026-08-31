import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const alchemy=read('js/alchemy.js');
const saveSource=read('js/save.js');
const index=read('index.html');
const tutorialCss=read('css/tutorial.css');
const uiCss=read('css/ui-redesign.css');
const manifest=JSON.parse(read('images/tutorial/characters/manifest.json'));
const packageJson=JSON.parse(read('package.json'));

const portrait=fs.readFileSync(new URL('../images/tutorial/characters/lumina_apprentice.png',import.meta.url));
assert.ok(portrait.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Lumina portrait must be a PNG');
assert.equal(portrait[25],6,'Lumina portrait must retain an RGBA alpha channel');
const asset=manifest.characters.find(entry=>entry.id==='lumina_apprentice');
assert.ok(asset?.validation?.rgba&&asset.validation.transparentPixels>0&&asset.validation.partialAlphaPixels>0,'Lumina portrait must contain real transparent and antialiased pixels');

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
const main=tutorial.slice(flowStart,flowEnd);
const required=['lumina_intro','lumina_encounter','lumina_alchemy','lumina_materials','lumina_start','lumina_confirm','lumina_execute','lumina_wait','lumina_alchemy_result','lumina_alchemy_replay','expedition_intro'];
let previous=-1;
for(const id of required){
  const current=main.indexOf(`id:'${id}'`);
  assert.ok(current>previous,`Lumina alchemy STEP is missing or out of order: ${id}`);
  previous=current;
}
const luminaFlow=main.slice(main.indexOf("id:'lumina_intro'"),main.indexOf("id:'expedition_home_open'"));
assert.ok(!luminaFlow.includes('カナタ'),'Kanata must not appear in the prologue');
assert.ok(luminaFlow.includes("portrait:'images/tutorial/characters/lumina_apprentice.png'"),'Lumina dialogue must use the transparent portrait');
assert.ok(luminaFlow.includes("scene:'workshop'"),'the workshop must use its own background layer');
assert.match(luminaFlow,/id:'lumina_alchemy'[^\n]+persistAs:'lumina_alchemy'[^\n]+transition:'prepare_lumina_alchemy'/);
assert.match(luminaFlow,/id:'lumina_start'[^\n]+externalAdvance:true[^\n]+persistAs:'lumina_alchemy'/);
assert.match(luminaFlow,/id:'lumina_execute'[^\n]+externalAdvance:true[^\n]+persistAs:'lumina_alchemy'/);
assert.match(luminaFlow,/id:'lumina_alchemy_result'[^\n]+persistAs:'expedition_intro'/);
assert.ok(luminaFlow.includes('素材4種類を各1個、250コイン、初回成功率100％'),'the four read-only resource steps must be consolidated');

for(const target of ['tutorialAlchemyRecipeCard','tutorialAlchemyMaterials','tutorialAlchemyCoin','tutorialAlchemyRate','tutorialAlchemyStartButton','tutorialAlchemyResult']){
  assert.ok(alchemy.includes(`id=\"${target}\"`)||alchemy.includes(`id=\"${target}\" `),`missing stable alchemy target: ${target}`);
}
for(const token of [
  "recipeId:'alchemion_standard'","resultId:'alchemion'","coinOptionId:'high'","coins:250",
  "materials:Object.freeze(['monster_bone','magic_crystal','metal_ore','unstable_alchemy_matter'])"
])assert.ok(tutorial.includes(token),`missing tutorial recipe contract: ${token}`);
assert.ok(alchemy.includes("mode:'tutorial_lesson'"),'lesson selection must be isolated from normal alchemy');
assert.ok(alchemy.includes('rate:tutorialLesson?100:'),'the first lesson must force 100% success');
assert.ok(alchemy.includes('if(!plan.tutorialLesson){\n      save.instances = save.instances.filter'),'the lesson must not consume a companion');
assert.ok(alchemy.includes("images/tutorial/characters/lumina_apprentice.png"),'the lesson UI must use the transparent Lumina portrait');
assert.ok(alchemy.includes("if(!ins) errors.push('触媒モンスターを1体選択してください。')"),'normal alchemy must still require a catalyst');
assert.match(tutorialCss,/tutorial-story-backdrop\[data-scene="workshop"\]/);
assert.match(uiCss,/\.tutorial-alchemy-lesson\{/);
assert.ok(index.includes('js/alchemy.js?v=phase3-prologue-1-elixion-neutral-1-prologue-lumina-alchemy-1'));

for(const token of [
  "'alchemyLessonPrepared','alchemyLessonCompleted'",
  'alchemyLessonPrepared:source.alchemyLessonPrepared===true||protectPublishedFlow',
  'alchemyLessonCompleted:source.alchemyLessonCompleted===true||protectPublishedFlow',
  "markTutorialOnce('alchemyLessonPrepared')","markTutorialOnce('alchemyLessonCompleted')"
])assert.ok(saveSource.includes(token),`missing one-time save protection: ${token}`);

const helperStart=tutorial.indexOf('function tutorialLuminaAlchemyResourceEntries()');
const helperEnd=tutorial.indexOf('function tutorialStellaSkillCard()',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart);
const materials=['monster_bone','magic_crystal','metal_ore','unstable_alchemy_matter'];
function makeContext({saveSucceeds=true,replaying=false,prepared=false,completed=false,coins=0,owned=0}={}){
  const state={status:'in_progress',stepId:'lumina_alchemy',replaying,alchemyLessonPrepared:prepared,alchemyLessonCompleted:completed};
  const context=vm.createContext({
    console:{error:()=>{}},
    TUTORIAL_LUMINA_ALCHEMY:{recipeId:'alchemion_standard',displayName:'ルミナの入門錬成',resultId:'alchemion',coinOptionId:'high',coins:250,materials},
    ITEM_BY_ID:Object.fromEntries(materials.map(id=>[id,{id,alchemyMaterial:true}])),
    save:{coins,items:Object.fromEntries(materials.map(id=>[id,owned])),progress:{tutorial:state}},
    currentTutorialState:()=>context.save.progress.tutorial,
    markTutorialAlchemyLessonPrepared:()=>{const value=context.save.progress.tutorial;if(value.alchemyLessonPrepared)return false;value.alchemyLessonPrepared=true;return true;},
    markTutorialAlchemyLessonCompleted:()=>{const value=context.save.progress.tutorial;if(value.alchemyLessonCompleted)return false;value.alchemyLessonCompleted=true;return true;},
    setTutorialStep:id=>{context.save.progress.tutorial.stepId=id;},saveGame:()=>saveSucceeds,
    registerItemDex:()=>{},activateTutorialAlchemyLesson:config=>{context.activated=config;return true;},
    deactivateTutorialAlchemyLesson:()=>{context.deactivated=true;},showAlchemy:()=>{context.shown=true;},
    showUiNotice:message=>context.notices.push(message),notices:[],tutorialCurrentStepId:()=>null,
    queueTutorialActionAdvance:()=>true,startTutorialFlow:()=>true,TUTORIAL_MAIN_FLOW_ID:'prologue'
  });
  vm.runInContext(tutorial.slice(helperStart,helperEnd),context);
  return context;
}

const fresh=makeContext();
assert.equal(vm.runInContext('prepareTutorialLuminaAlchemy()',fresh),true);
assert.equal(fresh.save.coins,250);
assert.deepEqual(Object.values(fresh.save.items),[1,1,1,1]);
assert.equal(fresh.save.progress.tutorial.alchemyLessonPrepared,true);
assert.equal(fresh.save.progress.tutorial.stepId,'lumina_alchemy');
assert.equal(fresh.activated.recipeId,'alchemion_standard');

const failed=makeContext({saveSucceeds:false});
assert.equal(vm.runInContext('prepareTutorialLuminaAlchemy()',failed),false);
assert.equal(failed.save.coins,0,'failed persistence must roll back lesson resources');
assert.equal(failed.save.progress.tutorial.alchemyLessonPrepared,false);

const spent=makeContext({prepared:true,coins:0,owned:0});
assert.equal(vm.runInContext('prepareTutorialLuminaAlchemy()',spent),false,'a prepared lesson must not grant resources repeatedly');
assert.equal(spent.save.coins,0);

const replay=makeContext({replaying:true,prepared:true,completed:true});
assert.equal(vm.runInContext('prepareTutorialLuminaAlchemy()',replay),true);
assert.equal(replay.shown,true);assert.equal(replay.deactivated,true);
assert.equal(replay.save.coins,0,'replay must not grant resources');

const routeStart=tutorial.indexOf('function tutorialShouldUseReplayNextStep');
const routeEnd=tutorial.indexOf('function tutorialNext',routeStart);
assert.ok(routeStart>=0&&routeEnd>routeStart,'completed-lesson routing helper is missing');
const routeContext=vm.createContext({tutorialUiState:{replay:false},currentTutorialState:()=>({alchemyLessonCompleted:true})});
vm.runInContext(tutorial.slice(routeStart,routeEnd),routeContext);
assert.equal(vm.runInContext("tutorialShouldUseReplayNextStep({transition:'prepare_lumina_alchemy'})",routeContext),true,
  'a normally resumed completed lesson must use the completion recap instead of silently skipping it');
routeContext.currentTutorialState=()=>({alchemyLessonCompleted:false});
assert.equal(vm.runInContext("tutorialShouldUseReplayNextStep({transition:'prepare_lumina_alchemy'})",routeContext),false,
  'an incomplete lesson must retain the hands-on alchemy route');
routeContext.tutorialUiState.replay=true;
assert.equal(vm.runInContext('tutorialShouldUseReplayNextStep({})',routeContext),true,'tutorial replay must retain replay routing');
assert.ok(tutorial.includes('tutorialShouldUseReplayNextStep(step)&&step?.replayNextStepId'),
  'the shared Next handler must apply the completed-lesson route');

const completion=makeContext({prepared:true,coins:250,owned:1});
assert.equal(vm.runInContext('commitTutorialLuminaAlchemySuccess()',completion),true);
assert.equal(completion.save.progress.tutorial.alchemyLessonCompleted,true);
assert.equal(completion.save.progress.tutorial.stepId,'expedition_intro');
assert.equal(vm.runInContext('commitTutorialLuminaAlchemySuccess()',completion),false,'completion must be one-time');

assert.equal(packageJson.scripts['check:prologue-lumina-alchemy'],'node scripts/test-prologue-lumina-alchemy.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-lumina-alchemy'));

console.log('Prologue Lumina alchemy validation passed (transparent portrait, dedicated catalyst-free recipe, fixed resources, 100% first success, persistence rollback, replay safety, and Phase 14 checkpoint).');
