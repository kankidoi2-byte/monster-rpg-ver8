import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareIsolatedRemediation } from '../src/isolated-remediation-environment.mjs';
import {
  generateMinimalPatchProposal,
  MINIMAL_PATCH_PROPOSAL_LIMITS
} from '../src/minimal-patch-proposal.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const now = '2026-09-02T08:10:00.000Z';
const baseSha = 'a'.repeat(40);
const sourceA = 'export const retryLimit = 1;\nexport const mode = "safe";\n';
const sourceB = '.status { color: #b91c1c; }\n';

function blobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1').update(Buffer.from(`blob ${body.byteLength}\0`)).update(body).digest('hex');
}

function environmentId(environment) {
  const canonical = [
    'kankidoi2-byte/monster-rpg-ver8',
    environment.base.sha,
    environment.source_draft.draft_id,
    ...environment.workspace.source_files
      .slice()
      .sort((left, right) => left.path.localeCompare(right.path))
      .map((file) => `${file.path}:${file.blob_sha}:${file.bytes}`)
  ].join('\n');
  return `phase28:${createHash('sha256').update(canonical).digest('hex')}`;
}

function environmentFor(sources = [
  { path: 'js/diagnostics.js', content: sourceA },
  { path: 'styles.css', content: sourceB }
]) {
  const prepared = prepareIsolatedRemediation({
    schema_version: 1,
    mode: 'isolated_remediation_request',
    repository: 'kankidoi2-byte/monster-rpg-ver8',
    requested_at: now,
    base: { branch: 'main', sha: baseSha },
    source_draft: {
      schema_version: 1,
      draft_id: `phase27:${'b'.repeat(64)}`,
      report_id: `phase26:${'c'.repeat(64)}`,
      status: 'failed',
      publication: {
        state: 'unpublished',
        destination: null,
        requires_fresh_confirmation: true,
        issue_number: null
      }
    },
    files: sources.map((source) => ({
      path: source.path,
      blob_sha: blobSha(source.content),
      bytes: Buffer.byteLength(source.content)
    }))
  }, { now });
  assert.equal(prepared.outcome.environment_prepared, true);
  return prepared.environment;
}

function validRequest() {
  const resultA = sourceA.replace('retryLimit = 1', 'retryLimit = 2');
  const resultB = sourceB.replace('#b91c1c', '#991b1b');
  const environment = environmentFor();
  return {
    schema_version: 1,
    mode: 'minimal_patch_proposal_request',
    repository: 'kankidoi2-byte/monster-rpg-ver8',
    requested_at: now,
    environment,
    files: [
      {
        path: 'js/diagnostics.js',
        base_blob_sha: blobSha(sourceA),
        source_text: sourceA,
        edits: [{ before: 'retryLimit = 1', after: 'retryLimit = 2' }]
      },
      {
        path: 'styles.css',
        base_blob_sha: blobSha(sourceB),
        source_text: sourceB,
        edits: [{ before: '#b91c1c', after: '#991b1b' }]
      }
    ],
    validation: {
      environment_id: environment.environment_id,
      base_sha: baseSha,
      result_files: [
        { path: 'js/diagnostics.js', blob_sha: blobSha(resultA) },
        { path: 'styles.css', blob_sha: blobSha(resultB) }
      ],
      checks: environment.test_plan.map((test) => ({ ...test, status: 'passed' }))
    }
  };
}

const request = validRequest();
const before = structuredClone(request);
const generated = generateMinimalPatchProposal(request, { now });
assert.deepEqual(generated.outcome, { proposal_generated: true, reason_code: 'proposal_generated' });
assert.equal(generated.phase, 29);
assert.equal(generated.mode, 'unpublished_minimal_patch_proposal');
assert.match(generated.proposal.proposal_id, /^phase29:[0-9a-f]{64}$/);
assert.deepEqual(generated.proposal.base, { branch: 'main', sha: baseSha, immutable: true });
assert.deepEqual(generated.proposal.scope, {
  file_count: 2,
  edit_count: 2,
  changed_lines: 4,
  minimality_rule: 'exact_once_replacements_only'
});
assert.deepEqual(generated.proposal.files.map((file) => file.path), ['js/diagnostics.js', 'styles.css']);
assert.deepEqual(generated.proposal.files[0].edits[0], {
  operation: 'replace_exact_once',
  before: 'retryLimit = 1',
  after: 'retryLimit = 2',
  removed_lines: 1,
  added_lines: 1
});
assert.deepEqual(generated.proposal.compatibility, {
  save_key: 'mb_v95c',
  save_key_unchanged: true,
  protected_ids_unchanged: true,
  protected_paths_unchanged: true,
  source_blobs_verified: true
});
assert.equal(generated.proposal.validation.state, 'passed');
assert.equal(generated.proposal.validation.raw_logs_retained, false);
assert.deepEqual(generated.proposal.publication, {
  state: 'unpublished',
  destination: null,
  branch: null,
  commit: null,
  pull_request: null,
  requires_fresh_confirmation_for_branch_and_pull_request: true
});
assert.deepEqual(request, before);
assert.equal(Object.isFrozen(generated), true);
assert.equal(Object.isFrozen(generated.proposal), true);
assert.equal(Object.isFrozen(generated.proposal.files), true);
assert.equal(Object.isFrozen(generated.proposal.files[0].edits[0]), true);

