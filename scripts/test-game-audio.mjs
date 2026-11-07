import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/game-audio.js', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../sound-manifest.json', import.meta.url), 'utf8'));
const settingsKey = 'monster_game_audio_v1';
const clone = value => JSON.parse(JSON.stringify(value));
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} != ${expected}`);

function makeHarness(options = {}) {
  const storage = new Map(Object.entries(options.storage || {}));
  const writes = [], fetches = [], contexts = [], sources = [], gains = [], holds = new Map();
  const failures = new Map(), decodeFailures = new Map();
  const listeners = new Map();
  const document = { hidden: false, addEventListener: (name, listener) => listeners.set(name, listener) };
  class Param {
    constructor() { this.value = 1; this.events = []; }
    setValueAtTime(value, at) { this.value = value; this.events.push({ type: 'set', value, at }); }
    linearRampToValueAtTime(value, at) { this.value = value; this.events.push({ type: 'ramp', value, at }); }
    cancelScheduledValues(at) { this.events.push({ type: 'cancel', at }); }
  }
  class Node {
    constructor() { this.gain = new Param(); this.connected = null; this.disconnected = false; }
    connect(target) { this.connected = target; return target; }
    disconnect() { this.disconnected = true; }
  }
  class BufferSource extends Node {
    constructor(ctx) { super(); this.ctx = ctx; this.loop = false; this.started = false; this.ended = false; this.endAt = Infinity; }
    start(at, offset = 0) {
      assert.equal(this.started, false, 'sources are one-shot');
      assert.ok(Number.isFinite(at));
      this.started = true; this.startAt = at; this.offset = offset;
      if (!this.loop) this.endAt = Math.min(this.endAt, at + this.buffer.duration - offset);
    }
    stop(at) { this.stopAt = at; this.endAt = Math.min(this.endAt, at); }
  }
  const buffers = new Map();
  for (const [key, entry] of Object.entries(manifest.bgm)) {
    buffers.set(entry.file, { key, duration: key === 'title' ? 5 : key === 'home' ? 180 : 50 });
  }
  for (const [key, entry] of Object.entries(manifest.se)) {
    const channels = [new Float32Array(1000), new Float32Array(1000)];
    channels[0][3] = 0.002; // Below -50 dB, must not count as the audible start.
    channels[1][10] = -0.01; // Only the right channel reveals the first sound.
    channels[0][20] = 0.5;
    buffers.set(entry.file, { key, duration: 1, length: 1000, sampleRate: 1000, numberOfChannels: 2, getChannelData: channel => channels[channel] });
  }
  class FakeAudioContext {
    constructor() { this.currentTime = 0; this.state = 'suspended'; this.destination = {}; this.resumes = 0; this.suspends = 0; contexts.push(this); }
    createGain() { const node = new Node(); gains.push(node); return node; }
    createBufferSource() { const node = new BufferSource(this); sources.push(node); return node; }
    resume() {
      this.resumes++;
      if (options.resumeFails) { options.resumeFails--; return Promise.reject(new Error('resume blocked')); }
      this.state = 'running'; return Promise.resolve();
    }
    suspend() { this.suspends++; this.state = 'suspended'; return Promise.resolve(); }
    decodeAudioData(bytes, resolve, reject) {
      if (decodeFailures.get(bytes.path)) {
        decodeFailures.set(bytes.path, decodeFailures.get(bytes.path) - 1);
        const error = new Error('decode failed'); reject(error); return Promise.reject(error);
      }
      const buffer = buffers.get(bytes.path);
      assert.ok(buffer, `known audio file ${bytes.path}`);
      resolve(buffer); return Promise.resolve(buffer);
    }
    advance(seconds) {
      if (this.state !== 'running') return;
      const target = this.currentTime + seconds;
      for (;;) {
        const due = sources.filter(node => node.started && !node.ended && node.endAt <= target).sort((a, b) => a.endAt - b.endAt)[0];
        if (!due) break;
        this.currentTime = Math.max(this.currentTime, due.endAt);
        due.ended = true;
        if (due.onended) due.onended();
      }
      this.currentTime = target;
    }
  }
  const sandbox = {
    console, document, AudioContext: options.unsupported ? undefined : FakeAudioContext,
    localStorage: {
      getItem: key => { if (options.storageThrows) throw new Error('storage denied'); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (options.storageThrows) throw new Error('storage denied'); writes.push(key); storage.set(key, value); }
    },
    fetch: async path => {
      fetches.push(path);
      if (holds.has(path)) await holds.get(path).promise;
      if (failures.get(path)) { failures.set(path, failures.get(path) - 1); return { ok: false, status: 503 }; }
      return { ok: true, json: async () => clone(manifest), arrayBuffer: async () => ({ path }) };
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return {
    api: sandbox.GameAudio, storage, writes, fetches, sources, gains, contexts, failures, decodeFailures,
    get ctx() { return contexts[0]; },
    music: () => sources.filter(node => node.buffer && manifest.bgm[node.buffer.key]),
    se: key => sources.filter(node => node.buffer && node.buffer.key === key),
    visible: value => { document.hidden = !value; listeners.get('visibilitychange')(); },
    hold: path => { let resolve; const promise = new Promise(done => { resolve = done; }); holds.set(path, { promise, resolve }); },
    release: path => { const hold = holds.get(path); holds.delete(path); hold.resolve(); }
  };
}

{
  const h = makeHarness();
  assert.deepEqual(clone(h.api.getSettings()), { bgmVolume: 0.5, seVolume: 0.8, bgmMuted: false, seMuted: false });
  await h.api.setScene('title');
  assert.equal(h.contexts.length, 0, 'no AudioContext before a gesture');
  assert.equal(h.fetches.length, 0, 'no audio or manifest is downloaded before a gesture');
  assert.equal(await h.api.playSe('tap'), false);
  const unlocking = h.api.unlock();
  assert.equal(h.contexts.length, 1, 'context creation happens synchronously in unlock');
  assert.equal(h.ctx.resumes, 1, 'resume happens synchronously before any fetch');
  assert.equal(h.fetches.length, 0);
  assert.equal(await unlocking, true);
  assert.equal(h.fetches.filter(path => path === 'sound-manifest.json').length, 1);
  assert.equal(h.fetches.filter(path => path.startsWith('audio/se/')).length, 10);
  assert.deepEqual(h.fetches.filter(path => path.startsWith('audio/bgm/')), [manifest.bgm.title.file]);
  assert.deepEqual(clone(h.api.debugState().seBuffers).sort(), Object.keys(manifest.se).sort());
  assert.equal(h.music()[0].loop, false);
  assert.equal(h.music()[0].offset, 0);
  h.ctx.advance(5);
  assert.equal(h.music().length, 2);
  near(h.music()[1].startAt, 8, 'title repeats after the entire track and three seconds');
  h.ctx.advance(1);
  h.visible(false);
  h.ctx.advance(100);
  near(h.ctx.currentTime, 6, 'hidden time does not consume the title gap');
  h.visible(true);
  h.ctx.advance(2);
  near(h.music()[1].startAt, h.ctx.currentTime, 'remaining title gap survives visibility suspension');
  h.ctx.advance(5);
  near(h.music()[2].startAt, 16, 'successive title repeats keep their gap');
}

{
  const h = makeHarness();
  await h.api.unlock();
  h.ctx.advance(2);
  await h.api.setScene('home');
  const [title, home] = h.music();
  near(title.stopAt, 2.8, 'title fades out for 0.8 seconds');
  near(home.startAt, 2.8, 'home begins only after title fade');
  near(home.connected.gain.events.find(event => event.type === 'ramp').at, 4.4, 'home fades in for 1.6 seconds');
  assert.equal(home.loop, true);
  near(home.loopStart, 85.075, 'home loop start');
  near(home.loopEnd, 159.405, 'home loop end');
  assert.equal(home.offset, 0, 'home intro is retained');
  const count = h.music().length;
  await h.api.setScene('mapSelect');
  await h.api.setScene('home');
  assert.equal(h.music().length, count, 'map selection keeps the exact same home source');
  assert.deepEqual(clone(h.api.debugState().bgmBuffers), ['home'], 'irrelevant title buffer is dropped');
  h.ctx.advance(5);
  const before = h.ctx.currentTime;
  await h.api.beginBattle('battle:grassland');
  const grass = h.music().at(-1);
  near(home.stopAt, before + 0.8, 'home fades out before battle');
  near(grass.startAt, before + 0.8, 'grass intro follows home fade');
  assert.equal(grass.offset, 0);
  near(grass.loopStart, 14.420, 'grass loop start');
  near(grass.loopEnd, 41.425, 'grass loop end');
  h.ctx.advance(2);
  const endAt = h.ctx.currentTime;
  await h.api.endBattle(true);
  near(grass.stopAt, endAt + 0.6, 'battle fades out for 0.6 seconds');
  near(h.se('victory')[0].startAt, endAt + 0.6, 'victory starts after the battle fade');
  const endedMusicCount = h.music().length;
  await h.api.setScene('battle:grassland');
  assert.equal(h.music().length, endedMusicCount, 'result-screen refresh does not restart ended battle music');
  assert.equal(await h.api.endBattle(true), false, 'duplicate result does not replay victory');
  h.ctx.advance(2);
  await h.api.setScene('home');
  const returnedHome = h.music().at(-1);
  assert.notEqual(returnedHome, home);
  assert.equal(returnedHome.offset, 0, 'return home restarts from intro');
  near(returnedHome.connected.gain.events.find(event => event.type === 'ramp').at, returnedHome.startAt + 1.2, 'return home fade is 1.2 seconds');
  assert.deepEqual(clone(h.api.debugState().bgmBuffers), ['home']);
  h.ctx.advance(2);
  await h.api.beginBattle('otherBattle');
  assert.equal(h.api.debugState().currentTrack, null, 'other battles do not invent replacement music');
  assert.ok(returnedHome.stopAt > h.ctx.currentTime);
  const victoryCount = h.se('victory').length;
  await h.api.endBattle(true);
  assert.equal(h.se('victory').length, victoryCount + 1, 'other battles still use the victory fanfare');
}

{
  const h = makeHarness();
  await h.api.setScene('home');
  await h.api.unlock();
  const home = h.music()[0];
  h.ctx.advance(100);
  h.visible(false);
  h.ctx.advance(900);
  near(h.ctx.currentTime, 100, 'backgrounding freezes music position inside a loop');
  assert.equal(await h.api.playSe('tap'), false, 'hidden tabs do not queue effects');
  h.visible(true);
  h.ctx.advance(3);
  assert.equal(h.music()[0], home, 'resume preserves the source instead of restarting its intro');
  near(h.ctx.currentTime, 103, 'resume advances from the original position');
  assert.equal(h.ctx.suspends, 1);
  assert.equal(await h.api.playSe('tap'), true);
  near(h.se('tap')[0].offset, 0.01, 'leading silence scan uses both channels and -50 dB threshold');
  h.ctx.advance(0.024);
  assert.equal(await h.api.playSe('tap'), false, 'same effect within 25 ms is suppressed');
  h.ctx.advance(0.002);
  assert.equal(await h.api.playSe('tap'), true, 'same effect after 25 ms is allowed');
  assert.equal(await h.api.playSe('confirm'), true, 'different effects are independent');
  await h.api.playSe('slashHeavy', 0.3);
  near(h.se('slashHeavy')[0].startAt, h.ctx.currentTime + 0.3, 'effect delays use the audio clock');
  await h.api.setScene('otherBattle');
  near(h.se('slashHeavy')[0].stopAt, h.ctx.currentTime, 'navigation cancels a pending old combat effect');
}

{
  const h = makeHarness({ storage: { mb_v95c: 'UNTOUCHED_SAVE', [settingsKey]: JSON.stringify({ bgmVolume: 0.3, seVolume: 0.6, bgmMuted: true }) } });
  assert.equal(h.api.getSettings().bgmVolume, 0.3);
  assert.equal(h.api.getSettings().bgmMuted, true);
  await h.api.unlock();
  assert.equal(h.gains[0].gain.value, 0);
  h.api.setVolume('bgm', 2);
  h.api.setMuted('bgm', false);
  h.api.setVolume('se', -1);
  h.api.setMuted('se', true);
  h.api.setVolume('se', NaN);
  h.api.setVolume('other', 0);
  assert.deepEqual(clone(h.api.getSettings()), { bgmVolume: 1, seVolume: 0, bgmMuted: false, seMuted: true });
  assert.equal(h.gains[0].gain.value, 1);
  assert.equal(h.gains[1].gain.value, 0);
  assert.equal(h.storage.get('mb_v95c'), 'UNTOUCHED_SAVE');
  assert.ok(h.writes.every(key => key === settingsKey), 'audio preferences use only their dedicated storage key');
  const snapshot = h.api.getSettings(); snapshot.bgmVolume = 0;
  assert.equal(h.api.getSettings().bgmVolume, 1, 'settings snapshots cannot mutate internal state');
  const blocked = makeHarness({ storageThrows: true });
  await blocked.api.unlock();
  assert.doesNotThrow(() => blocked.api.setMuted('bgm', true));
  const damaged = makeHarness({ storage: { [settingsKey]: 'not json' } });
  assert.equal(damaged.api.getSettings().seVolume, 0.8);
}

{
  const h = makeHarness();
  h.hold(manifest.bgm.title.file);
  const unlock = h.api.unlock();
  await flush();
  await h.api.setScene('home');
  assert.equal(h.api.debugState().currentTrack, 'home');
  h.release(manifest.bgm.title.file);
  await unlock;
  assert.deepEqual(h.music().map(node => node.buffer.key), ['home'], 'late title load cannot override newer home scene');
  assert.deepEqual(clone(h.api.debugState().bgmBuffers), ['home'], 'late obsolete load is not cached');
  h.hold(manifest.bgm.battle_grassland.file);
  const grass = h.api.beginBattle('battle:grassland');
  await flush();
  await h.api.setScene('home');
  h.release(manifest.bgm.battle_grassland.file);
  await grass;
  assert.ok(h.music().every(node => node.buffer.key === 'home'), 'quick return home cancels a pending battle load');
  assert.deepEqual(clone(h.api.debugState().bgmBuffers), ['home']);
}

{
  const h = makeHarness();
  await h.api.unlock();
  await h.api.setScene('home');
  const queuedHome = h.music().at(-1);
  assert.ok(queuedHome.startAt > h.ctx.currentTime);
  await h.api.beginBattle('battle:grassland');
  near(queuedHome.stopAt, h.ctx.currentTime, 'rapid navigation stops a scheduled but unstarted intro immediately');
  assert.equal(h.api.debugState().currentTrack, 'battle_grassland');
  h.ctx.advance(2);
  await h.api.endBattle(true);
  const queuedVictory = h.se('victory').at(-1);
  await h.api.setScene('home');
  near(queuedVictory.stopAt, h.ctx.currentTime, 'returning home cancels a queued old victory fanfare');
  h.ctx.advance(3);
  await h.api.beginBattle('battle:grassland');
  await h.api.endBattle(false);
  const victoryCount = h.se('victory').length;
  await h.api.beginBattle('battle:grassland');
  assert.equal(h.api.debugState().currentTrack, 'battle_grassland', 'explicit fresh battle can restart the same map');
  assert.equal(h.se('victory').length, victoryCount, 'loss or retreat does not create a fanfare');
}

{
  const h = makeHarness();
  h.hold(manifest.bgm.home.file);
  await h.api.setScene('home');
  const unlocking = h.api.unlock();
  await flush();
  const map = h.api.setScene('mapSelect');
  const home = h.api.setScene('home');
  h.release(manifest.bgm.home.file);
  await Promise.all([unlocking, map, home]);
  assert.equal(h.music().length, 1, 'home/map changes during a shared fetch do not duplicate music');
  assert.equal(h.fetches.filter(path => path === manifest.bgm.home.file).length, 1);
  assert.equal(h.fetches.includes(manifest.bgm.title.file), false, 'a pre-gesture scene change does not fetch title');
}

{
  const h = makeHarness();
  h.hold(manifest.se.fire.file);
  h.hold(manifest.se.victory.file);
  const unlocking = h.api.unlock();
  await flush();
  await h.api.beginBattle('battle:grassland');
  const fire = h.api.playSe('fire');
  const victory = h.api.endBattle(true);
  await h.api.setScene('home');
  h.release(manifest.se.fire.file);
  h.release(manifest.se.victory.file);
  await Promise.all([unlocking, fire, victory]);
  assert.equal(h.se('fire').length, 0, 'late combat download cannot play after leaving its battle');
  assert.equal(h.se('victory').length, 0, 'late fanfare download cannot play after newer navigation');
}

{
  const h = makeHarness();
  await h.api.unlock();
  h.ctx.advance(6);
  const queuedTitle = h.music().at(-1);
  near(queuedTitle.startAt, 8, 'title is queued in its repeat gap');
  await h.api.setScene('home');
  near(queuedTitle.stopAt, 6, 'leaving title during its gap cancels the next repeat');
  h.ctx.advance(30);
  assert.equal(h.music().filter(node => node.buffer.key === 'title').length, 2, 'a stopped title callback never creates another repeat');
}

{
  const h = makeHarness();
  h.failures.set('sound-manifest.json', 1);
  assert.equal(await h.api.unlock(), false, 'network failure reports a safe retry result without rejecting');
  assert.equal(h.ctx.state, 'running', 'network failure does not undo browser audio activation');
  assert.equal(h.music().length, 0);
  await h.api.unlock();
  assert.equal(h.music().length, 1, 'failed manifest can retry on the next gesture');
  assert.equal(h.api.debugState().lastError, null, 'successful enable retry clears stale failure status');
  h.failures.set(manifest.bgm.home.file, 1);
  assert.equal(await h.api.setScene('home'), false);
  assert.equal(await h.api.setScene('home'), true, 'failed scene track can retry without fake navigation');
  assert.equal(h.api.debugState().currentTrack, 'home');
  const effects = makeHarness();
  effects.decodeFailures.set(manifest.se.fire.file, 1);
  assert.equal(await effects.api.unlock(), false, 'a failed decoder does not claim that all sounds are ready');
  assert.equal(effects.api.debugState().seBuffers.includes('fire'), false);
  assert.equal(await effects.api.playSe('fire'), true, 'failed preload decoding can retry on demand');
  assert.equal(await effects.api.playSe('missing'), false, 'unknown effects safely fail');
  const resume = makeHarness({ resumeFails: 1 });
  assert.equal(await resume.api.unlock(), false);
  assert.equal(await resume.api.unlock(), true, 'resume rejection can retry on a new gesture');
  assert.equal(resume.contexts.length, 1);
  const unsupported = makeHarness({ unsupported: true });
  assert.equal(await unsupported.api.unlock(), false);
  assert.equal(await unsupported.api.setScene('home'), false);
  assert.equal(await unsupported.api.playSe('tap'), false);
}

assert.ok(!/createOscillator|new\s+Audio\s*\(/.test(source), 'audio engine uses neither synthetic oscillators nor HTML audio');
console.log('Game audio checks passed: unlock, lazy loading, fades, loops, title gaps, visibility, SE timing, settings, races and retries.');
