import './styles.css';
import { Game, COLORS, BUFFER_CAPACITY } from './game';
import { levels } from './levels';
import { BoardRenderer } from './renderer';
import { ArcadeSession } from './arcade';
import { ArcadeEffects } from './effects';

declare global { interface Window { __game:Game; __board:BoardRenderer; __arcade:ArcadeSession|null; } }
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<main class="app-shell">
  <header class="topbar">
    <div class="brand">screw garden</div>
    <div class="header-actions">
      <button class="level-pill" id="level-pill" aria-label="Choose puzzle" aria-haspopup="dialog"></button>
      <button class="icon-button" id="help" aria-label="How to play">?</button>
    </div>
  </header>
  <nav class="mode-tabs" aria-label="Game mode">
    <button class="mode-tab" id="mode-classic" aria-pressed="true">classic</button>
    <button class="mode-tab" id="mode-arcade" aria-pressed="false">arcade · score attack</button>
  </nav>
  <section class="game-layout" aria-label="Screw puzzle">
    <section class="arcade-hud" id="arcade-hud" aria-label="Arcade score and timer" hidden>
      <div><span class="hud-label">score</span><output id="arcade-score" aria-live="off">000000</output></div>
      <div><span class="hud-label">time</span><output id="arcade-time" role="timer" aria-live="off">45.0</output></div>
      <div><span class="hud-label">combo</span><output id="arcade-combo" aria-live="off">×1</output></div>
      <div class="combo-track" aria-label="Combo time remaining" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="combo-fill"></div></div>
    </section>
    <div class="tray-row" aria-label="Color sorting trays"></div>
    <div class="game-header"><h1 id="level-name"></h1><span class="gesture-note">drag · pinch</span></div>
    <div class="progress-track" role="progressbar" aria-label="Screws removed" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill"></div></div>
    <div class="board-wrap" tabindex="0" aria-label="3D puzzle board. Drag or use arrow keys to rotate. Pinch to zoom the model. Home resets the view and zoom.">
      <nav class="rotation-controls" aria-label="Rotate model">
        <button class="rotate-button" id="rotate-left" aria-label="Rotate model left">↶</button>
        <button class="rotate-button" id="reset-view" aria-label="Reset model view">⌂</button>
        <button class="rotate-button" id="rotate-right" aria-label="Rotate model right">↷</button>
      </nav>
    </div>
    <div class="buffer-row" aria-label="Temporary shelf"><span class="sr-only">Shelf</span><div class="buffer-slots"></div></div>
    <p class="status-line" role="status" aria-live="polite"></p>
    <nav class="toolbar" aria-label="Game controls">
      <button class="tool-button" id="undo"><span class="tool-icon" aria-hidden="true">↶</span>undo</button>
      <button class="tool-button" id="hint"><span class="tool-icon" aria-hidden="true">☼</span>hint</button>
      <button class="tool-button" id="restart"><span class="tool-icon" aria-hidden="true">↻</span>restart</button>
    </nav>
  </section>
</main>
<div class="modal-backdrop" hidden>
  <section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
    <span class="modal-symbol" aria-hidden="true"></span><h2 id="modal-title"></h2><div class="modal-copy"></div>
    <button class="primary-button"></button><button class="secondary-button"></button>
  </section>
