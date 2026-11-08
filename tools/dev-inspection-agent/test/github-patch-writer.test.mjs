import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { prepareIsolatedRemediation } from '../src/isolated-remediation-environment.mjs';
import { generateMinimalPatchProposal } from '../src/minimal-patch-proposal.mjs';
import { confirmPatchPublication, preparePatchPublication } from '../src/patch-publication-approval.mjs';
import {
  GitHubPatchWriteError,
  createGitHubPatchWriter,
  createGitHubPatchWriterFromEnv
} from '../src/github-patch-writer.mjs';

const repository = 'kankidoi2-byte/monster-rpg-ver8';
const baseSha = 'a'.repeat(40);
const treeSha = 'b'.repeat(40);
const subtreeSha = 'd'.repeat(40);
const commitSha = 'c'.repeat(40);
const source = 'export const retryLimit = 1;\n';
const changed = 'export const retryLimit = 2;\n';
const preparedAt = '2026-09-02T08:11:00.000Z';
const confirmedAt = '2026-09-02T08:12:00.000Z';
const materializedAt = '2026-09-02T08:12:30.000Z';

function blobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1').update(Buffer.from(`blob ${body.byteLength}\0`)).update(body).digest('hex');
}

function proposal() {
  const requestedAt = '2026-09-02T08:10:00.000Z';
  const environmentResult = prepareIsolatedRemediation({
    schema_version: 1,
    mode: 'isolated_remediation_request',
    repository,
    requested_at: requestedAt,
    base: { branch: 'main', sha: baseSha },
    source_draft: {
      schema_version: 1,
      draft_id: `phase27:${'d'.repeat(64)}`,
      report_id: `phase26:${'e'.repeat(64)}`,
      status: 'failed',
      publication: { state: 'unpublished', destination: null, requires_fresh_confirmation: true, issue_number: null }
    },
    files: [{ path: 'js/diagnostics.js', blob_sha: blobSha(source), bytes: Buffer.byteLength(source) }]
  }, { now: requestedAt });
  return generateMinimalPatchProposal({
    schema_version: 1,
    mode: 'minimal_patch_proposal_request',
    repository,
    requested_at: requestedAt,
    environment: environmentResult.environment,
    files: [{
      path: 'js/diagnostics.js',
      base_blob_sha: blobSha(source),
      source_text: source,
      edits: [{ before: 'retryLimit = 1', after: 'retryLimit = 2' }]
    }],
    validation: {
      environment_id: environmentResult.environment.environment_id,
      base_sha: baseSha,
      result_files: [{ path: 'js/diagnostics.js', blob_sha: blobSha(changed) }],
      checks: environmentResult.environment.test_plan.map((test) => ({ ...test, status: 'passed' }))
    }
  }, { now: requestedAt });
}

function authorizationBundle(generated) {
  const preparation = preparePatchPublication(generated, {
    schema_version: 1,
    repository,
    observed_at: preparedAt,
    main: { branch: 'main', sha: baseSha },
    open_pull_requests: []
  }, { now: preparedAt });
  const confirmation = confirmPatchPublication(preparation, {
    proposal_id: preparation.proposal_id,
    plan_fingerprint: preparation.plan.fingerprint,
    confirmation_text: preparation.approval_request.confirmation_text
  }, { now: confirmedAt });
  return { plan: preparation.plan, authorization: confirmation.authorization };
}

function jsonResponse(value, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(value) };
}

function successfulFetch(log) {
  const resultBlobSha = blobSha(changed);
  return async (url, options) => {
    const path = new URL(url).pathname.replace('/repos/kankidoi2-byte/monster-rpg-ver8', '');
    const method = options.method;
    const body = options.body ? JSON.parse(options.body) : null;
    log.push({ path, method, body, authorization: options.headers.Authorization });
    if (method === 'GET' && path === '/branches/main') return jsonResponse({ name: 'main', commit: { sha: baseSha } });
    if (method === 'GET' && path === `/git/commits/${baseSha}`) return jsonResponse({ sha: baseSha, tree: { sha: treeSha } });
    if (method === 'GET' && path === `/git/trees/${treeSha}`) return jsonResponse({ sha: treeSha, tree: [{ path: 'js', type: 'tree', sha: subtreeSha }] });
    if (path === `/git/trees/${subtreeSha}`) return jsonResponse({ sha: subtreeSha, tree: [{ path: 'diagnostics.js', type: 'blob', sha: blobSha(source) }] });
    if (method === 'GET' && path === '/pulls') return jsonResponse([]);
    if (method === 'GET' && path === `/git/blobs/${blobSha(source)}`) {
      return jsonResponse({ sha: blobSha(source), encoding: 'base64', content: Buffer.from(source).toString('base64') });
    }
    if (method === 'POST' && path === '/git/blobs') return jsonResponse({ sha: resultBlobSha }, 201);
    if (method === 'POST' && path === '/git/trees') return jsonResponse({ sha: treeSha }, 201);
    if (method === 'POST' && path === '/git/commits') return jsonResponse({ sha: commitSha }, 201);
    if (method === 'POST' && path === '/git/refs') {
      return jsonResponse({ ref: `refs/heads/${body.ref.replace('refs/heads/', '')}`, object: { sha: commitSha } }, 201);
    }
    if (method === 'POST' && path === '/pulls') {
      return jsonResponse({
        number: 117,
        html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/117?token=removed#fragment',
        head: { sha: commitSha },
        base: { ref: 'main' }
      }, 201);
    }
    throw new Error(`unexpected request: ${method} ${path}`);
  };
}

