import { createHash } from 'node:crypto';
import { runAutomaticInspection } from './automatic-inspection-report.mjs';

const SCHEMA_VERSION = 1;
const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const OUTPUT_MODE = 'automatic_unpublished_issue_draft';
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_DRAFT_LEDGER_ENTRIES = 100;
const MAX_BODY_CHARS = 8192;
const DRAFT_ID_PATTERN = /^phase27:[0-9a-f]{64}$/;
const REPORT_ID_PATTERN = /^phase26:[0-9a-f]{64}$/;
const ACTIONABLE_STATUSES = new Set(['failed', 'stale', 'unavailable']);

const DRAFT_DEFINITIONS = Object.freeze({
  failed: Object.freeze({
    title: '[自動点検] CIまたはPagesの失敗を検出',
    labels: Object.freeze(['automated-inspection', 'needs-triage'])
  }),
  stale: Object.freeze({
    title: '[自動点検] 点検情報の再取得が必要',
    labels: Object.freeze(['automated-inspection', 'needs-triage'])
  }),
  unavailable: Object.freeze({
    title: '[自動点検] 点検情報を取得できません',
    labels: Object.freeze(['automated-inspection', 'needs-triage'])
  })
});

const SIDE_EFFECTS = Object.freeze({
  network_requests: false,
  file_writes: false,
  github_writes: false,
  issue_posts: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});

function fixedMilliseconds(value) {
  const milliseconds = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function normalizeDraftLedger(ledger, nowMs) {
  if (!Array.isArray(ledger)) return [];
  const unique = new Map();
  for (const entry of ledger) {
    const createdAt = fixedMilliseconds(entry?.created_at);
    const expiresAt = fixedMilliseconds(entry?.expires_at);
    if (!DRAFT_ID_PATTERN.test(entry?.draft_id ?? '')
      || !REPORT_ID_PATTERN.test(entry?.report_id ?? '')
      || createdAt === null || expiresAt === null
      || expiresAt <= nowMs || expiresAt <= createdAt) continue;
    const normalized = Object.freeze({
      draft_id: entry.draft_id,
      report_id: entry.report_id,
      created_at: new Date(createdAt).toISOString(),
      expires_at: new Date(expiresAt).toISOString()
    });
    const previous = unique.get(entry.draft_id);
    if (!previous || createdAt > Date.parse(previous.created_at)) unique.set(entry.draft_id, normalized);
  }
  return [...unique.values()]
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, MAX_DRAFT_LEDGER_ENTRIES);
}

function fixedText(value, fallback = '未取得') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function fixedBoolean(value) {
  return value === true ? 'はい' : value === false ? 'いいえ' : '未取得';
}

function draftBody(report) {
  const causes = report.cause_candidates.length
    ? report.cause_candidates.map((cause) => `- ${cause.code} (${cause.likelihood})`).join('\n')
    : '- なし';
  const links = report.evidence.source_links.length
    ? report.evidence.source_links.map((link) => `- ${link}`).join('\n')
    : '- なし';
  const body = `## 自動点検結果
- 状態: ${report.status.code}
- レポートID: ${report.report_id}
- main: ${fixedText(report.evidence.main_sha)}
- 検出日時: ${report.generated_at}

## 原因候補
${causes}

## 影響
- コード: ${report.impact.code}
- 進行停止: ${fixedBoolean(report.impact.blocks_progress)}

## 推奨対応
- 優先度: ${report.recommendation.priority}
- アクション: ${report.recommendation.action_code}
- 人による承認: ${fixedBoolean(report.recommendation.requires_human_approval)}

## 確信度
- レベル: ${report.confidence.level}
- 根拠: ${report.confidence.basis_code}

## 確認リンク
${links}

---
このIssueは自動点検エージェントが生成した未投稿の下書きです。投稿には毎回、新しい明示確認が必要です。`;
  return body.slice(0, MAX_BODY_CHARS);
}

function draftId(report) {
  const canonical = [report.report_id, report.status.code, report.recommendation.action_code].join('\n');
  return `phase27:${createHash('sha256').update(canonical).digest('hex')}`;
}

function createDraft(report, id) {
  const definition = DRAFT_DEFINITIONS[report.status.code];
  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    draft_id: id,
    report_id: report.report_id,
    repository: REPOSITORY,
    generated_at: report.generated_at,
    title: definition.title,
    body: draftBody(report),
    suggested_labels: definition.labels,
    publication: Object.freeze({
      state: 'unpublished',
      destination: null,
      requires_fresh_confirmation: true,
      issue_number: null
    })
  });
}

function freezeResult(inspection, draftLedger, draft, reasonCode) {
  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    phase: 27,
    mode: OUTPUT_MODE,
    outcome: Object.freeze({ draft_created: draft !== null, reason_code: reasonCode }),
    inspection: Object.freeze({
      report_created: inspection.outcome.report_created,
      reason_code: inspection.outcome.reason_code,
      report_id: inspection.report?.report_id ?? null,
      status: inspection.report?.status.code ?? null
    }),
    trigger_ledger: inspection.ledger,
    draft_ledger: Object.freeze(draftLedger),
    draft,
    side_effects: SIDE_EFFECTS
  });
}

export function runAutomaticIssueDraft(input, triggerLedger = [], draftLedger = [], options = {}) {
  const inspection = runAutomaticInspection(input, triggerLedger, options);
  const nowMs = fixedMilliseconds(options.now ?? input?.trigger_event?.observed_at);
  const retained = normalizeDraftLedger(draftLedger, nowMs ?? Number.POSITIVE_INFINITY);

  if (!inspection.report) {
    return freezeResult(inspection, retained, null, inspection.outcome.reason_code);
  }

  const report = inspection.report;
  if (!ACTIONABLE_STATUSES.has(report.status.code)) {
    return freezeResult(inspection, retained, null, 'no_issue_needed');
  }

  const id = draftId(report);
  if (retained.some((entry) => entry.draft_id === id)) {
    return freezeResult(inspection, retained, null, 'duplicate_draft');
  }

  const createdAt = report.generated_at;
  const nextEntry = Object.freeze({
    draft_id: id,
    report_id: report.report_id,
    created_at: createdAt,
    expires_at: new Date(Date.parse(createdAt) + DRAFT_TTL_MS).toISOString()
  });
  const nextLedger = [nextEntry, ...retained].slice(0, MAX_DRAFT_LEDGER_ENTRIES);
  return freezeResult(inspection, nextLedger, createDraft(report, id), 'draft_created');
}

export const AUTOMATIC_ISSUE_DRAFT_LIMITS = Object.freeze({
  repository: REPOSITORY,
  draft_ttl_ms: DRAFT_TTL_MS,
  max_draft_ledger_entries: MAX_DRAFT_LEDGER_ENTRIES,
  max_body_chars: MAX_BODY_CHARS,
  actionable_statuses: Object.freeze([...ACTIONABLE_STATUSES]),
  draft_id_pattern: DRAFT_ID_PATTERN.source,
  report_id_pattern: REPORT_ID_PATTERN.source
});
