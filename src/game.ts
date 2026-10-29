import { type Color, type Level } from './levels';
export { COLORS } from './levels';
export const BUFFER_CAPACITY = 5;
export const ACTIVE_TRAY_COUNT = 4;
export interface TrayClear { slot: number; color: Color }
export interface Tray { color: Color; count: number }
export interface GameState {
  level: Level; removedIds: Set<string>; removedPlateIds: Set<string>;
  trays: Tray[]; buffer: Color[]; completedTrays: number; moves: number;
  status: 'playing' | 'won' | 'lost';
}
export class Game {
  state: GameState;
  clearedTrays: TrayClear[] = [];
  private queueIndex = 0;
  private history: {state: GameState; queueIndex: number}[] = [];
  constructor(public level: Level) { this.state = this.initial(); }
  private initial(): GameState {
    this.queueIndex = Math.min(ACTIVE_TRAY_COUNT, this.level.trayOrder.length);
    return {level:this.level, removedIds:new Set(), removedPlateIds:new Set(),
      trays:this.level.trayOrder.slice(0,ACTIVE_TRAY_COUNT).map(color=>({color,count:0})),
      buffer:[], completedTrays:0, moves:0, status:'playing'};
  }
  get canUndo() { return this.history.length > 0; }
  isAvailable(id: string): boolean {
    const screw = this.level.screws.find(s=>s.id===id);
    return this.state.status === 'playing' && !!screw && !this.state.removedIds.has(id)
      && screw.blockedBy.every(p=>this.state.removedPlateIds.has(p));
  }
  isAccessible(id: string) { return this.isAvailable(id); }
  /** Suggest only a move with a verified winning continuation from this state. */
  getHint(): {screwId: string | null; message: string} {
    if (this.state.status === 'won') return {screwId:null,message:'This model is complete. Continue to the next one!'};
    if (this.state.status === 'lost') return {screwId:null,message:'Use Undo to make room on your shelf.'};
    const search = new Game(this.level);
    search.state = this.clone();
    search.queueIndex = this.queueIndex;
    // Most deviations still preserve the authored topological solution. Verify
    // that continuation first, avoiding a combinatorial search on large models.
    const reference = this.level.solution.filter(id=>!this.state.removedIds.has(id));
    let referenceValid = true;
    for (const id of reference) {
      if (!search.selectScrew(id) || search.state.status === 'lost') { referenceValid=false; break; }
    }
    if (referenceValid && search.state.status === 'won')
      return {screwId:reference[0],message:'Try the glowing screw. A clear path remains from here.'};
    search.state = this.clone(); search.queueIndex = this.queueIndex; search.history=[];
    const failed = new Set<string>();
    const indices = new Map(this.level.screws.map((s,i)=>[s.id,i]));
    let visits = 0, bounded = false;
    const deadline = Date.now() + 250;
    const solve = (): string[] | null => {
      if (search.state.status === 'won') return [];
      if (search.state.status === 'lost') return null;
      if (++visits > 12000 || Date.now() > deadline) { bounded=true; return null; }
      const mask = [...search.state.removedIds].reduce((n,id)=>n|(1n<<BigInt(indices.get(id)!)),0n);
      const key = `${mask}|${search.queueIndex}|${search.state.trays.map(t=>`${t.color}:${t.count}`).join(',')}|${[...search.state.buffer].sort().join(',')}`;
      if (failed.has(key)) return null;
      const active = new Set(search.state.trays.map(t=>t.color));
      const candidates = this.level.solution.filter(id=>search.isAvailable(id))
        .sort((a,b)=>Number(active.has(this.level.screws.find(s=>s.id===b)!.color))-Number(active.has(this.level.screws.find(s=>s.id===a)!.color)));
      // Same-colored screws on one plate have equivalent rule outcomes.
      const equivalent = new Set<string>();
      for (const id of candidates) {
        const screw=this.level.screws.find(s=>s.id===id)!;
        const group=`${screw.plateId}:${screw.color}`;
        if (equivalent.has(group)) continue;
        equivalent.add(group);
        search.selectScrew(id);
        const rest=solve();
        search.undo();
        if (rest) return [id,...rest];
        if (bounded) return null;
      }
      failed.add(key);
      return null;
    };
    const path=solve();
    return path?.length
      ? {screwId:path[0],message:'Try the glowing screw. A clear path remains from here.'}
      : {screwId:null,message:bounded ? 'Try Undo to revisit an earlier choice, then ask for a hint.' : 'This shelf cannot be cleared from here. Use Undo to try another order.'};
  }
  selectScrew(id: string): boolean {
    this.clearedTrays = [];
    if (!this.isAvailable(id)) return false;
    this.history.push({state:this.clone(),queueIndex:this.queueIndex});
    const screw = this.level.screws.find(s=>s.id===id)!;
    this.state.removedIds.add(id);
    this.state.moves++;
    if (this.level.screws.filter(s=>s.plateId===screw.plateId).every(s=>this.state.removedIds.has(s.id)))
      this.state.removedPlateIds.add(screw.plateId);
    const tray = this.state.trays.find(t=>t.color===screw.color && t.count<3);
    if (tray) tray.count++; else this.state.buffer.push(screw.color);
    this.settle();
    if (this.state.buffer.length > BUFFER_CAPACITY) this.state.status='lost';
    else if (this.state.removedIds.size===this.level.screws.length && this.state.buffer.length===0 && this.state.trays.length===0) this.state.status='won';
    return true;
  }
  private settle() {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i=0;i<this.state.trays.length;i++) {
        const tray=this.state.trays[i];
        while (tray.count<3) {
          const buffered=this.state.buffer.indexOf(tray.color);
          if (buffered<0) break;
          this.state.buffer.splice(buffered,1); tray.count++; changed=true;
        }
        if (tray.count===3) {
          this.clearedTrays.push({slot:i, color:tray.color});
          this.state.completedTrays++;
          if (this.queueIndex<this.level.trayOrder.length) this.state.trays[i]={color:this.level.trayOrder[this.queueIndex++],count:0};
          else { this.state.trays.splice(i,1); i--; }
          changed=true;
        }
      }
    }
  }
  private clone(): GameState {
    return {...this.state, removedIds:new Set(this.state.removedIds), removedPlateIds:new Set(this.state.removedPlateIds),
      trays:this.state.trays.map(t=>({...t})),buffer:[...this.state.buffer]};
  }
  undo(): boolean {
    this.clearedTrays = [];
    const previous=this.history.pop();
    if (!previous) return false;
    this.state=previous.state; this.queueIndex=previous.queueIndex; return true;
  }
  restart() { this.clearedTrays=[]; this.history=[]; this.state=this.initial(); }
}
