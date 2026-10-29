import { Game } from './game';
import { levels, COLORS, type Color, type Level } from './levels';

export const SAVE_KEY = 'screw-garden-workshop-v1';
export interface Upgrade {
  id: string; branch: 'Workbench'|'Tools'|'Mastery'; name: string; description: string;
  cost: number; xp: number; requires?: string; excludes?: string;
}
export const UPGRADES: Upgrade[] = [
  {id:'bucket2',branch:'Workbench',name:'Second bucket',description:'Two active buckets.',cost:30,xp:40},
  {id:'bucket3',branch:'Workbench',name:'Third bucket',description:'Three active buckets.',cost:150,xp:500,requires:'bucket2'},
  {id:'bucket4',branch:'Workbench',name:'Fourth bucket',description:'Four active buckets (maximum).',cost:400,xp:1800,requires:'bucket3'},
  {id:'shelf4',branch:'Workbench',name:'Shelf extension',description:'Four shelf spaces instead of three.',cost:25,xp:30},
  {id:'shelf5',branch:'Workbench',name:'Deep shelf',description:'Five shelf spaces.',cost:110,xp:350,requires:'shelf4'},
  {id:'shelf6',branch:'Workbench',name:'Storage specialist',description:'Six shelf spaces. Choose this or Fast charger.',cost:240,xp:1000,requires:'shelf5',excludes:'charger'},
  {id:'magnet',branch:'Tools',name:'Auto-fill magnet',description:'Collect up to three exposed screws matching one bucket. Starts charged; three bucket clears recharge it.',cost:45,xp:90},
  {id:'charger',branch:'Tools',name:'Fast charger',description:'Recharge in two bucket clears. Choose this or Storage specialist.',cost:180,xp:1000,requires:'magnet',excludes:'shelf6'},
  {id:'reservoir',branch:'Tools',name:'Double cell',description:'Store two magnet charges; start with both.',cost:200,xp:900,requires:'magnet'},
  {id:'undo',branch:'Tools',name:'Spare Undo',description:'Three Undo charges per attempt instead of one.',cost:65,xp:180},
  {id:'survey',branch:'Tools',name:'Survey kit',description:'Three layer hints per attempt instead of one.',cost:65,xp:180},
  {id:'time1',branch:'Mastery',name:'Steady hands',description:'Add 30 seconds to the run limit.',cost:40,xp:70},
  {id:'time2',branch:'Mastery',name:'Patient craft',description:'Add another 45 seconds to the run limit.',cost:150,xp:600,requires:'time1'},
  {id:'xp1',branch:'Mastery',name:'Apprenticeship',description:'Earn 15% more XP from screws and discoveries.',cost:35,xp:50},
  {id:'scholar',branch:'Mastery',name:'Research specialist',description:'Earn 35% more base XP. Choose this or Salvage specialist.',cost:200,xp:1200,requires:'xp1',excludes:'salvager'},
  {id:'salvager',branch:'Mastery',name:'Salvage specialist',description:'Earn 25% more base scrap. Choose this or Research specialist.',cost:200,xp:1200,requires:'xp1',excludes:'scholar'},
];
export interface Profile { version: 1; xp: number; scrap: number; upgrades: string[]; restoration: number; completed: number; deck: number[]; lastModel: number; }
export function freshProfile(): Profile { return {version:1,xp:0,scrap:0,upgrades:[],restoration:0,completed:0,deck:[],lastModel:0}; }
function integer(value: unknown, max=1_000_000_000) { return typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(0,Math.floor(value))):0; }
export function loadProfile(raw: string|null): Profile {
  try {
    const data=JSON.parse(raw||'null');if(data?.version!==1)return freshProfile();
    const profile=freshProfile();profile.xp=integer(data.xp);profile.scrap=integer(data.scrap);
    // Rebuild in tree order so edited/corrupt saves cannot introduce contradictory branches.
    for(const u of UPGRADES)if(Array.isArray(data.upgrades)&&data.upgrades.includes(u.id)&&(!u.requires||profile.upgrades.includes(u.requires))&&(!u.excludes||!profile.upgrades.includes(u.excludes)))profile.upgrades.push(u.id);
    profile.restoration=integer(data.restoration,3);profile.completed=integer(data.completed);profile.lastModel=integer(data.lastModel,levels.length);
    profile.deck=Array.isArray(data.deck)?[...new Set<number>(data.deck.filter((n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=1&&n<=levels.length))]:[];
    return profile;
  } catch { return freshProfile(); }
}
export function purchaseReason(profile: Profile, upgrade: Upgrade): string|null {
  if(profile.upgrades.includes(upgrade.id))return 'Owned';
  if(upgrade.excludes&&profile.upgrades.includes(upgrade.excludes))return 'Other branch chosen';
  if(upgrade.requires&&!profile.upgrades.includes(upgrade.requires))return `Requires ${UPGRADES.find(u=>u.id===upgrade.requires)!.name}`;
  if(profile.xp<upgrade.xp)return `Requires ${upgrade.xp} total XP`;
  if(profile.scrap<upgrade.cost)return `Needs ${upgrade.cost} scrap`;
  return null;
}
export function purchase(profile: Profile,id:string): boolean {
  const u=UPGRADES.find(u=>u.id===id);if(!u||purchaseReason(profile,u))return false;
  profile.scrap-=u.cost;profile.upgrades.push(id);return true;
}
export const RESTORATION_COSTS=[80,160,300];
export function restore(profile: Profile): boolean {
  const cost=RESTORATION_COSTS[profile.restoration];if(cost===undefined||profile.scrap<cost)return false;
  profile.scrap-=cost;profile.restoration++;return true;
}
export function shuffled<T>(items:readonly T[],random= Math.random):T[] {
  const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
export function nextModel(profile: Profile,random=Math.random):Level {
  if(!profile.deck.length){
    profile.deck=shuffled(levels.map(l=>l.id),random);
    if(profile.deck[0]===profile.lastModel)[profile.deck[0],profile.deck[1]]=[profile.deck[1],profile.deck[0]];
  }
  const id=profile.deck.shift()!;profile.lastModel=id;return levels.find(l=>l.id===id)!;
}
/** Vary the physical topological dismantling order; never invent inaccessible attachments.
 * Triples along this witness guarantee a solution even with one bucket/three shelf slots.
 * Other exposed future colors are deliberate decoys, so greedy taps can still lose. */
export function workshopLevel(base:Level,random=Math.random):Level {
  const level=structuredClone(base),remaining=new Set(level.screws.map(s=>s.id)),removedParts=new Set<string>();
  const solution:string[]=[];
  while(remaining.size){
    const candidates=level.screws.filter(s=>remaining.has(s.id)&&s.blockedBy.every(p=>removedParts.has(p)));
    if(!candidates.length)throw Error('Cyclic workshop assembly');
    const screw=candidates[Math.floor(random()*candidates.length)];remaining.delete(screw.id);solution.push(screw.id);
    if(level.screws.filter(s=>s.plateId===screw.plateId).every(s=>!remaining.has(s.id)))removedParts.add(screw.plateId);
  }
  const palette=shuffled(Object.keys(COLORS) as Color[],random);
  level.solution=solution;level.trayOrder=[];
  const byId=new Map(level.screws.map(s=>[s.id,s]));
  solution.forEach((id,i)=>{const color=palette[Math.floor(i/3)%palette.length];byId.get(id)!.color=color;if(i%3===0)level.trayOrder.push(color);});
  level.subtitle='One bucket. Three shelf spaces. Plan a path through the layers.';
  return level;
}
export interface Earnings { xp: number; scrap: number }
export interface RunRewards { screws:Earnings; discoveries:Earnings; completion:Earnings; speed:Earnings }
const empty=():Earnings=>({xp:0,scrap:0});
export class WorkshopRun {
  game:Game;
  elapsedMs=0;
  readonly targetMs:number;
  readonly limitMs:number;
  readonly skills:Set<string>;
  readonly rewards:RunRewards={screws:empty(),discoveries:empty(),completion:empty(),speed:empty()};
  ended=false;
  outcome:'complete'|'shelf'|'timeout'|'abandoned'|null=null;
  undoCharges:number;
  hintCharges:number;
  charges:number;
  chargeProgress=0;
  readonly chargeGoal:number;
  readonly maxCharges:number;
  private paid=new Set<string>();
  private baseEarned={screws:{xp:0,scrap:0},discoveries:{xp:0,scrap:0}};
  private discovered=new Set<number>();
  private paidBucketCount=0;
  constructor(readonly profile:Profile,base:Level,random=Math.random,variant?:Level){
    this.skills=new Set(profile.upgrades);
    this.game=new Game(variant?structuredClone(variant):workshopLevel(base,random),{
      trayCount:1+['bucket2','bucket3','bucket4'].filter(id=>this.skills.has(id)).length,
      bufferCapacity:3+['shelf4','shelf5','shelf6'].filter(id=>this.skills.has(id)).length,
    });
    this.targetMs=Math.round((35+base.screws.length*2+base.plates.length*.9)*1000);
    this.limitMs=this.targetMs+75_000+(this.skills.has('time1')?30_000:0)+(this.skills.has('time2')?45_000:0);
    this.undoCharges=this.skills.has('undo')?3:1;this.hintCharges=this.skills.has('survey')?3:1;
    this.maxCharges=this.skills.has('reservoir')?2:1;this.charges=this.skills.has('magnet')?this.maxCharges:0;
    this.chargeGoal=this.skills.has('charger')?2:3;
  }
  get remainingMs(){return Math.max(0,this.limitMs-this.elapsedMs);}
  get totals():Earnings{return Object.values(this.rewards).reduce((sum,r)=>({xp:sum.xp+r.xp,scrap:sum.scrap+r.scrap}),empty());}
  private award(category:keyof RunRewards,xp:number,scrap:number,base=true){
    let reward={xp,scrap};
    if(base&&(category==='screws'||category==='discoveries')){
      const ledger=this.baseEarned[category];ledger.xp+=xp;ledger.scrap+=scrap;
      reward={xp:Math.round(ledger.xp*(this.skills.has('scholar')?1.35:this.skills.has('xp1')?1.15:1))-this.rewards[category].xp,
        scrap:Math.round(ledger.scrap*(this.skills.has('salvager')?1.25:1))-this.rewards[category].scrap};
    }
    this.rewards[category].xp+=reward.xp;this.rewards[category].scrap+=reward.scrap;
    this.profile.xp+=reward.xp;this.profile.scrap+=reward.scrap;
  }
  advance(ms:number){if(this.ended||!Number.isFinite(ms)||ms<=0)return;this.elapsedMs+=Math.min(ms,this.remainingMs);if(!this.remainingMs)this.finish('timeout');}
  select(id:string):{accepted:boolean;fresh:boolean;discovered:number[]}{
    if(this.ended||!this.game.selectScrew(id))return {accepted:false,fresh:false,discovered:[]};
    const fresh=!this.paid.has(id);if(fresh){this.paid.add(id);this.award('screws',5,2);}
    const discovered:number[]=[];
    // Reward the first newly exposed interior component at each authored depth.
    for(const screw of this.game.level.screws){
      const p=this.game.level.plates.find(p=>p.id===screw.plateId)!;
      if(p.interior&&screw.blockedBy.length&&!this.game.state.removedIds.has(screw.id)&&screw.blockedBy.every(id=>this.game.state.removedPlateIds.has(id))&&!this.discovered.has(p.layer)){
        this.discovered.add(p.layer);discovered.push(p.layer);this.award('discoveries',25,10);
      }
    }
    // Only new high-water bucket clears recharge tools, even after Undo/reordering.
    const freshClears=Math.max(0,this.game.state.completedTrays-this.paidBucketCount);
    this.paidBucketCount=Math.max(this.paidBucketCount,this.game.state.completedTrays);
    if(this.skills.has('magnet'))for(let i=0;i<freshClears;i++){
      if(this.charges>=this.maxCharges){this.chargeProgress=0;break;}
      if(++this.chargeProgress>=this.chargeGoal){this.charges++;this.chargeProgress=0;}
    }
    if(this.game.state.status==='lost')this.finish('shelf');
    else if(this.game.state.status==='won')this.finish('complete');
    return {accepted:true,fresh,discovered};
  }
  finish(outcome:NonNullable<WorkshopRun['outcome']>){
    if(this.ended)return;this.ended=true;this.outcome=outcome;
    if(outcome==='complete'){
      const base={xp:this.rewards.screws.xp+this.rewards.discoveries.xp,scrap:this.rewards.screws.scrap+this.rewards.discoveries.scrap};
      this.award('completion',Math.round(base.xp*.3),Math.round(base.scrap*.3),false);
      if(this.elapsedMs<=this.targetMs)this.award('speed',Math.round(base.xp*.2),Math.round(base.scrap*.2),false);
      this.profile.completed++;
    }
  }
  undo(){if(this.ended||!this.undoCharges||!this.game.undo())return false;this.undoCharges--;return true;}
  hint():{partId:string|null;message:string}{
    if(this.ended||!this.hintCharges)return {partId:null,message:'No survey charges left.'};
    const hint=this.game.getHint();if(!hint.screwId)return {partId:null,message:hint.message};
    this.hintCharges--;const part=this.game.level.plates.find(p=>p.id===this.game.level.screws.find(s=>s.id===hint.screwId)!.plateId)!;
    return {partId:part.id,message:`Look for ${part.label||'the exposed panel'}. Inspect its screws and plan your colors.`};
  }
  get autoFillIds():string[]{
    for(const tray of this.game.state.trays){const ids=this.game.level.screws.filter(s=>s.color===tray.color&&this.game.isAvailable(s.id)).map(s=>s.id).slice(0,3-tray.count);if(ids.length)return ids;}
    return [];
  }
  useMagnet():string[]{if(this.ended||!this.charges)return [];const ids=this.autoFillIds;if(ids.length)this.charges--;return ids;}
}
