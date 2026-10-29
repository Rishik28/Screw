import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{window.__pulses=[];Object.defineProperty(navigator,'vibrate',{value:ms=>{window.__pulses.push(ms);return true;},configurable:true});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.__board);
 await page.locator('#help').tap();assert.equal(await page.locator('#toggle-vibration').getAttribute('aria-pressed'),'false');
 await page.locator('#toggle-vibration').tap();assert.equal(await page.locator('#toggle-vibration').getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'Let’s play',exact:true}).tap();
 await page.evaluate(()=>{window.__pulses=[];window.__zoomPeak=1;const sample=()=>{window.__zoomPeak=Math.max(window.__zoomPeak,window.__board.camera.zoom/window.__board.getView().zoom);requestAnimationFrame(sample);};requestAnimationFrame(sample);});
 for(const id of await page.evaluate(()=>window.__game.level.solution.slice(0,3))){await page.locator('#hint').tap();await page.locator(`[data-screw-id="${id}"]`).tap();}
 assert.deepEqual(await page.evaluate(()=>window.__pulses),[10,10,20]);
 await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__zoomPeak),1);
 await page.reload();await page.locator('#help').tap();assert.equal(await page.locator('#toggle-vibration').getAttribute('aria-pressed'),'true');
 await page.locator('#toggle-vibration').tap();await page.getByRole('button',{name:'Let’s play',exact:true}).tap();
 await page.evaluate(()=>window.__pulses=[]);await page.locator('#hint').tap();const id=await page.evaluate(()=>window.__game.level.solution[0]);await page.locator(`[data-screw-id="${id}"]`).tap();assert.deepEqual(await page.evaluate(()=>window.__pulses),[]);
 await page.reload();await page.locator('#help').tap();assert.equal(await page.locator('#toggle-vibration').getAttribute('aria-pressed'),'false');
 assert.deepEqual(errors,[]);await context.close();
 const unsupported=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true});await unsupported.addInitScript(()=>Object.defineProperty(navigator,'vibrate',{value:undefined}));
 const p=await unsupported.newPage();await p.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await p.locator('#help').tap();assert.ok(await p.locator('#toggle-vibration').isDisabled());assert.match(await p.locator('.haptics-setting').innerText(),/unavailable/);await p.getByRole('button',{name:'Let’s play',exact:true}).tap();await p.locator('#hint').tap();const sid=await p.evaluate(()=>window.__game.level.solution[0]);await p.locator(`[data-screw-id="${sid}"]`).tap();assert.equal(await p.evaluate(()=>window.__game.state.moves),1);
 console.log('PASS: opt-in and persisted toggle, 10ms screw/20ms bucket API calls, off suppresses pulses, unsupported-browser gameplay, no camera zoom. Hardware intensity is not emulated.');
 await unsupported.close();
}finally{await browser.close();}
