import { createHash } from 'node:crypto';
import { analyzeManualSnapshot, MANUAL_ANALYSIS_LIMITS } from './manual-readonly-analysis.mjs';
import { coordinateTrigger } from './trigger-coordinator.mjs';

const SCHEMA_VERSION = 1;
const INPUT_MODE = 'automatic_read_only';
const OUTPUT_MODE = 'automatic_unpublished_report';
const REPORT_ID_PATTERN = /^phase26:[0-9a-f]{64}$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const MAX_OPEN_PULL_REQUESTS = 100;
const STATUS_CODES = new Set([
  'healthy', 'in_progress', 'awaiting_confirmation', 'failed',
  'publish_pending', 'stale', 'unavailable'
]);
const CI_STATUSES = new Set(['queued', 'in_progress', 'requested', 'waiting', 'pending', 'completed', 'unknown', 'not_observed']);
const CI_CONCLUSIONS = new Set(['success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral', 'skipped', 'stale', 'startup_failure']);
const SITE_STATUSES = new Set(['built', 'building', 'errored', 'unknown']);
const BUILD_STATUSES = new Set(['built', 'building', 'queued', 'errored', 'unknown']);

const REPORT_DEFINITIONS = Object.freeze({
  healthy: Object.freeze({
    summary_ja: '自動点検で異常は見つかりませんでした。',
    cause_code: null,
    impact_code: 'none_detected',
    blocks_progress: false,
    action_code: 'no_action',
    priority: 7,
    requires_human_approval: false,
    confidence: 'high',
    confidence_basis: 'complete_consistent_sources'
  }),
  in_progress: Object.freeze({
    summary_ja: '自動チェックが完了していません。',
    cause_code: 'ci_execution_pending',
    impact_code: 'verification_pending',
    blocks_progress: true,
    action_code: 'wait_for_ci_completion',
    priority: 4,
    requires_human_approval: false,
    confidence: 'high',
    confidence_basis: 'bounded_status_observation'
  }),
  awaiting_confirmation: Object.freeze({
    summary_ja: '確認が必要なPull Requestがあります。',
    cause_code: 'pull_request_confirmation_pending',
    impact_code: 'human_confirmation_pending',
    blocks_progress: true,
    action_code: 'review_open_pull_request',
    priority: 6,
    requires_human_approval: true,
    confidence: 'high',
    confidence_basis: 'bounded_status_observation'
  }),
  failed: Object.freeze({
    summary_ja: '自動チェックまたは公開処理の失敗を検出しました。',
    cause_code: 'blocking_failure_observed',
    impact_code: 'delivery_blocked',
    blocks_progress: true,
    action_code: 'inspect_failed_check',
    priority: 1,
    requires_human_approval: false,
    confidence: 'medium',
    confidence_basis: 'aggregate_failure_observation'
  }),
  publish_pending: Object.freeze({
    summary_ja: 'GitHub Pagesへの反映が完了していません。',
    cause_code: 'pages_publication_pending',
    impact_code: 'production_not_current',
    blocks_progress: true,
    action_code: 'wait_for_pages_publication',
    priority: 5,
    requires_human_approval: false,
    confidence: 'high',
    confidence_basis: 'bounded_status_observation'
  }),
  stale: Object.freeze({
    summary_ja: '点検元の情報が古いため再取得が必要です。',
    cause_code: 'source_observation_stale',
    impact_code: 'assessment_not_current',
    blocks_progress: true,
    action_code: 'refresh_status_sources',
    priority: 3,
    requires_human_approval: false,
    confidence: 'high',
    confidence_basis: 'source_timestamp_observation'
  }),
  unavailable: Object.freeze({
    summary_ja: '必要な点検情報を取得できませんでした。',
    cause_code: 'required_source_unavailable',
    impact_code: 'assessment_incomplete',
    blocks_progress: true,
    action_code: 'restore_source_access',
    priority: 2,
    requires_human_approval: false,
    confidence: 'high',
    confidence_basis: 'source_availability_observation'
  })
});

const SIDE_EFFECTS = Object.freeze({
  network_requests: false,
  file_writes: false,
  github_writes: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});

function fixedTime(value) {
  const milliseconds = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}

function inputBytes(input) {
  try {
    return Buffer.byteLength(JSON.stringify(input), 'utf8');
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function safeSha(value) {
  return typeof value === 'string' && SHA_PATTERN.test(value) ? value : null;
}

function safeInteger(value, maximum = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : null;
}

function safeFixed(value, allowed, fallback = null) {
  return allowed.has(value) ? value : fallback;
}

function safeSourceLinks(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  const links = [];
  for (const value of values) {
    if (typeof value !== 'string' || value.length > 2048) continue;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || url.username || url.password
        || (host !== 'github.com' && !(host.endsWith('.github.io') && host !== 'github.io'))) continue;
      url.search = '';
      url.hash = '';
      const normalized = url.toString();
      if (!links.includes(normalized)) links.push(normalized);
    } catch {
      continue;
    }
    if (links.length === 5) break;
  }
  return Object.freeze(links);
}

