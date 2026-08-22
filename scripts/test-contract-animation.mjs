import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({console, setTimeout});
vm.runInContext(fs.readFileSync(new URL('../js/contract-animation.js', import.meta.url), 'utf8'), context);

assert.equal(context.contractAnimationStage(.24, .25), 3, 'A roll below the success rate must reach the paw stamp');
assert.equal(context.contractAnimationStage(.25, .25), 2, 'A just-missed roll must pulse twice');
assert.equal(context.contractAnimationStage(.49, .25), 2, 'The nearest failure third must pulse twice');
assert.equal(context.contractAnimationStage(.50, .25), 1, 'The middle failure third must pulse once');
assert.equal(context.contractAnimationStage(.74, .25), 1, 'The middle failure third must keep one pulse');
assert.equal(context.contractAnimationStage(.75, .25), 0, 'The farthest failure third must tear without a pulse');
assert.equal(context.contractAnimationStage(0, 0), 2, 'A zero-rate exact boundary must still be treated as the closest failure');
assert.equal(context.contractAnimationStage(.99, .95), 0, 'The maximum normal rate must retain a zero-pulse failure range');

console.log('Contract animation validation passed (0–2 failure pulses and 3-pulse success).');
