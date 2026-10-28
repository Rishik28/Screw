/** Original CC0 procedural toy assemblies. Dimensions and screw anchors use world units. */
export type Vec3 = [number, number, number];
export type Primitive = 'box' | 'cylinder' | 'sphere' | 'cone' | 'wedge';
export interface ObjectPart {
  id: string; label: string; primitive: Primitive; size: Vec3; position: Vec3;
  rotation: Vec3; color: string; stage: number;
  anchors: {position: Vec3; normal: Vec3; blockedBy?:string[]}[];
  blockedBy: string[];
  details?: {primitive:Primitive; size:Vec3; position:Vec3; rotation:Vec3; color:string}[];
}
export interface AssemblyModel { id: string; name: string; subtitle: string; parts: ObjectPart[] }
type Face = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';
const C = {cream:'#f3e8cc',red:'#dc7762',blue:'#78a8c0',mint:'#83b4a1',gold:'#dfba65',navy:'#405b68',wood:'#b79172',white:'#eeeae0'};

function rotate(v:Vec3,r:Vec3):Vec3 {
  let [x,y,z]=v;
  // Matches Three.js Euler XYZ: local Z, then Y, then X.
  [x,y]=[x*Math.cos(r[2])-y*Math.sin(r[2]),x*Math.sin(r[2])+y*Math.cos(r[2])];
  [x,z]=[x*Math.cos(r[1])+z*Math.sin(r[1]),-x*Math.sin(r[1])+z*Math.cos(r[1])];
  [y,z]=[y*Math.cos(r[0])-z*Math.sin(r[0]),y*Math.sin(r[0])+z*Math.cos(r[0])];
  return [x,y,z];
}

/** Each structural box has three screws on an actual exterior face. */
function part(id:string,label:string,position:Vec3,size:Vec3,color:string,face:Face='front',stage=0,rotation:Vec3=[0,0,0],blockedBy:string[]=[]):ObjectPart {
  const axis=face==='left'||face==='right'?0:face==='top'||face==='bottom'?1:2;
  const sign=face==='back'||face==='left'||face==='bottom'?-1:1;
  const u=axis===0?2:0, v=axis===1?2:1;
  const normal:Vec3=[0,0,0];normal[axis]=sign;
  const anchors=[[-.26,.22],[.26,.22],[0,-.26]].map(([a,b])=>{
    const local:Vec3=[0,0,0]; local[axis]=sign*(size[axis]/2+.035);
    local[u]=a*size[u];local[v]=b*size[v];
    const p=rotate(local,rotation);
    return {position:p.map((value,i)=>value+position[i]) as Vec3,normal:rotate(normal,rotation)};
  });
  return {id,label,primitive:'box',position,size,rotation,color,stage,anchors,blockedBy};
}

