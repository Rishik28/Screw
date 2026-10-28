import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, BUFFER_CAPACITY, ACTIVE_TRAY_COUNT } from '../src/game';
import { levels, type Level, type Color } from '../src/levels';

function fixture(): Level {
  const colors: Color[] = ['coral', 'blue', 'gold', 'violet', 'mint', 'pink'];
  return {
    ...levels[0], plates: [], trayOrder: colors,
    screws: colors.flatMap(color => [0, 1, 2].map(i => ({
      id: `${color}-${i}`, plateId: color, color, x: i, y: 0, z: 0, blockedBy: [],
    }))), solution: [],
  };
}

test('campaign contains complex multipart puzzles with screws on multiple faces', () => {
  assert.ok(levels.length >= 6);
  for (const level of levels) {
    assert.ok(level.screws.length >= 24, `${level.name}: too few screws`);
    assert.ok(level.plates.length >= 8, `${level.name}: too few detachable parts`);
    assert.equal(level.screws.length % 3, 0);
    assert.ok(new Set(level.screws.map(s => s.normal?.join(','))).size >= 3, `${level.name}: lacks side/back screws`);
  }
  assert.ok(levels.at(-1)!.screws.length >= 42);
  assert.ok(new Set(levels.at(-1)!.screws.map(s => s.color)).size >= 8);
});

for (const level of levels) test(`authored solution wins level ${level.id}: ${level.name}`, () => {
  const game = new Game(level);
  assert.equal(new Set(level.solution).size, level.screws.length);
  for (const id of level.solution) {
    assert.equal(game.isAvailable(id), true, `blocked solution move ${id}`);
    assert.equal(game.selectScrew(id), true);
    assert.notEqual(game.state.status, 'lost', `overflow after ${id}`);
    assert.ok(game.state.trays.length <= ACTIVE_TRAY_COUNT);
  }
  assert.equal(game.state.status, 'won');
  assert.equal(game.state.completedTrays, level.trayOrder.length);
  assert.equal(game.state.removedPlateIds.size, level.plates.length);
  assert.deepEqual(game.state.buffer, []);
  assert.deepEqual(game.state.trays, []);
  assert.equal(game.selectScrew(level.solution[0]), false);
});

test('covered screws reject interaction until their covering plate is removed', () => {
  const level = levels.find(l => l.screws.some(s => s.blockedBy.length))!;
  assert.ok(level, 'campaign has no structural dependencies');
  const game = new Game(level);
  const covered = level.screws.find(s => s.blockedBy.length)!;
  assert.equal(game.selectScrew(covered.id), false);
  assert.equal(game.state.moves, 0);
  assert.equal(game.canUndo, false);
  for (const id of level.solution) {
    if (game.isAvailable(covered.id)) break;
    assert.equal(game.selectScrew(id), true);
  }
  assert.equal(game.isAvailable(covered.id), true);
  assert.equal(game.selectScrew(covered.id), true);
  assert.equal(game.selectScrew(covered.id), false);
  assert.equal(game.selectScrew('missing'), false);
});

test('completed trays advance and automatically collect matching buffered screws', () => {
  const game = new Game(fixture());
  game.selectScrew('mint-0'); game.selectScrew('mint-1');
  assert.deepEqual(game.state.buffer, ['mint', 'mint']);
  for (let i = 0; i < 3; i++) game.selectScrew(`coral-${i}`);
  assert.deepEqual(game.state.buffer, []);
  assert.deepEqual(game.state.trays.find(t => t.color === 'mint'), {color: 'mint', count: 2});
  assert.equal(game.state.completedTrays, 1);
  game.selectScrew('mint-2');
  assert.equal(game.state.completedTrays, 2);
  assert.equal(game.state.trays.some(t => t.color === 'pink'), true);
});

test('overflow loses, undo restores the exact last valid state, restart clears history', () => {
  const game = new Game(fixture());
  for (const id of ['mint-0', 'mint-1', 'mint-2', 'pink-0', 'pink-1']) game.selectScrew(id);
  assert.equal(game.state.buffer.length, BUFFER_CAPACITY);
  assert.equal(game.state.status, 'playing');
  game.selectScrew('pink-2');
  assert.equal(game.state.status, 'lost');
  assert.equal(game.selectScrew('coral-0'), false);
  assert.equal(game.undo(), true);
  assert.equal(game.state.status, 'playing');
  assert.equal(game.state.moves, 5);
  assert.equal(game.state.buffer.length, 5);
  assert.equal(game.isAvailable('pink-2'), true);
  game.restart();
  assert.equal(game.state.moves, 0);
  assert.equal(game.state.removedIds.size, 0);
  assert.equal(game.state.removedPlateIds.size, 0);
  assert.deepEqual(game.state.buffer, []);
  assert.deepEqual(game.state.trays, ['coral', 'blue', 'gold', 'violet'].map(color => ({color, count: 0})));
  assert.equal(game.canUndo, false);
  assert.equal(game.undo(), false);
});

test('four active buckets stay bounded as completed buckets are replaced', () => {
  assert.equal(ACTIVE_TRAY_COUNT, 4);
  const game = new Game(fixture());
  assert.equal(game.state.trays.length, 4);
  for (const screw of fixture().screws) {
    game.selectScrew(screw.id);
    assert.ok(game.state.trays.length <= 4);
  }
  assert.equal(game.state.status, 'won');
});

test('undo restores tray queue after a completed group', () => {
  const game = new Game(fixture());
  for (let i = 0; i < 3; i++) game.selectScrew(`coral-${i}`);
  assert.equal(game.state.completedTrays, 1);
  game.undo();
  assert.equal(game.state.completedTrays, 0);
  assert.deepEqual(game.state.trays[0], {color: 'coral', count: 2});
  game.selectScrew('coral-2');
  assert.deepEqual(game.state.trays[0], {color: 'mint', count: 0});
});
