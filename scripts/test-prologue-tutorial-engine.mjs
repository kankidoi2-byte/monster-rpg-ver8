import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const tutorial=fs.readFileSync(new URL('../js/tutorial.js',import.meta.url),'utf8');
const engineStart=tutorial.indexOf('const TUTORIAL_STEP_MODE=');
const engineEnd=tutorial.indexOf('function tutorialFlowSteps(');
assert.ok(engineStart>=0&&engineEnd>engineStart,'STEP mode engine must be present before flow definitions');

const context=vm.createContext({});
vm.runInContext(tutorial.slice(engineStart,engineEnd),context);
const evaluate=expression=>vm.runInContext(expression,context);

assert.equal(evaluate("inferTutorialStepMode({})"),'dialogue','plain steps must wait for dialogue Next');
assert.equal(evaluate("inferTutorialStepMode({advanceOnTarget:true,target:'#action'})"),'target_action','legacy target steps must map to target actions');
assert.equal(evaluate("inferTutorialStepMode({externalAdvance:true})"),'external_action','legacy external steps must map to external actions');
assert.equal(evaluate("inferTutorialStepMode({waitForEvent:'battle_outcome'})"),'dialogue','waitForEvent checkpoints must still release from dialogue Next');

const explicitTarget=evaluate("normalizeTutorialStep({id:'target',mode:'target_action',target:'#action'},0)");
assert.equal(explicitTarget.mode,'target_action');
assert.equal(explicitTarget.advanceOnTarget,true,'explicit target mode must preserve legacy runtime compatibility');
assert.equal(explicitTarget.externalAdvance,false);

const explicitExternal=evaluate("normalizeTutorialStep({id:'external',mode:'external_action'},0)");
assert.equal(explicitExternal.mode,'external_action');
assert.equal(explicitExternal.externalAdvance,true,'explicit external mode must preserve legacy runtime compatibility');
assert.equal(evaluate("tutorialStepRequiresAction(normalizeTutorialStep({id:'dialogue'},0))"),false);
assert.equal(evaluate("tutorialStepRequiresAction(normalizeTutorialStep({id:'target',mode:'target_action',target:'#action'},0))"),true);
assert.equal(evaluate("tutorialStepAcceptsTargetAction(normalizeTutorialStep({id:'external',mode:'external_action',target:'#action'},0))"),false,'external completion must not be accepted as a target click');

assert.equal(evaluate("normalizeTutorialStep({id:'invalid',mode:'target_action'},0)"),null,'target actions require a selector');
assert.equal(evaluate("normalizeTutorialStep({id:'invalid',advanceOnTarget:true,externalAdvance:true,target:'#action'},0)"),null,'ambiguous action modes must be rejected');
assert.equal(evaluate("registerTutorialFlow('invalid',[{id:'ok'},{id:'bad',mode:'target_action'}])"),false,'a flow must reject invalid steps instead of silently dropping them');
assert.equal(evaluate("registerTutorialFlow('valid',[{id:'talk'},{id:'tap',mode:'target_action',target:'#action'},{id:'event',mode:'external_action'}])"),true,'dialogue and action steps must register as one data-driven flow');

assert.ok(tutorial.includes('if(tutorialStepRequiresAction(step)&&actionCompleted!==true)return'),'Next must not bypass an action wait');
assert.ok(tutorial.includes('if(tutorialStepAcceptsTargetAction(step)&&event.target.closest?.(step.target))'),'only target-action steps may advance from a highlighted click');
assert.ok(tutorial.includes('queueTutorialActionAdvance'),'successful target actions must keep asynchronous advancement');
assert.ok(!tutorial.slice(engineStart,engineEnd).includes('saveGame('),'STEP normalization must not mutate save data or grant rewards');

console.log('Prologue tutorial STEP engine checks passed.');
