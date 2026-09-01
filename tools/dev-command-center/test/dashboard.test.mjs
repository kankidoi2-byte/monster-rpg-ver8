import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildDashboardViewModel, renderDashboardHtml } from '../src/dashboard.mjs';
import { createDashboardProvider } from '../src/dashboard-provider.mjs';

const sha = 'a'.repeat(40);
const observedAt = '2026-09-01T11:00:00.000Z';
const unifiedStatus = {
  schema_version: 1,
  status: {
    code: 'awaiting_confirmation',
    label_ja: '<script>secret</script>',
    reason_code: 'untrusted free text',
    observed_at: observedAt,
    source: 'untrusted source'
  },
  signals: {
    main_sha: sha,
    open_pull_request_count: 1,
    ci: { matched_main: true, status: 'completed', conclusion: 'success', head_sha: sha },
    pages: { site_status: 'built', build_status: 'built', published_sha: sha },
    free_text: 'must not leak'
  }
};
const nextAction = {
  schema_version: 1,
  decision: {
    priority: 6,
    action_code: 'review_open_pull_request',
    reason_code: 'untrusted reason',
    blocking_status: 'awaiting_confirmation',
    source_links: [
      'https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/72?token=secret#diff',
      'https://evil.example/steal'
    ]
  }
};

const view = buildDashboardViewModel({ unifiedStatus, nextAction });
assert.equal(view.status, 'awaiting_confirmation');
assert.equal(view.status_label, '確認待ち');
assert.equal(view.observed_at_utc, observedAt);
assert.equal(view.observed_at_jst, '2026-09-01 20:00 JST');
assert.equal(view.repository.main_sha, sha);
assert.equal(view.repository.open_pull_request_count, 1);
assert.equal(view.next_action.action_label, 'オープンPRを確認');
assert.deepEqual(view.next_action.source_links, ['https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/72']);
assert.equal(Object.isFrozen(view), true);
assert.equal(Object.isFrozen(view.next_action.source_links), true);

const html = renderDashboardHtml(view);
for (const required of [
  'lang="ja"',
  'name="viewport"',
  '<main id="main">',
  '総合状態',
  '次に確認すること',
  'リポジトリ',
  '自動チェック',
  '公開',
  '更新時刻',
  '診断レポート取込',
  'action="/diagnostics/import"',
  'GitHub書き込み・外部送信・永続保存なし',
  'href="/dashboard.css"'
]) assert.equal(html.includes(required), true, required);
assert.equal(html.includes('<script>'), false);
assert.equal(html.includes('untrusted'), false);
assert.equal(html.includes('must not leak'), false);
assert.equal(html.includes('token=secret'), false);
assert.equal(html.includes('evil.example'), false);

const importHtml = renderDashboardHtml(view, {
  schema_version: 1,
  validation: { status: 'accepted', reason_code: 'report_accepted', report_version: 1 },
  imported_at: observedAt,
  report: {
    schema_version: 1,
    generated_at: observedAt,
    app: { version: '8.0', build_commit: sha },
    related_commit: sha,
    context: { screen: 'diagnosticsScreen', device_class: 'mobile' },
    summary: { health_status: 'ok', issue_count: 0, error_count: 0, unavailable_sections: [], text: '診断レポート v1（正常）／検出0件／エラー0件' },
    sections: { errors: { available: true, count: 0 } }
  }
});
assert.equal(importHtml.includes('診断レポートを取り込みました'), true);
assert.equal(importHtml.includes('diagnosticsScreen'), true);
assert.equal(importHtml.includes('action="/diagnostics/clear"'), true);

const rejectedHtml = renderDashboardHtml(view, {
  schema_version: 1,
  validation: { status: 'rejected', reason_code: 'sensitive_field_present', report_version: 1 },
  imported_at: observedAt,
  report: null
});
assert.equal(rejectedHtml.includes('秘密情報または保存情報らしい項目を検出しました'), true);

const invalid = buildDashboardViewModel({
  unifiedStatus: { schema_version: 9, status: { code: 'healthy' } },
  nextAction: { schema_version: 9, decision: { action_code: 'no_action' } }
});
assert.equal(invalid.status, 'unavailable');
assert.equal(invalid.next_action.action_code, 'restore_status_input');
assert.equal(invalid.repository.main_sha, '');

const css = await readFile(new URL('../dashboard.css', import.meta.url), 'utf8');
assert.equal(css.includes('@media (max-width: 480px)'), true);
assert.equal(css.includes('minmax(min(100%, 15rem), 1fr)'), true);
assert.equal(css.includes('min-height: 44px'), true);
assert.equal(css.includes(':focus-visible'), true);
assert.equal(css.includes('overflow-wrap: anywhere'), true);

let repositoryReads = 0;
const snapshot = value => ({ async getSnapshot() { return value; } });
const repositorySnapshot = {
  schema_version: 1,
  observed_at: observedAt,
  repository: { full_name: 'kankidoi2-byte/monster-rpg-ver8' },
  sections: {
    commits: { status: 'available', items: [{ sha }] },
    pull_requests: { status: 'available', items: [] }
  }
};
const actionsSnapshot = {
  schema_version: 1,
  observed_at: observedAt,
  repository: { owner: 'kankidoi2-byte', name: 'monster-rpg-ver8' },
  runs: { status: 'available', items: [{ head_sha: sha, status: 'completed', conclusion: 'success' }] }
};
const pagesSnapshot = {
  schema_version: 1,
  observed_at: observedAt,
  repository: { owner: 'kankidoi2-byte', name: 'monster-rpg-ver8' },
  site: { status: 'available', value: { status: 'built' } },
  latest_build: { status: 'available', value: { status: 'built', published_sha: sha } }
};
const provider = createDashboardProvider({
  repositoryReader: { async getSnapshot() { repositoryReads += 1; return repositorySnapshot; } },
  actionsReader: snapshot(actionsSnapshot),
  pagesReader: snapshot(pagesSnapshot),
  now: () => new Date('2026-09-01T11:01:00.000Z'),
  cacheMs: 60_000,
  sourceLinks: ['https://github.com/kankidoi2-byte/monster-rpg-ver8']
});
const first = await provider.getDashboard();
const second = await provider.getDashboard();
assert.equal(first.status, 'healthy');
assert.equal(second, first);
assert.equal(repositoryReads, 1);

const failedProvider = createDashboardProvider({
  repositoryReader: { async getSnapshot() { throw new Error('token=secret'); } },
  actionsReader: snapshot(actionsSnapshot),
  pagesReader: snapshot(pagesSnapshot),
  now: () => new Date('2026-09-01T11:01:00.000Z'),
  cacheMs: 0
});
const failedView = await failedProvider.getDashboard();
assert.equal(failedView.status, 'unavailable');
assert.equal(failedView.ci.status, 'completed');
assert.equal(failedView.pages.site_status, 'built');
assert.equal(JSON.stringify(failedView).includes('secret'), false);

const partialProvider = createDashboardProvider({
  repositoryReader: snapshot(repositorySnapshot),
  actionsReader: snapshot(actionsSnapshot),
  pagesReader: { async getSnapshot() { throw new Error('pages unavailable'); } },
  now: () => new Date('2026-09-01T11:01:00.000Z'),
  cacheMs: 0
});
const partialView = await partialProvider.getDashboard();
assert.equal(partialView.status, 'unavailable');
assert.equal(partialView.repository.main_sha, sha);
assert.equal(partialView.repository.open_pull_request_count, 0);
assert.equal(partialView.ci.status, 'completed');
assert.equal(partialView.pages.site_status, 'unknown');

console.log('Development command center mobile dashboard validation passed.');
