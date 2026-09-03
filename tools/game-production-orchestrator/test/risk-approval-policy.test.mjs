import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assessMergeReadiness, assessProductionWork, RISK_APPROVAL_LIMITS } from '../src/risk-approval-policy.mjs';

const baseRequest = {
  schema_version: 1,
  repository: 'kankidoi2-byte/monster-rpg-ver8',
  save_key: 'mb_v95c',
  work_item_id: 'phase33-risk-contract',
  change_class: 'internal_tool_or_test',
  risk_flags: [],
  base: { branch: 'main', sha: 'a'.repeat(40) },
  requires_full_check: true
};

const automatic = assessProductionWork(baseRequest);
assert.equal(automatic.decision, 'automatic');
assert.equal(automatic.approval_required, false);
assert.equal(automatic.reason_code, 'verified_low_risk_scope');
assert.equal(Object.isFrozen(automatic), true);

for (const flag of RISK_APPROVAL_LIMITS.approval_required_flags) {
  const result = assessProductionWork({ ...baseRequest, risk_flags: [flag] });
  assert.equal(result.decision, 'require_approval', flag);
  assert.equal(result.approval_flags.includes(flag), true, flag);
}

for (const mutation of [
  { save_key: 'changed' },
  { change_class: 'major_balance_rewrite' },
  { base: { branch: 'feature', sha: 'a'.repeat(40) } },
  { base: { branch: 'main', sha: 'short' } },
  { risk_flags: ['invented_risk'] }
]) {
  assert.equal(assessProductionWork({ ...baseRequest, ...mutation }).approval_required, true);
}

const evidence = Object.fromEntries(RISK_APPROVAL_LIMITS.required_merge_evidence.map(key => [key, true]));
const ready = assessMergeReadiness({ ...baseRequest, evidence: { ...evidence, full_check_passed: true } });
assert.equal(ready.merge_allowed, true);
assert.equal(ready.reason_code, 'verified_low_risk_merge_allowed');

const noCi = assessMergeReadiness({ ...baseRequest, evidence: { ...evidence, required_ci_observed_success: false, full_check_passed: true } });
assert.equal(noCi.merge_allowed, false);
assert.equal(noCi.missing_evidence.includes('required_ci_observed_success'), true);

const noFullCheck = assessMergeReadiness({ ...baseRequest, evidence });
assert.equal(noFullCheck.merge_allowed, false);
assert.equal(noFullCheck.missing_evidence.includes('full_check_passed'), true);

const conflict = assessMergeReadiness({
  ...baseRequest,
  risk_flags: ['merge_conflict'],
  evidence: { ...evidence, full_check_passed: true }
});
assert.equal(conflict.merge_allowed, false);

const contract = JSON.parse(await readFile(new URL('../risk-approval-contract.json', import.meta.url), 'utf8'));
assert.equal(contract.default_decision, 'require_approval');
assert.equal(contract.save_key, 'mb_v95c');
assert.deepEqual(new Set(contract.automatic_change_classes), new Set(RISK_APPROVAL_LIMITS.automatic_change_classes));
assert.deepEqual(new Set(contract.approval_required_flags), new Set(RISK_APPROVAL_LIMITS.approval_required_flags));
assert.equal(contract.prohibited_actions.includes('write_directly_to_main'), true);
assert.equal(contract.prohibited_actions.includes('post_issue_or_message_without_approval'), true);

const agents = await readFile(new URL('../../../AGENTS.md', import.meta.url), 'utf8');
assert.equal(agents.includes('risk-approval-contract.json'), true);
assert.equal(agents.includes('Do not post an Issue without explicit approval'), true);

const progress = JSON.parse(await readFile(new URL('../../../docs/game-production-progress.json', import.meta.url), 'utf8'));
assert.equal(progress.schema_version, 2);
assert.equal(progress.product_version, 'v1');
assert.equal(progress.overall_status, 'completed');
assert.equal(progress.current_cycle, 2);
assert.equal(progress.current_phase, 5);
assert.equal(progress.next_cycle, 3);
assert.equal(progress.phase_numbering.mode, 'per_production_cycle');
assert.deepEqual(progress.phase_numbering.legacy_phase_history, {first: 0, last: 63, status: 'archived'});
assert.deepEqual(progress.phase_numbering.phase_range_per_cycle, {first: 1, last: 5});
assert.equal(progress.phase_numbering.reset_boundary.pull_request, 144);
assert.equal(progress.phase_numbering.reset_boundary.decision.includes('Cycle 1 Phase 1'), true);
assert.equal(progress.activation_mode, 'user_goal_only');
assert.equal(progress.production_lines_active, false);
assert.equal(progress.next_activation_required, true);
assert.equal(progress.latest_trial.id, 'kokoro-link-centered-animation-20260903');
assert.deepEqual(progress.phases.map(phase => phase.status), Array(progress.phases.length).fill('completed'));
assert.deepEqual(new Set(progress.v2_deferred.map(item => item.id)), new Set([
  'continuous_autonomous_backlog_selection',
  'large_feature_and_story_autonomy'
]));

const roadmap = await readFile(new URL('../../../docs/game-production-automation-roadmap.md', import.meta.url), 'utf8');
assert.equal(roadmap.includes('ゲーム制作自動化システムv1は完成済み'), true);
assert.equal(roadmap.includes('Cycle 3 / Phase 1'), true);
assert.equal(roadmap.includes('旧Phase 0〜63'), true);
assert.equal(roadmap.includes('次の仕事を自動選択せず停止'), true);
assert.equal(roadmap.includes('v2候補（v1には含めない）'), true);

console.log('Game production orchestrator risk-based approval policy validation passed.');
