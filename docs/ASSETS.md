# Detailed Classic assemblies

`src/detailed-models.ts` expands the original compact objects into Classic variants with 20–55 detachable pieces and 42–120 screws. Original interior geometry includes house lining/floorboards/partitions, lighthouse stairs and lamp parts, windmill gears, locomotive insulation/firebox/axles, camera sensor/optics/shutter/boards, rover power cells/instruments, clockwork, and tram seats/window glass/traction equipment. These original procedural additions are CC0 1.0, like the compact model catalog below. Classic variants use larger world geometry, one to three spaced fasteners per part, and separately scaled screw heads. Physical obstruction relationships are recalculated from the finished geometry. Compact originals remain in `src/objects.ts` for Arcade.

## Compact model and asset provenance

The compact catalog in `src/objects.ts` contains eight original multipart procedural assemblies (chalet, lighthouse, windmill, locomotive, camera, moon rover, clocktower hall, and tram). Their structural boxes, circular wheels/lens/clocks, window and clock details, local transforms, attachment anchors, and generated obstruction relationships were created for this project and are also dedicated to the public domain under **CC0 1.0 Universal**. They contain no downloaded meshes, logos, textures, or brand designs. Decorative details are local children of their owning structural component so they detach together. The campaign grows from eight to sixteen removable parts (24–48 screws), with attachment faces on all sides. Screw anchors and normals use model world coordinates; box parts and details use Three.js Euler XYZ rotations. Cylinders use local Y as their axis and `size` describes their local X/Y/Z bounds.

Per-screw `blockedBy` lists are computed from the actual outward attachment ray through the other parts' oriented bounds; cylinder cap rays additionally check the circular footprint. Dependencies describe physical obstructions, rather than a global layer order. Geometry changes should rerun attachment and solvability tests. This intentionally compact primitive geometry is an original stylized toy representation, suitable for redistribution and offline rendering.

`public/assets/model-catalog.json` contains eight original polygon silhouettes created for this project: a rocket, butterfly, turtle, gem, flower, pinwheel, fish, and star. They are data for procedural models, rather than remote models that must be downloaded. Each outline can be extruded with a small bevel for a lightweight toy-like 3D piece. Coordinates use positive Y upward, center approximately at the origin, and a maximum extent of one unit in each direction. Renderers may flip Y for canvas coordinates. The optional `detail` is decorative and must not be used as collision geometry.

The catalog is dedicated to the public domain under **CC0 1.0 Universal**: <https://creativecommons.org/publicdomain/zero/1.0/>. No attribution, purchase, account, or runtime network request is required to use it. There are no third-party textures, logos, brands, or downloaded model files in this catalog. The project's software license is separate.

For mobile rendering, reuse geometry and materials, use flat colors, cap bevel segments, and keep screw hit targets larger than the visible screw head. Procedural screws can use a short cylinder, a wider beveled head, and two crossing recessed lines. Level designers should place screws on broad interior areas of each shape and verify their reachability independently of the decorative outlines.

`src/models.ts` exposes the silhouettes and `MODEL_SCREW_ANCHORS` for synchronous rendering and level generation. The three anchors per shape were checked for interior placement, at least 0.85 units of separation, and at least 0.23 units of clearance from the outline for a 2.5 × 4.6 unit plate. This accommodates 0.18 unit screw heads. Scale and rotate anchors with their plate. All eight outlines have nonzero area and no intersecting nonadjacent edges. If silhouettes change, update both JSON and the typed helper, then repeat these checks.

New external assets must include their source URL, author, exact license, and any required attribution here before inclusion. Prefer CC0 or CC BY 4.0; keep CC BY attribution accessible in the app. Avoid editorial-only, noncommercial, no-derivatives, or unclear licenses. Downloading a free model does not by itself grant redistribution rights.

The dusty-blue art direction uses original 32×32 procedural surface and shadow maps generated in `src/renderer.ts`, plus an octagonal lens rim and painted camera details in `src/objects.ts`. These are original CC0 visual assets, with no downloaded or generated-image textures. Mockups were references only.

### Interface icons

The inline SVG paths in `src/icons.ts` were drawn for this project and are original CC0 assets, matching the procedural model assets. No icon fonts, external downloads, or attribution dependencies.
