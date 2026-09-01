import http from 'node:http';
import { readRuntimeConfig } from './config.mjs';

const JSON_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
});

function writeJson(response, statusCode, value) {
  response.writeHead(statusCode, JSON_HEADERS);
  response.end(JSON.stringify(value) + '\n');
}

export function createCommandCenterServer(options = {}) {
  const config = options.config || readRuntimeConfig();
  const now = options.now || (() => new Date());
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url || '/', 'http://command-center.invalid').pathname;
    if (request.method === 'GET' && pathname === '/healthz') {
      writeJson(response, 200, {
        schema_version: 1,
        service: 'monster-rpg-dev-command-center',
        status: 'ok',
        checked_at: now().toISOString()
      });
      return;
    }
    writeJson(response, 404, { schema_version: 1, status: 'not_found' });
  });

  return Object.freeze({
    config,
    server,
    async listen() {
      if (server.listening) return server.address();
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(config.port, config.host, () => {
          server.removeListener('error', reject);
          resolve();
        });
      });
      return server.address();
    },
    async close() {
      if (!server.listening) return;
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
}
