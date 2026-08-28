import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const items=read('js/items.js');
const party=read('js/party.js');
const animation=read('js/contract-animation.js');
const saveSource=read('js/save.js');
const notices=read('js/notices-data.js');
const index=read('index.html');

assert.match(saveSource,/const SAVE_KEY = 'mb_v95c'/,'the established save key must not change');
assert.ok(tutorial.includes("Object.freeze({mapId:'grassland',enemyId:'slime',difficultyId:'easy'})"),'the guaranteed target must be the existing grassland Slime');
assert.ok(tutorial.includes("save.saveMeta.migrations.includes('v3_to_v4_tutorial_state')"),'migrated existing saves must be excluded explicitly');
assert.ok(tutorial.includes("tutorial.status!=='in_progress'||tutorial.completed||tutorial.skipped"),'only an active, unskipped required tutorial may use the guarantee');
assert.ok(tutorial.includes("!['first_contract','contract_confirm'].includes(tutorial.stepId)"),'the guarantee must be restricted to the first-contract checkpoint');
assert.ok(tutorial.includes('tutorial.firstContractGuaranteeUsed||tutorial.starterContractScrollGranted'),'both once-only flags must block retries');
assert.ok(tutorial.includes("itemId==='contract_scroll'"),'only the normal contract scroll may receive the guarantee');

const helperStart=tutorial.indexOf('function tutorialFirstContractMode');
const helperEnd=tutorial.indexOf('function prepareTutorialStep',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart,'first-contract helpers must be present');
const freshSave=()=>({
  saveMeta:{migrations:[]},
  items:{contract_scroll:2},instances:[],caught:[],contractorExp:0,
  progress:{tutorial:{status:'in_progress',stepId:'first_contract',completed:false,skipped:false,replaying:false,firstContractGuaranteeUsed:false,starterContractScrollGranted:false}}
});
const context=vm.createContext({
  TUTORIAL_FIRST_HUNT:{mapId:'grassland',enemyId:'slime',difficultyId:'easy'},
  save:freshSave(),enemy:{id:'slime'},selectedMap:{id:'grassland'},saveOk:true,saveCalls:0,
  currentTutorialState:()=>context.save.progress.tutorial,
  ensureContractScrollItem:()=>{context.save.items??={};context.save.items.contract_scroll??=0;},
  markTutorialStarterContractScrollGranted:()=>{const state=context.save.progress.tutorial;if(state.starterContractScrollGranted)return false;state.starterContractScrollGranted=true;return true;},
  markTutorialFirstContractGuaranteeUsed:()=>{const state=context.save.progress.tutorial;if(state.firstContractGuaranteeUsed)return false;state.firstContractGuaranteeUsed=true;return true;},
  addInstance:id=>{const instance={uid:`tutorial_${context.save.instances.length+1}`,id,level:1,exp:0};context.save.instances.push(instance);if(!context.save.caught.includes(id))context.save.caught.push(id);return instance;},
  grantContractorContractSuccess:()=>{context.save.contractorExp+=1;},
  setTutorialStep:stepId=>{context.save.progress.tutorial.stepId=stepId;},
  saveGame:()=>{context.saveCalls+=1;if(!context.saveOk)context.save.saveMeta.lastSavedAt='failed-write';return context.saveOk;}
});
vm.runInContext(tutorial.slice(helperStart,helperEnd),context);
const evaluate=code=>vm.runInContext(code,context);

assert.equal(evaluate("shouldGuaranteeTutorialContract({id:'slime'},'contract_scroll')"),true,'fresh required tutorial must qualify');
assert.equal(evaluate("shouldGuaranteeTutorialContract({id:'other'},'contract_scroll')"),false,'another monster must not qualify');
assert.equal(evaluate("shouldGuaranteeTutorialContract({id:'slime'},'silver_contract_scroll')"),false,'another scroll must not qualify');
context.selectedMap={id:'volcano'};
assert.equal(evaluate("shouldGuaranteeTutorialContract({id:'slime'},'contract_scroll')"),false,'another map must not qualify');
context.selectedMap={id:'grassland'};
context.save.saveMeta.migrations=['v3_to_v4_tutorial_state'];
assert.equal(evaluate("shouldGuaranteeTutorialContract({id:'slime'},'contract_scroll')"),false,'an existing migrated save must never qualify');
context.save.saveMeta.migrations=[];
context.save.progress.tutorial.replaying=true;
assert.equal(evaluate("tutorialFirstContractMode()"),'replay','replay must use a reward-free branch');
assert.equal(evaluate("shouldGuaranteeTutorialContract({id:'slime'},'contract_scroll')"),false,'replay must never restore the guarantee');