const generated = proposal();
const { plan, authorization } = authorizationBundle(generated);
assert.equal(authorization.prepared_at, preparedAt);
assert.equal(authorization.confirmed_at, confirmedAt);

const log = [];
const token = 'test-token-value-never-returned';
const writer = createGitHubPatchWriter({
  owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', token,
  fetchImpl: successfulFetch(log), now: () => new Date(materializedAt)
});
const output = await writer.materialize(generated, plan, authorization);
assert.equal(output.status, 'materialized');
assert.equal(output.commit_sha, commitSha);
assert.equal(output.pull_request.number, 117);
assert.equal(output.pull_request.html_url, 'https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/117');
assert.equal(output.merge_authorized, false);
assert.equal(JSON.stringify(output).includes(token), false);
assert.deepEqual(log.map((item) => `${item.method} ${item.path}`), [
  'GET /branches/main', `GET /git/commits/${baseSha}`, 'GET /pulls', `GET /git/trees/${treeSha}`, `GET /git/trees/${subtreeSha}`, `GET /git/blobs/${blobSha(source)}`,
  'POST /git/blobs', 'POST /git/trees', 'POST /git/commits', 'POST /git/refs', 'POST /pulls'
]);
assert.deepEqual(log[6].body, { content: changed, encoding: 'utf-8' });
assert.deepEqual(log[7].body, {
  base_tree: treeSha,
  tree: [{ path: 'js/diagnostics.js', mode: '100644', type: 'blob', sha: blobSha(changed) }]
});
assert.deepEqual(log[8].body, { message: plan.commit_message, tree: treeSha, parents: [baseSha] });
assert.deepEqual(log[9].body, { ref: `refs/heads/${plan.branch_name}`, sha: commitSha });
assert.equal(log[10].body.head, plan.branch_name);
assert.equal(log[10].body.base, 'main');
assert.equal(log[10].body.draft, false);
assert.equal(log[10].body.maintainer_can_modify, false);
assert.ok(log.every((item) => item.authorization === `Bearer ${token}`));

await assert.rejects(() => writer.materialize(generated, plan, authorization), (error) =>
  error instanceof GitHubPatchWriteError && error.code === 'authorization_already_used');
assert.equal(log.length, 11);

for (const mutation of [
  (value) => { value.plan_fingerprint = 'f'.repeat(64); },
  (value) => { value.expires_at = '2026-09-02T08:12:29.000Z'; },
  (value) => { value.approval_id = '0'.repeat(64); }
]) {
  const calls = [];
  const changedAuthorization = structuredClone(authorization);
  mutation(changedAuthorization);
  const candidate = createGitHubPatchWriter({
    owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', token, fetchImpl: successfulFetch(calls),
    now: () => new Date(materializedAt)
  });
  await assert.rejects(() => candidate.materialize(generated, plan, changedAuthorization), (error) =>
    error.code === 'invalid_or_expired_authorization');
  assert.equal(calls.length, 0);
}

const noTokenCalls = [];
const noToken = createGitHubPatchWriter({
  owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', token: '', fetchImpl: successfulFetch(noTokenCalls),
  now: () => new Date(materializedAt)
});
await assert.rejects(() => noToken.materialize(generated, plan, authorization), (error) =>
  error.code === 'write_token_unavailable');
assert.equal(noTokenCalls.length, 0);
await assert.rejects(() => noToken.materialize(generated, plan, authorization), (error) =>
  error.code === 'authorization_already_used');
assert.equal(noTokenCalls.length, 0);

