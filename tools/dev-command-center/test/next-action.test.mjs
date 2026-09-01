import assert from 'node:assert/strict';
import {
  decideNextAction,
  NEXT_ACTION_CODES,
  NEXT_ACTION_PRIORITY
} from '../src/next-action.mjs';

const expected = {
  failed: [1, 'inspect_failed_check', 'blocking_failure_detected'],
  unavailable: [2, 'restore_source_access', 'required_source_unavailable'],
  stale: [3, 'refresh_status_sources', 'source_observation_stale'],
  in_progress: [4, 'wait_for_ci_completion', 'ci_still_running'],
  publish_pending: [5, 'wait_for_pages_publication', 'pages_publication_pending'],
  awaiting_confirmation: [6, 'review_open_pull_request', 'human_confirmation_required'],
  healthy: [7, 'no_action', 'system_healthy']
};

function unified(code, extras = {}) {
  return {
    schema_version: 1,
    status: {
      code,
      label_ja: 'untrusted label',
      reason_code: 'untrusted reason',
      observed_at: '2026-09-01T10:00:00.000Z',
      source: 'untrusted source',
      ...extras
    },
    signals: { free_text: 'must not leak' }
  };
}

for (const [status, [priority, actionCode, reasonCode]] of Object.entries(expected)) {
  const result = decideNextAction(unified(status));
  assert.equal(result.schema_version, 1);
  assert.deepEqual(result.decision, {
    priority,
    action_code: actionCode,
    reason_code: reasonCode,
    source_links: [],
    blocking_status: status
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.decision), true);
  assert.equal(Object.isFrozen(result.decision.source_links), true);
  assert.equal(JSON.stringify(result).includes('untrusted'), false);
  assert.equal(JSON.stringify(result).includes('must not leak'), false);
}

assert.deepEqual(NEXT_ACTION_CODES, [
  'inspect_failed_check',
  'restore_source_access',
  'refresh_status_sources',
  'wait_for_ci_completion',
  'wait_for_pages_publication',
  'review_open_pull_request',
  'no_action'
]);
assert.deepEqual(NEXT_ACTION_PRIORITY, {
  failed: 1,
  unavailable: 2,
  stale: 3,
  in_progress: 4,
  publish_pending: 5,
  awaiting_confirmation: 6,
  healthy: 7
});

const invalidInputs = [null, {}, { schema_version: 2, status: { code: 'failed' } }, unified('unknown')];
for (const input of invalidInputs) {
  assert.deepEqual(decideNextAction(input).decision, {
    priority: 1,
    action_code: 'restore_status_input',
    reason_code: 'unified_status_invalid',
    source_links: [],
    blocking_status: 'unavailable'
  });
}

const links = decideNextAction(unified('failed'), {
  sourceLinks: [
    'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/123?token=secret#job',
    'https://kankidoi2-byte.github.io/monster-rpg-ver8/?secret=yes#section',
    'https://evil.example/steal',
    'https://user:password@github.com/kankidoi2-byte/monster-rpg-ver8',
    'javascript:alert(1)',
    'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/123'
  ]
});
assert.deepEqual(links.decision.source_links, [
  'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/123',
  'https://kankidoi2-byte.github.io/monster-rpg-ver8/'
]);
assert.equal(JSON.stringify(links).includes('secret'), false);
assert.equal(JSON.stringify(links).includes('password'), false);
assert.equal(JSON.stringify(links).includes('evil.example'), false);

const original = unified('healthy');
const before = JSON.stringify(original);
const first = decideNextAction(original, { sourceLinks: ['https://github.com/example/project'] });
const second = decideNextAction(original, { sourceLinks: ['https://github.com/example/project'] });
assert.deepEqual(first, second);
assert.equal(JSON.stringify(original), before);

console.log('Development command center next action validation passed.');
