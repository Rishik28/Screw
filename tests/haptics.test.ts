import test from 'node:test';
import assert from 'node:assert/strict';
import {Haptics} from '../src/haptics';
test('vibration is opt-in, short, saved, and cancellable',()=>{
 const pulses:number[]=[],saved=new Map<string,string>();
 const store={getItem:(key:string)=>saved.get(key)||null,setItem:(key:string,value:string)=>{saved.set(key,value);}};
 const device={vibrate:(ms:number)=>{pulses.push(ms);return true;}};
 const h=new Haptics(device,store);h.screw();assert.deepEqual(pulses,[]);
 h.setEnabled(true);h.screw();h.screw(true);assert.deepEqual(pulses,[10,20]);
 assert.equal(new Haptics(device,store).enabled,true);
 h.setEnabled(false);h.screw();assert.deepEqual(pulses,[10,20,0]);assert.equal(new Haptics(device,store).enabled,false);
});
test('unsupported, rejected and throwing vibration/storage do not interrupt gameplay',()=>{
 const h=new Haptics(undefined,{getItem:()=>null,setItem:()=>{throw Error('storage');}});h.setEnabled(true);assert.equal(h.enabled,false);h.screw();
 for(const vibrate of [()=>false,()=>{throw Error('blocked');}]){
  const h=new Haptics({vibrate},{getItem:()=>{throw Error('storage');},setItem:()=>{throw Error('storage');}});h.setEnabled(true);assert.doesNotThrow(()=>h.screw());assert.doesNotThrow(()=>h.stop());
 }
});