</div>`;
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
function readNumber(key: string, fallback = 0) {
  try { const value = Number(localStorage.getItem(key)); return Number.isFinite(value) && value >= 0 ? value : fallback; } catch { return fallback; }
}
let classicIndex = Math.min(levels.length - 1, Math.floor(readNumber('screw-garden-level')));
let classicGame = new Game(levels[classicIndex]);
let game = classicGame;
let arcade: ArcadeSession | null = null;
let best = readNumber('screw-garden-arcade-best');
let board: BoardRenderer | undefined;
let previousFocus: HTMLElement | null = null;
let clock: ReturnType<typeof setInterval> | undefined;
let lastTick = performance.now();
let transition: ReturnType<typeof setTimeout> | undefined;
let summaryShown = false;
let needsResume = false;
try {
  board = new BoardRenderer($('.board-wrap'), select, () => {
    if (arcade && !arcade.ended && transition === undefined && $('.modal-backdrop').hidden) { arcade.miss(); update('Miss — combo reset.'); }
  });
  window.__board = board;
} catch {
  $('.board-wrap').innerHTML = '<p class="render-error">Your browser could not start 3D graphics. Try enabling hardware acceleration or opening this page in a current version of Safari, Chrome, or Firefox.</p>';
}
const effects = new ArcadeEffects($('.board-wrap'));
$('#mode-arcade').toggleAttribute('disabled', !board);

function bindGame() {
  window.__game = game; window.__arcade = arcade;
  board?.setArcade(!!arcade); board?.load(game);
  $('#arcade-hud').hidden = !arcade;
  $('#mode-classic').setAttribute('aria-pressed', String(!arcade));
  $('#mode-arcade').setAttribute('aria-pressed', String(!!arcade));
  $('.app-shell').classList.toggle('is-arcade', !!arcade);
  $('#undo').innerHTML = `<span class="tool-icon" aria-hidden="true">↶</span>${arcade ? 'undo −2s' : 'undo'}`;
  $('#hint').innerHTML = `<span class="tool-icon" aria-hidden="true">☼</span>${arcade ? 'hint −2s' : 'hint'}`;
  update(arcade ? '45 seconds. Buckets +3s. Keep the combo alive.' : game.level.subtitle);
}
function start(index: number) {
  classicIndex = index; classicGame = new Game(levels[index]); game = classicGame;
  try { localStorage.setItem('screw-garden-level', String(index)); } catch {}
  bindGame();
}
function stopClock() { if (clock !== undefined) clearInterval(clock); clock = undefined; }
function clearTransition() { if (transition !== undefined) clearTimeout(transition); transition = undefined; }
function saveBest() {
  if (!arcade) return;
  best = Math.max(best, arcade.score);
  try { localStorage.setItem('screw-garden-arcade-best', String(best)); } catch {}
}
function startArcade() {
  saveBest(); stopClock(); clearTransition(); effects.clear();
  arcade = new ArcadeSession(); game = arcade.game; summaryShown = false; needsResume = false;
  bindGame(); lastTick = performance.now();
  clock = setInterval(() => {
    const now = performance.now(), delta = now - lastTick; lastTick = now;
    if (!arcade || arcade.ended || document.hidden || !$('.modal-backdrop').hidden) return;
    arcade.advance(delta, board?.isExploring() ?? false); refreshArcade();
    if (arcade.ended) finishArcade();
  }, 100);
}
function backToClassic() {
  saveBest(); stopClock(); clearTransition(); effects.clear(); arcade = null; needsResume = false;
  game = classicGame; bindGame();
}
function refreshArcade() {
  if (!arcade) return;
  const text = (selector: string, value: string) => { const node = $(selector); if (node.textContent !== value) node.textContent = value; };
  text('#arcade-score', String(arcade.score).padStart(6, '0'));
  text('#arcade-time', (arcade.remainingMs / 1000).toFixed(1));
  $('#arcade-time').classList.toggle('is-low', arcade.remainingMs <= 10_000);
  text('#arcade-combo', `×${arcade.multiplier}`);
  $('.combo-fill').style.width = `${arcade.comboFraction * 100}%`;
  $('.combo-track').setAttribute('aria-valuenow', String(Math.round(arcade.comboFraction * 100)));
}
function select(id: string) {
  if (!$('.modal-backdrop').hidden || transition !== undefined) return;
  if (!arcade) {
    if (game.selectScrew(id)) { update('A little closer. Keep an eye on your shelf.'); if (game.state.status !== 'playing') showEnd(game.state.status === 'won'); }
    return;
  }
  if (arcade.ended) return;
  const point = board?.screenPoint(id) ?? {x:120, y:120};
  const screw = game.level.screws.find(s => s.id === id);
  if (!screw) return;
  const color = COLORS[screw.color];
  const oldMultiplier = arcade.multiplier;
  const hit = arcade.select(id);
  if (hit.overflow) {
    effects.center('SHELF FULL −5s', '#ee8c78', true);
    update(`Shelf full: −5s. Rewound ${hit.rewound} earlier screws to free space.`);
  } else if (hit.accepted) {
    const bonus = hit.timeBonus ? `  +${(hit.timeBonus / 1000).toFixed(0)}s` : '';
    effects.burst(point, color, `+${hit.points}${bonus}`, hit.buckets > 0);
    if (hit.multiplier > oldMultiplier) effects.center(`×${hit.multiplier} COMBO`);
    update(hit.buckets ? `Bucket cleared! +${hit.points} points${bonus}.` : `+${hit.points} · ${arcade.streak} in a row`);
    if (hit.modelCleared) {
      effects.center('MODEL CLEAR!');
      const session = arcade;
      transition = setTimeout(() => {
        transition = undefined;
        if (arcade !== session || session.ended || !session.nextRound()) return;
        game = session.game; bindGame(); update('Next model. Keep the chain going!');
      }, 320);
      $('#undo').toggleAttribute('disabled', true);
    }
  } else update('Miss — combo reset.');
  if (arcade.ended) finishArcade();
}
function update(message?: string) {
  const state = game.state;
  $('#level-name').textContent = state.level.name;
  $('#level-pill').textContent = arcade ? `RUN ${arcade.modelsCleared + 1}` : `${String(classicIndex + 1).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')}`;
  $('#level-pill').setAttribute('aria-label', arcade ? 'Arcade models advance automatically' : `Choose puzzle. Current puzzle ${classicIndex + 1} of ${levels.length}`);
  $('#level-pill').toggleAttribute('disabled', !!arcade);
  const progress = Math.round(state.removedIds.size / state.level.screws.length * 100);
  $('.progress-fill').style.width = `${progress}%`; $('.progress-track').setAttribute('aria-valuenow', String(progress));
  $('.tray-row').innerHTML = state.trays.map(t => `<div class="tray" style="--tray-color:${COLORS[t.color]}" aria-label="${t.color} tray, ${t.count} of 3"><div class="tray-label">${t.color}</div><div class="tray-slots">${Array.from({length:3}, (_, i) => `<span class="tray-slot ${i < t.count ? 'is-filled' : ''}" style="--screw-color:${COLORS[t.color]}">${i < t.count ? '✚' : ''}</span>`).join('')}</div></div>`).join('') || '<div class="tray"><div class="tray-label">All colors collected ✓</div></div>';
  $('.buffer-slots').innerHTML = Array.from({length:Math.max(BUFFER_CAPACITY, state.buffer.length)}, (_, i) => `<span class="buffer-slot ${state.buffer[i] ? 'is-filled' : ''}" style="--screw-color:${state.buffer[i] ? COLORS[state.buffer[i]] : 'transparent'}" aria-label="${state.buffer[i] || 'Empty shelf slot'}">${state.buffer[i] ? '✚' : ''}</span>`).join('');
  $('#undo').toggleAttribute('disabled', arcade ? !arcade.canUndo || transition !== undefined : !game.canUndo);
  $('#hint').toggleAttribute('disabled', state.status !== 'playing' || !!arcade?.ended);
  if (message) $('.status-line').textContent = message;
  board?.update(); refreshArcade();
}
function closeModal() {
  $('.modal-backdrop').hidden = true; $('.app-shell').inert = false; lastTick = performance.now(); previousFocus?.focus();
}
function modal(symbol: string, title: string, copy: string, primary: string, action: () => void, secondary = 'Keep playing', secondaryAction = closeModal) {
  previousFocus = document.activeElement as HTMLElement;
  $('.modal-symbol').textContent = symbol; $('#modal-title').textContent = title; $('.modal-copy').innerHTML = copy;
  const p = $<HTMLButtonElement>('.primary-button'); p.textContent = primary; p.onclick = () => { closeModal(); action(); };
  const s = $<HTMLButtonElement>('.secondary-button'); s.textContent = secondary; s.onclick = secondaryAction;
  $('.modal-backdrop').hidden = false; $('.app-shell').inert = true; p.focus();
}
function finishArcade() {
  if (!arcade || summaryShown) return;
  summaryShown = true; stopClock(); clearTransition(); saveBest(); refreshArcade();
  modal('✦', 'Time’s up', `<p class="run-score">${arcade.score.toLocaleString()} points</p><p>${arcade.modelsCleared} models cleared<br>Best: ${best.toLocaleString()}</p>`, 'Play again', startArcade, 'Back to Classic', () => { closeModal(); backToClassic(); });
}
function showEnd(won: boolean) {
  if (won) {
    const last = classicIndex === levels.length - 1;
    modal('✿', last ? 'A garden well tended.' : 'Beautifully undone.', `<p>${last ? 'You completed all eight puzzles. Every color has found its home.' : 'Every screw has found its home.'}<br>${game.state.moves} screws sorted · ${game.state.completedTrays} trays cleared</p>`, last ? 'Play from the beginning' : 'Next puzzle', () => start(last ? 0 : classicIndex + 1), 'Replay this puzzle', () => { closeModal(); start(classicIndex); });
  } else modal('☁', 'A little too crowded.', '<p>Your five shelf spaces are full. Undo a move to make room, or start fresh. There’s always another way.</p>', 'Undo last screw', () => { game.undo(); update('Room to try another color.'); }, 'Restart puzzle', () => { closeModal(); start(classicIndex); });
}
function showCollection() {
  if (arcade) return;
  let selected = classicIndex;
  modal('✣', 'The collection', `<p>Choose a model. Every puzzle is free to replay.</p><div class="puzzle-grid">${levels.map((level, index) => `<button class="puzzle-choice" data-level-index="${index}" aria-pressed="${index === selected}"><span class="puzzle-choice-name">${index + 1}. ${level.name}</span><span class="puzzle-choice-detail">${level.screws.length} screws · ${level.plates.length} parts</span></button>`).join('')}</div>`, 'Replay this puzzle', () => start(selected));
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.puzzle-choice'));
  for (const button of buttons) button.onclick = () => {
    selected = Number(button.dataset.levelIndex);
    for (const choice of buttons) choice.setAttribute('aria-pressed', String(choice === button));
    $('.primary-button').textContent = selected === classicIndex ? 'Replay this puzzle' : 'Play this puzzle';
  };
}
$('#level-pill').onclick = showCollection;
$('#mode-arcade').onclick = () => { if (!arcade) startArcade(); };
$('#mode-classic').onclick = () => { if (arcade) backToClassic(); };
$('#undo').onclick = () => {
  if (transition !== undefined) return;
  if (arcade) { if (arcade.undo()) { effects.center('UNDO −2s', '#e6c47a', true); update('Move and score rewound. −2s.'); } if (arcade.ended) finishArcade(); }
  else if (game.undo()) update('One step back. A fresh perspective.');
};
$('#restart').onclick = () => { if (arcade) startArcade(); else { game.restart(); update('A fresh start. Take your time.'); } };
$('#hint').onclick = () => {
  if (arcade) { arcade.miss(); arcade.penalize(2_000); if (arcade.ended) { finishArcade(); return; } }
  const hint = game.getHint(); if (hint.screwId) board?.hint(hint.screwId);
  update(hint.message + (arcade ? ' Hint −2s.' : hint.screwId ? ' Rotate the object to find it.' : ''));
};
$('#help').onclick = () => arcade
  ? modal('✦', 'Arcade · score attack', '<p>45 seconds to start. Clear a bucket for +3 seconds. Runs last up to 90 active seconds.</p><ol class="help-list"><li>Remove screws within 2 seconds to build a multiplier, up to ×5.</li><li>Turning briefly protects your combo. Misses reset it.</li><li>Shelf overflow costs 5 seconds and rewinds moves to free space.</li><li>Undo and Hint each cost 2 seconds. Undo also reverses the score and time bonus from that move.</li></ol><p>The clock is paused while this panel is open.</p>', 'Continue run', () => {})
  : modal('✣', 'A little room to unwind', '<ol class="help-list"><li>Drag to explore. Pinch to zoom. Tap an exposed screw to unscrew it.</li><li>Match three of the same color to clear a tray.</li><li>Other colors wait on your five-space shelf.</li><li>Remove every screw from a part to reveal the assembly beneath.</li></ol><p>Classic has no timer. Hints and Undo are free.</p>', 'Let’s play', () => {});
