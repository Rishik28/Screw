// Focused tactile feedback checks in both modes, observing actual Web Animations.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const url=process.env.TEST_URL||'http://127.0.0.1:4173';
const artifacts=process.env.TEST_ARTIFACTS||'/tmp/screw-tactile-browser';
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const mode of ['classic','arcade'])for(const reduced of [false,true]){
  const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
  await context.addInitScript(()=>{
    window.__motionLog=[];
    const original=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){
      if(this.matches('.app-shell,.tray-completion,.tray-slot,.tray'))window.__motionLog.push({
        target:this.className,frames:Array.isArray(frames)?frames:[],
        filled:this.querySelectorAll('.tray-slot.is-filled').length,
        color:this.dataset.color,check:!!this.querySelector('.bucket-check'),
        pointerEvents:getComputedStyle(this).pointerEvents,
      });
      return original.call(this,frames,options);
    };
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.__board&&window.__game);
  if(mode==='arcade'){await page.locator('#mode-arcade').tap();await page.waitForFunction(()=>window.__arcade);}
  await page.evaluate(()=>{window.__zoomPeak=1;const sample=()=>{window.__zoomPeak=Math.max(window.__zoomPeak,window.__board.camera.zoom/window.__board.getView().zoom);requestAnimationFrame(sample);};requestAnimationFrame(sample);});
  const ids=await page.evaluate(()=>window.__game.level.solution.slice(0,4));
  for(let i=0;i<3;i++){
    await page.locator('#hint').tap();
    const target=page.locator(`[data-screw-id="${ids[i]}"].is-hint`);
    await target.waitFor({state:'visible'});await target.tap();
    assert.equal(await page.evaluate(()=>window.__game.state.moves),i+1);
  }
  assert.equal(await page.evaluate(()=>window.__game.state.completedTrays),1);
  assert.equal(await page.locator('.tray-row > .tray').count(),4,'completion clones must not become live buckets');
  const log=await page.evaluate(()=>window.__motionLog);
  const clears=log.filter(x=>x.target==='tray-completion');
  assert.equal(clears.length,1);assert.equal(clears[0].filled,3);assert.equal(clears[0].color,'coral');assert.ok(clears[0].check);
  assert.equal(clears[0].pointerEvents,'none');
  const shakes=log.filter(x=>x.target.includes('app-shell'));
  assert.ok(shakes.length>0,'no real stage shake was started');
  assert.ok(clears[0].frames.some(frame=>String(frame.transform).includes('scale')),'bucket did not squash');
  assert.ok(log.some(x=>x.target.includes('tray-slot')),'slot fill did not pop');
  // Camera kick is transient and must restore the player's chosen model zoom.
  await page.waitForFunction(()=>window.__board.punchStrength===0);
  assert.ok(await page.evaluate(()=>window.__zoomPeak>1.02),'no visible camera punch occurred');
  assert.equal(await page.evaluate(()=>window.__board.camera.zoom),await page.evaluate(()=>window.__board.getView().zoom));
  // Hold a completion at its midpoint for review, then play through it. This
  // pauses only the decorative copy, never the game or interaction handlers.
  await page.evaluate(()=>{for(const ghost of document.querySelectorAll('.tray-completion'))for(const animation of ghost.getAnimations()){animation.pause();animation.currentTime=140;}});
  await page.screenshot({path:`${artifacts}/${mode}-${reduced?'reduced':'motion'}.png`,fullPage:true});
  await page.locator('#hint').tap();await page.locator(`[data-screw-id="${ids[3]}"].is-hint`).waitFor({state:'visible'});
  await page.locator(`[data-screw-id="${ids[3]}"]`).tap();
  assert.equal(await page.evaluate(()=>window.__game.state.moves),4,'feedback blocked the next screw');
  await page.locator('#undo').tap();await page.waitForFunction(()=>window.__game.state.moves===3);
  assert.equal(await page.locator('.tray-completion').count(),0,'Undo left stale completion feedback');
  assert.equal(await page.evaluate(()=>window.__motionLog.filter(x=>x.target==='tray-completion').length),1,'Undo replayed a completion');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${mode}, ${reduced?'full motion with OS reduce preference':'tactile motion'} — fill, clear/replacement, live input, Undo, no errors.`);
  await context.close();
 }
}finally{await browser.close();}
