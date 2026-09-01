import { createHash } from 'node:crypto';

export const ISSUE_PUBLICATION_CONFIRMATION = 'この下書きをGitHub Issueとして投稿する';

const APPROVAL_TTL_MS = 5 * 60 * 1000;
const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const ALLOWED_TITLES = new Set([
  '[診断] ゲーム内エラーを確認',
  '[診断] ゲーム状態の確認事項を調査',
  '[開発司令塔] 自動チェック失敗を調査',
  '[開発司令塔] 情報取得不能を調査',
  '[開発司令塔] 古い状態情報を更新'
]);
const SECRET_PATTERNS = Object.freeze([
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/i,
  /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\b(?:token|api[_-]?key|password|secret)\s*[:=]\s*[^\s,;]{4,}/i
]);

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function result(status, reasonCode, value = {}) {
  return deepFreeze({ schema_version: 1, status, reason_code: reasonCode, ...value });
}

function safeTimestamp(value) {
  const time = Date.parse(String(value ?? ''));
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function nowIso(value) {
  return safeTimestamp(value instanceof Date ? value.toISOString() : value);
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function safeGitHubUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password) return '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function normalizedTitle(value) {
  return String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ja-JP');
}

function validDraft(value) {
  const draft = value?.schema_version === 1 && value.status === 'generated' ? value.draft : null;
  if (!draft || draft.posting_status !== 'not_posted' || !ALLOWED_TITLES.has(draft.title)) return null;
  const body = typeof draft.body === 'string' ? draft.body : '';
  if (!body || body.length > 20_000 || !body.includes('未投稿') || SECRET_PATTERNS.some(pattern => pattern.test(body))) return null;
  return { title: draft.title, body };
}

function fingerprint(draft) {
  return createHash('sha256').update(draft.title).update('\n').update(draft.body).digest('hex');
}

function duplicateCandidates(snapshot, title) {
  const section = snapshot?.schema_version === 1 ? snapshot.sections?.issues : null;
  if (section?.status !== 'available' || !Array.isArray(section.items)) return null;
  const expected = normalizedTitle(title);
  return section.items.slice(0, 100).filter(issue => normalizedTitle(issue?.title) === expected).slice(0, 5).map(issue => ({
    number: positiveInteger(issue?.number),
    title,
    html_url: safeGitHubUrl(issue?.html_url)
  })).filter(issue => issue.number && issue.html_url);
}

export function prepareIssuePublication(draftResult, repositorySnapshot, options = {}) {
  const preparedAt = nowIso(options.now);
  if (!preparedAt) return result('blocked', 'invalid_preparation_time');
  const draft = validDraft(draftResult);
  if (!draft) return result('blocked', 'invalid_issue_draft', { prepared_at: preparedAt });
  const duplicates = duplicateCandidates(repositorySnapshot, draft.title);
  if (duplicates === null) return result('blocked', 'duplicate_check_unavailable', { prepared_at: preparedAt });
  if (duplicates.length) return result('duplicate_detected', 'matching_open_issue_exists', {
    prepared_at: preparedAt,
    draft_fingerprint: fingerprint(draft),
    duplicate_candidates: duplicates,
    approval_request: null
  });
  const expiresAt = new Date(Date.parse(preparedAt) + APPROVAL_TTL_MS).toISOString();
  return result('awaiting_approval', 'explicit_approval_required', {
    prepared_at: preparedAt,
    draft_fingerprint: fingerprint(draft),
    duplicate_candidates: [],
    approval_request: {
      action: 'create_github_issue',
      repository: REPOSITORY,
      required_permission: 'issues:write',
      confirmation_text: ISSUE_PUBLICATION_CONFIRMATION,
      expires_at: expiresAt,
      one_time: true,
      external_effect: 'Creates one public GitHub Issue in the target repository.',
      cancellation: 'Cancel or wait five minutes; no Issue is created.'
    }
  });
}

export function confirmIssuePublication(preparation, input = {}, options = {}) {
  const confirmedAt = nowIso(options.now);
  if (!confirmedAt) return result('blocked', 'invalid_confirmation_time');
  if (preparation?.schema_version !== 1 || preparation.status !== 'awaiting_approval' || !preparation.approval_request) {
    return result('blocked', 'approval_not_available', { confirmed_at: confirmedAt, authorization: null });
  }
  if (Date.parse(confirmedAt) > Date.parse(preparation.approval_request.expires_at)) {
    return result('expired', 'approval_expired', { confirmed_at: confirmedAt, authorization: null });
  }
  if (input.draft_fingerprint !== preparation.draft_fingerprint) {
    return result('blocked', 'draft_changed_after_review', { confirmed_at: confirmedAt, authorization: null });
  }
  if (input.confirmation_text !== ISSUE_PUBLICATION_CONFIRMATION) {
    return result('blocked', 'confirmation_text_mismatch', { confirmed_at: confirmedAt, authorization: null });
  }
  return result('authorized', 'explicit_approval_confirmed', {
    confirmed_at: confirmedAt,
    authorization: {
      action: 'create_github_issue',
      repository: REPOSITORY,
      draft_fingerprint: preparation.draft_fingerprint,
      expires_at: preparation.approval_request.expires_at,
      one_time: true
    }
  });
}

export function cancelIssuePublication(preparation, options = {}) {
  const cancelledAt = nowIso(options.now);
  if (!cancelledAt) return result('blocked', 'invalid_cancellation_time');
  const fingerprintValue = /^[0-9a-f]{64}$/.test(preparation?.draft_fingerprint) ? preparation.draft_fingerprint : null;
  return result('cancelled', 'publication_cancelled', {
    cancelled_at: cancelledAt,
    draft_fingerprint: fingerprintValue,
    authorization: null
  });
}

export const ISSUE_PUBLICATION_APPROVAL_LIMITS = Object.freeze({ approval_ttl_ms: APPROVAL_TTL_MS });
