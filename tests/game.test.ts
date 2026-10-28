import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, BUFFER_CAPACITY } from '../src/game';
import { levels, type Level, type Color } from '../src/levels';

function fixture(): Level {
  const colors: Color[] = ['coral', 'blue', 'mint', 'gold'];
  return {
    ...levels[0], plates: [], trayOrder: colors,
    screws: colors.flatMap(color => [0, 1, 2].map(i => ({
      id: `${color}-${i}`, plateId: color, color, x: i, y: 0, z: 0, blockedBy: [],
    }))), solution: [],
  };
}

for (const level of levels) test(`authored solution wins level ${level.id}: ${level.name}`, () => {
  const game = new Game(level);
  assert.equal(new Set(level.solution).size, level.screws.length);
  for (const id of level.solution) {
    assert.equal(game.isAvailable(id), true, `blocked solution move ${id}`);
    assert.equal(game.selectScrew(id), true);
    assert.notEqual(game.state.status, 'lost', `overflow after ${id}`);
  }
  assert.equal(game.state.status, 'won');
  assert.equal(game.state.completedTrays, level.trayOrder.length);
  assert.equal(game.state.removedPlateIds.size, level.plates.length);
  assert.deepEqual(game.state.buffer, []);
  assert.deepEqual(game.state.trays, []);
  assert.equal(game.selectScrew(level.solution[0]), false);
});

test('covered screws reject interaction until their covering plate is removed', () => {
  const game = new Game(levels[0]);
  const covered = levels[0].screws.find(s => s.blockedBy.length)!;
  assert.equal(game.selectScrew(covered.id), false);
  assert.equal(game.state.moves, 0);
  assert.equal(game.canUndo, false);
  for (const screw of levels[0].screws.filter(s => s.plateId === covered.blockedBy[0])) {
    assert.equal(game.selectScrew(screw.id), true);
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
  assert.equal(game.state.trays.some(t => t.color === 'gold'), true);
});

test('overflow loses, undo restores the exact last valid state, restart clears history', () => {
  const game = new Game(fixture());
  for (const id of ['mint-0', 'mint-1', 'mint-2', 'gold-0', 'gold-1']) game.selectScrew(id);
  assert.equal(game.state.buffer.length, BUFFER_CAPACITY);
  assert.equal(game.state.status, 'playing');
  game.selectScrew('gold-2');
  assert.equal(game.state.status, 'lost');
  assert.equal(game.selectScrew('coral-0'), false);
  assert.equal(game.undo(), true);
  assert.equal(game.state.status, 'playing');
  assert.equal(game.state.moves, 5);
  assert.equal(game.state.buffer.length, 5);
  assert.equal(game.isAvailable('gold-2'), true);
  game.restart();
  assert.equal(game.state.moves, 0);
  assert.equal(game.state.removedIds.size, 0);
  assert.equal(game.state.removedPlateIds.size, 0);
  assert.deepEqual(game.state.buffer, []);
  assert.deepEqual(game.state.trays, [{color: 'coral', count: 0}, {color: 'blue', count: 0}]);
  assert.equal(game.canUndo, false);
  assert.equal(game.undo(), false);
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