document.addEventListener('keydown', event => {
  if ($('.modal-backdrop').hidden) return;
  if (event.key === 'Escape' && game.state.status === 'playing' && !arcade?.ended) { closeModal(); return; }
  if (event.key === 'Tab') {
    const buttons = Array.from($('.modal').querySelectorAll<HTMLButtonElement>('button'));
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)!.focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
  }
});
document.addEventListener('visibilitychange', () => {
  lastTick = performance.now();
  if (!arcade || arcade.ended) return;
  if (document.hidden) needsResume = true;
  else if (needsResume) {
    needsResume = false;
    if ($('.modal-backdrop').hidden) modal('Ⅱ', 'Run paused', '<p>Your clock stopped while the game was in the background.</p>', 'Continue run', () => {});
  }
});
// Touch gestures can suppress the browser's subsequent compatibility click.
// Act on a real button tap at pointer-up, and retain click for keyboard/AT only.
function viewControl(selector: string, action: () => void) {
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (!button) return;
  let origin: {id:number; x:number; y:number} | null = null;
  button.addEventListener('pointerdown', event => {
    if (event.button === 0) origin = {id:event.pointerId, x:event.clientX, y:event.clientY};
  });
  button.addEventListener('pointercancel', () => { origin = null; });
  button.addEventListener('pointerup', event => {
    const tap = origin; origin = null;
    if (tap && tap.id === event.pointerId && Math.hypot(event.clientX-tap.x,event.clientY-tap.y) <= 10) {
      event.stopPropagation(); action();
    }
  });
  button.addEventListener('click', event => { if (event.detail === 0) action(); });
}
viewControl('#rotate-left', () => board?.rotate(-1));
viewControl('#rotate-right', () => board?.rotate(1));
viewControl('#reset-view', () => board?.resetView());
start(classicIndex);
