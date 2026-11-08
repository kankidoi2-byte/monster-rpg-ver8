import { createHash } from 'node:crypto';
import {
  buildPatchPublicationPlan,
  validatePatchPublicationProposal
} from './patch-publication-approval.mjs';

const API_BASE = 'https://api.github.com';
const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const MAX_RESPONSE_CHARS = 256_000;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const APPROVAL_PATTERN = /^[0-9a-f]{64}$/;
const NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

export class GitHubPatchWriteError extends Error {
  constructor(code, status = null, stage = 'preflight') {
    super(code);
    this.name = 'GitHubPatchWriteError';
    this.code = code;
    this.status = Number.isInteger(status) ? status : null;
    this.stage = stage;
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1').update(Buffer.from(`blob ${body.byteLength}\0`)).update(body).digest('hex');
}

function validateName(value, code) {
  const name = String(value ?? '').trim();
  if (!name || name.length > 100 || !NAME_PATTERN.test(name) || name === '.' || name === '..') {
    throw new GitHubPatchWriteError(code);
  }
  return name;
}

function isoTime(value) {
  const milliseconds = Date.parse(String(value ?? ''));
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function safePullRequestUrl(value, owner, repository, number) {
  try {
    const url = new URL(String(value ?? ''));
    if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password
      || url.pathname !== `/${owner}/${repository}/pull/${number}`) return '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function apiErrorCode(response) {
  if (response?.status === 401) return 'authentication_required';
  if (response?.status === 403) return 'permission_denied';
  if (response?.status === 404) return 'repository_object_not_found';
  if (response?.status === 409) return 'github_conflict';
  if (response?.status === 422) return 'github_rejected_write';
  if (response?.status === 429) return 'rate_limited';
  return response?.status >= 500 ? 'github_unavailable' : 'github_request_failed';
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

function applyEdits(source, file) {
  let content = source;
  for (const edit of file.edits) {
    if (occurrences(content, edit.before) !== 1) throw new GitHubPatchWriteError('source_edit_no_longer_exact_once');
    content = content.replace(edit.before, edit.after);
  }
  if (gitBlobSha(content) !== file.result_blob_sha) throw new GitHubPatchWriteError('result_blob_mismatch');
  return content;
}

function samePlan(actual, expected) {
  const keys = [
    'repository', 'base_branch', 'base_sha', 'branch_name', 'commit_message',
    'pull_request_title', 'pull_request_body', 'source_proposal_id', 'fingerprint'
  ];
  return actual && keys.every((key) => actual[key] === expected[key])
    && Object.keys(actual).length === keys.length;
}

function validAuthorization(value, expectedPlan, nowIso) {
  const preparedAt = isoTime(value?.prepared_at);
  const confirmedAt = isoTime(value?.confirmed_at);
  const expiresAt = isoTime(value?.expires_at);
  if (value?.action !== 'create_agent_remediation_branch_commit_and_pull_request'
    || value?.repository !== REPOSITORY
    || value?.proposal_id !== expectedPlan.source_proposal_id
    || value?.plan_fingerprint !== expectedPlan.fingerprint
    || value?.base_sha !== expectedPlan.base_sha
    || value?.branch_name !== expectedPlan.branch_name
    || value?.one_time !== true || value?.merge_authorized !== false
    || !APPROVAL_PATTERN.test(value?.approval_id ?? '')
    || !preparedAt || !confirmedAt || !expiresAt
    || Date.parse(confirmedAt) < Date.parse(preparedAt)
    || Date.parse(expiresAt) - Date.parse(preparedAt) !== 5 * 60 * 1000
    || Date.parse(nowIso) < Date.parse(confirmedAt)
    || Date.parse(nowIso) > Date.parse(expiresAt)) return false;
  return value.approval_id === sha256(`${expectedPlan.fingerprint}\n${preparedAt}\n${expiresAt}`);
}

export function createGitHubPatchWriter(options = {}) {
  const owner = validateName(options.owner, 'invalid_github_owner');
  const repository = validateName(options.repository, 'invalid_github_repository');
  if (`${owner}/${repository}` !== REPOSITORY) throw new GitHubPatchWriteError('repository_not_allowed');
  const token = String(options.token || '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || (() => new Date());
  const consumedApprovalIds = new Set();
  if (typeof fetchImpl !== 'function') throw new GitHubPatchWriteError('fetch_unavailable');

  async function request(path, requestOptions = {}, stage = 'preflight') {
    const controller = new AbortController();
    const timeoutMs = requestOptions.method ? (options.writeTimeoutMs ?? 30_000) : (options.readTimeoutMs ?? 15_000);
    let timer;
    try {
      return await Promise.race([
        (async () => {
          const response = await fetchImpl(`${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}${path}`, {
            method: requestOptions.method || 'GET',
            headers: {
              Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
              ...(requestOptions.body === undefined ? {} : { 'Content-Type': 'application/json' }),
              'X-GitHub-Api-Version': '2022-11-28'
            },
            ...(requestOptions.body === undefined ? {} : { body: JSON.stringify(requestOptions.body) }),
            redirect: 'error', signal: controller.signal
          });
          if (!response?.ok) throw new GitHubPatchWriteError(apiErrorCode(response), response?.status, stage);
          const text = await response.text();
          if (text.length > MAX_RESPONSE_CHARS) throw new GitHubPatchWriteError('github_response_too_large', response.status, stage);
          try { return JSON.parse(text); } catch { throw new GitHubPatchWriteError('invalid_github_response', response.status, stage); }
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => {
          reject(new GitHubPatchWriteError('github_timeout', null, stage));
          controller.abort();
        }, timeoutMs); })
      ]);
    } catch (error) {
      if (error instanceof GitHubPatchWriteError) throw error;
      throw new GitHubPatchWriteError('github_unavailable', null, stage);
    } finally { clearTimeout(timer); }
  }

  async function listOpenPulls(query = '', state = 'open') {
    const pulls = [];
    for (let page = 1; page <= 10; page += 1) {
      const batch = await request(`/pulls?state=${state}&base=main&per_page=100&page=${page}${query}`);
      if (!Array.isArray(batch) || batch.length > 100
        || batch.some((pull) => typeof pull?.body !== 'string' || pull.body.length > 64_000)) {
        throw new GitHubPatchWriteError('invalid_github_response');
      }
      pulls.push(...batch);
      if (batch.length < 100) return pulls;
    }
    throw new GitHubPatchWriteError('open_pull_request_page_limit');
  }

  // Immutable objects without a known SHA cannot be located after a lost response.
  // Stop instead of repeating an uncertain write. Named objects can be reconciled.
  async function write(path, body, stage, lookup) {
    try { return await request(path, { method: 'POST', body }, stage); }
    catch (error) {
      if (error.code !== 'github_timeout') throw error;
      if (lookup) {
        let found;
        let knownAbsent = false;
        try {
          found = await lookup();
          knownAbsent = found === null;
        } catch (lookupError) {
          knownAbsent = lookupError.code === 'repository_object_not_found';
        }
        if (found) return found;
        if (knownAbsent) {
          // Only one retry, after a successful absence check, never a blind retry.
          try { return await request(path, { method: 'POST', body }, stage); }
          catch (retryError) {
            if (retryError.code !== 'github_timeout') throw retryError;
            try {
              const recovered = await lookup();
              if (recovered) return recovered;
            } catch { /* The final lookup also failed; stop with an unknown outcome. */ }
          }
        }
      }
      throw new GitHubPatchWriteError('write_outcome_unknown', null, stage);
    }
  }

  async function materialize(proposalResult, reviewedPlan, authorization) {
    const current = isoTime(now()?.toISOString?.());
    const proposal = current ? validatePatchPublicationProposal(proposalResult, { now: current }) : null;
    const expectedPlan = current ? buildPatchPublicationPlan(proposalResult, { now: current }) : null;
    if (!proposal || !expectedPlan || !samePlan(reviewedPlan, expectedPlan)
      || !validAuthorization(authorization, expectedPlan, current)) {
      throw new GitHubPatchWriteError('invalid_or_expired_authorization');
    }
    if (consumedApprovalIds.has(authorization.approval_id)) {
      throw new GitHubPatchWriteError('authorization_already_used');
    }
    consumedApprovalIds.add(authorization.approval_id);
    if (!token) throw new GitHubPatchWriteError('write_token_unavailable');

    const branch = await request('/branches/main');
    if (branch?.name !== 'main' || branch?.commit?.sha !== expectedPlan.base_sha) {
      throw new GitHubPatchWriteError('main_changed_since_confirmation');
    }
    const baseCommit = await request(`/git/commits/${expectedPlan.base_sha}`);
    if (baseCommit?.sha !== expectedPlan.base_sha || !SHA_PATTERN.test(baseCommit?.tree?.sha ?? '')) {
      throw new GitHubPatchWriteError('invalid_github_response');
    }
    const openPulls = await listOpenPulls();
    const marker = `<!-- phase29-proposal:${proposal.proposal_id} -->`;
    if (openPulls.some((pull) => pull.body.includes(marker))) {
      throw new GitHubPatchWriteError('matching_open_pull_request_exists');
    }

    const trees = new Map();
    async function readTree(sha) {
      if (!trees.has(sha)) {
        const value = await request(`/git/trees/${sha}`);
        if (value?.sha !== sha || value.truncated || !Array.isArray(value.tree)) {
          throw new GitHubPatchWriteError('invalid_base_tree');
        }
        trees.set(sha, value.tree);
      }
      return trees.get(sha);
    }
    for (const file of proposal.files) {
      const parts = file.path.split('/');
      let treeSha = baseCommit.tree.sha;
      for (let index = 0; index < parts.length; index += 1) {
        const entry = (await readTree(treeSha)).find((item) => item.path === parts[index]);
        const isFile = index === parts.length - 1;
        if (isFile ? entry?.type !== 'blob' || entry.sha !== file.base_blob_sha
          : entry?.type !== 'tree' || !SHA_PATTERN.test(entry.sha ?? '')) {
          throw new GitHubPatchWriteError('base_tree_blob_mismatch');
        }
        treeSha = entry.sha;
      }
    }

    const preparedFiles = [];
    for (const file of proposal.files) {
      const blob = await request(`/git/blobs/${file.base_blob_sha}`);
      if (blob?.sha !== file.base_blob_sha || blob?.encoding !== 'base64' || typeof blob?.content !== 'string') {
        throw new GitHubPatchWriteError('source_blob_mismatch');
      }
      let source;
      try { source = Buffer.from(blob.content.replace(/\s/g, ''), 'base64').toString('utf8'); } catch {
        throw new GitHubPatchWriteError('source_blob_mismatch');
      }
      if (gitBlobSha(source) !== file.base_blob_sha) throw new GitHubPatchWriteError('source_blob_mismatch');
      preparedFiles.push({ file, content: applyEdits(source, file) });
    }

    const treeEntries = [];
    for (const prepared of preparedFiles) {
      const blob = await write('/git/blobs', { content: prepared.content, encoding: 'utf-8' }, 'blob_creation',
        () => request(`/git/blobs/${prepared.file.result_blob_sha}`));
      if (blob?.sha !== prepared.file.result_blob_sha) {
        throw new GitHubPatchWriteError('created_blob_mismatch', null, 'blob_creation');
      }
      treeEntries.push({ path: prepared.file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const tree = await write('/git/trees', { base_tree: baseCommit.tree.sha, tree: treeEntries }, 'tree_creation');
    if (!SHA_PATTERN.test(tree?.sha ?? '')) throw new GitHubPatchWriteError('invalid_github_response', null, 'tree_creation');
    const commit = await write('/git/commits', { message: expectedPlan.commit_message, tree: tree.sha, parents: [expectedPlan.base_sha] }, 'commit_creation');
    if (!SHA_PATTERN.test(commit?.sha ?? '')) throw new GitHubPatchWriteError('invalid_github_response', null, 'commit_creation');
    const ref = await write('/git/refs', { ref: `refs/heads/${expectedPlan.branch_name}`, sha: commit.sha }, 'branch_creation',
      () => request(`/git/ref/heads/${expectedPlan.branch_name}`));
    if (ref?.ref !== `refs/heads/${expectedPlan.branch_name}` || ref?.object?.sha !== commit.sha) {
      throw new GitHubPatchWriteError('invalid_github_response', null, 'branch_creation');
    }
    const pull = await write('/pulls', {
        title: expectedPlan.pull_request_title,
        body: expectedPlan.pull_request_body,
        head: expectedPlan.branch_name,
        base: 'main',
        maintainer_can_modify: false,
        draft: false
    }, 'pull_request_creation', async () => {
      const matches = (await listOpenPulls(`&head=${encodeURIComponent(`${owner}:${expectedPlan.branch_name}`)}`, 'all'))
        .filter((item) => item.body.includes(marker));
      if (matches.some((item) => item.head?.sha !== commit.sha || item.base?.ref !== 'main')) {
        throw new GitHubPatchWriteError('ambiguous_pull_request_outcome');
      }
      if (matches.length > 1) throw new GitHubPatchWriteError('ambiguous_pull_request_outcome');
      return matches[0] || null;
    });
    const number = Number(pull?.number);
    const htmlUrl = Number.isSafeInteger(number) && number > 0
      ? safePullRequestUrl(pull?.html_url, owner, repository, number) : '';
    if (!htmlUrl || pull?.head?.sha !== commit.sha || pull?.base?.ref !== 'main') {
      throw new GitHubPatchWriteError('invalid_github_response', null, 'pull_request_creation');
    }
    return Object.freeze({
      schema_version: 1,
      phase: 30,
      status: 'materialized',
      reason_code: 'branch_commit_and_pull_request_created',
      materialized_at: current,
      proposal_id: proposal.proposal_id,
      base_sha: expectedPlan.base_sha,
      branch_name: expectedPlan.branch_name,
      commit_sha: commit.sha,
      pull_request: Object.freeze({ number, html_url: htmlUrl }),
      merge_authorized: false
    });
  }

  return Object.freeze({ repository: Object.freeze({ owner, name: repository }), materialize });
}

export function createGitHubPatchWriterFromEnv(env = process.env, options = {}) {
  return createGitHubPatchWriter({
    owner: env.DEV_INSPECTION_AGENT_GITHUB_OWNER || 'kankidoi2-byte',
    repository: env.DEV_INSPECTION_AGENT_GITHUB_REPOSITORY || 'monster-rpg-ver8',
    token: env.DEV_INSPECTION_AGENT_GITHUB_WRITE_TOKEN || '',
    fetchImpl: options.fetchImpl,
    now: options.now
  });
}
