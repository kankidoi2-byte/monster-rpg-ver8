import { createHash } from 'node:crypto';

const SCHEMA_VERSION = 1;
const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const INPUT_MODE = 'limited_autonomy_trial_request';
const OUTPUT_MODE = 'limited_autonomy_trial_decision';
const MAX_INPUT_BYTES = 256 * 1024;
const MAX_TARGET_PATHS = 3;
const MAX_LEDGER_ENTRIES = 100;
const LEDGER_TTL_MS = 24 * 60 * 60 * 1000;
const TRIAL_TTL_MS = 60 * 60 * 1000;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const REPORT_ID_PATTERN = /^phase26:[0-9a-f]{64}$/;
const SAFE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.yml', '.yaml', '.txt']);
const TESTS = Object.freeze({
  data_contract: 'npm run check:data-contract',
  diagnostics: 'npm run check:diagnostics',
  image_references: 'npm run check:images',
  ui_contract: 'npm run check:ui-contract',
  notices: 'npm run check:notices',
  command_center: 'npm run check:dev-command-center-comprehensive',
  inspection_agent: 'npm --prefix tools/dev-inspection-agent run check'
});
const BROKEN_REFERENCE_CODES = new Set([
  'missing_file_reference',
  'unresolved_module_reference',
  'unresolved_registry_reference'
]);
const ALLOWED_ACTIONS = Object.freeze([
  'read_fixed_source_blobs',
  'prepare_ephemeral_memory_overlay',
  'generate_exact_once_patch_proposal',
  'run_declared_test_plan'
]);
const STOP_CONDITIONS = Object.freeze([
  'base_main_changed',
  'failure_not_reproduced',
  'required_test_unknown_or_failed_after_trial',
  'scope_or_path_not_allowlisted',
  'save_or_existing_id_risk',
  'secret_or_personal_data_detected',
  'more_than_one_attempt_required',
  'external_write_lacks_fresh_confirmation'
]);
const SIDE_EFFECTS = Object.freeze({
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

function inputBytes(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function fixedTime(value) {
  const milliseconds = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function extension(path) {
  const index = path.lastIndexOf('.');
  return index >= 0 ? path.slice(index).toLowerCase() : '';
}

function safePath(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 160
    || value.startsWith('/') || value.includes('\\') || value.includes('\0')
    || !/^[A-Za-z0-9._/-]+$/.test(value) || !SAFE_EXTENSIONS.has(extension(value))) return null;
  const lower = value.toLowerCase();
  const segments = lower.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..'
      || segment.includes('secret') || segment.includes('credential') || segment.includes('token')
      || segment.endsWith('.pem') || segment.endsWith('.key'))) return null;
  if (lower === 'agents.md' || lower === 'js/save.js' || lower === 'js/data.js'
    || lower === 'docs/dev-tools-agent-execution-contract.json'
    || lower.startsWith('.git/') || lower.startsWith('.github/') || lower.startsWith('.env')
    || lower.startsWith('images/') || lower.startsWith('assets/')) return null;
  return value;
}

function safeReport(value, baseSha) {
  if (value?.schema_version !== SCHEMA_VERSION
    || !REPORT_ID_PATTERN.test(value?.report_id ?? '')
    || value?.status?.code !== 'failed'
    || value?.impact?.blocks_progress !== true
    || value?.recommendation?.action_code !== 'inspect_failed_check'
    || value?.publication?.state !== 'unpublished'
    || value?.publication?.destination !== null
    || value?.confidence?.level === 'low'
    || value?.evidence?.main_sha !== baseSha
    || value?.evidence?.ci?.matched_main !== true
    || value?.evidence?.ci?.status !== 'completed'
    || value?.evidence?.ci?.conclusion !== 'failure'
    || value?.evidence?.ci?.head_sha !== baseSha
    || !Array.isArray(value?.cause_candidates)
    || !value.cause_candidates.some((cause) => cause?.code === 'ci_failure_observed'
      && cause?.likelihood === 'high')) return null;
  return Object.freeze({ report_id: value.report_id });
}

function safeFinding(value, baseSha) {
  const expectedCommand = TESTS[value?.check?.id];
  if (!expectedCommand || value?.check?.command !== expectedCommand
    || value?.check?.status !== 'failed' || value?.check?.head_sha !== baseSha
    || !Array.isArray(value?.target_paths) || value.target_paths.length === 0
    || value.target_paths.length > MAX_TARGET_PATHS) return null;

  const targetPaths = [];
  for (const candidate of value.target_paths) {
    const path = safePath(candidate);
    if (!path || targetPaths.includes(path)) return null;
    targetPaths.push(path);
  }
  targetPaths.sort();

  if (value.kind === 'test_failure' && value.code === 'declared_test_failure') {
    return Object.freeze({ kind: value.kind, code: value.code, check: Object.freeze({
      id: value.check.id, command: expectedCommand, status: 'failed', head_sha: baseSha
    }), target_paths: Object.freeze(targetPaths) });
  }
  if (value.kind === 'broken_reference' && BROKEN_REFERENCE_CODES.has(value.code)) {
    return Object.freeze({ kind: value.kind, code: value.code, check: Object.freeze({
      id: value.check.id, command: expectedCommand, status: 'failed', head_sha: baseSha
    }), target_paths: Object.freeze(targetPaths) });
  }
  return null;
}

function safeLedger(values, nowMs) {
  if (!Array.isArray(values)) return Object.freeze([]);
  const entries = new Map();
  for (const value of values) {
    const startedAt = fixedTime(value?.started_at);
    const expiresAt = fixedTime(value?.expires_at);
    if (typeof value?.trial_id !== 'string' || !/^phase31:[0-9a-f]{64}$/.test(value.trial_id)
      || !SHA_PATTERN.test(value?.base_sha ?? '') || value?.status !== 'authorized'
      || startedAt === null || expiresAt === null || expiresAt <= startedAt
      || expiresAt - startedAt > TRIAL_TTL_MS || nowMs - startedAt > LEDGER_TTL_MS) continue;
    entries.set(value.trial_id, Object.freeze({
      trial_id: value.trial_id,
      base_sha: value.base_sha,
      status: 'authorized',
      started_at: new Date(startedAt).toISOString(),
      expires_at: new Date(expiresAt).toISOString()
    }));
  }
  return Object.freeze([...entries.values()]
    .sort((left, right) => left.started_at.localeCompare(right.started_at))
    .slice(-MAX_LEDGER_ENTRIES));
}

function result(reasonCode, ledger, trial = null) {
  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    phase: 31,
    mode: OUTPUT_MODE,
    outcome: Object.freeze({ trial_authorized: trial !== null, reason_code: reasonCode }),
    trial,
    ledger,
    side_effects: SIDE_EFFECTS
  });
}

