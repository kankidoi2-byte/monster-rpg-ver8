import { createCommandCenterServer } from './server.mjs';

const app = createCommandCenterServer();
const address = await app.listen();
console.log('Development command center health service listening on ' + address.address + ':' + address.port);

async function shutdown() {
  await app.close();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