const house:AssemblyModel={id:'chalet',name:'The Little Chalet',subtitle:'Unfasten the roof, walls, and welcoming porch.',parts:[
  part('roof-left','Left roof slope',[-.74,1.35,0],[1.9,.22,2.55],C.red,'top',0,[0,0,.5]),
  part('roof-right','Right roof slope',[.74,1.35,0],[1.9,.22,2.55],C.red,'top',0,[0,0,-.5]),
  part('front','Front wall',[0,-.05,1.04],[2.55,1.9,.22],C.cream,'front',1,[0,0,0],['roof-left','roof-right']),
  part('back','Back wall',[0,-.05,-1.04],[2.55,1.9,.22],C.mint,'back',1,[0,0,0],['roof-left','roof-right']),
  part('left','Left timber wall',[-1.19,-.05,0],[.22,1.9,1.9],C.wood,'left',1,[0,0,0],['roof-left']),
  part('right','Right timber wall',[1.19,-.05,0],[.22,1.9,1.9],C.wood,'right',1,[0,0,0],['roof-right']),
  part('door','Blue front door',[0,-.43,1.2],[.86,1.12,.18],C.blue,'front',0),
  part('base','Stone foundation',[0,-1.15,0],[2.9,.32,2.6],C.navy,'bottom',2,[0,0,0],['front','back','left','right']),
]};
const lighthouse:AssemblyModel={id:'lighthouse',name:'Harbor Light',subtitle:'A lantern room above a striped coastal tower.',parts:[
  part('lantern-roof','Lantern cap',[0,2.05,0],[1.8,.26,1.8],C.red,'top'),
  part('glass-front','Lantern front',[0,1.48,.62],[1.2,.9,.16],C.gold,'front',1,[0,0,0],['lantern-roof']),
  part('glass-back','Lantern back',[0,1.48,-.62],[1.2,.9,.16],C.gold,'back',1,[0,0,0],['lantern-roof']),
  part('glass-left','Lantern left',[-.62,1.48,0],[.16,.9,1.2],C.blue,'left',1,[0,0,0],['lantern-roof']),
  part('glass-right','Lantern right',[.62,1.48,0],[.16,.9,1.2],C.blue,'right',1,[0,0,0],['lantern-roof']),
  part('gallery','Observation deck',[0,.86,0],[1.9,.24,1.9],C.navy,'bottom',2,[0,0,0],['glass-front','glass-back','glass-left','glass-right']),
  part('tower-front','Tower front',[0,-.3,.55],[1.12,2.1,.18],C.cream,'front'),
  part('tower-back','Tower back',[0,-.3,-.55],[1.12,2.1,.18],C.red,'back'),
  part('tower-left','Tower left',[-.55,-.3,0],[.18,2.1,.95],C.red,'left'),
  part('tower-right','Tower right',[.55,-.3,0],[.18,2.1,.95],C.cream,'right'),
  part('plinth','Harbor plinth',[0,-1.55,0],[2.15,.35,2.15],C.navy,'bottom',1,[0,0,0],['tower-front','tower-back','tower-left','tower-right']),
  part('entry','Harbor door',[0,-.78,.7],[.8,1,.18],C.blue,'front'),
]};
const windmill:AssemblyModel={id:'windmill-house',name:'Meadow Windmill',subtitle:'Four broad sails turn above a timber mill.',parts:[
  part('sail-up','Upper sail',[0,1.58,1.05],[.84,1.65,.16],C.cream,'front'),
  part('sail-down','Lower sail',[0,-.08,1.05],[.84,1.65,.16],C.cream,'front'),
  part('sail-left','Left sail',[-.94,.75,1.05],[1.65,.84,.16],C.cream,'front'),
  part('sail-right','Right sail',[.94,.75,1.05],[1.65,.84,.16],C.cream,'front'),
  part('front','Mill front',[0,-.3,.7],[1.7,2.3,.22],C.wood,'front',1,[0,0,0],['sail-up','sail-down','sail-left','sail-right']),
  part('back','Mill back',[0,-.3,-.7],[1.7,2.3,.22],C.wood,'back'),
  part('left','Mill left',[-.76,-.3,0],[.22,2.3,1.2],C.mint,'left'),
  part('right','Mill right',[.76,-.3,0],[.22,2.3,1.2],C.mint,'right'),
  part('roof-left','Mill roof left',[-.48,1.25,-.1],[1.3,.2,1.8],C.red,'top',0,[0,0,.55]),
  part('roof-right','Mill roof right',[.48,1.25,-.1],[1.3,.2,1.8],C.red,'top',0,[0,0,-.55]),
  part('floor','Mill floor',[0,-1.6,0],[2.2,.3,1.9],C.navy,'bottom',2,[0,0,0],['front','back','left','right']),
  part('door','Mill door',[0,-.8,.86],[.82,1.12,.16],C.blue,'front'),
]};
const train:AssemblyModel={id:'locomotive',name:'Toy Locomotive',subtitle:'Cab, boiler, wheels, and chassis make a real assembly.',parts:[
  part('boiler-top','Boiler top',[.5,.3,0],[2.25,.3,1.3],C.red,'top'),
  part('boiler-front','Boiler front',[1.65,-.1,0],[.22,1,1.3],C.navy,'right'),
  part('boiler-near','Boiler near side',[.5,-.1,.61],[2.2,.9,.18],C.red,'front'),
  part('boiler-far','Boiler far side',[.5,-.1,-.61],[2.2,.9,.18],C.red,'back'),
  part('cab-roof','Cab roof',[-1.05,1,0],[1.5,.22,1.65],C.gold,'top'),
  part('cab-near','Cab near side',[-1.05,.32,.72],[1.2,1.25,.16],C.blue,'front',1,[0,0,0],['cab-roof']),
  part('cab-far','Cab far side',[-1.05,.32,-.72],[1.2,1.25,.16],C.blue,'back',1,[0,0,0],['cab-roof']),
  part('cab-back','Cab rear',[-1.67,.32,0],[.16,1.25,1.3],C.mint,'left',1,[0,0,0],['cab-roof']),
  part('wheel-fl','Front near wheel',[.98,-.9,.8],[.85,.85,.26],C.navy,'front'),
  part('wheel-fr','Front far wheel',[.98,-.9,-.8],[.85,.85,.26],C.navy,'back'),
  part('wheel-bl','Rear near wheel',[-1,-.9,.8],[.85,.85,.26],C.navy,'front'),
  part('wheel-br','Rear far wheel',[-1,-.9,-.8],[.85,.85,.26],C.navy,'back'),
  part('chassis','Engine chassis',[0,-.62,0],[3.8,.28,1.45],C.wood,'bottom',2,[0,0,0],['wheel-fl','wheel-fr','wheel-bl','wheel-br']),
  part('chimney','Smokestack',[.95,.8,0],[.8,.8,.8],C.gold,'top'),
]};
const camera:AssemblyModel={id:'camera',name:'Weekend Camera',subtitle:'Remove the lens surround, controls, and camera shell.',parts:[
  part('lens-top','Lens upper housing',[0,.52,1.08],[1.35,.32,1.05],C.navy,'top'),
  part('lens-bottom','Lens lower housing',[0,-.52,1.08],[1.35,.32,1.05],C.navy,'bottom'),
  part('lens-left','Lens left housing',[-.52,0,1.08],[.32,.8,1.05],C.navy,'left'),
  part('lens-right','Lens right housing',[.52,0,1.08],[.32,.8,1.05],C.navy,'right'),
  part('lens','Lens glass',[0,0,1.67],[.9,.9,.16],C.blue,'front'),
  part('front','Camera front',[0,0,.55],[3.1,1.9,.22],C.mint,'front',1,[0,0,0],['lens-top','lens-bottom','lens-left','lens-right','lens']),
  part('back','Camera back',[0,0,-.55],[3.1,1.9,.22],C.wood,'back'),
  part('left','Camera left',[-1.47,0,0],[.22,1.9,.95],C.mint,'left'),
  part('right','Camera grip',[1.47,0,0],[.22,1.9,.95],C.navy,'right'),
  part('top','Camera top',[0,.88,0],[3.1,.22,.95],C.cream,'top'),
  part('bottom','Camera bottom',[0,-.88,0],[3.1,.22,.95],C.cream,'bottom'),
  part('flash','Flash housing',[-.65,1.12,0],[.9,.36,.9],C.gold,'top'),
  part('screen','Rear display',[.3,0,-.72],[1.8,1.15,.16],C.blue,'back'),
  part('dial','Rear control plate',[-1.05,0,-.72],[.72,1.15,.16],C.gold,'back'),
]};
const rover:AssemblyModel={id:'rover',name:'Moon Rover',subtitle:'A six-wheel explorer with a raised instrument cabin.',parts:[
  part('wheel-a','Left front wheel',[-1.23,-.66,1.02],[.82,.9,.38],C.navy,'front'),
  part('wheel-b','Left middle wheel',[0,-.66,1.02],[.82,.9,.38],C.navy,'front'),
  part('wheel-c','Left rear wheel',[1.23,-.66,1.02],[.82,.9,.38],C.navy,'front'),
  part('wheel-d','Right front wheel',[-1.23,-.66,-1.02],[.82,.9,.38],C.navy,'back'),
  part('wheel-e','Right middle wheel',[0,-.66,-1.02],[.82,.9,.38],C.navy,'back'),
  part('wheel-f','Right rear wheel',[1.23,-.66,-1.02],[.82,.9,.38],C.navy,'back'),
  part('deck','Rover deck',[0,-.12,0],[3.55,.25,1.65],C.gold,'bottom',1,[0,0,0],['wheel-a','wheel-b','wheel-c','wheel-d','wheel-e','wheel-f']),
  part('cabin-front','Cabin forward',[-.7,.67,.63],[1.4,1.3,.16],C.cream,'front'),
  part('cabin-back','Cabin rear',[-.7,.67,-.63],[1.4,1.3,.16],C.cream,'back'),
  part('cabin-left','Cabin end',[-1.35,.67,0],[.16,1.3,1.1],C.blue,'left'),
  part('cabin-right','Cabin inner',[0,.67,0],[.16,1.3,1.1],C.mint,'right'),
  part('cabin-roof','Cabin roof',[-.7,1.34,0],[1.6,.18,1.5],C.cream,'top'),
  part('solar-front','Near solar array',[.98,1,.62],[1.1,.18,1.1],C.blue,'top',0,[0,0,-.28]),
  part('solar-back','Far solar array',[.98,1,-.62],[1.1,.18,1.1],C.blue,'top',0,[0,0,.28]),
  part('battery','Battery case',[.98,.45,0],[1.05,.8,1.05],C.mint,'right',1,[0,0,0],['solar-front','solar-back']),
  part('instrument','Cabin instrument',[ -.7,1.58,0],[.85,.3,.85],C.red,'top'),
]};
const hall:AssemblyModel={id:'townhall',name:'Clocktower Hall',subtitle:'A civic landmark with wings, clock faces, and a tower.',parts:[
  part('tower-front','Clocktower front',[0,.65,.64],[1.25,2.9,.2],C.cream,'front'),
  part('tower-back','Clocktower back',[0,.65,-.64],[1.25,2.9,.2],C.cream,'back'),
  part('tower-left','Clocktower left',[-.55,.65,0],[.2,2.9,1.1],C.wood,'left'),
  part('tower-right','Clocktower right',[.55,.65,0],[.2,2.9,1.1],C.wood,'right'),
  part('clock-front','Front clock',[0,1.25,.82],[.92,.92,.16],C.gold,'front'),
  part('clock-back','Rear clock',[0,1.25,-.82],[.92,.92,.16],C.gold,'back'),
  part('tower-cap','Tower cap',[0,2.16,0],[1.65,.22,1.65],C.red,'top'),
  part('left-front','West wing front',[-1.17,-.65,.64],[1.1,1.5,.2],C.mint,'front'),
  part('left-back','West wing rear',[-1.17,-.65,-.64],[1.1,1.5,.2],C.mint,'back'),
  part('left-end','West wing end',[-1.78,-.65,0],[.2,1.5,1.1],C.cream,'left'),
  part('left-roof','West wing roof',[-1.17,.18,0],[1.45,.22,1.6],C.red,'top'),
  part('right-front','East wing front',[1.17,-.65,.64],[1.1,1.5,.2],C.mint,'front'),
  part('right-back','East wing rear',[1.17,-.65,-.64],[1.1,1.5,.2],C.mint,'back'),
  part('right-end','East wing end',[1.78,-.65,0],[.2,1.5,1.1],C.cream,'right'),
  part('right-roof','East wing roof',[1.17,.18,0],[1.45,.22,1.6],C.red,'top'),
  part('foundation','Hall foundation',[0,-1.55,0],[4,.3,1.9],C.navy,'bottom',2,[0,0,0],['left-front','right-front','tower-front']),
]};
const tram:AssemblyModel={id:'tram',name:'City Tram',subtitle:'A carriage with doors, windows, roof panels, and running gear.',parts:[
  part('near-door','Near center door',[0,0,.88],[.95,1.8,.18],C.gold,'front'),
  part('near-left','Near left window',[-1.06,.38,.88],[1,.98,.18],C.blue,'front'),
  part('near-right','Near right window',[1.06,.38,.88],[1,.98,.18],C.blue,'front'),
  part('far-door','Far center door',[0,0,-.88],[.95,1.8,.18],C.gold,'back'),
  part('far-left','Far left window',[-1.06,.38,-.88],[1,.98,.18],C.blue,'back'),
  part('far-right','Far right window',[1.06,.38,-.88],[1,.98,.18],C.blue,'back'),
  part('nose','Front driving cab',[-1.72,0,0],[.2,1.8,1.6],C.mint,'left'),
  part('tail','Rear driving cab',[1.72,0,0],[.2,1.8,1.6],C.mint,'right'),
  part('roof-a','Front roof',[-.88,1,0],[1.75,.22,1.95],C.cream,'top'),
  part('roof-b','Rear roof',[.88,1,0],[1.75,.22,1.95],C.cream,'top'),
  part('sill-near','Near lower sill',[0,-.64,.72],[3.4,.78,.22],C.red,'front'),
  part('sill-far','Far lower sill',[0,-.64,-.72],[3.4,.78,.22],C.red,'back'),
  part('wheel-a','Near front wheel',[-1.13,-1,.86],[.9,.85,.3],C.navy,'front'),
  part('wheel-b','Near rear wheel',[1.13,-1,.86],[.9,.85,.3],C.navy,'front'),
  part('wheel-c','Far front wheel',[-1.13,-1,-.86],[.9,.85,.3],C.navy,'back'),
  part('wheel-d','Far rear wheel',[1.13,-1,-.86],[.9,.85,.3],C.navy,'back'),
]};

