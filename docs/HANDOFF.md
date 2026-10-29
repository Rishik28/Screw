# Screw Garden handoff

## Subtle vibration and no zoom punch release

The user explicitly authorized publishing this release on October 29, 2026; baseline `8ac29b5`. The user approved removing automatic camera punches, reducing shakes and adding optional phone vibration. `src/haptics.ts` wraps Vibration API requests safely, with a saved opt-in toggle in Help (default off). Accepted screws request 10ms; a bucket-clear move requests one 20ms pulse instead. Disabling/backgrounding cancels pending vibration. Unsupported browsers show an unavailable setting and keep normal gameplay. Test API invocation with mocks; no claim of actual device intensity has been verified. Android Chrome generally supports the API; iPhone Safari does not.

Renderer camera punch state/events/animation are removed. Pinch and wheel zoom are unchanged. Stage shakes are capped at 3px; existing cabinet buttons, particles and pressure effects remain. OS reduced-motion override remains as previously requested. `test:haptics` covers actual UI toggle/persistence, pulse requests, unsupported-browser play and no automatic zoom. `test:tactile` now asserts model zoom remains exactly unchanged throughout effects. Validation passes: 60 unit tests, production build, haptics browser checks (mocked Vibration API), and both-mode tactile checks with both OS motion preferences. No physical phone vibration strength was tested. This publication authorization covers this release only; future publication requires a new request.


## Cabinet controls and explosive feedback release

The user explicitly authorized publishing this release on October 29, 2026; baseline `0e4ffc6`. The user requested raised arcade cabinet buttons, stronger shakes, quick zoom-ins, and intentionally disabled reduced-motion handling for now. This supersedes the historical reduced-motion requirements below. This authorization covers this release only; future publication requires a new request.

All visible controls except invisible screw hit targets have raised caps/rims and press/rebound feedback. `BoardRenderer` consumes `game-impact` events for a bounded 260ms camera zoom punch; it restores base zoom and cancels on new board pointer input. Stronger stage shakes still cancel on new input. Bucket clears add pixel explosions and a callout in all modes. Low time/nearly full shelf adds a warm edge vignette. No game rules or persistent state format changed. Effects remain bounded; brief flashes are throttled to at least 900ms apart.

Reduced-motion guards in effects/renderer are intentionally disabled, and the CSS override is removed. Tests must assert full motion with both OS preferences, not immediate disappearance or suppressed particles. `test:tactile` observes actual camera zoom peaks/restoration plus shake/bucket animations and continued input. `test:tree` verifies cabinet styling still fits 320×568 without scrolling. Validation passes: 58 unit tests, production build, tree layout, tactile effects (including measured zoom peaks and exact zoom restoration), Arcade, and full Workshop integration. Both OS motion preferences exercise full feedback.


## Icon GUI and fixed branch tree release

The user requested an icon-led GUI and branching upgrades without scrolling, then explicitly authorized publishing this update on October 29, 2026. Baseline is Workshop release `616db6e`. This authorization covers this release; future publishing requires a new request.

`src/icons.ts` provides original inline SVG icons. The Workshop upgrade dialog now uses fixed branch maps (Workbench, Tools, Mastery) plus a Room tab. Select any node, including locked nodes, to inspect its effect and gates; only the separate Install button spends scrap. Real prerequisite edges branch from magnet and XP skills; bucket and shelf chains stay distinct. A fixed detail panel and footer keep all actions on-screen. Controls and currencies use matching icons and retain accessible names/short labels. `GameEffects.press` animates individual CSS scale, preserving positioned nodes' translation. Game balance, saves and rewards are unchanged.

Validation: `npm run test:tree` checks all 16 nodes at 390×844, 360×740 and 320×568, no scrolling or clipped controls, purchase prerequisites/exclusivity, Room restoration, active-run stats unchanged, and focus. Workshop integration tests use node selection followed by Install and the Room tab. The 58 unit tests, production build, Workshop integration, Arcade and both-mode tactile/reduced-motion suites also pass. Keep future changes within this fixed-screen layout.


## Workshop progression release

The user explicitly authorized republishing the current Workshop update to GitHub on October 29, 2026. This release adds the previously reviewed draft to baseline `db21768`. Do not infer permission to publish future changes from this one release request.

`src/workshop.ts` contains a versioned sanitized local profile, XP-gated/scrap-priced skill tree, exclusive specialist choices, three visual restoration stages, a persisted shuffled no-repeat model deck, randomized topological/color variants, and a timed `WorkshopRun`. Start with one bucket/three shelf spaces; keep Classic and Arcade rules separate. New variants keep physical blockers intact and author a winning witness, validated for 1–4 buckets with three shelf spaces.

Rewards: 5 XP/2 scrap per unique screw, 25 XP/10 scrap per newly exposed authored interior depth, completion +30% of base earnings, speed +20%. Base multipliers accumulate before rounding. Rewards bank immediately and survive failures, timeouts, abandon, and refresh. Undo cannot repeat screw/discovery/recharge rewards. Retry preserves the variant; next model draws the deck. A run snapshots upgrades, so purchases apply next attempt. Active runs survive mode switches in memory; reload keeps profile but starts a new attempt.

