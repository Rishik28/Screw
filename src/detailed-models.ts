import { OBJECT_MODELS, type AssemblyModel, type ObjectPart, type Vec3, rotate, inverseRotate, covers } from './objects';

type Face = 'front'|'back'|'left'|'right'|'top'|'bottom';
const normals: Record<Face,Vec3> = {front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0],top:[0,1,0],bottom:[0,-1,0]};
const wood='#927b66', cream='#cec8b6', steel='#5d7285', dark='#3d4e60', brass='#b7a477';
const SCALE=1.6;
export const CLASSIC_SCREW_SCALE=1.2;
const radius=.16*CLASSIC_SCREW_SCALE;
const margin=radius+.025;

function box(id:string,label:string,position:Vec3,size:Vec3,face:Face='front',color=steel,stage=2):ObjectPart {
  return {id,label,position,size,rotation:[0,0,0],primitive:'box',color,stage,blockedBy:[],anchors:[{position:[...position],normal:[...normals[face]]}]};
}
function disc(id:string,label:string,position:Vec3,diameter:number,face:Face='front',stage=3):ObjectPart {
  const p=box(id,label,position,[diameter,.07,diameter],face,brass,stage);
  p.primitive='cylinder';p.rotation=face==='front'?[Math.PI/2,0,0]:face==='back'?[-Math.PI/2,0,0]:[0,0,0];
  return p;
}
function chamber(prefix:string,label:string,c:Vec3,s:Vec3,stage=1):ObjectPart[] {
  const [x,y,z]=c,[w,h,d]=s,t=Math.min(.08,Math.min(...s)*.18);
  return [
    box(`${prefix}-front`,`${label}: front`,[x,y,z+d/2-t/2],[w,h,t],'front',cream,stage),
    box(`${prefix}-back`,`${label}: rear`,[x,y,z-d/2+t/2],[w,h,t],'back',steel,stage),
    box(`${prefix}-left`,`${label}: left`,[x-w/2+t/2,y,z],[t,h,d],'left',wood,stage),
    box(`${prefix}-right`,`${label}: right`,[x+w/2-t/2,y,z],[t,h,d],'right',wood,stage),
    box(`${prefix}-top`,`${label}: upper deck`,[x,y+h/2-t/2,z],[w,t,d],'top',steel,stage),
    box(`${prefix}-bottom`,`${label}: lower deck`,[x,y-h/2+t/2,z],[w,t,d],'top',dark,stage),
  ];
}
function tiles(prefix:string,label:string,center:Vec3,w:number,d:number):ObjectPart[] {
  return [-1,1].flatMap((x,xi)=>[-1,1].map((z,zi)=>box(`${prefix}-${xi}-${zi}`,`${label} ${xi*2+zi+1}`,[center[0]+x*w*.27,center[1],center[2]+z*d*.27],[w*.45,.1,d*.45],'top',wood,2)));
}