export const ASSEMBLY_MODELS: AssemblyModel[]=[house,lighthouse,windmill,train,camera,rover,hall,tram];
export const OBJECT_MODELS=ASSEMBLY_MODELS;

// Circular running gear and optical parts retain the exact authored world attachment faces.
for(const model of ASSEMBLY_MODELS) for(const p of model.parts) {
  if(p.id.startsWith('wheel-')||p.id.startsWith('clock-')||p.id==='lens') {
    const [w,h,d]=p.size; const sign=p.anchors[0].normal[2];
    p.primitive='cylinder';p.size=[w,d,h];p.rotation=[Math.PI/2,0,0];
    const radius=Math.min(w,h)/2-.19;
    p.anchors=[Math.PI/2,Math.PI*7/6,Math.PI*11/6].map(a=>({position:[p.position[0]+Math.cos(a)*radius,p.position[1]+Math.sin(a)*radius,p.position[2]+sign*(d/2+.035)] as Vec3,normal:[0,0,sign] as Vec3}));
  }
}

const detail=(position:Vec3,size:Vec3,color:string,primitive:Primitive='box',rotation:Vec3=[0,0,0])=>({position,size,color,primitive,rotation});
house.parts.find(p=>p.id==='front')!.details=[
  detail([-.82,0,.14],[.48,.36,.07],C.blue),detail([.82,0,.14],[.48,.36,.07],C.blue),
];
house.parts.find(p=>p.id==='roof-right')!.details=[detail([.6,.6,-.5],[.5,1.05,.5],C.wood)];
for(const model of [house,windmill]) {
  const door=model.parts.find(p=>p.id==='door')!;
  door.details=[detail([.24,0,.12],[.09,.09,.07],C.gold,'sphere')];
}
for(const p of hall.parts.filter(p=>p.id.startsWith('clock-'))) {
  // Cylinder local +Y becomes world +Z under the authored rotation.
  const side=p.id==='clock-front'?1:-1;
  p.details=[detail([0,side*.12,0],[.035,.06,.18],C.navy),detail([.045,side*.12,0],[.12,.06,.035],C.navy)];
}
for(const p of train.parts.filter(p=>p.id==='cab-near'||p.id==='cab-far')) {
  p.details=[detail([0,.3,p.id==='cab-near'?.13:-.13],[.25,.35,.08],C.navy)];
}
for(const p of lighthouse.parts.filter(p=>p.id.startsWith('tower-'))) {
  const local:Vec3=p.id==='tower-front'?[0,0,.13]:p.id==='tower-back'?[0,0,-.13]:p.id==='tower-left'?[-.13,0,0]:[.13,0,0];
  const size:Vec3=p.id==='tower-left'||p.id==='tower-right'?[.06,.15,.96]:[1.1,.15,.06];
  p.details=[detail(local,size,C.red)];
}

