import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const party=read('js/party.js');
const dex=read('js/dex.js');
const index=read('index.html');
const packageJson=JSON.parse(read('package.json'));

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
const main=tutorial.slice(flowStart,flowEnd);
const required=[
  'home_party','party_save','home_dex_open','menu_dex_open','dex_character_open','dex_elna_open',
  'dex_character_back','dex_monster_open','dex_freigal','home_growth_open','home_growth_overview',
  'growth_elna_details','growth_skill_open',
  'growth_return','growth_evolution','home_requests'
];
let previous=-1;
for(const id of required){
  const current=main.indexOf(`id:'${id}'`);
  assert.ok(current>previous,`home-front STEP is missing or out of order: ${id}`);
  previous=current;
}
const allRegistered=tutorial.slice(flowStart,tutorial.indexOf("document.addEventListener('click'",flowStart));
const ids=[...allRegistered.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);
assert.equal(ids.length,new Set(ids).size,'tutorial STEP IDs must remain globally unique');
assert.ok(ids.length>=110,'the reduced prologue and optional feature guides must remain registered');

assert.match(main,/id:'home_party'[^\n]+target:'#homePartyEditButton'[^\n]+advanceOnTarget:true/);
assert.match(main,/id:'party_save'[^\n]+target:'#partySetupSaveButton'[^\n]+externalAdvance:true/);
assert.match(main,/id:'home_dex_open'[^\n]+screenId:'home'[^\n]+target:'\[data-nav="more"\]'[^\n]+advanceOnTarget:true/,'the home STEP must lead through the always-visible mobile menu');
assert.match(main,/id:'menu_dex_open'[^\n]+screenId:'moreMenu'[^\n]+target:'#homeDexButton'[^\n]+advanceOnTarget:true/,'the Dex button must be targeted only after opening the menu');
assert.match(main,/id:'dex_elna_open'[^\n]+data-tutorial-character="elna_beginner"/);
assert.match(main,/id:'dex_freigal'[^\n]+data-tutorial-monster="freigal"/);
assert.ok(main.includes('フレイガルとアクアロンはモンスター図鑑へ記録される'));
assert.match(main,/id:'growth_skill_open'[^\n]+data-tutorial-skill-edit/);
assert.match(main,/id:'growth_evolution'[^\n]+target:'#growthEvolutionButton'/);
assert.match(main,/id:'home_requests'[^\n]+persistAs:'home_requests'[^\n]+advanceOnTarget:true/,'Phase 10 must continue from the durable request checkpoint through a real action');
assert.ok(main.includes('ここを押すと、冒険へ連れていく仲間を編成できるぞ！'));
assert.ok(main.includes('ここを押すと、出会った仲間の記録を確認できるぞ！'));
assert.ok(main.includes('ここを押すと、仲間の育成や技を確認できるぞ！'));
assert.ok(!main.includes('カナタ'),'Kanata must not appear in the prologue');
assert.ok(tutorial.includes('function ensureTutorialTargetVisible')&&tutorial.includes("block:'center'"),'off-screen mobile targets must be scrolled into view before placement');

for(const token of ['id="homeDexButton"','id="partySetupSaveButton"','id="characterDexBackButton"','id="growthEvolutionButton"']){
  assert.ok(index.includes(token),`missing stable tutorial control: ${token}`);
}
assert.ok(dex.includes("id:'dexHubMonsterButton'")&&dex.includes("id:'dexHubCharacterButton'"));
assert.ok(dex.includes('data-tutorial-monster=')&&dex.includes("'freigal','aquaron'"));
assert.ok(dex.includes('data-tutorial-character=')&&dex.includes("m.id==='elna_beginner'"));
assert.ok(party.includes('data-tutorial-skill-edit'));
assert.ok(index.includes('js/party.js?v=golden-land-release-1-fixed-hunt-1-tutorial-phase4c-1-prologue-home-front-1'));
assert.ok(index.includes('js/dex.js?v=monster-obtain-2-prologue-home-front-1'));
assert.ok(index.includes('js/tutorial.js?v=prologue-rescue-stability-1-prologue-elna-contract-1-prologue-home-front-1'));