const staleCalls = [];
const stale = createGitHubPatchWriter({
  owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', token,
  fetchImpl: async (url, options) => {
    staleCalls.push({ url, method: options.method });
    return jsonResponse({ name: 'main', commit: { sha: 'f'.repeat(40) } });
  },
  now: () => new Date(materializedAt)
});
await assert.rejects(() => stale.materialize(generated, plan, authorization), (error) =>
  error.code === 'main_changed_since_confirmation');
assert.deepEqual(staleCalls.map((item) => item.method), ['GET']);

const duplicateCalls = [];
const duplicate = createGitHubPatchWriter({
  owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', token,
  fetchImpl: async (url, options) => {
    const path = new URL(url).pathname.replace('/repos/kankidoi2-byte/monster-rpg-ver8', '');
    duplicateCalls.push(options.method);
    if (path === '/branches/main') return jsonResponse({ name: 'main', commit: { sha: baseSha } });
    if (path === `/git/commits/${baseSha}`) return jsonResponse({ sha: baseSha, tree: { sha: treeSha } });
    return jsonResponse([{ number: 9, body: `<!-- phase29-proposal:${generated.proposal.proposal_id} -->` }]);
  },
  now: () => new Date(materializedAt)
});
await assert.rejects(() => duplicate.materialize(generated, plan, authorization), (error) =>
  error.code === 'matching_open_pull_request_exists');
assert.deepEqual(duplicateCalls, ['GET', 'GET', 'GET']);

const mismatchCalls = [];
const mismatch = createGitHubPatchWriter({
  owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', token,
  fetchImpl: async (url, options) => {
    const path = new URL(url).pathname.replace('/repos/kankidoi2-byte/monster-rpg-ver8', '');
    mismatchCalls.push(options.method);
    if (path === '/branches/main') return jsonResponse({ name: 'main', commit: { sha: baseSha } });
    if (path === `/git/commits/${baseSha}`) return jsonResponse({ sha: baseSha, tree: { sha: treeSha } });
    if (path === `/git/trees/${treeSha}`) return jsonResponse({ sha: treeSha, tree: [{ path: 'js', type: 'tree', sha: subtreeSha }] });
    if (path === `/git/trees/${subtreeSha}`) return jsonResponse({ sha: subtreeSha, tree: [{ path: 'diagnostics.js', type: 'blob', sha: blobSha(source) }] });
    if (path === '/pulls') return jsonResponse([]);
    return jsonResponse({ sha: blobSha(source), encoding: 'base64', content: Buffer.from('changed').toString('base64') });
  },
  now: () => new Date(materializedAt)
});
await assert.rejects(() => mismatch.materialize(generated, plan, authorization), (error) =>
  error.code === 'source_blob_mismatch');
assert.deepEqual(mismatchCalls, ['GET', 'GET', 'GET', 'GET', 'GET', 'GET']);

const envWriter = createGitHubPatchWriterFromEnv({
  DEV_INSPECTION_AGENT_GITHUB_OWNER: 'kankidoi2-byte',
  DEV_INSPECTION_AGENT_GITHUB_REPOSITORY: 'monster-rpg-ver8',
  DEV_INSPECTION_AGENT_GITHUB_WRITE_TOKEN: token
}, { fetchImpl: successfulFetch([]), now: () => new Date(materializedAt) });
assert.deepEqual(envWriter.repository, { owner: 'kankidoi2-byte', name: 'monster-rpg-ver8' });
assert.throws(() => createGitHubPatchWriter({ owner: 'other', repository: 'repo', token, fetchImpl: async () => {} }),
  (error) => error.code === 'repository_not_allowed');

const sourceText = await readFile(new URL('../src/github-patch-writer.mjs', import.meta.url), 'utf8');
for (const forbidden of ['/merges', '/issues', '/actions', 'force', 'delete', 'PATCH']) {
  assert.equal(sourceText.includes(forbidden), false, `forbidden capability present: ${forbidden}`);
}
const contract = JSON.parse(await readFile(new URL('../github-patch-writer-contract.json', import.meta.url), 'utf8'));
assert.equal(contract.effects.merge, false);
assert.equal(contract.authorization.fresh_confirmation_per_materialization, true);
assert.equal(contract.limits.maximum_files, 3);

console.log('Development inspection agent GitHub patch writer validation passed.');

