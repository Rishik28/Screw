import { Game } from './game';
import { shortLevels as levels, type Color, type Level } from './levels';

export const START_TIME = 45_000;
export const RUN_LIMIT = 90_000;
export const COMBO_WINDOW = 2_000;
const TIME_CAP = 60_000;
const palette: Color[] = ['coral', 'blue', 'gold', 'mint', 'violet', 'orange'];

/** Keep every structural part, but use fewer fasteners per part in speed rounds. */
export const arcadeLevels: Level[] = levels.map((level, index) => {
  const target = level.plates.length <= 8 ? 18 : 24;
  const selected = new Set<string>();
  for (let slot = 0; selected.size < target; slot++) {
    let added = false;
    for (const part of level.plates) {
      const screw = level.screws.filter(s => s.plateId === part.id)[slot];
      if (screw && selected.size < target) { selected.add(screw.id); added = true; }
    }
    if (!added) break;
  }
  const solution = level.solution.filter(id => selected.has(id));
  const colors = new Map(solution.map((id, i) => [id, palette[(Math.floor(i / 3) + index) % palette.length]]));
  return {
    ...level, subtitle: 'Keep moving. Clear buckets for more time.', solution,
    screws: level.screws.filter(s => selected.has(s.id)).map(s => ({...s, color: colors.get(s.id)!})),
    trayOrder: solution.filter((_, i) => i % 3 === 0).map(id => colors.get(id)!),
  };
});

interface Award { points: number; time: number }
export interface ArcadeHit {
  accepted: boolean; points: number; buckets: number; timeBonus: number;
  overflow: boolean; rewound: number; modelCleared: boolean; multiplier: number;
}

/** Pure scoring/clock layer. The application decides when foreground time advances. */
export class ArcadeSession {
  game: Game;
  score = 0;
  remainingMs = START_TIME;
  elapsedMs = 0;
  streak = 0;
  modelsCleared = 0;
  roundIndex = 0;
  ended = false;
  private comboAge = 0;
  private rotationAllowance = 800;
  private awards: Award[] = [];

  constructor(private campaign: Level[] = arcadeLevels) {
    if (!campaign.length) throw new Error('Arcade needs at least one model');
    this.game = new Game(campaign[0]);
  }
  get multiplier() { return Math.min(5, 1 + Math.floor(Math.max(0, this.streak - 1) / 4)); }
  get comboFraction() { return this.streak ? Math.max(0, 1 - this.comboAge / COMBO_WINDOW) : 0; }
  get canUndo() { return !this.ended && this.game.state.status === 'playing' && this.awards.length > 0; }

  advance(milliseconds: number, exploring = false) {
    if (this.ended || milliseconds <= 0 || !Number.isFinite(milliseconds)) return;
    this.elapsedMs += milliseconds;
    this.remainingMs = Math.max(0, Math.min(this.remainingMs - milliseconds, RUN_LIMIT - this.elapsedMs));
    const grace = exploring ? Math.min(this.rotationAllowance, milliseconds) : 0;
    this.rotationAllowance -= grace;
    this.comboAge += milliseconds - grace;
    if (this.comboAge > COMBO_WINDOW) this.miss();
    if (this.remainingMs === 0) this.ended = true;
  }
  miss() { this.streak = 0; this.comboAge = 0; this.rotationAllowance = 0; }
  penalize(milliseconds: number) {
    this.remainingMs = Math.max(0, this.remainingMs - milliseconds);
    if (!this.remainingMs) this.ended = true;
  }
  select(id: string): ArcadeHit {
    const result: ArcadeHit = {accepted:false, points:0, buckets:0, timeBonus:0, overflow:false, rewound:0, modelCleared:false, multiplier:this.multiplier};
    if (this.ended) return result;
    if (!this.game.isAvailable(id)) { this.miss(); return result; }
    const before = this.game.state.completedTrays;
    this.game.selectScrew(id);
    if (this.game.state.status === 'lost') {
      // The offending move earns nothing. Rewind earlier awards too, so recovery
      // never destroys colors, strands a puzzle, or permits replay-score farming.
      this.game.undo();
      while (this.game.state.buffer.length > 2 && this.awards.length) {
        this.game.undo(); this.revokeAward(); result.rewound++;
      }
      this.miss(); this.penalize(5_000);
      result.overflow = true;
      return result;
    }
    this.streak++;
    this.comboAge = 0; this.rotationAllowance = 800;
    result.accepted = true;
    result.multiplier = this.multiplier;
    result.buckets = this.game.state.completedTrays - before;
    result.modelCleared = this.game.state.status === 'won';
    result.points = (100 + result.buckets * 300 + (result.modelCleared ? 500 : 0)) * result.multiplier;
    const previousTime = this.remainingMs;
    this.remainingMs = Math.min(TIME_CAP, RUN_LIMIT - this.elapsedMs, this.remainingMs + result.buckets * 3_000);
    result.timeBonus = this.remainingMs - previousTime;
    this.score += result.points;
    this.awards.push({points:result.points, time:result.timeBonus});
    if (result.modelCleared) this.modelsCleared++;
    return result;
  }
  private revokeAward() {
    const award = this.awards.pop();
    if (!award) return;
    this.score = Math.max(0, this.score - award.points);
    this.remainingMs = Math.max(0, this.remainingMs - award.time);
  }
  undo() {
    if (!this.canUndo || !this.game.undo()) return false;
    this.revokeAward(); this.miss(); this.penalize(2_000);
    return true;
  }
  nextRound() {
    if (this.ended || this.game.state.status !== 'won') return false;
    this.roundIndex++;
    this.game = new Game(this.campaign[this.roundIndex % this.campaign.length]);
    this.awards = [];
    return true;
  }
}
