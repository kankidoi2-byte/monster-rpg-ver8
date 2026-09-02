import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ISSUE_PUBLICATION_APPROVAL_LIMITS,
  ISSUE_PUBLICATION_CONFIRMATION,
  cancelIssuePublication,
  confirmIssuePublication,
  prepareIssuePublication
} from '../src/issue-publication-approval.mjs';

const preparedAt = new Date('2026-09-01T23:10:00.000Z');
const title = '[開発司令塔] 自動チェック失敗を調査';

function draft() {
  return {
    schema_version: 1,
    status: 'generated',
    reason_code: 'failed_status_detected',
    generated_at: preparedAt.toISOString(),
    draft: {
      posting_status: 'not_posted',
      title,
      body: '## 根拠\n- CI結果: failure\n\nこのIssueは未投稿の下書きです。'
    }
  };
}

function snapshot(items = []) {
  return {
    schema_version: 1,
    observed_at: preparedAt.toISOString(),
    sections: { issues: { status: 'available', items } }
  };
}

const realFetch = globalThis.fetch;
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls += 1; throw new Error('network forbidden'); };
const preparation = prepareIssuePublication(draft(), snapshot(), { now: preparedAt });
globalThis.fetch = realFetch;
assert.equal(networkCalls, 0);
assert.equal(preparation.status, 'awaiting_approval');
assert.equal(preparation.reason_code, 'explicit_approval_required');
assert.equal(preparation.approval_request.required_permission, 'issues:write');
assert.equal(preparation.approval_request.confirmation_text, ISSUE_PUBLICATION_CONFIRMATION);
assert.equal(preparation.approval_request.one_time, true);
assert.equal(preparation.approval_request.approval_id.length, 64);
assert.equal(preparation.draft_fingerprint.length, 64);
assert.equal(Date.parse(preparation.approval_request.expires_at) - preparedAt.getTime(), ISSUE_PUBLICATION_APPROVAL_LIMITS.approval_ttl_ms);
assert.equal(Object.isFrozen(preparation), true);
assert.equal(Object.isFrozen(preparation.approval_request), true);

const duplicate = prepareIssuePublication(draft(), snapshot([{
  number: 123,
  title: '  [開発司令塔]   自動チェック失敗を調査  ',
  html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/issues/123?token=removed#comment'
}]), { now: preparedAt });
assert.equal(duplicate.status, 'duplicate_detected');
assert.equal(duplicate.approval_request, null);
assert.deepEqual(duplicate.duplicate_candidates, [{
  number: 123,
  title,
  html_url: 'https://github.com/kankidoi2-byte/monster-rpg-ver8/issues/123'
}]);

const unavailable = prepareIssuePublication(draft(), {
  schema_version: 1,
  sections: { issues: { status: 'unavailable', items: [] } }
}, { now: preparedAt });
assert.equal(unavailable.status, 'blocked');
assert.equal(unavailable.reason_code, 'duplicate_check_unavailable');

const unsafe = draft();
unsafe.draft.title = '<script>token=must-not-leak</script>';
unsafe.draft.body = '未投稿 token=must-not-leak';
const rejected = prepareIssuePublication(unsafe, snapshot(), { now: preparedAt });
assert.equal(rejected.status, 'blocked');
assert.equal(JSON.stringify(rejected).includes('must-not-leak'), false);

const wrongText = confirmIssuePublication(preparation, {
  draft_fingerprint: preparation.draft_fingerprint,
  confirmation_text: '投稿する'
}, { now: new Date('2026-09-01T23:11:00.000Z') });
assert.equal(wrongText.status, 'blocked');
assert.equal(wrongText.reason_code, 'confirmation_text_mismatch');

const changedDraft = confirmIssuePublication(preparation, {
  draft_fingerprint: 'b'.repeat(64),
  confirmation_text: ISSUE_PUBLICATION_CONFIRMATION
}, { now: new Date('2026-09-01T23:11:00.000Z') });
assert.equal(changedDraft.reason_code, 'draft_changed_after_review');

const expired = confirmIssuePublication(preparation, {
  draft_fingerprint: preparation.draft_fingerprint,
  confirmation_text: ISSUE_PUBLICATION_CONFIRMATION
}, { now: new Date('2026-09-01T23:15:00.001Z') });
assert.equal(expired.status, 'expired');
assert.equal(expired.authorization, null);

const authorized = confirmIssuePublication(preparation, {
  draft_fingerprint: preparation.draft_fingerprint,
  confirmation_text: ISSUE_PUBLICATION_CONFIRMATION
}, { now: new Date('2026-09-01T23:12:00.000Z') });
assert.equal(authorized.status, 'authorized');
assert.equal(authorized.authorization.action, 'create_github_issue');
assert.equal(authorized.authorization.one_time, true);
assert.equal(authorized.authorization.approval_id, preparation.approval_request.approval_id);
assert.equal(Object.isFrozen(authorized.authorization), true);

const cancelled = cancelIssuePublication(preparation, { now: new Date('2026-09-01T23:11:00.000Z') });
assert.equal(cancelled.status, 'cancelled');
assert.equal(cancelled.authorization, null);

const source = await readFile(new URL('../src/issue-publication-approval.mjs', import.meta.url), 'utf8');
for (const forbidden of ['fetch(', 'api.github.com', 'Authorization', 'process.env']) {
  assert.equal(source.includes(forbidden), false, `forbidden side effect present: ${forbidden}`);
}

console.log('Development command center Issue publication approval core validation passed.');
