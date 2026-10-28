import { MODEL_SCREW_ANCHORS } from './models';

export const COLORS = {
  coral: '#f17670', blue: '#66aaf4', mint: '#51c8a3',
  gold: '#f4c75c', violet: '#ad8be8', pink: '#ee8fbd',
} as const;
export type Color = keyof typeof COLORS;
export interface Plate {
  id: string; shape: string; x: number; y: number; z: number;
  width: number; height: number; rotation: number; scale: number;
  layer: number; color: string;
}
export interface Screw {
  id: string; plateId: string; color: Color; x: number; y: number; z: number;
  blockedBy: string[];
}
export interface Level {
  id: number; name: string; subtitle: string; model: string;
  plates: Plate[]; screws: Screw[]; trayOrder: Color[]; solution: string[];
}

// Every authored layer contains exactly three of each of its two colors.
// The solution walks front to back, completing the first color before the second.
// Independent left/right stacks allow alternate choices that can fill the buffer.
function makeLevel(id: number, name: string, model: string, pairs: [Color, Color][], twist = false): Level {
  const plates: Plate[] = [], screws: Screw[] = [], solution: string[] = [];
  const trayOrder = pairs.flat();
  if (twist && pairs.length > 1) [trayOrder[1], trayOrder[2]] = [trayOrder[2], trayOrder[1]];
  pairs.forEach((pair, index) => {
    const z = (pairs.length - index) * 0.22;
    for (let side = 0; side < 2; side++) {
      const plateId = `p${index}-${side}`;
      const x = side === 0 ? -1.05 : 1.05;
      const y = (index % 2 ? -0.15 : 0.15);
      plates.push({id: plateId, shape: model, x, y, z, width: 2.5, height: 4.6,
        rotation: (side === 0 ? -1 : 1) * (0.07 + index * 0.05), scale: 1,
        layer: pairs.length - index, color: ['#dce9e3','#dae4f0','#e7deed','#ebe4d6'][index % 4]});
      for (let slot = 0; slot < 3; slot++) {
        const color = pair[(slot + side) % 2];
        const anchor = MODEL_SCREW_ANCHORS[model][slot];
        const localX = anchor[0] * 2.5 / 2, localY = anchor[1] * 4.6 / 2;
        const rotation = plates[plates.length - 1].rotation;
        screws.push({id: `s${index}-${side}-${slot}`, plateId, color,
          x: x + localX * Math.cos(rotation) - localY * Math.sin(rotation),
          y: y + localX * Math.sin(rotation) + localY * Math.cos(rotation), z: z + 0.14,
          blockedBy: index === 0 ? [] : [`p${index - 1}-${side}`]});
      }
    }
    pair.forEach(color => screws.filter(s => s.plateId.startsWith(`p${index}-`) && s.color === color).forEach(s => solution.push(s.id)));
  });
  return {id, name, model, subtitle: id === 1 ? 'Match three screws to a colored tray. Other colors wait on the five-slot shelf.' : 'Look beneath each plate. Keep room on your shelf.', plates, screws, trayOrder, solution};
}

export const levels: Level[] = [
  makeLevel(1, 'First Flight', 'rocket', [['coral','blue'],['mint','gold']]),
  makeLevel(2, 'Butterfly Effect', 'butterfly', [['mint','violet'],['coral','gold'],['blue','pink']], true),
  makeLevel(3, 'Slow & Steady', 'turtle', [['blue','gold'],['pink','mint'],['violet','coral']], true),
  makeLevel(4, 'Gem Garden', 'gem', [['violet','pink'],['gold','blue'],['coral','mint']], true),
  makeLevel(5, 'In Full Bloom', 'flower', [['pink','mint'],['blue','coral'],['gold','violet'],['mint','pink']], true),
  makeLevel(6, 'Little Windmill', 'windmill', [['gold','coral'],['violet','blue'],['mint','pink'],['blue','gold']], true),
  makeLevel(7, 'Reef Retreat', 'fish', [['mint','blue'],['pink','gold'],['coral','violet'],['gold','mint']], true),
  makeLevel(8, 'Star Workshop', 'star', [['violet','gold'],['blue','mint'],['pink','coral'],['gold','blue']], true),
];
export const LEVELS = levels;
