const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_DEPTH = 16;
const MAX_NODES = 10_000;
const MAX_ARRAY_LENGTH = 100;
const MAX_STRING_LENGTH = 2_048;
const MAX_ERROR_COUNT = 20;
const REPORT_VERSION = 1;
const HEALTH_STATUSES = new Set(['ok', 'warning', 'error']);
const DEVICE_CLASSES = new Set(['mobile', 'tablet', 'desktop', 'unknown']);
const SECTION_NAMES = Object.freeze(['save', 'tutorial', 'alchemy', 'expedition']);
const SECTION_SET = new Set(SECTION_NAMES);
const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;
const VERSION_PATTERN = /^[0-9]+(?:\.[0-9]+){0,3}$/;
const TOKEN_PATTERN = /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/;
const SECRET_VALUE_PATTERNS = Object.freeze([
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/i,
  /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(?:token|api[_-]?key|password|secret)\s*[:=]\s*[^\s,;]{4,}/i
]);

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function fixedResult(status, reasonCode, importedAt, report = null, reportVersion = null) {
  return deepFreeze({
    schema_version: 1,
    validation: { status, reason_code: reasonCode, report_version: reportVersion },
    imported_at: importedAt,
    report
  });
}

function safeTimestamp(value) {
  const time = Date.parse(String(value ?? ''));
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function safeImportedAt(value) {
  return safeTimestamp(value) || new Date(0).toISOString();
}

function integer(value, maximum = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : null;
}

function normalizeKey(value) {
  return String(value).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

function sensitiveKey(value) {
  const key = normalizeKey(value);
  if (!key) return false;
  if (/(?:token|apikey|password|passwd|cookie|authorization|secret|localstorage|sessionstorage)/.test(key)) return true;
  if (['query', 'fragment', 'savedata', 'rawsave', 'savejson', 'uid', 'instanceuid'].includes(key)) return true;
  return key.endsWith('uid') && !key.endsWith('uidcount');
}

function unsafeString(value) {
  if (value.length > MAX_STRING_LENGTH) return 'input_limit_exceeded';
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.search || url.hash || url.username || url.password) return 'url_details_forbidden';
    } catch (_error) {
      return 'invalid_url';
    }
  }
  return SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value)) ? 'sensitive_value_present' : null;
}

