// Build and start a production preview first. Tests use real touch inputs; the
// browser clock advances only for pause/timeout checks, not to mutate game state.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const url=process.env.TEST_URL||'http://127.0.0.1:4173';
const artifacts=process.env.TEST_ARTIFACTS||'/tmp/screw-arcade-browser';
await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.clock.install();
  await page.goto(url); await page.waitForFunction(()=>window.__board&&window.__game);
  const visible=()=>page.locator('.screw-target:not([hidden]):not([disabled])').first();
  await visible().tap(); assert.equal(await page.evaluate(()=>window.__game.state.moves),1);
  await page.locator('#mode-arcade').tap();
  await page.waitForFunction(()=>!!window.__arcade);
  assert.equal(await page.evaluate(()=>window.__game.level.screws.length),18);
  const time=await page.evaluate(()=>window.__arcade.remainingMs);
  await page.clock.fastForward(1000);
  assert.ok(await page.evaluate(t=>window.__arcade.remainingMs<=t-900,time));
  await page.locator('#help').tap();
  const paused=await page.evaluate(()=>window.__arcade.remainingMs);
  await page.clock.fastForward(10000);
  assert.equal(await page.evaluate(()=>window.__arcade.remainingMs),paused,'help did not pause the timer');
  await page.getByRole('button',{name:'Continue run',exact:true}).tap();
  for(const [width,height]of [[390,844],[360,740],[320,568]]){
    await page.setViewportSize({width,height});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(height>=740)assert.ok(await page.evaluate(()=>document.querySelector('.toolbar').getBoundingClientRect().bottom<=innerHeight),'Arcade controls overflow portrait');
  }
  await page.setViewportSize({width:360,height:740});
  async function reveal(id){
    assert.equal(await page.evaluate(id=>window.__game.isAvailable(id),id),true);
    const normal=await page.evaluate(id=>window.__game.level.screws.find(s=>s.id===id).normal,id);
    const view=await page.evaluate(()=>window.__board.getView());
    const pitch=Math.max(-1.1,Math.min(1.1,Math.asin(normal[1])));
    await page.locator('.board-wrap').focus();
    const key=pitch>view.pitch?'ArrowUp':'ArrowDown';
    for(let i=0;i<Math.round(Math.abs(pitch-view.pitch)/.25);i++)await page.keyboard.press(key);
    if(Math.hypot(normal[0],normal[2])>.1){
      const yaw=Math.atan2(normal[0],normal[2]),delta=Math.atan2(Math.sin(yaw-view.yaw),Math.cos(yaw-view.yaw));
      for(let i=0;i<Math.round(Math.abs(delta)/(Math.PI/4));i++)await page.locator(delta>0?'#rotate-right':'#rotate-left').tap();
    }
    const target=page.locator(`[data-screw-id="${id}"]`);
    for(let i=0;i<=8;i++){
      if(await target.isVisible()&&await target.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}))return target;
      await page.locator('#rotate-right').tap();
    }
    throw Error(`Arcade screw unreachable: ${id}`);
  }
  const ids=await page.evaluate(()=>window.__game.level.solution);
  await (await reveal(ids[0])).tap();
  assert.equal(await page.evaluate(()=>window.__arcade.score),100);
  assert.ok(await page.locator('.score-popup').count()>0,'missing on-screen score');
  assert.ok(await page.locator('.pixel-particle').count()>0,'missing pixel burst');
  await page.locator('#undo').tap();
  await page.waitForFunction(()=>window.__game.state.moves===0);
  assert.equal(await page.evaluate(()=>window.__arcade.score),0,'Undo allowed score farming');
  for(let i=0;i<ids.length;i++){
    await (await reveal(ids[i])).tap();
    if(i===2){
      assert.equal(await page.evaluate(()=>window.__game.state.completedTrays),1);
      assert.ok((await page.locator('.score-popup').allTextContents()).some(text=>text.includes('+3s')),'bucket time popup missing');
      assert.ok(await page.locator('.arcade-effects span').count()<=120,'effects are not bounded');
      await page.screenshot({path:`${artifacts}/arcade-play.png`,fullPage:true});
    }
  }
  await page.waitForFunction(()=>window.__arcade.modelsCleared===1&&window.__game.level.id===2);
  assert.equal(await page.locator('.modal-backdrop').isVisible(),false,'round transition interrupted the run');
  const score=await page.evaluate(()=>window.__arcade.score);
  assert.ok(score>0);
  await page.locator('#mode-classic').tap();
  await page.waitForFunction(()=>window.__arcade===null);
  assert.equal(await page.evaluate(()=>window.__game.state.moves),1,'Arcade erased Classic attempt');
  assert.equal(await page.locator('#arcade-hud').isVisible(),false);
  assert.equal(await page.locator('.arcade-effects span').count(),0);
  await page.locator('#mode-arcade').tap();
  await page.waitForFunction(()=>!!window.__arcade);
  await page.clock.fastForward(91000);
  await page.getByRole('heading',{name:'Time’s up',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__arcade.ended),true);
  assert.ok(await page.evaluate(score=>Number(localStorage.getItem('screw-garden-arcade-best'))>=score,score));
  await page.getByRole('button',{name:'Play again',exact:true}).tap();
  await page.waitForFunction(()=>window.__arcade.remainingMs>44000&&!window.__arcade.ended);
  assert.equal(await page.evaluate(()=>window.__arcade.score),0);
  assert.deepEqual(errors,[],'browser errors');
  console.log('PASS: Arcade clock/pause, portrait HUD, score/bucket bonuses, particles/popups, Undo accounting, 18-screw round, automatic next model, Classic preservation, timeout/retry and best score.');
  const reduced=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const rp=await reduced.newPage();await rp.goto(url);await rp.waitForFunction(()=>window.__board);
  await rp.locator('#mode-arcade').tap();await rp.waitForFunction(()=>window.__arcade);
  const reducedIds=await rp.evaluate(()=>window.__game.level.solution.slice(0,3));
  for(const id of reducedIds){
    await rp.locator('#hint').tap();
    await rp.locator(`[data-screw-id="${id}"].is-hint`).waitFor({state:'visible'});
    await rp.locator(`[data-screw-id="${id}"]`).tap();
    assert.ok(await rp.locator('.score-popup').count()>0);
    assert.equal(await rp.locator('.pixel-particle,.arcade-flash').count(),0,'reduced motion must suppress particles/flashes');
  }
  assert.equal(await rp.evaluate(()=>window.__game.state.completedTrays),1);
  await reduced.close();
  console.log('PASS: reduced-motion score feedback without particles or flashes.');
}finally{await browser.close();}
