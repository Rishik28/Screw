import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcadeSession, arcadeLevels, RUN_LIMIT, START_TIME } from '../src/arcade';
import { Game } from '../src/game';
import { levels, type Color, type Level } from '../src/levels';

function fixture(): Level {
  const colors: Color[] = ['coral', 'blue', 'mint', 'gold', 'violet', 'orange'];
  const screws = colors.flatMap(color => [0,1,2].map(i => ({id:`${color}-${i}`,plateId:color,color,x:0,y:0,z:0,blockedBy:[]})));
  return {...levels[0],screws,trayOrder:colors,solution:screws.map(s=>s.id)};
}
for (const level of arcadeLevels) test(`compact arcade model ${level.id} retains its structure and has a winning solution`, () => {
  assert.ok(level.screws.length >= 18 && level.screws.length <= 24);
  assert.equal(level.plates.length, levels[level.id-1].plates.length);
  for (const part of level.plates) assert.ok(level.screws.some(s=>s.plateId===part.id), `unfastened ${part.id}`);
  const game = new Game(level);
  for (const id of level.solution) assert.ok(game.selectScrew(id), `unreachable ${id}`);
  assert.equal(game.state.status, 'won');
  assert.equal(game.state.buffer.length, 0);
});

test('buckets award points and three seconds, with no unlimited clock accumulation', () => {
  const run = new ArcadeSession([fixture()]);
  run.select('coral-0'); run.select('coral-1'); const hit=run.select('coral-2');
  assert.equal(hit.buckets,1); assert.equal(hit.timeBonus,3000); assert.equal(hit.points,400);
  assert.equal(run.score,600); assert.equal(run.remainingMs,48000);
  for (const id of run.game.level.solution.filter(id=>!run.game.state.removedIds.has(id))) run.select(id);
  assert.equal(run.remainingMs,60000); assert.equal(run.modelsCleared,1);
  const score=run.score;
  assert.ok(run.nextRound()); assert.equal(run.score,score); assert.equal(run.roundIndex,1);
  run.advance(59000);
  for (let round=0;round<2;round++) {
    for(const id of run.game.level.solution) run.select(id);
    run.nextRound();
  }
  assert.equal(run.remainingMs,RUN_LIMIT-run.elapsedMs);
  run.advance(31000);
  assert.ok(run.ended); assert.equal(run.elapsedMs,RUN_LIMIT); assert.equal(run.remainingMs,0);
});

test('rapid successful screws build combos; misses and slow decisions reset them', () => {
  const run = new ArcadeSession([fixture()]);
  for(const id of ['coral-0','coral-1','coral-2','blue-0','blue-1']) run.select(id);
  assert.equal(run.multiplier,2); assert.equal(run.streak,5);
  run.advance(2100); assert.equal(run.streak,0); assert.equal(run.multiplier,1);
  run.select('blue-2'); assert.equal(run.streak,1);
  const score=run.score;
  assert.equal(run.select('missing').accepted,false);
  assert.equal(run.streak,0); assert.equal(run.score,score);
});

test('turning gives bounded combo grace while the run clock keeps advancing', () => {
  const run = new ArcadeSession([fixture()]);
  run.select('coral-0'); run.advance(2500,true);
  assert.equal(run.remainingMs,START_TIME-2500); assert.equal(run.streak,1);
  run.advance(301,true); assert.equal(run.streak,0, 'continuous rotation cannot preserve a combo indefinitely');
});

test('overflow rewinds safely, revokes prior awards, and costs five seconds', () => {
  const run = new ArcadeSession([fixture()]);
  for(const id of ['violet-0','violet-1','violet-2','orange-0','orange-1']) assert.ok(run.select(id).accepted);
  const hit=run.select('orange-2');
  assert.ok(hit.overflow); assert.equal(hit.accepted,false); assert.equal(hit.rewound,3);
  assert.equal(run.game.state.status,'playing'); assert.equal(run.game.state.buffer.length,2);
  assert.equal(run.game.state.removedIds.size,2); assert.equal(run.score,200);
  assert.equal(run.remainingMs,40000); assert.equal(run.streak,0);
  for(const id of run.game.level.solution) if(!run.game.state.removedIds.has(id)) run.select(id);
  assert.equal(run.game.state.status,'won','recovery must not discard colors or strand the puzzle');
});

test('Undo reverses both score and bucket time before charging its penalty', () => {
  const run = new ArcadeSession([fixture()]);
  run.select('coral-0');run.select('coral-1');run.select('coral-2');
  assert.ok(run.undo()); assert.equal(run.score,200); assert.equal(run.remainingMs,43000);
  assert.equal(run.game.state.trays[0].count,2); assert.equal(run.streak,0);
  run.select('coral-2'); assert.equal(run.score,600); assert.equal(run.remainingMs,46000);
});

test('timeout cannot be reversed by a new hit or Undo', () => {
  const run = new ArcadeSession([fixture()]);
  run.select('coral-0');run.advance(45000);
  assert.ok(run.ended); assert.equal(run.select('coral-1').accepted,false); assert.equal(run.undo(),false);
  assert.equal(run.score,100); assert.equal(run.remainingMs,0);
});
