import { OBJECT_MODELS } from './objects';
import { DETAILED_MODELS, CLASSIC_SCREW_SCALE } from './detailed-models';

export const COLORS = {
  coral: '#f44757', blue: '#2378ee', mint: '#13ac72', gold: '#f7b500',
  violet: '#9355ee', pink: '#f2339b', orange: '#ff781f', teal: '#00b6c9',
} as const;
export type Color = keyof typeof COLORS;
export interface Plate {
  id: string; shape: string; x: number; y: number; z: number;
  width: number; height: number; rotation: number; scale: number;
  layer: number; color: string;
  primitive?: 'box' | 'cylinder' | 'sphere' | 'cone' | 'wedge' | 'model';
  size?: [number,number,number]; rotationX?: number; rotationY?: number; label?: string; interior?: boolean;
  details?: typeof OBJECT_MODELS[number]['parts'][number]['details'];
}
export interface Screw {
  id: string; plateId: string; color: Color; x: number; y: number; z: number;
  blockedBy: string[]; normal?: [number,number,number];
}
export interface Level {
  id: number; name: string; subtitle: string; model: string;
  screwScale?: number; estimatedMinutes?: string; layerCount?: number;
  plates: Plate[]; screws: Screw[]; trayOrder: Color[]; solution: string[];
}

const palette = Object.keys(COLORS) as Color[];

/** Build an explicit topological witness before assigning color groups. Each
 * group is exactly three screws, spread over different accessible parts where
 * possible. Four buckets cover the next twelve screws; exposed future colors
 * compete for the five shelf slots, making free choices consequential. */
export function assemblyLevel(model: typeof OBJECT_MODELS[number], index: number): Level {
  const plates: Plate[] = model.parts.map(part=>({
    id:part.id, label:part.label, shape:model.id, primitive:part.primitive,
    x:part.position[0], y:part.position[1], z:part.position[2],
    width:part.size[0],height:part.size[1],size:part.size,
    rotationX:part.rotation[0],rotationY:part.rotation[1],rotation:part.rotation[2],
    scale:1,layer:part.stage,interior:part.interior,color:part.color,details:part.details,
  }));
  const screws: Screw[] = model.parts.flatMap(part=>part.anchors.map((anchor,slot)=>({
    id:`${part.id}-s${slot}`,plateId:part.id,color:'coral' as Color,
    x:anchor.position[0],y:anchor.position[1],z:anchor.position[2],
    normal:anchor.normal,blockedBy:[...(anchor.blockedBy ?? part.blockedBy ?? [])],
  })));
  if (screws.length % 3 !== 0) throw new Error(`${model.id}: screw count must be divisible by three`);
  const remaining = new Set(screws.map(s=>s.id));
  const removedParts = new Set<string>();
  const solution: string[]=[];
  const removedPerPart = new Map<string,number>();
  while (remaining.size) {
    const candidates=screws.filter(s=>remaining.has(s.id)&&s.blockedBy.every(p=>removedParts.has(p)));
    candidates.sort((a,b)=>(removedPerPart.get(a.plateId)??0)-(removedPerPart.get(b.plateId)??0));
    const screw=candidates[0];
    if (!screw) throw new Error(`${model.id}: cyclic assembly dependencies`);
    remaining.delete(screw.id);solution.push(screw.id);
    removedPerPart.set(screw.plateId,(removedPerPart.get(screw.plateId)??0)+1);
    if (!screws.some(s=>s.plateId===screw.plateId&&remaining.has(s.id))) removedParts.add(screw.plateId);
  }
  const trayOrder: Color[]=[];
  solution.forEach((id,i)=>{
    const group=Math.floor(i/3);
    // Offset each model's palette while retaining eight distinct screw colors.
    const color=palette[(group+index*3)%palette.length];
    screws.find(s=>s.id===id)!.color=color;
    if (i%3===0) trayOrder.push(color);
  });
  return {id:index+1,name:model.name,model:model.id,
    subtitle:index===0 ? 'Drag to turn the model. Match three screws per bucket; keep the five-slot shelf clear.' : model.subtitle,
    plates,screws,trayOrder,solution};
}

export const shortLevels: Level[] = OBJECT_MODELS.map(assemblyLevel);
export const levels: Level[] = DETAILED_MODELS.map((model,index)=>({...assemblyLevel(model,index),screwScale:CLASSIC_SCREW_SCALE,layerCount:Math.max(...model.parts.map(p=>p.stage))+1,estimatedMinutes:index<2?'2–3':index<5?'3–4':'4–5'}));
export const LEVELS = levels;
