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
    let response;
    try {
      response = await fetchImpl(`${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}${path}`, {
        method: requestOptions.method || 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          ...(requestOptions.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          'X-GitHub-Api-Version': '2022-11-28'
        },
        ...(requestOptions.body === undefined ? {} : { body: JSON.stringify(requestOptions.body) }),
        redirect: 'error'
      });
    } catch {
      throw new GitHubPatchWriteError('github_unavailable', null, stage);
    }
    if (!response?.ok) throw new GitHubPatchWriteError(apiErrorCode(response), response?.status, stage);
    let text;
    try { text = await response.text(); } catch { throw new GitHubPatchWriteError('invalid_github_response', response?.status, stage); }
    if (text.length > MAX_RESPONSE_CHARS) throw new GitHubPatchWriteError('github_response_too_large', response.status, stage);
    try { return JSON.parse(text); } catch { throw new GitHubPatchWriteError('invalid_github_response', response.status, stage); }
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
    const openPulls = await request('/pulls?state=open&base=main&per_page=100');
    const marker = `<!-- phase29-proposal:${proposal.proposal_id} -->`;
    if (!Array.isArray(openPulls) || openPulls.length > 100
      || openPulls.some((pull) => typeof pull?.body !== 'string' || pull.body.length > 64_000)) {
      throw new GitHubPatchWriteError('invalid_github_response');
    }
    if (openPulls.some((pull) => pull.body.includes(marker))) {
      throw new GitHubPatchWriteError('matching_open_pull_request_exists');
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
      const blob = await request('/git/blobs', {
        method: 'POST',
        body: { content: prepared.content, encoding: 'utf-8' }
      }, 'blob_creation');
      if (blob?.sha !== prepared.file.result_blob_sha) {
        throw new GitHubPatchWriteError('created_blob_mismatch', null, 'blob_creation');
      }
      treeEntries.push({ path: prepared.file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const tree = await request('/git/trees', {
      method: 'POST',
      body: { base_tree: baseCommit.tree.sha, tree: treeEntries }
    }, 'tree_creation');
    if (!SHA_PATTERN.test(tree?.sha ?? '')) throw new GitHubPatchWriteError('invalid_github_response', null, 'tree_creation');
    const commit = await request('/git/commits', {
      method: 'POST',
      body: { message: expectedPlan.commit_message, tree: tree.sha, parents: [expectedPlan.base_sha] }
    }, 'commit_creation');
    if (!SHA_PATTERN.test(commit?.sha ?? '')) throw new GitHubPatchWriteError('invalid_github_response', null, 'commit_creation');
    const ref = await request('/git/refs', {
      method: 'POST',
      body: { ref: `refs/heads/${expectedPlan.branch_name}`, sha: commit.sha }
    }, 'branch_creation');
    if (ref?.ref !== `refs/heads/${expectedPlan.branch_name}` || ref?.object?.sha !== commit.sha) {
      throw new GitHubPatchWriteError('invalid_github_response', null, 'branch_creation');
    }
    const pull = await request('/pulls', {
      method: 'POST',
      body: {
        title: expectedPlan.pull_request_title,
        body: expectedPlan.pull_request_body,
        head: expectedPlan.branch_name,
        base: 'main',
        maintainer_can_modify: false,
        draft: false
      }
    }, 'pull_request_creation');
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
