// Run against `npm run preview -- --port 4173` after `npm run build`.
// Install system Chromium or set CHROMIUM_PATH to its executable.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const artifacts = process.env.TEST_ARTIFACTS || '/tmp/screw-garden-browser';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
  await page.waitForFunction(() => window.__game);
  assert.equal(await page.locator('canvas').count(), 1, '3D board did not start');
  assert.equal(await page.evaluate(() => !!document.querySelector('canvas').getContext('webgl2')), true);
  for (const [width, height] of [[390, 844], [360, 740], [320, 568]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
    const targets = await page.locator('.screw-target:not([disabled]):not([hidden])').evaluateAll(buttons => buttons.map(b => ({ w: b.offsetWidth, h: b.offsetHeight, label: b.getAttribute('aria-label') })));
    assert.ok(targets.length > 0);
    assert.ok(targets.every(t => t.w >= 44 && t.h >= 44 && t.label), 'screw touch targets need labels and 44px bounds');
    await page.screenshot({ path: `${artifacts}/portrait-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await page.getByRole('button', { name: 'How to play' }).tap();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]')), true, 'modal focus escaped');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.modal-backdrop').isVisible(), false);
  const first = await page.evaluate(() => window.__game.level.solution[0]);
  await page.locator(`[data-screw-id="${first}"]`).tap();
  assert.equal(await page.evaluate(() => window.__game.state.moves), 1);
  await page.locator('#undo').tap();
  assert.equal(await page.evaluate(() => window.__game.state.moves), 0);
  await page.locator('#hint').tap();
  await page.locator('.screw-target.is-hint').waitFor();
  assert.equal(await page.locator('.screw-target.is-hint').count(), 1);
  await page.locator(`[data-screw-id="${first}"]`).tap();
  await page.locator('#restart').tap();
  assert.equal(await page.evaluate(() => window.__game.state.moves), 0);
  for (let level = 1; level <= 8; level++) {
    if (level === 2) {
      // A legal but poor opening fills the shelf; exercise the actual loss dialog.
      const losingPath = ['s0-0-1', 's0-1-0', 's0-1-2', 's0-0-0', 's0-0-2', 's1-0-1', 's1-0-0', 's1-0-2', 's2-0-0', 's2-0-1'];
      for (const id of losingPath) await page.locator(`[data-screw-id="${id}"]`).tap();
      assert.equal(await page.evaluate(() => window.__game.state.status), 'lost');
      assert.equal(await page.locator('.modal-backdrop').isVisible(), true);
      await page.screenshot({ path: `${artifacts}/shelf-overflow.png`, fullPage: true });
      await page.getByRole('button', { name: 'Undo last screw' }).tap();
      assert.equal(await page.evaluate(() => window.__game.state.status), 'playing');
      assert.equal(await page.evaluate(() => window.__game.state.moves), losingPath.length - 1);
      await page.locator('#restart').tap();
      assert.equal(await page.evaluate(() => window.__game.state.moves), 0);
    }
    const ids = await page.evaluate(() => window.__game.level.solution);
    for (const id of ids) await page.locator(`[data-screw-id="${id}"]`).tap();
    assert.equal(await page.evaluate(() => window.__game.state.status), 'won');
    assert.equal(await page.locator('.modal-backdrop').isVisible(), true);
    await page.screenshot({ path: `${artifacts}/won-${level}.png`, fullPage: true });
    await page.locator('.primary-button').tap();
    assert.equal(await page.evaluate(() => window.__game.level.id), level === 8 ? 1 : level + 1);
    if (level === 1) {
      await page.reload();
      await page.waitForFunction(() => window.__game);
      assert.equal(await page.evaluate(() => window.__game.level.id), 2, 'level progress was not retained');
    }
    console.log(`PASS: level ${level} won through real mobile taps`);
  }
  assert.deepEqual(errors, [], 'browser errors');
  console.log(`PASS: portrait layout, WebGL, touch targets, help/focus, undo, hint, restart, overflow/recovery, progress, eight levels. Screenshots: ${artifacts}`);
} finally {
  await browser.close();
}