const interiors: ObjectPart[][] = [
  [
    ...chamber('lining','Timber room lining',[0,-.15,0],[1.95,1.65,1.65]),
    ...tiles('floorboard','Ground-floor board',[0,-.65,0],1.55,1.25),
    box('partition','Interior partition',[0,-.1,0],[.1,1,1],'right',cream,2),
    box('stair-landing','Stair landing',[.5,-.25,-.45],[.65,.12,.6],'top',wood,3),
  ],
  [
    ...chamber('tower-lining','Tower inner lining',[0,-.3,0],[.78,1.8,.78]),
    ...[-.95,-.55,-.15,.25].map((y,i)=>box(`stair-${i}`,`Spiral stair section ${i+1}`,[i%2?.035:-.035,y,0],[.65,.1,.65],'top',steel,2)),
    box('lamp-base','Lamp pedestal',[0,1.08,0],[.9,.12,.9],'top',dark,2),
    box('reflector','Lamp reflector',[0,1.5,-.2],[.7,.65,.12],'front',brass,3),
    box('lamp-lens','Lantern lens',[0,1.5,.24],[.7,.65,.12],'front',steel,2),
  ],
  [
    ...chamber('mill-lining','Mill inner frame',[0,-.3,0],[1.15,1.9,.9]),
    ...chamber('gearbox','Gearbox casing',[0,.2,0],[.85,.85,.65],2),
    ...tiles('mill-floor','Mill floor board',[0,-.95,0],.98,.8),
    disc('gear-a','Drive gear',[-.18,.2,.02],.46),
    disc('gear-b','Follower gear',[.18,.2,.02],.46),
  ],
  [
    ...chamber('boiler-lining','Boiler insulation',[.5,-.1,0],[1.9,.5,.85]),
    ...chamber('cab-lining','Cab inner frame',[-1.05,.25,0],[.9,.95,1]),
    ...chamber('firebox','Firebox casing',[.6,-.1,0],[1.4,.34,.6],2),
    ...[-1,.98].map((x,i)=>box(`axle-${i}`,`Wheel axle bracket ${i+1}`,[x,-.75,0],[.6,.35,1.3],'front',steel,2)),
    box('controls','Driver control panel',[-1.05,.4,-.2],[.7,.55,.12],'front',brass,3),
  ],
  [
    ...chamber('camera-frame','Camera inner chassis',[0,0,0],[2.65,1.5,.75]),
    ...chamber('sensor-housing','Sensor housing',[0,0,0],[1.5,1,.4],2),
    ...[.85,1.1,1.35].map((z,i)=>disc(`optics-${i}`,`Optical element ${i+1}`,[0,0,z],.65,'front',3)),
    ...[-1,1].flatMap((x,xi)=>[-.35,.35].map((y,yi)=>box(`pcb-${xi}-${yi}`,`Circuit board ${xi*2+yi+1}`,[x,y,0],[.45,.5,.06],'back',steel,3))),
    ...[-.25,0,.25].map((y,i)=>box(`shutter-${i}`,`Shutter mechanism ${i+1}`,[0,y,0],[1.1,.15,.32],'top',dark,3)),
    ...[-1,1].map((x,i)=>box(`battery-${i}`,`Battery module ${i+1}`,[x,-.45,.2],[.4,.5,.25],'front',brass,2)),
    ...[-.8,.8].map((x,i)=>box(`control-channel-${i}`,`Control channel ${i+1}`,[x,.55,0],[.5,.18,.55],'top',steel,2)),
  ],
  [
    ...chamber('cabin-lining','Rover inner frame',[-.7,.65,0],[1.1,1,.9]),
    ...chamber('battery-frame','Battery frame',[.98,.45,0],[.75,.55,.75]),
    ...chamber('instrument-frame','Instrument casing',[-.7,.65,0],[.7,.65,.55],2),
    ...[-1.23,0,1.23].map((x,i)=>box(`drive-axle-${i}`,`Drive axle ${i+1}`,[x,-.66,0],[.55,.4,1.3],'front',steel,2)),
    ...[-.62,.62].map((z,i)=>box(`array-backing-${i}`,`Solar array backing ${i+1}`,[.98,.88,z],[.9,.08,.85],'top',dark,2)),
    ...[-1.02,-.7,-.38].map((x,i)=>box(`instrument-board-${i}`,`Instrument board ${i+1}`,[x,.65,.05],[.3,.55,.08],'front',brass,3)),
    ...[.3,.45,.6].map((y,i)=>box(`power-cell-${i}`,`Power cell ${i+1}`,[.98,y,0],[.48,.12,.48],'top',brass,3)),
  ],
  [
    ...chamber('tower-frame','Clocktower inner frame',[0,.65,0],[.9,2.5,.85]),
    ...chamber('west-frame','West wing lining',[-1.17,-.65,0],[.8,1.2,.85]),
    ...chamber('east-frame','East wing lining',[1.17,-.65,0],[.8,1.2,.85]),
    ...chamber('clockwork','Clockwork housing',[0,1.15,0],[.6,.7,.5],2),
    ...[-.14,0,.14].map((z,i)=>disc(`clock-gear-${i}`,`Clockwork gear ${i+1}`,[0,1.15,z],.48,'front',3)),
    ...[-1.17,1.17].flatMap((x,xi)=>[-.2,.2].map((z,zi)=>box(`wing-floor-${xi}-${zi}`,`Wing floor board ${xi*2+zi+1}`,[x,-.95,z],[.65,.1,.35],'top',wood,2))),
    ...[-1.2,-.95,-.7].map((y,i)=>box(`hall-stair-${i}`,`Hall staircase ${i+1}`,[0,y,0],[.8,.12,.7],'top',wood,2)),
  ],
  [
    ...chamber('carriage-lining','Carriage lining',[0,0,0],[3,1.5,1.25]),
    ...chamber('undercarriage','Undercarriage frame',[0,-1.15,0],[2.6,.45,1.05]),
    ...chamber('saloon-frame','Passenger cabin frame',[0,0,0],[2.5,1.15,.95],2),
    ...[-1.05,-.35,.35,1.05].flatMap((x,xi)=>[-.32,.32].map((z,zi)=>{
      const p=box(`seat-${xi}-${zi}`,`Passenger seat ${xi*2+zi+1}`,[x,-.3,z],[.52,.28,.4],'top',wood,3);
      p.details=[{primitive:'box',position:[0,-.2,0],size:[.16,.15,.16],rotation:[0,0,0],color:dark}];return p;
    })),
    ...[-1.06,1.06].flatMap((x,xi)=>[-.71,.71].map((z,zi)=>box(`glass-${xi}-${zi}`,`Window glass ${xi*2+zi+1}`,[x,.38,z],[.85,.7,.08],z>0?'front':'back',steel,1))),
    ...[-1.42,1.42].map((x,i)=>box(`driving-controls-${i}`,`Driving control panel ${i+1}`,[x,.3,0],[.18,.7,.9],x>0?'right':'left',brass,2)),
    ...chamber('traction-battery','Traction battery casing',[0,-1.15,0],[1.5,.3,.65],3),
    box('traction-control','Traction controller',[0,-1.15,0],[1.1,.2,.42],'top',brass,4),
  ],
];

