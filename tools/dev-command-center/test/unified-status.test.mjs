import assert from 'node:assert/strict';
import { deriveUnifiedStatus, UNIFIED_STATUS_CODES } from '../src/unified-status.mjs';

const now = new Date('2026-09-01T09:20:00Z');
const observedAt = '2026-09-01T09:19:00Z';
const sha = 'a'.repeat(40);
const oldSha = 'b'.repeat(40);

function snapshots(overrides = {}) {
  const repository = {
    schema_version: 1,
    observed_at: observedAt,
    repository: { full_name: 'kankidoi2-byte/monster-rpg-ver8', default_branch: 'main' },
    sections: {
      commits: { status: 'available', items: [{ sha }] },
      branches: { status: 'available', items: [] },
      pull_requests: { status: 'available', items: [] },
      issues: { status: 'available', items: [] }
    }
  };
  const actions = {
    schema_version: 1,
    observed_at: observedAt,
    repository: { owner: 'kankidoi2-byte', name: 'monster-rpg-ver8' },
    runs: { status: 'available', items: [{ head_sha: sha, status: 'completed', conclusion: 'success' }] },
    latest_run_jobs: { status: 'available', items: [] }
  };
  const pages = {
    schema_version: 1,
    observed_at: observedAt,
    repository: { owner: 'kankidoi2-byte', name: 'monster-rpg-ver8' },
    site: { status: 'available', value: { status: 'built' } },
    latest_build: { status: 'available', value: { status: 'built', published_sha: sha } }
  };
  return {
    repositorySnapshot: Object.assign(repository, overrides.repository),
    actionsSnapshot: Object.assign(actions, overrides.actions),
    pagesSnapshot: Object.assign(pages, overrides.pages),
    now
  };
}

function status(overrides) {
  return deriveUnifiedStatus(snapshots(overrides));
}

assert.deepEqual(UNIFIED_STATUS_CODES, [
  'healthy', 'in_progress', 'awaiting_confirmation', 'failed', 'publish_pending', 'stale', 'unavailable'
]);

const healthy = status();
assert.equal(healthy.status.code, 'healthy');
assert.equal(healthy.status.label_ja, '正常');
assert.equal(healthy.status.reason_code, 'all_systems_healthy');
assert.equal(healthy.status.observed_at, now.toISOString());
assert.equal(healthy.status.source, 'combined');
assert.equal(healthy.signals.main_sha, sha);
assert.equal(Object.isFrozen(healthy), true);
assert.equal(Object.isFrozen(healthy.signals), true);

const awaiting = snapshots();
awaiting.repositorySnapshot.sections.pull_requests.items.push({ number: 72, title: 'secret title' });
const awaitingResult = deriveUnifiedStatus(awaiting);
assert.equal(awaitingResult.status.code, 'awaiting_confirmation');
assert.equal(awaitingResult.signals.open_pull_request_count, 1);
assert.equal(JSON.stringify(awaitingResult).includes('secret title'), false);

const running = snapshots();
running.actionsSnapshot.runs.items[0] = { head_sha: sha, status: 'in_progress', conclusion: null };
assert.equal(deriveUnifiedStatus(running).status.code, 'in_progress');

const pendingCi = snapshots();
pendingCi.actionsSnapshot.runs.items[0] = { head_sha: oldSha, status: 'completed', conclusion: 'success' };
assert.equal(deriveUnifiedStatus(pendingCi).status.reason_code, 'ci_pending_for_main');

const failed = snapshots();
failed.actionsSnapshot.runs.items[0] = { head_sha: sha, status: 'completed', conclusion: 'failure' };
failed.pagesSnapshot.latest_build.value = { status: 'queued', published_sha: oldSha };
assert.equal(deriveUnifiedStatus(failed).status.code, 'failed');
assert.equal(deriveUnifiedStatus(failed).status.source, 'github_actions');

const pagesFailed = snapshots();
pagesFailed.pagesSnapshot.site.value.status = 'errored';
assert.equal(deriveUnifiedStatus(pagesFailed).status.reason_code, 'pages_failed');

const publishing = snapshots();
publishing.pagesSnapshot.latest_build.value = { status: 'queued', published_sha: oldSha };
assert.equal(deriveUnifiedStatus(publishing).status.code, 'publish_pending');
assert.equal(deriveUnifiedStatus(publishing).status.reason_code, 'pages_build_in_progress');

const unpublished = snapshots();
unpublished.pagesSnapshot.latest_build.value.published_sha = oldSha;
assert.equal(deriveUnifiedStatus(unpublished).status.reason_code, 'pages_commit_not_published');

const stale = snapshots();
stale.pagesSnapshot.observed_at = '2026-09-01T08:00:00Z';
const staleResult = deriveUnifiedStatus(stale);
assert.equal(staleResult.status.code, 'stale');
assert.equal(staleResult.status.source, 'github_pages');
assert.equal(staleResult.signals, null);

const unavailable = snapshots();
unavailable.actionsSnapshot.runs = { status: 'unavailable', items: [], reason_code: 'rate_limited' };
const unavailableResult = deriveUnifiedStatus(unavailable);
assert.equal(unavailableResult.status.code, 'unavailable');
assert.equal(unavailableResult.status.reason_code, 'rate_limited');
assert.equal(unavailableResult.status.source, 'github_actions');

const mismatched = snapshots();
mismatched.pagesSnapshot.repository.name = 'another-repository';
assert.equal(deriveUnifiedStatus(mismatched).status.reason_code, 'repository_mismatch');

const unsupported = snapshots();
unsupported.repositorySnapshot.schema_version = 2;
assert.equal(deriveUnifiedStatus(unsupported).status.reason_code, 'unsupported_source_schema');

const ahead = snapshots();
ahead.repositorySnapshot.observed_at = '2026-09-01T09:30:01Z';
assert.equal(deriveUnifiedStatus(ahead).status.reason_code, 'source_clock_ahead');

const missing = deriveUnifiedStatus({ now });
assert.equal(missing.status.code, 'unavailable');
assert.equal(missing.signals, null);

const original = snapshots();
const before = JSON.stringify(original);
deriveUnifiedStatus(original);
assert.equal(JSON.stringify(original), before);

console.log('Development command center unified status validation passed.');
