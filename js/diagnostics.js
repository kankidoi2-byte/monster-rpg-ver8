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
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
  }

  function safeFiniteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
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

  function safeValue(read, fallback=null) {
    try {
      const value = read();
      return value === undefined ? fallback : value;
    } catch (_error) {
      return fallback;
    }
  }

  function detectBrowser(userAgent) {
    if (/Edg(?:e|A|iOS)?\//i.test(userAgent)) return 'Edge';
    if (/(?:Firefox|FxiOS)\//i.test(userAgent)) return 'Firefox';
    if (/(?:Chrome|CriOS)\//i.test(userAgent)) return 'Chrome';
    if (/Safari\//i.test(userAgent)) return 'Safari';
    return 'Other';
  }

  function detectOs(userAgent) {
    if (/Android/i.test(userAgent)) return 'Android';
    if (/CrOS/i.test(userAgent)) return 'ChromeOS';
    if (/(?:iPhone|iPad|iPod)/i.test(userAgent)) return 'iOS';
    if (/Windows/i.test(userAgent)) return 'Windows';
    if (/(?:Macintosh|Mac OS X)/i.test(userAgent)) return 'macOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return 'Other';
  }

  function safeElementId(value) {
    const id = safeText(value);
    return /^[A-Za-z][A-Za-z0-9_:.-]{0,79}$/.test(id) ? id : '';
  }

  function readAppVersion(documentValue) {
    const metaVersion = safeValue(
      () => documentValue?.querySelector?.('meta[name="app-version"], meta[name="application-version"]')?.content,
      ''
    );
    const candidate = safeText(metaVersion);
    if (/^[0-9]+(?:\.[0-9]+){0,3}$/.test(candidate)) return candidate;
    const title = safeText(safeValue(() => documentValue?.title, ''));
    return title.match(/\bVer(?:sion)?\s*([0-9]+(?:\.[0-9]+){0,3})/i)?.[1] || '';
  }

  function readBuildCommit(documentValue) {
    const value = safeText(safeValue(
      () => documentValue?.querySelector?.('meta[name="build-commit"]')?.content,
      ''
    ));
    return /^[0-9a-f]{7,40}$/i.test(value) ? value.toLowerCase() : '';
  }

  function readCurrentScreen(documentValue) {
    const titleMode = safeValue(() => documentValue?.body?.classList?.contains('title-mode'), false);
    if (titleMode) return 'titleScreen';
    return safeElementId(safeValue(() => documentValue?.querySelector?.('.screen.active')?.id, ''));
  }

  function readEnvironment() {
    const navigatorValue = safeValue(() => root.navigator, null);
    const documentValue = safeValue(() => root.document, null);
    const screenValue = safeValue(() => root.screen, null);
    const userAgent = safeText(safeValue(() => navigatorValue?.userAgent, ''));
    const viewportWidth = safeNumber(safeValue(() => root.innerWidth, null));
    const mobileHint = safeValue(() => navigatorValue?.userAgentData?.mobile, null);
    const touchPoints = safeNumber(safeValue(() => navigatorValue?.maxTouchPoints, 0)) || 0;
    const onlineHint = safeValue(() => navigatorValue?.onLine, null);
    const hasDeviceSignals = Boolean(userAgent) || mobileHint !== null || touchPoints > 0 || viewportWidth !== null;
    const isMobile = mobileHint === true || /Mobi/i.test(userAgent);
    const deviceClass = !hasDeviceSignals
      ? 'unknown'
      : (isMobile
      ? 'mobile'
      : (touchPoints > 0 && viewportWidth !== null && viewportWidth <= 1280 ? 'tablet' : 'desktop'));

    return {
      capturedAt: safeTimestamp(),
      app: {
        version: readAppVersion(documentValue),
        buildCommit: readBuildCommit(documentValue)
      },
      page: {
        url: safeSourceUrl(safeValue(() => root.location?.href, '')),
        screen: readCurrentScreen(documentValue)
      },
      runtime: {
        browser: detectBrowser(userAgent),
        os: detectOs(userAgent),
        deviceClass,
        online: onlineHint === true
          ? true
          : (onlineHint === false ? false : null)
      },
      viewport: {
        width: viewportWidth,
        height: safeNumber(safeValue(() => root.innerHeight, null)),
        pixelRatio: safeFiniteNumber(safeValue(() => root.devicePixelRatio, null))
      },
      screen: {
        width: safeNumber(safeValue(() => screenValue?.width, null)),
        height: safeNumber(safeValue(() => screenValue?.height, null))
      }
    };
  }

  function safeCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(number));
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  }

  function collectionTotals(value) {
    try {
      const entries = Object.entries(safeRecord(value) || {});
      let stockedTypeCount = 0;
      let totalCount = 0;
      for (const [, rawCount] of entries) {
        const count = safeCount(rawCount);
        if (!count) continue;
        stockedTypeCount++;
        totalCount = Math.min(Number.MAX_SAFE_INTEGER, totalCount + count);
      }
      return { stockedTypeCount, totalCount };
    } catch (_error) {
      return { stockedTypeCount: 0, totalCount: 0 };
    }
  }

  function emptySaveSummary(available=false) {
    return {
      version: 1,
      available,
      schemaVersion: null,
      saveMeta: {
        migrationCount: 0,
        hasLastSavedAt: false,
        hasIntegrityHash: false
      },
      monsters: {
        instanceCount: 0,
        distinctSpeciesCount: 0,
        missingUidCount: 0,
        duplicateUidCount: 0,
        invalidInstanceCount: 0
      },
      party: {
        memberCount: 0,
        missingReferenceCount: 0
      },
      economy: {
        coins: 0,
        itemTypeCount: 0,
        totalItemCount: 0,
        skillCardTypeCount: 0,
        totalSkillCardCount: 0
      },
      collections: {
        caughtCount: 0,
        itemDexCount: 0,
        mapDexCount: 0
      },
      expeditions: {
        completedCount: 0,
        activeCount: 0
      },
      quarantine: {
        unknownInstanceCount: 0,
        unknownCaughtIdCount: 0,
        invalidExpeditionCount: 0
      }
    };
  }

  function summarizeSave(value) {
    const source = safeRecord(value);
    if (!source) return emptySaveSummary(false);
    const summary = emptySaveSummary(true);
    summary.schemaVersion = safeNumber(safeValue(() => source.schemaVersion, null));

    const saveMeta = safeRecord(safeValue(() => source.saveMeta, null));
    summary.saveMeta.migrationCount = safeCount(safeValue(() => safeArray(saveMeta?.migrations).length, 0));
    summary.saveMeta.hasLastSavedAt = Boolean(safeText(safeValue(() => saveMeta?.lastSavedAt, '')));
    summary.saveMeta.hasIntegrityHash = Boolean(safeText(safeValue(() => saveMeta?.integrityHash, '')));

    const instances = safeArray(safeValue(() => source.instances, []));
    const seenUids = new Set();
    const species = new Set();
    summary.monsters.instanceCount = safeCount(safeValue(() => instances.length, 0));
    for (let index = 0; index < summary.monsters.instanceCount; index++) {
      const entry = safeRecord(safeValue(() => instances[index], null));
      if (!entry) {
        summary.monsters.invalidInstanceCount++;
        continue;
      }
      const id = safeText(safeValue(() => entry.id, ''));
      const uid = safeText(safeValue(() => entry.uid, ''));
      if (id) species.add(id); else summary.monsters.invalidInstanceCount++;
      if (!uid) summary.monsters.missingUidCount++;
      else if (seenUids.has(uid)) summary.monsters.duplicateUidCount++;
      else seenUids.add(uid);
    }
    summary.monsters.distinctSpeciesCount = species.size;

    const party = safeArray(safeValue(() => source.party, []));
    summary.party.memberCount = safeCount(safeValue(() => party.length, 0));
    for (let index = 0; index < summary.party.memberCount; index++) {
      const uid = safeText(safeValue(() => party[index], ''));
      if (!uid || !seenUids.has(uid)) summary.party.missingReferenceCount++;
    }

    const items = collectionTotals(safeValue(() => source.items, null));
    const skillCards = collectionTotals(safeValue(() => source.skillCards, null));
    summary.economy.coins = safeCount(safeValue(() => source.coins, 0));
    summary.economy.itemTypeCount = items.stockedTypeCount;
    summary.economy.totalItemCount = items.totalCount;
    summary.economy.skillCardTypeCount = skillCards.stockedTypeCount;
    summary.economy.totalSkillCardCount = skillCards.totalCount;

    summary.collections.caughtCount = safeCount(safeValue(() => safeArray(source.caught).length, 0));
    summary.collections.itemDexCount = safeCount(safeValue(() => safeArray(source.itemDex).length, 0));
    summary.collections.mapDexCount = safeCount(safeValue(() => safeArray(source.mapDex).length, 0));

    const expeditions = safeRecord(safeValue(() => source.expeditions, null));
    summary.expeditions.completedCount = safeCount(safeValue(() => expeditions?.completedCount, 0));
    summary.expeditions.activeCount = safeCount(safeValue(() => safeArray(expeditions?.active).length, 0));

    const quarantine = safeRecord(safeValue(() => source.quarantine, null));
    summary.quarantine.unknownInstanceCount = safeCount(safeValue(() => safeArray(quarantine?.unknownInstances).length, 0));
    summary.quarantine.unknownCaughtIdCount = safeCount(safeValue(() => safeArray(quarantine?.unknownCaughtIds).length, 0));
    summary.quarantine.invalidExpeditionCount = safeCount(safeValue(() => safeArray(quarantine?.invalidExpeditions).length, 0));
    return summary;
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
    state = { errors: [], listenersInstalled: false, saveProvider: null };
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

  function registerSaveProvider(provider) {
    if (typeof provider !== 'function' || typeof state.saveProvider === 'function') return false;
    state.saveProvider = provider;
    return true;
  }

  function getSaveSummary() {
    if (typeof state.saveProvider !== 'function') return emptySaveSummary(false);
    return summarizeSave(safeValue(() => state.saveProvider(), null));
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
    environmentVersion: 1,
    saveSummaryVersion: 1,
    maxErrors: MAX_ERRORS,
    getEnvironment: readEnvironment,
    getSaveSummary,
    registerSaveProvider,
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
