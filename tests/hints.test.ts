import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game';
import { levels, type Level } from '../src/levels';

for (const level of levels) test(`hints recover from an alternative opening in level ${level.id}`, () => {
  const game = new Game(level);
  const alternative = [...level.screws].reverse().find(s => game.isAvailable(s.id))!;
  game.selectScrew(alternative.id);
  for (let n = 0; n < level.screws.length && game.state.status === 'playing'; n++) {
    const before = structuredClone(game.state);
    const canUndo = game.canUndo;
    const started = performance.now();
    const hint = game.getHint();
    assert.ok(performance.now() - started < 1000, 'hint stalled the game');
    assert.deepEqual(game.state, before, 'asking for a hint changed game state');
    assert.equal(game.canUndo, canUndo);
    assert.ok(hint.screwId, hint.message);
    assert.equal(game.selectScrew(hint.screwId), true);
    assert.notEqual(game.state.status, 'lost');
  }
  assert.equal(game.state.status, 'won');
  assert.equal(game.getHint().screwId, null);
  // Search history must not leak into live undo history.
  for (let n = 0; n < level.screws.length; n++) assert.equal(game.undo(), true);
  assert.equal(game.undo(), false);
  assert.equal(game.state.moves, 0);
});

test('deadlocked shelf and lost games advise undo instead of offering a losing move', () => {
  const screws = Array.from({length: 6}, (_, i) => ({id: `mint-${i}`, plateId: 'cover', color: 'mint' as const, x: 0, y: 0, z: 0, blockedBy: []}));
  const level: Level = {...levels[0], plates: [], screws, solution: screws.map(s => s.id), trayOrder: ['coral', 'blue', 'gold', 'violet', 'mint', 'mint']};
  const game = new Game(level);
  for (let i = 0; i < 5; i++) game.selectScrew(`mint-${i}`);
  assert.equal(game.state.status, 'playing');
  assert.equal(game.getHint().screwId, null);
  assert.match(game.getHint().message, /undo/i);
  game.selectScrew('mint-5');
  assert.equal(game.state.status, 'lost');
  assert.equal(game.getHint().screwId, null);
  assert.match(game.getHint().message, /undo/i);
});
