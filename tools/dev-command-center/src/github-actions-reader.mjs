const API_BASE = 'https://api.github.com';
const MAX_RESPONSE_CHARS = 1_000_000;
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
const RUN_STATUSES = new Set(['queued', 'in_progress', 'completed', 'requested', 'waiting', 'pending']);
const CONCLUSIONS = new Set(['success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral', 'skipped', 'stale', 'startup_failure']);
const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out', 'action_required', 'startup_failure']);

export class GitHubActionsReadError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = 'GitHubActionsReadError';
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

function safeTimestamp(value) {
  const text = boundedText(value, 40);
  if (!text || !Number.isFinite(Date.parse(text))) return null;
  return new Date(text).toISOString();
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
    throw new GitHubActionsReadError(code);
  }
  return name;
}

function normalizeStatus(value) {
  return RUN_STATUSES.has(value) ? value : 'unknown';
}

function normalizeConclusion(value) {
  return CONCLUSIONS.has(value) ? value : null;
}

function normalizeRun(value) {
  const status = normalizeStatus(value?.status);
  return Object.freeze({
    id: positiveInteger(value?.id),
    workflow_id: positiveInteger(value?.workflow_id),
    workflow_name: boundedText(value?.name, 160),
    run_number: positiveInteger(value?.run_number),
    run_attempt: positiveInteger(value?.run_attempt),
    event: boundedText(value?.event, 40),
    head_branch: boundedText(value?.head_branch, 255),
    head_sha: safeSha(value?.head_sha),
    status,
    conclusion: normalizeConclusion(value?.conclusion),
    started_at: safeTimestamp(value?.run_started_at || value?.created_at),
    completed_at: status === 'completed' ? safeTimestamp(value?.updated_at) : null,
    details_url: safeGitHubUrl(value?.html_url)
  });
}

function normalizeStep(value) {
  return Object.freeze({
    number: positiveInteger(value?.number),
    name: boundedText(value?.name, 160),
    status: normalizeStatus(value?.status),
    conclusion: normalizeConclusion(value?.conclusion),
    started_at: safeTimestamp(value?.started_at),
    completed_at: safeTimestamp(value?.completed_at)
  });
}

function normalizeJob(value) {
  const conclusion = normalizeConclusion(value?.conclusion);
  const steps = Array.isArray(value?.steps) ? value.steps.slice(0, 100).map(normalizeStep) : [];
  return Object.freeze({
    id: positiveInteger(value?.id),
    name: boundedText(value?.name, 160),
    status: normalizeStatus(value?.status),
    conclusion,
    failed: FAILED_CONCLUSIONS.has(conclusion),
    started_at: safeTimestamp(value?.started_at),
    completed_at: safeTimestamp(value?.completed_at),
    log_url: safeGitHubUrl(value?.html_url),
    steps: Object.freeze(steps)
  });
}

function unavailableSection(error, extra = {}) {
  return Object.freeze({
    status: 'unavailable',
    ...extra,
    items: Object.freeze([]),
    reason_code: error instanceof GitHubActionsReadError ? error.code : 'github_unavailable',
    rate_limit: Object.freeze({ remaining: null, reset_at: null })
  });
}

export function createGitHubActionsReader(options = {}) {
  const owner = validateName(options.owner, 'invalid_github_owner');
  const repository = validateName(options.repository, 'invalid_github_repository');
  const token = String(options.token || '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || (() => new Date());
  if (typeof fetchImpl !== 'function') throw new GitHubActionsReadError('fetch_unavailable');
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
      throw new GitHubActionsReadError('github_unavailable');
    }
    if (!response?.ok) throw new GitHubActionsReadError(responseErrorCode(response), response?.status);
    const text = await response.text();
    if (text.length > MAX_RESPONSE_CHARS) throw new GitHubActionsReadError('github_response_too_large', response.status);
    try {
      return { value: JSON.parse(text), rateLimit: rateLimitFrom(response.headers) };
    } catch {
      throw new GitHubActionsReadError('invalid_github_response', response.status);
    }
  }

  async function readRuns() {
    const result = await request('/actions/runs', { per_page: 20 });
    if (!Array.isArray(result.value?.workflow_runs)) throw new GitHubActionsReadError('invalid_github_response');
    return Object.freeze({
      items: Object.freeze(result.value.workflow_runs.slice(0, 20).map(normalizeRun)),
      rateLimit: result.rateLimit
    });
  }

  async function readJobs(runId) {
    const result = await request('/actions/runs/' + runId + '/jobs', { filter: 'latest', per_page: 100 });
    if (!Array.isArray(result.value?.jobs)) throw new GitHubActionsReadError('invalid_github_response');
    return Object.freeze({
      items: Object.freeze(result.value.jobs.slice(0, 100).map(normalizeJob)),
      rateLimit: result.rateLimit
    });
  }

  async function getSnapshot() {
    const runsResult = await readRuns();
    const latestRunId = runsResult.items[0]?.id || null;
    let jobs;
    if (!latestRunId) {
      jobs = Object.freeze({
        status: 'available',
        run_id: null,
        items: Object.freeze([]),
        rate_limit: runsResult.rateLimit
      });
    } else {
      try {
        const jobsResult = await readJobs(latestRunId);
        jobs = Object.freeze({
          status: 'available',
          run_id: latestRunId,
          items: jobsResult.items,
          rate_limit: jobsResult.rateLimit
        });
      } catch (error) {
        jobs = unavailableSection(error, { run_id: latestRunId });
      }
    }
    return Object.freeze({
      schema_version: 1,
      observed_at: now().toISOString(),
      repository: Object.freeze({ owner, name: repository }),
      runs: Object.freeze({
        status: 'available',
        items: runsResult.items,
        rate_limit: runsResult.rateLimit
      }),
      latest_run_jobs: jobs
    });
  }

  return Object.freeze({
    repository: Object.freeze({ owner, name: repository }),
    getSnapshot
  });
}

export function createGitHubActionsReaderFromEnv(env = process.env, options = {}) {
  return createGitHubActionsReader({
    owner: env.DEV_COMMAND_CENTER_GITHUB_OWNER || 'kankidoi2-byte',
    repository: env.DEV_COMMAND_CENTER_GITHUB_REPOSITORY || 'monster-rpg-ver8',
    token: env.DEV_COMMAND_CENTER_GITHUB_TOKEN || '',
    fetchImpl: options.fetchImpl,
    now: options.now
  });
}
