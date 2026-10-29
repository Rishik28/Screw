import * as THREE from 'three';
import { COLORS, type Game } from './game';
import { getModelOutline } from './models';

type Detail={primitive:string;size:[number,number,number];position:[number,number,number];rotation:[number,number,number];color:string};
type PartGeometry = {primitive?:string;size?:[number,number,number];rotationX?:number;rotationY?:number;details?:Detail[]};
/** Small, deterministic texture maps keep surfaces quiet and avoid external assets. */
function surfaceTexture(): THREE.DataTexture {
  const size = 32, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const value = 239 + ((Math.floor(x / 4) * 13 + Math.floor(y / 4) * 7) % 11);
    const i = (y * size + x) * 4;
    pixels.set([value, value, value, 255], i);
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
function shadowTexture(): THREE.DataTexture {
  const size = 32, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const distance = ((x + .5) / size * 2 - 1) ** 2 + ((y + .5) / size * 2 - 1) ** 2;
    pixels[(y * size + x) * 4 + 3] = Math.round(Math.max(0, 1 - distance) ** 2 * 65);
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
  return texture;
}
/** Real multipart geometry, orbitable by touch, mouse, and keyboard controls. */
export class BoardRenderer {
  private renderer:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private surfaceMap=surfaceTexture();
  private shadowMap=shadowTexture();
  private floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({color:0x50677d}));
  private groundShadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:this.shadowMap,transparent:true,depthWrite:false}));
  private camera=new THREE.OrthographicCamera(-4,4,4,-4,.1,100);
  private assembly=new THREE.Group();
  private screws=new Map<string,THREE.Group>();
  private buttons=new Map<string,HTMLButtonElement>();
  private normals=new Map<string,THREE.Vector3>();
  private plates:THREE.Mesh[]=[];
  private observer:ResizeObserver;
  private raycaster=new THREE.Raycaster();
  private game?:Game;
  private frame=0;
  private dirty=true;
  private hintId='';
  private arcade=false;
  private exploreUntil=0;
  private suppressClickUntil=0;
  private exits=new Map<THREE.Object3D,{start:number;position:THREE.Vector3;quaternion:THREE.Quaternion;normal:THREE.Vector3|null}>();
  private reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  private yaw=.3;
  private pitch=.18;
  private fitWidth=3.8;
  private fitHeight=3.8;
  private orbitCenter=new THREE.Vector3();
  private zoom=1;
  private pointers=new Map<number,{x:number;y:number}>();
  private pinch:{distance:number;zoom:number}|null=null;
  private pinchLocked=false;
  private drag:{x:number;y:number;startX:number;startY:number;id?:string;moved:boolean}|null=null;
  constructor(private host:HTMLElement,private onSelect:(id:string)=>void,private onMiss:()=>void=()=>{}){
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false});this.renderer.setPixelRatio(1);this.renderer.shadowMap.enabled=false;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NoToneMapping;
    this.renderer.domElement.className='game-canvas';this.renderer.domElement.setAttribute('aria-hidden','true');host.prepend(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xe6e3d9,0x607084,1.8));
    const light=new THREE.DirectionalLight(0xfff3dc,1.6);light.position.set(-4,7,10);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-7;light.shadow.camera.right=7;light.shadow.camera.top=7;light.shadow.camera.bottom=-7;light.shadow.normalBias=.04;this.scene.add(light);
    const fill=new THREE.DirectionalLight(0xc5d1dd,.45);fill.position.set(6,1,-7);this.scene.add(fill);this.scene.add(this.assembly);
    this.scene.background=new THREE.Color(0x50677d);
    this.floor.rotation.x=-Math.PI/2;this.groundShadow.rotation.x=-Math.PI/2;
    this.scene.add(this.floor,this.groundShadow);
    document.addEventListener('click',this.suppressPointerClick,true);
    host.addEventListener('pointerdown',this.pointerDown);host.addEventListener('pointermove',this.pointerMove);host.addEventListener('pointerup',this.pointerUp);host.addEventListener('pointercancel',this.pointerCancel);
    host.addEventListener('wheel',this.wheel,{passive:false});
    host.addEventListener('keydown',event=>{if((event.target as HTMLElement).closest('button'))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)){event.preventDefault();if(event.key==='ArrowLeft')this.rotate(-1);if(event.key==='ArrowRight')this.rotate(1);if(event.key==='ArrowUp')this.pitch=Math.min(1.1,this.pitch+.25);if(event.key==='ArrowDown')this.pitch=Math.max(-1.1,this.pitch-.25);if(event.key==='Home')this.resetView();this.updateCamera();}});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.updateCamera();this.animate();
  }
  setArcade(enabled:boolean){this.arcade=enabled;}
  isExploring(){return this.pointers.size>1||!!this.drag?.moved||performance.now()<this.exploreUntil;}
  screenPoint(id:string){const b=this.buttons.get(id);return {x:b?parseFloat(b.style.left)/100*this.host.clientWidth:this.host.clientWidth/2,y:b?parseFloat(b.style.top)/100*this.host.clientHeight:this.host.clientHeight/2};}
  getView(){return {yaw:this.yaw,pitch:this.pitch,zoom:this.zoom};}
  rotate(direction:number){this.exploreUntil=performance.now()+200;this.yaw+=direction*Math.PI/4;this.updateCamera();}
  resetView(){this.yaw=.3;this.pitch=.18;this.setZoom(1);this.updateCamera();}
  private setZoom(value:number){this.zoom=Math.max(.65,Math.min(2.2,value));this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();this.dirty=true;this.positionButtons();}
  private beginPinch(){const [a,b]=[...this.pointers.values()];this.pinch=a&&b?{distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:this.zoom}:null;}
  private pointerDown=(event:PointerEvent)=>{
    if(event.button!==0||(event.target as HTMLElement).closest('.rotation-controls'))return;
    if(this.pointers.size===0)this.pinchLocked=false;
    this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});this.host.setPointerCapture(event.pointerId);
    if(this.pointers.size>=2){this.pinchLocked=true;this.drag=null;this.beginPinch();this.host.classList.add('is-dragging');return;}
    const target=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-screw-id]');
    this.drag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,id:target?.dataset.screwId,moved:false};
  };
  private pointerMove=(event:PointerEvent)=>{
    if(!this.pointers.has(event.pointerId))return;this.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(this.pointers.size>=2&&this.pinch){const [a,b]=[...this.pointers.values()];this.setZoom(this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/this.pinch.distance);return;}
    if(!this.drag)return;const dx=event.clientX-this.drag.x,dy=event.clientY-this.drag.y;
    this.drag.moved ||= Math.hypot(event.clientX-this.drag.startX,event.clientY-this.drag.startY)>6;
    if(this.drag.moved){this.yaw-=dx*.009;this.pitch=Math.max(-1.1,Math.min(1.1,this.pitch+dy*.009));this.host.classList.add('is-dragging');this.updateCamera();}
    this.drag.x=event.clientX;this.drag.y=event.clientY;
  };
  private finishPointer(event:PointerEvent,cancelled:boolean){
    if(!this.pointers.has(event.pointerId))return;
    const isTap=!cancelled&&!this.pinchLocked&&this.pointers.size===1&&!!this.drag&&!this.drag.moved;
    const tap=isTap?this.drag?.id:undefined;
    this.pointers.delete(event.pointerId);if(this.host.hasPointerCapture(event.pointerId))this.host.releasePointerCapture(event.pointerId);
    if(this.pointers.size>=2)this.beginPinch();
    else if(this.pointers.size===1){const [remaining]=this.pointers.values();this.pinch=null;this.drag={...remaining,startX:remaining.x,startY:remaining.y,moved:true};}
    else{this.pinch=null;this.drag=null;this.host.classList.remove('is-dragging');}
    if(tap&&this.buttons.get(tap)?.disabled===false){this.suppressClickUntil=performance.now()+350;this.onSelect(tap);}else if(isTap)this.onMiss();
  }
  private pointerUp=(event:PointerEvent)=>this.finishPointer(event,false);
  private pointerCancel=(event:PointerEvent)=>this.finishPointer(event,true);
  private wheel=(event:WheelEvent)=>{event.preventDefault();this.setZoom(this.zoom*Math.exp(-event.deltaY*.0015));};
  // A touch's compatibility click may target a dialog created by onSelect.
  // Consume that one pointer click globally, while preserving keyboard clicks.
  private suppressPointerClick=(event:MouseEvent)=>{if(event.detail>0&&performance.now()<this.suppressClickUntil){this.suppressClickUntil=0;event.preventDefault();event.stopImmediatePropagation();}};
  private updateCamera(){this.dirty=true;const radius=16;this.camera.position.copy(this.orbitCenter).add(new THREE.Vector3(Math.sin(this.yaw)*Math.cos(this.pitch)*radius,Math.sin(this.pitch)*radius,Math.cos(this.yaw)*Math.cos(this.pitch)*radius));this.camera.lookAt(this.orbitCenter);this.camera.updateMatrixWorld();this.floor.visible=this.pitch>=0;this.groundShadow.visible=this.floor.visible;this.positionButtons();}
  load(game:Game){this.game=game;for(const child of [...this.assembly.children]){this.assembly.remove(child);child.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});}this.exits.clear();this.screws.clear();this.normals.clear();this.plates=[];this.buttons.forEach(b=>b.remove());this.buttons.clear();
    for(const plate of game.state.level.plates){const part=plate as typeof plate&PartGeometry;const [w,h,d]=part.size??[plate.width,plate.height,.2];let geometry:THREE.BufferGeometry;
      switch(part.primitive){case 'box':geometry=new THREE.BoxGeometry(w,h,d);break;case 'sphere':geometry=new THREE.SphereGeometry(.5,12,8);geometry.scale(w,h,d);break;case 'cylinder':geometry=new THREE.CylinderGeometry(w/2,w/2,h,12);geometry.scale(1,1,d/w);break;case 'cone':geometry=new THREE.ConeGeometry(w/2,h,4);geometry.scale(1,1,d/w);geometry.rotateY(Math.PI/4);break;case 'wedge':{const shape=new THREE.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(0,h/2);shape.closePath();geometry=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});geometry.translate(0,0,-d/2);break;}default:{const shape=new THREE.Shape();getModelOutline(plate.shape,w*plate.scale,h*plate.scale).forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();geometry=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:2});}}
      const mesh=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({color:plate.color,map:this.surfaceMap,flatShading:true}));mesh.position.set(plate.x,plate.y,plate.z);mesh.rotation.set(part.rotationX??0,part.rotationY??0,plate.rotation);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.plateId=plate.id;mesh.userData.baseRotation=mesh.rotation.clone();for(const detail of part.details??[]){const [dw,dh,dd]=detail.size;let dg:THREE.BufferGeometry=new THREE.BoxGeometry(dw,dh,dd);if(detail.primitive==='cylinder'){dg.dispose();dg=new THREE.CylinderGeometry(dw/2,dw/2,dh,12);dg.scale(1,1,dd/dw);}else if(detail.primitive==='ring'){dg.dispose();dg=new THREE.RingGeometry(dw*.35,dw*.5,8);dg.rotateX(-Math.PI/2);}else if(detail.primitive==='sphere'){dg.dispose();dg=new THREE.SphereGeometry(.5,12,8);dg.scale(dw,dh,dd);}const child=new THREE.Mesh(dg,new THREE.MeshLambertMaterial({color:detail.color,map:this.surfaceMap,flatShading:true}));child.position.set(detail.position[0],detail.position[1],detail.position[2]);child.rotation.set(detail.rotation[0],detail.rotation[1],detail.rotation[2]);child.castShadow=true;child.receiveShadow=true;mesh.add(child);}this.assembly.add(mesh);this.plates.push(mesh);
    }
    for(const screw of game.state.level.screws){const normal=new THREE.Vector3(...((screw as typeof screw&{normal?:[number,number,number]}).normal??[0,0,1])).normalize();const group=new THREE.Group();group.position.set(screw.x,screw.y,screw.z);group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);group.userData.screwId=screw.id;group.userData.baseRotation=group.rotation.clone();
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.055,12),new THREE.MeshLambertMaterial({color:0xa2afb5,flatShading:true}));rim.rotation.x=Math.PI/2;group.add(rim);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.105,12),new THREE.MeshLambertMaterial({color:COLORS[screw.color],flatShading:true}));cap.rotation.x=Math.PI/2;cap.position.z=.055;cap.castShadow=true;group.add(cap);
      const shaft=new THREE.Group();shaft.name='threaded-shaft';shaft.visible=false;
      const steel=new THREE.MeshLambertMaterial({color:0xb6c4cd,flatShading:true});
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.046,.046,.4,12),steel);stem.rotation.x=Math.PI/2;stem.position.z=-.19;stem.castShadow=true;shaft.add(stem);
      for(let thread=0;thread<7;thread++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.052,.012,5,12),steel);ring.position.z=-.025-thread*.055;shaft.add(ring);}group.add(shaft);
      const material=new THREE.MeshBasicMaterial({color:0x203043});for(const angle of [0,Math.PI/2]){const slot=new THREE.Mesh(new THREE.BoxGeometry(.17,.033,.012),material);slot.position.z=.113;slot.rotation.z=angle;group.add(slot);}this.assembly.add(group);this.screws.set(screw.id,group);this.normals.set(screw.id,normal);
      const button=document.createElement('button');button.className='screw-target';button.dataset.screwId=screw.id;button.setAttribute('aria-label',`Remove ${screw.color} screw`);button.addEventListener('click',event=>{if(event.detail===0)this.onSelect(screw.id);});this.host.append(button);this.buttons.set(screw.id,button);
    }
    const box=new THREE.Box3().setFromObject(this.assembly);const sphere=box.getBoundingSphere(new THREE.Sphere());this.orbitCenter.copy(sphere.center);
    this.resetView();
    const projectedBounds=new THREE.Box3();
    for(const x of [box.min.x,box.max.x]) for(const y of [box.min.y,box.max.y]) for(const z of [box.min.z,box.max.z])
      projectedBounds.expandByPoint(new THREE.Vector3(x,y,z).applyMatrix4(this.camera.matrixWorldInverse));
    const fit=projectedBounds.getSize(new THREE.Vector3());
    this.fitWidth=fit.x*.57;this.fitHeight=fit.y*.57;
    this.floor.position.y=box.min.y-.04;
    this.groundShadow.position.set(sphere.center.x,box.min.y-.03,sphere.center.z);
    this.groundShadow.scale.set((box.max.x-box.min.x)*1.1,(box.max.z-box.min.z)*1.1,1);this.resetView();this.update();this.resize();
  }
  update(){this.dirty=true;if(!this.game)return;const state=this.game.state;for(const plate of this.plates)this.release(plate,state.removedPlateIds.has(plate.userData.plateId));for(const [id,object]of this.screws){this.release(object,state.removedIds.has(id));const button=this.buttons.get(id)!;button.disabled=!this.game.isAvailable(id)||state.status!=='playing';button.setAttribute('aria-label',`Remove ${state.level.screws.find(s=>s.id===id)!.color} screw${button.disabled?' (locked; remove connected parts first)':''}`);}this.positionButtons();}
  hint(id:string){this.dirty=true;this.hintId=id;const normal=this.normals.get(id);if(normal){this.yaw=Math.atan2(normal.x,normal.z);this.pitch=Math.asin(Math.max(-1,Math.min(1,normal.y)));this.updateCamera();}setTimeout(()=>{if(this.hintId===id){this.hintId='';this.dirty=true;}},3500);}
  private resize(){this.dirty=true;const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;const rasterWidth=Math.min(360,Math.max(240,Math.round(w*.85)));this.renderer.setSize(rasterWidth,Math.round(h*rasterWidth/w),false);const halfY=Math.max(this.fitHeight,this.fitWidth*h/w);this.camera.left=-halfY*w/h;this.camera.right=halfY*w/h;this.camera.top=halfY;this.camera.bottom=-halfY;this.camera.updateProjectionMatrix();this.positionButtons();}
  private positionButtons(){if(!this.game)return;this.assembly.updateMatrixWorld(true);for(const[id,group]of this.screws){const button=this.buttons.get(id)!;const normal=this.normals.get(id)!;const point=group.position.clone().addScaledVector(normal,.14);const eye=this.camera.getWorldDirection(new THREE.Vector3()).negate();let visible=group.visible&&!this.game.state.removedIds.has(id)&&normal.dot(eye)>.08;
      if(visible){const ndc=point.clone().project(this.camera);this.raycaster.setFromCamera(new THREE.Vector2(ndc.x,ndc.y),this.camera);this.raycaster.far=point.clone().sub(this.raycaster.ray.origin).dot(this.raycaster.ray.direction)-.04;visible=!this.raycaster.intersectObjects(this.plates.filter(p=>p.visible&&!this.game!.state.removedPlateIds.has(p.userData.plateId)),false).length;}
      button.hidden=!visible;const p=point.project(this.camera);button.style.left=`${(p.x+1)*50}%`;button.style.top=`${(-p.y+1)*50}%`;button.style.zIndex=String(80-Math.round(p.z*20));button.classList.toggle('is-hint',id===this.hintId);
    }
    // Dense hardware needs nonoverlapping hit regions: each center owns its
    // nearest area rather than another screw's transparent bounding box.
    const visible=[...this.buttons.values()].filter(button=>!button.hidden).map(button=>({button,x:parseFloat(button.style.left)/100*this.host.clientWidth,y:parseFloat(button.style.top)/100*this.host.clientHeight}));
    for(const item of visible){let polygon=[[-22,-22],[22,-22],[22,22],[-22,22]];for(const other of visible){if(other===item)continue;const nx=other.x-item.x,ny=other.y-item.y;const distance=nx*nx+ny*ny;if(distance>.0001&&distance<88*88){const bound=distance/2;const next:number[][]=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];const da=a[0]*nx+a[1]*ny-bound,db=b[0]*nx+b[1]*ny-bound;if(da<=0)next.push(a);if((da<=0)!==(db<=0)){const t=da/(da-db);next.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}polygon=next;}}item.button.style.clipPath=`polygon(${polygon.map(([x,y])=>`${(x+22)/44*100}% ${(y+22)/44*100}%`).join(',')})`;}
  }
  private release(object:THREE.Object3D,gone:boolean){
    if(gone&&object.visible&&!this.exits.has(object)){
      if(this.reducedMotion)object.visible=false;
      else{
        const normal=object.userData.screwId?this.normals.get(object.userData.screwId)!.clone():null;
        this.exits.set(object,{start:performance.now()+(normal?0:(this.arcade?150:380)),position:object.position.clone(),quaternion:object.quaternion.clone(),normal});
        const shaft=object.getObjectByName('threaded-shaft');if(shaft)shaft.visible=true;
      }
    }
    if(!gone){const exit=this.exits.get(object);if(exit){object.position.copy(exit.position);object.quaternion.copy(exit.quaternion);this.exits.delete(object);}object.visible=true;const shaft=object.getObjectByName('threaded-shaft');if(shaft)shaft.visible=false;}
  }
  private animate=()=>{
    this.frame=requestAnimationFrame(this.animate);
    for(const[object,exit]of this.exits){if(!object.visible)continue;this.dirty=true;const p=Math.max(0,Math.min(1,(performance.now()-exit.start)/(this.arcade?260:600)));
      if(exit.normal){object.position.copy(exit.position).addScaledVector(exit.normal,p*.9);object.quaternion.copy(exit.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),p*Math.PI*4));}
      else object.position.copy(exit.position).addScaledVector(new THREE.Vector3(0,-1,0),p*1.2);
      if(p===1)object.visible=false;
    }
    if(this.dirty){this.positionButtons();this.renderer.render(this.scene,this.camera);this.dirty=false;}
  };
  dispose(){this.host.removeEventListener('pointerdown',this.pointerDown);this.host.removeEventListener('pointermove',this.pointerMove);this.host.removeEventListener('pointerup',this.pointerUp);this.host.removeEventListener('pointercancel',this.pointerCancel);this.host.removeEventListener('wheel',this.wheel);document.removeEventListener('click',this.suppressPointerClick,true);cancelAnimationFrame(this.frame);this.observer.disconnect();this.surfaceMap.dispose();this.shadowMap.dispose();this.floor.geometry.dispose();this.floor.material.dispose();this.groundShadow.geometry.dispose();this.groundShadow.material.dispose();this.renderer.dispose();}
}