const deterministic = generateMinimalPatchProposal(request, { now });
assert.equal(deterministic.proposal.proposal_id, generated.proposal.proposal_id);
assert.deepEqual(deterministic.proposal, generated.proposal);

const expired = validRequest();
assert.equal(generateMinimalPatchProposal(expired, { now: '2026-09-02T09:11:00.000Z' }).outcome.reason_code,
  'invalid_or_expired_environment');
const weakenedGuard = validRequest();
weakenedGuard.environment = structuredClone(weakenedGuard.environment);
weakenedGuard.environment.guards.git = 'allowed';
assert.equal(generateMinimalPatchProposal(weakenedGuard, { now }).outcome.reason_code,
  'invalid_or_expired_environment');
const forgedUnsafeEnvironment = validRequest();
forgedUnsafeEnvironment.environment = structuredClone(forgedUnsafeEnvironment.environment);
forgedUnsafeEnvironment.environment.workspace.source_files[0].path = '.github/workflows/unsafe.yml';
forgedUnsafeEnvironment.environment.workspace.writable_paths[0] = '.github/workflows/unsafe.yml';
forgedUnsafeEnvironment.environment.environment_id = environmentId(forgedUnsafeEnvironment.environment);
forgedUnsafeEnvironment.validation.environment_id = forgedUnsafeEnvironment.environment.environment_id;
assert.equal(generateMinimalPatchProposal(forgedUnsafeEnvironment, { now }).outcome.reason_code,
  'invalid_or_expired_environment');
const wrongEnvironmentTotals = validRequest();
wrongEnvironmentTotals.environment = structuredClone(wrongEnvironmentTotals.environment);
wrongEnvironmentTotals.environment.workspace.source_bytes += 1;
assert.equal(generateMinimalPatchProposal(wrongEnvironmentTotals, { now }).outcome.reason_code,
  'invalid_or_expired_environment');
const extendedLifetime = validRequest();
extendedLifetime.environment = structuredClone(extendedLifetime.environment);
extendedLifetime.environment.lifecycle.expires_at = '2026-09-03T08:10:00.000Z';
assert.equal(generateMinimalPatchProposal(extendedLifetime, { now }).outcome.reason_code,
  'invalid_or_expired_environment');

const wrongPath = validRequest();
wrongPath.files[0].path = 'scripts/unlisted.mjs';
assert.equal(generateMinimalPatchProposal(wrongPath, { now }).outcome.reason_code, 'invalid_or_unsafe_changes');
const wrongSource = validRequest();
wrongSource.files[0].source_text = sourceA.replace('safe', 'unsafe');
assert.equal(generateMinimalPatchProposal(wrongSource, { now }).outcome.reason_code, 'invalid_or_unsafe_changes');
const wrongBlob = validRequest();
wrongBlob.files[0].base_blob_sha = 'f'.repeat(40);
assert.equal(generateMinimalPatchProposal(wrongBlob, { now }).outcome.reason_code, 'invalid_or_unsafe_changes');
const duplicatedPath = validRequest();
duplicatedPath.files[1] = structuredClone(duplicatedPath.files[0]);
assert.equal(generateMinimalPatchProposal(duplicatedPath, { now }).outcome.reason_code, 'invalid_or_unsafe_changes');

const duplicateMatchSource = 'const flag = false;\nconst other = false;\n';
const duplicateMatch = validRequest();
duplicateMatch.environment = environmentFor([{ path: 'scripts/example.mjs', content: duplicateMatchSource }]);
duplicateMatch.files = [{
  path: 'scripts/example.mjs',
  base_blob_sha: blobSha(duplicateMatchSource),
  source_text: duplicateMatchSource,
  edits: [{ before: 'false', after: 'true' }]
}];
assert.equal(generateMinimalPatchProposal(duplicateMatch, { now }).outcome.reason_code, 'invalid_or_unsafe_changes');

