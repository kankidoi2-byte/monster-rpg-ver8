const API_BASE = 'https://api.github.com';
const MAX_RESPONSE_CHARS = 1_000_000;
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const SITE_STATUSES = new Set(['built', 'building', 'errored']);
const BUILD_STATUSES = new Set(['built', 'building', 'queued', 'errored']);

export class GitHubPagesReadError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = 'GitHubPagesReadError';
    this.code = code;
    this.status = Number.isInteger(status) ? status : null;
  }
}

function boundedText(value, maxLength = 160) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maxLength);
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function safeSha(value) {
  const sha = String(value ?? '').toLowerCase();
  return /^[0-9a-f]{40}$/.test(sha) ? sha : '';
}

function safeTimestamp(value) {
  const text = boundedText(value, 40);
  if (!text || !Number.isFinite(Date.parse(text))) return null;
  return new Date(text).toISOString();
}

function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value ?? ''));
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return '';
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
  const remainingText = headerValue(headers, 'x-ratelimit-remaining');
  const resetText = headerValue(headers, 'x-ratelimit-reset');
  const remaining = remainingText ? Number(remainingText) : NaN;
  const reset = resetText ? Number(resetText) : NaN;
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
    throw new GitHubPagesReadError(code);
  }
  return name;
}

function normalizeSite(value) {
  const sourcePath = value?.source?.path;
  return Object.freeze({
    status: SITE_STATUSES.has(value?.status) ? value.status : 'unknown',
    url: safeHttpsUrl(value?.html_url),
    build_type: ['legacy', 'workflow'].includes(value?.build_type) ? value.build_type : 'unknown',
    source: Object.freeze({
      branch: boundedText(value?.source?.branch, 255),
      path: sourcePath === '/' || sourcePath === '/docs' ? sourcePath : ''
    }),
    public: value?.public === true,
    https_enforced: value?.https_enforced === true
  });
}

function normalizeBuild(value) {
  const status = BUILD_STATUSES.has(value?.status) ? value.status : 'unknown';
  const updatedAt = safeTimestamp(value?.updated_at);
  return Object.freeze({
    status,
    published_sha: safeSha(value?.commit),
    created_at: safeTimestamp(value?.created_at),
    published_at: status === 'built' ? updatedAt : null,
    duration_ms: nonNegativeInteger(value?.duration),
    has_error: status === 'errored'
  });
}

function availableSection(result) {
  return Object.freeze({
    status: 'available',
    value: result.value,
    rate_limit: result.rateLimit
  });
}

function unavailableSection(error) {
  return Object.freeze({
    status: 'unavailable',
    value: null,
    reason_code: error instanceof GitHubPagesReadError ? error.code : 'github_unavailable',
    rate_limit: Object.freeze({ remaining: null, reset_at: null })
  });
}

export function createGitHubPagesReader(options = {}) {
  const owner = validateName(options.owner, 'invalid_github_owner');
  const repository = validateName(options.repository, 'invalid_github_repository');
  const token = String(options.token || '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || (() => new Date());
  if (typeof fetchImpl !== 'function') throw new GitHubPagesReadError('fetch_unavailable');
  const repositoryPath = '/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repository);

  async function request(path) {
    const url = new URL(API_BASE + repositoryPath + path);
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) headers.Authorization = 'Bearer ' + token;
    let response;
    try {
      response = await fetchImpl(url, { method: 'GET', headers, redirect: 'error' });
    } catch {
      throw new GitHubPagesReadError('github_unavailable');
    }
    if (!response?.ok) throw new GitHubPagesReadError(responseErrorCode(response), response?.status);
    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) throw new GitHubPagesReadError('github_response_too_large', response.status);
    try {
      return { value: JSON.parse(text), rateLimit: rateLimitFrom(response.headers) };
    } catch {
      throw new GitHubPagesReadError('invalid_github_response', response.status);
    }
  }

  async function readSite() {
    const result = await request('/pages');
    if (!result.value || Array.isArray(result.value) || typeof result.value !== 'object') {
      throw new GitHubPagesReadError('invalid_github_response');
    }
    return Object.freeze({ value: normalizeSite(result.value), rateLimit: result.rateLimit });
  }

  async function readLatestBuild() {
    const result = await request('/pages/builds/latest');
    if (!result.value || Array.isArray(result.value) || typeof result.value !== 'object') {
      throw new GitHubPagesReadError('invalid_github_response');
    }
    return Object.freeze({ value: normalizeBuild(result.value), rateLimit: result.rateLimit });
  }

  async function getSnapshot() {
    const [siteResult, buildResult] = await Promise.allSettled([readSite(), readLatestBuild()]);
    return Object.freeze({
      schema_version: 1,
      observed_at: now().toISOString(),
      repository: Object.freeze({ owner, name: repository }),
      site: siteResult.status === 'fulfilled' ? availableSection(siteResult.value) : unavailableSection(siteResult.reason),
      latest_build: buildResult.status === 'fulfilled' ? availableSection(buildResult.value) : unavailableSection(buildResult.reason)
    });
  }

  return Object.freeze({
    repository: Object.freeze({ owner, name: repository }),
    getSnapshot
  });
}

export function createGitHubPagesReaderFromEnv(env = process.env, options = {}) {
  return createGitHubPagesReader({
    owner: env.DEV_COMMAND_CENTER_GITHUB_OWNER || 'kankidoi2-byte',
    repository: env.DEV_COMMAND_CENTER_GITHUB_REPOSITORY || 'monster-rpg-ver8',
    token: env.DEV_COMMAND_CENTER_GITHUB_TOKEN || '',
    fetchImpl: options.fetchImpl,
    now: options.now
  });
}
