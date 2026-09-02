import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { prepareIsolatedRemediation } from '../src/isolated-remediation-environment.mjs';
import { generateMinimalPatchProposal } from '../src/minimal-patch-proposal.mjs';
import {
  PATCH_PUBLICATION_APPROVAL_LIMITS,
  cancelPatchPublication,
  confirmPatchPublication,
  preparePatchPublication
} from '../src/patch-publication-approval.mjs';

const repository = 'kankidoi2-byte/monster-rpg-ver8';
const now = '2026-09-02T08:10:00.000Z';
const baseSha = 'a'.repeat(40);
const source = 'export const retryLimit = 1;\n';
const resultSource = 'export const retryLimit = 2;\n';

function blobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1').update(Buffer.from(`blob ${body.byteLength}\0`)).update(body).digest('hex');
}

function proposal() {
  const environmentResult = prepareIsolatedRemediation({
    schema_version: 1,
    mode: 'isolated_remediation_request',
    repository,
    requested_at: now,
    base: { branch: 'main', sha: baseSha },
    source_draft: {
      schema_version: 1,
      draft_id: `phase27:${'b'.repeat(64)}`,
      report_id: `phase26:${'c'.repeat(64)}`,
      status: 'failed',
      publication: {
        state: 'unpublished',
        destination: null,
        requires_fresh_confirmation: true,
        issue_number: null
      }
    },
    files: [{ path: 'js/diagnostics.js', blob_sha: blobSha(source), bytes: Buffer.byteLength(source) }]
  }, { now });
  assert.equal(environmentResult.outcome.environment_prepared, true);
  const environment = environmentResult.environment;
  return generateMinimalPatchProposal({
    schema_version: 1,
    mode: 'minimal_patch_proposal_request',
    repository,
    requested_at: now,
    environment,
    files: [{
      path: 'js/diagnostics.js',
      base_blob_sha: blobSha(source),
      source_text: source,
      edits: [{ before: 'retryLimit = 1', after: 'retryLimit = 2' }]
    }],
    validation: {
      environment_id: environment.environment_id,
      base_sha: baseSha,
      result_files: [{ path: 'js/diagnostics.js', blob_sha: blobSha(resultSource) }],
      checks: environment.test_plan.map((test) => ({ ...test, status: 'passed' }))
    }
  }, { now });
}

function snapshot(openPullRequests = [], sha = baseSha) {
  return {
    schema_version: 1,
    repository,
    observed_at: now,
    main: { branch: 'main', sha },
    open_pull_requests: openPullRequests
  };
}

const generated = proposal();
assert.equal(generated.outcome.proposal_generated, true);
const proposalId = generated.proposal.proposal_id;
const shortId = proposalId.slice('phase29:'.length, 'phase29:'.length + 12);

const originalFetch = globalThis.fetch;
let networkCalls = 0;
globalThis.fetch = async () => { networkCalls += 1; throw new Error('network forbidden'); };
const preparation = preparePatchPublication(generated, snapshot(), { now: '2026-09-02T08:11:00.000Z' });
globalThis.fetch = originalFetch;
assert.equal(networkCalls, 0);
assert.equal(preparation.status, 'awaiting_approval');
assert.equal(preparation.reason_code, 'fresh_confirmation_required');
assert.equal(preparation.proposal_id, proposalId);
assert.equal(preparation.plan.base_sha, baseSha);
assert.equal(preparation.plan.branch_name, `codex/agent-fix-${shortId}`);
assert.equal(preparation.plan.source_proposal_id, proposalId);
assert.match(preparation.plan.pull_request_body, /Phase 29で検証済み/);
assert.equal(preparation.plan.pull_request_body.includes('retryLimit'), false);
assert.equal(preparation.plan.fingerprint.length, 64);
assert.deepEqual(preparation.approval_request.required_permissions, ['contents:write', 'pull_requests:write']);
assert.equal(preparation.approval_request.one_time, true);
assert.equal(Date.parse(preparation.approval_request.expires_at) - Date.parse(preparation.prepared_at),
  PATCH_PUBLICATION_APPROVAL_LIMITS.approval_ttl_ms);
assert.equal(PATCH_PUBLICATION_APPROVAL_LIMITS.writer_connected, true);
assert.equal(Object.isFrozen(preparation), true);
assert.equal(Object.isFrozen(preparation.plan), true);
assert.equal(Object.isFrozen(preparation.approval_request.required_permissions), true);
assert.deepEqual(preparation.side_effects, {
  network_requests: false,
  file_writes: false,
  repository_writes: false,
  git_writes: false,
  branch_creation: false,
  commit_creation: false,
  pull_request_creation: false,
  issue_posts: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});