context.save=freshSave();context.saveOk=true;context.saveCalls=0;
const joined=evaluate("commitTutorialFirstContract('contract_scroll',{id:'slime'})");
assert.equal(joined.id,'slime','the Slime must join');
assert.equal(context.save.items.contract_scroll,2,'one granted normal scroll must be consumed in the same transaction');
assert.equal(context.save.instances.length,1,'exactly one instance must join');
assert.deepEqual(context.save.caught,['slime'],'the existing caught ID must be registered');
assert.equal(context.save.progress.tutorial.starterContractScrollGranted,true,'the one-time grant must be persisted');
assert.equal(context.save.progress.tutorial.firstContractGuaranteeUsed,true,'the one-time guarantee must be persisted');
assert.equal(context.save.progress.tutorial.stepId,'contract_success','reload must resume after the committed contract');
assert.equal(context.save.contractorExp,1,'normal contract-success progression must still be awarded');
assert.equal(context.saveCalls,1,'grant, consumption, join, flags, and checkpoint must use one save');
assert.equal(evaluate("commitTutorialFirstContract('contract_scroll',{id:'slime'})"),null,'a second attempt must be rejected');
assert.equal(context.save.instances.length,1,'a reload or duplicate event must not add another Slime');
assert.equal(context.save.items.contract_scroll,2,'a duplicate event must not change scroll stock');

context.save=freshSave();context.saveOk=false;context.saveCalls=0;
const beforeFailure=JSON.stringify(context.save);
assert.equal(evaluate("commitTutorialFirstContract('contract_scroll',{id:'slime'})"),null,'a failed durable save must abort the contract');
assert.equal(JSON.stringify(context.save),beforeFailure,'a failed durable save must roll back grant, use, join, progression, and flags');
assert.equal(context.saveCalls,1,'the failed atomic write must not be retried invisibly');

assert.ok(items.includes('const animationStage = guaranteed?3:contractAnimationStage(roll, rate)'),'the tutorial success must enter the established successful animation path');
assert.ok(items.includes("commitTutorialFirstContract(itemId,enemy)"),'confirmation must use the atomic tutorial transaction');
assert.ok(items.includes("show('contractConfirm')")&&items.includes('契約状態を保存できませんでした'),'a failed transaction must remain safely retryable');
assert.ok(animation.includes('const zoomLevels = [1.16, 1.32, 1.48]')&&animation.includes("paper.classList.add('is-stamping')"),'the existing three zoom pulses and paw-stamp success animation must remain in use');
assert.ok(tutorial.includes("externalAdvance:true,title:'契約を確定'")&&tutorial.includes('if(step?.externalAdvance)return'),'the guide must not advance before confirmation commits');

const orderedSteps=['first_contract','contract_confirm','contract_success','contract_card','contract_type','contract_skills','contract_list','contract_future','growth_open','growth_overview','party_edit_open','party_edit_contract','home_finish','tutorial_complete'];
let previous=-1;
orderedSteps.forEach(id=>{const current=tutorial.indexOf(`id:'${id}'`);assert.ok(current>previous,`missing or out-of-order Phase 4C step: ${id}`);previous=current;});
assert.ok(tutorial.includes("replayNextStepId:'contract_success'"),'replay must bypass the real contract transaction');
assert.ok(tutorial.includes('必ず成功するのは今回だけです')&&tutorial.includes('失敗することがあります'),'later contracts must be explained as fallible');
assert.ok(tutorial.includes("target:'#growthMonsterButton'")&&tutorial.includes("target:'#growthPartyEditButton'"),'growth and party editing must use their real controls');
assert.ok(tutorial.includes("id:'tutorial_complete',screenId:'home'")&&tutorial.includes('completeTutorial()'),'the required tutorial must finish on home');
assert.ok(party.includes('data-tutorial-contract-instance="true"')&&party.includes('data-tutorial-contract-party="true"'),'the joined instance must be addressable in roster and party setup without changing its ID');
['growthMonsterButton','growthPartyEditButton','contractConfirmAcceptButton'].forEach(id=>assert.ok(index.includes(`id="${id}"`),`missing real UI anchor: #${id}`));
assert.ok(notices.includes("id: '20260829-tutorial-first-contract'"),'the player-facing update must have a stable notice ID');

console.log('Tutorial Phase 4C validation passed (new-save-only guarantee, atomic grant/use/join/save, reload and rollback safety, existing animation, growth guide, replay, and completion).');
