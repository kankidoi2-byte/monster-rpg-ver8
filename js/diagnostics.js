(function(root){
  'use strict';

  const MAX_ERRORS = 20;
  const MAX_TEXT_LENGTH = 500;
  const STATE_KEY = '__monsterRpgDiagnosticsStateV1';

  function safeText(value, fallback='') {
    try {
      const text = String(value ?? fallback);
      return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
    } catch (_error) {
      return fallback;
    }
  }

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
  }

  function safeTimestamp() {
    try {
      return new Date().toISOString();
    } catch (_error) {
      return '';
    }
  }

  function safeSourceUrl(value) {
    const raw = safeText(value);
    if (!raw) return '';
    try {
      const base = root.location?.href || 'https://diagnostics.invalid/';
      const url = new URL(raw, base);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      return safeText(`${url.origin}${url.pathname}`);
    } catch (_error) {
      return '';
    }
  }

  function errorDetails(value, fallbackMessage='') {
    let name = '';
    let message = '';
    try {
      if (value && typeof value === 'object') {
        name = safeText(value.name);
        message = safeText(value.message);
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        message = safeText(value);
      }
    } catch (_error) {
      // A rejection reason can be a Proxy or expose throwing getters.
    }
    return {
      name: name || 'Error',
      message: message || safeText(fallbackMessage, 'Unknown error') || 'Unknown error'
    };
  }

  function fingerprint(entry) {
    return [
      entry.kind,
      entry.name,
      entry.message,
      entry.source,
      entry.line,
      entry.column
    ].join('|');
  }

  let state;
  try {
    state = root[STATE_KEY];
  } catch (_error) {
    state = null;
  }
  if (!state || !Array.isArray(state.errors)) {
    state = { errors: [], listenersInstalled: false };
    try {
      Object.defineProperty(root, STATE_KEY, {
        value: state,
        configurable: false,
        enumerable: false,
        writable: false
      });
    } catch (_error) {
      root[STATE_KEY] = state;
    }
  }

  function record(entry) {
    const last = state.errors[state.errors.length - 1];
    if (last && last.fingerprint === entry.fingerprint) {
      last.count = Math.min(Number.MAX_SAFE_INTEGER, (last.count || 1) + 1);
      last.lastSeenAt = entry.lastSeenAt;
      return;
    }
    state.errors.push(entry);
    if (state.errors.length > MAX_ERRORS) {
      state.errors.splice(0, state.errors.length - MAX_ERRORS);
    }
  }

  function captureErrorEvent(event) {
    try {
      const details = errorDetails(event?.error, event?.message);
      const timestamp = safeTimestamp();
      const entry = {
        kind: 'error',
        name: details.name,
        message: details.message,
        source: safeSourceUrl(event?.filename),
        line: safeNumber(event?.lineno),
        column: safeNumber(event?.colno),
        count: 1,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp
      };
      entry.fingerprint = fingerprint(entry);
      record(entry);
    } catch (_error) {
      // Diagnostics must never become a new runtime failure.
    }
  }

  function captureUnhandledRejection(event) {
    try {
      const details = errorDetails(event?.reason, 'Unhandled promise rejection');
      const timestamp = safeTimestamp();
      const entry = {
        kind: 'unhandledrejection',
        name: details.name,
        message: details.message,
        source: '',
        line: null,
        column: null,
        count: 1,
        firstSeenAt: timestamp,
        lastSeenAt: timestamp
      };
      entry.fingerprint = fingerprint(entry);
      record(entry);
    } catch (_error) {
      // Diagnostics must never become a new runtime failure.
    }
  }

  function getErrors() {
    return state.errors.map(entry => ({ ...entry }));
  }

  function clearErrors() {
    state.errors.splice(0, state.errors.length);
  }

  const api = Object.freeze({
    version: 1,
    maxErrors: MAX_ERRORS,
    getErrors,
    clearErrors
  });
  root.GameDiagnostics = api;

  if (!state.listenersInstalled && typeof root.addEventListener === 'function') {
    root.addEventListener('error', captureErrorEvent);
    root.addEventListener('unhandledrejection', captureUnhandledRejection);
    state.listenersInstalled = true;
  }
})(typeof window !== 'undefined' ? window : globalThis);
