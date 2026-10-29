import './styles.css';
import { Game, COLORS } from './game';
import { levels } from './levels';
import { BoardRenderer } from './renderer';
import { ArcadeSession } from './arcade';
import { GameEffects } from './effects';
import { WorkshopRun, SAVE_KEY, UPGRADES, RESTORATION_COSTS, loadProfile, nextModel, purchase, purchaseReason, restore } from './workshop';

declare global { interface Window { __game:Game; __board:BoardRenderer; __arcade:ArcadeSession|null; __workshop:WorkshopRun|null; } }
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
    <button class="mode-tab" id="mode-workshop" aria-pressed="false">workshop</button>
    <button class="mode-tab" id="mode-classic" aria-pressed="true">classic</button>
    <button class="mode-tab" id="mode-arcade" aria-pressed="false">arcade · score attack</button>
  </nav>
  <section class="game-layout" aria-label="Screw puzzle">
    <section id="workshop-hud" class="workshop-hud" aria-label="Workshop progression" hidden>
      <button id="open-workshop" class="workshop-wallet" aria-label="Open workshop and skill tree"><span id="wallet"></span><span>upgrades ↗</span></button>
      <div class="workshop-runline"><span id="workshop-time" role="timer"></span><span id="workshop-target"></span></div>
    </section>
    <section class="arcade-hud" id="arcade-hud" aria-label="Arcade score and timer" hidden>
      <div><span class="hud-label">score</span><output id="arcade-score" aria-live="off">000000</output></div>
      <div><span class="hud-label">time</span><output id="arcade-time" role="timer" aria-live="off">45.0</output></div>
      <div><span class="hud-label">combo</span><output id="arcade-combo" aria-live="off">×1</output></div>
      <div class="combo-track" aria-label="Combo time remaining" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="combo-fill"></div></div>
    </section>
    <div class="tray-row" aria-label="Color sorting trays"></div>
    <div class="game-header"><h1 id="level-name"></h1><span class="gesture-note">drag · pinch</span></div>
    <div class="progress-track" role="progressbar" aria-label="Screws removed" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill"></div></div>
    <div class="board-wrap" tabindex="0" aria-label="3D puzzle board. Drag or use arrow keys to rotate. Pinch to zoom. Move two fingers together to pan. Home resets the view and zoom.">
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
      <button class="tool-button" id="magnet" hidden><span class="tool-icon" aria-hidden="true">⊂</span>auto-fill</button>
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
let workshop: WorkshopRun | null = null;
let savedWorkshop: WorkshopRun | null = null;
let profile = (() => { try { return loadProfile(localStorage.getItem(SAVE_KEY)); } catch { return loadProfile(null); } })();
let storageFailed = false;
function saveWorkshop() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); storageFailed=false; } catch { storageFailed=true; } }
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
const effects = new GameEffects($('.board-wrap'), $('.app-shell'));
$('#mode-arcade').toggleAttribute('disabled', !board);
$('#mode-workshop').toggleAttribute('disabled', !board);

