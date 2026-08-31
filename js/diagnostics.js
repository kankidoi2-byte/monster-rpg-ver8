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
import fs from 'node:fs';
import path from 'node:path';
