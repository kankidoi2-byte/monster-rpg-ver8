import assert from 'node:assert/strict';
import { createGitHubActionsReader, createGitHubActionsReaderFromEnv, GitHubActionsReadError } from '../src/github-actions-reader.mjs';

const shaA = 'a'.repeat(40);
const shaB = 'b'.repeat(40);
const token = 'test-actions-secret';
const calls = [];
const runsPath = '/repos/kankidoi2-byte/monster-rpg-ver8/actions/runs?per_page=20';
const jobsPath = '/repos/kankidoi2-byte/monster-rpg-ver8/actions/runs/320/jobs?filter=latest&per_page=100';
const runsFixture = {
  total_count: 3,
  workflow_runs: [
    {
      id: 320,
      workflow_id: 10,
      name: 'Validate game data and assets',
      run_number: 320,
      run_attempt: 1,
      event: 'push',
      head_branch: 'main',
      head_sha: shaA,
      status: 'completed',
      conclusion: 'failure',
      run_started_at: '2026-09-01T07:00:00Z',
      updated_at: '2026-09-01T07:01:00Z',
      html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/320?token=' + token,
      logs_url: 'https://api.github.com/unsafe/' + token
    },
    {
      id: 319,
      workflow_id: 10,
      name: 'Validate game data and assets',
      run_number: 319,
      run_attempt: 1,
      event: 'pull_request',
      head_branch: 'feature',
      head_sha: shaB,
      status: 'in_progress',
      conclusion: null,
      run_started_at: '2026-09-01T06:00:00Z',
      updated_at: '2026-09-01T06:00:10Z',
      html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/319'
    },
    {
      id: 318,
      workflow_id: 10,
      name: 'Validate game data and assets',
      run_number: 318,
      run_attempt: 2,
      event: 'push',
      head_branch: 'main',
      head_sha: shaB,
      status: 'completed',
      conclusion: 'success',
      run_started_at: '2026-09-01T05:00:00Z',
      updated_at: '2026-09-01T05:01:00Z',
      html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/318'
    }
  ]
};
const jobsFixture = {
  total_count: 2,
  jobs: [
    {
      id: 9001,
      name: 'validate',
      status: 'completed',
      conclusion: 'failure',
      started_at: '2026-09-01T07:00:05Z',
      completed_at: '2026-09-01T07:00:55Z',
      html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/320/job/9001#step:4:1',
      steps: [
        { number: 1, name: 'Set up job', status: 'completed', conclusion: 'success', started_at: '2026-09-01T07:00:05Z', completed_at: '2026-09-01T07:00:10Z' },
        { number: 2, name: 'Run checks', status: 'completed', conclusion: 'failure', started_at: '2026-09-01T07:00:10Z', completed_at: '2026-09-01T07:00:55Z', log: token }
      ],
      logs_url: 'https://api.github.com/unsafe/' + token
    },
    {
      id: 9002,
      name: 'report',
      status: 'completed',
      conclusion: 'success',
      started_at: '2026-09-01T07:00:05Z',
      completed_at: '2026-09-01T07:00:30Z',
      html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/320/job/9002',
      steps: []
    }
  ]
};

const fetchImpl = async (url, options) => {
  const key = url.pathname + url.search;
  calls.push({ key, options });
  assert.equal(options.method, 'GET');
  assert.equal(options.redirect, 'error');
  assert.equal(options.headers.Authorization, 'Bearer ' + token);
  assert.equal(options.body, undefined);
  const value = key === runsPath ? runsFixture : key === jobsPath ? jobsFixture : null;
  if (!value) return new Response('{}', { status: 404 });
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'x-ratelimit-remaining': '4998', 'x-ratelimit-reset': '1788249600' }
  });
};

const reader = createGitHubActionsReaderFromEnv({
  DEV_COMMAND_CENTER_GITHUB_OWNER: 'kankidoi2-byte',
  DEV_COMMAND_CENTER_GITHUB_REPOSITORY: 'monster-rpg-ver8',
  DEV_COMMAND_CENTER_GITHUB_TOKEN: token
}, { fetchImpl, now: () => new Date('2026-09-01T07:02:00Z') });

const snapshot = await reader.getSnapshot();
assert.equal(snapshot.schema_version, 1);
assert.equal(snapshot.observed_at, '2026-09-01T07:02:00.000Z');
assert.deepEqual(snapshot.runs.items.map(run => run.conclusion), ['failure', null, 'success']);
assert.deepEqual(snapshot.runs.items.map(run => run.status), ['completed', 'in_progress', 'completed']);
assert.equal(snapshot.runs.items[0].details_url, 'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/320');
assert.equal(snapshot.runs.items[1].completed_at, null);
assert.equal(snapshot.latest_run_jobs.status, 'available');
assert.equal(snapshot.latest_run_jobs.run_id, 320);
assert.equal(snapshot.latest_run_jobs.items[0].failed, true);
assert.equal(snapshot.latest_run_jobs.items[0].log_url, 'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/320/job/9001');
assert.equal(snapshot.latest_run_jobs.items[0].steps[1].conclusion, 'failure');
assert.equal(snapshot.latest_run_jobs.items[1].failed, false);
assert.equal(snapshot.runs.rate_limit.remaining, 4998);
assert.equal(JSON.stringify(reader).includes(token), false);
assert.equal(JSON.stringify(snapshot).includes(token), false);
assert.equal(JSON.stringify(snapshot).includes('logs_url'), false);
assert.equal(calls.length, 2);

const partialReader = createGitHubActionsReader({
  owner: 'kankidoi2-byte',
  repository: 'monster-rpg-ver8',
  fetchImpl: async url => {
    const key = url.pathname + url.search;
    if (key === jobsPath) {
      return new Response(JSON.stringify({ message: token }), { status: 403, headers: { 'x-ratelimit-remaining': '10' } });
    }
    return new Response(JSON.stringify(runsFixture), { status: 200 });
  },
  now: () => new Date('2026-09-01T07:02:00Z')
});
const partial = await partialReader.getSnapshot();
assert.equal(partial.runs.status, 'available');
assert.equal(partial.latest_run_jobs.status, 'unavailable');
assert.equal(partial.latest_run_jobs.reason_code, 'permission_denied');
assert.equal(partial.latest_run_jobs.run_id, 320);
assert.equal(JSON.stringify(partial).includes(token), false);
assert.equal(partial.runs.rate_limit.remaining, null);

let emptyCalls = 0;
const emptyReader = createGitHubActionsReader({
  owner: 'kankidoi2-byte',
  repository: 'monster-rpg-ver8',
  fetchImpl: async () => {
    emptyCalls += 1;
    return new Response(JSON.stringify({ total_count: 0, workflow_runs: [] }), { status: 200 });
  }
});
const empty = await emptyReader.getSnapshot();
assert.equal(emptyCalls, 1);
assert.equal(empty.latest_run_jobs.status, 'available');
assert.equal(empty.latest_run_jobs.run_id, null);
assert.deepEqual(empty.latest_run_jobs.items, []);

assert.throws(() => createGitHubActionsReader({ owner: '../secret', repository: 'repo', fetchImpl }), error => error instanceof GitHubActionsReadError && error.code === 'invalid_github_owner');
assert.throws(() => createGitHubActionsReader({ owner: 'owner', repository: '', fetchImpl }), error => error instanceof GitHubActionsReadError && error.code === 'invalid_github_repository');

console.log('Development command center GitHub Actions reader validation passed.');
