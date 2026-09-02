const CONTRACT_VERSION = 1;
const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const SAVE_KEY = 'mb_v95c';

const AUTOMATIC_CLASSES = new Set([
  'internal_tool_or_test',
  'documentation_or_progress',
  'small_bugfix_within_existing_spec',
  'ui_improvement_without_rule_change',
  'additive_content_with_new_ids',
  'player_visible_copy_without_lore_change'
]);

const APPROVAL_FLAGS = new Set([
  'save_structure_or_migration_impact',
  'save_key_change',
  'existing_id_or_encyclopedia_meaning_change',
  'possible_player_data_loss',
  'major_game_rule_change',
  'major_story_setting_change',
  'material_user_preference_choice',
  'manual_android_or_chromebook_verification_required',
  'secret_token_or_permission_required',
  'paid_action_required',
  'github_issue_or_external_message_post',
  'destructive_or_bulk_delete',
  'publication_setting_change',
  'ci_failed_or_unobserved',
  'merge_conflict',
  'material_specification_ambiguity'
]);

const REQUIRED_EVIDENCE = Object.freeze([
  'head_started_from_current_main',
  'one_bounded_work_item_per_pull_request',
  'declared_tests_passed',
  'required_ci_observed_success',
  'no_merge_conflict',
  'diff_contains_no_unrelated_change',
  'notice_decision_recorded'
]);

function uniqueStrings(values) {
  return [...new Set(Array.isArray(values) ? values.filter(value => typeof value === 'string') : [])].sort();
}

function baseResult(input, decision, reasonCode, flags, missingEvidence = []) {
  return Object.freeze({
    schema_version: CONTRACT_VERSION,
    repository: REPOSITORY,
    work_item_id: typeof input?.work_item_id === 'string' ? input.work_item_id : null,
    decision,
    reason_code: reasonCode,
    risk_class: decision === 'automatic' ? 'low' : 'approval_required',
    approval_required: decision !== 'automatic',
    approval_flags: Object.freeze(flags),
    missing_evidence: Object.freeze(missingEvidence),
    permitted_next_actions: Object.freeze(decision === 'automatic'
      ? ['implement', 'test', 'commit', 'push', 'open_or_update_pr']
      : ['record_blocker', 'request_minimum_user_decision'])
  });
}

export function assessProductionWork(input) {
  if (input?.schema_version !== CONTRACT_VERSION || input?.repository !== REPOSITORY
    || typeof input?.work_item_id !== 'string' || !input.work_item_id
    || input?.save_key !== SAVE_KEY) {
    return baseResult(input, 'require_approval', 'invalid_or_unbound_request', ['material_specification_ambiguity']);
  }

  const flags = uniqueStrings(input.risk_flags);
  if (flags.some(flag => !APPROVAL_FLAGS.has(flag))) {
    return baseResult(input, 'require_approval', 'unknown_risk_flag', ['material_specification_ambiguity']);
  }
  if (flags.length) return baseResult(input, 'require_approval', 'approval_flag_present', flags);
  if (!AUTOMATIC_CLASSES.has(input.change_class)) {
    return baseResult(input, 'require_approval', 'change_class_not_allowlisted', ['material_specification_ambiguity']);
  }
  if (input.base?.branch !== 'main' || !/^[0-9a-f]{40}$/.test(input.base?.sha ?? '')) {
    return baseResult(input, 'require_approval', 'base_not_fixed_to_main', ['material_specification_ambiguity']);
  }
  return baseResult(input, 'automatic', 'verified_low_risk_scope', []);
}

export function assessMergeReadiness(input) {
  const assessment = assessProductionWork(input);
  if (assessment.approval_required) return Object.freeze({ ...assessment, merge_allowed: false });

  const evidence = input?.evidence && typeof input.evidence === 'object' ? input.evidence : {};
  const missing = REQUIRED_EVIDENCE.filter(key => evidence[key] !== true);
  if (input.requires_full_check === true && evidence.full_check_passed !== true) missing.push('full_check_passed');
  if (missing.length) {
    return Object.freeze({
      ...baseResult(input, 'require_approval', 'merge_evidence_incomplete', ['ci_failed_or_unobserved'], missing.sort()),
      merge_allowed: false,
      permitted_next_actions: Object.freeze(['repair_or_collect_evidence', 'record_blocker'])
    });
  }
  return Object.freeze({
    ...assessment,
    merge_allowed: true,
    reason_code: 'verified_low_risk_merge_allowed',
    permitted_next_actions: Object.freeze(['merge_pr', 'observe_pages_publication', 'verify_published_game'])
  });
}

export const RISK_APPROVAL_LIMITS = Object.freeze({
  repository: REPOSITORY,
  save_key: SAVE_KEY,
  automatic_change_classes: Object.freeze([...AUTOMATIC_CLASSES]),
  approval_required_flags: Object.freeze([...APPROVAL_FLAGS]),
  required_merge_evidence: REQUIRED_EVIDENCE
});
