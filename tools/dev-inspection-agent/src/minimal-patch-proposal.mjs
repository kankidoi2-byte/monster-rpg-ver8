import { createHash } from 'node:crypto';

const SCHEMA_VERSION = 1;
const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const INPUT_MODE = 'minimal_patch_proposal_request';
const OUTPUT_MODE = 'unpublished_minimal_patch_proposal';
const MAX_INPUT_BYTES = 768 * 1024;
const MAX_FILES = 3;
const MAX_EDITS = 5;
const MAX_FRAGMENT_BYTES = 8 * 1024;
const MAX_CHANGED_LINES = 120;
const MAX_SOURCE_BYTES = 512 * 1024;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const ENVIRONMENT_ID_PATTERN = /^phase28:[0-9a-f]{64}$/;
const DRAFT_ID_PATTERN = /^phase27:[0-9a-f]{64}$/;
const REPORT_ID_PATTERN = /^phase26:[0-9a-f]{64}$/;
const PROPOSAL_ID_PATTERN = /^phase29:[0-9a-f]{64}$/;
const ACTIONABLE_STATUSES = new Set(['failed', 'stale', 'unavailable']);
const SAFE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.txt']);
const PROTECTED_LITERALS = Object.freeze([
  'mb_v95c',
  'elna_beginner',
  'freigal',
  'aquaron',
  'grassbeat',
  'volteck'
]);

const SIDE_EFFECTS = Object.freeze({
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

function inputBytes(input) {
  try {
    return Buffer.byteLength(JSON.stringify(input), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function fixedTime(value) {
  const milliseconds = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  const header = Buffer.from(`blob ${body.byteLength}\0`, 'utf8');
  return createHash('sha1').update(header).update(body).digest('hex');
}

function lineCount(text) {
  if (text.length === 0) return 0;
  return text.split('\n').length;
}

function occurrences(text, fragment) {
  let count = 0;
  let offset = 0;
  while (offset <= text.length - fragment.length) {
    const found = text.indexOf(fragment, offset);
    if (found < 0) break;
    count += 1;
    offset = found + fragment.length;
  }
  return count;
}

function containsSecret(text) {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)
    || /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})\b/.test(text)
    || /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret|credential)\s*[:=]\s*["'][^"'\n]{8,}["']/i.test(text);
}

function touchesProtectedLiteral(before, after) {
  return PROTECTED_LITERALS.some((literal) => before.includes(literal) || after.includes(literal));
}

function safePath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 160
    || value.startsWith('/') || value.includes('\\') || value.includes('\0')
    || !/^[A-Za-z0-9._/-]+$/.test(value)) return false;
  const lower = value.toLowerCase();
  const segments = lower.split('/');
  const dot = lower.lastIndexOf('.');
  const extension = dot >= 0 ? lower.slice(dot) : '';
  return !segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..'
      || segment.includes('secret') || segment.includes('credential') || segment.includes('token')
      || segment.endsWith('.pem') || segment.endsWith('.key'))
    && SAFE_EXTENSIONS.has(extension)
    && lower !== 'agents.md'
    && lower !== 'docs/dev-tools-agent-execution-contract.json'
    && lower !== 'js/save.js'
    && lower !== 'js/data.js'
    && lower !== '.git' && !lower.startsWith('.git/')
    && lower !== '.github' && !lower.startsWith('.github/')
    && lower !== '.env' && !lower.startsWith('.env.')
    && !lower.startsWith('images/') && !lower.startsWith('assets/');
}

