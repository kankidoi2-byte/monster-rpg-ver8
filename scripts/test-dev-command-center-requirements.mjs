import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const requirements = JSON.parse(read('docs/dev-command-center-requirements.json'));
const guide = read('docs/dev-command-center-requirements.md');

const errors = [];
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};
const unique = values => new Set(values).size === values.length;

expect(requirements.schema_version === 1, 'requirements schema version must remain 1');
expect(requirements.system_id === 'monster-rpg-dev-command-center', 'stable command-center system id is missing');
expect(requirements.phase === 11 && requirements.status === 'requirements_defined', 'Phase 11 requirements state is invalid');

const screenIds = requirements.screens?.map(screen => screen.id) || [];
const requiredScreens = ['overview', 'pull_requests', 'automation', 'publication', 'diagnostics_import', 'issue_draft'];
expect(unique(screenIds), 'screen ids must be unique');
requiredScreens.forEach(id => expect(screenIds.includes(id), `required screen is missing: ${id}`));
expect(requirements.screens?.every(screen => screen.required === true && screen.shows?.length >= 5), 'every Phase 11 screen must define its visible contract');

const sourceIds = requirements.data_sources?.map(source => source.id) || [];
['github_repository', 'github_actions', 'github_pages', 'diagnostic_report'].forEach(id => {
  expect(sourceIds.includes(id), `required data source is missing: ${id}`);
});
expect(requirements.data_sources?.filter(source => source.id !== 'diagnostic_report').every(source => source.mode === 'read_only'), 'GitHub sources must begin read-only');
expect(requirements.data_sources?.find(source => source.id === 'diagnostic_report')?.mode === 'manual_import', 'diagnostic reports must begin as manual imports');

expect(requirements.deployment_boundary?.public_game?.includes('認証情報を持たず'), 'public game authentication boundary is missing');
expect(requirements.deployment_boundary?.private_command_center?.includes('非公開実行領域'), 'private execution boundary is missing');
expect(requirements.authentication?.phase11_mode === 'none', 'Phase 11 must not configure authentication');
expect(requirements.authentication?.client_token_storage_forbidden === true, 'client token storage must be forbidden');
expect(requirements.authentication?.tokens_in_repository_forbidden === true, 'repository token storage must be forbidden');
expect(requirements.authentication?.tokens_in_url_forbidden === true, 'URL token storage must be forbidden');
['Secure', 'HttpOnly', 'SameSite=Strict', 'short_lived'].forEach(flag => {
  expect(requirements.authentication?.session_cookie_requirements?.includes(flag), `future session requirement is missing: ${flag}`);
});

expect(requirements.permissions?.default === 'deny', 'permissions must default to deny');
expect(requirements.permissions?.initial?.every(permission => permission.endsWith(':read')), 'initial permissions must be read-only');
expect(requirements.permissions?.approval_gated?.length === 1 && requirements.permissions.approval_gated[0] === 'issues:write', 'only Issue writing may be approval-gated');
['contents:write', 'pull_requests:write', 'workflows:write', 'administration:write', 'secrets:write'].forEach(permission => {
  expect(requirements.permissions?.forbidden?.includes(permission), `forbidden permission is missing: ${permission}`);
});

['セーブ全文', '個体UID', 'Cookie', '認証トークン', 'APIキー', 'URL query', 'URL fragment'].forEach(value => {
  expect(requirements.privacy?.rejected_diagnostic_data?.includes(value), `rejected diagnostic data is missing: ${value}`);
});
expect(requirements.privacy?.external_transmission_default === false, 'diagnostics must not be transmitted by default');

const failureCodes = requirements.failure_states?.map(state => state.code) || [];
['auth_expired', 'rate_limited', 'partial_api_failure', 'stale_data', 'schema_unsupported', 'permission_denied'].forEach(code => {
  expect(failureCodes.includes(code), `safe failure behavior is missing: ${code}`);
});
expect(requirements.non_functional?.mobile_min_width_css_px === 360, 'mobile contract must begin at 360 CSS px');
expect(requirements.non_functional?.keyboard_access_required === true, 'keyboard accessibility is required');
expect(requirements.non_functional?.destructive_actions_in_ui === false, 'destructive UI actions must remain disabled');

const criterionIds = requirements.acceptance_criteria?.map(item => item.id) || [];
expect(criterionIds.length >= 6 && unique(criterionIds), 'acceptance criteria must be unique and complete');
const handoffPhases = requirements.phase_handoffs?.map(item => item.phase) || [];
expect(JSON.stringify(handoffPhases) === JSON.stringify(Array.from({length: 11}, (_, index) => index + 12)), 'Phase 12-22 handoffs must be complete and ordered');

['## システム境界', '## 必要画面', '## データ契約', '## 認証境界', '## 権限境界', '## 失敗時の挙動', '## Phase 11の完了条件'].forEach(heading => {
  expect(guide.includes(heading), `human-readable requirements heading is missing: ${heading}`);
});
expect(guide.includes('docs/dev-command-center-requirements.json'), 'human-readable guide must identify the machine-readable source of truth');
expect(guide.includes('js/notices-data.js') && guide.includes('更新しない'), 'notice decision must be documented');

if (errors.length) {
  console.error(`Command center requirements validation failed (${errors.length} issue(s)):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Command center requirements validation passed (${screenIds.length} screens, ${sourceIds.length} data sources, ${criterionIds.length} acceptance criteria).`);
