const STATUS_LABELS = Object.freeze({
  healthy: '正常',
  in_progress: '作業中',
  awaiting_confirmation: '確認待ち',
  failed: '失敗',
  publish_pending: '公開待ち',
  stale: '情報が古い',
  unavailable: '取得不能'
});

const ACTION_LABELS = Object.freeze({
  inspect_failed_check: '失敗したチェックを確認',
  restore_source_access: '情報取得を復旧',
  refresh_status_sources: '状態を再取得',
  wait_for_ci_completion: 'CIの完了を待つ',
  wait_for_pages_publication: '公開の完了を待つ',
  review_open_pull_request: 'オープンPRを確認',
  no_action: '追加作業なし',
  restore_status_input: '状態入力を復旧'
});

const CI_STATUSES = new Set(['queued', 'in_progress', 'requested', 'waiting', 'pending', 'completed', 'unknown', 'not_observed']);
const CI_CONCLUSIONS = new Set(['success', 'failure', 'cancelled', 'timed_out', 'action_required', 'neutral', 'skipped', 'stale', 'startup_failure']);
const PAGE_STATUSES = new Set(['built', 'building', 'queued', 'errored', 'unknown']);
const SHA_PATTERN = /^[0-9a-f]{40}$/;
const IMPORT_REASON_LABELS = Object.freeze({
  report_accepted: '診断レポートを取り込みました',
  input_too_large: '入力サイズが上限を超えています',
  invalid_json: 'JSON形式を確認してください',
  invalid_input: '入力を確認してください',
  invalid_json_value: 'JSONに扱えない値があります',
  input_limit_exceeded: '入力の深さまたは要素数が上限を超えています',
  url_details_forbidden: 'queryまたはfragmentを含むURLは取り込めません',
  invalid_url: 'URL形式を確認してください',
  sensitive_field_present: '秘密情報または保存情報らしい項目を検出しました',
  sensitive_value_present: '秘密情報らしい値を検出しました',
  unsupported_report_version: '対応していない診断レポート版です',
  invalid_generated_at: '生成日時を確認してください',
  required_field_missing: '必須項目が不足しています',
  invalid_section: '診断セクションの形式を確認してください',
  invalid_error_section: 'エラー診断の形式を確認してください',
  inconsistent_counts: '診断件数が一致しません',
  invalid_health: '総合診断の形式を確認してください',
  invalid_unavailable_sections: '未取得セクションの形式を確認してください',
  inconsistent_sections: '未取得セクションの状態が一致しません',
  inconsistent_health_status: '総合状態と診断件数が一致しません'
});

function fixedValue(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback;
}

function safeSha(value) {
  const sha = String(value ?? '').toLowerCase();
  return SHA_PATTERN.test(sha) ? sha : '';
}

function safeCount(value) {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 && count <= 999 ? count : null;
}

