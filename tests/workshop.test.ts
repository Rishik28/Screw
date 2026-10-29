import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game';
import {levels} from '../src/levels';
import {WorkshopRun,freshProfile,loadProfile,nextModel,workshopLevel,purchase,purchaseReason,UPGRADES,restore} from '../src/workshop';
function seeded(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function complete(run:WorkshopRun){for(const id of run.game.level.solution){assert.ok(run.select(id).accepted,id);assert.notEqual(run.game.state.status,'lost',id);}}
test('all randomized Workshop models have verified solutions at minimum capacity',()=>{
  for(const base of levels)for(let seed=1;seed<=4;seed++){
    const level=workshopLevel(base,seeded(seed));
    for(const trayCount of [1,2,3,4]){
      const game=new Game(level,{trayCount,bufferCapacity:3});
      for(const id of level.solution){assert.ok(game.selectScrew(id));assert.notEqual(game.state.status,'lost');}
      assert.equal(game.state.status,'won');
    }
  }
});
test('Workshop uses one bucket/three shelf spaces, randomized variants and no-repeat persisted deck',()=>{
  const profile=freshProfile(),random=seeded(87);
  const first=Array.from({length:8},()=>nextModel(profile,random).id);
  assert.equal(new Set(first).size,8);assert.notEqual(nextModel(profile,random).id,first.at(-1));
  assert.deepEqual(loadProfile(JSON.stringify(profile)).deck,profile.deck);
  const a=new WorkshopRun(profile,levels[0],seeded(1)),b=new WorkshopRun(profile,levels[0],seeded(2));
  assert.equal(a.game.trayCount,1);assert.equal(a.game.bufferCapacity,3);
  assert.notDeepEqual(a.game.level.solution,b.game.level.solution);assert.notDeepEqual(a.game.level.trayOrder,b.game.level.trayOrder);
});
test('shelf failure keeps screw earnings, completion bonuses require a win',()=>{
  const profile=freshProfile(),run=new WorkshopRun(profile,levels[0],seeded(2));
  while(!run.ended){
    const id=run.game.level.screws.find(s=>run.game.isAvailable(s.id)&&!run.game.state.trays.some(t=>t.color===s.color))?.id;
    if(!id)break;run.select(id);
  }
  assert.equal(run.outcome,'shelf');assert.equal(run.game.state.buffer.length,4);
  assert.ok(profile.xp>0&&profile.scrap>0);assert.equal(run.rewards.completion.xp,0);assert.equal(run.rewards.speed.xp,0);
  const saved=loadProfile(JSON.stringify(profile));assert.equal(saved.xp,profile.xp);assert.equal(saved.scrap,profile.scrap);
});
test('Undo cannot farm screw XP, discoveries or tool recharge',()=>{
  const profile=freshProfile();profile.upgrades=['magnet','undo'];
  const run=new WorkshopRun(profile,levels[0],seeded(9));run.useMagnet();
  const ids=run.game.level.solution;
  for(const id of ids.slice(0,3))run.select(id);
  assert.equal(run.chargeProgress,1);const earned={xp:profile.xp,scrap:profile.scrap};
  assert.ok(run.undo());run.select(ids[2]);assert.deepEqual({xp:profile.xp,scrap:profile.scrap},earned);assert.equal(run.chargeProgress,1);
  for(const id of ids.slice(3,9))run.select(id);assert.equal(run.charges,1);assert.equal(run.chargeProgress,0);
});
test('completion and speed bonuses pay exactly once; discoveries reward genuine newly exposed layers',()=>{
  const profile=freshProfile(),run=new WorkshopRun(profile,levels[4],seeded(4));
  complete(run);assert.equal(run.outcome,'complete');
  assert.equal(run.rewards.screws.xp,levels[4].screws.length*5);
  assert.ok(run.rewards.discoveries.xp>=25);assert.ok(run.rewards.discoveries.xp<=25*levels[4].layerCount!);
  const base=run.rewards.screws.xp+run.rewards.discoveries.xp;
  assert.equal(run.rewards.completion.xp,Math.round(base*.3));assert.equal(run.rewards.speed.xp,Math.round(base*.2));
  const saved=JSON.stringify(profile);run.finish('complete');assert.equal(JSON.stringify(profile),saved);assert.equal(profile.completed,1);
});
test('missing the speed target retains completion; timeout and abandon retain earnings',()=>{
  const run=new WorkshopRun(freshProfile(),levels[0],seeded(3));run.advance(run.targetMs+1);complete(run);
  assert.ok(run.rewards.completion.xp);assert.equal(run.rewards.speed.xp,0);
  for(const outcome of ['timeout','abandoned'] as const){
    const profile=freshProfile(),r=new WorkshopRun(profile,levels[0],seeded(2));r.select(r.game.level.solution[0]);
    const xp=profile.xp;if(outcome==='timeout')r.advance(r.limitMs+1000);else r.finish(outcome);
    assert.equal(r.outcome,outcome);assert.equal(profile.xp,xp);assert.equal(r.select(r.game.level.solution[1]).accepted,false);
  }
});
test('upgrades have XP/prerequisite/currency gates, exclusive branches, four bucket cap and next-run stats',()=>{
  const profile=freshProfile(),run=new WorkshopRun(profile,levels[0],seeded(1));
  assert.equal(purchase(profile,'bucket2'),false);profile.xp=5000;profile.scrap=5000;
  assert.equal(purchase(profile,'bucket3'),false);
  for(const id of ['bucket2','bucket3','bucket4','shelf4','shelf5','magnet','charger','reservoir','time1','time2','xp1','scholar'])assert.ok(purchase(profile,id),id);
  assert.equal(purchase(profile,'shelf6'),false);assert.equal(purchase(profile,'salvager'),false);assert.equal(purchase(profile,'bucket4'),false);
  const next=new WorkshopRun(profile,levels[0],seeded(1));assert.equal(next.game.trayCount,4);assert.equal(next.game.bufferCapacity,5);assert.equal(next.charges,2);assert.equal(next.chargeGoal,2);
  assert.equal(next.limitMs-run.limitMs,75000);assert.equal(next.targetMs,run.targetMs);assert.equal(run.game.trayCount,1);
  complete(next);assert.equal(next.rewards.screws.xp,Math.round(levels[0].screws.length*5*1.35));
  assert.equal(purchaseReason(profile,UPGRADES[0]),'Owned');
});
test('auto-fill only selects actual exposed matching screws and consumes a charge',()=>{
  const profile=freshProfile();profile.upgrades=['magnet'];const run=new WorkshopRun(profile,levels[0],seeded(2));
  const ids=run.useMagnet();assert.ok(ids.length>0&&ids.length<=3);assert.equal(run.charges,0);
  for(const id of ids){assert.ok(run.game.isAvailable(id));assert.equal(run.game.level.screws.find(s=>s.id===id)!.color,run.game.state.trays[0].color);run.select(id);}
  assert.deepEqual(run.useMagnet(),[]);
});
test('restoration costs scrap and malformed storage is sanitized',()=>{
  const profile=freshProfile();assert.equal(restore(profile),false);profile.scrap=1000;
  for(let i=0;i<3;i++)assert.ok(restore(profile));assert.equal(restore(profile),false);assert.equal(profile.restoration,3);
  assert.deepEqual(loadProfile('{'),freshProfile());
  const saved=loadProfile(JSON.stringify({version:1,xp:-5,scrap:'bad',restoration:99,upgrades:['unknown','bucket4'],deck:[1,1,2,99,'x']}));
  assert.equal(saved.xp,0);assert.equal(saved.scrap,0);assert.equal(saved.restoration,3);assert.deepEqual(saved.upgrades,[]);assert.deepEqual(saved.deck,[1,2]);
});

test('revealing, undoing and reopening an interior layer pays its discovery once',()=>{
  const profile=freshProfile(),run=new WorkshopRun(profile,levels[4],seeded(4));
  for(const id of run.game.level.solution){
    const hit=run.select(id);
    if(hit.discovered.length){
      const reward={...run.rewards.discoveries},xp=profile.xp;
      assert.ok(run.undo());assert.ok(run.select(id).accepted);
      assert.deepEqual(run.rewards.discoveries,reward);assert.equal(profile.xp,xp);return;
    }
  }
  assert.fail('No interior was discovered');
});
