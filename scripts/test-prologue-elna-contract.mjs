import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const tutorial=read('js/tutorial.js');
const contractAnimation=read('js/contract-animation.js');
const packageJson=JSON.parse(read('package.json'));

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
const mainFlow=tutorial.slice(flowStart,flowEnd);
const requiredOrder=['elna_rescue_complete','elna_contract_intro','elna_contract_consent','elna_contract_execute','elna_contract_departure','elna_contract_body'];
let previous=-1;
for(const id of requiredOrder){
  const current=mainFlow.indexOf(`id:'${id}'`);
  assert.ok(current>previous,`Elna contract STEP is missing or out of order: ${id}`);
  previous=current;
}
assert.ok(mainFlow.includes("text:'契約！ 契約を貰って！'"),'the accepted Gnosis line must be exact');
assert.match(mainFlow,/id:'elna_contract_consent'[^\n]+speaker:'エルナ'/,'Elna herself must consent before the contract');
assert.match(mainFlow,/id:'elna_contract_execute'[^\n]+input:'elna_contract'[^\n]+nextLabel:'契約する'/,'contract animation must start from an explicit player action');
assert.match(mainFlow,/id:'elna_contract_body'[^\n]+persistAs:'home_party'[^\n]+nextStepId:'home_party'/,'the completed contract must continue directly into the home tutorial');
assert.ok(tutorial.includes("stage:3"),'the Elna contract must always use the three-pulse success animation');
assert.ok(contractAnimation.includes('const zoomLevels = [1.16, 1.32, 1.48]'),'the shared contract animation must contain three zoom levels');
assert.ok(contractAnimation.includes("if (pulseCount === 3)")&&contractAnimation.includes("paper.classList.add('is-stamping')"),'three zooms must end in the handprint stamp');
assert.ok(tutorial.includes("tutorialRole:'person'"),'the person guest descriptor must have its own data role');
assert.ok(tutorial.includes("tutorialRole:'contract_body'"),'the persistent contract body must have its own data role');
assert.ok(!mainFlow.includes('カナタ'),'Kanata must not appear in the prologue');

const fnStart=tutorial.indexOf('function tutorialElnaContractInstance');
const fnEnd=tutorial.indexOf('async function confirmTutorialElnaContract',fnStart);
assert.ok(fnStart>=0&&fnEnd>fnStart,'Elna contract transaction is missing');
function makeContext({saveSucceeds=true,replaying=false,existingElna=false}={}){
  let serial=0;
  const save={
    instances:[
      {uid:'freigal-1',id:'freigal'},
      {uid:'aquaron-1',id:'aquaron'},
      ...(existingElna?[{uid:'elna-existing',id:'elna_beginner'}]:[])
    ],
    party:['freigal-1','aquaron-1'],
    progress:{tutorial:{replaying,elnaGuestActive:true,elnaContractGranted:existingElna,stepId:'elna_contract_execute'}}
  };
  const context=vm.createContext({
    console:{error(){}},JSON,
    save,
    TUTORIAL_STARTER_CONTRACT_IDS:['freigal','aquaron']
  });
  context.currentTutorialState=()=>context.save.progress.tutorial;
  context.tutorialOwnedStarterInstance=id=>context.save.instances.find(entry=>entry.id===id)||null;
  context.addInstance=(id,level,exp,extra)=>{const instance={uid:`new-${++serial}`,id,level,exp,...extra};context.save.instances.push(instance);return instance;};
  context.markTutorialElnaContractGranted=()=>{const state=context.save.progress.tutorial;if(state.elnaContractGranted)return false;state.elnaContractGranted=true;return true;};
  context.setTutorialElnaGuestActive=active=>{context.save.progress.tutorial.elnaGuestActive=active===true;};
  context.setTutorialStep=stepId=>{context.save.progress.tutorial.stepId=stepId;};
  context.saveGame=()=>saveSucceeds;
  context.updateParty=()=>{};context.renderParty=()=>{};context.renderDex=()=>{};context.showUiNotice=()=>{};
  vm.runInContext(tutorial.slice(fnStart,fnEnd),context);
  return context;
}
const context=makeContext();
context.result=vm.runInContext('commitTutorialElnaContract()',context);
assert.ok(context.result&&!context.result.replay);
assert.equal(context.save.instances.filter(entry=>entry.id==='elna_beginner').length,1);
assert.equal(context.save.instances.find(entry=>entry.id==='elna_beginner').tutorialRole,'contract_body');
assert.deepEqual([...context.save.party],['freigal-1','aquaron-1','new-1']);
assert.equal(context.save.progress.tutorial.elnaGuestActive,false);
assert.equal(context.save.progress.tutorial.elnaContractGranted,true);
assert.equal(context.save.progress.tutorial.stepId,'elna_contract_departure','reload during the animation must resume after the already-saved contract');

context.second=vm.runInContext('commitTutorialElnaContract()',context);
assert.ok(context.second);
assert.equal(context.save.instances.filter(entry=>entry.id==='elna_beginner').length,1,'re-entry must not duplicate Elna');
assert.deepEqual([...context.save.party],['freigal-1','aquaron-1','new-1']);

const existing=makeContext({existingElna:true});
vm.runInContext('commitTutorialElnaContract()',existing);
assert.equal(existing.save.instances.filter(entry=>entry.id==='elna_beginner').length,1,'an existing Elna must be reused');
assert.equal(existing.save.instances.find(entry=>entry.id==='elna_beginner').tutorialRole,'contract_body');

const failed=makeContext({saveSucceeds:false});
vm.runInContext('commitTutorialElnaContract()',failed);
assert.equal(failed.save.instances.some(entry=>entry.id==='elna_beginner'),false,'failed persistence must roll back the contract body');
assert.deepEqual([...failed.save.party],['freigal-1','aquaron-1']);
assert.equal(failed.save.progress.tutorial.elnaGuestActive,true);
assert.equal(failed.save.progress.tutorial.elnaContractGranted,false);

const replay=makeContext({replaying:true});
replay.result=vm.runInContext('commitTutorialElnaContract()',replay);
assert.equal(replay.result.replay,true);
assert.equal(replay.save.instances.some(entry=>entry.id==='elna_beginner'),false,'replay must not grant rewards');
assert.equal(replay.save.progress.tutorial.elnaGuestActive,true,'replay must not mutate the live guest flag');

assert.ok(index.includes('js/tutorial.js?v=prologue-rescue-stability-1-prologue-elna-contract-1'));
assert.equal(packageJson.scripts['check:prologue-elna-contract'],'node scripts/test-prologue-elna-contract.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-elna-contract'));

console.log('Prologue Elna contract validation passed (dialogue, consent, three zooms, handprint, atomic grant, guest departure, role separation, party, replay, and rollback).');
