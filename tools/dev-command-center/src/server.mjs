import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isLoopbackHost, readRuntimeConfig } from './config.mjs';
import { buildDashboardViewModel, renderDashboardHtml } from './dashboard.mjs';
import { importDiagnosticReport } from './diagnostic-import.mjs';

const MAX_FORM_BYTES = 1024 * 1024;

const JSON_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
});
const DASHBOARD_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
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

function readFormBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_FORM_BYTES) {
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) chunks.push(chunk);
    });
    request.once('end', () => resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf8')));
    request.once('error', reject);
  });
}

function rejectedImport(reasonCode, importedAt) {
  return Object.freeze({
    schema_version: 1,
    validation: Object.freeze({ status: 'rejected', reason_code: reasonCode, report_version: null }),
    imported_at: importedAt,
    report: null
  });
}

function sameOriginForm(request) {
  const fetchSite = String(request.headers['sec-fetch-site'] || '');
  return fetchSite === '' || fetchSite === 'same-origin' || fetchSite === 'none';
}

export function createCommandCenterServer(options = {}) {
  const config = options.config || readRuntimeConfig();
  const now = options.now || (() => new Date());
  const dashboardProvider = options.dashboardProvider || Object.freeze({
    async getDashboard() { return buildDashboardViewModel(); }
  });
  const diagnosticImporter = options.diagnosticImporter || importDiagnosticReport;
  let diagnosticImport = null;

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
      response.end(renderDashboardHtml(dashboard, diagnosticImport));
      return;
    }
    if (request.method === 'POST' && pathname === '/diagnostics/import' && isLoopbackHost(config.host) && sameOriginForm(request)) {
      const body = await readFormBody(request);
      if (body === null) {
        diagnosticImport = rejectedImport('input_too_large', now().toISOString());
      } else if (!String(request.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) {
        diagnosticImport = rejectedImport('invalid_input', now().toISOString());
      } else {
        const source = new URLSearchParams(body).get('report');
        diagnosticImport = diagnosticImporter(source, { now: now() });
      }
      response.writeHead(303, { ...DASHBOARD_HEADERS, Location: '/' });
      response.end();
      return;
    }
    if (request.method === 'POST' && pathname === '/diagnostics/clear' && isLoopbackHost(config.host) && sameOriginForm(request)) {
      diagnosticImport = null;
      response.writeHead(303, { ...DASHBOARD_HEADERS, Location: '/' });
      response.end();
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
