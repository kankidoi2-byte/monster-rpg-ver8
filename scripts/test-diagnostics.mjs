import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'js/diagnostics.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const listeners = new Map();
const context = {
  URL,
  location: { href: 'https://example.test/game/index.html?session=private#secret' },
  addEventListener(type, handler) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(handler);
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(source, context);

const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };
const emit = (type, event) => {
  for (const handler of listeners.get(type) || []) handler(event);
};

expect(context.GameDiagnostics?.version === 1, 'diagnostics API version is missing');
expect(context.GameDiagnostics?.maxErrors === 20, 'diagnostics limit must be 20');
expect((listeners.get('error') || []).length === 1, 'one error listener must be installed');
expect((listeners.get('unhandledrejection') || []).length === 1, 'one rejection listener must be installed');

vm.runInContext(source, context);
expect((listeners.get('error') || []).length === 1, 'loading diagnostics twice must not duplicate the error listener');
expect((listeners.get('unhandledrejection') || []).length === 1, 'loading diagnostics twice must not duplicate the rejection listener');

const longMessage = 'x'.repeat(700);
emit('error', {
  message: longMessage,
  filename: 'https://example.test/game/app.js?token=secret#private',
  lineno: 12.9,
  colno: 8,
  error: { name: 'TypeError', message: longMessage, stack: 'must not be retained' }
});
let recorded = context.GameDiagnostics.getErrors();
expect(recorded.length === 1, 'the first error must be recorded');
expect(recorded[0]?.name === 'TypeError', 'error name was not normalized');
expect(recorded[0]?.message.length === 500, 'long messages must be truncated');
expect(recorded[0]?.source === 'https://example.test/game/app.js', 'source URL must omit query and fragment');
expect(recorded[0]?.line === 12 && recorded[0]?.column === 8, 'line and column were not normalized');
expect(!Object.hasOwn(recorded[0] || {}, 'stack'), 'stack must not be retained in Phase 1');
expect(!Object.hasOwn(recorded[0] || {}, 'error'), 'raw error objects must not be retained');

emit('error', {
  message: longMessage,
  filename: 'https://example.test/game/app.js?different=secret',
  lineno: 12,
  colno: 8,
  error: { name: 'TypeError', message: longMessage }
});
recorded = context.GameDiagnostics.getErrors();
expect(recorded.length === 1 && recorded[0]?.count === 2, 'consecutive duplicate errors must be coalesced');

for (let index = 0; index < 25; index++) {
  emit('error', {
    message: `unique-${index}`,
    filename: `https://example.test/game/file-${index}.js?secret=${index}`,
    lineno: index,
    colno: index
  });
}
recorded = context.GameDiagnostics.getErrors();
expect(recorded.length === 20, 'the ring buffer must keep only the newest 20 errors');
expect(recorded[0]?.message === 'unique-5', 'the ring buffer did not discard the oldest entries');
expect(recorded.at(-1)?.message === 'unique-24', 'the newest error is missing');

emit('unhandledrejection', { reason: new Error('promise failed') });
recorded = context.GameDiagnostics.getErrors();
expect(recorded.at(-1)?.kind === 'unhandledrejection', 'promise rejection was not recorded');
expect(recorded.at(-1)?.message === 'promise failed', 'promise rejection message is missing');
expect(recorded.at(-1)?.source === '', 'promise rejection must not invent a source URL');

emit('unhandledrejection', { reason: { secret: 'must-not-leak' } });
recorded = context.GameDiagnostics.getErrors();
expect(!JSON.stringify(recorded).includes('must-not-leak'), 'arbitrary rejection object properties must not be retained');

const copy = context.GameDiagnostics.getErrors();
copy[0].message = 'mutated';
expect(context.GameDiagnostics.getErrors()[0]?.message !== 'mutated', 'getErrors must return defensive copies');

context.GameDiagnostics.clearErrors();
expect(context.GameDiagnostics.getErrors().length === 0, 'clearErrors did not clear the buffer');

const diagnosticsIndex = index.indexOf('js/diagnostics.js');
const guardIndex = index.indexOf('js/bootstrap-guard.js');
expect(diagnosticsIndex >= 0, 'diagnostics.js is not loaded by index.html');
expect(diagnosticsIndex < guardIndex, 'diagnostics must load before bootstrap-guard');
expect(!source.includes('mb_v95c'), 'diagnostics must not read or change the save key');
expect(!source.includes('localStorage'), 'Phase 1 diagnostics must remain memory-only');

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('Diagnostics error recorder passed');
