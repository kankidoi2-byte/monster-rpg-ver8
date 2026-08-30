import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const tutorial=read('js/tutorial.js');
const skills=read('js/skills.js');
const ui=read('js/ui.js');
const index=read('index.html');
const css=read('css/tutorial.css');
const manifest=JSON.parse(read('images/tutorial/characters/manifest.json'));
const packageJson=JSON.parse(read('package.json'));

const portrait=fs.readFileSync(new URL('../images/tutorial/characters/stella_apprentice.png',import.meta.url));
assert.ok(portrait.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Stella portrait must be a decoded PNG');
assert.equal(portrait[25],6,'Stella portrait must retain an RGBA alpha channel');
const stellaAsset=manifest.characters.find(asset=>asset.id==='stella_apprentice');
assert.ok(stellaAsset?.validation?.rgba&&stellaAsset.validation.transparentPixels>0&&stellaAsset.validation.partialAlphaPixels>0,'Stella portrait must contain real transparent and antialiased pixels');

const flowStart=tutorial.indexOf('registerTutorialFlow(TUTORIAL_MAIN_FLOW_ID');
const flowEnd=tutorial.indexOf('registerTutorialFlow(TUTORIAL_HELP_FLOW_ID',flowStart);
const main=tutorial.slice(flowStart,flowEnd);
const required=[
  'stella_intro','stella_encounter','stella_card_receive',
  'stella_skill_open','stella_skill_unequip',
  'stella_skill_equip','stella_attribute_intro','stella_more_open','stella_type_chart_open',
  'stella_type_basic','stella_mock_battle'
];
let previous=-1;
for(const id of required){
  const current=main.indexOf(`id:'${id}'`);
  assert.ok(current>previous,`Stella intro STEP is missing or out of order: ${id}`);
  previous=current;
}
const stellaFlow=main.slice(main.indexOf("id:'stella_intro'"),main.indexOf("id:'lumina_intro'"));
assert.ok(!stellaFlow.includes('カナタ'),'Kanata must not appear in the prologue');
assert.ok(stellaFlow.includes("portrait:'images/tutorial/characters/stella_apprentice.png'"),'Stella dialogue must use the transparent portrait');
assert.ok(stellaFlow.includes("transition:'grant_stella_skill_card'"),'card receipt must use the one-time transition');
assert.match(stellaFlow,/id:'stella_skill_unequip'[^\n]+externalAdvance:true/);
assert.match(stellaFlow,/id:'stella_skill_equip'[^\n]+externalAdvance:true/);
assert.match(stellaFlow,/id:'stella_mock_battle'[^\n]+persistAs:'stella_mock_battle'[^\n]+transition:'start_stella_mock_battle'/);
assert.ok(stellaFlow.includes('カードの属性・威力・COSTを見て、実際に装備しよう！'));
assert.ok(stellaFlow.includes('ここを押して装備しよう！'));

for(const token of [
  'id="tutorialStellaCard"','id="tutorialStellaSkillCardVisual"','id="tutorialStellaSkillCardStatus"',
  'id="tutorialStellaSkillEditButton"','id="typeChartButton"'
])assert.ok(index.includes(token),`missing Stella tutorial UI: ${token}`);
assert.ok(index.includes('js/tutorial.js?v=prologue-rescue-stability-1-prologue-elna-contract-1-prologue-home-front-1-prologue-home-back-1-prologue-stella-intro-1'));
assert.match(css,/tutorial-story-backdrop\[data-scene="academy"\]/);
assert.match(css,/\.tutorial-stella-skill-card\{/);
assert.ok(index.indexOf('tutorialStoryBackdrop')<index.indexOf('tutorialCharacterLayer')&&index.indexOf('tutorialCharacterLayer')<index.indexOf('tutorialBubble'),'background, transparent portrait, and dialogue must stay on separate layers');
assert.ok(ui.includes('id="typeBasicChart"')&&ui.includes('id="typeSpecialChart"'),'attribute groups need stable spotlight targets');
assert.ok(skills.includes('data-tutorial-stella-unequip')&&skills.includes('data-tutorial-stella-skill-card')&&skills.includes('data-tutorial-stella-skill-equip'),'actual skill operations need stable targets');
assert.ok(skills.includes('handleTutorialStellaSkillUnequipped')&&skills.includes('handleTutorialStellaSkillEquipped'),'only successful skill operations may advance the tutorial');

const dataContext=vm.createContext({console,alert:()=>{},confirm:()=>false});
vm.runInContext(read('js/data.js'),dataContext,{filename:'js/data.js'});
vm.runInContext(read('js/core.js'),dataContext,{filename:'js/core.js'});
const taxonomy=vm.runInContext(`({card:SKILL_BY_ID.skill_elna_middle_01,elna:by('elna_beginner'),allowed:isSkillAllowedForMonster('skill_elna_middle_01',by('elna_beginner'))})`,dataContext);
assert.equal(taxonomy.card.name,'連続斬り');
assert.equal(taxonomy.card.cost,2);
assert.equal(taxonomy.allowed,true,'the granted card must be equippable by the tutorial Elna contract body');

const helperStart=tutorial.indexOf('function tutorialStellaSkillCard()');
const helperEnd=tutorial.indexOf('function tutorialFirstHuntIsPending',helperStart);
assert.ok(helperStart>=0&&helperEnd>helperStart);
function makeContext({saveSucceeds=true,replaying=false,alreadyGranted=false}={}){
  const state={status:'in_progress',stepId:'stella_card_receive',replaying,stellaSkillCardGranted:alreadyGranted};
  const context=vm.createContext({
    console:{error:()=>{}},TUTORIAL_STELLA_SKILL_ID:'skill_elna_middle_01',tutorialStellaCardBusy:false,
    save:{skillCards:{skill_elna_middle_01:0},equippedSkills:{elna:[]},instances:[{uid:'elna',id:'elna_beginner'}],progress:{tutorial:state}},
    SKILL_BY_ID:{skill_elna_middle_01:{id:'skill_elna_middle_01',name:'連続斬り',cost:2,power:34,types:['normal'],deprecated:false}},
    currentTutorialState:()=>context.save.progress.tutorial,
    tutorialElnaContractInstance:()=>context.save.instances[0],by:()=>({id:'elna_beginner'}),
    isSkillAllowedForMonster:()=>true,markTutorialStellaSkillCardGranted:()=>{
      const tutorialState=context.save.progress.tutorial;
      if(tutorialState.stellaSkillCardGranted)return false;
      tutorialState.stellaSkillCardGranted=true;return true;
    },
    setTutorialStep:id=>{context.save.progress.tutorial.stepId=id;},saveGame:()=>saveSucceeds,
    document:{getElementById:()=>null},showUiNotice:message=>context.notices.push(message),notices:[],
    tutorialCurrentStepId:()=>null,skillCardClass:()=>'',skillTypes:()=>['normal'],skillCardHeader:()=>'',skillTypeLabel:()=>'',skillToMove:()=>[],moveEffectText:()=>'',
    equippedSkillCost:()=>0,skillCostLimitFor:()=>4,availableSkillCount:()=>1,
    tutorialUiState:{active:false},tutorialNext:()=>{},openSkillEdit:()=>{},resetSkillFilters:()=>{}
  });
  vm.runInContext(tutorial.slice(helperStart,helperEnd),context);
  return context;
}

const granted=makeContext();
let result=vm.runInContext('commitTutorialStellaSkillCard()',granted);
assert.equal(result.granted,true);assert.equal(result.replay,false);
assert.equal(granted.save.skillCards.skill_elna_middle_01,1);
assert.equal(granted.save.progress.tutorial.stellaSkillCardGranted,true);
assert.equal(granted.save.progress.tutorial.stepId,'stella_skill_open');
result=vm.runInContext('commitTutorialStellaSkillCard()',granted);
assert.equal(result.granted,false);
assert.equal(granted.save.skillCards.skill_elna_middle_01,1,'a repeated transition must not grant a duplicate card');

const failed=makeContext({saveSucceeds:false});
assert.equal(vm.runInContext('commitTutorialStellaSkillCard()',failed),null);
assert.equal(failed.save.skillCards.skill_elna_middle_01,0,'failed persistence must roll back the card');
assert.equal(failed.save.progress.tutorial.stellaSkillCardGranted,false);
assert.equal(failed.notices.length,1);

const replay=makeContext({replaying:true,alreadyGranted:true});
result=vm.runInContext('commitTutorialStellaSkillCard()',replay);
assert.equal(result.granted,false);assert.equal(result.replay,true);
assert.equal(replay.save.skillCards.skill_elna_middle_01,0,'replay must not grant another card');

const skillActionSource=skills.slice(skills.indexOf('function equipSkill'));
function makeSkillActionContext(saveSucceeds=true){
  const context=vm.createContext({
    editingSkillUid:'elna',save:{equippedSkills:{elna:[]}},callbacks:[],renders:0,alerts:[],notices:[],
    getInstance:()=>({uid:'elna',id:'elna_beginner'}),ensureInstanceSkills:()=>{},by:()=>({id:'elna_beginner'}),
    SKILL_BY_ID:{skill_elna_middle_01:{id:'skill_elna_middle_01',cost:2}},isSkillAllowedForMonster:()=>true,
    equippedSkillCost:()=>0,skillCostLimitFor:()=>4,availableSkillCount:()=>1,saveGame:()=>saveSucceeds,
    renderSkillEdit:()=>context.renders++,renderParty:()=>context.renders++,alert:message=>context.alerts.push(message),
    showUiNotice:message=>context.notices.push(message),
    handleTutorialStellaSkillEquipped:(id,uid)=>context.callbacks.push(`equip:${id}:${uid}`),
    handleTutorialStellaSkillUnequipped:uid=>context.callbacks.push(`unequip:${uid}`)
  });
  vm.runInContext(skillActionSource,context);
  return context;
}
const equipSuccess=makeSkillActionContext(true);
assert.equal(vm.runInContext("equipSkill('skill_elna_middle_01')",equipSuccess),true);
assert.deepEqual([...equipSuccess.save.equippedSkills.elna],['skill_elna_middle_01']);
assert.deepEqual(equipSuccess.callbacks,['equip:skill_elna_middle_01:elna'],'successful equip must be the only operation that advances the tutorial');
const equipFailure=makeSkillActionContext(false);
assert.equal(vm.runInContext("equipSkill('skill_elna_middle_01')",equipFailure),false);
assert.deepEqual([...equipFailure.save.equippedSkills.elna],[],'failed equip save must restore the previous loadout');
assert.deepEqual(equipFailure.callbacks,[],'failed equip must not advance the tutorial');
equipSuccess.callbacks=[];
assert.equal(vm.runInContext('unequipSkill(0)',equipSuccess),true);
assert.deepEqual([...equipSuccess.save.equippedSkills.elna],[]);
assert.deepEqual(equipSuccess.callbacks,['unequip:elna'],'successful unequip must notify the operation-wait STEP');

assert.equal(packageJson.scripts['check:prologue-stella-intro'],'node scripts/test-prologue-stella-intro.mjs');
assert.ok(packageJson.scripts.check.includes('npm run check:prologue-stella-intro'));

console.log('Prologue Stella intro validation passed (transparent portrait, one-time card grant, actual equip actions, attributes, rollback, replay safety, and Phase 12 checkpoint).');
