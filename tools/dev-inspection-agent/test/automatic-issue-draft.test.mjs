import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUTOMATIC_ISSUE_DRAFT_LIMITS,
  runAutomaticIssueDraft
} from '../src/automatic-issue-draft.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manual = JSON.parse(fs.readFileSync(path.join(root, 'test/fixtures/healthy.json'), 'utf8'));
const now = '2026-09-02T05:58:00.000Z';
const sha = 'a'.repeat(40);

function automaticInput(snapshot = structuredClone(manual)) {
  snapshot.repository_snapshot.observed_at = now;
  snapshot.actions_snapshot.observed_at = now;
  snapshot.pages_snapshot.observed_at = now;
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

const healthyInput = automaticInput();
const healthy = runAutomaticIssueDraft(healthyInput, [], [], { now });
assert.equal(healthy.phase, 27);
assert.equal(healthy.mode, 'automatic_unpublished_issue_draft');
assert.deepEqual(healthy.outcome, { draft_created: false, reason_code: 'no_issue_needed' });
assert.equal(healthy.inspection.status, 'healthy');
assert.equal(healthy.draft, null);
assert.equal(healthy.trigger_ledger.length, 1);
assert.equal(healthy.draft_ledger.length, 0);

const failedInput = automaticInput();
failedInput.actions_snapshot.runs.items[0].conclusion = 'failure';
const before = structuredClone(failedInput);
const failed = runAutomaticIssueDraft(failedInput, [], [], { now });
assert.deepEqual(failed.outcome, { draft_created: true, reason_code: 'draft_created' });
assert.equal(failed.inspection.status, 'failed');
assert.match(failed.draft.draft_id, /^phase27:[0-9a-f]{64}$/);
assert.match(failed.draft.report_id, /^phase26:[0-9a-f]{64}$/);
assert.equal(failed.draft.repository, 'kankidoi2-byte/monster-rpg-ver8');
assert.equal(failed.draft.title, '[自動点検] CIまたはPagesの失敗を検出');
assert.deepEqual(failed.draft.suggested_labels, ['automated-inspection', 'needs-triage']);
assert.deepEqual(failed.draft.publication, {
  state: 'unpublished', destination: null, requires_fresh_confirmation: true, issue_number: null
});
assert.match(failed.draft.body, /状態: failed/);
assert.match(failed.draft.body, /ci_failure_observed/);
assert.match(failed.draft.body, /inspect_failed_check/);
assert.match(failed.draft.body, /投稿には毎回、新しい明示確認が必要/);
assert.equal(failed.draft.body.length <= 8192, true);
assert.equal(JSON.stringify(failed).includes('trigger-secret'), false);
assert.equal(JSON.stringify(failed).includes('free-text'), false);
assert.deepEqual(failedInput, before);
assert.equal(Object.isFrozen(failed), true);
assert.equal(Object.isFrozen(failed.draft), true);
assert.equal(Object.isFrozen(failed.draft.publication), true);
assert.equal(failed.draft_ledger.length, 1);
assert.equal(failed.draft_ledger[0].draft_id, failed.draft.draft_id);

const deterministic = runAutomaticIssueDraft(failedInput, [], [], { now });
assert.equal(deterministic.draft.draft_id, failed.draft.draft_id);
assert.equal(deterministic.draft.body, failed.draft.body);

const duplicateDraft = runAutomaticIssueDraft(failedInput, [], failed.draft_ledger, { now });
assert.deepEqual(duplicateDraft.outcome, { draft_created: false, reason_code: 'duplicate_draft' });
assert.equal(duplicateDraft.draft, null);
assert.equal(duplicateDraft.draft_ledger.length, 1);

const duplicateTrigger = runAutomaticIssueDraft(failedInput, failed.trigger_ledger, [], { now });
assert.deepEqual(duplicateTrigger.outcome, { draft_created: false, reason_code: 'duplicate_trigger' });
assert.equal(duplicateTrigger.draft, null);

const pagesFailureInput = automaticInput();
pagesFailureInput.pages_snapshot.site.value.status = 'errored';
const pagesFailed = runAutomaticIssueDraft(pagesFailureInput, [], [], { now });
assert.equal(pagesFailed.outcome.draft_created, true);
assert.match(pagesFailed.draft.body, /pages_failure_observed/);

const unavailableInput = automaticInput();
unavailableInput.repository_snapshot.sections.commits = { status: 'unavailable', reason_code: 'authentication_required' };
const unavailable = runAutomaticIssueDraft(unavailableInput, [], [], { now });
assert.equal(unavailable.outcome.draft_created, true);
assert.equal(unavailable.draft.title, '[自動点検] 点検情報を取得できません');
assert.equal(JSON.stringify(unavailable).includes('authentication_required'), false);

const reviewInput = automaticInput();
reviewInput.repository_snapshot.sections.pull_requests.items.push({ number: 109, title: 'must-not-appear' });
const review = runAutomaticIssueDraft(reviewInput, [], [], { now });
assert.deepEqual(review.outcome, { draft_created: false, reason_code: 'no_issue_needed' });
assert.equal(review.inspection.status, 'awaiting_confirmation');
assert.equal(JSON.stringify(review).includes('must-not-appear'), false);

const invalid = runAutomaticIssueDraft({ schema_version: 2, secret: 'do-not-copy' }, [], [], { now });
assert.deepEqual(invalid.outcome, { draft_created: false, reason_code: 'invalid_input' });
assert.equal(JSON.stringify(invalid).includes('do-not-copy'), false);

const oversizedInput = automaticInput();
oversizedInput.ignored_blob = 'secret-oversize-'.repeat(20000);
const oversized = runAutomaticIssueDraft(oversizedInput, [], [], { now });
assert.deepEqual(oversized.outcome, { draft_created: false, reason_code: 'input_too_large' });
assert.equal(JSON.stringify(oversized).includes('secret-oversize'), false);

const oldLedger = [{
  draft_id: `phase27:${'b'.repeat(64)}`,
  report_id: `phase26:${'c'.repeat(64)}`,
  created_at: '2026-09-01T04:00:00.000Z',
  expires_at: '2026-09-02T04:00:00.000Z'
}];
const expiredRemoved = runAutomaticIssueDraft(healthyInput, [], oldLedger, { now });
assert.equal(expiredRemoved.draft_ledger.length, 0);

const largeLedger = Array.from({ length: 120 }, (_, index) => ({
  draft_id: `phase27:${index.toString(16).padStart(64, '0')}`,
  report_id: `phase26:${(index + 200).toString(16).padStart(64, '0')}`,
  created_at: new Date(Date.parse(now) - index * 1000).toISOString(),
  expires_at: new Date(Date.parse(now) + 60_000).toISOString()
}));
const bounded = runAutomaticIssueDraft(healthyInput, [], largeLedger, { now });
assert.equal(bounded.draft_ledger.length, 100);

assert.deepEqual(failed.side_effects, {
  network_requests: false,
  file_writes: false,
  github_writes: false,
  issue_posts: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});
assert.deepEqual(AUTOMATIC_ISSUE_DRAFT_LIMITS, {
  repository: 'kankidoi2-byte/monster-rpg-ver8',
  draft_ttl_ms: 86400000,
  max_draft_ledger_entries: 100,
  max_body_chars: 8192,
  actionable_statuses: ['failed', 'stale', 'unavailable'],
  draft_id_pattern: '^phase27:[0-9a-f]{64}$',
  report_id_pattern: '^phase26:[0-9a-f]{64}$'
});

const source = fs.readFileSync(path.join(root, 'src/automatic-issue-draft.mjs'), 'utf8');
for (const forbidden of ['fetch(', "from 'node:http'", "from 'node:https'", 'writeFile', 'appendFile', 'unlink', 'rmSync', 'child_process', 'process.env']) {
  assert.equal(source.includes(forbidden), false, `automatic draft path must not contain ${forbidden}`);
}
for (const forbidden of ['POST', 'PUT', 'PATCH', 'DELETE', 'issues:write', 'workflows:write']) {
  const declaration = forbidden.includes(':') ? source.includes(forbidden) : new RegExp(`\\b${forbidden}\\b`).test(source);
  assert.equal(declaration, false, `automatic draft path must not declare ${forbidden}`);
}

console.log('Development inspection agent automatic unpublished Issue draft validation passed.');
