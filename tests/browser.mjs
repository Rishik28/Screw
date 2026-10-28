// Build then start `npm run preview -- --port 4173` before running this suite.
// Uses system Chromium; override CHROMIUM_PATH, TEST_URL and TEST_ARTIFACTS as needed.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const artifacts = process.env.TEST_ARTIFACTS || '/tmp/screw-garden-browser';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
  await page.waitForFunction(() => window.__game && window.__board);
  assert.equal(await page.locator('canvas').count(), 1, '3D board did not start');
  assert.equal(await page.evaluate(() => !!document.querySelector('canvas').getContext('webgl2')), true);
  let rotations = 0;
  async function reveal(id) {
    assert.equal(await page.evaluate(id => window.__game.isAvailable(id), id), true, `rule-blocked solution screw ${id}`);
    const target = page.locator(`[data-screw-id="${id}"]`);
    const normal = await page.evaluate(id => window.__game.level.screws.find(s => s.id === id).normal, id);
    const desiredPitch = Math.max(-1.1, Math.min(1.1, Math.asin(normal[1])));
    const view = await page.evaluate(() => window.__board.getView());
    if (Math.abs(view.pitch - desiredPitch) > .2) {
      await page.locator('.board-wrap').focus();
      const key = desiredPitch > view.pitch ? 'ArrowUp' : 'ArrowDown';
      for (let step = 0; step < Math.round(Math.abs(desiredPitch - view.pitch) / .25); step++) await page.keyboard.press(key);
    }
    if (Math.hypot(normal[0], normal[2]) > .1) {
      const desiredYaw = Math.atan2(normal[0], normal[2]);
      const delta = Math.atan2(Math.sin(desiredYaw - view.yaw), Math.cos(desiredYaw - view.yaw));
      const selector = delta > 0 ? '#rotate-right' : '#rotate-left';
      for (let step = 0; step < Math.round(Math.abs(delta) / (Math.PI / 4)); step++) {
        await page.locator(selector).tap(); rotations++;
      }
    }
    for (let turn = 0; turn <= 8; turn++) {
      if (await target.isVisible()) {
        const box = await target.boundingBox();
        if (box) {
          const clear = await target.evaluate(el => {
            const r = el.getBoundingClientRect();
            return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el;
          });
          if (clear) return target;
        }
      }
      await page.locator('#rotate-right').tap(); rotations++;
      await page.waitForTimeout(70);
    }
    await page.screenshot({ path: `${artifacts}/unreachable-${id}.png`, fullPage: true });
    console.log('UNREACHABLE', await page.evaluate(id => {
      const el = document.querySelector(`[data-screw-id="${id}"]`), r = el.getBoundingClientRect();
      return {id, view: window.__board.getView(), hidden: el.hidden, disabled: el.disabled,
        rect: {x:r.x,y:r.y,w:r.width,h:r.height}, over: document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML,
        removed: [...window.__game.state.removedIds]};
    }, id));
    throw new Error(`Screw ${id} never became reachable through a full rotation`);
  }
  for (const [width, height] of [[390, 844], [360, 740], [320, 568]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(150);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
    assert.ok(await page.locator('.tray').count() <= 4);
    const targets = await page.locator('.screw-target:not([disabled]):not([hidden])').evaluateAll(buttons => buttons.filter(b => b.getBoundingClientRect().width).map(b => ({ w: b.offsetWidth, h: b.offsetHeight, label: b.getAttribute('aria-label') })));
    assert.ok(targets.length > 0);
    assert.ok(targets.every(t => t.w >= 44 && t.h >= 44 && t.label), 'unlabeled or undersized screw target');
    await page.screenshot({ path: `${artifacts}/portrait-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await page.getByRole('button', { name: 'How to play' }).tap();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => !!document.activeElement.closest('[role="dialog"]')), true, 'modal focus escaped');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.modal-backdrop').isVisible(), false);
  const first = await page.evaluate(() => window.__game.level.solution[0]);
  let target = await reveal(first);
  await page.screenshot({ path: `${artifacts}/before-rotation.png`, fullPage: true });
  const before = await page.evaluate(() => window.__board.getView());
  const beforeBox = await target.boundingBox();
  const beforePosition = await target.evaluate(el => ({ left: el.style.left, top: el.style.top }));
  const touch = await context.newCDPSession(page);
  const start = { x: beforeBox.x + beforeBox.width / 2, y: beforeBox.y + beforeBox.height / 2 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  for (let i = 1; i <= 8; i++) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + i * 12, y: start.y + i * 2 }] });
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => window.__board.getView());
  assert.ok(Math.abs(after.yaw - before.yaw) > .2, 'touch drag did not rotate the model');
  assert.equal(await page.evaluate(() => window.__game.state.moves), 0, 'drag accidentally removed a screw');
  const afterPosition = await target.evaluate(el => ({ left: el.style.left, top: el.style.top }));
  assert.ok(afterPosition.left && afterPosition.top);
  assert.notDeepEqual(afterPosition, beforePosition, 'screw hit target did not follow the rotated model');
  await page.screenshot({ path: `${artifacts}/after-rotation.png`, fullPage: true });
  await page.locator('#reset-view').tap();
  target = await reveal(first); await target.tap();
  assert.equal(await page.evaluate(() => window.__game.state.moves), 1);
  await page.locator('#undo').tap();
  assert.equal(await page.evaluate(() => window.__game.state.moves), 0);
  await page.locator('#hint').tap();
  await page.locator('.screw-target.is-hint').waitFor({ state: 'attached' });
  assert.equal(await page.locator('.screw-target.is-hint').count(), 1);
  await (await reveal(first)).tap(); await page.locator('#restart').tap();
  assert.equal(await page.evaluate(() => window.__game.state.moves), 0);
  const levelCount = await page.evaluate(() => Number(document.querySelector('#level-pill').textContent.split('/')[1]));
  assert.ok(Number.isInteger(levelCount) && levelCount >= 6, 'campaign level count is missing');
  let removed = 0;
  for (let level = 1; level <= levelCount; level++) {
    if (level === 2) {
      const losingPath = ['lantern-roof-s2', 'glass-front-s1', 'glass-front-s2', 'glass-back-s1', 'glass-left-s1', 'glass-right-s1'];
      for (const id of losingPath) await (await reveal(id)).tap();
      assert.equal(await page.evaluate(() => window.__game.state.status), 'lost');
      assert.equal(await page.locator('.modal-backdrop').isVisible(), true);
      await page.screenshot({ path: `${artifacts}/shelf-overflow.png`, fullPage: true });
      await page.getByRole('button', {name: 'Undo last screw'}).tap();
      assert.equal(await page.evaluate(() => window.__game.state.status), 'playing');
      assert.equal(await page.evaluate(() => window.__game.state.moves), losingPath.length - 1);
      await page.locator('#restart').tap();
      assert.equal(await page.evaluate(() => window.__game.state.moves), 0);
    }
    const ids = await page.evaluate(() => window.__game.level.solution);
    for (let i = 0; i < ids.length; i++) {
      await (await reveal(ids[i])).tap(); removed++;
      if (!await page.evaluate(id => window.__game.state.removedIds.has(id), ids[i])) {
        await page.screenshot({ path: `${artifacts}/tap-failed-${ids[i]}.png`, fullPage: true });
        throw new Error(`Real tap did not remove ${ids[i]}: ${JSON.stringify(await page.evaluate(() => ({moves:window.__game.state.moves,removed:[...window.__game.state.removedIds],view:window.__board.getView()})))}`);
      }
      assert.ok(await page.locator('.tray').count() <= 4);
      if (level === levelCount && i === 0) await page.screenshot({ path: `${artifacts}/complex-last-level.png`, fullPage: true });
    }
    assert.equal(await page.evaluate(() => window.__game.state.status), 'won');
    assert.equal(await page.locator('.modal-backdrop').isVisible(), true);
    await page.screenshot({ path: `${artifacts}/won-${level}.png`, fullPage: true });
    await page.locator('.primary-button').tap();
    assert.equal(await page.evaluate(() => window.__game.level.id), level === levelCount ? 1 : level + 1);
    if (level === 1) {
      await page.reload(); await page.waitForFunction(() => window.__game && window.__board);
      assert.equal(await page.evaluate(() => window.__game.level.id), 2, 'level progress was not retained');
    }
    console.log(`PASS: level ${level} won through real mobile taps and model rotations`);
  }
  assert.ok(rotations > 0, 'campaign never exercised model rotation');
  assert.deepEqual(errors, [], 'browser errors');
  console.log(`PASS: portrait, WebGL, four buckets, touch-drag rotation, focus, undo/hint/restart, saved progress. ${removed} screws, ${rotations} turns. Screenshots: ${artifacts}`);
  const fallback = await browser.newContext();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      return /webgl/i.test(kind) ? null : original.call(this, kind, ...args);
    };
  });
  const fallbackPage = await fallback.newPage();
  const fallbackErrors = [];
  fallbackPage.on('pageerror', error => fallbackErrors.push(error.message));
  await fallbackPage.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
  await fallbackPage.locator('.render-error').waitFor();
  assert.match(await fallbackPage.locator('.render-error').innerText(), /3D graphics/i);
  await fallbackPage.getByRole('button', {name: 'How to play'}).click();
  assert.equal(await fallbackPage.locator('.modal-backdrop').isVisible(), true);
  assert.deepEqual(fallbackErrors, [], 'WebGL-unavailable fallback crashed');
  await fallback.close();
  console.log('PASS: unavailable WebGL gives an accessible explanation without crashing');
} finally { await browser.close(); }
