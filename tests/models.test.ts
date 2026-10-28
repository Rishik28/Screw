import test from 'node:test';
import assert from 'node:assert/strict';
import { ShapeUtils, Vector2 } from 'three';
import { MODEL_CATALOG, getModelOutline } from '../src/models';
import { levels } from '../src/levels';

test('every original model triangulates without losing its silhouette', () => {
  assert.ok(Object.keys(MODEL_CATALOG).length >= 6);
  for (const [id, model] of Object.entries(MODEL_CATALOG)) {
    const contour = getModelOutline(id, 4, 3).map(([x, y]) => new Vector2(x, y));
    assert.ok(contour.length >= 3, id);
    assert.ok(contour.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), id);
    const triangles = ShapeUtils.triangulateShape(contour, []);
    const triangleArea = triangles.reduce((sum, [a, b, c]) => {
      const p = contour[a], q = contour[b], r = contour[c];
      return sum + Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)) / 2;
    }, 0);
    const polygonArea = Math.abs(ShapeUtils.area(contour));
    assert.ok(polygonArea > 0, model.name);
    assert.ok(Math.abs(triangleArea - polygonArea) < 1e-8, `${id}: incomplete triangulation`);
  }
});

test('unknown model has a usable rectangular fallback', () => {
  assert.deepEqual(getModelOutline('unknown', 4, 2), [[-2, -1], [2, -1], [2, 1], [-2, 1]]);
});

test('every authored screw head fits inside its rotated plate silhouette', () => {
  function inside(x: number, y: number, points: [number, number][]) {
    let hit = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [a, b] = points[i], [c, d] = points[j];
      if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) hit = !hit;
    }
    return hit;
  }
  for (const level of levels) for (const screw of level.screws) {
    const plate = level.plates.find(p => p.id === screw.plateId)!;
    const dx = screw.x - plate.x, dy = screw.y - plate.y;
    const x = dx * Math.cos(plate.rotation) + dy * Math.sin(plate.rotation);
    const y = -dx * Math.sin(plate.rotation) + dy * Math.cos(plate.rotation);
    const outline = getModelOutline(plate.shape, plate.width * plate.scale, plate.height * plate.scale);
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 16) {
      assert.ok(inside(x + Math.cos(angle) * .185, y + Math.sin(angle) * .185, outline), `level ${level.id}: ${screw.id} overhangs its plate`);
    }
  }
});
