import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const contract = JSON.parse(read('docs/dev-tools-agent-execution-contract.json'));
const guide = read('docs/dev-tools-agent-execution-contract.md');

const errors = [];
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};
const unique = values => new Set(values).size === values.length;

expect(contract.schema_version === 2, 'contract schema version must describe the Phase 33 transition');
expect(contract.contract_id === 'monster-rpg-autonomous-inspection-agent', 'stable contract id is missing');
expect(contract.phase === 33 && contract.status === 'risk_based_production_transition', 'Phase 33 transition state is invalid');
expect(contract.default_decision === 'deny', 'contract must deny undeclared actions');
expect(contract.scope?.historical_contract_phase === 23, 'historical Phase 23 boundary is missing');
expect(contract.scope?.actual_agent_execution_enabled === true, 'Phase 33 must enable bounded agent execution');
expect(contract.scope?.external_write_enabled === true, 'Phase 33 must enable bounded external writes');
expect(contract.scope?.production_contract === 'tools/game-production-orchestrator/risk-approval-contract.json', 'Phase 33 production contract link is missing');

const automaticPermissions = contract.automatic_permissions || [];
expect(unique(automaticPermissions), 'automatic permissions must be unique');
['read_repository_metadata', 'read_ci_status_and_failure_metadata', 'read_pages_publication_status', 'run_declared_local_tests', 'produce_unpublished_analysis'].forEach(permission => {
  expect(automaticPermissions.includes(permission), `required bounded permission is missing: ${permission}`);
});
expect(automaticPermissions.every(permission => !permission.includes('post_') && !permission.includes('write_main')), 'automatic permissions must not include external posting or direct main writes');
['create_verified_low_risk_branch_commit_and_pull_request', 'merge_verified_low_risk_pull_request'].forEach(permission => {
  expect(automaticPermissions.includes(permission), `Phase 33 permission is missing: ${permission}`);
});

const gates = contract.approval_gates || [];
expect(unique(gates.map(gate => gate.action)), 'approval gates must be unique');
const issueGate = gates.find(gate => gate.action === 'post_github_issue');
expect(issueGate?.approval === 'fresh_per_action_exact_confirmation' && issueGate?.reusable === false, 'every Issue post must require a fresh non-reusable exact confirmation');
const remediationGate = gates.find(gate => gate.action === 'create_agent_generated_remediation_branch_or_pull_request');
expect(remediationGate?.earliest_phase === 33 && remediationGate?.approval === 'phase33_risk_contract'
  && remediationGate?.automatic_when === 'verified_low_risk_and_no_stop_condition', 'agent-generated branch or PR must follow the Phase 33 risk contract');

const prohibited = contract.prohibited_actions || [];
['write_directly_to_main', 'force_push_or_rewrite_history', 'change_save_key_mb_v95c', 'commit_or_log_secrets_tokens_cookies_or_api_keys', 'post_issue_or_message_without_fresh_confirmation', 'purchase_or_enable_paid_service', 'treat_unknown_or_unobserved_test_as_success'].forEach(action => {
  expect(prohibited.includes(action), `required prohibition is missing: ${action}`);
});

const limits = contract.limits || {};
expect(limits.max_phases_per_run === 1, 'only one Phase may run at a time');
expect(limits.max_parallel_phase_pull_requests === 1, 'a Phase must use one primary PR');
expect(limits.max_commits_read === 20 && limits.max_workflow_runs_read === 20, 'commit and workflow reads must remain bounded');
expect(limits.max_branches_read === 100 && limits.max_pull_requests_read === 100 && limits.max_issues_read === 100, 'repository list reads must remain bounded');
expect(limits.max_remediation_attempts_per_trigger === 1, 'remediation attempts must not loop');
expect(JSON.stringify(limits.network_hosts) === JSON.stringify(['api.github.com', 'github.com', 'kankidoi2-byte.github.io']), 'network host allowlist must remain exact');

const stopConditions = contract.stop_conditions || [];
expect(unique(stopConditions), 'stop conditions must be unique');
['ci_failed_or_not_observed', 'required_test_result_unknown', 'secret_or_personal_data_detected', 'save_compatibility_or_existing_id_risk', 'external_write_not_allowed_by_phase33_risk_contract', 'cost_or_permission_expansion_required'].forEach(condition => {
  expect(stopConditions.includes(condition), `required fail-closed stop is missing: ${condition}`);
});

expect(contract.cost_policy?.maximum_direct_cost_usd === 0, 'unapproved direct cost must remain zero');
expect(contract.cost_policy?.paid_services_allowed === false, 'paid services must be disabled');
expect(contract.cost_policy?.purchases_allowed === false, 'purchases must be disabled');
expect(contract.cost_policy?.unbounded_retry_allowed === false, 'unbounded retries must be disabled');

expect(contract.logging_policy?.checkpoint_before_long_operation === true, 'pre-operation checkpoints are required');
expect(contract.logging_policy?.checkpoint_after_meaningful_unit === true, 'post-unit checkpoints are required');
expect(contract.logging_policy?.log_secrets === false, 'secrets must never be logged');
expect(contract.logging_policy?.log_raw_api_responses === false, 'raw API responses must not be logged');
expect(contract.logging_policy?.log_full_diagnostic_payload === false, 'full diagnostics must not be logged');

expect(contract.compatibility_invariants?.save_key === 'mb_v95c', 'save key invariant changed');
expect(contract.compatibility_invariants?.preserve_existing_ids === true, 'existing IDs must be preserved');
expect(contract.compatibility_invariants?.preserve_existing_save_fields === true, 'existing save fields must be preserved');
expect(contract.failure_behavior?.fail_closed === true, 'failures must close capabilities');
expect(contract.failure_behavior?.partial_failure_is_success === false, 'partial failure must not be success');
expect(contract.failure_behavior?.unknown_is_success === false, 'unknown state must not be success');

const handoffPhases = contract.phase_handoffs?.map(item => item.phase) || [];
expect(JSON.stringify(handoffPhases) === JSON.stringify(Array.from({ length: 9 }, (_, index) => index + 24)), 'Phase 24-32 handoffs must be complete and ordered');
expect((contract.acceptance_criteria || []).includes('verified_low_risk_writes_follow_phase33_contract'), 'Phase 33 risk-contract criterion is missing');

['## 許可する操作', '## 明示承認が必要な操作', '## 禁止する操作', '## 上限', '## 停止条件', '## 費用規則', '## ログ規則', '## Phase 33移行の完了条件'].forEach(heading => {
  expect(guide.includes(heading), `human-readable contract heading is missing: ${heading}`);
});
expect(guide.includes('docs/dev-tools-agent-execution-contract.json'), 'guide must identify the machine-readable source of truth');
expect(guide.includes('js/notices-data.js') && guide.includes('更新しない'), 'notice decision must be documented');

if (errors.length) {
  console.error(`Agent execution contract validation failed (${errors.length} issue(s)):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Agent execution contract validation passed (${automaticPermissions.length} automatic permissions, ${gates.length} approval gates, ${stopConditions.length} stop conditions).`);
