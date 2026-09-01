import assert from 'node:assert/strict';
import {
  DIAGNOSTIC_IMPORT_LIMITS,
  importDiagnosticReport
} from '../src/diagnostic-import.mjs';

const now = new Date('2026-09-01T12:10:00.000Z');

function validReport() {
  return {
    version: 1,
    generatedAt: '2026-09-01T12:00:00.000Z',
    environment: {
      capturedAt: '2026-09-01T12:00:00.000Z',
      app: { version: '8.0', buildCommit: 'a'.repeat(40) },
      page: { url: 'https://kankidoi2-byte.github.io/monster-rpg-ver8/', screen: 'diagnosticsScreen' },
      runtime: { browser: 'Chrome', os: 'Android', deviceClass: 'mobile', online: true },
      viewport: { width: 360, height: 800, pixelRatio: 3 },
      screen: { width: 360, height: 800 }
    },
    save: { version: 1, available: true, monsters: { missingUidCount: 0, duplicateUidCount: 0 } },
    tutorial: { version: 1, available: true, issues: [] },
    alchemy: { version: 1, available: true, issues: [] },
    expedition: { version: 1, available: true, issues: [] },
    errors: {
      version: 1,
      limit: 20,
      count: 1,
      items: [{ kind: 'error', name: 'TypeError', message: 'render failed', source: '/js/app.js', count: 1 }]
    },
    health: { status: 'error', issueCount: 0, errorCount: 1, unavailableSections: [] }
  };
}

const original = validReport();
const before = JSON.stringify(original);
const accepted = importDiagnosticReport(original, { now });
assert.equal(accepted.validation.status, 'accepted');
assert.equal(accepted.validation.reason_code, 'report_accepted');
assert.equal(accepted.validation.report_version, 1);
assert.equal(accepted.imported_at, now.toISOString());
assert.equal(accepted.report.generated_at, original.generatedAt);
assert.equal(accepted.report.app.version, '8.0');
assert.equal(accepted.report.related_commit, 'a'.repeat(40));
assert.equal(accepted.report.context.screen, 'diagnosticsScreen');
assert.equal(accepted.report.context.device_class, 'mobile');
assert.equal(accepted.report.summary.health_status, 'error');
assert.equal(accepted.report.summary.error_count, 1);
assert.equal(accepted.report.sections.errors.count, 1);
assert.equal(JSON.stringify(original), before);
assert.equal(Object.isFrozen(accepted), true);
assert.equal(Object.isFrozen(accepted.report.summary.unavailable_sections), true);

const acceptedText = JSON.stringify(accepted);
for (const discarded of ['render failed', '/js/app.js', 'Chrome', 'Android', 'kankidoi2-byte.github.io']) {
  assert.equal(acceptedText.includes(discarded), false, `discarded field leaked: ${discarded}`);
}

const fromJson = importDiagnosticReport(JSON.stringify(validReport()), { now });
assert.equal(fromJson.validation.status, 'accepted');

const unavailable = validReport();
unavailable.save.available = false;
unavailable.health.status = 'warning';
unavailable.health.errorCount = 0;
unavailable.errors.count = 0;
unavailable.errors.items = [];
unavailable.health.unavailableSections = ['save'];
const unavailableResult = importDiagnosticReport(unavailable, { now });
assert.equal(unavailableResult.validation.status, 'accepted');
assert.deepEqual(unavailableResult.report.summary.unavailable_sections, ['save']);

const unsupported = validReport();
unsupported.version = 2;
assert.equal(importDiagnosticReport(unsupported, { now }).validation.reason_code, 'unsupported_report_version');

const missing = validReport();
delete missing.environment.app;
assert.equal(importDiagnosticReport(missing, { now }).validation.reason_code, 'required_field_missing');

const badTime = validReport();
badTime.generatedAt = 'not-a-time';
assert.equal(importDiagnosticReport(badTime, { now }).validation.reason_code, 'invalid_generated_at');

const queryUrl = validReport();
queryUrl.environment.page.url += '?token=redacted';
assert.equal(importDiagnosticReport(queryUrl, { now }).validation.reason_code, 'url_details_forbidden');

const uid = validReport();
uid.save.instanceUid = 'private-member-uid';
assert.equal(importDiagnosticReport(uid, { now }).validation.reason_code, 'sensitive_field_present');

const secretKey = validReport();
secretKey.apiKey = 'not-retained';
assert.equal(importDiagnosticReport(secretKey, { now }).validation.reason_code, 'sensitive_field_present');

const secretValue = validReport();
secretValue.errors.items[0].message = 'token=super-secret-value';
assert.equal(importDiagnosticReport(secretValue, { now }).validation.reason_code, 'sensitive_value_present');

const mismatchedCounts = validReport();
mismatchedCounts.errors.count = 0;
assert.equal(importDiagnosticReport(mismatchedCounts, { now }).validation.reason_code, 'inconsistent_counts');

const mismatchedStatus = validReport();
mismatchedStatus.health.status = 'ok';
assert.equal(importDiagnosticReport(mismatchedStatus, { now }).validation.reason_code, 'inconsistent_health_status');

const inconsistentSections = validReport();
inconsistentSections.save.available = false;
assert.equal(importDiagnosticReport(inconsistentSections, { now }).validation.reason_code, 'inconsistent_sections');

assert.equal(importDiagnosticReport('{', { now }).validation.reason_code, 'invalid_json');
assert.equal(importDiagnosticReport('x'.repeat(DIAGNOSTIC_IMPORT_LIMITS.max_source_bytes + 1), { now }).validation.reason_code, 'input_too_large');

const cyclic = validReport();
cyclic.self = cyclic;
assert.equal(importDiagnosticReport(cyclic, { now }).validation.reason_code, 'invalid_json_value');

const hostile = new Proxy({}, { ownKeys() { throw new Error('token=must-not-leak'); } });
const hostileResult = importDiagnosticReport(hostile, { now });
assert.equal(hostileResult.validation.status, 'rejected');
assert.equal(JSON.stringify(hostileResult).includes('must-not-leak'), false);

const oddFields = validReport();
oddFields.environment.app.version = 'private version';
oddFields.environment.app.buildCommit = 'private commit';
oddFields.environment.page.screen = '<script>secret</script>';
oddFields.environment.runtime.deviceClass = 'private device';
const normalized = importDiagnosticReport(oddFields, { now });
assert.equal(normalized.validation.status, 'accepted');
assert.equal(normalized.report.app.version, 'unknown');
assert.equal(normalized.report.app.build_commit, '');
assert.equal(normalized.report.context.screen, 'unknown');
assert.equal(normalized.report.context.device_class, 'unknown');
assert.equal(JSON.stringify(normalized).includes('private'), false);

console.log('Development command center diagnostic import validation passed.');
