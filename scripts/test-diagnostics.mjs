import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'js/diagnostics.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tutorialSource = fs.existsSync(path.join(root, 'js/tutorial.js'))
  ? fs.readFileSync(path.join(root, 'js/tutorial.js'), 'utf8')
  : '';
const alchemySource = fs.existsSync(path.join(root, 'js/alchemy.js'))
  ? fs.readFileSync(path.join(root, 'js/alchemy.js'), 'utf8')
  : '';
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
expect(context.GameDiagnostics?.saveSummaryVersion === 1, 'save summary schema version is missing');
expect(context.GameDiagnostics?.tutorialSummaryVersion === 1, 'tutorial summary schema version is missing');
expect(context.GameDiagnostics?.alchemySummaryVersion === 1, 'alchemy summary schema version is missing');
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

const sparseContext = {
  URL,
  location: { href: 'not-a-url' },
  addEventListener() {}
};
sparseContext.window = sparseContext;
vm.createContext(sparseContext);
vm.runInContext(source, sparseContext);
const sparseEnvironment = sparseContext.GameDiagnostics.getEnvironment();
expect(sparseEnvironment.page?.url === '', 'invalid page URLs must be discarded');
expect(sparseEnvironment.runtime?.browser === 'Other' && sparseEnvironment.runtime?.os === 'Other', 'missing runtime details must use broad fallbacks');
expect(sparseEnvironment.runtime?.deviceClass === 'unknown', 'missing device signals must not be guessed');
expect(sparseEnvironment.runtime?.online === null, 'missing online state must stay unknown');
expect(sparseEnvironment.viewport?.width === null && sparseEnvironment.screen?.width === null, 'missing dimensions must stay null');

expect(context.GameDiagnostics.getSaveSummary().available === false, 'save summary must be unavailable before provider registration');
const saveFixture = {
  schemaVersion: 4,
  saveMeta: { migrations: ['v1', 'v2'], lastSavedAt: '2026-09-01T00:00:00Z', integrityHash: 'private-hash' },
  instances: [
    { uid: 'uid-secret-1', id: 'monster-secret-a', level: 10 },
    { uid: 'uid-secret-1', id: 'monster-secret-b', level: 20 },
    { uid: '', id: 'monster-secret-a', level: 30 },
    null
  ],
  party: ['uid-secret-1', 'missing-secret'],
  items: { potion: 3, secret_item: 2, empty_item: 0, invalid_item: 'many' },
  coins: 123,
  skillCards: { secret_skill: 4 },
  caught: ['monster-secret-a', 'monster-secret-b'],
  itemDex: ['potion'],
  mapDex: ['secret-map'],
  expeditions: { completedCount: 2, active: [{ id: 'expedition-secret' }] },
  quarantine: { unknownInstances: [{}], unknownCaughtIds: ['unknown-secret'], invalidExpeditions: [{ id: 'invalid-secret' }] },
  progress: { tutorial: { playerName: 'Private Player' }, storyFlags: { secretStory: true } },
  history: { logs: ['private free text'] }
};
expect(context.GameDiagnostics.registerSaveProvider(() => saveFixture) === true, 'save provider registration failed');
expect(context.GameDiagnostics.registerSaveProvider(() => ({})) === false, 'save provider must not be replaceable');
const saveSummary = context.GameDiagnostics.getSaveSummary();
expect(saveSummary.version === 1 && saveSummary.available === true && saveSummary.schemaVersion === 4, 'save summary header is incorrect');
expect(saveSummary.saveMeta?.migrationCount === 2 && saveSummary.saveMeta?.hasLastSavedAt === true && saveSummary.saveMeta?.hasIntegrityHash === true, 'save metadata summary is incorrect');
expect(saveSummary.monsters?.instanceCount === 4, 'instance count is incorrect');
expect(saveSummary.monsters?.distinctSpeciesCount === 2, 'distinct species count is incorrect');
expect(saveSummary.monsters?.missingUidCount === 1 && saveSummary.monsters?.duplicateUidCount === 1 && saveSummary.monsters?.invalidInstanceCount === 1, 'instance integrity counts are incorrect');
expect(saveSummary.party?.memberCount === 2 && saveSummary.party?.missingReferenceCount === 1, 'party summary is incorrect');
expect(saveSummary.economy?.coins === 123 && saveSummary.economy?.itemTypeCount === 2 && saveSummary.economy?.totalItemCount === 5, 'item and coin summary is incorrect');
expect(saveSummary.economy?.skillCardTypeCount === 1 && saveSummary.economy?.totalSkillCardCount === 4, 'skill card summary is incorrect');
expect(saveSummary.collections?.caughtCount === 2 && saveSummary.collections?.itemDexCount === 1 && saveSummary.collections?.mapDexCount === 1, 'collection summary is incorrect');
expect(saveSummary.expeditions?.completedCount === 2 && saveSummary.expeditions?.activeCount === 1, 'expedition counts are incorrect');
expect(saveSummary.quarantine?.unknownInstanceCount === 1 && saveSummary.quarantine?.unknownCaughtIdCount === 1 && saveSummary.quarantine?.invalidExpeditionCount === 1, 'quarantine counts are incorrect');
const serializedSaveSummary = JSON.stringify(saveSummary);
for (const forbidden of ['uid-secret', 'monster-secret', 'secret_item', 'secret_skill', 'secret-map', 'Private Player', 'private free text', 'private-hash']) {
  expect(!serializedSaveSummary.includes(forbidden), `save summary leaked forbidden value: ${forbidden}`);
}

