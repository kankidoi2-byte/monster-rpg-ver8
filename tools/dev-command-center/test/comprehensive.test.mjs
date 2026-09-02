import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGitHubRepositoryReader } from '../src/github-reader.mjs';
import { createGitHubActionsReader } from '../src/github-actions-reader.mjs';
import { createGitHubPagesReader } from '../src/github-pages-reader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const manifest = JSON.parse(await readFile(path.join(root, 'docs/dev-tools-phase22-verification.json'), 'utf8'));
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

expect(manifest.schema_version === 1, 'verification schema version must be 1');
expect(manifest.phase === 22, 'verification manifest must target Phase 22');

for (const item of [
  'runtime_boundary', 'authentication_failure', 'rate_limit_failure', 'repository_partial_failure',
  'actions_job_partial_failure', 'pages_partial_failure', 'stale_status', 'mobile_360_layout',
  'secret_non_disclosure', 'least_privilege_readers', 'explicit_issue_confirmation',
  'one_time_issue_authorization', 'no_automatic_issue_post'
]) expect(manifest.scope?.includes(item), `verification scope is missing: ${item}`);

const expectedChecks = new Map([
  ['foundation', 'tools/dev-command-center/test/foundation.test.mjs'],
  ['repository_reader', 'tools/dev-command-center/test/github-reader.test.mjs'],
  ['actions_reader', 'tools/dev-command-center/test/github-actions-reader.test.mjs'],
  ['pages_reader', 'tools/dev-command-center/test/github-pages-reader.test.mjs'],
  ['unified_status', 'tools/dev-command-center/test/unified-status.test.mjs'],
  ['mobile_dashboard', 'tools/dev-command-center/test/dashboard.test.mjs'],
  ['issue_approval', 'tools/dev-command-center/test/issue-publication-approval.test.mjs'],
  ['issue_writer', 'tools/dev-command-center/test/github-issue-writer.test.mjs']
]);
for (const check of manifest.automated_checks || []) {
  const expectedFile = expectedChecks.get(check.id);
  if (!expectedFile) {
    errors.push(`unexpected automated check: ${check.id}`);
    continue;
  }
  expect(check.command === `node ${expectedFile}`, `unsafe or unexpected command for ${check.id}`);
  const result = spawnSync(process.execPath, [path.join(root, expectedFile)], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env }
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  expect(result.status === 0, `${check.id} exited with status ${result.status}`);
  expect(result.stdout.includes(check.success_marker), `${check.id} success marker is missing`);
  expectedChecks.delete(check.id);
}
expect(expectedChecks.size === 0, `automated checks are missing: ${[...expectedChecks.keys()].join(', ')}`);

