import assert from 'node:assert/strict';
import { createGitHubRepositoryReader, createGitHubRepositoryReaderFromEnv, GitHubReadError } from '../src/github-reader.mjs';

const shaA = 'a'.repeat(40);
const shaB = 'b'.repeat(40);
const token = 'test-secret-token';
const calls = [];
const fixtures = new Map([
  ['/repos/kankidoi2-byte/monster-rpg-ver8', { full_name: 'kankidoi2-byte/monster-rpg-ver8', default_branch: 'main', visibility: 'public', archived: false, html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8?secret=no', updated_at: '2026-09-01T00:00:00Z' }],
  ['/repos/kankidoi2-byte/monster-rpg-ver8/commits?sha=main&per_page=20', [{ sha: shaA, commit: { message: 'Safe title\nignored body', committer: { date: '2026-09-01T00:00:00Z' } }, author: { login: 'builder' }, html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/commit/' + shaA }]],
  ['/repos/kankidoi2-byte/monster-rpg-ver8/branches?per_page=100', [{ name: 'main', commit: { sha: shaA }, protected: true }]],
  ['/repos/kankidoi2-byte/monster-rpg-ver8/pulls?state=open&per_page=100', [{ number: 72, title: 'Safe PR', state: 'open', draft: false, base: { ref: 'main' }, head: { ref: 'feature', sha: shaB }, html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/72', updated_at: '2026-09-01T00:00:00Z', body: token }]],
  ['/repos/kankidoi2-byte/monster-rpg-ver8/issues?state=open&per_page=100', [{ number: 8, title: 'Safe issue', state: 'open', labels: [{ name: 'bug' }], html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/issues/8', updated_at: '2026-09-01T00:00:00Z', body: token }, { number: 72, title: 'PR duplicate', pull_request: {}, state: 'open' }]]
]);

const fetchImpl = async (url, options) => {
  const key = url.pathname + url.search;
  calls.push({ key, options });
  assert.equal(options.method, 'GET');
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers.Authorization, 'Bearer ' + token);
  assert.equal(options.body, undefined);
  if (!fixtures.has(key)) return new Response('{}', { status: 404 });
  return new Response(JSON.stringify(fixtures.get(key)), {
    status: 200,
    headers: { 'x-ratelimit-remaining': '4999', 'x-ratelimit-reset': '1788249600' }
  });
};

const reader = createGitHubRepositoryReaderFromEnv({
  DEV_COMMAND_CENTER_GITHUB_OWNER: 'kankidoi2-byte',
  DEV_COMMAND_CENTER_GITHUB_REPOSITORY: 'monster-rpg-ver8',
  DEV_COMMAND_CENTER_GITHUB_TOKEN: token
}, { fetchImpl, now: () => new Date('2026-09-01T00:00:00Z') });

const snapshot = await reader.getSnapshot();
assert.equal(snapshot.schema_version, 1);
assert.equal(snapshot.repository.default_branch, 'main');
assert.equal(snapshot.repository.html_url, 'https://github.com/kankidoi2-byte/monster-rpg-ver8');
assert.equal(snapshot.sections.commits.status, 'available');
assert.equal(snapshot.sections.commits.items[0].title, 'Safe title');
assert.equal(snapshot.sections.branches.items[0].sha, shaA);
assert.equal(snapshot.sections.pull_requests.items[0].head_sha, shaB);
assert.deepEqual(snapshot.sections.issues.items.map(issue => issue.number), [8]);
assert.equal(snapshot.sections.issues.items[0].labels[0], 'bug');
assert.equal(JSON.stringify(reader).includes(token), false);
assert.equal(JSON.stringify(snapshot).includes(token), false);
assert.equal(JSON.stringify(snapshot).includes('ignored body'), false);
assert.equal(calls.length, 5);

const partialReader = createGitHubRepositoryReader({
  owner: 'kankidoi2-byte',
  repository: 'monster-rpg-ver8',
  fetchImpl: async url => {
    const key = url.pathname + url.search;
    if (key.endsWith('/issues?state=open&per_page=100')) {
      return new Response(JSON.stringify({ message: token }), { status: 403, headers: { 'x-ratelimit-remaining': '10' } });
    }
    const value = fixtures.get(key);
    return new Response(JSON.stringify(value), { status: 200 });
  },
  now: () => new Date('2026-09-01T00:00:00Z')
});
const partial = await partialReader.getSnapshot();
assert.equal(partial.sections.issues.status, 'unavailable');
assert.equal(partial.sections.issues.reason_code, 'permission_denied');
assert.equal(JSON.stringify(partial).includes(token), false);
assert.equal(partial.sections.commits.status, 'available');
assert.equal(partial.sections.commits.rate_limit.remaining, null);

assert.throws(() => createGitHubRepositoryReader({ owner: '../secret', repository: 'repo', fetchImpl }), error => error instanceof GitHubReadError && error.code === 'invalid_github_owner');
assert.throws(() => createGitHubRepositoryReader({ owner: 'owner', repository: '', fetchImpl }), error => error instanceof GitHubReadError && error.code === 'invalid_github_repository');

console.log('Development command center GitHub reader validation passed.');
