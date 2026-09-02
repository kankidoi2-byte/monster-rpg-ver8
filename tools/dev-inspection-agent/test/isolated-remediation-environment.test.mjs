import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ISOLATED_REMEDIATION_LIMITS,
  prepareIsolatedRemediation
} from '../src/isolated-remediation-environment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const now = '2026-09-02T06:59:00.000Z';
const baseSha = 'a'.repeat(40);
const draftId = `phase27:${'b'.repeat(64)}`;
const reportId = `phase26:${'c'.repeat(64)}`;

function request(files = [
  { path: 'tools/dev-inspection-agent/src/automatic-issue-draft.mjs', blob_sha: 'd'.repeat(40), bytes: 8192 },
  { path: 'tools/dev-inspection-agent/test/automatic-issue-draft.test.mjs', blob_sha: 'e'.repeat(40), bytes: 7168 }
]) {
  return {
    schema_version: 1,
    mode: 'isolated_remediation_request',
    repository: 'kankidoi2-byte/monster-rpg-ver8',
    requested_at: now,
    base: { branch: 'main', sha: baseSha },
    source_draft: {
      schema_version: 1,
      draft_id: draftId,
      report_id: reportId,
      status: 'failed',
      publication: {
        state: 'unpublished',
        destination: null,
        requires_fresh_confirmation: true,
        issue_number: null
      },
      title: 'untrusted-title-must-not-appear',
      body: 'untrusted-body-must-not-appear'
    },
    files,
    secret: 'request-secret-must-not-appear'
  };
}

const input = request();
const before = structuredClone(input);
const prepared = prepareIsolatedRemediation(input, { now });
assert.equal(prepared.phase, 28);
assert.equal(prepared.mode, 'isolated_memory_overlay');
assert.deepEqual(prepared.outcome, { environment_prepared: true, reason_code: 'environment_prepared' });
assert.match(prepared.environment.environment_id, /^phase28:[0-9a-f]{64}$/);
assert.deepEqual(prepared.environment.base, { branch: 'main', sha: baseSha, immutable: true });
assert.deepEqual(prepared.environment.source_draft, { draft_id: draftId, report_id: reportId, status: 'failed' });
assert.deepEqual(prepared.environment.feasibility, {
  eligible_for_isolated_proposal: true, reason_code: 'bounded_snapshot_ready'
});
assert.equal(prepared.environment.workspace.kind, 'ephemeral_memory_overlay');
assert.equal(prepared.environment.workspace.state, 'prepared_empty_overlay');
assert.equal(prepared.environment.workspace.persistence, false);
assert.equal(prepared.environment.workspace.source_file_count, 2);
assert.equal(prepared.environment.workspace.source_bytes, 15360);
assert.deepEqual(prepared.environment.workspace.writable_paths, [
  'tools/dev-inspection-agent/src/automatic-issue-draft.mjs',
  'tools/dev-inspection-agent/test/automatic-issue-draft.test.mjs'
]);
assert.deepEqual(prepared.environment.test_plan, [
  { id: 'full_check', command: 'npm run check' },
  { id: 'inspection_manual', command: 'npm run check:dev-inspection-agent-manual' },
  { id: 'inspection_triggers', command: 'npm run check:dev-inspection-agent-triggers' },
  { id: 'inspection_reports', command: 'npm run check:dev-inspection-agent-reports' },
  { id: 'inspection_drafts', command: 'npm run check:dev-inspection-agent-issue-drafts' }
]);
assert.equal(prepared.environment.guards.write_scope, 'memory_overlay_only');
assert.equal(prepared.environment.guards.network, 'denied');
assert.equal(prepared.environment.guards.host_filesystem, 'denied');
assert.equal(prepared.environment.guards.git, 'denied');
assert.equal(prepared.environment.guards.maximum_attempts, 1);
assert.deepEqual(prepared.environment.lifecycle, {
  prepared_at: now,
  expires_at: '2026-09-02T07:59:00.000Z',
  cleanup: 'discard_memory_overlay',
  retain_patch_content: false
});
assert.equal(JSON.stringify(prepared).includes('untrusted-title'), false);
assert.equal(JSON.stringify(prepared).includes('untrusted-body'), false);
assert.equal(JSON.stringify(prepared).includes('request-secret'), false);
assert.deepEqual(input, before);
assert.equal(Object.isFrozen(prepared), true);
assert.equal(Object.isFrozen(prepared.environment), true);
assert.equal(Object.isFrozen(prepared.environment.workspace.source_files), true);

const deterministic = prepareIsolatedRemediation(input, { now });
assert.equal(deterministic.environment.environment_id, prepared.environment.environment_id);
assert.deepEqual(deterministic.environment, prepared.environment);

const generic = prepareIsolatedRemediation(request([
  { path: 'js/diagnostics.js', blob_sha: 'f'.repeat(40), bytes: 4096 },
  { path: 'styles.css', blob_sha: '1'.repeat(40), bytes: 2048 }
]), { now });
assert.deepEqual(generic.environment.test_plan, [
  { id: 'full_check', command: 'npm run check' },
  { id: 'ui_contract', command: 'npm run check:ui-contract' },
  { id: 'diagnostics', command: 'npm run check:diagnostics-comprehensive' }
]);

