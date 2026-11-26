import { createGitHubRepositoryReader } from '../src/github-reader.mjs';
import { createGitHubActionsReader } from '../src/github-actions-reader.mjs';
import { createGitHubPagesReader } from '../src/github-pages-reader.mjs';
import http from 'node:http';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createCommandCenterServer } from '../src/server.mjs';
import { fetchGitHubText } from '../src/github-request.mjs';
import { createGitHubIssueWriter } from '../src/github-issue-writer.mjs';

const app = createCommandCenterServer({ config: { host: '127.0.0.1', port: 0 } });
try {
  const { port } = await app.listen();
  const base = `http://127.0.0.1:${port}`;
  const html = await (await fetch(base)).text();
  const token = html.match(/name="csrf_token" value="([0-9a-f]{64})"/)?.[1];
  assert.ok(token);
  assert.equal((html.match(/<form\b/g) || []).length, (html.match(/name="csrf_token"/g) || []).length);
  const send = (headers, body = new URLSearchParams({ csrf_token: token })) => fetch(base + '/diagnostics/clear', {
    method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers }, body
  });
  const badHost = method => new Promise((resolve, reject) => {
    const req = http.request(base + '/', { method, headers: { Host: 'untrusted.invalid' } }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject); req.end();
  });
  assert.equal(await badHost('GET'), 403);
  assert.equal(await badHost('POST'), 403);
  assert.equal((await send({ origin: 'https://untrusted.invalid' })).status, 403);
  assert.equal((await send({ 'sec-fetch-site': 'same-origin' }, '')).status, 403);
  assert.equal((await send({}, '')).status, 403);
  assert.equal((await send({}, new URLSearchParams({ csrf_token: 'f'.repeat(64) }))).status, 403);
  assert.equal((await send({}, new URLSearchParams({ csrf_token: 'あ'.repeat(64) }))).status, 403);
  assert.equal((await send({ origin: base })).status, 303);
  assert.equal((await send({})).status, 303); // Token and Host are mandatory even without Fetch Metadata.
} finally { await app.close(); }

// Both an unresponsive fetch and a stalled body are bounded and aborted.
for (const stalledBody of [false, true]) {
  let signal;
  const started = Date.now();
  await assert.rejects(() => fetchGitHubText(async (_url, init) => {
    signal = init.signal;
    return stalledBody ? { ok: true, text: () => new Promise(() => {}) } : new Promise(() => {});
  }, 'https://api.github.com/mock', { method: 'GET' }, { timeoutMs: 15 }), error => error.code === 'github_timeout');
  assert.equal(signal.aborted, true);
  assert.ok(Date.now() - started < 2000);
}

for (const create of [createGitHubRepositoryReader, createGitHubActionsReader, createGitHubPagesReader]) {
  let signal;
  const reader = create({ owner: 'owner', repository: 'repo', readTimeoutMs: 15, fetchImpl: async (_url, init) => {
    signal = init.signal; return new Promise(() => {});
  } });
  if (create === createGitHubRepositoryReader || create === createGitHubActionsReader) {
    await assert.rejects(() => reader.getSnapshot(), error => error.code === 'github_timeout');
  } else {
    assert.ok(JSON.stringify(await reader.getSnapshot()).includes('github_timeout'));
  }
  assert.equal(signal.aborted, true);
}

const title = '[開発司令塔] 自動チェック失敗を調査';
const body = 'CI結果を確認。未投稿の下書きです。';
const draft = { schema_version: 1, status: 'generated', draft: { posting_status: 'not_posted', title, body } };
const now = new Date('2026-11-07T00:00:00Z');
const auth = {
  action: 'create_github_issue', repository: 'owner/repo', one_time: true,
  approval_id: 'a'.repeat(64),
  draft_fingerprint: createHash('sha256').update(title).update('\n').update(body).digest('hex'),
  expires_at: '2026-11-07T00:05:00Z'
};
for (const outcome of ['created', 'absent', 'unknown', 'body-stalled']) {
  const calls = [];
  const issue = { number: 1, title, body, created_at: now.toISOString(), html_url: 'https://github.com/owner/repo/issues/1' };
  const writer = createGitHubIssueWriter({
    owner: 'owner', repository: 'repo', token: 'mock-only', now: () => now,
    readTimeoutMs: 15, writeTimeoutMs: 15,
    async fetchImpl(_url, init) {
      calls.push(init.method);
      if (init.method === 'GET') {
        if (outcome === 'unknown') throw new Error('lookup unavailable');
        return new Response(JSON.stringify(outcome === 'absent' ? [] : [issue]));
      }
      if (calls.length === 1) return outcome === 'body-stalled'
        ? { ok: true, text: () => new Promise(() => {}) }
        : new Promise(() => {});
      return new Response(JSON.stringify(issue), { status: 201 });
    }
  });
  if (outcome === 'unknown') {
    await assert.rejects(() => writer.createIssue(draft, auth), error => error.code === 'github_write_outcome_unknown');
    assert.deepEqual(calls, ['POST', 'GET']);
  } else {
    assert.equal((await writer.createIssue(draft, auth)).issue.number, 1);
    assert.deepEqual(calls, outcome === 'absent' ? ['POST', 'GET', 'POST'] : ['POST', 'GET']);
  }
}
console.log('Command center Host/Origin/CSRF and API deadline/reconciliation checks passed.');