const helperStart=tutorial.indexOf('function tutorialOwnedStarterInstance');
const helperEnd=tutorial.indexOf('function tutorialElnaContractInstance',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart);
const notices=[];
const helperContext=vm.createContext({
  tutorialUiState:{active:true},step:'party_save',advanced:0,
  TUTORIAL_STARTER_CONTRACT_IDS:['freigal','aquaron'],
  by:id=>({
    freigal:{id:'freigal',evolution:'freiwolf'},freiwolf:{id:'freiwolf'},
    aquaron:{id:'aquaron',evolution:'highaquaron'},highaquaron:{id:'highaquaron',evolutions:[{to:'shenhairon'},{to:'tienhairon'}]},
    shenhairon:{id:'shenhairon'},tienhairon:{id:'tienhairon'}
  })[id]||null,
  tutorialCurrentStepId:()=>helperContext.step,
  currentTutorialState:()=>({replaying:false}),
  getPartyInstances:()=>[],
  showUiNotice:message=>notices.push(message),
  tutorialNext:completed=>{if(completed)helperContext.advanced++;}
});
vm.runInContext(tutorial.slice(helperStart,helperEnd),helperContext);
helperContext.ready=[
  {uid:'f',id:'freigal'},{uid:'a',id:'aquaron'},{uid:'e',id:'elna_beginner'}
];
helperContext.bad=[{uid:'f',id:'freigal'},{uid:'a',id:'aquaron'}];
assert.equal(vm.runInContext('tutorialInitialPartyReady(ready)',helperContext),true);
helperContext.evolved=[
  {uid:'f',id:'freiwolf',tutorialContract:true},{uid:'a',id:'highaquaron',tutorialContract:true},{uid:'e',id:'elna_beginner'}
];
helperContext.branched=[
  {uid:'f',id:'freiwolf',tutorialContract:true},{uid:'a',id:'tienhairon',tutorialContract:true},{uid:'e',id:'elna_beginner'}
];
assert.equal(vm.runInContext('tutorialInitialPartyReady(evolved)',helperContext),true,'the first evolutions must remain valid starter bodies');
assert.equal(vm.runInContext('tutorialInitialPartyReady(branched)',helperContext),true,'a branched Aquaron evolution must remain valid');
assert.equal(vm.runInContext('tutorialInitialPartyReady(bad)',helperContext),false);
assert.equal(vm.runInContext('canConfirmTutorialParty(bad)',helperContext),false);
assert.equal(notices.length,1,'an incomplete first party must show one warning');
assert.equal(vm.runInContext('canConfirmTutorialParty(ready)',helperContext),true);
assert.equal(vm.runInContext('handleTutorialPartySaved()',helperContext),true);
assert.equal(helperContext.advanced,1,'successful party save must advance exactly once');

const saveStart=party.indexOf('function savePartySetup');
assert.ok(saveStart>=0);
function makeSaveContext({valid=true,saveSucceeds=true,tutorialAccepts=true,tutorialHandles=true}={}){
  const context=vm.createContext({
    party:valid?[{uid:'f'},{uid:'a'},{uid:'e'}]:[],
    saves:0,renders:0,shown:[],notices:[],
    getPartyInstances:()=>context.party,
    canConfirmTutorialParty:()=>tutorialAccepts,
    saveGame:()=>{context.saves++;return saveSucceeds;},
    renderPartySetup:()=>context.renders++,
    handleTutorialPartySaved:()=>tutorialHandles,
    show:id=>context.shown.push(id),
    showUiNotice:message=>context.notices.push(message)
  });
  vm.runInContext(party.slice(saveStart),context);
  return context;
}
const saved=makeSaveContext();
assert.equal(vm.runInContext('savePartySetup()',saved),true);
assert.equal(saved.saves,1);
assert.equal(saved.renders,1);
assert.deepEqual(saved.shown,[],'tutorial-owned save must let the STEP engine choose the next screen');
const rejected=makeSaveContext({tutorialAccepts:false});
assert.equal(vm.runInContext('savePartySetup()',rejected),false);
assert.equal(rejected.saves,0);
const failed=makeSaveContext({saveSucceeds:false});
assert.equal(vm.runInContext('savePartySetup()',failed),false);
assert.equal(failed.renders,0);
const normal=makeSaveContext({tutorialHandles:false});
assert.equal(vm.runInContext('savePartySetup()',normal),true);
assert.deepEqual([...normal.shown],['home'],'normal party save must return home');

assert.equal(packageJson.scripts['check:prologue-home-front'],'node scripts/test-prologue-home-front.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-home-front'));

console.log('Prologue home-front validation passed (party save, Elna character dex, Freigal/Aquaron monster dex, growth, skills, evolution, short Gnosis guidance, and Phase 10 checkpoint).');