const hostileContext = { URL, addEventListener() {} };
hostileContext.window = hostileContext;
vm.createContext(hostileContext);
vm.runInContext(source, hostileContext);
hostileContext.GameDiagnostics.registerSaveProvider(() => new Proxy({}, { get() { throw new Error('blocked'); } }));
const hostileSummary = hostileContext.GameDiagnostics.getSaveSummary();
expect(hostileSummary.available === true && hostileSummary.schemaVersion === null, 'throwing save getters must produce a safe fixed summary');

expect(context.GameDiagnostics.getTutorialSummary().available === false, 'tutorial summary must be unavailable before provider registration');
const tutorialFixture = {
  status: 'in_progress',
  completed: false,
  skipped: false,
  replaying: false,
  active: true,
  paused: false,
  persistedStepId: 'battle_target',
  flowId: 'prologue',
  stepId: 'battle_target',
  stepIndex: 14,
  stepCount: 72,
  waitingMode: 'target_action',
  waitForEvent: '',
  input: '',
  continueAt: '',
  targetRequired: true,
  targetPresent: false,
  transitionPending: false,
  expectedScreen: 'battle',
  activeScreen: 'home',
  playerName: 'Private Player',
  dialogue: 'private free text'
};
expect(context.GameDiagnostics.registerTutorialProvider(() => tutorialFixture) === true, 'tutorial provider registration failed');
expect(context.GameDiagnostics.registerTutorialProvider(() => ({})) === false, 'tutorial provider must not be replaceable');
const tutorialSummary = context.GameDiagnostics.getTutorialSummary();
expect(tutorialSummary.version === 1 && tutorialSummary.available === true, 'tutorial summary header is incorrect');
expect(tutorialSummary.state?.status === 'in_progress' && tutorialSummary.state?.stepId === 'battle_target', 'tutorial stage is incorrect');
expect(tutorialSummary.waiting?.mode === 'target_action' && tutorialSummary.waiting?.targetRequired === true, 'tutorial waiting action is incorrect');
expect(tutorialSummary.screen?.matches === false, 'tutorial screen mismatch was not detected');
expect(tutorialSummary.issues?.includes('screen_mismatch') && tutorialSummary.issues?.includes('missing_target'), 'tutorial contradictions were not reported');
expect(!JSON.stringify(tutorialSummary).includes('Private Player'), 'tutorial summary leaked a player name');
expect(!JSON.stringify(tutorialSummary).includes('private free text'), 'tutorial summary leaked dialogue text');