for (const status of ['stale', 'unavailable']) {
  const value = request();
  value.source_draft.status = status;
  assert.equal(prepareIsolatedRemediation(value, { now }).outcome.environment_prepared, true);
}

for (const status of ['healthy', 'in_progress', 'awaiting_confirmation', 'publish_pending']) {
  const value = request();
  value.source_draft.status = status;
  assert.deepEqual(prepareIsolatedRemediation(value, { now }).outcome, {
    environment_prepared: false, reason_code: 'invalid_source_draft'
  });
}

const published = request();
published.source_draft.publication.state = 'published';
assert.equal(prepareIsolatedRemediation(published, { now }).outcome.reason_code, 'invalid_source_draft');
const noFreshConfirmation = request();
noFreshConfirmation.source_draft.publication.requires_fresh_confirmation = false;
assert.equal(prepareIsolatedRemediation(noFreshConfirmation, { now }).outcome.reason_code, 'invalid_source_draft');

for (const unsafePath of [
  '../js/app.js', '/tmp/app.js', 'js\\app.js', '.github/workflows/validate.yml', '.git/config',
  '.env', 'config/credentials.json', 'private/server.pem', 'AGENTS.md',
  'docs/dev-tools-agent-execution-contract.json', 'js/save.js', 'js/data.js', 'images/monsters/test.webp'
]) {
  const rejected = prepareIsolatedRemediation(request([
    { path: unsafePath, blob_sha: '2'.repeat(40), bytes: 100 }
  ]), { now });
  assert.deepEqual(rejected.outcome, {
    environment_prepared: false, reason_code: 'unsafe_or_invalid_file_snapshot'
  });
  assert.equal(rejected.environment, null);
  assert.equal(JSON.stringify(rejected).includes(unsafePath), false);
}

const tooMany = request(Array.from({ length: 21 }, (_, index) => ({
  path: `scripts/check-${index}.mjs`, blob_sha: index.toString(16).padStart(40, '0'), bytes: 1
})));
assert.equal(prepareIsolatedRemediation(tooMany, { now }).outcome.reason_code, 'unsafe_or_invalid_file_snapshot');
const tooLargeFile = request([{ path: 'scripts/check.mjs', blob_sha: '3'.repeat(40), bytes: 262145 }]);
assert.equal(prepareIsolatedRemediation(tooLargeFile, { now }).outcome.reason_code, 'unsafe_or_invalid_file_snapshot');
const noFiles = request([]);
assert.equal(prepareIsolatedRemediation(noFiles, { now }).outcome.reason_code, 'unsafe_or_invalid_file_snapshot');

const invalidRequest = request();
invalidRequest.base.branch = 'feature';
assert.deepEqual(prepareIsolatedRemediation(invalidRequest, { now }).outcome, {
  environment_prepared: false, reason_code: 'invalid_request'
});
const oversized = request();
oversized.padding = 'oversize-secret-'.repeat(20000);
assert.deepEqual(prepareIsolatedRemediation(oversized, { now }).outcome, {
  environment_prepared: false, reason_code: 'input_too_large'
});
assert.equal(JSON.stringify(prepareIsolatedRemediation(oversized, { now })).includes('oversize-secret'), false);

assert.deepEqual(prepared.side_effects, {
  network_requests: false,
  file_writes: false,
  repository_writes: false,
  git_writes: false,
  branch_creation: false,
  pull_request_creation: false,
  issue_posts: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});
assert.deepEqual(ISOLATED_REMEDIATION_LIMITS, {
  repository: 'kankidoi2-byte/monster-rpg-ver8',
  max_input_bytes: 262144,
  max_files: 20,
  max_file_bytes: 262144,
  max_total_file_bytes: 524288,
  max_path_chars: 160,
  session_ttl_ms: 3600000,
  max_tests: 5,
  actionable_statuses: ['failed', 'stale', 'unavailable'],
  environment_id_pattern: '^phase28:[0-9a-f]{64}$'
});

const source = fs.readFileSync(path.join(root, 'src/isolated-remediation-environment.mjs'), 'utf8');
for (const forbidden of ['fetch(', 'node:fs', 'node:http', 'node:https', 'writeFile', 'appendFile', 'unlink', 'rmSync', 'child_process', 'process.env']) {
  assert.equal(source.includes(forbidden), false, `isolated environment core must not contain ${forbidden}`);
}
for (const forbidden of ['POST', 'PUT', 'PATCH', 'DELETE', 'issues:write', 'workflows:write']) {
  const declaration = forbidden.includes(':') ? source.includes(forbidden) : new RegExp(`\\b${forbidden}\\b`).test(source);
  assert.equal(declaration, false, `isolated environment core must not declare ${forbidden}`);
}

console.log('Development inspection agent isolated remediation environment validation passed.');
