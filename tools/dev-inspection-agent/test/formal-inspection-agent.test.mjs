import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { runAutomaticInspection } from '../src/automatic-inspection-report.mjs';
import { runAutomaticIssueDraft } from '../src/automatic-issue-draft.mjs';
import { prepareIsolatedRemediation } from '../src/isolated-remediation-environment.mjs';
import { authorizeLimitedAutonomyTrial } from '../src/limited-autonomy-policy.mjs';
import { FORMAL_INSPECTION_AGENT_LIMITS, runFormalInspectionCycle } from '../src/formal-inspection-agent.mjs';

const repository = 'kankidoi2-byte/monster-rpg-ver8';
const now = '2026-09-02T13:10:00.000Z';
const mainSha = 'a'.repeat(40);
const sourceText = 'export const referenceState = "missing";\n';
const resultText = 'export const referenceState = "resolved";\n';

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return createHash('sha1').update(Buffer.from(`blob ${body.byteLength}\0`)).update(body).digest('hex');
}

function automaticInput(conclusion = 'success') {
  return {
    schema_version: 1,
    mode: 'automatic_read_only',
    trigger_event: {
      schema_version: 1, repository, source: 'ci_completed', observed_at: now,
      ci_completed: { run_id: 441, run_attempt: 1, status: 'completed', conclusion, head_sha: mainSha }
    },
    repository_snapshot: {
      schema_version: 1, observed_at: now,
      repository: { full_name: repository, default_branch: 'main' },
      sections: {
        commits: { status: 'available', items: [{ sha: mainSha }] },
        branches: { status: 'available', items: [] },
        pull_requests: { status: 'available', items: [] },
        issues: { status: 'available', items: [] }
      }
    },
    actions_snapshot: {
      schema_version: 1, observed_at: now,
      repository: { owner: 'kankidoi2-byte', name: 'monster-rpg-ver8' },
      runs: { status: 'available', items: [{ head_sha: mainSha, status: 'completed', conclusion }] },
      latest_run_jobs: { status: 'available', items: [] }
    },
    pages_snapshot: {
      schema_version: 1, observed_at: now,
      repository: { owner: 'kankidoi2-byte', name: 'monster-rpg-ver8' },
      site: { status: 'available', value: { status: 'built' } },
      latest_build: { status: 'available', value: { status: 'built', published_sha: mainSha } }
    },
    source_links: [`https://github.com/${repository}/actions/runs/441`]
  };
}

function finding(path = 'scripts/reference-check.mjs') {
  return {
    kind: 'broken_reference', code: 'unresolved_module_reference',
    check: {
      id: 'inspection_agent', command: 'npm --prefix tools/dev-inspection-agent run check',
      status: 'failed', head_sha: mainSha
    },
    target_paths: [path]
  };
}

function remediationFor(inspectionInput, selectedFinding = finding()) {
  const inspection = runAutomaticInspection(inspectionInput, [], { now });
  const issue = runAutomaticIssueDraft(inspectionInput, [], [], { now });
  const trial = authorizeLimitedAutonomyTrial({
    schema_version: 1, mode: 'limited_autonomy_trial_request', repository, requested_at: now,
    base: { branch: 'main', sha: mainSha }, source_report: inspection.report, finding: selectedFinding
  }, [], { now }).trial;
  if (!trial) return { finding: selectedFinding };

  const path = selectedFinding.target_paths[0];
  const sourceFiles = [{ path, blob_sha: gitBlobSha(sourceText), bytes: Buffer.byteLength(sourceText) }];
  const environment = prepareIsolatedRemediation({
    schema_version: 1, mode: 'isolated_remediation_request', repository, requested_at: now,
    base: { branch: 'main', sha: mainSha },
    source_draft: {
      schema_version: 1, draft_id: issue.draft.draft_id, report_id: issue.draft.report_id,
      status: 'failed', publication: issue.draft.publication
    },
    files: sourceFiles
  }, { now }).environment;
  return {
    finding: selectedFinding,
    source_files: sourceFiles,
    trial_validation: {
      trial_id: trial.trial_id, base_sha: mainSha, attempt: 1, raw_logs_retained: false,
      checks: [
        { id: 'inspection_agent', command: 'npm --prefix tools/dev-inspection-agent run check', status: 'passed' },
        { id: 'full_check', command: 'npm run check', status: 'passed' }
      ]
    },
    proposed_files: [{
      path, base_blob_sha: gitBlobSha(sourceText), source_text: sourceText,
      edits: [{ before: 'referenceState = "missing"', after: 'referenceState = "resolved"' }]
    }],
    proposal_validation: {
      environment_id: environment.environment_id, base_sha: mainSha,
      result_files: [{ path, blob_sha: gitBlobSha(resultText) }],
      checks: environment.test_plan.map((check) => ({ ...check, status: 'passed' }))
    },
    repository_snapshot: {
      schema_version: 1, repository, main: { branch: 'main', sha: mainSha }, open_pull_requests: []
    }
  };
}

function cycle(conclusion = 'success', remediation = undefined) {
  return {
    schema_version: 1, mode: 'formal_bounded_operation_cycle', repository, observed_at: now,
    inspection_input: automaticInput(conclusion),
    ...(remediation === undefined ? {} : { remediation }),
    ignored_secret: 'must-not-appear'
  };
}

