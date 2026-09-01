import assert from 'node:assert/strict';
import { readRuntimeConfig } from '../src/config.mjs';
import { createCommandCenterServer } from '../src/server.mjs';

const defaults = readRuntimeConfig({});
assert.deepEqual(defaults, { host: '127.0.0.1', port: 4174, privateNetworkConfirmed: false });
assert.throws(() => readRuntimeConfig({ DEV_COMMAND_CENTER_HOST: '0.0.0.0' }), /non_loopback_requires_private_network_confirmation/);
assert.deepEqual(readRuntimeConfig({
  DEV_COMMAND_CENTER_HOST: '0.0.0.0',
  DEV_COMMAND_CENTER_PORT: '8080',
  DEV_COMMAND_CENTER_PRIVATE_NETWORK_CONFIRMED: 'true'
}), { host: '0.0.0.0', port: 8080, privateNetworkConfirmed: true });
assert.throws(() => readRuntimeConfig({ DEV_COMMAND_CENTER_PORT: '0' }), /invalid_port/);
assert.throws(() => readRuntimeConfig({ DEV_COMMAND_CENTER_PORT: 'not-a-number' }), /invalid_port/);
assert.throws(() => readRuntimeConfig({ DEV_COMMAND_CENTER_PRIVATE_NETWORK_CONFIRMED: 'yes' }), /invalid_private_network_confirmation/);

const fixedDate = new Date('2026-09-01T00:00:00.000Z');
const app = createCommandCenterServer({
  config: { host: '127.0.0.1', port: 0, privateNetworkConfirmed: false },
  now: () => fixedDate
});

try {
  const address = await app.listen();
  const base = 'http://127.0.0.1:' + address.port;
  const healthResponse = await fetch(base + '/healthz');
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get('cache-control'), 'no-store');
  assert.equal(healthResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(healthResponse.headers.get('access-control-allow-origin'), null);
  const health = await healthResponse.json();
  assert.deepEqual(Object.keys(health).sort(), ['checked_at', 'schema_version', 'service', 'status']);
  assert.deepEqual(health, {
    schema_version: 1,
    service: 'monster-rpg-dev-command-center',
    status: 'ok',
    checked_at: fixedDate.toISOString()
  });
  assert.equal(JSON.stringify(health).includes('token'), false);

  const postResponse = await fetch(base + '/healthz', { method: 'POST' });
  assert.equal(postResponse.status, 404);
  const dashboardResponse = await fetch(base + '/');
  assert.equal(dashboardResponse.status, 200);
  assert.equal(dashboardResponse.headers.get('content-security-policy').includes("default-src 'none'"), true);
  assert.equal(dashboardResponse.headers.get('x-frame-options'), 'DENY');
  assert.equal((await dashboardResponse.text()).includes('開発司令塔'), true);
  const cssResponse = await fetch(base + '/dashboard.css');
  assert.equal(cssResponse.status, 200);
  assert.equal(cssResponse.headers.get('content-type'), 'text/css; charset=utf-8');
  const missingResponse = await fetch(base + '/missing');
  assert.equal(missingResponse.status, 404);
  assert.deepEqual(await missingResponse.json(), { schema_version: 1, status: 'not_found' });
} finally {
  await app.close();
}

console.log('Development command center foundation validation passed.');
