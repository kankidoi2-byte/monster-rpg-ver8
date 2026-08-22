import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../js/alchemy.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/ui-redesign.css', import.meta.url), 'utf8');

const orderedMarkers = [
  'data-alchemy-step="target"',
  'data-alchemy-step="monster"',
  'data-alchemy-step="materials"',
  'data-alchemy-step="cost"',
  'data-alchemy-step="preview"'
];
let previous = -1;
orderedMarkers.forEach(marker => {
  const current = source.indexOf(marker);
  assert.ok(current > previous, `Alchemy step order is invalid around ${marker}`);
  previous = current;
});

assert.match(source, /alchemy-consumption-summary/, 'Preview must summarize irreversible costs');
assert.match(source, /alchemy-final-warning/, 'Confirmation must retain a final irreversible-cost warning');
assert.match(source, /確認画面で最終確認するまで消費されません/, 'Preview must state that selection is not yet consumed');
assert.match(source, /validateAlchemyPlan\(plan\)/, 'Alchemy validation must remain in the confirmation flow');
assert.match(source, /const snapshot = JSON\.stringify\(save\)/, 'Alchemy rollback snapshot must remain intact');
assert.match(source, /localStorage\.setItem\('mb_v95c', snapshot\)/, 'Alchemy rollback must preserve the existing save key');
assert.match(css, /Phase 2: alchemy decision flow and irreversible-cost review/, 'Phase 2 alchemy styles are missing');
assert.match(css, /\.alchemy-flow/, 'Alchemy progress indicator styles are missing');
assert.match(css, /\.alchemy-confirm-consumption/, 'Final consumption summary styles are missing');

console.log('Alchemy UI validation passed (step order, cost review, validation, and rollback safety).');
