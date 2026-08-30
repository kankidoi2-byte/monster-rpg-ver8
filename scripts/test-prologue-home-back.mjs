import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const index=read('index.html');
const uiCss=read('css/ui-redesign.css');
const packageJson=JSON.parse(read('package.json'));

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
const main=tutorial.slice(flowStart,flowEnd);
const required=[
  'home_requests','request_accept','request_reward_claim','request_reward_received','stella_intro'
];
let previous=-1;
for(const id of required){
  const current=main.indexOf(`id:'${id}'`);
  assert.ok(current>previous,`home-back STEP is missing or out of order: ${id}`);
  previous=current;
}
assert.match(main,/id:'home_requests'[^\n]+target:'#homeAdventureButton'[^\n]+advanceOnTarget:true/);
assert.match(main,/id:'request_accept'[^\n]+data-tutorial-request-open[^\n]+externalAdvance:true/);
assert.match(main,/id:'request_reward_claim'[^\n]+target:'#tutorialRequestClaimButton'[^\n]+externalAdvance:true[^\n]+disableBack:true/);
assert.match(main,/id:'request_reward_received'[^\n]+persistAs:'stella_intro'[^\n]+nextStepId:'stella_intro'/);
assert.ok(main.includes('ここを押すと、討伐依頼と報酬を確認できるぞ！'));
assert.ok(main.includes('このボタンを押して、報告と報酬の確認へ進もう！'));
assert.ok(main.includes('報酬はコイン250枚と錬成素材4種類だ'));
assert.ok(!main.includes('カナタ'),'Kanata must not appear in the prologue');

for(const token of [
  'id="tutorialRequestReport"','id="tutorialRequestReportCard"','id="tutorialRequestRewardList"',
  'id="tutorialRequestRewardStatus"','id="tutorialRequestClaimButton"'
]) assert.ok(index.includes(token),`missing request reward UI: ${token}`);
assert.ok(index.includes('js/tutorial.js?v=prologue-rescue-stability-1-prologue-elna-contract-1-prologue-home-front-1-prologue-home-back-1-prologue-stella-intro-1'));
assert.ok(tutorial.includes('data-tutorial-request-report'));
assert.ok(tutorial.includes('data-tutorial-request-open'));
assert.ok(tutorial.includes('tutorial-request-summary'),'the prologue request heading must use normal document flow');
assert.ok(!/data-tutorial-request-report>[\s\S]{0,500}hunt-card-title/.test(tutorial),'the prologue request must not reuse the absolutely positioned hunt image caption');
assert.match(uiCss,/\.tutorial-request-summary\{[^}]*display:grid/,'the prologue request summary must remain in normal layout flow');
assert.match(uiCss,/\.tutorial-request-card \.hunt-accept-button\{[^}]*white-space:normal/,'the report button label must wrap instead of overlapping adjacent content');
assert.match(tutorial,/coins:250/);
for(const id of ['monster_bone','magic_crystal','metal_ore','unstable_alchemy_matter']){
  assert.ok(tutorial.includes(`'${id}'`),`missing guaranteed alchemy material: ${id}`);
}
assert.ok(tutorial.includes("markTutorialAlchemySuppliesGranted()"));
assert.ok(tutorial.includes("setTutorialStep('request_reward_received')"));

const constantStart=tutorial.indexOf('const TUTORIAL_ALCHEMY_SUPPLY_REWARD');
const constantEnd=tutorial.indexOf('const TUTORIAL_TRANSITIONS',constantStart);
const helperStart=tutorial.indexOf('function tutorialSupplyRewardMaterialEntries');
const helperEnd=tutorial.indexOf('function tutorialFirstHuntIsPending',helperStart);
assert.ok(constantStart>=0&&constantEnd>constantStart&&helperStart>=0&&helperEnd>helperStart);
const helperSource=`${tutorial.slice(constantStart,constantEnd)}\n${tutorial.slice(helperStart,helperEnd)}`;
const materialIds=['monster_bone','magic_crystal','metal_ore','unstable_alchemy_matter'];
function makeContext({saveSucceeds=true,replaying=false,alreadyGranted=false}={}){
  const context=vm.createContext({
    console:{error:()=>{}},
    save:{coins:10,items:Object.fromEntries(materialIds.map(id=>[id,0])),progress:{tutorial:{status:'in_progress',stepId:'request_reward_claim',replaying,alchemySuppliesGranted:alreadyGranted}}},
    ITEM_BY_ID:Object.fromEntries(materialIds.map(id=>[id,{id,name:id,alchemyMaterial:true}])),
    dex:[],saves:0,updates:0,notices:[],
    currentTutorialState:()=>context.save.progress.tutorial,
    ensureContractScrollItem:()=>{},
    registerItemDex:id=>{context.dex.push(id);return true;},
    markTutorialAlchemySuppliesGranted:()=>{
      const state=context.save.progress.tutorial;
      if(state.alchemySuppliesGranted)return false;
      state.alchemySuppliesGranted=true;
      return true;
    },
    setTutorialStep:id=>{context.save.progress.tutorial.stepId=id;},
    saveGame:()=>{context.saves++;return saveSucceeds;},
    updateItems:()=>context.updates++,updateAppResourceBar:()=>context.updates++,
    showUiNotice:message=>context.notices.push(message),
    document:{getElementById:()=>null},tutorialCurrentStepId:()=>null,
    tutorialSupplyRewardBusy:false,tutorialUiState:{active:false},updateTutorialMenuSummary:()=>{},tutorialNext:()=>{}
  });
  vm.runInContext(helperSource,context);
  return context;
}

const granted=makeContext();
let result=vm.runInContext('commitTutorialAlchemySupplyReward()',granted);
assert.equal(result.granted,true);assert.equal(result.replay,false);
assert.equal(granted.save.coins,260);
for(const id of materialIds)assert.equal(granted.save.items[id],1);
assert.equal(granted.save.progress.tutorial.alchemySuppliesGranted,true);
assert.equal(granted.save.progress.tutorial.stepId,'request_reward_received');
assert.equal(granted.saves,1);
assert.deepEqual(granted.dex,materialIds);
result=vm.runInContext('commitTutorialAlchemySupplyReward()',granted);
assert.equal(result.granted,false);assert.equal(result.replay,false);
assert.equal(granted.save.coins,260,'a repeated claim must not grant more coins');
for(const id of materialIds)assert.equal(granted.save.items[id],1,'a repeated claim must not grant duplicate materials');

const failed=makeContext({saveSucceeds:false});
assert.equal(vm.runInContext('commitTutorialAlchemySupplyReward()',failed),null);
assert.equal(failed.save.coins,10,'failed persistence must roll back coins');
for(const id of materialIds)assert.equal(failed.save.items[id],0,'failed persistence must roll back materials');
assert.equal(failed.save.progress.tutorial.alchemySuppliesGranted,false);
assert.equal(failed.notices.length,1);

const replay=makeContext({replaying:true,alreadyGranted:true});
result=vm.runInContext('commitTutorialAlchemySupplyReward()',replay);
assert.equal(result.granted,false);assert.equal(result.replay,true);
assert.equal(replay.save.coins,10,'replay must not grant coins');
assert.equal(replay.saves,0,'replay must not rewrite the reward save');

assert.equal(packageJson.scripts['check:prologue-home-back'],'node scripts/test-prologue-home-back.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-home-back'));

console.log('Prologue home-back validation passed (request report, one-time alchemy supply reward, rollback, replay safety, and Stella checkpoint).');
