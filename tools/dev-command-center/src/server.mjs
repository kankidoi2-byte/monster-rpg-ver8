import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isLoopbackHost, readRuntimeConfig } from './config.mjs';
import { buildDashboardViewModel, renderDashboardHtml } from './dashboard.mjs';

const JSON_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
});
const DASHBOARD_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'Content-Type': 'text/html; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
});
const CSS_HEADERS = Object.freeze({
  'Cache-Control': 'public, max-age=300',
  'Content-Type': 'text/css; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff'
});
const DASHBOARD_CSS_PATH = fileURLToPath(new URL('../dashboard.css', import.meta.url));

function writeJson(response, statusCode, value) {
  response.writeHead(statusCode, JSON_HEADERS);
  response.end(JSON.stringify(value) + '\n');
}

export function createCommandCenterServer(options = {}) {
  const config = options.config || readRuntimeConfig();
  const now = options.now || (() => new Date());
  const dashboardProvider = options.dashboardProvider || Object.freeze({
    async getDashboard() { return buildDashboardViewModel(); }
  });

  async function handle(request, response) {
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
    if (request.method === 'GET' && pathname === '/dashboard.css') {
      response.writeHead(200, CSS_HEADERS);
      response.end(await readFile(DASHBOARD_CSS_PATH, 'utf8'));
      return;
    }
    if (request.method === 'GET' && pathname === '/' && isLoopbackHost(config.host)) {
      const dashboard = await dashboardProvider.getDashboard();
      response.writeHead(200, DASHBOARD_HEADERS);
      response.end(renderDashboardHtml(dashboard));
      return;
    }
    writeJson(response, 404, { schema_version: 1, status: 'not_found' });
  }

  const server = http.createServer((request, response) => {
    handle(request, response).catch(() => {
      if (response.headersSent) return response.destroy();
      writeJson(response, 503, { schema_version: 1, status: 'unavailable' });
    });
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
