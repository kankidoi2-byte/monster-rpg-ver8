import assert from 'node:assert/strict';
import { createGitHubPagesReader, createGitHubPagesReaderFromEnv, GitHubPagesReadError } from '../src/github-pages-reader.mjs';

const sha = 'a'.repeat(40);
const token = 'test-pages-secret';
const calls = [];
const sitePath = '/repos/kankidoi2-byte/monster-rpg-ver8/pages';
const buildPath = '/repos/kankidoi2-byte/monster-rpg-ver8/pages/builds/latest';
const siteFixture = {
  status: 'built',
  html_url: 'https://kankidoi2-byte.github.io/monster-rpg-ver8/?secret=' + token,
  build_type: 'workflow',
  source: { branch: 'main', path: '/' },
  public: true,
  https_enforced: true,
  cname: null
};
const buildFixture = {
  status: 'built',
  commit: sha,
  duration: 43000,
  created_at: '2026-09-01T07:19:00Z',
  updated_at: '2026-09-01T07:19:43Z',
  error: { message: token },
  pusher: { login: token }
};

const fetchImpl = async (url, options) => {
  const key = url.pathname + url.search;
  calls.push({ key, options });
  assert.equal(options.method, 'GET');
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers.Authorization, 'Bearer ' + token);
  assert.equal(options.body, undefined);
  const value = key === sitePath ? siteFixture : key === buildPath ? buildFixture : null;
  if (!value) return new Response('{}', { status: 404 });
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'x-ratelimit-remaining': '4997', 'x-ratelimit-reset': '1788249600' }
  });
};

const reader = createGitHubPagesReaderFromEnv({
  DEV_COMMAND_CENTER_GITHUB_OWNER: 'kankidoi2-byte',
  DEV_COMMAND_CENTER_GITHUB_REPOSITORY: 'monster-rpg-ver8',
  DEV_COMMAND_CENTER_GITHUB_TOKEN: token
}, { fetchImpl, now: () => new Date('2026-09-01T07:20:00Z') });

const snapshot = await reader.getSnapshot();
assert.equal(snapshot.schema_version, 1);
assert.equal(snapshot.observed_at, '2026-09-01T07:20:00.000Z');
assert.equal(snapshot.site.status, 'available');
assert.equal(snapshot.site.value.status, 'built');
assert.equal(snapshot.site.value.url, 'https://kankidoi2-byte.github.io/monster-rpg-ver8/');
assert.equal(snapshot.site.value.build_type, 'workflow');
assert.deepEqual(snapshot.site.value.source, { branch: 'main', path: '/' });
assert.equal(snapshot.site.value.https_enforced, true);
assert.equal(snapshot.latest_build.status, 'available');
assert.equal(snapshot.latest_build.value.status, 'built');
assert.equal(snapshot.latest_build.value.published_sha, sha);
assert.equal(snapshot.latest_build.value.published_at, '2026-09-01T07:19:43.000Z');
assert.equal(snapshot.latest_build.value.duration_ms, 43000);
assert.equal(snapshot.latest_build.value.has_error, false);
assert.equal(snapshot.site.rate_limit.remaining, 4997);
assert.equal(JSON.stringify(reader).includes(token), false);
assert.equal(JSON.stringify(snapshot).includes(token), false);
assert.equal(JSON.stringify(snapshot).includes('pusher'), false);
assert.equal(JSON.stringify(snapshot).includes('message'), false);
assert.deepEqual(calls.map(call => call.key).sort(), [buildPath, sitePath].sort());

const partialReader = createGitHubPagesReader({
  owner: 'kankidoi2-byte',
  repository: 'monster-rpg-ver8',
  fetchImpl: async url => {
    if (url.pathname === buildPath) {
      return new Response(JSON.stringify({ message: token }), { status: 403, headers: { 'x-ratelimit-remaining': '10' } });
    }
    return new Response(JSON.stringify(siteFixture), { status: 200 });
  },
  now: () => new Date('2026-09-01T07:20:00Z')
});
const partial = await partialReader.getSnapshot();
assert.equal(partial.site.status, 'available');
assert.equal(partial.latest_build.status, 'unavailable');
assert.equal(partial.latest_build.reason_code, 'permission_denied');
assert.equal(partial.latest_build.value, null);
assert.equal(JSON.stringify(partial).includes(token), false);

const queuedReader = createGitHubPagesReader({
  owner: 'kankidoi2-byte',
  repository: 'monster-rpg-ver8',
  fetchImpl: async url => new Response(JSON.stringify(
    url.pathname === sitePath
      ? { ...siteFixture, status: 'building' }
      : { ...buildFixture, status: 'queued' }
  ), { status: 200 })
});
const queued = await queuedReader.getSnapshot();
assert.equal(queued.site.value.status, 'building');
assert.equal(queued.latest_build.value.status, 'queued');
assert.equal(queued.latest_build.value.published_sha, sha);
assert.equal(queued.latest_build.value.published_at, null);

const erroredReader = createGitHubPagesReader({
  owner: 'kankidoi2-byte',
  repository: 'monster-rpg-ver8',
  fetchImpl: async url => new Response(JSON.stringify(
    url.pathname === sitePath
      ? { ...siteFixture, status: 'errored' }
      : { ...buildFixture, status: 'errored' }
  ), { status: 200 })
});
const errored = await erroredReader.getSnapshot();
assert.equal(errored.site.value.status, 'errored');
assert.equal(errored.latest_build.value.has_error, true);
assert.equal(errored.latest_build.value.published_at, null);

assert.throws(() => createGitHubPagesReader({ owner: '../secret', repository: 'repo', fetchImpl }), error => error instanceof GitHubPagesReadError && error.code === 'invalid_github_owner');
assert.throws(() => createGitHubPagesReader({ owner: 'owner', repository: '', fetchImpl }), error => error instanceof GitHubPagesReadError && error.code === 'invalid_github_repository');

console.log('Development command center GitHub Pages reader validation passed.');
