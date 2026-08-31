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
  navigator: {
    userAgent: 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36 private-agent-token',
    userAgentData: { mobile: true },
    maxTouchPoints: 5,
    onLine: true
  },
  document: {
    title: 'モンスターバトル Ver8.0',
    body: { classList: { contains: () => false } },
    querySelector(selector) {
      if (selector === '.screen.active') return { id: 'home' };
      if (selector.includes('app-version')) return null;
      if (selector.includes('build-commit')) return null;
      return null;
    }
  },
  screen: { width: 1080, height: 2340 },
  innerWidth: 412,
  innerHeight: 915,
  devicePixelRatio: 2.625,
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
expect(context.GameDiagnostics?.environmentVersion === 1, 'environment schema version is missing');
expect(context.GameDiagnostics?.maxErrors === 20, 'diagnostics limit must be 20');
expect((listeners.get('error') || []).length === 1, 'one error listener must be installed');
expect((listeners.get('unhandledrejection') || []).length === 1, 'one rejection listener must be installed');

const environment = context.GameDiagnostics.getEnvironment();
expect(!Number.isNaN(Date.parse(environment.capturedAt)), 'environment timestamp must be ISO formatted');
expect(environment.app?.version === '8.0', 'app version must be read without exposing title text');
expect(environment.app?.buildCommit === '', 'unknown build commit must stay empty');
expect(environment.page?.url === 'https://example.test/game/index.html', 'page URL must omit query and fragment');
expect(environment.page?.screen === 'home', 'active screen id was not collected');
expect(environment.runtime?.browser === 'Chrome', 'browser must be reduced to a broad family');
expect(environment.runtime?.os === 'Android', 'OS must be reduced to a broad family');
expect(environment.runtime?.deviceClass === 'mobile', 'mobile device class was not detected');
expect(environment.runtime?.online === true, 'online state was not collected');
expect(environment.viewport?.width === 412 && environment.viewport?.height === 915, 'viewport dimensions are incorrect');
expect(environment.viewport?.pixelRatio === 2.625, 'pixel ratio is incorrect');
expect(environment.screen?.width === 1080 && environment.screen?.height === 2340, 'screen dimensions are incorrect');
const serializedEnvironment = JSON.stringify(environment);
expect(!serializedEnvironment.includes('private'), 'environment must not retain private URL or user-agent text');
expect(!serializedEnvironment.includes('secret'), 'environment must not retain URL fragments or query values');
expect(!serializedEnvironment.includes('140.0.0.0'), 'environment must not retain browser versions');
expect(!serializedEnvironment.includes('cookie'), 'environment must not include cookies');

context.document.body.classList.contains = value => value === 'title-mode';
expect(context.GameDiagnostics.getEnvironment().page?.screen === 'titleScreen', 'title screen must be detected');
context.document.body.classList.contains = () => false;
context.document.querySelector = selector => selector === '.screen.active' ? { id: 'unsafe id with spaces' } : null;
expect(context.GameDiagnostics.getEnvironment().page?.screen === '', 'unsafe screen ids must be discarded');

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
expect(!index.includes(String.raw`</script>\\n<script`), 'index must not contain literal newline escape text');
expect(!source.includes('mb_v95c'), 'diagnostics must not read or change the save key');
expect(!source.includes('localStorage'), 'Phase 2 diagnostics must remain memory-only');
expect(!source.includes('.cookie'), 'diagnostics must not read cookies');

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('Diagnostics environment collector passed');
