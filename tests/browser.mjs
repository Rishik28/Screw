// Build then start `npm run preview -- --port 4173` before running this suite.
// Uses system Chromium; override CHROMIUM_PATH, TEST_URL and TEST_ARTIFACTS as needed.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
const smoke = process.argv.includes('--smoke');
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
  // Collection navigation must preserve an attempt until Play is explicitly chosen.
  await page.getByRole('button', {name: /^Choose puzzle/}).tap();
  const choices = page.locator('.puzzle-choice');
  assert.equal(await choices.count(), 8);
  await choices.last().tap();
  await page.getByRole('button', {name: 'Play this puzzle', exact: true}).tap();
  await page.waitForFunction(() => window.__game.level.id === 8);
  await page.reload(); await page.waitForFunction(() => window.__game && window.__board);
  assert.equal(await page.evaluate(() => window.__game.level.id), 8, 'selected puzzle did not persist');
  await page.getByRole('button', {name: /^Choose puzzle/}).tap();
  await choices.first().tap();
  await page.getByRole('button', {name: 'Keep playing', exact: true}).tap();
  await page.waitForFunction(() => document.querySelector('.modal-backdrop').hidden);
  assert.equal(await page.evaluate(() => window.__game.level.id), 8, 'cancel changed the puzzle');
  await page.getByRole('button', {name: /^Choose puzzle/}).tap();
  await choices.first().tap();
  await page.getByRole('button', {name: 'Play this puzzle', exact: true}).tap();
  await page.waitForFunction(() => window.__game.level.id === 1);
  console.log('PASS: collection selection, cancel, and persisted puzzle');
  let rotations = 0;
  async function reveal(id) {
    assert.equal(await page.evaluate(id => window.__game.isAvailable(id), id), true, `rule-blocked solution screw ${id}`);
    const target = page.locator(`[data-screw-id="${id}"]`);
    const normal = await page.evaluate(id => window.__game.level.screws.find(s => s.id === id).normal, id);
    const desiredPitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, Math.asin(normal[1])));
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
    const expectedHint=await page.evaluate(()=>window.__game.getHint().screwId);
    if(expectedHint===id){
      await page.locator('#hint').tap();
      await page.waitForFunction(id=>window.__board.hintId===id,id);
      if(await target.isVisible()&&await target.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}))return target;
    }
    await page.screenshot({ path: `${artifacts}/unreachable-${id}.png`, fullPage: true });
    const failure=await page.evaluate(id => {
      const el = document.querySelector(`[data-screw-id="${id}"]`), r = el.getBoundingClientRect();
      return {id, view: window.__board.getView(), hidden: el.hidden, disabled: el.disabled,
        rect: {x:r.x,y:r.y,w:r.width,h:r.height}, over: document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.getAttribute('data-screw-id') || document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.className,
        removed: [...window.__game.state.removedIds]};
    }, id);
    await writeFile(`${artifacts}/unreachable-${id}.json`,JSON.stringify(failure,null,2));
    console.log('UNREACHABLE', {...failure,removed:failure.removed.length});
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
  const touch = await context.newCDPSession(page);
  const projection = () => page.evaluate(() => {
    const pair = window.__game.level.screws.filter(s => s.plateId === window.__game.level.screws[0].plateId).slice(0, 2);
    const host = document.querySelector('.board-wrap');
    const points = pair.map(s => {
      const b = document.querySelector(`[data-screw-id="${s.id}"]`);
      return [parseFloat(b.style.left) * host.clientWidth / 100, parseFloat(b.style.top) * host.clientHeight / 100];
    });
    return { distance: Math.hypot(points[0][0] - points[1][0], points[0][1] - points[1][1]), zoom: window.__board.getView().zoom, pageScale: visualViewport.scale, width: innerWidth };
  });
  const beforePinch = await projection();
  const boardBox = await page.locator('.board-wrap').boundingBox();
  const center = { x: boardBox.x + boardBox.width / 2, y: boardBox.y + boardBox.height / 2 };
  await page.screenshot({ path: `${artifacts}/before-pinch.png`, fullPage: true });
  await touch.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{id: 1, x:center.x-40,y:center.y}, {id: 2,x:center.x+40,y:center.y}]});
  for (let step=1; step<=6; step++) {
    const spread=40+step*15;
    await touch.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{id:1,x:center.x-spread,y:center.y},{id:2,x:center.x+spread,y:center.y}]});
  }
  await touch.send('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(100);
  const afterPinch = await projection();
  assert.ok(afterPinch.zoom > beforePinch.zoom * 1.35, 'two-finger pinch did not zoom the model');
  assert.equal(afterPinch.zoom, 2.2, 'model pinch did not respect its maximum zoom');
  assert.ok(Math.abs(afterPinch.distance / beforePinch.distance - afterPinch.zoom / beforePinch.zoom) < .03, 'model projection did not follow zoom');
  assert.equal(afterPinch.pageScale, 1, 'pinch zoomed the browser page');
  assert.equal(afterPinch.width, beforePinch.width);
  assert.equal(await page.evaluate(() => window.__game.state.moves), 0, 'pinch removed a screw');
  await page.screenshot({path:`${artifacts}/after-pinch.png`,fullPage:true});
  const panStart=await page.evaluate(()=>window.__board.getView());
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:center.x-35,y:center.y},{id:2,x:center.x+35,y:center.y}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:center.x-5,y:center.y+20},{id:2,x:center.x+65,y:center.y+20}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const panned=await page.evaluate(()=>window.__board.getView());
  assert.ok(Math.abs(panned.panX-panStart.panX)>.01&&Math.abs(panned.panY-panStart.panY)>.01,'two-finger pan did not move the inspection view');
  assert.equal(await page.evaluate(()=>window.__game.state.moves),0,'panning removed a screw');
  await page.locator('#reset-view').tap();
  await page.waitForFunction(()=>window.__board.getView().zoom===1&&window.__board.getView().panX===0&&window.__board.getView().panY===0);
  const first = await page.evaluate(() => window.__game.level.solution[0]);
  let target = await reveal(first);
  await page.screenshot({ path: `${artifacts}/before-rotation.png`, fullPage: true });
  const before = await page.evaluate(() => window.__board.getView());
  const beforeBox = await target.boundingBox();
  const beforePosition = await target.evaluate(el => ({ left: el.style.left, top: el.style.top }));
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
  await page.waitForFunction(() => window.__board.getView().zoom === 1, undefined, {timeout: 3000});
  assert.equal(await page.evaluate(() => window.__board.getView().zoom), 1, 'reset did not restore model zoom');
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
  const extractionFaces = new Set();
  const pose = id => page.evaluate(id => {
    const screw = window.__board.screws.get(id);
    return {position:screw.position.toArray(),quaternion:screw.quaternion.toArray(),visible:screw.visible};
  }, id);
  const levelsToTest = smoke ? 1 : levelCount;
  const startLevel=smoke?1:Number(process.env.TEST_START_LEVEL||1);
  assert.ok(Number.isInteger(startLevel)&&startLevel>=1&&startLevel<=levelsToTest);
  if(startLevel>1){
    await page.getByRole('button',{name:/^Choose puzzle/}).tap();
    await page.locator(`[data-level-index="${startLevel-1}"]`).tap();
    await page.getByRole('button',{name:'Play this puzzle',exact:true}).tap();
    await page.waitForFunction(level=>window.__game.level.id===level,startLevel);
  }
  for (let level = startLevel; level <= levelsToTest; level++) {
    if (level === 2) {
      const losingPath = await page.evaluate(() => {
        const original=window.__game, simulated=new original.constructor(original.level);
        const failed=new Set();let visits=0;
        function search(path){
          if(simulated.state.status==='lost')return path;
          if(path.length>=20||++visits>5000)return null;
          const key=[...simulated.state.removedIds].sort().join(',');if(failed.has(key))return null;
          const active=new Set(simulated.state.trays.map(t=>t.color));
          const candidates=simulated.level.screws.filter(s=>simulated.isAvailable(s.id)).sort((a,b)=>Number(active.has(a.color))-Number(active.has(b.color)));
          const equivalent=new Set();
          for(const screw of candidates){
            const group=screw.plateId+':'+screw.color;if(equivalent.has(group))continue;equivalent.add(group);
            simulated.selectScrew(screw.id);const found=search([...path,screw.id]);simulated.undo();if(found)return found;
          }
          failed.add(key);return null;
        }
        return search([]);
      });
      assert.ok(losingPath,'no legal overflow path found for recovery coverage');
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
    let interiorCaptured=false;
    const ids = await page.evaluate(() => window.__game.level.solution);
    for (let i = 0; i < ids.length; i++) {
      const target = await reveal(ids[i]);
      const normal = await page.evaluate(id => window.__game.level.screws.find(s => s.id === id).normal, ids[i]);
      const axis = normal.map(Math.abs).indexOf(Math.max(...normal.map(Math.abs)));
      const face = `${axis}:${Math.sign(normal[axis])}`;
      const checkExtraction = !extractionFaces.has(face);
      const basePose = checkExtraction ? await pose(ids[i]) : null;
      await target.tap(); removed++;
      if (!await page.evaluate(id => window.__game.state.removedIds.has(id), ids[i])) {
        await page.screenshot({ path: `${artifacts}/tap-failed-${ids[i]}.png`, fullPage: true });
        throw new Error(`Real tap did not remove ${ids[i]}: ${JSON.stringify(await page.evaluate(() => ({moves:window.__game.state.moves,removed:[...window.__game.state.removedIds],view:window.__board.getView()})))}`);
      }
      if (checkExtraction) {
        await page.waitForFunction(({id,base,normal}) => {
          const p=window.__board.screws.get(id).position.toArray();
          return p.reduce((sum,n,j)=>sum+(n-base[j])*normal[j],0)>.01;
        }, {id:ids[i],base:basePose.position,normal}, {timeout:3000,polling:'raf'});
        const animated = await pose(ids[i]);
        const delta = animated.position.map((n,j) => n-basePose.position[j]);
        const along = delta.reduce((sum,n,j) => sum+n*normal[j],0);
        const sideways = Math.hypot(...delta.map((n,j) => n-along*normal[j]));
        assert.ok(along > .01, `${face}: screw did not move outward along its own normal`);
        assert.ok(sideways < 1e-5, `${face}: screw drifted away from its extraction axis`);
        assert.ok(animated.quaternion.some((n,j) => Math.abs(n-basePose.quaternion[j]) > .01), `${face}: screw did not spin`);
        const localSpin = await page.evaluate(({id,base})=>{
          const q=window.__board.screws.get(id).quaternion;
          return q.clone().fromArray(base).invert().multiply(q).toArray();
        },{id:ids[i],base:basePose.quaternion});
        assert.ok(Math.abs(localSpin[0])+Math.abs(localSpin[1]) < 1e-6, `${face}: spin axis was not the screw's local normal`);
        await page.screenshot({path:`${artifacts}/extraction-${face.replace(':','-')}.png`,fullPage:true});
        await page.locator('#undo').tap();
        const restored = await pose(ids[i]);
        assert.equal(restored.visible, true);
        for (const key of ['position','quaternion']) assert.ok(restored[key].every((n,j) => Math.abs(n-basePose[key][j]) < 1e-8), `${face}: Undo did not restore exact ${key}`);
        assert.equal(await page.evaluate(id => window.__game.state.removedIds.has(id), ids[i]), false);
        await (await reveal(ids[i])).tap();
        extractionFaces.add(face);
      }
      if(!interiorCaptured&&await page.evaluate(()=>{
        const state=window.__game.state;
        return state.level.plates.filter(p=>!p.interior).every(p=>state.removedPlateIds.has(p.id))
          &&state.level.plates.some(p=>p.interior&&!state.removedPlateIds.has(p.id));
      })){
        await page.screenshot({path:`${artifacts}/interior-${level}.png`,fullPage:true});interiorCaptured=true;
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
  assert.equal(extractionFaces.size, 6, 'did not verify extraction on all six face directions');
  assert.deepEqual(errors, [], 'browser errors');
  console.log(`PASS (${smoke ? "smoke: first level only; campaign overflow and later levels skipped" : `campaign levels ${startLevel}–${levelCount}`}): portrait, WebGL, four buckets, model-only pinch, touch-drag rotation, six-face outward extraction/Undo, focus, hints/restart, saved progress. ${removed} screws, ${rotations} turns. Screenshots: ${artifacts}`);
  const reduced = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const reducedPage = await reduced.newPage();
  const reducedErrors=[];
  reducedPage.on('pageerror',error=>reducedErrors.push(error.message));
  await reducedPage.goto(process.env.TEST_URL || 'http://127.0.0.1:4173');
  await reducedPage.waitForFunction(()=>window.__game && window.__board);
  const reducedId = await reducedPage.evaluate(()=>window.__game.level.solution[0]);
  const readReducedPose = () => reducedPage.evaluate(id=>{
    const screw=window.__board.screws.get(id);
    return {position:screw.position.toArray(),quaternion:screw.quaternion.toArray(),visible:screw.visible};
  },reducedId);
  const reducedBase = await readReducedPose();
  await reducedPage.locator('#hint').tap();
  await reducedPage.locator(`[data-screw-id="${reducedId}"]`).tap();
  assert.equal(await reducedPage.evaluate(id=>window.__game.state.removedIds.has(id),reducedId),true);
  assert.equal((await readReducedPose()).visible,false,'reduced-motion extraction should finish immediately');
  await reducedPage.locator('#undo').tap();
  assert.deepEqual(await readReducedPose(),reducedBase,'reduced-motion Undo did not restore attached pose');
  assert.deepEqual(reducedErrors,[]);
  await reduced.close();
  console.log('PASS: reduced-motion extraction and exact Undo restoration');
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