// TOOL-01: a valid old blob must also belong to this path in the base tree.
function testWriter(fetchImpl, extra = {}) {
  return createGitHubPatchWriter({ owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', token,
    fetchImpl, now: () => new Date(materializedAt), ...extra });
}
const wrongTreeLog = [];
const wrongTreeBase = successfulFetch(wrongTreeLog);
let treeReads = 0;
await assert.rejects(() => testWriter(async (url, options) => {
  if (new URL(url).pathname.endsWith(`/git/trees/${treeSha}`)) {
    treeReads += 1;
    return jsonResponse({ sha: treeSha, tree: [{ path: 'js/diagnostics.js', type: 'blob', sha: 'f'.repeat(40) }] });
  }
  return wrongTreeBase(url, options);
}).materialize(generated, plan, authorization), { code: 'base_tree_blob_mismatch' });
assert.equal(treeReads, 1);
assert.ok(wrongTreeLog.every((entry) => entry.method === 'GET'));

// TOOL-04: find a duplicate beyond the first 100 results, and fail closed at the cap.
for (const cap of [false, true]) {
  const calls = [];
  const base = successfulFetch(calls);
  let pages = 0;
  await assert.rejects(() => testWriter(async (url, options) => {
    if (new URL(url).pathname.endsWith('/pulls')) {
      pages += 1;
      const page = Number(new URL(url).searchParams.get('page'));
      return jsonResponse(Array.from({ length: cap || page === 1 ? 100 : 50 }, (_, i) => ({
        body: !cap && page === 2 && i === 19 ? `<!-- phase29-proposal:${generated.proposal.proposal_id} -->` : ''
      })));
    }
    return base(url, options);
  }).materialize(generated, plan, authorization), { code: cap ? 'open_pull_request_page_limit' : 'matching_open_pull_request_exists' });
  assert.equal(pages, cap ? 10 : 2);
  assert.ok(calls.every((entry) => entry.method === 'GET'));
}

// TOOL-03: fetch and body are both covered by the same deadline and signal.
for (const stalledBody of [false, true]) {
  let signal;
  await assert.rejects(() => testWriter(async (_url, options) => {
    signal = options.signal;
    return stalledBody ? { ok: true, status: 200, text: () => new Promise(() => {}) } : new Promise(() => {});
  }, { readTimeoutMs: 5 }).materialize(generated, plan, authorization), { code: 'github_timeout' });
  assert.equal(signal.aborted, true);
}
const timeoutLog = [];
const timeoutBase = successfulFetch(timeoutLog);
let writes = 0;
let lookedUp = false;
let postSignal;
const recovered = await testWriter(async (url, options) => {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith('/pulls') && options.method === 'POST') {
    writes += 1;
    postSignal = options.signal;
    return new Promise(() => {});
  }
  if (parsed.pathname.endsWith('/pulls') && parsed.searchParams.has('head')) {
    lookedUp = true;
    assert.equal(parsed.searchParams.get('state'), 'all');
    return jsonResponse([{ number: 117, html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/117',
      state: 'closed', body: `<!-- phase29-proposal:${generated.proposal.proposal_id} -->`, head: { sha: commitSha }, base: { ref: 'main' } }]);
  }
  return timeoutBase(url, options);
}, { writeTimeoutMs: 5 }).materialize(generated, plan, authorization);
assert.equal(recovered.pull_request.number, 117);
assert.equal(writes, 1);
assert.equal(lookedUp, true);
assert.equal(postSignal.aborted, true);
console.log('TOOL-01, TOOL-03 and TOOL-04 regression checks passed.');

for (const outcome of ['absent', 'lookup_failed', 'tree_unknown']) {
  const calls = [];
  const base = successfulFetch(calls);
  let attempts = 0;
  let lookups = 0;
  const candidate = testWriter(async (url, options) => {
    const parsed = new URL(url);
    const target = outcome === 'tree_unknown' ? '/git/trees' : '/pulls';
    if (parsed.pathname.endsWith(target) && options.method === 'POST') {
      attempts += 1;
      if (attempts === 1) return new Promise(() => {});
    }
    if (parsed.pathname.endsWith('/pulls') && parsed.searchParams.has('head')) {
      lookups += 1;
      return outcome === 'absent' ? jsonResponse([]) : jsonResponse({}, 503);
    }
    return base(url, options);
  }, { writeTimeoutMs: 5 });
  if (outcome === 'absent') {
    assert.equal((await candidate.materialize(generated, plan, authorization)).status, 'materialized');
    assert.equal(attempts, 2);
  } else {
    await assert.rejects(() => candidate.materialize(generated, plan, authorization), { code: 'write_outcome_unknown' });
    assert.equal(attempts, 1);
  }
  assert.equal(lookups, outcome === 'tree_unknown' ? 0 : 1);
}
console.log('Write reconciliation: confirmed absence retries once; unavailable/unknown outcomes stop.');
