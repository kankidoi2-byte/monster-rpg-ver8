import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const tutorial=fs.readFileSync(new URL('../js/tutorial.js',import.meta.url),'utf8');
const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
assert.ok(flowStart>=0&&flowEnd>flowStart,'main prologue flow must exist');
const main=tutorial.slice(flowStart,flowEnd);

const assertOrdered=ids=>{
  let previous=-1;
  for(const id of ids){
    const index=main.indexOf(`id:'${id}'`);
    assert.ok(index>previous,`facility route must preserve order: ${id}`);
    previous=index;
  }
};
assertOrdered(['request_reward_received','stella_intro','stella_world_map_open','stella_world_map_academy','stella_world_map_visit','stella_encounter']);
assertOrdered(['stella_mock_victory','lumina_intro','lumina_world_map_open','lumina_world_map_academy','lumina_world_map_visit','lumina_encounter']);

assert.match(main,/id:'request_reward_received'[^\n]+persistAs:'stella_intro'[^\n]+nextStepId:'stella_intro'[^\n]+chapterBreak:true/,
  'the published request-to-Stella chapter checkpoint must remain intact');
assert.match(main,/id:'stella_mock_victory'[^\n]+persistAs:'lumina_intro'[^\n]+nextStepId:'lumina_intro'[^\n]+chapterBreak:true/,
  'the published Stella-to-Lumina chapter checkpoint must remain intact');
assert.match(main,/id:'stella_intro'[^\n]+persistAs:'stella_intro'[^\n]+nextStepId:'stella_world_map_open'[^\n]+scene:'academy'/,
  'the existing Stella checkpoint and academy story scene must lead into its map route');
assert.match(main,/id:'lumina_intro'[^\n]+persistAs:'lumina_intro'[^\n]+nextStepId:'lumina_world_map_open'[^\n]+scene:'workshop'/,
  'the existing Lumina checkpoint and workshop story scene must lead into its map route');

for(const prefix of ['stella','lumina']){
  assert.match(main,new RegExp(`id:'${prefix}_world_map_open'[^\\n]+target:'\\[data-nav="battle"\\]'[^\\n]+advanceOnTarget:true`));
  assert.match(main,new RegExp(`id:'${prefix}_world_map_academy'[^\\n]+target:'\\[data-wm-place="magic_academy"\\]'[^\\n]+advanceOnTarget:true`));
  assert.match(main,new RegExp(`id:'${prefix}_world_map_visit'[^\\n]+target:'\\[data-wm-facility-visit\\]'[^\\n]+externalAdvance:true`));
}

const facilityStart=tutorial.indexOf('const TUTORIAL_WORLD_MAP_FACILITY_VISITS');
const facilityEnd=tutorial.indexOf('function tutorialFirstHuntIsPending',facilityStart);
assert.ok(facilityStart>=0&&facilityEnd>facilityStart,'facility helper APIs must exist');
let currentStep='stella_world_map_visit';
let advances=0;
const notices=[];
const rendered=[];
const context=vm.createContext({
  Object,Set,
  TUTORIAL_FIRST_HUNT:{mapId:'grassland',difficultyId:'easy'},
  tutorialCurrentStepId:()=>currentStep,
  tutorialNext:completed=>{assert.equal(completed,true);advances+=1;},
  showUiNotice:(message,kind)=>notices.push({message,kind}),
  activeScreenId:()=> 'battleChoices',
  showWorldMapOverview:()=>{rendered.push('overview');return true;},
  showWorldMapLocation:mapId=>{rendered.push(mapId);return true;}
});
vm.runInContext(tutorial.slice(facilityStart,facilityEnd),context);
const locationGuardStart=tutorial.indexOf('function handleTutorialWorldMapLocationSelection');
assert.ok(locationGuardStart>=0&&locationGuardStart<facilityStart);
vm.runInContext(tutorial.slice(locationGuardStart,facilityStart),context);
assert.equal(vm.runInContext("tutorialWorldMapFacilityVisitFor('magic_academy').label",context),'魔導学園へ入る');
assert.equal(vm.runInContext("tutorialWorldMapFacilityVisitFor('arena')",context),null);
assert.equal(vm.runInContext("handleTutorialWorldMapFacilityVisit('arena')",context),true,'a mismatched tutorial facility action is consumed');
assert.equal(advances,0);assert.equal(notices.length,1);
assert.equal(vm.runInContext("handleTutorialWorldMapFacilityVisit('magic_academy')",context),true);
assert.equal(advances,1);

currentStep='lumina_world_map_visit';
assert.equal(vm.runInContext("tutorialWorldMapFacilityVisitFor('magic_academy').label",context),'錬成工房へ入る');
assert.equal(vm.runInContext("prepareTutorialWorldMapFacilityStep('lumina_world_map_visit')",context),true);
assert.deepEqual(rendered,['overview','magic_academy'],'facility detail must be rebuilt after an interrupted reload');
currentStep='lumina_world_map_academy';
assert.equal(vm.runInContext("prepareTutorialWorldMapFacilityStep('lumina_world_map_academy')",context),true);
assert.deepEqual(rendered,['overview','magic_academy','overview'],'facility selection must resume from the world overview');
assert.equal(vm.runInContext("handleTutorialWorldMapLocationSelection('forest',null)",context),true,'an off-route location is rejected');
assert.equal(vm.runInContext("handleTutorialWorldMapLocationSelection('magic_academy',null)",context),false,'the guided academy remains selectable');
assert.equal(vm.runInContext("handleTutorialWorldMapDeparture('magic_academy','easy',null)",context),true,'selection cannot leak into random exploration');
currentStep='lumina_world_map_visit';
assert.equal(vm.runInContext("handleTutorialWorldMapDeparture('magic_academy','easy',null)",context),true,'facility detail cannot leak into random exploration');
currentStep='unrelated';
assert.equal(vm.runInContext("handleTutorialWorldMapDeparture('magic_academy','easy',null)",context),false,'ordinary play remains untouched');

for(const id of ['stella_intro','stella_encounter','stella_mock_victory','lumina_intro','lumina_encounter']){
  assert.ok(main.includes(`id:'${id}'`),`published tutorial STEP must remain available: ${id}`);
}
const facilityPath=main.slice(main.indexOf("id:'stella_world_map_open'"),main.indexOf("id:'lumina_encounter'"));
assert.ok(!facilityPath.includes('Math.random'),'facility visits must never depend on a random encounter');
assert.ok(!/[★☆]\s*5|star.?5/i.test(facilityPath),'facility visits must not require a five-star encounter');
console.log('Prologue facility routes passed (world map -> Magic Academy -> Stella / alchemy workshop -> Lumina, deterministic visits, resume, and old checkpoints).');
