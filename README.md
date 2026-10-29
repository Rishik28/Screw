# Screw Garden

A free, open-source 3D screw puzzle for portrait mobile browsers. No ads, in-app purchases, accounts, or paid hints.

For project status and continuation instructions, read [docs/HANDOFF.md](docs/HANDOFF.md).

The visual direction is sparse, dusty blue, and inspired by softly rasterized early-2000s console graphics. See [design notes](docs/DESIGN.md).

## Run locally

Requires Node.js 22.12+ (Node.js 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Run these commands from the repository root. Open the development server in a modern browser with WebGL enabled. The interface is designed for portrait touch screens and also supports mouse and keyboard input.

```sh
npm test       # game rules, level solutions, and model validation
npm run build # TypeScript checks and production bundle
npm run preview
```

For focused UI checks, use `npm run test:browser:smoke` (first level, pinch/rotation, extraction, progression, OS motion-preference override, and WebGL fallback). Run the full campaign once before publishing changes to game rules or model geometry. Full browser regression checks use `npm run test:browser` against a running production preview. They require a locally installed Chromium browser; see the test script for executable and base-URL overrides. In the cloud environment Chromium is available at `/usr/bin/chromium`.

Deploy the generated `dist/` directory to a static web host. The game does not need a backend or API credentials.

## GitHub Pages

The `Publish game` workflow builds and updates the `gh-pages` branch on every push to `main`. In GitHub repository **Settings → Pages**, select **Deploy from a branch**, **gh-pages**, and **/ (root)**, then save. Play the published game at https://rishik28.github.io/Screw/.

For a manual static build with portable asset paths, use `npm run build -- --base=./`.

## Workshop · incremental progression

Select **Workshop** to start a separate timed salvage attempt with one bucket and three shelf spaces. Models use a shuffled, persisted deck with no repeats until every model has appeared. New attempts randomize the physical dismantling witness and color layout; retry preserves the same puzzle so learning matters. All variants have a verified solution at minimum capacity. Limited Undo and part-level surveys replace unlimited step-by-step guidance here; Classic remains untimed with free tools.

- Each new screw pays 5 XP and 2 scrap immediately; revealing a previously concealed interior depth pays 25 XP and 10 scrap once per attempt.
- Failure, timeout, or ending a run keeps all earnings. Undo cannot repay a screw/discovery or farm tool recharge.
- Completing a model adds 30% of its base earnings; finishing within its displayed active-time target adds another 20%. Missing the target still permits the completion bonus.
- Targets initially use `35 + 2 × screws + 0.9 × detachable parts` seconds, about 2:17–5:25. The run limit is 75 seconds longer, plus time upgrades. These are initial tuning values, not measured player completion times. Menus, mode switches, and background time pause the clock.
- Total XP unlocks nodes; scrap buys them. Workbench, Tools, and Mastery offer bucket capacity (maximum four), shelf expansions, time, XP, charged auto-fill, and additional Undo/survey charges. Storage vs charging and XP vs scrap specializations are exclusive choices. Upgrades take effect next attempt.
- Auto-fill collects up to three actual **exposed** screws matching one active bucket; it never bypasses physical blockers. Three new bucket clears recharge a use (two with Fast charger). Replaying bucket clears with Undo does not recharge again.
- Restore the workbench, tool wall, and collection shelves with scrap. Restoration is visual and does not hide mandatory upgrades.

Upgrades use an icon-based branching map with Workbench, Tools, and Mastery tabs. Each branch fits on a portrait screen without scrolling; select a node to inspect it, then Install to buy. The Room tab holds restoration. Locked nodes remain inspectable.

XP, scrap, purchases, restoration, completed-model count, and the random deck save locally on this device. An active puzzle survives mode changes in the open page; reloading starts a new attempt while retaining banked earnings. Storage failures display a warning in the Workshop. No accounts, server, ads, or purchases are involved.

Use `npm run test:workshop` against a local production preview for real-pointer/touch progression, rewards, failure, purchases, restoration, local save, charged tools, timer, OS motion-preference override, and skill-tree accessibility checks.

## Classic

Tap the puzzle counter beside the model name to open the collection. Select any model to play or replay; cancel to keep your current attempt.

Drag to rotate the assembly and inspect every side. Pinch with two fingers inside the board to zoom the model without zooming the page; on desktop, use the mouse wheel over the board. Use the left/right view buttons or focus the board and use arrow keys to rotate; Home and the reset-view button restore the original angle and zoom. Tap an exposed screw and collect three of a color in one of up to four active buckets. Screws that do not match an active bucket wait on the five-slot shelf. Matching screws move from the shelf into new buckets automatically. Exceeding the shelf capacity ends the attempt; undo and restart are free.

Removing every screw from a structural part releases it and reveals the assembly beneath. Screws on hidden faces must be rotated into view. Clear all screws and buckets to finish the puzzle. Progress to the current level is saved locally in your browser. The campaign uses eight original multipart objects: a chalet, lighthouse, windmill, locomotive, camera, moon rover, clocktower hall, and city tram. Classic models have 20–55 detachable parts and 42, 54, 66, 78, 90, 102, 111, or 120 screws, with eight vivid screw colors, branching part dependencies, and a five-slot shelf that rewards planning. Hints verify a winning continuation and turn the model toward the suggested screw. Outer shells now hide frames, floors, circuit boards, optics, gears, seats, and other core components. Collection time estimates target roughly 2–5 minutes; Classic is untimed and completion speed varies. Two fingers moving together pan the view, while pinching changes zoom; Reset/Home recenters it.

## Arcade

Choose **Arcade · score attack** above the buckets. Classic stays available, and switching back restores its current attempt.

- Start with 45 seconds. Each cleared bucket adds 3 seconds; the clock holds at most 60 seconds and a run ends after 90 active seconds.
- Arcade uses separate compact model variants with 18–24 screws, preserving its fast pace. Clearing a model automatically loads the next one.
- Earn 100 points per screw, 300 per bucket, and 500 per model, multiplied by your combo (up to ×5). Remove screws within 2 seconds to keep the chain; turning grants up to 0.8 seconds of grace per gap. Misses reset the chain.
- Shelf overflow costs 5 seconds and rewinds enough moves to free space. Rewound score and time rewards are reversed, so no colors are discarded and puzzles stay solvable.
- Undo and Hint each cost 2 seconds in Arcade. Undo also reverses the move's rewards. Both remain free in Classic.
- Help pauses the clock. Backgrounding the game pauses it and asks you to resume on return. Best scores are stored only in your browser.

Arcade adds bounded pixel bursts, score numbers, combo callouts, and brief bucket/model flashes. All modes now use full arcade feedback: stronger input-cancellable shakes, screw tap pulses, slot-fill pops, and completed-bucket squash/lift/replacement bursts. Raised cabinet-style buttons depress and rebound. Low time or a nearly full shelf adds a warm pressure vignette. Automatic camera zoom is removed; manual pinch/wheel zoom is unchanged. Stage shakes are capped at 3 pixels. The gameplay surface, including its labels, counters, trays and model board, suppresses text selection, long-press callouts, and native drag/context menus while keeping model gestures and keyboard focus available. OS reduced-motion handling is intentionally disabled for this draft at the user’s request; all effects stay active. Flashes remain short and throttled.

Run `npm run test:arcade` against a production preview for the timer, scoring, effects, recovery, mode switching, round transitions, and full-motion override checks.

Run `npm run test:tactile` against the preview for both modes’ fill animations, shake behavior, OS motion-preference override, uninterrupted input, and Undo cleanup.

## Develop and contribute

- `src/workshop.ts`: persistent profile, upgrade tree, randomized puzzles, rewards, charged tools, and active-time runs.
- `src/arcade.ts`: compact rounds, score/combo clock, penalties, and reversible rewards.
- `src/effects.ts`: bounded pixel particles, numbers, and flashes.
- `src/game.ts`: game state, tray and shelf rules, undo, and restart.
- `src/levels.ts`: authored levels and reference solution sequences.
- `src/renderer.ts`: Three.js scene, model rendering, and screw interaction.
- `src/main.ts`: application UI and progression.
- `src/styles.css`: responsive portrait layout and visual design.
- `src/detailed-models.ts`: larger Classic assemblies, authored interiors, and spaced fasteners.
- `src/objects.ts`: original compact multipart 3D assemblies, geometry, screw anchors, and component dependencies.
- `src/models.ts` and `public/assets/model-catalog.json`: original silhouette catalog retained for reuse.
- `tests/`: automated checks.

Keep new levels solvable and include a reference solution. Test touch targets and layout on small portrait screens, retain keyboard access, and preserve the current explicit motion configuration. Add model provenance and redistribution terms to [docs/ASSETS.md](docs/ASSETS.md) before introducing external assets. Do not add advertising, purchases, or tracking.

Each cloud task already runs in an isolated environment. Use the existing checkout; do not create a Git worktree unless explicitly requested.

## License

Software is available under the [MIT License](LICENSE). The original procedural model catalog is dedicated to the public domain under CC0 1.0; see [asset provenance](docs/ASSETS.md). Third-party packages retain their own licenses.
