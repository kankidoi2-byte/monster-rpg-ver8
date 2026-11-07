// Disposable profile, real downloaded assets and native Web Audio decoding.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const manifest = JSON.parse(fs.readFileSync(new URL('../sound-manifest.json', import.meta.url), 'utf8'));
const expectedFiles = [...Object.values(manifest.bgm), ...Object.values(manifest.se)].map(entry => '/' + entry.file);
const port = process.env.GAME_AUDIO_TEST_PORT || '4317';
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/dev-server.mjs', '--host', '127.0.0.1', '--port', port], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser;

try {
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Preview server exited before startup (${code})`)));
  });
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 412, height: 850 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [], requests = [], failedAudio = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/audio/') || path === '/sound-manifest.json') requests.push(path);
  });
  page.on('response', response => {
    if (new URL(response.url()).pathname.startsWith('/audio/') && !response.ok()) failedAudio.push(response.status() + ' ' + response.url());
  });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.addInitScript(() => {
    // Observe, do not fake, the native nodes that actually decode/play the files.
    window.soundTestStarts = [];
    const original = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const node = original.call(this);
      const start = node.start;
      node.start = function (at, offset) {
        window.soundTestStarts.push({ at, offset, duration: node.buffer.duration, loop: node.loop, loopStart: node.loopStart, loopEnd: node.loopEnd });
        return start.apply(this, arguments);
      };
      return node;
    };
  });

  await page.goto(origin + '/?legacy=1', { waitUntil: 'networkidle' });
  assert.deepEqual(requests, [], 'fresh title does not download manifest or audio before input');
  assert.equal(await page.evaluate(() => GameAudio.debugState().unlocked), false);
  assert.deepEqual(await page.evaluate(() => GameAudio.getSettings()), { bgmVolume: 0.5, seVolume: 0.8, bgmMuted: false, seMuted: false });

  // Exercise the actual title enable button and trusted-input listener rather
  // than calling unlock through evaluate. The button must retain the title.
  await page.locator('#titleScreen button[data-sound="none"]').click();
  await page.waitForFunction(() => GameAudio.debugState().currentTrack === 'title' && GameAudio.debugState().seBuffers.length === 10, null, { timeout: 60000 });
  assert.equal(await page.locator('#titleScreen').count(), 1);
  assert.equal(await page.evaluate(() => GameAudio.debugState().contextState), 'running');
  assert.equal(await page.evaluate(() => GameAudio.debugState().lastError), null, 'all initial real assets decoded successfully');
  assert.equal(requests.filter(path => path.startsWith('/audio/se/')).length, 10);
  assert.deepEqual(requests.filter(path => path.startsWith('/audio/bgm/')), ['/' + manifest.bgm.title.file]);
  const title = await page.evaluate(() => soundTestStarts[0]);
  assert.equal(title.loop, false);
  assert.equal(title.offset, 0);
  assert.ok(title.duration > 3, 'the real title file has nonempty decoded audio');

  // Isolate sound UI from first-run guidance, using the same legacy fixture as
  // other repository browser checks. Only this disposable browser is modified.
  await page.evaluate(() => {
    clearTutorialUi();
    save.progress.tutorial = tutorialSaveDefaults({ legacy: true });
    save.contractor.pendingRankUps = [];
    clearTimeout(contractorRankUpTimer);
    document.getElementById('contractorRankUpOverlay').classList.add('hidden');
    if (!saveGame()) throw new Error('Unable to save audio-test fixture');
  });
  await page.locator('#titleScreen').click();
  await page.locator('#titleScreen').waitFor({ state: 'detached' });
  await page.waitForFunction(() => GameAudio.debugState().currentTrack === 'home', null, { timeout: 60000 });
  const home = await page.evaluate(() => GameAudio.debugState());
  const homeNode = await page.evaluate(() => soundTestStarts.find(node => node.loop && node.loopStart === 85.075));
  assert.ok(homeNode, 'native home loop uses the specified loop start');
  assert.equal(homeNode.loopEnd, 159.405);
  assert.equal(homeNode.offset, 0, 'home plays its intro before the loop');
  assert.ok(homeNode.duration >= homeNode.loopEnd);
  await page.evaluate(() => show('battleChoices'));
  assert.equal(await page.evaluate(() => GameAudio.debugState().startAt), home.startAt, 'map selection preserves the home source');
  await page.evaluate(() => show('home'));
  assert.equal(await page.evaluate(() => GameAudio.debugState().startAt), home.startAt);

  await page.evaluate(() => GameAudio.beginBattle('battle:grassland'));
  await page.waitForFunction(() => GameAudio.debugState().currentTrack === 'battle_grassland', null, { timeout: 60000 });
  const grass = await page.evaluate(() => soundTestStarts.find(node => node.loop && node.loopStart === 14.42));
  assert.ok(grass, 'real grassland file decodes and starts');
  assert.equal(grass.loopEnd, 41.425);
  assert.equal(grass.offset, 0);
  assert.ok(grass.duration >= grass.loopEnd);
  assert.equal(await page.evaluate(() => GameAudio.debugState().lastError), null);
  assert.deepEqual([...new Set(requests.filter(path => path.startsWith('/audio/')))].sort(), expectedFiles.sort(), 'all 13 original assets were fetched and decoded across the relevant scenes');
  assert.deepEqual(failedAudio, []);
  assert.equal(await page.evaluate(() => GameAudio.playSe('fire')), true);
  assert.equal(await page.evaluate(() => GameAudio.endBattle(true)), true);
  assert.equal(await page.evaluate(() => GameAudio.debugState().currentTrack), null);
  await page.evaluate(() => GameAudio.setScene('battle:grassland'));
  assert.equal(await page.evaluate(() => GameAudio.debugState().currentTrack), null, 'repeated result-screen notification stays silent');
  await page.evaluate(() => show('home'));
  await page.waitForFunction(() => GameAudio.debugState().currentTrack === 'home', null, { timeout: 60000 });
  assert.equal(await page.evaluate(() => soundTestStarts.filter(node => node.loop && node.loopStart === 85.075).length), 2, 'returning from battle creates a fresh home source');

  const saveBeforeSettings = await page.evaluate(() => localStorage.getItem(MonsterProfiles.key(SAVE_KEY)));
  await page.evaluate(() => show('moreMenu'));
  await page.locator('#moreMenu button').filter({ hasText: 'BGM・効果音' }).click();
  await page.locator('#audioSettings.active').waitFor();
  await page.locator('#audio-bgm-volume').evaluate(input => { input.value = '23'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#audio-se-volume').evaluate(input => { input.value = '67'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#audio-bgm-mute').check();
  await page.locator('#audio-se-mute').check();
  const expectedSettings = { bgmVolume: 0.23, seVolume: 0.67, bgmMuted: true, seMuted: true };
  assert.deepEqual(await page.evaluate(() => GameAudio.getSettings()), expectedSettings);
  assert.equal(await page.locator('#audio-bgm-value').textContent(), '23%');
  assert.equal(await page.locator('#audio-se-value').textContent(), '67%');
  assert.equal(await page.evaluate(() => localStorage.getItem(MonsterProfiles.key(SAVE_KEY))), saveBeforeSettings, 'sound settings leave the game save byte-identical');
  requests.length = 0;
  await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(requests, [], 'reload also waits for a new trusted gesture before downloading audio');
  assert.deepEqual(await page.evaluate(() => GameAudio.getSettings()), expectedSettings, 'independent volumes and mutes survive reload');
  assert.deepEqual(errors, [], 'no uncaught browser errors');
  await context.close();
  console.log('Game audio browser checks passed: fresh gesture unlock, 13 real asset decodes, title/home/grass loops, map continuity, battle end, settings and save isolation.');
} finally {
  await browser?.close();
  server.kill();
}
