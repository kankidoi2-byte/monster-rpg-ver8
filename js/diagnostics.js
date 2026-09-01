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

  function safeToken(value) {
    const token = safeText(value);
    return /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(token) ? token : '';
  }

  function emptyTutorialSummary(available=false) {
    return {
      version: 1,
      available,
      state: {
        status: 'unknown',
        completed: false,
        skipped: false,
        replaying: false,
        active: false,
        paused: false,
        persistedStepId: '',
        flowId: '',
        stepId: '',
        stepIndex: null,
        stepCount: 0
      },
      waiting: {
        mode: 'none',
        event: '',
        input: '',
        continueAt: '',
        targetRequired: false,
        targetPresent: false,
        transitionPending: false
      },
      screen: {
        expected: '',
        actual: '',
        matches: null
      },
      issues: []
    };
  }

  function summarizeTutorial(value) {
    const source = safeRecord(value);
    if (!source) return emptyTutorialSummary(false);
    const summary = emptyTutorialSummary(true);
    const statuses = new Set(['not_started', 'in_progress', 'completed', 'skipped']);
    const modes = new Set(['none', 'dialogue', 'target_action', 'external_action', 'event', 'input', 'continue']);
    const status = safeToken(safeValue(() => source.status, ''));
    summary.state.status = statuses.has(status) ? status : 'unknown';
    summary.state.completed = safeValue(() => source.completed, false) === true;
    summary.state.skipped = safeValue(() => source.skipped, false) === true;
    summary.state.replaying = safeValue(() => source.replaying, false) === true;
    summary.state.active = safeValue(() => source.active, false) === true;
    summary.state.paused = safeValue(() => source.paused, false) === true;
    summary.state.persistedStepId = safeToken(safeValue(() => source.persistedStepId, ''));
    summary.state.flowId = safeToken(safeValue(() => source.flowId, ''));
    summary.state.stepId = safeToken(safeValue(() => source.stepId, ''));
    summary.state.stepIndex = safeNumber(safeValue(() => source.stepIndex, null));
    summary.state.stepCount = safeCount(safeValue(() => source.stepCount, 0));

    const mode = safeToken(safeValue(() => source.waitingMode, ''));
    summary.waiting.mode = modes.has(mode) ? mode : 'none';
    summary.waiting.event = safeToken(safeValue(() => source.waitForEvent, ''));
    summary.waiting.input = safeToken(safeValue(() => source.input, ''));
    summary.waiting.continueAt = safeToken(safeValue(() => source.continueAt, ''));
    summary.waiting.targetRequired = safeValue(() => source.targetRequired, false) === true;
    summary.waiting.targetPresent = safeValue(() => source.targetPresent, false) === true;
    summary.waiting.transitionPending = safeValue(() => source.transitionPending, false) === true;

    summary.screen.expected = safeElementId(safeValue(() => source.expectedScreen, ''));
    summary.screen.actual = safeElementId(safeValue(() => source.activeScreen, ''));
    summary.screen.matches = summary.screen.expected && summary.screen.actual
      ? summary.screen.expected === summary.screen.actual
      : null;

    const issues = [];
    if (summary.state.active && !summary.state.stepId) issues.push('missing_active_step');
    if (summary.state.active && summary.state.stepCount > 0 && summary.state.stepIndex === null) issues.push('invalid_step_index');
    if (summary.state.active && summary.screen.matches === false) issues.push('screen_mismatch');
    if (summary.state.active && summary.waiting.targetRequired && !summary.waiting.targetPresent) issues.push('missing_target');
    if (summary.state.active && !summary.state.replaying && (summary.state.completed || summary.state.skipped || summary.state.status === 'completed' || summary.state.status === 'skipped')) {
      issues.push('terminal_state_active');
    }
    if (summary.state.status === 'in_progress' && !summary.state.persistedStepId) issues.push('missing_persisted_step');
    summary.issues = issues;
    return summary;
  }

  function registerTutorialProvider(provider) {
    if (typeof provider !== 'function' || typeof state.tutorialProvider === 'function') return false;
    state.tutorialProvider = provider;
    return true;
  }

  function getTutorialSummary() {
    if (typeof state.tutorialProvider !== 'function') return emptyTutorialSummary(false);
    return summarizeTutorial(safeValue(() => state.tutorialProvider(), null));
  }

  function emptyAlchemySummary(available=false) {
    return {
      version: 1,
      available,
      state: {
        stage: 'unknown',
        busy: false,
        visible: false,
        tutorialLesson: false,
        resultKind: 'none',
        nextAction: 'none'
      },
      selection: {
        mode: 'unknown',
        recipeValid: false,
        materialSlotCount: 0,
        materialUnitCount: 0,
        catalystRequired: false,
        catalystSelected: false,
        coinOptionValid: false,
        successCandidateCount: 0,
        failureCandidateCount: 0,
        validationErrorCount: 0,
        canExecute: false
      },
      issues: []
    };
  }

  function summarizeAlchemy(value) {
    const source = safeRecord(value);
    if (!source) return emptyAlchemySummary(false);
    const summary = emptyAlchemySummary(true);
    const stages = new Set(['idle', 'selecting', 'confirming', 'processing', 'completed', 'rolled_back']);
    const results = new Set(['none', 'success', 'fallback', 'error']);
    const actions = new Set(['none', 'fix_selection', 'open_confirmation', 'execute', 'wait', 'continue_tutorial', 'view_party_or_retry', 'return_to_alchemy']);
    const modes = new Set(['normal', 'tutorial_lesson']);
    const stage = safeToken(safeValue(() => source.stage, ''));
    const resultKind = safeToken(safeValue(() => source.resultKind, ''));
    const nextAction = safeToken(safeValue(() => source.nextAction, ''));
    const mode = safeToken(safeValue(() => source.mode, ''));
    summary.state.stage = stages.has(stage) ? stage : 'unknown';
    summary.state.busy = safeValue(() => source.busy, false) === true;
    summary.state.visible = safeValue(() => source.visible, false) === true;
    summary.state.tutorialLesson = safeValue(() => source.tutorialLesson, false) === true;
    summary.state.resultKind = results.has(resultKind) ? resultKind : 'none';
    summary.state.nextAction = actions.has(nextAction) ? nextAction : 'none';
    summary.selection.mode = modes.has(mode) ? mode : 'unknown';
    summary.selection.recipeValid = safeValue(() => source.recipeValid, false) === true;
    summary.selection.materialSlotCount = safeCount(safeValue(() => source.materialSlotCount, 0));
    summary.selection.materialUnitCount = safeCount(safeValue(() => source.materialUnitCount, 0));
    summary.selection.catalystRequired = safeValue(() => source.catalystRequired, false) === true;
    summary.selection.catalystSelected = safeValue(() => source.catalystSelected, false) === true;
    summary.selection.coinOptionValid = safeValue(() => source.coinOptionValid, false) === true;
    summary.selection.successCandidateCount = safeCount(safeValue(() => source.successCandidateCount, 0));
    summary.selection.failureCandidateCount = safeCount(safeValue(() => source.failureCandidateCount, 0));
    summary.selection.validationErrorCount = safeCount(safeValue(() => source.validationErrorCount, 0));
    summary.selection.canExecute = safeValue(() => source.canExecute, false) === true;

    const issues = [];
    if (summary.state.busy && summary.state.stage !== 'processing') issues.push('busy_stage_mismatch');
    if (!summary.state.busy && summary.state.stage === 'processing') issues.push('processing_without_busy');
    if (summary.selection.canExecute && summary.selection.validationErrorCount > 0) issues.push('executable_with_errors');
    if (summary.selection.canExecute && summary.selection.successCandidateCount === 0) issues.push('executable_without_success_candidate');
    if (summary.selection.canExecute && summary.selection.mode === 'normal' && summary.selection.failureCandidateCount === 0) issues.push('executable_without_failure_candidate');
    if (summary.state.stage === 'completed' && summary.state.resultKind === 'none') issues.push('completed_without_result');
    if (summary.state.stage === 'rolled_back' && summary.state.resultKind !== 'error') issues.push('rollback_without_error');
    if (summary.state.stage === 'confirming' && summary.selection.validationErrorCount > 0) issues.push('confirmation_invalid');
    summary.issues = issues;
    return summary;
  }

  function registerAlchemyProvider(provider) {
    if (typeof provider !== 'function' || typeof state.alchemyProvider === 'function') return false;
    state.alchemyProvider = provider;
    return true;
  }

  function getAlchemySummary() {
    if (typeof state.alchemyProvider !== 'function') return emptyAlchemySummary(false);
    return summarizeAlchemy(safeValue(() => state.alchemyProvider(), null));
  }

  function emptyExpeditionSummary(available=false) {
    return {
      version: 1,
      available,
      state: {
        visible: false,
        unlockedSlotCount: 0,
        usedSlotCount: 0,
        availableSlotCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        readyToClaimCount: 0
      },
      selection: {
        destinationSelected: false,
        destinationValid: false,
        distanceValid: false,
        selectedMemberCount: 0,
        availableMemberCount: 0,
        canDispatch: false,
        blockingReasons: []
      },
      expeditions: [],
      issues: []
    };
  }

  function summarizeExpedition(value) {
    const source = safeRecord(value);
    if (!source) return emptyExpeditionSummary(false);
    const summary = emptyExpeditionSummary(true);
    const stateSource = safeRecord(safeValue(() => source.state, null));
    const selectionSource = safeRecord(safeValue(() => source.selection, null));
    summary.state.visible = safeValue(() => stateSource?.visible, false) === true;
    summary.state.unlockedSlotCount = safeCount(safeValue(() => stateSource?.unlockedSlotCount, 0));
    summary.state.usedSlotCount = safeCount(safeValue(() => stateSource?.usedSlotCount, 0));
    summary.state.availableSlotCount = safeCount(safeValue(() => stateSource?.availableSlotCount, 0));
    summary.state.completedCount = safeCount(safeValue(() => stateSource?.completedCount, 0));
    summary.state.inProgressCount = safeCount(safeValue(() => stateSource?.inProgressCount, 0));
    summary.state.readyToClaimCount = safeCount(safeValue(() => stateSource?.readyToClaimCount, 0));
    summary.selection.destinationSelected = safeValue(() => selectionSource?.destinationSelected, false) === true;
    summary.selection.destinationValid = safeValue(() => selectionSource?.destinationValid, false) === true;
    summary.selection.distanceValid = safeValue(() => selectionSource?.distanceValid, false) === true;
    summary.selection.selectedMemberCount = safeCount(safeValue(() => selectionSource?.selectedMemberCount, 0));
    summary.selection.availableMemberCount = safeCount(safeValue(() => selectionSource?.availableMemberCount, 0));
    summary.selection.canDispatch = safeValue(() => selectionSource?.canDispatch, false) === true;

    const allowedReasons = new Set([
      'slots_full',
      'destination_missing',
      'destination_unavailable',
      'distance_invalid',
      'no_members_selected',
      'member_count_exceeded',
      'member_unavailable'
    ]);
    const rawReasons = safeArray(safeValue(() => selectionSource?.blockingReasons, []));
    const reasonCount = Math.min(safeCount(safeValue(() => rawReasons.length, 0)), 7);
    for (let index = 0; index < reasonCount; index++) {
      const reason = safeToken(safeValue(() => rawReasons[index], ''));
      if (allowedReasons.has(reason) && !summary.selection.blockingReasons.includes(reason)) {
        summary.selection.blockingReasons.push(reason);
      }
    }

    const statuses = new Set(['active', 'complete']);
    const rawExpeditions = safeArray(safeValue(() => source.expeditions, []));
    const expeditionCount = Math.min(safeCount(safeValue(() => rawExpeditions.length, 0)), 3);
    for (let index = 0; index < expeditionCount; index++) {
      const entry = safeRecord(safeValue(() => rawExpeditions[index], null));
      if (!entry) continue;
      const status = safeToken(safeValue(() => entry.status, ''));
      summary.expeditions.push({
        status: statuses.has(status) ? status : 'unknown',
        progress: safeCount(safeValue(() => entry.progress, 0)),
        requiredWins: safeCount(safeValue(() => entry.requiredWins, 0)),
        memberCount: safeCount(safeValue(() => entry.memberCount, 0)),
        rewardReady: safeValue(() => entry.rewardReady, false) === true,
        tutorialPrologue: safeValue(() => entry.tutorialPrologue, false) === true
      });
    }

    const issues = [];
    const expectedAvailable = Math.max(0, summary.state.unlockedSlotCount - summary.state.usedSlotCount);
    const activeEntries = summary.expeditions.filter(entry => entry.status === 'active').length;
    const completeEntries = summary.expeditions.filter(entry => entry.status === 'complete').length;
    if (summary.state.usedSlotCount > summary.state.unlockedSlotCount) issues.push('slots_over_capacity');
    if (summary.state.usedSlotCount !== summary.expeditions.length) issues.push('slot_count_mismatch');
    if (summary.state.availableSlotCount !== expectedAvailable) issues.push('available_slot_mismatch');
    if (summary.state.inProgressCount !== activeEntries) issues.push('in_progress_count_mismatch');
    if (summary.state.readyToClaimCount !== completeEntries) issues.push('ready_count_mismatch');
    if (summary.selection.canDispatch && summary.selection.blockingReasons.length) issues.push('dispatchable_with_blockers');
    if (summary.selection.canDispatch && summary.state.availableSlotCount === 0) issues.push('dispatchable_without_slot');
    if (summary.selection.canDispatch && (summary.selection.selectedMemberCount < 1 || summary.selection.selectedMemberCount > 3)) {
      issues.push('dispatchable_with_invalid_member_count');
    }
    for (const entry of summary.expeditions) {
      if (!entry.requiredWins) issues.push('missing_required_wins');
      if (entry.requiredWins && entry.progress > entry.requiredWins) issues.push('progress_out_of_range');
      if (entry.status === 'active' && entry.requiredWins && entry.progress >= entry.requiredWins) issues.push('active_at_completion_threshold');
      if (entry.status === 'complete' && !entry.rewardReady) issues.push('complete_without_reward');
      if (entry.memberCount < 1 || entry.memberCount > 3) issues.push('invalid_member_count');
    }
    summary.issues = [...new Set(issues)];
    return summary;
  }

  function registerExpeditionProvider(provider) {
    if (typeof provider !== 'function' || typeof state.expeditionProvider === 'function') return false;
    state.expeditionProvider = provider;
    return true;
  }

  function getExpeditionSummary() {
    if (typeof state.expeditionProvider !== 'function') return emptyExpeditionSummary(false);
    return summarizeExpedition(safeValue(() => state.expeditionProvider(), null));
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

  function reportErrorEntries() {
    const rawErrors = safeArray(safeValue(() => getErrors(), []));
    const length = safeCount(safeValue(() => rawErrors.length, 0));
    const start = Math.max(0, length - MAX_ERRORS);
    const entries = [];
    for (let index = start; index < length; index++) {
      const source = safeRecord(safeValue(() => rawErrors[index], null));
      if (!source) continue;
      const kind = safeToken(safeValue(() => source.kind, ''));
      entries.push({
        kind: kind === 'error' || kind === 'unhandledrejection' ? kind : 'error',
        name: safeText(safeValue(() => source.name, 'Error'), 'Error'),
        message: safeText(safeValue(() => source.message, 'Unknown error'), 'Unknown error'),
        source: safeSourceUrl(safeValue(() => source.source, '')),
        line: safeNumber(safeValue(() => source.line, null)),
        column: safeNumber(safeValue(() => source.column, null)),
        count: Math.max(1, safeCount(safeValue(() => source.count, 1))),
        firstSeenAt: safeText(safeValue(() => source.firstSeenAt, '')),
        lastSeenAt: safeText(safeValue(() => source.lastSeenAt, ''))
      });
    }
    return entries;
  }

  function addDiagnosticCount(total, value) {
    return Math.min(Number.MAX_SAFE_INTEGER, total + safeCount(value));
  }

  function saveDiagnosticIssueCount(summary) {
    let total = 0;
    const monsters = safeRecord(safeValue(() => summary?.monsters, null));
    const party = safeRecord(safeValue(() => summary?.party, null));
    const quarantine = safeRecord(safeValue(() => summary?.quarantine, null));
    for (const value of [
      safeValue(() => monsters?.missingUidCount, 0),
      safeValue(() => monsters?.duplicateUidCount, 0),
      safeValue(() => monsters?.invalidInstanceCount, 0),
      safeValue(() => party?.missingReferenceCount, 0),
      safeValue(() => quarantine?.unknownInstanceCount, 0),
      safeValue(() => quarantine?.unknownCaughtIdCount, 0),
      safeValue(() => quarantine?.invalidExpeditionCount, 0)
    ]) {
      total = addDiagnosticCount(total, value);
    }
    return total;
  }

  function sectionIssueCount(summary) {
    return safeCount(safeValue(() => safeArray(summary?.issues).length, 0));
  }

  function getDiagnosticReport() {
    const environment = safeValue(() => readEnvironment(), {
      capturedAt: '',
      app: { version: '', buildCommit: '' },
      page: { url: '', screen: '' },
      runtime: { browser: 'Other', os: 'Other', deviceClass: 'unknown', online: null },
      viewport: { width: null, height: null, pixelRatio: null },
      screen: { width: null, height: null }
    });
    const saveSummary = safeValue(() => getSaveSummary(), emptySaveSummary(false));
    const tutorialSummary = safeValue(() => getTutorialSummary(), emptyTutorialSummary(false));
    const alchemySummary = safeValue(() => getAlchemySummary(), emptyAlchemySummary(false));
    const expeditionSummary = safeValue(() => getExpeditionSummary(), emptyExpeditionSummary(false));
    const errorItems = safeValue(() => reportErrorEntries(), []);
    const unavailableSections = [];
    if (safeValue(() => saveSummary.available, false) !== true) unavailableSections.push('save');
    if (safeValue(() => tutorialSummary.available, false) !== true) unavailableSections.push('tutorial');
    if (safeValue(() => alchemySummary.available, false) !== true) unavailableSections.push('alchemy');
    if (safeValue(() => expeditionSummary.available, false) !== true) unavailableSections.push('expedition');

    let issueCount = saveDiagnosticIssueCount(saveSummary);
    issueCount = addDiagnosticCount(issueCount, sectionIssueCount(tutorialSummary));
    issueCount = addDiagnosticCount(issueCount, sectionIssueCount(alchemySummary));
    issueCount = addDiagnosticCount(issueCount, sectionIssueCount(expeditionSummary));
    const errorCount = safeCount(errorItems.length);
    const status = errorCount > 0 ? 'error' : (issueCount > 0 || unavailableSections.length > 0 ? 'warning' : 'ok');
    return {
      version: 1,
      generatedAt: safeTimestamp(),
      environment,
      save: saveSummary,
      tutorial: tutorialSummary,
      alchemy: alchemySummary,
      expedition: expeditionSummary,
      errors: {
        version: 1,
        limit: MAX_ERRORS,
        count: errorCount,
        items: errorItems
      },
      health: {
        status,
        issueCount,
        errorCount,
        unavailableSections
      }
    };
  }

  function formatDiagnosticSummary(value=getDiagnosticReport()) {
    const report = safeRecord(value);
    const environment = safeRecord(safeValue(() => report?.environment, null));
    const app = safeRecord(safeValue(() => environment?.app, null));
    const page = safeRecord(safeValue(() => environment?.page, null));
    const health = safeRecord(safeValue(() => report?.health, null));
    const version = safeCount(safeValue(() => report?.version, 1)) || 1;
    const rawStatus = safeToken(safeValue(() => health?.status, ''));
    const status = ['ok', 'warning', 'error'].includes(rawStatus) ? rawStatus : 'warning';
    const statusLabel = { ok: '正常', warning: '要確認', error: 'エラーあり' }[status];
    const appVersion = safeText(safeValue(() => app?.version, '')) || '不明';
    const buildCommit = safeText(safeValue(() => app?.buildCommit, ''));
    const screen = safeElementId(safeValue(() => page?.screen, '')) || '不明';
    const issueCount = safeCount(safeValue(() => health?.issueCount, 0));
    const errorCount = safeCount(safeValue(() => health?.errorCount, 0));
    const allowedSections = new Set(['save', 'tutorial', 'alchemy', 'expedition']);
    const rawUnavailable = safeArray(safeValue(() => health?.unavailableSections, []));
    const unavailable = [];
    const unavailableCount = Math.min(safeCount(safeValue(() => rawUnavailable.length, 0)), 4);
    for (let index = 0; index < unavailableCount; index++) {
      const section = safeToken(safeValue(() => rawUnavailable[index], ''));
      if (allowedSections.has(section) && !unavailable.includes(section)) unavailable.push(section);
    }
    return [
      `診断レポート v${version}（${statusLabel}）`,
      `アプリ: ${appVersion}${buildCommit ? ` / ${buildCommit.slice(0, 12)}` : ''}`,
      `画面: ${screen}`,
      `検出事項: ${issueCount}件 / JavaScriptエラー: ${errorCount}件`,
      `未取得: ${unavailable.length ? unavailable.join(', ') : 'なし'}`
    ].join('\n');
  }

  const api = Object.freeze({
    version: 1,
    environmentVersion: 1,
    saveSummaryVersion: 1,
    tutorialSummaryVersion: 1,
    alchemySummaryVersion: 1,
    expeditionSummaryVersion: 1,
    diagnosticReportVersion: 1,
    maxErrors: MAX_ERRORS,
    getEnvironment: readEnvironment,
    getSaveSummary,
    registerSaveProvider,
    getTutorialSummary,
    registerTutorialProvider,
    getAlchemySummary,
    registerAlchemyProvider,
    getExpeditionSummary,
    registerExpeditionProvider,
    getDiagnosticReport,
    formatDiagnosticSummary,
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
