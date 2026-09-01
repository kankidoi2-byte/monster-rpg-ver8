import { createGitHubRepositoryReaderFromEnv } from './github-reader.mjs';
import { createGitHubActionsReaderFromEnv } from './github-actions-reader.mjs';
import { createGitHubPagesReaderFromEnv } from './github-pages-reader.mjs';
import { deriveUnifiedStatus } from './unified-status.mjs';
import { decideNextAction } from './next-action.mjs';
import { buildDashboardViewModel } from './dashboard.mjs';

export function createDashboardProvider(options = {}) {
  const repositoryReader = options.repositoryReader;
  const actionsReader = options.actionsReader;
  const pagesReader = options.pagesReader;
  const now = options.now || (() => new Date());
  const cacheMs = Number.isFinite(options.cacheMs) && options.cacheMs >= 0 ? options.cacheMs : 60_000;
  const sourceLinks = Array.isArray(options.sourceLinks) ? options.sourceLinks : [];
  let cached = null;
  let cachedAt = 0;
  let pending = null;

  async function snapshot(reader) {
    try {
      return await reader?.getSnapshot?.();
    } catch {
      return null;
    }
  }

  async function refresh() {
    const evaluationTime = now();
    const [repositorySnapshot, actionsSnapshot, pagesSnapshot] = await Promise.all([
      snapshot(repositoryReader), snapshot(actionsReader), snapshot(pagesReader)
    ]);
    const unifiedStatus = deriveUnifiedStatus({
      repositorySnapshot,
      actionsSnapshot,
      pagesSnapshot,
      now: evaluationTime
    });
    const nextAction = decideNextAction(unifiedStatus, { sourceLinks });
    return buildDashboardViewModel({
      unifiedStatus,
      nextAction,
      repositorySnapshot,
      actionsSnapshot,
      pagesSnapshot
    });
  }

  async function getDashboard() {
    const current = now().getTime();
    if (cached && Number.isFinite(current) && current - cachedAt < cacheMs) return cached;
    if (!pending) {
      pending = refresh().then(value => {
        cached = value;
        cachedAt = current;
        return value;
      }).finally(() => { pending = null; });
    }
    return pending;
  }

  return Object.freeze({ getDashboard });
}

export function createDashboardProviderFromEnv(env = process.env, options = {}) {
  const owner = env.DEV_COMMAND_CENTER_GITHUB_OWNER || 'kankidoi2-byte';
  const repository = env.DEV_COMMAND_CENTER_GITHUB_REPOSITORY || 'monster-rpg-ver8';
  const readerOptions = { fetchImpl: options.fetchImpl, now: options.now };
  return createDashboardProvider({
    repositoryReader: createGitHubRepositoryReaderFromEnv(env, readerOptions),
    actionsReader: createGitHubActionsReaderFromEnv(env, readerOptions),
    pagesReader: createGitHubPagesReaderFromEnv(env, readerOptions),
    now: options.now,
    cacheMs: options.cacheMs,
    sourceLinks: [
      `https://github.com/${owner}/${repository}`,
      `https://github.com/${owner}/${repository}/actions`,
      `https://${owner}.github.io/${repository}/`
    ]
  });
}