function bindGame() {
  effects.clearBuckets();
  window.__game = game; window.__arcade = arcade; window.__workshop = workshop;
  board?.setArcade(!!arcade); board?.load(game);
  $('#arcade-hud').hidden = !arcade;
  $('#workshop-hud').hidden = !workshop;
  $('#magnet').hidden = !workshop;
  $('#restart').innerHTML='<span class="tool-icon" aria-hidden="true">↻</span>restart';
  $('#mode-workshop').setAttribute('aria-pressed', String(!!workshop));
  $('.app-shell').classList.toggle('is-workshop', !!workshop);
  $('#mode-classic').setAttribute('aria-pressed', String(!arcade && !workshop));
  $('#mode-arcade').setAttribute('aria-pressed', String(!!arcade));
  $('.app-shell').classList.toggle('is-arcade', !!arcade);
  $('#undo').innerHTML = `<span class="tool-icon" aria-hidden="true">↶</span>${workshop ? `undo ${workshop.undoCharges}` : arcade ? 'undo −2s' : 'undo'}`;
  $('#hint').innerHTML = `<span class="tool-icon" aria-hidden="true">☼</span>${workshop ? `survey ${workshop.hintCharges}` : arcade ? 'hint −2s' : 'hint'}`;
  update(workshop ? 'Earnings are kept even if the shelf fills. Plan before tapping.' : arcade ? '45 seconds. Buckets +3s. Keep the combo alive.' : game.level.subtitle);
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
  workshop = null; arcade = new ArcadeSession(); game = arcade.game; summaryShown = false; needsResume = false;
  bindGame(); lastTick = performance.now();
  clock = setInterval(() => {
    const now = performance.now(), delta = now - lastTick; lastTick = now;
    if (!arcade || arcade.ended || document.hidden || !$('.modal-backdrop').hidden) return;
    arcade.advance(delta, board?.isExploring() ?? false); refreshArcade();
    if (arcade.ended) finishArcade();
  }, 100);
}
function backToClassic() {
  saveBest(); stopClock(); clearTransition(); effects.clear(); arcade = null; workshop = null; needsResume = false;
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
  if (arcade?.ended || workshop?.ended) return;
  const point = board?.screenPoint(id) ?? {x:120, y:120};
  const screw = game.level.screws.find(s => s.id === id);
  if (!screw) return;
  const color = COLORS[screw.color];
  const beforeBuckets=effects.captureBuckets();
  const beforeParts=game.state.removedPlateIds.size;
  if (workshop) {
    const previous={...workshop.rewards.screws};
    const oldCharges=workshop.charges;
    const hit=workshop.select(id);if(!hit.accepted)return;
    const earned=`+${workshop.rewards.screws.xp-previous.xp} XP · +${workshop.rewards.screws.scrap-previous.scrap} scrap`;
    saveWorkshop();
    update(hit.discovered.length ? 'Interior discovered! Discovery rewards banked.' : hit.fresh ? `${earned} banked` : 'Already salvaged this screw.');
    effects.salvage(point,color,hit.fresh ? earned : '',game.state.removedPlateIds.size>beforeParts);
    effects.buckets(beforeBuckets,game.clearedTrays,true);
    if(hit.discovered.length)effects.center('LAYER DISCOVERED · +XP +SCRAP');
    else if(workshop.charges>oldCharges)effects.center('AUTO-FILL READY');
    if(workshop.ended)finishWorkshop();
    return;
  }
  if (!arcade) {
    if (game.selectScrew(id)) {
      update(game.clearedTrays.length ? `${game.clearedTrays.map(t=>t.color).join(' and ')} bucket cleared.` : 'A little closer. Keep an eye on your shelf.');
      effects.impact(point,color,game.clearedTrays.length?0:game.state.removedPlateIds.size>beforeParts?2:1);
      effects.buckets(beforeBuckets,game.clearedTrays,false);
      if (game.state.status !== 'playing') showEnd(game.state.status === 'won');
    }
    return;
  }
  const oldMultiplier = arcade.multiplier;
  const hit = arcade.select(id);
  if (hit.overflow) {
    effects.clear(); effects.shake(5);
    effects.center('SHELF FULL −5s', '#ee8c78', true);
    update(`Shelf full: −5s. Rewound ${hit.rewound} earlier screws to free space.`);
  } else if (hit.accepted) {
    const bonus = hit.timeBonus ? `  +${(hit.timeBonus / 1000).toFixed(0)}s` : '';
    effects.burst(point, color, `+${hit.points}${bonus}`, hit.buckets > 0);
    if (hit.multiplier > oldMultiplier) effects.center(`×${hit.multiplier} COMBO`);
    update(hit.buckets ? `Bucket cleared! +${hit.points} points${bonus}.` : `+${hit.points} · ${arcade.streak} in a row`);
    effects.impact(point,color,hit.buckets?0:game.state.removedPlateIds.size>beforeParts?3:1.5);
    effects.buckets(beforeBuckets,game.clearedTrays,true);
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
  $('.gesture-note').textContent = arcade ? 'drag · pinch' : `${state.level.screws.length-state.removedIds.size} screws left`;
  $('.gesture-note').title = 'Drag to turn, pinch to zoom, move two fingers together to pan';
  $('#level-pill').textContent = workshop ? 'WORKSHOP' : arcade ? `RUN ${arcade.modelsCleared + 1}` : `${String(classicIndex + 1).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')}`;
  $('#level-pill').setAttribute('aria-label', workshop ? 'Open workshop and skill tree' : arcade ? 'Arcade models advance automatically' : `Choose puzzle. Current puzzle ${classicIndex + 1} of ${levels.length}`);
  $('#level-pill').toggleAttribute('disabled', !!arcade);
  const progress = Math.round(state.removedIds.size / state.level.screws.length * 100);
  $('.progress-fill').style.width = `${progress}%`; $('.progress-track').setAttribute('aria-valuenow', String(progress));
  $('.tray-row').innerHTML = state.trays.map(t => `<div class="tray" data-color="${t.color}" data-count="${t.count}" style="--tray-color:${COLORS[t.color]}" aria-label="${t.color} tray, ${t.count} of 3"><div class="tray-label">${t.color}</div><div class="tray-slots">${Array.from({length:3}, (_, i) => `<span class="tray-slot ${i < t.count ? 'is-filled' : ''}" style="--screw-color:${COLORS[t.color]}">${i < t.count ? '✚' : ''}</span>`).join('')}</div></div>`).join('') || '<div class="tray"><div class="tray-label">All colors collected ✓</div></div>';
  $('.buffer-slots').innerHTML = Array.from({length:Math.max(game.bufferCapacity, state.buffer.length)}, (_, i) => `<span class="buffer-slot ${state.buffer[i] ? 'is-filled' : ''}" style="--screw-color:${state.buffer[i] ? COLORS[state.buffer[i]] : 'transparent'}" aria-label="${state.buffer[i] || 'Empty shelf slot'}">${state.buffer[i] ? '✚' : ''}</span>`).join('');
  $('#undo').toggleAttribute('disabled', workshop ? workshop.ended || !workshop.undoCharges || !game.canUndo : arcade ? !arcade.canUndo || transition !== undefined : !game.canUndo);
  $('#hint').toggleAttribute('disabled', state.status !== 'playing' || !!arcade?.ended || !!workshop && (workshop.ended || !workshop.hintCharges));
  if (message) $('.status-line').textContent = message;
  board?.update(); refreshArcade(); refreshWorkshop();
}
function closeModal() {
  $('.modal-backdrop').hidden = true; $('.app-shell').inert = false; lastTick = performance.now(); if(previousFocus?.isConnected&&!previousFocus.closest('[inert]'))previousFocus.focus();
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
  } else modal('☁', 'A little too crowded.', '<p>Your five shelf spaces are full. Undo a move to make room, or start fresh. There’s always another way.</p>', 'Undo last screw', () => { effects.clear(); game.undo(); update('Room to try another color.'); }, 'Restart puzzle', () => { closeModal(); start(classicIndex); });
}
function showCollection() {
  if(workshop){showWorkshop();return;}
  if (arcade) return;
  let selected = classicIndex;
  modal('✣', 'The collection', `<p>Choose a model. Every puzzle is free to replay.</p><div class="puzzle-grid">${levels.map((level, index) => `<button class="puzzle-choice" data-level-index="${index}" aria-pressed="${index === selected}"><span class="puzzle-choice-name">${index + 1}. ${level.name}</span><span class="puzzle-choice-detail">${level.screws.length} screws · ${level.plates.length} parts<br>${level.layerCount||1} layers · ~${level.estimatedMinutes||'2–3'} min</span></button>`).join('')}</div>`, 'Replay this puzzle', () => start(selected));
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.puzzle-choice'));
  for (const button of buttons) button.onclick = () => {
    selected = Number(button.dataset.levelIndex);
    for (const choice of buttons) choice.setAttribute('aria-pressed', String(choice === button));
    $('.primary-button').textContent = selected === classicIndex ? 'Replay this puzzle' : 'Play this puzzle';
  };
}
$('#level-pill').onclick = showCollection;
$('#mode-arcade').onclick = () => { if (!arcade) startArcade(); };
$('#mode-classic').onclick = () => { if (arcade || workshop) backToClassic(); };
$('#undo').onclick = () => {
  if (transition !== undefined) return;
  effects.clear();
  if(workshop){if(workshop.undo()){effects.center('UNDO', '#e6c47a',true);update('Screw restored. Its earnings cannot be collected twice.');}return;}
  if (arcade) { if (arcade.undo()) { effects.center('UNDO −2s', '#e6c47a', true); update('Move and score rewound. −2s.'); } if (arcade.ended) finishArcade(); }
  else if (game.undo()) update('One step back. A fresh perspective.');
};
$('#restart').onclick = () => { if(workshop){confirmAbandon();return;} if (arcade) startArcade(); else { effects.clear(); game.restart(); update('A fresh start. Take your time.'); } };
$('#hint').onclick = () => {
  if(workshop){const hint=workshop.hint();if(hint.partId)board?.hintPart(hint.partId);update(hint.message);return;}
  if (arcade) { arcade.miss(); arcade.penalize(2_000); if (arcade.ended) { finishArcade(); return; } }
  const hint = game.getHint(); if (hint.screwId) board?.hint(hint.screwId);
  update(hint.message + (arcade ? ' Hint −2s.' : hint.screwId ? ' Rotate the object to find it.' : ''));
};
$('#help').onclick = () => workshop
  ? modal('⌂','Workshop · salvage & grow','<p>Every new screw earns XP and scrap immediately. Discovering an interior layer earns extra. Keep all earnings after a failure.</p><ol class="help-list"><li>Start with one bucket and three shelf spaces. Only exposed screws can be collected.</li><li>Complete a model for +30% of base earnings. Beat its active-time target for another +20%.</li><li>Survey suggests a part; Undo has limited charges. Auto-fill collects exposed matching screws and recharges through bucket clears.</li><li>Buy skill nodes with scrap; total XP unlocks branches. Upgrades apply on the next attempt.</li></ol><p>Menus and time outside the game pause the clock. Models are shuffled without repeats within a deck. Progress saves on this device.</p>','Continue attempt',()=>{})
  : arcade
  ? modal('✦', 'Arcade · score attack', '<p>45 seconds to start. Clear a bucket for +3 seconds. Runs last up to 90 active seconds.</p><ol class="help-list"><li>Remove screws within 2 seconds to build a multiplier, up to ×5.</li><li>Turning briefly protects your combo. Misses reset it.</li><li>Shelf overflow costs 5 seconds and rewinds moves to free space.</li><li>Undo and Hint each cost 2 seconds. Undo also reverses the score and time bonus from that move.</li></ol><p>The clock is paused while this panel is open.</p>', 'Continue run', () => {})
  : modal('✣', 'A little room to unwind', '<ol class="help-list"><li>Drag to explore. Pinch to zoom; move two fingers together to pan. Tap an exposed screw to unscrew it.</li><li>Match three of the same color to clear a tray.</li><li>Other colors wait on your five-space shelf.</li><li>Remove every screw from a part to reveal the assembly beneath.</li></ol><p>Classic has no timer. Hints and Undo are free.</p>', 'Let’s play', () => {});
