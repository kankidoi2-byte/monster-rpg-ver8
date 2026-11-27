// Run with "chromium" for PC and Android emulation, or "webkit" for iPhone emulation.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium, devices, webkit } from 'playwright';

const engine = process.argv[2] ?? 'chromium';
assert.ok(['chromium', 'webkit'].includes(engine));
const port = engine === 'webkit' ? '4511' : '4510';
const server = spawn(process.execPath, ['scripts/dev-server.mjs', '--host', '127.0.0.1', '--port', port]);
let browser;
try {
  await once(server.stdout, 'data');
  const profiles = engine === 'webkit' ? ['iPhone 13'] : ['Desktop Chrome', 'Pixel 7'];
  browser = engine === 'webkit'
    ? await webkit.launch({ executablePath: process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE_PATH })
    : await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  for (const profile of profiles) {
    const context = await browser.newContext({ ...devices[profile] });
    const page = await context.newPage();
    page.on('dialog', dialog => dialog.accept());
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.addInitScript(() => {
      // Observe the mixed signal feeding the real output. Keep its original connection.
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (destination, ...rest) {
        if (destination === this.context.destination) {
          window.titleMeter ??= this.context.createAnalyser();
          connect.call(this, window.titleMeter);
        }
        return connect.call(this, destination, ...rest);
      };
      window.titlePeak = () => {
        const data = new Float32Array(window.titleMeter.fftSize);
        window.titleMeter.getFloatTimeDomainData(data);
        return data.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);
      };
    });
    const title = page.locator('#titleScreen');
    const press = position => devices[profile].hasTouch ? title.tap({ position }) : title.click({ position });
    await page.goto('http://127.0.0.1:' + port + '/?legacy=1');
    await page.waitForFunction(() => typeof initTitleScreen === 'function');
    assert.equal(await page.evaluate(() => GameAudio.debugState().unlocked), false);
    await press({ x: 12, y: 12 });
    await page.waitForFunction(() => GameAudio.debugState().currentTrack === 'title' &&
      GameAudio.debugState().contextState === 'running' && titlePeak() > 0.001);
    assert.equal(await title.evaluate(el => el.classList.contains('title-leaving')), false);
    await press({ x: 100, y: 180 });
    await title.waitFor({ state: 'detached' });
    await page.waitForFunction(() => GameAudio.debugState().currentTrack === 'home');
    // Start fresh at the title with the player's existing mute preference.
    await page.evaluate(() => GameAudio.setMuted('bgm', true));
    await page.reload();
    await page.waitForFunction(() => typeof initTitleScreen === 'function');
    await press({ x: 70, y: 70 });
    await page.waitForFunction(() => {
      const state = GameAudio.debugState();
      return state.currentTrack === 'title' && state.currentTime - state.startAt > 0.5;
    });
    assert.equal(await page.evaluate(() => titlePeak()), 0);
    assert.equal(await title.evaluate(el => el.classList.contains('title-leaving')), false);
    await press({ x: 70, y: 70 });
    await title.waitFor({ state: 'detached' });
    console.log(profile + ': title audio output, saved mute and second-input navigation passed');
    await context.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
