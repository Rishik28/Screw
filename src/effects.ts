import { COLORS } from './levels';
import type { TrayClear } from './game';

interface Point { x: number; y: number }

/** Bounded, short-lived DOM effects: no idle renderer, asset downloads, or flashing loop. */
export class GameEffects {
  private layer: HTMLDivElement;
  private bucketLayer: HTMLDivElement;
  private motion = new Set<Animation>();
  private activeShake?: Animation;
  private lastShake = -Infinity;
  private stopShake = () => { this.activeShake?.cancel(); this.activeShake = undefined; };
  private lastFlash = -Infinity;
  private live = new Set<HTMLElement>();
  constructor(private host: HTMLElement, private screen: HTMLElement) {
    this.layer = document.createElement('div');
    this.layer.className = 'arcade-effects';
    this.layer.setAttribute('aria-hidden', 'true');
    host.append(this.layer);
    this.bucketLayer = document.createElement('div');
    this.bucketLayer.className = 'bucket-effects';
    this.bucketLayer.setAttribute('aria-hidden', 'true');
    screen.append(this.bucketLayer);
    screen.addEventListener('pointerdown', this.stopShake, true);
    screen.addEventListener('keydown', this.stopShake, true);
  }
  clear() {
    for (const animation of this.motion) animation.cancel();
    this.motion.clear(); this.stopShake();
    for (const node of this.live) node.remove(); this.live.clear();
  }
  clearBuckets() {
    for (const node of [...this.live]) if (node.classList.contains('tray-completion')) {
      for (const animation of node.getAnimations()) animation.cancel();
      node.remove(); this.live.delete(node);
    }
  }
  shake(strength: number) {
    if (!strength || matchMedia('(prefers-reduced-motion: reduce)').matches || performance.now()-this.lastShake < 70) return;
    this.lastShake = performance.now(); this.stopShake();
    const amount = Math.min(5, strength);
    const animation = this.screen.animate([
      {transform:'translate(0,0)'},
      {transform:`translate(${-amount}px,${amount*.45}px)`,offset:.2},
      {transform:`translate(${amount*.7}px,${-amount*.25}px)`,offset:.45},
      {transform:`translate(${-amount*.3}px,0)`,offset:.7},
      {transform:'translate(0,0)'},
    ], {duration:amount>2?190:120,easing:'ease-out'});
    this.activeShake = animation; this.track(animation);
  }
  impact(point: Point, color: string, strength: number) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ring = this.node('impact-ring', point);
    ring.style.borderColor = color;
    this.animate(ring, [
      {transform:'translate(-50%,-50%) scale(.45)',opacity:.9},
      {transform:'translate(-50%,-50%) scale(1.55)',opacity:0},
    ], 230);
    this.shake(strength);
  }
  captureBuckets() {
    const root = this.screen.getBoundingClientRect();
    return Array.from(this.screen.querySelectorAll<HTMLElement>('.tray-row > .tray')).map(node => {
      const rect = node.getBoundingClientRect();
      return {color:node.dataset.color, count:Number(node.dataset.count||0), x:rect.left-root.left,
        y:rect.top-root.top, width:rect.width, height:rect.height};
    });
  }
  buckets(before: ReturnType<GameEffects['captureBuckets']>, clears: TrayClear[], arcade: boolean) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const current = Array.from(this.screen.querySelectorAll<HTMLElement>('.tray-row > .tray'));
    if (!reduced) for (let i=0; i<current.length; i++) {
      const node=current[i], previous=before[i];
      if (!previous || previous.color!==node.dataset.color) continue;
      const slots=node.querySelectorAll<HTMLElement>('.tray-slot');
      for (let slot=previous.count; slot<Number(node.dataset.count||0); slot++) {
        if (!slots[slot]) continue;
        this.track(slots[slot].animate([
          {transform:'scale(.55)'}, {transform:'scale(1.2)',offset:.6}, {transform:'scale(1)'},
        ],{duration:190,easing:'ease-out'}));
      }
    }
    for (let i=0; i<Math.min(4,clears.length); i++) {
      const clear=clears[i], origin=before[clear.slot]||before[0];
      if (!origin) continue;
      const ghost=document.createElement('div');
      ghost.className='tray-completion'; ghost.dataset.color=clear.color;
      ghost.style.cssText=`left:${origin.x}px;top:${origin.y}px;width:${origin.width}px;height:${origin.height}px;--tray-color:${COLORS[clear.color]}`;
      ghost.innerHTML=`<div class="tray-label">${clear.color}</div><div class="tray-slots">${Array.from({length:3},()=>`<span class="tray-slot is-filled" style="--screw-color:${COLORS[clear.color]}">✚</span>`).join('')}</div><span class="bucket-check">✓</span>`;
      this.bucketLayer.append(ghost); this.live.add(ghost);
      const animation=ghost.animate(reduced ? [{opacity:1},{opacity:1,offset:.7},{opacity:0}] : [
        {transform:'translateY(0) scale(1)',opacity:1},
        {transform:'translateY(2px) scale(1.08,.87)',offset:.2,opacity:1},
        {transform:'translateY(-6px) scale(.97,1.08)',offset:.45,opacity:1},
        {transform:'translateY(-24px) scale(.92) rotate(-3deg)',opacity:0},
      ], {duration:reduced?320:arcade?300:440,delay:reduced?0:i*(arcade?40:65),easing:'ease-out',fill:'both'});
      this.track(animation,()=>{ghost.remove();this.live.delete(ghost);});
      const incoming=current[clear.slot];
      if (!reduced && incoming && !clears.slice(0,i).some(c=>c.slot===clear.slot)) this.track(incoming.animate([
        {transform:'translateY(7px) scale(.88)',opacity:.4},
        {transform:'translateY(-2px) scale(1.03)',offset:.7,opacity:1},
        {transform:'translateY(0) scale(1)',opacity:1},
      ],{duration:arcade?200:280,delay:arcade?90:150,easing:'ease-out'}));
    }
    if (clears.length) this.shake(arcade?4:2.8);
  }
  burst(point: Point, color: string, text: string, big = false, penalty = false) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      const count = big ? 28 : 9;
      for (let i = 0; i < count && this.live.size < 110; i++) {
        const pixel = this.node('pixel-particle', point);
        pixel.style.background = i % 3 ? color : '#f3e6bb';
        const angle = Math.PI * 2 * i / count;
        const speed = (big ? 90 : 45) * (.5 + Math.random());
        this.animate(pixel, [
          {transform:'translate(-50%, -50%)', opacity:1},
          {transform:`translate(calc(-50% + ${Math.cos(angle)*speed}px), calc(-50% + ${Math.sin(angle)*speed+35}px))`, opacity:0},
        ], big ? 650 : 450);
      }
      if (big && !penalty && performance.now() - this.lastFlash > 700) {
        this.lastFlash = performance.now();
        const flash = this.node('arcade-flash', {x:0,y:0});
        flash.style.left = '0'; flash.style.top = '0';
        this.animate(flash, [{opacity:.22}, {opacity:0}], 150);
      }
    }
    // Numeric feedback remains available without travel, particles, or flashes.
    const popup = this.node(`score-popup${big ? ' is-big' : ''}${penalty ? ' is-penalty' : ''}`, point);
    popup.textContent = text;
    this.animate(popup, reduced
      ? [{opacity:1}, {opacity:0}]
      : [{transform:'translate(-50%, -50%)',opacity:1},{transform:'translate(-50%, calc(-50% - 48px))',opacity:0}], reduced ? 550 : 850);
  }
  center(text: string, color = '#f3d16f', penalty = false) {
    this.burst({x:this.host.clientWidth/2,y:this.host.clientHeight*.4}, color, text, true, penalty);
  }
  private node(className: string, point: Point) {
    if (this.live.size >= 120) { const oldest = this.live.values().next().value; if (oldest) { oldest.remove(); this.live.delete(oldest); } }
    const node = document.createElement('span');
    node.className = className;
    node.style.left = `${Math.max(30,Math.min(this.host.clientWidth-30,point.x))}px`;
    node.style.top = `${Math.max(25,Math.min(this.host.clientHeight-35,point.y))}px`;
    this.layer.append(node); this.live.add(node);
    return node;
  }
  private track(animation: Animation, done?: () => void) {
    this.motion.add(animation);
    const finish = () => { this.motion.delete(animation); if (this.activeShake===animation) this.activeShake=undefined; done?.(); };
    animation.onfinish=finish; animation.oncancel=finish;
  }
  private animate(node: HTMLElement, frames: Keyframe[], duration: number) {
    const animation = node.animate(frames, {duration, easing:'cubic-bezier(.12,.55,.3,1)', fill:'forwards'});
    this.track(animation, () => { node.remove(); this.live.delete(node); });
  }
}