export function authorizeLimitedAutonomyTrial(request, ledger = [], options = {}) {
  const nowMs = fixedTime(options.now ?? request?.requested_at);
  const safeExistingLedger = safeLedger(ledger, nowMs ?? 0);
  if (inputBytes(request) > MAX_INPUT_BYTES) return result('input_too_large', safeExistingLedger);
  if (request?.schema_version !== SCHEMA_VERSION || request?.mode !== INPUT_MODE
    || request?.repository !== REPOSITORY || nowMs === null
    || request?.base?.branch !== 'main' || !SHA_PATTERN.test(request?.base?.sha ?? '')) {
    return result('invalid_request', safeExistingLedger);
  }

  const report = safeReport(request.source_report, request.base.sha);
  if (!report) return result('failure_not_explicit_or_not_bound_to_main', safeExistingLedger);
  const finding = safeFinding(request.finding, request.base.sha);
  if (!finding) return result('finding_not_allowlisted', safeExistingLedger);

  const canonical = JSON.stringify({
    repository: REPOSITORY,
    report_id: report.report_id,
    base_sha: request.base.sha,
    finding
  });
  const trialId = `phase31:${createHash('sha256').update(canonical).digest('hex')}`;
  if (safeExistingLedger.some((entry) => entry.trial_id === trialId)) {
    return result('trial_already_authorized', safeExistingLedger);
  }

  const startedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + TRIAL_TTL_MS).toISOString();
  const trial = Object.freeze({
    schema_version: SCHEMA_VERSION,
    trial_id: trialId,
    repository: REPOSITORY,
    source_report: report,
    base: Object.freeze({ branch: 'main', sha: request.base.sha, immutable: true }),
    finding,
    scope: Object.freeze({
      maximum_attempts: 1,
      maximum_target_paths: MAX_TARGET_PATHS,
      target_paths: finding.target_paths,
      workspace: 'ephemeral_memory_overlay_only'
    }),
    authorization: Object.freeze({
      state: 'authorized_for_isolated_trial',
      allowed_actions: ALLOWED_ACTIONS,
      branch_commit_pull_request: 'fresh_confirmation_required',
      merge: 'not_authorized',
      issue_post: 'not_authorized'
    }),
    validation: Object.freeze({
      failing_check: finding.check,
      required_after_trial: Object.freeze([
        Object.freeze({ id: finding.check.id, command: finding.check.command, expected_status: 'passed' }),
        Object.freeze({ id: 'full_check', command: 'npm run check', expected_status: 'passed' })
      ]),
      unknown_is_success: false
    }),
    lifecycle: Object.freeze({ started_at: startedAt, expires_at: expiresAt, retain_patch_content: false }),
    stop_conditions: STOP_CONDITIONS,
    publication: Object.freeze({
      state: 'unpublished',
      branch: null,
      commit: null,
      pull_request: null,
      requires_fresh_confirmation_for_materialization: true
    })
  });
  const entry = Object.freeze({ trial_id: trialId, base_sha: request.base.sha, status: 'authorized', started_at: startedAt, expires_at: expiresAt });
  const nextLedger = Object.freeze([...safeExistingLedger, entry].slice(-MAX_LEDGER_ENTRIES));
  return result('limited_trial_authorized', nextLedger, trial);
}

export const LIMITED_AUTONOMY_LIMITS = Object.freeze({
  repository: REPOSITORY,
  max_input_bytes: MAX_INPUT_BYTES,
  max_target_paths: MAX_TARGET_PATHS,
  max_attempts_per_trial: 1,
  max_ledger_entries: MAX_LEDGER_ENTRIES,
  ledger_ttl_ms: LEDGER_TTL_MS,
  trial_ttl_ms: TRIAL_TTL_MS,
  allowed_finding_kinds: Object.freeze(['test_failure', 'broken_reference']),
  broken_reference_codes: Object.freeze([...BROKEN_REFERENCE_CODES]),
  tests: TESTS
});
