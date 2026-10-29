interface Device { vibrate(pattern:number):boolean }
interface PreferenceStore { getItem(key:string):string|null; setItem(key:string,value:string):void }
const KEY='screw-garden-vibration';
function preferenceStore():PreferenceStore|undefined {try{return localStorage;}catch{return undefined;}}
/** Optional progressive enhancement: browsers may reject vibration without throwing. */
export class Haptics {
  enabled=false;
  get supported(){return typeof this.device?.vibrate==='function';}
  constructor(private device:Device|undefined=typeof navigator!=='undefined'&&typeof navigator.vibrate==='function'?navigator:undefined,private storage:PreferenceStore|undefined=preferenceStore()){
    try{this.enabled=this.supported&&storage?.getItem(KEY)==='on';}catch{}
  }
  setEnabled(value:boolean){
    this.enabled=value&&this.supported;
    try{this.storage?.setItem(KEY,this.enabled?'on':'off');}catch{}
    if(!this.enabled)this.stop();
  }
  screw(bucketClear=false){if(this.enabled)this.vibrate(bucketClear?20:10);}
  stop(){if(this.supported)this.vibrate(0);}
  private vibrate(duration:number){try{this.device?.vibrate(duration);}catch{/* Unsupported/blocked haptics never interrupt a move. */}}
}