const healthyInput = cycle();
const healthyBefore = structuredClone(healthyInput);
const healthy = runFormalInspectionCycle(healthyInput, {}, { now });
assert.equal(healthy.phase, 32);
assert.equal(healthy.mode, 'formal_bounded_operation_result');
assert.equal(healthy.status, 'healthy');
assert.equal(healthy.reason_code, 'no_action_required');
assert.equal(healthy.report.status, 'healthy');
assert.equal(healthy.state.trigger_ledger.length, 1);
assert.equal(healthy.state.draft_ledger.length, 0);
assert.equal(healthy.side_effects.repository_writes, false);
assert.equal(healthy.side_effects.external_messages, false);
assert.equal(JSON.stringify(healthy).includes('must-not-appear'), false);
assert.deepEqual(healthyInput, healthyBefore);
assert.equal(Object.isFrozen(healthy), true);

const duplicate = runFormalInspectionCycle(healthyInput, healthy.state, { now });
assert.equal(duplicate.status, 'no_action');
assert.equal(duplicate.reason_code, 'duplicate_trigger');

const draftOnly = runFormalInspectionCycle(cycle('failure'), {}, { now });
assert.equal(draftOnly.status, 'incident_drafted');
assert.equal(draftOnly.reason_code, 'remediation_evidence_not_supplied');
assert.match(draftOnly.issue_draft.draft_id, /^phase27:[0-9a-f]{64}$/);
assert.equal(draftOnly.issue_draft.publication.requires_fresh_confirmation, true);

const fullInput = cycle('failure', remediationFor(automaticInput('failure')));
const ready = runFormalInspectionCycle(fullInput, {}, { now });
assert.equal(ready.status, 'awaiting_approval');
assert.equal(ready.reason_code, 'verified_patch_ready_for_fresh_confirmation');
assert.match(ready.trial.trial_id, /^phase31:[0-9a-f]{64}$/);
assert.match(ready.proposal.proposal_id, /^phase29:[0-9a-f]{64}$/);
assert.equal(ready.proposal.validation, 'passed');
assert.equal(ready.publication.state, 'awaiting_approval');
assert.equal(ready.publication.approval_request.one_time, true);
assert.equal(ready.publication.approval_request.expires_at, '2026-09-02T13:15:00.000Z');
assert.equal(ready.confirmation_boundaries.remediation_branch_commit_pull_request, 'fresh_confirmation_required');
assert.equal(ready.confirmation_boundaries.merge, 'not_authorized_by_cycle');
assert.equal(ready.side_effects.branch_creation, false);
assert.equal(ready.side_effects.pull_request_creation, false);
assert.equal(ready.state.trial_ledger.length, 1);

const failedValidationInput = structuredClone(fullInput);
failedValidationInput.remediation.trial_validation.checks[0].status = 'failed';
assert.equal(runFormalInspectionCycle(failedValidationInput, {}, { now }).reason_code,
  'trial_validation_unknown_or_failed');

const staleMainInput = structuredClone(fullInput);
staleMainInput.remediation.repository_snapshot.main.sha = 'f'.repeat(40);
assert.equal(runFormalInspectionCycle(staleMainInput, {}, { now }).reason_code,
  'repository_snapshot_invalid_or_base_stale');

const unsafe = cycle('failure', remediationFor(automaticInput('failure'), finding('js/save.js')));
assert.equal(runFormalInspectionCycle(unsafe, {}, { now }).reason_code, 'finding_not_allowlisted');

const oversized = cycle();
oversized.padding = 'oversized-secret-'.repeat(70000);
const oversizedResult = runFormalInspectionCycle(oversized, {}, { now });
assert.equal(oversizedResult.reason_code, 'input_too_large');
assert.equal(JSON.stringify(oversizedResult).includes('oversized-secret'), false);

assert.deepEqual(FORMAL_INSPECTION_AGENT_LIMITS, {
  repository, max_input_bytes: 1048576, max_target_paths: 3, max_attempts_per_trigger: 1,
  automatic_issue_posts: false, automatic_branch_commit_pull_request: false,
  automatic_merge: false, automatic_manual_publish: false
});

const source = await readFile(new URL('../src/formal-inspection-agent.mjs', import.meta.url), 'utf8');
for (const forbidden of ['fetch(', "from 'node:http'", "from 'node:https'", 'writeFile', 'appendFile', 'child_process', 'process.env']) {
  assert.equal(source.includes(forbidden), false, `formal cycle must not contain ${forbidden}`);
}
const contract = JSON.parse(await readFile(new URL('../formal-operation-contract.json', import.meta.url), 'utf8'));
assert.equal(contract.status, 'formal_operation_core_enabled');
assert.equal(contract.continuous_operation.maximum_attempts_per_trigger, 1);
assert.equal(contract.automatic_external_writes.issue_post, false);
assert.equal(contract.automatic_external_writes.pull_request, false);
assert.equal(contract.automatic_external_writes.merge, false);
assert.equal(contract.compatibility.save_key, 'mb_v95c');

console.log('Development inspection agent formal bounded operation validation passed.');
