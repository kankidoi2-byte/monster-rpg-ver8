import { createHash } from 'node:crypto';

const SCHEMA_VERSION = 1;
const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const INPUT_MODE = 'isolated_remediation_request';
const OUTPUT_MODE = 'isolated_memory_overlay';
const MAX_INPUT_BYTES = 256 * 1024;
const MAX_FILES = 20;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_FILE_BYTES = 512 * 1024;
const MAX_PATH_CHARS = 160;
const SESSION_TTL_MS = 60 * 60 * 1000;
const MAX_TESTS = 5;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DRAFT_ID_PATTERN = /^phase27:[0-9a-f]{64}$/;
const REPORT_ID_PATTERN = /^phase26:[0-9a-f]{64}$/;
const ENVIRONMENT_ID_PATTERN = /^phase28:[0-9a-f]{64}$/;
const ACTIONABLE_STATUSES = new Set(['failed', 'stale', 'unavailable']);
const SAFE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.txt']);

const TESTS = Object.freeze({
  full_check: Object.freeze({ id: 'full_check', command: 'npm run check' }),
  ui_contract: Object.freeze({ id: 'ui_contract', command: 'npm run check:ui-contract' }),
  diagnostics: Object.freeze({ id: 'diagnostics', command: 'npm run check:diagnostics-comprehensive' }),
  command_center: Object.freeze({ id: 'command_center', command: 'npm run check:dev-command-center-comprehensive' }),
  inspection_manual: Object.freeze({ id: 'inspection_manual', command: 'npm run check:dev-inspection-agent-manual' }),
  inspection_triggers: Object.freeze({ id: 'inspection_triggers', command: 'npm run check:dev-inspection-agent-triggers' }),
  inspection_reports: Object.freeze({ id: 'inspection_reports', command: 'npm run check:dev-inspection-agent-reports' }),
  inspection_drafts: Object.freeze({ id: 'inspection_drafts', command: 'npm run check:dev-inspection-agent-issue-drafts' })
});

const SIDE_EFFECTS = Object.freeze({
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

function fixedTime(value) {
  const milliseconds = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function inputBytes(input) {
  try {
    return Buffer.byteLength(JSON.stringify(input), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function extension(path) {
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot).toLowerCase() : '';
}

function blockedPath(path) {
  const lower = path.toLowerCase();
  const segments = lower.split('/');
  return lower === 'agents.md'
    || lower === 'docs/dev-tools-agent-execution-contract.json'
    || lower === 'js/save.js'
    || lower === 'js/data.js'
    || lower === '.git' || lower.startsWith('.git/')
    || lower === '.github' || lower.startsWith('.github/')
    || lower === '.env' || lower.startsWith('.env.')
    || segments.some((segment) => segment.includes('secret') || segment.includes('credential')
      || segment.includes('token') || segment.endsWith('.pem') || segment.endsWith('.key'))
    || lower.startsWith('images/') || lower.startsWith('assets/');
}

function safePath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_PATH_CHARS
    || value.startsWith('/') || value.includes('\\') || value.includes('\0')
    || !/^[A-Za-z0-9._/-]+$/.test(value)) return null;
  const segments = value.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) return null;
  if (!SAFE_EXTENSIONS.has(extension(value)) || blockedPath(value)) return null;
  return value;
}

function safeSourceDraft(value) {
  if (value?.schema_version !== SCHEMA_VERSION
    || !DRAFT_ID_PATTERN.test(value?.draft_id ?? '')
    || !REPORT_ID_PATTERN.test(value?.report_id ?? '')
    || !ACTIONABLE_STATUSES.has(value?.status)
    || value?.publication?.state !== 'unpublished'
    || value?.publication?.destination !== null
    || value?.publication?.requires_fresh_confirmation !== true
    || value?.publication?.issue_number !== null) return null;
  return Object.freeze({
    draft_id: value.draft_id,
    report_id: value.report_id,
    status: value.status
  });
}

function safeFiles(values) {
  if (!Array.isArray(values) || values.length === 0 || values.length > MAX_FILES) return null;
  const unique = new Map();
  let totalBytes = 0;
  for (const value of values) {
    const path = safePath(value?.path);
    const bytes = value?.bytes;
    const blobSha = value?.blob_sha;
    if (!path || !Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_FILE_BYTES
      || typeof blobSha !== 'string' || !SHA_PATTERN.test(blobSha)) return null;
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_FILE_BYTES) return null;
    unique.set(path, Object.freeze({ path, blob_sha: blobSha, bytes, source_access: 'read_only' }));
  }
  return Object.freeze([...unique.values()].sort((left, right) => left.path.localeCompare(right.path)));
}

function testPlan(files) {
  const ids = new Set(['full_check']);
  const paths = files.map((file) => file.path.toLowerCase());
  if (paths.some((path) => path.startsWith('tools/dev-inspection-agent/'))) {
    ids.add('inspection_manual');
    ids.add('inspection_triggers');
    ids.add('inspection_reports');
    ids.add('inspection_drafts');
  } else if (paths.some((path) => path.startsWith('tools/dev-command-center/'))) {
    ids.add('command_center');
  } else {
    if (paths.some((path) => path.startsWith('js/') || path.endsWith('.html') || path.endsWith('.css'))) ids.add('ui_contract');
    if (paths.some((path) => path.includes('diagnostic'))) ids.add('diagnostics');
  }
  return Object.freeze([...ids].slice(0, MAX_TESTS).map((id) => TESTS[id]));
}

function result(reasonCode, environment = null) {
  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    phase: 28,
    mode: OUTPUT_MODE,
    outcome: Object.freeze({ environment_prepared: environment !== null, reason_code: reasonCode }),
    environment,
    side_effects: SIDE_EFFECTS
  });
}