const repeated = preparePatchPublication(generated, snapshot(), { now: '2026-09-02T08:11:00.000Z' });
assert.equal(repeated.plan.fingerprint, preparation.plan.fingerprint);
assert.equal(repeated.approval_request.approval_id, preparation.approval_request.approval_id);

const duplicate = preparePatchPublication(generated, snapshot([{
  number: 123,
  body: `existing\n<!-- phase29-proposal:${proposalId} -->`
}]), { now: '2026-09-02T08:11:00.000Z' });
assert.equal(duplicate.status, 'duplicate_detected');
assert.deepEqual(duplicate.duplicate_pull_requests, [123]);
assert.equal(duplicate.approval_request, null);

const staleMain = preparePatchPublication(generated, snapshot([], 'd'.repeat(40)), {
  now: '2026-09-02T08:11:00.000Z'
});
assert.equal(staleMain.status, 'blocked');
assert.equal(staleMain.reason_code, 'repository_snapshot_invalid_or_base_stale');

const changedProposal = structuredClone(generated);
changedProposal.proposal.files[0].edits[0].after = 'retryLimit = 3';
const changedPreparation = preparePatchPublication(changedProposal, snapshot(), {
  now: '2026-09-02T08:11:00.000Z'
});
assert.equal(changedPreparation.reason_code, 'invalid_or_expired_proposal');

const expiredProposal = preparePatchPublication(generated, snapshot(), { now: '2026-09-02T09:10:00.001Z' });
assert.equal(expiredProposal.reason_code, 'invalid_or_expired_proposal');

const wrongText = confirmPatchPublication(preparation, {
  proposal_id: proposalId,
  plan_fingerprint: preparation.plan.fingerprint,
  confirmation_text: '作成する'
}, { now: '2026-09-02T08:12:00.000Z' });
assert.equal(wrongText.reason_code, 'confirmation_text_mismatch');

const changedPlan = confirmPatchPublication(preparation, {
  proposal_id: proposalId,
  plan_fingerprint: 'f'.repeat(64),
  confirmation_text: preparation.approval_request.confirmation_text
}, { now: '2026-09-02T08:12:00.000Z' });
assert.equal(changedPlan.reason_code, 'reviewed_plan_changed');

const expiredApproval = confirmPatchPublication(preparation, {
  proposal_id: proposalId,
  plan_fingerprint: preparation.plan.fingerprint,
  confirmation_text: preparation.approval_request.confirmation_text
}, { now: '2026-09-02T08:16:00.001Z' });
assert.equal(expiredApproval.status, 'expired');
assert.equal(expiredApproval.authorization, null);

const authorized = confirmPatchPublication(preparation, {
  proposal_id: proposalId,
  plan_fingerprint: preparation.plan.fingerprint,
  confirmation_text: preparation.approval_request.confirmation_text
}, { now: '2026-09-02T08:12:00.000Z' });
assert.equal(authorized.status, 'authorized');
assert.equal(authorized.authorization.action, 'create_agent_remediation_branch_commit_and_pull_request');
assert.equal(authorized.authorization.proposal_id, proposalId);
assert.equal(authorized.authorization.plan_fingerprint, preparation.plan.fingerprint);
assert.equal(authorized.authorization.one_time, true);
assert.equal(authorized.authorization.merge_authorized, false);
assert.equal(Object.isFrozen(authorized.authorization), true);

const cancelled = cancelPatchPublication(preparation, { now: '2026-09-02T08:12:00.000Z' });
assert.equal(cancelled.status, 'cancelled');
assert.equal(cancelled.authorization, null);

const oversized = preparePatchPublication({ padding: 'x'.repeat(769 * 1024) }, snapshot(), { now });
assert.equal(oversized.reason_code, 'input_too_large');
assert.equal(JSON.stringify(oversized).includes('xxxx'), false);

const sourceText = await readFile(new URL('../src/patch-publication-approval.mjs', import.meta.url), 'utf8');
for (const forbidden of ['fetch(', 'api.github.com', 'Authorization', 'process.env', 'child_process', 'writeFile(', 'createPullRequest']) {
  assert.equal(sourceText.includes(forbidden), false, `forbidden side effect present: ${forbidden}`);
}
const contract = JSON.parse(await readFile(new URL('../patch-publication-approval-contract.json', import.meta.url), 'utf8'));
assert.equal(contract.effects_in_this_checkpoint.branch_creation, false);
assert.equal(contract.effects_in_this_checkpoint.pull_request_creation, false);
assert.equal(contract.required_for_future_writer.writer_connected, true);
assert.equal(contract.required_for_future_writer.fresh_confirmation_per_materialization, true);

console.log('Development inspection agent patch publication approval core validation passed.');
