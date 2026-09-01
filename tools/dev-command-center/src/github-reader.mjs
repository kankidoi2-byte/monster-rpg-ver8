const API_BASE = 'https://api.github.com';
const MAX_RESPONSE_CHARS = 1_000_000;
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

export class GitHubReadError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = 'GitHubReadError';
    this.code = code;
    this.status = Number.isInteger(status) ? status : null;
  }
}

function boundedText(value, maxLength = 160) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function safeSha(value) {
  const sha = String(value ?? '').toLowerCase();
  return /^[0-9a-f]{40}$/.test(sha) ? sha : '';
}

function safeGitHubUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    if (url.protocol !== 'https:' || url.hostname !== 'github.com') return '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function headerValue(headers, name) {
  return boundedText(headers?.get?.(name), 40);
}

function rateLimitFrom(headers) {
  const remaining = Number(headerValue(headers, 'x-ratelimit-remaining'));
  const reset = Number(headerValue(headers, 'x-ratelimit-reset'));
  return Object.freeze({
    remaining: Number.isSafeInteger(remaining) && remaining >= 0 ? remaining : null,
    reset_at: Number.isSafeInteger(reset) && reset > 0 ? new Date(reset * 1000).toISOString() : null
  });
}

function responseErrorCode(response) {
  if (response.status === 401) return 'authentication_required';
  if (response.status === 403 && response.headers?.get?.('x-ratelimit-remaining') === '0') return 'rate_limited';
  if (response.status === 403) return 'permission_denied';
  if (response.status === 404) return 'not_found';
  if (response.status === 429) return 'rate_limited';
  return response.status >= 500 ? 'github_unavailable' : 'github_request_failed';
}

function validateName(value, code) {
  const name = String(value ?? '').trim();
  if (!name || name.length > 100 || !NAME_PATTERN.test(name) || name === '.' || name === '..') {
    throw new GitHubReadError(code);
  }
  return name;
}

function normalizeRepository(value) {
  return Object.freeze({
    full_name: boundedText(value?.full_name, 201),
    default_branch: boundedText(value?.default_branch, 255),
    visibility: ['public', 'private', 'internal'].includes(value?.visibility) ? value.visibility : 'unknown',
    archived: value?.archived === true,
    html_url: safeGitHubUrl(value?.html_url),
    updated_at: boundedText(value?.updated_at, 40)
  });
}

function normalizeCommit(value) {
  const firstLine = boundedText(String(value?.commit?.message ?? '').split(/\r?\n/, 1)[0], 160);
  return Object.freeze({
    sha: safeSha(value?.sha),
    title: firstLine,
    author: boundedText(value?.author?.login, 100),
    committed_at: boundedText(value?.commit?.committer?.date, 40),
    html_url: safeGitHubUrl(value?.html_url)
  });
}

function normalizeBranch(value) {
  return Object.freeze({
    name: boundedText(value?.name, 255),
    sha: safeSha(value?.commit?.sha),
    protected: value?.protected === true
  });
}

function normalizePullRequest(value) {
  return Object.freeze({
    number: positiveInteger(value?.number),
    title: boundedText(value?.title, 160),
    state: value?.state === 'closed' ? 'closed' : 'open',
    draft: value?.draft === true,
    base: boundedText(value?.base?.ref, 255),
    head: boundedText(value?.head?.ref, 255),
    head_sha: safeSha(value?.head?.sha),
    html_url: safeGitHubUrl(value?.html_url),
    updated_at: boundedText(value?.updated_at, 40)
  });
}

function normalizeIssue(value) {
  const labels = Array.isArray(value?.labels) ? value.labels.slice(0, 20).map(label => boundedText(label?.name, 50)).filter(Boolean) : [];
  return Object.freeze({
    number: positiveInteger(value?.number),
    title: boundedText(value?.title, 160),
    state: value?.state === 'closed' ? 'closed' : 'open',
    labels: Object.freeze(labels),
    html_url: safeGitHubUrl(value?.html_url),
    updated_at: boundedText(value?.updated_at, 40)
  });
}

function sectionFrom(result) {
  if (result.status === 'fulfilled') {
    return Object.freeze({ status: 'available', items: Object.freeze(result.value.items), rate_limit: result.value.rateLimit });
  }
  const error = result.reason;
  return Object.freeze({
    status: 'unavailable',
    items: Object.freeze([]),
    reason_code: error instanceof GitHubReadError ? error.code : 'github_unavailable',
    rate_limit: Object.freeze({ remaining: null, reset_at: null })
  });
}

export function createGitHubRepositoryReader(options = {}) {
  const owner = validateName(options.owner, 'invalid_github_owner');
  const repository = validateName(options.repository, 'invalid_github_repository');
  const token = String(options.token || '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || (() => new Date());
  if (typeof fetchImpl !== 'function') throw new GitHubReadError('fetch_unavailable');
  const repositoryPath = '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repository);

  async function request(path, query = {}) {
    const url = new URL(API_BASE + repositoryPath + path);
    Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) headers.Authorization = 'Bearer ' + token;
    let response;
    try {
      response = await fetchImpl(url, { method: 'GET', headers, redirect: 'error' });
    } catch {
      throw new GitHubReadError('github_unavailable');
    }
    if (!response?.ok) throw new GitHubReadError(responseErrorCode(response), response?.status);
    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) throw new GitHubReadError('github_response_too_large', response.status);
    try {
      return { value: JSON.parse(text), rateLimit: rateLimitFrom(response.headers) };
    } catch {
      throw new GitHubReadError('invalid_github_response', response.status);
    }
  }

  async function readRepository() {
    const result = await request('');
    return Object.freeze({ value: normalizeRepository(result.value), rateLimit: result.rateLimit });
  }

  async function readList(path, query, normalize, filter = () => true) {
    const result = await request(path, query);
    if (!Array.isArray(result.value)) throw new GitHubReadError('invalid_github_response');
    const items = result.value.slice(0, 100).filter(filter).map(normalize);
    return Object.freeze({ items, rateLimit: result.rateLimit });
  }

  async function getSnapshot() {
    const repositoryResult = await readRepository();
    if (!repositoryResult.value.default_branch) throw new GitHubReadError('invalid_github_response');
    const results = await Promise.allSettled([
      readList('/commits', { sha: repositoryResult.value.default_branch, per_page: 20 }, normalizeCommit),
      readList('/branches', { per_page: 100 }, normalizeBranch),
      readList('/pulls', { state: 'open', per_page: 100 }, normalizePullRequest),
      readList('/issues', { state: 'open', per_page: 100 }, normalizeIssue, issue => !issue?.pull_request)
    ]);
    return Object.freeze({
      schema_version: 1,
      observed_at: now().toISOString(),
      repository: repositoryResult.value,
      sections: Object.freeze({
        commits: sectionFrom(results[0]),
        branches: sectionFrom(results[1]),
        pull_requests: sectionFrom(results[2]),
        issues: sectionFrom(results[3])
      })
    });
  }

  return Object.freeze({
    repository: Object.freeze({ owner, name: repository }),
    getSnapshot
  });
}

export function createGitHubRepositoryReaderFromEnv(env = process.env, options = {}) {
  return createGitHubRepositoryReader({
    owner: env.DEV_COMMAND_CENTER_GITHUB_OWNER || 'kankidoi2-byte',
    repository: env.DEV_COMMAND_CENTER_GITHUB_REPOSITORY || 'monster-rpg-ver8',
    token: env.DEV_COMMAND_CENTER_GITHUB_TOKEN || '',
    fetchImpl: options.fetchImpl,
    now: options.now
  });
}