export function prepareIsolatedRemediation(request, options = {}) {
  const bytes = inputBytes(request);
  if (bytes > MAX_INPUT_BYTES) return result('input_too_large');
  const nowMs = fixedTime(options.now ?? request?.requested_at);
  if (request?.schema_version !== SCHEMA_VERSION || request?.mode !== INPUT_MODE
    || request?.repository !== REPOSITORY || nowMs === null
    || request?.base?.branch !== 'main' || !SHA_PATTERN.test(request?.base?.sha ?? '')) {
    return result('invalid_request');
  }

  const sourceDraft = safeSourceDraft(request.source_draft);
  if (!sourceDraft) return result('invalid_source_draft');
  const files = safeFiles(request.files);
  if (!files) return result('unsafe_or_invalid_file_snapshot');

  const canonical = [
    REPOSITORY,
    request.base.sha,
    sourceDraft.draft_id,
    ...files.map((file) => `${file.path}:${file.blob_sha}:${file.bytes}`)
  ].join('\n');
  const environmentId = `phase28:${createHash('sha256').update(canonical).digest('hex')}`;
  const preparedAt = new Date(nowMs).toISOString();
  const environment = Object.freeze({
    schema_version: SCHEMA_VERSION,
    environment_id: environmentId,
    repository: REPOSITORY,
    base: Object.freeze({ branch: 'main', sha: request.base.sha, immutable: true }),
    source_draft: sourceDraft,
    feasibility: Object.freeze({ eligible_for_isolated_proposal: true, reason_code: 'bounded_snapshot_ready' }),
    workspace: Object.freeze({
      kind: 'ephemeral_memory_overlay',
      state: 'prepared_empty_overlay',
      source_files: files,
      source_file_count: files.length,
      source_bytes: files.reduce((sum, file) => sum + file.bytes, 0),
      writable_paths: Object.freeze(files.map((file) => file.path)),
      persistence: false
    }),
    guards: Object.freeze({
      write_scope: 'memory_overlay_only',
      network: 'denied',
      host_filesystem: 'denied',
      repository: 'read_only_snapshot',
      git: 'denied',
      branch_and_pull_request: 'denied_until_phase30_fresh_confirmation',
      issue_post: 'denied_without_fresh_confirmation',
      environment_variables: 'unavailable',
      maximum_attempts: 1
    }),
    test_plan: testPlan(files),
    lifecycle: Object.freeze({
      prepared_at: preparedAt,
      expires_at: new Date(nowMs + SESSION_TTL_MS).toISOString(),
      cleanup: 'discard_memory_overlay',
      retain_patch_content: false
    })
  });
  return result('environment_prepared', environment);
}

export const ISOLATED_REMEDIATION_LIMITS = Object.freeze({
  repository: REPOSITORY,
  max_input_bytes: MAX_INPUT_BYTES,
  max_files: MAX_FILES,
  max_file_bytes: MAX_FILE_BYTES,
  max_total_file_bytes: MAX_TOTAL_FILE_BYTES,
  max_path_chars: MAX_PATH_CHARS,
  session_ttl_ms: SESSION_TTL_MS,
  max_tests: MAX_TESTS,
  actionable_statuses: Object.freeze([...ACTIONABLE_STATUSES]),
  environment_id_pattern: ENVIRONMENT_ID_PATTERN.source
});
