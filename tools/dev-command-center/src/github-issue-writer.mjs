import { createHash } from 'node:crypto';

const API_BASE = 'https://api.github.com';
const MAX_RESPONSE_CHARS = 256_000;
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
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

export class GitHubIssueWriteError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = 'GitHubIssueWriteError';
    this.code = code;
    this.status = Number.isInteger(status) ? status : null;
  }
}

function validateName(value, code) {
  const name = String(value ?? '').trim();
  if (!name || name.length > 100 || !NAME_PATTERN.test(name) || name === '.' || name === '..') throw new GitHubIssueWriteError(code);
  return name;
}

function safeTimestamp(value) {
  const time = Date.parse(String(value ?? ''));
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function safeGitHubIssueUrl(value, owner, repository, issueNumber) {
  try {
    const url = new URL(String(value ?? ''));
    const expectedPath = `/${owner}/${repository}/issues/${issueNumber}`;
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.pathname !== expectedPath || url.username || url.password) return '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch { return ''; }
}

function validDraft(value) {
  const draft = value?.schema_version === 1 && value.status === 'generated' ? value.draft : null;
  const body = typeof draft?.body === 'string' ? draft.body : '';
  if (draft?.posting_status !== 'not_posted' || !ALLOWED_TITLES.has(draft?.title)) return null;
  if (!body || body.length > 20_000 || !body.includes('未投稿') || SECRET_PATTERNS.some(pattern => pattern.test(body))) return null;
  return Object.freeze({ title: draft.title, body });
}

function fingerprint(draft) {
  return createHash('sha256').update(draft.title).update('\n').update(draft.body).digest('hex');
}

function errorCode(response) {
  if (response.status === 401) return 'authentication_required';
  if (response.status === 403) return 'permission_denied';
  if (response.status === 404) return 'repository_not_found';
  if (response.status === 422) return 'github_rejected_issue';
  if (response.status === 429) return 'rate_limited';
  return response.status >= 500 ? 'github_unavailable' : 'github_write_failed';
}

export function createGitHubIssueWriter(options = {}) {
  const owner = validateName(options.owner, 'invalid_github_owner');
  const repository = validateName(options.repository, 'invalid_github_repository');
  const token = String(options.token || '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || (() => new Date());
  const consumedApprovalIds = new Set();
  if (typeof fetchImpl !== 'function') throw new GitHubIssueWriteError('fetch_unavailable');

  async function createIssue(draftResult, authorization) {
    const draft = validDraft(draftResult);
    const approvalId = String(authorization?.approval_id || '');
    const expiresAt = safeTimestamp(authorization?.expires_at);
    const current = safeTimestamp(now()?.toISOString?.());
    const expectedRepository = owner + '/' + repository;
    const validAuthorization = authorization?.action === 'create_github_issue'
      && authorization?.repository === expectedRepository
      && authorization?.one_time === true
      && /^[0-9a-f]{64}$/.test(approvalId)
      && /^[0-9a-f]{64}$/.test(authorization?.draft_fingerprint || '')
      && draft
      && authorization.draft_fingerprint === fingerprint(draft)
      && expiresAt
      && current
      && Date.parse(current) <= Date.parse(expiresAt);
    if (!validAuthorization) throw new GitHubIssueWriteError('invalid_or_expired_authorization');
    if (consumedApprovalIds.has(approvalId)) throw new GitHubIssueWriteError('authorization_already_used');
    consumedApprovalIds.add(approvalId);
    if (!token) throw new GitHubIssueWriteError('write_token_unavailable');

    let response;
    try {
      response = await fetchImpl(`${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/issues`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({ title: draft.title, body: draft.body }),
        redirect: 'error'
      });
    } catch { throw new GitHubIssueWriteError('github_unavailable'); }
    if (!response?.ok) throw new GitHubIssueWriteError(errorCode(response), response?.status);
    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) throw new GitHubIssueWriteError('github_response_too_large', response.status);
    let value;
    try { value = JSON.parse(text); } catch { throw new GitHubIssueWriteError('invalid_github_response', response.status); }
    const number = Number(value?.number);
    const htmlUrl = Number.isSafeInteger(number) && number > 0 ? safeGitHubIssueUrl(value?.html_url, owner, repository, number) : '';
    if (!htmlUrl) throw new GitHubIssueWriteError('invalid_github_response', response.status);
    return Object.freeze({
      schema_version: 1,
      status: 'published',
      reason_code: 'github_issue_created',
      published_at: current,
      issue: Object.freeze({ number, title: draft.title, html_url: htmlUrl })
    });
  }

  return Object.freeze({ repository: Object.freeze({ owner, name: repository }), createIssue });
}

export function createGitHubIssueWriterFromEnv(env = process.env, options = {}) {
  return createGitHubIssueWriter({
    owner: env.DEV_COMMAND_CENTER_GITHUB_OWNER || 'kankidoi2-byte',
    repository: env.DEV_COMMAND_CENTER_GITHUB_REPOSITORY || 'monster-rpg-ver8',
    token: env.DEV_COMMAND_CENTER_GITHUB_ISSUE_TOKEN || '',
    fetchImpl: options.fetchImpl,
    now: options.now
  });
}
