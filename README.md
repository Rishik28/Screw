# Screw Garden

A free, open-source 3D screw puzzle for portrait mobile browsers. No ads, in-app purchases, accounts, or paid hints.

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

Browser regression checks use `npm run test:browser` against a running production preview. They require a locally installed Chromium browser; see the test script for executable and base-URL overrides. In the cloud environment Chromium is available at `/usr/bin/chromium`.

Deploy the generated `dist/` directory to a static web host. The game does not need a backend or API credentials.

## GitHub Pages

The `Publish game` workflow builds and updates the `gh-pages` branch on every push to `main`. In GitHub repository **Settings → Pages**, select **Deploy from a branch**, **gh-pages**, and **/ (root)**, then save. Play the published game at https://rishik28.github.io/Screw/.

For a manual static build with portable asset paths, use `npm run build -- --base=./`.

## Play

Drag to rotate the assembly and inspect every side. Use the left/right view buttons or focus the board and use arrow keys to rotate; Home resets the view. Tap an exposed screw and collect three of a color in one of up to four active buckets. Screws that do not match an active bucket wait on the five-slot shelf. Matching screws move from the shelf into new buckets automatically. Exceeding the shelf capacity ends the attempt; undo and restart are free.

Removing every screw from a structural part releases it and reveals the assembly beneath. Screws on hidden faces must be rotated into view. Clear all screws and buckets to finish the puzzle. Progress to the current level is saved locally in your browser. The campaign uses eight original multipart objects: a chalet, lighthouse, windmill, locomotive, camera, moon rover, clocktower hall, and city tram. Levels grow from 24 to 48 screws, with eight vivid screw colors, branching part dependencies, and a five-slot shelf that rewards planning. Hints verify a winning continuation and turn the model toward the suggested screw.

## Develop and contribute

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
