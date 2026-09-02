import { runAutomaticIssueDraft } from './automatic-issue-draft.mjs';
import { runAutomaticInspection } from './automatic-inspection-report.mjs';
import { prepareIsolatedRemediation } from './isolated-remediation-environment.mjs';
import { authorizeLimitedAutonomyTrial } from './limited-autonomy-policy.mjs';
import { generateMinimalPatchProposal } from './minimal-patch-proposal.mjs';
import { preparePatchPublication } from './patch-publication-approval.mjs';

const SCHEMA_VERSION = 1;
const PHASE = 32;
const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const INPUT_MODE = 'formal_bounded_operation_cycle';
const OUTPUT_MODE = 'formal_bounded_operation_result';
const MAX_INPUT_BYTES = 1024 * 1024;
const MAX_TARGET_PATHS = 3;
const SHA_PATTERN = /^[0-9a-f]{40}$/;

const SIDE_EFFECTS = Object.freeze({
  network_requests: false,
  host_file_writes: false,
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

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function inputBytes(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function fixedTime(value) {
  const milliseconds = Date.parse(String(value ?? ''));
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function stateFrom(value = {}) {
  return {
    trigger_ledger: Array.isArray(value.trigger_ledger) ? value.trigger_ledger : [],
    draft_ledger: Array.isArray(value.draft_ledger) ? value.draft_ledger : [],
    trial_ledger: Array.isArray(value.trial_ledger) ? value.trial_ledger : []
  };
}

function publicState(inspection, trialLedger) {
  return {
    trigger_ledger: inspection?.trigger_ledger ?? [],
    draft_ledger: inspection?.draft_ledger ?? [],
    trial_ledger: trialLedger ?? []
  };
}

function reportSummary(inspection) {
  return inspection?.inspection?.report_id ? {
    report_id: inspection.inspection.report_id,
    status: inspection.inspection.status,
    reason_code: inspection.inspection.reason_code,
    issue_draft_id: inspection.draft?.draft_id ?? null,
    issue_publication: 'fresh_confirmation_required'
  } : null;
}

function result(status, reasonCode, inspection, trialLedger, value = {}) {
  return deepFreeze({
    schema_version: SCHEMA_VERSION,
    phase: PHASE,
    mode: OUTPUT_MODE,
    status,
    reason_code: reasonCode,
    report: reportSummary(inspection),
    state: publicState(inspection, trialLedger),
    ...value,
    confirmation_boundaries: {
      issue_post: 'fresh_confirmation_required',
      remediation_branch_commit_pull_request: 'fresh_confirmation_required',
      merge: 'not_authorized_by_cycle',
      manual_publish: 'not_authorized'
    },
    side_effects: SIDE_EFFECTS
  });
}

function exactTrialFiles(trial, files) {
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_TARGET_PATHS) return false;
  const actual = files.map((file) => file?.path).sort();
  const expected = [...trial.scope.target_paths].sort();
  return actual.length === expected.length
    && new Set(actual).size === actual.length
    && actual.every((path, index) => path === expected[index]);
}

function trialValidationPassed(trial, value) {
  if (value?.trial_id !== trial.trial_id || value?.base_sha !== trial.base.sha
    || value?.attempt !== 1 || value?.raw_logs_retained !== false
    || !Array.isArray(value?.checks)) return false;
  const expected = trial.validation.required_after_trial;
  if (value.checks.length !== expected.length) return false;
  const observed = new Map();
  for (const check of value.checks) {
    if (typeof check?.id !== 'string' || observed.has(check.id)
      || check?.status !== 'passed') return false;
    observed.set(check.id, check.command);
  }
  return expected.every((check) => observed.get(check.id) === check.command);
}

function sourceDraft(inspection) {
  return {
    schema_version: SCHEMA_VERSION,
    draft_id: inspection.draft.draft_id,
    report_id: inspection.draft.report_id,
    status: inspection.inspection.status,
    publication: inspection.draft.publication
  };
}

function publicationSummary(preparation) {
  return preparation?.status === 'awaiting_approval' ? {
    state: 'awaiting_approval',
    proposal_id: preparation.proposal_id,
    plan: preparation.plan,
    approval_request: preparation.approval_request
  } : null;
}

export function runFormalInspectionCycle(input, runtimeState = {}, options = {}) {
  const now = fixedTime(options.now ?? input?.observed_at);
  const state = stateFrom(runtimeState);
  const trialLedger = now
    ? authorizeLimitedAutonomyTrial(null, state.trial_ledger, { now }).ledger
    : [];
  if (inputBytes(input) > MAX_INPUT_BYTES) {
    return result('blocked', 'input_too_large', null, trialLedger);
  }
  if (input?.schema_version !== SCHEMA_VERSION || input?.mode !== INPUT_MODE
    || input?.repository !== REPOSITORY || !now) {
    return result('blocked', 'invalid_cycle', null, trialLedger);
  }

  const inspection = runAutomaticIssueDraft(
    input.inspection_input,
    state.trigger_ledger,
    state.draft_ledger,
    { now }
  );
  if (!inspection.inspection.report_created) {
    return result('no_action', inspection.outcome.reason_code, inspection, trialLedger);
  }

  const status = inspection.inspection.status;
  if (status === 'healthy') return result('healthy', 'no_action_required', inspection, trialLedger);
  if (status === 'in_progress' || status === 'publish_pending') {
    return result('monitoring', 'wait_for_current_operation', inspection, trialLedger);
  }
  if (status === 'awaiting_confirmation') {
    return result('awaiting_approval', 'existing_pull_request_requires_review', inspection, trialLedger);
  }
  if (!inspection.draft) {
    return result('blocked', 'actionable_incident_without_draft', inspection, trialLedger);
  }

  const remediation = input.remediation;
  if (!remediation) {
    return result('incident_drafted', 'remediation_evidence_not_supplied', inspection, trialLedger, {
      issue_draft: {
        draft_id: inspection.draft.draft_id,
        title: inspection.draft.title,
        body: inspection.draft.body,
        suggested_labels: inspection.draft.suggested_labels,
        publication: inspection.draft.publication
      }
    });
  }
  if (status !== 'failed') {
    return result('incident_drafted', 'incident_not_eligible_for_autonomous_trial', inspection, trialLedger);
  }

  const sourceInspection = runAutomaticInspection(input.inspection_input, [], { now });
  const report = sourceInspection.report;
  if (!report || report.report_id !== inspection.inspection.report_id) {
    return result('blocked', 'source_report_reconstruction_failed', inspection, trialLedger);
  }
  const baseSha = report.evidence.main_sha;
  if (!SHA_PATTERN.test(baseSha ?? '')) {
    return result('blocked', 'current_main_not_observed', inspection, trialLedger);
  }

  const authorized = authorizeLimitedAutonomyTrial({
    schema_version: SCHEMA_VERSION,
    mode: 'limited_autonomy_trial_request',
    repository: REPOSITORY,
    requested_at: now,
    base: { branch: 'main', sha: baseSha },
    source_report: report,
    finding: remediation.finding
  }, trialLedger, { now });
  if (!authorized.outcome.trial_authorized) {
    return result('blocked', authorized.outcome.reason_code, inspection, authorized.ledger);
  }
  const trial = authorized.trial;
  if (!exactTrialFiles(trial, remediation.source_files)) {
    return result('blocked', 'source_files_do_not_match_authorized_scope', inspection, authorized.ledger);
  }

  const isolation = prepareIsolatedRemediation({
    schema_version: SCHEMA_VERSION,
    mode: 'isolated_remediation_request',
    repository: REPOSITORY,
    requested_at: now,
    base: { branch: 'main', sha: trial.base.sha },
    source_draft: sourceDraft(inspection),
    files: remediation.source_files
  }, { now });
  if (!isolation.outcome.environment_prepared) {
    return result('blocked', isolation.outcome.reason_code, inspection, authorized.ledger);
  }
  if (!trialValidationPassed(trial, remediation.trial_validation)) {
    return result('blocked', 'trial_validation_unknown_or_failed', inspection, authorized.ledger);
  }

  const proposal = generateMinimalPatchProposal({
    schema_version: SCHEMA_VERSION,
    mode: 'minimal_patch_proposal_request',
    repository: REPOSITORY,
    requested_at: now,
    environment: isolation.environment,
    files: remediation.proposed_files,
    validation: remediation.proposal_validation
  }, { now });
  if (!proposal.outcome.proposal_generated) {
    return result('blocked', proposal.outcome.reason_code, inspection, authorized.ledger);
  }

  const preparation = preparePatchPublication(proposal, remediation.repository_snapshot, { now });
  if (preparation.status !== 'awaiting_approval') {
    return result('blocked', preparation.reason_code, inspection, authorized.ledger);
  }
  return result('awaiting_approval', 'verified_patch_ready_for_fresh_confirmation', inspection, authorized.ledger, {
    trial: {
      trial_id: trial.trial_id,
      base_sha: trial.base.sha,
      target_paths: trial.scope.target_paths,
      attempt: 1,
      expires_at: trial.lifecycle.expires_at
    },
    proposal: {
      proposal_id: proposal.proposal.proposal_id,
      base_sha: proposal.proposal.base.sha,
      file_count: proposal.proposal.scope.file_count,
      edit_count: proposal.proposal.scope.edit_count,
      changed_lines: proposal.proposal.scope.changed_lines,
      validation: 'passed'
    },
    publication: publicationSummary(preparation)
  });
}

export const FORMAL_INSPECTION_AGENT_LIMITS = Object.freeze({
  repository: REPOSITORY,
  max_input_bytes: MAX_INPUT_BYTES,
  max_target_paths: MAX_TARGET_PATHS,
  max_attempts_per_trigger: 1,
  automatic_issue_posts: false,
  automatic_branch_commit_pull_request: false,
  automatic_merge: false,
  automatic_manual_publish: false
});
