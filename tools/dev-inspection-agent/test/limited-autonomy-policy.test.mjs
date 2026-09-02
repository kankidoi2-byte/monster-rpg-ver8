import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  authorizeLimitedAutonomyTrial,
  LIMITED_AUTONOMY_LIMITS
} from '../src/limited-autonomy-policy.mjs';

const repository = 'kankidoi2-byte/monster-rpg-ver8';
const now = '2026-09-02T12:20:00.000Z';
const mainSha = 'a'.repeat(40);

function report(overrides = {}) {
  const value = {
    schema_version: 1,
    report_id: `phase26:${'b'.repeat(64)}`,
    generated_at: '2026-09-02T12:19:00.000Z',
    status: { code: 'failed' },
    cause_candidates: [{ code: 'ci_failure_observed', likelihood: 'high' }],
    impact: { code: 'delivery_blocked', scope: 'development_pipeline', blocks_progress: true },
    recommendation: { priority: 1, action_code: 'inspect_failed_check', requires_human_approval: false },
    confidence: { level: 'high', basis_code: 'complete_consistent_sources' },
    evidence: {
      main_sha: mainSha,
      ci: { matched_main: true, status: 'completed', conclusion: 'failure', head_sha: mainSha },
      pages: { site_status: 'built', build_status: 'built', published_sha: mainSha },
      source_links: []
    },
    publication: { state: 'unpublished', destination: null }
  };
  return Object.assign(value, overrides);
}

function request(finding = {}) {
  return {
    schema_version: 1,
    mode: 'limited_autonomy_trial_request',
    repository,
    requested_at: now,
    base: { branch: 'main', sha: mainSha },
    source_report: report(),
    finding: {
      kind: 'test_failure',
      code: 'declared_test_failure',
      check: {
        id: 'diagnostics',
        command: 'npm run check:diagnostics',
        status: 'failed',
        head_sha: mainSha
      },
      target_paths: ['js/diagnostics.js'],
      ...finding
    },
    token: 'secret-must-not-appear',
    failure_log: 'free-form-log-must-not-appear'
  };
}

const input = request();
const before = structuredClone(input);
const authorized = authorizeLimitedAutonomyTrial(input, [], { now });
assert.deepEqual(authorized.outcome, { trial_authorized: true, reason_code: 'limited_trial_authorized' });
assert.equal(authorized.phase, 31);
assert.equal(authorized.mode, 'limited_autonomy_trial_decision');
assert.match(authorized.trial.trial_id, /^phase31:[0-9a-f]{64}$/);
assert.deepEqual(authorized.trial.base, { branch: 'main', sha: mainSha, immutable: true });
assert.deepEqual(authorized.trial.scope.target_paths, ['js/diagnostics.js']);
assert.equal(authorized.trial.scope.maximum_attempts, 1);
assert.equal(authorized.trial.authorization.state, 'authorized_for_isolated_trial');
assert.equal(authorized.trial.authorization.branch_commit_pull_request, 'fresh_confirmation_required');
assert.equal(authorized.trial.authorization.merge, 'not_authorized');
assert.equal(authorized.trial.publication.state, 'unpublished');
assert.equal(authorized.trial.publication.requires_fresh_confirmation_for_materialization, true);
assert.deepEqual(authorized.trial.validation.required_after_trial, [
  { id: 'diagnostics', command: 'npm run check:diagnostics', expected_status: 'passed' },
  { id: 'full_check', command: 'npm run check', expected_status: 'passed' }
]);
assert.equal(authorized.ledger.length, 1);
assert.equal(JSON.stringify(authorized).includes('secret-must-not-appear'), false);
assert.equal(JSON.stringify(authorized).includes('free-form-log-must-not-appear'), false);
assert.deepEqual(input, before);
assert.equal(Object.isFrozen(authorized), true);
assert.equal(Object.isFrozen(authorized.trial), true);

const deterministic = authorizeLimitedAutonomyTrial(input, [], { now });
assert.equal(deterministic.trial.trial_id, authorized.trial.trial_id);

const duplicate = authorizeLimitedAutonomyTrial(input, authorized.ledger, { now });
assert.deepEqual(duplicate.outcome, { trial_authorized: false, reason_code: 'trial_already_authorized' });
assert.equal(duplicate.trial, null);
assert.equal(duplicate.ledger.length, 1);

const brokenReference = authorizeLimitedAutonomyTrial(request({
  kind: 'broken_reference',
  code: 'unresolved_module_reference',
  check: { id: 'inspection_agent', command: 'npm --prefix tools/dev-inspection-agent run check', status: 'failed', head_sha: mainSha },
  target_paths: ['tools/dev-inspection-agent/src/manual-readonly-analysis.mjs']
}), [], { now });
assert.equal(brokenReference.outcome.trial_authorized, true);
assert.equal(brokenReference.trial.finding.kind, 'broken_reference');