// Adjacent rooms use removable equipment boards at shared boundaries rather
// than opposing fasteners trapped in the narrow gap between two wall skins.
interiors[5][interiors[5].findIndex(p=>p.id==='battery-frame-left')]=
  box('battery-frame-left','Battery management board',[.98,.45,-.1],[.55,.4,.06],'front',steel,2);
interiors[6][interiors[6].findIndex(p=>p.id==='west-frame-right')]=
  box('west-frame-right','West wing window lining',[-1.17,-.35,.2],[.65,.6,.08],'front',cream,2);
interiors[6][interiors[6].findIndex(p=>p.id==='east-frame-left')]=
  box('east-frame-left','East wing window lining',[1.17,-.35,-.2],[.65,.6,.08],'back',cream,2);

/** One to three well-separated fasteners, chosen for the actual attachment face. */
function anchors(p:ObjectPart,count:number): ObjectPart['anchors']|null {
  const worldNormal=p.anchors[0].normal;
  const localNormal=inverseRotate(worldNormal,p.rotation);
  const axis=localNormal.findIndex(n=>Math.abs(n)>.99);
  if(axis<0)return null;
  const sign=Math.sign(localNormal[axis]);
  const u=axis===0?2:0,v=axis===1?2:1;
  const ru=p.size[u]/2-margin,rv=p.size[v]/2-margin;
  if(ru<0||rv<0)return null;
  let points:number[][];
  if(p.primitive==='cylinder'){
    const r=Math.min(...[p.size[u],p.size[v]])/2-radius-.065;
    if(count>1&&r<.26)return null;
    points=count===1?[[0,0]]:Array.from({length:count},(_,i)=>[Math.cos(i*Math.PI*2/count)*r,Math.sin(i*Math.PI*2/count)*r]);
  }else if(count===1)points=[[0,0]];
  else if(count===2){
    if(Math.max(ru,rv)<.23)return null;
    points=ru>=rv?[[-ru,0],[ru,0]]:[[0,-rv],[0,rv]];
  }else if(ru>=.23&&rv>=.23)points=[[-ru,rv],[ru,rv],[0,-rv]];
  else if(Math.max(ru,rv)>=.46)points=ru>=rv?[[-ru,0],[0,0],[ru,0]]:[[0,-rv],[0,0],[0,rv]];
  else return null;
  return points.map(([a,b])=>{
    const local:Vec3=[0,0,0];local[axis]=sign*(p.size[axis]/2+.035);local[u]=a;local[v]=b;
    const offset=rotate(local,p.rotation);
    return {position:offset.map((n,i)=>n+p.position[i]) as Vec3,normal:[...worldNormal] as Vec3};
  });
}

export const CLASSIC_COUNTS=[42,54,66,78,90,102,111,120];
export const DETAILED_MODELS: AssemblyModel[]=OBJECT_MODELS.map((base,index)=>{
  const parts=structuredClone([...base.parts,...interiors[index]]);
  for(const [i,p] of parts.entries()){
    p.interior=i>=base.parts.length;
    p.position=p.position.map(n=>n*SCALE) as Vec3;p.size=p.size.map(n=>n*SCALE) as Vec3;
    for(const detail of p.details||[]){detail.position=detail.position.map(n=>n*SCALE) as Vec3;detail.size=detail.size.map(n=>n*SCALE) as Vec3;}
  }
  const counts=parts.map(p=>anchors(p,2)?2:1);
  let total=counts.reduce((a,b)=>a+b,0);
  // Broad surfaces receive the additional screws, rather than crowding tiny controls.
  const broad=parts.map((p,i)=>({i,area:p.size.slice().sort((a,b)=>b-a).slice(0,2).reduce((a,b)=>a*b,1)})).sort((a,b)=>b.area-a.area);
  while(total<CLASSIC_COUNTS[index]){
    let added=false;
    for(const {i} of broad)if(counts[i]<3&&anchors(parts[i],counts[i]+1)){
      counts[i]++;total++;added=true;if(total===CLASSIC_COUNTS[index])break;
    }
    if(!added)throw Error(`${base.id}: insufficient spaced attachment faces for ${CLASSIC_COUNTS[index]} screws (${total})`);
  }
  while(total>CLASSIC_COUNTS[index])for(const {i}of [...broad].reverse())if(counts[i]>1){counts[i]--;total--;if(total===CLASSIC_COUNTS[index])break;}
  parts.forEach((p,i)=>{
    const generated=anchors(p,counts[i]);if(!generated)throw Error(`${base.id}/${p.id}: face too small for a screw`);
    p.anchors=generated;p.blockedBy=[];
  });
  for(const p of parts)for(const anchor of p.anchors){
    anchor.blockedBy=parts.filter(other=>other.id!==p.id&&covers(anchor,other)).map(other=>other.id);
  }
  return {...base,subtitle:'Peel back the outer shell. Explore the frame, then the core.',parts};
});