Targets start at `(35 + screws*2 + parts*.9)` seconds; run limit is target +75s plus upgrades. These need human balance tuning; do not claim they are measured realistic completion times. Menus/background/mode switches pause the run. Auto-fill removes up to three actual exposed matching screws from one bucket and recharges with new high-water bucket clears, never replayed clears. Surveys point to/highlight a part instead of identifying a solution screw. The user rejected contracts and challenge modifiers; do not add them.

Presentation: Workshop wallet HUD, pre-run time/reward brief, results breakdown, three tree branches, CSS low-poly room restoration, salvage chips traveling to the wallet, pixel bursts, discovery/recharge popups, button depressions, and tumbling falling parts. Honor reduced motion. Never scale a screw hit target on pointer-down; its anchored transform must stay stable. Upgrade dialog opens at the top and traps focus among enabled buttons.

Validation: 58 unit tests pass, covering 32 random model variants at all four bucket capacities, reward accounting, failure, purchases, branches, minimum-capacity solvability, charge replay protection and saves. Workshop browser suite passes a real-pointer/touch full teardown, failure, all reward paths, local persistence, upgrades/restoration, mode preservation, auto-fill, surveys, timeout, reduced motion, and dialog focus. Classic smoke (42 screws, rotation/pinch, six-face extraction/Undo, reduced motion, WebGL fallback), Arcade and both-mode tactile suites pass. Use `npm run test:workshop` (Chromium; `TEST_URL` override). Full Classic campaign was not repeated because physical geometry/blockers are unchanged; use smoke plus Arcade/tactile checks for these shared presentation changes.

## Continue here

Work in the existing `/workspace/Screw` checkout. Read this file, inspect `git status`, and check recent commits before editing. Do not create a worktree unless explicitly requested. Local processes and `/tmp` artifacts may not survive a new task.

Use one agent by default. Add agents only when the user explicitly requests parallel work. Batch related user feedback; provide brief updates on findings, blockers, and completion. Use focused validation during development, then one relevant final regression pass. Do not repeatedly run the full campaign for documentation or isolated UI changes.

## Product requirements

- Open-source portrait mobile web game; no ads, purchases, accounts, tracking, or paid hints.
- Recognizable original multipart objects/buildings with real depth; eight Classic levels have 42–120 screws (663 total); Arcade rounds use 18–24.
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

## Tactile feedback update

Both modes now use `GameEffects`: brief input-cancellable stage shakes, tap rings,
slot pops, and a full-bucket squash/lift/new-bucket arrival. `Game.clearedTrays`
reports exact slot/color events (including automatic shelf cascades); these are
transient and cleared on every selection, Undo, and Restart. The live four-tray
row updates immediately. Decorative full-tray copies are pointer-transparent,
aria-hidden, and cleared by Undo/Restart/model transitions. Reduced motion gets
only a static full-bucket/check fade, with no shakes or scaling.

`npm run test:tactile` covers both modes and both motion preferences, immediate
continued input, actual full-bucket animations, and Undo cleanup. Unit count is
now 43. The focused Arcade and Classic smoke suites provide final regressions.
No full campaign browser rerun is needed for this presentation-only update.

## Expanded Classic models

Classic now uses `DETAILED_MODELS` from `src/detailed-models.ts`: 20/25/30/35/40/
45/50/55 parts and 42/54/66/78/90/102/111/120 screws. New authored interiors
include real frames, floors, boards, optics, gears, cells, and seats. One to three
fasteners per piece, larger geometry/head scale, and physical blockers preserve
spacing and layer depth. Time estimates are roughly 2–5 minutes, not time gates.

`levels` are detailed Classic variants; `shortLevels` are the compact originals
used to construct Arcade. Keep these separate. `Plate.interior`, `Level.layerCount`,
`estimatedMinutes`, and `screwScale` support UI, rendering, and validation.
The view is larger, allows two-finger panning, and rotates to the poles. Reset
recenters pan and zoom. Blocked screw meshes are hidden for clarity/performance.
Unit tests cover all counts, cap clearance, spacing, real dependencies, and
solvability. Validation: 48 unit tests and the production build pass. Physical touch-play
checks passed all eight models across staged campaign runs (663 screws),
including model-only pinch/pan, rotation, extraction/Undo, hints, overflow recovery,
persistence, reduced motion, and unavailable-WebGL fallback.
Curved-cylinder and near-edge blocker calculations were corrected after browser
checks exposed unreachable fasteners, with regression tests for both. The browser
test uses normal controls plus free hints for exact-axis access to deep cavities;
`TEST_START_LEVEL=N` resumes campaign checks with explicit scope reporting.
Arcade and tactile browser suites pass, including both reduced-motion modes.

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

The user authorized publishing the Workshop release on October 29, 2026. Future releases require a new explicit publication request. A push runs `.github/workflows/pages.yml`: install, unit tests, portable static build, then update `gh-pages`. Pages is configured to deploy that branch at `/ (root)`. Verify the newest publish and Pages runs succeed before saying a release is live.

Git HTTPS authentication is supplied by the cloud proxy. Use existing authentication; do not ask for tokens merely because `gh auth` fails. In this environment Git/network commands and Chromium may require the normal sandbox escalation flow. `api.github.com` and the live Pages host were blocked by the active allowlist at last inspection; GitHub's public Actions HTML on `github.com` was available for deployment verification. Draft network additions are not proof of applied access. Never bypass policy or print credentials.

## Next-session prompt

“Read docs/HANDOFF.md, inspect the repository and recent commits, and continue. Use one agent unless parallel work is clearly worthwhile.”