for (const mutation of [
  (value) => { value.source_report.status.code = 'stale'; },
  (value) => { value.source_report.evidence.ci.conclusion = 'success'; },
  (value) => { value.source_report.evidence.ci.head_sha = 'c'.repeat(40); },
  (value) => { value.source_report.cause_candidates = [{ code: 'pages_failure_observed', likelihood: 'high' }]; },
  (value) => { value.source_report.publication.state = 'published'; }
]) {
  const candidate = request();
  mutation(candidate);
  const rejected = authorizeLimitedAutonomyTrial(candidate, [], { now });
  assert.deepEqual(rejected.outcome, { trial_authorized: false, reason_code: 'failure_not_explicit_or_not_bound_to_main' });
}

for (const mutation of [
  (value) => { value.finding.kind = 'behavior_regression'; },
  (value) => { value.finding.code = 'unknown_failure'; },
  (value) => { value.finding.check.command = 'npm test'; },
  (value) => { value.finding.check.status = 'unknown'; },
  (value) => { value.finding.target_paths = ['js/save.js']; },
  (value) => { value.finding.target_paths = ['js/data.js']; },
  (value) => { value.finding.target_paths = ['images/monsters/missing.webp']; },
  (value) => { value.finding.target_paths = ['.github/workflows/validate.yml']; },
  (value) => { value.finding.target_paths = ['safe.js', 'safe.js']; },
  (value) => { value.finding.target_paths = ['a.js', 'b.js', 'c.js', 'd.js']; }
]) {
  const candidate = request();
  mutation(candidate);
  const rejected = authorizeLimitedAutonomyTrial(candidate, [], { now });
  assert.deepEqual(rejected.outcome, { trial_authorized: false, reason_code: 'finding_not_allowlisted' });
}

const oversized = request();
oversized.ignored = 'oversized-secret-'.repeat(20000);
const tooLarge = authorizeLimitedAutonomyTrial(oversized, [], { now });
assert.deepEqual(tooLarge.outcome, { trial_authorized: false, reason_code: 'input_too_large' });
assert.equal(JSON.stringify(tooLarge).includes('oversized-secret'), false);

const expiredLedger = [{
  ...authorized.ledger[0],
  started_at: '2026-09-01T10:00:00.000Z',
  expires_at: '2026-09-01T11:00:00.000Z'
}];
const afterExpiry = authorizeLimitedAutonomyTrial(input, expiredLedger, { now });
assert.equal(afterExpiry.outcome.trial_authorized, true);
assert.equal(afterExpiry.ledger.length, 1);

assert.deepEqual(authorized.side_effects, {
  network_requests: false,
  host_file_writes: false,
  repository_writes: false,
  git_writes: false,
  branch_creation: false,
  commit_creation: false,
  pull_request_creation: false,
  issue_posts: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});
assert.equal(LIMITED_AUTONOMY_LIMITS.max_attempts_per_trial, 1);
assert.equal(LIMITED_AUTONOMY_LIMITS.max_target_paths, 3);
assert.deepEqual(LIMITED_AUTONOMY_LIMITS.allowed_finding_kinds, ['test_failure', 'broken_reference']);

const source = await readFile(new URL('../src/limited-autonomy-policy.mjs', import.meta.url), 'utf8');
for (const forbidden of ['fetch(', "from 'node:http'", "from 'node:https'", 'writeFile', 'appendFile', 'child_process', 'process.env']) {
  assert.equal(source.includes(forbidden), false, `limited autonomy path must not contain ${forbidden}`);
}
for (const forbidden of ['POST', 'PUT', 'PATCH', 'DELETE', 'contents:write', 'pull_requests:write', 'issues:write']) {
  assert.equal(new RegExp(`\\b${forbidden.replace(':', '\\:')}\\b`).test(source), false,
    `limited autonomy path must not declare ${forbidden}`);
}

const contract = JSON.parse(await readFile(new URL('../limited-autonomy-contract.json', import.meta.url), 'utf8'));
assert.equal(contract.default_decision, 'deny');
assert.equal(contract.eligibility.maximum_attempts_per_trial, 1);
assert.equal(contract.external_writes.branch, false);
assert.equal(contract.external_writes.pull_request, false);
assert.equal(contract.external_writes.merge, false);
assert.equal(contract.publication.fresh_confirmation_per_materialization, true);
assert.equal(contract.compatibility.save_key, 'mb_v95c');

console.log('Development inspection agent limited autonomy policy validation passed.');
