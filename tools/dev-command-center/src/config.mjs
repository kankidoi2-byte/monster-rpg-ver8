const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost']);

export function isLoopbackHost(host) {
  return LOOPBACK_HOSTS.has(host);
}

function parsePort(value) {
  const text = String(value ?? '4174');
  if (!/^\d+$/.test(text)) throw new Error('invalid_port');
  const port = Number(text);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('invalid_port');
  return port;
}

function parsePrivateNetworkConfirmation(value) {
  if (value === undefined || value === '') return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error('invalid_private_network_confirmation');
}

export function readRuntimeConfig(env = process.env) {
  const host = String(env.DEV_COMMAND_CENTER_HOST || '127.0.0.1').trim();
  const port = parsePort(env.DEV_COMMAND_CENTER_PORT);
  const privateNetworkConfirmed = parsePrivateNetworkConfirmation(env.DEV_COMMAND_CENTER_PRIVATE_NETWORK_CONFIRMED);
  if (!host) throw new Error('invalid_host');
  if (!isLoopbackHost(host) && !privateNetworkConfirmed) {
    throw new Error('non_loopback_requires_private_network_confirmation');
  }
  return Object.freeze({ host, port, privateNetworkConfirmed });
}
