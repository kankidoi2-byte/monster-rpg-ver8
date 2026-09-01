const ACTION_DEFINITIONS = Object.freeze({
  failed: Object.freeze({
    priority: 1,
    action_code: 'inspect_failed_check',
    reason_code: 'blocking_failure_detected'
  }),
  unavailable: Object.freeze({
    priority: 2,
    action_code: 'restore_source_access',
    reason_code: 'required_source_unavailable'
  }),
  stale: Object.freeze({
    priority: 3,
    action_code: 'refresh_status_sources',
    reason_code: 'source_observation_stale'
  }),
  in_progress: Object.freeze({
    priority: 4,
    action_code: 'wait_for_ci_completion',
    reason_code: 'ci_still_running'
  }),
  publish_pending: Object.freeze({
    priority: 5,
    action_code: 'wait_for_pages_publication',
    reason_code: 'pages_publication_pending'
  }),
  awaiting_confirmation: Object.freeze({
    priority: 6,
    action_code: 'review_open_pull_request',
    reason_code: 'human_confirmation_required'
  }),
  healthy: Object.freeze({
    priority: 7,
    action_code: 'no_action',
    reason_code: 'system_healthy'
  })
});

const INVALID_INPUT_ACTION = Object.freeze({
  priority: 1,
  action_code: 'restore_status_input',
  reason_code: 'unified_status_invalid'
});

function safeSourceLink(value) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const isGitHub = hostname === 'github.com';
    const isGitHubPages = hostname.endsWith('.github.io') && hostname !== 'github.io';
    if (url.protocol !== 'https:' || url.username || url.password || (!isGitHub && !isGitHubPages)) return null;
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function safeSourceLinks(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  const links = [];
  for (const value of values) {
    const link = safeSourceLink(value);
    if (link && !links.includes(link)) links.push(link);
    if (links.length === 5) break;
  }
  return Object.freeze(links);
}

function freezeDecision(definition, blockingStatus, sourceLinks) {
  return Object.freeze({
    schema_version: 1,
    decision: Object.freeze({
      priority: definition.priority,
      action_code: definition.action_code,
      reason_code: definition.reason_code,
      source_links: safeSourceLinks(sourceLinks),
      blocking_status: blockingStatus
    })
  });
}

export function decideNextAction(unifiedStatus, options = {}) {
  const statusCode = unifiedStatus?.schema_version === 1
    ? unifiedStatus?.status?.code
    : null;
  const definition = ACTION_DEFINITIONS[statusCode];
  if (!definition) {
    return freezeDecision(INVALID_INPUT_ACTION, 'unavailable', options.sourceLinks);
  }
  return freezeDecision(definition, statusCode, options.sourceLinks);
}

export const NEXT_ACTION_CODES = Object.freeze(
  Object.values(ACTION_DEFINITIONS).map(definition => definition.action_code)
);

export const NEXT_ACTION_PRIORITY = Object.freeze(
  Object.fromEntries(Object.entries(ACTION_DEFINITIONS).map(([status, definition]) => [status, definition.priority]))
);
