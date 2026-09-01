import assert from 'node:assert/strict';
import { createCommandCenterServer } from '../src/server.mjs';
import {
  ISSUE_PUBLICATION_CONFIRMATION,
  confirmIssuePublication,
  prepareIssuePublication
} from '../src/issue-publication-approval.mjs';
import {
  GitHubIssueWriteError,
  createGitHubIssueWriter,
  createGitHubIssueWriterFromEnv
} from '../src/github-issue-writer.mjs';

const now = new Date('2026-09-01T23:30:00.000Z');
const title = '[開発司令塔] 自動チェック失敗を調査';
const token = 'test-only-write-token-never-log';

function draft() {
  return {
    schema_version: 1,
    status: 'generated',
    reason_code: 'failed_status_detected',
    generated_at: now.toISOString(),
    draft: {
      posting_status: 'not_posted',
      title,
      body: '## 根拠\n- CI結果: failure\n\nこのIssueは未投稿の下書きです。'
    }
  };
}

function snapshot(items = []) {
  return { schema_version: 1, observed_at: now.toISOString(), sections: { issues: { status: 'available', items } } };
}

function authorization() {
  const preparation = prepareIssuePublication(draft(), snapshot(), { now });
  return confirmIssuePublication(preparation, {
    draft_fingerprint: preparation.draft_fingerprint,
    confirmation_text: ISSUE_PUBLICATION_CONFIRMATION
  }, { now }).authorization;
}

let calls = 0;
const directWriter = createGitHubIssueWriterFromEnv({
  DEV_COMMAND_CENTER_GITHUB_OWNER: 'kankidoi2-byte',
  DEV_COMMAND_CENTER_GITHUB_REPOSITORY: 'monster-rpg-ver8',
  DEV_COMMAND_CENTER_GITHUB_ISSUE_TOKEN: token
}, {
  now: () => now,
  async fetchImpl(url, options) {
    calls += 1;
    assert.equal(url, 'https://api.github.com/repos/kankidoi2-byte/monster-rpg-ver8/issues');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer ' + token);
    assert.deepEqual(JSON.parse(options.body), { title, body: draft().draft.body });
    return new Response(JSON.stringify({
      number: 321,
      html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/issues/321?secret=removed#comment'
    }), { status: 201 });
  }
});
const published = await directWriter.createIssue(draft(), authorization());
assert.equal(calls, 1);
assert.deepEqual(published.issue, {
  number: 321,
  title,
  html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/issues/321'
});
assert.equal(JSON.stringify(published).includes(token), false);
await assert.rejects(() => directWriter.createIssue(draft(), authorization()), error => error instanceof GitHubIssueWriteError && error.code === 'authorization_already_used');
assert.equal(calls, 1);

let invalidCalls = 0;
const missingTokenWriter = createGitHubIssueWriter({
  owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', token: '', now: () => now,
  async fetchImpl() { invalidCalls += 1; throw new Error('must not run'); }
});
await assert.rejects(() => missingTokenWriter.createIssue(draft(), { ...authorization(), draft_fingerprint: '0'.repeat(64) }), error => error.code === 'invalid_or_expired_authorization');
await assert.rejects(() => missingTokenWriter.createIssue(draft(), authorization()), error => error.code === 'write_token_unavailable');
assert.equal(invalidCalls, 0);
assert.throws(() => createGitHubIssueWriter({ owner: '../secret', repository: 'repo', token, fetchImpl: fetch }), error => error.code === 'invalid_github_owner');

function view() {
  const sha = 'a'.repeat(40);
  return {
    schema_version: 1,
    status: 'failed',
    observed_at_utc: now.toISOString(),
    repository: { main_sha: sha, open_pull_request_count: 0 },
    ci: { status: 'completed', conclusion: 'failure', head_sha: sha, matched_main: true },
    pages: { site_status: 'built', build_status: 'built', published_sha: sha },
    next_action: { priority: 1, action_code: 'inspect_failed_check', blocking_status: 'failed', source_links: [] }
  };
}

let serverWrites = 0;
const serverWriter = createGitHubIssueWriter({
  owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', token, now: () => now,
  async fetchImpl() {
    serverWrites += 1;
    return new Response(JSON.stringify({ number: 400, html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/issues/400' }), { status: 201 });
  }
});
const app = createCommandCenterServer({
  config: { host: '127.0.0.1', port: 0, privateNetworkConfirmed: false },
  now: () => now,
  dashboardProvider: { async getDashboard() { return view(); } },
  repositoryProvider: { async getSnapshot() { return snapshot(); } },
  issueWriter: serverWriter
});
try {
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  await fetch(base + '/issues/draft', { method: 'POST', redirect: 'manual' });
  await fetch(base + '/issues/publication/prepare', { method: 'POST', redirect: 'manual' });
  let page = await (await fetch(base + '/')).text();
  assert.equal(page.includes('投稿前の最終確認'), true);
  assert.equal(page.includes(ISSUE_PUBLICATION_CONFIRMATION), true);
  assert.equal(page.includes('DEV_COMMAND_CENTER_GITHUB_ISSUE_TOKEN'), false);

  const wrong = new URLSearchParams({ draft_fingerprint: '0'.repeat(64), confirmation_text: ISSUE_PUBLICATION_CONFIRMATION });
  await fetch(base + '/issues/publication/confirm', {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: wrong
  });
  assert.equal(serverWrites, 0);

  await fetch(base + '/issues/publication/prepare', { method: 'POST', redirect: 'manual' });
  page = await (await fetch(base + '/')).text();
  const fingerprint = page.match(/name="draft_fingerprint" value="([0-9a-f]{64})"/)?.[1];
  assert.equal(fingerprint?.length, 64);
  const correct = new URLSearchParams({ draft_fingerprint: fingerprint, confirmation_text: ISSUE_PUBLICATION_CONFIRMATION });
  await fetch(base + '/issues/publication/confirm', {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: correct
  });
  assert.equal(serverWrites, 1);
  page = await (await fetch(base + '/')).text();
  assert.equal(page.includes('GitHub Issueを作成しました'), true);
  assert.equal(page.includes('/issues/400'), true);

  await fetch(base + '/issues/publication/confirm', {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: correct
  });
  assert.equal(serverWrites, 1);

  const crossSite = await fetch(base + '/issues/publication/prepare', {
    method: 'POST', redirect: 'manual', headers: { 'sec-fetch-site': 'cross-site' }
  });
  assert.equal(crossSite.status, 404);
} finally { await app.close(); }

console.log('Development command center GitHub Issue writer validation passed.');
