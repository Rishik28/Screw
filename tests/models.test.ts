import test from 'node:test';
import assert from 'node:assert/strict';
import { ShapeUtils, Vector2, Vector3, Quaternion, Euler } from 'three';
import { MODEL_CATALOG, getModelOutline } from '../src/models';
import { levels } from '../src/levels';
import { OBJECT_MODELS } from '../src/objects';

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

test('every 3D screw is attached to the exterior face of its own rotated part', () => {
  for (const level of levels) for (const screw of level.screws) {
    const plate = level.plates.find(p => p.id === screw.plateId)!;
    assert.ok(plate.size, `missing dimensions: ${plate.id}`);
    const inverse = new Quaternion().setFromEuler(new Euler(plate.rotationX || 0, plate.rotationY || 0, plate.rotation)).invert();
    const center = new Vector3(screw.x - plate.x, screw.y - plate.y, screw.z - plate.z).applyQuaternion(inverse).toArray();
    const normal = new Vector3(...screw.normal!).applyQuaternion(inverse).toArray();
    const axis = normal.findIndex(n => Math.abs(n) > .99);
    assert.ok(axis >= 0, `${level.name}/${screw.id}: normal is not a face normal`);
    assert.ok(Math.abs(Math.abs(center[axis]) - plate.size![axis] / 2 - .035) < 1e-6, `${screw.id}: not attached to face`);
    assert.equal(Math.sign(center[axis]), Math.sign(normal[axis]), `${screw.id}: normal points inward`);
    for (let i = 0; i < 3; i++) if (i !== axis) {
      assert.ok(Math.abs(center[i]) + .16 <= plate.size![i] / 2 + 1e-6, `${level.name}/${screw.id}: cap overhangs part`);
    }
    if (plate.primitive === 'cylinder') {
      assert.equal(axis, 1, `${screw.id}: unsupported cylinder attachment`);
      for (let a = 0; a < 2 * Math.PI; a += Math.PI / 16) {
        const x = (center[0] + Math.cos(a) * .16) / (plate.size![0] / 2);
        const z = (center[2] + Math.sin(a) * .16) / (plate.size![2] / 2);
        assert.ok(x * x + z * z <= 1 + 1e-6, `${level.name}/${screw.id}: cap overhangs circular face`);
      }
    }
  }
});

test('physical per-anchor occlusion dependencies survive level generation', () => {
  for (const level of levels) {
    const model = OBJECT_MODELS.find(m => m.id === level.model)!;
    assert.ok(level.screws.some(s => s.blockedBy.length), `${level.name}: no physical dependencies`);
    for (const screw of level.screws) {
      const part = model.parts.find(p => p.id === screw.plateId)!;
      const index = Number(screw.id.split('-s').at(-1));
      assert.deepEqual([...screw.blockedBy].sort(), [...(part.anchors[index].blockedBy || part.blockedBy)].sort(), screw.id);
    }
  }
});
