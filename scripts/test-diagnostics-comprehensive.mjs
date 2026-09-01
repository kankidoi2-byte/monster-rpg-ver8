import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/dev-tools-phase10-verification.json'), 'utf8'));
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

expect(manifest.schema_version === 1, 'verification schema version must be 1');
expect(manifest.phase === 10, 'verification manifest must target Phase 10');

const requiredScope = [
  'error_capture', 'environment_summary', 'save_summary', 'tutorial_summary',
  'alchemy_summary', 'expedition_summary', 'report_generation', 'mobile_ui',
  'copy', 'json_download', 'os_share', 'legacy_save'
];
for (const item of requiredScope) expect(manifest.scope?.includes(item), `verification scope is missing: ${item}`);

const expectedChecks = new Map([
  ['diagnostics_core', 'scripts/test-diagnostics.mjs'],
  ['legacy_save_compatibility', 'scripts/test-save-migrations.mjs'],
  ['mobile_ui_contract', 'scripts/test-ui-contract.mjs'],
  ['diagnostics_export', 'scripts/test-diagnostics-export.mjs']
]);
for (const check of manifest.automated_checks || []) {
  const expectedFile = expectedChecks.get(check.id);
  if (!expectedFile) {
    errors.push(`unexpected automated check: ${check.id}`);
    continue;
  }
  expect(check.command === `node ${expectedFile}`, `unsafe or unexpected command for ${check.id}`);
  const result = spawnSync(process.execPath, [path.join(root, expectedFile)], { cwd: root, encoding: 'utf8', env: { ...process.env } });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  expect(result.status === 0, `${check.id} exited with status ${result.status}`);
  expect(result.stdout.includes(check.success_marker), `${check.id} success marker is missing`);
  expectedChecks.delete(check.id);
}
expect(expectedChecks.size === 0, `automated checks are missing: ${[...expectedChecks.keys()].join(', ')}`);

const approvedEvidence = (manifest.device_evidence || []).filter(item => item.status === 'approved');
const evidenceCoverage = new Set(approvedEvidence.flatMap(item => item.covers || []));
for (const item of ['mobile_ui', 'refresh', 'back_navigation', 'copy', 'json_download', 'os_share', 'share_cancel', 'narrow_viewport']) {
  expect(evidenceCoverage.has(item), `approved device evidence is missing: ${item}`);
}
expect(approvedEvidence.every(item => ['Android', 'Chromebook'].includes(item.platform)), 'device evidence must use an approved platform');

expect(manifest.compatibility?.save_key === 'mb_v95c', 'save key compatibility is not fixed');
expect(manifest.compatibility?.existing_ids_unchanged === true, 'existing ID compatibility is not confirmed');
expect(manifest.compatibility?.existing_save_fields_preserved === true, 'existing save fields are not confirmed');
expect(manifest.compatibility?.diagnostics_read_only === true, 'diagnostics must remain read-only');
expect(manifest.compatibility?.automatic_external_transmission === false, 'automatic external transmission must remain disabled');
expect(manifest.release_decision?.new_device_verification_required === false, 'test-only Phase 10 must not invent a new device-verification requirement');

const saveSource = fs.readFileSync(path.join(root, 'js/save.js'), 'utf8');
expect(saveSource.includes("const SAVE_KEY = 'mb_v95c';"), 'runtime save key changed');

if (errors.length) {
  console.error(`Diagnostics comprehensive validation failed (${errors.length} issue(s)):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Diagnostics comprehensive validation passed (core report, legacy saves, mobile UI, export actions, and approved Android evidence).');