function inspectJsonTree(root) {
  const seen = new WeakSet();
  const stack = [{ value: root, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const { value, depth } = stack.pop();
    nodes += 1;
    if (nodes > MAX_NODES || depth > MAX_DEPTH) return 'input_limit_exceeded';
    if (value === null || typeof value === 'boolean' || typeof value === 'number') {
      if (typeof value === 'number' && !Number.isFinite(value)) return 'invalid_json_value';
      continue;
    }
    if (typeof value === 'string') {
      const reason = unsafeString(value);
      if (reason) return reason;
      continue;
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return 'invalid_json_value';
    seen.add(value);
    let keys;
    try {
      keys = Object.keys(value);
    } catch (_error) {
      return 'invalid_json_value';
    }
    if (Array.isArray(value) && value.length > MAX_ARRAY_LENGTH) return 'input_limit_exceeded';
    for (const key of keys) {
      if (sensitiveKey(key)) return 'sensitive_field_present';
      let child;
      try {
        child = value[key];
      } catch (_error) {
        return 'invalid_json_value';
      }
      stack.push({ value: child, depth: depth + 1 });
    }
  }
  return null;
}

function parseSource(input) {
  if (typeof input === 'string') {
    if (Buffer.byteLength(input, 'utf8') > MAX_SOURCE_BYTES) return { error: 'input_too_large' };
    try {
      return { value: JSON.parse(input) };
    } catch (_error) {
      return { error: 'invalid_json' };
    }
  }
  if (!input || typeof input !== 'object') return { error: 'invalid_input' };
  try {
    const serialized = JSON.stringify(input);
    if (typeof serialized !== 'string') return { error: 'invalid_input' };
    if (Buffer.byteLength(serialized, 'utf8') > MAX_SOURCE_BYTES) return { error: 'input_too_large' };
    return { value: JSON.parse(serialized) };
  } catch (_error) {
    return { error: 'invalid_json_value' };
  }
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function reportShape(source) {
  const environment = record(source.environment);
  const app = record(environment?.app);
  const page = record(environment?.page);
  const runtime = record(environment?.runtime);
  const errors = record(source.errors);
  const health = record(source.health);
  const sections = Object.fromEntries(SECTION_NAMES.map(name => [name, record(source[name])]));
  if (!environment || !app || !page || !runtime || !errors || !health || Object.values(sections).some(value => !value)) {
    return { error: 'required_field_missing' };
  }
  return { environment, app, page, runtime, errors, health, sections };
}

function validateSections(shape) {
  for (const name of SECTION_NAMES) {
    const section = shape.sections[name];
    if (section.version !== REPORT_VERSION || typeof section.available !== 'boolean') return 'invalid_section';
  }
  if (shape.errors.version !== REPORT_VERSION || shape.errors.limit !== MAX_ERROR_COUNT || !Array.isArray(shape.errors.items)) {
    return 'invalid_error_section';
  }
  const errorCount = integer(shape.errors.count, MAX_ERROR_COUNT);
  if (errorCount === null || errorCount !== shape.errors.items.length) return 'inconsistent_counts';
  return null;
}

function validateHealth(shape) {
  const status = shape.health.status;
  const issueCount = integer(shape.health.issueCount);
  const errorCount = integer(shape.health.errorCount, MAX_ERROR_COUNT);
  if (!HEALTH_STATUSES.has(status) || issueCount === null || errorCount === null || !Array.isArray(shape.health.unavailableSections)) {
    return 'invalid_health';
  }
  if (errorCount !== shape.errors.count) return 'inconsistent_counts';
  const unavailable = shape.health.unavailableSections;
  if (unavailable.length > SECTION_NAMES.length || unavailable.some(name => !SECTION_SET.has(name)) || new Set(unavailable).size !== unavailable.length) {
    return 'invalid_unavailable_sections';
  }
  const expectedUnavailable = SECTION_NAMES.filter(name => shape.sections[name].available !== true);
  if (expectedUnavailable.length !== unavailable.length || expectedUnavailable.some(name => !unavailable.includes(name))) {
    return 'inconsistent_sections';
  }
  const expectedStatus = errorCount > 0 ? 'error' : (issueCount > 0 || unavailable.length > 0 ? 'warning' : 'ok');
  return status === expectedStatus ? null : 'inconsistent_health_status';
}

function normalizedReport(source, shape) {
  const appVersion = VERSION_PATTERN.test(shape.app.version) ? shape.app.version : 'unknown';
  const buildCommit = SHA_PATTERN.test(shape.app.buildCommit) ? shape.app.buildCommit.toLowerCase() : '';
  const screen = TOKEN_PATTERN.test(shape.page.screen) ? shape.page.screen : 'unknown';
  const deviceClass = DEVICE_CLASSES.has(shape.runtime.deviceClass) ? shape.runtime.deviceClass : 'unknown';
  const unavailableSections = [...shape.health.unavailableSections];
  const statusLabel = { ok: '正常', warning: '要確認', error: 'エラーあり' }[shape.health.status];
  return {
    schema_version: REPORT_VERSION,
    generated_at: safeTimestamp(source.generatedAt),
    app: { version: appVersion, build_commit: buildCommit },
    related_commit: buildCommit,
    context: { screen, device_class: deviceClass },
    summary: {
      health_status: shape.health.status,
      issue_count: shape.health.issueCount,
      error_count: shape.health.errorCount,
      unavailable_sections: unavailableSections,
      text: `診断レポート v1（${statusLabel}）／検出${shape.health.issueCount}件／エラー${shape.health.errorCount}件`
    },
    sections: {
      environment: { available: true },
      save: { available: shape.sections.save.available },
      tutorial: { available: shape.sections.tutorial.available },
      alchemy: { available: shape.sections.alchemy.available },
      expedition: { available: shape.sections.expedition.available },
      errors: { available: true, count: shape.errors.count }
    }
  };
}

export function importDiagnosticReport(input, options = {}) {
  const nowValue = options.now instanceof Date ? options.now.toISOString() : options.now || new Date().toISOString();
  const importedAt = safeImportedAt(nowValue);
  const parsed = parseSource(input);
  if (parsed.error) return fixedResult('rejected', parsed.error, importedAt);
  const source = parsed.value;
  const treeError = inspectJsonTree(source);
  if (treeError) return fixedResult('rejected', treeError, importedAt);
  const reportVersion = integer(source.version, 999);
  if (reportVersion !== REPORT_VERSION) return fixedResult('rejected', 'unsupported_report_version', importedAt, null, reportVersion);
  if (!safeTimestamp(source.generatedAt)) return fixedResult('rejected', 'invalid_generated_at', importedAt, null, reportVersion);
  const shape = reportShape(source);
  if (shape.error) return fixedResult('rejected', shape.error, importedAt, null, reportVersion);
  const sectionError = validateSections(shape);
  if (sectionError) return fixedResult('rejected', sectionError, importedAt, null, reportVersion);
  const healthError = validateHealth(shape);
  if (healthError) return fixedResult('rejected', healthError, importedAt, null, reportVersion);
  return fixedResult('accepted', 'report_accepted', importedAt, normalizedReport(source, shape), reportVersion);
}

export const DIAGNOSTIC_IMPORT_LIMITS = Object.freeze({
  max_source_bytes: MAX_SOURCE_BYTES,
  max_depth: MAX_DEPTH,
  max_nodes: MAX_NODES,
  max_array_length: MAX_ARRAY_LENGTH,
  max_string_length: MAX_STRING_LENGTH,
  max_error_count: MAX_ERROR_COUNT
});
