# Screw Garden handoff

## Continue here

Work in the existing `/workspace/Screw` checkout. Read this file, inspect `git status`, and check recent commits before editing. Do not create a worktree unless explicitly requested. Local processes and `/tmp` artifacts may not survive a new task.

Use one agent by default. Add agents only when the user explicitly requests parallel work. Batch related user feedback; provide brief updates on findings, blockers, and completion. Use focused validation during development, then one relevant final regression pass. Do not repeatedly run the full campaign for documentation or isolated UI changes.

## Product requirements

- Open-source portrait mobile web game; no ads, purchases, accounts, tracking, or paid hints.
- Recognizable original multipart objects/buildings with real depth; eight Classic levels grow from 24 to 48 screws (324 total); Arcade rounds use 18–24.
- Drag to rotate; pinch within the board to zoom only the model (0.65–2.2x). Mouse wheel also zooms. Reset/Home restores angle and zoom.
- Eight saturated screw colors; up to four three-screw buckets; five temporary shelf slots; Classic has free hints/Undo, while Arcade has explicit time penalties.
- Screws spin around their local axis and extract along their outward normal, exposing a shaft. Parts wait until the last screw clears before dropping. Undo restores exact poses; honor reduced motion.
- Software MIT; original procedural assets CC0. Record external asset provenance in `docs/ASSETS.md` before inclusion.

## Current state

Baseline game release: `a0d96bd` (model-only pinch zoom and axial extraction), pushed to `main`; both publication and GitHub Pages deployment succeeded. The subsequent collection/workflow update is described below; inspect `git log` for the latest revision. Play: https://rishik28.github.io/Screw/

Last full validation: 27 unit tests, production build, and all eight levels through Chromium touch emulation (324 screws). Browser checks include model zoom with viewport scale unchanged, rotation, six-face extraction and exact Undo, four-bucket maximum, overflow recovery, progression persistence, reduced motion, and unavailable-WebGL fallback. Physical iOS/Android hardware has not been tested.

CrewAI's separate `feature/model-pinch-zoom` branch / PR #1 (`bc111bf`) remains unmerged. The user explicitly chose our implementation. Do not merge or replace our changes with that branch inadvertently.

Follow-up added: this handoff, `test:browser:smoke`, and a collection picker opened from the puzzle counter. All eight models can be selected/replayed; selecting a card waits for explicit Play, and cancel preserves the current attempt. Validation passed: 27 unit tests, production build, collection selection/cancel/persistence, and the first-level interaction/fallback suite (24 screws). Later campaign levels were intentionally not rerun for this UI-only update. No additional gameplay priority has been selected.

## Approved art direction

The user chose the minimalist dusty-blue camera mockup: sparse blue background,
quiet off-white monospace UI, matte ivory/slate/rust model materials, and vivid
screws. Actual lower-resolution rendering and simple lighting should create the
soft PS2/CRT appearance; scanlines remain faint/static. No papercraft collage,
large logos, scenic clutter, neon, vaporwave, or runtime generated-image assets.
See `docs/DESIGN.md`. The visual update changes rendering/framing and UI styling,
not puzzle rules or structural screw anchors. Validation passed: 27 unit tests, production build, focused first-level browser
suite, and a camera-specific lens tap/Undo and raster-resolution check. Visual
review confirmed the 360×740 and 390×844 layouts fit their controls. Later
campaign levels were not rerun because puzzle rules and anchors are unchanged.

## Arcade update

The user authorized a separate faster Arcade mode plus pixel explosions, flashes,
and on-screen numbers. `src/arcade.ts` wraps the existing Game rules: 45 seconds
initial, +3 seconds/bucket, 60 seconds held maximum, 90 active seconds hard cap,
18–24 screws per round, up to ×5 combo, bounded rotation grace. Overflow costs
5 seconds and rewinds enough previous moves to leave two shelf screws; revoked
awards/time are reversed. Undo/Hint each cost 2 seconds. Classic remains free of
timers and preserves its in-progress Game when switching modes. Help/background
pause the timer; best score is local only. `src/effects.ts` bounds short-lived DOM
pixels/popups, throttles flashes, and respects reduced motion.

Validation passed: 41 unit tests and production build, the targeted Arcade
browser suite (18-screw round, timer/pause, score/time bonuses, effects, Undo,
automatic model transition, Classic preservation, timeout/retry, local best, and
reduced motion), and Classic smoke (24 screws and shared controls). A touch-only
Reset regression was fixed by handling view-control taps on pointer-up while
retaining keyboard clicks. No full eight-level Classic browser rerun was needed;
unit tests verify all Classic and compact Arcade solutions.

## Files

- `src/main.ts`: UI, dialogs, current-level persistence, progression.
- `src/renderer.ts`: Three.js rendering, pointer/pinch handling, hit targets, occlusion, animations.
- `src/arcade.ts`: Arcade clock/scoring/recovery and compact rounds.
- `src/effects.ts`: pixel bursts, numbers, flashes.
- `src/game.ts`: pure rules, four buckets, shelf, Undo, verified hints.
- `src/levels.ts`: levels and winning reference sequences.
- `src/objects.ts`: multipart geometry, details, anchors, physical blockers.
- `src/styles.css`: portrait layout, safe areas, touch targets, dialogs.
- `tests/*.test.ts`: rules, solutions, hints, geometry.
- `tests/browser.mjs`: Chromium interaction/campaign tests; supports `--smoke`.

## Commands and validation

Node 24 recommended; dependencies use `npm ci`. No backend or API keys required.

```sh
npm run dev
npm test
npm run build -- --base=./
npm run preview -- --port 4173 --strictPort
# In a separate process:
npm run test:browser:smoke
npm run test:browser
```

Browser tests require Chromium (here `/usr/bin/chromium`); override `CHROMIUM_PATH`, `TEST_URL`, and `TEST_ARTIFACTS` as needed. Smoke mode completes the first model and shared interaction/fallback checks; it explicitly skips later campaign levels and overflow coverage. Full mode takes several minutes. Inspect screenshots only when visual changes warrant it.

Native control clicks and RAF animation updates are asynchronous: await the actual expected state instead of asserting immediately after a touch or sleeping an arbitrary number of milliseconds. Do not weaken behavior assertions to hide failures. Idle rendering should remain suspended until the scene changes.

## Publication

Commit and push to `main` when the user authorizes publication; the current session has standing authorization to publish the requested game improvements. A push runs `.github/workflows/pages.yml`: install, unit tests, portable static build, then update `gh-pages`. Pages is configured to deploy that branch at `/ (root)`. Verify the newest publish and Pages runs succeed before saying a release is live.

Git HTTPS authentication is supplied by the cloud proxy. Use existing authentication; do not ask for tokens merely because `gh auth` fails. In this environment Git/network commands and Chromium may require the normal sandbox escalation flow. `api.github.com` and the live Pages host were blocked by the active allowlist at last inspection; GitHub's public Actions HTML on `github.com` was available for deployment verification. Draft network additions are not proof of applied access. Never bypass policy or print credentials.

## Next-session prompt

“Read docs/HANDOFF.md, inspect the repository and recent commits, and continue. Use one agent unless parallel work is clearly worthwhile.”
