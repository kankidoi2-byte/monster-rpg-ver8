import { createCommandCenterServer } from './server.mjs';
import { createDashboardProviderFromEnv } from './dashboard-provider.mjs';
import { createGitHubRepositoryReaderFromEnv } from './github-reader.mjs';
import { createGitHubIssueWriterFromEnv } from './github-issue-writer.mjs';

const app = createCommandCenterServer({
  dashboardProvider: createDashboardProviderFromEnv(),
  repositoryProvider: createGitHubRepositoryReaderFromEnv(),
  issueWriter: createGitHubIssueWriterFromEnv()
});
const address = await app.listen();
console.log('Development command center health service listening on ' + address.address + ':' + address.port);

async function shutdown() {
  await app.close();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
