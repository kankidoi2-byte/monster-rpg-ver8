import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAutomaticInspection, AUTOMATIC_REPORT_LIMITS } from '../src/automatic-inspection-report.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manual = JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures/healthy.json'), 'utf8'));
const now = '2026-09-02T03:10:00.000Z';
const sha = 'a'.repeat(40);

function automaticInput(snapshot = structuredClone(manual)) {
  return {
    schema_version: 1,
    mode: 'automatic_read_only',
    trigger_event: {
      schema_version: 1,
      repository: 'kankidoi2-byte/monster-rpg-ver8',
      source: 'main_push',
      observed_at: now,
      main_push: { sha },
      token: 'trigger-secret-must-not-appear'
    },
    repository_snapshot: snapshot.repository_snapshot,
    actions_snapshot: snapshot.actions_snapshot,
    pages_snapshot: snapshot.pages_snapshot,
    source_links: snapshot.source_links,
    free_text: 'free-text-must-not-appear'
  };
}

const input = automaticInput();
const before = structuredClone(input);
const healthy = runAutomaticInspection(input, [], { now });
assert.equal(healthy.phase, 26);
assert.equal(healthy.mode, 'automatic_unpublished_report');
assert.deepEqual(healthy.outcome, { report_created: true, reason_code: 'report_created' });
assert.equal(healthy.trigger.source, 'main_push');
assert.equal(healthy.trigger.decision.enqueue, true);
assert.equal(healthy.report.status.code, 'healthy');
assert.equal(healthy.report.summary_ja, '自動点検で異常は見つかりませんでした。');
assert.deepEqual(healthy.report.cause_candidates, []);
assert.deepEqual(healthy.report.impact, {
  code: 'none_detected', scope: 'development_pipeline', blocks_progress: false
});
assert.deepEqual(healthy.report.recommendation, {
  priority: 7, action_code: 'no_action', requires_human_approval: false
});
assert.deepEqual(healthy.report.confidence, {
  level: 'high', basis_code: 'complete_consistent_sources'
});
assert.equal(healthy.report.publication.state, 'unpublished');
assert.equal(healthy.report.publication.destination, null);
assert.match(healthy.report.report_id, /^phase26:[0-9a-f]{64}$/);
assert.equal(healthy.report.evidence.main_sha, sha);
assert.deepEqual(healthy.report.evidence.source_links, [
  'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/396',
  'https://kankidoi2-byte.github.io/monster-rpg-ver8/'
]);
assert.equal(JSON.stringify(healthy).includes('trigger-secret'), false);
assert.equal(JSON.stringify(healthy).includes('free-text'), false);
assert.deepEqual(input, before);
assert.equal(Object.isFrozen(healthy), true);
assert.equal(Object.isFrozen(healthy.report), true);
assert.equal(Object.isFrozen(healthy.report.evidence), true);

const deterministic = runAutomaticInspection(input, [], { now });
assert.equal(deterministic.report.report_id, healthy.report.report_id);
assert.deepEqual(deterministic.report, healthy.report);

const duplicate = runAutomaticInspection(input, healthy.ledger, { now });
assert.deepEqual(duplicate.outcome, { report_created: false, reason_code: 'duplicate_trigger' });
assert.equal(duplicate.report, null);
assert.equal(duplicate.ledger.length, 1);

const failedInput = automaticInput();
failedInput.actions_snapshot.runs.items[0].conclusion = 'failure';
const failed = runAutomaticInspection(failedInput, [], { now });
assert.equal(failed.report.status.code, 'failed');
assert.deepEqual(failed.report.cause_candidates, [{ code: 'ci_failure_observed', likelihood: 'high' }]);
assert.deepEqual(failed.report.impact, {
  code: 'delivery_blocked', scope: 'development_pipeline', blocks_progress: true
});
assert.deepEqual(failed.report.recommendation, {
  priority: 1, action_code: 'inspect_failed_check', requires_human_approval: false
});

const pagesFailureInput = automaticInput();
pagesFailureInput.pages_snapshot.site.value.status = 'errored';
const pagesFailed = runAutomaticInspection(pagesFailureInput, [], { now });
assert.equal(pagesFailed.report.status.code, 'failed');
assert.deepEqual(pagesFailed.report.cause_candidates, [{ code: 'pages_failure_observed', likelihood: 'high' }]);

const reviewInput = automaticInput();
reviewInput.repository_snapshot.sections.pull_requests.items.push({ number: 106, title: 'must-not-appear' });
const review = runAutomaticInspection(reviewInput, [], { now });
assert.equal(review.report.status.code, 'awaiting_confirmation');
assert.equal(review.report.recommendation.requires_human_approval, true);
assert.equal(review.report.evidence.open_pull_request_count, 1);
assert.equal(JSON.stringify(review).includes('must-not-appear'), false);

const unavailableInput = automaticInput();
unavailableInput.repository_snapshot.sections.commits = { status: 'unavailable', reason_code: 'authentication_required' };
const unavailable = runAutomaticInspection(unavailableInput, [], { now });
assert.equal(unavailable.report.status.code, 'unavailable');
assert.equal(unavailable.report.impact.code, 'assessment_incomplete');
assert.equal(unavailable.report.evidence.main_sha, null);

const invalidTrigger = automaticInput();
invalidTrigger.trigger_event.repository = 'someone/other';
const rejected = runAutomaticInspection(invalidTrigger, [], { now });
assert.deepEqual(rejected.outcome, { report_created: false, reason_code: 'invalid_event' });
assert.equal(rejected.report, null);
assert.equal(JSON.stringify(rejected).includes('someone/other'), false);

const oversized = automaticInput();
oversized.ignored_blob = 'secret-oversize-'.repeat(20000);
const tooLarge = runAutomaticInspection(oversized, healthy.ledger, { now });
assert.deepEqual(tooLarge.outcome, { report_created: false, reason_code: 'input_too_large' });
assert.equal(tooLarge.report, null);
assert.equal(JSON.stringify(tooLarge).includes('secret-oversize'), false);

const invalidEnvelope = runAutomaticInspection({ schema_version: 2, secret: 'do-not-copy' }, [], { now });
assert.deepEqual(invalidEnvelope.outcome, { report_created: false, reason_code: 'invalid_input' });
assert.equal(JSON.stringify(invalidEnvelope).includes('do-not-copy'), false);

assert.deepEqual(healthy.side_effects, {
  network_requests: false,
  file_writes: false,
  github_writes: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});
assert.deepEqual(AUTOMATIC_REPORT_LIMITS, {
  max_input_bytes: 262144,
  max_open_pull_requests: 100,
  max_source_links: 5,
  max_cause_candidates: 3,
  report_id_pattern: '^phase26:[0-9a-f]{64}$'
});

const source = fs.readFileSync(path.join(root, 'src/automatic-inspection-report.mjs'), 'utf8');
for (const forbidden of ['fetch(', "from 'node:http'", "from 'node:https'", 'writeFile', 'appendFile', 'unlink', 'rmSync', 'child_process', 'process.env']) {
  assert.equal(source.includes(forbidden), false, `automatic report path must not contain ${forbidden}`);
}
for (const forbidden of ['POST', 'PUT', 'PATCH', 'DELETE', 'issues:write', 'workflows:write']) {
  const declaration = forbidden.includes(':') ? source.includes(forbidden) : new RegExp(`\\b${forbidden}\\b`).test(source);
  assert.equal(declaration, false, `automatic report path must not declare ${forbidden}`);
}

console.log('Development inspection agent automatic unpublished report validation passed.');
