import { createHash } from 'node:crypto';

const SCHEMA_VERSION = 1;
const PHASE = 30;
const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const APPROVAL_TTL_MS = 5 * 60 * 1000;
const MAX_INPUT_BYTES = 768 * 1024;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const PROPOSAL_ID_PATTERN = /^phase29:([0-9a-f]{64})$/;
const ENVIRONMENT_ID_PATTERN = /^phase28:[0-9a-f]{64}$/;
const SAFE_PATH_PATTERN = /^[A-Za-z0-9._/-]{1,160}$/;
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

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function result(status, reasonCode, value = {}) {
  return deepFreeze({
    schema_version: SCHEMA_VERSION,
    phase: PHASE,
    mode: 'branch_and_pull_request_approval',
    status,
    reason_code: reasonCode,
    ...value,
    side_effects: SIDE_EFFECTS
  });
}

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

function isoTime(value) {
  const milliseconds = fixedTime(value instanceof Date ? value.toISOString() : value);
  return milliseconds === null ? null : new Date(milliseconds).toISOString();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function safePath(value) {
  if (typeof value !== 'string' || !SAFE_PATH_PATTERN.test(value) || value.startsWith('/')
    || value.includes('\\') || value.includes('//')) return false;
  const lower = value.toLowerCase();
  const segments = lower.split('/');
  return !segments.some((segment) => segment === '.' || segment === '..' || segment.length === 0)
    && lower !== 'agents.md'
    && lower !== 'js/save.js'
    && lower !== 'js/data.js'
    && lower !== '.git' && !lower.startsWith('.git/')
    && lower !== '.github' && !lower.startsWith('.github/')
    && lower !== '.env' && !lower.startsWith('.env.')
    && !lower.startsWith('images/') && !lower.startsWith('assets/');
}

function containsSecret(value) {
  const text = String(value ?? '');
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)
    || /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})\b/.test(text)
    || /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|secret|credential)\s*[:=]\s*["'][^"'\n]{8,}["']/i.test(text);
}