function evidenceFrom(analysis) {
  const signals = analysis?.signals;
  const ci = signals?.ci;
  const pages = signals?.pages;
  return Object.freeze({
    main_sha: safeSha(signals?.main_sha),
    open_pull_request_count: safeInteger(signals?.open_pull_request_count, MAX_OPEN_PULL_REQUESTS),
    ci: Object.freeze({
      matched_main: typeof ci?.matched_main === 'boolean' ? ci.matched_main : null,
      status: safeFixed(ci?.status, CI_STATUSES),
      conclusion: safeFixed(ci?.conclusion, CI_CONCLUSIONS),
      head_sha: safeSha(ci?.head_sha)
    }),
    pages: Object.freeze({
      site_status: safeFixed(pages?.site_status, SITE_STATUSES),
      build_status: safeFixed(pages?.build_status, BUILD_STATUSES),
      published_sha: safeSha(pages?.published_sha)
    }),
    source_links: safeSourceLinks(analysis?.decision?.source_links)
  });
}

function failureCauses(evidence) {
  const causes = [];
  if (evidence.ci.conclusion && evidence.ci.conclusion !== 'success') {
    causes.push(Object.freeze({ code: 'ci_failure_observed', likelihood: 'high' }));
  }
  if (evidence.pages.site_status === 'errored' || evidence.pages.build_status === 'errored') {
    causes.push(Object.freeze({ code: 'pages_failure_observed', likelihood: 'high' }));
  }
  if (causes.length === 0) causes.push(Object.freeze({ code: 'blocking_failure_observed', likelihood: 'medium' }));
  return Object.freeze(causes.slice(0, 3));
}

function createReport(triggerResult, analysis, generatedAt) {
  const statusCode = safeFixed(analysis?.status?.code, STATUS_CODES, 'unavailable');
  const definition = REPORT_DEFINITIONS[statusCode];
  const evidence = evidenceFrom(analysis);
  const causes = statusCode === 'failed'
    ? failureCauses(evidence)
    : Object.freeze(definition.cause_code
      ? [Object.freeze({ code: definition.cause_code, likelihood: definition.confidence })]
      : []);
  const canonical = [
    triggerResult.decision.trigger_id,
    statusCode,
    evidence.main_sha ?? '',
    definition.action_code
  ].join('\n');
  const reportId = `phase26:${createHash('sha256').update(canonical).digest('hex')}`;

  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    report_id: reportId,
    generated_at: generatedAt,
    status: Object.freeze({ code: statusCode }),
    summary_ja: definition.summary_ja,
    cause_candidates: causes,
    impact: Object.freeze({
      code: definition.impact_code,
      scope: 'development_pipeline',
      blocks_progress: definition.blocks_progress
    }),
    recommendation: Object.freeze({
      priority: definition.priority,
      action_code: definition.action_code,
      requires_human_approval: definition.requires_human_approval
    }),
    confidence: Object.freeze({
      level: definition.confidence,
      basis_code: definition.confidence_basis
    }),
    evidence,
    publication: Object.freeze({ state: 'unpublished', destination: null })
  });
}

function freezeOutcome(reportCreated, reasonCode) {
  return Object.freeze({ report_created: reportCreated, reason_code: reasonCode });
}

function freezeTriggerSummary(triggerResult) {
  return Object.freeze({
    source: triggerResult.source,
    decision: triggerResult.decision,
    subject: triggerResult.trigger?.subject ?? null
  });
}

function result(triggerResult, report, reasonCode) {
  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    phase: 26,
    mode: OUTPUT_MODE,
    outcome: freezeOutcome(report !== null, reasonCode),
    trigger: freezeTriggerSummary(triggerResult),
    ledger: triggerResult.ledger,
    report,
    side_effects: SIDE_EFFECTS
  });
}

export function runAutomaticInspection(input, ledger = [], options = {}) {
  const now = fixedTime(options.now ?? input?.trigger_event?.observed_at);
  const bytes = inputBytes(input);
  const envelopeValid = input?.schema_version === SCHEMA_VERSION && input?.mode === INPUT_MODE;
  if (!now || !envelopeValid || bytes > MANUAL_ANALYSIS_LIMITS.max_input_bytes) {
    const fallbackNow = now ?? '1970-01-01T00:00:00.000Z';
    const rejected = coordinateTrigger(null, ledger, { now: fallbackNow });
    const reason = bytes > MANUAL_ANALYSIS_LIMITS.max_input_bytes ? 'input_too_large' : 'invalid_input';
    return result(rejected, null, reason);
  }

  const triggerResult = coordinateTrigger(input.trigger_event, ledger, { now });
  if (!triggerResult.decision.enqueue) {
    return result(triggerResult, null, triggerResult.decision.reason_code);
  }

  const analysis = analyzeManualSnapshot({
    schema_version: 1,
    mode: 'manual_read_only',
    repository_snapshot: input.repository_snapshot,
    actions_snapshot: input.actions_snapshot,
    pages_snapshot: input.pages_snapshot,
    source_links: input.source_links
  }, { now });
  const report = createReport(triggerResult, analysis, now);
  return result(triggerResult, report, 'report_created');
}

export const AUTOMATIC_REPORT_LIMITS = Object.freeze({
  max_input_bytes: MANUAL_ANALYSIS_LIMITS.max_input_bytes,
  max_open_pull_requests: MAX_OPEN_PULL_REQUESTS,
  max_source_links: 5,
  max_cause_candidates: 3,
  report_id_pattern: REPORT_ID_PATTERN.source
});