function safeTimestamp(value) {
  const time = Date.parse(String(value ?? ''));
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
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

function safeLinks(values) {
  if (!Array.isArray(values)) return Object.freeze([]);
  const links = [];
  for (const value of values) {
    const link = safeLink(value);
    if (link && !links.includes(link)) links.push(link);
    if (links.length === 5) break;
  }
  return Object.freeze(links);
}

function japaneseTimestamp(iso) {
  if (!iso) return '未取得';
  const shifted = new Date(Date.parse(iso) + 9 * 60 * 60 * 1000).toISOString();
  return shifted.slice(0, 10) + ' ' + shifted.slice(11, 16) + ' JST';
}

function freezeViewModel(value) {
  Object.freeze(value.repository);
  Object.freeze(value.ci);
  Object.freeze(value.pages);
  Object.freeze(value.next_action);
  return Object.freeze(value);
}

function snapshotSignals(repository, actions, pages) {
  const commits = repository?.sections?.commits;
  const pullRequests = repository?.sections?.pull_requests;
  const mainSha = commits?.status === 'available' ? safeSha(commits.items?.[0]?.sha) : '';
  const runs = actions?.runs?.status === 'available' && Array.isArray(actions.runs.items) ? actions.runs.items : [];
  const run = runs.find(item => safeSha(item?.head_sha) === mainSha) || runs[0] || null;
  const site = pages?.site?.status === 'available' ? pages.site.value : null;
  const build = pages?.latest_build?.status === 'available' ? pages.latest_build.value : null;
  return {
    main_sha: mainSha,
    open_pull_request_count: pullRequests?.status === 'available' && Array.isArray(pullRequests.items)
      ? safeCount(pullRequests.items.length)
      : null,
    ci: {
      status: fixedValue(run?.status, CI_STATUSES, 'unknown'),
      conclusion: fixedValue(run?.conclusion, CI_CONCLUSIONS, null),
      head_sha: safeSha(run?.head_sha),
      matched_main: Boolean(mainSha && safeSha(run?.head_sha) === mainSha)
    },
    pages: {
      site_status: fixedValue(site?.status, PAGE_STATUSES, 'unknown'),
      build_status: fixedValue(build?.status, PAGE_STATUSES, 'unknown'),
      published_sha: safeSha(build?.published_sha)
    }
  };
}

export function buildDashboardViewModel(options = {}) {
  const unified = options.unifiedStatus;
  const nextAction = options.nextAction;
  const validUnified = unified?.schema_version === 1 && Object.hasOwn(STATUS_LABELS, unified?.status?.code);
  const statusCode = validUnified ? unified.status.code : 'unavailable';
  const unifiedSignals = validUnified && unified.signals && typeof unified.signals === 'object' ? unified.signals : {};
  const fallbackSignals = snapshotSignals(options.repositorySnapshot, options.actionsSnapshot, options.pagesSnapshot);
  const signals = {
    main_sha: safeSha(unifiedSignals.main_sha) || fallbackSignals.main_sha,
    open_pull_request_count: safeCount(unifiedSignals.open_pull_request_count) ?? fallbackSignals.open_pull_request_count,
    ci: {
      status: CI_STATUSES.has(unifiedSignals.ci?.status) ? unifiedSignals.ci.status : fallbackSignals.ci.status,
      conclusion: CI_CONCLUSIONS.has(unifiedSignals.ci?.conclusion) ? unifiedSignals.ci.conclusion : fallbackSignals.ci.conclusion,
      head_sha: safeSha(unifiedSignals.ci?.head_sha) || fallbackSignals.ci.head_sha,
      matched_main: unifiedSignals.ci?.matched_main === true || fallbackSignals.ci.matched_main
    },
    pages: {
      site_status: PAGE_STATUSES.has(unifiedSignals.pages?.site_status) ? unifiedSignals.pages.site_status : fallbackSignals.pages.site_status,
      build_status: PAGE_STATUSES.has(unifiedSignals.pages?.build_status) ? unifiedSignals.pages.build_status : fallbackSignals.pages.build_status,
      published_sha: safeSha(unifiedSignals.pages?.published_sha) || fallbackSignals.pages.published_sha
    }
  };
  const decision = nextAction?.schema_version === 1 && nextAction.decision && typeof nextAction.decision === 'object'
    ? nextAction.decision
    : {};
  const actionCode = Object.hasOwn(ACTION_LABELS, decision.action_code) ? decision.action_code : 'restore_status_input';
  const priority = Number.isSafeInteger(decision.priority) && decision.priority >= 1 && decision.priority <= 99
    ? decision.priority
    : 1;
  const observedAt = validUnified ? safeTimestamp(unified.status.observed_at) : null;

  return freezeViewModel({
    schema_version: 1,
    status: statusCode,
    status_label: STATUS_LABELS[statusCode],
    observed_at_utc: observedAt || '未取得',
    observed_at_jst: japaneseTimestamp(observedAt),
    repository: {
      main_sha: safeSha(signals.main_sha),
      open_pull_request_count: safeCount(signals.open_pull_request_count)
    },
    ci: {
      status: fixedValue(signals.ci?.status, CI_STATUSES, 'unknown'),
      conclusion: fixedValue(signals.ci?.conclusion, CI_CONCLUSIONS, null),
      head_sha: safeSha(signals.ci?.head_sha),
      matched_main: signals.ci?.matched_main === true
    },
    pages: {
      site_status: fixedValue(signals.pages?.site_status, PAGE_STATUSES, 'unknown'),
      build_status: fixedValue(signals.pages?.build_status, PAGE_STATUSES, 'unknown'),
      published_sha: safeSha(signals.pages?.published_sha)
    },
    next_action: {
      priority,
      action_code: actionCode,
      action_label: ACTION_LABELS[actionCode],
      blocking_status: Object.hasOwn(STATUS_LABELS, decision.blocking_status) ? decision.blocking_status : 'unavailable',
      source_links: safeLinks(decision.source_links)
    }
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function shortSha(value) {
  return value ? value.slice(0, 7) : '未取得';
}

function displayValue(value) {
  return value === null || value === '' || value === 'unknown' || value === 'not_observed' ? '未取得' : value;
}

function diagnosticImportHtml(value) {
  const validation = value?.schema_version === 1 && value.validation && typeof value.validation === 'object'
    ? value.validation
    : null;
  const accepted = validation?.status === 'accepted' && value.report?.schema_version === 1;
  const reason = Object.hasOwn(IMPORT_REASON_LABELS, validation?.reason_code)
    ? IMPORT_REASON_LABELS[validation.reason_code]
    : 'まだ診断レポートを取り込んでいません';
  const result = accepted ? `<div class="import-result import-accepted" role="status">
      <h3>${escapeHtml(reason)}</h3>
      <p>${escapeHtml(value.report.summary.text)}</p>
      <dl>
        <div><dt>生成日時</dt><dd>${escapeHtml(displayValue(value.report.generated_at))}</dd></div>
        <div><dt>アプリ版</dt><dd>${escapeHtml(displayValue(value.report.app.version))}</dd></div>
        <div><dt>関連コミット</dt><dd><code>${escapeHtml(shortSha(value.report.related_commit))}</code></dd></div>
        <div><dt>画面</dt><dd>${escapeHtml(displayValue(value.report.context.screen))}</dd></div>
        <div><dt>端末区分</dt><dd>${escapeHtml(displayValue(value.report.context.device_class))}</dd></div>
        <div><dt>検出件数</dt><dd>${escapeHtml(value.report.summary.issue_count)}</dd></div>
        <div><dt>エラー件数</dt><dd>${escapeHtml(value.report.summary.error_count)}</dd></div>
      </dl>
    </div>` : validation ? `<p class="import-result import-rejected" role="alert">${escapeHtml(reason)}</p>` : '';
  const clear = validation ? '<form method="post" action="/diagnostics/clear"><button class="button button-secondary" type="submit">取込結果を消去</button></form>' : '';
  return `<section class="diagnostic-import" aria-labelledby="diagnostic-import-title">
    <p class="eyebrow">端末内・手動操作のみ</p>
    <h2 id="diagnostic-import-title">診断レポート取込</h2>
    <p>ゲームの診断画面で保存したJSONを貼り付けます。元のJSONは保持せず、安全な要約だけを再起動または消去までメモリー内に置きます。</p>
    <form method="post" action="/diagnostics/import">
      <label for="diagnostic-report">診断JSON</label>
      <textarea id="diagnostic-report" name="report" maxlength="262144" required spellcheck="false" autocomplete="off"></textarea>
      <button class="button" type="submit">形式を確認して取り込む</button>
    </form>
    ${result}
    ${clear}
  </section>`;
}

function issueDraftHtml(value) {
  const generated = value?.schema_version === 1 && value.status === 'generated' && value.draft?.posting_status === 'not_posted';
  const notActionable = value?.schema_version === 1 && value.status === 'not_actionable';
  const rejected = value?.schema_version === 1 && value.status === 'rejected';
  let result = '';
  if (generated) {
    const draft = value.draft;
    const evidence = Array.isArray(draft.evidence) ? draft.evidence.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '';
    const reproduction = Array.isArray(draft.reproduction) ? draft.reproduction.map(item => `<li>${escapeHtml(item)}</li>`).join('') : '';
    const labels = Array.isArray(draft.labels) ? draft.labels.map(item => `<li><code>${escapeHtml(item)}</code></li>`).join('') : '';
    const links = Array.isArray(draft.source_links) && draft.source_links.length
      ? draft.source_links.map((link, index) => `<li><a href="${escapeHtml(link)}" rel="noreferrer">根拠リンク ${index + 1}</a></li>`).join('')
      : '<li>確認リンクなし</li>';
    result = `<div class="issue-draft-result" role="status">
      <p class="not-posted">未投稿の下書き</p>
      <h3>${escapeHtml(draft.title)}</h3>
      <h4>根拠</h4><ul>${evidence}</ul>
      <h4>再現条件</h4><ol>${reproduction}</ol>
      <h4>影響</h4><p>${escapeHtml(draft.impact)}</p>
      <h4>重複候補</h4><p>未確認（Phase 21で既存Issueと照合）</p>
      <h4>ラベル候補</h4><ul class="label-list">${labels}</ul>
      <h4>確認リンク</h4><ul>${links}</ul>
      <details><summary>GitHubへ貼り付ける本文</summary><pre>${escapeHtml(draft.body)}</pre></details>
    </div>`;
  } else if (notActionable) {
    result = '<p class="issue-draft-message" role="status">現在の状態ではIssue下書きは不要です。</p>';
  } else if (rejected) {
    result = '<p class="issue-draft-message issue-draft-error" role="alert">安全な下書きを生成できませんでした。最新状態を再取得してください。</p>';
  }
  const clear = value?.schema_version === 1
    ? '<form method="post" action="/issues/draft/clear"><button class="button button-secondary" type="submit">下書き結果を消去</button></form>'
    : '';
  return `<section class="issue-draft" aria-labelledby="issue-draft-title">
    <p class="eyebrow">端末内・未投稿</p>
    <h2 id="issue-draft-title">GitHub Issue下書き</h2>
    <p>固定された状態と安全な診断要約だけから下書きを生成します。GitHubへの投稿、外部通信、永続保存は行いません。</p>
    <form method="post" action="/issues/draft">
      <button class="button" type="submit">未投稿の下書きを生成</button>
    </form>
    ${result}
    ${clear}
  </section>`;
}

export function renderDashboardHtml(viewModel, diagnosticImport = null, issueDraft = null) {
  const view = buildDashboardViewModel({
    unifiedStatus: {
      schema_version: 1,
      status: { code: viewModel?.status, observed_at: viewModel?.observed_at_utc },
      signals: {
        main_sha: viewModel?.repository?.main_sha,
        open_pull_request_count: viewModel?.repository?.open_pull_request_count,
        ci: viewModel?.ci,
        pages: viewModel?.pages
      }
    },
    nextAction: {
      schema_version: 1,
      decision: {
        priority: viewModel?.next_action?.priority,
        action_code: viewModel?.next_action?.action_code,
        blocking_status: viewModel?.next_action?.blocking_status,
        source_links: viewModel?.next_action?.source_links
      }
    }
  });
  const links = view.next_action.source_links.length
    ? view.next_action.source_links.map((link, index) => `<li><a href="${escapeHtml(link)}" rel="noreferrer">確認先 ${index + 1}</a></li>`).join('')
    : '<li>確認リンクなし</li>';
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>モンスターバトルRPG 開発司令塔</title>
  <link rel="stylesheet" href="/dashboard.css">
</head>
<body>
  <a class="skip-link" href="#main">本文へ移動</a>
  <header class="topbar">
    <div><p class="eyebrow">MONSTER RPG</p><h1>開発司令塔</h1></div>
    <a class="refresh" href="/">最新状態を再取得</a>
  </header>
  <main id="main">
    <section class="hero" aria-labelledby="overall-title">
      <div><p class="eyebrow">総合状態</p><h2 id="overall-title">${escapeHtml(view.status_label)}</h2></div>
      <span class="status status-${escapeHtml(view.status)}">${escapeHtml(view.status)}</span>
    </section>
    <section class="next" aria-labelledby="next-title">
      <p class="eyebrow">次に確認すること・優先度 ${view.next_action.priority}</p>
      <h2 id="next-title">${escapeHtml(view.next_action.action_label)}</h2>
      <p>停止状態: ${escapeHtml(STATUS_LABELS[view.next_action.blocking_status])}</p>
    </section>
    <div class="grid" aria-label="開発状況の詳細">
      <section class="card"><h2>リポジトリ</h2><dl><div><dt>main</dt><dd><code>${escapeHtml(shortSha(view.repository.main_sha))}</code></dd></div><div><dt>オープンPR</dt><dd>${escapeHtml(displayValue(view.repository.open_pull_request_count))}</dd></div></dl></section>
      <section class="card"><h2>自動チェック</h2><dl><div><dt>状態</dt><dd>${escapeHtml(displayValue(view.ci.status))}</dd></div><div><dt>結果</dt><dd>${escapeHtml(displayValue(view.ci.conclusion))}</dd></div><div><dt>対象</dt><dd><code>${escapeHtml(shortSha(view.ci.head_sha))}</code></dd></div></dl></section>
      <section class="card"><h2>公開</h2><dl><div><dt>サイト</dt><dd>${escapeHtml(displayValue(view.pages.site_status))}</dd></div><div><dt>ビルド</dt><dd>${escapeHtml(displayValue(view.pages.build_status))}</dd></div><div><dt>公開対象</dt><dd><code>${escapeHtml(shortSha(view.pages.published_sha))}</code></dd></div></dl></section>
      <section class="card"><h2>更新時刻</h2><dl><div><dt>日本時間</dt><dd>${escapeHtml(view.observed_at_jst)}</dd></div><div><dt>UTC</dt><dd>${escapeHtml(view.observed_at_utc)}</dd></div></dl></section>
    </div>
    <details class="sources"><summary>確認リンク</summary><ul>${links}</ul></details>
    ${diagnosticImportHtml(diagnosticImport)}
    ${issueDraftHtml(issueDraft)}
  </main>
  <footer>GitHub書き込み・外部送信・永続保存なし</footer>
</body>
</html>`;
}