function validProposal(resultValue, nowMs) {
  const proposal = resultValue?.schema_version === SCHEMA_VERSION
    && resultValue?.phase === 29
    && resultValue?.mode === 'unpublished_minimal_patch_proposal'
    && resultValue?.outcome?.proposal_generated === true
    && resultValue?.outcome?.reason_code === 'proposal_generated'
    ? resultValue.proposal : null;
  const match = PROPOSAL_ID_PATTERN.exec(proposal?.proposal_id ?? '');
  if (!proposal || !match || proposal.schema_version !== SCHEMA_VERSION
    || proposal.repository !== REPOSITORY
    || proposal?.base?.branch !== 'main'
    || !SHA_PATTERN.test(proposal?.base?.sha ?? '')
    || proposal?.base?.immutable !== true
    || !ENVIRONMENT_ID_PATTERN.test(proposal?.source_environment?.environment_id ?? '')
    || fixedTime(proposal?.source_environment?.expires_at) === null
    || nowMs > fixedTime(proposal.source_environment.expires_at)
    || proposal?.scope?.minimality_rule !== 'exact_once_replacements_only'
    || !Number.isSafeInteger(proposal?.scope?.file_count) || proposal.scope.file_count < 1 || proposal.scope.file_count > 3
    || !Number.isSafeInteger(proposal?.scope?.edit_count) || proposal.scope.edit_count < 1 || proposal.scope.edit_count > 5
    || !Number.isSafeInteger(proposal?.scope?.changed_lines) || proposal.scope.changed_lines < 1 || proposal.scope.changed_lines > 120
    || proposal?.compatibility?.save_key !== 'mb_v95c'
    || proposal?.compatibility?.save_key_unchanged !== true
    || proposal?.compatibility?.protected_ids_unchanged !== true
    || proposal?.compatibility?.protected_paths_unchanged !== true
    || proposal?.compatibility?.source_blobs_verified !== true
    || proposal?.publication?.state !== 'unpublished'
    || proposal?.publication?.destination !== null
    || proposal?.publication?.branch !== null
    || proposal?.publication?.commit !== null
    || proposal?.publication?.pull_request !== null
    || proposal?.publication?.requires_fresh_confirmation_for_branch_and_pull_request !== true
    || !Array.isArray(proposal.files) || proposal.files.length !== proposal.scope.file_count) return null;

  const files = [];
  const paths = new Set();
  let editCount = 0;
  let changedLines = 0;
  for (const file of proposal.files) {
    if (!safePath(file?.path) || paths.has(file.path)
      || !SHA_PATTERN.test(file?.base_blob_sha ?? '') || !SHA_PATTERN.test(file?.result_blob_sha ?? '')
      || !Array.isArray(file?.edits) || file.edits.length < 1) return null;
    paths.add(file.path);
    const edits = [];
    for (const edit of file.edits) {
      if (edit?.operation !== 'replace_exact_once' || typeof edit?.before !== 'string' || !edit.before
        || typeof edit?.after !== 'string' || !edit.after || edit.before === edit.after
        || containsSecret(edit.before) || containsSecret(edit.after)
        || PROTECTED_LITERALS.some((literal) => edit.before.includes(literal) || edit.after.includes(literal))
        || !Number.isSafeInteger(edit?.removed_lines) || edit.removed_lines < 1
        || !Number.isSafeInteger(edit?.added_lines) || edit.added_lines < 1) return null;
      editCount += 1;
      changedLines += edit.removed_lines + edit.added_lines;
      edits.push({ before: edit.before, after: edit.after });
    }
    if (file.changed_lines !== edits.reduce((sum, edit, index) => {
      const original = file.edits[index];
      return sum + original.removed_lines + original.added_lines;
    }, 0)) return null;
    files.push({
      path: file.path,
      base_blob_sha: file.base_blob_sha,
      result_blob_sha: file.result_blob_sha,
      edits
    });
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  if (editCount !== proposal.scope.edit_count || changedLines !== proposal.scope.changed_lines) return null;

  const validation = proposal.validation;
  if (validation?.state !== 'passed'
    || validation?.environment_id !== proposal.source_environment.environment_id
    || validation?.base_sha !== proposal.base.sha
    || validation?.raw_logs_retained !== false
    || !Array.isArray(validation?.result_files) || validation.result_files.length !== files.length
    || !Array.isArray(validation?.checks) || validation.checks.length < 1 || validation.checks.length > 5
    || validation.checks.some((check) => typeof check?.id !== 'string'
      || !/^npm run check(?::[a-z0-9-]+)?$/.test(check?.command ?? '') || check?.status !== 'passed')) return null;
  const resultFiles = new Map(validation.result_files.map((file) => [file?.path, file?.blob_sha]));
  if (resultFiles.size !== files.length
    || files.some((file) => resultFiles.get(file.path) !== file.result_blob_sha)) return null;

  const canonical = JSON.stringify({
    repository: REPOSITORY,
    environment_id: proposal.source_environment.environment_id,
    base_sha: proposal.base.sha,
    files
  });
  if (proposal.proposal_id !== `phase29:${sha256(canonical)}`) return null;
  return Object.freeze({
    proposal_id: proposal.proposal_id,
    short_id: match[1].slice(0, 12),
    base_sha: proposal.base.sha,
    expires_at: proposal.source_environment.expires_at,
    files: Object.freeze(files.map((file) => Object.freeze({ path: file.path }))),
    scope: Object.freeze({
      file_count: proposal.scope.file_count,
      edit_count: proposal.scope.edit_count,
      changed_lines: proposal.scope.changed_lines
    })
  });
}

function validRepositorySnapshot(snapshot, proposal) {
  if (snapshot?.schema_version !== SCHEMA_VERSION || snapshot?.repository !== REPOSITORY
    || snapshot?.main?.branch !== 'main' || !SHA_PATTERN.test(snapshot?.main?.sha ?? '')
    || snapshot.main.sha !== proposal.base_sha
    || !Array.isArray(snapshot?.open_pull_requests) || snapshot.open_pull_requests.length > 100) return null;
  const marker = `<!-- phase29-proposal:${proposal.proposal_id} -->`;
  const duplicates = [];
  for (const pullRequest of snapshot.open_pull_requests) {
    if (!Number.isSafeInteger(pullRequest?.number) || pullRequest.number < 1
      || typeof pullRequest?.body !== 'string' || pullRequest.body.length > 64_000) return null;
    if (pullRequest.body.includes(marker)) duplicates.push(pullRequest.number);
  }
  return Object.freeze(duplicates.slice(0, 5));
}

function publicationPlan(proposal) {
  const branchName = `codex/agent-fix-${proposal.short_id}`;
  const title = `[自動点検] 修正案 ${proposal.short_id}`;
  const body = [
    `<!-- phase29-proposal:${proposal.proposal_id} -->`,
    '## 概要',
    'Phase 29で検証済みの最小修正案を、確認対象へ固定したPRです。',
    '',
    '## 対象',
    ...proposal.files.map((file) => `- \`${file.path}\``),
    '',
    `- 変更ファイル: ${proposal.scope.file_count}`,
    `- 置換: ${proposal.scope.edit_count}`,
    `- 変更行カウント: ${proposal.scope.changed_lines}`,
    `- base: \`${proposal.base_sha}\``,
    '',
    'この計画は承認データであり、書き込みアダプターが別途検証して初めて作成できます。'
  ].join('\n');
  const plan = {
    repository: REPOSITORY,
    base_branch: 'main',
    base_sha: proposal.base_sha,
    branch_name: branchName,
    commit_message: `Phase 30: 修正案 ${proposal.short_id}`,
    pull_request_title: title,
    pull_request_body: body,
    source_proposal_id: proposal.proposal_id
  };
  return Object.freeze({ ...plan, fingerprint: sha256(JSON.stringify(plan)) });
}

export function preparePatchPublication(proposalResult, repositorySnapshot, options = {}) {
  if (inputBytes([proposalResult, repositorySnapshot]) > MAX_INPUT_BYTES) {
    return result('blocked', 'input_too_large', { approval_request: null, plan: null });
  }
  const preparedAt = isoTime(options.now);
  if (!preparedAt) return result('blocked', 'invalid_preparation_time', { approval_request: null, plan: null });
  const nowMs = fixedTime(preparedAt);
  const proposal = validProposal(proposalResult, nowMs);
  if (!proposal) return result('blocked', 'invalid_or_expired_proposal', { prepared_at: preparedAt, approval_request: null, plan: null });
  const duplicates = validRepositorySnapshot(repositorySnapshot, proposal);
  if (!duplicates) return result('blocked', 'repository_snapshot_invalid_or_base_stale', {
    prepared_at: preparedAt,
    proposal_id: proposal.proposal_id,
    approval_request: null,
    plan: null
  });
  if (duplicates.length) return result('duplicate_detected', 'matching_open_pull_request_exists', {
    prepared_at: preparedAt,
    proposal_id: proposal.proposal_id,
    duplicate_pull_requests: duplicates,
    approval_request: null,
    plan: null
  });

  const plan = publicationPlan(proposal);
  const expiresAt = new Date(nowMs + APPROVAL_TTL_MS).toISOString();
  const confirmationText = `修正案 ${proposal.short_id} のブランチとPRを作成する`;
  return result('awaiting_approval', 'fresh_confirmation_required', {
    prepared_at: preparedAt,
    proposal_id: proposal.proposal_id,
    duplicate_pull_requests: [],
    plan,
    approval_request: {
      action: 'create_agent_remediation_branch_commit_and_pull_request',
      approval_id: sha256(`${plan.fingerprint}\n${preparedAt}\n${expiresAt}`),
      required_permissions: ['contents:write', 'pull_requests:write'],
      confirmation_text: confirmationText,
      expires_at: expiresAt,
      one_time: true,
      external_effect: 'Creates one repository branch, one commit, and one public Pull Request; it does not merge.',
      cancellation: 'Cancel or wait five minutes; no branch, commit, or Pull Request is created.'
    }
  });
}

export function confirmPatchPublication(preparation, input = {}, options = {}) {
  const confirmedAt = isoTime(options.now);
  if (!confirmedAt) return result('blocked', 'invalid_confirmation_time', { authorization: null });
  if (preparation?.schema_version !== SCHEMA_VERSION || preparation?.phase !== PHASE
    || preparation?.status !== 'awaiting_approval' || !preparation?.approval_request || !preparation?.plan) {
    return result('blocked', 'approval_not_available', { confirmed_at: confirmedAt, authorization: null });
  }
  if (fixedTime(confirmedAt) > fixedTime(preparation.approval_request.expires_at)) {
    return result('expired', 'approval_expired', { confirmed_at: confirmedAt, authorization: null });
  }
  if (input.proposal_id !== preparation.proposal_id || input.plan_fingerprint !== preparation.plan.fingerprint) {
    return result('blocked', 'reviewed_plan_changed', { confirmed_at: confirmedAt, authorization: null });
  }
  if (input.confirmation_text !== preparation.approval_request.confirmation_text) {
    return result('blocked', 'confirmation_text_mismatch', { confirmed_at: confirmedAt, authorization: null });
  }
  return result('authorized', 'fresh_confirmation_verified', {
    confirmed_at: confirmedAt,
    authorization: {
      action: preparation.approval_request.action,
      approval_id: preparation.approval_request.approval_id,
      proposal_id: preparation.proposal_id,
      plan_fingerprint: preparation.plan.fingerprint,
      repository: REPOSITORY,
      base_sha: preparation.plan.base_sha,
      branch_name: preparation.plan.branch_name,
      expires_at: preparation.approval_request.expires_at,
      one_time: true,
      merge_authorized: false
    }
  });
}

export function cancelPatchPublication(preparation, options = {}) {
  const cancelledAt = isoTime(options.now);
  if (!cancelledAt) return result('blocked', 'invalid_cancellation_time', { authorization: null });
  const proposalId = PROPOSAL_ID_PATTERN.test(preparation?.proposal_id ?? '') ? preparation.proposal_id : null;
  return result('cancelled', 'publication_cancelled', {
    cancelled_at: cancelledAt,
    proposal_id: proposalId,
    authorization: null
  });
}

export const PATCH_PUBLICATION_APPROVAL_LIMITS = Object.freeze({
  repository: REPOSITORY,
  approval_ttl_ms: APPROVAL_TTL_MS,
  max_input_bytes: MAX_INPUT_BYTES,
  one_time: true,
  writer_connected: false
});
