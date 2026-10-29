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

For focused UI checks, use `npm run test:browser:smoke` (first level, pinch/rotation, extraction, progression, reduced motion, and WebGL fallback). Run the full campaign once before publishing changes to game rules or model geometry. Full browser regression checks use `npm run test:browser` against a running production preview. They require a locally installed Chromium browser; see the test script for executable and base-URL overrides. In the cloud environment Chromium is available at `/usr/bin/chromium`.

Deploy the generated `dist/` directory to a static web host. The game does not need a backend or API credentials.

## GitHub Pages

The `Publish game` workflow builds and updates the `gh-pages` branch on every push to `main`. In GitHub repository **Settings → Pages**, select **Deploy from a branch**, **gh-pages**, and **/ (root)**, then save. Play the published game at https://rishik28.github.io/Screw/.

For a manual static build with portable asset paths, use `npm run build -- --base=./`.

## Classic

Tap the puzzle counter beside the model name to open the collection. Select any model to play or replay; cancel to keep your current attempt.

Drag to rotate the assembly and inspect every side. Pinch with two fingers inside the board to zoom the model without zooming the page; on desktop, use the mouse wheel over the board. Use the left/right view buttons or focus the board and use arrow keys to rotate; Home and the reset-view button restore the original angle and zoom. Tap an exposed screw and collect three of a color in one of up to four active buckets. Screws that do not match an active bucket wait on the five-slot shelf. Matching screws move from the shelf into new buckets automatically. Exceeding the shelf capacity ends the attempt; undo and restart are free.

Removing every screw from a structural part releases it and reveals the assembly beneath. Screws on hidden faces must be rotated into view. Clear all screws and buckets to finish the puzzle. Progress to the current level is saved locally in your browser. The campaign uses eight original multipart objects: a chalet, lighthouse, windmill, locomotive, camera, moon rover, clocktower hall, and city tram. Levels grow from 24 to 48 screws, with eight vivid screw colors, branching part dependencies, and a five-slot shelf that rewards planning. Hints verify a winning continuation and turn the model toward the suggested screw.

## Arcade

Choose **Arcade · score attack** above the buckets. Classic stays available, and switching back restores its current attempt.

- Start with 45 seconds. Each cleared bucket adds 3 seconds; the clock holds at most 60 seconds and a run ends after 90 active seconds.
- Compact rounds keep every structural part but use 18–24 screws. Clearing a model automatically loads the next one.
- Earn 100 points per screw, 300 per bucket, and 500 per model, multiplied by your combo (up to ×5). Remove screws within 2 seconds to keep the chain; turning grants up to 0.8 seconds of grace per gap. Misses reset the chain.
- Shelf overflow costs 5 seconds and rewinds enough moves to free space. Rewound score and time rewards are reversed, so no colors are discarded and puzzles stay solvable.
- Undo and Hint each cost 2 seconds in Arcade. Undo also reverses the move's rewards. Both remain free in Classic.
- Help pauses the clock. Backgrounding the game pauses it and asks you to resume on return. Best scores are stored only in your browser.

Arcade adds bounded pixel bursts, score numbers, combo callouts, and brief bucket/model flashes. Reduced-motion mode keeps numeric feedback while suppressing particles and flashes. Classic keeps the quieter visual presentation. Both modes add brief impact shakes, screw tap pulses, slot-fill pops, and a completed-bucket squash/lift/replacement animation. New input cancels a shake; animations never delay the next move. Reduced motion uses a stationary completion check instead.

Run `npm run test:arcade` against a production preview for the timer, scoring, effects, recovery, mode switching, round transitions, and reduced-motion checks.

Run `npm run test:tactile` against the preview for both modes’ fill animations, shake behavior, reduced motion, uninterrupted input, and Undo cleanup.

## Develop and contribute

- `src/arcade.ts`: compact rounds, score/combo clock, penalties, and reversible rewards.
- `src/effects.ts`: bounded pixel particles, numbers, and flashes.
- `src/game.ts`: game state, tray and shelf rules, undo, and restart.
- `src/levels.ts`: authored levels and reference solution sequences.
- `src/renderer.ts`: Three.js scene, model rendering, and screw interaction.
- `src/main.ts`: application UI and progression.
- `src/styles.css`: responsive portrait layout and visual design.
- `src/objects.ts`: original multipart 3D assemblies, geometry, screw anchors, and component dependencies.
- `src/models.ts` and `public/assets/model-catalog.json`: original silhouette catalog retained for reuse.
- `tests/`: automated checks.

Keep new levels solvable and include a reference solution. Test touch targets and layout on small portrait screens, retain keyboard access, and respect reduced-motion preferences. Add model provenance and redistribution terms to [docs/ASSETS.md](docs/ASSETS.md) before introducing external assets. Do not add advertising, purchases, or tracking.

Each cloud task already runs in an isolated environment. Use the existing checkout; do not create a Git worktree unless explicitly requested.

## License

Software is available under the [MIT License](LICENSE). The original procedural model catalog is dedicated to the public domain under CC0 1.0; see [asset provenance](docs/ASSETS.md). Third-party packages retain their own licenses.
