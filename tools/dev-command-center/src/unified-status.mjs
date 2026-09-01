const STATUS_DEFINITIONS = Object.freeze({
  healthy: Object.freeze({ label_ja: '正常', default_reason: 'all_systems_healthy' }),
  in_progress: Object.freeze({ label_ja: '作業中', default_reason: 'ci_in_progress' }),
  awaiting_confirmation: Object.freeze({ label_ja: '確認待ち', default_reason: 'open_pull_request_exists' }),
  failed: Object.freeze({ label_ja: '失敗', default_reason: 'ci_failed' }),
  publish_pending: Object.freeze({ label_ja: '公開待ち', default_reason: 'pages_publish_pending' }),
  stale: Object.freeze({ label_ja: '情報が古い', default_reason: 'source_observation_stale' }),
  unavailable: Object.freeze({ label_ja: '取得不能', default_reason: 'required_source_unavailable' })
});

const FAILED_CONCLUSIONS = new Set([
  'failure',
  'cancelled',
  'timed_out',
  'action_required',
  'startup_failure',
  'stale'
]);
const WORKING_RUN_STATUSES = new Set(['queued', 'in_progress', 'requested', 'waiting', 'pending']);
const RUN_STATUSES = new Set([...WORKING_RUN_STATUSES, 'completed', 'unknown']);
const RUN_CONCLUSIONS = new Set([
  'success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral', 'skipped', 'stale', 'startup_failure'
]);
const SITE_STATUSES = new Set(['built', 'building', 'errored', 'unknown']);
const BUILD_STATUSES = new Set(['built', 'building', 'queued', 'errored', 'unknown']);
const SOURCE_REASON_CODES = new Set([
  'authentication_required', 'rate_limited', 'permission_denied', 'not_found', 'github_unavailable',
  'github_request_failed', 'github_response_too_large', 'invalid_github_response', 'fetch_unavailable'
]);
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DEFAULT_STALE_AFTER_MS = 15 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function safeTimestamp(value) {
  const time = Date.parse(String(value ?? ''));
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function safeSha(value) {
  const sha = String(value ?? '').toLowerCase();
  return SHA_PATTERN.test(sha) ? sha : '';
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function fixedValue(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function sourceReason(value, fallback) {
  return fixedValue(value, SOURCE_REASON_CODES, fallback);
}

function makeStatus(code, reasonCode, observedAt, source) {
  const definition = STATUS_DEFINITIONS[code];
  return Object.freeze({
    code,
    label_ja: definition.label_ja,
    reason_code: reasonCode || definition.default_reason,
    observed_at: observedAt,
    source
  });
}

function unavailable(observedAt, reasonCode = 'required_source_unavailable', source = 'combined') {
  return makeStatus('unavailable', reasonCode, observedAt, source);
}

function repositoryIdentity(snapshot) {
  const repository = snapshot?.repository;
  if (!repository || typeof repository !== 'object') return '';
  const owner = String(repository.owner ?? '').trim();
  const name = String(repository.name ?? '').trim();
  if (owner && name) return owner + '/' + name;
  return String(repository.full_name ?? '').trim();
}

function requiredSectionAvailable(section) {
  return section?.status === 'available' && Array.isArray(section.items);
}

function requiredValueAvailable(section) {
  return section?.status === 'available' && section.value && typeof section.value === 'object';
}

function sourceObservation(snapshot) {
  return safeTimestamp(snapshot?.observed_at);
}

function validateSources(repository, actions, pages, observedAt) {
  if (!repository || !actions || !pages) return unavailable(observedAt);
  if (repository.schema_version !== 1 || actions.schema_version !== 1 || pages.schema_version !== 1) {
    return unavailable(observedAt, 'unsupported_source_schema');
  }

  const identities = [repositoryIdentity(repository), repositoryIdentity(actions), repositoryIdentity(pages)];
  if (identities.some(identity => !identity)) return unavailable(observedAt, 'repository_identity_missing');
  if (new Set(identities).size !== 1) return unavailable(observedAt, 'repository_mismatch');

  if (!requiredSectionAvailable(repository.sections?.commits)) {
    return unavailable(observedAt, sourceReason(repository.sections?.commits?.reason_code, 'repository_commits_unavailable'), 'github_repository');
  }
  if (!requiredSectionAvailable(repository.sections?.pull_requests)) {
    return unavailable(observedAt, sourceReason(repository.sections?.pull_requests?.reason_code, 'repository_pull_requests_unavailable'), 'github_repository');
  }
  if (!requiredSectionAvailable(actions.runs)) {
    return unavailable(observedAt, sourceReason(actions.runs?.reason_code, 'actions_runs_unavailable'), 'github_actions');
  }
  if (!requiredValueAvailable(pages.site)) {
    return unavailable(observedAt, sourceReason(pages.site?.reason_code, 'pages_site_unavailable'), 'github_pages');
  }
  if (!requiredValueAvailable(pages.latest_build)) {
    return unavailable(observedAt, sourceReason(pages.latest_build?.reason_code, 'pages_build_unavailable'), 'github_pages');
  }
  return null;
}

function staleStatus(snapshots, nowMs, staleAfterMs, observedAt) {
  const observations = snapshots.map(sourceObservation);
  if (observations.some(value => value === null)) {
    return unavailable(observedAt, 'source_observation_invalid');
  }
  const times = observations.map(value => Date.parse(value));
  if (times.some(time => time > nowMs + MAX_CLOCK_SKEW_MS)) {
    return unavailable(observedAt, 'source_clock_ahead');
  }
  const oldestIndex = times.indexOf(Math.min(...times));
  if (nowMs - times[oldestIndex] <= staleAfterMs) return null;
  return makeStatus('stale', 'source_observation_stale', observedAt, ['github_repository', 'github_actions', 'github_pages'][oldestIndex]);
}

function latestMainCommit(repository) {
  return safeSha(repository.sections.commits.items[0]?.sha);
}

function matchingMainRun(actions, mainSha) {
  return actions.runs.items.find(run => safeSha(run?.head_sha) === mainSha) || null;
}

function publicSignals(repository, actions, pages, mainSha, run) {
  return Object.freeze({
    main_sha: mainSha,
    open_pull_request_count: nonNegativeInteger(repository.sections.pull_requests.items.length),
    ci: Object.freeze({
      matched_main: run !== null,
      status: run ? fixedValue(run.status, RUN_STATUSES, 'unknown') : 'not_observed',
      conclusion: run ? fixedValue(run.conclusion, RUN_CONCLUSIONS, null) : null,
      head_sha: safeSha(run?.head_sha)
    }),
    pages: Object.freeze({
      site_status: fixedValue(pages.site.value.status, SITE_STATUSES, 'unknown'),
      build_status: fixedValue(pages.latest_build.value.status, BUILD_STATUSES, 'unknown'),
      published_sha: safeSha(pages.latest_build.value.published_sha)
    })
  });
}

export function deriveUnifiedStatus(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const nowMs = now.getTime();
  const observedAt = Number.isFinite(nowMs) ? now.toISOString() : new Date(0).toISOString();
  const staleAfterMs = Number.isFinite(options.staleAfterMs) && options.staleAfterMs >= 0
    ? options.staleAfterMs
    : DEFAULT_STALE_AFTER_MS;
  const repository = options.repositorySnapshot;
  const actions = options.actionsSnapshot;
  const pages = options.pagesSnapshot;

  if (!Number.isFinite(nowMs)) {
    return Object.freeze({
      schema_version: 1,
      status: unavailable(observedAt, 'evaluation_time_invalid'),
      signals: null
    });
  }

  const sourceError = validateSources(repository, actions, pages, observedAt);
  if (sourceError) {
    return Object.freeze({ schema_version: 1, status: sourceError, signals: null });
  }

  const stale = staleStatus([repository, actions, pages], nowMs, staleAfterMs, observedAt);
  if (stale) return Object.freeze({ schema_version: 1, status: stale, signals: null });

  const mainSha = latestMainCommit(repository);
  if (!mainSha) {
    return Object.freeze({
      schema_version: 1,
      status: unavailable(observedAt, 'main_commit_unavailable', 'github_repository'),
      signals: null
    });
  }

  const run = matchingMainRun(actions, mainSha);
  const signals = publicSignals(repository, actions, pages, mainSha, run);
  const siteStatus = signals.pages.site_status;
  const buildStatus = signals.pages.build_status;

  if (run && (FAILED_CONCLUSIONS.has(run.conclusion) || (run.status === 'completed' && run.conclusion !== 'success'))) {
    return Object.freeze({ schema_version: 1, status: makeStatus('failed', 'ci_failed', observedAt, 'github_actions'), signals });
  }
  if (siteStatus === 'errored' || buildStatus === 'errored') {
    return Object.freeze({ schema_version: 1, status: makeStatus('failed', 'pages_failed', observedAt, 'github_pages'), signals });
  }
  if (!run || WORKING_RUN_STATUSES.has(run.status) || run.status !== 'completed') {
    const reason = run ? 'ci_in_progress' : 'ci_pending_for_main';
    return Object.freeze({ schema_version: 1, status: makeStatus('in_progress', reason, observedAt, 'github_actions'), signals });
  }
  if (siteStatus === 'building' || buildStatus === 'building' || buildStatus === 'queued') {
    return Object.freeze({ schema_version: 1, status: makeStatus('publish_pending', 'pages_build_in_progress', observedAt, 'github_pages'), signals });
  }
  if (siteStatus !== 'built' || buildStatus !== 'built' || signals.pages.published_sha !== mainSha) {
    return Object.freeze({ schema_version: 1, status: makeStatus('publish_pending', 'pages_commit_not_published', observedAt, 'github_pages'), signals });
  }
  if (signals.open_pull_request_count > 0) {
    return Object.freeze({ schema_version: 1, status: makeStatus('awaiting_confirmation', 'open_pull_request_exists', observedAt, 'github_repository'), signals });
  }
  return Object.freeze({
    schema_version: 1,
    status: makeStatus('healthy', 'all_systems_healthy', observedAt, 'combined'),
    signals
  });
}

export const UNIFIED_STATUS_CODES = Object.freeze(Object.keys(STATUS_DEFINITIONS));
