import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime(),run=r.run;
const source=fs.readFileSync(new URL('../js/tutorial.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function tutorialStellaSkillCard()'),source.indexOf('function tutorialFirstHuntIsPending'));
// Real data/core/save/equipment actions, with only the visual spotlight and flow navigation observed.
run(`var TUTORIAL_STELLA_SKILL_ID='s110_041',tutorialStellaCardBusy=false;
var step='stella_skill_unequip',advanceCount=0,retargetCount=0,domGeneration=0,spotlightGeneration=0;
var tutorialUiState={active:true};
function tutorialElnaContractInstance(){return save.instances.find(ins=>ins.id==='elna_beginner');}
function tutorialCurrentStepId(){return tutorialUiState.active?step:null;}
function renderTutorialStep(){retargetCount++;spotlightGeneration=domGeneration;}
function tutorialNext(fromAction){if(!fromAction)throw Error('external action required');advanceCount++;step=step==='stella_skill_unequip'?'stella_skill_equip':'stella_attribute_intro';setTutorialStep(step);}
renderSkillEdit=()=>{domGeneration++;};
showUiNotice=()=>{};
save=initSave();var elna=addInstance('elna_beginner',1);editingSkillUid=elna.uid;
save.progress.tutorial.status='in_progress';save.progress.tutorial.stepId=step;
`);
vm.runInContext(helpers,r.context,{filename:'tutorial-stella-real-helpers'});
assert.equal(run('skillCostLimitFor(by(elna.id),elna)'),4);
assert.equal(run('equippedSkillCost(elna)'),4);
assert.deepEqual(Array.from(run('getEquippedSkillIds(elna)'),id=>run(`SKILL_BY_ID[${JSON.stringify(id)}].cost`)),[1,2,1]);
assert.equal(run('commitTutorialStellaSkillCard().granted'),true);
assert.equal(run('save.skillCards.s110_041'),1);
run("step='stella_skill_unequip';setTutorialStep(step);");
assert.equal(run('tutorialStellaSkillCanEquip()'),false);
assert.equal(run("resolveTutorialStellaSkillResumeStep('stella_skill_equip')"),'stella_skill_unequip');
assert.equal(run("resolveTutorialStellaSkillResumeStep('stella_skill_card_detail')"),'stella_skill_unequip');
assert.equal(run("resolveTutorialStellaSkillResumeStep('unrelated')"),'unrelated');
// First removal leaves COST 3 used / 1 free. The step must retarget the replaced button.
assert.equal(run('unequipSkill(0)'),true);
assert.equal(run('equippedSkillCost(elna)'),3);
assert.equal(run('advanceCount'),0);assert.equal(run('retargetCount'),1);
assert.equal(run('spotlightGeneration'),run('domGeneration'),'spotlight points to rebuilt card DOM');
assert.equal(run('step'),'stella_skill_unequip');
// Cancelling/closing guidance must not advance when unrelated actions occur.
run('tutorialUiState.active=false;');
assert.equal(run('handleTutorialStellaSkillUnequipped(elna.uid)'),false);
assert.equal(run('advanceCount'),0);assert.equal(run('retargetCount'),1);
// Reopen from saved checkpoint after reload; one-time receipt cannot duplicate the card.
run("save=parseAndPrepareSave(JSON.stringify(save),[]);elna=save.instances[0];editingSkillUid=elna.uid;tutorialUiState.active=true;step=currentTutorialState().stepId;renderTutorialStep();");
assert.equal(run('step'),'stella_skill_unequip');
assert.equal(run('save.skillCards.s110_041'),1);
assert.equal(run("handleTutorialStellaSkillUnequipped('other-uid')"),false);
assert.equal(run('advanceCount'),0);
// Second removal leaves COST1 used /3 free; only now may the equip step start.
assert.equal(run('unequipSkill(0)'),true);
assert.equal(run('equippedSkillCost(elna)'),1);
assert.equal(run('advanceCount'),1);assert.equal(run('step'),'stella_skill_equip');
assert.equal(run('tutorialStellaSkillCanEquip()'),true);
assert.equal(run("resolveTutorialStellaSkillResumeStep('stella_skill_equip')"),'stella_skill_equip');
// Failed equip rolls back the card slot and reattaches the retry target; no advance.
run('saveGame=()=>false;var equipBefore=JSON.stringify(save.equippedSkills);var equipAdvances=advanceCount,equipRetargets=retargetCount;');
assert.equal(run("equipSkill('s110_041')"),false);
assert.equal(run('tutorialStellaSkillIsEquipped()'),false);
assert.equal(run('JSON.stringify(save.equippedSkills)'),run('equipBefore'));
assert.equal(run('advanceCount'),run('equipAdvances'));
assert.equal(run('retargetCount'),run('equipRetargets')+1);
assert.equal(run('spotlightGeneration'),run('domGeneration'));
run('saveGame=()=>true;');
assert.equal(run("equipSkill('s110_041')"),true);
assert.equal(run('equippedSkillCost(elna)'),4);
assert.equal(run('advanceCount'),2);assert.equal(run('step'),'stella_attribute_intro');
assert.equal(run('tutorialStellaSkillIsEquipped()'),true);
assert.equal(run("resolveTutorialStellaSkillResumeStep('stella_skill_equip')"),'stella_skill_equip','equipped resume must not force another removal');
assert.equal(run('save.skillCards.s110_041'),1);
// Failed unequip keeps the original loadout and retargets the recreated remove button.
run("save=initSave();elna=addInstance('elna_beginner',1);editingSkillUid=elna.uid;save.skillCards.s110_041=1;step='stella_skill_unequip';setTutorialStep(step);saveGame=()=>false;var before=JSON.stringify(save.equippedSkills);var beforeAdvance=advanceCount,beforeRetarget=retargetCount;");
assert.equal(run('unequipSkill(0)'),false);
assert.equal(run('JSON.stringify(save.equippedSkills)'),run('before'));
assert.equal(run('advanceCount'),run('beforeAdvance'));
assert.equal(run('retargetCount'),run('beforeRetarget')+1);
assert.equal(run('spotlightGeneration'),run('domGeneration'));
// Once saving works, the exact retry succeeds, then the second removal can advance.
run('saveGame=()=>true;');
assert.equal(run('unequipSkill(0)'),true);
assert.equal(run('equippedSkillCost(elna)'),3);
assert.equal(run('advanceCount'),run('beforeAdvance'));
assert.equal(run('spotlightGeneration'),run('domGeneration'));
assert.equal(run('unequipSkill(0)'),true);
assert.equal(run('step'),'stella_skill_equip');
assert.equal(run("equipSkill('s110_041')"),true);
assert.equal(run('tutorialStellaSkillIsEquipped()'),true);
assert.match(source,/id:'stella_skill_unequip'[^\n]+残りCOSTを3以上/);
assert(source.includes('resolveTutorialStellaSkillResumeStep(resolveTutorialExpeditionResumeStep(flowId,stepId,false))'));
assert.match(source,/id:'skill_gacha_rates'[^\n]+共通の106種類/);
console.log('PASS skill110 tutorial: real Elna Lv1 COST4 defaults, two removals, first-button retarget, advance only at COST3 free, equip COST3, close/resume, wrong UID, failed-save non-advance.');