document.addEventListener('keydown', event => {
  if ($('.modal-backdrop').hidden) return;
  if (event.key === 'Escape' && game.state.status === 'playing' && !arcade?.ended && !workshop?.ended) { closeModal(); return; }
  if (event.key === 'Tab') {
    const buttons = Array.from($('.modal').querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(button=>button.getClientRects().length);
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1)!.focus(); }
    else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
  }
});
document.addEventListener('visibilitychange', () => {
  lastTick = performance.now();
  if ((!arcade || arcade.ended) && (!workshop || workshop.ended)) return;
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
function formatTime(ms:number) { const sec=Math.ceil(ms/1000);return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`; }
function setTool(selector:string,html:string){const node=$(selector);if(node.innerHTML!==html)node.innerHTML=html;}
function refreshWorkshop() {
  if(!workshop)return;
  $('#wallet').textContent=`${profile.xp.toLocaleString()} XP · ${profile.scrap.toLocaleString()} scrap`;
  $('#workshop-time').textContent=`${formatTime(workshop.remainingMs)} left`;
  $('#workshop-time').classList.toggle('is-low',workshop.remainingMs<30000);
  $('#workshop-target').textContent=`speed target ${formatTime(workshop.targetMs)}`;
  setTool('#undo',`<span class="tool-icon" aria-hidden="true">↶</span>undo ${workshop.undoCharges}`);
  setTool('#hint',`<span class="tool-icon" aria-hidden="true">☼</span>survey ${workshop.hintCharges}`);
  setTool('#magnet',`<span class="tool-icon" aria-hidden="true">⊂</span>${workshop.skills.has('magnet')?`auto ${workshop.charges}/${workshop.maxCharges}<small>${workshop.chargeProgress}/${workshop.chargeGoal} recharge</small>`:'auto locked'}`);
  $('#magnet').toggleAttribute('disabled',workshop.ended||!workshop.charges||!workshop.autoFillIds.length);
  $('#restart').textContent='end run';
}
function workshopClock(){
  stopClock();lastTick=performance.now();
  clock=setInterval(()=>{
    const now=performance.now(),delta=now-lastTick;lastTick=now;
    if(!workshop||workshop.ended||document.hidden||!$('.modal-backdrop').hidden)return;
    workshop.advance(delta);refreshWorkshop();if(workshop.ended)finishWorkshop();
  },100);
}
function enterWorkshop(){
  saveBest();stopClock();clearTransition();effects.clear();arcade=null;
  if(savedWorkshop){workshop=savedWorkshop;game=workshop.game;bindGame();workshopClock();if(workshop.ended)finishWorkshop();return;}
  newWorkshopAttempt();
}
function newWorkshopAttempt(variant?:typeof levels[number]){
  stopClock();clearTransition();effects.clear();arcade=null;
  const base=variant||nextModel(profile);
  workshop=new WorkshopRun(profile,base,Math.random,variant);savedWorkshop=workshop;
  game=workshop.game;saveWorkshop();bindGame();workshopClock();
  modal('⌂',base.name,`<p>${base.screws.length} screws · ${base.plates.length} detachable pieces</p><p>${game.trayCount} bucket${game.trayCount>1?'s':''} · ${game.bufferCapacity} shelf spaces<br>Run limit ${formatTime(workshop.limitMs)}<br>Speed bonus target ${formatTime(workshop.targetMs)}</p><p>Each new screw earns XP and scrap. Finish for +30%; beat the target for another +20%. Earnings survive failure.</p>`,'Start attempt',()=>{},'Workshop & upgrades',showWorkshop);
}
function finishWorkshop(){
  if(!workshop)return;stopClock();saveWorkshop();update();
  const won=workshop.outcome==='complete';
  if(won)effects.center('MODEL SALVAGED!');else {effects.shake(4);effects.center('EARNINGS SAVED','#e6c47a',true);}
  const rows=Object.entries(workshop.rewards).map(([key,reward])=>`<tr><th>${({screws:'Screws',discoveries:'Layer discoveries',completion:'Completion +30%',speed:'Speed +20%'} as Record<string,string>)[key]}</th><td>${reward.xp} XP</td><td>${reward.scrap} scrap</td></tr>`).join('');
  modal(won?'✦':'⌂',won?'Model salvaged':workshop.outcome==='timeout'?'Time’s up':workshop.outcome==='shelf'?'Shelf full':'Salvage banked',`<p>All earnings are yours to keep.</p><table class="reward-table"><tbody>${rows}<tr class="reward-total"><th>Total earned</th><td>${workshop.totals.xp} XP</td><td>${workshop.totals.scrap} scrap</td></tr></tbody></table><p>Active time ${formatTime(workshop.elapsedMs)} · target ${formatTime(workshop.targetMs)}</p><p>${won?(workshop.rewards.speed.xp?'Speed bonus earned!':'Completion bonus earned. Speed target missed.'): 'Finish a model to earn its completion and speed bonuses.'}</p>`,'Workshop & upgrades',showWorkshop,won?'Next random model':'Retry this model',()=>{const variant=workshop!.game.level;closeModal();newWorkshopAttempt(won?undefined:variant);});
}
function confirmAbandon(){
  if(!workshop)return;
  if(workshop.ended){finishWorkshop();return;}
  modal('⌂','End this attempt?',`<p>Keep ${workshop.totals.xp} XP and ${workshop.totals.scrap} scrap already earned. Completion and speed bonuses require finishing.</p>`,'End & keep earnings',()=>{workshop!.finish('abandoned');finishWorkshop();},'Continue attempt',closeModal);
}
function workshopScene(){
  const stage=profile.restoration;
  return `<div class="workshop-scene stage-${stage}" role="img" aria-label="Workshop restoration ${stage} of 3: ${['empty workroom','workbench restored','tool wall restored','collection shelves restored'][stage]}"><div class="room-window"></div><div class="room-bench"></div><div class="room-tools">⌁ ⊥ ⌕</div><div class="room-shelf">▱ ▥ ▧</div><span>${['an empty room','a place to work','tools within reach','a home for the collection'][stage]}</span></div>`;
}
function showWorkshop(){
  if(!workshop)return;
  const cost=RESTORATION_COSTS[profile.restoration];
  const tree=['Workbench','Tools','Mastery'].map(branch=>`<section class="skill-branch"><h3>${branch}</h3><div class="skill-path">${UPGRADES.filter(u=>u.branch===branch).map(u=>{
    const reason=purchaseReason(profile,u),owned=profile.upgrades.includes(u.id);
    return `<button class="skill-node ${owned?'is-owned':''}" data-upgrade="${u.id}" ${reason?'disabled':''}><strong>${owned?'✓ ':''}${u.name}</strong><span>${u.description}</span><small>${owned?'Installed':`${u.cost} scrap · ${u.xp} XP unlock`}</small>${reason&&!owned?`<small>${reason}</small>`:''}</button>`;
  }).join('')}</div></section>`).join('');
  modal('⌂','Your workshop',`<button id="workshop-back" class="workshop-back">← ${workshop.ended?'Results':'Continue attempt'}</button><p class="workshop-balance">${profile.xp} total XP · ${profile.scrap} scrap</p>${storageFailed?'<p role="alert">Device storage is unavailable. Progress lasts only while this page stays open.</p>':''}${workshopScene()}<button id="restore-room" class="restore-button" ${cost===undefined||profile.scrap<cost?'disabled':''}>${cost===undefined?'Workshop fully restored':`Restore ${['workbench','tool wall','collection shelves'][profile.restoration]} · ${cost} scrap`}</button><p>XP unlocks skills; scrap buys them. Upgrades apply next attempt. Connected nodes require the preceding skill; specialist choices are permanent on this save.</p><div class="skill-tree">${tree}</div>` ,workshop.ended?'Start next random model':'Continue attempt',()=>{if(workshop!.ended)newWorkshopAttempt();},workshop.ended?'Retry this model':'End attempt & keep earnings',()=>{if(workshop!.ended){const variant=workshop!.game.level;closeModal();newWorkshopAttempt(variant);}else confirmAbandon();});
  $('.modal').scrollTop=0;$('.modal').focus({preventScroll:true});
  $('#workshop-back').onclick=()=>{if(workshop!.ended)finishWorkshop();else closeModal();};
  $('.modal-copy').querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach(button=>button.onclick=()=>{if(purchase(profile,button.dataset.upgrade!)){saveWorkshop();refreshWorkshop();showWorkshop();effects.upgrade();const node=$<HTMLButtonElement>(`[data-upgrade="${button.dataset.upgrade}"]`);node.focus();}});
  $('#restore-room').onclick=()=>{if(restore(profile)){saveWorkshop();showWorkshop();effects.upgrade();$('#restore-room').focus();}};
}
$('#mode-workshop').onclick=()=>{if(!workshop)enterWorkshop();};
$('#open-workshop').onclick=showWorkshop;
$('#magnet').onclick=()=>{
  if(!workshop)return;
  const ids=workshop.useMagnet();if(!ids.length)return;
  effects.center('AUTO-FILL');for(const id of ids)select(id);
  refreshWorkshop();
};
// Press feedback covers menus and tools as well as the 3D board. Motion stays optional.
document.addEventListener('pointerdown',event=>{
  const button=(event.target as HTMLElement).closest('button');
  if(button&&!button.disabled&&!button.classList.contains('screw-target'))effects.press(button);
});
start(classicIndex);
