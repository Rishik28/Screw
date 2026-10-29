import test from 'node:test';
import assert from 'node:assert/strict';
import { ShapeUtils, Vector2, Vector3, Quaternion, Euler } from 'three';
import { MODEL_CATALOG, getModelOutline } from '../src/models';
import { levels } from '../src/levels';
import { DETAILED_MODELS as OBJECT_MODELS } from '../src/detailed-models';

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
    const radius=.16*(level.screwScale||1);
    assert.ok(plate.size, `missing dimensions: ${plate.id}`);
    const inverse = new Quaternion().setFromEuler(new Euler(plate.rotationX || 0, plate.rotationY || 0, plate.rotation)).invert();
    const center = new Vector3(screw.x - plate.x, screw.y - plate.y, screw.z - plate.z).applyQuaternion(inverse).toArray();
    const normal = new Vector3(...screw.normal!).applyQuaternion(inverse).toArray();
    const axis = normal.findIndex(n => Math.abs(n) > .99);
    assert.ok(axis >= 0, `${level.name}/${screw.id}: normal is not a face normal`);
    assert.ok(Math.abs(Math.abs(center[axis]) - plate.size![axis] / 2 - .035) < 1e-6, `${screw.id}: not attached to face`);
    assert.equal(Math.sign(center[axis]), Math.sign(normal[axis]), `${screw.id}: normal points inward`);
    for (let i = 0; i < 3; i++) if (i !== axis) {
      assert.ok(Math.abs(center[i]) + radius <= plate.size![i] / 2 + 1e-6, `${level.name}/${screw.id}: cap overhangs part`);
    }
    if (plate.primitive === 'cylinder') {
      assert.equal(axis, 1, `${screw.id}: unsupported cylinder attachment`);
      for (let a = 0; a < 2 * Math.PI; a += Math.PI / 16) {
        const x = (center[0] + Math.cos(a) * radius) / (plate.size![0] / 2);
        const z = (center[2] + Math.sin(a) * radius) / (plate.size![2] / 2);
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

test('Classic has varied 40–120 screw counts, more detachable parts, and real nested dependencies', () => {
  const totals=levels.map(l=>l.screws.length);
  assert.equal(new Set(totals).size,levels.length);
  assert.ok(totals.every(n=>n>=40&&n<=120));assert.equal(Math.max(...totals),120);
  for(const level of levels){
    assert.ok(level.plates.length>=20&&level.plates.length<=60);
    assert.ok(level.layerCount!>=4);assert.ok(level.estimatedMinutes);
    assert.ok(level.plates.some(p=>p.layer>=3));
    const deps=new Map(level.plates.map(p=>[p.id,new Set(level.screws.filter(s=>s.plateId===p.id).flatMap(s=>s.blockedBy))]));
    const memo=new Map<string,number>();
    function depth(id:string):number{if(memo.has(id))return memo.get(id)!;const d=1+Math.max(0,...[...deps.get(id)!].map(depth));memo.set(id,d);return d;}
    assert.ok(Math.max(...level.plates.map(p=>depth(p.id)))>=3,`${level.name}: not genuinely layered`);
  }
});

test('fasteners on each detailed part are separated by more than their head diameters', () => {
  for(const level of levels)for(const part of level.plates){
    const screws=level.screws.filter(s=>s.plateId===part.id);
    assert.ok(screws.length>=1&&screws.length<=3);
    for(let i=0;i<screws.length;i++)for(let j=i+1;j<screws.length;j++){
      const a=screws[i],b=screws[j];
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)>=.32*(level.screwScale||1)+.04,`${part.id}: crowded screw heads`);
    }
  }
});

test('the added pieces are mostly concealed inside the outer shell at the beginning', () => {
  for(const level of levels){
    const inside=new Set(level.plates.filter(p=>p.interior).map(p=>p.id));
    assert.ok(inside.size>=12,level.name);
    const screws=level.screws.filter(s=>inside.has(s.plateId));
    assert.ok(screws.filter(s=>s.blockedBy.length>0).length/screws.length>.75,`${level.name}: exposed floating interior`);
  }
});

test('curved cylinder sides block rays even when the AABB entry lies outside the circle', async () => {
  const {covers}=await import('../src/objects');
  const cylinder={id:'gear',label:'gear',primitive:'cylinder' as const,position:[0,0,0] as [number,number,number],size:[2,.4,2] as [number,number,number],rotation:[0,0,0] as [number,number,number],color:'#fff',stage:0,anchors:[],blockedBy:[]};
  assert.equal(covers({position:[.5,0,2],normal:[0,0,-1]},cylinder),true);
  assert.equal(covers({position:[1.1,0,2],normal:[0,0,-1]},cylinder),false);
  assert.equal(covers({position:[.5,.3,2],normal:[0,0,-1]},cylinder),false);
});

test('thin edge coverage is not discarded for axis-parallel fastener rays', async () => {
  const {covers}=await import('../src/objects');
  const panel={id:'panel',label:'panel',primitive:'box' as const,position:[0,0,0] as [number,number,number],size:[2,2,.1] as [number,number,number],rotation:[0,0,0] as [number,number,number],color:'#fff',stage:0,anchors:[],blockedBy:[]};
  assert.equal(covers({position:[.999,0,2],normal:[0,0,-1]},panel),true);
  assert.equal(covers({position:[1.01,0,2],normal:[0,0,-1]},panel),false);
});
