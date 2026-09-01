import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const ui = read('js/diagnostics-ui.js');

const errors = [];
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};

[
  'onclick="copyDiagnosticSummary()"',
  'onclick="saveDiagnosticJson()"',
  'onclick="shareDiagnosticSummary()"',
  'id="diagnosticsActionStatus"',
  'role="status"',
  'aria-live="polite"'
].forEach(contract => expect(index.includes(contract), `diagnostics export UI is missing: ${contract}`));

[
  'async function copyDiagnosticSummary()',
  'function saveDiagnosticJson()',
  'async function shareDiagnosticSummary()',
  'navigator?.clipboard',
  'clipboard.writeText',
  'new root.Blob',
  'root.URL.createObjectURL',
  'root.URL.revokeObjectURL',
  'navigator?.share',
  'share.call(root.navigator'
].forEach(contract => expect(ui.includes(contract), `diagnostics export implementation is missing: ${contract}`));

['localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'WebSocket'].forEach(forbidden => {
  expect(!ui.includes(forbidden), `diagnostics export must not use ${forbidden}`);
});

const renderStart = ui.indexOf('function renderDiagnosticsScreen()');
const renderEnd = ui.indexOf('function showDiagnosticsScreen()', renderStart);
const renderBody = ui.slice(renderStart, renderEnd);
['copyDiagnosticSummary()', 'saveDiagnosticJson()', 'shareDiagnosticSummary()'].forEach(action => {
  expect(!renderBody.includes(action), `render must not trigger export action: ${action}`);
});

expect(ui.includes('const report=api.getDiagnosticReport();'), 'export helper must obtain a fresh safe report');
expect((ui.match(/const payload=getDiagnosticExport\(\);/g) || []).length === 3, 'each explicit export action must obtain its own fresh safe payload');
expect(ui.includes("title:'モンスターバトル 診断要約'") && ui.includes('text:payload.summary'), 'share must use the fixed title and safe summary');
expect(!ui.includes('url:root.location') && !ui.includes('url:location'), 'share must not include the current URL');
expect(ui.includes('monster-rpg-diagnostics-') && ui.includes("type:'application/json;charset=utf-8'"), 'JSON download contract is missing');
expect(ui.includes("error?.name==='AbortError'"), 'share cancellation must be handled without throwing');

if (errors.length) {
  console.error(`Diagnostics export validation failed (${errors.length} issue(s)):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Diagnostics export validation passed.');
