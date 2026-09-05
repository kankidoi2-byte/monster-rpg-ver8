import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const tutorial=fs.readFileSync(new URL('../js/tutorial.js',import.meta.url),'utf8');
const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
assert.ok(flowStart>=0&&flowEnd>flowStart,'main prologue flow must exist');
const main=tutorial.slice(flowStart,flowEnd);

const orderedSteps=['elna_guest_join','rescue_world_map_open','rescue_world_map_grassland','rescue_world_map_depart','elna_rescue_start','battle_enemy'];
let previous=-1;
for(const id of orderedSteps){
  const index=main.indexOf(`id:'${id}'`);
  assert.ok(index>previous,`tutorial path must preserve order: ${id}`);
  previous=index;
}
assert.match(main,/id:'rescue_world_map_open'[^\n]+target:'\[data-nav="battle"\]'[^\n]+advanceOnTarget:true/,
  'the first guided action must open the real battle/world-map navigation');
assert.match(main,/id:'rescue_world_map_grassland'[^\n]+screenId:'battleChoices'[^\n]+target:'\[data-wm-place="grassland"\]'[^\n]+advanceOnTarget:true/,
  'the guide must select Grassland on the real world map');
assert.match(main,/id:'rescue_world_map_depart'[^\n]+target:'\[data-wm-depart\]'[^\n]+externalAdvance:true[^\n]+transition:'start_elna_rescue'[^\n]+nextStepId:'battle_enemy'/,
  'departure must be intercepted before the deterministic rescue battle starts');

// Existing v2 checkpoints and retired aliases remain resolvable for saves made
// before the world-map guide was inserted. They intentionally bypass the new
// explanatory steps instead of invalidating an in-progress rescue.
assert.match(main,/id:'elna_rescue_start'[^\n]+transition:'start_elna_rescue'[^\n]+nextStepId:'battle_enemy'/);
assert.ok(tutorial.includes("first_hunt:'elna_rescue_start'"));
for(const id of ['gnosis_rescue_alert','starter_contracts_received','elna_rescue_start','battle_enemy','home_party']){
  assert.ok(main.includes(`id:'${id}'`),`published v2 checkpoint must remain available: ${id}`);
}

const prepareStart=tutorial.indexOf('function prepareTutorialRescueWorldMapStep');
const selectionStart=tutorial.indexOf('function handleTutorialWorldMapLocationSelection',prepareStart);
const handlerStart=tutorial.indexOf('function handleTutorialWorldMapDeparture',selectionStart);
const handlerEnd=tutorial.indexOf('function tutorialFirstHuntIsPending',handlerStart);
assert.ok(prepareStart>=0&&handlerStart>prepareStart&&handlerEnd>handlerStart);

const prepared=[];
const prepareContext=vm.createContext({
  TUTORIAL_FIRST_HUNT:{mapId:'grassland',difficultyId:'easy'},
  activeScreenId:()=> 'battleChoices',
  showWorldMapOverview(){prepared.push('overview');return true;},
  showWorldMapLocation(mapId){prepared.push(mapId);return true;}
});
vm.runInContext(tutorial.slice(prepareStart,selectionStart),prepareContext);
assert.equal(vm.runInContext("prepareTutorialRescueWorldMapStep('rescue_world_map_grassland')",prepareContext),true);
assert.equal(vm.runInContext("prepareTutorialRescueWorldMapStep('rescue_world_map_depart')",prepareContext),true);
assert.deepEqual(prepared,['overview','overview','grassland'],'an interrupted guide must reset stale difficulty before rebuilding the exact world-map view');

const worldMap=fs.readFileSync(new URL('../js/world-map.js',import.meta.url),'utf8');
assert.ok(worldMap.includes('function showWorldMapOverview()'),'the tutorial resume helper needs a real overview API');
assert.ok(worldMap.includes("typeof handleTutorialWorldMapLocationSelection==='function'&&handleTutorialWorldMapLocationSelection(mapId,eventKey)"),
  'the real location path must reject off-route tutorial selections');
assert.ok(worldMap.includes("typeof handleTutorialWorldMapDeparture==='function'&&handleTutorialWorldMapDeparture(mapId,difficultyId,eventKey)"),
  'the real departure path must intercept the deterministic rescue before random exploration');

let currentStep='other';
let advances=0;
const notices=[];
let overviewReturns=0;
const handlerContext=vm.createContext({
  TUTORIAL_FIRST_HUNT:{mapId:'grassland',difficultyId:'easy'},
  tutorialCurrentStepId:()=>currentStep,
  tutorialNext:completed=>{assert.equal(completed,true);advances+=1;},
  showUiNotice:(message,kind)=>notices.push({message,kind}),showWorldMapOverview:()=>{overviewReturns+=1;return true;}
});
vm.runInContext(tutorial.slice(selectionStart,handlerStart),handlerContext);
vm.runInContext(tutorial.slice(handlerStart,handlerEnd),handlerContext);
assert.equal(vm.runInContext("handleTutorialWorldMapDeparture('grassland','easy',null)",handlerContext),false,
  'ordinary exploration must remain untouched outside the tutorial checkpoint');
currentStep='rescue_world_map_depart';
assert.equal(vm.runInContext("handleTutorialWorldMapDeparture('forest','easy',null)",handlerContext),true,
  'a wrong departure is consumed instead of starting an unrelated random battle');
assert.equal(advances,0);
assert.equal(notices.length,1);
assert.equal(vm.runInContext("handleTutorialWorldMapDeparture('grassland','easy',null)",handlerContext),true);
assert.equal(advances,1,'the valid fixed route advances exactly once into the rescue transition');
currentStep='rescue_world_map_grassland';
assert.equal(vm.runInContext("handleTutorialWorldMapLocationSelection('forest',null)",handlerContext),true);
assert.equal(vm.runInContext("handleTutorialWorldMapLocationSelection('grassland',null)",handlerContext),false);
assert.equal(vm.runInContext("handleTutorialWorldMapDeparture('forest','easy',null)",handlerContext),true,'an off-route direct departure is also consumed');
assert.ok(overviewReturns>=2,'off-route actions return to the visible world overview');

const newPath=main.slice(main.indexOf("id:'rescue_world_map_open'"),main.indexOf("id:'elna_rescue_start'"));
assert.ok(!newPath.includes('Math.random'),'the first exploration must not wait for random selection or events');
assert.ok(!/[★☆]\s*5|star.?5/i.test(newPath),'the first exploration must not require a five-star encounter');

console.log('Prologue world-map path passed (Battle -> Grassland -> Easy departure -> deterministic rescue, exact resume view, and v2 checkpoint compatibility).');
