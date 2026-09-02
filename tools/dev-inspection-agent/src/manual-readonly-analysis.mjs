import { deriveUnifiedStatus } from '../../dev-command-center/src/unified-status.mjs';
import { decideNextAction } from '../../dev-command-center/src/next-action.mjs';

const INPUT_SCHEMA_VERSION = 1;
const INPUT_MODE = 'manual_read_only';
const MAX_SOURCE_LINKS = 5;

function fixedInput(input) {
  if (input?.schema_version !== INPUT_SCHEMA_VERSION || input?.mode !== INPUT_MODE) {
    return Object.freeze({ repositorySnapshot: null, actionsSnapshot: null, pagesSnapshot: null, sourceLinks: [] });
  }
  return Object.freeze({
    repositorySnapshot: input.repository_snapshot,
    actionsSnapshot: input.actions_snapshot,
    pagesSnapshot: input.pages_snapshot,
    sourceLinks: Array.isArray(input.source_links) ? input.source_links.slice(0, MAX_SOURCE_LINKS) : []
  });
}

export function analyzeManualSnapshot(input, options = {}) {
  const normalized = fixedInput(input);
  const status = deriveUnifiedStatus({
    repositorySnapshot: normalized.repositorySnapshot,
    actionsSnapshot: normalized.actionsSnapshot,
    pagesSnapshot: normalized.pagesSnapshot,
    now: options.now
  });
  const nextAction = decideNextAction(status, { sourceLinks: normalized.sourceLinks });

  return Object.freeze({
    schema_version: 1,
    phase: 24,
    mode: INPUT_MODE,
    status: status.status,
    signals: status.signals,
    decision: nextAction.decision,
    side_effects: Object.freeze({
      network_requests: false,
      file_writes: false,
      github_writes: false,
      workflow_actions: false,
      external_messages: false,
      paid_actions: false
    })
  });
}

export const MANUAL_ANALYSIS_LIMITS = Object.freeze({
  max_input_bytes: 256 * 1024,
  max_source_links: MAX_SOURCE_LINKS
});
