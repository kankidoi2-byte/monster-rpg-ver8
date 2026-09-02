import { createHash } from 'node:crypto';

const REPOSITORY = 'kankidoi2-byte/monster-rpg-ver8';
const SCHEMA_VERSION = 1;
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000;
const SCHEDULE_BUCKET_MS = 60 * 60 * 1000;
const MAX_LEDGER_ENTRIES = 100;
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const TRIGGER_ID_PATTERN = /^phase25:[0-9a-f]{64}$/;
const SOURCES = new Set(['pull_request', 'main_push', 'ci_completed', 'pages_completed', 'schedule']);
const PR_ACTIONS = new Set(['opened', 'reopened', 'synchronize', 'ready_for_review']);
const COMPLETION_STATUSES = new Set(['completed']);
const CONCLUSIONS = new Set(['success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral', 'skipped']);

const SIDE_EFFECTS = Object.freeze({
  network_requests: false,
  file_writes: false,
  github_writes: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function fixedDate(value) {
  if (typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function fixedSha(value) {
  return typeof value === 'string' && SHA_PATTERN.test(value) ? value : null;
}

function normalizeEvent(event) {
  if (event?.schema_version !== SCHEMA_VERSION || event?.repository !== REPOSITORY || !SOURCES.has(event?.source)) {
    return null;
  }

  const observedAt = fixedDate(event.observed_at);
  if (observedAt === null) return null;

  if (event.source === 'pull_request') {
    const number = event.pull_request?.number;
    const headSha = fixedSha(event.pull_request?.head_sha);
    const action = event.pull_request?.action;
    if (!positiveInteger(number) || !headSha || !PR_ACTIONS.has(action)) return null;
    return Object.freeze({ source: event.source, observedAt, parts: [number, headSha, action], subject: `pr:${number}` });
  }

  if (event.source === 'main_push') {
    const sha = fixedSha(event.main_push?.sha);
    if (!sha) return null;
    return Object.freeze({ source: event.source, observedAt, parts: [sha], subject: `main:${sha}` });
  }

  if (event.source === 'ci_completed' || event.source === 'pages_completed') {
    const field = event[event.source];
    const runId = field?.run_id;
    const runAttempt = field?.run_attempt;
    const status = field?.status;
    const conclusion = field?.conclusion;
    const headSha = fixedSha(field?.head_sha);
    if (!positiveInteger(runId) || !positiveInteger(runAttempt) || !COMPLETION_STATUSES.has(status)
      || !CONCLUSIONS.has(conclusion) || !headSha) return null;
    return Object.freeze({
      source: event.source,
      observedAt,
      parts: [runId, runAttempt, status, conclusion, headSha],
      subject: `${event.source === 'ci_completed' ? 'ci' : 'pages'}:${runId}:${runAttempt}`
    });
  }

  const bucket = Math.floor(observedAt / SCHEDULE_BUCKET_MS) * SCHEDULE_BUCKET_MS;
  return Object.freeze({ source: event.source, observedAt, parts: [bucket], subject: `schedule:${new Date(bucket).toISOString()}` });
}

function triggerId(normalized) {
  const canonical = [REPOSITORY, normalized.source, ...normalized.parts].join('\n');
  return `phase25:${createHash('sha256').update(canonical).digest('hex')}`;
}

function normalizeLedger(ledger, nowMs) {
  if (!Array.isArray(ledger)) return [];
  const unique = new Map();
  for (const entry of ledger) {
    const acceptedAt = fixedDate(entry?.accepted_at);
    const expiresAt = fixedDate(entry?.expires_at);
    if (typeof entry?.trigger_id !== 'string' || !TRIGGER_ID_PATTERN.test(entry.trigger_id)
      || !SOURCES.has(entry.source) || acceptedAt === null || expiresAt === null
      || expiresAt <= nowMs || expiresAt <= acceptedAt) continue;
    const normalized = Object.freeze({
      trigger_id: entry.trigger_id,
      source: entry.source,
      accepted_at: new Date(acceptedAt).toISOString(),
      expires_at: new Date(expiresAt).toISOString()
    });
    const previous = unique.get(entry.trigger_id);
    if (!previous || acceptedAt > Date.parse(previous.accepted_at)) unique.set(entry.trigger_id, normalized);
  }
  return [...unique.values()]
    .sort((left, right) => Date.parse(right.accepted_at) - Date.parse(left.accepted_at))
    .slice(0, MAX_LEDGER_ENTRIES);
}

function freezeResult(source, enqueue, reasonCode, id, subject, ledger) {
  return Object.freeze({
    schema_version: SCHEMA_VERSION,
    phase: 25,
    mode: 'automatic_deduplicated',
    source,
    decision: Object.freeze({ enqueue, reason_code: reasonCode, trigger_id: id }),
    trigger: subject ? Object.freeze({ repository: REPOSITORY, subject }) : null,
    ledger: Object.freeze(ledger),
    side_effects: SIDE_EFFECTS
  });
}

export function coordinateTrigger(event, ledger = [], options = {}) {
  const normalized = normalizeEvent(event);
  const nowMs = fixedDate(options.now ?? event?.observed_at);
  const retained = normalizeLedger(ledger, nowMs ?? Number.POSITIVE_INFINITY);
  if (!normalized || nowMs === null) {
    return freezeResult('unavailable', false, 'invalid_event', null, null, retained);
  }

  const id = triggerId(normalized);
  if (retained.some((entry) => entry.trigger_id === id)) {
    return freezeResult(normalized.source, false, 'duplicate_trigger', id, normalized.subject, retained);
  }

  const acceptedAt = new Date(nowMs).toISOString();
  const nextEntry = Object.freeze({
    trigger_id: id,
    source: normalized.source,
    accepted_at: acceptedAt,
    expires_at: new Date(nowMs + DEDUP_TTL_MS).toISOString()
  });
  const nextLedger = [nextEntry, ...retained].slice(0, MAX_LEDGER_ENTRIES);
  return freezeResult(normalized.source, true, 'accepted', id, normalized.subject, nextLedger);
}

export const TRIGGER_LIMITS = Object.freeze({
  repository: REPOSITORY,
  dedup_ttl_ms: DEDUP_TTL_MS,
  schedule_bucket_ms: SCHEDULE_BUCKET_MS,
  max_ledger_entries: MAX_LEDGER_ENTRIES
});