const hostileTutorialContext = { URL, addEventListener() {} };
hostileTutorialContext.window = hostileTutorialContext;
vm.createContext(hostileTutorialContext);
vm.runInContext(source, hostileTutorialContext);
hostileTutorialContext.GameDiagnostics.registerTutorialProvider(() => new Proxy({}, { get() { throw new Error('blocked'); } }));
const hostileTutorialSummary = hostileTutorialContext.GameDiagnostics.getTutorialSummary();
expect(hostileTutorialSummary.available === true && hostileTutorialSummary.state?.status === 'unknown', 'throwing tutorial getters must produce a safe fixed summary');

expect(context.GameDiagnostics.getAlchemySummary().available === false, 'alchemy summary must be unavailable before provider registration');
const alchemyFixture = {
  stage: 'processing',
  busy: false,
  visible: true,
  tutorialLesson: false,
  resultKind: 'none',
  nextAction: 'execute',
  mode: 'normal',
  recipeValid: true,
  materialSlotCount: 4,
  materialUnitCount: 6,
  catalystRequired: true,
  catalystSelected: true,
  coinOptionValid: true,
  successCandidateCount: 0,
  failureCandidateCount: 0,
  validationErrorCount: 1,
  canExecute: true,
  recipeId: 'private-recipe-id',
  catalystUid: 'private-catalyst-uid',
  materialIds: ['private-item-id'],
  errorMessage: 'private free text'
};
expect(context.GameDiagnostics.registerAlchemyProvider(() => alchemyFixture) === true, 'alchemy provider registration failed');
expect(context.GameDiagnostics.registerAlchemyProvider(() => ({})) === false, 'alchemy provider must not be replaceable');
const alchemySummary = context.GameDiagnostics.getAlchemySummary();
expect(alchemySummary.version === 1 && alchemySummary.available === true, 'alchemy summary header is incorrect');
expect(alchemySummary.state?.stage === 'processing' && alchemySummary.state?.nextAction === 'execute', 'alchemy stage or next action is incorrect');
expect(alchemySummary.selection?.materialSlotCount === 4 && alchemySummary.selection?.materialUnitCount === 6, 'alchemy material counts are incorrect');
expect(alchemySummary.issues?.includes('processing_without_busy'), 'alchemy busy contradiction was not detected');
expect(alchemySummary.issues?.includes('executable_with_errors'), 'alchemy validation contradiction was not detected');
expect(alchemySummary.issues?.includes('executable_without_success_candidate'), 'alchemy candidate contradiction was not detected');
const serializedAlchemySummary = JSON.stringify(alchemySummary);
for (const forbidden of ['private-recipe-id', 'private-catalyst-uid', 'private-item-id', 'private free text']) {
  expect(!serializedAlchemySummary.includes(forbidden), `alchemy summary leaked forbidden value: ${forbidden}`);
}

const hostileAlchemyContext = { URL, addEventListener() {} };
hostileAlchemyContext.window = hostileAlchemyContext;
vm.createContext(hostileAlchemyContext);
vm.runInContext(source, hostileAlchemyContext);
hostileAlchemyContext.GameDiagnostics.registerAlchemyProvider(() => new Proxy({}, { get() { throw new Error('blocked'); } }));
const hostileAlchemySummary = hostileAlchemyContext.GameDiagnostics.getAlchemySummary();
expect(hostileAlchemySummary.available === true && hostileAlchemySummary.state?.stage === 'unknown', 'throwing alchemy getters must produce a safe fixed summary');

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
expect(!source.includes('localStorage'), 'Phase 3 diagnostics must remain memory-only');
expect(!source.includes('.cookie'), 'diagnostics must not read cookies');
if (tutorialSource) {
  expect(tutorialSource.includes('registerTutorialProvider?.(tutorialDiagnosticsSnapshot)'), 'tutorial runtime must register its diagnostics provider');
}
if (alchemySource) {
  expect(alchemySource.includes('registerAlchemyProvider?.(alchemyDiagnosticsSnapshot)'), 'alchemy runtime must register its diagnostics provider');
}

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('Diagnostics alchemy summary passed');
