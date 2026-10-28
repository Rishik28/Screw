import * as THREE from 'three';
import { COLORS, type Game } from './game';
import { getModelOutline } from './models';

/** A shallow orthographic diorama: the layers remain readable on a small phone. */
export class BoardRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-3.2,3.2,3.5,-3.5,.1,100);
  private assembly = new THREE.Group();
  private screws = new Map<string, THREE.Group>();
  private buttons = new Map<string, HTMLButtonElement>();
  private observer: ResizeObserver;
  private game?: Game;
  private time = 0;
  private frame = 0;
  private hintId = '';
  private exits = new Map<THREE.Object3D,{start:number,y:number,z:number}>();
  private reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(private host: HTMLElement, private onSelect:(id:string)=>void) {
    this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.domElement.className='game-canvas';
    this.renderer.domElement.setAttribute('aria-hidden','true');
    host.prepend(this.renderer.domElement);
    this.camera.position.set(0,0,18);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x859a83,2));
    const light = new THREE.DirectionalLight(0xffffff,2);
    light.position.set(-4,7,12); light.castShadow=true;
    light.shadow.mapSize.set(1024,1024); light.shadow.camera.left=-5;light.shadow.camera.right=5;light.shadow.camera.top=5;light.shadow.camera.bottom=-5;
    light.shadow.normalBias=.03;this.scene.add(light);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.12}));floor.position.z=-.35;floor.receiveShadow=true;this.scene.add(floor);
    this.scene.add(this.assembly);
    this.observer = new ResizeObserver(()=>this.resize());this.observer.observe(host);
    this.animate();
  }
  load(game:Game) {
    this.game=game;
    for(const child of [...this.assembly.children]){this.assembly.remove(child);child.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(m=>m.dispose());}});}
    this.exits.clear();this.screws.clear();this.buttons.forEach(b=>b.remove());this.buttons.clear();
    for(const plate of game.state.level.plates){
      const shape=new THREE.Shape();const points=getModelOutline(plate.shape,plate.width*plate.scale,plate.height*plate.scale);
      points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelThickness:.07,bevelSize:.06,bevelSegments:3,steps:1});
      const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:plate.color,roughness:.44,metalness:.05}));
      mesh.position.set(plate.x,plate.y,plate.z*2.5);mesh.rotation.z=plate.rotation;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.plateId=plate.id;mesh.userData.baseRotation=plate.rotation;this.assembly.add(mesh);
    }
    for(const screw of game.state.level.screws){
      const group=new THREE.Group();group.position.set(screw.x,screw.y,(screw.z-.14)*2.5+.26);group.userData.screwId=screw.id;group.userData.baseRotation=0;
      const hex=COLORS[screw.color];
      const rim=new THREE.Mesh(new THREE.CylinderGeometry(.235,.235,.065,32),new THREE.MeshStandardMaterial({color:0xf8faf4,metalness:.65,roughness:.3}));rim.rotation.x=Math.PI/2;group.add(rim);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(.205,.205,.115,32),new THREE.MeshStandardMaterial({color:hex,metalness:.3,roughness:.26}));cap.rotation.x=Math.PI/2;cap.position.z=.06;cap.castShadow=true;group.add(cap);
      const slotMaterial=new THREE.MeshStandardMaterial({color:0x243c38,roughness:.7});
      for(const rotation of [0,Math.PI/2]){const slot=new THREE.Mesh(new THREE.BoxGeometry(.19,.038,.012),slotMaterial);slot.position.z=.125;slot.rotation.z=rotation;group.add(slot);}
      this.assembly.add(group);this.screws.set(screw.id,group);
      const button=document.createElement('button');button.className='screw-target';button.dataset.screwId=screw.id;button.setAttribute('aria-label',`Remove ${screw.color} screw`);button.addEventListener('click',()=>this.onSelect(screw.id));this.host.append(button);this.buttons.set(screw.id,button);
    }
    this.update();this.resize();
  }
  update(){if(!this.game)return;const state=this.game.state;
    for(const object of this.assembly.children){const plateId=object.userData.plateId;if(plateId){const gone=!state.level.screws.some(s=>s.plateId===plateId&&!state.removedIds.has(s.id));this.release(object,gone);}}
    for(const [id,object] of this.screws){const gone=state.removedIds.has(id);this.release(object,gone);const button=this.buttons.get(id)!;button.hidden=gone;button.disabled=!this.game.isAvailable(id)||state.status!=='playing';button.setAttribute('aria-label',`Remove ${state.level.screws.find(s=>s.id===id)!.color} screw${button.disabled?' (covered)':''}`);button.classList.toggle('is-blocked',button.disabled);}
  }
  hint(id:string){this.hintId=id;setTimeout(()=>{if(this.hintId===id)this.hintId='';},2200);}
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);const halfY=Math.max(3.2,3.25*h/w);this.camera.left=-halfY*w/h;this.camera.right=halfY*w/h;this.camera.top=halfY;this.camera.bottom=-halfY;this.camera.updateProjectionMatrix();this.positionButtons();}
  private positionButtons(){for(const [id,group] of this.screws){const p=group.position.clone().project(this.camera);const button=this.buttons.get(id)!;button.style.left=`${(p.x+1)*50}%`;button.style.top=`${(-p.y+1)*50}%`;button.style.zIndex=String(2+Math.round(group.position.z*10));}}
  private release(object:THREE.Object3D,gone:boolean){
    if(gone&&object.visible&&!this.exits.has(object)){if(this.reducedMotion)object.visible=false;else this.exits.set(object,{start:performance.now(),y:object.position.y,z:object.position.z});}
    if(!gone){const exit=this.exits.get(object);if(exit){object.position.y=exit.y;object.position.z=exit.z;this.exits.delete(object);}object.visible=true;object.rotation.z=object.userData.baseRotation??object.rotation.z;}
  }
  private animate=()=>{this.frame=requestAnimationFrame(this.animate);this.time+=.025;for(const [object,exit]of this.exits){const p=Math.min(1,(performance.now()-exit.start)/360);if(object.userData.screwId){object.rotation.z=p*Math.PI*3;object.position.z=exit.z+p*1.2;object.position.y=exit.y+p*.35;}else{object.position.y=exit.y-p*1.2;}if(p===1)object.visible=false;}
    for(const [id,group]of this.screws){const scale=id===this.hintId&&!this.reducedMotion?1+Math.sin(this.time*5)*.1:1;group.scale.setScalar(scale);this.buttons.get(id)?.classList.toggle('is-hint',id===this.hintId);}this.renderer.render(this.scene,this.camera);};
  dispose(){cancelAnimationFrame(this.frame);this.observer.disconnect();this.renderer.dispose();}
}
