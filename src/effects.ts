interface Point { x: number; y: number }

/** Bounded, short-lived DOM effects: no idle renderer, asset downloads, or flashing loop. */
export class ArcadeEffects {
  private layer: HTMLDivElement;
  private lastFlash = -Infinity;
  private live = new Set<HTMLElement>();
  constructor(private host: HTMLElement) {
    this.layer = document.createElement('div');
    this.layer.className = 'arcade-effects';
    this.layer.setAttribute('aria-hidden', 'true');
    host.append(this.layer);
  }
  clear() { for (const node of this.live) node.remove(); this.live.clear(); }
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
  private animate(node: HTMLElement, frames: Keyframe[], duration: number) {
    const animation = node.animate(frames, {duration, easing:'cubic-bezier(.12,.55,.3,1)', fill:'forwards'});
    animation.onfinish = () => { node.remove(); this.live.delete(node); };
    animation.oncancel = () => { node.remove(); this.live.delete(node); };
  }
}