function inverseRotate(v:Vec3,r:Vec3):Vec3 {
  let [x,y,z]=v;
  [y,z]=[y*Math.cos(r[0])+z*Math.sin(r[0]),-y*Math.sin(r[0])+z*Math.cos(r[0])];
  [x,z]=[x*Math.cos(r[1])-z*Math.sin(r[1]),x*Math.sin(r[1])+z*Math.cos(r[1])];
  [x,y]=[x*Math.cos(r[2])+y*Math.sin(r[2]),-x*Math.sin(r[2])+y*Math.cos(r[2])];
  return [x,y,z];
}

/** Intersect an outward screw ray with a different structural part's oriented bounds. */
function covers(anchor:ObjectPart['anchors'][number],other:ObjectPart):boolean {
  const origin=inverseRotate(anchor.position.map((v,i)=>v-other.position[i]) as Vec3,other.rotation);
  const dir=inverseRotate(anchor.normal,other.rotation);
  let near=-Infinity,far=Infinity;
  for(let axis=0;axis<3;axis++) {
    const half=other.size[axis]/2;
    if(Math.abs(dir[axis])<1e-9) {if(Math.abs(origin[axis])>half-.015)return false;continue;}
    let a=(-half-origin[axis])/dir[axis],b=(half-origin[axis])/dir[axis];
    if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);
    if(near>far)return false;
  }
  if(far<.02)return false;
  if(other.primitive==='cylinder') {
    const t=Math.max(near,0);
    const x=(origin[0]+dir[0]*t)/(other.size[0]/2),z=(origin[2]+dir[2]*t)/(other.size[2]/2);
    if(x*x+z*z>1)return false;
  }
  return true;
}

// Dependencies represent visible obstructions, rather than arbitrary assembly order.
// A door can cover one wall screw without locking the other two exposed wall screws.
for(const model of ASSEMBLY_MODELS) for(const p of model.parts) {
  p.blockedBy=[];
  for(const anchor of p.anchors) anchor.blockedBy=model.parts.filter(other=>other.id!==p.id&&covers(anchor,other)).map(other=>other.id);
}