for (const edit of [
  { before: 'retryLimit = 1', after: 'retryLimit = 1' },
  { before: 'retryLimit = 1', after: 'const token = "ghp_abcdefghijklmnopqrstuvwxyz"' },
  { before: 'retryLimit = 1', after: 'const saveKey = "mb_v95c"' },
  { before: 'retryLimit = 1', after: 'const starter = "elna_beginner"' }
]) {
  const unsafe = validRequest();
  unsafe.files[0].edits = [edit];
  assert.equal(generateMinimalPatchProposal(unsafe, { now }).outcome.reason_code, 'invalid_or_unsafe_changes');
}
const secretSource = 'export const password = "highly-sensitive-value";\n';
const secretBefore = validRequest();
secretBefore.environment = environmentFor([{ path: 'scripts/example.mjs', content: secretSource }]);
secretBefore.files = [{
  path: 'scripts/example.mjs',
  base_blob_sha: blobSha(secretSource),
  source_text: secretSource,
  edits: [{ before: 'password = "highly-sensitive-value"', after: 'password = "redacted-value"' }]
}];
assert.equal(generateMinimalPatchProposal(secretBefore, { now }).outcome.reason_code, 'invalid_or_unsafe_changes');

const tooManySources = Array.from({ length: 4 }, (_, index) => ({
  path: `scripts/example-${index}.mjs`, content: `export const value${index} = 1;\n`
}));
const tooManyFiles = validRequest();
tooManyFiles.environment = environmentFor(tooManySources);
tooManyFiles.files = tooManySources.map((source) => ({
  path: source.path,
  base_blob_sha: blobSha(source.content),
  source_text: source.content,
  edits: [{ before: '= 1', after: '= 2' }]
}));
assert.equal(generateMinimalPatchProposal(tooManyFiles, { now }).outcome.reason_code, 'invalid_or_unsafe_changes');

const failedTest = validRequest();
failedTest.validation.checks[0].status = 'failed';
assert.equal(generateMinimalPatchProposal(failedTest, { now }).outcome.reason_code, 'validation_not_bound_or_failed');
const staleResult = validRequest();
staleResult.validation.result_files[0].blob_sha = '0'.repeat(40);
assert.equal(generateMinimalPatchProposal(staleResult, { now }).outcome.reason_code,
  'validation_not_bound_or_failed');
const missingCheck = validRequest();
missingCheck.validation.checks.pop();
assert.equal(generateMinimalPatchProposal(missingCheck, { now }).outcome.reason_code,
  'validation_not_bound_or_failed');

const oversized = validRequest();
oversized.padding = 'x'.repeat(769 * 1024);
assert.deepEqual(generateMinimalPatchProposal(oversized, { now }).outcome, {
  proposal_generated: false,
  reason_code: 'input_too_large'
});
assert.equal(JSON.stringify(generateMinimalPatchProposal(oversized, { now })).includes(oversized.padding), false);

assert.deepEqual(generated.side_effects, {
  network_requests: false,
  file_writes: false,
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
assert.deepEqual(MINIMAL_PATCH_PROPOSAL_LIMITS, {
  repository: 'kankidoi2-byte/monster-rpg-ver8',
  max_input_bytes: 786432,
  max_files: 3,
  max_edits: 5,
  max_fragment_bytes: 8192,
  max_changed_lines: 120,
  protected_literals: ['mb_v95c', 'elna_beginner', 'freigal', 'aquaron', 'grassbeat', 'volteck'],
  proposal_id_pattern: '^phase29:[0-9a-f]{64}$'
});

const source = fs.readFileSync(path.join(root, 'src/minimal-patch-proposal.mjs'), 'utf8');
for (const forbidden of [
  'fetch(', 'node:fs', 'node:http', 'node:https', 'writeFile', 'appendFile', 'unlink', 'rmSync',
  'child_process', 'process.env'
]) {
  assert.equal(source.includes(forbidden), false, `proposal core must not contain ${forbidden}`);
}
for (const forbidden of ['POST', 'PUT', 'DELETE', 'issues:write', 'workflows:write']) {
  const declaration = forbidden.includes(':') ? source.includes(forbidden) : new RegExp(`\\b${forbidden}\\b`).test(source);
  assert.equal(declaration, false, `proposal core must not declare ${forbidden}`);
}

console.log('Development inspection agent minimal patch proposal validation passed.');
