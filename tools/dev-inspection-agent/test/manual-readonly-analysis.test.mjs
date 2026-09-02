import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyzeManualSnapshot, MANUAL_ANALYSIS_LIMITS } from '../src/manual-readonly-analysis.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(root, 'test/fixtures/healthy.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const now = '2026-09-02T03:01:00.000Z';

const result = analyzeManualSnapshot(fixture, { now });
assert.equal(result.schema_version, 1);
assert.equal(result.phase, 24);
assert.equal(result.mode, 'manual_read_only');
assert.equal(result.status.code, 'healthy');
assert.equal(result.decision.action_code, 'no_action');
assert.equal(result.signals.main_sha, 'a'.repeat(40));
assert.deepEqual(result.decision.source_links, [
  'https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/396',
  'https://kankidoi2-byte.github.io/monster-rpg-ver8/'
]);
assert.deepEqual(result.side_effects, {
  network_requests: false,
  file_writes: false,
  github_writes: false,
  workflow_actions: false,
  external_messages: false,
  paid_actions: false
});
assert.equal(JSON.stringify(result).includes('must-not-appear'), false);
assert.equal(JSON.stringify(result).includes('token'), false);
assert.equal(Object.isFrozen(result), true);
assert.equal(Object.isFrozen(result.side_effects), true);

const failedInput = structuredClone(fixture);
failedInput.actions_snapshot.runs.items[0].conclusion = 'failure';
const failed = analyzeManualSnapshot(failedInput, { now });
assert.equal(failed.status.code, 'failed');
assert.equal(failed.status.reason_code, 'ci_failed');
assert.equal(failed.decision.action_code, 'inspect_failed_check');
assert.equal(failed.side_effects.github_writes, false);

const invalid = analyzeManualSnapshot({
  schema_version: 2,
  mode: 'automatic',
  secret: 'do-not-copy'
}, { now });
assert.equal(invalid.status.code, 'unavailable');
assert.equal(invalid.decision.action_code, 'restore_source_access');
assert.equal(JSON.stringify(invalid).includes('do-not-copy'), false);

const original = JSON.stringify(fixture);
analyzeManualSnapshot(fixture, { now });
assert.equal(JSON.stringify(fixture), original);
assert.deepEqual(MANUAL_ANALYSIS_LIMITS, { max_input_bytes: 262144, max_source_links: 5 });

const cliOutput = execFileSync(process.execPath, [
  path.join(root, 'src/manual-analysis-cli.mjs'),
  '--input', fixturePath,
  '--now', now
], { encoding: 'utf8' });
const cliResult = JSON.parse(cliOutput);
assert.equal(cliResult.status.code, 'healthy');
assert.equal(cliResult.decision.action_code, 'no_action');
assert.equal(cliResult.side_effects.network_requests, false);

const analyzerSource = fs.readFileSync(path.join(root, 'src/manual-readonly-analysis.mjs'), 'utf8');
const cliSource = fs.readFileSync(path.join(root, 'src/manual-analysis-cli.mjs'), 'utf8');
for (const forbidden of ['fetch(', 'http:', 'https:', 'writeFile', 'appendFile', 'unlink', 'rmSync', 'child_process', 'process.env']) {
  assert.equal(analyzerSource.includes(forbidden), false, `analyzer must not contain ${forbidden}`);
  assert.equal(cliSource.includes(forbidden), false, `CLI must not contain ${forbidden}`);
}
for (const forbidden of ['POST', 'PUT', 'PATCH', 'DELETE', 'issues:write', 'workflows:write']) {
  const declaration = forbidden.includes(':')
    ? (analyzerSource + cliSource).includes(forbidden)
    : new RegExp(`\\b${forbidden}\\b`).test(analyzerSource + cliSource);
  assert.equal(declaration, false, `manual path must not declare ${forbidden}`);
}

console.log('Development inspection agent manual read-only analysis validation passed.');
