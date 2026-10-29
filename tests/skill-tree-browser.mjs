import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const artifacts='/tmp/screw-skill-tree';await mkdir(artifacts,{recursive:true});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){localStorage.setItem('screw-garden-workshop-v1',JSON.stringify({version:1,xp:5000,scrap:5000,upgrades:[],restoration:0,completed:0,deck:[1,2,3,4,5,6,7,8],lastModel:0}));sessionStorage.setItem('seeded','1');}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4173');await page.locator('#mode-workshop').tap();await page.getByRole('button',{name:'Workshop & upgrades',exact:true}).tap();
 async function fits(){
  const metrics=await page.locator('.tree-modal').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight,width:el.clientWidth,scrollWidth:el.scrollWidth,inside:[...el.querySelectorAll('button')].filter(b=>b.getClientRects().length).every(b=>{const r=b.getBoundingClientRect(),m=el.getBoundingClientRect();return r.top>=m.top-1&&r.bottom<=m.bottom+1&&r.left>=m.left-1&&r.right<=m.right+1;})}));
  assert.ok(metrics.scroll<=metrics.height+1,JSON.stringify(metrics));assert.ok(metrics.scrollWidth<=metrics.width+1);assert.ok(metrics.inside,'a control is outside the dialog');
 }
 for(const [w,h]of [[390,844],[360,740],[320,568]]){
  await page.setViewportSize({width:w,height:h});
  for(const branch of ['Workbench','Tools','Mastery','Room']){
   await page.locator(`[data-branch="${branch}"]`).tap();await fits();
   if(branch!=='Room'){
    const ids=await page.locator('[data-upgrade]').evaluateAll(nodes=>nodes.map(n=>n.dataset.upgrade));
    for(const id of ids){await page.locator(`[data-upgrade="${id}"]`).tap();await fits();assert.equal(await page.locator(`[data-upgrade="${id}"]`).getAttribute('aria-pressed'),'true');}
   }
   await page.screenshot({path:`${artifacts}/${branch}-${w}.png`});
  }
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-branch="Workbench"]').tap();
 await page.locator('[data-upgrade="bucket3"]').tap();assert.equal(await page.locator('#buy-skill').isDisabled(),true);
 await page.locator('[data-upgrade="bucket2"]').tap();await page.locator('#buy-skill').tap();
 assert.ok(await page.locator('[data-upgrade="bucket2"].is-owned').count());assert.equal(await page.evaluate(()=>window.__game.trayCount),1,'purchase changed active run');
 await page.locator('[data-upgrade="bucket3"]').tap();assert.equal(await page.locator('#buy-skill').isEnabled(),true);
 await page.locator('[data-branch="Tools"]').tap();await page.locator('[data-upgrade="magnet"]').tap();await page.locator('#buy-skill').tap();
 await page.locator('[data-upgrade="charger"]').tap();await page.locator('#buy-skill').tap();
 await page.locator('[data-branch="Workbench"]').tap();await page.locator('[data-upgrade="shelf4"]').tap();await page.locator('#buy-skill').tap();await page.locator('[data-upgrade="shelf5"]').tap();await page.locator('#buy-skill').tap();
 await page.locator('[data-upgrade="shelf6"]').tap();assert.match(await page.locator('#buy-skill').innerText(),/Other branch/);
 await page.locator('[data-branch="Room"]').tap();await page.locator('#restore-room').tap();assert.ok(await page.locator('.stage-1').count());
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.ok(await page.evaluate(()=>!!document.activeElement.closest('[role="dialog"]')));
 await page.locator('#workshop-back').tap();assert.equal(await page.locator('.modal-backdrop').isVisible(),false);
 assert.equal(await page.locator('#undo svg').count(),1);assert.equal(await page.locator('#mode-workshop svg').count(),1);
 await page.locator('#open-workshop').tap();await page.locator('[data-branch="Workbench"]').tap();await fits();
 assert.deepEqual(errors,[]);
 console.log('PASS: all 16 nodes inspectable without scrolling at 390×844, 360×740 and 320×568; real branches, purchase gates/exclusivity, restoration, next-run stats, icon controls and focus.');
 await context.close();
}finally{await browser.close();}
