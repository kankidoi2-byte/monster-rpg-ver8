import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const tutorial=read('js/tutorial.js');
const tutorialCss=read('css/tutorial.css');
const packageJson=JSON.parse(read('package.json'));
const allRuntimeSource=['index.html',...fs.readdirSync(new URL('../js/',import.meta.url)).filter(file=>file.endsWith('.js')).map(file=>`js/${file}`)]
  .map(read).join('\n');

const requiredScreens=[
  'home','partySet','battleChoices','battle','contractConfirm','party','growthHub','alchemy','expedition',
  'fusion','evolution','skillEdit','skillGacha','dexHub','shop','battleItemSelect','contractorRank','contractorTitles'
];
requiredScreens.forEach(id=>assert.ok(index.includes(`id="${id}"`),`integrated tutorial screen is missing: #${id}`));

const registeredFlowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const listenerStart=tutorial.indexOf("document.addEventListener('click'",registeredFlowStart);
assert.ok(registeredFlowStart>=0&&listenerStart>registeredFlowStart,'registered tutorial flows are missing');
const registeredFlows=tutorial.slice(registeredFlowStart,listenerStart);
const stepIds=[...registeredFlows.matchAll(/\{id:'([^']+)'/g)].map(match=>match[1]);
assert.equal(new Set(stepIds).size,stepIds.length,'tutorial step IDs must remain globally unique');

const screenIds=[...registeredFlows.matchAll(/screenId:'([^']+)'/g)].map(match=>match[1]);
screenIds.forEach(id=>assert.ok(index.includes(`id="${id}"`),`tutorial step points to a missing screen: #${id}`));

const selectorTokens=selector=>selector
  .split(/\s+/)
  .map(token=>token.replace(/^#|^\./,'').replace(/^\[|\]$/g,'').split(/[=~^$*|]/)[0].replace(/["']/g,''))
  .filter(Boolean);
const targets=[...registeredFlows.matchAll(/target:'([^']+)'/g)].map(match=>match[1]);
targets.forEach(selector=>{
  selectorTokens(selector).forEach(token=>assert.ok(allRuntimeSource.includes(token),`tutorial target contract is missing from runtime source: ${selector} (${token})`));
});

const mainFlow=registeredFlows.slice(0,registeredFlows.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID'));
const requiredMainOrder=[
  'intro_gnosis','party_choose','home_adventure','first_hunt','battle_enemy','battle_skill','battle_free',
  'victory_exp','victory_coin','victory_material','victory_rank','first_contract','contract_confirm',
  'contract_success','contract_future','growth_open','party_edit_open','home_finish','tutorial_complete'
];
let previousIndex=-1;
requiredMainOrder.forEach(id=>{
  const indexOfStep=mainFlow.indexOf(`id:'${id}'`);
  assert.ok(indexOfStep>previousIndex,`required onboarding checkpoint is missing or out of order: ${id}`);
  previousIndex=indexOfStep;
});
assert.ok(mainFlow.includes("persistAs:'first_hunt'")&&mainFlow.includes("persistAs:'first_contract'"),'battle reload checkpoints must remain durable');
assert.ok(mainFlow.includes("waitForEvent:'battle_outcome'")&&mainFlow.includes("externalAdvance:true"),'battle and contract flows must wait for real gameplay outcomes');

const expectedPhaseChecks=['tutorial','tutorial-ui','tutorial-phase4a','tutorial-phase4b','tutorial-phase4c','tutorial-phase5a','tutorial-phase5b','tutorial-phase6'];
expectedPhaseChecks.forEach(name=>{
  assert.ok(packageJson.scripts[`check:${name}`],`missing tutorial check command: check:${name}`);
  assert.ok(packageJson.scripts.check.includes(`npm run check:${name}`),`npm run check does not include check:${name}`);
});
const requiredRegressionChecks=['save','post-battle-contract','three-way','alchemy','expedition','golden-land','contractor-rank-events','ui-contract'];
requiredRegressionChecks.forEach(name=>assert.ok(packageJson.scripts.check.includes(`npm run check:${name}`),`integrated regression check is missing: ${name}`));

const saveFullSource=read('js/save.js');
const saveSource=saveFullSource.slice(0,saveFullSource.indexOf('/* Ver7.8:'));
const storage=new Map();
const saveContext=vm.createContext({
  console,Date,JSON,Math,MAX_LEVEL:100,
  clampLevel:value=>Math.min(100,Math.max(1,Math.floor(Number(value)||1))),
  isMaxLevel:value=>Number(value)>=100,
  M:[{id:'elna_beginner'},{id:'freigal'},{id:'aquaron'},{id:'grassbeat'},{id:'volteck'},{id:'slime'}],
  MAPS:[{id:'grassland'}],
  localStorage:{
    getItem:key=>storage.has(key)?storage.get(key):null,
    setItem:(key,value)=>storage.set(key,String(value)),
    removeItem:key=>storage.delete(key)
  },
  confirm:()=>false,alert:()=>{}
});
vm.runInContext(saveSource,saveContext);
const evaluate=expression=>vm.runInContext(expression,saveContext);
const plain=value=>JSON.parse(JSON.stringify(value));
evaluate('save=initSave()');
evaluate("setTutorialStep('first_contract')");
['threeWay','invasion','kokoroLink','alchemy','expedition','evolutionFusion','skillCards','goldenLand','dex','shopItems','contractorRank']
  .forEach(id=>assert.equal(evaluate(`markTutorialGuideSeen('${id}')`),true,`could not persist guide: ${id}`));
assert.equal(evaluate('markTutorialStarterContractScrollGranted()'),true);
assert.equal(evaluate('markTutorialFirstContractGuaranteeUsed()'),true);
saveContext.roundTrip=plain(evaluate('save'));
evaluate('save=parseAndPrepareSave(JSON.stringify(roundTrip),[])');
assert.equal(evaluate('save.progress.tutorial.stepId'),'first_contract','reload must preserve the required tutorial checkpoint');
assert.ok(plain(evaluate('save.progress.tutorial.guides'))&&Object.values(plain(evaluate('save.progress.tutorial.guides'))).every(Boolean),'reload must preserve every feature-guide read flag');
assert.equal(evaluate('markTutorialStarterContractScrollGranted()'),false,'reload must not re-grant the tutorial contract scroll');
assert.equal(evaluate('markTutorialFirstContractGuaranteeUsed()'),false,'reload must not restore the guaranteed contract');

saveContext.legacyRaw=JSON.stringify({schemaVersion:3,saveMeta:{migrations:[]},progress:{tutorial:{status:'not_started'}}});
const legacy=plain(evaluate('parseAndPrepareSave(legacyRaw,[])'));
assert.equal(legacy.progress.tutorial.status,'completed','existing saves must not be forced into onboarding after integrated migration');
assert.equal(legacy.progress.tutorial.firstContractGuaranteeUsed,true,'existing saves must not gain the tutorial guarantee');
assert.equal(legacy.progress.tutorial.starterContractScrollGranted,true,'existing saves must not gain a tutorial scroll');

const placementStart=tutorial.indexOf('function calculateTutorialPlacement');
const placementEnd=tutorial.indexOf('function setTutorialShadeRect',placementStart);
const placementContext=vm.createContext({});
vm.runInContext(tutorial.slice(placementStart,placementEnd),placementContext);
const place=(target,bubble,viewport)=>{
  placementContext.target=target;placementContext.bubble=bubble;placementContext.viewport=viewport;
  return vm.runInContext('calculateTutorialPlacement(target,bubble,viewport)',placementContext);
};
const viewports=[
  {name:'Android compact portrait',width:360,height:640,bubble:{width:340,height:250}},
  {name:'Android portrait',width:412,height:915,bubble:{width:360,height:270}},
  {name:'Chromebook landscape',width:1366,height:768,bubble:{width:360,height:270}}
];
for(const sample of viewports){
  const targetsForViewport=[
    {top:64,bottom:154,left:16,right:sample.width-16,width:sample.width-32,height:90},
    {top:Math.round(sample.height*.42),bottom:Math.round(sample.height*.56),left:24,right:sample.width-24,width:sample.width-48,height:Math.round(sample.height*.14)},
    {top:sample.height-112,bottom:sample.height-58,left:12,right:sample.width-12,width:sample.width-24,height:54},
    null
  ];
  for(const target of targetsForViewport){
    const result=place(target,sample.bubble,{width:sample.width,height:sample.height});
    const renderedWidth=Math.min(sample.bubble.width,sample.width-20);
    const renderedHeight=Math.min(sample.bubble.height,result.maxHeight);
    assert.ok(result.left>=0&&result.left+renderedWidth<=sample.width,`${sample.name}: bubble exceeds horizontal viewport`);
    assert.ok(result.top>=0&&result.top+renderedHeight<=sample.height,`${sample.name}: bubble exceeds vertical viewport`);
    if(target&&result.side==='below')assert.ok(result.top>=target.bottom,`${sample.name}: below bubble covers its target`);
    if(target&&result.side==='above')assert.ok(result.top+renderedHeight<=target.top,`${sample.name}: above bubble covers its target`);
  }
}
assert.match(tutorialCss,/@media\(max-width:480px\)/,'Android compact layout override is missing');
assert.match(tutorialCss,/max-height:calc\(100svh - 20px\)/,'tutorial bubble must stay within the mobile visual viewport');
assert.match(tutorialCss,/touch-action:pan-y/,'tutorial bubble must support Android vertical touch scrolling');
assert.ok(tutorial.includes('function handleTutorialViewportScroll')&&tutorial.includes('bubble.contains(event.target)'),'tutorial bubble scrolling must not restart viewport placement');
assert.match(tutorialCss,/@media\(prefers-reduced-motion:reduce\)/,'reduced-motion fallback is missing');
assert.ok(index.includes('js/tutorial.js?v=tutorial-android-flow-fix-1'),'the integrated tutorial engine cache key is missing');

console.log(`Tutorial Phase 6 integration passed (${stepIds.length} unique steps, ${new Set(screenIds).size} screens, ${targets.length} target contracts, Android/Chromebook placement, save/reload, and full regression wiring).`);