function safeEnvironment(value, nowMs) {
  if (value?.schema_version !== SCHEMA_VERSION
    || !ENVIRONMENT_ID_PATTERN.test(value?.environment_id ?? '')
    || value?.repository !== REPOSITORY
    || value?.base?.branch !== 'main'
    || !SHA_PATTERN.test(value?.base?.sha ?? '')
    || value?.base?.immutable !== true
    || value?.feasibility?.eligible_for_isolated_proposal !== true
    || value?.feasibility?.reason_code !== 'bounded_snapshot_ready'
    || value?.workspace?.kind !== 'ephemeral_memory_overlay'
    || value?.workspace?.state !== 'prepared_empty_overlay'
    || value?.workspace?.persistence !== false
    || value?.guards?.write_scope !== 'memory_overlay_only'
    || value?.guards?.network !== 'denied'
    || value?.guards?.host_filesystem !== 'denied'
    || value?.guards?.repository !== 'read_only_snapshot'
    || value?.guards?.git !== 'denied'
    || value?.guards?.branch_and_pull_request !== 'denied_until_phase30_fresh_confirmation'
    || value?.guards?.issue_post !== 'denied_without_fresh_confirmation'
    || value?.guards?.environment_variables !== 'unavailable'
    || value?.guards?.maximum_attempts !== 1
    || value?.lifecycle?.cleanup !== 'discard_memory_overlay'
    || value?.lifecycle?.retain_patch_content !== false) return null;

  const preparedAt = fixedTime(value.lifecycle.prepared_at);
  const expiresAt = fixedTime(value.lifecycle.expires_at);
  if (preparedAt === null || expiresAt === null || expiresAt <= preparedAt
    || expiresAt - preparedAt > 60 * 60 * 1000
    || nowMs < preparedAt || nowMs > expiresAt) return null;

  if (!DRAFT_ID_PATTERN.test(value?.source_draft?.draft_id ?? '')
    || !REPORT_ID_PATTERN.test(value?.source_draft?.report_id ?? '')
    || !ACTIONABLE_STATUSES.has(value?.source_draft?.status)) return null;

  const sourceFiles = value.workspace.source_files;
  const writablePaths = value.workspace.writable_paths;
  const testPlan = value.test_plan;
  if (!Array.isArray(sourceFiles) || sourceFiles.length === 0 || sourceFiles.length > 20
    || !Array.isArray(writablePaths) || writablePaths.length !== sourceFiles.length
    || !Array.isArray(testPlan) || testPlan.length === 0 || testPlan.length > 5) return null;

  const files = new Map();
  let sourceBytes = 0;
  for (const file of sourceFiles) {
    if (!safePath(file?.path) || !SHA_PATTERN.test(file?.blob_sha ?? '')
      || !Number.isSafeInteger(file?.bytes) || file.bytes < 0 || file.bytes > 256 * 1024
      || file?.source_access !== 'read_only' || files.has(file.path)) return null;
    sourceBytes += file.bytes;
    if (sourceBytes > MAX_SOURCE_BYTES) return null;
    files.set(file.path, Object.freeze({ path: file.path, blob_sha: file.blob_sha, bytes: file.bytes }));
  }
  if (writablePaths.some((path) => typeof path !== 'string' || !files.has(path))
    || new Set(writablePaths).size !== files.size
    || value.workspace.source_file_count !== files.size
    || value.workspace.source_bytes !== sourceBytes) return null;

  const canonical = [
    REPOSITORY,
    value.base.sha,
    value.source_draft.draft_id,
    ...[...files.values()].sort((left, right) => left.path.localeCompare(right.path))
      .map((file) => `${file.path}:${file.blob_sha}:${file.bytes}`)
  ].join('\n');
  const expectedEnvironmentId = `phase28:${createHash('sha256').update(canonical).digest('hex')}`;
  if (value.environment_id !== expectedEnvironmentId) return null;

  const tests = [];
  const testIds = new Set();
  for (const test of testPlan) {
    if (typeof test?.id !== 'string' || !/^[a-z0-9_]{1,48}$/.test(test.id)
      || typeof test?.command !== 'string' || !/^npm run check(?::[a-z0-9-]+)?$/.test(test.command)
      || testIds.has(test.id)) return null;
    testIds.add(test.id);
    tests.push(Object.freeze({ id: test.id, command: test.command }));
  }
  return Object.freeze({
    environment_id: value.environment_id,
    base: Object.freeze({ branch: 'main', sha: value.base.sha }),
    files,
    tests: Object.freeze(tests),
    expires_at: value.lifecycle.expires_at
  });
}

function applyEdits(file, expected, counters) {
  if (file?.path !== expected.path || file?.base_blob_sha !== expected.blob_sha
    || typeof file?.source_text !== 'string'
    || Buffer.byteLength(file.source_text, 'utf8') !== expected.bytes
    || gitBlobSha(file.source_text) !== expected.blob_sha
    || !Array.isArray(file.edits) || file.edits.length === 0) return null;

  let content = file.source_text;
  const edits = [];
  for (const edit of file.edits) {
    counters.edits += 1;
    if (counters.edits > MAX_EDITS || typeof edit?.before !== 'string' || edit.before.length === 0
      || typeof edit?.after !== 'string' || edit.before === edit.after
      || edit.before.includes('\0') || edit.after.includes('\0')
      || Buffer.byteLength(edit.before, 'utf8') > MAX_FRAGMENT_BYTES
      || Buffer.byteLength(edit.after, 'utf8') > MAX_FRAGMENT_BYTES
      || occurrences(content, edit.before) !== 1
      || containsSecret(edit.before) || containsSecret(edit.after)
      || touchesProtectedLiteral(edit.before, edit.after)) return null;
    const changedLines = lineCount(edit.before) + lineCount(edit.after);
    counters.changedLines += changedLines;
    if (counters.changedLines > MAX_CHANGED_LINES) return null;
    content = content.replace(edit.before, edit.after);
    edits.push(Object.freeze({
      operation: 'replace_exact_once',
      before: edit.before,
      after: edit.after,
      removed_lines: lineCount(edit.before),
      added_lines: lineCount(edit.after)
    }));
  }
  return Object.freeze({
    path: file.path,
    base_blob_sha: expected.blob_sha,
    result_blob_sha: gitBlobSha(content),
    edits: Object.freeze(edits),
    changed_lines: edits.reduce((sum, edit) => sum + edit.removed_lines + edit.added_lines, 0)
  });
}

