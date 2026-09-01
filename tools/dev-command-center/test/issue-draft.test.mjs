import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generateIssueDraft } from '../src/issue-draft.mjs';
import { createCommandCenterServer } from '../src/server.mjs';

const now = new Date('2026-09-01T22:10:00.000Z');
const sha = 'a'.repeat(40);

function view(status = 'failed') {
  return {
    schema_version: 1,
    status,
    observed_at_utc: '2026-09-01T22:00:00.000Z',
    repository: { main_sha: sha, open_pull_request_count: 0 },
    ci: { status: 'completed', conclusion: 'failure', head_sha: sha, matched_main: true },
    pages: { site_status: 'built', build_status: 'built', published_sha: sha },
    next_action: {
      priority: 1,
      action_code: 'inspect_failed_check',
      blocking_status: status,
      source_links: [
        'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/123?token=secret#step:1',
        'https://evil.example/token=must-not-leak'
      ]
    }
  };
}

function diagnostic() {
  return {
    schema_version: 1,
    validation: { status: 'accepted', reason_code: 'report_accepted', report_version: 1 },
    imported_at: now.toISOString(),
    report: {
      schema_version: 1,
      generated_at: '2026-09-01T22:00:00.000Z',
      app: { version: '8.0', build_commit: sha },
      related_commit: sha,
      context: { screen: 'diagnosticsScreen', device_class: 'mobile' },
      summary: { health_status: 'error', issue_count: 2, error_count: 1, unavailable_sections: [] },
      sections: { errors: { available: true, count: 1 } }
    }
  };
}

const failed = generateIssueDraft(view(), null, { now });
assert.equal(failed.status, 'generated');
assert.equal(failed.reason_code, 'failed_status_detected');
assert.equal(failed.draft.posting_status, 'not_posted');
assert.equal(failed.draft.title, '[開発司令塔] 自動チェック失敗を調査');
assert.equal(failed.draft.body.includes('## 根拠'), true);
assert.equal(failed.draft.body.includes('## 再現条件'), true);
assert.equal(failed.draft.body.includes('## 影響'), true);
assert.equal(failed.draft.body.includes('## 重複候補'), true);
assert.equal(failed.draft.body.includes('未投稿'), true);
assert.equal(failed.draft.source_links.some(link => link.includes('?') || link.includes('#')), false);
assert.equal(JSON.stringify(failed).includes('evil.example'), false);
assert.equal(JSON.stringify(failed).includes('secret'), false);
assert.equal(Object.isFrozen(failed), true);
assert.equal(Object.isFrozen(failed.draft.evidence), true);

const untrustedNested = view();
untrustedNested.ci.status = '<script>token=must-not-leak</script>';
untrustedNested.ci.conclusion = 'secret conclusion';
const sanitizedNested = generateIssueDraft(untrustedNested, null, { now });
assert.equal(JSON.stringify(sanitizedNested).includes('must-not-leak'), false);
assert.equal(JSON.stringify(sanitizedNested).includes('secret conclusion'), false);

const realFetch = globalThis.fetch;
let unexpectedNetworkCalls = 0;
globalThis.fetch = async () => { unexpectedNetworkCalls += 1; throw new Error('network forbidden'); };
generateIssueDraft(view(), diagnostic(), { now });
globalThis.fetch = realFetch;
assert.equal(unexpectedNetworkCalls, 0);

const diagnosticDraft = generateIssueDraft(view('healthy'), diagnostic(), { now });
assert.equal(diagnosticDraft.status, 'generated');
assert.equal(diagnosticDraft.reason_code, 'diagnostic_errors_detected');
assert.equal(diagnosticDraft.draft.title, '[診断] ゲーム内エラーを確認');
assert.equal(diagnosticDraft.draft.body.includes('エラー件数: 1'), true);
assert.equal(diagnosticDraft.draft.body.includes('diagnosticsScreen'), true);

for (const status of ['healthy', 'in_progress', 'awaiting_confirmation', 'publish_pending']) {
  const value = generateIssueDraft(view(status), null, { now });
  assert.equal(value.status, 'not_actionable', status);
  assert.equal(value.draft, null);
}

const hostile = view();
hostile.status = '<script>failed</script>';
hostile.next_action.action_code = 'token=must-not-leak';
const rejected = generateIssueDraft(hostile, null, { now });
assert.equal(rejected.status, 'rejected');
assert.equal(JSON.stringify(rejected).includes('must-not-leak'), false);

let dashboardReads = 0;
const app = createCommandCenterServer({
  config: { host: '127.0.0.1', port: 0, privateNetworkConfirmed: false },
  now: () => now,
  dashboardProvider: { async getDashboard() { dashboardReads += 1; return view(); } }
});
try {
  const address = await app.listen();
  const base = `http://127.0.0.1:${address.port}`;
  const generatedResponse = await fetch(base + '/issues/draft', { method: 'POST', redirect: 'manual' });
  assert.equal(generatedResponse.status, 303);
  assert.equal(generatedResponse.headers.get('location'), '/');
  assert.equal(dashboardReads, 1);
  const page = await (await fetch(base + '/')).text();
  assert.equal(page.includes('未投稿の下書き'), true);
  assert.equal(page.includes('自動チェック失敗を調査'), true);
  assert.equal(page.includes('action="/issues/draft/clear"'), true);

  const crossSite = await fetch(base + '/issues/draft', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'sec-fetch-site': 'cross-site' }
  });
  assert.equal(crossSite.status, 404);

  const cleared = await fetch(base + '/issues/draft/clear', { method: 'POST', redirect: 'manual' });
  assert.equal(cleared.status, 303);
  assert.equal((await (await fetch(base + '/')).text()).includes('action="/issues/draft/clear"'), false);
} finally {
  await app.close();
}

const serverSource = await readFile(new URL('../src/server.mjs', import.meta.url), 'utf8');
for (const forbidden of ['api.github.com/repos/', '/issues"', '/issues\'']) {
  assert.equal(serverSource.includes(forbidden), false, `write endpoint present: ${forbidden}`);
}

console.log('Development command center unposted Issue draft validation passed.');