const authResponse = async () => new Response(JSON.stringify({ message: 'secret response must not escape' }), { status: 401 });
const repositoryReader = createGitHubRepositoryReader({ owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', fetchImpl: authResponse });
const actionsReader = createGitHubActionsReader({ owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', fetchImpl: authResponse });
await assert.rejects(() => repositoryReader.getSnapshot(), error => error.code === 'authentication_required');
await assert.rejects(() => actionsReader.getSnapshot(), error => error.code === 'authentication_required');
const pages = await createGitHubPagesReader({ owner: 'kankidoi2-byte', repository: 'monster-rpg-ver8', fetchImpl: authResponse }).getSnapshot();
expect(pages.site.reason_code === 'authentication_required', 'Pages site authentication failure must be fixed and safe');
expect(pages.latest_build.reason_code === 'authentication_required', 'Pages build authentication failure must be fixed and safe');
expect(!JSON.stringify(pages).includes('secret response'), 'GitHub error body must not escape');

const [repositorySource, actionsSource, pagesSource, writerSource, serverSource, dashboardSource, css] = await Promise.all([
  readFile(path.join(root, 'tools/dev-command-center/src/github-reader.mjs'), 'utf8'),
  readFile(path.join(root, 'tools/dev-command-center/src/github-actions-reader.mjs'), 'utf8'),
  readFile(path.join(root, 'tools/dev-command-center/src/github-pages-reader.mjs'), 'utf8'),
  readFile(path.join(root, 'tools/dev-command-center/src/github-issue-writer.mjs'), 'utf8'),
  readFile(path.join(root, 'tools/dev-command-center/src/server.mjs'), 'utf8'),
  readFile(path.join(root, 'tools/dev-command-center/src/dashboard.mjs'), 'utf8'),
  readFile(path.join(root, 'tools/dev-command-center/dashboard.css'), 'utf8')
]);
for (const [name, source] of [['repository', repositorySource], ['actions', actionsSource], ['pages', pagesSource]]) {
  expect(source.includes("method: 'GET'"), `${name} reader must use GET`);
  expect(!source.includes("method: 'POST'"), `${name} reader must not contain POST`);
  expect(!source.includes("method: 'PATCH'"), `${name} reader must not contain PATCH`);
  expect(!source.includes("method: 'DELETE'"), `${name} reader must not contain DELETE`);
}
expect(writerSource.includes("method: 'POST'"), 'Issue writer must use its explicit POST path');
expect(writerSource.includes("DEV_COMMAND_CENTER_GITHUB_ISSUE_TOKEN"), 'Issue writer must use the separate server token');
expect(writerSource.includes('body: JSON.stringify({ title: draft.title, body: draft.body })'), 'Issue writer payload must remain title/body only');
expect(serverSource.includes('sameOriginForm(request)'), 'write forms must remain same-origin guarded');
expect(serverSource.includes('publicationConsumed = true'), 'Issue authorization must be consumed before the network call');
expect(serverSource.includes("form-action 'self'"), 'dashboard CSP must restrict form targets');

for (const required of [
  'name="viewport"', 'action="/issues/publication/confirm"', 'action="/issues/publication/cancel"'
]) expect(dashboardSource.includes(required), `dashboard contract is missing: ${required}`);
for (const required of [
  '* { box-sizing: border-box; }', 'width: min(100%, 72rem)',
  'minmax(min(100%, 15rem), 1fr)', 'min-width: 0', 'max-width: 100%',
  'min-height: 44px', 'overflow-wrap: anywhere', '@media (max-width: 480px)'
]) expect(css.includes(required), `mobile CSS contract is missing: ${required}`);

const approvedEvidence = (manifest.device_evidence || []).filter(item => item.status === 'approved');
const evidenceCoverage = new Set(approvedEvidence.flatMap(item => item.covers || []));
for (const item of ['mobile_360_layout', 'refresh', 'source_links', 'no_horizontal_overflow']) {
  expect(evidenceCoverage.has(item), `approved mobile evidence is missing: ${item}`);
}
expect(approvedEvidence.every(item => ['Android', 'Chromebook'].includes(item.platform)), 'device evidence must use an approved platform');

expect(manifest.permission_boundary?.repository_actions_pages === 'GET only', 'readers must remain least privilege');
expect(manifest.permission_boundary?.issue_post_requires_fresh_confirmation === true, 'every Issue post must require confirmation');
expect(manifest.permission_boundary?.issue_confirmation_expires_after_ms === 300000, 'Issue confirmation must expire after five minutes');
expect(manifest.permission_boundary?.issue_authorization_one_time === true, 'Issue authorization must be one-time');
expect(manifest.permission_boundary?.automatic_issue_post === false, 'automatic Issue posting must remain disabled');
expect(manifest.permission_boundary?.background_issue_post === false, 'background Issue posting must remain disabled');
expect(manifest.compatibility?.game_runtime_changed === false, 'Phase 22 must not change game runtime');
expect(manifest.compatibility?.save_key === 'mb_v95c', 'save key compatibility must remain fixed');
expect(manifest.compatibility?.existing_ids_unchanged === true, 'existing IDs must remain unchanged');
expect(manifest.compatibility?.existing_save_fields_preserved === true, 'existing save fields must remain preserved');
expect(manifest.release_decision?.new_device_verification_required === false, 'test-only Phase 22 must not invent a new device-verification requirement');

if (errors.length) {
  console.error(`Development command center comprehensive validation failed (${errors.length} issue(s)):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}
console.log('Development command center comprehensive validation passed (authentication, API failures, mobile layout, permissions, and explicit one-time Issue approval).');
