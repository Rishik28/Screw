import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const url=process.env.TEST_URL||'http://127.0.0.1:4173';
const artifacts=process.env.TEST_ARTIFACTS||'/tmp/screw-workshop-browser';await mkdir(artifacts,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
async function setup(profile,reduced=false){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
  await context.addInitScript(profile=>{
    Math.random=()=>.999;
    if(profile&&!sessionStorage.getItem('fixture-loaded')){localStorage.setItem('screw-garden-workshop-v1',JSON.stringify(profile));sessionStorage.setItem('fixture-loaded','yes');}
  },profile);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install();await page.goto(url);await page.waitForFunction(()=>window.__board&&window.__game);
  return {context,page};
}
async function enter(page){await page.locator('#mode-workshop').tap();await page.getByRole('button',{name:'Start attempt',exact:true}).tap();}
async function reveal(page,id){
  assert.ok(await page.evaluate(id=>window.__game.isAvailable(id),id),id);
  const normal=await page.evaluate(id=>window.__game.level.screws.find(s=>s.id===id).normal,id);
  const desiredYaw=Math.hypot(normal[0],normal[2])>.1?Math.atan2(normal[0],normal[2]):0;
  const desiredPitch=Math.asin(normal[1]);
  const view=await page.evaluate(()=>window.__board.getView());
  let yawDelta=Math.atan2(Math.sin(desiredYaw-view.yaw),Math.cos(desiredYaw-view.yaw));
  // Continuous pointer drags allow exact-axis views without spending survey charges.
  const box=await page.locator('.board-wrap').boundingBox();
  const dx=-yawDelta/.009,dy=(desiredPitch-view.pitch)/.009;
  const chunks=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/90));
  for(let i=0;i<chunks;i++){
    const x=box.x+box.width/2,y=box.y+box.height/2;
    await page.mouse.move(x,y);await page.mouse.down();
    await page.mouse.move(x+9,y);await page.mouse.move(x+dx/chunks,y+dy/chunks);await page.mouse.up();
  }
  const target=page.locator(`[data-screw-id="${id}"]`);
  await target.waitFor({state:'visible',timeout:5000});
  assert.ok(await target.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el;}),`${id} is obstructed`);
  return target;
}
try{
  const {context,page}=await setup();
  // Existing Classic attempt must survive mode changes.
  await page.locator('.screw-target:not([hidden]):not([disabled])').first().tap();
  await enter(page);
  assert.equal(await page.evaluate(()=>window.__game.trayCount),1);assert.equal(await page.locator('.buffer-slot').count(),3);
  const target=await page.evaluate(()=>window.__workshop.targetMs);
  await page.locator('#help').tap();const paused=await page.evaluate(()=>window.__workshop.elapsedMs);await page.clock.fastForward(20000);
  assert.equal(await page.evaluate(()=>window.__workshop.elapsedMs),paused);
  await page.getByRole('button',{name:'Continue attempt',exact:true}).tap();
  for(const [width,height] of [[390,844],[360,740],[320,568]]){
    await page.setViewportSize({width,height});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
    if(height>=740)assert.ok(await page.locator('.toolbar').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),'toolbar below screen');
  }
  await page.setViewportSize({width:390,height:844});
  const ids=await page.evaluate(()=>window.__game.level.solution);
  await (await reveal(page,ids[0])).tap();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('screw-garden-workshop-v1')));
  assert.equal(saved.xp,5);assert.equal(saved.scrap,2);
  assert.ok(await page.locator('.score-popup').count());assert.ok(await page.locator('.salvage-chip').count());
  await page.locator('#undo').tap();await page.waitForFunction(()=>window.__game.state.moves===0);
  await (await reveal(page,ids[0])).tap();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('screw-garden-workshop-v1')).xp),5);
  await page.screenshot({path:`${artifacts}/workshop-play.png`,fullPage:true});
  for(const id of ids.slice(1))await (await reveal(page,id)).tap();
  await page.getByRole('heading',{name:'Model salvaged',exact:true}).waitFor();
  assert.ok(await page.evaluate(()=>window.__workshop.rewards.completion.xp>0));
  const elapsed=await page.evaluate(()=>window.__workshop.elapsedMs);
  assert.equal(await page.evaluate(()=>window.__workshop.rewards.speed.xp>0),elapsed<=target);
  await page.screenshot({path:`${artifacts}/workshop-results.png`,fullPage:true});
  await page.getByRole('button',{name:'Workshop & upgrades',exact:true}).tap();
  await page.locator('[data-upgrade="bucket2"]').tap();await page.locator('#buy-skill').tap();assert.ok(await page.locator('[data-upgrade="bucket2"].is-owned').count());
  await page.locator('[data-branch="Room"]').tap();
  await page.locator('#restore-room').tap();assert.ok(await page.locator('.workshop-scene.stage-1').count());
  await page.screenshot({path:`${artifacts}/workshop-tree.png`,fullPage:true});
  await page.getByRole('button',{name:'Next model',exact:true}).tap();await page.getByRole('button',{name:'Start attempt',exact:true}).tap();
  assert.equal(await page.evaluate(()=>window.__game.trayCount),2);assert.notEqual(await page.evaluate(()=>window.__game.level.id),1);
  await page.locator('#mode-classic').tap();assert.equal(await page.evaluate(()=>window.__game.state.moves),1);
  await page.locator('#mode-workshop').tap();assert.equal(await page.evaluate(()=>window.__game.trayCount),2);
  const beforeReload=await page.evaluate(()=>JSON.parse(localStorage.getItem('screw-garden-workshop-v1')));
  await page.reload();await enter(page);
  assert.equal(await page.evaluate(()=>window.__game.trayCount),2);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('screw-garden-workshop-v1')).xp),beforeReload.xp);
  console.log('PASS: minimum capacity, real-pointer/touch complete teardown, screw/Undo earnings, completion/speed rewards, purchases, restoration, shuffled next model, local save and Classic preservation.');
  await context.close();
  // Saved advanced profile exercises charged tools and the reduced-motion path.
  const fixture={version:1,xp:2000,scrap:500,upgrades:['magnet','undo','survey'],restoration:0,completed:0,deck:[1,2,3,4,5,6,7,8],lastModel:0};
  for(const reduced of [false,true]){
    const {page,context}=await setup(fixture,reduced);await enter(page);
    const count=await page.evaluate(()=>window.__workshop.autoFillIds.length);assert.ok(count);
    await page.locator('#magnet').tap();await page.waitForFunction(n=>window.__game.state.moves===n,count);
    assert.equal(await page.evaluate(()=>window.__workshop.charges),0);
    if(reduced){assert.ok(await page.locator('.pixel-particle,.salvage-chip,.impact-ring').count()>0,'full feedback remains enabled');}
    await page.locator('#hint').tap();assert.equal(await page.evaluate(()=>window.__workshop.hintCharges),2);
    assert.match(await page.locator('.status-line').innerText(),/Look for/);
    await page.locator('#restart').tap();await page.getByRole('button',{name:'End & keep earnings',exact:true}).tap();
    await page.getByRole('heading',{name:'Salvage banked',exact:true}).waitFor();
    assert.ok(await page.evaluate(()=>window.__workshop.profile.xp>2000));
    assert.equal(await page.evaluate(()=>window.__workshop.rewards.completion.xp),0);
    await page.getByRole('button',{name:'Retry this model',exact:true}).tap();await page.getByRole('button',{name:'Start attempt',exact:true}).tap();
    assert.equal(await page.evaluate(()=>window.__workshop.charges),1);
    await page.clock.fastForward(await page.evaluate(()=>window.__workshop.limitMs+100));
    await page.getByRole('heading',{name:'Time’s up',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.__workshop.rewards.speed.xp),0);
    console.log(`PASS: ${reduced?'full effects with OS reduce preference':'full effects'}, charged auto-fill, limited part survey, abandon/retry earnings, timeout without completion bonus.`);
    await context.close();
  }
  {
    const {page,context}=await setup();await enter(page);
    for(let i=0;i<4;i++){
      const id=await page.evaluate(()=>window.__game.level.screws.find(s=>window.__game.isAvailable(s.id)&&!window.__game.state.trays.some(t=>t.color===s.color))?.id);
      assert.ok(id,'expected an exposed future-color decoy');await(await reveal(page,id)).tap();
    }
    await page.getByRole('heading',{name:'Shelf full',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.__workshop.rewards.screws.xp),20);
    assert.equal(await page.evaluate(()=>window.__workshop.rewards.completion.xp),0);
    await page.getByRole('button',{name:'Workshop & upgrades',exact:true}).tap();
    assert.equal(await page.locator('.modal').evaluate(el=>el.scrollTop),0,'skill tree should open without scroll');
    await page.screenshot({path:`${artifacts}/workshop-room.png`,fullPage:true});
    await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
    assert.ok(await page.evaluate(()=>!!document.activeElement.closest('[role="dialog"]')),'focus escaped the skill tree');
    console.log('PASS: real shelf-overflow failure retains earnings, accessible skill-tree focus and initial scroll.');
    await context.close();
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
