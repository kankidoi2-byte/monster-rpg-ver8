const SHA_PATTERN = /^[0-9a-f]{40}$/;
const STATUS_CODES = new Set([
  'healthy',
  'in_progress',
  'awaiting_confirmation',
  'failed',
  'publish_pending',
  'stale',
  'unavailable'
]);
const HEALTH_STATUSES = new Set(['ok', 'warning', 'error']);
const DEVICE_CLASSES = new Set(['mobile', 'tablet', 'desktop', 'unknown']);
const SECTION_NAMES = new Set(['save', 'tutorial', 'alchemy', 'expedition']);
const CI_STATUSES = new Set(['queued', 'in_progress', 'requested', 'waiting', 'pending', 'completed', 'unknown', 'not_observed']);
const CI_CONCLUSIONS = new Set(['success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral', 'skipped', 'stale', 'startup_failure']);
const ACTION_CODES = new Set(['inspect_failed_check', 'restore_source_access', 'refresh_status_sources', 'wait_for_ci_completion', 'wait_for_pages_publication', 'review_open_pull_request', 'no_action', 'restore_status_input']);
const TOKEN_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/;
const VERSION_PATTERN = /^[0-9]+(?:\.[0-9]+){0,3}$/;

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function safeTimestamp(value) {
  const time = Date.parse(String(value ?? ''));
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function safeSha(value) {
  const sha = String(value ?? '').toLowerCase();
  return SHA_PATTERN.test(sha) ? sha : '';
}

function safeCount(value, maximum = 999) {
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : null;
}

function fixedValue(value, allowed) {
  return allowed.has(value) ? value : 'unknown';
}

function safeLink(value) {
  try {
    const url = new URL(String(value ?? ''));
    const host = url.hostname.toLowerCase();
    const allowed = host === 'github.com' || (host.endsWith('.github.io') && host !== 'github.io');
    if (url.protocol !== 'https:' || url.username || url.password || !allowed) return null;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function sourceLinks(view, mainSha) {
  const links = [];
  if (mainSha) links.push(`https://github.com/kankidoi2-byte/monster-rpg-ver8/commit/${mainSha}`);
  const candidates = Array.isArray(view?.next_action?.source_links) ? view.next_action.source_links : [];
  for (const candidate of candidates) {
    const link = safeLink(candidate);
    if (link && !links.includes(link)) links.push(link);
    if (links.length === 5) break;
  }
  return links;
}

function acceptedDiagnostic(value) {
  if (value?.schema_version !== 1 || value?.validation?.status !== 'accepted' || value?.report?.schema_version !== 1) return null;
  const report = value.report;
  const issueCount = safeCount(report.summary?.issue_count);
  const errorCount = safeCount(report.summary?.error_count, 20);
  const healthStatus = HEALTH_STATUSES.has(report.summary?.health_status) ? report.summary.health_status : null;
  if (issueCount === null || errorCount === null || !healthStatus) return null;
  const unavailable = Array.isArray(report.summary?.unavailable_sections)
    ? [...new Set(report.summary.unavailable_sections.filter(name => SECTION_NAMES.has(name)))].slice(0, 4)
    : [];
  return {
    generated_at: safeTimestamp(report.generated_at),
    version: VERSION_PATTERN.test(report.app?.version) ? report.app.version : 'unknown',
    commit: safeSha(report.related_commit),
    screen: TOKEN_PATTERN.test(report.context?.screen) ? report.context.screen : 'unknown',
    device_class: DEVICE_CLASSES.has(report.context?.device_class) ? report.context.device_class : 'unknown',
    health_status: healthStatus,
    issue_count: issueCount,
    error_count: errorCount,
    unavailable_sections: unavailable
  };
}

function markdown(title, evidence, reproduction, impact, duplicateCandidates, links) {
  const linkLines = links.length ? links.map(link => `- ${link}`).join('\n') : '- なし';
  return `## 根拠\n${evidence.map(item => `- ${item}`).join('\n')}\n\n## 再現条件\n${reproduction.map((item, index) => `${index + 1}. ${item}`).join('\n')}\n\n## 影響\n${impact}\n\n## 重複候補\n${duplicateCandidates.length ? duplicateCandidates.map(item => `- ${item}`).join('\n') : '- 未確認（Phase 21で既存Issueと照合）'}\n\n## 確認リンク\n${linkLines}\n\n---\nこのIssueは開発司令塔が生成した未投稿の下書きです。自動投稿されていません。`;
}

function result(status, reasonCode, generatedAt, draft = null) {
  return deepFreeze({ schema_version: 1, status, reason_code: reasonCode, generated_at: generatedAt, draft });
}

export function generateIssueDraft(view, diagnosticImport = null, options = {}) {
  const generatedAt = safeTimestamp(options.now instanceof Date ? options.now.toISOString() : options.now) || new Date(0).toISOString();
  if (view?.schema_version !== 1 || !STATUS_CODES.has(view?.status)) {
    return result('rejected', 'invalid_dashboard_status', generatedAt);
  }

  const mainSha = safeSha(view.repository?.main_sha);
  const diagnostic = acceptedDiagnostic(diagnosticImport);
  let title;
  let reasonCode;
  let evidence;
  let reproduction;
  let impact;
  let labels;

  if (diagnostic && (diagnostic.error_count > 0 || diagnostic.issue_count > 0 || diagnostic.unavailable_sections.length > 0)) {
    title = diagnostic.error_count > 0
      ? '[診断] ゲーム内エラーを確認'
      : '[診断] ゲーム状態の確認事項を調査';
    reasonCode = diagnostic.error_count > 0 ? 'diagnostic_errors_detected' : 'diagnostic_issues_detected';
    evidence = [
      `診断状態: ${diagnostic.health_status}`,
      `検出件数: ${diagnostic.issue_count}`,
      `エラー件数: ${diagnostic.error_count}`,
      `未取得セクション: ${diagnostic.unavailable_sections.length}`,
      `画面: ${diagnostic.screen}`,
      `端末区分: ${diagnostic.device_class}`,
      `アプリ版: ${diagnostic.version}`,
      `関連コミット: ${diagnostic.commit || '未取得'}`,
      `診断生成日時: ${diagnostic.generated_at || '未取得'}`
    ];
    reproduction = ['ゲーム内の診断画面を開く', '診断JSONを保存する', '開発司令塔へ手動で取り込む', '固定件数と状態を確認する'];
    impact = diagnostic.error_count > 0 ? 'ゲーム内でJavaScriptエラーが記録されている可能性があります。' : 'ゲーム状態に確認事項または未取得の診断項目があります。';
    labels = ['bug', 'needs-triage'];
  } else if (view.status === 'failed') {
    title = '[開発司令塔] 自動チェック失敗を調査';
    reasonCode = 'failed_status_detected';
    evidence = [`総合状態: ${view.status}`, `main: ${mainSha || '未取得'}`, `CI状態: ${fixedValue(view.ci?.status, CI_STATUSES)}`, `CI結果: ${fixedValue(view.ci?.conclusion, CI_CONCLUSIONS)}`];
    reproduction = ['開発司令塔を開く', '総合状態と自動チェック欄を確認する', '確認リンクから失敗したチェックを調査する'];
    impact = 'mainに対する自動チェックが成功していないため、安全な変更判定を続行できません。';
    labels = ['bug', 'needs-triage'];
  } else if (view.status === 'unavailable') {
    title = '[開発司令塔] 情報取得不能を調査';
    reasonCode = 'unavailable_status_detected';
    evidence = [`総合状態: ${view.status}`, `main: ${mainSha || '未取得'}`, `次の操作: ${fixedValue(view.next_action?.action_code, ACTION_CODES)}`];
    reproduction = ['開発司令塔を開く', '総合状態が取得不能であることを確認する', '情報源の接続状態を確認する'];
    impact = '必須情報を取得できず、現在の安全な作業状態を判定できません。';
    labels = ['bug', 'needs-triage'];
  } else if (view.status === 'stale') {
    title = '[開発司令塔] 古い状態情報を更新';
    reasonCode = 'stale_status_detected';
    evidence = [`総合状態: ${view.status}`, `main: ${mainSha || '未取得'}`, `観測日時: ${safeTimestamp(view.observed_at_utc) || '未取得'}`];
    reproduction = ['開発司令塔を開く', '総合状態が情報が古いであることを確認する', '最新状態を再取得する'];
    impact = '古い情報に基づく判断になるため、作業や公開の状態を確定できません。';
    labels = ['needs-triage'];
  } else {
    return result('not_actionable', 'no_issue_draft_needed', generatedAt);
  }

  const links = sourceLinks(view, mainSha);
  const duplicateCandidates = [];
  const draft = {
    posting_status: 'not_posted',
    title,
    evidence,
    reproduction,
    impact,
    duplicate_candidates: duplicateCandidates,
    labels,
    source_links: links,
    body: markdown(title, evidence, reproduction, impact, duplicateCandidates, links)
  };
  return result('generated', reasonCode, generatedAt, draft);
}