function safeValidation(value, environment, files) {
  if (value?.environment_id !== environment.environment_id
    || value?.base_sha !== environment.base.sha
    || !Array.isArray(value?.result_files) || value.result_files.length !== files.length
    || !Array.isArray(value?.checks) || value.checks.length !== environment.tests.length) return null;

  const expectedFiles = new Map(files.map((file) => [file.path, file.result_blob_sha]));
  const resultFiles = [];
  for (const file of value.result_files) {
    if (typeof file?.path !== 'string' || !SHA_PATTERN.test(file?.blob_sha ?? '')
      || expectedFiles.get(file.path) !== file.blob_sha) return null;
    resultFiles.push(Object.freeze({ path: file.path, blob_sha: file.blob_sha }));
  }
  if (new Set(resultFiles.map((file) => file.path)).size !== expectedFiles.size) return null;
  resultFiles.sort((left, right) => left.path.localeCompare(right.path));

  const expectedTests = new Map(environment.tests.map((test) => [test.id, test.command]));
  const checks = [];
  for (const check of value.checks) {
    if (typeof check?.id !== 'string' || expectedTests.get(check.id) !== check.command
      || check?.status !== 'passed') return null;
    checks.push(Object.freeze({ id: check.id, command: check.command, status: 'passed' }));
  }
  if (new Set(checks.map((check) => check.id)).size !== expectedTests.size) return null;
  checks.sort((left, right) => left.id.localeCompare(right.id));
  return Object.freeze({
    state: 'passed',
    environment_id: environment.environment_id,
    base_sha: environment.base.sha,
    result_files: Object.freeze(resultFiles),
    checks: Object.freeze(checks),
    raw_logs_retained: false
  });
}

function result(reasonCode, proposal = null) {
  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    phase: 29,
    mode: OUTPUT_MODE,
    outcome: Object.freeze({ proposal_generated: proposal !== null, reason_code: reasonCode }),
    proposal,
    side_effects: SIDE_EFFECTS
  });
}

export function generateMinimalPatchProposal(request, options = {}) {
  if (inputBytes(request) > MAX_INPUT_BYTES) return result('input_too_large');
  const nowMs = fixedTime(options.now ?? request?.requested_at);
  if (request?.schema_version !== SCHEMA_VERSION || request?.mode !== INPUT_MODE
    || request?.repository !== REPOSITORY || nowMs === null) return result('invalid_request');

  const environment = safeEnvironment(request.environment, nowMs);
  if (!environment) return result('invalid_or_expired_environment');
  if (!Array.isArray(request.files) || request.files.length === 0 || request.files.length > MAX_FILES) {
    return result('invalid_or_unsafe_changes');
  }

  const counters = { edits: 0, changedLines: 0 };
  const files = [];
  const paths = new Set();
  for (const file of request.files) {
    if (paths.has(file?.path) || !environment.files.has(file?.path)) return result('invalid_or_unsafe_changes');
    paths.add(file.path);
    const applied = applyEdits(file, environment.files.get(file.path), counters);
    if (!applied) return result('invalid_or_unsafe_changes');
    files.push(applied);
  }
  files.sort((left, right) => left.path.localeCompare(right.path));

  const validation = safeValidation(request.validation, environment, files);
  if (!validation) return result('validation_not_bound_or_failed');
  const canonical = JSON.stringify({
    repository: REPOSITORY,
    environment_id: environment.environment_id,
    base_sha: environment.base.sha,
    files: files.map((file) => ({
      path: file.path,
      base_blob_sha: file.base_blob_sha,
      result_blob_sha: file.result_blob_sha,
      edits: file.edits.map((edit) => ({ before: edit.before, after: edit.after }))
    }))
  });
  const proposalId = `phase29:${createHash('sha256').update(canonical).digest('hex')}`;
  const proposal = Object.freeze({
    schema_version: SCHEMA_VERSION,
    proposal_id: proposalId,
    repository: REPOSITORY,
    base: Object.freeze({ branch: 'main', sha: environment.base.sha, immutable: true }),
    source_environment: Object.freeze({
      environment_id: environment.environment_id,
      expires_at: environment.expires_at
    }),
    scope: Object.freeze({
      file_count: files.length,
      edit_count: counters.edits,
      changed_lines: counters.changedLines,
      minimality_rule: 'exact_once_replacements_only'
    }),
    files: Object.freeze(files),
    compatibility: Object.freeze({
      save_key: 'mb_v95c',
      save_key_unchanged: true,
      protected_ids_unchanged: true,
      protected_paths_unchanged: true,
      source_blobs_verified: true
    }),
    validation,
    publication: Object.freeze({
      state: 'unpublished',
      destination: null,
      branch: null,
      commit: null,
      pull_request: null,
      requires_fresh_confirmation_for_branch_and_pull_request: true
    })
  });
  return result('proposal_generated', proposal);
}

export const MINIMAL_PATCH_PROPOSAL_LIMITS = Object.freeze({
  repository: REPOSITORY,
  max_input_bytes: MAX_INPUT_BYTES,
  max_files: MAX_FILES,
  max_edits: MAX_EDITS,
  max_fragment_bytes: MAX_FRAGMENT_BYTES,
  max_changed_lines: MAX_CHANGED_LINES,
  protected_literals: PROTECTED_LITERALS,
  proposal_id_pattern: PROPOSAL_ID_PATTERN.source
});
