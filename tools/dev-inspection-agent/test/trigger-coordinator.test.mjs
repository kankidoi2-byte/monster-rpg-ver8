import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coordinateTrigger, TRIGGER_LIMITS } from '../src/trigger-coordinator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = 'kankidoi2-byte/monster-rpg-ver8';
const now = '2026-09-02T04:15:00.000Z';
const sha = 'a'.repeat(40);

const pullRequest = {
  schema_version: 1,
  repository,
  source: 'pull_request',
  observed_at: now,
  pull_request: { number: 105, head_sha: sha, action: 'synchronize' },
  title: 'untrusted title must not be copied',
  token: 'must-not-appear'
};
const original = structuredClone(pullRequest);
const accepted = coordinateTrigger(pullRequest, [], { now });
assert.equal(accepted.phase, 25);
assert.equal(accepted.mode, 'automatic_deduplicated');
assert.equal(accepted.decision.enqueue, true);
assert.equal(accepted.decision.reason_code, 'accepted');
assert.match(accepted.decision.trigger_id, /^phase25:[0-9a-f]{64}$/);
assert.equal(accepted.trigger.subject, 'pr:105');
assert.equal(accepted.ledger.length, 1);
assert.deepEqual(accepted.side_effects, {
  network_requests: false,
  file_writes: false,
  github_writes: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});
assert.equal(JSON.stringify(accepted).includes('must-not-appear'), false);
assert.equal(JSON.stringify(accepted).includes('untrusted title'), false);
assert.deepEqual(pullRequest, original);
assert.equal(Object.isFrozen(accepted), true);
assert.equal(Object.isFrozen(accepted.decision), true);
assert.equal(Object.isFrozen(accepted.ledger), true);

const duplicate = coordinateTrigger(pullRequest, accepted.ledger, { now });
assert.equal(duplicate.decision.enqueue, false);
assert.equal(duplicate.decision.reason_code, 'duplicate_trigger');
assert.equal(duplicate.ledger.length, 1);

const newHead = structuredClone(pullRequest);
newHead.pull_request.head_sha = 'b'.repeat(40);
const changed = coordinateTrigger(newHead, accepted.ledger, { now });
assert.equal(changed.decision.enqueue, true);
assert.notEqual(changed.decision.trigger_id, accepted.decision.trigger_id);

function event(source, value, observedAt = now) {
  return { schema_version: 1, repository, source, observed_at: observedAt, [source]: value };
}

const main = event('main_push', { sha });
const mainAccepted = coordinateTrigger(main, [], { now });
assert.equal(coordinateTrigger(main, mainAccepted.ledger, { now }).decision.reason_code, 'duplicate_trigger');

const ci = event('ci_completed', {
  run_id: 400, run_attempt: 1, status: 'completed', conclusion: 'success', head_sha: sha
});
const ciAccepted = coordinateTrigger(ci, [], { now });
const ciRetry = structuredClone(ci);
ciRetry.ci_completed.run_attempt = 2;
assert.equal(coordinateTrigger(ciRetry, ciAccepted.ledger, { now }).decision.enqueue, true);

const pages = event('pages_completed', {
  run_id: 146, run_attempt: 1, status: 'completed', conclusion: 'success', head_sha: sha
});
const pagesAccepted = coordinateTrigger(pages, [], { now });
assert.equal(coordinateTrigger(pages, pagesAccepted.ledger, { now }).decision.reason_code, 'duplicate_trigger');

const schedule = { schema_version: 1, repository, source: 'schedule', observed_at: '2026-09-02T04:01:00.000Z' };
const scheduleAccepted = coordinateTrigger(schedule, [], { now: '2026-09-02T04:01:00.000Z' });
const sameHour = { ...schedule, observed_at: '2026-09-02T04:59:59.000Z' };
assert.equal(coordinateTrigger(sameHour, scheduleAccepted.ledger, { now: sameHour.observed_at }).decision.reason_code, 'duplicate_trigger');
const nextHour = { ...schedule, observed_at: '2026-09-02T05:00:00.000Z' };
assert.equal(coordinateTrigger(nextHour, scheduleAccepted.ledger, { now: nextHour.observed_at }).decision.enqueue, true);

for (const invalid of [
  { ...pullRequest, repository: 'someone/other' },
  { ...pullRequest, schema_version: 2 },
  { ...pullRequest, source: 'issue' },
  { ...pullRequest, observed_at: 'not-a-date' },
  event('main_push', { sha: 'bad' })
]) {
  const rejected = coordinateTrigger(invalid, accepted.ledger, { now });
  assert.equal(rejected.decision.enqueue, false);
  assert.equal(rejected.decision.reason_code, 'invalid_event');
  assert.equal(JSON.stringify(rejected).includes('someone/other'), false);
}

const expired = [{
  trigger_id: accepted.decision.trigger_id,
  source: 'pull_request',
  accepted_at: '2026-08-31T00:00:00.000Z',
  expires_at: '2026-09-01T00:00:00.000Z'
}];
assert.equal(coordinateTrigger(pullRequest, expired, { now }).decision.enqueue, true);

const largeLedger = Array.from({ length: 120 }, (_, index) => ({
  trigger_id: `phase25:${String(index).padStart(64, '0')}`,
  source: 'schedule',
  accepted_at: new Date(Date.parse(now) - index * 1000).toISOString(),
  expires_at: new Date(Date.parse(now) + 3600000).toISOString()
}));
const bounded = coordinateTrigger(newHead, largeLedger, { now });
assert.equal(bounded.ledger.length, TRIGGER_LIMITS.max_ledger_entries);
assert.deepEqual(TRIGGER_LIMITS, {
  repository,
  dedup_ttl_ms: 86400000,
  schedule_bucket_ms: 3600000,
  max_ledger_entries: 100
});

const source = fs.readFileSync(path.join(root, 'src/trigger-coordinator.mjs'), 'utf8');
for (const forbidden of ['fetch(', 'http:', 'https:', 'writeFile', 'appendFile', 'unlink', 'rmSync', 'child_process', 'process.env']) {
  assert.equal(source.includes(forbidden), false, `trigger coordinator must not contain ${forbidden}`);
}
for (const forbidden of ['POST', 'PUT', 'PATCH', 'DELETE', 'issues:write', 'workflows:write']) {
  const declaration = forbidden.includes(':') ? source.includes(forbidden) : new RegExp(`\\b${forbidden}\\b`).test(source);
  assert.equal(declaration, false, `automatic trigger path must not declare ${forbidden}`);
}

console.log('Development inspection agent deduplicated trigger validation passed.');
