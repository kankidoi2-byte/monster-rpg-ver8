/* Sound Pack 01: one Web Audio clock owns music, fades, loops and effect timing. */
(function (root) {
  'use strict';

  const STORAGE_KEY = 'monster_game_audio_v1';
  const SCENE_TRACKS = { title: 'title', home: 'home', mapSelect: 'home', 'battle:grassland': 'battle_grassland' };
  const UI_EFFECTS = new Set(['tap', 'confirm', 'cancel', 'menuOpen', 'menuClose']);
  const settings = { bgmVolume: 0.5, seVolume: 0.8, bgmMuted: false, seMuted: false };
  let context = null, bgmGain = null, seGain = null, unlocked = false;
  let manifest = null, manifestJob = null, scene = 'title', desiredTrack = 'title';
  let generation = 0, current = null, sceneJob = null, silenceUntil = 0, fadeIn = 0;
  let battleEnded = false, lastError = null;
  const bgmBuffers = new Map(), bgmJobs = new Map(), seBuffers = new Map(), seJobs = new Map();
  const retiring = new Set(), effects = new Set(), requestedEffects = new Map(), startedEffects = new Map();

  function volume(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
  }
  try {
    const saved = JSON.parse(root.localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') {
      for (const kind of ['bgm', 'se']) {
        settings[kind + 'Volume'] = volume(saved[kind + 'Volume'], settings[kind + 'Volume']);
        settings[kind + 'Muted'] = saved[kind + 'Muted'] === true;
      }
    }
  } catch (_) { /* Private browsing and damaged preferences must not affect game saves. */ }

  function rememberError(error) {
    lastError = error && error.message ? error.message : String(error);
    return false;
  }
  function hidden() { return !!(root.document && root.document.hidden); }
  function saveSettings() {
    try { root.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) { /* Optional preferences. */ }
  }
  function applyVolumes() {
    if (!context) return;
    for (const [kind, node] of [['bgm', bgmGain], ['se', seGain]]) {
      node.gain.setValueAtTime(settings[kind + 'Muted'] ? 0 : settings[kind + 'Volume'], context.currentTime);
    }
  }
  function setVolume(kind, value) {
    if (kind !== 'bgm' && kind !== 'se') return;
    settings[kind + 'Volume'] = volume(value, settings[kind + 'Volume']);
    saveSettings();
    applyVolumes();
  }
  function setMuted(kind, value) {
    if ((kind !== 'bgm' && kind !== 'se') || typeof value !== 'boolean') return;
    settings[kind + 'Muted'] = value;
    saveSettings();
    applyVolumes();
  }
  function getSettings() { return Object.assign({}, settings); }

  function loadManifest() {
    if (manifest) return Promise.resolve(manifest);
    if (manifestJob) return manifestJob;
    manifestJob = Promise.resolve().then(() => root.fetch('sound-manifest.json'))
      .then(response => {
        if (!response.ok) throw new Error('Sound manifest HTTP ' + response.status);
        return response.json();
      }).then(value => {
        if (!value || !value.bgm || !value.se) throw new Error('Invalid sound manifest');
        manifest = value;
        return value;
      }).finally(() => { manifestJob = null; });
    return manifestJob;
  }
  function decode(bytes) {
    // Callback form also supports older WebKit; Promise form alone is not universal.
    return new Promise((resolve, reject) => {
      const result = context.decodeAudioData(bytes, resolve, reject);
      if (result && typeof result.then === 'function') result.then(resolve, reject);
    });
  }
  function fetchBuffer(entry) {
    if (!entry || typeof entry.file !== 'string') return Promise.reject(new Error('Missing sound entry'));
    return Promise.resolve().then(() => root.fetch(entry.file)).then(response => {
      if (!response.ok) throw new Error('Sound HTTP ' + response.status + ': ' + entry.file);
      return response.arrayBuffer();
    }).then(decode);
  }
  function loadBgm(key) {
    if (bgmBuffers.has(key)) return Promise.resolve(bgmBuffers.get(key));
    if (bgmJobs.has(key)) return bgmJobs.get(key);
    const job = loadManifest().then(data => fetchBuffer(data.bgm[key])).then(buffer => {
      // An obsolete fetch may finish, but must not retain or play an obsolete track.
      if (desiredTrack === key) bgmBuffers.set(key, buffer);
      return buffer;
    }).finally(() => { if (bgmJobs.get(key) === job) bgmJobs.delete(key); });
    bgmJobs.set(key, job);
    return job;
  }
  function firstAudibleOffset(buffer) {
    const channels = [];
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) channels.push(buffer.getChannelData(channel));
    const threshold = Math.pow(10, -50 / 20);
    for (let sample = 0; sample < buffer.length; sample++) {
      for (const channel of channels) {
        if (Math.abs(channel[sample]) > threshold) return sample / buffer.sampleRate;
      }
    }
    return buffer.duration;
  }
  function loadSe(key) {
    if (seBuffers.has(key)) return Promise.resolve(seBuffers.get(key));
    if (seJobs.has(key)) return seJobs.get(key);
    const job = loadManifest().then(data => fetchBuffer(data.se[key])).then(buffer => {
      const sound = { buffer, offset: firstAudibleOffset(buffer) };
      seBuffers.set(key, sound);
      return sound;
    }).finally(() => { if (seJobs.get(key) === job) seJobs.delete(key); });
    seJobs.set(key, job);
    return job;
  }
  function pruneMusic() {
    for (const key of bgmBuffers.keys()) if (key !== desiredTrack) bgmBuffers.delete(key);
  }
  function disconnect(node) { try { node.disconnect(); } catch (_) { /* Already disconnected. */ } }
  function stop(source, at) { try { source.stop(at); } catch (_) { /* Already ended. */ } }
  function envelopeValue(record, time) {
    const ramp = record.ramp;
    if (time <= ramp.start) return ramp.from;
    if (time >= ramp.end) return ramp.to;
    return ramp.from + (ramp.to - ramp.from) * (time - ramp.start) / (ramp.end - ramp.start);
  }
  function retireMusic(seconds) {
    if (!current) return Math.max(context ? context.currentTime : 0, silenceUntil);
    const record = current;
    current = null;
    const now = context.currentTime;
    // A queued intro must never become audible after newer navigation.
    const duration = record.startAt > now ? 0 : seconds;
    const end = now + duration;
    const gain = record.gain.gain;
    const from = envelopeValue(record, now);
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(from, now);
    gain.linearRampToValueAtTime(0, end);
    record.ramp = { from, to: 0, start: now, end };
    retiring.add(record);
    silenceUntil = Math.max(silenceUntil, end);
    stop(record.source, end);
    return Math.max(end, silenceUntil);
  }
  function startMusic(key, buffer, token, startAt, fadeSeconds) {
    if (token !== generation || desiredTrack !== key) return false;
    const entry = manifest.bgm[key];
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = entry.loop === true;
    if (source.loop) {
      source.loopStart = Math.max(0, Number(entry.loopStartSec) || 0);
      source.loopEnd = Math.min(buffer.duration, Number(entry.loopEndSec) || buffer.duration);
    }
    source.connect(gain);
    gain.connect(bgmGain);
    const record = { key, source, gain, startAt, token,
      ramp: { from: fadeSeconds ? 0 : 1, to: 1, start: startAt, end: startAt + fadeSeconds } };
    gain.gain.setValueAtTime(record.ramp.from, startAt);
    if (fadeSeconds) gain.gain.linearRampToValueAtTime(1, startAt + fadeSeconds);
    current = record;
    source.onended = () => {
      disconnect(source);
      disconnect(gain);
      retiring.delete(record);
      if (current !== record) return;
      current = null;
      if (token !== generation || desiredTrack !== key || source.loop) return;
      // Schedule against AudioContext time, not wall-clock timers. A background tab
      // therefore pauses the three-second title gap as well as the music itself.
      const nextAt = Math.max(context.currentTime, startAt + buffer.duration + Math.max(0, Number(entry.restartGapSec) || 0));
      try { startMusic(key, buffer, token, nextAt, 0); } catch (error) { rememberError(error); }
    };
    try { source.start(startAt, 0); } catch (error) {
      current = null;
      disconnect(source);
      disconnect(gain);
      throw error;
    }
    return true;
  }
  function ensureScene() {
    if (!unlocked || !context || !desiredTrack) return Promise.resolve(false);
    if (current && current.key === desiredTrack) return Promise.resolve(true);
    if (sceneJob && sceneJob.token === generation) return sceneJob.promise;
    const token = generation, key = desiredTrack, fadeSeconds = fadeIn;
    const job = { token, promise: null };
    job.promise = loadBgm(key).then(buffer => {
      if (token !== generation || desiredTrack !== key) return false;
      return startMusic(key, buffer, token, Math.max(context.currentTime, silenceUntil), fadeSeconds);
    }).catch(error => token === generation ? rememberError(error) : false).finally(() => { if (sceneJob === job) sceneJob = null; });
    sceneJob = job;
    return job.promise;
  }
  function isBattle(value) { return value === 'otherBattle' || value.indexOf('battle:') === 0; }
  function cancelPendingCombat() {
    if (!context) return;
    for (const effect of effects) {
      if (!UI_EFFECTS.has(effect.key) && effect.startAt > context.currentTime) stop(effect.source, context.currentTime);
    }
  }
  function setScene(value, options) {
    if (typeof value !== 'string') return Promise.resolve(false);
    const restart = !!(options && options.restart);
    if (battleEnded && value === scene && !restart) return Promise.resolve(false);
    const nextTrack = Object.prototype.hasOwnProperty.call(SCENE_TRACKS, value) ? SCENE_TRACKS[value] : null;
    if (!restart && !battleEnded && nextTrack === desiredTrack) {
      scene = value;
      return ensureScene();
    }
    const previousScene = scene, previousTrack = desiredTrack;
    scene = value;
    battleEnded = false;
    generation++;
    cancelPendingCombat();
    if (context) retireMusic(0.8);
    desiredTrack = nextTrack;
    fadeIn = nextTrack === 'home' ? (isBattle(previousScene) ? 1.2 : previousTrack === 'title' ? 1.6 : 0) : 0;
    pruneMusic();
    return ensureScene();
  }
  function beginBattle(value) {
    return typeof value === 'string' && isBattle(value) ? setScene(value, { restart: true }) : Promise.resolve(false);
  }
  function playEffect(key, delaySec, token) {
    if (!unlocked || !context || typeof key !== 'string' || hidden()) return Promise.resolve(false);
    const delay = Number(delaySec);
    const at = context.currentTime + (Number.isFinite(delay) ? Math.max(0, delay) : 0);
    const lastRequest = requestedEffects.get(key);
    if (lastRequest !== undefined && Math.abs(at - lastRequest) < 0.025) return Promise.resolve(false);
    requestedEffects.set(key, at);
    return loadSe(key).then(sound => {
      if (hidden() || (token !== null && token !== generation) || sound.offset >= sound.buffer.duration) return false;
      const startAt = Math.max(context.currentTime, at);
      const lastStart = startedEffects.get(key);
      if (lastStart !== undefined && Math.abs(startAt - lastStart) < 0.025) return false;
      const source = context.createBufferSource();
      source.buffer = sound.buffer;
      source.connect(seGain);
      const effect = { key, source, startAt };
      effects.add(effect);
      source.onended = () => { effects.delete(effect); disconnect(source); };
      try { source.start(startAt, sound.offset); } catch (error) {
        effects.delete(effect);
        disconnect(source);
        throw error;
      }
      startedEffects.set(key, startAt);
      return true;
    }).catch(error => {
      if (requestedEffects.get(key) === at) requestedEffects.delete(key);
      return rememberError(error);
    });
  }
  function playSe(key, delaySec = 0) {
    return playEffect(key, delaySec, UI_EFFECTS.has(key) ? null : generation);
  }
  function endBattle(victory) {
    if (battleEnded || !isBattle(scene)) return Promise.resolve(false);
    battleEnded = true;
    generation++;
    cancelPendingCombat();
    desiredTrack = null;
    pruneMusic();
    const end = context ? retireMusic(0.6) : 0;
    return victory ? playEffect('victory', context ? end - context.currentTime : 0, generation) : Promise.resolve(true);
  }
  function syncVisibility() {
    if (!context || !unlocked) return;
    const method = hidden() ? 'suspend' : 'resume';
    try { Promise.resolve(context[method]()).catch(rememberError); } catch (error) { rememberError(error); }
  }
  function unlock() {
    // Never await anything before create/resume: mobile autoplay permission belongs
    // to this exact trusted input handler, not to a later fetch continuation.
    let resumeJob;
    try {
      if (!context) {
        const AudioContextClass = root.AudioContext || root.webkitAudioContext;
        if (!AudioContextClass) return Promise.resolve(false);
        context = new AudioContextClass();
        bgmGain = context.createGain();
        seGain = context.createGain();
        bgmGain.connect(context.destination);
        seGain.connect(context.destination);
        applyVolumes();
      }
      resumeJob = Promise.resolve(context.resume()).then(() => true).catch(rememberError);
      unlocked = true;
      if (hidden()) syncVisibility();
    } catch (error) { return Promise.resolve(rememberError(error)); }
    const preload = loadManifest().then(data => Promise.all(Object.keys(data.se).map(key => loadSe(key).catch(rememberError)))).catch(rememberError);
    return Promise.all([resumeJob, preload, ensureScene()]).then(async results => {
      // A UI enable/retry button must not claim success when decoding failed.
      // Navigation may have replaced the original scene while assets loaded.
      const sceneReady = !desiredTrack || !!current || (sceneJob ? await sceneJob.promise : false);
      const ready = results[0] && Array.isArray(results[1]) && results[1].every(Boolean) && sceneReady;
      if (ready) lastError = null;
      return ready;
    }).catch(rememberError);
  }
  function debugState() {
    return { scene, desiredTrack, generation, unlocked, contextState: context ? context.state : null,
      currentTime: context ? context.currentTime : 0, currentTrack: current ? current.key : null,
      startAt: current ? current.startAt : null, bgmBuffers: Array.from(bgmBuffers.keys()),
      seBuffers: Array.from(seBuffers.keys()), retiring: retiring.size, activeEffects: effects.size, lastError };
  }
  if (root.document && root.document.addEventListener) root.document.addEventListener('visibilitychange', syncVisibility);
  root.GameAudio = Object.freeze({ unlock, setScene, beginBattle, endBattle, playSe, setVolume, setMuted, getSettings, debugState });
})(typeof window !== 'undefined' ? window : globalThis);
